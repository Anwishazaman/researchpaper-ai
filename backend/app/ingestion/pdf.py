from dataclasses import dataclass
from pathlib import Path

import fitz


@dataclass(frozen=True)
class ExtractedChunk:
    section: str
    text: str


def extract_pdf_chunks(path: Path, words_per_chunk: int = 180) -> list[ExtractedChunk]:
    chunks: list[ExtractedChunk] = []
    with fitz.open(path) as document:
        for page_number, page in enumerate(document, start=1):
            words = page.get_text("text").split()
            for offset in range(0, len(words), words_per_chunk):
                text = " ".join(words[offset : offset + words_per_chunk]).strip()
                if text:
                    chunks.append(ExtractedChunk(f"Page {page_number}", text))
    return chunks