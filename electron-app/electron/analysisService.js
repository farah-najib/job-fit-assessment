import pdfParse from 'pdf-parse'
import * as cheerio from 'cheerio'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getStoredApiKey } from './store.js'

const GEMINI_MODEL = 'gemini-flash-latest'

export async function testGeminiKey(apiKey) {
  const trimmedKey = String(apiKey ?? '').trim()

  if (!trimmedKey) {
    throw createError('Enter a Gemini API key before saving.')
  }

  const model = createGeminiModel(trimmedKey)

  try {
    const result = await model.generateContent('Reply with OK.')
    const text = result.response.text?.().trim() ?? ''

    if (!text) {
      throw new Error('Empty response.')
    }
  } catch (error) {
    throw createError(`Gemini key test failed: ${error.message}`)
  }
}

export async function analyzeAssessment(input) {
  const apiKey = getStoredApiKey()

  if (!apiKey) {
    throw createError(
      'API key missing. Open Settings and save a valid Gemini key first.'
    )
  }

  if (input.resumeMimeType !== 'application/pdf') {
    throw createError('Resume must be a PDF.')
  }

  const jobDescription = await resolveJobDescription(
    input.jobDescription,
    input.jobUrl
  )
  const resumeText = await extractTextFromPdf(input.resumeBytes)

  if (!resumeText.trim()) {
    throw createError('Could not extract text from the uploaded PDF.')
  }

  const model = createGeminiModel(apiKey)
  const prompt = `
Analyze this resume against this job description.
Return only a valid JSON object with exactly this schema:
{
  "overall_score": 0,
  "core_skills": {
    "matches": [],
    "gaps": []
  },
  "soft_skills": {
    "matches": [],
    "gaps": []
  },
  "weakness_analysis": {
    "summary": "Detailed explanation of the biggest weaknesses.",
    "details": [],
    "action_plan": []
  }
}

Rules:
- "core_skills" means technical, domain, platform, tooling, certifications, and hard skills.
- "soft_skills" means communication, collaboration, leadership, stakeholder management, ownership, adaptability, and process skills.
- "weakness_analysis.summary" must be detailed and specific.
- "weakness_analysis.details" must list concrete rejection risks.
- "weakness_analysis.action_plan" must list specific CV improvements.
- All list entries should be concise and professional.
- "overall_score" must be an integer from 0 to 100.
- Do not wrap the JSON in markdown fences.

Resume:
${resumeText}

Job Description:
${jobDescription}
`

  let result

  try {
    result = await model.generateContent(prompt)
  } catch (error) {
    throw createError(`Gemini request failed: ${error.message}`)
  }

  const rawText = result.response.text?.() ?? ''
  const parsed = parseGeminiJson(rawText)
  return normalizePayload(parsed)
}

function createGeminiModel(apiKey) {
  const client = new GoogleGenerativeAI(apiKey)
  return client.getGenerativeModel({ model: GEMINI_MODEL })
}

async function extractTextFromPdf(bytes) {
  try {
    const pdfData = await pdfParse(Buffer.from(bytes))
    return pdfData.text ?? ''
  } catch {
    throw createError('Invalid PDF file.')
  }
}

async function resolveJobDescription(jobDescription, jobUrl) {
  const trimmedDescription = String(jobDescription ?? '').trim()
  const trimmedUrl = String(jobUrl ?? '').trim()

  if (trimmedDescription && trimmedUrl) {
    throw createError(
      'Provide either a job description or a job URL, not both.'
    )
  }

  if (trimmedDescription) {
    return trimmedDescription
  }

  if (trimmedUrl) {
    return await extractJobDescriptionFromUrl(trimmedUrl)
  }

  throw createError('Provide a job description or a job URL.')
}

async function extractJobDescriptionFromUrl(jobUrl) {
  let parsed

  try {
    parsed = new URL(jobUrl)
  } catch {
    throw createError('Job URL must be a valid http or https URL.')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw createError('Job URL must be a valid http or https URL.')
  }

  let response

  try {
    response = await fetch(jobUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; JobFitDesktop/1.0; +https://localhost)'
      }
    })
  } catch (error) {
    throw createError(`Could not fetch job URL: ${error.message}`)
  }

  if (!response.ok) {
    throw createError(
      `Could not fetch job URL: ${response.status} ${response.statusText}`
    )
  }

  const html = await response.text()
  const $ = cheerio.load(html)
  $('script, style, noscript, svg, img, header, footer').remove()

  const text = $.root().text().replace(/\s+/g, ' ').trim()

  if (text.length < 200) {
    throw createError(
      'Could not extract enough job description text from the provided URL.'
    )
  }

  return text.slice(0, 20000)
}

function parseGeminiJson(rawText) {
  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/\s*```$/i, '')

  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)

    if (!match) {
      throw createError('Gemini returned invalid JSON.')
    }

    try {
      return JSON.parse(match[0])
    } catch {
      throw createError('Gemini returned unparsable JSON.')
    }
  }
}

function normalizePayload(payload) {
  return {
    overall_score: clampScore(payload?.overall_score),
    core_skills: normalizeSkillBucket(payload?.core_skills),
    soft_skills: normalizeSkillBucket(payload?.soft_skills),
    weakness_analysis: normalizeWeakness(payload?.weakness_analysis)
  }
}

function normalizeSkillBucket(value) {
  const bucket = value && typeof value === 'object' ? value : {}

  return {
    matches: normalizeStringList(bucket.matches),
    gaps: normalizeStringList(bucket.gaps)
  }
}

function normalizeWeakness(value) {
  const weakness = value && typeof value === 'object' ? value : {}

  return {
    summary: String(weakness.summary ?? '').trim(),
    details: normalizeStringList(weakness.details),
    action_plan: normalizeStringList(weakness.action_plan)
  }
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item) => String(item).trim()).filter(Boolean)
}

function clampScore(value) {
  const score = Number.parseInt(value ?? 0, 10)
  if (Number.isNaN(score)) {
    return 0
  }
  return Math.max(0, Math.min(100, score))
}

function createError(message) {
  return new Error(message)
}
