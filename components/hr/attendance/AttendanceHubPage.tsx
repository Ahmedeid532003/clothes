import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Pencil,
  Search,
  Settings2,
  Trash2,
  UploadCloud,
  X,
  XCircle,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { fetchEmployees, type EmployeeDto } from '@/lib/api/employees';
import { attendanceApi, type AttendancePeriod, type AttendanceRow } from '@/lib/api/hr-payroll';
import { localTodayIso } from '@/lib/dates';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { AlertBanner } from '@/components/accounting/AccountingUi';
import { HrModuleLayout } from '@/components/hr/HrModuleLayout';
import {
  applyPunch,
  emptyPeriods,
  formatDisplayTime,
  normalizePeriods,
  nowTimeHHMM,
  sourceLabel,
  statusLabel,
} from '@/components/hr/attendance/attendance-shared';

const IMPORT_SAMPLE = `[
  {"employee_code": "001", "work_date": "2026-06-15", "check_in": "08:55", "check_out": "17:04"},
  {"employee_code": "002", "work_date": "2026-06-15", "periods": [
    {"check_in": "09:45", "check_out": "12:15"},
    {"check_in": "13:00", "check_out": "16:30"},
    {"check_in": "17:00", "check_out": "19:30"}
  ]}
]`;

const PAGE_SIZES = [6, 10, 20];

