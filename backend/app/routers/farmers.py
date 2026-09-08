from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import (
    Farmer,
    Produce,
    ProduceListing,
    User,
    Order,
    Shipment,
    Lot,
    Notification,
    FarmerSupplyMatch,
    DemandCluster,
    AnalyticsEvent,
)
from ..schemas import ProduceIn
from ..security import current_user, require_roles

router = APIRouter()


@router.get("")
def farmers(db: Session = Depends(get_db), user=Depends(current_user)):
    rows = db.query(Farmer).all()
    return [
        {
            "id": f.id,
            "farmer_code": f.farmer_code,
            "location": f.location,
            "earnings": f.earnings,
            "lat": f.lat,
            "lng": f.lng,
        }
        for f in rows
    ]


@router.post("/produce", dependencies=[Depends(require_roles("farmer", "admin"))])
def list_produce(
    data: ProduceIn,
    db: Session = Depends(get_db),
    user=Depends(current_user),
):
    farmer = db.query(Farmer).filter(Farmer.user_id == user.id).first()

    if not farmer:
        raise HTTPException(404, "Farmer profile not found")

    crop = (
        db.query(Produce)
        .filter(Produce.name.ilike(data.crop))
        .first()
    )

    if not crop:
        crop = Produce(
            name=data.crop.title(),
            base_price=data.expected_price,
        )
        db.add(crop)
        db.commit()
        db.refresh(crop)

    listing = ProduceListing(
        farmer_id=farmer.id,
        produce_id=crop.id,
        quantity=data.quantity,
        remaining_qty=data.quantity,
        expected_grade=data.expected_grade,
        harvest_date=data.harvest_date,
        available_date=data.available_date,
        location=data.location,
        expected_price=data.expected_price,
    )

    db.add(listing)

    db.add(
        Notification(
            user_id=user.id,
            title="Produce listed",
            message=f"{data.quantity:g} kg {crop.name} was added to your supply.",
            kind="SUCCESS",
        )
    )

    db.commit()
    db.refresh(listing)

    return {
        "id": listing.id,
        "message": "Produce listed successfully",
        "remaining_qty": listing.remaining_qty,
    }


@router.get("/me")
def farmer_me(
    db: Session = Depends(get_db),
    user=Depends(current_user),
):
    farmer = (
        db.query(Farmer)
        .filter(Farmer.user_id == user.id)
        .first()
    )

    if not farmer:
        raise HTTPException(404, "Farmer profile not found")

    listings = (
        db.query(ProduceListing)
        .filter(ProduceListing.farmer_id == farmer.id)
        .order_by(ProduceListing.id.desc())
        .all()
    )

    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(8)
        .all()
    )

    return {
        "farmer": {
            "id": farmer.id,
            "code": farmer.farmer_code,
            "location": farmer.location,
            "earnings": farmer.earnings,
            "lat": farmer.lat,
            "lng": farmer.lng,
        },
        "listings": [
            {
                "id": l.id,
                "crop_id": l.produce_id,
                "quantity": l.quantity,
                "remaining_qty": l.remaining_qty,
                "grade": l.expected_grade,
                "location": l.location,
            }
            for l in listings
        ],
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "kind": n.kind,
            }
            for n in notifications
        ],
    }


@router.get("/farm")
def farm_summary(
    db: Session = Depends(get_db),
    user=Depends(current_user),
):
    farmer = (
        db.query(Farmer)
        .filter(Farmer.user_id == user.id)
        .first()
    )

    if not farmer:
        raise HTTPException(404, "Farmer profile not found")

    listings = (
        db.query(ProduceListing)
        .filter(ProduceListing.farmer_id == farmer.id)
        .all()
    )

    return {
        "farmer_code": farmer.farmer_code,
        "location": farmer.location,
        "lat": farmer.lat,
        "lng": farmer.lng,
        "earnings": farmer.earnings,
        "listing_count": len(listings),
        "available_kg": round(
            sum(float(x.remaining_qty or 0) for x in listings), 2
        ),
    }


@router.get("/market")
def farmer_market(
    db: Session = Depends(get_db),
    user=Depends(current_user),
):
    farmer = (
        db.query(Farmer)
        .filter(Farmer.user_id == user.id)
        .first()
    )

    if not farmer:
        raise HTTPException(404, "Farmer profile not found")

    listings = (
        db.query(ProduceListing)
        .filter(ProduceListing.farmer_id == farmer.id)
        .all()
    )

    crop_name = "Tomato"

    if listings:
        crop = db.get(Produce, listings[0].produce_id)
        if crop:
            crop_name = crop.name

    produce = (
        db.query(Produce)
        .filter(Produce.name.ilike(crop_name))
        .first()
    )

    price = float(produce.base_price) if produce else None

    supply = 0.0
    if produce:
        supply = float(
            db.query(
                func.coalesce(func.sum(ProduceListing.remaining_qty), 0)
            )
            .filter(ProduceListing.produce_id == produce.id)
            .scalar()
            or 0
        )

    order_demand = float(
        db.query(
            func.coalesce(func.sum(Order.quantity), 0)
        )
        .filter(Order.crop.ilike(crop_name))
        .scalar()
        or 0
    )

    cluster_demand = float(
        db.query(
            func.coalesce(func.sum(DemandCluster.total_quantity), 0)
        )
        .filter(DemandCluster.crop.ilike(crop_name))
        .scalar()
        or 0
    )

    demand = max(order_demand, cluster_demand)

    return {
        "crop": crop_name,
        "price": price,
        "demand_kg": round(demand, 2),
        "supply_kg": round(supply, 2),
        "balance_kg": round(supply - demand, 2),
        "source": "Krishi Marg database",
    }


