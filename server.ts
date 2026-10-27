import express from "express";
import path from "path";
import dotenv from "dotenv";
import { handleTranscribe, handleTranslateText, handleTTS } from "./server/apiHandler.ts";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: "1000mb" }));
app.use(express.urlencoded({ extended: true, limit: "1000mb" }));

// API routes
app.post("/api/transcribe", handleTranscribe);
app.post("/api/translate-text", handleTranslateText);
app.post("/api/tts", handleTTS);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// In production, serve the built dist directory
const distPath = path.resolve(process.cwd(), "dist");
app.use(express.static(distPath));

app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});

export default app;
