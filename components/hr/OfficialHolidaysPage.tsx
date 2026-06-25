import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, PartyPopper, Repeat2 } from 'lucide-react';
import { officialHolidaysApi, type OfficialHolidayRow } from '@/lib/api/hr-payroll';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { AlertBanner, PageToolbar } from '@/components/accounting/AccountingUi';
import { ErpAddButton } from '@/components/erp/ErpAddButton';
import { HrModuleLayout } from '@/components/hr/HrModuleLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export function OfficialHolidaysPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<OfficialHolidayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', holiday_date: '', is_recurring: true, notes: '' });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await officialHolidaysApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onSave = async () => {
    if (!form.name.trim() || !form.holiday_date) return;
    await officialHolidaysApi.create(form);
    setOpen(false);
    refresh();
  };

  const recurringCount = rows.filter((row) => row.is_recurring).length;

  return (
    <HrModuleLayout activeTab="official-holidays">
      <div className="hr-premium-page space-y-6">
        <section className="hr-premium-hero">
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <span className="hr-premium-hero-icon">
                <PartyPopper className="h-7 w-7" />
              </span>
              <div>
                <span className="hr-premium-eyebrow">Official Holidays</span>
                <h1>{t('hrPayroll.officialHolidays.title')}</h1>
                <p>{t('hrPayroll.officialHolidays.desc')}</p>
              </div>
            </div>
            <PageToolbar onRefresh={refresh}>
              <ErpAddButton onClick={() => setOpen(true)}>{t('hrPayroll.officialHolidays.add')}</ErpAddButton>
            </PageToolbar>
          </div>
        </section>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="hr-premium-stat-card">
            <span className="hr-stat-icon bg-blue-50 text-blue-700">
              <CalendarDays className="h-5 w-5" />
            </span>
            <p>إجمالي العطلات</p>
            <strong>{rows.length}</strong>
            <small>عطلات مسجلة</small>
          </div>
          <div className="hr-premium-stat-card">
            <span className="hr-stat-icon bg-emerald-50 text-emerald-700">
              <Repeat2 className="h-5 w-5" />
            </span>
            <p>عطلات متكررة</p>
            <strong className="text-emerald-700">{recurringCount}</strong>
            <small>تتكرر سنويًا</small>
          </div>
          <div className="hr-premium-stat-card">
            <span className="hr-stat-icon bg-violet-50 text-violet-700">
              <PartyPopper className="h-5 w-5" />
            </span>
            <p>آخر عطلة</p>
            <strong className="line-clamp-1 text-2xl">{rows[0]?.name || '—'}</strong>
            <small>حسب ترتيب النظام الحالي</small>
          </div>
        </div>
      </div>
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      <div className="hr-premium-table-card mt-6">
        <div className="hr-premium-table-header">
          <div>
            <h2>{t('hrPayroll.officialHolidays.title')}</h2>
            <p>إدارة العطلات الرسمية والمتكررة وتأثيرها على الحضور والرواتب.</p>
          </div>
          <span>{rows.length} عطلة</span>
        </div>
        <div className="overflow-x-auto">
        <table className="hr-premium-table w-full min-w-[640px] text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3 text-start font-bold">{t('departments.columns.name')}</th>
              <th className="px-4 py-3 text-start font-bold">{t('hrPayroll.colDate')}</th>
              <th className="px-4 py-3 text-start font-bold">{t('hrPayroll.recurring')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="p-10">
                  <div className="hr-premium-empty-state">
                    <span className="erp-skeleton-line mx-auto h-3 w-48" />
                    <span className="erp-skeleton-line mx-auto h-3 w-64" />
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-10">
                  <div className="hr-premium-empty-state">{t('hrPayroll.officialHolidays.empty')}</div>
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-4 font-extrabold text-slate-900">{r.name}</td>
                  <td className="px-6 py-4 font-semibold text-slate-600">{r.holiday_date}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${r.is_recurring ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                      {r.is_recurring ? t('hrPayroll.yes') : t('hrPayroll.no')}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="erp-side-drawer hr-premium-drawer w-full border-s-0 p-0 sm:max-w-[56vw]">
          <SheetHeader className="erp-side-drawer-header">
            <SheetTitle>{t('hrPayroll.officialHolidays.add')}</SheetTitle>
            <p className="text-sm font-bold text-blue-100/90">إضافة عطلة رسمية وربطها بقواعد الحضور والرواتب.</p>
          </SheetHeader>
          <div className="erp-side-drawer-body">
            <div className="hr-premium-form-intro">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-700">
                <PartyPopper className="h-6 w-6" />
              </span>
              <div>
                <h3>{t('hrPayroll.officialHolidays.add')}</h3>
                <p>سجل اسم العطلة وتاريخها، وحدد هل تتكرر سنويًا أم لا.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="block space-y-1">
                <span>{t('departments.deptName')}</span>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="block space-y-1">
                <span>{t('hrPayroll.colDate')}</span>
                <Input
                  type="date"
                  value={form.holiday_date}
                  onChange={(e) => setForm((f) => ({ ...f, holiday_date: e.target.value }))}
                />
              </label>
              <label className="hr-premium-check-card md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.is_recurring}
                  onChange={(e) => setForm((f) => ({ ...f, is_recurring: e.target.checked }))}
                />
                <span>{t('hrPayroll.recurring')}</span>
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
