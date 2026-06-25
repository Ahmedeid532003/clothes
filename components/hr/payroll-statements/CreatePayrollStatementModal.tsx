import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { BranchDto } from '@/lib/api/branches';
import { AR_MONTHS, EN_MONTHS } from '@/components/hr/payroll-statements/payroll-statements-shared';
import { entityName } from '@/lib/entity-name';

export type CreatePayrollStatementForm = {
  period_year: number;
  period_month: number;
  branch_id: string;
};

export function CreatePayrollStatementModal({
  open,
  branches,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  branches: BranchDto[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (form: CreatePayrollStatementForm) => Promise<void>;
}) {
  const { isRtl } = useLanguage();
  const now = new Date();
  const [form, setForm] = useState<CreatePayrollStatementForm>({
    period_year: now.getFullYear(),
    period_month: now.getMonth() + 1,
    branch_id: '',
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      period_year: now.getFullYear(),
      period_month: now.getMonth() + 1,
      branch_id: branches[0]?.id || '',
    });
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
  }, [open, onClose, branches, now]);

  if (!open) return null;

  const months = isRtl ? AR_MONTHS : EN_MONTHS;
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const handleSubmit = async () => {
    if (!form.branch_id) return;
    await onSubmit(form);
  };

  return createPortal(
    <div className="pay-stmt-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="pay-stmt-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="pay-stmt-modal-head">
          <button type="button" className="pay-stmt-modal-close" onClick={onClose} aria-label="close">
            <X className="h-4 w-4" />
          </button>
          <h2>{isRtl ? 'إعداد كشف رواتب جديد' : 'Prepare new payroll statement'}</h2>
        </header>

        <div className="pay-stmt-modal-body">
          <label className="pay-stmt-field">
            <span>{isRtl ? 'السنة المالية' : 'Financial year'}</span>
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

          <label className="pay-stmt-field">
            <span>{isRtl ? 'الشهر' : 'Month'}</span>
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

          <label className="pay-stmt-field">
            <span>{isRtl ? 'الفرع المستهدف' : 'Target branch'}</span>
            <select
              value={form.branch_id}
              onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
            >
              <option value="">{isRtl ? '— اختر الفرع —' : '— Select branch —'}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {entityName(b)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <footer className="pay-stmt-modal-foot">
          <button
            type="button"
            className="pay-stmt-modal-submit"
            onClick={handleSubmit}
            disabled={saving || !form.branch_id}
          >
            {saving
              ? isRtl
                ? 'جاري الإنشاء...'
                : 'Creating...'
              : isRtl
                ? 'بدء إنشاء وتعبئة الجدول'
                : 'Start creating & fill table'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
