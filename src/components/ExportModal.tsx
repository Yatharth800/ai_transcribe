import React, { useState } from "react";
import {
  X,
  FileText,
  Download,
  Check,
  Copy,
  Printer,
  Sliders,
  Sparkles,
} from "lucide-react";
import type { TranscriptionResult, PDFExportOptions } from "../types";
import {
  exportTranscriptionToPDF,
  exportToSRT,
  exportToTXT,
  exportToJSON,
} from "../services/pdfExportService";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: TranscriptionResult;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  result,
}) => {
  const [docTitle, setDocTitle] = useState(result.title || "Audio Transcription");
  const [layoutMode, setLayoutMode] = useState<PDFExportOptions["layoutMode"]>("bilingual-table");
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeKeyTakeaways, setIncludeKeyTakeaways] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [includeSpeakers, setIncludeSpeakers] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleDownloadPDF = () => {
    setIsExporting(true);
    try {
      exportTranscriptionToPDF(result, {
        documentTitle: docTitle,
        layoutMode,
        includeSummary,
        includeKeyTakeaways,
        includeTimestamps,
        includeSpeakers,
        fontSize: "standard",
      });
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 500);
    } catch (err) {
      console.error("PDF export failed:", err);
      setIsExporting(false);
    }
  };

  const handleCopyClipboard = () => {
    const text = `VOXSCRIBE AI REPORT: ${docTitle}\n` +
      `Detected Language: ${result.detectedLanguage}\n` +
      `Target Language: ${result.targetLanguage}\n\n` +
      `SUMMARY:\n${result.summary}\n\n` +
      result.segments
        .map((s) => `[${s.startTime}] ${s.speaker}: ${s.translatedText}`)
        .join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h2 id="export-dialog-title" className="text-base font-bold text-white tracking-tight">
              Export Transcript to PDF & Formats
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close export dialog"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Document Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Document Title
            </label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* PDF Layout Mode */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              PDF Layout & Presentation
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setLayoutMode("bilingual-table")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  layoutMode === "bilingual-table"
                    ? "bg-indigo-950/60 border-indigo-500 text-white ring-1 ring-indigo-500/30"
                    : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="font-semibold block text-slate-200">
                  Bilingual Table
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Original speech and target translation side-by-side in grid.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setLayoutMode("translated-primary")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  layoutMode === "translated-primary"
                    ? "bg-indigo-950/60 border-indigo-500 text-white ring-1 ring-indigo-500/30"
                    : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="font-semibold block text-slate-200">
                  Translation Primary
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Target translated text formatted as executive reading blocks.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setLayoutMode("side-by-side")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  layoutMode === "side-by-side"
                    ? "bg-indigo-950/60 border-indigo-500 text-white ring-1 ring-indigo-500/30"
                    : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="font-semibold block text-slate-200">
                  Dual Blocks
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Primary and secondary text stacked per speaker utterance.
                </span>
              </button>
            </div>
          </div>

          {/* Include Options */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Sections to Include
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSummary}
                  onChange={(e) => setIncludeSummary(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-500"
                />
                <span className="text-slate-300 font-medium">Executive Summary</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeKeyTakeaways}
                  onChange={(e) => setIncludeKeyTakeaways(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-500"
                />
                <span className="text-slate-300 font-medium">Key Action Points</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTimestamps}
                  onChange={(e) => setIncludeTimestamps(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-500"
                />
                <span className="text-slate-300 font-medium">Timestamps (00:00)</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSpeakers}
                  onChange={(e) => setIncludeSpeakers(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-500"
                />
                <span className="text-slate-300 font-medium">Speaker Attribution</span>
              </label>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2">
            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Generating Accessible PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Publication-Ready PDF</span>
                </>
              )}
            </button>
          </div>

          {/* Other Export Formats */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <span className="block text-xs font-semibold text-slate-400">
              Other Export Formats
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => exportToSRT(result, "translated")}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors text-center"
              >
                Subtitles (.SRT)
              </button>

              <button
                type="button"
                onClick={() => exportToTXT(result)}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors text-center"
              >
                Plain Text (.TXT)
              </button>

              <button
                type="button"
                onClick={() => exportToJSON(result)}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors text-center"
              >
                Data (.JSON)
              </button>

              <button
                type="button"
                onClick={handleCopyClipboard}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors text-center flex items-center justify-center gap-1"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
