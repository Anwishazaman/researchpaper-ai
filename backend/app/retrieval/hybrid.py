from collections.abc import Sequence


def normalized_scores(scores: Sequence[float]) -> list[float]:
    if not scores:
        return []
    low = min(scores)
    high = max(scores)
    if high == low:
        return [1.0 if high > 0 else 0.0 for _ in scores]
    return [(score - low) / (high - low) for score in scores]


def fuse_scores(
    lexical: Sequence[float], dense: Sequence[float], dense_weight: float
) -> list[float]:
    if len(lexical) != len(dense):
        raise ValueError("Lexical and dense score lists must have equal length")
    lexical_normalized = normalized_scores(lexical)
    dense_normalized = normalized_scores(dense)
    return [
        (1 - dense_weight) * lexical_score + dense_weight * dense_score
        for lexical_score, dense_score in zip(lexical_normalized, dense_normalized, strict=True)
    ]