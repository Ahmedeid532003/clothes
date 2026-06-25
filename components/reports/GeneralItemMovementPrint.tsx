import type { GeneralItemMovementReport } from '@/lib/api/generalItemMovement';

export type MovementPrintLabels = {
  title: string;
  supplier: string;
  season: string;
  period: string;
  model: string;
  description: string;
  brand: string;
  purchasePrice: string;
  purchasedQty: string;
  purchasedValue: string;
  returnQty: string;
  returnValue: string;
  soldQty: string;
  soldValue: string;
  purchaseCount: string;
  balance: string;
  balanceValue: string;
  totals: string;
  footer: string;
};

export function buildMovementReportHtml(
  report: GeneralItemMovementReport,
  labels: MovementPrintLabels,
  locale: 'ar' | 'en',
  showMoney: boolean,
): string {
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const branches = report.branches;

  const branchHeaders = branches
    .map((b) => `<th class="num">${b.branch_name}</th>`)
    .join('');

  const rowsHtml = report.rows
    .map((row) => {
      const branchCells = branches
        .map((b) => {
          const st = row.branch_stocks.find((x) => x.branch_id === b.branch_id);
          return `<td class="num">${st?.quantity ?? '0'}</td>`;
        })
        .join('');
      const money = (qty: string, val: string) =>
        showMoney ? `${qty}<br/><small>${val}</small>` : qty;
      return `<tr>
        <td>${row.season_name}</td>
        <td>${row.supplier_name}</td>
        <td class="num">${row.product_code}</td>
        <td>${row.product_name}</td>
        <td>${row.brand_name}</td>
        <td class="num">${row.purchase_price}</td>
        <td class="num">${money(row.purchased_qty, row.purchased_value)}</td>
        <td class="num">${money(row.return_qty, row.return_value)}</td>
        <td class="num">${money(row.sold_qty, row.sold_value)}</td>
        <td class="num">${row.purchase_count}</td>
        ${branchCells}
        <td class="num">${money(row.balance_qty, row.balance_value)}</td>
      </tr>`;
    })
    .join('');

  const t = report.totals;
  const branchTotals = branches
    .map((b) => `<td class="num"><strong>${t.branch_qty[b.branch_id] ?? '0'}</strong></td>`)
    .join('');

  const moneyT = (qty: string, val: string) =>
    showMoney ? `<strong>${qty}</strong><br/><small>${val}</small>` : `<strong>${qty}</strong>`;

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <title>${labels.title}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 20px; color: #0f172a; font-size: 11px; }
    h1 { margin: 0 0 6px; font-size: 18px; }
    .meta { margin-bottom: 14px; color: #475569; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th, td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: start; vertical-align: middle; }
    th { background: #e2e8f0; font-weight: 700; }
    .num { text-align: center; font-variant-numeric: tabular-nums; }
    tfoot td { background: #f1f5f9; font-weight: 700; }
    small { color: #64748b; }
    .footer { margin-top: 16px; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <h1>${labels.title}</h1>
  <div class="meta">
    ${report.supplier_name ? `<div><strong>${labels.supplier}:</strong> ${report.supplier_name}</div>` : ''}
    <div><strong>${labels.period}:</strong> ${report.period_label || '—'}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th rowspan="2">${labels.season}</th>
        <th rowspan="2">${labels.supplier}</th>
        <th colspan="3">${labels.description}</th>
        <th rowspan="2">${labels.purchasePrice}</th>
        <th rowspan="2">${labels.purchasedQty}</th>
        <th rowspan="2">${labels.returnQty}</th>
        <th rowspan="2">${labels.soldQty}</th>
        <th rowspan="2">${labels.purchaseCount}</th>
        <th colspan="${branches.length}">${labels.balance}</th>
        <th rowspan="2">${labels.balanceValue}</th>
      </tr>
      <tr>
        <th>${labels.model}</th>
        <th>${labels.description}</th>
        <th>${labels.brand}</th>
        ${branchHeaders}
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot>
      <tr>
        <td colspan="6"><strong>${labels.totals}</strong></td>
        <td class="num">${moneyT(t.purchased_qty, t.purchased_value)}</td>
        <td class="num">${moneyT(t.return_qty, t.return_value)}</td>
        <td class="num">${moneyT(t.sold_qty, t.sold_value)}</td>
        <td></td>
        ${branchTotals}
        <td class="num">${moneyT(t.balance_qty, t.balance_value)}</td>
      </tr>
    </tfoot>
  </table>
  <p class="footer">${labels.footer}</p>
  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;
}

export function printMovementReport(
  report: GeneralItemMovementReport,
  labels: MovementPrintLabels,
  locale: 'ar' | 'en',
  showMoney: boolean,
) {
  const html = buildMovementReportHtml(report, labels, locale, showMoney);
  const w = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=800');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

export function exportMovementCsv(
  report: GeneralItemMovementReport,
  showMoney: boolean,
  filename = 'general-item-movement.csv',
) {
  const branches = report.branches;
  const headers = [
    'season',
    'supplier',
    'code',
    'name',
    'brand',
    'purchase_price',
    'purchased_qty',
    ...(showMoney ? ['purchased_value'] : []),
    'return_qty',
    ...(showMoney ? ['return_value'] : []),
    'sold_qty',
    ...(showMoney ? ['sold_value'] : []),
    'purchase_count',
    ...branches.map((b) => `stock_${b.branch_name}`),
    'balance_qty',
    ...(showMoney ? ['balance_value'] : []),
  ];
  const lines = [headers.join(',')];
  for (const row of report.rows) {
    const cells = [
      row.season_name,
      row.supplier_name,
      row.product_code,
      `"${row.product_name.replace(/"/g, '""')}"`,
      row.brand_name,
      row.purchase_price,
      row.purchased_qty,
      ...(showMoney ? [row.purchased_value] : []),
      row.return_qty,
      ...(showMoney ? [row.return_value] : []),
      row.sold_qty,
      ...(showMoney ? [row.sold_value] : []),
      String(row.purchase_count),
      ...branches.map((b) => row.branch_stocks.find((x) => x.branch_id === b.branch_id)?.quantity ?? '0'),
      row.balance_qty,
      ...(showMoney ? [row.balance_value] : []),
    ];
    lines.push(cells.join(','));
  }
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
