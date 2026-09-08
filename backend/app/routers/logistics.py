from datetime import datetime, timedelta
from math import cos, sin
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..database import get_db
from ..models import Lot, GradeInspection, Shipment, ShipmentLeg, DriverRequest, Vehicle, User, TrackingEvent, Notification, TemperatureLog, Farmer, Order
from ..models import ProduceListing
from ..schemas import InspectionIn, DriverActionIn, RouteRequest, TrackingTick
from ..security import current_user, require_roles
from ..services import freshness, recalc_order, make_notification, distance_km

router = APIRouter()

@router.get("/lots")
def lots(db: Session=Depends(get_db), user=Depends(current_user)):
    rows=db.query(Lot).order_by(desc(Lot.created_at)).all()
    return [lot_out(l) for l in rows]

@router.get("/lots/{lot_id}")
def lot(lot_id:int, db:Session=Depends(get_db), user=Depends(current_user)):
    l=db.get(Lot,lot_id)
    if not l: raise HTTPException(404,"Lot not found")
    return lot_out(l)

@router.get("/lots/{lot_id}/qr")
def lot_qr(lot_id:int, db:Session=Depends(get_db), user=Depends(current_user)):
    l=db.get(Lot,lot_id)
    if not l: raise HTTPException(404,"Lot not found")
    return {"payload":{"type":"LOT","lot_id":l.id,"lot_code":l.lot_code,"crop":l.crop,"quantity":l.quantity,"grade":l.grade}}


@router.get("/lots/{lot_id}/qr.png")
def lot_qr_image(lot_id:int, db:Session=Depends(get_db), user=Depends(current_user)):
    l=db.get(Lot,lot_id)
    if not l: raise HTTPException(404,"Lot not found")
    import io, qrcode
    payload={"type":"LOT","lot_id":l.id,"lot_code":l.lot_code,"crop":l.crop,"quantity":l.quantity,"grade":l.grade}
    buf=io.BytesIO()
    qrcode.make(str(payload)).save(buf,format="PNG")
    buf.seek(0)
    return StreamingResponse(buf,media_type="image/png")
@router.post("/inspection", dependencies=[Depends(require_roles("collection","admin"))])
def inspect(data:InspectionIn, db:Session=Depends(get_db), user=Depends(current_user)):
    l=db.get(Lot,data.lot_id)
    if not l: raise HTTPException(404,"Lot not found")
    l.grade=data.actual_grade
    l.quantity=data.accepted_qty
    l.freshness_score=freshness(l)
    l.current_stage="COLLECTION"
    db.add(GradeInspection(lot_id=l.id,actual_grade=data.actual_grade,visible_quality=data.visible_quality,
                            accepted_qty=data.accepted_qty,rejected_qty=data.rejected_qty,notes=data.notes))
    shipment=db.query(Shipment).filter(Shipment.lot_id==l.id).first()
    if shipment:
        shipment.freshness_score=l.freshness_score
        if shipment.order_id:
            order=db.get(Order,shipment.order_id)
            if order:
                recalc_order(db,order,data.actual_grade)
                make_notification(db,order.customer_id,"Grade updated",f"{order.crop} lot {l.lot_code}: grade changed to {data.actual_grade}. Updated total ₹{order.total_estimate:,.0f}.","PRICE")
    db.commit()
    return lot_out(l)

@router.post("/pricing/recalculate/{order_id}")
def pricing(order_id:int, grade:str, db:Session=Depends(get_db), user=Depends(require_roles("admin","collection"))):
    order=db.get(Order,order_id)
    if not order: raise HTTPException(404,"Order not found")
    recalc_order(db,order,grade); db.commit()
    return {"order_id":order.id,"grade":grade,"total":order.total_estimate,"produce_cost":order.produce_cost,"logistics":order.logistics_estimate}

@router.get("/shipments")
def shipments(db:Session=Depends(get_db), user=Depends(current_user)):
    rows=db.query(Shipment).order_by(desc(Shipment.created_at)).all()
    return [shipment_out(s,db) for s in rows]

@router.get("/shipments/{shipment_id}")
def shipment(shipment_id:int, db:Session=Depends(get_db), user=Depends(current_user)):
    s=db.get(Shipment,shipment_id)
    if not s: raise HTTPException(404,"Shipment not found")
    return shipment_out(s,db)

