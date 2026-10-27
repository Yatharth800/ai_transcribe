import express from "express";
import dotenv from "dotenv";
import { handleTranscribe, handleTranslateText, handleTTS } from "../server/apiHandler.ts";

dotenv.config();

const app = express();

app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: true, limit: "500mb" }));

// Route handlers for Vercel Serverless environment
app.post("/api/transcribe", handleTranscribe);
app.post("/api/translate-text", handleTranslateText);
app.post("/api/tts", handleTTS);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    runtime: "Vercel Serverless Function",
    timestamp: new Date().toISOString(),
  });
});

export default app;
