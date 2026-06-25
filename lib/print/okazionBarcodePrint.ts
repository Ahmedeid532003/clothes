import type { BarcodeLabelDto } from '@/lib/api/inventory';

/** تنسيق السعر بأرقام إنجليزية — مثل 450.90 */
export function fmtPriceEn(value: string | number | undefined): string {
  const v = typeof value === 'string' ? parseFloat(value) : value ?? 0;
  if (Number.isNaN(v)) return '0.00';
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function labelBlock(lb: BarcodeLabelDto, idx: number): string {
  const scaleBc = lb.scale_barcode || lb.barcode;
  const displayBc = lb.barcode.replace(/\D/g, '') || lb.barcode;
  const oldPrice = fmtPriceEn(lb.sale_price);
  const newPrice = fmtPriceEn(lb.offer_price || lb.sale_price);
  const productLine = `${lb.product_name} ${lb.product_code}`.trim();
  const metaLine = [lb.brand_name, lb.supplier_name].filter(Boolean).join(' · ');

  return `
    <div class="lbl" data-idx="${idx}">
      <div class="branch">${lb.branch_name || ''}</div>
      <div class="product">${productLine}</div>
      ${metaLine ? `<div class="meta">${metaLine}</div>` : ''}
      <svg class="bc-svg" data-bc="${scaleBc}"></svg>
      <div class="bc-num">*${displayBc}*</div>
      <div class="prices">
        <div class="old-price">${oldPrice} ج.م.</div>
        <div class="new-price">${newPrice} ج.م.</div>
      </div>
    </div>`;
}

/** طباعة باركود أوكازيون — مطابق لملصق الموازين (فرع، اسم+موديل، باركود، سعر قديم مشطوب، سعر عرض). */
export function printOkazionBarcodeLabels(labels: BarcodeLabelDto[]): void {
  if (!labels.length) return;

  const items = labels.flatMap((lb, i) => {
    const qty = Math.max(1, Math.round(parseFloat(lb.quantity) || 1));
    return Array.from({ length: qty }, () => ({ ...lb, _idx: i }));
  });

  const labelsHtml = items.map((lb) => labelBlock(lb, lb._idx)).join('');

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8"/>
  <title>Okazion Barcode</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
  <style>
    @page { margin: 2mm; size: 58mm auto; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Arial', 'Tahoma', sans-serif;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .lbl {
      width: 56mm;
      min-height: 42mm;
      margin: 1.5mm auto;
      padding: 2mm 2.5mm 2.5mm;
      text-align: center;
      page-break-inside: avoid;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1mm;
    }
    .branch {
      font-size: 11pt;
      font-weight: 900;
      line-height: 1.15;
      width: 100%;
      word-break: break-word;
    }
    .product {
      font-size: 10pt;
      font-weight: 700;
      line-height: 1.2;
      width: 100%;
      word-break: break-word;
    }
    .meta {
      font-size: 7.5pt;
      color: #333;
      line-height: 1.15;
      width: 100%;
    }
    .bc-svg {
      width: 50mm;
      height: 14mm;
      display: block;
      margin: 1mm 0 0;
    }
    .bc-num {
      font-family: 'Courier New', monospace;
      font-size: 11pt;
      font-weight: 700;
      letter-spacing: 0.5px;
      direction: ltr;
      unicode-bidi: embed;
    }
    .prices {
      margin-top: 1mm;
      direction: ltr;
      unicode-bidi: embed;
      width: 100%;
    }
    .old-price {
      font-size: 11pt;
      font-weight: 700;
      text-decoration: line-through;
      text-decoration-thickness: 2px;
      color: #111;
      line-height: 1.3;
    }
    .new-price {
      font-size: 14pt;
      font-weight: 900;
      color: #000;
      line-height: 1.25;
      margin-top: 0.5mm;
    }
    @media screen {
      .lbl { border: 1px dashed #ccc; }
    }
  </style>
</head>
<body>
  ${labelsHtml}
  <script>
    document.querySelectorAll('.bc-svg').forEach(function(svg) {
      var code = svg.getAttribute('data-bc') || '';
      if (!code) return;
      try {
        JsBarcode(svg, code, {
          format: code.length === 13 ? 'EAN13' : 'CODE128',
          width: code.length === 13 ? 1.6 : 1.4,
          height: 48,
          displayValue: false,
          margin: 0,
          background: '#ffffff',
          lineColor: '#000000'
        });
      } catch (e) {
        try {
          JsBarcode(svg, code, { format: 'CODE128', width: 1.4, height: 48, displayValue: false, margin: 0 });
        } catch (e2) {}
      }
    });
    setTimeout(function() { window.print(); }, 400);
  <\/script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
