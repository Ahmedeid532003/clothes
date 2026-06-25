import type { SalesQuotationDto } from '@/lib/api/sales';
import { fmtPriceEn } from '@/lib/print/okazionBarcodePrint';

export type QuotationPrintFormat = 'a4' | 'receipt';

export type QuotationPrintMeta = {
  companyName: string;
  branchName: string;
  userName?: string;
  employeeCode?: string;
  sellerName?: string;
  customerPhone?: string;
  customerNotes?: string;
  locale?: 'ar' | 'en';
};

export type QuotationPrintLabels = {
  title: string;
  docNo: string;
  date: string;
  time: string;
  validUntil: string;
  customer: string;
  phone: string;
  branch: string;
  shop: string;
  preparedBy: string;
  employeeCode: string;
  itemsCount: string;
  qtyTotal: string;
  colCode: string;
  colName: string;
  colSize: string;
  colColor: string;
  colQty: string;
  colPrice: string;
  colDisc: string;
  colTotal: string;
  subtotal: string;
  discount: string;
  tax: string;
  grandTotal: string;
  notes: string;
  termsTitle: string;
  term1: string;
  term2: string;
  term3: string;
  signatureSeller: string;
  signatureCustomer: string;
  printA4: string;
  printReceipt: string;
  currency: string;
  watermark: string;
};

const DEFAULT_LABELS_AR: QuotationPrintLabels = {
  title: 'عرض سعر',
  docNo: 'رقم العرض',
  date: 'التاريخ',
  time: 'الوقت',
  validUntil: 'صالح حتى',
  customer: 'اسم العميل',
  phone: 'رقم التليفون',
  branch: 'الفرع',
  shop: 'المحل / الشركة',
  preparedBy: 'الموظف / البائع',
  employeeCode: 'كود الموظف',
  itemsCount: 'عدد الأصناف',
  qtyTotal: 'إجمالي الكمية',
  colCode: 'كود الصنف',
  colName: 'اسم الصنف',
  colSize: 'المقاس',
  colColor: 'اللون',
  colQty: 'الكمية',
  colPrice: 'سعر الوحدة',
  colDisc: 'خصم %',
  colTotal: 'إجمالي البند',
  subtotal: 'إجمالي الأصناف',
  discount: 'خصم الفاتورة',
  tax: 'ضريبة',
  grandTotal: 'الإجمالي النهائي',
  notes: 'ملاحظات',
  termsTitle: 'شروط وأحكام العرض',
  term1: 'هذا المستند عرض سعر رسمي وليس فاتورة بيع — لا يُخصم من المخزون.',
  term2: 'الأسعار بالجنيه المصري وقابلة للتغيير بعد انتهاء صلاحية العرض.',
  term3: 'للتأكيد أو الحجز يرجى التواصل مع الفرع مع ذكر رقم العرض.',
  signatureSeller: 'توقيع البائع / الموظف',
  signatureCustomer: 'توقيع العميل',
  printA4: 'طباعة A4',
  printReceipt: 'طباعة إيصال',
  currency: 'ج.م',
  watermark: 'عرض سعر',
};

function money(v: string | number | undefined) {
  return fmtPriceEn(v);
}

