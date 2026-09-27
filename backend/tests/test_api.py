import fitz
from fastapi.testclient import TestClient

from app.main import create_app


def test_health_and_papers_use_api_contract(app_settings) -> None:
    with TestClient(create_app(app_settings)) as client:
        health = client.get("/api/health")
        papers = client.get("/api/papers")

    assert health.status_code == 200
    assert health.json() == {"status": "ready", "corpus_ready": True}
    assert len(papers.json()["items"]) == 3


def test_search_validates_and_returns_ranked_evidence(app_settings) -> None:
    with TestClient(create_app(app_settings)) as client:
        response = client.post(
            "/api/search",
            json={
                "query": "How does attention improve sequence modeling?",
                "method": "bm25",
                "dense_weight": 0.55,
                "top_k": 5,
            },
        )
        invalid = client.post("/api/search", json={"query": "x", "method": "hybrid"})

    assert response.status_code == 200
    assert response.json()["results"][0]["paper_id"] == "attention-is-all-you-need"
    assert response.json()["results"][0]["rank"] == 1
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "VALIDATION_ERROR"


def test_answer_returns_grounded_answer_and_retrieved_sources(app_settings, monkeypatch) -> None:
    from app.services.generation import LocalAnswerGenerator

    def fake_generate(_self, question, sources):
        assert question == "What does the Transformer use for sequence modeling?"
        assert sources
        return "It uses stacked self-attention layers [S1]."

    monkeypatch.setattr(LocalAnswerGenerator, "generate", fake_generate)
    with TestClient(create_app(app_settings)) as client:
        response = client.post(
            "/api/answer",
            json={"question": "What does the Transformer use for sequence modeling?"},
        )

    assert response.status_code == 200
    result = response.json()
    assert "[S1]" in result["answer"]
    assert result["sources"][0]["title"] == "Attention Is All You Need"
    assert result["model"] == "google/flan-t5-small"


def test_upload_rejects_non_pdf_before_writing(app_settings) -> None:
    with TestClient(create_app(app_settings)) as client:
        response = client.post(
            "/api/papers/upload",
            files={"file": ("notes.txt", b"not a PDF", "text/plain")},
        )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "BAD_REQUEST"


def test_uploaded_paper_is_reindexed_after_restart(app_settings) -> None:
    document = fitz.open()
    page = document.new_page()
    page.insert_text((72, 72), "A locally stored paper about vector retrieval.")
    pdf_bytes = document.tobytes()
    document.close()

    with TestClient(create_app(app_settings)) as client:
        uploaded = client.post(
            "/api/papers/upload",
            files={"file": ("vector-retrieval.pdf", pdf_bytes, "application/pdf")},
        )
    assert uploaded.status_code == 202

    with TestClient(create_app(app_settings)) as restarted_client:
        papers = restarted_client.get("/api/papers").json()["items"]
        search = restarted_client.post(
            "/api/search",
            json={"query": "vector retrieval", "method": "bm25", "top_k": 10},
        )

    stored_paper = next(paper for paper in papers if paper["title"] == "vector-retrieval")
    assert stored_paper["id"] == uploaded.json()["paper_id"]
    assert any(result["paper_id"] == stored_paper["id"] for result in search.json()["results"])