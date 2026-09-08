from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import LoginIn, TokenOut
from ..security import verify_password, create_token, current_user

router = APIRouter()

@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"access_token": create_token(user), "user": {"id": user.id, "email": user.email, "name": user.name, "role": user.role}}

@router.get("/me")
def me(user=Depends(current_user)):
    return {"id": user.id, "email": user.email, "name": user.name, "role": user.role}

@router.get("/demo-accounts")
def demo_accounts(db: Session = Depends(get_db)):
    return [{"email": u.email, "name": u.name, "role": u.role} for u in db.query(User).filter(User.email.like("%@krishimarg.demo")).all()]
