import jsPDF from 'jspdf';

export type ReportMode = 'manipulation' | 'source-verification';

const LIME: [number, number, number] = [231, 255, 71];
const BLACK: [number, number, number] = [24, 24, 24];
const GRAY: [number, number, number] = [110, 110, 110];
const RULE: [number, number, number] = [222, 222, 222];
const MARGIN = 48;
const PAGE_W = 595.28;
const PAGE_H = 841.89;

function val(v: any, fallback = '—'): string {
  if (v === null || v === undefined || v === '') return fallback;
  return String(v);
}

function riskFromTrust(trust: number) {
  return trust >= 85 ? 'Low' : trust >= 55 ? 'Medium' : trust >= 25 ? 'High' : 'Critical';
}

function prettyPattern(s = ''): string {
  const t = s.replace(/_/g, ' ').toLowerCase().trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const seg = u.pathname.split('/').filter(Boolean)[0];
    return seg ? `${host}/${seg}` : host;
  } catch {
    return url;
  }
}

// A title that's just the bare host/platform name (e.g. "Medium" for medium.com) carries no
// more information than the URL itself, so it's treated the same as a missing title.
function isBarePlatformName(title: string, url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const label = host.split('.')[0];
    const t = title.trim().toLowerCase();
    return t === host.toLowerCase() || t === label.toLowerCase();
  } catch {
    return false;
  }
}

export function sourceLabel(s: any): string {
  const title = s?.title ? String(s.title).trim() : '';
  const url: string = s?.url || '';
  if (title && !(url && isBarePlatformName(title, url))) return title;
  return url ? shortenUrl(url) : title;
}

function truncateToWidth(doc: jsPDF, text: string, maxWidth: number, size: number): string {
  doc.setFontSize(size);
  if (doc.getTextWidth(text) <= maxWidth) return text;
  const ellipsis = '…';
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (doc.getTextWidth(text.slice(0, mid) + ellipsis) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return lo > 0 ? text.slice(0, lo) + ellipsis : ellipsis;
}

// Renders `${title||shortUrl} — strength, stance` with the title/url segment as a clickable
// lime, underlined link (truncated with an ellipsis rather than wrapped) and the rest as
// plain text on the same line, so the raw URL is never shown but is always the link target.
function sourceLine(
  doc: jsPDF,
  s: any,
  y: number,
  opts: { size?: number; indent?: number; color?: [number, number, number] } = {}
): number {
  const size = opts.size ?? 10.5;
  const indent = opts.indent ?? 0;
  const color = opts.color ?? BLACK;
  const maxWidth = PAGE_W - MARGIN * 2 - indent;
  const x = MARGIN + indent;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  y = ensureSpace(doc, y, size * 1.35);

  const url: string = s?.url || '';
  const suffix = ` — ${val(s?.strength)}${s?.stance ? `, ${s.stance}` : ''}`;
  const linkLabel = sourceLabel(s);

  if (linkLabel && url) {
    const suffixWidth = doc.getTextWidth(suffix);
    const availableForLink = Math.max(maxWidth - suffixWidth, 40);
    const display = truncateToWidth(doc, linkLabel, availableForLink, size);
    doc.setTextColor(...LIME);
    doc.textWithLink(display, x, y, { url });
    const linkWidth = doc.getTextWidth(display);
    doc.setDrawColor(...LIME);
    doc.setLineWidth(0.6);
    doc.line(x, y + 2, x + linkWidth, y + 2);
    doc.setTextColor(...color);
    doc.text(suffix, x + linkWidth, y);
  } else {
    doc.setTextColor(...color);
    doc.text(truncateToWidth(doc, (linkLabel || val(undefined)) + suffix, maxWidth, size), x, y);
  }
  return y + size * 1.35;
}

function newDoc(): jsPDF {
  return new jsPDF({ unit: 'pt', format: 'a4' });
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function drawHeader(doc: jsPDF, opts: { reportType: string; videoTitle: string | null; videoUrl: string }): number {
  let y = MARGIN;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...LIME);
  doc.text('VERALYZE', MARGIN, y);
  y += 10;
  doc.setDrawColor(...LIME);
  doc.setLineWidth(1.5);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 24;
  doc.setTextColor(...BLACK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(opts.reportType, MARGIN, y);
  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  y = ensureSpace(doc, y, 16);
  const maxWidth = PAGE_W - MARGIN * 2;
  const hasUrl = !!opts.videoUrl;
  const label = opts.videoTitle || (hasUrl ? shortenUrl(opts.videoUrl) : 'Untitled video');
  if (hasUrl) {
    const display = truncateToWidth(doc, label, maxWidth, 11);
    doc.setTextColor(...LIME);
    doc.textWithLink(display, MARGIN, y, { url: opts.videoUrl });
    const w = doc.getTextWidth(display);
    doc.setDrawColor(...LIME);
    doc.setLineWidth(0.75);
    doc.line(MARGIN, y + 2, MARGIN + w, y + 2);
  } else {
    doc.setTextColor(...GRAY);
    doc.text(truncateToWidth(doc, label, maxWidth, 11), MARGIN, y);
  }
  y += 16;
  doc.setTextColor(...GRAY);
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), MARGIN, y);
  y += 16;
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.75);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 22;
  doc.setTextColor(...BLACK);
  return y;
}

