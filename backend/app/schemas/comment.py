from datetime import datetime

from pydantic import BaseModel, Field


class CommentCreate(BaseModel):
    author_name: str = Field(min_length=1, max_length=60)
    body: str = Field(min_length=1, max_length=1000)


class CommentOut(BaseModel):
    comment_id: str
    halte_id: str
    author_name: str
    body: str
    created_at: datetime
