from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(notes_router)
app.include_router(users_router)