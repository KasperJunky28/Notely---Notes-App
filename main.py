from fastapi import FastAPI
from contextlib import asynccontextmanager
from pathlib import Path
from database import Base, engine
from fastapi.staticfiles import StaticFiles
from image_utils import PROFILE_PICTURES_DIR


from routers.notes import router as notes_router
from routers.users import router as users_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

app = FastAPI(lifespan=lifespan)

PROFILE_PICTURES_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/profile_pictures", StaticFiles(directory=str(PROFILE_PICTURES_DIR)),name="profile_pictures")

app.include_router(notes_router)
app.include_router(users_router)

FRONTEND_DIR = Path(__file__).parent / "frontend"
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")