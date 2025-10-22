/*
Codexa React UI - Tailwind version
File: src/App.jsx (single-file React component)

Instructions:
1. Ensure you created the React app: npx create-react-app frontend
2. Install dependencies:
   npm install axios framer-motion
3. Install and configure Tailwind CSS (see Tailwind docs):
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   // then add the content paths and Tailwind directives in src/index.css
4. Replace src/App.jsx with this file and run `npm start`.

This component is a single-file UI with Tailwind classes, responsive layout, animated cards,
and API calls to the backend endpoints you already implemented.
*/
import Editor from "@monaco-editor/react";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  generateCurriculum as fetchCurriculum,
  generateLesson as fetchLesson,
  getFeedback as fetchFeedback,
  listLanguages,
  runCode as runJudge0,
} from "./api";

function Input({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
    />
  );
}

function PrimaryButton({
  children,
  onClick,
  loading,
  loadingLabel,
  disabled = false,
  className = "",
}) {
  const isDisabled = disabled || loading;
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition ${className}`}
    >
      {loading ? loadingLabel || "..." : children}
    </button>
  );
}

function CurriculumCard({ curriculum }) {
  if (!curriculum) return null;
  const levels = curriculum.levels || curriculum?.curriculum?.levels || [];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {levels.map((lvl, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="p-4 bg-white rounded-lg shadow"
        >
          <h3 className="text-lg font-semibold mb-2">{lvl.level}</h3>
          <ul className="space-y-2">
            {lvl.lessons?.map((lesson, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <div className="w-2 h-2 mt-2 bg-indigo-500 rounded-full" />
                <div>
                  <div className="font-medium">{lesson.title}</div>
                  <div className="text-sm text-gray-600">{lesson.summary}</div>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      ))}
    </div>
  );
}

export default function App() {
  const [topic, setTopic] = useState("");
  const [curriculum, setCurriculum] = useState(null);
  const [topicLoading, setTopicLoading] = useState(false);

  const [concept, setConcept] = useState("");
  const [lesson, setLesson] = useState(null);
  const [lessonLoading, setLessonLoading] = useState(false);

  const [code, setCode] = useState("");
  const [stdin, setStdin] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const [languages, setLanguages] = useState([]);
  const [languagesLoading, setLanguagesLoading] = useState(false);
  const [languageError, setLanguageError] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState("python");
  const [executionLoading, setExecutionLoading] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLanguages() {
      setLanguagesLoading(true);
      try {
        const res = await listLanguages();
        if (cancelled) return;
        const langs = res.data?.languages || [];
        setLanguages(langs);
        setSelectedLanguage((current) => {
          if (current && langs.some((lang) => lang.key === current)) {
            return current;
          }
          return langs[0]?.key || current || "python";
        });
        setLanguageError(null);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setLanguageError("Unable to load Judge0 languages. Check your backend connection.");
      } finally {
        if (!cancelled) {
          setLanguagesLoading(false);
        }
      }
    }

    fetchLanguages();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeLanguage = languages.find((lang) => lang.key === selectedLanguage);
  const editorLanguage = activeLanguage?.editor || selectedLanguage || "plaintext";

  async function handleGenerate() {
    if (!topic.trim()) return;
    setTopicLoading(true);
    try {
      const res = await fetchCurriculum(topic);
      setCurriculum(res.data.curriculum || res.data);
    } catch (err) {
      console.error(err);
      setCurriculum({ error: "failed to fetch" });
    } finally {
      setTopicLoading(false);
    }
  }

  async function handleExplain() {
    if (!concept.trim()) return;
    setLessonLoading(true);
    try {
      const res = await fetchLesson(concept);
      setLesson(res.data);
    } catch (err) {
      console.error(err);
      setLesson({ error: "failed to fetch" });
    } finally {
      setLessonLoading(false);
    }
  }

  async function handleFeedback() {
    if (!code.trim()) return;
    setFeedbackLoading(true);
    try {
      const res = await fetchFeedback(code);
      setFeedback(res.data.feedback || res.data);
    } catch (err) {
      console.error(err);
      setFeedback({ error: "failed to fetch" });
    } finally {
      setFeedbackLoading(false);
    }
  }

  async function handleRun() {
    if (!code.trim()) return;
    setExecutionLoading(true);
    setExecutionResult(null);
    try {
      const res = await runJudge0({
        language: selectedLanguage,
        source_code: code,
        stdin,
      });
      setExecutionResult(res.data);
    } catch (err) {
      console.error(err);
      const fallback =
        err?.response?.data?.error || err?.message || "Execution failed. Please try again.";
      setExecutionResult({ error: fallback });
    } finally {
      setExecutionLoading(false);
    }
  }

  const statusInfo = executionResult?.status;
  const statusLabel =
    typeof statusInfo === "string"
      ? statusInfo
      : statusInfo?.description || statusInfo?.name || "";
  const statusTone =
    statusInfo?.id === 3
      ? "text-emerald-600"
      : statusInfo?.id && statusInfo.id < 3
      ? "text-amber-600"
      : "text-red-600";

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Codexa</h1>
            <p className="text-sm text-gray-600">AI-powered interactive learning — mock mode</p>
          </div>
          <nav className="flex items-center gap-4">
            <a className="text-sm text-gray-700 hover:underline" href="#">
              Docs
            </a>
            <a className="text-sm text-gray-700 hover:underline" href="#">
              Dashboard
            </a>
          </nav>
        </header>

        <main className="grid gap-8 lg:grid-cols-3">
          <section className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-white rounded-lg shadow"
            >
              <h2 className="text-lg font-medium mb-3">Generate a Curriculum</h2>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                  <Input value={topic} onChange={setTopic} placeholder="e.g. python for data science" />
                </div>
                <div className="flex items-center md:justify-start">
                  <PrimaryButton
                    onClick={handleGenerate}
                    loading={topicLoading}
                    loadingLabel="Generating..."
                    disabled={!topic.trim()}
                  >
                    Generate
                  </PrimaryButton>
                </div>
              </div>

              <div className="mt-6">
                <CurriculumCard curriculum={curriculum} />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-white rounded-lg shadow"
            >
              <h2 className="text-lg font-medium mb-3">Explain a Concept</h2>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                  <Input value={concept} onChange={setConcept} placeholder="e.g. list comprehensions" />
                </div>
                <div className="flex items-center md:justify-start">
                  <PrimaryButton
                    onClick={handleExplain}
                    loading={lessonLoading}
                    loadingLabel="Explaining..."
                    disabled={!concept.trim()}
                  >
                    Explain
                  </PrimaryButton>
                </div>
              </div>

              {lesson && (
                <div className="mt-4 p-4 border rounded-md bg-gray-50">
                  <h3 className="font-semibold mb-2">{lesson.title || "Lesson"}</h3>
                  <p className="text-sm text-gray-700">{lesson.explanation || JSON.stringify(lesson)}</p>
                  {lesson.exercise && (
                    <pre className="mt-3 bg-white p-3 rounded border text-sm">{lesson.exercise}</pre>
                  )}
                </div>
              )}
            </motion.div>
          </section>

          <aside className="space-y-6">
            <motion.div className="p-6 bg-white rounded-lg shadow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">Code Lab</h2>
                {languagesLoading && <span className="text-xs text-gray-500">Loading languages…</span>}
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Run code in Judge0 and request AI feedback without leaving the page.
              </p>
              <Editor
                height="300px"
                defaultLanguage="python"
                language={editorLanguage}
                theme="vs-dark"
                value={code}
                onChange={(value) => setCode(value ?? "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: "on",
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                }}
              />
              <div className="mt-3 flex flex-col gap-3">
                <label className="text-sm font-medium text-gray-600">
                  Language
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
                    disabled={languagesLoading || languages.length === 0}
                  >
                    {languages.length === 0 ? (
                      <option value="">No languages available</option>
                    ) : (
                      languages.map((lang) => (
                        <option key={lang.key} value={lang.key}>
                          {lang.name}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                <label className="text-sm font-medium text-gray-600">
                  Standard input (stdin)
                  <textarea
                    value={stdin}
                    onChange={(e) => setStdin(e.target.value)}
                    rows={3}
                    placeholder="Optional input passed to your program"
                    className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <PrimaryButton
                  onClick={handleRun}
                  loading={executionLoading}
                  loadingLabel="Running..."
                  disabled={!code.trim()}
                >
                  Run with Judge0
                </PrimaryButton>
                <PrimaryButton
                  onClick={handleFeedback}
                  loading={feedbackLoading}
                  loadingLabel="Sending..."
                  disabled={!code.trim()}
                >
                  Get Feedback
                </PrimaryButton>
              </div>

              {languageError && (
                <p className="mt-2 text-sm text-red-600">{languageError}</p>
              )}

              {executionResult && (
                <div className="mt-4 space-y-3 text-sm">
                  {executionResult.error ? (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
                      {executionResult.error}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-gray-700">Status</span>
                        <span className={`font-medium ${statusTone}`}>{statusLabel || "Completed"}</span>
                      </div>
                      {executionResult.stdout && (
                        <div>
                          <div className="font-semibold text-gray-700">Standard Output</div>
                          <pre className="mt-1 whitespace-pre-wrap break-words bg-gray-900 text-gray-100 rounded p-3 overflow-auto">
                            {executionResult.stdout}
                          </pre>
                        </div>
                      )}
                      {executionResult.stderr && (
                        <div>
                          <div className="font-semibold text-gray-700">Standard Error</div>
                          <pre className="mt-1 whitespace-pre-wrap break-words bg-red-900 text-red-100 rounded p-3 overflow-auto">
                            {executionResult.stderr}
                          </pre>
                        </div>
                      )}
                      {executionResult.compile_output && (
                        <div>
                          <div className="font-semibold text-gray-700">Compiler Output</div>
                          <pre className="mt-1 whitespace-pre-wrap break-words bg-yellow-900 text-yellow-100 rounded p-3 overflow-auto">
                            {executionResult.compile_output}
                          </pre>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        {executionResult.time !== undefined && (
                          <span>
                            <span className="font-medium text-gray-700">Time:</span> {executionResult.time ?? "-"} s
                          </span>
                        )}
                        {executionResult.memory !== undefined && (
                          <span>
                            <span className="font-medium text-gray-700">Memory:</span> {executionResult.memory ?? "-"} KB
                          </span>
                        )}
                        {executionResult.token && (
                          <span className="col-span-2 truncate">
                            <span className="font-medium text-gray-700">Submission token:</span> {executionResult.token}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {feedback && (
                <div className="mt-4 p-3 bg-gray-50 rounded border text-sm space-y-2">
                  <h3 className="font-semibold text-gray-700">AI Feedback</h3>
                  <pre className="whitespace-pre-wrap text-gray-800">
                    {typeof feedback === "string" ? feedback : JSON.stringify(feedback, null, 2)}
                  </pre>
                </div>
              )}
            </motion.div>

            <motion.div className="p-6 bg-white rounded-lg shadow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h3 className="text-sm font-medium text-gray-600">Quick Tips</h3>
              <ul className="mt-2 text-sm text-gray-700 space-y-2">
                <li>Use the mock mode during development</li>
                <li>Switch to a real model in <code>.env</code> when ready</li>
                <li>Track usage to avoid unexpected charges</li>
              </ul>
            </motion.div>
          </aside>
        </main>

        <footer className="mt-12 text-center text-sm text-gray-500">Built with Codexa · Mock mode</footer>
      </div>
    </div>
  );
}
