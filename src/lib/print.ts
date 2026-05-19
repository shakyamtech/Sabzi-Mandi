// Lightweight print helper — opens a new window with styled HTML and triggers print.

export const printHTML = (title: string, bodyHtml: string) => {
  const w = window.open("", "_blank", "width=420,height=640");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8" />
    <title>${title}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 16px; color: #111; }
      h1, h2, h3 { font-family: Georgia, serif; margin: 0 0 4px; }
      .center { text-align: center; }
      .muted { color: #666; font-size: 12px; }
      .row { display: flex; justify-content: space-between; gap: 8px; }
      .row + .row { margin-top: 4px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
      th, td { text-align: left; padding: 4px 2px; border-bottom: 1px dashed #ddd; }
      th:last-child, td:last-child { text-align: right; }
      .total { border-top: 2px solid #000; margin-top: 8px; padding-top: 8px; font-weight: 700; font-size: 16px; }
      .sub { font-size: 12px; color: #555; }
      hr { border: none; border-top: 1px dashed #999; margin: 10px 0; }
      @media print { body { padding: 8px; } @page { margin: 8mm; } }
    </style></head><body>${bodyHtml}</body></html>`);
  w.document.close();
  w.document.title = title;
  w.focus();
  setTimeout(() => { w.print(); }, 500);
};

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
