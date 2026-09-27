from app.retrieval.bm25 import BM25Index, tokenize
from app.retrieval.hybrid import fuse_scores, normalized_scores


def test_tokenize_normalizes_words_and_punctuation() -> None:
    assert tokenize("Self-attention, and Query 42!") == ["self-attention", "and", "query", "42"]


def test_bm25_ranks_matching_text_above_unrelated_text() -> None:
    index = BM25Index(
        ["attention improves sequence modeling", "masked language model pretraining"]
    )
    scores = index.scores("attention sequence")

    assert len(scores) == 2
    assert scores[0] > scores[1]


def test_hybrid_fusion_combines_min_max_normalized_scores() -> None:
    assert normalized_scores([2.0, 4.0, 6.0]) == [0.0, 0.5, 1.0]
    assert fuse_scores([1.0, 0.0], [0.0, 1.0], 0.55) == [0.45, 0.55]


def test_fusion_rejects_mismatched_score_lengths() -> None:
    try:
        fuse_scores([1.0], [1.0, 0.0], 0.5)
    except ValueError as error:
        assert "equal length" in str(error)
    else:
        raise AssertionError("Expected score length validation")