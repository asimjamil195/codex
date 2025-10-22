import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
});

export const generateCurriculum = (topic) =>
  API.post("curriculum/", { topic });

export const generateLesson = (concept) =>
  API.post("lesson/", { concept });

export const getFeedback = (code) =>
  API.post("feedback/", { code });

export const listLanguages = () => API.get("execute/");

export const runCode = (payload) => API.post("execute/", payload);
