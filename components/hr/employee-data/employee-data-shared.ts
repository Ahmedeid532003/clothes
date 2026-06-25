import type { EmployeeDataRow } from '@/lib/api/employee-data';

export type EmpColumnId =
  | 'employee'
  | 'job'
  | 'dept'
  | 'branch'
  | 'salary'
  | 'hire'
  | 'shift'
  | 'actions';

export const EMP_COLUMNS: { id: EmpColumnId; labelAr: string; labelEn: string }[] = [
  { id: 'employee', labelAr: 'الموظف والكود', labelEn: 'Employee & code' },
  { id: 'job', labelAr: 'المسمى التنظيمي', labelEn: 'Job title' },
  { id: 'dept', labelAr: 'الإدارات والأقسام', labelEn: 'Departments' },
  { id: 'branch', labelAr: 'الفرع التابع له', labelEn: 'Branch' },
  { id: 'salary', labelAr: 'المرتب الأساسي', labelEn: 'Basic salary' },
  { id: 'hire', labelAr: 'تاريخ التعيين', labelEn: 'Hire date' },
  { id: 'shift', labelAr: 'الدوام والبصمة', labelEn: 'Shift & attendance' },
  { id: 'actions', labelAr: 'التحكم والعمليات', labelEn: 'Actions' },
];

export const DEFAULT_VISIBLE_COLUMNS: EmpColumnId[] = EMP_COLUMNS.map((c) => c.id);

export type ColumnFilters = Record<EmpColumnId, string>;

export function emptyColumnFilters(): ColumnFilters {
  return {
    employee: '',
    job: '',
    dept: '',
    branch: '',
    salary: '',
    hire: '',
    shift: '',
    actions: '',
  };
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  return (parts[0] || 'EM').slice(0, 2).toUpperCase();
}

export function branchLabel(row: EmployeeDataRow) {
  const branch = row.extra_data?.work_branch;
  return branch ? String(branch) : '—';
}

export function jobSubtitle(row: EmployeeDataRow) {
  const level = row.extra_data?.job_level;
  if (level) return String(level);
  return row.employee_group_name || '—';
}

export function salaryNumber(value: string | number) {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function employmentType(row: EmployeeDataRow, isRtl: boolean) {
  const nature = row.extra_data?.attendance_nature;
  if (nature === 'part_time') return isRtl ? 'دوام جزئي' : 'Part-Time';
  return isRtl ? 'دوام كامل' : 'Full-Time';
}

export function filterEmployees(
  rows: EmployeeDataRow[],
  query: string,
  columnFilters: ColumnFilters,
  advancedOpen: boolean,
) {
  const q = query.trim().toLowerCase();

  return rows.filter((row) => {
    const email = row.email || row.username || '';
    const haystack = [
      row.full_name,
      row.employee_code,
      email,
      row.job_title_name,
      row.department_name,
      row.hr_section_name,
      branchLabel(row),
      row.basic_salary,
      row.current_salary,
      row.hire_date,
      row.work_shift_name,
    ]
      .join(' ')
      .toLowerCase();

    if (q && !haystack.includes(q)) return false;

    if (!advancedOpen) return true;

    const match = (value: string, filter: string) => {
      const f = filter.trim().toLowerCase();
      if (!f) return true;
      return value.toLowerCase().includes(f);
    };

    if (!match(`${row.full_name} ${row.employee_code} ${email}`, columnFilters.employee)) return false;
    if (!match(`${row.job_title_name} ${jobSubtitle(row)}`, columnFilters.job)) return false;
    if (!match(`${row.department_name} ${row.hr_section_name}`, columnFilters.dept)) return false;
    if (!match(branchLabel(row), columnFilters.branch)) return false;
    if (!match(`${row.basic_salary} ${row.total_allowances}`, columnFilters.salary)) return false;
    if (!match(row.hire_date || '', columnFilters.hire)) return false;
    if (
      !match(
        `${row.work_shift_name} ${row.is_active ? 'present' : 'off'}`,
        columnFilters.shift,
      )
    ) {
      return false;
    }

    return true;
  });
}

export function columnCellText(row: EmployeeDataRow, id: EmpColumnId): string {
  switch (id) {
    case 'employee':
      return `${row.full_name} ${row.employee_code} ${row.email || row.username}`;
    case 'job':
      return `${row.job_title_name} ${jobSubtitle(row)}`;
    case 'dept':
      return `${row.department_name} ${row.hr_section_name}`;
    case 'branch':
      return branchLabel(row);
    case 'salary':
      return `${row.basic_salary} ${row.total_allowances}`;
    case 'hire':
      return row.hire_date || '';
    case 'shift':
      return `${row.work_shift_name} ${row.is_active}`;
    default:
      return '';
  }
}
