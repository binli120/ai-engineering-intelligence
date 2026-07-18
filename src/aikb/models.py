from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl

Authority = Literal["primary", "secondary", "community"]
SourceType = Literal["documentation", "github", "rss", "blog", "paper", "video"]


class Source(BaseModel):
    id: str
    name: str
    category: str
    authority: Authority
    type: SourceType
    url: HttpUrl
    release_url: HttpUrl | None = None
    priority: int = Field(ge=0, le=100)
    enabled: bool = True
    refresh_interval_days: int = Field(default=1, ge=1)
    retention_days: int = Field(default=365, ge=1)
    max_items: int = Field(default=20, ge=1, le=100)


class KnowledgeItem(BaseModel):
    id: str
    title: str
    source_id: str
    url: HttpUrl
    published_at: datetime | None = None
    collected_at: datetime
    category: str
    summary: str = ""
    evidence_quality: int = Field(default=50, ge=0, le=100)
    engineering_impact: int = Field(default=50, ge=0, le=100)
    maturity: Literal["stable", "preview", "beta", "alpha", "deprecated", "unknown"] = "unknown"
    tags: list[str] = Field(default_factory=list)
