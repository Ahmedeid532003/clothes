import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Clock3, Palmtree, UserRoundCheck } from 'lucide-react';
import { fetchEmployees, type EmployeeDto } from '@/lib/api/employees';
import { leaveTypesApi, leavesApi, type LeaveRow } from '@/lib/api/hr-payroll';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { AlertBanner, PageToolbar } from '@/components/accounting/AccountingUi';
import { ErpAddButton } from '@/components/erp/ErpAddButton';
import { HrModuleLayout } from '@/components/hr/HrModuleLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export function EmployeeLeavesPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [types, setTypes] = useState<{ id: string; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    leave_type_id: '',
    start_date: '',
    end_date: '',
    unit: 'days' as 'days' | 'hours',
    quantity: '1',
    notes: '',
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, e, ty] = await Promise.all([leavesApi.list(), fetchEmployees(), leaveTypesApi.list()]);
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
    if (!form.employee_id || !form.leave_type_id) return;
    await leavesApi.create(form);
    setOpen(false);
    refresh();
  };

  const totalQuantity = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const hourlyLeaves = rows.filter((row) => row.unit === 'hours').length;

  return (
    <HrModuleLayout activeTab="leaves">
      <div className="hr-premium-page space-y-6">
        <section className="hr-premium-hero">
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <span className="hr-premium-hero-icon">
                <Palmtree className="h-7 w-7" />
              </span>
              <div>
                <span className="hr-premium-eyebrow">Leave Management</span>
                <h1>{t('hrPayroll.leaves.title')}</h1>
                <p>{t('hrPayroll.leaves.desc')}</p>
              </div>
            </div>
            <PageToolbar onRefresh={refresh}>
              <ErpAddButton onClick={() => setOpen(true)}>{t('hrPayroll.leaves.add')}</ErpAddButton>
            </PageToolbar>
          </div>
        </section>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="hr-premium-stat-card">
            <span className="hr-stat-icon bg-blue-50 text-blue-700">
              <UserRoundCheck className="h-5 w-5" />
            </span>
            <p>طلبات الإجازات</p>
            <strong>{rows.length}</strong>
            <small>طلبات مسجلة في النظام</small>
          </div>
          <div className="hr-premium-stat-card">
            <span className="hr-stat-icon bg-emerald-50 text-emerald-700">
              <CalendarDays className="h-5 w-5" />
            </span>
            <p>إجمالي الكمية</p>
            <strong className="text-emerald-700">{totalQuantity}</strong>
            <small>أيام/ساعات حسب نوع الطلب</small>
          </div>
          <div className="hr-premium-stat-card">
            <span className="hr-stat-icon bg-violet-50 text-violet-700">
              <Clock3 className="h-5 w-5" />
            </span>
            <p>إجازات بالساعة</p>
            <strong>{hourlyLeaves}</strong>
            <small>طلبات محسوبة بالساعات</small>
          </div>
        </div>
      </div>
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      <div className="hr-premium-table-card mt-6">
        <div className="hr-premium-table-header">
          <div>
            <h2>{t('hrPayroll.leaves.title')}</h2>
            <p>متابعة الإجازات حسب الموظف، النوع، الفترة، والكمية.</p>
          </div>
          <span>{rows.length} طلب</span>
        </div>
        <div className="overflow-x-auto">
        <table className="hr-premium-table w-full text-sm min-w-[720px]">
          <thead>
            <tr>
              <th className="px-3 py-2 font-bold text-start">{t('employeeData.colCode')}</th>
              <th className="px-3 py-2 font-bold text-start">{t('employeeData.colName')}</th>
              <th className="px-3 py-2 font-bold text-start">{t('hrPayroll.colItem')}</th>
              <th className="px-3 py-2 font-bold text-start">{t('hrPayroll.colDate')}</th>
              <th className="px-3 py-2 font-bold text-end">{t('hrPayroll.quantity')}</th>
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
                  <div className="hr-premium-empty-state">{t('hrPayroll.leaves.empty')}</div>
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-4 font-mono text-xs font-black text-blue-700">{r.employee_code}</td>
                  <td className="px-6 py-4 font-extrabold text-slate-900">{r.employee_name}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">{r.leave_type_name}</span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-600">
                    {r.start_date}
                    {r.end_date ? ` → ${r.end_date}` : ''}
                  </td>
                  <td className="px-6 py-4 text-end font-black text-slate-800">
                    {r.quantity} {r.unit === 'hours' ? t('hrPayroll.hours') : t('hrPayroll.days')}
                  </td>
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
            <SheetTitle>{t('hrPayroll.leaves.add')}</SheetTitle>
            <p className="text-sm font-bold text-blue-100/90">تسجيل إجازة جديدة مرتبطة بموظف ونوع إجازة وفترة محددة.</p>
          </SheetHeader>
          <div className="erp-side-drawer-body">
            <div className="hr-premium-form-intro">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-700">
                <Palmtree className="h-6 w-6" />
              </span>
              <div>
                <h3>{t('hrPayroll.leaves.add')}</h3>
                <p>اختر الموظف، نوع الإجازة، بداية ونهاية الفترة، ثم حدد الكمية وطريقة الاحتساب.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="block space-y-1 md:col-span-2">
                <span>{t('employeeData.colName')}</span>
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
                <span>{t('hrPayroll.colItem')}</span>
                <select
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={form.leave_type_id}
                  onChange={(e) => setForm((f) => ({ ...f, leave_type_id: e.target.value }))}
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
                <span>{t('hrPayroll.colDate')}</span>
                <Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
              </label>
              <label className="block space-y-1">
                <span>تاريخ النهاية</span>
                <Input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
              </label>
              <label className="block space-y-1">
                <span>{t('hrPayroll.quantity')}</span>
                <Input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </label>
              <label className="block space-y-1">
                <span>وحدة الاحتساب</span>
                <select
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value as 'days' | 'hours' }))}
                >
                  <option value="days">{t('hrPayroll.days')}</option>
                  <option value="hours">{t('hrPayroll.hours')}</option>
                </select>
              </label>
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
