from fastapi import APIRouter, Request

from app.models.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health(request: Request) -> HealthResponse:
    corpus_ready = request.app.state.library.ready
    return HealthResponse(status="ready" if corpus_ready else "degraded", corpus_ready=corpus_ready)