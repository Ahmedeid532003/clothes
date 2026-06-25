import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Clock3, X } from 'lucide-react';
import {
  defaultDaySchedule,
  SHIFT_WEEKDAYS,
  type ShiftDaySchedule,
} from '@/lib/api/work-shifts';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export type WorkShiftFormState = {
  name: string;
  period_count: number;
  weekly_schedule: ShiftDaySchedule[];
};

export function buildEmptyShiftForm(periodCount = 1): WorkShiftFormState {
  return {
    name: '',
    period_count: periodCount,
    weekly_schedule: SHIFT_WEEKDAYS.map((day) => defaultDaySchedule(day, periodCount)),
  };
}

export function WorkShiftModal({
  open,
  editing,
  form,
  onChange,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: boolean;
  form: WorkShiftFormState;
  onChange: (next: WorkShiftFormState) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
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

  const dayLabel = (day: string) => t(`workShifts.days.${day}` as 'workShifts.days.saturday');

  const setPeriodCount = (count: number) => {
    const period_count = Math.max(1, Math.min(3, count));
    onChange({
      ...form,
      period_count,
      weekly_schedule: form.weekly_schedule.map((row) => ({
        ...row,
        evening_enabled: !row.is_off && period_count >= 2,
        third_enabled: !row.is_off && period_count >= 3,
      })),
    });
  };

  const patchDay = (index: number, patch: Partial<ShiftDaySchedule>) => {
    onChange({
      ...form,
      weekly_schedule: form.weekly_schedule.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, ...patch };
        if (patch.is_off === true) {
          return {
            ...next,
            is_off: true,
            start_time: '',
            end_time: '',
            morning_start_time: '',
            morning_end_time: '',
            evening_enabled: false,
            evening_start_time: '',
            evening_end_time: '',
            third_enabled: false,
            third_start_time: '',
            third_end_time: '',
          };
        }
        if (patch.is_off === false) {
          return defaultDaySchedule(row.day, form.period_count);
        }
        return next;
      }),
    });
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="work-shift-modal-overlay"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="work-shift-modal"
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="work-shift-modal-header">
              <button type="button" className="work-shift-modal-close" onClick={onClose} aria-label="close">
                <X className="h-5 w-5" />
              </button>
              <div className="work-shift-modal-title-row">
                <span className="work-shift-modal-dot" aria-hidden />
                <h2>
                  {editing ? t('workShifts.editModalTitle') : t('workShifts.addModalTitle')}
                </h2>
              </div>
            </header>

            <div className="work-shift-modal-body">
              <label className="work-shift-field work-shift-field-full">
                <span>{t('workShifts.name')}</span>
                <input
                  type="text"
                  className="work-shift-input"
                  value={form.name}
                  placeholder={t('workShifts.namePlaceholder')}
                  onChange={(e) => onChange({ ...form, name: e.target.value })}
                />
              </label>

              <div className="work-shift-period-box">
                <div className="work-shift-period-copy">
                  <strong>{t('workShifts.periodSplitTitle')}</strong>
                  <p>{t('workShifts.periodSplitDesc')}</p>
                </div>
                <div className="work-shift-period-pills">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`work-shift-period-pill ${form.period_count === n ? 'is-active' : ''}`}
                      onClick={() => setPeriodCount(n)}
                    >
                      {t(`workShifts.periodCount${n}` as 'workShifts.periodCount1')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="work-shift-schedule-head">{t('workShifts.scheduleTitle')}</div>
              <div className="work-shift-schedule-scroll">
                {form.weekly_schedule.map((day, idx) => (
                  <div key={day.day} className={`work-shift-day-row ${day.is_off ? 'is-off' : ''}`}>
                    <div className="work-shift-day-meta">
                      <label className="work-shift-day-check">
                        <input
                          type="checkbox"
                          checked={!day.is_off}
                          onChange={(e) => patchDay(idx, { is_off: !e.target.checked })}
                        />
                        <span>{dayLabel(day.day)}</span>
                      </label>
                      <small className={day.is_off ? 'is-holiday' : 'is-work'}>
                        {day.is_off ? t('workShifts.officialHoliday') : t('workShifts.workDay')}
                      </small>
                    </div>

                    {day.is_off ? (
                      <div className="work-shift-holiday-pill">{t('workShifts.officialHoliday')}</div>
                    ) : (
                      <div className="work-shift-time-stack">
                        <PeriodRow
                          label={t('workShifts.periodLabel1')}
                          start={day.morning_start_time || day.start_time || '09:00'}
                          end={day.morning_end_time || day.end_time || '17:00'}
                          onStart={(v) =>
                            patchDay(idx, { morning_start_time: v, start_time: v })
                          }
                          onEnd={(v) => patchDay(idx, { morning_end_time: v, end_time: v })}
                        />
                        {form.period_count >= 2 ? (
                          <PeriodRow
                            label={t('workShifts.periodLabel2')}
                            start={day.evening_start_time || '17:00'}
                            end={day.evening_end_time || '21:00'}
                            onStart={(v) => patchDay(idx, { evening_start_time: v, evening_enabled: true })}
                            onEnd={(v) => patchDay(idx, { evening_end_time: v, evening_enabled: true })}
                          />
                        ) : null}
                        {form.period_count >= 3 ? (
                          <PeriodRow
                            label={t('workShifts.periodLabel3')}
                            start={day.third_start_time || '21:00'}
                            end={day.third_end_time || '23:00'}
                            onStart={(v) => patchDay(idx, { third_start_time: v, third_enabled: true })}
                            onEnd={(v) => patchDay(idx, { third_end_time: v, third_enabled: true })}
                          />
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <footer className="work-shift-modal-footer">
              <button type="button" className="work-shift-save-btn" onClick={onSave}>
                {editing ? t('workShifts.saveEdit') : t('workShifts.saveAdd')}
              </button>
              <button type="button" className="work-shift-cancel-btn" onClick={onClose}>
                {t('workShifts.cancel')}
              </button>
            </footer>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function PeriodRow({
  label,
  start,
  end,
  onStart,
  onEnd,
}: {
  label: string;
  start: string;
  end: string;
  onStart: (v: string) => void;
  onEnd: (v: string) => void;
}) {
  return (
    <div className="work-shift-period-row">
      <span className="work-shift-period-label">{label}</span>
      <div className="work-shift-time-pair">
        <label className="work-shift-time-box">
          <Clock3 className="h-4 w-4" />
          <input type="time" value={start} onChange={(e) => onStart(e.target.value)} />
        </label>
        <span className="work-shift-time-sep">«</span>
        <label className="work-shift-time-box">
          <Clock3 className="h-4 w-4" />
          <input type="time" value={end} onChange={(e) => onEnd(e.target.value)} />
        </label>
      </div>
    </div>
  );
}
