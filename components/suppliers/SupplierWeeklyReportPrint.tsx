import type { SupplierWeeklyReportDto } from '@/lib/api/suppliers';

export type WeeklyReportPrintLabels = {
  title: string;
  supplier: string;
  code: string;
  date: string;
  period: string;
  item: string;
  sold: string;
  remaining: string;
  minThreshold: string;
  topSellers: string;
  nearDepletion: string;
  stagnant: string;
  totals: string;
  footer: string;
};

export function buildWeeklyReportHtml(
  report: SupplierWeeklyReportDto,
  labels: WeeklyReportPrintLabels,
  locale: 'ar' | 'en',
): string {
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const payload = report.payload;
  const items = payload.items ?? [];
  const indicators = payload.indicators ?? { top_sellers: [], near_depletion: [], stagnant: [] };

  const rowsHtml = items
    .map(
      (row) => `
      <tr>
        <td>${row.product_name}</td>
        <td class="num">${row.sold_qty}</td>
        <td class="num">${row.remaining_qty}</td>
        <td class="num">${row.min_threshold}</td>
      </tr>`,
    )
    .join('');

  const listItems = (list: typeof items, empty: string) =>
    list.length
      ? `<ul>${list.map((i) => `<li>${i.product_name} — ${labels.sold}: ${i.sold_qty}, ${labels.remaining}: ${i.remaining_qty}</li>`).join('')}</ul>`
      : `<p class="muted">${empty}</p>`;

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <title>${labels.title} — ${report.code}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 24px; color: #0f172a; }
    h1 { margin: 0 0 8px; font-size: 22px; }
    .meta { margin-bottom: 20px; color: #475569; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: start; }
    th { background: #f8fafc; font-weight: 700; }
    .num { text-align: center; font-variant-numeric: tabular-nums; }
    .section { margin-top: 18px; }
    .section h3 { margin: 0 0 8px; font-size: 15px; color: #1e40af; }
    ul { margin: 0; padding-${dir === 'rtl' ? 'right' : 'left'}: 20px; }
    .muted { color: #94a3b8; font-size: 13px; }
    .footer { margin-top: 28px; font-size: 12px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
  </style>
</head>
<body>
  <h1>${labels.title}</h1>
  <div class="meta">
    <div><strong>${labels.supplier}:</strong> ${payload.supplier_name} (${payload.supplier_code})</div>
    <div><strong>${labels.date}:</strong> ${payload.report_date}</div>
    <div><strong>${labels.period}:</strong> ${payload.week_start} → ${payload.week_end}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>${labels.item}</th>
        <th>${labels.sold}</th>
        <th>${labels.remaining}</th>
        <th>${labels.minThreshold}</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="4" class="muted">${labels.footer}</td></tr>`}
    </tbody>
  </table>
  <div class="section">
    <h3>${labels.topSellers}</h3>
    ${listItems(indicators.top_sellers ?? [], '—')}
  </div>
  <div class="section">
    <h3>${labels.nearDepletion}</h3>
    ${listItems(indicators.near_depletion ?? [], '—')}
  </div>
  <div class="section">
    <h3>${labels.stagnant}</h3>
    ${listItems(indicators.stagnant ?? [], '—')}
  </div>
  <div class="footer">${labels.totals}: ${labels.sold} ${payload.totals?.sold_qty ?? '0'} — ${labels.remaining} ${payload.totals?.remaining_qty ?? '0'}</div>
</body>
</html>`;
}

export function printWeeklyReport(report: SupplierWeeklyReportDto, labels: WeeklyReportPrintLabels, locale: 'ar' | 'en') {
  const html = buildWeeklyReportHtml(report, labels, locale);
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
