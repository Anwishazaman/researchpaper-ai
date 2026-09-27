import logging

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool

from app.models.schemas import AnswerRequest, AnswerResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/answer", response_model=AnswerResponse)
async def answer(request: Request, payload: AnswerRequest) -> AnswerResponse:
    try:
        return await run_in_threadpool(request.app.state.library.answer, payload)
    except Exception as error:
        logger.exception("Local answer generation failed")
        raise HTTPException(
            status_code=503,
            detail=(
                "The local answer model is unavailable. Check backend dependencies "
                "and network access for its first-time download."
            ),
        ) from error