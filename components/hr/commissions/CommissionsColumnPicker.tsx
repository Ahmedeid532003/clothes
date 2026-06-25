import React, { useEffect, useRef } from 'react';
import { GripVertical } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { COMM_COLUMNS, type CommColumnId } from '@/components/hr/commissions/commissions-report-shared';

export function CommissionsColumnPicker({
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
  draft: CommColumnId[];
  onDraftChange: (next: CommColumnId[]) => void;
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

  const toggle = (id: CommColumnId) => {
    if (draft.includes(id)) {
      if (draft.length <= 3) return;
      onDraftChange(draft.filter((x) => x !== id));
    } else {
      onDraftChange([...draft, id]);
    }
  };

  return (
    <div className="emp-comm-column-picker" ref={panelRef}>
      <h3>{isRtl ? 'اختر الأعمدة' : 'Choose columns'}</h3>
      <ul className="emp-comm-column-picker-list">
        {COMM_COLUMNS.map((col) => {
          const checked = draft.includes(col.id);
          return (
            <li key={col.id}>
              <span className="emp-comm-column-drag" aria-hidden>
                <GripVertical className="h-4 w-4" />
              </span>
              <label className="emp-comm-column-check">
                <input type="checkbox" checked={checked} onChange={() => toggle(col.id)} />
                <span>{isRtl ? col.labelAr : col.labelEn}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="emp-comm-column-picker-foot">
        <button type="button" className="emp-comm-col-btn-reset" onClick={onReset}>
          {isRtl ? 'إعادة' : 'Reset'}
        </button>
        <div className="emp-comm-column-picker-actions">
          <button type="button" className="emp-comm-col-btn-cancel" onClick={onClose}>
            {isRtl ? 'إلغاء' : 'Cancel'}
          </button>
          <button type="button" className="emp-comm-col-btn-apply" onClick={onApply}>
            {isRtl ? 'تطبيق' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}
