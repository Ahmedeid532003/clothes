import React, { useMemo, useState } from 'react';
import { Eye, HandCoins } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { cashShiftsApi, type CashShiftDto } from '@/lib/api/accounting';
import { Button } from '@/components/ui/button';
import { fmtMoney, StatusBadge } from '@/components/accounting/AccountingUi';
import { ErpSideDrawer } from '@/components/erp/ErpSideDrawer';
import { CashierDailyReport, buildCashierDailyReportLabels } from '@/components/accounting/CashierDailyReport';
import type { CashierDailyReportDto } from '@/lib/api/accounting';

type Props = {
  rows: CashShiftDto[];
  loading: boolean;
  canReceive: boolean;
  treasuries: { id: string; label: string }[];
  onRefresh: () => void;
};

function snapshotToReport(row: CashShiftDto): CashierDailyReportDto {
  return {
    shift_id: row.id,
    shift_code: row.code,
    employee_name: row.employee_name,
    branch_name: row.branch_name,
    treasury_name: row.treasury_name,
    opened_at: row.opened_at,
    closed_at: row.closed_at,
    opening_balance: row.opening_balance,
    expected_balance: row.expected_balance,
    sales: {
      total: row.sales_total ?? '0',
      credit: row.sales_credit ?? '0',
      cash_and_down: row.sales_cash ?? '0',
    },
    adjustments: {
      customer_returns: row.customer_returns ?? '0',
      down_payment_refunds: row.down_payment_refunds ?? '0',
      installment_collections: row.installment_collections ?? '0',
    },
    total_cash_shift: row.total_cash_shift ?? '0',
    general_expenses: { total: row.general_expenses ?? '0', items: [] },
    supplier_payments: { total: row.supplier_payments ?? '0', items: [] },
    wages: { total: row.wages ?? '0', items: [] },
    net_cash: row.book_revenue ?? row.expected_balance ?? '0',
  };
}

function ReceivedDetails({ row, t }: { row: CashShiftDto; t: (k: string) => string }) {
  const receiver =
    row.received_by_name || row.approved_by_name || '—';
  return (
    <div className="min-w-[160px] space-y-0.5 text-[10px] leading-snug text-emerald-900 bg-emerald-50 rounded-md px-2 py-1.5 border border-emerald-100">
      <p>
        <span className="font-bold">{t('accounting.receivedBy')}:</span> {receiver}
      </p>
      {row.received_treasury_name ? (
        <p>
          <span className="font-bold">{t('accounting.receiveTreasury')}:</span> {row.received_treasury_name}
        </p>
      ) : null}
      {row.handover_receipt_code ? (
        <p>
          <span className="font-bold">{t('accounting.receiveReceipt')}:</span>{' '}
          <span className="font-mono">{row.handover_receipt_code}</span>
        </p>
      ) : null}
      {row.received_at ? (
        <p className="text-slate-600">{new Date(row.received_at).toLocaleString()}</p>
      ) : null}
    </div>
  );
}

function pickReceiveTarget(
  treasuries: { id: string; label: string }[],
  shiftTreasuryId: string,
): string {
  const options = treasuries.filter((tr) => tr.id !== shiftTreasuryId);
  const cash = options.find(
    (tr) => /cash|نقد/i.test(tr.label) && !/bank|بنك/i.test(tr.label),
  );
  return cash?.id ?? options[0]?.id ?? '';
}

