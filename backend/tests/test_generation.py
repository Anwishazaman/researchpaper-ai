from app.models.schemas import SearchResult
from app.services.generation import LocalAnswerGenerator


def test_generator_answers_from_labeled_retrieved_evidence() -> None:
    generator = LocalAnswerGenerator("test-model")
    calls: list[tuple[str, dict[str, object]]] = []

    def fake_pipeline(prompt: str, **options: object) -> list[dict[str, str]]:
        calls.append((prompt, options))
        return [{"generated_text": "Self-attention models dependencies [S1]."}]

    generator._pipeline = fake_pipeline
    source = SearchResult(
        paper_id="attention-paper",
        title="Attention Is All You Need",
        section="Sequence modeling",
        snippet="Self-attention models sequence dependencies without recurrence.",
        score=0.8,
        rank=1,
    )

    answer = generator.generate("How does it model sequences?", [source])

    assert answer == "Self-attention models dependencies [S1]."
    assert "How does it model sequences?" in calls[0][0]
    assert "[S1] Attention Is All You Need — Sequence modeling" in calls[0][0]
    assert "without recurrence" in calls[0][0]
    assert calls[0][1] == {"max_new_tokens": 180, "do_sample": False, "truncation": True}


def test_generator_does_not_load_model_without_retrieved_evidence() -> None:
    generator = LocalAnswerGenerator("test-model")

    answer = generator.generate("Question without evidence", [])

    assert "could not find supporting passages" in answer
    assert "_pipeline" not in generator.__dict__
