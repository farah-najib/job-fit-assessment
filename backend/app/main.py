import json
import os
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import fitz
import google.generativeai as genai
import httpx
from dotenv import load_dotenv
from bs4 import BeautifulSoup
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

app = FastAPI(title="Job Fit Assessment API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze")
async def analyze_resume(
    resume: UploadFile = File(...),
    job_description: str = Form(""),
    job_url: str = Form(""),
) -> dict[str, Any]:
    if resume.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Resume must be a PDF.")

    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Missing GEMINI_API_KEY in backend environment.")

    resolved_job_description = await resolve_job_description(
        job_description=job_description,
        job_url=job_url,
    )

    resume_bytes = await resume.read()
    resume_text = extract_text_from_pdf(resume_bytes)

    if not resume_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from the uploaded PDF.")

    return analyze_with_gemini(resume_text=resume_text, job_description=resolved_job_description)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        with fitz.open(stream=file_bytes, filetype="pdf") as document:
            return "\n".join(page.get_text("text") for page in document)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=400, detail="Invalid PDF file.") from exc


def analyze_with_gemini(resume_text: str, job_description: str) -> dict[str, Any]:
    model = genai.GenerativeModel(GEMINI_MODEL)
    prompt = f"""
Analyze this resume against this job description.
Return only a valid JSON object with:
- "score": integer from 0 to 100
- "matches": array of strings
- "gaps": array of strings
- "verdict": short summary string

Resume:
{resume_text}

Job Description:
{job_description}
"""

    try:
        response = model.generate_content(prompt)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=502, detail=f"Gemini request failed: {exc}") from exc

    raw_text = getattr(response, "text", "") or ""
    parsed = parse_gemini_json(raw_text)

    if not isinstance(parsed.get("score"), int):
        raise HTTPException(status_code=502, detail="Gemini response did not include an integer score.")

    parsed["score"] = max(0, min(100, parsed["score"]))
    parsed["matches"] = normalize_string_list(parsed.get("matches"))
    parsed["gaps"] = normalize_string_list(parsed.get("gaps"))
    parsed["verdict"] = str(parsed.get("verdict", "")).strip()
    return parsed


def parse_gemini_json(raw_text: str) -> dict[str, Any]:
    cleaned = raw_text.strip()
    cleaned = re.sub(r"^```json\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            raise HTTPException(status_code=502, detail="Gemini returned invalid JSON.")
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=502, detail="Gemini returned unparsable JSON.") from exc


def normalize_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


async def resolve_job_description(job_description: str, job_url: str) -> str:
    job_description = job_description.strip()
    job_url = job_url.strip()

    if job_description and job_url:
        raise HTTPException(
            status_code=400,
            detail="Provide either a job description or a job URL, not both.",
        )

    if job_description:
        return job_description

    if job_url:
        return await extract_job_description_from_url(job_url)

    raise HTTPException(
        status_code=400,
        detail="Provide a job description or a job URL.",
    )


async def extract_job_description_from_url(job_url: str) -> str:
    parsed = urlparse(job_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise HTTPException(status_code=400, detail="Job URL must be a valid http or https URL.")

    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; JobFitAssessment/1.0; +https://localhost)",
    }

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
            response = await client.get(job_url, headers=headers)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=400, detail=f"Could not fetch job URL: {exc}") from exc

    soup = BeautifulSoup(response.text, "html.parser")
    for element in soup(["script", "style", "noscript", "svg", "img", "header", "footer"]):
        element.decompose()

    text = " ".join(soup.stripped_strings)
    text = re.sub(r"\s+", " ", text).strip()

    if len(text) < 200:
        raise HTTPException(
            status_code=400,
            detail="Could not extract enough job description text from the provided URL.",
        )

    return text[:20000]