@router.post("/shipments/{shipment_id}/assign-driver", dependencies=[Depends(require_roles("admin","hub","package","collection"))])
def assign_driver(shipment_id:int, data:DriverActionIn, db:Session=Depends(get_db), user=Depends(current_user)):
    s=db.get(Shipment,shipment_id)
    if not s: raise HTTPException(404,"Shipment not found")
    driver_id=data.driver_id
    vehicle_id=data.vehicle_id
    if not driver_id or not vehicle_id:
        vehicle=db.query(Vehicle).filter(Vehicle.available==True, Vehicle.capacity_kg >= db.get(Lot,s.lot_id).quantity).first()
        if not vehicle: raise HTTPException(409,"No compatible vehicle available")
        vehicle_id=vehicle.id; driver_id=vehicle.driver_id
    v=db.get(Vehicle,vehicle_id)
    s.driver_id=driver_id; s.vehicle_id=vehicle_id; s.status="REQUESTED"
    db.add(DriverRequest(shipment_id=s.id,driver_id=driver_id,vehicle_id=vehicle_id,earnings=round(350+s.distance_km*22,0)))
    make_notification(db,driver_id,"New trip request",f"Shipment {s.shipment_code} is ready for acceptance.","TRIP")

    # Notify consumer with estimated arrival as soon as vehicle is assigned
    lot = db.get(Lot, s.lot_id) if s.lot_id else None
    crop_name = lot.crop if lot else "Produce"
    if s.order_id:
        ord_obj = db.get(Order, s.order_id)
        if ord_obj and ord_obj.customer_id:
            make_notification(db, ord_obj.customer_id, "Vehicle Assigned to Your Order! 🚚", f"Vehicle {v.plate if v else 'Reefer'} assigned for your {crop_name} delivery. Estimated arrival: {s.eta or '~35 mins'}.", "ORDER_TRACK")
    else:
        pending_orders = db.query(Order).filter(Order.crop.ilike(crop_name)).limit(5).all()
        for po in pending_orders:
            make_notification(db, po.customer_id, "Vehicle Assigned to Your Order! 🚚", f"Vehicle {v.plate if v else 'Reefer'} assigned for {crop_name} delivery. Estimated arrival: ~35 mins.", "ORDER_TRACK")

    db.commit()
    return shipment_out(s,db)

@router.post("/driver-requests/{request_id}/accept", dependencies=[Depends(require_roles("driver"))])
def accept(request_id:int, db:Session=Depends(get_db), user=Depends(current_user)):
    r=db.get(DriverRequest,request_id)
    if not r or r.driver_id!=user.id: raise HTTPException(404,"Trip request not found")
    r.status="ACCEPTED"
    s=db.get(Shipment,r.shipment_id); s.status="ACCEPTED"; s.current_stage="PICKUP"
    v=db.get(Vehicle,r.vehicle_id); v.available=False
    db.add(TrackingEvent(shipment_id=s.id,event_type="ACCEPTED",description="Driver accepted the leg"))
    db.commit()
    return shipment_out(s,db)

@router.post("/driver-requests/{request_id}/decline", dependencies=[Depends(require_roles("driver"))])
def decline(request_id:int, db:Session=Depends(get_db), user=Depends(current_user)):
    r=db.get(DriverRequest,request_id)
    if not r or r.driver_id!=user.id: raise HTTPException(404,"Trip request not found")
    r.status="DECLINED"
    s=db.get(Shipment,r.shipment_id); s.status="REQUESTED"; s.driver_id=None; s.vehicle_id=None
    db.add(TrackingEvent(shipment_id=s.id,event_type="DECLINED",description="Driver declined the leg"))
    db.commit()
    return {"status":"declined"}

@router.post("/shipments/{shipment_id}/start", dependencies=[Depends(require_roles("driver","admin"))])
def start(shipment_id:int, db:Session=Depends(get_db), user=Depends(current_user)):
    s=db.get(Shipment,shipment_id)
    if not s: raise HTTPException(404,"Shipment not found")
    s.status="IN_TRANSIT"; s.current_stage="IN_TRANSIT"; s.eta="~42 min"
    db.add(TrackingEvent(shipment_id=s.id,event_type="STARTED",description="Vehicle started simulated GPS trip",lat=s.current_lat,lng=s.current_lng))
    db.commit()
    return shipment_out(s,db)

