"""Authentication endpoints (Registration, Login, User profile)."""

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.core.dependencies import get_current_user
from app.models.user import User, UserRole
from app.schemas.auth import UserCreate, UserLogin, UserResponse, Token
from app.services.audit_service import audit_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Annotated[Session, Depends(get_db)]):
    """Register a new user account."""
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    user = User(
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        institution_name=user_in.institution_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    audit_service.log_event(
        db=db,
        action="USER_REGISTERED",
        user_id=user.id,
        details={"email": user.email, "role": user.role.value},
    )
    return user


@router.post("/login", response_model=Token)
def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
):
    """OAuth2 password login returning a JWT token."""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled"
        )

    token = create_access_token(
        data={"sub": str(user.id), "role": user.role.value, "email": user.email}
    )

    audit_service.log_event(
        db=db,
        action="USER_LOGIN",
        user_id=user.id,
        details={"email": user.email},
    )

    return Token(
        access_token=token,
        token_type="bearer",
        role=user.role.value,
        full_name=user.full_name,
        email=user.email,
    )


@router.post("/login-json", response_model=Token)
def login_json(
    credentials: UserLogin,
    db: Annotated[Session, Depends(get_db)],
):
    """JSON login endpoint accepting standard JSON payload."""
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled"
        )

    token = create_access_token(
        data={"sub": str(user.id), "role": user.role.value, "email": user.email}
    )

    audit_service.log_event(
        db=db,
        action="USER_LOGIN_JSON",
        user_id=user.id,
        details={"email": user.email},
    )

    return Token(
        access_token=token,
        token_type="bearer",
        role=user.role.value,
        full_name=user.full_name,
        email=user.email,
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: Annotated[User, Depends(get_current_user)]):
    """Get profile of currently authenticated user."""
    return current_user
