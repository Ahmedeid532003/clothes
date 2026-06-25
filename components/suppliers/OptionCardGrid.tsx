import React from 'react';
import { cn } from '@/lib/utils';

export type OptionCardItem = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  badge?: string;
};

type Props = {
  options: OptionCardItem[];
  value: string;
  onChange: (id: string) => void;
  columns?: 2 | 3 | 5;
};

export function OptionCardGrid({ options, value, onChange, columns = 3 }: Props) {
  const gridClass =
    columns === 5
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
      : columns === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={cn('grid gap-2', gridClass)}>
      {options.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              'rounded-xl border p-3 text-start transition-all',
              selected
                ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200'
                : 'border-slate-200 bg-white hover:border-slate-300',
            )}
          >
            {opt.badge && (
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                {opt.badge}
              </span>
            )}
            <p className="font-semibold text-sm text-slate-900 mt-0.5">{opt.title}</p>
            {opt.subtitle && <p className="text-xs text-blue-700">{opt.subtitle}</p>}
            {opt.description && (
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{opt.description}</p>
            )}
          </button>
        );
      })}
    </div>
  );
}