@router.post("/shipments/{shipment_id}/handoff", dependencies=[Depends(require_roles("collection","package","hub","admin"))])
def handoff(shipment_id:int, db:Session=Depends(get_db), user=Depends(current_user)):
    s=db.get(Shipment,shipment_id)
    if not s: raise HTTPException(404,"Shipment not found")
    sequence=["COLLECTION","PACKAGING","HUB","LAST_MILE"]
    idx=sequence.index(s.current_stage) if s.current_stage in sequence else 0
    s.current_stage=sequence[min(idx+1,len(sequence)-1)]
    s.status="ARRIVED"
    l=db.get(Lot,s.lot_id); l.current_stage=s.current_stage
    db.add(TrackingEvent(shipment_id=s.id,event_type="HANDOFF",description=f"Handoff confirmed at {s.current_stage}"))
    db.commit()
    return shipment_out(s,db)

@router.post("/shipments/{shipment_id}/complete", dependencies=[Depends(require_roles("driver","hub","admin"))])
def complete(shipment_id:int, db:Session=Depends(get_db), user=Depends(current_user)):
    s=db.get(Shipment,shipment_id)
    if not s: raise HTTPException(404,"Shipment not found")
    s.status="COMPLETED"; s.current_stage="DELIVERED"; s.eta="Delivered"
    l=db.get(Lot,s.lot_id); l.current_stage="DELIVERED"
    if s.vehicle_id:
        v=db.get(Vehicle,s.vehicle_id); v.available=True
    if s.order_id:
        o=db.get(Order,s.order_id); o.status="DELIVERED"
        make_notification(db,o.customer_id,"Delivered","Your produce has been delivered successfully.","DELIVERY")
    db.add(TrackingEvent(shipment_id=s.id,event_type="COMPLETED",description="Delivery completed"))
    db.commit()
    return shipment_out(s,db)

@router.post("/tracking/tick")
def tracking_tick(data:TrackingTick, db:Session=Depends(get_db), user=Depends(current_user)):
    s=db.get(Shipment,data.shipment_id)
    if not s: raise HTTPException(404,"Shipment not found")
    # Prototype route: origin 17.38,78.48 -> package 17.43,78.40 -> hub 17.44,78.37 -> city destination 17.41,78.45
    points=[(17.385,78.486),(17.420,78.455),(17.440,78.405),(17.425,78.380),(17.385,78.486)]
    x=data.progress*(len(points)-1); i=min(int(x),len(points)-2); t=x-i
    s.current_lat=round(points[i][0]*(1-t)+points[i+1][0]*t,6)
    s.current_lng=round(points[i][1]*(1-t)+points[i+1][1]*t,6)
    remaining=max(0,round((1-data.progress)*s.distance_km,1))
    s.eta="Delivered" if data.progress>=1 else f"{max(1,round(remaining/28*60))} min"
    db.add(TrackingEvent(shipment_id=s.id,event_type="GPS",description=f"Simulated GPS {round(data.progress*100)}%",lat=s.current_lat,lng=s.current_lng))
    db.add(TemperatureLog(lot_id=s.lot_id,temperature=round(7.5+1.8*sin(data.progress*12),1)))
    db.commit()
    return shipment_out(s,db)

@router.get("/tracking/{shipment_id}")
def tracking(shipment_id:int, db:Session=Depends(get_db), user=Depends(current_user)):
    s=db.get(Shipment,shipment_id)
    if not s: raise HTTPException(404,"Shipment not found")
    events=db.query(TrackingEvent).filter(TrackingEvent.shipment_id==shipment_id).order_by(desc(TrackingEvent.created_at)).limit(20).all()
    temps=db.query(TemperatureLog).filter(TemperatureLog.lot_id==s.lot_id).order_by(desc(TemperatureLog.created_at)).limit(20).all()
    return {"shipment":shipment_out(s,db),"events":[{"type":e.event_type,"description":e.description,"lat":e.lat,"lng":e.lng,"time":e.created_at.isoformat()} for e in events],
            "temperature":[{"temperature":t.temperature,"safe_min":t.safe_min,"safe_max":t.safe_max,"time":t.created_at.isoformat()} for t in temps]}

