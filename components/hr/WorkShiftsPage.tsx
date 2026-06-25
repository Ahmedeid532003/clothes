import React, { useCallback, useEffect, useState } from 'react';
import { Clock3, Pencil, Trash2, Users } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  createWorkShift,
  dayCircleLetter,
  defaultWeeklySchedule,
  deleteWorkShift,
  fetchWorkShifts,
  formatDayTimeLines,
  periodLabelKey,
  SHIFT_WEEKDAYS,
  updateWorkShift,
  type WorkShiftDto,
} from '@/lib/api/work-shifts';
import { AlertBanner } from '@/components/accounting/AccountingUi';
import { ErpAddButton } from '@/components/erp/ErpAddButton';
import { HrModuleLayout } from '@/components/hr/HrModuleLayout';
import {
  buildEmptyShiftForm,
  WorkShiftModal,
  type WorkShiftFormState,
} from '@/components/hr/WorkShiftModal';

function toForm(row: WorkShiftDto): WorkShiftFormState {
  const period_count = row.period_count || 1;
  return {
    name: row.name || row.name_en || '',
    period_count,
    weekly_schedule: row.weekly_schedule?.length
      ? row.weekly_schedule
      : defaultWeeklySchedule(period_count),
  };
}

export function WorkShiftsPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<WorkShiftDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkShiftDto | null>(null);
  const [form, setForm] = useState<WorkShiftFormState>(buildEmptyShiftForm());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchWorkShifts());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dayLabel = (day: string) => t(`workShifts.days.${day}` as 'workShifts.days.saturday');

  const openAdd = () => {
    setEditing(null);
    setForm(buildEmptyShiftForm(1));
    setOpen(true);
  };

  const openEdit = (row: WorkShiftDto) => {
    setEditing(row);
    setForm(toForm(row));
    setOpen(true);
  };

  const onSave = async () => {
    if (!form.name.trim()) return;
    try {
      const body = {
        name: form.name.trim(),
        period_count: form.period_count,
        weekly_schedule: form.weekly_schedule,
      };
      if (editing) {
        await updateWorkShift(editing.id, body);
      } else {
        await createWorkShift(body);
      }
      setOpen(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  return (
    <HrModuleLayout activeTab="work-shifts">
      <div className="work-shift-mgmt-page">
        <header className="work-shift-mgmt-header">
          <div className="work-shift-mgmt-title-wrap">
            <span className="work-shift-mgmt-title-icon">
              <Clock3 className="h-6 w-6" />
            </span>
            <div>
              <h1>{t('workShifts.pageTitle')}</h1>
            </div>
          </div>
          <ErpAddButton onClick={openAdd}>{t('workShifts.addNew')}</ErpAddButton>
        </header>

        {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

        <div className="work-shift-mgmt-grid">
          {loading ? (
            <div className="work-shift-mgmt-empty">{t('inventory.loading')}</div>
          ) : rows.length === 0 ? (
            <div className="work-shift-mgmt-empty">{t('workShifts.empty')}</div>
          ) : (
            rows.map((row) => (
              <ShiftCard
                key={row.id}
                row={row}
                dayLabel={dayLabel}
                onEdit={() => openEdit(row)}
                onDelete={async () => {
                  if (!confirm(t('departments.delete') + '?')) return;
                  await deleteWorkShift(row.id);
                  load();
                }}
                t={t}
              />
            ))
          )}
        </div>
      </div>

      <WorkShiftModal
        open={open}
        editing={Boolean(editing)}
        form={form}
        onChange={setForm}
        onClose={() => setOpen(false)}
        onSave={onSave}
      />
    </HrModuleLayout>
  );
}

function ShiftCard({
  row,
  dayLabel,
  onEdit,
  onDelete,
  t,
}: {
  row: WorkShiftDto;
  dayLabel: (day: string) => string;
  onEdit: () => void;
  onDelete: () => void;
  t: (key: string) => string;
}) {
  const periodCount = row.period_count || 1;

  return (
    <article className="work-shift-mgmt-card">
      <header className="work-shift-mgmt-card-head">
        <span className="work-shift-mgmt-period-badge">{t(periodLabelKey(periodCount))}</span>
        <div className="work-shift-mgmt-card-title">
          <span className="work-shift-mgmt-dot" aria-hidden />
          <div>
            <h3>{row.name}</h3>
            <p className="work-shift-mgmt-crew">
              <Users className="h-3.5 w-3.5" />
              {t('workShifts.crewCount', { count: String(row.employee_count || 0) })}
            </p>
          </div>
        </div>
      </header>

      <div className="work-shift-mgmt-card-body">
        <h4>{t('workShifts.scheduleCardTitle')}</h4>
        <div className="work-shift-mgmt-schedule-scroll">
          <div className="work-shift-mgmt-schedule-list">
            {row.weekly_schedule.map((day) => (
              <div key={day.day} className="work-shift-mgmt-schedule-row">
                <span className="work-shift-mgmt-day-name">{dayLabel(day.day)}</span>
                {day.is_off ? (
                  <span className="work-shift-mgmt-holiday">{t('workShifts.officialHoliday')}</span>
                ) : (
                  <div className="work-shift-mgmt-time-stack">
                    {formatDayTimeLines(day, periodCount).map((line) => (
                      <span key={line} className="work-shift-mgmt-time">
                        {line}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="work-shift-mgmt-day-dots">
          {SHIFT_WEEKDAYS.map((dayKey) => {
            const day = row.weekly_schedule.find((d) => d.day === dayKey);
            const isOff = day?.is_off ?? false;
            return (
              <span
                key={dayKey}
                className={`work-shift-mgmt-day-dot ${isOff ? 'is-off' : 'is-work'}`}
                title={dayLabel(dayKey)}
              >
                {dayCircleLetter(dayKey)}
              </span>
            );
          })}
        </div>
      </div>

      <footer className="work-shift-mgmt-card-foot">
        <button type="button" className="work-shift-mgmt-edit-btn" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          {t('workShifts.editTimings')}
        </button>
        <button type="button" className="work-shift-mgmt-delete-btn" onClick={onDelete} aria-label={t('departments.delete')}>
          <Trash2 className="h-4 w-4" />
        </button>
      </footer>
    </article>
  );
}
