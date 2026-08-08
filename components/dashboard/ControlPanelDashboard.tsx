import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  Filter,
  Landmark,
  Plus,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { fetchControlPanelDashboard, type ControlPanelDashboardDto } from '@/lib/api/dashboard';
import { cacheKey, peekCached } from '@/lib/api/request-cache';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';

type Period = 'today' | 'yesterday' | 'week';

function controlPanelCacheKey(period: Period, branchId: string | null) {
  const params = new URLSearchParams();
  params.set('period', period);
  if (branchId) params.set('branch', branchId);
  return cacheKey(`/dashboard/control-panel/?${params.toString()}`);
}

function fmt(n: number) {
  return n.toLocaleString('en-US');
}

function num(value: string | undefined) {
  const n = parseFloat(value ?? '0');
  return Number.isFinite(n) ? n : 0;
}

function formatPeriodRange(from: string, to: string) {
  const f = new Date(from);
  const t = new Date(to);
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
  if (from === to) return f.toLocaleDateString('ar-EG', opts);
  return `${f.toLocaleDateString('ar-EG', opts)} - ${t.toLocaleDateString('ar-EG', opts)}`;
}

function KpiSplitCard({
  title,
  net,
  sales,
  returns,
  iconTone = 'orange',
  iconVariant = 'dollar',
  netLabel,
  salesLabel,
  returnsLabel,
}: {
  title: string;
  net: number;
  sales: number;
  returns: number;
  iconTone?: 'orange' | 'blue' | 'pink';
  iconVariant?: 'dollar' | 'trend';
  netLabel: string;
  salesLabel: string;
  returnsLabel: string;
}) {
  const Icon = iconVariant === 'trend' ? TrendingUp : DollarSign;
  return (
    <article className="mcp-kpi-card">
      <div className="mcp-kpi-card-top">
        <h3>{title}</h3>
        <span className={cn('mcp-kpi-icon', `mcp-kpi-icon-${iconTone}`)}>
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </span>
      </div>
      <div className="mcp-kpi-main">
        <div className="mcp-kpi-amount">
          <small>EGP</small>
          <strong>{fmt(net)}</strong>
        </div>
        <span className="mcp-kpi-net-label">{netLabel}</span>
      </div>
      <div className="mcp-kpi-split">
        <div>
          <strong className="is-plus">{fmt(sales)}+</strong>
          <span>{salesLabel}</span>
        </div>
        <div>
          <strong className="is-minus">{fmt(returns)}-</strong>
          <span>{returnsLabel}</span>
        </div>
      </div>
    </article>
  );
}

function ExpenseTile({ title, value }: { title: string; value: number }) {
  return (
    <article className="mcp-expense-tile">
      <h4>{title}</h4>
      <strong>
        <small>EGP</small> {fmt(value)}
      </strong>
      <button type="button" className="mcp-expense-dismiss" aria-label="Dismiss">
        <X className="h-3.5 w-3.5" />
      </button>
    </article>
  );
}

const BRANCH_TONES = ['orange', 'blue', 'amber', 'sky'] as const;

