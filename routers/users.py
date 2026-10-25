from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import User
from schemas import UserCreate, UserResponse, UserUpdate, UserPatch, LoginRequest, Token
from pwdlib import PasswordHash
from auth import create_access_token, get_current_user
from image_utils import validate_image, save_profile_image, MAX_FILE_SIZE

router = APIRouter(tags=["users"])

password_hash = PasswordHash.recommended()
def hash_password(password: str) -> str:
    return password_hash.hash(password)


@router.get("/users/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user),):
    return current_user

@router.post("/login", response_model=Token)
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):

    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalars().first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User does not exist",
        )

    if not password_hash.verify(
        credentials.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(user.id)

    return Token(
        access_token=access_token,
        token_type="bearer",
    )

@router.post("/users/me/profile-picture", response_model=UserResponse)
async def upload_proflie_picture(file: UploadFile, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    contents = await file.read(MAX_FILE_SIZE + 1)

    if not contents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="uploaded file is empty.")
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail="Image must be smaller than 2 MB.")

    try:
        extension = validate_image(contents)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=str(exc)) from exc

    try:
        image_url = save_profile_image(contents, extension)
        current_user.profile_image = image_url

        await db.commit()
        await db.refresh(current_user)

        return current_user
    except Exception:
        await db.rollback()

        if image_url:
            from image_utils import PROFILE_PICTURES_DIR
            filename = image_url.rsplit("/", 1)[-1]
            saved_file = PROFILE_PICTURES_DIR / filename

            if saved_file.exists():
                saved_file.unlink()

            raise

    finally:
        await file.close()

@router.post("/users", response_model=UserResponse)
async def create_user(firstName: str = Form(...),
    lastName: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    profile_image: UploadFile | None = File(default=None), db: AsyncSession = Depends(get_db)):

    query = select(User).where(User.email == email)
    result = await db.execute(query)

    if result.scalars().first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with this email already exists")

    image_url = None

    try:
        if profile_image is not None:
            contents = await profile_image.read(MAX_FILE_SIZE + 1)

            if not contents:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Uploaded image is empty.",
                )

            if len(contents) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail="Image must be smaller than 2 MB.",
                )

            try:
                extension = validate_image(contents)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(exc),
                ) from exc

            image_url = save_profile_image(contents, extension)


        new_user = User(
            firstName=firstName,
            lastName=lastName,
            email=email,
            hashed_password=hash_password(password),
            profile_image=image_url,
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        return new_user
    
    except Exception:
        await db.rollback()

        if image_url is not None:
            from image_utils import PROFILE_PICTURES_DIR

            filename = image_url.rsplit("/", 1)[-1]
            saved_file = PROFILE_PICTURES_DIR / filename

            if saved_file.exists():
                saved_file.unlink()

        raise

    finally:
        if profile_image is not None:
            await profile_image.close()

@router.get("/users", response_model=list[UserResponse])
async def get_users(
    firstName: str | None = None,
    lastName: str | None = None,
    email: str | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db)):

    query = select(User)

    if firstName is not None:
        query = query.where(User.firstName == firstName)

    if lastName is not None:
        query = query.where(User.lastName == lastName)

    if email is not None:
        query = query.where(User.email == email)

    if search is not None:
        query = query.where(
            or_(
                User.firstName.contains(search),
                User.lastName.contains(search),
                User.email.contains(search),
            )
        )

    result = await db.execute(query)
    return result.scalars().all()

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db)):
    
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalars().first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user

@router.delete("/users/{user_id}")
async def delete_user(user_id: int,db: AsyncSession = Depends(get_db)):
    
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalars().first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    await db.delete(user)
    await db.commit()

    return {"message": "User deleted successfully"}

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user_full(
    user_id: int,
    updated_user: UserUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalars().first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.firstName = updated_user.firstName
    user.lastName = updated_user.lastName
    user.email = updated_user.email

    await db.commit()
    await db.refresh(user)

    return user

@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_User(
    user_id: int,
    updated_user: UserPatch,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalars().first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    update_data = updated_user.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(user, key, value)

    await db.commit()
    await db.refresh(user)

    return user