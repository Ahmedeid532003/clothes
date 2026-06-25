import React from 'react';
import { Clock3, Eye, Pencil, Trash2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { EmployeeDataRow } from '@/lib/api/employee-data';
import {
  branchLabel,
  EMP_COLUMNS,
  initials,
  jobSubtitle,
  salaryNumber,
  type ColumnFilters,
  type EmpColumnId,
} from '@/components/hr/employee-data/employee-data-shared';

function EmployeeCell({ row, isRtl }: { row: EmployeeDataRow; isRtl: boolean }) {
  const email = row.email || row.username || '—';
  return (
    <div className="emp-data-employee-cell">
      <span className="emp-data-avatar-square">
        {initials(row.full_name)}
        <i className="emp-data-avatar-dot" aria-hidden />
      </span>
      <div className="emp-data-employee-meta">
        <strong>{row.full_name}</strong>
        <div className="emp-data-code-line">
          <span className="emp-data-code-tag">{row.employee_code}</span>
          <span className="emp-data-email">{email}</span>
        </div>
      </div>
    </div>
  );
}

function TableRow({
  row,
  visibleColumns,
  isRtl,
  onView,
  onEdit,
  onDelete,
}: {
  row: EmployeeDataRow;
  visibleColumns: EmpColumnId[];
  isRtl: boolean;
  onView: (row: EmployeeDataRow) => void;
  onEdit: (row: EmployeeDataRow) => void;
  onDelete: (row: EmployeeDataRow) => void;
}) {
  const allowances = Number(row.total_allowances || 0);
  const present = row.is_active;

  const cells: Record<EmpColumnId, React.ReactNode> = {
    employee: <EmployeeCell row={row} isRtl={isRtl} />,
    job: (
      <div className="emp-data-stack">
        <strong>{row.job_title_name || '—'}</strong>
        <small>{jobSubtitle(row)}</small>
      </div>
    ),
    dept: (
      <div className="emp-data-stack emp-data-dept-stack">
        <strong>
          {isRtl ? 'إدارة: ' : 'Dept: '}
          {row.department_name || '—'}
        </strong>
        <small>
          {isRtl ? 'قسم: ' : 'Section: '}
          {row.hr_section_name || '—'}
        </small>
      </div>
    ),
    branch: <span className="emp-data-branch-pill">{branchLabel(row)}</span>,
    salary: (
      <div className="emp-data-salary-box">
        <strong>{salaryNumber(row.basic_salary || row.current_salary)}</strong>
        {allowances > 0 ? (
          <small className="is-plus">
            +{salaryNumber(allowances)} {isRtl ? 'بدلات' : 'allow.'}
          </small>
        ) : null}
      </div>
    ),
    hire: <span className="emp-data-date">{row.hire_date || '—'}</span>,
    shift: (
      <div className="emp-data-shift-cell">
        <span className="emp-data-shift-pill">
          <Clock3 className="h-3.5 w-3.5" />
          {row.work_shift_name || '—'}
        </span>
        <span className={`emp-data-status-pill ${present ? 'is-present' : 'is-off'}`}>
          <i aria-hidden />
          {present ? (isRtl ? 'حاضر بالعمل' : 'Present') : isRtl ? 'خارج الدوام' : 'Off duty'}
        </span>
      </div>
    ),
    actions: (
      <div className="emp-data-row-actions">
        <button type="button" className="emp-data-action-btn is-view" onClick={() => onView(row)} aria-label="view">
          <Eye className="h-4 w-4" strokeWidth={2.25} />
        </button>
        <button type="button" className="emp-data-action-btn is-edit" onClick={() => onEdit(row)} aria-label="edit">
          <Pencil className="h-4 w-4" strokeWidth={2.25} />
        </button>
        <button type="button" className="emp-data-action-btn is-delete" onClick={() => onDelete(row)} aria-label="delete">
          <Trash2 className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>
    ),
  };

  return (
    <tr>
      {visibleColumns.map((id) => (
        <td key={id} className={`emp-data-td-${id}`}>
          {cells[id]}
        </td>
      ))}
    </tr>
  );
}

export function EmployeeDataTableView({
  rows,
  loading,
  emptyLabel,
  loadingLabel,
  visibleColumns,
  advancedOpen,
  columnFilters,
  onColumnFilterChange,
  onView,
  onEdit,
  onDelete,
}: {
  rows: EmployeeDataRow[];
  loading: boolean;
  emptyLabel: string;
  loadingLabel: string;
  visibleColumns: EmpColumnId[];
  advancedOpen: boolean;
  columnFilters: ColumnFilters;
  onColumnFilterChange: (id: EmpColumnId, value: string) => void;
  onView: (row: EmployeeDataRow) => void;
  onEdit: (row: EmployeeDataRow) => void;
  onDelete: (row: EmployeeDataRow) => void;
}) {
  const { isRtl } = useLanguage();

  const labelFor = (id: EmpColumnId) => {
    const col = EMP_COLUMNS.find((c) => c.id === id);
    return isRtl ? col?.labelAr : col?.labelEn;
  };

  return (
    <div className="emp-data-table-scroll">
      <table className="emp-data-table">
        <thead>
          <tr>
            {visibleColumns.map((id) => (
              <th key={id} className={`emp-data-th-${id}`}>
                {labelFor(id)}
              </th>
            ))}
          </tr>
          {advancedOpen ? (
            <tr className="emp-data-filter-row">
              {visibleColumns.map((id) => (
                <th key={`filter-${id}`}>
                  {id === 'actions' ? (
                    <span className="emp-data-filter-spacer" />
                  ) : (
                    <input
                      type="search"
                      value={columnFilters[id]}
                      onChange={(e) => onColumnFilterChange(id, e.target.value)}
                      placeholder={isRtl ? 'بحث...' : 'Search...'}
                      className="emp-data-col-filter"
                    />
                  )}
                </th>
              ))}
            </tr>
          ) : null}
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={visibleColumns.length} className="emp-data-empty">
                {loadingLabel}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={visibleColumns.length} className="emp-data-empty">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                row={row}
                visibleColumns={visibleColumns}
                isRtl={isRtl}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
