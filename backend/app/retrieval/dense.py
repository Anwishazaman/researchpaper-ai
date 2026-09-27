from collections.abc import Sequence
from functools import cached_property

import numpy as np

EXACT_SEARCH_LIMIT = 2048


class DenseIndex:
    def __init__(self, texts: Sequence[str], model_name: str) -> None:
        self._texts = list(texts)
        self._model_name = model_name

    @cached_property
    def _model(self):
        from sentence_transformers import SentenceTransformer

        return SentenceTransformer(self._model_name)

    @cached_property
    def _index(self):
        import faiss

        vectors = self._model.encode(self._texts, normalize_embeddings=True)
        matrix = np.asarray(vectors, dtype="float32")
        if len(self._texts) < EXACT_SEARCH_LIMIT:
            index = faiss.IndexFlatIP(matrix.shape[1])
        else:
            list_count = max(4, int(np.sqrt(len(self._texts))))
            index = faiss.IndexIVFFlat(
                faiss.IndexFlatIP(matrix.shape[1]),
                matrix.shape[1],
                list_count,
                faiss.METRIC_INNER_PRODUCT,
            )
            index.train(matrix)
            index.nprobe = max(1, int(np.sqrt(list_count)))
        index.add(matrix)
        return index

    def scores(self, query: str, candidate_count: int | None = None) -> list[float]:
        if not self._texts:
            return []
        vector = self._model.encode([query], normalize_embeddings=True)
        query_matrix = np.asarray(vector, dtype="float32")
        result_count = len(self._texts) if candidate_count is None else min(
            candidate_count, len(self._texts)
        )
        scores, positions = self._index.search(query_matrix, result_count)
        ordered = [0.0] * len(self._texts)
        for score, position in zip(scores[0], positions[0], strict=True):
            if position >= 0:
                ordered[int(position)] = float(score)
        return ordered