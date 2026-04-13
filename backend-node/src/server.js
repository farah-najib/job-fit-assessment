import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import pdfParse from "pdf-parse";
import * as cheerio from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const PORT = Number.parseInt(process.env.PORT ?? "3001", 10);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:5173";

let geminiClient = null;

if (GEMINI_API_KEY) {
  geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
}

app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  }),
);

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/analyze", upload.single("resume"), async (request, response) => {
  try {
    if (!request.file) {
      return response.status(400).json({ detail: "Resume PDF is required." });
    }

    if (request.file.mimetype !== "application/pdf") {
      return response.status(400).json({ detail: "Resume must be a PDF." });
    }

    if (!geminiClient) {
      return response.status(500).json({ detail: "Missing GEMINI_API_KEY in backend-node environment." });
    }

    const jobDescription = typeof request.body.job_description === "string" ? request.body.job_description : "";
    const jobUrl = typeof request.body.job_url === "string" ? request.body.job_url : "";
    const resolvedJobDescription = await resolveJobDescription(jobDescription, jobUrl);
    const resumeText = await extractTextFromPdf(request.file.buffer);

    if (!resumeText.trim()) {
      return response.status(400).json({ detail: "Could not extract text from the uploaded PDF." });
    }

    const analysis = await analyzeWithGemini(resumeText, resolvedJobDescription);
    return response.json(analysis);
  } catch (error) {
    const status = error.statusCode ?? 500;
    const detail = error.message ?? "Unexpected server error.";
    return response.status(status).json({ detail });
  }
});

app.listen(PORT, () => {
  console.log(`Node backend listening on http://localhost:${PORT}`);
});

async function extractTextFromPdf(buffer) {
  try {
    const pdfData = await pdfParse(buffer);
    return pdfData.text ?? "";
  } catch (error) {
    throw createHttpError(400, "Invalid PDF file.");
  }
}

async function resolveJobDescription(jobDescription, jobUrl) {
  const trimmedDescription = jobDescription.trim();
  const trimmedUrl = jobUrl.trim();

  if (trimmedDescription && trimmedUrl) {
    throw createHttpError(400, "Provide either a job description or a job URL, not both.");
  }

  if (trimmedDescription) {
    return trimmedDescription;
  }

  if (trimmedUrl) {
    return await extractJobDescriptionFromUrl(trimmedUrl);
  }

  throw createHttpError(400, "Provide a job description or a job URL.");
}

async function extractJobDescriptionFromUrl(jobUrl) {
  let parsedUrl;

  try {
    parsedUrl = new URL(jobUrl);
  } catch {
    throw createHttpError(400, "Job URL must be a valid http or https URL.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw createHttpError(400, "Job URL must be a valid http or https URL.");
  }

  let pageResponse;

  try {
    pageResponse = await fetch(jobUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; JobFitAssessmentNode/1.0; +https://localhost)",
      },
      redirect: "follow",
    });
  } catch (error) {
    throw createHttpError(400, `Could not fetch job URL: ${error.message}`);
  }

  if (!pageResponse.ok) {
    throw createHttpError(400, `Could not fetch job URL: ${pageResponse.status} ${pageResponse.statusText}`);
  }

  const html = await pageResponse.text();
  const $ = cheerio.load(html);

  $("script, style, noscript, svg, img, header, footer").remove();

  const text = $.root()
    .text()
    .replace(/\s+/g, " ")
    .trim();

  if (text.length < 200) {
    throw createHttpError(400, "Could not extract enough job description text from the provided URL.");
  }

  return text.slice(0, 20000);
}

async function analyzeWithGemini(resumeText, jobDescription) {
  const model = geminiClient.getGenerativeModel({ model: GEMINI_MODEL });
  const prompt = `
Analyze this resume against this job description.
Return only a valid JSON object with exactly this schema:
{
  "overall_score": 0,
  "ats_score": 0,
  "core_skills": {
    "matches": [],
    "gaps": [],
    "score": 0
  },
  "soft_skills": {
    "matches": [],
    "gaps": [],
    "score": 0
  },
  "critical_weakness": "The single most important reason why this CV might be rejected.",
  "action_plan": ["Specific advice on what to add to the CV"]
}

Classification rules:
- "core_skills" means technical, domain, platform, tooling, certifications, and other hard-skill requirements.
- "soft_skills" means communication, collaboration, leadership, stakeholder management, ownership, adaptability, and process-oriented strengths or gaps.
- "ats_score" should estimate how well the CV would perform in an ATS screen based on keyword coverage, role-title alignment, clarity, and standard formatting signals.
- Keep every list item concise and specific.
- "critical_weakness" must be a single sentence.
- "action_plan" must contain concrete CV improvement steps.
- All score values must be integers from 0 to 100.
- Do not wrap the JSON in markdown fences.

Resume:
${resumeText}

Job Description:
${jobDescription}
`;

  let result;

  try {
    result = await model.generateContent(prompt);
  } catch (error) {
    throw createHttpError(502, `Gemini request failed: ${error.message}`);
  }

  const rawText = result.response.text?.() ?? "";
  const parsed = parseGeminiJson(rawText);

  return normalizeAnalysisPayload(parsed);
}

function parseGeminiJson(rawText) {
  const cleaned = rawText.trim().replace(/^```json\s*/i, "").replace(/\s*```$/i, "");

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);

    if (!match) {
      throw createHttpError(502, "Gemini returned invalid JSON.");
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      throw createHttpError(502, "Gemini returned unparsable JSON.");
    }
  }
}

function normalizeAnalysisPayload(payload) {
  return {
    overall_score: clampScore(payload?.overall_score),
    ats_score: clampScore(payload?.ats_score),
    core_skills: normalizeSkillBucket(payload?.core_skills),
    soft_skills: normalizeSkillBucket(payload?.soft_skills),
    critical_weakness: normalizeSentence(payload?.critical_weakness),
    action_plan: normalizeStringList(payload?.action_plan),
  };
}

function normalizeSkillBucket(value) {
  const bucket = value && typeof value === "object" ? value : {};

  return {
    matches: normalizeStringList(bucket.matches),
    gaps: normalizeStringList(bucket.gaps),
    score: clampScore(bucket.score),
  };
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item).trim()).filter(Boolean);
}

function normalizeSentence(value) {
  return String(value ?? "").trim();
}

function clampScore(value) {
  const score = Number.parseInt(value ?? 0, 10);

  if (Number.isNaN(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, score));
}

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
