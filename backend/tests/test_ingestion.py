from pathlib import Path

import fitz

from app.ingestion.pdf import extract_pdf_chunks


def test_pdf_extraction_chunks_page_text(tmp_path: Path) -> None:
    pdf_path = tmp_path / "fixture.pdf"
    document = fitz.open()
    page = document.new_page()
    page.insert_text((72, 72), "Attention connects tokens across a sequence.")
    document.save(pdf_path)
    document.close()

    chunks = extract_pdf_chunks(pdf_path, words_per_chunk=4)

    assert len(chunks) == 2
    assert chunks[0].section == "Page 1"
    assert chunks[0].text.startswith("Attention connects tokens across")