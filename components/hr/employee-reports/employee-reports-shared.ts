import type { EmployeeDataRow } from '@/lib/api/employee-data';
import { branchLabel, salaryNumber } from '@/components/hr/employee-data/employee-data-shared';

export type ReportTypeId = 'staff-data';

export const REPORT_TYPES: { id: ReportTypeId; labelAr: string; labelEn: string; titleAr: string; titleEn: string }[] = [
  {
    id: 'staff-data',
    labelAr: 'بيانات الموظفين',
    labelEn: 'Employee data',
    titleAr: 'تقرير بيانات ومظاهر طاقم العمل',
    titleEn: 'Staff data & workforce report',
  },
];

export type EmpRepColumnId =
  | 'code'
  | 'employee'
  | 'dept'
  | 'section'
  | 'branch'
  | 'hire'
  | 'salary'
  | 'status';

export const EMP_REP_COLUMNS: { id: EmpRepColumnId; labelAr: string; labelEn: string }[] = [
  { id: 'code', labelAr: 'كود الموظف', labelEn: 'Employee code' },
  { id: 'employee', labelAr: 'اسم الموظف', labelEn: 'Employee name' },
  { id: 'dept', labelAr: 'الإدارة', labelEn: 'Department' },
  { id: 'section', labelAr: 'القسم', labelEn: 'Section' },
  { id: 'branch', labelAr: 'الفرع', labelEn: 'Branch' },
  { id: 'hire', labelAr: 'التعيين', labelEn: 'Hire date' },
  { id: 'salary', labelAr: 'الراتب', labelEn: 'Salary' },
  { id: 'status', labelAr: 'حالة الدوام', labelEn: 'Attendance status' },
];

export const DEFAULT_EMP_REP_COLUMNS: EmpRepColumnId[] = EMP_REP_COLUMNS.map((c) => c.id);

export type EmpRepColumnFilters = Record<EmpRepColumnId, string>;

export function emptyEmpRepColumnFilters(): EmpRepColumnFilters {
  return {
    code: '',
    employee: '',
    dept: '',
    section: '',
    branch: '',
    hire: '',
    salary: '',
    status: '',
  };
}

export function fmtEgp(value: string | number) {
  return salaryNumber(value);
}

export function filterEmployeeReportRows(
  rows: EmployeeDataRow[],
  query: string,
  columnFilters: EmpRepColumnFilters,
  advancedOpen: boolean,
  branchId: string,
  branchName: string,
  dateFrom: string,
  dateTo: string,
) {
  const q = query.trim().toLowerCase();

  return rows.filter((row) => {
    if (branchId && branchName) {
      const b = branchLabel(row);
      if (b !== branchName && b !== '—') return false;
    }

    if (dateFrom && row.hire_date && row.hire_date < dateFrom) return false;
    if (dateTo && row.hire_date && row.hire_date > dateTo) return false;

    const statusText = row.is_active ? 'active present on' : 'off';
    const haystack = [
      row.employee_code,
      row.full_name,
      row.job_title_name,
      row.department_name,
      row.hr_section_name,
      branchLabel(row),
      row.hire_date,
      row.basic_salary,
      statusText,
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

    if (!match(row.employee_code, columnFilters.code)) return false;
    if (!match(`${row.full_name} ${row.job_title_name}`, columnFilters.employee)) return false;
    if (!match(row.department_name, columnFilters.dept)) return false;
    if (!match(row.hr_section_name, columnFilters.section)) return false;
    if (!match(branchLabel(row), columnFilters.branch)) return false;
    if (!match(row.hire_date || '', columnFilters.hire)) return false;
    if (!match(String(row.basic_salary || row.current_salary), columnFilters.salary)) return false;
    if (!match(statusText, columnFilters.status)) return false;

    return true;
  });
}
