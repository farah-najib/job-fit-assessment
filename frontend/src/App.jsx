import { useEffect, useRef, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

const initialBucket = {
  matches: [],
  gaps: [],
  score: 0,
};

const initialResult = {
  overall_score: null,
  ats_score: null,
  core_skills: initialBucket,
  soft_skills: initialBucket,
  critical_weakness: "",
  action_plan: [],
};

function App() {
  const [resumeFile, setResumeFile] = useState(null);
  const [inputMode, setInputMode] = useState("text");
  const [jobDescription, setJobDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [result, setResult] = useState(initialResult);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!resumeFile) {
      setError("Upload a resume PDF before submitting.");
      return;
    }

    if (inputMode === "text" && !jobDescription.trim()) {
      setError("Paste a job description before submitting.");
      return;
    }

    if (inputMode === "url" && !jobUrl.trim()) {
      setError("Enter a job description URL before submitting.");
      return;
    }

    setIsLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("resume", resumeFile);

    if (inputMode === "text") {
      formData.append("job_description", jobDescription);
    } else {
      formData.append("job_url", jobUrl);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.detail || "Analysis failed.");
      }

      setResult({
        overall_score: payload.overall_score ?? 0,
        ats_score: payload.ats_score ?? 0,
        core_skills: normalizeBucket(payload.core_skills),
        soft_skills: normalizeBucket(payload.soft_skills),
        critical_weakness: payload.critical_weakness ?? "",
        action_plan: Array.isArray(payload.action_plan) ? payload.action_plan : [],
      });
    } catch (requestError) {
      setResult(initialResult);
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-mesh text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-10 lg:px-10">
        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[32px] border border-white/12 bg-slate-950/65 p-8 shadow-panel backdrop-blur">
            <p className="mb-4 inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-cyan-200">
              Job Fit Assessment
            </p>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight text-white md:text-5xl">
              Compare a CV against role requirements with clearer skill-gap analysis.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Upload a PDF resume, choose a job source, and review the split between
              technical fit and professional or soft-skill fit.
            </p>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-100">Resume PDF</span>
                <input
                  accept="application/pdf"
                  className="block w-full rounded-2xl border border-white/12 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 file:mr-4 file:rounded-full file:border-0 file:bg-emerald-300 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:file:bg-emerald-200"
                  onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)}
                  type="file"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-100">Job Source</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ModeButton
                    active={inputMode === "text"}
                    description="Enter the job description directly."
                    label="Paste Description"
                    onClick={() => setInputMode("text")}
                  />
                  <ModeButton
                    active={inputMode === "url"}
                    description="Fetch the posting text from a URL."
                    label="Use URL"
                    onClick={() => setInputMode("url")}
                  />
                </div>
              </label>

              {inputMode === "text" ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-100">
                    Job Description
                  </span>
                  <textarea
                    className="min-h-64 w-full rounded-3xl border border-white/12 bg-slate-900/90 px-4 py-4 text-sm leading-6 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
                    onChange={(event) => setJobDescription(event.target.value)}
                    placeholder="Paste the full job description here..."
                    value={jobDescription}
                  />
                </label>
              ) : (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-100">
                    Job Posting URL
                  </span>
                  <input
                    className="w-full rounded-3xl border border-white/12 bg-slate-900/90 px-4 py-4 text-sm text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
                    onChange={(event) => setJobUrl(event.target.value)}
                    placeholder="https://company.com/careers/job-posting"
                    type="url"
                    value={jobUrl}
                  />
                </label>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  className="inline-flex items-center justify-center gap-3 rounded-full bg-cyan-300 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                  disabled={isLoading}
                  type="submit"
                >
                  {isLoading ? <Spinner /> : null}
                  {isLoading ? "Analyzing CV fit..." : "Run Assessment"}
                </button>
                {resumeFile ? (
                  <p className="text-sm text-slate-300">Ready to analyze the selected resume.</p>
                ) : (
                  <p className="text-sm text-slate-400">No file selected.</p>
                )}
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-400/35 bg-rose-950/50 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              ) : null}
            </form>
          </div>

          <section className="rounded-[32px] border border-white/12 bg-slate-950/70 p-8 shadow-panel backdrop-blur">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Assessment</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">Categorized Fit Breakdown</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Separate technical coverage from collaboration and process signals to make
                  likely rejection risks easier to spot.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <ScoreCard label="Overall Match" score={result.overall_score} tone="overall" />
                <ScoreCard label="ATS Score" score={result.ats_score} tone="ats" />
              </div>
            </div>

            {isLoading ? (
              <LoadingPanel />
            ) : (
              <div className="mt-8 space-y-6">
                <div className="grid gap-6 xl:grid-cols-2">
                  <SkillPanel
                    bucket={result.core_skills}
                    description="Technical stack, tooling depth, platform experience, and hard-skill alignment."
                    title="Core Technical Fit"
                    tone="core"
                  />
                  <SkillPanel
                    bucket={result.soft_skills}
                    description="Communication, ownership, teamwork, delivery habits, and stakeholder-facing strengths."
                    title="Professional / Soft Skill Fit"
                    tone="soft"
                  />
                </div>

                <section className="rounded-[28px] border border-rose-400/30 bg-rose-950/40 p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-100">
                    CV Gap Analysis
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold text-white">Areas for Improvement</h3>
                  <p className="mt-4 text-sm leading-7 text-rose-50">
                    {result.critical_weakness ||
                      "Run an assessment to surface the single most important rejection risk."}
                  </p>

                  <div className="mt-6">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-100">
                      Action Plan
                    </p>
                    <div className="mt-4 space-y-3">
                      {result.action_plan.length ? (
                        result.action_plan.map((item) => (
                          <div
                            className="rounded-2xl border border-rose-300/20 bg-slate-950/35 px-4 py-3 text-sm leading-6 text-rose-50"
                            key={item}
                          >
                            {item}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-rose-100/85">
                          Actionable CV improvements will appear here after analysis.
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function normalizeBucket(bucket) {
  if (!bucket || typeof bucket !== "object") {
    return initialBucket;
  }

  return {
    matches: Array.isArray(bucket.matches) ? bucket.matches : [],
    gaps: Array.isArray(bucket.gaps) ? bucket.gaps : [],
    score: Number.isFinite(bucket.score) ? bucket.score : 0,
  };
}

function ModeButton({ active, label, description, onClick }) {
  return (
    <button
      className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
        active
          ? "border-cyan-300/60 bg-cyan-300/10 text-white"
          : "border-white/12 bg-slate-900/70 text-slate-300"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="block font-semibold">{label}</span>
      <span className="mt-1 block text-xs text-slate-400">{description}</span>
    </button>
  );
}

function LoadingPanel() {
  return (
    <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-8">
      <div className="flex items-center gap-4">
        <Spinner large />
        <div>
          <p className="text-lg font-semibold text-white">AI is analyzing the CV now</p>
          <p className="mt-1 text-sm text-slate-300">
            Reviewing ATS alignment, hard-skill coverage, soft-skill signals, and the most important weaknesses.
          </p>
        </div>
      </div>
    </div>
  );
}

function Spinner({ large = false }) {
  const sizeClass = large ? "h-8 w-8 border-4" : "h-4 w-4 border-2";
  return (
    <span
      aria-hidden="true"
      className={`${sizeClass} inline-block animate-spin rounded-full border-slate-400 border-t-transparent`}
    />
  );
}

function ScoreCard({ label, score, tone }) {
  const displayScore = useCountUp(score);
  const colorClass = tone === "ats" ? "text-amber-200" : "text-cyan-200";

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className={`mt-2 text-4xl font-semibold ${colorClass}`}>{score === null ? "--" : `${displayScore}%`}</p>
    </div>
  );
}

function SkillPanel({ title, description, bucket, tone }) {
  const matchesEmptyText = "No strong evidence surfaced yet.";
  const gapsEmptyText = "No major weaknesses surfaced yet.";
  const toneClasses =
    tone === "core"
      ? {
          border: "border-emerald-300/25",
          chip: "text-emerald-100 bg-emerald-300/10 border-emerald-300/30",
        }
      : {
          border: "border-sky-300/25",
          chip: "text-sky-100 bg-sky-300/10 border-sky-300/30",
        };

  return (
    <section className={`rounded-[28px] border ${toneClasses.border} bg-white/5 p-6`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{title}</p>
          <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
        </div>
        <div className={`shrink-0 rounded-3xl border px-5 py-4 text-center ${toneClasses.chip}`}>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Score</p>
          <p className="mt-2 text-3xl font-semibold">
            <AnimatedPercentage value={bucket.score} />
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <StatusList
          emptyText={matchesEmptyText}
          icon="check"
          items={bucket.matches}
          title="Matches"
        />
        <StatusList
          emptyText={gapsEmptyText}
          icon="gap"
          items={bucket.gaps}
          title="Gaps"
        />
      </div>
    </section>
  );
}

function StatusList({ title, items, emptyText, icon }) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-200">{title}</p>
      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((item) => (
            <div
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm leading-6 text-slate-100"
              key={`${title}-${item}`}
            >
              <StatusIcon variant={icon} />
              <span>{item}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400">{emptyText}</p>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ variant }) {
  if (variant === "check") {
    return (
      <span
        aria-hidden="true"
        className="mt-1 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-400/15 text-sm font-bold text-emerald-300"
      >
        ✓
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="mt-1 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-rose-400/15 text-sm font-bold text-rose-200"
    >
      !
    </span>
  );
}

function AnimatedPercentage({ value }) {
  const displayValue = useCountUp(value);
  return `${displayValue}%`;
}

function useCountUp(value) {
  const [displayValue, setDisplayValue] = useState(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const target = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
    const startTime = performance.now();
    const duration = 700;

    cancelAnimationFrame(frameRef.current);

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const nextValue = Math.round(target * progress);
      setDisplayValue(nextValue);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    setDisplayValue(0);
    frameRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameRef.current);
  }, [value]);

  return displayValue;
}

export default App;