function sectionHeading(doc: jsPDF, text: string, y: number): number {
  y = ensureSpace(doc, y, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...BLACK);
  doc.text(text, MARGIN, y);
  y += 6;
  doc.setDrawColor(...LIME);
  doc.setLineWidth(1.4);
  doc.line(MARGIN, y, MARGIN + 60, y);
  y += 16;
  return y;
}

function bodyText(
  doc: jsPDF,
  text: string,
  y: number,
  opts: { bold?: boolean; size?: number; indent?: number; color?: [number, number, number] } = {}
): number {
  const size = opts.size ?? 10.5;
  const indent = opts.indent ?? 0;
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...(opts.color ?? BLACK));
  const maxWidth = PAGE_W - MARGIN * 2 - indent;
  const lines = doc.splitTextToSize(val(text), maxWidth);
  const lineHeight = size * 1.35;
  y = ensureSpace(doc, y, lines.length * lineHeight);
  doc.text(lines, MARGIN + indent, y);
  return y + lines.length * lineHeight;
}

function bulletList(doc: jsPDF, items: string[] | undefined, y: number): number {
  if (!items || !items.length) return bodyText(doc, '—', y, { indent: 12 });
  for (const item of items) {
    y = bodyText(doc, `•  ${item}`, y + 3, { indent: 12 });
  }
  return y;
}

function headlineNumber(doc: jsPDF, text: string, y: number): number {
  y = ensureSpace(doc, y, 46);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(...BLACK);
  doc.text(text, MARGIN, y + 30);
  return y + 46;
}

