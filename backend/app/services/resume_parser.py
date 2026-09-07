from pathlib import Path

from docx import Document
from pypdf import PdfReader


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from a PDF resume."""
    reader = PdfReader(file_path)

    pages = []

    for page in reader.pages:
        text = page.extract_text()

        if text:
            pages.append(text)

    return "\n".join(pages)


def extract_text_from_docx(file_path: str) -> str:
    """Extract text from a DOCX resume."""
    document = Document(file_path)

    paragraphs = []

    for paragraph in document.paragraphs:
        text = paragraph.text.strip()

        if text:
            paragraphs.append(text)

    return "\n".join(paragraphs)


def clean_resume_text(text: str) -> str:
    """Clean extracted resume text."""
    lines = []

    for line in text.splitlines():
        cleaned_line = " ".join(line.split())

        if cleaned_line:
            lines.append(cleaned_line)

    return "\n".join(lines)


def extract_resume_text(file_path: str, file_type: str) -> str:
    """Extract and clean text from a PDF or DOCX resume."""
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"Resume file not found: {file_path}")

    file_type = file_type.lower().replace(".", "")

    if file_type == "pdf":
        text = extract_text_from_pdf(str(path))

    elif file_type == "docx":
        text = extract_text_from_docx(str(path))

    else:
        raise ValueError("Unsupported resume file type.")

    return clean_resume_text(text)