import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, FileText, Plus, Send, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  costCentersApi,
  expenseTypesApi,
  expenseVouchersApi,
  treasuriesApi,
  type ExpenseTypeDto,
  type ExpenseVoucherDto,
} from '@/lib/api/accounting';
import { fetchBranches } from '@/lib/api/branches';
import { fetchEmployees } from '@/lib/api/employees';
import { fetchSuppliers } from '@/lib/api/inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertBanner,
  DataCard,
  DataTable,
  LinkAction,
  PageSectionHeader,
  PageToolbar,
  StatusBadge,
  TableHead,
  Th,
  appNavigate,
  fmtMoney,
} from '@/components/accounting/AccountingUi';
import { emitExpensesRefresh } from '@/components/accounting/ExpensesHub';

const emptyForm = () => ({
  voucher_date: new Date().toISOString().slice(0, 10),
  expense_type: '',
  amount: '',
  tax_amount: '0',
  payment_method: 'cash',
  treasury: '',
  branch: '',
  cost_center: '',
  beneficiary: '',
  supplier: '',
  responsible: '',
  notes: '',
});

export function GeneralExpenseVouchersPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<ExpenseVoucherDto[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseTypeDto[]>([]);
  const [treasuries, setTreasuries] = useState<{ id: string; label: string; branch: string | null }[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [costCenters, setCostCenters] = useState<{ id: string; label: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name_ar: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [v, et, tr, br, cc, sup, emp] = await Promise.all([
        expenseVouchersApi.list(statusFilter || undefined),
        expenseTypesApi.list(),
        treasuriesApi.list(),
        fetchBranches(),
        costCentersApi.list(),
        fetchSuppliers(),
        fetchEmployees(),
      ]);
      setRows(v);
      setExpenseTypes(et.filter((x) => x.is_active && x.gl_account));
      setTreasuries(
        tr.map((x) => ({
          id: x.id,
          label: `${x.code} — ${x.name_ar}`,
          branch: x.branch,
        })),
      );
      setBranches(br.map((b) => ({ id: b.id, name: b.name_ar || b.name_en || b.code })));
      setCostCenters(cc.map((c) => ({ id: c.id, label: `${c.code} — ${c.name_ar}` })));
      setSuppliers(sup);
      setEmployees(emp.map((e) => ({ id: e.id, name: e.full_name || e.username })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
      emitExpensesRefresh();
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const typesById = useMemo(() => Object.fromEntries(expenseTypes.map((et) => [et.id, et])), [expenseTypes]);

  const totalPreview = useMemo(() => {
    const a = Number(form.amount) || 0;
    const tax = Number(form.tax_amount) || 0;
    return (a + tax).toFixed(2);
  }, [form.amount, form.tax_amount]);

  const statusLabel = (s: string) => {
    const m: Record<string, string> = {
      draft: t('accounting.voucherStatusDraft'),
      approved: t('accounting.voucherStatusApproved'),
      posted: t('accounting.voucherStatusPosted'),
      cancelled: t('accounting.voucherStatusCancelled'),
    };
    return m[s] ?? s;
  };

  const applyExpenseTypeDefaults = (typeId: string) => {
    const et = typesById[typeId];
    if (!et) return;
    setForm((f) => ({
      ...f,
      expense_type: typeId,
      branch: et.branch || f.branch,
      cost_center: et.cost_center || f.cost_center,
    }));
  };

  const onSave = async (approve: boolean, post = false) => {
    setSaving(true);
    setError(null);
    try {
      await expenseVouchersApi.create(
        {
          ...form,
          branch: form.branch || null,
          cost_center: form.cost_center || null,
          supplier: form.supplier || null,
          responsible: form.responsible || null,
          approve,
          post,
        },
        files.length ? files : undefined,
      );
      setOpen(false);
      setFiles([]);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const openNew = () => {
    const firstType = expenseTypes[0];
    setForm({
      ...emptyForm(),
      expense_type: firstType?.id ?? '',
      treasury: treasuries[0]?.id ?? '',
      branch: firstType?.branch || branches[0]?.id || '',
      cost_center: firstType?.cost_center || '',
    });
    setFiles([]);
    setOpen(true);
  };

  const canAdd = expenseTypes.length > 0 && treasuries.length > 0;

  return (
    <div className="space-y-4">
      <PageSectionHeader
        icon={<FileText className="h-6 w-6" />}
        title={t('nav.expenseVouchers')}
        description={t('accounting.vouchersDesc')}
        actions={
          <PageToolbar onRefresh={load}>
            <Button size="sm" onClick={openNew} disabled={!canAdd}>
              <Plus className="h-4 w-4 me-1" />
              {t('accounting.addVoucher')}
            </Button>
          </PageToolbar>
        }
      />

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      {!expenseTypes.length ? (
        <AlertBanner variant="warning">
          {t('accounting.setupExpenseTypes')}{' '}
          <LinkAction label={t('nav.expenseTypes')} tab="expense-types" />
        </AlertBanner>
      ) : null}
      {!treasuries.length ? (
        <AlertBanner variant="warning">{t('accounting.setupTreasuries')}</AlertBanner>
      ) : null}

      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-xs text-slate-500">{t('accounting.filterStatus')}</label>
        <select
          className="h-9 rounded-md border px-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">{t('accounting.allStatuses')}</option>
          <option value="draft">{t('accounting.voucherStatusDraft')}</option>
          <option value="approved">{t('accounting.voucherStatusApproved')}</option>
          <option value="posted">{t('accounting.voucherStatusPosted')}</option>
          <option value="cancelled">{t('accounting.voucherStatusCancelled')}</option>
        </select>
      </div>

      <DataCard>
        <DataTable minWidth="960px">
          <TableHead>
            <Th>{t('inventory.code')}</Th>
            <Th>{t('purchases.date')}</Th>
            <Th>{t('accounting.expenseType')}</Th>
            <Th align="end">{t('accounting.totalAmount')}</Th>
            <Th>{t('accounting.treasury')}</Th>
            <Th>{t('accounting.beneficiary')}</Th>
            <Th>{t('inventory.status')}</Th>
            <Th align="end">{t('inventory.actions')}</Th>
          </TableHead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-500">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-500">
                  {t('accounting.vouchersEmpty')}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-3 py-2 font-mono text-xs text-blue-800">{r.code}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.voucher_date}</td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-xs text-slate-500">{r.expense_type_code}</span>
                    <div className="font-medium">{r.expense_type_name}</div>
                  </td>
                  <td className="px-3 py-2 text-end font-semibold tabular-nums">{fmtMoney(r.total_amount)}</td>
                  <td className="px-3 py-2">{r.treasury_name}</td>
                  <td className="px-3 py-2">{r.beneficiary || r.supplier_name || '—'}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={r.status} label={statusLabel(r.status)} />
                    {r.requires_manager_review && r.status === 'approved' && (
                      <AlertTriangle
                        className="inline h-3.5 w-3.5 text-amber-500 ms-1"
                        title={t('accounting.needsReview')}
                      />
                    )}
                    {r.journal_code && (
                      <button
                        type="button"
                        onClick={() => appNavigate('journal-entries')}
                        className="block text-xs text-blue-600 font-mono mt-0.5 hover:underline"
                      >
                        {r.journal_code}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      {r.status === 'draft' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            title={t('purchases.saveAndApprove')}
                            onClick={() => runAction(() => expenseVouchersApi.approve(r.id))}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => runAction(() => expenseVouchersApi.cancel(r.id))}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      {r.status === 'approved' && (
                        <Button
                          size="sm"
                          title={t('accounting.voucherPost')}
                          onClick={() => runAction(() => expenseVouchersApi.post(r.id))}
                        >
                          <Send className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>
      </DataCard>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{t('accounting.addVoucher')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <Field label={t('purchases.date')}>
              <Input
                type="date"
                value={form.voucher_date}
                onChange={(e) => setForm({ ...form, voucher_date: e.target.value })}
              />
            </Field>
            <Field label={t('accounting.expenseType')}>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={form.expense_type}
                onChange={(e) => applyExpenseTypeDefaults(e.target.value)}
              >
                {expenseTypes.map((et) => (
                  <option key={et.id} value={et.id}>
                    {et.code} — {et.name_ar}
                    {et.gl_account_code ? ` (${et.gl_account_code})` : ''}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={t('accounting.amount')}>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </Field>
              <Field label={t('accounting.tax')}>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.tax_amount}
                  onChange={(e) => setForm({ ...form, tax_amount: e.target.value })}
                />
              </Field>
            </div>
            <div className="rounded-lg bg-slate-900 text-white px-3 py-2 text-sm font-semibold flex justify-between">
              <span>{t('accounting.totalAmount')}</span>
              <span className="tabular-nums">{fmtMoney(totalPreview)}</span>
            </div>
            <Field label={t('accounting.treasury')}>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={form.treasury}
                onChange={(e) => {
                  const tr = treasuries.find((x) => x.id === e.target.value);
                  setForm({
                    ...form,
                    treasury: e.target.value,
                    branch: tr?.branch || form.branch,
                  });
                }}
              >
                {treasuries.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('accounting.paymentMethod')}>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              >
                <option value="cash">{t('pos.payCash')}</option>
                <option value="bank">{t('suppliers.payBank')}</option>
                <option value="cheque">{t('suppliers.payCheque')}</option>
              </select>
            </Field>
            <Field label={t('accounting.beneficiary')}>
              <Input
                value={form.beneficiary}
                onChange={(e) => setForm({ ...form, beneficiary: e.target.value })}
              />
            </Field>
            <Field label={`${t('purchases.supplier')} (${t('accounting.optional')})`}>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              >
                <option value="">{t('accounting.none')}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name_ar}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('accounting.colBranch')}>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
              >
                <option value="">{t('accounting.none')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('accounting.costCenter')}>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={form.cost_center}
                onChange={(e) => setForm({ ...form, cost_center: e.target.value })}
              >
                <option value="">{t('accounting.none')}</option>
                {costCenters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('accounting.responsible')}>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={form.responsible}
                onChange={(e) => setForm({ ...form, responsible: e.target.value })}
              >
                <option value="">{t('accounting.none')}</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('accounting.attachments')}>
              <Input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
            </Field>
            <Input
              placeholder={t('inventory.notes')}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <SheetFooter className="flex-col gap-2 sm:flex-col">
            <Button disabled={saving} variant="outline" onClick={() => onSave(false)}>
              {t('purchases.saveDraft')}
            </Button>
            <Button disabled={saving} onClick={() => onSave(true)}>
              {t('purchases.saveAndApprove')}
            </Button>
            <Button disabled={saving} onClick={() => onSave(true, true)}>
              {t('accounting.voucherPost')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600 block mb-1">{label}</label>
      {children}
    </div>
  );
}
