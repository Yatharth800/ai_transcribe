export interface TranscriptSegment {
  id: string;
  startTime: string;
  endTime: string;
  speaker: string;
  originalText: string;
  translatedText: string;
  detectedLanguage?: string;
  isEdited?: boolean;
}

export interface TranscriptionResult {
  id: string;
  title: string;
  detectedLanguage: string;
  detectedLanguageCode: string;
  confidenceScore: number;
  targetLanguage: string;
  summary: string;
  keyTakeaways: string[];
  fullOriginalTranscript: string;
  fullTranslatedTranscript: string;
  segments: TranscriptSegment[];
  audioDurationSeconds?: number;
  audioBlobUrl?: string;
  fileName?: string;
  createdAt: string;
}

export type CaptionFontSize = "standard" | "large" | "extra-large" | "jumbo";
export type CaptionMode = "bilingual" | "translated-only" | "original-only";
export type CaptionContrast = "dark-elevated" | "high-contrast-black" | "clean-light";

export interface AppSettings {
  targetLanguage: string;
  targetLanguageCode: string;
  captionFontSize: CaptionFontSize;
  captionMode: CaptionMode;
  captionContrast: CaptionContrast;
  dyslexicFont: boolean;
  autoScroll: boolean;
  audioVisualizerEnabled: boolean;
  ttsVoice: "Kore" | "Puck" | "Fenrir" | "Charon" | "Zephyr";
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

export interface AudioSample {
  id: string;
  name: string;
  language: string;
  languageCode: string;
  accent: string;
  durationFormatted: string;
  description: string;
  dialogue: {
    startTime: string;
    endTime: string;
    speaker: string;
    originalText: string;
    translatedText: string;
  }[];
  summary: string;
  keyTakeaways: string[];
}

export interface PDFExportOptions {
  documentTitle: string;
  layoutMode: "bilingual-table" | "side-by-side" | "translated-primary" | "original-primary";
  includeSummary: boolean;
  includeKeyTakeaways: boolean;
  includeTimestamps: boolean;
  includeSpeakers: boolean;
  fontSize: "compact" | "standard" | "large";
}
