
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import Note, User
from schemas import NoteCreate, NoteResponse, NoteUpdate, NotePatch
from auth import get_current_user

router = APIRouter(tags=["notes"])

async def get_user_note(note_id: int,current_user: User,db: AsyncSession) -> Note:

    result = await db.execute(select(Note).where(Note.id == note_id, Note.user_id == current_user.id))
    note = result.scalars().first()

    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="Note not found",)

    return note


@router.post("/notes", response_model=NoteResponse)
async def create_note(note: NoteCreate,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_user)):

    new_note = Note(
        title=note.title,
        content=note.content,
        category=note.category,
        user_id=current_user.id,
    )

    db.add(new_note)
    await db.commit()
    await db.refresh(new_note)

    return new_note

@router.get("/notes", response_model=list[NoteResponse])
async def get_notes(category: str | None = None,completed: bool | None = None,search: str | None = None,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_user)):

    query = select(Note).where(Note.user_id == current_user.id)

    if category is not None:
        query = query.where(Note.category == category)

    if completed is not None:
        query = query.where(Note.completed == completed)

    if search is not None:
        query = query.where(or_(Note.title.contains(search),Note.content.contains(search)))

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/notes/{note_id}", response_model=NoteResponse)
async def get_note(note_id: int,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_user)):
    
    return await get_user_note(note_id, current_user, db)

@router.delete("/notes/{note_id}")
async def delete_note(note_id: int,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_user)):

    note = await get_user_note(note_id, current_user, db)

    await db.delete(note)
    await db.commit()

    return {"message": "Note deleted successfully"}


@router.put("/notes/{note_id}", response_model=NoteResponse)
async def update_note_full(note_id: int,updated_note: NoteUpdate,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_user)):

    note = await get_user_note(note_id, current_user, db)

    note.title = updated_note.title
    note.content = updated_note.content
    note.category = updated_note.category
    note.completed = updated_note.completed

    await db.commit()
    await db.refresh(note)

    return note


@router.patch("/notes/{note_id}", response_model=NoteResponse)
async def update_note(note_id: int,updated_note: NotePatch,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_user)):

    note = await get_user_note(note_id, current_user, db)

    update_data = updated_note.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(note, key, value)

    await db.commit()
    await db.refresh(note)

    return note
