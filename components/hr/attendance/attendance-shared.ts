import type { AttendancePeriod, AttendanceRow } from '@/lib/api/hr-payroll';

export function emptyPeriods(): AttendancePeriod[] {
  return [
    { check_in: null, check_out: null },
    { check_in: null, check_out: null },
    { check_in: null, check_out: null },
  ];
}

export function normalizePeriods(row?: Pick<AttendanceRow, 'periods' | 'check_in' | 'check_out'>): AttendancePeriod[] {
  const stored = row?.periods;
  if (Array.isArray(stored) && stored.length) {
    const periods = emptyPeriods();
    stored.slice(0, 3).forEach((p, i) => {
      periods[i] = {
        check_in: p?.check_in || null,
        check_out: p?.check_out || null,
      };
    });
    return periods;
  }
  const periods = emptyPeriods();
  if (row?.check_in || row?.check_out) {
    periods[0] = { check_in: row.check_in, check_out: row.check_out };
  }
  return periods;
}

export function formatDisplayTime(value: string | null | undefined): string {
  if (!value) return '--';
  const raw = value.length >= 5 ? value.slice(0, 5) : value;
  const [hStr, mStr] = raw.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return raw;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${suffix} ${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function sourceLabel(source: string, isRtl: boolean): string {
  if (source === 'fingerprint') return isRtl ? 'بصمة إلكترونية' : 'Biometric Fingerprint';
  if (source === 'import') return isRtl ? 'استيراد بصمة' : 'Fingerprint Import';
  return isRtl ? 'تسجيل يدوي من البوابة' : 'Manual Portal Log';
}

export function statusLabel(row: AttendanceRow, isRtl: boolean): string {
  const periods = normalizePeriods(row);
  const active = periods.some((p) => p.check_in && !p.check_out);
  const filled = periods.filter((p) => p.check_in || p.check_out).length;
  if (active) return isRtl ? 'فترة نشطة' : 'Active Period';
  if (filled > 1) return isRtl ? 'دوام متعدد الفترات' : 'Multi-Period Duty';
  if (filled === 1 && periods[0].check_in && periods[0].check_out) {
    return isRtl ? 'دوام مكتمل' : 'Active Duty';
  }
  return isRtl ? 'مسجل جزئياً' : 'Partial Log';
}

export function nowTimeHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function applyPunch(periods: AttendancePeriod[], mode: 'in' | 'out', time: string): AttendancePeriod[] {
  const next = periods.map((p) => ({ ...p }));
  if (mode === 'in') {
    for (let i = 0; i < next.length; i++) {
      if (!next[i].check_in) {
        next[i].check_in = time;
        return next;
      }
    }
    return next;
  }
  for (let i = next.length - 1; i >= 0; i--) {
    if (next[i].check_in && !next[i].check_out) {
      next[i].check_out = time;
      return next;
    }
  }
  return next;
}
