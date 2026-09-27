import re
from collections.abc import Sequence

from rank_bm25 import BM25Plus

TOKEN_PATTERN = re.compile(r"[\w'-]+", re.UNICODE)


def tokenize(text: str) -> list[str]:
    return TOKEN_PATTERN.findall(text.lower())


class BM25Index:
    def __init__(self, texts: Sequence[str]) -> None:
        self._texts = list(texts)
        self._index = BM25Plus([tokenize(text) for text in self._texts]) if texts else None

    def scores(self, query: str) -> list[float]:
        if self._index is None:
            return []
        query_tokens = tokenize(query)
        scores = self._index.get_scores(query_tokens)
        unmatched_baseline = sum(
            self._index.idf.get(token, 0.0) * self._index.delta for token in query_tokens
        )
        return [float(score - unmatched_baseline) for score in scores]