export function ControlPanelDashboard() {
  const { t, isRtl } = useLanguage();
  const { branches, activeBranchId } = useAuth();
  const [period, setPeriod] = useState<Period>('today');
  const [dash, setDash] = useState<ControlPanelDashboardDto | null>(() =>
    peekCached<ControlPanelDashboardDto>(controlPanelCacheKey('today', null)),
  );
  const [error, setError] = useState<string | null>(null);

  const activeBranch = branches.find((b) => b.id === activeBranchId);
  const branchLabel = activeBranch
    ? activeBranch.name_ar || activeBranch.name_en || activeBranch.code
    : isRtl
      ? 'كل الفروع'
      : 'All Branches';

  const d = (key: string) => t(`dashboard.${key}` as 'dashboard.title');

  useEffect(() => {
    let cancelled = false;
    setError(null);
    void fetchControlPanelDashboard({
      period,
      branch: activeBranchId ?? undefined,
    })
      .then((data) => {
        if (!cancelled) setDash(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : isRtl ? 'تعذر تحميل لوحة التحكم' : 'Failed to load dashboard');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [period, activeBranchId, isRtl]);

  const kpis = dash?.kpis;
  const expenses = dash?.expenses;
  const branchSales = dash?.branch_sales ?? [];
  const pendingShifts = dash?.pending_shifts ?? [];
  const banks = dash?.banks ?? [];
  const attendance = dash?.attendance ?? [];

  const periodLabel = useMemo(() => {
    if (!dash?.period) return '—';
    return formatPeriodRange(dash.period.date_from, dash.period.date_to);
  }, [dash]);

  return (
    <div className="mahaly-control-panel" dir={isRtl ? 'rtl' : 'ltr'}>
      {error ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          {error}
        </div>
      ) : null}

      <header className="mcp-page-header">
        <div className="mcp-page-heading">
          <h1>{d('title')}</h1>
          <p>{d('subtitle')}</p>
        </div>
        <button type="button" className="mcp-branch-btn">
          <Building2 className="h-4 w-4 text-orange-500" />
          <span>{branchLabel}</span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </button>
      </header>

      <section className="mcp-filter-bar">
        <div className="mcp-period-tabs">
          {(['today', 'yesterday', 'week'] as Period[]).map((id) => (
            <button key={id} type="button" className={cn(period === id && 'is-active')} onClick={() => setPeriod(id)}>
              {d(id)}
            </button>
          ))}
        </div>
        <div className="mcp-filter-end">
          <button type="button" className="mcp-filter-icon-btn" aria-label={d('displaySettings')}>
            <Filter className="h-4 w-4" />
          </button>
          <div className="mcp-date-range">
            <span>{periodLabel}</span>
            <Plus className="h-4 w-4 opacity-60" />
          </div>
        </div>
      </section>

      <section className="mcp-kpi-grid">
        <KpiSplitCard
          title={d('cashSales')}
          net={num(kpis?.cash_sales.net)}
          sales={num(kpis?.cash_sales.sales)}
          returns={num(kpis?.cash_sales.returns)}
          iconTone="orange"
          netLabel={d('net')}
          salesLabel={d('sales')}
          returnsLabel={d('returns')}
        />
        <KpiSplitCard
          title={d('creditAdvances')}
          net={num(kpis?.credit_advances.net)}
          sales={num(kpis?.credit_advances.sales)}
          returns={num(kpis?.credit_advances.returns)}
          iconTone="blue"
          iconVariant="trend"
          netLabel={d('net')}
          salesLabel={d('sales')}
          returnsLabel={d('returns')}
        />
        <KpiSplitCard
          title={d('netCreditSales')}
          net={num(kpis?.net_credit_sales.net)}
          sales={num(kpis?.net_credit_sales.sales)}
          returns={num(kpis?.net_credit_sales.returns)}
          iconTone="orange"
          netLabel={d('net')}
          salesLabel={d('sales')}
          returnsLabel={d('returns')}
        />
        <KpiSplitCard
          title={d('netReservations')}
          net={num(kpis?.net_reservations.net)}
          sales={num(kpis?.net_reservations.sales)}
          returns={num(kpis?.net_reservations.returns)}
          iconTone="pink"
          netLabel={d('net')}
          salesLabel={d('sales')}
          returnsLabel={d('returns')}
        />
        <KpiSplitCard
          title={d('installmentCollections')}
          net={num(kpis?.installment_collections.net)}
          sales={num(kpis?.installment_collections.sales)}
          returns={num(kpis?.installment_collections.returns)}
          iconTone="blue"
          netLabel={d('net')}
          salesLabel={d('sales')}
          returnsLabel={d('returns')}
        />
        <article className="mcp-kpi-card mcp-kpi-card-highlight">
          <div className="mcp-kpi-highlight-top">
            <span className="mcp-kpi-icon mcp-kpi-icon-light">
              <TrendingUp className="h-4 w-4" strokeWidth={2.25} />
            </span>
          </div>
          <div className="mcp-kpi-highlight-labels">
            <span>{d('net')}</span>
            <span>{d('sales')}</span>
          </div>
          <div className="mcp-kpi-highlight-value">
            <small>EGP</small>
            <strong>{fmt(num(kpis?.grand_net))}</strong>
          </div>
        </article>
      </section>

      <section className="mcp-revenue-hero">
        <div className="mcp-revenue-copy">
          <h2>{d('totalRevenue')}</h2>
          <p>{d('cashBeforeExpenses')}</p>
          <strong>
            <small>EGP</small> {fmt(num(dash?.revenue.total))}
          </strong>
        </div>
        <div className="mcp-revenue-splits">
          <article className="mcp-revenue-split mcp-revenue-split-cash">
            <span>{d('actualCash')}</span>
            <strong className="is-orange">
              <small>EGP</small> {fmt(num(dash?.revenue.actual_cash))}
            </strong>
          </article>
          <article className="mcp-revenue-split mcp-revenue-split-visa">
            <span>{d('visaWallets')}</span>
            <strong>
              <small>EGP</small> {fmt(num(dash?.revenue.visa_wallets))}
            </strong>
          </article>
        </div>
      </section>

      <section className="mcp-expense-grid">
        <ExpenseTile title={d('supplierPaymentsCash')} value={num(expenses?.supplier_payments_cash)} />
        <ExpenseTile title={d('salariesAdvances')} value={num(expenses?.salaries_advances)} />
        <ExpenseTile title={d('generalExpenses')} value={num(expenses?.general_expenses)} />
        <ExpenseTile title={d('supplierPaymentsChq')} value={num(expenses?.supplier_payments_chq)} />
        <ExpenseTile title={d('bankDeposit')} value={num(expenses?.bank_deposit)} />
        <ExpenseTile title={d('ownerWithdrawals')} value={num(expenses?.owner_withdrawals)} />
        <ExpenseTile title={d('ownerDepositTreasury')} value={num(expenses?.owner_deposit_treasury)} />
        <ExpenseTile title={d('paidChecks')} value={num(expenses?.paid_checks)} />
      </section>

      <section className="mcp-treasury-green">
        <div className="mcp-treasury-green-top">
          <div className="mcp-treasury-green-value">
            <strong>
              <small>EGP</small> {fmt(num(dash?.treasury.net_total))}
            </strong>
          </div>
          <div className="mcp-treasury-green-heading">
            <span className="mcp-treasury-dollar">
              <DollarSign className="h-6 w-6" />
            </span>
            <div>
              <h2>{d('netMainTreasury')}</h2>
              <p>{d('cashAfterExpenses')}</p>
            </div>
          </div>
        </div>
        <div className="mcp-treasury-green-splits">
          <article>
            <span>{d('cashHand')}</span>
            <strong>
              <small>EGP</small> {fmt(num(dash?.treasury.cash_hand))}
            </strong>
          </article>
          <article>
            <span>{d('visaWallets')}</span>
            <strong>
              <small>EGP</small> {fmt(num(dash?.treasury.visa_wallets))}
            </strong>
          </article>
        </div>
      </section>

      <section className="mcp-branch-sales-card">
        <div className="mcp-branch-sales-head">
          <h2>{d('widgets.branchSales')}</h2>
          <span>{d('branchSalesCard.badge')}</span>
        </div>
        {branchSales.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            {isRtl ? 'لا توجد مبيعات مسجّلة في هذه الفترة.' : 'No sales recorded for this period.'}
          </p>
        ) : (
          <div className="mcp-branch-sales-list">
            {branchSales.map((row, index) => (
              <div key={row.branch_id} className="mcp-branch-sales-row">
                <div className="mcp-branch-sales-meta">
                  <strong>{row.name}</strong>
                  <span>
                    <small>EGP</small> {fmt(num(row.value))}
                  </span>
                </div>
                <div className="mcp-branch-progress">
                  <i
                    className={cn(`mcp-branch-progress-${BRANCH_TONES[index % BRANCH_TONES.length]}`)}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mcp-dual-grid">
        <section className="mcp-panel-card">
          <div className="mcp-panel-head">
            <div>
              <h2>
                {d('pendingShiftsTitle')}
                <span className="mcp-count-badge">{dash?.pending_shifts_count ?? 0}</span>
              </h2>
              <p>{d('pendingShiftsDesc')}</p>
            </div>
            <span className="mcp-panel-icon mcp-panel-icon-orange">
              <Bell className="h-5 w-5" />
            </span>
          </div>
          {pendingShifts.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              {isRtl ? 'لا توجد ورديات معلّقة.' : 'No pending shifts.'}
            </p>
          ) : (
            <div className="mcp-shift-list">
              {pendingShifts.map((row) => (
                <div key={`${row.cashier}-${row.close_label}`} className="mcp-shift-row">
                  <span className={cn('mcp-shift-tag', row.live && 'is-live')}>{row.tag}</span>
                  <div className="mcp-shift-info">
                    <strong>{isRtl ? `الكاشير: ${row.cashier}` : `Cashier: ${row.cashier}`}</strong>
                    <small>{row.close_label ? `${isRtl ? 'الإغلاق: ' : 'Close: '}${row.close_label.slice(0, 16)}` : '—'}</small>
                  </div>
                  <div className="mcp-shift-action">
                    <strong>
                      <small>EGP</small> {fmt(num(row.amount))}
                    </strong>
                    <button type="button" className="mcp-receive-btn">
                      <Check className="h-4 w-4" />
                      {d('receive')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mcp-panel-card">
          <div className="mcp-panel-head">
            <div>
              <h2>{d('bankStatusTitle')}</h2>
              <p>{d('bankStatusDesc')}</p>
            </div>
            <span className="mcp-panel-icon mcp-panel-icon-blue">
              <Landmark className="h-5 w-5" />
            </span>
          </div>
          <div className="mcp-bank-list">
            {banks.length === 0 ? (
              <p className="px-4 py-4 text-center text-sm text-slate-500">
                {isRtl ? 'لا توجد حسابات بنكية.' : 'No bank accounts.'}
              </p>
            ) : (
              banks.map((bank) => (
                <div key={bank.name} className="mcp-bank-row">
                  <span className="mcp-bank-dot mcp-bank-dot-blue" />
                  <strong>{bank.name}</strong>
                  <span>
                    <small>EGP</small> {fmt(num(bank.balance))}
                  </span>
                </div>
              ))
            )}
            <div className="mcp-bank-total">
              <strong>{d('totalBankBalances')}</strong>
              <span>
                <small>EGP</small> {fmt(num(dash?.bank_total))}
              </span>
            </div>
            <div className="mcp-bank-due">
              <div>
                <strong>{d('checksDueMonth')}</strong>
                <small>{d('checksDueMonthSub')}</small>
              </div>
              <span className="is-danger">
                <small>EGP</small> {fmt(num(dash?.checks_due_month))}
              </span>
            </div>
            {num(dash?.checks_due_month) > num(dash?.bank_total) ? (
              <div className="mcp-bank-alert">
                <span className="mcp-bank-alert-icon">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <p>{d('checkCoverageAlert')}</p>
              </div>
            ) : null}
            <button type="button" className="mcp-bank-deposit-btn">
              <Plus className="h-4 w-4" />
              {d('bankDepositOrder')}
            </button>
          </div>
        </section>
      </div>

      <section className="mcp-panel-card mcp-attendance-card">
        <div className="mcp-panel-head mcp-attendance-head">
          <h2>{d('attendanceTitle')}</h2>
          <span className="mcp-panel-icon mcp-panel-icon-orange">
            <Users className="h-5 w-5" />
          </span>
        </div>
        {attendance.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            {isRtl ? 'لا توجد سجلات حضور لهذا اليوم.' : 'No attendance records for today.'}
          </p>
        ) : (
          <div className="mcp-attendance-table-wrap">
            <table className="mcp-attendance-table">
              <thead>
                <tr>
                  <th>{d('colStatus')}</th>
                  <th>{d('colEmployee')}</th>
                  <th>{d('colCheckIn')}</th>
                  <th>{d('colDelay')}</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((row) => (
                  <tr key={row.name}>
                    <td>
                      <span className={cn('mcp-att-status', `mcp-att-status-${row.status}`)}>
                        {row.status === 'ok' ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                      </span>
                    </td>
                    <td>
                      <strong>{row.name}</strong>
                      <small>{row.sub}</small>
                    </td>
                    <td>{row.time}</td>
                    <td>
                      <span className={cn('mcp-att-delay', `mcp-att-delay-${row.status}`)}>
                        {row.status === 'ok' ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                        {row.delay}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
