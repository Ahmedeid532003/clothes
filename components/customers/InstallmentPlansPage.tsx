import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Plus, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { receivablesApi, type InstallmentPlan } from '@/lib/api/receivables';
import { ErpCrudPage } from '@/components/erp/ErpCrudPage';
import {
  AlertBanner,
  DataTable,
  PageToolbar,
  StatusBadge,
  TableHead,
  Th,
  fmtMoney,
} from '@/components/accounting/AccountingUi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ErpRowActions } from '@/components/erp/ErpRowActions';

function computeLocalPreview(
  form: ReturnType<typeof emptyForm>,
  samplePrincipal: number,
): {
  down: number;
  interest: number;
  total: number;
  installment: number;
  schedule: Array<{ month: string; amount: number }>;
} {
  const principal = Math.max(samplePrincipal, 0);
  const downPct = parseFloat(form.down_payment_percent) || 0;
  const down = (principal * downPct) / 100;
  const base =
    form.interest_base === 'before_down_payment'
      ? principal
      : Math.max(principal - down, 0);
  const interest = (base * (parseFloat(form.interest_rate_percent) || 0)) / 100;
  const financed = Math.max(principal - down, 0);
  const installmentsTotal = financed + interest;
  const n = Math.max(parseInt(form.default_num_installments, 10) || 1, 1);
  const installment = installmentsTotal / n;
  const schedule: Array<{ month: string; amount: number }> = [];
  let remaining = installmentsTotal;
  const start = new Date();
  for (let i = 0; i < n; i += 1) {
    const d = new Date(start);
    if (form.period_unit === 'months') {
      d.setMonth(d.getMonth() + i + 1);
    } else {
      d.setDate(d.getDate() + (parseInt(form.interval_days, 10) || 30) * (i + 1));
    }
    const amt = i < n - 1 ? installment : remaining;
    remaining -= amt;
    schedule.push({
      month: d.toLocaleDateString('ar-EG', { month: 'short', year: '2-digit' }),
      amount: Math.round(amt * 100) / 100,
    });
  }
  return {
    down: Math.round(down * 100) / 100,
    interest: Math.round(interest * 100) / 100,
    total: Math.round((down + installmentsTotal) * 100) / 100,
    installment: Math.round(installment * 100) / 100,
    schedule,
  };
}

const emptyForm = () => ({
  name_ar: '',
  period_unit: 'months' as 'days' | 'months',
  interval_days: '30',
  default_num_installments: '6',
  interest_base: 'after_down_payment',
  interest_rate_percent: '0',
  down_payment_percent: '25',
  penalty_fixed_amount: '0',
  penalty_day_of_month: '15',
  grace_days: '0',
  first_due_after_days: '30',
  show_interest_on_receipt: true,
  show_penalty_on_receipt: true,
  is_active: true,
});

type Props = { embedded?: boolean };

