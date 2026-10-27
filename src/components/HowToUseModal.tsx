import React from "react";
import {
  X,
  Upload,
  Sparkles,
  FileText,
  Mic,
  Languages,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
} from "lucide-react";

interface HowToUseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrySample: () => void;
  onStartLive: () => void;
}

export const HowToUseModal: React.FC<HowToUseModalProps> = ({
  isOpen,
  onClose,
  onTrySample,
  onStartLive,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-to-use-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 text-indigo-400" />
            <h2 id="how-to-use-title" className="text-base font-bold text-white tracking-tight">
              How to Use VoxScribe AI
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close guide"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          <p className="text-slate-300">
            VoxScribe AI transcribes audio files and live speech in any language, automatically detects the source language, and translates it into your chosen target language with instant PDF export.
          </p>

          {/* 3 Step Workflow */}
          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 font-bold flex items-center justify-center shrink-0">
                1
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-white text-sm">
                  Add Your Audio (Upload, Record, or 1-Click Sample)
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  • <strong>Upload:</strong> Click <em>Browse Files</em> or drag & drop any file (MP3, WAV, M4A, WEBM, FLAC). Large files are automatically optimized in your browser.<br />
                  • <strong>Record:</strong> Click <em>Record from Mic</em> to speak directly.<br />
                  • <strong>Test Samples:</strong> Click any of the 5 multi-language samples (Spanish, French, Japanese, German, Hindi) to test instantly with 1-click.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 font-bold flex items-center justify-center shrink-0">
                2
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-white text-sm">
                  Click "Transcribe & Translate"
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Gemini AI automatically detects the spoken language, transcribes verbatim with speaker attributions, creates chronological timestamps, and translates into your target language (configurable in <strong>Settings</strong>).
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 font-bold flex items-center justify-center shrink-0">
                3
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-white text-sm">
                  Review & Export to PDF
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  • Listen to synchronized audio playback and jump to any timestamp.<br />
                  • Click the edit icon to adjust text if needed.<br />
                  • Click <strong>Export PDF</strong> to download an accessible publication-ready report, or export as Subtitles (.SRT), Text (.TXT), or JSON.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800/80">
            <div className="text-xs text-slate-400">
              Want to see it work immediately?
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  onClose();
                  onTrySample();
                }}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Load Test Sample</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  onClose();
                  onStartLive();
                }}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Try Live Captions</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
