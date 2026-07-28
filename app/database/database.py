from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Yield a database session, ensuring it is closed after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema() -> None:
    """Apply lightweight schema upgrades needed for fractional share quantities."""
    with engine.begin() as connection:
        exists = connection.execute(
            text(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_name = 'trades'"
            )
        ).scalar()
        if not exists:
            return
        connection.execute(
            text(
                "ALTER TABLE trades "
                "ALTER COLUMN quantity TYPE NUMERIC(18, 6) "
                "USING quantity::numeric"
            )
        )
