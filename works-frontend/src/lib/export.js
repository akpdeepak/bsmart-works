// KR-083 — GFM Markdown export for block-based articles (client-side, no migration).
// blocksToMarkdown(blocks) converts a block array to a GFM string; downloadMarkdown triggers the
// browser download. Pure functions with no network calls — used by knowledge-view.jsx.

/**
 * Convert a block array to a GFM Markdown string.
 * @param {Array} blocks
 * @returns {string}
 */
export function blocksToMarkdown(blocks) {
  if (!Array.isArray(blocks)) return '';
  return blocks.map(block => blockToMd(block)).join('');
}

function blockToMd(block) {
  const c = block.content || '';
  switch (block.type) {
    case 'heading1': return `# ${c}\n\n`;
    case 'heading2': return `## ${c}\n\n`;
    case 'heading3': return `### ${c}\n\n`;
    case 'paragraph': return c ? `${c}\n\n` : '\n';
    case 'quote': return `> ${c}\n\n`;
    case 'callout': return `> **${block.metadata?.variant || 'Note'}:** ${c}\n\n`;
    case 'checklist': return `- [${block.metadata?.checked ? 'x' : ' '}] ${c}\n`;
    case 'code': {
      const lang = block.metadata?.language || '';
      return `\`\`\`${lang}\n${c}\n\`\`\`\n\n`;
    }
    case 'divider': return `---\n\n`;
    case 'table': {
      const rows = block.metadata?.rows || [];
      if (!rows.length) return '';
      const header = rows[0];
      const sep = header.map(() => '---');
      const body = rows.slice(1);
      const lines = [
        `| ${header.join(' | ')} |`,
        `| ${sep.join(' | ')} |`,
        ...body.map(r => `| ${r.join(' | ')} |`),
      ];
      return lines.join('\n') + '\n\n';
    }
    case 'database':
      return `**Database view:** ${block.metadata?.view || 'table'}\n\n${blockToMd({ ...block, type: 'table' })}`;
    case 'pivot':
      return `**Pivot table**\n\n${blockToMd({ ...block, type: 'table' })}`;
    case 'mindmap':
      return (block.metadata?.nodes || []).map((n, i) => `${'  '.repeat(Math.min(i, 1))}- ${n}`).join('\n') + '\n\n';
    case 'flowchart':
      return `\`\`\`mermaid\ngraph LR\n${String(c).split('->').map((s) => s.trim()).filter(Boolean).map((s, i, arr) => i < arr.length - 1 ? `  ${i}[${s}] --> ${i + 1}[${arr[i + 1]}]` : '').filter(Boolean).join('\n')}\n\`\`\`\n\n`;
    case 'math':
      return `$$\n${c}\n$$\n\n`;
    case 'embed':
      return `[${block.metadata?.title || c}](${c})\n\n${block.metadata?.description || ''}\n\n`;
    case 'decision':
      return `### Decision: ${c || 'Untitled'}\n\n- Status: ${block.metadata?.status || 'proposed'}\n- Owner: ${block.metadata?.owner || ''}\n- Date: ${block.metadata?.date || ''}\n\n**Rationale**\n\n${block.metadata?.rationale || ''}\n\n**Consequences**\n\n${block.metadata?.consequences || ''}\n\n`;
    case 'retro':
      return `### ${c || 'Retrospective'}\n\n**Went well**\n\n${block.metadata?.wentWell || ''}\n\n**Improve**\n\n${block.metadata?.improve || ''}\n\n**Actions**\n\n${block.metadata?.actions || ''}\n\n**Shoutouts**\n\n${block.metadata?.shoutouts || ''}\n\n`;
    case 'okr':
      return `### Objective: ${c || 'Untitled'}\n\n${(block.metadata?.keyResults || []).map((kr) => `- ${kr.title || 'Key result'}: ${kr.current || 0}/${kr.target || 0}`).join('\n')}\n\n`;
    case 'risk_register':
      return `### Risk register\n\n| Risk | Score | Owner | Mitigation |\n| --- | --- | --- | --- |\n${(block.metadata?.risks || []).map((r) => `| ${r.risk || ''} | ${(Number(r.impact) || 0) * (Number(r.probability) || 0)} | ${r.owner || ''} | ${r.mitigation || ''} |`).join('\n')}\n\n`;
    case 'raci':
      return `### RACI matrix\n\n${blockToMd({ ...block, type: 'table' })}`;
    case 'release_notes':
      return `### Release notes ${block.metadata?.version || ''}\n\n**Added**\n\n${block.metadata?.added || ''}\n\n**Changed**\n\n${block.metadata?.changed || ''}\n\n**Fixed**\n\n${block.metadata?.fixed || ''}\n\n**Known issues**\n\n${block.metadata?.knownIssues || ''}\n\n`;
    case 'dashboard':
      return `[${block.metadata?.title || 'Embedded dashboard'}](${block.metadata?.url || c || '#'})\n\n${block.metadata?.description || ''}\n\n`;
    case 'toggle': return `**${c}**\n\n${block.metadata?.children ? blocksToMarkdown(block.metadata.children) : ''}`;
    default: return c ? `${c}\n\n` : `<!-- block:${block.type} -->\n\n`;
  }
}

