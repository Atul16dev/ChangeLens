/**
 * ChangeLens Export & Snapshot Utilities
 * Handles high-resolution PNG/SVG graph captures, Markdown/JSON downloads,
 * and printer/PDF export formatting.
 */

import { toPng, toSvg } from 'html-to-image';

/**
 * Triggers a native browser file download from a Blob or URL.
 */
export function downloadFile(url, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Triggers a download for raw text/markdown content.
 */
export function downloadText(content, filename, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  downloadFile(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Triggers a download for JSON structured data.
 */
export function downloadJson(data, filename) {
  const jsonStr = JSON.stringify(data, null, 2);
  downloadText(jsonStr, filename, 'application/json;charset=utf-8');
}

/**
 * Captures the React Flow graph DOM node and saves it as high-res PNG image.
 */
export async function exportGraphToPng(element, filename = 'changelens-graph.png') {
  if (!element) throw new Error('Graph canvas element not found');

  const dataUrl = await toPng(element, {
    backgroundColor: '#020617', // slate-950
    filter: (node) => {
      // Exclude interactive overlay UI controls from snapshot
      if (node?.classList?.contains('react-flow__panel')) return false;
      if (node?.classList?.contains('react-flow__controls')) return false;
      return true;
    },
    quality: 0.95,
    pixelRatio: 2, // 2x high-resolution retina rendering
  });

  downloadFile(dataUrl, filename);
  return dataUrl;
}

/**
 * Captures the React Flow graph DOM node and saves it as SVG vector file.
 */
export async function exportGraphToSvg(element, filename = 'changelens-graph.svg') {
  if (!element) throw new Error('Graph canvas element not found');

  const dataUrl = await toSvg(element, {
    backgroundColor: '#020617',
    filter: (node) => {
      if (node?.classList?.contains('react-flow__panel')) return false;
      if (node?.classList?.contains('react-flow__controls')) return false;
      return true;
    },
  });

  downloadFile(dataUrl, filename);
  return dataUrl;
}

/**
 * Generates an elegant print-formatted document window and triggers window.print() (Save as PDF).
 */
export function printOrSavePDF({ title, markdown, summary, riskLevel }) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export the PDF report.');
    return;
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title || 'ChangeLens Impact Analysis Report'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 40px;
      color: #1e293b;
      line-height: 1.6;
    }
    .header {
      border-bottom: 2px solid #0284c7;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      background: #e0f2fe;
      color: #0369a1;
      margin-top: 6px;
    }
    .badge.CRITICAL { background: #fee2e2; color: #b91c1c; }
    .badge.HIGH { background: #ffedd5; color: #c2410c; }
    .badge.MEDIUM { background: #fef9c3; color: #854d0e; }
    .badge.LOW { background: #dcfce7; color: #15803d; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin: 20px 0;
    }
    .stat-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
      background: #f8fafc;
    }
    .stat-val { font-size: 20px; font-weight: bold; color: #0f172a; }
    .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; }
    pre {
      background: #f1f5f9;
      padding: 16px;
      border-radius: 8px;
      white-space: pre-wrap;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      text-align: left;
      font-size: 13px;
    }
    th {
      background: #f8fafc;
      font-weight: 600;
    }
    @media print {
      body { margin: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 24px; color: #0f172a;">ChangeLens Architecture Impact Report</h1>
    <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
      Generated: ${new Date().toLocaleString()} • Deterministic AST Blast Radius Analyzer
    </div>
    <span class="badge ${riskLevel || 'LOW'}">Overall Risk: ${riskLevel || 'LOW'}</span>
  </div>

  ${
    summary
      ? `
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-val">${summary.totalChanges ?? summary.totalChangedFiles ?? 0}</div>
      <div class="stat-label">Changed Files</div>
    </div>
    <div class="stat-card">
      <div class="stat-val" style="color: ${summary.brokenImportsCount > 0 ? '#ef4444' : '#10b981'};">
        ${summary.brokenImportsCount ?? 0}
      </div>
      <div class="stat-label">Broken Imports</div>
    </div>
    <div class="stat-card">
      <div class="stat-val" style="color: #f97316;">${summary.directDependentsCount ?? 0}</div>
      <div class="stat-label">Direct (Lv 1)</div>
    </div>
    <div class="stat-card">
      <div class="stat-val" style="color: #eab308;">${summary.transitiveDependentsCount ?? 0}</div>
      <div class="stat-label">Transitive (Lv 2+)</div>
    </div>
  </div>`
      : ''
  }

  <h2 style="font-size: 16px; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
    Pull Request Review Summary (Markdown)
  </h2>
  <pre>${markdown || 'No report available.'}</pre>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
`;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
