from datetime import datetime
from math import sqrt
from sqlalchemy.orm import Session
from sqlalchemy import func
from .models import Produce, ProduceListing, Order, DemandCluster, FarmerSupplyMatch, Farmer, User, Notification, Lot, Shipment, Vehicle, DriverRequest, TrackingEvent, TemperatureLog

GRADE_FACTOR = {"A": 1.0, "B": 0.91, "C": 0.78}
CROP_LIFE = {"Tomato": 5, "Onion": 25, "Potato": 20, "Chilli": 8, "Other": 7}

def distance_km(lat1, lon1, lat2, lon2):
    # Fast deterministic fallback suitable for the prototype; OSRM can replace it.
    return round(sqrt(((lat2-lat1)*111)**2 + ((lon2-lon1)*106)**2), 2)

def make_notification(db, user_id, title, message, kind="INFO"):
    db.add(Notification(user_id=user_id, title=title, message=message, kind=kind))

def aggregate_demand(db: Session):
    db.query(DemandCluster).delete()
    db.commit()
    rows = db.query(Order).filter(Order.status != "DELIVERED").all()
    groups = {}
    for o in rows:
        key = (o.crop.lower(), o.destination.lower(), o.delivery_window.lower(), o.grade_preference.lower())
        groups.setdefault(key, {"crop": o.crop, "destination": o.destination, "delivery_window": o.delivery_window, "grade": o.grade_preference, "qty": 0})
        groups[key]["qty"] += o.quantity
    # B2B requirements are deliberately included in the same demand pool.
    try:
        from .models import BuyerRequirement
        for r in db.query(BuyerRequirement).filter(BuyerRequirement.status=="OPEN").all():
            key = (r.crop.lower(), r.destination.lower(), "B2B recurring", r.grade.lower())
            groups.setdefault(key, {"crop": r.crop, "destination": r.destination, "delivery_window": "B2B recurring", "grade": r.grade, "qty": 0})
            groups[key]["qty"] += r.quantity
    except Exception:
        pass
    clusters = []
    for g in groups.values():
        c = DemandCluster(crop=g["crop"], destination=g["destination"], delivery_window=g["delivery_window"], grade_preference=g["grade"], total_quantity=g["qty"])
        db.add(c); clusters.append(c)
    db.commit()
    return clusters

def match_supply(db: Session):
    clusters = db.query(DemandCluster).filter(DemandCluster.status.in_(["OPEN","PARTIAL"])).all()
    total = 0
    for c in clusters:
        remaining = c.total_quantity
        listings = (
            db.query(ProduceListing)
            .join(Produce, Produce.id == ProduceListing.produce_id)
            .filter(Produce.name.ilike(c.crop), ProduceListing.remaining_qty > 0)
            .order_by(ProduceListing.harvest_date.asc())
            .all()
        )
        for l in listings:
            if remaining <= 0: break
            farmer = db.get(Farmer, l.farmer_id)
            qty = min(remaining, l.remaining_qty)
            freshness_bonus = max(0, 100 - (datetime.utcnow() - l.harvest_date).total_seconds()/86400 * 12)
            grade_bonus = 100 if l.expected_grade in c.grade_preference else 65
            dist_penalty = distance_km(farmer.lat, farmer.lng, 17.385, 78.486)
            score = round(freshness_bonus * 0.45 + grade_bonus * 0.35 + max(0, 100-dist_penalty) * 0.20, 1)
            db.add(FarmerSupplyMatch(cluster_id=c.id, farmer_id=farmer.id, listing_id=l.id, quantity=qty, score=score))
            l.remaining_qty -= qty
            remaining -= qty
            total += qty
        c.matched_quantity = c.total_quantity - remaining
        c.status = "MATCHED" if remaining <= 0 else "PARTIAL"
    db.commit()
    return total

def freshness(lot: Lot):
    age = max(0, (datetime.utcnow() - lot.harvest_time).total_seconds()/86400)
    life = CROP_LIFE.get(lot.crop, 7)
    age_score = max(0, 100 - age/life*65)
    grade = GRADE_FACTOR.get(lot.grade, .8)*15
    temp_penalty = max(0, abs(lot.temperature-8)*2.5)
    stage_penalty = {"COLLECTION": 0, "PACKAGING": 5, "HUB": 10, "LAST_MILE": 15, "DELIVERED": 25}.get(lot.current_stage, 8)
    score = max(0, min(100, age_score + grade - temp_penalty - stage_penalty))
    return round(score, 1)

def recalc_order(db: Session, order: Order, grade: str | None = None):
    produce = db.query(Produce).filter(func.lower(Produce.name) == order.crop.lower()).first()
    base = produce.base_price if produce else order.produce_cost/max(order.quantity,1)
    factor = GRADE_FACTOR.get(grade or order.grade_preference[:1], 1)
    order.produce_cost = round(order.quantity * base * factor, 2)
    order.logistics_estimate = round(150 + order.quantity * 0.9, 2)
    order.total_estimate = round(order.produce_cost + order.logistics_estimate, 2)
    return order
