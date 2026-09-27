import re
from collections.abc import Sequence

from rank_bm25 import BM25Okapi

TOKEN_PATTERN = re.compile(r"[\w'-]+", re.UNICODE)


def tokenize(text: str) -> list[str]:
    return TOKEN_PATTERN.findall(text.lower())


class BM25Index:
    def __init__(self, texts: Sequence[str]) -> None:
        self._texts = list(texts)
        self._index = BM25Okapi([tokenize(text) for text in self._texts]) if texts else None

    def scores(self, query: str) -> list[float]:
        if self._index is None:
            return []
        return [float(score) for score in self._index.get_scores(tokenize(query))]