import React, { useState, useEffect } from "react";
import type { AppSettings, AudioSample, TranscriptionResult } from "./types";
import { TopNav } from "./components/TopNav";
import { AudioUploader } from "./components/AudioUploader";
import { TranscriptViewer } from "./components/TranscriptViewer";
import { SummarySection } from "./components/SummarySection";
import { LiveCaptionModal } from "./components/LiveCaptionModal";
import { SettingsModal } from "./components/SettingsModal";
import { ExportModal } from "./components/ExportModal";
import { HowToUseModal } from "./components/HowToUseModal";
import { SAMPLE_AUDIO_RECORDINGS } from "./data/samples";
import { createDemoAudioBlob } from "./services/sampleAudioGenerator";
import { exportTranscriptionToPDF } from "./services/pdfExportService";
import {
  Mic,
  FileAudio,
  Sparkles,
  Languages,
  CheckCircle2,
  FileText,
  Sliders,
  ArrowRight,
  HelpCircle,
} from "lucide-react";

export default function App() {
  const [settings, setSettings] = useState<AppSettings>({
    targetLanguage: "English",
    targetLanguageCode: "en",
    captionFontSize: "standard",
    captionMode: "bilingual",
    captionContrast: "dark-elevated",
    dyslexicFont: false,
    autoScroll: true,
    audioVisualizerEnabled: true,
    ttsVoice: "Kore",
  });

  const [currentResult, setCurrentResult] = useState<TranscriptionResult | null>(null);
  const [activeTab, setActiveTab] = useState<"transcribe" | "editor" | "samples">("transcribe");
  const [isLiveCaptionOpen, setIsLiveCaptionOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Initialize with a rich Spanish Solar Keynote sample so user has rich immediate interactive state
  useEffect(() => {
    const defaultSample = SAMPLE_AUDIO_RECORDINGS[0];
    loadSampleDirectly(defaultSample, false);
  }, []);

  const loadSampleDirectly = async (sample: AudioSample, switchTab = true) => {
    try {
      const audioBlob = await createDemoAudioBlob(32);
      const audioUrl = URL.createObjectURL(audioBlob);

      const result: TranscriptionResult = {
        id: `sample-${sample.id}`,
        title: sample.name,
        detectedLanguage: sample.language,
        detectedLanguageCode: sample.languageCode,
        confidenceScore: 0.98,
        targetLanguage: settings.targetLanguage,
        summary: sample.summary,
        keyTakeaways: sample.keyTakeaways,
        fullOriginalTranscript: sample.dialogue.map((d) => d.originalText).join(" "),
        fullTranslatedTranscript: sample.dialogue.map((d) => d.translatedText).join(" "),
        segments: sample.dialogue.map((d, idx) => ({
          id: `seg-${sample.id}-${idx}`,
          startTime: d.startTime,
          endTime: d.endTime,
          speaker: d.speaker,
          originalText: d.originalText,
          translatedText: d.translatedText,
          detectedLanguage: sample.language,
        })),
        audioBlobUrl: audioUrl,
        audioDurationSeconds: 32,
        fileName: `${sample.id}.wav`,
        createdAt: new Date().toISOString(),
      };

      setCurrentResult(result);
      if (switchTab) {
        setActiveTab("editor");
      }
    } catch (e) {
      console.warn("Could not pre-load sample:", e);
    }
  };

  const handleTranscriptionSuccess = (result: TranscriptionResult) => {
    setCurrentResult(result);
    setActiveTab("editor");
  };

  const handleSaveAndExportPDF = (result: TranscriptionResult) => {
    setCurrentResult(result);
    exportTranscriptionToPDF(result, {
      documentTitle: result.title,
      layoutMode: "bilingual-table",
      includeSummary: true,
      includeKeyTakeaways: true,
      includeTimestamps: true,
      includeSpeakers: true,
      fontSize: "standard",
    });
  };

  const handleSaveToWorkspace = (result: TranscriptionResult) => {
    setCurrentResult(result);
    setActiveTab("editor");
  };

  return (
    <div
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans ${
        settings.dyslexicFont ? "tracking-wide font-mono" : ""
      }`}
    >
      {/* Top Bar Navigation */}
      <TopNav
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onStartLiveCaption={() => setIsLiveCaptionOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        hasTranscript={Boolean(currentResult)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Workspace Mode Content */}
        {activeTab === "transcribe" && (
          <div className="space-y-8">
            {/* Hero Banner with Clear Purpose */}
            <div className="text-center max-w-3xl mx-auto space-y-3 pt-4">
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-indigo-400">
                <Sparkles className="w-4 h-4" />
                <span>Multilingual Speech Intelligence & Accessibility</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
                AI Audio Transcription & Instant Speech Translation
              </h1>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
                Automatic language detection for any spoken audio. High-precision translation into{" "}
                <span className="text-indigo-400 font-semibold">{settings.targetLanguage}</span>,
                real-time live captioning, and structured export to publication-ready PDF.
              </p>
            </div>

            {/* 3-Step Quick Start Walkthrough Strip */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 max-w-4xl mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                  <span>How to use VoxScribe AI in 3 simple steps</span>
                </span>
                <button
                  onClick={() => setIsGuideOpen(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold hover:underline"
                >
                  View full guide →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-indigo-400 font-bold mb-1 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600/30 flex items-center justify-center text-[11px]">1</span>
                    <span>Upload or Record</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Drop your audio file (MP3, WAV, M4A, etc.), record from mic, or click a 1-click test sample below.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-indigo-400 font-bold mb-1 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600/30 flex items-center justify-center text-[11px]">2</span>
                    <span>Click Transcribe</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    The AI automatically detects any spoken language and translates it into <strong>{settings.targetLanguage}</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-indigo-400 font-bold mb-1 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600/30 flex items-center justify-center text-[11px]">3</span>
                    <span>Review & Export PDF</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Listen back with audio sync, edit text, and download your publication-ready PDF or SRT subtitles.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Live Mode Callout */}
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-4xl mx-auto">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Need Real-Time Live Speech Captioning?
                  </h2>
                  <p className="text-xs text-indigo-200">
                    Use your microphone to generate continuous live bilingual teleprompter captions with 1-click PDF download.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsLiveCaptionOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors whitespace-nowrap self-start sm:self-auto flex items-center gap-1.5"
              >
                <span>Launch Live Captions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Uploader & Sample Selector */}
            <AudioUploader
              settings={settings}
              onTranscriptionSuccess={handleTranscriptionSuccess}
              onSelectSample={(sample) => loadSampleDirectly(sample, true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          </div>
        )}

        {activeTab === "editor" && currentResult && (
          <div className="space-y-8">
            {/* Summary & Language Confidence Card */}
            <SummarySection
              result={currentResult}
              onOpenExport={() => setIsExportOpen(true)}
            />

            {/* Synchronized Transcript Player & Viewer */}
            <div className="pt-2">
              <TranscriptViewer
                result={currentResult}
                settings={settings}
                onUpdateResult={(updated) => setCurrentResult(updated)}
                onOpenExport={() => setIsExportOpen(true)}
              />
            </div>
          </div>
        )}

        {activeTab === "samples" && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div>
              <h2 className="text-xl font-bold text-white">
                Multi-Language Test Audio Gallery
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Select any recorded dialogue to verify automatic language detection, translation to {settings.targetLanguage}, and accessible PDF report generation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SAMPLE_AUDIO_RECORDINGS.map((sample) => (
                <div
                  key={sample.id}
                  className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                      <span className="font-sans font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-900">
                        {sample.language} ({sample.languageCode.toUpperCase()})
                      </span>
                      <span className="tabular-nums">{sample.durationFormatted}</span>
                    </div>

                    <h3 className="text-base font-bold text-white">
                      {sample.name}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {sample.description}
                    </p>
                  </div>

                  {/* Sample Dialogue Preview */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1.5">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                      Dialogue Preview
                    </span>
                    <p className="text-slate-300 italic">
                      "{sample.dialogue[0].originalText}"
                    </p>
                    <p className="text-indigo-300 font-medium">
                      → "{sample.dialogue[0].translatedText}"
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {sample.dialogue.length} speech segments
                    </span>
                    <button
                      onClick={() => loadSampleDirectly(sample, true)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow"
                    >
                      <span>Load into Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-900/40 py-6 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">VoxScribe AI</span>
            <span>·</span>
            <span>Multilingual Speech-to-Text & Real-Time Captioning</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>WCAG AA Accessible</span>
            <span>·</span>
            <span>Automatic Language Detection</span>
            <span>·</span>
            <span>Target: {settings.targetLanguage}</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <LiveCaptionModal
        isOpen={isLiveCaptionOpen}
        onClose={() => setIsLiveCaptionOpen(false)}
        settings={settings}
        onSaveAndExportPDF={handleSaveAndExportPDF}
        onSaveToWorkspace={handleSaveToWorkspace}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => setSettings(newSettings)}
      />

      {currentResult && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          result={currentResult}
        />
      )}

      <HowToUseModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onTrySample={() => {
          const sample = SAMPLE_AUDIO_RECORDINGS[0];
          loadSampleDirectly(sample, true);
        }}
        onStartLive={() => setIsLiveCaptionOpen(true)}
      />
    </div>
  );
}
