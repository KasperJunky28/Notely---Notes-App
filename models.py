from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True)
    title = Column(String)
    content = Column(String)
    category = Column(String)
    completed = Column(Boolean, default=False)
    user_id = Column(Integer,ForeignKey("users.id"),nullable=False)

    user = relationship("User", back_populates="notes")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    firstName = Column(String)
    lastName = Column(String)
    email = Column(String, unique=True)
    hashed_password = Column(String, nullable=False)
    profile_image = Column(String, nullable=True)

    notes = relationship("Note", back_populates="user")
