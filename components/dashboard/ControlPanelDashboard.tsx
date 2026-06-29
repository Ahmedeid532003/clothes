import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarRange,
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
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';

type Period = 'today' | 'yesterday' | 'week';

function fmt(n: number) {
  return n.toLocaleString('en-US');
}

function KpiSplitCard({
  title,
  net,
  sales,
  returns,
  iconTone = 'orange',
  netLabel,
  salesLabel,
  returnsLabel,
}: {
  title: string;
  net: number;
  sales: number;
  returns: number;
  iconTone?: 'orange' | 'blue' | 'pink';
  netLabel: string;
  salesLabel: string;
  returnsLabel: string;
}) {
  return (
    <article className="mcp-kpi-card">
      <div className="mcp-kpi-card-top">
        <h3>{title}</h3>
        <span className={cn('mcp-kpi-icon', `mcp-kpi-icon-${iconTone}`)}>
          {iconTone === 'blue' ? <TrendingUp className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
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

export function ControlPanelDashboard() {
  const { t, isRtl } = useLanguage();
  const { branches, activeBranchId } = useAuth();
  const [period, setPeriod] = useState<Period>('today');

  const activeBranch = branches.find((b) => b.id === activeBranchId);
  const branchLabel = activeBranch
    ? activeBranch.name_ar || activeBranch.name_en || activeBranch.code
    : isRtl ? 'كل الفروع' : 'All Branches';

  const d = (key: string) => t(`dashboard.${key}` as 'dashboard.title');

  const branchSales = useMemo(
    () => [
      { name: isRtl ? 'فرع القاهرة' : 'Cairo Branch', value: 125000, pct: 88, tone: 'orange' as const },
      { name: isRtl ? 'فرع الجيزة' : 'Giza Branch', value: 98000, pct: 72, tone: 'blue' as const },
      { name: isRtl ? 'فرع الإسكندرية' : 'Alexandria Branch', value: 76000, pct: 58, tone: 'orange' as const },
      { name: isRtl ? 'فرع التجمع' : 'Tagamoa Branch', value: 54000, pct: 42, tone: 'blue' as const },
    ],
    [isRtl],
  );

  const pendingShifts = [
    { cashier: isRtl ? 'سامح رأفت' : 'Sameh Raafat', close: isRtl ? 'اليوم 03:30 م' : 'Today 3:30 PM', amount: 8500, tag: 'Live', live: true },
    { cashier: isRtl ? 'أحمد محمود' : 'Ahmed Mahmoud', close: isRtl ? 'أمس 11:45 م' : 'Yesterday 11:45 PM', amount: 12300, tag: isRtl ? 'أمس' : 'Yesterday', live: false },
    { cashier: isRtl ? 'محمد علي' : 'Mohamed Ali', close: isRtl ? 'أمس 09:15 م' : 'Yesterday 9:15 PM', amount: 6700, tag: isRtl ? 'أمس' : 'Yesterday', live: false },
  ];

  const banks = [
    { name: isRtl ? 'البنك التجاري الدولي (CIB)' : 'CIB', balance: 120500, dot: 'blue' as const },
    { name: isRtl ? 'بنك قطر الوطني (QNB)' : 'QNB', balance: 84200, dot: 'violet' as const },
  ];

  const attendance = [
    { name: isRtl ? 'أحمد محمود' : 'Ahmed Mahmoud', sub: 'EMP-1024', time: '09:02 ص', delay: isRtl ? 'في الموعد' : 'On time', status: 'ok' as const },
    { name: isRtl ? 'سارة إبراهيم' : 'Sara Ibrahim', sub: 'EMP-1041', time: '09:18 ص', delay: isRtl ? 'تأخير 18 دقيقة' : '18 min late', status: 'late' as const },
    { name: isRtl ? 'محمد حسن' : 'Mohamed Hassan', sub: 'EMP-1088', time: '—', delay: isRtl ? 'غائب' : 'Absent', status: 'absent' as const },
  ];

  return (
    <div className="mahaly-control-panel" dir={isRtl ? 'rtl' : 'ltr'}>
      <header className="mcp-page-header">
        <div className="mcp-page-heading">
          <h1>{d('title')}</h1>
          <p>{d('subtitle')}</p>
        </div>
        <button type="button" className="mcp-branch-btn mcp-branch-btn-header">
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
            <span>20/04/2024 - 27/04/2024</span>
            <Plus className="h-4 w-4 opacity-60" />
          </div>
        </div>
      </section>

      <section className="mcp-kpi-grid">
        <KpiSplitCard title={d('netCreditSales')} net={14170} sales={15420} returns={1250} iconTone="orange" netLabel={d('net')} salesLabel={d('sales')} returnsLabel={d('returns')} />
        <KpiSplitCard title={d('creditAdvances')} net={8050} sales={8500} returns={450} iconTone="blue" netLabel={d('net')} salesLabel={d('sales')} returnsLabel={d('returns')} />
        <KpiSplitCard title={d('cashSales')} net={39000} sales={42100} returns={3100} iconTone="orange" netLabel={d('net')} salesLabel={d('sales')} returnsLabel={d('returns')} />
        <KpiSplitCard title={d('installmentCollections')} net={10000} sales={12000} returns={2000} iconTone="blue" netLabel={d('net')} salesLabel={d('sales')} returnsLabel={d('returns')} />
        <KpiSplitCard title={d('netReservations')} net={4000} sales={5000} returns={1000} iconTone="pink" netLabel={d('net')} salesLabel={d('sales')} returnsLabel={d('returns')} />
        <article className="mcp-kpi-card mcp-kpi-card-highlight">
          <span className="mcp-kpi-icon mcp-kpi-icon-light">
            <TrendingUp className="h-4 w-4" />
          </span>
          <div className="mcp-kpi-highlight-body">
            <div className="mcp-kpi-highlight-labels">
              <span>{d('net')}</span>
              <span>{d('sales')}</span>
            </div>
            <div className="mcp-kpi-highlight-value">
              <small>EGP</small>
              <strong>{fmt(58920)}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="mcp-revenue-hero">
        <div className="mcp-revenue-copy">
          <h2>{d('totalRevenue')}</h2>
          <p>{d('cashBeforeExpenses')}</p>
          <strong>
            <small>EGP</small> {fmt(158420)}
          </strong>
        </div>
        <div className="mcp-revenue-splits">
          <article className="mcp-revenue-split mcp-revenue-split-cash">
            <span>{d('actualCash')}</span>
            <strong><small>EGP</small> {fmt(115920)}</strong>
          </article>
          <article className="mcp-revenue-split mcp-revenue-split-visa">
            <span>{d('visaWallets')}</span>
            <strong><small>EGP</small> {fmt(42500)}</strong>
          </article>
        </div>
      </section>

      <section className="mcp-expense-grid">
        <ExpenseTile title={d('supplierPaymentsChq')} value={28400} />
        <ExpenseTile title={d('generalExpenses')} value={4200} />
        <ExpenseTile title={d('salariesAdvances')} value={8500} />
        <ExpenseTile title={d('supplierPaymentsCash')} value={15000} />
        <ExpenseTile title={d('paidChecks')} value={12000} />
        <ExpenseTile title={d('ownerDepositTreasury')} value={25000} />
        <ExpenseTile title={d('ownerWithdrawals')} value={12000} />
        <ExpenseTile title={d('bankDeposit')} value={50000} />
      </section>

      <section className="mcp-treasury-green">
        <div className="mcp-treasury-green-top">
          <div className="mcp-treasury-green-value">
            <strong><small>EGP</small> {fmt(65000)}</strong>
          </div>
          <div className="mcp-treasury-green-heading">
            <span className="mcp-treasury-dollar"><DollarSign className="h-6 w-6" /></span>
            <div>
              <h2>{d('netMainTreasury')}</h2>
              <p>{d('cashAfterExpenses')}</p>
            </div>
          </div>
        </div>
        <div className="mcp-treasury-green-splits">
          <article><span>{d('cashHand')}</span><strong><small>EGP</small> {fmt(45000)}</strong></article>
          <article><span>{d('visaWallets')}</span><strong><small>EGP</small> {fmt(20000)}</strong></article>
        </div>
      </section>

      <section className="mcp-branch-sales-card">
        <div className="mcp-branch-sales-head">
          <h2>{d('widgets.branchSales')}</h2>
          <span>{d('branchSalesCard.badge')}</span>
        </div>
        <div className="mcp-branch-sales-list">
          {branchSales.map((row) => (
            <div key={row.name} className="mcp-branch-sales-row">
              <div className="mcp-branch-sales-meta">
                <strong>{row.name}</strong>
                <span><small>EGP</small> {fmt(row.value)}</span>
              </div>
              <div className="mcp-branch-progress">
                <i className={cn(`mcp-branch-progress-${row.tone}`)} style={{ width: `${row.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mcp-dual-grid">
        <section className="mcp-panel-card">
          <div className="mcp-panel-head">
            <div>
              <h2>{d('pendingShiftsTitle')}<span className="mcp-count-badge">3</span></h2>
              <p>{d('pendingShiftsDesc')}</p>
            </div>
            <span className="mcp-panel-icon mcp-panel-icon-orange"><Bell className="h-5 w-5" /></span>
          </div>
          <div className="mcp-shift-list">
            {pendingShifts.map((row) => (
              <div key={row.cashier} className="mcp-shift-row">
                <span className={cn('mcp-shift-tag', row.live && 'is-live')}>{row.tag}</span>
                <div className="mcp-shift-info">
                  <strong>{isRtl ? `الكاشير: ${row.cashier}` : `Cashier: ${row.cashier}`}</strong>
                  <small>{isRtl ? `الإغلاق: ${row.close}` : `Close: ${row.close}`}</small>
                </div>
                <div className="mcp-shift-action">
                  <strong><small>EGP</small> {fmt(row.amount)}</strong>
                  <button type="button" className="mcp-receive-btn"><Check className="h-4 w-4" />{d('receive')}</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mcp-panel-card">
          <div className="mcp-panel-head">
            <div>
              <h2>{d('bankStatusTitle')}</h2>
              <p>{d('bankStatusDesc')}</p>
            </div>
            <span className="mcp-panel-icon mcp-panel-icon-blue"><Landmark className="h-5 w-5" /></span>
          </div>
          <div className="mcp-bank-list">
            {banks.map((bank) => (
              <div key={bank.name} className="mcp-bank-row">
                <span className={cn('mcp-bank-dot', `mcp-bank-dot-${bank.dot}`)} />
                <strong>{bank.name}</strong>
                <span><small>EGP</small> {fmt(bank.balance)}</span>
              </div>
            ))}
            <div className="mcp-bank-total">
              <strong>{d('totalBankBalances')}</strong>
              <span><small>EGP</small> {fmt(204700)}</span>
            </div>
            <div className="mcp-bank-due">
              <strong>{d('checksDueMonth')}</strong>
              <span className="is-danger"><small>EGP</small> {fmt(229700)}</span>
            </div>
            <div className="mcp-bank-alert">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p>{d('checkCoverageAlert')}</p>
            </div>
            <button type="button" className="mcp-bank-deposit-btn"><Plus className="h-4 w-4" />{d('bankDepositOrder')}</button>
          </div>
        </section>
      </div>

      <section className="mcp-panel-card mcp-attendance-card">
        <div className="mcp-panel-head">
          <h2>{d('attendanceTitle')}</h2>
          <span className="mcp-panel-icon mcp-panel-icon-orange"><Users className="h-5 w-5" /></span>
        </div>
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
                <tr key={row.sub}>
                  <td><span className={cn('mcp-att-status', `mcp-att-status-${row.status}`)}>{row.status === 'ok' ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}</span></td>
                  <td><strong>{row.name}</strong><small>{row.sub}</small></td>
                  <td>{row.time}</td>
                  <td><span className={cn('mcp-att-delay', `mcp-att-delay-${row.status}`)}>{row.status === 'ok' ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}{row.delay}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
