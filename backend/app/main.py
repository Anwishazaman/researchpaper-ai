import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

import structlog
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import evaluation, health, papers, search
from app.core.config import Settings, get_settings
from app.services.library import PaperLibrary

logging.basicConfig(level=logging.INFO, format="%(message)s")
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ],
    logger_factory=structlog.stdlib.LoggerFactory(),
)
logger = structlog.get_logger(__name__)
DEMO_DIR = Path(__file__).resolve().parents[1] / "data" / "demo"


def create_app(settings: Settings | None = None) -> FastAPI:
    app_settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        app_settings.upload_dir.mkdir(parents=True, exist_ok=True)
        app_settings.index_dir.mkdir(parents=True, exist_ok=True)
        app_settings.cache_dir.mkdir(parents=True, exist_ok=True)
        application.state.settings = app_settings
        application.state.library = PaperLibrary(app_settings, DEMO_DIR)
        yield

    application = FastAPI(
        title="ResearchPaper AI API",
        description="Local-first search and evaluation for research papers.",
        version="0.1.0",
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    @application.middleware("http")
    async def log_requests(request: Request, call_next):
        started = time.perf_counter()
        response = await call_next(request)
        logger.info(
            "request.complete",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=round((time.perf_counter() - started) * 1000, 2),
        )
        return response

    @application.exception_handler(HTTPException)
    async def handle_http_error(_request: Request, error: HTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=error.status_code,
            content={"error": {"code": _error_code(error.status_code), "message": str(error.detail)}},
            headers=error.headers,
        )

    @application.exception_handler(RequestValidationError)
    async def handle_validation_error(
        _request: Request, error: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Request validation failed",
                    "details": jsonable_encoder(error.errors()),
                }
            },
        )

    @application.exception_handler(Exception)
    async def handle_unexpected_error(_request: Request, error: Exception) -> JSONResponse:
        logger.exception("request.failed", error=str(error))
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An unexpected server error occurred",
                }
            },
        )

    application.include_router(health.router, prefix="/api", tags=["health"])
    application.include_router(papers.router, prefix="/api", tags=["papers"])
    application.include_router(search.router, prefix="/api", tags=["search"])
    application.include_router(evaluation.router, prefix="/api", tags=["evaluation"])
    return application


def _error_code(status_code: int) -> str:
    return {
        400: "BAD_REQUEST",
        404: "NOT_FOUND",
        413: "FILE_TOO_LARGE",
        422: "VALIDATION_ERROR",
    }.get(status_code, "REQUEST_ERROR")


app = create_app()