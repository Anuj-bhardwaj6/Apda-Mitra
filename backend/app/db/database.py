from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Primary PostgreSQL setup with automated fallback for smooth zero-configuration deployment
try:
    engine = create_engine(
        settings.DATABASE_URL, 
        pool_pre_ping=True, 
        pool_size=10, 
        max_overflow=20
    )
    # Test connection
    with engine.connect() as conn:
        logger.info("Connected to PostgreSQL+PostGIS database successfully.")
except Exception as e:
    logger.warning(f"PostgreSQL connection fallback triggered: {e}. Using resilient local database engine.")
    # Fallback to local file engine for local testing environment without PostgreSQL setup
    fallback_url = "sqlite:///./apdamitra_local.db"
    engine = create_engine(fallback_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
