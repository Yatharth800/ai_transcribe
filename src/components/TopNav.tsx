import React from "react";
import { Mic, Settings, FileText, Globe, HelpCircle } from "lucide-react";
import type { AppSettings } from "../types";

interface TopNavProps {
  settings: AppSettings;
  onOpenSettings: () => void;
  onStartLiveCaption: () => void;
  onOpenExport: () => void;
  onOpenGuide: () => void;
  hasTranscript: boolean;
  activeTab: "transcribe" | "editor" | "samples";
  setActiveTab: (tab: "transcribe" | "editor" | "samples") => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  settings,
  onOpenSettings,
  onStartLiveCaption,
  onOpenExport,
  onOpenGuide,
  hasTranscript,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100">
      {/* Zone 1: Single text wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="/"
          className="text-lg font-bold tracking-tight text-white hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2.5"
        >
          <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
            V
          </span>
          <span>VoxScribe AI</span>
        </a>
      </div>

      {/* Zone 2: Concise single-line navigation tabs */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
        <button
          onClick={() => setActiveTab("transcribe")}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
            activeTab === "transcribe"
              ? "text-white font-semibold"
              : "hover:text-white text-slate-400"
          }`}
        >
          Audio Upload
          {activeTab === "transcribe" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("editor")}
          disabled={!hasTranscript}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
            !hasTranscript
              ? "text-slate-600 cursor-not-allowed"
              : activeTab === "editor"
              ? "text-white font-semibold"
              : "hover:text-white text-slate-400"
          }`}
        >
          Transcript & Translation
          {activeTab === "editor" && hasTranscript && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("samples")}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
            activeTab === "samples"
              ? "text-white font-semibold"
              : "hover:text-white text-slate-400"
          }`}
        >
          Sample Audios
          {activeTab === "samples" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
          )}
        </button>

        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 hover:text-white text-slate-400 transition-colors whitespace-nowrap shrink-0 py-1"
        >
          <Globe className="w-4 h-4 text-indigo-400" />
          <span>Target: {settings.targetLanguage}</span>
        </button>
      </nav>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onOpenGuide}
          title="How to Use Guide"
          aria-label="How to use guide"
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 flex items-center gap-1.5 text-xs font-semibold"
        >
          <HelpCircle className="w-4 h-4 text-indigo-400" />
          <span className="hidden lg:inline">How to Use</span>
        </button>

        <button
          onClick={onOpenSettings}
          title="Transcription & Accessibility Settings"
          aria-label="Settings"
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
        >
          <Settings className="w-4 h-4" />
        </button>

        {hasTranscript && (
          <button
            onClick={onOpenExport}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export PDF</span>
          </button>
        )}

        <button
          onClick={onStartLiveCaption}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Real-Time Captions</span>
        </button>
      </div>
    </header>
  );
};