/**
 * Trigger a browser download of the article as a .md file.
 * @param {string} title  — Article title (used as the filename).
 * @param {Array}  blocks — Parsed content blocks array.
 */
export function downloadMarkdown(title, blocks) {
  const md = blocksToMarkdown(blocks);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title || 'article'}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Static exports for dashboards/reports.
//
// PDF and Excel (.xlsx) are produced SERVER-side (Cap J — "static exports for stakeholders without
// Works access"): the server renders the workspace-scoped data table to a real PDF / .xlsx with no
// client library and no tenant-leak surface (the endpoint derives the workspace from the persisted
// entity and enforces view_items). See `downloadExport`. All HTTP goes through the single apiClient
// (CLAUDE.md §3) — never a bare fetch.
//
// PNG stays CLIENT-side: it captures the actually-rendered charts via html2canvas (a server PNG
// would need a headless browser to draw them). The heavy image library is dynamically imported so
// it never bloats the main bundle. CSV remains a pure, dependency-free client export.
import { api } from '@/lib/apiClient';

/**
 * Download a server-rendered export (PDF / Excel / PNG) for a report or dashboard.
 * `endpoint` is the API-relative export path (e.g. `/reports/RPT-1/export`). Streams the response
 * as a blob and triggers a browser download; throws on a non-2xx so the caller can show an error.
 */
export async function downloadExport(endpoint, format, filename) {
  const res = await api.raw(`${endpoint}?format=${encodeURIComponent(format)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Export failed: ${res.status}`);
  }
  const ext = format === 'xlsx' ? 'xlsx' : format;
  downloadBlob(await res.blob(), `${filename}.${ext}`);
}

/** Serialise an array of flat row objects to a CSV string (RFC-4180 quoting). Pure. */
export function rowsToCsv(rows) {
  if (!rows || rows.length === 0) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\r\n');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Download row objects as a .csv file (opens in Excel/Sheets). */
export function exportRowsToCsv(rows, filename) {
  const csv = rowsToCsv(rows);
  if (!csv) return;
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`);
}

/** Rasterise a DOM element to a PNG download via html2canvas (lazy-loaded). */
export async function exportElementToPng(el, filename) {
  if (!el) return;
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(el, { backgroundColor: 'white', scale: 2 });
  downloadBlob(await new Promise((res) => canvas.toBlob(res, 'image/png')), `${filename}.png`);
}

/** Rasterise a DOM element and place it on an A4 PDF page (jsPDF + html2canvas, lazy-loaded). */
export async function exportElementToPdf(el, filename) {
  if (!el) return;
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const canvas = await html2canvas(el, { backgroundColor: 'white', scale: 2 });
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const margin = 24;
  const imgW = pdf.internal.pageSize.getWidth() - margin * 2;
  const imgH = (canvas.height / canvas.width) * imgW;
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, imgW, imgH);
  pdf.save(`${filename}.pdf`);
}