function buildManipulationFull(data: any): jsPDF {
  const doc = newDoc();
  let y = drawHeader(doc, {
    reportType: 'Manipulation Analysis',
    videoTitle: data?.video_title || null,
    videoUrl: data?.video_url || '',
  });

  if (data?.ok === false) {
    y = sectionHeading(doc, 'Analysis unavailable', y);
    bodyText(doc, val(data?.error_message, 'The analysis could not be completed.'), y);
    return doc;
  }

  const trust = data?.stats?.trust_score;
  const hasTrust = typeof trust === 'number';
  const risk = hasTrust ? riskFromTrust(trust) : '—';

  y = sectionHeading(doc, 'Overview', y);
  y = bodyText(doc, `Trust score: ${hasTrust ? `${trust}/100` : '—'}`, y, { bold: true });
  y = bodyText(doc, `Verdict: ${val(data?.verdict)}`, y + 2);
  y = bodyText(doc, `Category: ${val(data?.category)}`, y + 2);
  y = bodyText(doc, `Risk level: ${risk}`, y + 2);
  y = bodyText(doc, `Flags raised: ${val(data?.stats?.flags_raised)}`, y + 2);
  y += 8;

  const sections: [string, string[] | undefined][] = [
    ['What it says', data?.sections?.what_it_says],
    ['Why it exists', data?.sections?.why_it_exists],
    ['What is missing', data?.sections?.what_is_missing],
    ['What you should do', data?.sections?.what_you_should_do],
  ];
  for (const [heading, bullets] of sections) {
    y = sectionHeading(doc, heading, y);
    y = bulletList(doc, bullets, y);
    y += 10;
  }

  y = sectionHeading(doc, 'Manipulation techniques detected', y);
  const patterns = data?.sections?.manipulation_patterns || [];
  if (!patterns.length) {
    y = bodyText(doc, 'No manipulation patterns detected', y);
  } else {
    for (const p of patterns) {
      y = bodyText(doc, prettyPattern(p?.name) || '—', y, { bold: true });
      y = bodyText(doc, `Type: ${val(p?.type)}   Severity: ${val(p?.severity)}`, y + 2, { size: 9.5, color: GRAY });
      y = bodyText(doc, val(p?.description), y + 2, { indent: 10 });
      y += 8;
    }
  }
  y += 4;

  y = sectionHeading(doc, 'Source verification snapshot', y);
  const sc = data?.source_check;
  if (!sc || !sc.claim || sc.verdict === 'NO_VERIFIABLE_CLAIM') {
    bodyText(doc, 'No verifiable claim found for source-check', y);
  } else {
    y = bodyText(doc, val(sc.claim), y, { bold: true });
    y = bodyText(doc, `Verdict: ${val(sc.verdict)}${sc.confidence ? ` (${sc.confidence} confidence)` : ''}`, y + 2);
    if (sc.note) y = bodyText(doc, sc.note, y + 2, { color: GRAY });
    y += 6;
    const sources = sc.sources || [];
    if (!sources.length) {
      bodyText(doc, 'No independent sources addressed this claim.', y);
    } else {
      for (const s of sources) {
        y = sourceLine(doc, s, y + 2, { indent: 10 });
      }
    }
  }

  return doc;
}

function buildVerificationFull(data: any): jsPDF {
  const doc = newDoc();
  let y = drawHeader(doc, {
    reportType: 'Source Verification',
    videoTitle: data?.video_title || null,
    videoUrl: data?.video_url || '',
  });

  if (data?.ok === false) {
    y = sectionHeading(doc, 'Analysis unavailable', y);
    bodyText(doc, val(data?.error_message, 'The analysis could not be completed.'), y);
    return doc;
  }

  const statusLabels: Record<string, string> = {
    VERIFIED: 'Verified',
    MIXED: 'Mixed',
    DISPUTED: 'Disputed',
    UNVERIFIED: 'Unverified',
    UNVERIFIABLE: 'Not checkable',
    NO_CLAIMS: 'No claims found',
  };
  const verdictLabels: Record<string, string> = {
    SUPPORTED: 'Supported',
    CONTRADICTED: 'Contradicted',
    MIXED: 'Mixed',
    UNVERIFIED: 'Unverified',
    UNVERIFIABLE: "Can't be verified",
  };

  const score = data?.summary?.credibility_score;
  const hasScore = typeof score === 'number';

  y = sectionHeading(doc, 'Overview', y);
  y = bodyText(doc, `Credibility score: ${hasScore ? `${score}/100` : '—'}`, y, { bold: true });
  y = bodyText(doc, `Status: ${statusLabels[data?.summary?.status] || 'Unverified'}`, y + 2);
  if (data?.summary?.note) y = bodyText(doc, data.summary.note, y + 2, { color: GRAY });
  y += 6;
  y = bodyText(
    doc,
    `Supported: ${data?.summary?.supported ?? 0}   Mixed: ${data?.summary?.mixed ?? 0}   Contradicted: ${
      data?.summary?.contradicted ?? 0
    }   Unverified: ${data?.summary?.unverified ?? 0}`,
    y + 2,
    { size: 9.5 }
  );
  y += 10;

  y = sectionHeading(doc, 'Claims', y);
  const claims = data?.claims || [];
  if (!claims.length) {
    bodyText(doc, 'No claims found.', y);
  } else {
    for (const c of claims) {
      y = bodyText(doc, val(c?.claim), y, { bold: true });
      y = bodyText(
        doc,
        `Verdict: ${verdictLabels[c?.verdict] || 'Unverified'}${c?.confidence ? ` (${c.confidence} confidence)` : ''}`,
        y + 2,
        { size: 9.5, color: GRAY }
      );
      if (c?.rationale) y = bodyText(doc, c.rationale, y + 2, { indent: 10 });
      const sources = c?.sources || [];
      for (const s of sources) {
        y = sourceLine(doc, s, y + 2, { indent: 20, size: 9.5, color: GRAY });
      }
      y += 8;
    }
  }

  return doc;
}

