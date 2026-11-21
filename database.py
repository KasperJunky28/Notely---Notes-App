import os
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from sqlalchemy.orm import DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is missing")

engine = create_async_engine(
    DATABASE_URL,
    connect_args={"statement_cache_size":0},
    )

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
)

async def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        await db.close()


class Base(DeclarativeBase):
    pass