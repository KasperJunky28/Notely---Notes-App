from io import BytesIO
from uuid import uuid4
import logging
import os
from dotenv import load_dotenv
from PIL import Image, UnidentifiedImageError
from supabase import create_client

load_dotenv()
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
BUCKET = "profile-pictures"

if not SUPABASE_URL:
    raise RuntimeError("SUPABASE_URL environment variable is missing")
if not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_KEY environment variable is missing")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

MAX_FILE_SIZE = 2 * 1024 * 1024  # 2 MB
ALLOWED_FORMATS = {"JPEG": ".jpg","PNG": ".png","WEBP": ".webp",}
CONTENT_TYPES = {".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
MAX_IMAGE_PIXELS = 20_000_000

def validate_image(contents: bytes) -> str:

    try:
        with Image.open(BytesIO(contents)) as image:
            image_format = image.format
            width, height = image.size

            if width * height > MAX_IMAGE_PIXELS:
                raise ValueError("Image dimensions are too large.")

            image.verify()

    except (UnidentifiedImageError, OSError, SyntaxError):
        raise ValueError("Uploaded file is not a valid image.")

    if image_format not in ALLOWED_FORMATS:
        raise ValueError("Only JPEG, PNG and WebP images are allowed.")

    return ALLOWED_FORMATS[image_format]

def save_profile_image(contents: bytes, extension: str) -> str:
    try:
        filename = f"{uuid4().hex}{extension}"
        supabase.storage.from_(BUCKET).upload(
            path=filename,
            file=contents,
            file_options={"content-type":CONTENT_TYPES[extension]}
        )

        return supabase.storage.from_(BUCKET).get_public_url(filename)
    except Exception:
        logger.exception("Supabase upload to bucket %r failed", BUCKET)
        raise

def delete_profile_image(url: str) -> None:
    try:
        filename = url.rsplit("/", 1)[-1].split("?")[0]
        supabase.storage.from_(BUCKET).remove([filename])
    except Exception:
        logger.exception("Could not delete %r from bucket %r", url, BUCKET)