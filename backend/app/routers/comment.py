"""Per-halte comments -- a social-feed-style feature the citizen-facing map
wants even though there's no real user base yet (see AppHeader's history note
on why this project has no login/account system): "author_name" is plain
free text a commenter types in, not a foreign key to an account.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models.comment import HalteComment
from app.models.halte import HalteSurvey
from app.schemas.comment import CommentCreate, CommentOut

router = APIRouter()


@router.get("/halte/{halte_id}/comments", response_model=list[CommentOut])
async def list_comments(halte_id: str, session: AsyncSession = Depends(get_session)) -> list[CommentOut]:
    result = await session.execute(
        select(HalteComment).where(HalteComment.halte_id == halte_id).order_by(HalteComment.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("/halte/{halte_id}/comments", response_model=CommentOut, status_code=201)
async def create_comment(
    halte_id: str, body: CommentCreate, session: AsyncSession = Depends(get_session)
) -> HalteComment:
    halte = await session.get(HalteSurvey, halte_id)
    if halte is None:
        raise HTTPException(status_code=404, detail="Halte tidak ditemukan.")

    comment = HalteComment(
        comment_id=str(uuid.uuid4()),
        halte_id=halte_id,
        author_name=body.author_name.strip(),
        body=body.body.strip(),
    )
    session.add(comment)
    await session.commit()
    await session.refresh(comment)
    return comment
