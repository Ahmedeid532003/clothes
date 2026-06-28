import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Banknote, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { localTodayIso } from '@/lib/dates';
import type { EmployeeDataRow } from '@/lib/api/employee-data';
import type { CatalogRow } from '@/lib/api/hr-payroll';

export type SalaryFormState = {
  employee_id: string;
  payment_type_id: string;
  amount: string;
  payment_date: string;
  notes: string;
};

function emptyForm(paymentTypeId = ''): SalaryFormState {
  return {
    employee_id: '',
    payment_type_id: paymentTypeId,
    amount: '',
    payment_date: localTodayIso(),
    notes: '',
  };
}

function employeeLabel(row: EmployeeDataRow) {
  const title = row.job_title_name ? ` (${row.job_title_name})` : '';
  return `${row.employee_code} - ${row.full_name}${title}`;
}

function employeeSalaryAmount(row: EmployeeDataRow): string {
  const raw = row.current_salary || row.gross_with_allowances || row.basic_salary || '0';
  const n = Number(raw);
  return n > 0 ? String(n) : '';
}

function pickSalaryPaymentType(types: CatalogRow[]): string {
  const byCode = types.find((t) => t.code === 'PT-01');
  if (byCode) return byCode.id;
  const byName = types.find((t) => /مرتب|salary/i.test(t.name));
  return byName?.id || types[0]?.id || '';
}

export function SalaryFormModal({
  open,
  employees,
  paymentTypes,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  employees: EmployeeDataRow[];
  paymentTypes: CatalogRow[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (form: SalaryFormState) => Promise<void>;
}) {
  const { isRtl } = useLanguage();
  const defaultTypeId = useMemo(() => pickSalaryPaymentType(paymentTypes), [paymentTypes]);
  const [form, setForm] = useState(() => emptyForm(defaultTypeId));

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(defaultTypeId));
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, defaultTypeId]);

  if (!open) return null;

  const amountNum = Number(form.amount || 0);

  const onEmployeeChange = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    setForm((f) => ({
      ...f,
      employee_id: employeeId,
      amount: emp ? employeeSalaryAmount(emp) : '',
    }));
  };

  const handleSubmit = async () => {
    if (!form.employee_id || !form.payment_type_id || !form.amount) return;
    await onSubmit(form);
  };

  return createPortal(
    <div className="rd-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="rd-modal rd-modal-salary"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="rd-modal-head">
          <button type="button" className="rd-modal-close" onClick={onClose} aria-label="close">
            <X className="h-4 w-4" />
          </button>
          <span className="rd-modal-icon is-salary">
            <Banknote className="h-5 w-5" />
          </span>
          <div>
            <h2>{isRtl ? 'إضافة مرتب' : 'Add salary payment'}</h2>
            <p>
              {isRtl
                ? 'تسجيل صرف مرتب للموظف — يُملأ المبلغ تلقائياً من الراتب المسجّل'
                : 'Record salary disbursement — amount auto-fills from registered salary'}
            </p>
          </div>
        </header>

        <div className="rd-modal-body">
          <label className="rd-field">
            <span>{isRtl ? 'الاسم' : 'Employee'}</span>
            <select value={form.employee_id} onChange={(e) => onEmployeeChange(e.target.value)}>
              <option value="">{isRtl ? '— اختر موظف —' : '— Select employee —'}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {employeeLabel(emp)}
                </option>
              ))}
            </select>
          </label>

          <div className="rd-modal-split">
            <label className="rd-field">
              <span>{isRtl ? 'البند' : 'Payment type'}</span>
              <select
                value={form.payment_type_id}
                onChange={(e) => setForm((f) => ({ ...f, payment_type_id: e.target.value }))}
              >
                <option value="">—</option>
                {paymentTypes.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.code} — {pt.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="rd-field">
              <div className="rd-field-label-row">
                <span>{isRtl ? 'المبلغ' : 'Amount'}</span>
                {amountNum > 0 ? (
                  <span className="rd-amount-badge is-salary">EGP {amountNum.toLocaleString('en-US')}</span>
                ) : null}
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                dir="ltr"
              />
            </div>
          </div>

          <div className="rd-modal-split">
            <label className="rd-field">
              <span>{isRtl ? 'التاريخ' : 'Date'}</span>
              <input
                type="date"
                value={form.payment_date}
                onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))}
              />
            </label>
            <label className="rd-field">
              <span>{isRtl ? 'ملاحظات' : 'Notes'}</span>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder={isRtl ? 'اختياري' : 'Optional'}
              />
            </label>
          </div>
        </div>

        <footer className="rd-modal-foot">
          <button type="button" className="rd-btn-cancel" onClick={onClose} disabled={saving}>
            {isRtl ? 'إلغاء' : 'Cancel'}
          </button>
          <button type="button" className="rd-btn-submit is-salary" onClick={handleSubmit} disabled={saving}>
            {saving ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : isRtl ? 'صرف' : 'Disburse'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
