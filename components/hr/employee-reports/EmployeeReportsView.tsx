import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Download,
  LayoutGrid,
  Settings2,
  Users,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { fetchBranches, type BranchDto } from '@/lib/api/branches';
import { employeeDataApi, type EmployeeDataRow } from '@/lib/api/employee-data';
import { branchLabel } from '@/components/hr/employee-data/employee-data-shared';
import { entityName } from '@/lib/entity-name';
import { AlertBanner } from '@/components/accounting/AccountingUi';
import { ErpSearchBar } from '@/components/erp/ErpSearchBar';
import { ErpTablePagination } from '@/components/erp/ErpTablePagination';
import { useTablePagination } from '@/components/erp/useTablePagination';
import { EmployeeReportTypePicker } from '@/components/hr/employee-reports/EmployeeReportTypePicker';
import { AttendanceReportPanel } from '@/components/hr/employee-reports/AttendanceReportPanel';
import { RewardsDeductionsReportPanel } from '@/components/hr/employee-reports/RewardsDeductionsReportPanel';
import { EmployeeCommissionsReportView } from '@/components/hr/commissions/EmployeeCommissionsReportView';
import { EmployeeReportsColumnPicker } from '@/components/hr/employee-reports/EmployeeReportsColumnPicker';
import {
  DEFAULT_EMP_REP_COLUMNS,
  EMP_REP_COLUMNS,
  emptyEmpRepColumnFilters,
  filterEmployeeReportRows,
  fmtEgp,
  REPORT_TYPES,
  type EmpRepColumnId,
  type ReportTypeId,
} from '@/components/hr/employee-reports/employee-reports-shared';

function CellContent({
  row,
  id,
  isRtl,
}: {
  row: EmployeeDataRow;
  id: EmpRepColumnId;
  isRtl: boolean;
}) {
  switch (id) {
    case 'code':
      return <span className="emp-rep-code">{row.employee_code || '—'}</span>;
    case 'employee':
      return (
        <div className="emp-rep-employee-cell">
          <strong>{row.full_name}</strong>
          <small>{row.job_title_name || '—'}</small>
        </div>
      );
    case 'dept':
      return <span>{row.department_name || '—'}</span>;
    case 'section':
      return <span>{row.hr_section_name || '—'}</span>;
    case 'branch':
      return <span className="emp-rep-branch">{branchLabel(row)}</span>;
    case 'hire':
      return <span className="emp-rep-date">{row.hire_date || '—'}</span>;
    case 'salary':
      return (
        <span className="emp-rep-salary">
          EGP {fmtEgp(row.basic_salary || row.current_salary)}
        </span>
      );
    case 'status':
      return row.is_active ? (
        <span className="emp-rep-status-pill is-active">
          {isRtl ? 'على رأس العمل' : 'On duty'}
        </span>
      ) : (
        <span className="emp-rep-status-pill is-off">{isRtl ? 'خارج الخدمة' : 'Inactive'}</span>
      );
    default:
      return null;
  }
}

function EmployeeReportCard({ row, isRtl }: { row: EmployeeDataRow; isRtl: boolean }) {
  return (
    <article className="emp-rep-card">
      <header>
        <div>
          <strong>{row.full_name}</strong>
          <small>{row.employee_code}</small>
        </div>
        {row.is_active ? (
          <span className="emp-rep-status-pill is-active">{isRtl ? 'على رأس العمل' : 'On duty'}</span>
        ) : (
          <span className="emp-rep-status-pill is-off">{isRtl ? 'خارج الخدمة' : 'Inactive'}</span>
        )}
      </header>
      <p>{row.job_title_name || '—'}</p>
      <div className="emp-rep-card-grid">
        <div>
          <label>{isRtl ? 'الإدارة' : 'Department'}</label>
          <strong>{row.department_name || '—'}</strong>
        </div>
        <div>
          <label>{isRtl ? 'الراتب' : 'Salary'}</label>
          <strong className="emp-rep-salary">EGP {fmtEgp(row.basic_salary || row.current_salary)}</strong>
        </div>
      </div>
    </article>
  );
}

