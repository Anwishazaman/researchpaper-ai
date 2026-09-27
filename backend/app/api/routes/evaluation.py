from fastapi import APIRouter, Query, Request
from starlette.concurrency import run_in_threadpool

from app.models.schemas import EvaluationResponse

router = APIRouter()


@router.get("/evaluation", response_model=EvaluationResponse)
async def evaluate(
    request: Request, top_k: int = Query(default=5, ge=1, le=50)
) -> EvaluationResponse:
    runs = await run_in_threadpool(request.app.state.library.evaluate, top_k)
    return EvaluationResponse(runs=runs)