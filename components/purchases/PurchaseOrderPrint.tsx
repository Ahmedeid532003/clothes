import type { PurchaseOrderDto } from '@/lib/api/purchaseOrders';

export type PurchaseOrderPrintLabels = {
  title: string;
  orderCode: string;
  supplier: string;
  season: string;
  date: string;
  model: string;
  description: string;
  brand: string;
  qty: string;
  price: string;
  notes: string;
  footer: string;
};

export function buildPurchaseOrderHtml(
  order: PurchaseOrderDto,
  labels: PurchaseOrderPrintLabels,
  locale: 'ar' | 'en',
): string {
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const rowsHtml = (order.lines ?? [])
    .map(
      (row) => `
      <tr>
        <td>${row.product_code}</td>
        <td>${row.product_description || row.product_name}</td>
        <td>${row.brand_name}</td>
        <td class="num">${row.quantity_ordered === '0.000' || row.quantity_ordered === '0' ? '—' : row.quantity_ordered}</td>
        <td class="num">${row.unit_price}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <title>${labels.title} — ${order.code}</title>
  <style>
    body { font-family: 'Times New Roman', 'Segoe UI', Tahoma, Arial, sans-serif; margin: 24px; color: #0f172a; }
    h1 { margin: 0 0 8px; font-size: 22px; font-weight: 700; }
    .meta { margin-bottom: 20px; color: #475569; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; font-weight: 700; }
    th, td { border: 1px solid #0f172a; padding: 8px 10px; text-align: center; }
    th { background: #f1f5f9; }
    .num { font-variant-numeric: tabular-nums; }
    .footer { margin-top: 28px; font-size: 12px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
  </style>
</head>
<body>
  <h1>${labels.title}</h1>
  <div class="meta">
    <div><strong>${labels.orderCode}:</strong> ${order.code}</div>
    <div><strong>${labels.supplier}:</strong> ${order.supplier_name}</div>
    <div><strong>${labels.season}:</strong> ${order.season_name}</div>
    <div><strong>${labels.date}:</strong> ${order.created_at.slice(0, 10)}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>${labels.model}</th>
        <th>${labels.description}</th>
        <th>${labels.brand}</th>
        <th>${labels.qty}</th>
        <th>${labels.price}</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="5">${labels.footer}</td></tr>`}
    </tbody>
  </table>
  <div class="footer">${labels.notes}: ${order.notes || '—'}</div>
</body>
</html>`;
}

export function printPurchaseOrder(
  order: PurchaseOrderDto,
  labels: PurchaseOrderPrintLabels,
  locale: 'ar' | 'en',
) {
  const html = buildPurchaseOrderHtml(order, labels, locale);
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

export function printPurchaseOrdersBySupplier(
  orders: PurchaseOrderDto[],
  labels: PurchaseOrderPrintLabels,
  locale: 'ar' | 'en',
) {
  for (const order of orders) {
    printPurchaseOrder(order, labels, locale);
  }
}