function buildManipulationSummary(data: any): jsPDF {
  const doc = newDoc();
  let y = drawHeader(doc, {
    reportType: 'Manipulation Analysis — Summary',
    videoTitle: data?.video_title || null,
    videoUrl: data?.video_url || '',
  });

  const trust = data?.stats?.trust_score;
  const hasTrust = typeof trust === 'number';
  const risk = hasTrust ? riskFromTrust(trust) : '—';

  y = sectionHeading(doc, 'Trust Score', y);
  y = headlineNumber(doc, hasTrust ? `${trust}/100` : '—', y);
  y = bodyText(doc, `Verdict: ${val(data?.verdict)}   Risk level: ${risk}`, y);
  y += 10;

  y = sectionHeading(doc, 'Takeaway', y);
  const takeaway = (data?.sections?.what_you_should_do && data.sections.what_you_should_do[0]) || undefined;
  y = bodyText(doc, val(takeaway), y);
  y += 10;

  y = sectionHeading(doc, 'Key counts', y);
  bodyText(doc, `Claims extracted: ${val(data?.stats?.claims_found)}   Flags raised: ${val(data?.stats?.flags_raised)}`, y);

  return doc;
}

function buildVerificationSummary(data: any): jsPDF {
  const doc = newDoc();
  let y = drawHeader(doc, {
    reportType: 'Source Verification — Summary',
    videoTitle: data?.video_title || null,
    videoUrl: data?.video_url || '',
  });

  const statusLabels: Record<string, string> = {
    VERIFIED: 'Verified',
    MIXED: 'Mixed',
    DISPUTED: 'Disputed',
    UNVERIFIED: 'Unverified',
    UNVERIFIABLE: 'Not checkable',
    NO_CLAIMS: 'No claims found',
  };
  const score = data?.summary?.credibility_score;
  const hasScore = typeof score === 'number';

  y = sectionHeading(doc, 'Credibility Score', y);
  y = headlineNumber(doc, hasScore ? `${score}/100` : '—', y);
  y = bodyText(doc, `Status: ${statusLabels[data?.summary?.status] || 'Unverified'}`, y);
  y += 10;

  y = sectionHeading(doc, 'Takeaway', y);
  y = bodyText(doc, val(data?.summary?.note), y);
  y += 10;

  y = sectionHeading(doc, 'Key counts', y);
  bodyText(
    doc,
    `Supported: ${data?.summary?.supported ?? 0}   Contradicted: ${data?.summary?.contradicted ?? 0}   Mixed: ${
      data?.summary?.mixed ?? 0
    }   Unverified: ${data?.summary?.unverified ?? 0}`,
    y
  );

  return doc;
}

export function exportFullReportPdf(data: any, mode: ReportMode) {
  const doc = mode === 'manipulation' ? buildManipulationFull(data) : buildVerificationFull(data);
  const videoId = data?.video_id || 'video';
  doc.save(`veralyze-${mode}-${videoId}.pdf`);
}

export function exportSummaryPdf(data: any, mode: ReportMode) {
  const doc = mode === 'manipulation' ? buildManipulationSummary(data) : buildVerificationSummary(data);
  const videoId = data?.video_id || 'video';
  doc.save(`veralyze-${mode}-summary-${videoId}.pdf`);
}
