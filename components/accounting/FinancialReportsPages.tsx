import React, { useCallback, useEffect, useState } from 'react';
import {
  BookMarked,
  Download,
  FileSpreadsheet,
  PieChart,
  RefreshCw,
  Scale,
  TrendingUp,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  chartOfAccountsApi,
  downloadReportCsv,
  financialReportsApi,
  type ChartAccountDto,
} from '@/lib/api/accounting';
import { apiFetch } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type BranchOpt = { id: string; name: string };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function yearStartIso() {
  const d = new Date();
  return `${d.getFullYear()}-01-01`;
}

function ReportFilters({
  showAsOf,
  showRange,
  fromDate,
  toDate,
  asOf,
  branch,
  branches,
  onFrom,
  onTo,
  onAsOf,
  onBranch,
  onRun,
  onExport,
  loading,
}: {
  showAsOf?: boolean;
  showRange?: boolean;
  fromDate: string;
  toDate: string;
  asOf: string;
  branch: string;
  branches: BranchOpt[];
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onAsOf: (v: string) => void;
  onBranch: (v: string) => void;
  onRun: () => void;
  onExport?: () => void;
  loading: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className="report-filter-bar flex flex-wrap gap-2 items-end rounded-xl border bg-slate-50/80 p-3">
      {showRange && (
        <>
          <div>
            <label className="text-xs text-slate-500 block mb-0.5">{t('accounting.reportFrom')}</label>
            <Input type="date" className="h-9 w-40" value={fromDate} onChange={(e) => onFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-0.5">{t('accounting.reportTo')}</label>
            <Input type="date" className="h-9 w-40" value={toDate} onChange={(e) => onTo(e.target.value)} />
          </div>
        </>
      )}
      {showAsOf && (
        <div>
          <label className="text-xs text-slate-500 block mb-0.5">{t('accounting.reportAsOf')}</label>
          <Input type="date" className="h-9 w-40" value={asOf} onChange={(e) => onAsOf(e.target.value)} />
        </div>
      )}
      <div>
        <label className="text-xs text-slate-500 block mb-0.5">{t('accounting.colBranch')}</label>
        <select
          className="h-9 rounded-md border px-2 text-sm min-w-[140px]"
          value={branch}
          onChange={(e) => onBranch(e.target.value)}
        >
          <option value="">{t('accounting.allBranches')}</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <Button size="sm" onClick={onRun} disabled={loading}>
        <RefreshCw className={`h-4 w-4 me-1 ${loading ? 'animate-spin' : ''}`} />
        {t('accounting.runReport')}
      </Button>
      {onExport && (
        <Button size="sm" variant="outline" onClick={onExport}>
          <Download className="h-4 w-4 me-1" />
          Excel
        </Button>
      )}
    </div>
  );
}

function useBranches() {
  const [branches, setBranches] = useState<BranchOpt[]>([]);
  useEffect(() => {
    apiFetch<{ id: string; name_ar?: string; code?: string }[]>('/organization/branches/')
      .then((br) => setBranches(br.map((b) => ({ id: b.id, name: b.name_ar || b.code || b.id }))))
      .catch(() => setBranches([]));
  }, []);
  return branches;
}

function fmt(n: string | number | undefined) {
  const v = Number(n ?? 0);
  return v.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TrialBalancePage() {
  const { t } = useLanguage();
  const branches = useBranches();
  const [fromDate, setFromDate] = useState(yearStartIso());
  const [toDate, setToDate] = useState(todayIso());
  const [branch, setBranch] = useState('');
  const [data, setData] = useState<{
    rows?: { code: string; name_ar: string; debit: string; credit: string; balance: string }[];
    total_debit?: string;
    total_credit?: string;
    is_balanced?: boolean;
    difference?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financialReportsApi.trialBalance({
        from_date: fromDate,
        to_date: toDate,
        branch: branch || undefined,
      });
      setData(res as typeof data);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, branch]);

  useEffect(() => {
    run();
  }, []);

  return (
    <ReportShell
      icon={<Scale className="h-7 w-7 text-blue-800" />}
      title={t('nav.trialBalance')}
      desc={t('accounting.trialBalanceDesc')}
    >
      <ReportFilters
        showRange
        fromDate={fromDate}
        toDate={toDate}
        asOf={toDate}
        branch={branch}
        branches={branches}
        onFrom={setFromDate}
        onTo={setToDate}
        onAsOf={() => {}}
        onBranch={setBranch}
        onRun={run}
        loading={loading}
        onExport={() =>
          downloadReportCsv('trial_balance', { from_date: fromDate, to_date: toDate, branch }, 'trial-balance.csv')
        }
      />
      {data && (
        <div
          className={`text-sm font-medium px-3 py-2 rounded-lg ${data.is_balanced ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}
        >
          {data.is_balanced ? t('accounting.balancedOk') : `${t('accounting.unbalanced')} ${data.difference}`}
        </div>
      )}
      <ReportTable
        headers={[t('accounting.account'), t('accounting.debit'), t('accounting.credit'), t('accounting.balance')]}
        rows={(data?.rows ?? []).map((r) => [r.code, r.name_ar, fmt(r.debit), fmt(r.credit), fmt(r.balance)])}
        footer={
          data
            ? [
                t('accounting.totals'),
                fmt(data.total_debit),
                fmt(data.total_credit),
                '',
              ]
            : undefined
        }
        loading={loading}
      />
    </ReportShell>
  );
}

export function BalanceSheetPage() {
  const { t } = useLanguage();
  const branches = useBranches();
  const [asOf, setAsOf] = useState(todayIso());
  const [branch, setBranch] = useState('');
  const [data, setData] = useState<{
    assets?: { code: string; name_ar: string; balance: string }[];
    liabilities?: { code: string; name_ar: string; balance: string }[];
    equity?: { code: string; name_ar: string; balance: string }[];
    total_assets?: string;
    total_liabilities?: string;
    total_equity?: string;
    total_liabilities_equity?: string;
    equation_balanced?: boolean;
    equation?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financialReportsApi.balanceSheet({ as_of: asOf, branch: branch || undefined });
      setData(res as typeof data);
    } finally {
      setLoading(false);
    }
  }, [asOf, branch]);

  useEffect(() => {
    run();
  }, []);

  return (
    <ReportShell
      icon={<PieChart className="h-7 w-7 text-blue-800" />}
      title={t('nav.balanceSheet')}
      desc={t('accounting.balanceSheetDesc')}
    >
      <ReportFilters
        showAsOf
        fromDate={asOf}
        toDate={asOf}
        asOf={asOf}
        branch={branch}
        branches={branches}
        onFrom={() => {}}
        onTo={() => {}}
        onAsOf={setAsOf}
        onBranch={setBranch}
        onRun={run}
        loading={loading}
      />
      <p className="text-xs text-slate-600 bg-blue-50 px-3 py-2 rounded-lg">{data?.equation ?? t('accounting.bsEquation')}</p>
      <div className="grid md:grid-cols-3 gap-4">
        <SectionTable title={t('accounting.assets')} rows={data?.assets} total={data?.total_assets} />
        <SectionTable title={t('accounting.liabilities')} rows={data?.liabilities} total={data?.total_liabilities} />
        <SectionTable title={t('accounting.equity')} rows={data?.equity} total={data?.total_equity} />
      </div>
      <div
        className={`rounded-lg p-3 text-sm font-semibold ${data?.equation_balanced ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}
      >
        {t('accounting.assets')}: {fmt(data?.total_assets)} = {t('accounting.liabilitiesPlusEquity')}:{' '}
        {fmt(data?.total_liabilities_equity)}
      </div>
    </ReportShell>
  );
}

function SectionTable({
  title,
  rows,
  total,
}: {
  title: string;
  rows?: { code: string; name_ar: string; balance: string }[];
  total?: string;
}) {
  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <div className="bg-slate-800 text-white px-3 py-2 font-semibold text-sm">{title}</div>
      <table className="w-full text-xs">
        <tbody>
          {(rows ?? []).map((r) => (
            <tr key={r.code} className="border-t">
              <td className="px-2 py-1 font-mono">{r.code}</td>
              <td className="px-2 py-1">{r.name_ar}</td>
              <td className="px-2 py-1 text-end">{fmt(r.balance)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50 font-bold">
          <tr>
            <td colSpan={2} className="px-2 py-2">
              —
            </td>
            <td className="px-2 py-2 text-end">{fmt(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function IncomeStatementPage() {
  const { t } = useLanguage();
  const branches = useBranches();
  const [fromDate, setFromDate] = useState(yearStartIso());
  const [toDate, setToDate] = useState(todayIso());
  const [branch, setBranch] = useState('');
  const [data, setData] = useState<{
    revenues?: { code: string; name_ar: string; amount: string }[];
    expenses?: { code: string; name_ar: string; amount: string }[];
    total_revenue?: string;
    total_expenses?: string;
    net_profit?: string;
    equation?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financialReportsApi.incomeStatement({
        from_date: fromDate,
        to_date: toDate,
        branch: branch || undefined,
      });
      setData(res as typeof data);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, branch]);

  useEffect(() => {
    run();
  }, []);

  return (
    <ReportShell
      icon={<TrendingUp className="h-7 w-7 text-blue-800" />}
      title={t('nav.incomeStatement')}
      desc={t('accounting.incomeStatementDesc')}
    >
      <ReportFilters
        showRange
        fromDate={fromDate}
        toDate={toDate}
        asOf={toDate}
        branch={branch}
        branches={branches}
        onFrom={setFromDate}
        onTo={setToDate}
        onAsOf={() => {}}
        onBranch={setBranch}
        onRun={run}
        loading={loading}
        onExport={() =>
          downloadReportCsv(
            'income_statement',
            { from_date: fromDate, to_date: toDate, branch },
            'income-statement.csv',
          )
        }
      />
      <p className="text-xs text-slate-600 bg-blue-50 px-3 py-2 rounded-lg">{data?.equation ?? t('accounting.isEquation')}</p>
      <div className="grid md:grid-cols-2 gap-4">
        <AmountSection title={t('accounting.revenues')} rows={data?.revenues} total={data?.total_revenue} />
        <AmountSection title={t('accounting.expenses')} rows={data?.expenses} total={data?.total_expenses} />
      </div>
      <div
        className={`rounded-xl p-4 text-lg font-bold ${Number(data?.net_profit) >= 0 ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}
      >
        {t('accounting.netProfit')}: {fmt(data?.net_profit)}
      </div>
    </ReportShell>
  );
}

function AmountSection({
  title,
  rows,
  total,
}: {
  title: string;
  rows?: { code: string; name_ar: string; amount: string }[];
  total?: string;
}) {
  return (
    <div className="rounded-xl border bg-white">
      <div className="bg-slate-100 px-3 py-2 font-semibold text-sm">{title}</div>
      <table className="w-full text-xs">
        <tbody>
          {(rows ?? []).map((r) => (
            <tr key={r.code} className="border-t">
              <td className="px-2 py-1 font-mono">{r.code}</td>
              <td className="px-2 py-1">{r.name_ar}</td>
              <td className="px-2 py-1 text-end">{fmt(r.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="font-bold border-t">
          <tr>
            <td colSpan={2} className="px-2 py-2" />
            <td className="px-2 py-2 text-end">{fmt(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function GeneralLedgerPage() {
  const { t } = useLanguage();
  const branches = useBranches();
  const [accounts, setAccounts] = useState<ChartAccountDto[]>([]);
  const [accountId, setAccountId] = useState('');
  const [fromDate, setFromDate] = useState(yearStartIso());
  const [toDate, setToDate] = useState(todayIso());
  const [branch, setBranch] = useState('');
  const [data, setData] = useState<{
    account?: { code: string; name_ar: string };
    opening_balance?: string;
    closing_balance?: string;
    movements?: {
      date: string;
      journal_code: string;
      description: string;
      debit: string;
      credit: string;
      balance: string;
    }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    chartOfAccountsApi.list().then(setAccounts).catch(() => setAccounts([]));
  }, []);

  const run = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const res = await financialReportsApi.generalLedger({
        account: accountId,
        from_date: fromDate,
        to_date: toDate,
        branch: branch || undefined,
      });
      setData(res as typeof data);
    } finally {
      setLoading(false);
    }
  }, [accountId, fromDate, toDate, branch]);

  return (
    <ReportShell
      icon={<BookMarked className="h-7 w-7 text-blue-800" />}
      title={t('nav.generalLedger')}
      desc={t('accounting.generalLedgerDesc')}
    >
      <div className="flex flex-wrap gap-2 items-end rounded-xl border bg-slate-50/80 p-3">
        <div className="min-w-[220px]">
          <label className="text-xs text-slate-500 block mb-0.5">{t('accounting.account')}</label>
          <select
            className="h-9 w-full rounded-md border px-2 text-sm"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <option value="">—</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} {a.name_ar}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-0.5">{t('accounting.reportFrom')}</label>
          <Input type="date" className="h-9 w-40" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-0.5">{t('accounting.reportTo')}</label>
          <Input type="date" className="h-9 w-40" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-0.5">{t('accounting.colBranch')}</label>
          <select
            className="h-9 rounded-md border px-2 text-sm min-w-[140px]"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          >
            <option value="">{t('accounting.allBranches')}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <Button size="sm" onClick={run} disabled={loading || !accountId}>
          <RefreshCw className={`h-4 w-4 me-1 ${loading ? 'animate-spin' : ''}`} />
          {t('accounting.runReport')}
        </Button>
        {accountId && (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              downloadReportCsv(
                'general_ledger',
                { account: accountId, from_date: fromDate, to_date: toDate, branch },
                'general-ledger.csv',
              )
            }
          >
            <Download className="h-4 w-4 me-1" />
            Excel
          </Button>
        )}
      </div>
      {data?.account && (
        <div className="grid sm:grid-cols-3 gap-2 text-sm">
          <div className="rounded-lg border p-2 bg-white">
            <span className="text-slate-500">{t('accounting.openingBalance')}</span>
            <p className="font-bold">{fmt(data.opening_balance)}</p>
          </div>
          <div className="rounded-lg border p-2 bg-white">
            <span className="text-slate-500">{t('accounting.glClosingBalance')}</span>
            <p className="font-bold">{fmt(data.closing_balance)}</p>
          </div>
          <div className="rounded-lg border p-2 bg-white flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-700" />
            <span className="font-mono">
              {data.account.code} — {data.account.name_ar}
            </span>
          </div>
        </div>
      )}
      <ReportTable
        headers={[
          t('purchases.date'),
          t('accounting.jeCode'),
          t('accounting.jeDescription'),
          t('accounting.debit'),
          t('accounting.credit'),
          t('accounting.balance'),
        ]}
        rows={(data?.movements ?? []).map((m) => [
          m.date,
          m.journal_code,
          m.description,
          fmt(m.debit),
          fmt(m.credit),
          fmt(m.balance),
        ])}
        loading={loading}
      />
    </ReportShell>
  );
}

function ReportShell({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="report-shell space-y-4 p-1">
      <div className="report-shell-header">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {icon}
          {title}
        </h1>
        <p className="text-sm text-slate-500 mt-1">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function ReportTable({
  headers,
  rows,
  footer,
  loading,
}: {
  headers: string[];
  rows: (string | number)[][];
  footer?: (string | number)[];
  loading?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className="report-table-wrap rounded-xl border bg-white overflow-x-auto">
      <table className="report-table w-full text-sm min-w-[600px]">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-start font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={headers.length} className="py-8 text-center text-slate-500">
                {t('inventory.loading')}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="py-8 text-center text-slate-500">
                {t('inventory.empty')}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="border-t hover:bg-slate-50/50">
                {row.map((cell, j) => (
                  <td key={j} className={`px-3 py-2 ${j > 0 ? 'text-end' : ''}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {footer && !loading && (
          <tfoot className="bg-slate-100 font-bold">
            <tr>
              {footer.map((cell, j) => (
                <td key={j} className={`px-3 py-2 ${j > 0 ? 'text-end' : ''}`}>
                  {cell}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
