# ResearchPaper AI

A beginner-friendly, local-first research-paper workbench. Search the bundled demo corpus, add local PDFs, and compare keyword BM25 with hybrid semantic retrieval and labeled offline evaluation. Uploaded files and generated indexes remain on your machine; there are no hosted LLM or external paper-service dependencies.

## Quick start

Use CPython 3.12 for the scientific package stack and Node.js 20 or newer.

1. Install and run the API by following [backend/README.md](backend/README.md).
2. In another terminal, run `npm --prefix frontend install` and `npm --prefix frontend run dev`.
3. Open the local URL printed by Vite. The API runs at `http://127.0.0.1:8000` and its interactive docs are at `/docs`.

To run the backend tests, use `python -m pytest` from `backend/`. To run frontend tests, use `npm --prefix frontend test` from the repository root.

## Local data

Uploaded PDFs and generated caches are written below root `data/` and ignored by Git. The documented sample corpus and benchmark queries are bundled in `backend/data/demo/` so the application can be explored without uploading files.