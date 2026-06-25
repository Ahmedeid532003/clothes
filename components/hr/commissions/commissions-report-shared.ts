import type { EmployeeCommissionReportRow } from '@/lib/api/hr-payroll';

export type CommColumnId =
  | 'code'
  | 'employee'
  | 'dept'
  | 'section'
  | 'branch'
  | 'consumer'
  | 'purchase'
  | 'percent'
  | 'commission';

export const COMM_COLUMNS: { id: CommColumnId; labelAr: string; labelEn: string }[] = [
  { id: 'code', labelAr: 'كود الموظف', labelEn: 'Employee code' },
  { id: 'employee', labelAr: 'اسم الموظف', labelEn: 'Employee name' },
  { id: 'dept', labelAr: 'الإدارة', labelEn: 'Department' },
  { id: 'section', labelAr: 'القسم', labelEn: 'Section' },
  { id: 'branch', labelAr: 'الفرع البنكي', labelEn: 'Branch' },
  { id: 'consumer', labelAr: 'صافي المبيعات (سعر المستهلك)', labelEn: 'Net sales (consumer)' },
  { id: 'purchase', labelAr: 'صافي المبيعات (سعر الشراء)', labelEn: 'Net sales (purchase)' },
  { id: 'percent', labelAr: 'نسبة المبيعات', labelEn: 'Sales %' },
  { id: 'commission', labelAr: 'صافي العمولة', labelEn: 'Net commission' },
];

export const DEFAULT_COMM_COLUMNS: CommColumnId[] = COMM_COLUMNS.map((c) => c.id);

export type CommColumnFilters = Record<CommColumnId, string>;

export function emptyCommColumnFilters(): CommColumnFilters {
  return {
    code: '',
    employee: '',
    dept: '',
    section: '',
    branch: '',
    consumer: '',
    purchase: '',
    percent: '',
    commission: '',
  };
}

export function fmtEgp(value: string | number, decimals = 1) {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function filterCommissionRows(
  rows: EmployeeCommissionReportRow[],
  query: string,
  columnFilters: CommColumnFilters,
  advancedOpen: boolean,
) {
  const q = query.trim().toLowerCase();

  return rows.filter((row) => {
    const haystack = [
      row.employee_code,
      row.full_name,
      row.job_title_name,
      row.department_name,
      row.hr_section_name,
      row.branch_name,
      row.consumer_sales,
      row.purchase_sales,
      row.sales_percent,
      row.net_commission,
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
    if (!match(row.branch_name, columnFilters.branch)) return false;
    if (!match(row.consumer_sales, columnFilters.consumer)) return false;
    if (!match(row.purchase_sales, columnFilters.purchase)) return false;
    if (!match(row.sales_percent, columnFilters.percent)) return false;
    if (!match(row.net_commission, columnFilters.commission)) return false;

    return true;
  });
}
