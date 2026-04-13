import { useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const initialResult = {
  score: null,
  matches: [],
  gaps: [],
  verdict: "",
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
        score: payload.score,
        matches: payload.matches ?? [],
        gaps: payload.gaps ?? [],
        verdict: payload.verdict ?? "",
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
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-panel backdrop-blur">
            <p className="mb-4 inline-flex rounded-full border border-glow/30 bg-glow/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-glow">
              Resume Screen MVP
            </p>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight text-white md:text-5xl">
              Measure resume fit against a role in one pass.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Upload a PDF resume, paste the target job description, and get a structured fit
              assessment with strengths, gaps, and an overall verdict.
            </p>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Resume PDF</span>
                <input
                  accept="application/pdf"
                  className="block w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 file:mr-4 file:rounded-full file:border-0 file:bg-lime file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:file:bg-lime/90"
                  onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)}
                  type="file"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Job Source</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      inputMode === "text"
                        ? "border-glow/60 bg-glow/10 text-white"
                        : "border-white/10 bg-slate-950/40 text-slate-300"
                    }`}
                    onClick={() => setInputMode("text")}
                    type="button"
                  >
                    <span className="block font-semibold">Paste Description</span>
                    <span className="mt-1 block text-xs text-slate-400">
                      Enter the role details directly.
                    </span>
                  </button>
                  <button
                    className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      inputMode === "url"
                        ? "border-glow/60 bg-glow/10 text-white"
                        : "border-white/10 bg-slate-950/40 text-slate-300"
                    }`}
                    onClick={() => setInputMode("url")}
                    type="button"
                  >
                    <span className="block font-semibold">Use URL</span>
                    <span className="mt-1 block text-xs text-slate-400">
                      Backend extracts the posting text from a page.
                    </span>
                  </button>
                </div>
              </label>

              {inputMode === "text" ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">
                    Job Description
                  </span>
                  <textarea
                    className="min-h-64 w-full rounded-3xl border border-white/10 bg-slate-950/70 px-4 py-4 text-sm leading-6 text-slate-100 outline-none transition focus:border-glow/60 focus:ring-2 focus:ring-glow/20"
                    onChange={(event) => setJobDescription(event.target.value)}
                    placeholder="Paste the full job description here..."
                    value={jobDescription}
                  />
                </label>
              ) : (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">
                    Job Posting URL
                  </span>
                  <input
                    className="w-full rounded-3xl border border-white/10 bg-slate-950/70 px-4 py-4 text-sm text-slate-100 outline-none transition focus:border-glow/60 focus:ring-2 focus:ring-glow/20"
                    onChange={(event) => setJobUrl(event.target.value)}
                    placeholder="https://company.com/careers/job-posting"
                    type="url"
                    value={jobUrl}
                  />
                </label>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  className="inline-flex items-center justify-center rounded-full bg-glow px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-500"
                  disabled={isLoading}
                  type="submit"
                >
                  {isLoading ? "Analyzing..." : "Run Assessment"}
                </button>
                {resumeFile ? (
                  <p className="text-sm text-slate-300">{resumeFile.name}</p>
                ) : (
                  <p className="text-sm text-slate-400">No file selected.</p>
                )}
              </div>

              {error ? (
                <div className="rounded-2xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}
            </form>
          </div>

          <section className="rounded-[32px] border border-white/10 bg-slate-950/60 p-8 shadow-panel backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Assessment</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Fit Dashboard</h2>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Score</p>
                <p className="mt-1 text-4xl font-semibold text-lime">
                  {result.score !== null ? result.score : "--"}
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Verdict</p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                {result.verdict || "Run an assessment to see the overall summary."}
              </p>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <ResultList
                accentClass="text-glow"
                emptyText="No match signals yet."
                items={result.matches}
                title="Matches"
              />
              <ResultList
                accentClass="text-coral"
                emptyText="No gap signals yet."
                items={result.gaps}
                title="Gaps"
              />
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function ResultList({ title, items, emptyText, accentClass }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className={`text-sm uppercase tracking-[0.2em] ${accentClass}`}>{title}</p>
      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((item) => (
            <div
              className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm leading-6 text-slate-200"
              key={`${title}-${item}`}
            >
              {item}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400">{emptyText}</p>
        )}
      </div>
    </div>
  );
}

export default App;
