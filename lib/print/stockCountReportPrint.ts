import type { StockCountDto } from '@/lib/api/inventory';

export function printStockCountReport(
  count: StockCountDto,
  opts: { title: string; isRtl: boolean; labels: Record<string, string> },
) {
  const { title, isRtl, labels } = opts;
  const dir = isRtl ? 'rtl' : 'ltr';
  const rows = count.lines
    .map((ln, i) => {
      const variance = parseFloat(ln.variance) || 0;
      const rowClass = variance !== 0 ? 'var' : '';
      return `<tr class="${rowClass}">
        <td>${i + 1}</td>
        <td>${ln.section_name || '—'}</td>
        <td>${ln.product_name} ${ln.size_name}/${ln.color_name}</td>
        <td class="num">${parseFloat(ln.sale_price).toFixed(2)}</td>
        <td class="num">${parseFloat(ln.system_qty).toFixed(2)}</td>
        <td class="num actual">${parseFloat(ln.counted_qty).toFixed(2)}</td>
        <td class="num">${parseFloat(ln.variance).toFixed(2)}</td>
        <td class="num">${parseFloat(ln.variance_value).toFixed(2)}</td>
        <td class="num">${parseFloat(ln.count_value).toFixed(2)}</td>
      </tr>`;
    })
    .join('');

  const shortage = count.lines.filter((l) => parseFloat(l.variance) < 0);
  const surplus = count.lines.filter((l) => parseFloat(l.variance) > 0);

  const html = `<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8"/>
<title>${title}</title>
<style>
  body{font-family:'Times New Roman',serif;font-weight:bold;padding:16px;font-size:12px}
  h2{text-align:center;margin:0 0 8px}
  .meta{margin-bottom:12px;line-height:1.6}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #333;padding:4px 6px}
  th{background:#1e40af;color:#fff}
  td.num{text-align:end}
  td.actual{background:#fed7aa}
  tr.var{background:#fef3c7}
  .summary{margin-top:12px}
</style></head><body>
<h2>${title}</h2>
<div class="meta">
  <div><b>${labels.docNo}:</b> ${count.code}</div>
  <div><b>${labels.warehouse}:</b> ${count.warehouse_name}</div>
  <div><b>${labels.mode}:</b> ${count.count_mode_label || count.count_mode}</div>
  ${count.scan_order_code ? `<div><b>${labels.order}:</b> ${count.scan_order_code}</div>` : ''}
  <div><b>${labels.date}:</b> ${count.created_at.slice(0, 10)}</div>
</div>
<table>
<thead><tr>
  <th>#</th><th>${labels.section}</th><th>${labels.product}</th>
  <th>${labels.salePrice}</th><th>${labels.bookQty}</th><th>${labels.actualQty}</th>
  <th>${labels.variance}</th><th>${labels.varianceValue}</th><th>${labels.countValue}</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>
<div class="summary">
  <p><b>${labels.shortageItems}:</b> ${shortage.length} &nbsp; <b>${labels.surplusItems}:</b> ${surplus.length}</p>
  <p><b>${labels.totalVariance}:</b> ${parseFloat(count.total_variance_value || '0').toFixed(2)}</p>
  ${count.addition_code ? `<p><b>${labels.additionVoucher}:</b> ${count.addition_code}</p>` : ''}
  ${count.disbursement_code ? `<p><b>${labels.disbursementVoucher}:</b> ${count.disbursement_code}</p>` : ''}
</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
