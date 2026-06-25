import type { InstallmentReceipt } from '@/lib/api/receivables';
import { fmtPriceEn } from '@/lib/print/okazionBarcodePrint';

export function printPosInstallmentReceipt(receipt: InstallmentReceipt, userName?: string) {
  const itemsHtml = (receipt.items ?? [])
    .map(
      (ln) => `
      <tr>
        <td class="name">${ln.product_name}<br/><span class="sku">${ln.product_code || ''}</span></td>
        <td class="qty">${ln.quantity}</td>
        <td class="amt">${fmtPriceEn(ln.line_total)}</td>
      </tr>`,
    )
    .join('');

  const interestRow = receipt.show_interest_on_receipt
    ? `<tr><td class="lbl">قيمة الفوائد</td><td class="val">${fmtPriceEn(receipt.interest_amount)}</td></tr>`
    : '';

  const grandLabel =
    receipt.grand_total_label ||
    (receipt.show_interest_on_receipt ? 'الإجمالي العام' : 'اجمالى نقدي+قيمه الفوائد');

  const scheduleHead = receipt.show_penalty_on_receipt
    ? '<th>تاريخ استحقاق القسط</th><th>قيمة القسط</th><th>غرامة تأخير</th><th>إجمالي القسط</th>'
    : '<th>تاريخ استحقاق القسط</th><th>المبلغ</th>';

  const scheduleRows = (receipt.schedule ?? [])
    .map((ln) => {
      if (receipt.show_penalty_on_receipt) {
        const base = parseFloat(ln.amount_due || '0') - parseFloat(ln.penalty_amount || '0');
        return `<tr>
          <td>${ln.due_month_label}</td>
          <td class="amt">${fmtPriceEn(String(Math.max(base, 0)))}</td>
          <td>${fmtPriceEn(ln.penalty_amount || '0')}</td>
          <td class="amt">${fmtPriceEn(ln.total_amount)}</td>
        </tr>`;
      }
      return `<tr><td>${ln.due_month_label}</td><td class="amt">${fmtPriceEn(ln.amount_due)}</td></tr>`;
    })
    .join('');

  const now = new Date().toLocaleString('ar-EG');

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8"/>
  <title>${receipt.sale_code}</title>
  <style>
    @page { margin: 4mm; size: 80mm auto; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Tahoma, sans-serif; font-size: 11px; width: 72mm; padding: 2mm; }
    .title { text-align: center; font-weight: 900; font-size: 14px; margin-bottom: 4px; }
    .meta { text-align: center; font-size: 10px; margin-bottom: 6px; line-height: 1.5; }
    .meta-side { display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 6px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #333; padding: 3px 2px; vertical-align: middle; }
    th { font-size: 9px; text-align: center; background: #f5f5f5; }
    .items th, .items td { border-bottom: 1px dashed #999; border-left: none; border-right: none; }
    .items th { border-top: none; }
    .name { text-align: right; width: 55%; }
    .sku { color: #555; font-size: 9px; }
    .qty { text-align: center; width: 15%; font-weight: 700; }
    .amt { text-align: left; font-weight: 700; direction: ltr; }
    .summary { margin-top: 8px; }
    .summary td { padding: 4px 3px; }
    .summary .lbl { text-align: right; font-weight: 700; width: 62%; }
    .summary .val { text-align: left; font-weight: 900; direction: ltr; }
    .balance-big { margin: 10px 0; text-align: center; font-size: 24px; font-weight: 900; border: 3px solid #000; padding: 10px 6px; }
    .balance-big span { display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px; }
    .section-title { font-weight: 900; font-size: 11px; margin: 10px 0 4px; text-align: center; }
    .foot-summary { margin-top: 6px; }
    .foot { text-align: center; font-size: 9px; margin-top: 6px; color: #444; }
  </style>
</head>
<body>
  <div class="title">فاتورة بيع ${receipt.sale_code}</div>
  <div class="meta-side">
    <span>التاريخ: ${now}</span>
    ${userName ? `<span>المستخدم: ${userName}</span>` : '<span></span>'}
  </div>
  <div class="meta">العميل: ${receipt.customer_name}</div>
  <table class="items">
    <thead><tr><th>الصنف</th><th>كم</th><th>مبلغ</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <table class="summary">
    <tr><td class="lbl">إجمالي الأصناف</td><td class="val">${fmtPriceEn(receipt.subtotal)}</td></tr>
    ${interestRow}
    <tr><td class="lbl">${grandLabel}</td><td class="val">${fmtPriceEn(receipt.grand_total)}</td></tr>
    <tr><td class="lbl">إجمالي الآجل من الفاتورة</td><td class="val">${fmtPriceEn(receipt.credit_from_invoice)}</td></tr>
    <tr><td class="lbl">الرصيد السابق</td><td class="val">${fmtPriceEn(receipt.previous_balance)}</td></tr>
    <tr><td class="lbl">قيمة المبلغ المحصل</td><td class="val">${fmtPriceEn(receipt.down_payment_collected)}</td></tr>
  </table>
  <div class="balance-big">
    <span>الرصيد الحالي</span>
    ${fmtPriceEn(receipt.current_balance)} ج.م.
  </div>
  <div class="section-title">جدول الأقساط المستحقة على العميل</div>
  <table>
    <thead><tr>${scheduleHead}</tr></thead>
    <tbody>${scheduleRows || '<tr><td colspan="4" style="text-align:center">—</td></tr>'}</tbody>
  </table>
  <table class="summary foot-summary">
    <tr><td class="lbl">إجمالي عدد الأقساط</td><td class="val">${receipt.total_installments_count}</td></tr>
    <tr><td class="lbl">إجمالي قيمة الأقساط المتبقية</td><td class="val">${fmtPriceEn(receipt.remaining_installments_total)}</td></tr>
  </table>
  <div class="foot">Ma7alyErp — نقطة البيع</div>
  <script>window.onload=function(){window.print();setTimeout(function(){window.close()},400)}<\/script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=360,height=720');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
