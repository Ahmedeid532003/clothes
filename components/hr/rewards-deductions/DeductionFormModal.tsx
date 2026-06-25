import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { EmployeeDataRow } from '@/lib/api/employee-data';
import type { CatalogRow } from '@/lib/api/hr-payroll';

const QUICK_AMOUNTS = [50, 100, 150, 250, 500];

export type DeductionFormState = {
  employee_id: string;
  deduction_item_id: string;
  amount: string;
  description: string;
};

function emptyForm(): DeductionFormState {
  return { employee_id: '', deduction_item_id: '', amount: '100', description: '' };
}

function employeeLabel(row: EmployeeDataRow) {
  const title = row.job_title_name ? ` (${row.job_title_name})` : '';
  return `${row.employee_code} - ${row.full_name}${title}`;
}

export function DeductionFormModal({
  open,
  employees,
  items,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  employees: EmployeeDataRow[];
  items: CatalogRow[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (form: DeductionFormState) => Promise<void>;
}) {
  const { isRtl } = useLanguage();
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
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
  }, [open, onClose]);

  const amountNum = Number(form.amount || 0);
  const itemOptions = useMemo(
    () => [
      { id: '', name: isRtl ? 'خصم / جزاء مخصص (تحديد يدوي)' : 'Custom deduction / penalty' },
      ...items.map((it) => ({ id: it.id, name: it.name })),
    ],
    [items, isRtl],
  );

  if (!open) return null;

  const handleSubmit = async () => {
    if (!form.employee_id || !form.amount) return;
    await onSubmit(form);
  };

  return createPortal(
    <div className="rd-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="rd-modal rd-modal-deduction"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="rd-modal-head">
          <button type="button" className="rd-modal-close" onClick={onClose} aria-label="close">
            <X className="h-4 w-4" />
          </button>
          <span className="rd-modal-icon is-deduction">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <h2>{isRtl ? 'تسجيل جزاء أو خصم إداري' : 'Administrative penalty / deduction'}</h2>
            <p>
              {isRtl
                ? 'استقطاع مالي من استحقاقات الشهر الجاري لسبب تأديبي'
                : 'Financial deduction from current month entitlements'}
            </p>
          </div>
        </header>

        <div className="rd-modal-body">
          <label className="rd-field">
            <span>{isRtl ? 'اختر الموظف الخاضع للخصم' : 'Select employee'}</span>
            <select
              value={form.employee_id}
              onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
            >
              <option value="">{isRtl ? '— اختر موظف —' : '— Select employee —'}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {employeeLabel(emp)}
                </option>
              ))}
            </select>
          </label>

          <label className="rd-field">
            <span>{isRtl ? 'تصنيف الخصم أو الجزاء الإداري' : 'Deduction classification'}</span>
            <select
              value={form.deduction_item_id}
              onChange={(e) => setForm((f) => ({ ...f, deduction_item_id: e.target.value }))}
            >
              {itemOptions.map((opt) => (
                <option key={opt.id || 'custom'} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </label>

          <div className="rd-field">
            <div className="rd-field-label-row">
              <span>{isRtl ? 'قيمة الجزاء المالي' : 'Penalty amount'}</span>
              {amountNum > 0 ? (
                <span className="rd-amount-badge is-deduction">-{amountNum.toLocaleString('en-US')} EGP</span>
              ) : null}
            </div>
            <input
              type="number"
              min="0"
              step="1"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              dir="ltr"
            />
            <div className="rd-quick-pills">
              {QUICK_AMOUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`rd-quick-pill is-deduction ${Number(form.amount) === n ? 'is-active' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, amount: String(n) }))}
                >
                  -{n}
                </button>
              ))}
            </div>
          </div>

          <label className="rd-field">
            <span>{isRtl ? 'سبب المخالفة / ملخص الجزاء' : 'Violation reason / summary'}</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={
                isRtl
                  ? 'مثال: غياب يوم كامل دون عذر أو تأخير متكرر بدون موافقة'
                  : 'e.g. Full day absence without excuse'
              }
            />
          </label>
        </div>

        <footer className="rd-modal-foot">
          <button type="button" className="rd-btn-cancel" onClick={onClose} disabled={saving}>
            {isRtl ? 'إلغاء' : 'Cancel'}
          </button>
          <button type="button" className="rd-btn-submit is-deduction" onClick={handleSubmit} disabled={saving}>
            {saving ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : isRtl ? 'تسجيل الخصم −' : 'Record deduction −'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
