import { jsPDF } from "jspdf";
import type { TranscriptionResult, PDFExportOptions } from "../types";

export function exportTranscriptionToPDF(
  result: TranscriptionResult,
  options: PDFExportOptions
): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin - 10) {
      doc.addPage();
      y = margin;
      drawRunningHeader();
    }
  };

  const drawRunningHeader = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `VoxScribe AI Transcript  |  ${options.documentTitle || result.title}`,
      margin,
      10
    );
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, 12, pageWidth - margin, 12);
  };

  // 1. Cover / Top Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, y, contentWidth, 34, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  const titleText = doc.splitTextToSize(options.documentTitle || result.title, contentWidth - 14);
  doc.text(titleText, margin + 8, y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  const metaText = `Generated: ${new Date(result.createdAt).toLocaleDateString()}  ·  Detected: ${result.detectedLanguage} (${(result.confidenceScore * 100).toFixed(0)}% confidence)  ·  Target: ${result.targetLanguage}`;
  doc.text(metaText, margin + 8, y + 26);

  y += 42;

  // 2. Executive Summary
  if (options.includeSummary && result.summary) {
    checkPageBreak(30);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Executive Summary", margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105); // slate-600
    const summaryLines = doc.splitTextToSize(result.summary, contentWidth);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 4.8 + 6;
  }

  // 3. Key Takeaways
  if (options.includeKeyTakeaways && result.keyTakeaways && result.keyTakeaways.length > 0) {
    checkPageBreak(25);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Key Action Items & Takeaways", margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);

    for (const point of result.keyTakeaways) {
      checkPageBreak(10);
      doc.setFillColor(79, 70, 229); // indigo bullet
      doc.circle(margin + 2, y - 1, 1, "F");
      const bulletLines = doc.splitTextToSize(point, contentWidth - 8);
      doc.text(bulletLines, margin + 7, y);
      y += bulletLines.length * 4.5 + 2;
    }
    y += 6;
  }

  // Divider
  checkPageBreak(10);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // 4. Transcript Heading
  checkPageBreak(15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Full Speech Transcript & Translation", margin, y);
  y += 8;

  // Table header for bilingual
  if (options.layoutMode === "bilingual-table") {
    checkPageBreak(10);
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin, y, contentWidth, 7, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);

    const timeColW = 20;
    const speakerColW = 26;
    const remainingW = contentWidth - timeColW - speakerColW;
    const origColW = remainingW / 2;
    const transColW = remainingW / 2;

    doc.text("TIME", margin + 2, y + 4.8);
    doc.text("SPEAKER", margin + timeColW + 2, y + 4.8);
    doc.text(`ORIGINAL (${result.detectedLanguage.toUpperCase()})`, margin + timeColW + speakerColW + 2, y + 4.8);
    doc.text(`TRANSLATION (${result.targetLanguage.toUpperCase()})`, margin + timeColW + speakerColW + origColW + 2, y + 4.8);
    y += 9;

    // Rows
    for (let i = 0; i < result.segments.length; i++) {
      const seg = result.segments[i];
      const origLines = doc.splitTextToSize(seg.originalText, origColW - 4);
      const transLines = doc.splitTextToSize(seg.translatedText, transColW - 4);
      const rowHeight = Math.max(origLines.length, transLines.length) * 4.5 + 6;

      checkPageBreak(rowHeight);

      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 2, contentWidth, rowHeight, "F");
      }

      // Time
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(seg.startTime, margin + 2, y + 2.5);

      // Speaker
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const speakerLines = doc.splitTextToSize(seg.speaker, speakerColW - 4);
      doc.text(speakerLines, margin + timeColW + 2, y + 2.5);

      // Original
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(origLines, margin + timeColW + speakerColW + 2, y + 2.5);

      // Translated
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(transLines, margin + timeColW + speakerColW + origColW + 2, y + 2.5);

      y += rowHeight;
    }
  } else {
    // Block layout (translated-primary or original-primary or side-by-side blocks)
    for (const seg of result.segments) {
      const primaryText =
        options.layoutMode === "original-primary"
          ? seg.originalText
          : seg.translatedText;
      const secondaryText =
        options.layoutMode === "original-primary"
          ? seg.translatedText
          : seg.originalText;

      const primaryLabel =
        options.layoutMode === "original-primary"
          ? result.detectedLanguage
          : result.targetLanguage;
      const secondaryLabel =
        options.layoutMode === "original-primary"
          ? result.targetLanguage
          : result.detectedLanguage;

      const primLines = doc.splitTextToSize(primaryText, contentWidth - 4);
      const secLines =
        options.layoutMode !== "translated-primary"
          ? doc.splitTextToSize(secondaryText, contentWidth - 4)
          : [];

      const blockHeight =
        (primLines.length + secLines.length) * 4.5 + (secLines.length ? 14 : 9);
      checkPageBreak(blockHeight);

      // Timestamp & Speaker tag
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const headerStr = `${seg.startTime} - ${seg.endTime}  |  ${seg.speaker}`;
      doc.text(headerStr, margin, y);
      y += 4.5;

      // Primary text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(primLines, margin, y);
      y += primLines.length * 4.5 + 2;

      // Secondary text (if applicable)
      if (secLines.length > 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`[${secondaryLabel}] `, margin, y);
        doc.text(secLines, margin, y);
        y += secLines.length * 4.2 + 2;
      }

      y += 4;
    }
  }

  // 5. Add Running Page Numbers to All Pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Page ${p} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }

  // Trigger download
  const safeFilename = (options.documentTitle || result.title || "transcript")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_");
  doc.save(`${safeFilename}_voxscribe.pdf`);
}

