import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, Download } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { fetchBranches, type BranchDto } from '@/lib/api/branches';
import { fetchEmployees, type EmployeeDto } from '@/lib/api/employees';
import { attendanceApi, type AttendanceRow } from '@/lib/api/hr-payroll';
import { entityName } from '@/lib/entity-name';
import { AlertBanner } from '@/components/accounting/AccountingUi';
import { ErpSearchBar } from '@/components/erp/ErpSearchBar';
import { ErpTablePagination } from '@/components/erp/ErpTablePagination';
import { useTablePagination } from '@/components/erp/useTablePagination';

function defaultMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

export function AttendanceReportPanel() {
  const { t, isRtl } = useLanguage();
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [branchId, setBranchId] = useState('');
  const [{ from: dateFrom, to: dateTo }, setRange] = useState(defaultMonthRange);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, br, emps] = await Promise.all([
        attendanceApi.list(dateFrom, dateTo),
        fetchBranches(),
        fetchEmployees(),
      ]);
      setRows(list);
      setBranches(br.filter((b) => b.is_active));
      setEmployees(emps.filter((e) => e.is_active && !e.is_owner));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const branchName = useMemo(() => {
    if (!branchId) return '';
    const b = branches.find((x) => x.id === branchId);
    return b ? entityName(b) : '';
  }, [branchId, branches]);

  const empBranch = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((e) => {
      if (e.default_branch) {
        const b = branches.find((x) => x.id === e.default_branch);
        if (b) map.set(e.id, entityName(b));
      }
    });
    return map;
  }, [employees, branches]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (branchName) {
        const eb = empBranch.get(row.employee_id) || '';
        if (eb && eb !== branchName) return false;
      }
      if (!q) return true;
      const hay = [row.employee_code, row.employee_name, row.work_date, row.check_in, row.check_out]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, branchName, empBranch]);

  const pagination = useTablePagination(filtered);

  const stats = useMemo(() => {
    const late = filtered.reduce((s, r) => s + Number(r.late_minutes || 0), 0);
    const overtime = filtered.reduce((s, r) => s + Number(r.overtime_minutes || 0), 0);
    const unique = new Set(filtered.map((r) => r.employee_id)).size;
    return { records: filtered.length, employees: unique, late, overtime };
  }, [filtered]);

  return (
    <>
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      <div className="emp-rep-filters-panel">
        <div className="emp-rep-filters-row">
          <div className="emp-rep-date-group">
            <label>
              <CalendarDays className="h-3.5 w-3.5" />
              {isRtl ? 'من' : 'From'}
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            />
          </div>
          <div className="emp-rep-date-group">
            <label>
              <CalendarDays className="h-3.5 w-3.5" />
              {isRtl ? 'إلى' : 'To'}
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            />
          </div>
          <button type="button" className="emp-rep-export-btn">
            <Download className="h-4 w-4" />
            {isRtl ? 'تصدير البيانات' : 'Export data'}
          </button>
          <div className="emp-rep-branch-wrap">
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">{isRtl ? 'كل الفروع' : 'All branches'}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {entityName(b)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="emp-rep-toolbar">
          <ErpSearchBar
            className="emp-rep-search-bar"
            value={query}
            onChange={setQuery}
            placeholder={isRtl ? 'البحث بالاسم أو كود الموظف...' : 'Search by name or employee code...'}
            showAdvanced={false}
          />
        </div>
      </div>

      <div className="emp-rep-stats-row">
        <div className="emp-rep-stat is-navy">
          <span className="emp-rep-stat-icon">
            <Clock className="h-5 w-5" />
          </span>
          <div className="emp-rep-stat-text">
            <span>{isRtl ? 'سجلات الحضور' : 'Attendance records'}</span>
            <strong>{stats.records}</strong>
            <small>{isRtl ? 'في الفترة المحددة' : 'In selected period'}</small>
          </div>
        </div>
        <div className="emp-rep-stat is-white">
          <div className="emp-rep-stat-text">
            <span>{isRtl ? 'موظفون مسجلون' : 'Employees recorded'}</span>
            <strong>{stats.employees}</strong>
          </div>
        </div>
        <div className="emp-rep-stat is-white">
          <div className="emp-rep-stat-text">
            <span>{isRtl ? 'دقائق التأخير' : 'Late minutes'}</span>
            <strong>{stats.late}</strong>
          </div>
        </div>
        <div className="emp-rep-stat is-white">
          <div className="emp-rep-stat-text">
            <span>{isRtl ? 'دقائق إضافي' : 'Overtime minutes'}</span>
            <strong>{stats.overtime}</strong>
          </div>
        </div>
      </div>

      <div className="emp-rep-table-scroll">
        <table className="emp-rep-table">
          <thead>
            <tr>
              <th>{isRtl ? 'التاريخ' : 'Date'}</th>
              <th>{isRtl ? 'كود الموظف' : 'Code'}</th>
              <th>{isRtl ? 'اسم الموظف' : 'Employee'}</th>
              <th>{isRtl ? 'حضور' : 'Check in'}</th>
              <th>{isRtl ? 'انصراف' : 'Check out'}</th>
              <th>{isRtl ? 'تأخير (د)' : 'Late (m)'}</th>
              <th>{isRtl ? 'إضافي (د)' : 'OT (m)'}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="emp-rep-empty">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : pagination.pagedRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="emp-rep-empty">
                  {isRtl ? 'لا توجد بيانات حضور' : 'No attendance data'}
                </td>
              </tr>
            ) : (
              pagination.pagedRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.work_date}</td>
                  <td className="emp-rep-code">{row.employee_code || '—'}</td>
                  <td>{row.employee_name}</td>
                  <td>{row.check_in || '—'}</td>
                  <td>{row.check_out || '—'}</td>
                  <td>{row.late_minutes || 0}</td>
                  <td>{row.overtime_minutes || 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ErpTablePagination
        page={pagination.page}
        pageCount={pagination.pageCount}
        pageSize={pagination.pageSize}
        shown={pagination.shown}
        total={pagination.total}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
      />
    </>
  );
}
