import type { TranscriptionResponse } from "../../server/apiHandler";
import type { TranscriptionResult } from "../types";
import { optimizeAudioForTranscription } from "./audioCompressor";

export async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function parseResult(data: TranscriptionResponse, targetLanguage: string): TranscriptionResult {
  return {
    id: `transcript-${Date.now()}`,
    title: data.title || "Audio Transcription",
    detectedLanguage: data.detectedLanguage || "Unknown",
    detectedLanguageCode: data.detectedLanguageCode || "auto",
    confidenceScore: data.confidenceScore || 0.95,
    targetLanguage: data.targetLanguage || targetLanguage,
    summary: data.summary || "",
    keyTakeaways: data.keyTakeaways || [],
    fullOriginalTranscript: data.fullOriginalTranscript || "",
    fullTranslatedTranscript: data.fullTranslatedTranscript || "",
    segments: data.segments || [],
    createdAt: new Date().toISOString(),
  };
}

export async function transcribeAudio(
  fileOrBlob: Blob | File,
  mimeType: string,
  targetLanguage: string,
  promptHint?: string,
  onProgress?: (status: string) => void
): Promise<TranscriptionResult> {
  let targetBlob: Blob | File = fileOrBlob;
  let targetMime = mimeType || fileOrBlob.type || "audio/mp3";

  // If file is > 15MB, automatically optimize & downsample to 16kHz mono in browser
  if (fileOrBlob.size > 15 * 1024 * 1024) {
    onProgress?.("Large audio file detected. Optimizing speech channels...");
    const optimized = await optimizeAudioForTranscription(fileOrBlob, onProgress);
    targetBlob = optimized.blob;
    targetMime = optimized.mimeType;
  }

  onProgress?.("Uploading audio data...");
  const base64 = await fileToBase64(targetBlob);

  onProgress?.("Transcribing speech with Gemini 3.8 Flash...");
  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audioBase64: base64,
      mimeType: targetMime,
      targetLanguage,
      promptHint,
    }),
  });

  if (!res.ok) {
    if (res.status === 413) {
      onProgress?.("Optimizing audio into compact speech stream...");
      try {
        const retryOpt = await optimizeAudioForTranscription(fileOrBlob, onProgress);
        const retryBase64 = await fileToBase64(retryOpt.blob);
        const retryRes = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: retryBase64,
            mimeType: retryOpt.mimeType,
            targetLanguage,
            promptHint,
          }),
        });
        if (retryRes.ok) {
          const data: TranscriptionResponse = await retryRes.json();
          return parseResult(data, targetLanguage);
        }
      } catch (retryErr) {
        console.warn("Retry optimization failed:", retryErr);
      }
    }

    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData.error ||
        (res.status === 413
          ? "The audio file exceeds Cloud Run's upload network limit. Try converting or recording directly."
          : `Server error: ${res.status} ${res.statusText}`)
    );
  }

  const data: TranscriptionResponse = await res.json();
  return parseResult(data, targetLanguage);
}

export async function translateLiveText(
  text: string,
  targetLanguage: string
): Promise<{ detectedLanguage: string; detectedLanguageCode: string; translatedText: string }> {
  const res = await fetch("/api/translate-text", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, targetLanguage }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to translate live text");
  }

  return res.json();
}

export async function synthesizeTTS(text: string, voice: string = "Kore"): Promise<string> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to synthesize speech audio");
  }

  const data = await res.json();
  return `data:${data.mimeType || "audio/wav"};base64,${data.audioBase64}`;
}