export function exportToSRT(result: TranscriptionResult, mode: "translated" | "original" = "translated"): void {
  const pad = (num: number, size: number = 2) => num.toString().padStart(size, "0");

  const formatSRTTime = (timeStr: string, index: number): string => {
    // Expecting MM:SS or HH:MM:SS
    const parts = timeStr.split(":").map(Number);
    let h = 0, m = 0, s = 0;
    if (parts.length === 2) {
      m = parts[0] || 0;
      s = parts[1] || 0;
    } else if (parts.length === 3) {
      h = parts[0] || 0;
      m = parts[1] || 0;
      s = parts[2] || 0;
    }
    return `${pad(h)}:${pad(m)}:${pad(s)},000`;
  };

  let srtContent = "";
  result.segments.forEach((seg, idx) => {
    const start = formatSRTTime(seg.startTime, idx);
    const end = formatSRTTime(seg.endTime, idx);
    const text = mode === "translated" ? seg.translatedText : seg.originalText;
    srtContent += `${idx + 1}\n${start} --> ${end}\n${seg.speaker}: ${text}\n\n`;
  });

  const blob = new Blob([srtContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${result.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${mode}.srt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToTXT(result: TranscriptionResult): void {
  let content = `VOXSCRIBE AI TRANSCRIPTION & TRANSLATION REPORT\n`;
  content += `=================================================\n`;
  content += `Title: ${result.title}\n`;
  content += `Date: ${new Date(result.createdAt).toLocaleString()}\n`;
  content += `Detected Language: ${result.detectedLanguage} (${(result.confidenceScore * 100).toFixed(0)}% confidence)\n`;
  content += `Target Language: ${result.targetLanguage}\n\n`;

  if (result.summary) {
    content += `EXECUTIVE SUMMARY\n`;
    content += `-----------------\n`;
    content += `${result.summary}\n\n`;
  }

  if (result.keyTakeaways?.length) {
    content += `KEY ACTION ITEMS\n`;
    content += `----------------\n`;
    result.keyTakeaways.forEach((k, i) => {
      content += `${i + 1}. ${k}\n`;
    });
    content += `\n`;
  }

  content += `FULL TIMESTAMPED TRANSCRIPT\n`;
  content += `---------------------------\n`;
  result.segments.forEach((seg) => {
    content += `[${seg.startTime} - ${seg.endTime}] ${seg.speaker}\n`;
    content += `Original:   ${seg.originalText}\n`;
    content += `Translated: ${seg.translatedText}\n\n`;
  });

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${result.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToJSON(result: TranscriptionResult): void {
  const jsonStr = JSON.stringify(result, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${result.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
