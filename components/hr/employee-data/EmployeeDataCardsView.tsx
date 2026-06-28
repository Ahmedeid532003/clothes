import React from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { EmployeeDataRow } from '@/lib/api/employee-data';
import {
  branchLabel,
  employmentType,
  jobSubtitle,
  salaryNumber,
} from '@/components/hr/employee-data/employee-data-shared';
import { EmployeeAvatar } from '@/components/hr/employee-data/EmployeeAvatar';

function EmployeeCard({
  row,
  isRtl,
  onView,
  onEdit,
  onDelete,
}: {
  row: EmployeeDataRow;
  isRtl: boolean;
  onView: (row: EmployeeDataRow) => void;
  onEdit: (row: EmployeeDataRow) => void;
  onDelete: (row: EmployeeDataRow) => void;
}) {
  const present = row.is_active;
  const email = row.email || row.username || '—';
  const allowances = Number(row.total_allowances || 0);

  return (
    <article className="emp-data-employee-card">
      <header className="emp-data-card-head">
        <div className="emp-data-card-head-main">
          <h3>{row.full_name}</h3>
          <p className="emp-data-card-meta">
            <span>{row.employee_code}</span>
            <i aria-hidden>•</i>
            <span>{email}</span>
          </p>
          <span className={`emp-data-card-attendance ${present ? 'is-present' : 'is-off'}`}>
            <i aria-hidden />
            {present ? (isRtl ? 'حاضر' : 'Present') : isRtl ? 'غائب' : 'Absent'}
          </span>
        </div>
        <EmployeeAvatar
          fullName={row.full_name}
          photoUrl={row.photo_url}
          className="emp-data-card-avatar"
        />
      </header>

      <div className="emp-data-card-grid">
        <div className="emp-data-card-box">
          <label>{isRtl ? 'المسمى التنظيمي' : 'Job title'}</label>
          <strong>{row.job_title_name || '—'}</strong>
          <small>{jobSubtitle(row)}</small>
        </div>
        <div className="emp-data-card-box">
          <label>{isRtl ? 'الإدارة والقسم' : 'Dept & section'}</label>
          <strong>{row.department_name || '—'}</strong>
          <small>
            {isRtl ? 'قسم: ' : 'Section: '}
            {row.hr_section_name || '—'}
          </small>
        </div>
        <div className="emp-data-card-box">
          <label>{isRtl ? 'المرتب الأساسي والبدل' : 'Salary & allowance'}</label>
          <strong>EGP {salaryNumber(row.basic_salary || row.current_salary)}</strong>
          {allowances > 0 ? (
            <small className="is-plus">Allow {salaryNumber(allowances)}+</small>
          ) : (
            <small>—</small>
          )}
        </div>
        <div className="emp-data-card-box">
          <label>{isRtl ? 'تاريخ التعيين' : 'Hire date'}</label>
          <strong>{row.hire_date || '—'}</strong>
          <small>{employmentType(row, isRtl)}</small>
        </div>
      </div>

      <div className="emp-data-card-shift">
        <label>{isRtl ? 'وردية العمل الحالية' : 'Current shift'}</label>
        <strong>{row.work_shift_name || '—'}</strong>
        <span className="emp-data-card-branch">{branchLabel(row)}</span>
      </div>

      <footer className="emp-data-card-foot">
        <span className="emp-data-card-status">
          {isRtl ? 'تحديث: نشط' : 'Update: active'}
        </span>
        <div className="emp-data-card-actions">
          <button type="button" className="emp-data-card-btn is-profile" onClick={() => onView(row)}>
            <Eye className="h-4 w-4" />
            {isRtl ? 'الملف التفصيلي' : 'Profile'}
          </button>
          <button type="button" className="emp-data-card-btn is-edit" onClick={() => onEdit(row)}>
            <Pencil className="h-4 w-4" />
            {isRtl ? 'تعديل' : 'Edit'}
          </button>
          <button type="button" className="emp-data-card-btn is-delete" onClick={() => onDelete(row)} aria-label="delete">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </article>
  );
}

export function EmployeeDataCardsView({
  rows,
  loading,
  emptyLabel,
  loadingLabel,
  onView,
  onEdit,
  onDelete,
}: {
  rows: EmployeeDataRow[];
  loading: boolean;
  emptyLabel: string;
  loadingLabel: string;
  onView: (row: EmployeeDataRow) => void;
  onEdit: (row: EmployeeDataRow) => void;
  onDelete: (row: EmployeeDataRow) => void;
}) {
  const { isRtl } = useLanguage();

  if (loading) {
    return <div className="emp-data-cards-empty">{loadingLabel}</div>;
  }

  if (rows.length === 0) {
    return <div className="emp-data-cards-empty">{emptyLabel}</div>;
  }

  return (
    <div className="emp-data-cards-grid">
      {rows.map((row) => (
        <EmployeeCard
          key={row.id}
          row={row}
          isRtl={isRtl}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
