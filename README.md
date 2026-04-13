# Job Fit Assessment MVP

React + Vite + Tailwind frontend and FastAPI backend for comparing a resume PDF against a pasted job description or a job-posting URL using Gemini.

## Structure

- `frontend/`: React client with upload form, job source selector, categorized fit dashboard, loading state, and animated scores
- `backend/`: FastAPI API that extracts PDF text via PyMuPDF, optionally extracts job text from a URL, and asks Gemini for categorized skill analysis

## Analysis response shape

The backend normalizes the Gemini response into this structure:

```json
{
  "overall_score": 0,
  "core_skills": { "matches": [], "gaps": [], "score": 0 },
  "soft_skills": { "matches": [], "gaps": [], "score": 0 },
  "critical_weakness": "The single most important reason why this CV might be rejected.",
  "action_plan": ["Specific advice on what to add to the CV"]
}
```

## Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Set `GEMINI_API_KEY` in `backend/.env`.
Set `GEMINI_MODEL` if you want to override the default model. The default is `gemini-flash-latest`.

If the user provides a job URL instead of pasted text, the backend fetches the page and extracts visible text before sending it to Gemini.

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

`frontend/.env` can override `VITE_API_BASE_URL` if the API is not running on `http://localhost:8000`.
