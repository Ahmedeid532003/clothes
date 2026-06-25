import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Clock, HandCoins, Plus, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  cashShiftsApi,
  pendingShiftsApi,
  treasuriesApi,
  type ActiveShiftUser,
  type CashierDailyReportDto,
  type CashShiftDto,
} from '@/lib/api/accounting';
import { fetchBranches } from '@/lib/api/branches';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertBanner,
  fmtMoney,
  LinkAction,
  PageSectionHeader,
  PageToolbar,
  StatusBadge,
} from '@/components/accounting/AccountingUi';
import { emitExpensesRefresh } from '@/components/accounting/ExpensesHub';
import { ErpDataTable, type ErpColumn } from '@/components/erp/ErpDataTable';
import { ErpSideDrawer } from '@/components/erp/ErpSideDrawer';
import { canUseFeature } from '@/lib/permissions/access';
import { resolveMyOpenShift, safeMoneyStr, shiftRowId } from '@/lib/accounting/shiftUtils';
import {
  buildCashierDailyReportLabels,
  printCashierDailyReportHtml,
} from '@/components/accounting/CashierDailyReport';
import { ShiftClosePanel } from '@/components/accounting/ShiftClosePanel';
import { ClosedShiftsTable } from '@/components/accounting/ClosedShiftsTable';
import {
  editableToPrintReport,
  recalcShiftClose,
  reportFromShiftDetail,
  type EditableShiftClose,
} from '@/lib/accounting/shiftCloseCalc';

