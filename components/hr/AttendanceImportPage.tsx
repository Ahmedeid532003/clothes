import React, { useState } from 'react';
import { Braces, CheckCircle2, FileJson, PlayCircle, ShieldCheck, UploadCloud } from 'lucide-react';
import { attendanceApi } from '@/lib/api/hr-payroll';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { AlertBanner } from '@/components/accounting/AccountingUi';
import { HrModuleLayout } from '@/components/hr/HrModuleLayout';
import { Button } from '@/components/ui/button';

const SAMPLE = `[
  {"employee_code": "001", "work_date": "2026-05-01", "check_in": "09:05", "check_out": "17:10"},
  {"employee_code": "002", "work_date": "2026-05-01", "check_in": "08:55", "check_out": "17:00"}
]`;

export function AttendanceImportPage() {
  const { t } = useLanguage();
  const [json, setJson] = useState(SAMPLE);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onImport = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const rows = JSON.parse(json) as Record<string, unknown>[];
      const res = await attendanceApi.importRows(rows, 'paste.json');
      setResult(
        `${t('hrPayroll.importDone')}: ${res.imported_count} — ${res.errors?.length ? res.errors.join('; ') : ''}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <HrModuleLayout activeTab="attendance-import">
      <div className="hr-premium-page space-y-6">
        <section className="hr-premium-hero">
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <span className="hr-premium-hero-icon">
                <UploadCloud className="h-7 w-7" />
              </span>
              <div>
                <span className="hr-premium-eyebrow">Attendance Import</span>
                <h1>{t('hrPayroll.attendanceImport.title')}</h1>
                <p>{t('hrPayroll.attendanceImport.desc')}</p>
              </div>
            </div>
            <span className="hr-premium-range-pill">
              <FileJson className="h-4 w-4" />
              JSON
            </span>
          </div>
        </section>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="hr-premium-stat-card">
            <span className="hr-stat-icon bg-blue-50 text-blue-700">
              <Braces className="h-5 w-5" />
            </span>
            <p>تنسيق البيانات</p>
            <strong className="text-2xl">JSON</strong>
            <small>استيراد سريع من أجهزة الحضور</small>
          </div>
          <div className="hr-premium-stat-card">
            <span className="hr-stat-icon bg-emerald-50 text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <p>التحقق الذكي</p>
            <strong className="text-2xl">Auto</strong>
            <small>تجميع الأخطاء في نتيجة واضحة</small>
          </div>
          <div className="hr-premium-stat-card">
            <span className="hr-stat-icon bg-violet-50 text-violet-700">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <p>حالة العملية</p>
            <strong className="line-clamp-1 text-2xl">{loading ? t('inventory.loading') : result ? 'Done' : 'Ready'}</strong>
            <small>جاهز للتنفيذ بدون مغادرة الصفحة</small>
          </div>
        </div>
      </div>
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      {result ? <AlertBanner variant="success">{result}</AlertBanner> : null}
      <section className="hr-premium-table-card mt-6">
        <div className="hr-premium-table-header">
          <div>
            <h2>ملف الحضور الخام</h2>
            <p>الصق بيانات JSON هنا ثم نفذ الاستيراد، وسيتم عرض النتيجة أعلى النموذج.</p>
          </div>
          <span>Paste JSON</span>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="hr-premium-import-guide">
            <h3>خطوات الاستيراد</h3>
            <p>1. الصق الملف الخام من جهاز الحضور.</p>
            <p>2. تأكد من وجود كود الموظف والتاريخ ووقت الدخول والخروج.</p>
            <p>3. اضغط تنفيذ الاستيراد وسيعرض النظام النتيجة والأخطاء إن وجدت.</p>
          </div>
          <textarea
            className="min-h-[360px] w-full rounded-2xl border border-slate-200 bg-slate-950 p-5 font-mono text-sm font-bold text-blue-50 outline-none shadow-inner transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            value={json}
            onChange={(e) => setJson(e.target.value)}
          />
          <div className="flex justify-end lg:col-span-2">
            <Button className="erp-add-action hr-premium-primary-action" onClick={onImport} disabled={loading}>
              <PlayCircle className="h-4 w-4 me-1" />
              {loading ? t('inventory.loading') : t('hrPayroll.attendanceImport.run')}
            </Button>
          </div>
        </div>
      </section>
    </HrModuleLayout>
  );
}