export function InstallmentPlansPage({ embedded }: Props) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InstallmentPlan | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [search, setSearch] = useState('');
  const [sampleAmount, setSampleAmount] = useState('1000');

  const formPreview = useMemo(
    () => computeLocalPreview(form, parseFloat(sampleAmount) || 1000),
    [form, sampleAmount],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await receivablesApi.installmentPlans());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name_ar.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.name_en.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (row: InstallmentPlan) => {
    setEditing(row);
    setForm({
      name_ar: row.name_ar,
      period_unit: row.period_unit,
      interval_days: String(row.interval_days),
      default_num_installments: String(row.default_num_installments),
      interest_base: row.interest_base,
      interest_rate_percent: row.interest_rate_percent,
      down_payment_percent: row.down_payment_percent,
      penalty_fixed_amount: row.penalty_fixed_amount,
      penalty_day_of_month: String(row.penalty_day_of_month),
      grace_days: String(row.grace_days),
      first_due_after_days: String(row.first_due_after_days),
      show_interest_on_receipt: row.show_interest_on_receipt,
      show_penalty_on_receipt: row.show_penalty_on_receipt,
      is_active: row.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    const payload = {
      name_ar: form.name_ar.trim(),
      name_en: form.name_ar.trim(),
      period_unit: form.period_unit,
      interval_days: Number(form.interval_days) || 30,
      default_num_installments: Number(form.default_num_installments) || 6,
      interest_base: form.interest_base,
      interest_type: 'percent',
      interest_rate_percent: form.interest_rate_percent,
      down_payment_percent: form.down_payment_percent,
      penalty_fixed_amount: form.penalty_fixed_amount,
      penalty_day_of_month: Number(form.penalty_day_of_month) || 15,
      grace_days: Number(form.grace_days) || 0,
      first_due_after_days: Number(form.first_due_after_days) || 30,
      show_interest_on_receipt: form.show_interest_on_receipt,
      show_penalty_on_receipt: form.show_penalty_on_receipt,
      is_active: form.is_active,
      auto_add_interest: true,
    };
    try {
      if (editing) await receivablesApi.updateInstallmentPlan(editing.id, payload);
      else await receivablesApi.createInstallmentPlan(payload);
      setOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const exportCsv = () => {
    const header = [
      t('installmentPlans.code'),
      t('installmentPlans.name'),
      t('installmentPlans.periodUnit'),
      t('installmentPlans.numInstallments'),
      t('installmentPlans.interestRate'),
      t('installmentPlans.downPaymentPercent'),
      t('inventory.status'),
    ].join(',');
    const body = filtered
      .map((r) =>
        [
          r.code,
          `"${r.name_ar}"`,
          r.period_unit,
          r.default_num_installments,
          r.interest_rate_percent,
          r.down_payment_percent,
          r.is_active ? t('inventory.active') : t('inventory.inactive'),
        ].join(','),
      )
      .join('\n');
    const blob = new Blob([`\uFEFF${header}\n${body}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'installment-plans.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const content = (
    <>
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      <PageToolbar onRefresh={load}>
        <Input
          className="h-9 w-56"
          placeholder={t('common.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button size="sm" variant="outline" onClick={exportCsv} disabled={!filtered.length}>
          <Download className="h-4 w-4 me-1" />
          {t('common.export')}
        </Button>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 me-1" />
          {t('installmentPlans.add')}
        </Button>
      </PageToolbar>

      <DataTable>
        <TableHead>
          <tr>
            <Th>{t('installmentPlans.code')}</Th>
            <Th>{t('installmentPlans.name')}</Th>
            <Th>{t('installmentPlans.periodUnit')}</Th>
            <Th>{t('installmentPlans.numInstallments')}</Th>
            <Th className="text-end">{t('installmentPlans.interestRate')}</Th>
            <Th className="text-end">{t('installmentPlans.downPaymentPercent')}</Th>
            <Th>{t('installmentPlans.interestBase')}</Th>
            <Th>{t('inventory.status')}</Th>
            <Th className="text-end">{t('inventory.actions')}</Th>
          </tr>
        </TableHead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={9} className="py-10 text-center text-slate-500">
                {t('inventory.loading')}
              </td>
            </tr>
          ) : filtered.length === 0 ? (
            <tr>
              <td colSpan={9} className="py-10 text-center text-slate-500">
                {t('installmentPlans.empty')}
              </td>
            </tr>
          ) : (
            filtered.map((row) => (
              <tr key={row.id} className="border-t hover:bg-slate-50/80">
                <td className="px-3 py-2 font-mono text-xs">{row.code}</td>
                <td className="px-3 py-2 font-semibold">{row.name_ar}</td>
                <td className="px-3 py-2">
                  {row.period_unit === 'days'
                    ? `${row.interval_days} ${t('installmentPlans.days')}`
                    : t('installmentPlans.months')}
                </td>
                <td className="px-3 py-2">{row.default_num_installments}</td>
                <td className="px-3 py-2 text-end">{row.interest_rate_percent}%</td>
                <td className="px-3 py-2 text-end">{row.down_payment_percent}%</td>
                <td className="px-3 py-2 text-xs">
                  {row.interest_base === 'before_down_payment'
                    ? t('installmentPlans.interestOnTotal')
                    : t('installmentPlans.interestOnRemainder')}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={row.is_active ? 'posted' : 'draft'} />
                </td>
                <td className="px-3 py-2 text-end">
                  <ErpRowActions onEdit={() => openEdit(row)} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto p-0 [&>button]:hidden">
          <div className="flex items-center justify-between bg-[#4169E1] px-4 py-3.5 text-white">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
            <h2 className="text-base font-black">
              {editing ? t('installmentPlans.editTitle') : t('installmentPlans.createTitle')}
            </h2>
            <span className="w-9" />
          </div>

          <div className="p-4 space-y-4 bg-white">
            <table className="w-full border-collapse text-sm" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
              <tbody>
                <tr>
                  <td colSpan={2} className="border border-slate-400 p-2 text-center font-bold text-slate-700">
                    {t('installmentPlans.name')}
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="border border-slate-400 p-2">
                    <Input
                      value={form.name_ar}
                      onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
                      placeholder={t('installmentPlans.namePlaceholder')}
                      className="h-11 rounded-full border-2 text-center font-bold"
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="grid gap-4 lg:grid-cols-2">
              <table className="w-full h-full border-collapse text-sm" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                <tbody>
                  <tr>
                    <td className="border border-slate-400 p-3 align-top space-y-3">
                      <p className="font-black text-blue-900 mb-2">{t('installmentPlans.interestBase')}</p>
                      <label className="flex items-start gap-2 font-semibold cursor-pointer">
                        <input
                          type="radio"
                          className="mt-1"
                          checked={form.interest_base === 'before_down_payment'}
                          onChange={() => setForm((f) => ({ ...f, interest_base: 'before_down_payment' }))}
                        />
                        {t('installmentPlans.interestOnTotal')}
                      </label>
                      <label className="flex items-start gap-2 font-semibold cursor-pointer">
                        <input
                          type="radio"
                          className="mt-1"
                          checked={form.interest_base === 'after_down_payment'}
                          onChange={() => setForm((f) => ({ ...f, interest_base: 'after_down_payment' }))}
                        />
                        {t('installmentPlans.interestOnRemainder')}
                      </label>
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full border-collapse text-sm" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                <tbody>
                  <tr>
                    <td className="border border-slate-400 p-2 font-bold text-slate-700 w-1/2">{t('installmentPlans.periodUnit')}</td>
                    <td className="border border-slate-400 p-2">
                      <select
                        className="w-full rounded-lg border px-2 py-1.5 text-sm font-bold"
                        value={form.period_unit}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, period_unit: e.target.value as 'days' | 'months' }))
                        }
                      >
                        <option value="months">{t('installmentPlans.months')}</option>
                        <option value="days">{t('installmentPlans.days')}</option>
                      </select>
                    </td>
                  </tr>
                  {form.period_unit === 'days' ? (
                    <tr>
                      <td className="border border-slate-400 p-2 font-bold">{t('installmentPlans.intervalDays')}</td>
                      <td className="border border-slate-400 p-2">
                        <Input type="number" min="1" value={form.interval_days} onChange={(e) => setForm((f) => ({ ...f, interval_days: e.target.value }))} />
                      </td>
                    </tr>
                  ) : null}
                  <tr>
                    <td className="border border-slate-400 p-2 font-bold">{t('installmentPlans.interestRate')}</td>
                    <td className="border border-slate-400 p-2">
                      <Input type="number" min="0" step="0.01" value={form.interest_rate_percent} onChange={(e) => setForm((f) => ({ ...f, interest_rate_percent: e.target.value }))} />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-400 p-2 font-bold">{t('installmentPlans.downPaymentPercent')}</td>
                    <td className="border border-slate-400 p-2">
                      <div className="flex gap-1">
                        <Input type="number" min="0" max="100" value={form.down_payment_percent} onChange={(e) => setForm((f) => ({ ...f, down_payment_percent: e.target.value }))} className="flex-1" />
                        <Button type="button" size="sm" variant="outline" onClick={() => setForm((f) => ({ ...f, down_payment_percent: '25' }))}>25%</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => setForm((f) => ({ ...f, down_payment_percent: '50' }))}>50%</Button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-400 p-2 font-bold">{t('installmentPlans.numInstallments')}</td>
                    <td className="border border-slate-400 p-2">
                      <Input type="number" min="1" value={form.default_num_installments} onChange={(e) => setForm((f) => ({ ...f, default_num_installments: e.target.value }))} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <table className="w-full border-collapse text-sm" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
              <tbody>
                <tr>
                  <td className="border border-slate-400 p-2 font-bold">{t('installmentPlans.penaltyAmount')}</td>
                  <td className="border border-slate-400 p-2 w-28">
                    <Input type="number" min="0" value={form.penalty_fixed_amount} onChange={(e) => setForm((f) => ({ ...f, penalty_fixed_amount: e.target.value }))} />
                  </td>
                  <td className="border border-slate-400 p-2 font-bold">{t('installmentPlans.penaltyDay')}</td>
                  <td className="border border-slate-400 p-2 w-24">
                    <Input type="number" min="1" max="28" value={form.penalty_day_of_month} onChange={(e) => setForm((f) => ({ ...f, penalty_day_of_month: e.target.value }))} />
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="border border-slate-400 p-2 text-xs font-bold text-red-600 text-center">
                    {t('installmentPlans.penaltyHint')}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3 space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[140px]">
                  <label className="text-xs font-bold text-slate-600">{t('installmentPlans.sampleAmount')}</label>
                  <Input type="number" min="0" value={sampleAmount} onChange={(e) => setSampleAmount(e.target.value)} className="mt-1" />
                </div>
                <div className="text-sm space-y-1 font-bold">
                  <p>{t('installmentPlans.downPaymentPercent')}: {fmtMoney(formPreview.down)}</p>
                  <p>{t('installmentPlans.interestRate')}: {fmtMoney(formPreview.interest)}</p>
                  <p>{t('pos.installmentValue')}: {fmtMoney(formPreview.installment)}</p>
                </div>
              </div>
              <p className="text-xs font-black text-slate-800">{t('installmentPlans.schedulePreview')}</p>
              <table className="w-full border-collapse text-sm border border-slate-300" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                <thead>
                  <tr className="bg-white">
                    <th className="border border-slate-300 px-3 py-2 text-start">{t('pos.installmentMonth')}</th>
                    <th className="border border-slate-300 px-3 py-2 text-end">{t('pos.installmentAmount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {formPreview.schedule.map((ln, idx) => (
                    <tr key={idx}>
                      <td className="border border-slate-300 px-3 py-2 font-semibold">{ln.month}</td>
                      <td className="border border-slate-300 px-3 py-2 text-end font-black tabular-nums">{fmtMoney(ln.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 rounded-xl border bg-white p-3">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={form.show_interest_on_receipt} onChange={(e) => setForm((f) => ({ ...f, show_interest_on_receipt: e.target.checked }))} />
                {t('installmentPlans.showInterestOnReceipt')}
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={form.show_penalty_on_receipt} onChange={(e) => setForm((f) => ({ ...f, show_penalty_on_receipt: e.target.checked }))} />
                {t('installmentPlans.showPenaltyOnReceipt')}
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
                {t('inventory.active')}
              </label>
            </div>
          </div>

          <div className="sticky bottom-0 bg-[#4169E1] px-4 py-4 flex items-center justify-between gap-3">
            <span className="w-24" />
            <Button variant="outline" className="h-11 min-w-[100px] rounded-xl border-0 bg-red-500 font-black text-white hover:bg-red-600" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button className="h-11 min-w-[100px] rounded-xl bg-emerald-600 font-black text-white hover:bg-emerald-700" disabled={!form.name_ar.trim()} onClick={save}>
              {t('common.save')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );

  if (embedded) return <div className="space-y-4">{content}</div>;

  return (
    <ErpCrudPage
      title={t('installmentPlans.title')}
      description={t('installmentPlans.desc')}
      actions={
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      }
    >
      {content}
    </ErpCrudPage>
  );
}
