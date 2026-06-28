import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Layers3 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  commissionsApi,
  type CommissionRow,
  type PayrollSheetRow,
  type PayrollStatementRow,
} from '@/lib/api/hr-payroll';
import { AlertBanner } from '@/components/accounting/AccountingUi';
import {
  PayrollEmployeeCard,
  buildCardState,
  type EmployeeCardState,
} from '@/components/hr/payroll-statements/PayrollEmployeeCard';
import { monthLabel } from '@/components/hr/payroll-statements/payroll-statements-shared';

export function PayrollSheetFillView({
  statement,
  rows,
  isDraft = false,
  saving = false,
  onBack,
  onSaveDraft,
  onPrintEmployee,
}: {
  statement: PayrollStatementRow;
  rows: PayrollSheetRow[];
  isDraft?: boolean;
  saving?: boolean;
  onBack: () => void;
  onSaveDraft?: () => Promise<void>;
  onPrintEmployee?: (employeeId: string) => void;
}) {
  const { isRtl } = useLanguage();
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [cardStates, setCardStates] = useState<Record<string, EmployeeCardState>>({});

  useEffect(() => {
    let cancelled = false;
    commissionsApi
      .list(statement.period_year, statement.period_month)
      .then((list) => {
        if (!cancelled) setCommissions(list);
      })
      .catch(() => {
        if (!cancelled) setCommissions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [statement.period_year, statement.period_month]);

  const commissionByEmp = useMemo(() => {
    const map = new Map<string, CommissionRow>();
    commissions.forEach((c) => map.set(c.employee_id, c));
    return map;
  }, [commissions]);

  useEffect(() => {
    const next: Record<string, EmployeeCardState> = {};
    rows.forEach((row) => {
      next[row.employee_id] = buildCardState(row, commissionByEmp.get(row.employee_id));
    });
    setCardStates(next);
  }, [rows, commissionByEmp]);

  const patchCard = (employeeId: string, patch: Partial<EmployeeCardState>) => {
    setCardStates((prev) => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], ...patch },
    }));
  };

  const [saveError, setSaveError] = useState<string | null>(null);

  const onSaveApprove = async () => {
    setSaveError(null);
    if (onSaveDraft) {
      try {
        await onSaveDraft();
        setSavedMsg(isRtl ? 'تم حفظ واعتماد الكشف بنجاح' : 'Payroll statement saved and approved');
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Error');
        return;
      }
    } else {
      setSavedMsg(isRtl ? 'تم اعتماد الكشف' : 'Statement confirmed');
    }
    setTimeout(() => onBack(), 900);
  };

  return (
    <>
      {savedMsg ? <AlertBanner variant="success">{savedMsg}</AlertBanner> : null}
      {saveError ? <AlertBanner variant="error">{saveError}</AlertBanner> : null}

      <section className="pay-stmt-main-card pay-stmt-fill-card" data-payroll-fill="true">
        <div className="pay-stmt-fill-title">
          <span className="pay-stmt-action-icon">
            <Layers3 className="h-5 w-5" />
          </span>
          <h2>{isRtl ? 'كشوف الرواتب المعتمدة' : 'Approved payroll statements'}</h2>
        </div>

        <div className="pay-stmt-fill-toolbar">
          <button type="button" className="pay-stmt-save-btn" onClick={onSaveApprove} disabled={saving}>
            <CheckCircle2 className="h-4 w-4" />
            {saving
              ? isRtl
                ? 'جاري الحفظ...'
                : 'Saving...'
              : isDraft
                ? isRtl
                  ? 'حفظ واعتماد الكشف'
                  : 'Save & approve'
                : isRtl
                  ? 'إغلاق الكشف'
                  : 'Close statement'}
          </button>
          <div className="pay-stmt-fill-meta">
            <button type="button" className="pay-stmt-fill-back-circle" onClick={onBack} aria-label="back">
              <ArrowRight className="h-4 w-4" />
            </button>
            <div>
              <strong>{isRtl ? 'تعبئة كشف رواتب جديد' : 'Fill new payroll statement'}</strong>
              <p>
                {monthLabel(statement.period_month, isRtl)} / {statement.period_year}
                {isRtl ? ' (فرع: ' : ' (Branch: '}
                {statement.branch_name || '—'}
                {')'}
              </p>
            </div>
          </div>
        </div>

        <div className="pay-stmt-fill-banner">
          <p>
            {isRtl
              ? 'واجهة مسيرات الرواتب الذكية: كشف ومسير مالي منفصل لكل موظف'
              : 'Smart payroll interface: separate financial statement per employee'}
          </p>
          <small>
            {isRtl
              ? 'الحقول المحسوبة تلقائياً باللون الأزرق والأخضر • الخلايا البيضاء قابلة للإدخال والتعديل يدوياً'
              : 'Auto-calculated fields in blue/green • White cells are manually editable'}
          </small>
        </div>

        <div className="pay-stmt-emp-grid">
          {rows.length === 0 ? (
            <p className="pay-stmt-empty pay-stmt-fill-empty">
              {isRtl
                ? 'لا يوجد موظفون في هذا الفرع — أضف موظفين من «إنشاء الموظفين» وحدّد الفرع'
                : 'No employees for this branch — add staff in Employee Registration and assign a branch'}
            </p>
          ) : (
            rows.map((row, idx) => (
              <PayrollEmployeeCard
                key={row.employee_id}
                index={idx}
                row={row}
                state={cardStates[row.employee_id] || buildCardState(row, commissionByEmp.get(row.employee_id))}
                isRtl={isRtl}
                onChange={(patch) => patchCard(row.employee_id, patch)}
                onPrint={onPrintEmployee ? () => onPrintEmployee(row.employee_id) : undefined}
              />
            ))
          )}
        </div>
      </section>
    </>
  );
}
