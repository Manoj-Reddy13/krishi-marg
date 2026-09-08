from fastapi import APIRouter
from sqlalchemy.orm import Session
from fastapi import Depends
from ..database import get_db
from ..models import Produce

router = APIRouter()

@router.get("/produce")
def public_produce(db: Session = Depends(get_db)):
    return [
        {"id": p.id, "crop": p.name, "unit": p.unit, "base_price": p.base_price}
        for p in db.query(Produce).all()
    ]
