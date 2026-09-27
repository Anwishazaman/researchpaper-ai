import json
import logging
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

from app.core.config import Settings
from app.ingestion.pdf import extract_pdf_chunks
from app.models.schemas import (
    AnswerRequest,
    AnswerResponse,
    EvaluationRun,
    PaperSummary,
    SearchRequest,
    SearchResult,
)
from app.retrieval.bm25 import BM25Index
from app.retrieval.dense import DenseIndex
from app.retrieval.hybrid import fuse_scores
from app.services.generation import LocalAnswerGenerator

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Chunk:
    paper_id: str
    title: str
    section: str
    text: str


class PaperLibrary:
    def __init__(self, settings: Settings, demo_dir: Path) -> None:
        self._settings = settings
        self._demo_dir = demo_dir
        self._papers: dict[str, dict[str, object]] = {}
        self._chunks: list[Chunk] = []
        self._bm25 = BM25Index([])
        self._dense: DenseIndex | None = None
        self._answer_generator: LocalAnswerGenerator | None = None
        self._queries: list[dict[str, object]] = []
        self.load_demo_corpus()
        self.load_uploaded_papers()

    @property
    def ready(self) -> bool:
        return bool(self._chunks)

    def load_demo_corpus(self) -> None:
        corpus_path = self._demo_dir / "papers.json"
        with corpus_path.open(encoding="utf-8") as corpus_file:
            records = json.load(corpus_file)
        for record in records:
            paper_id = str(record["id"])
            self._papers[paper_id] = {
                "id": paper_id,
                "title": str(record["title"]),
                "authors": list(record["authors"]),
                "year": int(record["year"]),
                "status": "indexed",
            }
            self._chunks.extend(
                Chunk(paper_id, str(record["title"]), chunk["section"], chunk["text"])
                for chunk in record["chunks"]
            )
        self._queries = json.loads((self._demo_dir / "queries.json").read_text(encoding="utf-8"))
        self._rebuild_indexes()

    def load_uploaded_papers(self) -> None:
        for pdf_path in self._settings.upload_dir.glob("*.pdf"):
            metadata_path = pdf_path.with_suffix(".json")
            try:
                metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
                title = str(metadata["title"])
                chunks = extract_pdf_chunks(pdf_path)
                if chunks:
                    self.add_pdf(
                        title,
                        [(chunk.section, chunk.text) for chunk in chunks],
                        paper_id=pdf_path.stem,
                    )
            except Exception:
                logger.exception("Stored PDF could not be re-indexed", path=str(pdf_path))

    def list_papers(self) -> list[PaperSummary]:
        counts: dict[str, int] = {}
        for chunk in self._chunks:
            counts[chunk.paper_id] = counts.get(chunk.paper_id, 0) + 1
        return [
            PaperSummary(**paper, chunk_count=counts.get(paper_id, 0))
            for paper_id, paper in self._papers.items()
        ]

    def add_pdf(
        self, title: str, chunks: list[tuple[str, str]], paper_id: str | None = None
    ) -> str:
        paper_id = paper_id or str(uuid4())
        self._papers[paper_id] = {
            "id": paper_id,
            "title": title,
            "authors": [],
            "year": 0,
            "status": "indexed",
        }
        self._chunks.extend(Chunk(paper_id, title, section, text) for section, text in chunks)
        self._rebuild_indexes()
        return paper_id

    def search(self, request: SearchRequest) -> list[SearchResult]:
        if not self._chunks:
            return []
        lexical_scores = self._bm25.scores(request.query)
        scores = lexical_scores
        if request.method == "hybrid" and self._settings.enable_dense:
            try:
                dense_index = self._get_dense_index()
                scores = fuse_scores(
                    lexical_scores,
                    dense_index.scores(
                        request.query, candidate_count=max(50, request.top_k * 10)
                    ),
                    request.dense_weight,
                )
            except Exception:
                logger.exception("Dense retrieval unavailable; using BM25 for this search")
        ranked = sorted(enumerate(scores), key=lambda item: (item[1], -item[0]), reverse=True)[
            : request.top_k
        ]
        return [
            SearchResult(
                paper_id=self._chunks[position].paper_id,
                title=self._chunks[position].title,
                section=self._chunks[position].section,
                snippet=self._chunks[position].text[:500],
                score=round(float(score), 6),
                rank=rank,
            )
            for rank, (position, score) in enumerate(ranked, start=1)
        ]

    def answer(self, request: AnswerRequest) -> AnswerResponse:
        search_request = SearchRequest(
            query=request.question,
            method="hybrid",
            dense_weight=request.dense_weight,
            top_k=request.top_k,
        )
        sources = self.search(search_request)
        if self._answer_generator is None:
            self._answer_generator = LocalAnswerGenerator(self._settings.generation_model)
        answer = self._answer_generator.generate(request.question, sources)
        return AnswerResponse(
            answer=answer,
            model=self._settings.generation_model,
            sources=sources,
        )

    def evaluate(self, top_k: int) -> list[EvaluationRun]:
        if not self._queries:
            return []
        totals = {
            method: {"precision": 0.0, "recall": 0.0, "mrr": 0.0}
            for method in ("bm25", "hybrid")
        }
        for query_data in self._queries:
            request = SearchRequest(
                query=query_data["query"], method="bm25", top_k=top_k, dense_weight=0
            )
            relevant = set(query_data["relevant_paper_ids"])
            for method in ("bm25", "hybrid"):
                request.method = method
                results = self.search(request)
                found = list(dict.fromkeys(result.paper_id for result in results))
                hits = sum(paper_id in relevant for paper_id in found)
                totals[method]["precision"] += hits / top_k
                totals[method]["recall"] += hits / len(relevant) if relevant else 0
                reciprocal_rank = next(
                    (1 / rank for rank, paper_id in enumerate(found, 1) if paper_id in relevant),
                    0.0,
                )
                totals[method]["mrr"] += reciprocal_rank
        query_count = len(self._queries)
        return [
            EvaluationRun(
                method=method,
                precision_at_k=round(metrics["precision"] / query_count, 4),
                recall_at_k=round(metrics["recall"] / query_count, 4),
                mrr=round(metrics["mrr"] / query_count, 4),
            )
            for method, metrics in totals.items()
        ]

    def _rebuild_indexes(self) -> None:
        indexed_texts = [
            f"{chunk.title} {chunk.section} {chunk.text}" for chunk in self._chunks
        ]
        self._bm25 = BM25Index(indexed_texts)
        self._dense = None

    def _get_dense_index(self) -> DenseIndex:
        if self._dense is None:
            self._dense = DenseIndex(
                [f"{chunk.title} {chunk.section} {chunk.text}" for chunk in self._chunks],
                self._settings.embedding_model,
            )
        return self._dense