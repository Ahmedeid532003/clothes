import React, { useEffect, useRef } from 'react';
import { GripVertical } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { EMP_REP_COLUMNS, type EmpRepColumnId } from '@/components/hr/employee-reports/employee-reports-shared';

export function EmployeeReportsColumnPicker({
  open,
  onClose,
  draft,
  onDraftChange,
  onApply,
  onReset,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  draft: EmpRepColumnId[];
  onDraftChange: (next: EmpRepColumnId[]) => void;
  onApply: () => void;
  onReset: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const { isRtl } = useLanguage();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const toggle = (id: EmpRepColumnId) => {
    if (draft.includes(id)) {
      if (draft.length <= 3) return;
      onDraftChange(draft.filter((x) => x !== id));
    } else {
      onDraftChange([...draft, id]);
    }
  };

  return (
    <div className="emp-rep-column-picker" ref={panelRef}>
      <h3>{isRtl ? 'اختر الأعمدة' : 'Choose columns'}</h3>
      <ul className="emp-rep-column-picker-list">
        {EMP_REP_COLUMNS.map((col) => (
          <li key={col.id}>
            <span className="emp-rep-column-drag" aria-hidden>
              <GripVertical className="h-4 w-4" />
            </span>
            <label className="emp-rep-column-check">
              <input type="checkbox" checked={draft.includes(col.id)} onChange={() => toggle(col.id)} />
              <span>{isRtl ? col.labelAr : col.labelEn}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="emp-rep-column-picker-foot">
        <button type="button" className="emp-rep-col-btn-reset" onClick={onReset}>
          {isRtl ? 'إعادة' : 'Reset'}
        </button>
        <div className="emp-rep-column-picker-actions">
          <button type="button" className="emp-rep-col-btn-cancel" onClick={onClose}>
            {isRtl ? 'إلغاء' : 'Cancel'}
          </button>
          <button type="button" className="emp-rep-col-btn-apply" onClick={onApply}>
            {isRtl ? 'تطبيق' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}
