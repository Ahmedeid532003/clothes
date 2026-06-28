import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Settings, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { fetchEmployees, type EmployeeDto } from '@/lib/api/employees';
import { commissionsApi, payrollApi, type CommissionRow, type PayrollSheetRow } from '@/lib/api/hr-payroll';
import { AR_MONTHS, EN_MONTHS } from '@/components/hr/payroll-statements/payroll-statements-shared';
import {
  buildCardState,
  cardTotals,
} from '@/components/hr/payroll-statements/PayrollEmployeeCard';
import {
  buildSalarySlipLines,
  DEFAULT_SLIP_VISIBLE,
  EmployeeSalarySlip,
  printEmployeeSalarySlip,
  type SalarySlipData,
} from '@/components/hr/payroll-statements/EmployeeSalarySlip';

type PaperSize = 'thermal' | 'a4';

type FormState = {
  employee_id: string;
  period_year: number;
  period_month: number;
  paper_size: PaperSize;
};

type PreviewSource = {
  row: PayrollSheetRow;
  commission?: CommissionRow;
  emp?: EmployeeDto;
  generatedAt: Date;
};

function defaultForm(
  initialEmployeeId?: string,
  initialYear?: number,
  initialMonth?: number,
): FormState {
  const now = new Date();
  return {
    employee_id: initialEmployeeId || '',
    period_year: initialYear ?? now.getFullYear(),
    period_month: initialMonth ?? now.getMonth() + 1,
    paper_size: 'thermal',
  };
}

