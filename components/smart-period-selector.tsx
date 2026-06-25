import { CalendarDays, ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';

type PeriodKey = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: 'today', label: 'اليوم' },
  { key: 'yesterday', label: 'أمس' },
  { key: 'week', label: 'هذا الأسبوع' },
  { key: 'month', label: 'هذا الشهر' },
  { key: 'custom', label: 'مخصص' },
];

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function periodRange(period: PeriodKey) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (period === 'yesterday') {
    start.setDate(now.getDate() - 1);
    end.setDate(now.getDate() - 1);
  }

  if (period === 'week') {
    const day = now.getDay() || 7;
    start.setDate(now.getDate() - day + 1);
  }

  if (period === 'month') {
    start.setDate(1);
  }

  return `${isoDate(start)} - ${isoDate(end)}`;
}

export function SmartPeriodSelector() {
  const [period, setPeriod] = useState<PeriodKey>('today');
  const [customFrom, setCustomFrom] = useState(() => isoDate(new Date()));
  const [customTo, setCustomTo] = useState(() => isoDate(new Date()));
  const selected = PERIODS.find((item) => item.key === period) ?? PERIODS[0];
  const range = useMemo(
    () => (period === 'custom' ? `${customFrom} - ${customTo}` : periodRange(period)),
    [customFrom, customTo, period],
  );

  return (
    <div className="smart-period-selector hidden items-center gap-2 rounded-xl border border-white/15 bg-white/10 p-1 text-white shadow-sm backdrop-blur md:flex">
      <span className="smart-period-range text-[11px] font-semibold text-white/80">{range}</span>
      <div className="relative">
        <select
          value={period}
          onChange={(event) => setPeriod(event.target.value as PeriodKey)}
          className="smart-period-select h-8 appearance-none rounded-lg border border-white/15 bg-white/15 pe-8 ps-3 text-xs font-extrabold text-white outline-none transition hover:bg-white/20"
          title="اختيار الفترة"
        >
          {PERIODS.map((item) => (
            <option key={item.key} value={item.key} className="bg-slate-900 text-white">
              {item.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute end-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/75" />
      </div>
      <CalendarDays className="smart-period-calendar h-4 w-4 text-blue-100" />
      {period === 'custom' && (
        <div className="hidden items-center gap-1 xl:flex">
          <input
            type="date"
            value={customFrom}
            onChange={(event) => setCustomFrom(event.target.value)}
            className="h-8 w-32 rounded-lg border border-white/15 bg-white/15 px-2 text-[11px] font-bold text-white outline-none"
            aria-label="من تاريخ"
          />
          <input
            type="date"
            value={customTo}
            onChange={(event) => setCustomTo(event.target.value)}
            className="h-8 w-32 rounded-lg border border-white/15 bg-white/15 px-2 text-[11px] font-bold text-white outline-none"
            aria-label="إلى تاريخ"
          />
        </div>
      )}
      <span className="sr-only">{selected.label}</span>
    </div>
  );
}
