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
import React, { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

const api = axios.create({ baseURL: "http://127.0.0.1:8000/api/" });

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

function PrimaryButton({ children, onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60`}
    >
      {loading ? "..." : children}
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
  const [feedback, setFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [language, setLanguage] = useState("python");


  async function handleGenerate() {
    if (!topic.trim()) return;
    setTopicLoading(true);
    try {
      const res = await api.post("curriculum/", { topic });
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
      const res = await api.post("lesson/", { concept });
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
      const res = await api.post("feedback/", { code });
      setFeedback(res.data);
    } catch (err) {
      console.error(err);
      setFeedback({ error: "failed to fetch" });
    } finally {
      setFeedbackLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Codexa</h1>
            <p className="text-sm text-gray-600">AI-powered interactive learning — mock mode</p>
          </div>
          <nav className="flex items-center gap-4">
            <a className="text-sm text-gray-700 hover:underline" href="#">Docs</a>
            <a className="text-sm text-gray-700 hover:underline" href="#">Dashboard</a>
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
                  <PrimaryButton onClick={handleGenerate} loading={topicLoading}>Generate</PrimaryButton>
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
                  <PrimaryButton onClick={handleExplain} loading={lessonLoading}>Explain</PrimaryButton>
                </div>
              </div>

              {lesson && (
                <div className="mt-4 p-4 border rounded-md bg-gray-50">
                  <h3 className="font-semibold mb-2">{lesson.title || 'Lesson'}</h3>
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
              <h2 className="text-lg font-medium mb-3">Code Feedback</h2>
              <Editor
                  height="300px"
                  defaultLanguage="python"
                  language={language} // can be changed dynamically
                  theme="vs-dark"
                  value={code}
                  onChange={(value) => setCode(value)}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: "on",
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                  }}
              />
              <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="border rounded-md px-2 py-1 text-sm"
                >
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="cpp">C++</option>
                  <option value="java">Java</option>
                  <option value="html">HTML</option>
                  <option value="css">CSS</option>
                </select>

              <div className="mt-3 flex justify-end">
                <PrimaryButton onClick={handleFeedback} loading={feedbackLoading}>Submit</PrimaryButton>
              </div>
              {feedback && (
                <div className="mt-4 p-3 bg-gray-50 rounded border text-sm">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(feedback, null, 2)}</pre>
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
