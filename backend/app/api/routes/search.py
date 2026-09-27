from fastapi import APIRouter, Request
from starlette.concurrency import run_in_threadpool

from app.models.schemas import SearchRequest, SearchResponse

router = APIRouter()


@router.post("/search", response_model=SearchResponse)
async def search(request: Request, payload: SearchRequest) -> SearchResponse:
    results = await run_in_threadpool(request.app.state.library.search, payload)
    return SearchResponse(results=results)