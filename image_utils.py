from io import BytesIO
from pathlib import Path
from uuid import uuid4

from PIL import Image, UnidentifiedImageError


BASE_DIR = Path(__file__).resolve().parent
PROFILE_PICTURES_DIR = BASE_DIR / "profile_pictures"

MAX_FILE_SIZE = 2 * 1024 * 1024  # 2 MB

ALLOWED_FORMATS = {
    "JPEG": ".jpg",
    "PNG": ".png",
    "WEBP": ".webp",
}

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

    PROFILE_PICTURES_DIR.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid4().hex}{extension}"
    file_path = PROFILE_PICTURES_DIR / filename

    file_path.write_bytes(contents)

    return f"/profile_pictures/{filename}"