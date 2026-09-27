# ResearchPaper AI API

The local FastAPI service extracts PDF text with PyMuPDF, compares BM25 with Sentence Transformers/FAISS hybrid retrieval, and can generate evidence-grounded answers with a local Hugging Face model. It starts with the bundled demo corpus, so search and evaluation do not require credentials or user uploads.

## Requirements

- CPython 3.12
- pip

Install the pinned dependencies from this directory:

```powershell
py -3.12 -m venv .venv
\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
```

Run the API from `backend/`:

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API is documented at `http://127.0.0.1:8000/docs`. BM25 is immediately available. The first hybrid search downloads and caches the configured Sentence Transformers model; the API falls back to BM25 if dense retrieval cannot initialize. The first `/api/answer` request downloads and caches the configured text-to-text generation model (`google/flan-t5-small` by default).

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Report API and corpus readiness |
| GET | `/api/papers` | List demo and uploaded papers |
| POST | `/api/papers/upload` | Validate, store, extract, and index one PDF |
| POST | `/api/search` | Return ranked evidence using BM25 or hybrid retrieval |
| POST | `/api/answer` | Generate an answer from retrieved evidence and return cited source passages |
| GET | `/api/evaluation?top_k=5` | Evaluate both methods against the labeled demo queries |

Dense retrieval uses exact FAISS inner-product search for corpora under 512 chunks and trained IVF-Flat approximate search with a bounded candidate set for larger corpora.

## Local files and settings

Uploaded PDFs and generated working data are kept in the ignored root `data/` directory. Configure `DATA_DIR`, `MAX_UPLOAD_MB`, `ENABLE_DENSE`, `EMBEDDING_MODEL`, and `GENERATION_MODEL` through environment variables. No external paper service or hosted language model is used.

The demo corpus and labeled queries are in `backend/data/demo/`; add records there using the documented `papers.json` and `queries.json` shapes to extend the offline benchmark.

## Tests

```powershell
python -m pytest
```