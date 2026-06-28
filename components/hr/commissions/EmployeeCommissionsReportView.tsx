import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeDollarSign,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Download,
  LayoutGrid,
  PieChart,
  Settings2,
  TrendingUp,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { fetchBranches, type BranchDto } from '@/lib/api/branches';
import { entityName } from '@/lib/entity-name';
import {
  commissionsApi,
  type EmployeeCommissionReport,
  type EmployeeCommissionReportRow,
} from '@/lib/api/hr-payroll';
import { AlertBanner } from '@/components/accounting/AccountingUi';
import { ErpSearchBar } from '@/components/erp/ErpSearchBar';
import { ErpTablePagination } from '@/components/erp/ErpTablePagination';
import { useTablePagination } from '@/components/erp/useTablePagination';
import { CommissionsColumnPicker } from '@/components/hr/commissions/CommissionsColumnPicker';
import {
  COMM_COLUMNS,
  DEFAULT_COMM_COLUMNS,
  emptyCommColumnFilters,
  filterCommissionRows,
  fmtEgp,
  type CommColumnId,
} from '@/components/hr/commissions/commissions-report-shared';

function CellContent({
  row,
  id,
  isRtl,
}: {
  row: EmployeeCommissionReportRow;
  id: CommColumnId;
  isRtl: boolean;
}) {
  switch (id) {
    case 'code':
      return <span className="emp-comm-code">{row.employee_code || '—'}</span>;
    case 'employee':
      return (
        <div className="emp-comm-employee-cell">
          <strong>{row.full_name}</strong>
          <small>{row.job_title_name || '—'}</small>
        </div>
      );
    case 'dept':
      return <span>{row.department_name || '—'}</span>;
    case 'section':
      return <span>{row.hr_section_name || '—'}</span>;
    case 'branch':
      return <span className="emp-comm-branch">{row.branch_name || '—'}</span>;
    case 'consumer':
      return <span className="emp-comm-money is-consumer">EGP {fmtEgp(row.consumer_sales)}</span>;
    case 'purchase':
      return <span className="emp-comm-money is-purchase">EGP {fmtEgp(row.purchase_sales)}</span>;
    case 'percent':
      return row.sales_percent ? (
        <span className="emp-comm-percent-pill">{row.sales_percent}</span>
      ) : (
        <span className="emp-comm-percent-pill is-muted">—</span>
      );
    case 'commission':
      return <span className="emp-comm-money is-commission">EGP {fmtEgp(row.net_commission)}</span>;
    default:
      return null;
  }
}

function CommissionCard({ row, isRtl }: { row: EmployeeCommissionReportRow; isRtl: boolean }) {
  return (
    <article className="emp-comm-card">
      <header>
        <div>
          <strong>{row.full_name}</strong>
          <small>{row.employee_code}</small>
        </div>
        <span className="emp-comm-money is-commission">EGP {fmtEgp(row.net_commission)}</span>
      </header>
      <p>{row.job_title_name || '—'}</p>
      <div className="emp-comm-card-grid">
        <div>
          <label>{isRtl ? 'سعر المستهلك' : 'Consumer'}</label>
          <strong className="is-consumer">EGP {fmtEgp(row.consumer_sales)}</strong>
        </div>
        <div>
          <label>{isRtl ? 'سعر الشراء' : 'Purchase'}</label>
          <strong className="is-purchase">EGP {fmtEgp(row.purchase_sales)}</strong>
        </div>
      </div>
    </article>
  );
}