export function EmployeeReportsView() {
  const { t, isRtl } = useLanguage();
  const [rows, setRows] = useState<EmployeeDataRow[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<ReportTypeId>('staff-data');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [branchId, setBranchId] = useState('');
  const [query, setQuery] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [columnFilters, setColumnFilters] = useState(emptyEmpRepColumnFilters);
  const [visibleColumns, setVisibleColumns] = useState<EmpRepColumnId[]>(DEFAULT_EMP_REP_COLUMNS);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDraft, setPickerDraft] = useState<EmpRepColumnId[]>(DEFAULT_EMP_REP_COLUMNS);
  const columnsBtnRef = useRef<HTMLButtonElement>(null);

  const refresh = useCallback(async () => {
    if (reportType !== 'staff-data') return;
    setLoading(true);
    setError(null);
    try {
      const [data, br] = await Promise.all([employeeDataApi.list(), fetchBranches()]);
      setRows(data);
      setBranches(br.filter((b) => b.is_active));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [reportType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const branchName = useMemo(() => {
    if (!branchId) return '';
    const b = branches.find((x) => x.id === branchId);
    return b ? entityName(b) : '';
  }, [branchId, branches]);

  const filtered = useMemo(
    () =>
      filterEmployeeReportRows(
        rows,
        query,
        columnFilters,
        advancedOpen,
        branchId,
        branchName,
        dateFrom,
        dateTo,
      ),
    [rows, query, columnFilters, advancedOpen, branchId, branchName, dateFrom, dateTo],
  );

  const pagination = useTablePagination(filtered);

  const stats = useMemo(() => {
    const total = filtered.length;
    const salarySum = filtered.reduce(
      (sum, row) => sum + Number(row.basic_salary || row.current_salary || 0),
      0,
    );
    const onDuty = filtered.filter((row) => row.is_active).length;
    return {
      total,
      avgSalary: total ? salarySum / total : 0,
      onDuty,
      onDutyPct: total ? Math.round((onDuty / total) * 100) : 0,
    };
  }, [filtered]);

  const currentReport = REPORT_TYPES.find((r) => r.id === reportType) ?? REPORT_TYPES[0];

  const labelFor = (id: EmpRepColumnId) => {
    const col = EMP_REP_COLUMNS.find((c) => c.id === id);
    return isRtl ? col?.labelAr : col?.labelEn;
  };

  const openPicker = () => {
    setPickerDraft([...visibleColumns]);
    setPickerOpen(true);
  };

  const applyPicker = () => {
    setVisibleColumns(pickerDraft.length >= 3 ? pickerDraft : DEFAULT_EMP_REP_COLUMNS);
    setPickerOpen(false);
  };

  return (
    <div className="emp-rep-page">
      <header className="emp-rep-hero">
        <div className="emp-rep-hero-text">
          <span className="emp-rep-hero-badge">
            {isRtl ? 'بوابة الموارد البشرية والرواتب الذكية' : 'Smart HR & payroll portal'}
          </span>
          <h1>{isRtl ? 'معالج تقارير الموظفين' : 'Employee reports processor'}</h1>
          <p>
            {isRtl
              ? 'اختر التقرير المراد عرض بياناته التحليلية الذكية المرتبطة بموظفين منشأتك'
              : 'Select the report to view smart analytics for your workforce'}
          </p>
        </div>
        <EmployeeReportTypePicker value={reportType} onChange={setReportType} />
      </header>

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      <section className="emp-rep-main-card">
        <div className="emp-rep-report-head">
          <h2>{isRtl ? currentReport.titleAr : currentReport.titleEn}</h2>
          <span className="emp-rep-count-badge">
            {reportType === 'staff-data' ? (
              <>
                <Users className="h-3.5 w-3.5" />
                {stats.total} {isRtl ? 'موظف' : 'employees'}
              </>
            ) : (
              isRtl ? currentReport.labelAr : currentReport.labelEn
            )}
          </span>
        </div>

        {reportType === 'staff-data' ? (
          <>
        <div className="emp-rep-filters-panel">
          <div className="emp-rep-filters-row">
            <div className="emp-rep-date-group">
              <label>
                <CalendarDays className="h-3.5 w-3.5" />
                {isRtl ? 'من' : 'From'}
              </label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="emp-rep-date-group">
              <label>
                <CalendarDays className="h-3.5 w-3.5" />
                {isRtl ? 'إلى' : 'To'}
              </label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <button type="button" className="emp-rep-export-btn">
              <Download className="h-4 w-4" />
              {isRtl ? 'تصدير البيانات' : 'Export data'}
            </button>
            <div className="emp-rep-branch-wrap">
              <Building2 className="emp-rep-branch-icon" />
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
              advancedOpen={advancedOpen}
              onAdvancedToggle={() => setAdvancedOpen((v) => !v)}
            />
            <div className="emp-rep-toolbar-end">
              <button
                type="button"
                className={`emp-rep-tool-btn ${viewMode === 'cards' ? 'is-active' : ''}`}
                onClick={() => setViewMode((m) => (m === 'cards' ? 'table' : 'cards'))}
              >
                <LayoutGrid className="h-4 w-4" />
                {isRtl ? 'بطاقات' : 'Cards'}
              </button>
              <div className="emp-rep-columns-wrap">
                <button
                  ref={columnsBtnRef}
                  type="button"
                  className={`emp-rep-tool-btn emp-rep-tool-btn-columns ${pickerOpen ? 'is-open' : ''}`}
                  onClick={() => (pickerOpen ? setPickerOpen(false) : openPicker())}
                >
                  <Settings2 className="h-4 w-4" />
                  {isRtl ? 'الأعمدة' : 'Columns'}
                </button>
                <EmployeeReportsColumnPicker
                  open={pickerOpen}
                  onClose={() => setPickerOpen(false)}
                  draft={pickerDraft}
                  onDraftChange={setPickerDraft}
                  onApply={applyPicker}
                  onReset={() => setPickerDraft(DEFAULT_EMP_REP_COLUMNS)}
                  anchorRef={columnsBtnRef}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="emp-rep-stats-row">
          <div className="emp-rep-stat is-navy">
            <span className="emp-rep-stat-icon">
              <Users className="h-5 w-5" />
            </span>
            <div className="emp-rep-stat-text">
              <span>{isRtl ? 'إجمالي عدد الموظفين' : 'Total employees'}</span>
              <strong>{stats.total}</strong>
              <small>{isRtl ? 'ملفات كاملة على النظام' : 'Complete profiles on system'}</small>
            </div>
          </div>
          <div className="emp-rep-stat is-white">
            <span className="emp-rep-stat-icon is-blue">
              <CircleDollarSign className="h-5 w-5" />
            </span>
            <div className="emp-rep-stat-text">
              <span>{isRtl ? 'متوسط الراتب الأساسي' : 'Average basic salary'}</span>
              <strong>
                {fmtEgp(stats.avgSalary)} <em>{isRtl ? 'ج.م' : 'EGP'}</em>
              </strong>
              <small>{isRtl ? 'حسب العقود المسجلة' : 'Per registered contracts'}</small>
            </div>
          </div>
          <div className="emp-rep-stat is-white">
            <span className="emp-rep-stat-icon is-green">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div className="emp-rep-stat-text">
              <span>{isRtl ? 'على رأس العمل' : 'On duty'}</span>
              <strong>
                {stats.onDuty}{' '}
                <span className="emp-rep-stat-pct">({stats.onDutyPct}%)</span>
              </strong>
              <small>{isRtl ? 'في الدورة التشغيلية الحالية' : 'In current operational cycle'}</small>
            </div>
          </div>
        </div>

        {viewMode === 'cards' ? (
          <div className="emp-rep-cards-grid">
            {loading ? (
              <div className="emp-rep-empty">{t('inventory.loading')}</div>
            ) : pagination.pagedRows.length === 0 ? (
              <div className="emp-rep-empty">{isRtl ? 'لا توجد بيانات' : 'No data'}</div>
            ) : (
              pagination.pagedRows.map((row) => <EmployeeReportCard key={row.id} row={row} isRtl={isRtl} />)
            )}
          </div>
        ) : (
          <div className="emp-rep-table-scroll">
            <table className="emp-rep-table">
              <thead>
                <tr>
                  {visibleColumns.map((id) => (
                    <th key={id} className={`emp-rep-th-${id}`}>
                      {labelFor(id)}
                    </th>
                  ))}
                </tr>
                {advancedOpen ? (
                  <tr className="emp-rep-filter-row">
                    {visibleColumns.map((id) => (
                      <th key={`filter-${id}`}>
                        <input
                          type="search"
                          value={columnFilters[id]}
                          onChange={(e) =>
                            setColumnFilters((prev) => ({ ...prev, [id]: e.target.value }))
                          }
                          placeholder={isRtl ? 'بحث...' : 'Search...'}
                          className="emp-rep-col-filter"
                        />
                      </th>
                    ))}
                  </tr>
                ) : null}
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={visibleColumns.length} className="emp-rep-empty">
                      {t('inventory.loading')}
                    </td>
                  </tr>
                ) : pagination.pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length} className="emp-rep-empty">
                      {isRtl ? 'لا توجد بيانات' : 'No data'}
                    </td>
                  </tr>
                ) : (
                  pagination.pagedRows.map((row) => (
                    <tr key={row.id}>
                      {visibleColumns.map((id) => (
                        <td key={id} className={`emp-rep-td-${id}`}>
                          <CellContent row={row} id={id} isRtl={isRtl} />
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

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
        ) : reportType === 'commissions' ? (
          <div className="emp-rep-report-body">
            <EmployeeCommissionsReportView embedded />
          </div>
        ) : reportType === 'attendance' ? (
          <div className="emp-rep-report-body">
            <AttendanceReportPanel />
          </div>
        ) : (
          <div className="emp-rep-report-body">
            <RewardsDeductionsReportPanel />
          </div>
        )}
      </section>
    </div>
  );
}
