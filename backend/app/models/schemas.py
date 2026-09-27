from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: Literal["ready", "degraded"]
    corpus_ready: bool


class PaperSummary(BaseModel):
    id: str
    title: str
    authors: list[str]
    year: int
    status: Literal["indexed", "processing"]
    chunk_count: int


class PapersResponse(BaseModel):
    items: list[PaperSummary]


class UploadResponse(BaseModel):
    paper_id: str
    status: Literal["indexed"]
    chunk_count: int


class SearchRequest(BaseModel):
    query: str = Field(min_length=3, max_length=2000)
    method: Literal["bm25", "hybrid"] = "hybrid"
    dense_weight: float = Field(default=0.55, ge=0, le=1)
    top_k: int = Field(default=5, ge=1, le=50)


class SearchResult(BaseModel):
    paper_id: str
    title: str
    section: str
    snippet: str
    score: float
    rank: int


class SearchResponse(BaseModel):
    results: list[SearchResult]


class EvaluationRun(BaseModel):
    method: Literal["bm25", "hybrid"]
    precision_at_k: float
    recall_at_k: float
    mrr: float


class EvaluationResponse(BaseModel):
    runs: list[EvaluationRun]