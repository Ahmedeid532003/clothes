import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Landmark, Wallet, Clock, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { enterpriseCashApi, type EnterpriseCashDashboard } from '@/lib/api/accounting';
import {
  fmtMoney,
  PageSectionHeader,
  PageToolbar,
  StatusBadge,
} from '@/components/accounting/AccountingUi';
import { emitExpensesRefresh } from '@/components/accounting/ExpensesHub';
import { canViewPage } from '@/lib/permissions/access';

export function EnterpriseCashBalancesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const canView = canViewPage(user, 'enterprise-cash-balances');
  const [data, setData] = useState<EnterpriseCashDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [treasuryFilter, setTreasuryFilter] = useState('');
  const [treasuryWithBalanceOnly, setTreasuryWithBalanceOnly] = useState(false);
  const [userBalanceFilter, setUserBalanceFilter] = useState<'all' | 'with' | 'zero'>('with');
  const [shiftHandoverFilter, setShiftHandoverFilter] = useState<'all' | 'pending' | 'open'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await enterpriseCashApi.dashboard());
    } finally {
      setLoading(false);
      emitExpensesRefresh();
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const treasuries = useMemo(() => {
    return (data?.treasuries ?? []).filter((tr) => {
      if (treasuryWithBalanceOnly && Number(tr.balance || 0) <= 0) return false;
      if (!treasuryFilter.trim()) return true;
      const q = treasuryFilter.trim().toLowerCase();
      return `${tr.code} ${tr.name_ar}`.toLowerCase().includes(q);
    });
  }, [data?.treasuries, treasuryFilter, treasuryWithBalanceOnly]);

  const userBalances = useMemo(() => {
    return (data?.user_balances ?? []).filter((u) => {
      const bal = Number(u.pending_balance || 0);
      if (userBalanceFilter === 'with') return bal > 0;
      if (userBalanceFilter === 'zero') return bal === 0;
      return true;
    });
  }, [data?.user_balances, userBalanceFilter]);

  const shiftRows = useMemo(() => {
    return (data?.active_shift_rows ?? []).filter((r) => {
      if (shiftHandoverFilter === 'pending') return r.handover_status === 'pending';
      if (shiftHandoverFilter === 'open') return r.status === 'open';
      return true;
    });
  }, [data?.active_shift_rows, shiftHandoverFilter]);

  if (!canView) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center text-slate-600 space-y-2">
        <p className="font-bold">{t('noAccessTitle')}</p>
        <p className="text-sm">{t('noAccessDesc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageSectionHeader
        icon={<Landmark className="h-6 w-6" />}
        title={t('nav.enterpriseCashBalances')}
        description={t('accounting.enterpriseCashDesc')}
        actions={<PageToolbar onRefresh={load} />}
      />

      <div className="grid gap-3 md:grid-cols-3">
        {[
          {
            title: t('accounting.totalCashBalances'),
            value: fmtMoney(data?.total_balance ?? '0'),
            icon: <Wallet className="h-5 w-5 text-emerald-600" />,
            tone: 'from-emerald-50 to-white border-emerald-200',
          },
          {
            title: t('accounting.openTreasuriesCount'),
            value: String(data?.open_treasuries_count ?? data?.open_shifts_count ?? 0),
            sub: `${data?.open_shifts_count ?? 0} ${t('accounting.shiftOpen')}`,
            icon: <Clock className="h-5 w-5 text-violet-600" />,
            tone: 'from-violet-50 to-white border-violet-200',
          },
          {
            title: t('accounting.pendingTreasuriesCount'),
            value: String(data?.pending_treasuries_count ?? data?.pending_shifts_count ?? 0),
            sub: fmtMoney(data?.pending_shifts_amount ?? '0'),
            icon: <AlertCircle className="h-5 w-5 text-amber-600" />,
            tone: 'from-amber-50 to-white border-amber-200',
          },
        ].map((card) => (
          <div
            key={card.title}
            className={`rounded-xl border bg-gradient-to-br p-4 ${card.tone}`}
          >
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              {card.icon}
              {card.title}
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
              {loading ? '…' : card.value}
            </p>
            {card.sub ? <p className="text-xs text-slate-600 mt-1">{card.sub}</p> : null}
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-4 space-y-3">
        <h3 className="font-bold text-slate-900">{t('accounting.treasuriesWithBalance')}</h3>
        <div className="flex flex-wrap gap-2">
          <input
            className="w-full max-w-md rounded-lg border px-3 py-2 text-sm"
            placeholder={t('accounting.filterTreasury')}
            value={treasuryFilter}
            onChange={(e) => setTreasuryFilter(e.target.value)}
          />
          <label className="inline-flex items-center gap-2 text-xs rounded-lg border px-3 py-1.5">
            <input
              type="checkbox"
              checked={treasuryWithBalanceOnly}
              onChange={(e) => setTreasuryWithBalanceOnly(e.target.checked)}
            />
            {t('accounting.filterTreasuryWithBalance')}
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-slate-50 text-xs">
              <tr>
                <th className="px-3 py-2 text-start">{t('inventory.code')}</th>
                <th className="px-3 py-2 text-start">{t('accounting.treasury')}</th>
                <th className="px-3 py-2 text-end">{t('accounting.shiftBalance')}</th>
                <th className="px-3 py-2 text-center">{t('accounting.treasuryOpenShifts')}</th>
                <th className="px-3 py-2 text-end">{t('accounting.treasuryPendingAmount')}</th>
                <th className="px-3 py-2 text-center">{t('inventory.status')}</th>
              </tr>
            </thead>
            <tbody>
              {treasuries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-slate-500 text-center">
                    {t('inventory.empty')}
                  </td>
                </tr>
              ) : (
                treasuries.map((tr) => (
                  <tr key={tr.id} className="border-t hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-mono text-xs">{tr.code}</td>
                    <td className="px-3 py-2 font-medium">{tr.name_ar}</td>
                    <td className="px-3 py-2 text-end tabular-nums font-bold">{fmtMoney(tr.balance)}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{tr.open_shifts ?? 0}</td>
                    <td className="px-3 py-2 text-end tabular-nums text-amber-800 font-semibold">
                      {fmtMoney(tr.pending_amount ?? '0')}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex flex-wrap justify-center gap-1">
                        {tr.has_open_shift ? (
                          <StatusBadge status="open" label={t('accounting.shiftOpen')} />
                        ) : null}
                        {tr.has_pending_handover ? (
                          <StatusBadge status="draft" label={t('accounting.handoverPending')} />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-slate-900">{t('accounting.userBalancesPending')}</h3>
          <select
            className="text-xs rounded-lg border px-3 py-1.5"
            value={userBalanceFilter}
            onChange={(e) => setUserBalanceFilter(e.target.value as 'all' | 'with' | 'zero')}
          >
            <option value="all">{t('accounting.filterUserAllBalances')}</option>
            <option value="with">{t('accounting.filterUserWithBalance')}</option>
            <option value="zero">{t('accounting.filterUserZeroBalance')}</option>
          </select>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-amber-50 text-xs">
            <tr>
              <th className="px-3 py-2 text-start">{t('accounting.employee')}</th>
              <th className="px-3 py-2 text-end">{t('accounting.userBalance')}</th>
            </tr>
          </thead>
          <tbody>
            {userBalances.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-3 py-4 text-slate-500 text-center">
                  {t('inventory.empty')}
                </td>
              </tr>
            ) : (
              userBalances.map((u) => (
                <tr key={u.employee_id} className="border-t">
                  <td className="px-3 py-2 font-medium">{u.employee_name}</td>
                  <td
                    className={`px-3 py-2 text-end tabular-nums font-bold ${
                      Number(u.pending_balance) > 0 ? 'text-amber-900' : 'text-slate-500'
                    }`}
                  >
                    {fmtMoney(u.pending_balance)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-slate-900">{t('accounting.shiftsWithCash')}</h3>
          <select
            className="text-xs rounded-lg border px-3 py-1.5"
            value={shiftHandoverFilter}
            onChange={(e) => setShiftHandoverFilter(e.target.value as 'all' | 'pending' | 'open')}
          >
            <option value="all">{t('accounting.filterHandover')}</option>
            <option value="open">{t('accounting.shiftOpen')}</option>
            <option value="pending">{t('accounting.handoverPending')}</option>
          </select>
        </div>
        <table className="w-full text-sm min-w-[1100px]">
          <thead className="bg-slate-50 text-xs">
            <tr>
              <th className="px-3 py-2">{t('inventory.code')}</th>
              <th className="px-3 py-2">{t('accounting.employee')}</th>
              <th className="px-3 py-2">{t('accounting.colBranch')}</th>
              <th className="px-3 py-2">{t('accounting.treasury')}</th>
              <th className="px-3 py-2">{t('accounting.shiftOpenedDate')}</th>
              <th className="px-3 py-2">{t('accounting.shiftClosedDate')}</th>
              <th className="px-3 py-2 text-end">{t('accounting.shiftBalance')}</th>
              <th className="px-3 py-2">{t('accounting.handoverStatusCol')}</th>
              <th className="px-3 py-2">{t('accounting.receivedBy')}</th>
            </tr>
          </thead>
          <tbody>
            {shiftRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-4 text-slate-500 text-center">
                  {t('inventory.empty')}
                </td>
              </tr>
            ) : (
              shiftRows.map((r) => (
                <tr key={r.shift_id} className="border-t hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-mono text-xs font-bold">{r.shift_code}</td>
                  <td className="px-3 py-2">{r.employee_name}</td>
                  <td className="px-3 py-2">{r.branch_name}</td>
                  <td className="px-3 py-2">{r.treasury_name}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    {r.opened_at ? new Date(r.opened_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    {r.closed_at ? new Date(r.closed_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2 text-end tabular-nums font-bold">{fmtMoney(r.amount)}</td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      status={r.handover_status === 'pending' ? 'draft' : r.handover_status === 'completed' ? 'posted' : r.status}
                      label={
                        r.handover_status === 'pending'
                          ? t('accounting.handoverPending')
                          : r.handover_status === 'completed'
                            ? t('accounting.handoverCompleted')
                            : t('accounting.shiftOpen')
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.handover_status === 'completed' ? (
                      <div className="space-y-0.5">
                        <p className="font-medium text-emerald-800">{r.received_by_name || '—'}</p>
                        {r.received_treasury_name ? (
                          <p className="text-slate-600">{r.received_treasury_name}</p>
                        ) : null}
                        {r.handover_receipt_code ? (
                          <p className="font-mono text-[10px]">{r.handover_receipt_code}</p>
                        ) : null}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
