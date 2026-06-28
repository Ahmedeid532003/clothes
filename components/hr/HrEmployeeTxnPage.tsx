import React, { useCallback, useEffect, useState } from 'react';
import { BadgeDollarSign, CalendarDays, ReceiptText } from 'lucide-react';
import { fetchEmployees, type EmployeeDto } from '@/lib/api/employees';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { AlertBanner, PageToolbar, fmtMoney } from '@/components/accounting/AccountingUi';
import { ErpAddButton } from '@/components/erp/ErpAddButton';
import { HrModuleLayout } from '@/components/hr/HrModuleLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type ItemOpt = { id: string; code: string; name: string };

type TxnRow = {
  id: string;
  employee_code: string;
  employee_name: string;
  amount: string;
  [key: string]: string | number | undefined;
};

type Props = {
  activeTab: string;
  titleKey: string;
  descKey: string;
  addKey: string;
  emptyKey: string;
  dateField: string;
  itemField: string;
  itemNameField: string;
  loadItems: () => Promise<ItemOpt[]>;
  loadRows: () => Promise<TxnRow[]>;
  createRow: (body: Record<string, unknown>) => Promise<unknown>;
};

export function HrEmployeeTxnPage(props: Props) {
  const {
    activeTab,
    titleKey,
    descKey,
    addKey,
    emptyKey,
    dateField,
    itemField,
    itemNameField,
    loadItems,
    loadRows,
    createRow,
  } = props;
  const { t } = useLanguage();
  const [rows, setRows] = useState<TxnRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [items, setItems] = useState<ItemOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    item_id: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, e, it] = await Promise.all([loadRows(), fetchEmployees(), loadItems()]);
      setRows(r);
      setEmployees(e.filter((x) => x.is_active));
      setItems(it);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [loadItems, loadRows]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onSave = async () => {
    if (!form.employee_id || !form.amount) return;
    try {
      await createRow({
        employee_id: form.employee_id,
        [itemField]: form.item_id || null,
        amount: form.amount,
        [dateField]: form.date,
        notes: form.notes,
      });
      setOpen(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  return (
    <HrModuleLayout activeTab={activeTab}>
      <div className="hr-premium-page space-y-6">
        <section className="hr-premium-hero">
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <span className="hr-premium-hero-icon">
                <ReceiptText className="h-7 w-7" />
              </span>
              <div>
                <span className="hr-premium-eyebrow">HR Transactions</span>
                <h1>{t(titleKey)}</h1>
                <p>{t(descKey)}</p>
              </div>
            </div>
            <PageToolbar onRefresh={refresh}>
              <ErpAddButton onClick={() => setOpen(true)}>{t(addKey)}</ErpAddButton>
            </PageToolbar>
          </div>
        </section>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="hr-premium-stat-card">
            <span className="hr-stat-icon bg-blue-50 text-blue-700">
              <ReceiptText className="h-5 w-5" />
            </span>
            <p>إجمالي السجلات</p>
            <strong>{rows.length}</strong>
            <small>حركات مسجلة في النظام</small>
          </div>
          <div className="hr-premium-stat-card">
            <span className="hr-stat-icon bg-emerald-50 text-emerald-700">
              <BadgeDollarSign className="h-5 w-5" />
            </span>
            <p>إجمالي القيمة</p>
            <strong className="text-emerald-700">{fmtMoney(totalAmount)}</strong>
            <small>إجمالي مبالغ الصفحة الحالية</small>
          </div>
          <div className="hr-premium-stat-card">
            <span className="hr-stat-icon bg-violet-50 text-violet-700">
              <CalendarDays className="h-5 w-5" />
            </span>
            <p>آخر حركة</p>
            <strong className="line-clamp-1 text-2xl">{String(rows[0]?.[dateField] || '—')}</strong>
            <small>حسب ترتيب النظام الحالي</small>
          </div>
        </div>
      </div>
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      <div className="hr-premium-table-card mt-6">
        <div className="hr-premium-table-header">
          <div>
            <h2>{t(titleKey)}</h2>
            <p>عرض مبالغ الموظفين والبنود المرتبطة بها مع تنسيق واضح للبيانات المالية.</p>
          </div>
          <span>{rows.length} سجل</span>
        </div>
        <div className="overflow-x-auto">
        <table className="hr-premium-table w-full text-sm min-w-[720px]">
          <thead>
            <tr>
              <th className="px-3 py-2.5 text-start font-bold">{t('employeeData.colCode')}</th>
              <th className="px-3 py-2.5 text-start font-bold">{t('employeeData.colName')}</th>
              <th className="px-3 py-2.5 text-start font-bold">{t('hrPayroll.colItem')}</th>
              <th className="px-3 py-2.5 text-start font-bold">{t('hrPayroll.colDate')}</th>
              <th className="px-3 py-2.5 text-end font-bold">{t('employeeData.amount')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-10">
                  <div className="hr-premium-empty-state">
                    <span className="erp-skeleton-line mx-auto h-3 w-48" />
                    <span className="erp-skeleton-line mx-auto h-3 w-64" />
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-10">
                  <div className="hr-premium-empty-state">{t(emptyKey)}</div>
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-4 font-mono text-xs font-black text-blue-700">{r.employee_code}</td>
                  <td className="px-6 py-4 font-extrabold text-slate-900">{r.employee_name}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{String(r[itemNameField] || '—')}</span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-600">{String(r[dateField] || '')}</td>
                  <td className="px-6 py-4 text-end font-black tabular-nums text-emerald-700">{fmtMoney(r.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="center" className="erp-form-modal erp-form-modal--full erp-side-drawer hr-premium-drawer w-full border-0 p-0 flex flex-col">
          <SheetHeader className="erp-side-drawer-header">
            <SheetTitle>{t(addKey)}</SheetTitle>
            <p className="text-sm font-bold text-blue-100/90">إضافة حركة مالية للموظف داخل الموارد البشرية.</p>
          </SheetHeader>
          <div className="erp-side-drawer-body">
            <div className="hr-premium-form-intro">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                <BadgeDollarSign className="h-6 w-6" />
              </span>
              <div>
                <h3>{t(addKey)}</h3>
                <p>اختر الموظف والبند والمبلغ والتاريخ، وسيتم حفظ الحركة في نفس تدفق الرواتب.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-600">{t('employeeData.colName')}</label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={form.employee_id}
                onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
              >
                <option value="">—</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.employee_code} — {e.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">{t('hrPayroll.colItem')}</label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={form.item_id}
                onChange={(e) => setForm((f) => ({ ...f, item_id: e.target.value }))}
              >
                <option value="">—</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.code} — {i.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">{t('employeeData.amount')}</label>
              <Input
                type="number"
                className="mt-1"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">{t('hrPayroll.colDate')}</label>
              <Input
                type="date"
                className="mt-1"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-600">{t('employeeData.notes')}</label>
              <Input
                className="mt-1"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            </div>
          </div>
          <SheetFooter className="erp-side-drawer-footer">
            <Button variant="outline" onClick={() => setOpen(false)}>{t('inventory.cancel')}</Button>
            <Button onClick={onSave} className="erp-add-save-action">{t('departments.save')}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </HrModuleLayout>
  );
}
