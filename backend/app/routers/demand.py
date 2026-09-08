from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..security import current_user, require_roles
from ..services import aggregate_demand, match_supply
from ..models import DemandCluster, FarmerSupplyMatch, Farmer, ProduceListing

router = APIRouter()

@router.post("/aggregate", dependencies=[Depends(require_roles("admin","collection"))])
def aggregate(db: Session = Depends(get_db), user=Depends(current_user)):
    rows = aggregate_demand(db)
    return [{"id":c.id,"crop":c.crop,"destination":c.destination,"quantity":c.total_quantity,"matched":c.matched_quantity,"status":c.status} for c in rows]

@router.post("/match", dependencies=[Depends(require_roles("admin","collection"))])
def match(db: Session = Depends(get_db), user=Depends(current_user)):
    qty = match_supply(db)
    return {"matched_quantity": qty, "message": "Supply matching completed"}

@router.get("")
def clusters(db: Session = Depends(get_db), user=Depends(current_user)):
    rows = db.query(DemandCluster).order_by(DemandCluster.created_at.desc()).all()
    return [{"id":c.id,"crop":c.crop,"destination":c.destination,"delivery_window":c.delivery_window,
             "grade":c.grade_preference,"quantity":c.total_quantity,"matched":c.matched_quantity,"status":c.status} for c in rows]

@router.get("/matches")
def matches(db: Session = Depends(get_db), user=Depends(current_user)):
    rows = db.query(FarmerSupplyMatch).order_by(FarmerSupplyMatch.score.desc()).all()
    result=[]
    for m in rows:
        f=db.get(Farmer,m.farmer_id); l=db.get(ProduceListing,m.listing_id)
        result.append({"id":m.id,"farmer":f.farmer_code if f else "—","quantity":m.quantity,"score":m.score,"listing_id":l.id if l else None,"status":m.status})
    return result
