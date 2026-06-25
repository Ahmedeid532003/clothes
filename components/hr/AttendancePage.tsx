import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Clock3, Fingerprint, TimerReset, UserCheck } from 'lucide-react';
import { fetchEmployees, type EmployeeDto } from '@/lib/api/employees';
import { attendanceApi, type AttendanceRow } from '@/lib/api/hr-payroll';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { AlertBanner, PageToolbar } from '@/components/accounting/AccountingUi';
import { ErpAddButton } from '@/components/erp/ErpAddButton';
import { ErpPaginatedTableSection } from '@/components/erp/ErpPaginatedTableSection';
import { HrModuleLayout } from '@/components/hr/HrModuleLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export function AttendancePage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 8) + '01');
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    work_date: new Date().toISOString().slice(0, 10),
    check_in: '09:00',
    check_out: '17:00',
    notes: '',
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, e] = await Promise.all([attendanceApi.list(from, to), fetchEmployees()]);
      setRows(r);
      setEmployees(e.filter((x) => x.is_active));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onSave = async () => {
    if (!form.employee_id) return;
    await attendanceApi.upsert({ ...form, source: 'manual' });
    setOpen(false);
    refresh();
  };

  const totalOvertime = rows.reduce((sum, row) => sum + Number(row.overtime_minutes || 0), 0);
  const totalLate = rows.reduce((sum, row) => sum + Number(row.late_minutes || 0), 0);
  const manualRows = rows.filter((row) => row.source === 'manual').length;

  return (
    <HrModuleLayout activeTab="attendance">
      <div className="hr-premium-page space-y-6">
        <section className="hr-premium-hero">
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <span className="hr-premium-hero-icon">
                <Fingerprint className="h-7 w-7" />
              </span>
              <div>
                <span className="hr-premium-eyebrow">HR Attendance</span>
                <h1>{t('hrPayroll.attendance.title')}</h1>
                <p>{t('hrPayroll.attendance.desc')}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="hr-premium-range-pill">
                <CalendarDays className="h-4 w-4" />
                {from} ← {to}
              </span>
            <PageToolbar onRefresh={refresh}>
              <ErpAddButton onClick={() => setOpen(true)}>{t('hrPayroll.attendance.manual')}</ErpAddButton>
            </PageToolbar>
            </div>
          </div>

          <div className="relative z-10 mt-6 grid gap-4 md:grid-cols-4">
            <div className="hr-premium-stat-card">
              <span className="hr-stat-icon bg-blue-50 text-blue-700">
                <UserCheck className="h-5 w-5" />
              </span>
              <p>إجمالي السجلات</p>
              <strong>{rows.length}</strong>
              <small>حركة حضور خلال الفترة</small>
            </div>
            <div className="hr-premium-stat-card">
              <span className="hr-stat-icon bg-emerald-50 text-emerald-700">
                <TimerReset className="h-5 w-5" />
              </span>
              <p>إجمالي الإضافي</p>
              <strong className="text-emerald-700">{totalOvertime}</strong>
              <small>دقيقة إضافية محسوبة</small>
            </div>
            <div className="hr-premium-stat-card">
              <span className="hr-stat-icon bg-amber-50 text-amber-700">
                <Clock3 className="h-5 w-5" />
              </span>
              <p>إجمالي التأخير</p>
              <strong className="text-amber-700">{totalLate}</strong>
              <small>دقيقة تأخير خلال الفترة</small>
            </div>
            <div className="hr-premium-stat-card">
              <span className="hr-stat-icon bg-violet-50 text-violet-700">
                <Fingerprint className="h-5 w-5" />
              </span>
              <p>إدخال يدوي</p>
              <strong className="text-violet-700">{manualRows}</strong>
              <small>سجلات تمت يدويًا</small>
            </div>
          </div>
        </section>

        <section className="hr-premium-filter-card">
          <div>
            <h2>تصفية الفترة</h2>
            <p>اختر نطاق التاريخ المطلوب لعرض سجل الحضور والانصراف بدقة.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="block">
              <span>{t('hrPayroll.from')}</span>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1" />
            </label>
            <label className="block">
              <span>{t('hrPayroll.to')}</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1" />
            </label>
            <Button type="button" variant="outline" className="hr-premium-outline-action" onClick={refresh}>
              <CalendarDays className="h-4 w-4 me-1" />
              عرض الفترة
            </Button>
          </div>
        </section>
      </div>
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      <div className="hr-premium-table-card mt-6">
        <div className="hr-premium-table-header">
          <div>
            <h2>سجل الحضور والانصراف</h2>
            <p>عرض منظم للوقت الفعلي، التأخير، والإضافي خلال الفترة المحددة.</p>
          </div>
          <span>{rows.length} سجل</span>
        </div>
        <ErpPaginatedTableSection rows={rows}>
        {(pagedRows) => (
        <div className="overflow-x-auto">
        <table className="hr-premium-table w-full text-sm min-w-[800px]">
          <thead>
            <tr>
              <th className="px-6 py-4 text-start font-black text-slate-600">{t('employeeData.colCode')}</th>
              <th className="px-6 py-4 text-start font-black text-slate-600">{t('employeeData.colName')}</th>
              <th className="px-6 py-4 text-start font-black text-slate-600">{t('hrPayroll.colDate')}</th>
              <th className="px-6 py-4 text-start font-black text-slate-600">{t('hrPayroll.checkIn')}</th>
              <th className="px-6 py-4 text-start font-black text-slate-600">{t('hrPayroll.checkOut')}</th>
              <th className="px-6 py-4 text-end font-black text-slate-600">{t('hrPayroll.late')}</th>
              <th className="px-6 py-4 text-end font-black text-slate-600">{t('hrPayroll.overtime')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-10">
                  <div className="hr-premium-empty-state">
                    <span className="erp-skeleton-line mx-auto h-3 w-48" />
                    <span className="erp-skeleton-line mx-auto h-3 w-64" />
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-10">
                  <div className="hr-premium-empty-state">{t('hrPayroll.attendance.empty')}</div>
                </td>
              </tr>
            ) : (
              pagedRows.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-4 font-mono text-xs font-black text-blue-700">{r.employee_code}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{r.employee_name}</td>
                  <td className="px-6 py-4 font-semibold text-slate-600">{r.work_date}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                      <Clock3 className="h-3.5 w-3.5" />
                      {r.check_in || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                      <Clock3 className="h-3.5 w-3.5" />
                      {r.check_out || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-end">
                    <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">{r.late_minutes}</span>
                  </td>
                  <td className="px-6 py-4 text-end">
                    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{r.overtime_minutes}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
        )}
        </ErpPaginatedTableSection>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="erp-side-drawer hr-premium-drawer w-full border-s-0 p-0 sm:max-w-[64vw]">
          <SheetHeader className="erp-side-drawer-header">
            <SheetTitle>{t('hrPayroll.attendance.manual')}</SheetTitle>
            <p className="text-sm font-bold text-blue-100/90">إدخال يدوي سريع للحضور والانصراف مع الحفاظ على بيانات الموظف.</p>
          </SheetHeader>
          <div className="erp-side-drawer-body">
            <div className="hr-premium-form-intro">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                <TimerReset className="h-6 w-6" />
              </span>
              <div>
                <h3>تسجيل حركة حضور يدوية</h3>
                <p>املأ الموظف، التاريخ، وقت الدخول والخروج، وسيتم حساب النتائج حسب قواعد النظام.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="block space-y-1 md:col-span-2">
                <span className="text-xs font-bold text-slate-600">الموظف *</span>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm"
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
                <span className="text-xs font-bold text-slate-600">{t('hrPayroll.colDate')}</span>
                <Input type="date" value={form.work_date} onChange={(e) => setForm((f) => ({ ...f, work_date: e.target.value }))} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-600">{t('hrPayroll.checkIn')}</span>
                <Input type="time" value={form.check_in} onChange={(e) => setForm((f) => ({ ...f, check_in: e.target.value }))} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-600">{t('hrPayroll.checkOut')}</span>
                <Input type="time" value={form.check_out} onChange={(e) => setForm((f) => ({ ...f, check_out: e.target.value }))} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-600">ملاحظات</span>
                <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </label>
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 md:col-span-2">
                <div className="flex items-start gap-3">
                  <TimerReset className="mt-0.5 h-5 w-5 text-blue-700" />
                  <div>
                    <p className="text-sm font-black text-slate-900">تنبيه الإدخال اليدوي</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">سيتم تسجيل المصدر كإدخال يدوي مع حفظ نفس منطق حساب التأخير والإضافي.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <SheetFooter className="erp-side-drawer-footer">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('inventory.cancel')}
            </Button>
            <Button onClick={onSave}>{t('departments.save')}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </HrModuleLayout>
  );
}
