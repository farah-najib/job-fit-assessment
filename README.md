# Job Fit Assessment MVP

React + Vite + Tailwind frontend with two backend options:
- `backend/`: FastAPI implementation
- `backend-node/`: Node.js + Express implementation
- `electron-app/`: Electron desktop app with local BYOK key storage and secure IPC

## Structure

- `frontend/`: React client with upload form, job source selector, categorized fit dashboard, loading state, and animated scores
- `backend/`: FastAPI API that extracts PDF text via PyMuPDF, optionally extracts job text from a URL, and asks Gemini for categorized skill analysis
- `backend-node/`: Express API that extracts PDF text via `pdf-parse`, optionally extracts job text from a URL, and asks Gemini for the same categorized analysis
- `electron-app/`: Electron main/preload processes plus a React renderer, local key validation via `electron-store`, and desktop-side Gemini/PDF analysis

## Analysis response shape

The backend normalizes the Gemini response into this structure:

```json
{
  "overall_score": 0,
  "ats_score": 0,
  "core_skills": { "matches": [], "gaps": [], "score": 0 },
  "soft_skills": { "matches": [], "gaps": [], "score": 0 },
  "critical_weakness": "The single most important reason why this CV might be rejected.",
  "action_plan": ["Specific advice on what to add to the CV"]
}
```

## UI features

- ATS score displayed alongside the overall match score
- Dual-column skill comparison with animated percentages

## Python backend setup

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

## Node backend setup

```bash
cd backend-node
npm install
cp .env.example .env
npm run dev
```

Set `GEMINI_API_KEY` in `backend-node/.env`.
Set `GEMINI_MODEL` if you want to override the default model. The default is `gemini-flash-latest`.

The Node backend runs on `http://localhost:3001` by default.

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

`frontend/.env` can override `VITE_API_BASE_URL` if the API is not running on `http://localhost:3001`.

## Electron desktop app setup

```bash
cd electron-app
npm install
cp .env.example .env
npm run dev
```

Notes:
- The desktop app stores the Gemini API key locally in `electron-store` after a successful `Test & Save` verification call.
- The app stays locked on the Settings view until a valid key is saved.
- All renderer-to-backend communication goes through `ipcMain` and `ipcRenderer` via the preload `contextBridge`.
