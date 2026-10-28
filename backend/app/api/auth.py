"""Authentication: institution self-registration, login, profile."""

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core import request_context
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.rate_limit import login_limiter
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User, UserRole
from app.schemas.auth import Token, UserCreate, UserLogin, UserResponse
from app.services.audit_service import audit_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Annotated[Session, Depends(get_db)]):
    """Self-registration creates an INSTITUTION account only. Official accounts are created by an admin."""
    email = user_in.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="A user with this email address already exists.")
    user = User(email=email, hashed_password=hash_password(user_in.password), full_name=user_in.full_name,
                role=UserRole.INSTITUTION, institution_name=user_in.institution_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    audit_service.log_event(db=db, action="USER_REGISTERED", user_id=user.id, actor_role="institution",
                            details={"email": user.email, "role": user.role.value})
    return user


def _login(db: Session, email: str, password: str) -> Token:
    email = email.lower().strip()
    key = f"{request_context.client_ip.get()}|{email}"
    if not login_limiter.allow(key):
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again in a minute.")
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        audit_service.log_event(db=db, action="LOGIN_FAILED", details={"email": email})
        raise HTTPException(status_code=401, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    audit_service.log_event(db=db, action="USER_LOGIN", user_id=user.id, actor_role=user.role.value, details={"email": user.email})
    return Token(access_token=token, role=user.role.value, full_name=user.full_name, email=user.email)


@router.post("/login", response_model=Token)
def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: Annotated[Session, Depends(get_db)]):
    """OAuth2 password flow (used by Swagger 'Authorize')."""
    return _login(db, form_data.username, form_data.password)


@router.post("/login-json", response_model=Token)
def login_json(credentials: UserLogin, db: Annotated[Session, Depends(get_db)]):
    return _login(db, credentials.email, credentials.password)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user
