from pydantic import BaseModel


class NoteCreate(BaseModel):
    title: str
    content: str
    category: str

class NoteResponse(BaseModel):
    id: int
    title: str
    content: str
    category: str
    completed: bool

    model_config = {
        "from_attributes": True
    }

class NoteUpdate(BaseModel):
    title: str
    content: str
    category: str
    completed: bool

class NotePatch(BaseModel):
    title: str | None = None
    content: str | None = None
    category: str | None = None
    completed: bool | None = None

class UserCreate(BaseModel):
    firstName: str
    lastName: str
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    firstName: str
    lastName: str
    email: str
    profile_image: str | None = None

    model_config = {
        "from_attributes": True
    }

class UserUpdate(BaseModel):
    firstName: str
    lastName: str
    email: str

class UserPatch(BaseModel):
    firstName: str | None = None
    lastName: str | None = None
    email: str | None = None

class LoginRequest(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
