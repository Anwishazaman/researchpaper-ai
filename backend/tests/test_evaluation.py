from fastapi.testclient import TestClient

from app.main import create_app
from app.models.schemas import SearchRequest, SearchResult
from app.services.library import PaperLibrary


def test_evaluation_returns_both_methods_and_bounded_metrics(app_settings) -> None:
    with TestClient(create_app(app_settings)) as client:
        response = client.get("/api/evaluation", params={"top_k": 5})

    assert response.status_code == 200
    runs = response.json()["runs"]
    assert {run["method"] for run in runs} == {"bm25", "hybrid"}
    for run in runs:
        assert 0 <= run["precision_at_k"] <= 1
        assert 0 <= run["recall_at_k"] <= 1
        assert 0 <= run["mrr"] <= 1


def test_evaluation_computes_precision_recall_and_reciprocal_rank(app_settings, monkeypatch) -> None:
    from pathlib import Path

    library = PaperLibrary(
        app_settings,
        Path(__file__).resolve().parents[1] / "data" / "demo",
    )
    library._queries = [{"query": "test query", "relevant_paper_ids": ["paper-a"]}]

    def fake_search(request: SearchRequest) -> list[SearchResult]:
        paper_ids = (
            ["paper-a", "paper-b"] if request.method == "bm25" else ["paper-b", "paper-a"]
        )
        return [
            SearchResult(
                paper_id=paper_id,
                title=paper_id,
                section="Results",
                snippet="Evidence",
                score=1.0,
                rank=rank,
            )
            for rank, paper_id in enumerate(paper_ids, start=1)
        ]

    monkeypatch.setattr(library, "search", fake_search)
    runs = {run.method: run for run in library.evaluate(top_k=2)}

    assert runs["bm25"].precision_at_k == 0.5
    assert runs["bm25"].recall_at_k == 1.0
    assert runs["bm25"].mrr == 1.0
    assert runs["hybrid"].precision_at_k == 0.5
    assert runs["hybrid"].recall_at_k == 1.0
    assert runs["hybrid"].mrr == 0.5