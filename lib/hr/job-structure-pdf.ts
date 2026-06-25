export type JobStructurePdfColumn = {
  key: string;
  label: string;
};

export type JobStructurePdfSection =
  | 'departments'
  | 'sections'
  | 'groups'
  | 'jobTitles'
  | 'holidays'
  | 'financial';

type ExportJobStructurePdfOptions = {
  section: JobStructurePdfSection;
  title: string;
  subtitle?: string;
  isRtl: boolean;
  columns: JobStructurePdfColumn[];
  rows: Array<Record<string, string>>;
  generatedLabel: string;
  emptyLabel: string;
  portalTitle?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fileSlug(value: string) {
  return value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0600-\u06FF-]+/g, '')
    .slice(0, 48) || 'report';
}

function buildReportMarkup({
  title,
  subtitle,
  isRtl,
  columns,
  rows,
  generatedLabel,
  emptyLabel,
  portalTitle,
  section,
}: ExportJobStructurePdfOptions) {
  const dir = isRtl ? 'rtl' : 'ltr';
  const align = isRtl ? 'right' : 'left';
  const safeTitle = escapeHtml(title);
  const safeSubtitle = subtitle ? escapeHtml(subtitle) : '';
  const safePortal = portalTitle ? escapeHtml(portalTitle) : '';
  const stamp = new Date().toLocaleString(isRtl ? 'ar-EG' : 'en-GB');

  const headCells = columns.map((col) => `<th>${escapeHtml(col.label)}</th>`).join('');

  const bodyRows =
    rows.length === 0
      ? `<tr><td colspan="${columns.length}" class="empty">${escapeHtml(emptyLabel)}</td></tr>`
      : rows
          .map((row) => {
            const cells = columns
              .map((col) => `<td>${escapeHtml(row[col.key] ?? '—')}</td>`)
              .join('');
            return `<tr>${cells}</tr>`;
          })
          .join('');

  return {
    dir,
    align,
    html: `
      <div class="hr-pdf-root" dir="${dir}" style="direction:${dir};text-align:${align};font-family:'Cairo Variable','Cairo',Tahoma,Arial,sans-serif;color:#0f172a;background:#fff;padding:4px;">
        ${safePortal ? `<div class="brand">${safePortal}</div>` : ''}
        <h1>${safeTitle}</h1>
        ${safeSubtitle ? `<p class="subtitle">${safeSubtitle}</p>` : ''}
        <p class="meta">${escapeHtml(generatedLabel)}: ${escapeHtml(stamp)} · ${escapeHtml(section)}</p>
        <table>
          <thead><tr>${headCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
        <p class="footer">Ma7alyErp</p>
      </div>
      <style>
        .hr-pdf-root { width: 100%; }
        .hr-pdf-root .brand {
          display: inline-block;
          border-radius: 999px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #fff;
          padding: 6px 14px;
          font-size: 10px;
          font-weight: 800;
          margin-bottom: 10px;
        }
        .hr-pdf-root h1 {
          margin: 0 0 6px;
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.45;
        }
        .hr-pdf-root .subtitle {
          margin: 0 0 12px;
          color: #64748b;
          font-size: 11px;
          line-height: 1.7;
        }
        .hr-pdf-root .meta {
          margin: 0 0 16px;
          color: #94a3b8;
          font-size: 10px;
        }
        .hr-pdf-root table {
          width: 100%;
          border-collapse: collapse;
          font-family: 'Times New Roman', Times, serif;
          font-weight: 700;
        }
        .hr-pdf-root th {
          background: #eef4ff;
          color: #1d4ed8;
          font-family: 'Cairo Variable', 'Cairo', Tahoma, Arial, sans-serif;
          font-size: 10px;
          font-weight: 800;
          border: 1px solid #d8e1ef;
          padding: 10px 12px;
          text-align: ${align};
        }
        .hr-pdf-root td {
          border: 1px solid #d8e1ef;
          padding: 9px 12px;
          color: #0f172a;
          text-align: ${align};
          vertical-align: top;
        }
        .hr-pdf-root tr:nth-child(even) td { background: #f8fbff; }
        .hr-pdf-root td.empty {
          text-align: center;
          color: #94a3b8;
          font-family: 'Cairo Variable', 'Cairo', Tahoma, Arial, sans-serif;
          padding: 24px;
        }
        .hr-pdf-root .footer {
          margin-top: 18px;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
          color: #94a3b8;
          font-size: 10px;
        }
      </style>
    `,
  };
}

function downloadHtmlFallback(html: string, filename: string) {
  const blob = new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>${html}</body></html>`], {
    type: 'text/html;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.replace(/\.pdf$/i, '.html');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function exportJobStructureSectionPdf(options: ExportJobStructurePdfOptions) {
  const { html } = buildReportMarkup(options);
  const datePart = new Date().toISOString().slice(0, 10);
  const filename = `${fileSlug(options.title)}-${datePart}.pdf`;

  const host = document.createElement('div');
  host.style.cssText =
    'position:fixed;left:-10000px;top:0;width:794px;max-width:794px;background:#ffffff;z-index:-1;pointer-events:none;';
  host.innerHTML = html;
  document.body.appendChild(host);

  try {
    await document.fonts.ready;
    await new Promise((r) => setTimeout(r, 120));

    const html2pdf = (await import('html2pdf.js')).default;
    const target = host.querySelector('.hr-pdf-root') as HTMLElement | null;
    if (!target) throw new Error('PDF root missing');

    await html2pdf()
      .set({
        margin: [10, 10, 12, 10],
        filename,
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      })
      .from(target)
      .save();
  } catch {
    downloadHtmlFallback(html, filename);
  } finally {
    document.body.removeChild(host);
  }
}
