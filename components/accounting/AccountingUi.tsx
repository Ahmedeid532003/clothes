import React from 'react';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { formatMoneyLocale } from '@/lib/money';
import { Button } from '@/components/ui/button';

export function appNavigate(tab: string) {
  window.dispatchEvent(new CustomEvent('app:navigate', { detail: tab }));
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  approved: 'bg-sky-50 text-sky-800 border-sky-200',
  posted: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  cancelled: 'bg-red-50 text-red-800 border-red-200',
  void: 'bg-red-50 text-red-800 border-red-200',
  open: 'bg-violet-50 text-violet-800 border-violet-200',
  closed: 'bg-amber-50 text-amber-800 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  sender_signed: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  pending_review: 'bg-amber-50 text-amber-800 border-amber-200',
  received: 'bg-teal-50 text-teal-800 border-teal-200',
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}
    >
      {label}
    </span>
  );
}

export function AlertBanner({
  variant,
  children,
}: {
  variant: 'error' | 'warning' | 'info' | 'success';
  children: React.ReactNode;
}) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    info: 'border-blue-200 bg-blue-50 text-blue-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  };
  return <div className={`rounded-xl border px-4 py-3 text-sm ${styles[variant]}`}>{children}</div>;
}

export function PageToolbar({
  onRefresh,
  children,
}: {
  onRefresh?: () => void;
  children?: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {onRefresh && (
        <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
          <span className="sr-only">{t('inventory.loading')}</span>
        </Button>
      )}
      {children}
    </div>
  );
}

export function DataCard({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden ${className}`}>
      {title ? (
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-2.5">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function DataTable({ children, minWidth = '720px' }: { children: React.ReactNode; minWidth?: string }) {
  return (
    <div className="enterprise-table-wrap overflow-x-auto">
      <table className="enterprise-data-grid w-full text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="enterprise-data-grid-head bg-slate-50/90 text-slate-600">
      <tr>{children}</tr>
    </thead>
  );
}

export function Th({ children, align = 'start' }: { children: React.ReactNode; align?: 'start' | 'end' }) {
  return (
    <th
      className={`px-3 py-2.5 font-bold text-xs uppercase tracking-wide ${align === 'end' ? 'text-end' : 'text-start'}`}
    >
      {children}
    </th>
  );
}

export function PageSectionHeader({
  icon,
  title,
  description,
  actions,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex gap-3 items-start">
        <div className="rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-2.5 text-white shadow-md">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          {description ? <p className="text-sm text-slate-500 mt-0.5 max-w-2xl">{description}</p> : null}
        </div>
      </div>
      {actions}
    </div>
  );
}

export function LinkAction({
  label,
  tab,
}: {
  label: string;
  tab: string;
}) {
  const { isRtl } = useLanguage();
  return (
    <button
      type="button"
      onClick={() => appNavigate(tab)}
      className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 hover:underline"
    >
      {label}
      <ChevronLeft className={`h-3 w-3 ${isRtl ? '' : 'rotate-180'}`} />
    </button>
  );
}

export function fmtMoney(value: string | number | undefined) {
  return formatMoneyLocale(value, 'ar');
}
