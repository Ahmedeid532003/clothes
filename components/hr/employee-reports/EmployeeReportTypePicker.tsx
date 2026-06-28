import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Clock, DollarSign, Percent, Users } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { REPORT_TYPES, type ReportTypeId } from '@/components/hr/employee-reports/employee-reports-shared';

const REPORT_ICONS: Record<ReportTypeId, React.ComponentType<{ className?: string }>> = {
  'staff-data': Users,
  commissions: Percent,
  attendance: Clock,
  'rewards-deductions': DollarSign,
};

export function EmployeeReportTypePicker({
  value,
  onChange,
}: {
  value: ReportTypeId;
  onChange: (id: ReportTypeId) => void;
}) {
  const { isRtl } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const current = REPORT_TYPES.find((r) => r.id === value) ?? REPORT_TYPES[0];

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 6,
        left: rect.left,
        width: Math.max(rect.width, 300),
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (document.getElementById('emp-rep-report-menu-portal')?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const menu =
    open && menuPos
      ? createPortal(
          <div
            id="emp-rep-report-menu-portal"
            className="emp-rep-report-menu is-portal"
            role="listbox"
            style={{
              position: 'fixed',
              top: menuPos.top,
              left: isRtl ? undefined : menuPos.left,
              right: isRtl ? window.innerWidth - menuPos.left - menuPos.width : undefined,
              width: menuPos.width,
              zIndex: 500,
            }}
          >
            <p className="emp-rep-report-menu-title">
              {isRtl ? 'التقارير المتوفرة للتشغيل' : 'Reports available to run'}
            </p>
            {REPORT_TYPES.map((item) => {
              const Icon = REPORT_ICONS[item.id];
              const active = item.id === value;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`emp-rep-report-menu-item is-${item.id} ${active ? 'is-active' : ''}`}
                  onClick={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                >
                  <span>{isRtl ? item.menuLabelAr : item.menuLabelEn}</span>
                  <span className={`emp-rep-report-menu-icon is-${item.id}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="emp-rep-report-picker" ref={rootRef}>
      <span className="emp-rep-report-picker-label">
        {isRtl ? 'اختر التقرير المراد عرضه' : 'Select report to display'}
      </span>
      <div className={`emp-rep-report-dropdown ${open ? 'is-open' : ''}`}>
        <button
          ref={triggerRef}
          type="button"
          className="emp-rep-report-trigger"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="emp-rep-report-select-badge">
            {isRtl ? current.labelAr : current.labelEn}
          </span>
          {open ? (
            <ChevronUp className="emp-rep-report-select-chevron" aria-hidden />
          ) : (
            <ChevronDown className="emp-rep-report-select-chevron" aria-hidden />
          )}
        </button>
      </div>
      {menu}
    </div>
  );
}