export function PrintEmployeeSalaryModal({
  open,
  onClose,
  initialEmployeeId,
  initialYear,
  initialMonth,
}: {
  open: boolean;
  onClose: () => void;
  initialEmployeeId?: string;
  initialYear?: number;
  initialMonth?: number;
}) {
  const { isRtl } = useLanguage();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [step, setStep] = useState<'setup' | 'preview'>('setup');
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [visibleLines, setVisibleLines] = useState(DEFAULT_SLIP_VISIBLE);
  const [previewSource, setPreviewSource] = useState<PreviewSource | null>(null);

  const [form, setForm] = useState<FormState>(() =>
    defaultForm(initialEmployeeId, initialYear, initialMonth),
  );

  useEffect(() => {
    if (!open) return;

    setStep('setup');
    setError(null);
    setPreviewSource(null);
    setCustomizeOpen(false);
    setVisibleLines(DEFAULT_SLIP_VISIBLE);
    setForm(defaultForm(initialEmployeeId, initialYear, initialMonth));

    let cancelled = false;
    fetchEmployees()
      .then((list) => {
        if (cancelled) return;
        const active = list.filter((e) => e.is_active && !e.is_owner);
        setEmployees(active);
        setForm((prev) => ({
          ...prev,
          employee_id: prev.employee_id || initialEmployeeId || active[0]?.id || '',
        }));
      })
      .catch(() => {
        if (!cancelled) setEmployees([]);
      });

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelled = true;
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, initialEmployeeId, initialYear, initialMonth]);

  const calendarNow = useMemo(() => new Date(), []);
  const months = isRtl ? AR_MONTHS : EN_MONTHS;
  const years = useMemo(
    () => [calendarNow.getFullYear() - 1, calendarNow.getFullYear(), calendarNow.getFullYear() + 1],
    [calendarNow],
  );

  const slipLineOptions = useMemo(
    () => [
      { key: 'shiftHours', label: isRtl ? 'عدد ساعات الشفت' : 'Shift hours' },
      { key: 'actualHours', label: isRtl ? 'ساعات العمل الفعليه' : 'Actual hours' },
      { key: 'overtime', label: isRtl ? 'اضافي' : 'Overtime' },
      { key: 'commission', label: isRtl ? 'صافي العموله' : 'Net commission' },
      { key: 'inc1', label: isRtl ? 'حافز 1' : 'Incentive 1' },
      { key: 'inc2', label: isRtl ? 'حافز 2' : 'Incentive 2' },
      { key: 'grossDue', label: isRtl ? 'اجمالي المستحق' : 'Total due' },
      { key: 'lateDeduction', label: isRtl ? 'خصم تاخيرات' : 'Lateness' },
      { key: 'adminDeduction', label: isRtl ? 'خصم 2' : 'Deduction 2' },
      { key: 'advances', label: isRtl ? 'سلف' : 'Advances' },
      { key: 'totalDeducted', label: isRtl ? 'اجمالي المستقطع' : 'Total deducted' },
      { key: 'net', label: isRtl ? 'الصافي' : 'Net' },
    ],
    [isRtl],
  );

  const { slipData, basicSalary } = useMemo(() => {
    if (!previewSource) return { slipData: null as SalarySlipData | null, basicSalary: '0' };
    const { row, commission, emp, generatedAt } = previewSource;
    const card = buildCardState(row, commission);
    const totals = cardTotals(card, row);
    const emptyLabel = isRtl ? 'فارغ' : 'Empty';
    const lines = buildSalarySlipLines(card, totals, visibleLines, emptyLabel);
    return {
      basicSalary: card.basicSalary,
      slipData: {
        employeeCode: row.employee_code || emp?.employee_code || '—',
        employeeName: row.employee_name || emp?.full_name || '—',
        year: form.period_year,
        month: form.period_month,
        lines,
        generatedAt,
      },
    };
  }, [previewSource, visibleLines, form.period_year, form.period_month, isRtl]);

  const generateSlip = async () => {
    if (!form.employee_id) return;
    setLoading(true);
    setError(null);
    try {
      const emp = employees.find((e) => e.id === form.employee_id);
      const branchId = emp?.default_branch || undefined;
      const [sheet, commissions] = await Promise.all([
        payrollApi.sheet(form.period_year, form.period_month, branchId),
        commissionsApi.list(form.period_year, form.period_month),
      ]);
      const row = sheet.rows.find((r) => r.employee_id === form.employee_id);
      if (!row) {
        setError(
          isRtl
            ? 'لا توجد بيانات راتب لهذا الموظف في الشهر المحدد'
            : 'No payroll data for this employee in the selected month',
        );
        return;
      }
      const commission = commissions.find((c) => c.employee_id === form.employee_id);
      setPreviewSource({ row, commission, emp, generatedAt: new Date() });
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const onPrint = () => {
    if (!slipData) return;
    const ok = printEmployeeSalarySlip(slipData, basicSalary, form.paper_size, isRtl);
    if (!ok) {
      setError(isRtl ? 'تعذر فتح نافذة الطباعة — اسمح بالنوافذ المنبثقة' : 'Could not open print window — allow pop-ups');
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="pay-slip-modal-overlay" onClick={onClose} role="presentation">
      <div
        className={`pay-slip-modal ${step === 'preview' ? 'is-preview' : 'is-setup'}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="pay-slip-modal-head">
          <button type="button" className="pay-slip-modal-close" onClick={onClose} aria-label="close">
            <X className="h-4 w-4" />
          </button>
          <h2>{isRtl ? 'طباعة بيان راتب موظف منفرد' : 'Print individual employee salary'}</h2>
        </header>

        {error ? <p className="pay-slip-error">{error}</p> : null}

        {step === 'setup' ? (
          <div className="pay-slip-setup-box">
            <h3>{isRtl ? 'خيارات إعداد وتجهيز بيان راتب الموظف' : 'Salary statement setup options'}</h3>

            <div className="pay-slip-setup-grid">
              <label className="pay-slip-field">
                <span>{isRtl ? 'الموظف المستهدف:' : 'Target employee:'}</span>
                <select
                  value={form.employee_id}
                  onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
                >
                  <option value="">{isRtl ? '— اختر الموظف —' : '— Select employee —'}</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name || e.username} ({e.employee_code || e.username})
                    </option>
                  ))}
                </select>
              </label>

              <label className="pay-slip-field">
                <span>{isRtl ? 'الشهر المستهدف:' : 'Target month:'}</span>
                <select
                  value={form.period_month}
                  onChange={(e) => setForm((f) => ({ ...f, period_month: Number(e.target.value) }))}
                >
                  {months.map((name, idx) => (
                    <option key={name} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="pay-slip-field">
                <span>{isRtl ? 'العام المستهدف:' : 'Target year:'}</span>
                <select
                  value={form.period_year}
                  onChange={(e) => setForm((f) => ({ ...f, period_year: Number(e.target.value) }))}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>

              <label className="pay-slip-field">
                <span>{isRtl ? 'قياس الورق المطلوب:' : 'Paper size:'}</span>
                <select
                  value={form.paper_size}
                  onChange={(e) => setForm((f) => ({ ...f, paper_size: e.target.value as PaperSize }))}
                >
                  <option value="thermal">{isRtl ? 'ورق حراري (كاشير)' : 'Thermal (cashier)'}</option>
                  <option value="a4">{isRtl ? 'ورق A4' : 'A4 paper'}</option>
                </select>
              </label>
            </div>

            {customizeOpen ? (
              <div className="pay-slip-customize">
                <p>{isRtl ? 'اختر البنود التي تظهر في البيان:' : 'Choose items to show on the slip:'}</p>
                <div className="pay-slip-customize-grid">
                  {slipLineOptions.map((opt) => (
                    <label key={opt.key} className="pay-slip-customize-item">
                      <input
                        type="checkbox"
                        checked={visibleLines[opt.key] !== false}
                        onChange={(e) =>
                          setVisibleLines((prev) => ({ ...prev, [opt.key]: e.target.checked }))
                        }
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="pay-slip-setup-actions">
              <button
                type="button"
                className="pay-slip-generate-btn"
                onClick={generateSlip}
                disabled={loading || !form.employee_id}
              >
                {loading
                  ? isRtl
                    ? 'جاري التوليد...'
                    : 'Generating...'
                  : isRtl
                    ? 'عرض مفردات الراتب وتوليد البيان'
                    : 'View salary details & generate'}
              </button>
              <button
                type="button"
                className="pay-slip-customize-btn"
                onClick={() => setCustomizeOpen((v) => !v)}
              >
                <Settings className="h-4 w-4" />
                {isRtl ? 'تخصيص بنود الطباعة' : 'Customize print items'}
              </button>
            </div>
          </div>
        ) : slipData ? (
          <div className="pay-slip-preview-wrap">
            <EmployeeSalarySlip
              data={slipData}
              paperSize={form.paper_size}
              isRtl={isRtl}
              basicSalary={basicSalary}
            />
            <div className="pay-slip-preview-actions">
              <button type="button" className="pay-slip-print-btn" onClick={onPrint}>
                <Printer className="h-4 w-4" />
                {isRtl ? 'طباعة الاستمارة' : 'Print form'}
              </button>
              <button type="button" className="pay-slip-back-btn" onClick={() => setStep('setup')}>
                {isRtl ? 'تعديل الخيارات' : 'Edit options'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
