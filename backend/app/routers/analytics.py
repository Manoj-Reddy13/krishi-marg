from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..security import current_user
from ..models import Order, Shipment, User, Vehicle, Farmer, Lot, ProduceListing, DemandCluster, TrackingEvent

router=APIRouter()

@router.get("/dashboard")
def dashboard(db:Session=Depends(get_db), user=Depends(current_user)):
    orders=db.query(Order).count()
    active=db.query(Shipment).filter(Shipment.status.notin_(["COMPLETED"])).count()
    farmers=db.query(Farmer).count()
    drivers=db.query(User).filter(User.role=="driver").count()
    vehicles=db.query(Vehicle).filter(Vehicle.available==True).count()
    at_risk=db.query(Lot).filter(Lot.freshness_score<70, Lot.current_stage!="DELIVERED").count()
    delayed=db.query(Shipment).filter(Shipment.status.in_(["REQUESTED","ARRIVED"])).count()
    delivered=db.query(Shipment).filter(Shipment.status=="COMPLETED").count()
    total_ship=max(db.query(Shipment).count(),1)
    ontime=round(delivered/total_ship*100,1)
    crops={}
    for o in db.query(Order).all(): crops[o.crop]=crops.get(o.crop,0)+o.quantity
    supply={}
    for l in db.query(ProduceListing).all():
        supply[l.produce_id]=supply.get(l.produce_id,0)+l.quantity
    return {
        "kpis":{"orders_today":orders,"active_shipments":active,"farmers":farmers,"drivers_online":drivers,
                "vehicles_available":vehicles,"at_risk_lots":at_risk,"delayed_shipments":delayed,"on_time":ontime},
        "demand_by_crop":[{"crop":k,"quantity":v} for k,v in crops.items()],
        "orders_by_day":[{"day":(datetime.utcnow()-timedelta(days=i)).strftime("%a"),"orders":max(0,orders-i)} for i in range(6,-1,-1)],
        "fleet":[{"label":"Vehicle utilization","value":86},{"label":"Demand fulfilled","value":92},{"label":"Driver acceptance","value":84}],
        "freshness":[{"risk":"LOW","count":db.query(Lot).filter(Lot.freshness_score>=70).count()},
                     {"risk":"MEDIUM","count":db.query(Lot).filter(Lot.freshness_score.between(40,69)).count()},
                     {"risk":"HIGH","count":db.query(Lot).filter(Lot.freshness_score<40).count()}],
        "demo": True
    }

@router.get("/forecast/demand")
def forecast(db:Session=Depends(get_db), user=Depends(current_user)):
    totals={}
    for o in db.query(Order).all(): totals[o.crop]=totals.get(o.crop,0)+o.quantity
    if not totals: totals={"Tomato":750,"Onion":420,"Potato":300}
    return {"demo":True,"forecast":[{"crop":c,"tomorrow":round(q*1.08),"next_3_days":round(q*2.75)} for c,q in totals.items()]}

@router.get("/supply-demand")
def supply_demand(db:Session=Depends(get_db), user=Depends(current_user)):
    prod={p.id:p.name for p in db.query(__import__("app.models",fromlist=["Produce"]).Produce).all()}
    supply={name:0 for name in prod.values()}
    demand={}
    for l in db.query(ProduceListing).all():
        supply[prod.get(l.produce_id,"Other")]=supply.get(prod.get(l.produce_id,"Other"),0)+l.remaining_qty
    for o in db.query(Order).all():
        demand[o.crop]=demand.get(o.crop,0)+o.quantity
    crops=sorted(set(supply)|set(demand))
    return [{"crop":c,"supply":round(supply.get(c,0)),"demand":round(demand.get(c,0)),"balance":round(supply.get(c,0)-demand.get(c,0))} for c in crops]
