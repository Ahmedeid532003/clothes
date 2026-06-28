import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  Clock,
  Plus,
  ShieldCheck,
  UserCircle2,
  WalletCards,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { fetchEmployees, type EmployeeDto } from '@/lib/api/employees';
import {
  advancesApi,
  paymentTypesApi,
  payrollPaymentsApi,
  type AdvanceRow,
  type PayrollPaymentRow,
} from '@/lib/api/hr-payroll';
import { canViewPage } from '@/lib/permissions/access';
import { ErpSideDrawer } from '@/components/erp/ErpSideDrawer';
import { ErpSearchBar } from '@/components/erp/ErpSearchBar';
import { ErpAddButton } from '@/components/erp/ErpAddButton';
import { PaymentAmountHero } from '@/components/accounting/PaymentAmountHero';
import {
  AlertBanner,
  DataCard,
  DataTable,
  PageSectionHeader,
  PageToolbar,
  TableHead,
  Th,
  fmtMoney,
} from '@/components/accounting/AccountingUi';
import { emitExpensesRefresh } from '@/components/accounting/ExpensesHub';
import { Button } from '@/components/ui/button';
import { MoneyAmountInput } from '@/components/ui/MoneyAmountInput';
import { showPremiumToast } from '@/components/ui/premium-toast';
import {
  addMonths,
  currentYearMonth,
  formatYearMonth,
  isAllowedPayPeriod,
  splitEqualInstallments,
} from '@/lib/payroll-period';
import { isPositiveMoneyAmount, toApiMoneyAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

type OpType = 'salary' | 'advance' | 'grant';
type TabView = 'movements' | 'advances';

const OP_TYPES: OpType[] = ['salary', 'advance', 'grant'];

const emptyForm = () => {
  const { year, month } = currentYearMonth();
  return {
    employee_id: '',
    op_type: 'salary' as OpType,
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    period_year: year,
    period_month: month,
    notes: '',
    grant_reason: '',
    is_scheduled: false,
    installment_months: '6',
    start_year: year,
    start_month: month,
  };
};

export function PayrollAdvancesPage() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const canPay = canViewPage(user, 'payroll-advances') || canViewPage(user, 'payroll-payments');

  const [tab, setTab] = useState<TabView>('movements');
  const [payments, setPayments] = useState<PayrollPaymentRow[]>([]);
  const [advances, setAdvances] = useState<AdvanceRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [typeByCode, setTypeByCode] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!canPay) return;
    setLoading(true);
    setError(null);
    try {
      const [p, a, e, types] = await Promise.all([
        payrollPaymentsApi.list(),
        advancesApi.list(),
        fetchEmployees(),
        paymentTypesApi.list(),
      ]);
      setPayments(p);
      setAdvances(a);
      setEmployees(e.filter((x) => x.is_active));
      setTypeByCode(Object.fromEntries(types.map((ty) => [ty.code, ty.id])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
      emitExpensesRefresh();
    }
  }, [canPay]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedEmployee = employees.find((e) => e.id === form.employee_id);
  const employeeAdvances = useMemo(
    () => advances.filter((a) => a.employee_id === form.employee_id),
    [advances, form.employee_id],
  );

  const installmentPreview = useMemo(() => {
    if (!form.is_scheduled || !isPositiveMoneyAmount(form.amount)) return [];
    const months = Math.max(1, parseInt(form.installment_months, 10) || 0);
    const total = Number(toApiMoneyAmount(form.amount));
    const parts = splitEqualInstallments(total, months);
    return parts.map((amt, i) => ({
      ...addMonths(form.start_year, form.start_month, i),
      amount: amt,
    }));
  }, [form.is_scheduled, form.amount, form.installment_months, form.start_year, form.start_month]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter(
      (p) =>
        p.employee_name?.toLowerCase().includes(q) ||
        p.employee_code?.toLowerCase().includes(q) ||
        p.payment_type_name?.toLowerCase().includes(q) ||
        p.notes?.toLowerCase().includes(q),
    );
  }, [payments, search]);

  const filteredAdvances = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return advances;
    return advances.filter(
      (a) =>
        a.employee_name?.toLowerCase().includes(q) ||
        a.employee_code?.toLowerCase().includes(q) ||
        a.notes?.toLowerCase().includes(q),
    );
  }, [advances, search]);

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalAdvanceBalance = advances.reduce((s, a) => s + Number(a.balance || 0), 0);

  const periodAllowed = isAllowedPayPeriod(form.period_year, form.period_month);

  const canSave = useMemo(() => {
    if (!form.employee_id || !isPositiveMoneyAmount(form.amount)) return false;
    if (form.op_type === 'salary' && !periodAllowed) return false;
    if (form.op_type === 'grant' && !form.grant_reason.trim()) return false;
    if (form.op_type === 'advance' && form.is_scheduled) {
      const m = parseInt(form.installment_months, 10);
      if (!m || m < 1) return false;
    }
    return true;
  }, [form, periodAllowed]);

  const openNew = () => {
    setForm(emptyForm());
    setOpen(true);
  };

  const saveMovement = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const amount = toApiMoneyAmount(form.amount);
      if (form.op_type === 'advance') {
        await advancesApi.create({
          employee_id: form.employee_id,
          amount,
          advance_date: form.payment_date,
          notes: form.notes.trim(),
          is_scheduled: form.is_scheduled,
          installment_months: form.is_scheduled ? parseInt(form.installment_months, 10) : undefined,
          start_year: form.start_year,
          start_month: form.start_month,
        });
      } else {
        const code = form.op_type === 'salary' ? 'PT-01' : 'PT-03';
        const typeId = typeByCode[code];
        if (!typeId) throw new Error(t('payrollExpenses.missingPaymentType'));
        await payrollPaymentsApi.create({
          employee_id: form.employee_id,
          payment_type_id: typeId,
          amount,
          payment_date: form.payment_date,
          period_year: form.op_type === 'salary' ? form.period_year : undefined,
          period_month: form.op_type === 'salary' ? form.period_month : undefined,
          notes: form.notes.trim(),
          grant_reason: form.op_type === 'grant' ? form.grant_reason.trim() : '',
        });
      }
      setOpen(false);
      await load();
      showPremiumToast({ tone: 'success', title: t('payrollExpenses.savedSuccess') });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  if (!canPay) {
    return <AlertBanner variant="error">{t('payrollExpenses.noAccess')}</AlertBanner>;
  }

  const filterSelect =
    'erp-native-select erp-smart-filter-select min-h-10 w-full rounded-xl border border-slate-200 bg-white ps-3 !pe-10 text-sm';

  return (
    <div className="payroll-expenses-shell space-y-4">
      <PageSectionHeader
        icon={<WalletCards className="h-6 w-6" />}
        title={t('nav.payrollAdvances')}
        description={t('payrollExpenses.pageDesc')}
        actions={
          <PageToolbar onRefresh={load}>
            <ErpAddButton onClick={openNew}>{t('payrollExpenses.addMovement')}</ErpAddButton>
          </PageToolbar>
        }
      />

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      <AlertBanner variant="info">
        <ShieldCheck className="inline h-4 w-4 me-1" />
        {t('payrollExpenses.securityHint')}
      </AlertBanner>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label={t('payrollExpenses.kpiMovements')} value={String(payments.length)} />
        <Kpi label={t('payrollExpenses.kpiPaid')} value={fmtMoney(totalPaid)} accent />
        <Kpi label={t('payrollExpenses.kpiAdvances')} value={String(advances.length)} />
        <Kpi label={t('payrollExpenses.kpiAdvanceBalance')} value={fmtMoney(totalAdvanceBalance)} warn />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1">
          {(['movements', 'advances'] as TabView[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-bold',
                tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600',
              )}
            >
              {t(`payrollExpenses.tab.${key}`)}
            </button>
          ))}
        </div>
        <ErpSearchBar
          className="min-w-[200px] flex-1"
          value={search}
          onChange={setSearch}
          placeholder={t('payrollExpenses.search')}
          showAdvanced={false}
        />
      </div>

      {tab === 'movements' ? (
        <DataCard>
          {loading ? (
            <p className="py-16 text-center text-slate-500">{t('inventory.loading')}</p>
          ) : filteredPayments.length === 0 ? (
            <EmptyState label={t('payrollExpenses.emptyMovements')} onAdd={openNew} />
          ) : (
            <DataTable minWidth="1000px">
              <TableHead>
                <Th>{t('employeeData.colCode')}</Th>
                <Th>{t('employeeData.colName')}</Th>
                <Th>{t('payrollExpenses.colType')}</Th>
                <Th>{t('accounting.voucherDate')}</Th>
                <Th align="end">{t('accounting.amount')}</Th>
                <Th>{t('payrollExpenses.colPeriod')}</Th>
                <Th>{t('payrollExpenses.colAudit')}</Th>
              </TableHead>
              <tbody>
                {filteredPayments.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-3 py-2.5 font-mono text-xs text-blue-700">{row.employee_code}</td>
                    <td className="px-3 py-2.5 font-semibold">{row.employee_name}</td>
                    <td className="px-3 py-2.5">
                      <TypePill code={row.payment_type_code} name={row.payment_type_name} />
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{row.payment_date}</td>
                    <td className="px-3 py-2.5 text-end font-bold tabular-nums text-emerald-700">
                      {fmtMoney(row.amount)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">
                      {row.period_year && row.period_month
                        ? formatYearMonth(row.period_year, row.period_month, locale)
                        : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">
                      <AuditLine
                        user={row.created_by_name}
                        at={row.created_at}
                        branch={row.branch_name}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </DataCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <p className="col-span-full py-16 text-center text-slate-500">{t('inventory.loading')}</p>
          ) : filteredAdvances.length === 0 ? (
            <div className="col-span-full">
              <EmptyState label={t('payrollExpenses.emptyAdvances')} onAdd={openNew} />
            </div>
          ) : (
            filteredAdvances.map((adv) => (
              <article
                key={adv.id}
                className="rounded-2xl border bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-blue-700">{adv.employee_code}</p>
                    <h3 className="font-bold text-slate-900">{adv.employee_name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{adv.advance_date}</p>
                  </div>
                  {adv.is_scheduled ? (
                    <span className="rounded-full bg-violet-100 text-violet-800 px-2 py-0.5 text-[10px] font-bold">
                      {t('payrollExpenses.scheduled')}
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">
                      {t('payrollExpenses.unscheduled')}
                    </span>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <MiniStat label={t('payrollExpenses.advanceAmount')} value={fmtMoney(adv.amount)} />
                  <MiniStat label={t('payrollExpenses.settled')} value={fmtMoney(adv.settled_amount)} />
                  <MiniStat label={t('payrollExpenses.balance')} value={fmtMoney(adv.balance)} accent />
                </div>
                {adv.is_scheduled && adv.installments?.length ? (
                  <ul className="mt-3 space-y-1 text-xs border-t pt-3">
                    {adv.installments.map((inst, idx) => (
                      <li key={idx} className="flex justify-between text-slate-600">
                        <span>
                          {formatYearMonth(inst.period_year, inst.period_month, locale)} —{' '}
                          {t('payrollExpenses.installmentLabel')}
                        </span>
                        <span className="font-bold tabular-nums">{fmtMoney(inst.amount)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-2 text-[11px] text-slate-400">
                  <AuditLine user={adv.created_by_name} at={adv.created_at} branch={adv.branch_name} />
                </p>
              </article>
            ))
          )}
        </div>
      )}

      <ErpSideDrawer
        open={open}
        onOpenChange={setOpen}
        title={t('payrollExpenses.addMovement')}
        description={t('payrollExpenses.drawerDesc')}
        saveLabel={t('payrollExpenses.saveMovement')}
        cancelLabel={t('inventory.cancel')}
        disabled={saving || !canSave}
        onSave={saveMovement}
        steps={[t('payrollExpenses.stepEmployee'), t('payrollExpenses.stepType'), t('payrollExpenses.stepAmount')]}
        currentStep={!form.employee_id ? 0 : !isPositiveMoneyAmount(form.amount) ? 1 : 2}
      >
        <div className="space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-800">{t('payrollExpenses.employee')} *</span>
            <select
              className={filterSelect}
              value={form.employee_id}
              onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
            >
              <option value="">{t('payrollExpenses.selectEmployee')}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employee_code} — {emp.full_name || emp.username}
                </option>
              ))}
            </select>
          </label>

          {selectedEmployee ? (
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-sm">
              <p className="font-bold text-slate-900 inline-flex items-center gap-2">
                <UserCircle2 className="h-4 w-4" />
                {selectedEmployee.full_name || selectedEmployee.username}
              </p>
              {employeeAdvances.length > 0 ? (
                <p className="text-xs text-slate-600 mt-1">
                  {t('payrollExpenses.employeeAdvanceCount', { count: String(employeeAdvances.length) })}
                </p>
              ) : null}
            </div>
          ) : null}

          <div>
            <span className="text-sm font-bold text-slate-800 block mb-2">{t('payrollExpenses.opType')} *</span>
            <div className="grid grid-cols-3 gap-2">
              {OP_TYPES.map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, op_type: op }))}
                  className={cn(
                    'rounded-xl border px-3 py-3 text-sm font-bold transition-all',
                    form.op_type === op
                      ? 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-200'
                      : 'border-slate-200 hover:border-blue-200',
                  )}
                >
                  {t(`payrollExpenses.op.${op}`)}
                </button>
              ))}
            </div>
          </div>

          {form.op_type === 'salary' ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">{t('hrPayroll.year')}</span>
                <input
                  type="number"
                  className="w-full h-10 rounded-xl border px-3 text-sm"
                  value={form.period_year}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, period_year: parseInt(e.target.value, 10) || f.period_year }))
                  }
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">{t('hrPayroll.month')}</span>
                <select
                  className={filterSelect}
                  value={form.period_month}
                  onChange={(e) => setForm((f) => ({ ...f, period_month: parseInt(e.target.value, 10) }))}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              {!periodAllowed ? (
                <p className="col-span-2 text-xs font-bold text-amber-700">{t('payrollExpenses.periodBlocked')}</p>
              ) : (
                <p className="col-span-2 text-xs text-slate-500">{t('payrollExpenses.periodHint')}</p>
              )}
            </div>
          ) : null}

          {form.op_type === 'advance' ? (
            <div className="space-y-3 rounded-xl border border-violet-100 bg-violet-50/30 p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_scheduled}
                  onChange={(e) => setForm((f) => ({ ...f, is_scheduled: e.target.checked }))}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm font-bold text-slate-800">{t('payrollExpenses.scheduleAdvance')}</span>
              </label>
              {form.is_scheduled ? (
                <>
                  <label className="block space-y-2">
                    <span className="text-sm font-bold text-slate-700">{t('payrollExpenses.installmentMonths')}</span>
                    <input
                      type="number"
                      min={1}
                      max={36}
                      className="w-full h-10 rounded-xl border px-3 text-sm"
                      value={form.installment_months}
                      onChange={(e) => setForm((f) => ({ ...f, installment_months: e.target.value }))}
                    />
                  </label>
                  {installmentPreview.length > 0 ? (
                    <div className="rounded-lg bg-white border p-3 space-y-1">
                      <p className="text-xs font-bold text-violet-800">{t('payrollExpenses.installmentPreview')}</p>
                      {installmentPreview.map((row, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-slate-600">
                          <span>{formatYearMonth(row.year, row.month, locale)}</span>
                          <span className="font-bold tabular-nums">{fmtMoney(row.amount)}</span>
                        </div>
                      ))}
                      <p className="text-[11px] text-slate-500 pt-1 border-t">{t('payrollExpenses.installmentPayrollHint')}</p>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-xs text-slate-600">{t('payrollExpenses.unscheduledHint')}</p>
              )}
            </div>
          ) : null}

          {form.op_type === 'grant' ? (
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-800">{t('payrollExpenses.grantReason')} *</span>
              <input
                type="text"
                className="w-full h-10 rounded-xl border px-3 text-sm"
                value={form.grant_reason}
                onChange={(e) => setForm((f) => ({ ...f, grant_reason: e.target.value }))}
                placeholder={t('payrollExpenses.grantReasonPh')}
              />
            </label>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-800">{t('accounting.amount')} *</span>
            <MoneyAmountInput
              className="text-2xl font-extrabold tabular-nums text-end h-12"
              value={form.amount}
              onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
            />
            {isPositiveMoneyAmount(form.amount) ? (
              <PaymentAmountHero
                amount={form.amount}
                locale={locale}
                size="sm"
                currencyLabel={locale === 'ar' ? 'جنيه' : 'EGP'}
              />
            ) : null}
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">
              {form.op_type === 'salary' ? t('payrollExpenses.payDate') : t('accounting.voucherDate')}
            </span>
            <input
              type="date"
              className="w-full h-10 rounded-xl border px-3 text-sm"
              value={form.payment_date}
              onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">{t('inventory.notes')}</span>
            <textarea
              className="w-full min-h-[72px] rounded-xl border px-3 py-2 text-sm"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>

          <div className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500 space-y-1">
            <p className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {t('payrollExpenses.auditStampHint')}
            </p>
          </div>
        </div>
      </ErpSideDrawer>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
  warn,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={cn(
          'text-xl font-bold tabular-nums mt-0.5',
          accent && 'text-emerald-700',
          warn && 'text-amber-700',
          !accent && !warn && 'text-slate-900',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className={cn('text-sm font-bold tabular-nums', accent ? 'text-emerald-700' : 'text-slate-800')}>
        {value}
      </p>
    </div>
  );
}

function TypePill({ code, name }: { code: string; name: string }) {
  const tone =
    code === 'PT-01'
      ? 'bg-sky-100 text-sky-800'
      : code === 'PT-02'
        ? 'bg-amber-100 text-amber-800'
        : code === 'PT-03'
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-slate-100 text-slate-700';
  return <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', tone)}>{name}</span>;
}

function AuditLine({
  user,
  at,
  branch,
}: {
  user?: string | null;
  at?: string | null;
  branch?: string | null;
}) {
  const { t } = useLanguage();
  if (!user && !at) return <span>—</span>;
  return (
    <span>
      {user || '—'}
      {at ? ` · ${new Date(at).toLocaleString()}` : ''}
      {branch ? ` · ${t('payrollExpenses.branch')}: ${branch}` : ''}
    </span>
  );
}

function EmptyState({ label, onAdd }: { label: string; onAdd: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="py-16 text-center">
      <BadgeDollarSign className="h-10 w-10 mx-auto text-slate-300 mb-3" />
      <p className="text-sm text-slate-500">{label}</p>
      <ErpAddButton className="mt-4" onClick={onAdd}>
        {t('payrollExpenses.addMovement')}
      </ErpAddButton>
    </div>
  );
}
