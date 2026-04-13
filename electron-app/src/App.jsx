import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  Moon,
  Settings,
  Sun,
  Upload,
  UserRoundSearch,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const initialResult = {
  overall_score: 0,
  core_skills: { matches: [], gaps: [] },
  soft_skills: { matches: [], gaps: [] },
  weakness_analysis: {
    summary: "",
    details: [],
    action_plan: [],
  },
};

const themes = {
  dark: {
    app: "bg-darkmesh text-slate-100",
    shell: "border-white/10 bg-slate-950/70",
    sidebar: "border-white/10 bg-slate-950/75",
    card: "border-white/10 bg-white/5",
    muted: "text-slate-400",
    text: "text-slate-200",
    heading: "text-white",
    input:
      "border-white/10 bg-slate-950/80 text-slate-100 placeholder:text-slate-500 focus:border-sky-300 focus:ring-sky-300/20",
    buttonPrimary: "bg-sky-300 text-slate-950 hover:bg-sky-200",
    buttonSecondary: "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10",
    accent: "border-sky-300/30 bg-sky-300/10 text-sky-200",
    progressTrack: "bg-white/10",
    progressBar: "bg-gradient-to-r from-sky-300 to-emerald-300",
    dropzone: "border-white/10 bg-slate-950/55",
    skeleton: "from-white/5 via-white/10 to-white/5",
  },
  light: {
    app: "bg-lightmesh text-slate-950",
    shell: "border-black/10 bg-white/85",
    sidebar: "border-black/10 bg-white/90",
    card: "border-black/10 bg-white/90",
    muted: "text-slate-500",
    text: "text-slate-700",
    heading: "text-slate-950",
    input:
      "border-black/10 bg-white text-slate-950 placeholder:text-slate-400 focus:border-slate-950 focus:ring-slate-950/10",
    buttonPrimary: "bg-slate-950 text-white hover:bg-slate-800",
    buttonSecondary: "border-black/10 bg-white text-slate-900 hover:bg-slate-100",
    accent: "border-black/10 bg-slate-950 text-white",
    progressTrack: "bg-slate-200",
    progressBar: "bg-gradient-to-r from-slate-950 to-slate-500",
    dropzone: "border-black/10 bg-white",
    skeleton: "from-slate-100 via-slate-200 to-slate-100",
  },
};

