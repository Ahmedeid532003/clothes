/** تواريخ محلية — افتراضي «اليوم» عند ترك الحقل فارغاً في عمليات الحفظ. */

/** مفاتيح تاريخ اختيارية — لا تُستبدل بيوم اليوم عند الفراغ */
export const NULLABLE_DATE_KEYS = new Set([
  'end_date',
  'holiday_date',
  'hire_date',
  'from_date',
  'to_date',
  'as_of',
  'week_start',
  'week_end',
  'starts_at',
  'ends_at',
  'offer_starts_at',
  'offer_ends_at',
  'birth_date',
  'due_date',
  'paper_due_date',
  'valid_until',
  'delivery_date',
  'receipt_delivery_date',
  'case_filed_date',
  'legal_case_date',
  'last_payment_date',
  'first_late_due_date',
]);

export function localTodayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isBlankDate(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

function isDateKey(key: string): boolean {
  return key === 'date' || key.endsWith('_date');
}

export function coalesceDate(value: unknown, key?: string): unknown {
  if (key && NULLABLE_DATE_KEYS.has(key)) return value;
  if (isBlankDate(value)) return localTodayIso();
  return value;
}

export function applyDefaultDatesToPayload(payload: unknown): unknown {
  if (payload === null || payload === undefined) return payload;
  if (Array.isArray(payload)) {
    return payload.map((item) => applyDefaultDatesToPayload(item));
  }
  if (typeof payload !== 'object') return payload;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (isDateKey(key)) {
      out[key] = coalesceDate(value, key);
    } else if (value !== null && typeof value === 'object') {
      out[key] = applyDefaultDatesToPayload(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function applyDefaultDatesToFormData(formData: FormData): FormData {
  const next = new FormData();
  for (const [key, value] of formData.entries()) {
    if (isDateKey(key) && typeof value === 'string' && isBlankDate(value)) {
      if (!NULLABLE_DATE_KEYS.has(key)) {
        next.append(key, localTodayIso());
        continue;
      }
    }
    next.append(key, value);
  }
  return next;
}
