import React, { useMemo, useRef, useState } from 'react';
import { Download, LayoutGrid, Settings2, UsersRound } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { EmployeeDataRow } from '@/lib/api/employee-data';
import { ErpAddButton } from '@/components/erp/ErpAddButton';
import { ErpSearchBar } from '@/components/erp/ErpSearchBar';
import { ErpTablePagination } from '@/components/erp/ErpTablePagination';
import { useTablePagination } from '@/components/erp/useTablePagination';
import { EmployeeColumnPicker } from '@/components/hr/employee-data/EmployeeColumnPicker';
import { EmployeeDataCardsView } from '@/components/hr/employee-data/EmployeeDataCardsView';
import { EmployeeDataTableView } from '@/components/hr/employee-data/EmployeeDataTableView';
import {
  DEFAULT_VISIBLE_COLUMNS,
  emptyColumnFilters,
  filterEmployees,
  type EmpColumnId,
} from '@/components/hr/employee-data/employee-data-shared';

export function EmployeeDataListView({
  rows,
  loading,
  onAdd,
  onView,
  onEdit,
  onDelete,
}: {
  rows: EmployeeDataRow[];
  loading: boolean;
  onAdd: () => void;
  onView: (row: EmployeeDataRow) => void;
  onEdit: (row: EmployeeDataRow) => void;
  onDelete: (row: EmployeeDataRow) => void;
}) {
  const { t, isRtl } = useLanguage();
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [columnFilters, setColumnFilters] = useState(emptyColumnFilters);
  const [visibleColumns, setVisibleColumns] = useState<EmpColumnId[]>(DEFAULT_VISIBLE_COLUMNS);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDraft, setPickerDraft] = useState<EmpColumnId[]>(DEFAULT_VISIBLE_COLUMNS);
  const columnsBtnRef = useRef<HTMLButtonElement>(null);

  const filtered = useMemo(
    () => filterEmployees(rows, query, columnFilters, advancedOpen),
    [rows, query, columnFilters, advancedOpen],
  );

  const pagination = useTablePagination(filtered);

  const openPicker = () => {
    setPickerDraft(visibleColumns.filter((id) => id !== 'actions'));
    setPickerOpen(true);
  };

  const applyPicker = () => {
    const next = [...pickerDraft.filter((id) => id !== 'actions'), 'actions'] as EmpColumnId[];
    setVisibleColumns(next.length > 1 ? next : DEFAULT_VISIBLE_COLUMNS);
    setPickerOpen(false);
  };

  const resetPicker = () => {
    setPickerDraft(DEFAULT_VISIBLE_COLUMNS.filter((id) => id !== 'actions'));
  };

  const onColumnFilterChange = (id: EmpColumnId, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <div className="emp-data-page">
      <header className="emp-data-topbar">
        <span className="emp-data-topbar-badge">
          {isRtl ? 'بوابة الموارد البشرية والرواتب الذكية' : 'Smart HR & payroll portal'}
        </span>
        <h1>{isRtl ? 'منظومة إدارة الموظفين والهيكل الإداري' : 'Employee management system'}</h1>
      </header>

      <section className="emp-data-main-card">
        <div className="emp-data-action-bar">
          <div className="emp-data-action-title">
            <span className="emp-data-action-icon">
              <UsersRound className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <div className="emp-data-action-heading">
              <h2>
                {isRtl ? 'ملفات طاقم العمل والموظفين' : 'Staff & employee files'}
                <span className="emp-data-count-pill">
                  {filtered.length}/{rows.length}
                </span>
              </h2>
            </div>
          </div>
          <div className="emp-data-action-buttons">
            <button type="button" className="emp-data-export-btn">
              <Download className="h-4 w-4" strokeWidth={2.25} />
              {isRtl ? 'تصدير البيانات' : 'Export data'}
            </button>
            <ErpAddButton onClick={onAdd}>{isRtl ? 'إضافة موظف' : 'Add employee'}</ErpAddButton>
          </div>
        </div>

        <div className="emp-data-toolbar">
          <div className="emp-data-toolbar-start">
            <button
              type="button"
              className={`emp-data-tool-btn ${viewMode === 'cards' ? 'is-active' : ''}`}
              onClick={() => setViewMode((m) => (m === 'cards' ? 'table' : 'cards'))}
            >
              <LayoutGrid className="h-4 w-4" />
              {isRtl ? 'بطاقات' : 'Cards'}
            </button>
            <div className="emp-data-columns-wrap">
              <button
                ref={columnsBtnRef}
                type="button"
                className={`emp-data-tool-btn emp-data-tool-btn-columns ${pickerOpen ? 'is-open' : ''}`}
                onClick={() => (pickerOpen ? setPickerOpen(false) : openPicker())}
              >
                <Settings2 className="h-4 w-4" />
                {isRtl ? 'تخصيص الأعمدة' : 'Customize columns'}
              </button>
              <EmployeeColumnPicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                draft={pickerDraft}
                onDraftChange={setPickerDraft}
                onApply={applyPicker}
                onReset={resetPicker}
                anchorRef={columnsBtnRef}
              />
            </div>
          </div>
          <ErpSearchBar
            className="emp-data-search-bar"
            value={query}
            onChange={setQuery}
            advancedOpen={advancedOpen}
            onAdvancedToggle={() => setAdvancedOpen((v) => !v)}
          />
        </div>

        {viewMode === 'cards' ? (
          <EmployeeDataCardsView
            rows={pagination.pagedRows}
            loading={loading}
            emptyLabel={t('employeeData.empty')}
            loadingLabel={t('inventory.loading')}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : (
          <EmployeeDataTableView
            rows={pagination.pagedRows}
            loading={loading}
            emptyLabel={t('employeeData.empty')}
            loadingLabel={t('inventory.loading')}
            visibleColumns={visibleColumns}
            advancedOpen={advancedOpen}
            columnFilters={columnFilters}
            onColumnFilterChange={onColumnFilterChange}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
          />
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
      </section>
    </div>
  );
}
