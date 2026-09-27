import re
from functools import cached_property
from typing import Any

from app.models.schemas import SearchResult


class LocalAnswerGenerator:
    def __init__(self, model_name: str) -> None:
        self._model_name = model_name

    @cached_property
    def _pipeline(self) -> Any:
        from transformers import pipeline

        return pipeline(
            "text2text-generation",
            model=self._model_name,
            device=-1,
        )

    def generate(self, question: str, sources: list[SearchResult]) -> str:
        if not sources:
            return "I could not find supporting passages in the current paper library."

        source = sources[0]
        evidence = f"{source.title} — {source.section}: {source.snippet[:350]}"
        prompt = f"Question: {question}\nEvidence: {evidence}\nAnswer using evidence:"
        generated = self._pipeline(
            prompt,
            max_new_tokens=120,
            do_sample=False,
            truncation=True,
        )
        answer = re.sub(r"\s*\[S\d+\]", "", str(generated[0]["generated_text"])).strip()
        return f"{answer} [S{source.rank}]"