function PunchModal({
  open,
  mode,
  employees,
  saving,
  isRtl,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: 'in' | 'out';
  employees: EmployeeDto[];
  saving: boolean;
  isRtl: boolean;
  onClose: () => void;
  onSubmit: (employeeId: string) => Promise<void>;
}) {
  const [employeeId, setEmployeeId] = useState('');

  useEffect(() => {
    if (open) setEmployeeId('');
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="att-modal-overlay" onClick={onClose} role="presentation">
      <div className="att-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="att-modal-head">
          <button type="button" className="att-modal-close" onClick={onClose} aria-label="close">
            <X className="h-4 w-4" />
          </button>
          <span className={`att-modal-icon ${mode === 'in' ? 'is-in' : 'is-out'}`}>
            {mode === 'in' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          </span>
          <div>
            <h2>{mode === 'in' ? (isRtl ? 'تسجيل حضور' : 'Register attendance') : isRtl ? 'تسجيل انصراف' : 'Register departure'}</h2>
            <p>
              {isRtl
                ? 'اختر الموظف وسيُسجَّل الوقت الحالي تلقائياً في الفترة المناسبة'
                : 'Select employee — current time will be logged in the correct period'}
            </p>
          </div>
        </header>
        <div className="att-modal-body">
          <label className="att-field">
            <span>{isRtl ? 'الموظف' : 'Employee'}</span>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">{isRtl ? '— اختر موظف —' : '— Select employee —'}</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.employee_code} — {e.full_name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <footer className="att-modal-foot">
          <button type="button" className="att-btn-ghost" onClick={onClose} disabled={saving}>
            {isRtl ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            className={`att-btn-primary ${mode === 'in' ? 'is-in' : 'is-out'}`}
            disabled={saving || !employeeId}
            onClick={() => onSubmit(employeeId)}
          >
            {saving ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : mode === 'in' ? (isRtl ? 'تسجيل حضور' : 'Check in') : isRtl ? 'تسجيل انصراف' : 'Check out'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function ImportModal({
  open,
  saving,
  isRtl,
  onClose,
  onImport,
}: {
  open: boolean;
  saving: boolean;
  isRtl: boolean;
  onClose: () => void;
  onImport: (json: string) => Promise<void>;
}) {
  const [json, setJson] = useState(IMPORT_SAMPLE);

  useEffect(() => {
    if (open) setJson(IMPORT_SAMPLE);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="att-modal-overlay" onClick={onClose} role="presentation">
      <div className="att-modal att-modal-wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="att-modal-head">
          <button type="button" className="att-modal-close" onClick={onClose} aria-label="close">
            <X className="h-4 w-4" />
          </button>
          <span className="att-modal-icon is-import">
            <UploadCloud className="h-5 w-5" />
          </span>
          <div>
            <h2>{isRtl ? 'استيراد بيانات البصمة' : 'Import fingerprint data'}</h2>
            <p>{isRtl ? 'الصق JSON من جهاز البصمة ثم نفّذ الاستيراد' : 'Paste JSON from fingerprint device and run import'}</p>
          </div>
        </header>
        <div className="att-modal-body">
          <textarea className="att-import-textarea" value={json} onChange={(e) => setJson(e.target.value)} />
        </div>
        <footer className="att-modal-foot">
          <button type="button" className="att-btn-ghost" onClick={onClose} disabled={saving}>
            {isRtl ? 'إلغاء' : 'Cancel'}
          </button>
          <button type="button" className="att-btn-primary is-import" disabled={saving} onClick={() => onImport(json)}>
            {saving ? (isRtl ? 'جاري الاستيراد...' : 'Importing...') : isRtl ? 'تنفيذ الاستيراد' : 'Run import'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function EditModal({
  open,
  row,
  saving,
  isRtl,
  onClose,
  onSubmit,
}: {
  open: boolean;
  row: AttendanceRow | null;
  saving: boolean;
  isRtl: boolean;
  onClose: () => void;
  onSubmit: (periods: AttendancePeriod[]) => Promise<void>;
}) {
  const [periods, setPeriods] = useState<AttendancePeriod[]>(emptyPeriods());

  useEffect(() => {
    if (open && row) setPeriods(normalizePeriods(row));
  }, [open, row]);

  if (!open || !row) return null;

  return createPortal(
    <div className="att-modal-overlay" onClick={onClose} role="presentation">
      <div className="att-modal att-modal-wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="att-modal-head">
          <button type="button" className="att-modal-close" onClick={onClose} aria-label="close">
            <X className="h-4 w-4" />
          </button>
          <span className="att-modal-icon is-edit">
            <Pencil className="h-5 w-5" />
          </span>
          <div>
            <h2>{isRtl ? 'تعديل سجل الحضور' : 'Edit attendance record'}</h2>
            <p>
              {row.employee_name} — {row.work_date}
            </p>
          </div>
        </header>
        <div className="att-modal-body att-periods-grid">
          {periods.map((p, idx) => (
            <div key={idx} className="att-period-edit-card">
              <strong>{isRtl ? `الفترة ${idx + 1}` : `Period ${idx + 1}`}</strong>
              <label className="att-field">
                <span>{isRtl ? 'حضور' : 'Check-in'}</span>
                <input
                  type="time"
                  value={p.check_in || ''}
                  onChange={(e) =>
                    setPeriods((prev) => prev.map((x, i) => (i === idx ? { ...x, check_in: e.target.value || null } : x)))
                  }
                />
              </label>
              <label className="att-field">
                <span>{isRtl ? 'انصراف' : 'Check-out'}</span>
                <input
                  type="time"
                  value={p.check_out || ''}
                  onChange={(e) =>
                    setPeriods((prev) => prev.map((x, i) => (i === idx ? { ...x, check_out: e.target.value || null } : x)))
                  }
                />
              </label>
            </div>
          ))}
        </div>
        <footer className="att-modal-foot">
          <button type="button" className="att-btn-ghost" onClick={onClose} disabled={saving}>
            {isRtl ? 'إلغاء' : 'Cancel'}
          </button>
          <button type="button" className="att-btn-primary" disabled={saving} onClick={() => onSubmit(periods)}>
            {saving ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : isRtl ? 'حفظ' : 'Save'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

export function AttendanceHubPage({ defaultImportOpen = false }: { defaultImportOpen?: boolean }) {
  const { isRtl } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(() => localTodayIso());
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [punchMode, setPunchMode] = useState<'in' | 'out' | null>(null);
  const [importOpen, setImportOpen] = useState(defaultImportOpen);
  const [editRow, setEditRow] = useState<AttendanceRow | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [showPeriod2, setShowPeriod2] = useState(true);
  const [showPeriod3, setShowPeriod3] = useState(true);
  const [columnsOpen, setColumnsOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, e] = await Promise.all([attendanceApi.list(selectedDate, selectedDate), fetchEmployees()]);
      setRows(r);
      setEmployees(e.filter((x) => x.is_active));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    setPage(1);
  }, [selectedDate, search, pageSize]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.employee_name.toLowerCase().includes(q) || r.employee_code.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const onPunch = async (employeeId: string) => {
    if (!punchMode) return;
    setSaving(true);
    setError(null);
    try {
      const existing = rows.find((r) => r.employee_id === employeeId && r.work_date === selectedDate);
      const periods = applyPunch(normalizePeriods(existing), punchMode, nowTimeHHMM());
      await attendanceApi.upsert({
        employee_id: employeeId,
        work_date: selectedDate,
        periods,
        source: 'manual',
      });
      setPunchMode(null);
      setSuccess(isRtl ? 'تم التسجيل بنجاح' : 'Recorded successfully');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const onImport = async (json: string) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const parsed = JSON.parse(json) as Record<string, unknown>[];
      const res = await attendanceApi.importRows(parsed, 'paste.json');
      setImportOpen(false);
      setSuccess(
        isRtl
          ? `تم استيراد ${res.imported_count} سجل${res.errors?.length ? ` — ${res.errors.length} أخطاء` : ''}`
          : `Imported ${res.imported_count} record(s)${res.errors?.length ? ` — ${res.errors.length} error(s)` : ''}`,
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const onEditSave = async (periods: AttendancePeriod[]) => {
    if (!editRow) return;
    setSaving(true);
    setError(null);
    try {
      await attendanceApi.upsert({
        employee_id: editRow.employee_id,
        work_date: editRow.work_date,
        periods,
        source: editRow.source || 'manual',
        notes: editRow.notes,
      });
      setEditRow(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (row: AttendanceRow) => {
    if (!window.confirm(isRtl ? 'حذف سجل الحضور؟' : 'Delete attendance record?')) return;
    setSaving(true);
    setError(null);
    try {
      await attendanceApi.remove(row.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const periodCount = 1 + (showPeriod2 ? 1 : 0) + (showPeriod3 ? 1 : 0);
  const colSpan = 4 + periodCount * 2;
  const fromIdx = filtered.length ? (page - 1) * pageSize + 1 : 0;
  const toIdx = Math.min(page * pageSize, filtered.length);

  return (
    <HrModuleLayout activeTab="attendance">
      <div className="att-hub-page">
        <header className="rd-hub-topbar att-hub-topbar">
          <span className="rd-hub-topbar-badge">
            {isRtl ? 'بوابة الموارد البشرية والرواتب الذكية' : 'Smart HR & payroll portal'}
          </span>
          <h1>{isRtl ? 'منظومة إدارة الموظفين والهيكل الإداري' : 'Employee management system'}</h1>
        </header>

        {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
        {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}

        <section className="att-hub-actions">
          <div className="att-hub-actions-row">
            <button type="button" className="att-action-btn is-checkin" onClick={() => setPunchMode('in')}>
              <CheckCircle2 className="h-4 w-4" />
              {isRtl ? 'تسجيل حضور' : 'Register attendance'}
            </button>
            <button type="button" className="att-action-btn is-checkout" onClick={() => setPunchMode('out')}>
              <XCircle className="h-4 w-4" />
              {isRtl ? 'تسجيل انصراف' : 'Register departure'}
            </button>
          </div>
          <button type="button" className="att-action-btn is-import-full" onClick={() => setImportOpen(true)}>
            <UploadCloud className="h-4 w-4" />
            {isRtl ? 'استيراد بيانات البصمة' : 'Import fingerprint data'}
          </button>
        </section>

        <section className="att-hub-main-card">
          <div className="att-hub-card-title">
            <ClipboardList className="h-5 w-5" />
            <h2>{isRtl ? 'إدارة الحضور والانصراف والبصمة' : 'Attendance, departure & fingerprint'}</h2>
          </div>

          <div className="att-hub-filter-bar">
            <div className="att-hub-filter-meta">
              <strong>{isRtl ? 'أرشيف الحضور لليوم المحدد' : 'Attendance archive for selected day'}</strong>
              <div className="att-columns-wrap">
                <button type="button" className="att-columns-btn" onClick={() => setColumnsOpen((v) => !v)}>
                  <Settings2 className="h-3.5 w-3.5" />
                  {isRtl ? 'تخصيص الأعمدة' : 'Customize columns'}
                </button>
                {columnsOpen ? (
                  <div className="att-columns-pop">
                    <label>
                      <input type="checkbox" checked={showPeriod2} onChange={(e) => setShowPeriod2(e.target.checked)} />
                      {isRtl ? 'الفترة الثانية' : 'Period 2'}
                    </label>
                    <label>
                      <input type="checkbox" checked={showPeriod3} onChange={(e) => setShowPeriod3(e.target.checked)} />
                      {isRtl ? 'الفترة الثالثة' : 'Period 3'}
                    </label>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="att-hub-filter-controls">
              <label className="att-date-field">
                <CalendarDays className="h-4 w-4" />
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
              </label>
              <label className="att-search-field">
                <Search className="h-4 w-4" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={isRtl ? 'بحث باسم الموظف...' : 'Search by employee name...'}
                />
              </label>
            </div>
          </div>

          <div className="att-table-scroll">
            <table className="att-table">
              <thead>
                <tr className="att-table-head-main">
                  <th rowSpan={2}>{isRtl ? 'الموظف' : 'Employee'}</th>
                  <th colSpan={2}>{isRtl ? 'الفترة الأولى (1)' : 'First period (1)'}</th>
                  {showPeriod2 ? <th colSpan={2}>{isRtl ? 'الفترة الثانية (2)' : 'Second period (2)'}</th> : null}
                  {showPeriod3 ? <th colSpan={2}>{isRtl ? 'الفترة الثالثة (3)' : 'Third period (3)'}</th> : null}
                  <th rowSpan={2}>{isRtl ? 'الحالة والوسيلة' : 'Status & method'}</th>
                  <th rowSpan={2}>{isRtl ? 'الإجراءات' : 'Actions'}</th>
                </tr>
                <tr className="att-table-head-sub">
                  <th>{isRtl ? 'حضور' : 'In'}</th>
                  <th>{isRtl ? 'انصراف' : 'Out'}</th>
                  {showPeriod2 ? (
                    <>
                      <th>{isRtl ? 'حضور' : 'In'}</th>
                      <th>{isRtl ? 'انصراف' : 'Out'}</th>
                    </>
                  ) : null}
                  {showPeriod3 ? (
                    <>
                      <th>{isRtl ? 'حضور' : 'In'}</th>
                      <th>{isRtl ? 'انصراف' : 'Out'}</th>
                    </>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={colSpan} className="att-empty">
                      ...
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={colSpan} className="att-empty">
                      {isRtl ? 'لا توجد سجلات حضور لهذا اليوم' : 'No attendance records for this day'}
                    </td>
                  </tr>
                ) : (
                  paged.map((row) => {
                    const periods = normalizePeriods(row);
                    const visible = [periods[0], ...(showPeriod2 ? [periods[1]] : []), ...(showPeriod3 ? [periods[2]] : [])];
                    return (
                      <tr key={row.id}>
                        <td>
                          <strong className="att-employee-name">{row.employee_name}</strong>
                        </td>
                        {visible.map((p, idx) => (
                          <React.Fragment key={idx}>
                            <td>
                              <span className="att-time">{formatDisplayTime(p.check_in)}</span>
                            </td>
                            <td>
                              <span className="att-time">{formatDisplayTime(p.check_out)}</span>
                            </td>
                          </React.Fragment>
                        ))}
                        <td>
                          <div className="att-status-cell">
                            <span className="att-method">{sourceLabel(row.source, isRtl)}</span>
                            <span className="att-status-badge">{statusLabel(row, isRtl)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="att-row-actions">
                            <button type="button" className="att-row-action" onClick={() => setEditRow(row)} aria-label="edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" className="att-row-action is-delete" onClick={() => onDelete(row)} aria-label="delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <footer className="att-pagination">
            <label className="att-page-size">
              <span>{isRtl ? 'عرض' : 'Show'}</span>
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <div className="att-page-nav">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="prev">
                {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(0, 5)
                .map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`att-page-num ${page === n ? 'is-active' : ''}`}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="next">
                {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
            <span className="att-page-meta">
              {isRtl ? `عرض ${fromIdx} - ${toIdx} من أصل ${filtered.length}` : `Showing ${fromIdx} - ${toIdx} of ${filtered.length}`}
            </span>
          </footer>
        </section>

        <PunchModal
          open={punchMode !== null}
          mode={punchMode || 'in'}
          employees={employees}
          saving={saving}
          isRtl={isRtl}
          onClose={() => setPunchMode(null)}
          onSubmit={onPunch}
        />
        <ImportModal open={importOpen} saving={saving} isRtl={isRtl} onClose={() => setImportOpen(false)} onImport={onImport} />
        <EditModal
          open={editRow !== null}
          row={editRow}
          saving={saving}
          isRtl={isRtl}
          onClose={() => setEditRow(null)}
          onSubmit={onEditSave}
        />
      </div>
    </HrModuleLayout>
  );
}
