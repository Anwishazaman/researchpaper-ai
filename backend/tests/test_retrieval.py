import sys
from types import SimpleNamespace

import numpy as np
import pytest

from app.retrieval.bm25 import BM25Index, tokenize
from app.retrieval.hybrid import fuse_scores, normalized_scores
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
    assert fuse_scores([1.0, 0.0], [0.0, 1.0], 0.55) == pytest.approx([0.45, 0.55])


def test_fusion_rejects_mismatched_score_lengths() -> None:
    try:
        fuse_scores([1.0], [1.0, 0.0], 0.5)
    except ValueError as error:
        assert "equal length" in str(error)
    else:
        raise AssertionError("Expected score length validation")


def _install_fake_faiss(monkeypatch):
    class FakeIndex:
        def __init__(self, dimension, list_count=None, metric=None):
            self.dimension = dimension
            self.list_count = list_count
            self.metric = metric
            self.vectors = None
            self.nprobe = None
            self.trained = False

        def train(self, vectors):
            self.trained = True

        def add(self, vectors):
            self.vectors = vectors

        def search(self, query, count):
            positions = np.arange(count, dtype="int64").reshape(1, -1)
            scores = np.linspace(1.0, 0.1, count, dtype="float32").reshape(1, -1)
            return scores, positions

    def flat(dimension):
        return FakeIndex(dimension)

    def ivf(quantizer, dimension, list_count, metric):
        return FakeIndex(dimension, list_count, metric)

    monkeypatch.setitem(
        sys.modules,
        "faiss",
        SimpleNamespace(
            IndexFlatIP=flat,
            IndexIVFFlat=ivf,
            METRIC_INNER_PRODUCT=0,
        ),
    )
    monkeypatch.setitem(
        sys.modules,
        "sentence_transformers",
        SimpleNamespace(
            SentenceTransformer=lambda model_name: SimpleNamespace(
                encode=lambda values, normalize_embeddings: np.ones((len(values), 3))
            )
        ),
    )


def test_dense_index_uses_exact_search_for_small_corpora(monkeypatch) -> None:
    _install_fake_faiss(monkeypatch)
    from app.retrieval.dense import DenseIndex

    index = DenseIndex(["paper one", "paper two"], "test-model")

    assert index.scores("query") == pytest.approx([1.0, 0.1])
    assert index._index.list_count is None
    assert index._index.trained is False


def test_dense_index_uses_ivf_and_bounded_candidates_for_large_corpora(monkeypatch) -> None:
    _install_fake_faiss(monkeypatch)
    from app.retrieval.dense import DenseIndex

    index = DenseIndex([f"paper {position}" for position in range(2048)], "test-model")
    scores = index.scores("query", candidate_count=12)

    assert len(scores) == 2048
    assert scores[:12] == pytest.approx(np.linspace(1.0, 0.1, 12))
    assert scores[12:] == [0.0] * 2036
    assert index._index.trained is True
    assert index._index.nprobe < index._index.list_count