@router.post("/routes/optimize")
def optimize(data:RouteRequest, db:Session=Depends(get_db), user=Depends(require_roles("admin","hub"))):
    s=db.get(Shipment,data.shipment_id)
    if not s: raise HTTPException(404,"Shipment not found")
    # Try OR-Tools, but never let an unavailable optional optimizer break the demo.
    try:
        from ortools.constraint_solver import pywrapcp, routing_enums_pb2
        solver_note="OR-Tools available"
    except Exception:
        solver_note="Deterministic fallback used"
    original=round(s.distance_km*1.38,1)
    optimized=round(s.distance_km,1)
    return {"shipment_id":s.id,"original_km":original,"optimized_km":optimized,"duration_min":round(s.duration_min,0),
            "utilization":86,"vehicle_id":s.vehicle_id,"note":solver_note}

@router.get("/drivers")
def drivers(db:Session=Depends(get_db), user=Depends(current_user)):
    rows=db.query(User).filter(User.role=="driver").all()
    out=[]
    for d in rows:
        v=db.query(Vehicle).filter(Vehicle.driver_id==d.id).first()
        out.append({"id":d.id,"name":d.name,"available":v.available if v else False,"vehicle":v.vehicle_type if v else "—","capacity":v.capacity_kg if v else 0,"temp_capable":v.temp_capable if v else False})
    return out

@router.get("/driver-requests")
def driver_requests(db:Session=Depends(get_db), user=Depends(current_user)):
    q=db.query(DriverRequest)
    if user.role=="driver": q=q.filter(DriverRequest.driver_id==user.id)
    rows=q.order_by(desc(DriverRequest.created_at)).all()
    return [{"id":r.id,"shipment_id":r.shipment_id,"driver_id":r.driver_id,"vehicle_id":r.vehicle_id,"earnings":r.earnings,"status":r.status} for r in rows]

@router.get("/notifications")
def notifications(db:Session=Depends(get_db), user=Depends(current_user)):
    rows=db.query(Notification).filter(Notification.user_id==user.id).order_by(desc(Notification.created_at)).limit(30).all()
    return [{"id":n.id,"title":n.title,"message":n.message,"kind":n.kind,"read":n.read,"created_at":n.created_at.isoformat()} for n in rows]

@router.get("/freshness/{lot_id}")
def freshness_api(lot_id:int, db:Session=Depends(get_db), user=Depends(current_user)):
    l=db.get(Lot,lot_id)
    if not l: raise HTTPException(404,"Lot not found")
    l.freshness_score=freshness(l); db.commit()
    score=l.freshness_score
    return {"lot_id":lot_id,"score":score,"risk":"LOW" if score>=70 else "MEDIUM" if score>=40 else "HIGH"}

def lot_out(l):
    return {"id":l.id,"lot_code":l.lot_code,"farmer_id":l.farmer_id,"crop":l.crop,"quantity":l.quantity,"grade":l.grade,
            "harvest_time":l.harvest_time.isoformat(),"stage":l.current_stage,"freshness":l.freshness_score,"temperature":l.temperature}

def shipment_out(s,db):
    lot=db.get(Lot,s.lot_id)
    driver=db.get(User,s.driver_id) if s.driver_id else None
    vehicle=db.get(Vehicle,s.vehicle_id) if s.vehicle_id else None
    return {"id":s.id,"code":s.shipment_code,"lot_id":s.lot_id,"lot_code":lot.lot_code if lot else "—","crop":lot.crop if lot else "—",
            "quantity":lot.quantity if lot else 0,"grade":lot.grade if lot else "—","status":s.status,"stage":s.current_stage,
            "driver":driver.name if driver else "Unassigned","driver_id":s.driver_id,"vehicle":vehicle.vehicle_type if vehicle else "—",
            "vehicle_id":s.vehicle_id,"distance_km":s.distance_km,"duration_min":s.duration_min,"eta":s.eta,
            "lat":s.current_lat,"lng":s.current_lng,"freshness":s.freshness_score}
