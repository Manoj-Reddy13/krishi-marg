from datetime import datetime, timedelta, timezone
from jose import jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .config import settings
from .database import get_db
from .models import User

oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    try:
        pwd_bytes = password.encode('utf-8')[:72]
        return bcrypt.checkpw(pwd_bytes, hashed.encode('utf-8'))
    except Exception:
        return False

def create_token(user: User):
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": str(user.id), "role": user.role, "exp": exp}, settings.secret_key, algorithm="HS256")

def current_user(db: Session = Depends(get_db), token: str = Depends(oauth2)):
    try:
        data = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        uid = int(data["sub"])
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user = db.get(User, uid)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def require_roles(*roles):
    def dep(user=Depends(current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Role not permitted")
        return user
    return dep