@router.get("/advisory")
def farmer_advisory(
    db: Session = Depends(get_db),
    user=Depends(current_user),
):
    farmer = (
        db.query(Farmer)
        .filter(Farmer.user_id == user.id)
        .first()
    )

    if not farmer:
        raise HTTPException(404, "Farmer profile not found")

    listings = (
        db.query(ProduceListing)
        .filter(ProduceListing.farmer_id == farmer.id)
        .all()
    )

    recommendations = []

    if not listings:
        recommendations.append(
            {
                "crop": "Farm",
                "advice": "Create a produce listing so the platform can match your supply with demand.",
            }
        )
    else:
        for listing in listings[:5]:
            produce = db.get(Produce, listing.produce_id)
            crop_name = produce.name if produce else "Produce"

            if listing.expected_grade == "A":
                advice = "Maintain current quality and prepare for grade-aware matching."
            else:
                advice = "Consider quality improvement before collection to increase acceptance."

            if listing.remaining_qty >= 300:
                advice += " Large available quantity: consider arranging pickup early."

            recommendations.append(
                {
                    "crop": crop_name,
                    "advice": advice,
                }
            )

    return {
        "summary": f"Advisory generated from {len(listings)} active listing(s).",
        "recommendations": recommendations,
        "source": "Krishi Marg farmer supply records",
    }


@router.get("/pickups")
def farmer_pickups(
    db: Session = Depends(get_db),
    user=Depends(current_user),
):
    farmer = (
        db.query(Farmer)
        .filter(Farmer.user_id == user.id)
        .first()
    )

    if not farmer:
        raise HTTPException(404, "Farmer profile not found")

    lots = (
        db.query(Lot)
        .filter(Lot.farmer_id == farmer.id)
        .all()
    )

    lot_ids = [lot.id for lot in lots]

    shipments = []

    if lot_ids:
        shipments = (
            db.query(Shipment)
            .filter(Shipment.lot_id.in_(lot_ids))
            .order_by(Shipment.created_at.desc())
            .all()
        )

    matches = (
        db.query(FarmerSupplyMatch)
        .filter(FarmerSupplyMatch.farmer_id == farmer.id)
        .order_by(FarmerSupplyMatch.id.desc())
        .all()
    )

    result = []

    for shipment in shipments:
        lot = db.get(Lot, shipment.lot_id)

        result.append(
            {
                "id": shipment.id,
                "shipment_code": shipment.shipment_code,
                "crop": lot.crop if lot else "Produce",
                "quantity": lot.quantity if lot else 0,
                "stage": shipment.current_stage,
                "status": shipment.status,
                "eta": shipment.eta,
            }
        )

    for match in matches:
        if not any(x["id"] == match.id for x in result):
            crop_obj = db.get(Produce, listing.produce_id) if listing else None
            crop_label = crop_obj.name if crop_obj else "Farm produce"

            result.append(
                {
                    "id": match.id,
                    "shipment_code": f"KM-PICK-{match.id:04d}",
                    "crop": crop_label,
                    "quantity": match.quantity,
                    "stage": "SCHEDULED_FOR_PICKUP",
                    "status": "AWAITING_REEFER_COLLECTION",
                    "eta": "Scheduled 09:30 AM - 11:00 AM",
                    "listing_id": listing.id if listing else None,
                }
            )

    return {
        "pickups": result,
        "count": len(result),
    }


@router.post("/support")
def support_request(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    user=Depends(current_user),
):
    message = str(data.get("message", "")).strip()

    if len(message) < 5:
        raise HTTPException(
            400,
            "Support message must contain at least 5 characters.",
        )

    farmer = (
        db.query(Farmer)
        .filter(Farmer.user_id == user.id)
        .first()
    )

    if not farmer:
        raise HTTPException(404, "Farmer profile not found")

    admin = (
        db.query(User)
        .filter(User.role == "admin")
        .order_by(User.id)
        .first()
    )

    event = AnalyticsEvent(
        event_type="FARMER_SUPPORT_REQUEST",
        value=1,
    )

    db.add(event)
    db.flush()

    ticket_code = f"KM-SUP-{event.id:05d}"

    db.add(
        Notification(
            user_id=user.id,
            title="Support request submitted",
            message=f"{ticket_code}: Your support request has been received.",
            kind="SUPPORT",
        )
    )

    if admin:
        db.add(
            Notification(
                user_id=admin.id,
                title="New farmer support request",
                message=f"{ticket_code} from {farmer.farmer_code}: {message}",
                kind="SUPPORT",
            )
        )

    db.commit()

    return {
        "ticket_code": ticket_code,
        "status": "SUBMITTED",
        "message": "Support request submitted successfully.",
    }


@router.get("/qr/{farmer_code}")
def farmer_qr(
    farmer_code: str,
    db: Session = Depends(get_db),
):
    farmer = (
        db.query(Farmer)
        .filter(Farmer.farmer_code == farmer_code)
        .first()
    )

    if not farmer:
        raise HTTPException(404, "Farmer not found")

    return {
        "payload": {
            "type": "FARMER",
            "farmer_code": farmer.farmer_code,
            "farmer_id": farmer.id,
        }
    }
