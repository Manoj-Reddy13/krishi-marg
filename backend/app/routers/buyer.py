from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..security import current_user, require_roles
from ..models import BuyerRequirement
from ..schemas import BuyerRequirementIn

router=APIRouter(prefix="/buyer", tags=["Buyer"])

@router.post("/requirements", dependencies=[Depends(require_roles("buyer","customer","admin"))])
def create_requirement(data:BuyerRequirementIn, db:Session=Depends(get_db), user=Depends(current_user)):
    r=BuyerRequirement(buyer_user_id=user.id,crop=data.crop.title(),quantity=data.quantity,grade=data.grade,destination=data.destination,cadence=data.cadence)
    db.add(r);db.commit();db.refresh(r)
    return {"id":r.id,"status":r.status}
@router.get("/requirements")
def requirements(db:Session=Depends(get_db), user=Depends(current_user)):
    q=db.query(BuyerRequirement)
    if user.role in ("buyer", "customer"):
        user_reqs = q.filter(BuyerRequirement.buyer_user_id==user.id).all()
        if user_reqs:
            return [{"id":r.id,"crop":r.crop,"quantity":r.quantity,"grade":r.grade,"destination":r.destination,"cadence":r.cadence,"status":r.status} for r in user_reqs]
    return [{"id":r.id,"crop":r.crop,"quantity":r.quantity,"grade":r.grade,"destination":r.destination,"cadence":r.cadence,"status":r.status} for r in q.all()]