export function CashShiftsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const canReceive = canUseFeature(user, 'cash-shifts', 'receive_treasury');

  const [rows, setRows] = useState<CashShiftDto[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveShiftUser[]>([]);
  const [myOpen, setMyOpen] = useState<CashShiftDto | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [treasuries, setTreasuries] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [handoverFilter, setHandoverFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [openDrawer, setOpenDrawer] = useState(false);
  const [closeDrawer, setCloseDrawer] = useState(false);
  const [closeForm, setCloseForm] = useState<CashShiftDto | null>(null);
  const [closeLoading, setCloseLoading] = useState(false);
  const [openPayload, setOpenPayload] = useState({
    branch: '',
    treasury: '',
    opening_balance: '0',
  });
  const [actualBalance, setActualBalance] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [dailyReport, setDailyReport] = useState<CashierDailyReportDto | null>(null);
  const [editableClose, setEditableClose] = useState<EditableShiftClose | null>(null);
  const [pageTab, setPageTab] = useState<'operations' | 'closed'>('operations');

  const reportLabels = useMemo(() => buildCashierDailyReportLabels(t), [t]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, open, br, tr, pending, active] = await Promise.all([
        cashShiftsApi.list({
          status: statusFilter || undefined,
          handover_status: handoverFilter || undefined,
          branch: branchFilter || undefined,
          q: search.trim() || undefined,
        }).catch(() => [] as CashShiftDto[]),
        cashShiftsApi.myOpen().catch(() => null),
        fetchBranches(),
        treasuriesApi.list(),
        pendingShiftsApi.dashboard().catch(() => null),
        cashShiftsApi.activeUsers().catch(() => [] as ActiveShiftUser[]),
      ]);
      setRows(list);
      setMyOpen(open);
      setActiveUsers(active);
      setBlockOpen(pending?.block_new_shift ?? false);
      setBranches(br.map((b) => ({ id: b.id, name: b.name_ar || b.name_en || b.code })));
      setTreasuries(tr.map((x) => ({ id: x.id, label: `${x.code} — ${x.name_ar}` })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
      emitExpensesRefresh();
    }
  }, [statusFilter, handoverFilter, branchFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  /** نشطون = من فتحوا وردية مفتوحة (من API أو من صفوف الجدول) */
  const activeOnSystem = useMemo(() => {
    const map = new Map<string, ActiveShiftUser>();
    for (const u of activeUsers) {
      map.set(u.shift_id, u);
    }
    for (const r of rows) {
      if (r.status !== 'open') continue;
      if (!map.has(r.id)) {
        map.set(r.id, {
          shift_id: r.id,
          shift_code: r.code,
          employee_id: r.employee,
          employee_name: r.employee_name,
          branch_name: r.branch_name,
          treasury_name: r.treasury_name,
          opened_at: r.opened_at,
          expected_balance: r.expected_balance,
        });
      }
    }
    return [...map.values()];
  }, [activeUsers, rows]);

  const statusLabel = (s: string) => {
    const m: Record<string, string> = {
      open: t('accounting.shiftOpen'),
      closed: t('accounting.shiftClosed'),
      approved: t('accounting.shiftApproved'),
    };
    return m[s] ?? s;
  };

  const handoverLabel = (s: string) => {
    const m: Record<string, string> = {
      none: t('accounting.handoverNone'),
      pending: t('accounting.handoverPending'),
      completed: t('accounting.handoverCompleted'),
    };
    return m[s] ?? s;
  };

  const summaryChip = (row: CashShiftDto, key: string, label: string) => {
    const v = row.movement_summary?.[key];
    if (!v || Number(v) === 0) return null;
    return (
      <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">
        {label}: {fmtMoney(v)}
      </span>
    );
  };

  const effectiveMyOpen = useMemo(
    () => resolveMyOpenShift(myOpen, activeUsers, rows, user?.id),
    [myOpen, activeUsers, rows, user?.id],
  );

  const openCloseDrawer = (shift: CashShiftDto) => {
    const id = shiftRowId(shift);
    if (!id) {
      setError('تعذّر تحميل الوردية — اضغط تحديث ثم حاول مرة أخرى');
      return;
    }
    setError(null);
    setCloseForm({ ...shift, id });
    setActualBalance('');
    setCloseNotes('');
    setDailyReport(null);
    setEditableClose(null);
    setCloseDrawer(true);
    setCloseLoading(true);
    cashShiftsApi
      .detail(id)
      .then(async (detail) => {
        setCloseForm(detail);
        let report: CashierDailyReportDto | null = null;
        try {
          report = await cashShiftsApi.dailyReport(id);
        } catch {
          report = reportFromShiftDetail(detail);
        }
        setDailyReport(report);
        const expected =
          report.expected_balance ??
          recalcShiftClose(
            {
              opening_balance: report.opening_balance ?? detail.opening_balance,
              sales_total: report.sales.total,
              sales_credit: report.sales.credit,
              sales_cash: report.sales.cash_and_down,
              customer_returns: report.adjustments.customer_returns,
              down_payment_refunds: report.adjustments.down_payment_refunds,
              installment_collections: report.adjustments.installment_collections,
              general_expenses_total: report.general_expenses.total,
              general_expenses_items: report.general_expenses.items,
              supplier_payments_total: report.supplier_payments.total,
              supplier_payments_items: report.supplier_payments.items,
              wages_total: report.wages.total,
              wages_items: report.wages.items,
            },
            detail.expected_balance,
          ).expected_drawer;
        setActualBalance(safeMoneyStr(expected || detail.expected_balance));
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Error');
      })
      .finally(() => setCloseLoading(false));
  };

  const columns = useMemo<ErpColumn<CashShiftDto>[]>(
    () => [
      {
        key: 'code',
        header: t('inventory.code'),
        render: (r) => <span className="font-mono text-xs font-bold">{r.code}</span>,
        exportValue: (r) => r.code,
      },
      {
        key: 'employee',
        header: t('accounting.employee'),
        render: (r) => (
          <span className={r.status === 'open' ? 'font-bold text-emerald-800' : ''}>
            {r.status === 'open' ? '● ' : ''}
            {r.employee_name}
          </span>
        ),
        exportValue: (r) => r.employee_name,
      },
      {
        key: 'branch',
        header: t('accounting.colBranch'),
        render: (r) => r.branch_name,
        exportValue: (r) => r.branch_name,
      },
      {
        key: 'opened',
        header: t('accounting.openedAt'),
        render: (r) => (r.opened_at ? new Date(r.opened_at).toLocaleString() : '—'),
        exportValue: (r) => r.opened_at ?? '',
      },
      {
        key: 'expected',
        header: t('accounting.expectedBalance'),
        align: 'end',
        render: (r) => <span className="tabular-nums">{fmtMoney(r.expected_balance)}</span>,
        exportValue: (r) => r.expected_balance,
      },
      {
        key: 'actual',
        header: t('accounting.actualBalance'),
        align: 'end',
        render: (r) => (
          <span className="tabular-nums font-semibold">
            {r.actual_balance != null ? fmtMoney(r.actual_balance) : '—'}
          </span>
        ),
        exportValue: (r) => r.actual_balance ?? '',
      },
      {
        key: 'summary',
        header: t('accounting.shiftMovements'),
        render: (r) => (
          <div className="flex flex-wrap gap-1 max-w-[220px]">
            {summaryChip(r, 'sale', t('accounting.salesSummary'))}
            {summaryChip(r, 'return', t('accounting.returnsSummary'))}
            {summaryChip(r, 'collection', t('accounting.collectionsSummary'))}
            {summaryChip(r, 'expense', t('accounting.expensesSummary'))}
          </div>
        ),
      },
      {
        key: 'handover',
        header: t('accounting.filterHandover'),
        render: (r) => (
          <StatusBadge
            status={r.handover_status === 'pending' ? 'draft' : r.handover_status === 'completed' ? 'posted' : 'draft'}
            label={handoverLabel(r.handover_status || 'none')}
          />
        ),
        exportValue: (r) => r.handover_status ?? '',
      },
      {
        key: 'status',
        header: t('inventory.status'),
        render: (r) => <StatusBadge status={r.status} label={statusLabel(r.status)} />,
        exportValue: (r) => r.status,
      },
    ],
    [t],
  );

  const onOpenShift = async () => {
    setError(null);
    try {
      await cashShiftsApi.open(openPayload);
      setOpenDrawer(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const onCloseShift = async () => {
    const id = shiftRowId(closeForm);
    if (!id) {
      setError('تعذّر إغلاق الوردية — معرّف غير صالح');
      return;
    }
    const cash = safeMoneyStr(actualBalance).trim();
    if (!cash) {
      setError(t('accounting.actualBalance'));
      return;
    }
    setError(null);
    try {
      await cashShiftsApi.close(id, {
        actual_balance: cash,
        notes: closeNotes,
      });
      setCloseDrawer(false);
      setCloseForm(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const onReceive = async (row: CashShiftDto) => {
    setError(null);
    try {
      await cashShiftsApi.receive(row.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const printCloseSlip = () => {
    if (!closeForm || !dailyReport) return;
    const w = window.open('', '_blank', 'width=420,height=720');
    if (!w) return;
    const totals = editableClose
      ? recalcShiftClose(editableClose, safeMoneyStr(actualBalance))
      : recalcShiftClose(
          {
            opening_balance: dailyReport.opening_balance ?? closeForm.opening_balance,
            sales_total: dailyReport.sales.total,
            sales_credit: dailyReport.sales.credit,
            sales_cash: dailyReport.sales.cash_and_down,
            customer_returns: dailyReport.adjustments.customer_returns,
            down_payment_refunds: dailyReport.adjustments.down_payment_refunds,
            installment_collections: dailyReport.adjustments.installment_collections,
            general_expenses_total: dailyReport.general_expenses.total,
            general_expenses_items: dailyReport.general_expenses.items,
            supplier_payments_total: dailyReport.supplier_payments.total,
            supplier_payments_items: dailyReport.supplier_payments.items,
            wages_total: dailyReport.wages.total,
            wages_items: dailyReport.wages.items,
          },
          safeMoneyStr(actualBalance),
        );
    const printReport = editableClose
      ? editableToPrintReport(editableClose, totals, dailyReport)
      : dailyReport;
    w.document.write(printCashierDailyReportHtml(printReport, reportLabels, safeMoneyStr(actualBalance)));
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="space-y-4">
      <PageSectionHeader
        icon={<Clock className="h-6 w-6" />}
        title={t('nav.cashShifts')}
        description={t('accounting.shiftsDesc')}
        actions={
          <PageToolbar onRefresh={load}>
            {!effectiveMyOpen && (
              <Button
                size="sm"
                disabled={blockOpen || !treasuries.length}
                onClick={() => {
                  setOpenPayload({
                    branch: branches[0]?.id ?? '',
                    treasury: treasuries[0]?.id ?? '',
                    opening_balance: '0',
                  });
                  setOpenDrawer(true);
                }}
              >
                <Plus className="h-4 w-4 me-1" />
                {t('accounting.openShift')}
              </Button>
            )}
          </PageToolbar>
        }
      />

      <div className="flex gap-2 border-b border-slate-200 pb-1">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-semibold rounded-t-lg ${
            pageTab === 'operations'
              ? 'bg-violet-100 text-violet-900 border border-b-0 border-violet-200'
              : 'text-slate-600'
          }`}
          onClick={() => setPageTab('operations')}
        >
          {t('accounting.shiftOperationsTab')}
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-semibold rounded-t-lg ${
            pageTab === 'closed'
              ? 'bg-emerald-100 text-emerald-900 border border-b-0 border-emerald-200'
              : 'text-slate-600'
          }`}
          onClick={() => setPageTab('closed')}
        >
          {t('accounting.closedShiftsTab')}
        </button>
      </div>

      {pageTab === 'closed' ? (
        <ClosedShiftsTable
          rows={rows}
          loading={loading}
          canReceive={canReceive}
          treasuries={treasuries}
          onRefresh={load}
        />
      ) : (
        <>
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      {blockOpen && !effectiveMyOpen ? (
        <AlertBanner variant="warning">
          {t('accounting.pendingBlock')}{' '}
          <LinkAction label={t('nav.pendingShifts')} tab="pending-shifts" />
        </AlertBanner>
      ) : null}

      {/* النشطون على النظام — بناءً على فتح وردية */}
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-900 mb-1">
          <Users className="h-5 w-5" />
          {t('accounting.activeUsersTitle')}
          <span className="rounded-full bg-emerald-600 text-white px-2 py-0.5 text-xs">
            {activeOnSystem.length}
          </span>
        </div>
        <p className="text-xs text-emerald-800/80 mb-3">{t('accounting.activeUsersHint')}</p>
        {activeOnSystem.length === 0 ? (
          <p className="text-sm text-slate-500 py-2">{t('accounting.activeUsersEmpty')}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-emerald-100 bg-white">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-emerald-100/60 text-emerald-900 text-xs">
                <tr>
                  <th className="px-3 py-2 text-start">{t('accounting.employee')}</th>
                  <th className="px-3 py-2 text-start">{t('accounting.colBranch')}</th>
                  <th className="px-3 py-2 text-start">{t('inventory.code')}</th>
                  <th className="px-3 py-2 text-start">{t('accounting.openedAt')}</th>
                  <th className="px-3 py-2 text-end">{t('accounting.expectedBalance')}</th>
                </tr>
              </thead>
              <tbody>
                {activeOnSystem.map((u) => (
                  <tr key={u.shift_id} className="border-t border-emerald-50">
                    <td className="px-3 py-2 font-bold text-slate-900">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        {u.employee_name}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{u.branch_name}</td>
                    <td className="px-3 py-2 font-mono text-xs font-bold text-emerald-800">{u.shift_code}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      {u.opened_at ? new Date(u.opened_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2 text-end tabular-nums font-semibold">
                      {fmtMoney(u.expected_balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {effectiveMyOpen && (
        <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-r from-violet-50 to-white p-4 flex flex-wrap justify-between gap-3 items-center">
          <div>
            <p className="font-bold text-violet-900">{t('accounting.myOpenShift')}</p>
            <p className="text-sm font-mono text-violet-700">{effectiveMyOpen.code}</p>
            <p className="text-sm mt-1">
              {t('accounting.expectedBalance')}:{' '}
              <strong className="tabular-nums">{fmtMoney(effectiveMyOpen.expected_balance)}</strong>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {t('accounting.openedAt')}:{' '}
              {effectiveMyOpen.opened_at ? new Date(effectiveMyOpen.opened_at).toLocaleString() : '—'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.dispatchEvent(new CustomEvent('app:navigate', { detail: 'general-expenses' }))}
            >
              {t('nav.expenseVouchers')}
            </Button>
            <Button onClick={() => openCloseDrawer(effectiveMyOpen)}>{t('accounting.closeShift')}</Button>
          </div>
        </div>
      )}

      <ErpDataTable
        title={t('nav.cashShifts')}
        description={t('accounting.shiftsDesc')}
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        loading={loading}
        emptyMessage={t('inventory.empty')}
        searchValue={search}
        onSearchChange={setSearch}
        advancedFilters={
          <div className="grid gap-3 md:grid-cols-3">
            <select
              className="rounded-xl border bg-white px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">{t('accounting.shiftFilterStatus')}</option>
              <option value="open">{t('accounting.shiftOpen')}</option>
              <option value="closed">{t('accounting.shiftClosed')}</option>
              <option value="approved">{t('accounting.shiftApproved')}</option>
            </select>
            <select
              className="rounded-xl border bg-white px-3 py-2 text-sm"
              value={handoverFilter}
              onChange={(e) => setHandoverFilter(e.target.value)}
            >
              <option value="">{t('accounting.filterHandover')}</option>
              <option value="pending">{t('accounting.handoverPending')}</option>
              <option value="completed">{t('accounting.handoverCompleted')}</option>
              <option value="none">{t('accounting.handoverNone')}</option>
            </select>
            <select
              className="rounded-xl border bg-white px-3 py-2 text-sm"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="">{t('accounting.colBranch')}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        }
        renderRowActions={(row) => (
          <div className="flex justify-end gap-1">
            {row.status === 'open' && row.employee === user?.id && shiftRowId(row) && (
              <Button size="sm" variant="outline" onClick={() => openCloseDrawer(row)}>
                {t('accounting.closeShift')}
              </Button>
            )}
            {row.status === 'closed' && (
              <Button size="sm" variant="outline" onClick={() => cashShiftsApi.approve(row.id).then(load)}>
                <Check className="h-3 w-3" />
              </Button>
            )}
            {canReceive && row.handover_status === 'pending' && (
              <Button size="sm" onClick={() => onReceive(row)}>
                <HandCoins className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      />
        </>
      )}

      <ErpSideDrawer
        open={openDrawer}
        onOpenChange={setOpenDrawer}
        title={t('accounting.openShift')}
        onSave={onOpenShift}
        saveLabel={t('accounting.openShift')}
        disabled={!openPayload.branch || !openPayload.treasury}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">{t('accounting.colBranch')}</label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={openPayload.branch}
              onChange={(e) => setOpenPayload({ ...openPayload, branch: e.target.value })}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">{t('accounting.treasury')}</label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={openPayload.treasury}
              onChange={(e) => setOpenPayload({ ...openPayload, treasury: e.target.value })}
            >
              {treasuries.map((tr) => (
                <option key={tr.id} value={tr.id}>
                  {tr.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">{t('accounting.openingBalance')}</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              value={openPayload.opening_balance}
              onChange={(e) =>
                setOpenPayload({ ...openPayload, opening_balance: e.target.value })
              }
            />
            <p className="text-[10px] text-slate-500 mt-1">{t('accounting.openingBalanceHint')}</p>
          </div>
        </div>
      </ErpSideDrawer>

      <ErpSideDrawer
        open={closeDrawer}
        onOpenChange={(v) => {
          setCloseDrawer(v);
          if (!v) {
            setCloseForm(null);
            setDailyReport(null);
            setEditableClose(null);
          }
        }}
        title={t('accounting.closeShift')}
        description={closeForm ? `${closeForm.code} — ${closeForm.employee_name}` : undefined}
        onSave={onCloseShift}
        saveLabel={t('accounting.closeShift')}
        disabled={closeLoading || !safeMoneyStr(actualBalance).trim() || !dailyReport}
        width="wide"
        secondaryLabel={t('barcode.print')}
        onSecondary={printCloseSlip}
      >
        <div className="space-y-4">
          {closeLoading ? (
            <p className="text-sm text-slate-500">{t('inventory.loading')}</p>
          ) : null}
          {!closeLoading && dailyReport && closeForm ? (
            <ShiftClosePanel
              report={dailyReport}
              shift={closeForm}
              countedBalance={safeMoneyStr(actualBalance)}
              onCountedBalanceChange={setActualBalance}
              onEditableChange={setEditableClose}
            />
          ) : !closeLoading ? (
            <p className="text-sm text-slate-500">{t('accounting.reportUnavailable')}</p>
          ) : null}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">{t('inventory.notes')}</label>
            <Input
              placeholder={t('inventory.notes')}
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
            />
          </div>
          <p className="text-xs text-slate-500">{t('accounting.closePrintHint')}</p>
        </div>
      </ErpSideDrawer>
    </div>
  );
}
