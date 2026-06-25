export type YearMonth = { year: number; month: number };

export function currentYearMonth(): YearMonth {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function nextYearMonth(base?: YearMonth): YearMonth {
  const { year, month } = base ?? currentYearMonth();
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

function periodIndex({ year, month }: YearMonth): number {
  return year * 12 + month;
}

export function isAllowedPayPeriod(year: number, month: number): boolean {
  const current = periodIndex(currentYearMonth());
  const next = periodIndex(nextYearMonth());
  const p = periodIndex({ year, month });
  return p >= current && p <= next;
}

export function addMonths(year: number, month: number, offset: number): YearMonth {
  const idx = year * 12 + (month - 1) + offset;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export function splitEqualInstallments(total: number, months: number): number[] {
  if (months < 1 || total <= 0) return [];
  const base = Math.floor((total / months) * 100) / 100;
  const amounts = Array.from({ length: months }, () => base);
  const sum = amounts.reduce((s, v) => s + v, 0);
  const remainder = Math.round((total - sum) * 100) / 100;
  if (remainder !== 0) amounts[amounts.length - 1] = Math.round((amounts[amounts.length - 1] + remainder) * 100) / 100;
  return amounts;
}

export function formatYearMonth(year: number, month: number, locale: 'ar' | 'en'): string {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });
}

export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
