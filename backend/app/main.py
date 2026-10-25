"""FastAPI application entrypoint for AICTE Validation Platform."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.services.compliance_service import compliance_service
from app.api import api_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_db():
    """Create all tables and seed default administrator and compliance rules."""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified / created.")

        db = SessionLocal()
        try:
            # Seed default admin user if absent
            admin = db.query(User).filter(User.email == "admin@aicte-india.org").first()
            if not admin:
                admin_user = User(
                    email="admin@aicte-india.org",
                    hashed_password=hash_password("admin123"),
                    full_name="AICTE Approval Bureau Head",
                    role=UserRole.ADMIN,
                    institution_name="AICTE Headquarters New Delhi",
                )
                db.add(admin_user)
                logger.info("Default admin user created: admin@aicte-india.org")

            # Seed scrutiny officer
            scrutiny = db.query(User).filter(User.email == "scrutiny@aicte-india.org").first()
            if not scrutiny:
                scrutiny_user = User(
                    email="scrutiny@aicte-india.org",
                    hashed_password=hash_password("scrutiny123"),
                    full_name="Regional Scrutiny Officer",
                    role=UserRole.SCRUTINY,
                    institution_name="AICTE Regional Office",
                )
                db.add(scrutiny_user)
                logger.info("Default scrutiny officer created: scrutiny@aicte-india.org")

            # Seed institution user
            inst = db.query(User).filter(User.email == "principal@apex.edu.in").first()
            if not inst:
                inst_user = User(
                    email="principal@apex.edu.in",
                    hashed_password=hash_password("apex123"),
                    full_name="Dr. S. K. Ramanathan (Principal)",
                    role=UserRole.INSTITUTION,
                    institution_name="Apex Institute of Technology & Engineering",
                )
                db.add(inst_user)
                logger.info("Default institution user created: principal@apex.edu.in")

            db.commit()

            # Seed compliance rules
            compliance_service.seed_default_rules(db)
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"Database initialization warning (will retry on container start): {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting AICTE Validation Platform Backend...")
    init_db()
    yield
    # Shutdown
    logger.info("Shutting down AICTE Validation Platform Backend...")


app = FastAPI(
    title=settings.APP_NAME,
    description="Intelligent AICTE Approval Validation, OCR Extraction, Forgery Detection & Evidence-Linked Governance Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all API endpoints
app.include_router(api_router)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "debug": settings.DEBUG,
    }


@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "docs": "/docs",
        "health": "/health",
    }
