import React from 'react';
import { RefreshCw, UserCircle } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { fmtMoney } from '@/components/accounting/AccountingUi';
import { ErpSearchBar } from '@/components/erp/ErpSearchBar';
import { cn } from '@/lib/utils';

export function CustomersModuleLayout({ children }: { children: React.ReactNode }) {
  return <div className="space-y-5 max-w-[1800px] mx-auto pb-8">{children}</div>;
}

export function CrmKpiCard({
  label,
  value,
  sub,
  icon,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'danger' | 'warn' | 'ok' | 'info';
}) {
  const tones = {
    default: 'from-white to-slate-50 border-slate-200',
    danger: 'from-red-50 to-white border-red-200',
    warn: 'from-amber-50 to-white border-amber-200',
    ok: 'from-emerald-50 to-white border-emerald-200',
    info: 'from-blue-50 to-white border-blue-200',
  };
  const iconTones = {
    default: 'bg-slate-100 text-slate-700',
    danger: 'bg-red-100 text-red-700',
    warn: 'bg-amber-100 text-amber-800',
    ok: 'bg-emerald-100 text-emerald-800',
    info: 'bg-blue-100 text-blue-800',
  };
  return (
    <div
      className={cn(
        'rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition hover:shadow-md',
        tones[tone],
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</p>
        {icon ? (
          <span className={cn('rounded-lg p-2', iconTones[tone])}>{icon}</span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

export function CrmPageHeader({
  title,
  description,
  actions,
  badge,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: string;
}) {
  return (
    <header className="crm-page-header erp-module-topbar">
      {badge ? <span className="erp-module-topbar-badge">{badge}</span> : null}
      <div className="relative z-[1] flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
        {actions}
      </div>
    </header>
  );
}

export function CrmToolbar({
  search,
  onSearch,
  searchPlaceholder,
  children,
  onRefresh,
}: {
  search?: string;
  onSearch?: (v: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
  onRefresh?: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-2 shadow-sm">
      {onSearch !== undefined ? (
        <ErpSearchBar
          className="min-w-[220px] flex-1"
          value={search ?? ''}
          onChange={onSearch}
          placeholder={searchPlaceholder ?? t('customers.search')}
          showAdvanced={false}
        />
      ) : null}
      {children}
      {onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          title={t('customers.refresh')}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

export function CrmDataCard({
  title,
  children,
  className = '',
  noPadding,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden',
        className,
      )}
    >
      {title ? (
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        </div>
      ) : null}
      <div className={noPadding ? '' : 'p-0'}>{children}</div>
    </div>
  );
}

export function CrmTableWrap({ children, minWidth = '720px' }: { children: React.ReactNode; minWidth?: string }) {
  return (
    <div className="enterprise-table-wrap overflow-x-auto">
      <table className="enterprise-data-grid w-full text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function CrmThead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="enterprise-data-grid-head bg-slate-50/95 text-slate-600 border-b">
      <tr>{children}</tr>
    </thead>
  );
}

export function CrmTh({ children, align = 'start' }: { children: React.ReactNode; align?: 'start' | 'end' }) {
  return (
    <th
      className={cn(
        'px-4 py-3 font-bold text-[11px] uppercase tracking-wider',
        align === 'end' ? 'text-end' : 'text-start',
      )}
    >
      {children}
    </th>
  );
}

export function CustomerTypeBadge({ slug }: { slug: string }) {
  const { t } = useLanguage();
  const map: Record<string, string> = {
    shop: 'bg-violet-100 text-violet-800 ring-violet-200',
    individual: 'bg-sky-100 text-sky-800 ring-sky-200',
    establishment: 'bg-slate-100 text-slate-800 ring-slate-200',
  };
  const label =
    slug === 'shop'
      ? t('customers.shopForm').split('(')[0].trim()
      : slug === 'individual'
        ? t('customers.individualForm').split('(')[0].trim()
        : slug;
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ring-1',
        map[slug] ?? map.establishment,
      )}
    >
      {label}
    </span>
  );
}

export function RiskBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    critical: 'bg-red-600 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-amber-400 text-amber-950',
    low: 'bg-slate-200 text-slate-700',
  };
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', styles[level] ?? styles.low)}>
      {level}
    </span>
  );
}

export function CrmEmpty({ message }: { message: string }) {
  return (
    <div className="py-16 text-center">
      <UserCircle className="h-12 w-12 mx-auto text-slate-300 mb-3" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function CrmFormulaBanner({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-indigo-200/60 bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-3 text-sm font-mono text-indigo-950 shadow-sm">
      {text}
    </div>
  );
}

export function crmSelectClass() {
  return 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25';
}

export function listStats(rows: { total_sales?: string; balance_due?: string }[]) {
  let sales = 0;
  let due = 0;
  for (const r of rows) {
    sales += Number(r.total_sales ?? 0);
    due += Number(r.balance_due ?? 0);
  }
  return { count: rows.length, sales: fmtMoney(sales), due: fmtMoney(due) };
}
