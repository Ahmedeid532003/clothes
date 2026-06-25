import type { InvoiceLineDraft } from '@/components/purchases/types';

export function parseLineQuantity(raw: string): number {
  const n = parseFloat(String(raw ?? '').replace(',', '.').trim());
  return Number.isNaN(n) ? 0 : n;
}

/** بنود جاهزة للإرسال للـ API (كمية > 0 وصنف محدد). */
export function linesReadyForSave(lines: InvoiceLineDraft[]): InvoiceLineDraft[] {
  return lines.filter((l) => {
    const q = parseLineQuantity(l.quantity);
    const hasSku = Boolean(
      l.variant || (l.product && l.size && l.color),
    );
    return hasSku && q >= 0.001;
  });
}

export function formatPurchaseApiError(body: unknown): string {
  if (!body || typeof body !== 'object') {
    return typeof body === 'string' ? body : 'خطأ غير متوقع';
  }
  const data = body as Record<string, unknown>;
  if (typeof data.detail === 'string') {
    return data.detail;
  }
  const fieldLabels: Record<string, string> = {
    supplier: 'المورد',
    season: 'الموسم',
    name_ar: 'اسم الصنف',
    size_ids: 'المقاسات',
    color_ids: 'الألوان',
    purchase_price: 'سعر الشراء',
    markup_percent: 'نسبة الربح',
  };
  const fieldMsgs = Object.entries(data)
    .filter(([k]) => k !== 'detail' && k !== 'lines')
    .flatMap(([k, v]) => {
      const label = fieldLabels[k] ?? k;
      if (Array.isArray(v) && v[0]) return [`${label}: ${v[0]}`];
      if (typeof v === 'string' && v) return [`${label}: ${v}`];
      return [];
    });
  if (fieldMsgs.length) {
    return fieldMsgs.join(' | ');
  }
  if (Array.isArray(data.lines)) {
    const parts: string[] = [];
    data.lines.forEach((item, index) => {
      if (!item || typeof item !== 'object') return;
      const row = item as Record<string, string[] | string | undefined>;
      if (Array.isArray(row.quantity) && row.quantity[0]) {
        parts.push(`بند ${index + 1} — الكمية: ${row.quantity[0]}`);
      } else if (typeof row.quantity === 'string') {
        parts.push(`بند ${index + 1} — الكمية: ${row.quantity}`);
      }
      const flat = Object.entries(row).flatMap(([k, v]) => {
        if (k === 'quantity' || !v) return [];
        const msg = Array.isArray(v) ? v[0] : String(v);
        return msg ? [`${k}: ${msg}`] : [];
      });
      if (flat.length) {
        parts.push(`بند ${index + 1}: ${flat.join('، ')}`);
      }
    });
    if (parts.length) {
      return parts.join(' | ');
    }
  }
  try {
    return JSON.stringify(data);
  } catch {
    return 'تحقق من بيانات الفاتورة';
  }
}