function App() {
  const [theme, setTheme] = useState("dark");
  const [view, setView] = useState("loading");
  const [isConfigured, setIsConfigured] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [inputMode, setInputMode] = useState("text");
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [result, setResult] = useState(initialResult);

  const palette = themes[theme];

  useEffect(() => {
    let mounted = true;

    window.desktopAPI
      .getAppState()
      .then((state) => {
        if (!mounted) return;
        const configured = Boolean(state.apiKeyConfigured);
        setIsConfigured(configured);
        setView(configured ? "dashboard" : "settings");
      })
      .catch(() => {
        if (!mounted) return;
        setView("settings");
      });

    return () => {
      mounted = false;
    };
  }, []);

  const summaryCards = useMemo(
    () => [
      {
        label: "Overall Match",
        value: result.overall_score,
        icon: UserRoundSearch,
      },
      {
        label: "Core Skill Match",
        value: deriveScore(result.core_skills),
        icon: Wrench,
      },
      {
        label: "Soft Skill Match",
        value: deriveScore(result.soft_skills),
        icon: CheckCircle2,
      },
    ],
    [result],
  );

  const handleTestAndSave = async () => {
    setSettingsBusy(true);
    setSettingsError("");

    try {
      await window.desktopAPI.testAndSaveApiKey(apiKey);
      setIsConfigured(true);
      setView("dashboard");
      setApiKey("");
    } catch (error) {
      setSettingsError(error.message);
    } finally {
      setSettingsBusy(false);
    }
  };

  const handleAnalyze = async (event) => {
    event.preventDefault();

    if (!resumeFile) {
      setAnalysisError("Drop a PDF resume before analyzing.");
      return;
    }

    if (inputMode === "text" && !jobDescription.trim()) {
      setAnalysisError("Paste a job description before analyzing.");
      return;
    }

    if (inputMode === "url" && !jobUrl.trim()) {
      setAnalysisError("Enter a job URL before analyzing.");
      return;
    }

    setAnalysisBusy(true);
    setAnalysisError("");

    try {
      const payload = {
        resumeBytes: Array.from(new Uint8Array(await resumeFile.arrayBuffer())),
        resumeMimeType: resumeFile.type,
        jobDescription,
        jobUrl,
      };

      const nextResult = await window.desktopAPI.analyzeResume(payload);
      setResult(nextResult);
    } catch (error) {
      setAnalysisError(error.message);
    } finally {
      setAnalysisBusy(false);
    }
  };

  return (
    <main className={`min-h-screen p-6 transition-colors duration-300 ${palette.app}`}>
      <div className={`mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl overflow-hidden rounded-[36px] border shadow-panel ${palette.shell}`}>
        <aside className={`flex w-[300px] flex-col justify-between border-r p-6 ${palette.sidebar}`}>
          <div>
            <div className={`inline-flex items-center gap-3 rounded-full border px-4 py-2 text-xs uppercase tracking-[0.3em] ${palette.accent}`}>
              <KeyRound className="h-4 w-4" />
              Job Fit Desktop
            </div>
            <h1 className={`mt-6 text-3xl font-semibold leading-tight ${palette.heading}`}>
              Secure BYOK resume assessment.
            </h1>
            <p className={`mt-4 text-sm leading-6 ${palette.text}`}>
              Local desktop workflow with Gemini key verification, PDF analysis, and secure IPC-only communication.
            </p>

            <nav className="mt-10 space-y-3">
              <SidebarButton
                active={view === "dashboard" && isConfigured}
                disabled={!isConfigured}
                icon={UserRoundSearch}
                label="Analyze"
                onClick={() => setView("dashboard")}
                palette={palette}
              />
              <SidebarButton
                active={view === "settings"}
                icon={Settings}
                label="Settings"
                onClick={() => setView("settings")}
                palette={palette}
              />
            </nav>
          </div>

          <div className="space-y-4">
            <button
              className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition ${palette.buttonSecondary}`}
              onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              type="button"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>

            {isConfigured ? (
              <button
                className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition ${palette.buttonSecondary}`}
                onClick={async () => {
                  await window.desktopAPI.clearApiKey();
                  setIsConfigured(false);
                  setView("settings");
                }}
                type="button"
              >
                Reset API Key
              </button>
            ) : null}
          </div>
        </aside>

        <section className="flex-1 p-8">
          <AnimatePresence mode="wait">
            {view === "loading" ? (
              <motion.div
                key="loading"
                animate={{ opacity: 1 }}
                className="flex h-full items-center justify-center"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
              >
                <LoaderCircle className={`h-10 w-10 animate-spin ${palette.muted}`} />
              </motion.div>
            ) : null}

            {view === "settings" ? (
              <motion.div
                key="settings"
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto max-w-3xl"
                exit={{ opacity: 0, y: 8 }}
                initial={{ opacity: 0, y: 12 }}
              >
                <div className={`rounded-[32px] border p-8 ${palette.card}`}>
                  <div className="flex items-start gap-4">
                    <div className={`rounded-2xl border p-3 ${palette.accent}`}>
                      <KeyRound className="h-6 w-6" />
                    </div>
                    <div>
                      <p className={`text-sm uppercase tracking-[0.25em] ${palette.muted}`}>Bring Your Own Key</p>
                      <h2 className={`mt-2 text-3xl font-semibold ${palette.heading}`}>Unlock the desktop workspace</h2>
                      <p className={`mt-3 max-w-2xl text-sm leading-6 ${palette.text}`}>
                        Save a valid Gemini API key locally. The app stays locked until the key passes a live Gemini verification call.
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 space-y-5">
                    <label className="block">
                      <span className={`mb-2 block text-sm font-medium ${palette.heading}`}>Gemini API Key</span>
                      <input
                        className={`w-full rounded-2xl border px-4 py-4 text-sm outline-none transition ${palette.input}`}
                        onChange={(event) => setApiKey(event.target.value)}
                        placeholder="AIza..."
                        type="password"
                        value={apiKey}
                      />
                    </label>

                    <button
                      className={`inline-flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-semibold transition ${palette.buttonPrimary} ${settingsBusy ? "opacity-70" : ""}`}
                      disabled={settingsBusy}
                      onClick={handleTestAndSave}
                      type="button"
                    >
                      {settingsBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Test & Save
                    </button>

                    {settingsError ? (
                      <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                        {settingsError}
                      </div>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            ) : null}

            {view === "dashboard" ? (
              <motion.div
                key="dashboard"
                animate={{ opacity: 1, y: 0 }}
                className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]"
                exit={{ opacity: 0, y: 8 }}
                initial={{ opacity: 0, y: 12 }}
              >
                <div className={`rounded-[32px] border p-8 ${palette.card}`}>
                  <p className={`text-sm uppercase tracking-[0.25em] ${palette.muted}`}>Analyze Resume</p>
                  <h2 className={`mt-2 text-3xl font-semibold ${palette.heading}`}>Desktop assessment workspace</h2>
                  <p className={`mt-3 text-sm leading-6 ${palette.text}`}>
                    Drop a PDF resume, choose a job source, and run the assessment through the Electron IPC bridge.
                  </p>

                  <form className="mt-8 space-y-6" onSubmit={handleAnalyze}>
                    <DropZone
                      file={resumeFile}
                      onFile={setResumeFile}
                      palette={palette}
                    />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <ModeCard
                        active={inputMode === "text"}
                        description="Paste the role description directly."
                        label="Paste Description"
                        onClick={() => setInputMode("text")}
                        palette={palette}
                      />
                      <ModeCard
                        active={inputMode === "url"}
                        description="Pull the job description from a URL."
                        label="Use URL"
                        onClick={() => setInputMode("url")}
                        palette={palette}
                      />
                    </div>

                    {inputMode === "text" ? (
                      <textarea
                        className={`min-h-64 w-full rounded-[28px] border px-4 py-4 text-sm leading-6 outline-none transition ${palette.input}`}
                        onChange={(event) => setJobDescription(event.target.value)}
                        placeholder="Paste the job description here..."
                        value={jobDescription}
                      />
                    ) : (
                      <input
                        className={`w-full rounded-[28px] border px-4 py-4 text-sm outline-none transition ${palette.input}`}
                        onChange={(event) => setJobUrl(event.target.value)}
                        placeholder="https://company.com/jobs/frontend-role"
                        type="url"
                        value={jobUrl}
                      />
                    )}

                    <div className="flex items-center gap-4">
                      <button
                        className={`inline-flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-semibold transition ${palette.buttonPrimary}`}
                        disabled={analysisBusy}
                        type="submit"
                      >
                        {analysisBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserRoundSearch className="h-4 w-4" />}
                        Analyze
                      </button>
                      {analysisError ? <p className="text-sm text-rose-300">{analysisError}</p> : null}
                    </div>
                  </form>
                </div>

                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    {summaryCards.map((card) => (
                      <ScoreCard key={card.label} card={card} palette={palette} />
                    ))}
                  </div>

                  {analysisBusy ? (
                    <SkeletonState palette={palette} />
                  ) : (
                    <>
                      <div className="grid gap-6 md:grid-cols-2">
                        <SkillPanel
                          icon={Wrench}
                          label="Core Skills"
                          palette={palette}
                          skills={result.core_skills}
                        />
                        <SkillPanel
                          icon={CheckCircle2}
                          label="Soft Skills"
                          palette={palette}
                          skills={result.soft_skills}
                        />
                      </div>

                      <div className={`rounded-[32px] border p-6 ${palette.card}`}>
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="mt-1 h-5 w-5 text-rose-300" />
                          <div>
                            <p className={`text-sm uppercase tracking-[0.25em] ${palette.muted}`}>Weakness Analysis</p>
                            <p className={`mt-3 text-sm leading-7 ${palette.text}`}>
                              {result.weakness_analysis.summary || "Analysis details will appear here after the first run."}
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 grid gap-6 md:grid-cols-2">
                          <ListCard
                            items={result.weakness_analysis.details}
                            palette={palette}
                            title="Risk Details"
                          />
                          <ListCard
                            items={result.weakness_analysis.action_plan}
                            palette={palette}
                            title="Action Plan"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </section>
      </div>
    </main>
  );
}

function SidebarButton({ active, disabled = false, icon: Icon, label, onClick, palette }) {
  return (
    <button
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
        active ? palette.accent : palette.buttonSecondary
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function ModeCard({ active, label, description, onClick, palette }) {
  return (
    <button
      className={`rounded-2xl border px-4 py-4 text-left transition ${active ? palette.accent : palette.buttonSecondary}`}
      onClick={onClick}
      type="button"
    >
      <span className="block text-sm font-semibold">{label}</span>
      <span className={`mt-2 block text-xs ${palette.muted}`}>{description}</span>
    </button>
  );
}

function DropZone({ file, onFile, palette }) {
  const onDrop = (event) => {
    event.preventDefault();
    const nextFile = event.dataTransfer.files?.[0];
    if (nextFile) {
      onFile(nextFile);
    }
  };

  return (
    <label
      className={`block rounded-[28px] border border-dashed p-8 text-center transition ${palette.dropzone}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <input
        accept="application/pdf"
        className="hidden"
        onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        type="file"
      />
      <Upload className={`mx-auto h-8 w-8 ${palette.muted}`} />
      <p className="mt-4 text-sm font-semibold">Drag and drop a PDF resume</p>
      <p className={`mt-2 text-sm ${palette.muted}`}>
        {file ? file.name : "or click here to browse from disk"}
      </p>
    </label>
  );
}

function ScoreCard({ card, palette }) {
  const Icon = card.icon;
  return (
    <div className={`rounded-[28px] border p-5 ${palette.card}`}>
      <div className="flex items-center gap-3">
        <div className={`rounded-2xl border p-3 ${palette.accent}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className={`text-xs uppercase tracking-[0.2em] ${palette.muted}`}>{card.label}</p>
          <p className={`mt-2 text-3xl font-semibold ${palette.heading}`}>{card.value}%</p>
        </div>
      </div>
      <div className={`mt-5 h-2 overflow-hidden rounded-full ${palette.progressTrack}`}>
        <motion.div
          animate={{ width: `${card.value}%` }}
          className={`h-full ${palette.progressBar}`}
          initial={{ width: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function SkillPanel({ label, icon: Icon, skills, palette }) {
  return (
    <div className={`rounded-[32px] border p-6 ${palette.card}`}>
      <div className="flex items-center gap-3">
        <div className={`rounded-2xl border p-3 ${palette.accent}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className={`text-sm uppercase tracking-[0.2em] ${palette.muted}`}>{label}</p>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <StatusList items={skills.matches} kind="matches" palette={palette} />
        <StatusList items={skills.gaps} kind="gaps" palette={palette} />
      </div>
    </div>
  );
}

function StatusList({ items, kind, palette }) {
  const isMatch = kind === "matches";
  const Icon = isMatch ? CheckCircle2 : AlertTriangle;

  return (
    <div>
      <p className={`text-sm font-semibold uppercase tracking-[0.2em] ${palette.muted}`}>{kind}</p>
      <div className="mt-3 space-y-3">
        {items.length ? (
          items.map((item) => (
            <div key={item} className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${palette.card}`}>
              <Icon className={`mt-0.5 h-4 w-4 ${isMatch ? "text-emerald-300" : "text-rose-300"}`} />
              <span className={`text-sm leading-6 ${palette.text}`}>{item}</span>
            </div>
          ))
        ) : (
          <p className={`text-sm ${palette.muted}`}>No {kind} surfaced yet.</p>
        )}
      </div>
    </div>
  );
}

function ListCard({ title, items, palette }) {
  return (
    <div className={`rounded-[28px] border p-5 ${palette.card}`}>
      <p className={`text-sm uppercase tracking-[0.2em] ${palette.muted}`}>{title}</p>
      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((item) => (
            <div key={item} className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${palette.card}`}>
              {item}
            </div>
          ))
        ) : (
          <p className={`text-sm ${palette.muted}`}>Nothing to show yet.</p>
        )}
      </div>
    </div>
  );
}

function SkeletonState({ palette }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {[0, 1].map((panel) => (
          <div key={panel} className={`rounded-[32px] border p-6 ${palette.card}`}>
            <div className={`h-6 w-40 animate-pulse rounded-full bg-gradient-to-r ${palette.skeleton}`} />
            <div className="mt-6 space-y-3">
              {[0, 1, 2].map((line) => (
                <div key={line} className={`h-16 animate-pulse rounded-2xl bg-gradient-to-r ${palette.skeleton}`} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={`rounded-[32px] border p-6 ${palette.card}`}>
        <div className={`h-6 w-48 animate-pulse rounded-full bg-gradient-to-r ${palette.skeleton}`} />
        <div className="mt-6 grid gap-3">
          {[0, 1, 2].map((line) => (
            <div key={line} className={`h-14 animate-pulse rounded-2xl bg-gradient-to-r ${palette.skeleton}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function deriveScore(bucket) {
  const total = bucket.matches.length + bucket.gaps.length;
  if (!total) {
    return 0;
  }
  return Math.round((bucket.matches.length / total) * 100);
}

export default App;
