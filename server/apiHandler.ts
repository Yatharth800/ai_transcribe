import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import type { Request, Response } from "express";

dotenv.config();

const getApiKey = () => process.env.GEMINI_API_KEY || "";

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: getApiKey(),
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

export interface Segment {
  id: string;
  startTime: string;
  endTime: string;
  speaker: string;
  originalText: string;
  translatedText: string;
  detectedLanguage?: string;
}

export interface TranscriptionResponse {
  title: string;
  detectedLanguage: string;
  detectedLanguageCode: string;
  confidenceScore: number;
  targetLanguage: string;
  summary: string;
  keyTakeaways: string[];
  fullOriginalTranscript: string;
  fullTranslatedTranscript: string;
  segments: Segment[];
}

export async function handleTranscribe(req: Request, res: Response) {
  try {
    const { audioBase64, mimeType, targetLanguage = "English", promptHint } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: "Missing audio data in request." });
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured in the environment. Please add it to Settings > Secrets.",
      });
    }

    const ai = getAI();
    const cleanMime = mimeType || "audio/mp3";

    const prompt = `You are a world-class speech-to-text transcriber, translator, and accessibility expert.
Task:
1. Identify and automatically detect the exact language(s) spoken in this audio.
2. Produce an extremely accurate verbatim transcription of the speech with correct punctuation, casing, technical terms, and speaker attribution (e.g. Speaker 1, Speaker 2).
3. Translate the complete transcription into the target language: "${targetLanguage}". Ensure natural, high-fidelity translation preserving tone, nuance, and meaning.
4. Segment the speech chronologically with timestamps (formatted like "00:00", "00:04", etc.), speaker labels, original text, and translated text for each segment.
5. Provide a succinct document title, an executive summary (2-3 sentences), and 3 to 5 key bullet points.
${promptHint ? `Context hint: ${promptHint}` : ""}

Return strictly a JSON object conforming to this schema:
{
  "title": "Concise descriptive title of the speech/meeting/audio",
  "detectedLanguage": "Full language name e.g. Spanish, French, Japanese, Hindi, English",
  "detectedLanguageCode": "ISO code e.g. es, fr, ja, hi, en",
  "confidenceScore": 0.98,
  "targetLanguage": "${targetLanguage}",
  "summary": "Brief 2-3 sentence overview of the audio content",
  "keyTakeaways": ["Key point 1", "Key point 2", "Key point 3"],
  "fullOriginalTranscript": "Full original transcript as continuous paragraphs",
  "fullTranslatedTranscript": "Full translated transcript as continuous paragraphs",
  "segments": [
    {
      "id": "seg-1",
      "startTime": "00:00",
      "endTime": "00:05",
      "speaker": "Speaker 1",
      "originalText": "Spoken sentence in source language",
      "translatedText": "Translated sentence in ${targetLanguage}",
      "detectedLanguage": "Language of this segment"
    }
  ]
}`;

    const audioPart = {
      inlineData: {
        mimeType: cleanMime,
        data: audioBase64,
      },
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        audioPart,
        { text: prompt },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text || "{}";
    let parsed: TranscriptionResponse;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Clean up markdown code block wrappers if any
      const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    return res.json(parsed);
  } catch (err: any) {
    console.error("Transcribe error:", err);
    return res.status(500).json({
      error: err?.message || "Failed to transcribe and translate audio.",
    });
  }
}

export async function handleTranslateText(req: Request, res: Response) {
  try {
    const { text, targetLanguage = "English" } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing text to translate." });
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured.",
      });
    }

    const ai = getAI();
    const prompt = `You are a real-time speech translation engine.
Detect the source language of this spoken text and translate it accurately into "${targetLanguage}".
Text to translate:
"${text}"

Return strictly a JSON object:
{
  "detectedLanguage": "Full language name e.g. Spanish, German, Japanese",
  "detectedLanguageCode": "ISO code e.g. es, de, ja",
  "translatedText": "Accurate translated text in ${targetLanguage}"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);
  } catch (err: any) {
    console.error("Translate error:", err);
    return res.status(500).json({
      error: err?.message || "Failed to translate text.",
    });
  }
}

export async function handleTTS(req: Request, res: Response) {
  try {
    const { text, voice = "Kore" } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Missing text for speech synthesis." });
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
    }

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash-lite-tts",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: text.slice(0, 1500), // safety limit
              speechMetadata: {
                style: "Clear, natural, accessible narrator",
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: "No audio generated from model." });
    }

    return res.json({ audioBase64: base64Audio, mimeType: "audio/wav" });
  } catch (err: any) {
    console.error("TTS error:", err);
    return res.status(500).json({
      error: err?.message || "Failed to generate speech audio.",
    });
  }
}
