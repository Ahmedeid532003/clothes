import React, { useCallback, useEffect, useState } from 'react';
import { BadgeDollarSign, Banknote, CalendarDays, WalletCards } from 'lucide-react';
import { fetchEmployees, type EmployeeDto } from '@/lib/api/employees';
import {
  advancesApi,
  paymentTypesApi,
  payrollPaymentsApi,
  type PayrollPaymentRow,
} from '@/lib/api/hr-payroll';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { AlertBanner, PageToolbar, fmtMoney } from '@/components/accounting/AccountingUi';
import { ErpAddButton } from '@/components/erp/ErpAddButton';
import { HrModuleLayout } from '@/components/hr/HrModuleLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export function PayrollPaymentsPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<PayrollPaymentRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [types, setTypes] = useState<{ id: string; code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    payment_type_id: '',
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    period_year: new Date().getFullYear(),
    period_month: new Date().getMonth() + 1,
    notes: '',
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, e, ty] = await Promise.all([
        payrollPaymentsApi.list(),
        fetchEmployees(),
        paymentTypesApi.list(),
      ]);
      setRows(r);
      setEmployees(e.filter((x) => x.is_active));
      setTypes(ty);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onSave = async () => {
    if (!form.employee_id || !form.payment_type_id || !form.amount) return;
    await payrollPaymentsApi.create(form);
    setOpen(false);
    refresh();
  };

  const onAdvance = async () => {
    if (!form.employee_id || !form.amount) return;
    await advancesApi.create({
      employee_id: form.employee_id,
      amount: form.amount,
      advance_date: form.payment_date,
      notes: form.notes,
    });
    setOpen(false);
    refresh();
  };

  const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  return (
    <HrModuleLayout activeTab="payroll-payments">
      <div className="hr-premium-page space-y-6">
        <section className="hr-premium-hero">
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <span className="hr-premium-hero-icon">
                <WalletCards className="h-7 w-7" />
              </span>
              <div>
                <span className="hr-premium-eyebrow">Payroll Payments</span>
                <h1>{t('hrPayroll.payments.title')}</h1>
                <p>{t('hrPayroll.payments.desc')}</p>
              </div>
            </div>
            <PageToolbar onRefresh={refresh}>
              <ErpAddButton onClick={() => setOpen(true)}>{t('hrPayroll.payments.add')}</ErpAddButton>
            </PageToolbar>
          </div>
        </section>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="hr-premium-stat-card">
            <span className="hr-stat-icon bg-blue-50 text-blue-700">
              <Banknote className="h-5 w-5" />
            </span>
            <p>أذونات الصرف</p>
            <strong>{rows.length}</strong>
            <small>عمليات صرف مسجلة</small>
          </div>
          <div className="hr-premium-stat-card">
            <span className="hr-stat-icon bg-emerald-50 text-emerald-700">
              <BadgeDollarSign className="h-5 w-5" />
            </span>
            <p>إجمالي المصروف</p>
            <strong className="text-emerald-700">{fmtMoney(totalAmount)}</strong>
            <small>إجمالي أذونات الصرف</small>
          </div>
          <div className="hr-premium-stat-card">
            <span className="hr-stat-icon bg-violet-50 text-violet-700">
              <CalendarDays className="h-5 w-5" />
            </span>
            <p>آخر صرف</p>
            <strong className="line-clamp-1 text-2xl">{rows[0]?.payment_date || '—'}</strong>
            <small>حسب ترتيب النظام الحالي</small>
          </div>
        </div>
      </div>
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      <div className="hr-premium-table-card mt-6">
        <div className="hr-premium-table-header">
          <div>
            <h2>{t('hrPayroll.payments.title')}</h2>
            <p>متابعة أذونات صرف الرواتب والسلف بطريقة واضحة قابلة للمراجعة.</p>
          </div>
          <span>{rows.length} سجل</span>
        </div>
        <div className="overflow-x-auto">
        <table className="hr-premium-table w-full text-sm min-w-[800px]">
          <thead>
            <tr>
              <th className="px-3 py-2 font-bold text-start">{t('employeeData.colCode')}</th>
              <th className="px-3 py-2 font-bold text-start">{t('employeeData.colName')}</th>
              <th className="px-3 py-2 font-bold text-start">{t('hrPayroll.colItem')}</th>
              <th className="px-3 py-2 font-bold text-start">{t('hrPayroll.colDate')}</th>
              <th className="px-3 py-2 font-bold text-end">{t('employeeData.amount')}</th>
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
                  <div className="hr-premium-empty-state">{t('hrPayroll.payments.empty')}</div>
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-4 font-mono text-xs font-black text-blue-700">{r.employee_code}</td>
                  <td className="px-6 py-4 font-extrabold text-slate-900">{r.employee_name}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{r.payment_type_name}</span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-600">{r.payment_date}</td>
                  <td className="px-6 py-4 text-end font-black text-emerald-700">{fmtMoney(r.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="erp-side-drawer hr-premium-drawer w-full border-s-0 p-0 sm:max-w-[62vw]">
          <SheetHeader className="erp-side-drawer-header">
            <SheetTitle>{t('hrPayroll.payments.add')}</SheetTitle>
            <p className="text-sm font-bold text-blue-100/90">إضافة إذن صرف أو تسجيل سلفة من نفس الشاشة.</p>
          </SheetHeader>
          <div className="erp-side-drawer-body">
            <div className="hr-premium-form-intro">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                <WalletCards className="h-6 w-6" />
              </span>
              <div>
                <h3>{t('hrPayroll.payments.add')}</h3>
                <p>اختر الموظف ونوع الصرف والمبلغ، ثم احفظ كإذن صرف أو كسلفة حسب الحالة.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="block space-y-1 md:col-span-2">
                <span className="text-xs font-bold text-slate-600">{t('employeeData.colName')}</span>
                <select
                  className="w-full rounded-lg border px-3 py-2 text-sm"
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
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-600">{t('hrPayroll.colItem')}</span>
                <select
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={form.payment_type_id}
                  onChange={(e) => setForm((f) => ({ ...f, payment_type_id: e.target.value }))}
                >
                  <option value="">—</option>
                  {types.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.code} — {x.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-600">{t('employeeData.amount')}</span>
                <Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-600">{t('hrPayroll.colDate')}</span>
                <Input type="date" value={form.payment_date} onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-600">{t('employeeData.notes')}</span>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </label>
            </div>
          </div>
          <SheetFooter className="erp-side-drawer-footer gap-2">
            <Button variant="outline" onClick={onAdvance}>
              {t('hrPayroll.registerAdvance')}
            </Button>
            <Button onClick={onSave} className="erp-add-save-action">{t('hrPayroll.pay')}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </HrModuleLayout>
  );
}