export function ClosedShiftsTable({ rows, loading, canReceive, treasuries, onRefresh }: Props) {
  const { t } = useLanguage();
  const labels = useMemo(() => buildCashierDailyReportLabels(t), [t]);
  const [viewRow, setViewRow] = useState<CashShiftDto | null>(null);
  const [receiveRow, setReceiveRow] = useState<CashShiftDto | null>(null);
  const [targetTreasury, setTargetTreasury] = useState('');
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [userBalanceFilter, setUserBalanceFilter] = useState<'all' | 'with' | 'zero'>('all');
  const [treasuryFilter, setTreasuryFilter] = useState('');

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (r.status === 'open') return false;
      if (pendingOnly && r.handover_status !== 'pending') return false;
      const bal = Number(r.employee_pending_balance || 0);
      if (userBalanceFilter === 'with' && bal <= 0) return false;
      if (userBalanceFilter === 'zero' && bal > 0) return false;
      if (treasuryFilter.trim()) {
        const q = treasuryFilter.trim().toLowerCase();
        if (!`${r.treasury_name} ${r.received_treasury_name || ''}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, pendingOnly, userBalanceFilter, treasuryFilter]);

  const diffClass = (v: string) => {
    const n = Number(v);
    if (n === 0) return 'text-emerald-700';
    return n > 0 ? 'text-sky-700' : 'text-red-700';
  };

  const receiveTargetTreasuries = useMemo(() => {
    if (!receiveRow) return treasuries;
    return treasuries.filter((tr) => tr.id !== receiveRow.treasury);
  }, [treasuries, receiveRow]);

  const onReceive = async () => {
    if (!receiveRow || !targetTreasury) return;
    setReceiveLoading(true);
    setReceiveError(null);
    try {
      await cashShiftsApi.receive(receiveRow.id, {
        target_treasury: targetTreasury,
      });
      setReceiveRow(null);
      onRefresh();
    } catch (e) {
      setReceiveError(e instanceof Error ? e.message : 'Error');
    } finally {
      setReceiveLoading(false);
    }
  };

  const th = (label: string) => (
    <th className="px-2 py-2 text-start text-[10px] font-bold whitespace-nowrap bg-emerald-100 text-emerald-950 border border-emerald-200">
      {label}
    </th>
  );

  const td = (value: string, className = '') => (
    <td className={`px-2 py-1.5 text-xs tabular-nums border border-slate-100 whitespace-nowrap ${className}`}>
      {value}
    </td>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <label className="inline-flex items-center gap-2 text-xs rounded-lg border px-3 py-1.5 bg-white">
          <input type="checkbox" checked={pendingOnly} onChange={(e) => setPendingOnly(e.target.checked)} />
          {t('accounting.filterPendingReceive')}
        </label>
        <select
          className="text-xs rounded-lg border px-3 py-1.5 bg-white"
          value={userBalanceFilter}
          onChange={(e) => setUserBalanceFilter(e.target.value as 'all' | 'with' | 'zero')}
        >
          <option value="all">{t('accounting.filterUserAllBalances')}</option>
          <option value="with">{t('accounting.filterUserWithBalance')}</option>
          <option value="zero">{t('accounting.filterUserZeroBalance')}</option>
        </select>
        <input
          className="text-xs rounded-lg border px-3 py-1.5 bg-white min-w-[180px]"
          placeholder={t('accounting.filterTreasury')}
          value={treasuryFilter}
          onChange={(e) => setTreasuryFilter(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[2400px] w-full border-collapse">
          <thead>
            <tr>
              {th(t('accounting.shiftOpenedDate'))}
              {th(t('accounting.shiftClosedDate'))}
              {th(t('accounting.employee'))}
              {th(t('accounting.colBranch'))}
              {th(t('accounting.treasury'))}
              {th(t('accounting.reportTotalSales'))}
              {th(t('accounting.reportCreditSales'))}
              {th(t('accounting.reportCashAndDown'))}
              {th(t('accounting.reportCustomerReturns'))}
              {th(t('accounting.reportDownPaymentRefunds'))}
              {th(t('accounting.reportInstallmentCollections'))}
              {th(t('accounting.reportTotalCashShift'))}
              {th(t('accounting.reportGeneralExpenses'))}
              {th(t('accounting.reportSupplierPayments'))}
              {th(t('accounting.reportWages'))}
              {th('accounting.bookRevenue')}
              {th('accounting.actualRevenue')}
              {th('accounting.diffBookActual')}
              {th('accounting.userBalance')}
              {th(t('accounting.handoverStatusCol'))}
              {th(t('accounting.receiveShift'))}
              {th('inventory.actions')}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={21} className="p-4 text-sm text-slate-500">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={21} className="p-4 text-sm text-slate-500">
                  {t('inventory.empty')}
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80">
                  {td(r.opened_at ? new Date(r.opened_at).toLocaleString() : '—')}
                  {td(r.closed_at ? new Date(r.closed_at).toLocaleString() : '—')}
                  {td(r.employee_name, 'font-medium')}
                  {td(r.branch_name)}
                  {td(r.treasury_name)}
                  {td(fmtMoney(r.sales_total ?? '0'))}
                  {td(fmtMoney(r.sales_credit ?? '0'))}
                  {td(fmtMoney(r.sales_cash ?? '0'))}
                  {td(fmtMoney(r.customer_returns ?? '0'))}
                  {td(fmtMoney(r.down_payment_refunds ?? '0'))}
                  {td(fmtMoney(r.installment_collections ?? '0'))}
                  {td(fmtMoney(r.total_cash_shift ?? '0'), 'font-semibold bg-sky-50')}
                  {td(fmtMoney(r.general_expenses ?? '0'))}
                  {td(fmtMoney(r.supplier_payments ?? '0'))}
                  {td(fmtMoney(r.wages ?? '0'))}
                  {td(fmtMoney(r.book_revenue ?? '0'), 'font-semibold')}
                  {td(fmtMoney(r.actual_balance ?? '0'), 'font-bold text-violet-900')}
                  {td(
                    `${Number(r.difference) > 0 ? '+' : ''}${fmtMoney(r.difference)}`,
                    `font-bold ${diffClass(r.difference)}`,
                  )}
                  {td(fmtMoney(r.employee_pending_balance ?? '0'), 'font-semibold text-amber-800')}
                  <td className="px-2 py-1.5 border border-slate-100">
                    <StatusBadge
                      status={
                        r.handover_status === 'pending'
                          ? 'draft'
                          : r.handover_status === 'completed'
                            ? 'posted'
                            : 'draft'
                      }
                      label={
                        r.handover_status === 'pending'
                          ? t('accounting.handoverPending')
                          : r.handover_status === 'completed'
                            ? t('accounting.handoverCompleted')
                            : t('accounting.handoverNone')
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5 border border-slate-100 align-top">
                    {canReceive && r.handover_status === 'pending' ? (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-8 text-[10px] bg-emerald-700 hover:bg-emerald-800"
                        onClick={() => {
                          setReceiveError(null);
                          setReceiveRow(r);
                          setTargetTreasury(pickReceiveTarget(treasuries, r.treasury));
                        }}
                      >
                        <HandCoins className="h-3 w-3 me-1" />
                        {t('accounting.receiveShift')}
                      </Button>
                    ) : r.handover_status === 'completed' ? (
                      <ReceivedDetails row={r} t={t} />
                    ) : (
                      <span className="text-[10px] text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-100">
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => setViewRow(r)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ErpSideDrawer
        open={!!viewRow}
        onOpenChange={(v) => !v && setViewRow(null)}
        title={t('accounting.cashierDailyReport')}
        description={viewRow ? `${viewRow.code} — ${viewRow.employee_name}` : undefined}
        width="wide"
      >
        {viewRow ? <CashierDailyReport report={snapshotToReport(viewRow)} labels={labels} /> : null}
      </ErpSideDrawer>

      <ErpSideDrawer
        open={!!receiveRow}
        onOpenChange={(v) => {
          if (!v) {
            setReceiveRow(null);
            setReceiveError(null);
          }
        }}
        title={t('accounting.receiveShiftDetails')}
        description={receiveRow ? `${receiveRow.code} — ${receiveRow.employee_name}` : undefined}
        onSave={onReceive}
        saveLabel={t('accounting.receiveConfirm')}
        disabled={!receiveRow || !targetTreasury || receiveLoading}
      >
        {receiveRow ? (
          <div className="space-y-4">
            {receiveError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {receiveError}
              </div>
            ) : null}
            {receiveTargetTreasuries.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {t('accounting.receiveNoTargetTreasury')}
              </div>
            ) : null}
            <div className="rounded-lg border bg-slate-50 p-3 text-sm space-y-1">
              <p>
                <span className="text-slate-500">{t('accounting.employee')}:</span>{' '}
                <strong>{receiveRow.employee_name}</strong>
              </p>
              <p>
                <span className="text-slate-500">{t('accounting.colBranch')}:</span> {receiveRow.branch_name}
              </p>
              <p>
                <span className="text-slate-500">{t('accounting.shiftOpenedDate')}:</span>{' '}
                {receiveRow.opened_at ? new Date(receiveRow.opened_at).toLocaleString() : '—'}
              </p>
              <p>
                <span className="text-slate-500">{t('accounting.shiftClosedDate')}:</span>{' '}
                {receiveRow.closed_at ? new Date(receiveRow.closed_at).toLocaleString() : '—'}
              </p>
              <p>
                <span className="text-slate-500">{t('accounting.sourceTreasury')}:</span>{' '}
                {receiveRow.treasury_name}
              </p>
              <p className="text-lg font-bold text-violet-900 pt-1">
                {t('accounting.actualRevenue')}: {fmtMoney(receiveRow.actual_balance ?? '0')}
              </p>
            </div>
            <p className="text-sm text-slate-600">{t('accounting.receiveShiftHint')}</p>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                {t('accounting.receiveTreasury')}
              </label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={targetTreasury}
                onChange={(e) => setTargetTreasury(e.target.value)}
              >
                {receiveTargetTreasuries.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
      </ErpSideDrawer>
    </div>
  );
}