export function EmployeeCommissionsReportView({ embedded = false }: { embedded?: boolean }) {
  const { t, isRtl } = useLanguage();
  const [report, setReport] = useState<EmployeeCommissionReport | null>(null);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [branchId, setBranchId] = useState('');
  const [query, setQuery] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [columnFilters, setColumnFilters] = useState(emptyCommColumnFilters);
  const [visibleColumns, setVisibleColumns] = useState<CommColumnId[]>(DEFAULT_COMM_COLUMNS);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDraft, setPickerDraft] = useState<CommColumnId[]>(DEFAULT_COMM_COLUMNS);
  const columnsBtnRef = useRef<HTMLButtonElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, br] = await Promise.all([
        commissionsApi.report({
          from: dateFrom || undefined,
          to: dateTo || undefined,
          branch_id: branchId || undefined,
        }),
        fetchBranches(),
      ]);
      setReport(data);
      setBranches(br.filter((b) => b.is_active));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, branchId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const rows = report?.rows ?? [];
  const filtered = useMemo(
    () => filterCommissionRows(rows, query, columnFilters, advancedOpen),
    [rows, query, columnFilters, advancedOpen],
  );

  const pagination = useTablePagination(filtered);

  const totals = report?.totals ?? {
    consumer_sales: '0',
    purchase_sales: '0',
    net_commission: '0',
  };

  const labelFor = (id: CommColumnId) => {
    const col = COMM_COLUMNS.find((c) => c.id === id);
    return isRtl ? col?.labelAr : col?.labelEn;
  };

  const openPicker = () => {
    setPickerDraft([...visibleColumns]);
    setPickerOpen(true);
  };

  const applyPicker = () => {
    setVisibleColumns(pickerDraft.length >= 3 ? pickerDraft : DEFAULT_COMM_COLUMNS);
    setPickerOpen(false);
  };

  const inner = (
    <>
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      {!embedded ? (
        <div className="emp-comm-title-bar">
          <div className="emp-comm-title-main">
            <span className="emp-comm-title-icon">
              <PieChart className="h-5 w-5" />
            </span>
            <h2>
              {isRtl ? 'تقرير عمولات ومبيعات طاقم العمل' : 'Staff commissions & sales report'}
              <span className="emp-comm-count-pill">
                {report?.employee_count ?? filtered.length} {isRtl ? 'موظف' : 'employees'}
              </span>
            </h2>
          </div>
        </div>
      ) : null}

        <div className="emp-comm-filters-row">
          <div className="emp-comm-date-group">
            <label>
              <CalendarDays className="h-3.5 w-3.5" />
              {isRtl ? 'من' : 'From'}
            </label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="emp-comm-date-group">
            <label>
              <CalendarDays className="h-3.5 w-3.5" />
              {isRtl ? 'إلى' : 'To'}
            </label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <button type="button" className="emp-comm-export-btn">
            <Download className="h-4 w-4" />
            {isRtl ? 'تصدير البيانات' : 'Export data'}
          </button>
          <div className="emp-comm-branch-wrap">
            <Building2 className="emp-comm-branch-icon" />
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

        <div className="emp-comm-stats-row">
          <div className="emp-comm-stat is-navy">
            <div className="emp-comm-stat-text">
              <span>{isRtl ? 'صافي المبيعات بسعر المستهلك' : 'Net sales (consumer price)'}</span>
              <strong>EGP {fmtEgp(totals.consumer_sales)}</strong>
            </div>
            <span className="emp-comm-stat-icon">
              <CircleDollarSign className="h-5 w-5" />
            </span>
          </div>
          <div className="emp-comm-stat is-blue">
            <div className="emp-comm-stat-text">
              <span>{isRtl ? 'صافي المبيعات بسعر الشراء الحالي' : 'Net sales (purchase price)'}</span>
              <strong>EGP {fmtEgp(totals.purchase_sales)}</strong>
            </div>
            <span className="emp-comm-stat-icon">
              <TrendingUp className="h-5 w-5" />
            </span>
          </div>
          <div className="emp-comm-stat is-green">
            <div className="emp-comm-stat-text">
              <span>{isRtl ? 'إجمالي صافي العمولات المستحقة' : 'Total net commissions due'}</span>
              <strong>EGP {fmtEgp(totals.net_commission)}</strong>
            </div>
            <span className="emp-comm-stat-icon">
              <BadgeDollarSign className="h-5 w-5" />
            </span>
          </div>
        </div>

        <div className="emp-comm-toolbar">
          <div className="emp-comm-toolbar-start">
            <button
              type="button"
              className={`emp-comm-tool-btn ${viewMode === 'cards' ? 'is-active' : ''}`}
              onClick={() => setViewMode((m) => (m === 'cards' ? 'table' : 'cards'))}
            >
              <LayoutGrid className="h-4 w-4" />
              {isRtl ? 'بطاقات' : 'Cards'}
            </button>
            <div className="emp-comm-columns-wrap">
              <button
                ref={columnsBtnRef}
                type="button"
                className={`emp-comm-tool-btn emp-comm-tool-btn-columns ${pickerOpen ? 'is-open' : ''}`}
                onClick={() => (pickerOpen ? setPickerOpen(false) : openPicker())}
              >
                <Settings2 className="h-4 w-4" />
                {isRtl ? 'تخصيص الأعمدة' : 'Customize columns'}
              </button>
              <CommissionsColumnPicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                draft={pickerDraft}
                onDraftChange={setPickerDraft}
                onApply={applyPicker}
                onReset={() => setPickerDraft(DEFAULT_COMM_COLUMNS)}
                anchorRef={columnsBtnRef}
              />
            </div>
          </div>
          <ErpSearchBar
            className="emp-comm-search-bar"
            value={query}
            onChange={setQuery}
            placeholder={isRtl ? 'البحث بالاسم أو كود الموظف...' : 'Search by name or employee code...'}
            advancedOpen={advancedOpen}
            onAdvancedToggle={() => setAdvancedOpen((v) => !v)}
          />
        </div>

        {viewMode === 'cards' ? (
          <div className="emp-comm-cards-grid">
            {loading ? (
              <div className="emp-comm-empty">{t('inventory.loading')}</div>
            ) : pagination.pagedRows.length === 0 ? (
              <div className="emp-comm-empty">{t('hrPayroll.commissions.empty')}</div>
            ) : (
              pagination.pagedRows.map((row) => <CommissionCard key={row.employee_id} row={row} isRtl={isRtl} />)
            )}
          </div>
        ) : (
          <div className="emp-comm-table-scroll">
            <table className="emp-comm-table">
              <thead>
                <tr>
                  {visibleColumns.map((id) => (
                    <th key={id} className={`emp-comm-th-${id}`}>
                      {labelFor(id)}
                    </th>
                  ))}
                </tr>
                {advancedOpen ? (
                  <tr className="emp-comm-filter-row">
                    {visibleColumns.map((id) => (
                      <th key={`filter-${id}`}>
                        <input
                          type="search"
                          value={columnFilters[id]}
                          onChange={(e) =>
                            setColumnFilters((prev) => ({ ...prev, [id]: e.target.value }))
                          }
                          placeholder={isRtl ? 'بحث...' : 'Search...'}
                          className="emp-comm-col-filter"
                        />
                      </th>
                    ))}
                  </tr>
                ) : null}
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={visibleColumns.length} className="emp-comm-empty">
                      {t('inventory.loading')}
                    </td>
                  </tr>
                ) : pagination.pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length} className="emp-comm-empty">
                      {t('hrPayroll.commissions.empty')}
                    </td>
                  </tr>
                ) : (
                  pagination.pagedRows.map((row) => (
                    <tr key={row.employee_id}>
                      {visibleColumns.map((id) => (
                        <td key={id} className={`emp-comm-td-${id}`}>
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
  );

  if (embedded) return inner;

  return (
    <div className="emp-comm-page">
      <header className="emp-comm-topbar">
        <span className="emp-comm-topbar-badge">
          {isRtl ? 'بوابة الموارد البشرية والرواتب الذكية' : 'Smart HR & payroll portal'}
        </span>
        <h1>{isRtl ? 'منظومة إدارة الموظفين والهيكل الإداري' : 'Employee management system'}</h1>
      </header>
      <section className="emp-comm-main-card">{inner}</section>
    </div>
  );
}