function formatDate(iso: string | null | undefined, locale: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function formatTime(iso: string | null | undefined, locale: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function companyMonogram(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name.trim().slice(0, 2) || 'M7').toUpperCase();
}

function qtyTotal(doc: SalesQuotationDto) {
  return (doc.lines ?? []).reduce((s, l) => s + (parseFloat(l.quantity) || 0), 0);
}

function lineRowsA4(doc: SalesQuotationDto) {
  return (doc.lines ?? [])
    .map((ln, idx) => {
      const even = idx % 2 === 0 ? 'even' : 'odd';
      return `<tr class="${even}">
        <td class="seq">${idx + 1}</td>
        <td class="code">${ln.product_code}</td>
        <td class="name">${ln.product_name}</td>
        <td>${ln.size_name || '—'}</td>
        <td>${ln.color_name || '—'}</td>
        <td class="num qty">${ln.quantity}</td>
        <td class="num">${money(ln.unit_price)}</td>
        <td class="num">${ln.discount_percent || '0'}</td>
        <td class="num total">${money(ln.line_total)}</td>
      </tr>`;
    })
    .join('');
}

function lineRowsReceipt(doc: SalesQuotationDto) {
  return (doc.lines ?? [])
    .map((ln) => {
      const variant = [ln.size_name, ln.color_name].filter(Boolean).join(' / ');
      return `<tr>
        <td class="name">${ln.product_name}<br/><span class="sku">${ln.product_code}${variant ? ` · ${variant}` : ''}</span></td>
        <td class="qty">${ln.quantity}</td>
        <td class="price">${money(ln.unit_price)}</td>
        <td class="amt">${money(ln.line_total)}</td>
      </tr>`;
    })
    .join('');
}

function summaryRows(doc: SalesQuotationDto, labels: QuotationPrintLabels) {
  const disc = parseFloat(doc.discount_amount || '0') || 0;
  const tax = parseFloat(doc.tax_amount || '0') || 0;
  const rows = [
    `<tr><td class="lbl">${labels.subtotal}</td><td class="val">${money(doc.subtotal)}</td></tr>`,
  ];
  if (disc > 0) {
    rows.push(`<tr><td class="lbl">${labels.discount}</td><td class="val disc">-${money(doc.discount_amount)}</td></tr>`);
  }
  if (tax > 0) {
    rows.push(`<tr><td class="lbl">${labels.tax} (${doc.tax_percent}%)</td><td class="val">${money(doc.tax_amount)}</td></tr>`);
  }
  rows.push(
    `<tr class="grand"><td class="lbl">${labels.grandTotal}</td><td class="val">${money(doc.total)} <span class="cur">${labels.currency}</span></td></tr>`,
  );
  return rows.join('');
}

function buildA4Body(
  doc: SalesQuotationDto,
  meta: QuotationPrintMeta,
  labels: QuotationPrintLabels,
  locale: string,
) {
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const created = formatDate(doc.created_at, locale);
  const time = formatTime(doc.created_at, locale);
  const valid = formatDate(doc.valid_until, locale);
  const customer = doc.customer_name?.trim() || (locale === 'ar' ? 'عميل نقدي' : 'Walk-in');
  const phone = meta.customerPhone?.trim() || '—';
  const branch = doc.branch_name || meta.branchName;
  const employee = meta.sellerName || meta.userName || '—';
  const empCode = meta.employeeCode || '—';
  const notes = [doc.notes?.trim(), meta.customerNotes?.trim()].filter(Boolean).join(' · ') || '—';
  const items = (doc.lines ?? []).length;
  const qty = qtyTotal(doc);
  const mono = companyMonogram(meta.companyName);

  return `
  <div class="sheet">
    <div class="wm">${labels.watermark}</div>
    <header class="head">
      <div class="head-accent"></div>
      <div class="head-inner">
        <div class="brand-block">
          <div class="logo">${mono}</div>
          <div>
            <div class="company">${meta.companyName}</div>
            <div class="branch">${branch}</div>
          </div>
        </div>
        <div class="doc-block">
          <div class="doc-kind">${labels.title}</div>
          <div class="doc-code">${doc.code}</div>
          <div class="doc-dates">
            <span>${labels.date}: ${created}</span>
            <span>${labels.time}: ${time}</span>
          </div>
        </div>
      </div>
      <div class="title-ribbon">${labels.title}</div>
    </header>

    <section class="meta-cards">
      <div class="card customer-card">
        <div class="card-label">${labels.customer}</div>
        <div class="card-value lg">${customer}</div>
        <div class="card-row"><span>${labels.phone}</span><strong dir="ltr">${phone}</strong></div>
      </div>
      <div class="card">
        <div class="card-label">${labels.preparedBy}</div>
        <div class="card-value">${employee}</div>
        <div class="card-row"><span>${labels.employeeCode}</span><strong dir="ltr">${empCode}</strong></div>
      </div>
      <div class="card">
        <div class="card-label">${labels.validUntil}</div>
        <div class="card-value">${valid}</div>
        <div class="card-row"><span>${labels.branch}</span><strong>${branch}</strong></div>
      </div>
      <div class="card stats-card">
        <div class="stat"><span>${labels.itemsCount}</span><strong>${items}</strong></div>
        <div class="stat"><span>${labels.qtyTotal}</span><strong>${qty}</strong></div>
      </div>
    </section>

    <section class="table-wrap">
      <table class="items">
        <thead>
          <tr>
            <th>#</th>
            <th>${labels.colCode}</th>
            <th>${labels.colName}</th>
            <th>${labels.colSize}</th>
            <th>${labels.colColor}</th>
            <th>${labels.colQty}</th>
            <th>${labels.colPrice}</th>
            <th>${labels.colDisc}</th>
            <th>${labels.colTotal}</th>
          </tr>
        </thead>
        <tbody>${lineRowsA4(doc) || `<tr><td colspan="9" class="empty">—</td></tr>`}</tbody>
      </table>
    </section>

    <section class="bottom">
      <div class="terms">
        <h3>${labels.termsTitle}</h3>
        <ul>
          <li>${labels.term1}</li>
          <li>${labels.term2}</li>
          <li>${labels.term3}</li>
        </ul>
        ${notes !== '—' ? `<div class="notes-inline"><strong>${labels.notes}:</strong> ${notes}</div>` : ''}
      </div>
      <div class="totals-box">
        <table class="totals"><tbody>${summaryRows(doc, labels)}</tbody></table>
      </div>
    </section>

    <section class="signatures">
      <div class="sig"><div class="sig-label">${labels.signatureSeller}</div><div class="sig-line">${employee}</div></div>
      <div class="sig"><div class="sig-label">${labels.signatureCustomer}</div><div class="sig-line">${customer}</div></div>
    </section>

    <footer class="foot">
      <div class="gold-line"></div>
      <p>${meta.companyName} · ${branch} · ${doc.code} · ${created}</p>
    </footer>
  </div>`;
}

function buildReceiptBody(
  doc: SalesQuotationDto,
  meta: QuotationPrintMeta,
  labels: QuotationPrintLabels,
  locale: string,
) {
  const created = formatDate(doc.created_at, locale);
  const customer = doc.customer_name?.trim() || (locale === 'ar' ? 'عميل نقدي' : 'Walk-in');
  const phone = meta.customerPhone?.trim() || '—';
  const branch = doc.branch_name || meta.branchName;
  const employee = meta.sellerName || meta.userName || '—';

  return `
  <div class="rcpt">
    <div class="rcpt-brand">${meta.companyName}</div>
    <div class="rcpt-branch">${branch}</div>
    <div class="rcpt-badge">${labels.title}</div>
    <div class="rcpt-code">${doc.code}</div>
    <div class="rcpt-meta">
      <div><b>${labels.date}:</b> ${created}</div>
      <div><b>${labels.customer}:</b> ${customer}</div>
      ${phone !== '—' ? `<div><b>${labels.phone}:</b> <span dir="ltr">${phone}</span></div>` : ''}
      <div><b>${labels.preparedBy}:</b> ${employee}</div>
      <div><b>${labels.itemsCount}:</b> ${(doc.lines ?? []).length} · <b>${labels.qtyTotal}:</b> ${qtyTotal(doc)}</div>
    </div>
    <table class="rcpt-items">
      <thead><tr><th>${labels.colName}</th><th>${labels.colQty}</th><th>${labels.colPrice}</th><th>${labels.colTotal}</th></tr></thead>
      <tbody>${lineRowsReceipt(doc)}</tbody>
    </table>
    <table class="rcpt-totals"><tbody>${summaryRows(doc, labels)}</tbody></table>
    <div class="rcpt-foot">${labels.term1}</div>
  </div>`;
}

const A4_STYLES = `
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Times New Roman', 'Segoe UI', Tahoma, Arial, sans-serif;
    color: #0c1e3c;
    background: PREVIEW_BG;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .toolbar {
    text-align: center; padding: 16px; background: #0f172a;
    position: sticky; top: 0; z-index: 99;
  }
  .toolbar button {
    padding: 12px 28px; font-size: 15px; font-weight: 800; border-radius: 10px;
    border: none; cursor: pointer; background: linear-gradient(135deg,#c9a227,#e8c547);
    color: #0c1e3c; box-shadow: 0 4px 14px rgba(201,162,39,.4);
  }
  .sheet {
    position: relative; max-width: 210mm; margin: 0 auto;
    background: #fff; overflow: hidden;
    box-shadow: PREVIEW_SHADOW;
  }
  .wm {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    font-size: 120px; font-weight: 900; color: rgba(12,30,60,.04);
    letter-spacing: .2em; pointer-events: none; z-index: 0; transform: rotate(-18deg);
  }
  .head { position: relative; background: linear-gradient(135deg,#0c1e3c 0%,#1a365d 40%,#1e40af 100%); color: #fff; z-index: 1; }
  .head-accent { height: 5px; background: linear-gradient(90deg,#c9a227,#f0d875,#c9a227); }
  .head-inner { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; padding: 24px 28px 16px; }
  .brand-block { display: flex; align-items: center; gap: 16px; }
  .logo {
    width: 64px; height: 64px; border-radius: 50%;
    background: linear-gradient(135deg,#c9a227,#f5e6a3); color: #0c1e3c;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; font-weight: 900; border: 3px solid rgba(255,255,255,.3);
    box-shadow: 0 4px 20px rgba(0,0,0,.25);
  }
  .company { font-size: 24px; font-weight: 900; letter-spacing: -.02em; }
  .branch { margin-top: 4px; font-size: 13px; opacity: .88; }
  .doc-block { text-align: left; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.2); border-radius: 12px; padding: 14px 18px; min-width: 180px; }
  .doc-kind { font-size: 10px; letter-spacing: .15em; opacity: .8; }
  .doc-code { font-size: 26px; font-weight: 900; font-family: monospace; margin-top: 4px; color: #f5e6a3; }
  .doc-dates { margin-top: 8px; font-size: 11px; opacity: .9; display: flex; flex-direction: column; gap: 2px; }
  .title-ribbon {
    text-align: center; padding: 12px; font-size: 28px; font-weight: 900;
    letter-spacing: .25em; background: rgba(0,0,0,.2);
    border-top: 1px solid rgba(255,255,255,.15);
  }
  .meta-cards {
    display: grid; grid-template-columns: 1.2fr 1fr 1fr .8fr; gap: 12px;
    padding: 20px 24px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; z-index: 1; position: relative;
  }
  .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; }
  .customer-card { border-color: #c9a227; border-width: 2px; background: linear-gradient(135deg,#fffbeb,#fff); }
  .card-label { font-size: 9px; font-weight: 800; letter-spacing: .1em; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
  .card-value { font-size: 15px; font-weight: 800; color: #0c1e3c; }
  .card-value.lg { font-size: 18px; color: #1e3a8a; }
  .card-row { margin-top: 8px; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; gap: 8px; }
  .card-row strong { color: #0f172a; font-weight: 800; }
  .stats-card { display: flex; flex-direction: column; justify-content: center; gap: 8px; background: #eff6ff; }
  .stat { display: flex; justify-content: space-between; font-size: 12px; }
  .stat strong { font-size: 18px; color: #1d4ed8; }
  .table-wrap { padding: 0 24px; z-index: 1; position: relative; }
  table.items { width: 100%; border-collapse: collapse; font-size: 12px; font-weight: 700; margin-top: 16px; }
  table.items th {
    background: linear-gradient(180deg,#0c1e3c,#1e3a8a); color: #fff;
    padding: 10px 6px; font-size: 10px; font-weight: 900; border: 1px solid #0c1e3c;
  }
  table.items td { border: 1px solid #cbd5e1; padding: 8px 6px; text-align: center; vertical-align: middle; }
  table.items tr.even td { background: #f8fafc; }
  table.items tr.odd td { background: #fff; }
  table.items td.name { text-align: right; min-width: 120px; font-weight: 800; }
  table.items td.code { font-family: monospace; color: #1d4ed8; font-size: 11px; }
  table.items td.num { font-variant-numeric: tabular-nums; direction: ltr; }
  table.items td.qty { font-weight: 900; font-size: 14px; }
  table.items td.total { font-weight: 900; color: #0c1e3c; background: #eff6ff !important; }
  table.items td.seq { color: #94a3b8; font-weight: 900; }
  .bottom { display: grid; grid-template-columns: 1.15fr .85fr; gap: 18px; padding: 20px 24px 8px; z-index: 1; position: relative; }
  .terms { padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 11px; line-height: 1.75; color: #475569; }
  .terms h3 { font-size: 13px; color: #0c1e3c; margin-bottom: 8px; border-bottom: 2px solid #c9a227; padding-bottom: 6px; }
  .terms ul { padding-right: 18px; margin: 0; }
  .notes-inline { margin-top: 12px; padding-top: 10px; border-top: 1px dashed #cbd5e1; font-size: 12px; color: #334155; }
  .totals-box { border: 3px solid #0c1e3c; border-radius: 12px; overflow: hidden; }
  table.totals { width: 100%; border-collapse: collapse; }
  table.totals td { padding: 11px 16px; font-size: 14px; border-bottom: 1px solid #e2e8f0; }
  table.totals .lbl { text-align: right; font-weight: 700; color: #475569; }
  table.totals .val { text-align: left; font-weight: 900; direction: ltr; font-variant-numeric: tabular-nums; }
  table.totals .disc { color: #dc2626; }
  table.totals tr.grand td { background: linear-gradient(135deg,#eff6ff,#dbeafe); font-size: 20px; color: #0c1e3c; border: none; padding: 16px; }
  table.totals .cur { font-size: 13px; color: #64748b; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; padding: 24px 28px 28px; z-index: 1; position: relative; }
  .sig-label { font-size: 11px; font-weight: 800; color: #64748b; margin-bottom: 36px; }
  .sig-line { border-top: 2px solid #0c1e3c; padding-top: 8px; font-size: 12px; color: #334155; font-weight: 700; }
  .foot { padding: 0 24px 20px; text-align: center; z-index: 1; position: relative; }
  .gold-line { height: 3px; background: linear-gradient(90deg,transparent,#c9a227,transparent); margin-bottom: 10px; }
  .foot p { font-size: 10px; color: #94a3b8; }
  @media print {
    body { background: #fff !important; }
    .toolbar { display: none !important; }
    .sheet { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; }
  }
`;

const RECEIPT_STYLES = `
  @page { margin: 2mm; size: 80mm auto; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Tahoma, sans-serif; font-size: 11px; width: 76mm; padding: 3mm; color: #0c1e3c; background: PREVIEW_BG; }
  .toolbar { text-align: center; padding: 10px; background: #0c1e3c; }
  .toolbar button { padding: 10px 20px; font-weight: 800; border-radius: 8px; border: none; background: #c9a227; color: #0c1e3c; cursor: pointer; }
  .rcpt-brand { text-align: center; font-weight: 900; font-size: 14px; }
  .rcpt-branch { text-align: center; font-size: 10px; color: #475569; margin-bottom: 6px; }
  .rcpt-badge { text-align: center; font-size: 11px; font-weight: 800; color: #1d4ed8; letter-spacing: .1em; }
  .rcpt-code { text-align: center; font-size: 16px; font-weight: 900; font-family: monospace; margin: 4px 0 8px; border: 2px solid #0c1e3c; border-radius: 6px; padding: 4px; }
  .rcpt-meta { font-size: 9px; line-height: 1.6; margin-bottom: 8px; border-bottom: 1px dashed #94a3b8; padding-bottom: 6px; }
  .rcpt-meta b { font-weight: 800; }
  table.rcpt-items { width: 100%; border-collapse: collapse; }
  table.rcpt-items th, table.rcpt-items td { border-bottom: 1px dashed #cbd5e1; padding: 3px 2px; vertical-align: top; font-size: 9px; }
  table.rcpt-items th { font-weight: 800; text-align: center; }
  table.rcpt-items .name { text-align: right; width: 46%; }
  table.rcpt-items .sku { color: #64748b; font-size: 8px; }
  table.rcpt-items .qty, table.rcpt-items .price { text-align: center; font-weight: 800; }
  table.rcpt-items .amt { text-align: left; font-weight: 900; direction: ltr; }
  table.rcpt-totals { width: 100%; margin-top: 6px; }
  table.rcpt-totals td { padding: 3px 0; font-size: 10px; border: none; }
  table.rcpt-totals .lbl { text-align: right; font-weight: 700; }
  table.rcpt-totals .val { text-align: left; font-weight: 900; direction: ltr; }
  table.rcpt-totals tr.grand td { border-top: 2px solid #0c1e3c; padding-top: 5px; font-size: 13px; }
  .rcpt-foot { text-align: center; font-size: 8px; color: #64748b; margin-top: 8px; line-height: 1.4; }
  @media print { body { background: #fff !important; } .toolbar { display: none !important; } }
`;

export function buildPosQuotationPrintHtml(
  doc: SalesQuotationDto,
  meta: QuotationPrintMeta,
  format: QuotationPrintFormat,
  labels: QuotationPrintLabels = DEFAULT_LABELS_AR,
  preview = false,
): string {
  const locale = meta.locale || 'ar';
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const previewBg = preview ? 'transparent' : format === 'a4' ? '#e8ecf1' : '#f1f5f9';
  const previewShadow = preview ? 'none' : '0 24px 60px rgba(12,30,60,.15)';

  const styles = (format === 'a4' ? A4_STYLES : RECEIPT_STYLES)
    .replace(/PREVIEW_BG/g, previewBg)
    .replace(/PREVIEW_SHADOW/g, previewShadow);

  const body = format === 'a4'
    ? buildA4Body(doc, meta, labels, locale)
    : buildReceiptBody(doc, meta, labels, locale);

  const toolbar = preview
    ? ''
    : `<div class="toolbar no-print"><button type="button" onclick="window.print()">${format === 'a4' ? labels.printA4 : labels.printReceipt}</button></div>`;

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="utf-8"/>
  <title>${labels.title} — ${doc.code}</title>
  <style>${styles}</style>
</head>
<body>
  ${toolbar}
  ${body}
</body>
</html>`;
}

export function openPosQuotationPrint(
  doc: SalesQuotationDto,
  meta: QuotationPrintMeta,
  format: QuotationPrintFormat,
  labels?: QuotationPrintLabels,
) {
  const html = buildPosQuotationPrintHtml(doc, meta, format, labels, false);
  const win = window.open('', '_blank', 'noopener,noreferrer,width=980,height=900');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
}
