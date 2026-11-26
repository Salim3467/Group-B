from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .config import settings
from .database import Base, engine
from . import models  # noqa: F401 - registers SQLAlchemy models
from .kri_report import router as kri_report_router


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="API foundation for the bank's KRI collection, review and reporting portal.",
)

app.include_router(kri_report_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.on_event("startup")
def create_development_schema() -> None:
    # Development bootstrap only. Production deployments must use versioned migrations.
    Base.metadata.create_all(bind=engine)


@app.get("/", tags=["system"])
def root():
    return {"application": settings.app_name, "status": "running", "version": "0.1.0"}


@app.get("/health", tags=["system"])
def health():
    return {"status": "healthy"}


@app.get("/ready", tags=["system"])
def readiness():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ready", "database": "connected"}
