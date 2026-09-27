from fastapi.testclient import TestClient

from app.main import create_app


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