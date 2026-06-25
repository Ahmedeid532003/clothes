import type { ScanOrderDto } from '@/lib/api/scanOrders';
import { fmtPriceEn } from '@/lib/print/okazionBarcodePrint';

export function printScanOrderReceipt(order: ScanOrderDto) {
  const lines = order.lines ?? [];
  const itemsHtml = lines
    .slice(0, 40)
    .map(
      (ln) => `
      <tr>
        <td class="name">${ln.product_name}<br/><span class="sku">${ln.product_code} ${ln.size_name}/${ln.color_name}</span></td>
        <td class="qty">${ln.quantity}</td>
        <td class="amt">${fmtPriceEn(ln.line_total)}</td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8"/>
  <title>${order.code}</title>
  <style>
    @page { margin: 2mm; size: 58mm auto; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Tahoma, sans-serif; font-size: 11px; width: 56mm; padding: 2mm; }
    .title { text-align: center; font-weight: 900; font-size: 13px; margin-bottom: 4px; }
    .meta { text-align: center; font-size: 10px; margin-bottom: 6px; line-height: 1.4; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom: 1px dashed #999; padding: 3px 2px; vertical-align: top; }
    th { font-size: 9px; text-align: center; }
    .name { text-align: right; width: 55%; }
    .sku { color: #555; font-size: 9px; }
    .qty { text-align: center; width: 15%; font-weight: 700; }
    .amt { text-align: left; width: 30%; font-weight: 700; direction: ltr; }
    .total { margin-top: 6px; text-align: center; font-size: 14px; font-weight: 900; border-top: 2px solid #000; padding-top: 4px; }
    .foot { text-align: center; font-size: 9px; margin-top: 6px; color: #444; }
  </style>
</head>
<body>
  <div class="title">أوردر ${order.code}</div>
  <div class="meta">
    ${order.order_type_label}<br/>
    الموظف: ${order.employee_name} (${order.employee_code})<br/>
    ${order.supplier_name ? `المورد: ${order.supplier_name}<br/>` : ''}
    ${new Date(order.created_at).toLocaleString('ar-EG')}
  </div>
  <table>
    <thead><tr><th>الصنف</th><th>كم</th><th>مبلغ</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div class="total">الإجمالي: ${fmtPriceEn(order.total_sale_amount)} ج.م.</div>
  <div class="foot">${lines.length} صنف · ${order.total_quantity} قطعة</div>
  <script>window.onload=function(){window.print();setTimeout(function(){window.close()},400)}<\/script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=320,height=640');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
