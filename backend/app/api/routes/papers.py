import json
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, Request, UploadFile, status
from starlette.concurrency import run_in_threadpool

from app.ingestion.pdf import extract_pdf_chunks
from app.models.schemas import PapersResponse, UploadResponse

router = APIRouter()


@router.get("/papers", response_model=PapersResponse)
async def list_papers(request: Request) -> PapersResponse:
    return PapersResponse(items=request.app.state.library.list_papers())


@router.post("/papers/upload", response_model=UploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_paper(request: Request, file: UploadFile = File(...)) -> UploadResponse:
    settings = request.app.state.settings
    filename = (file.filename or "paper.pdf").replace("\\", "/").rsplit("/", 1)[-1]
    if Path(filename).suffix.lower() != ".pdf" or file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Upload must be a PDF file")

    contents = await file.read(settings.max_upload_mb * 1024 * 1024 + 1)
    if len(contents) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail="PDF exceeds the configured upload limit")
    if not contents.startswith(b"%PDF-"):
        raise HTTPException(status_code=422, detail="The uploaded file is not a valid PDF")

    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    paper_id = str(uuid4())
    stored_path = settings.upload_dir / f"{paper_id}.pdf"
    metadata_path = stored_path.with_suffix(".json")
    try:
        stored_path.write_bytes(contents)
        metadata_path.write_text(json.dumps({"title": Path(filename).stem}), encoding="utf-8")
        chunks = await run_in_threadpool(extract_pdf_chunks, stored_path)
        if not chunks:
            raise HTTPException(status_code=422, detail="No extractable text found in the PDF")
        request.app.state.library.add_pdf(
            Path(filename).stem,
            [(chunk.section, chunk.text) for chunk in chunks],
            paper_id=paper_id,
        )
    except HTTPException:
        stored_path.unlink(missing_ok=True)
        metadata_path.unlink(missing_ok=True)
        raise
    except Exception as error:
        stored_path.unlink(missing_ok=True)
        metadata_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail="Unable to extract text from the PDF") from error
    finally:
        await file.close()

    return UploadResponse(paper_id=paper_id, status="indexed", chunk_count=len(chunks))