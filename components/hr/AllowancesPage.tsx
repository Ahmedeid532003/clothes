import React, { useCallback, useEffect, useState } from 'react';
import { BadgeDollarSign, Gift, UserRoundCheck } from 'lucide-react';
import { fetchEmployees, type EmployeeDto } from '@/lib/api/employees';
import {
  allowanceItemsApi,
  allowancesApi,
  type AllowanceAssignRow,
} from '@/lib/api/hr-payroll';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { AlertBanner, PageToolbar, fmtMoney } from '@/components/accounting/AccountingUi';
import { ErpAddButton } from '@/components/erp/ErpAddButton';
import { HrModuleLayout } from '@/components/hr/HrModuleLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export function AllowancesPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<AllowanceAssignRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [items, setItems] = useState<{ id: string; code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employee_id: '', allowance_item_id: '', amount: '' });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, e, it] = await Promise.all([
        allowancesApi.list(),
        fetchEmployees(),
        allowanceItemsApi.list(),
      ]);
      setRows(r);
      setEmployees(e.filter((x) => x.is_active));
      setItems(it);
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
    if (!form.employee_id || !form.allowance_item_id) return;
    await allowancesApi.create(form);
    setOpen(false);
    refresh();
  };

  const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  return (
    <HrModuleLayout activeTab="allowances">
      <div className="hr-premium-page space-y-6">
        <section className="hr-premium-hero">
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <span className="hr-premium-hero-icon">
                <Gift className="h-7 w-7" />
              </span>
              <div>
                <span className="hr-premium-eyebrow">HR Allowances</span>
                <h1>{t('hrPayroll.allowances.title')}</h1>
                <p>{t('hrPayroll.allowances.desc')}</p>
              </div>
            </div>
            <PageToolbar onRefresh={refresh}>
              <ErpAddButton onClick={() => setOpen(true)}>{t('hrPayroll.allowances.add')}</ErpAddButton>
            </PageToolbar>
          </div>
        </section>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="hr-premium-stat-card">
            <span className="hr-stat-icon bg-blue-50 text-blue-700">
              <UserRoundCheck className="h-5 w-5" />
            </span>
            <p>إجمالي السجلات</p>
            <strong>{rows.length}</strong>
            <small>بدلات مرتبطة بالموظفين</small>
          </div>
          <div className="hr-premium-stat-card">
            <span className="hr-stat-icon bg-emerald-50 text-emerald-700">
              <BadgeDollarSign className="h-5 w-5" />
            </span>
            <p>إجمالي البدلات</p>
            <strong className="text-emerald-700">{fmtMoney(totalAmount)}</strong>
            <small>إجمالي قيمة البدلات</small>
          </div>
          <div className="hr-premium-stat-card">
            <span className="hr-stat-icon bg-violet-50 text-violet-700">
              <Gift className="h-5 w-5" />
            </span>
            <p>أنواع البنود</p>
            <strong>{items.length}</strong>
            <small>بنود متاحة للاستخدام</small>
          </div>
        </div>
      </div>
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      <div className="hr-premium-table-card mt-6">
        <div className="hr-premium-table-header">
          <div>
            <h2>{t('hrPayroll.allowances.title')}</h2>
            <p>توزيع البدلات على الموظفين بصورة منظمة وواضحة.</p>
          </div>
          <span>{rows.length} سجل</span>
        </div>
        <div className="overflow-x-auto">
        <table className="hr-premium-table w-full text-sm min-w-[640px]">
          <thead>
            <tr>
              <th className="px-3 py-2.5 text-start font-bold">{t('employeeData.colCode')}</th>
              <th className="px-3 py-2.5 text-start font-bold">{t('employeeData.colName')}</th>
              <th className="px-3 py-2.5 text-start font-bold">{t('hrPayroll.colItem')}</th>
              <th className="px-3 py-2.5 text-end font-bold">{t('employeeData.amount')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="p-10">
                  <div className="hr-premium-empty-state">
                    <span className="erp-skeleton-line mx-auto h-3 w-48" />
                    <span className="erp-skeleton-line mx-auto h-3 w-64" />
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-10">
                  <div className="hr-premium-empty-state">{t('hrPayroll.allowances.empty')}</div>
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-4 font-mono text-xs font-black text-blue-700">{r.employee_code}</td>
                  <td className="px-6 py-4 font-extrabold text-slate-900">{r.employee_name}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{r.allowance_item_name}</span>
                  </td>
                  <td className="px-6 py-4 text-end font-black text-emerald-700">{fmtMoney(r.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="erp-side-drawer hr-premium-drawer w-full border-s-0 p-0 sm:max-w-[60vw]">
          <SheetHeader className="erp-side-drawer-header">
            <SheetTitle>{t('hrPayroll.allowances.add')}</SheetTitle>
            <p className="text-sm font-bold text-blue-100/90">إضافة بدل لموظف مع اختيار البند والقيمة.</p>
          </SheetHeader>
          <div className="erp-side-drawer-body">
            <div className="hr-premium-form-intro">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Gift className="h-6 w-6" />
              </span>
              <div>
                <h3>{t('hrPayroll.allowances.add')}</h3>
                <p>اختر الموظف وبند البدل وحدد القيمة لتظهر مباشرة في حسابات الرواتب.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm md:col-span-2"
              value={form.employee_id}
              onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
            >
              <option value="">{t('employeeData.colName')}</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.employee_code} — {e.full_name}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.allowance_item_id}
              onChange={(e) => setForm((f) => ({ ...f, allowance_item_id: e.target.value }))}
            >
              <option value="">{t('hrPayroll.colItem')}</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.code} — {i.name}
                </option>
              ))}
            </select>
            <Input
              type="number"
              placeholder={t('employeeData.amount')}
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
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
