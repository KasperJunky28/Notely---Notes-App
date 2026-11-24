from fastapi import FastAPI
from contextlib import asynccontextmanager
from pathlib import Path
from database import Base, engine
from fastapi.staticfiles import StaticFiles
from routers.notes import router as notes_router
from routers.users import router as users_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

app = FastAPI(lifespan=lifespan)
app.include_router(notes_router)
app.include_router(users_router)

FRONTEND_DIR = Path(__file__).parent / "frontend"
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")