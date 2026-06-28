import { apiFetch } from '@/lib/api/client';

export type CatalogRow = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  default_amount?: string;
};

const catalogApi = (base: string) => {
  const root = base.endsWith('/') ? base : `${base}/`;
  return {
    list: () => apiFetch<CatalogRow[]>(root),
    create: (body: { name: string; code?: string; default_amount?: string | number }) =>
      apiFetch<CatalogRow>(root, { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: { name: string; default_amount?: string | number }) =>
      apiFetch<CatalogRow>(`${root}${id}/`, { method: 'PATCH', body: JSON.stringify(body) }),
    remove: (id: string) => apiFetch<void>(`${root}${id}/`, { method: 'DELETE' }),
  };
};

export const bonusItemsApi = catalogApi('/hr/bonus-items');
export const deductionItemsApi = catalogApi('/hr/deduction-items');
export const allowanceItemsApi = catalogApi('/hr/allowance-items');
export const leaveTypesApi = catalogApi('/hr/leave-types');
export const paymentTypesApi = catalogApi('/hr/payment-types');

export type OfficialHolidayRow = {
  id: string;
  name: string;
  holiday_date?: string | null;
  is_recurring: boolean;
  notes: string;
  is_active: boolean;
};

export const officialHolidaysApi = {
  list: () => apiFetch<OfficialHolidayRow[]>('/hr/official-holidays/'),
  create: (body: {
    name: string;
    holiday_date?: string | null;
    is_recurring?: boolean;
    notes?: string;
  }) =>
    apiFetch<OfficialHolidayRow>('/hr/official-holidays/', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: Partial<OfficialHolidayRow>) =>
    apiFetch<OfficialHolidayRow>(`/hr/official-holidays/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  remove: (id: string) => apiFetch<void>(`/hr/official-holidays/${id}/`, { method: 'DELETE' }),
};

export type EmployeeBrief = {
  employee_id: string;
  employee_code: string;
  employee_name: string;
};

export type BonusRow = EmployeeBrief & {
  id: string;
  bonus_item_id: string | null;
  bonus_item_name: string;
  description: string;
  amount: string;
  bonus_date: string;
  notes: string;
};

export type DeductionRow = EmployeeBrief & {
  id: string;
  deduction_item_id: string | null;
  deduction_item_name: string;
  description: string;
  amount: string;
  deduction_date: string;
  notes: string;
};

export type AllowanceAssignRow = EmployeeBrief & {
  id: string;
  allowance_item_id: string;
  allowance_item_name: string;
  allowance_item_code: string;
  amount: string;
  is_active: boolean;
};

export type LeaveRow = EmployeeBrief & {
  id: string;
  leave_type_id: string;
  leave_type_name: string;
  start_date: string;
  end_date: string | null;
  unit: 'days' | 'hours';
  quantity: string;
  notes: string;
};

export type AttendancePeriod = {
  check_in: string | null;
  check_out: string | null;
};

export type AttendanceRow = EmployeeBrief & {
  id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  periods?: AttendancePeriod[];
  late_minutes: number;
  overtime_minutes: number;
  source: string;
  notes: string;
};

export type CommissionRow = EmployeeBrief & {
  id: string;
  period_type: 'daily' | 'monthly';
  period_date: string;
  sales_amount: string;
  commission_amount: string;
  notes: string;
};

export type PayrollSheetRow = EmployeeBrief & {
  year: number;
  month: number;
  basic_salary: string;
  total_increases: string;
  current_salary: string;
  total_allowances: string;
  total_bonuses: string;
  total_commissions: string;
  total_deductions: string;
  advances_balance: string;
  advances_paid_period: string;
  gross_salary: string;
  net_salary: string;
};

export type PayrollPaymentRow = EmployeeBrief & {
  id: string;
  payment_type_id: string;
  payment_type_name: string;
  payment_type_code: string;
  amount: string;
  payment_date: string;
  period_year: number | null;
  period_month: number | null;
  notes: string;
  grant_reason?: string;
  branch_id?: string | null;
  branch_name?: string | null;
  created_by_id?: string | null;
  created_by_name?: string | null;
  created_at?: string | null;
};

export type AdvanceInstallmentRow = {
  period_year: number;
  period_month: number;
  amount: string;
  status: string;
};

export type AdvanceRow = EmployeeBrief & {
  id: string;
  amount: string;
  settled_amount: string;
  balance: string;
  advance_date: string;
  notes: string;
  is_scheduled: boolean;
  installment_months: number | null;
  monthly_installment: string | null;
  installments: AdvanceInstallmentRow[];
  branch_id?: string | null;
  branch_name?: string | null;
  created_by_id?: string | null;
  created_by_name?: string | null;
  created_at?: string | null;
  is_active: boolean;
};

export const bonusesApi = {
  list: (year?: number, month?: number) => {
    const q = new URLSearchParams();
    if (year) q.set('year', String(year));
    if (month) q.set('month', String(month));
    const s = q.toString();
    return apiFetch<BonusRow[]>(s ? `/hr/bonuses/?${s}` : '/hr/bonuses/');
  },
  create: (body: Record<string, unknown>) =>
    apiFetch<BonusRow>('/hr/bonuses/', { method: 'POST', body: JSON.stringify(body) }),
};

export const deductionsApi = {
  list: (year?: number, month?: number) => {
    const q = new URLSearchParams();
    if (year) q.set('year', String(year));
    if (month) q.set('month', String(month));
    const s = q.toString();
    return apiFetch<DeductionRow[]>(s ? `/hr/deductions/?${s}` : '/hr/deductions/');
  },
  create: (body: Record<string, unknown>) =>
    apiFetch<DeductionRow>('/hr/deductions/', { method: 'POST', body: JSON.stringify(body) }),
};

export const allowancesApi = {
  list: () => apiFetch<AllowanceAssignRow[]>('/hr/allowances/'),
  create: (body: { employee_id: string; allowance_item_id: string; amount: string | number }) =>
    apiFetch<AllowanceAssignRow>('/hr/allowances/', { method: 'POST', body: JSON.stringify(body) }),
  remove: (id: string) => apiFetch<void>(`/hr/allowances/${id}/`, { method: 'DELETE' }),
};

export const leavesApi = {
  list: () => apiFetch<LeaveRow[]>('/hr/leaves/'),
  create: (body: Record<string, unknown>) =>
    apiFetch<LeaveRow>('/hr/leaves/', { method: 'POST', body: JSON.stringify(body) }),
};

export const attendanceApi = {
  list: (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    const s = q.toString();
    return apiFetch<AttendanceRow[]>(s ? `/hr/attendance/?${s}` : '/hr/attendance/');
  },
  upsert: (body: Record<string, unknown>) =>
    apiFetch<AttendanceRow>('/hr/attendance/', { method: 'POST', body: JSON.stringify(body) }),
  remove: (id: string) => apiFetch<void>(`/hr/attendance/${id}/`, { method: 'DELETE' }),
  importRows: (rows: Record<string, unknown>[], file_name?: string) =>
    apiFetch<{ imported_count: number; errors: string[] }>('/hr/attendance/import/', {
      method: 'POST',
      body: JSON.stringify({ rows, file_name }),
    }),
};

export const commissionsApi = {
  list: (year?: number, month?: number) => {
    const q = new URLSearchParams();
    if (year) q.set('year', String(year));
    if (month) q.set('month', String(month));
    const s = q.toString();
    return apiFetch<CommissionRow[]>(s ? `/hr/commissions/?${s}` : '/hr/commissions/');
  },
  create: (body: Record<string, unknown>) =>
    apiFetch<CommissionRow>('/hr/commissions/', { method: 'POST', body: JSON.stringify(body) }),
  report: (params?: { from?: string; to?: string; branch_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    if (params?.branch_id) q.set('branch_id', params.branch_id);
    const s = q.toString();
    return apiFetch<EmployeeCommissionReport>(s ? `/hr/commissions/report/?${s}` : '/hr/commissions/report/');
  },
};

export type EmployeeCommissionReportRow = {
  employee_id: string;
  employee_code: string;
  full_name: string;
  job_title_name: string;
  department_name: string;
  hr_section_name: string;
  branch_name: string;
  consumer_sales: string;
  purchase_sales: string;
  sales_percent: string;
  net_commission: string;
};

export type EmployeeCommissionReport = {
  rows: EmployeeCommissionReportRow[];
  totals: {
    consumer_sales: string;
    purchase_sales: string;
    net_commission: string;
  };
  employee_count: number;
};

export type PayrollStatementRow = {
  id: string;
  code: string;
  period_year: number;
  period_month: number;
  total_amount: string;
  status: string;
  branch_id: string | null;
  branch_name: string | null;
  created_by_id: string | null;
  created_by_name: string | null;
  created_at: string | null;
};

export const payrollStatementsApi = {
  list: (q?: string) => {
    const params = new URLSearchParams();
    if (q?.trim()) params.set('q', q.trim());
    const s = params.toString();
    return apiFetch<PayrollStatementRow[]>(
      s ? `/hr/payroll/statements/?${s}` : '/hr/payroll/statements/',
    );
  },
  get: (id: string) =>
    apiFetch<PayrollStatementRow & { sheet: { year: number; month: number; rows: PayrollSheetRow[]; totals: Record<string, string> } }>(
      `/hr/payroll/statements/${id}/`,
    ),
  create: (body: { period_year: number; period_month: number; branch_id: string }) =>
    apiFetch<PayrollStatementRow & { sheet: { year: number; month: number; rows: PayrollSheetRow[]; totals: Record<string, string> } }>(
      '/hr/payroll/statements/',
      { method: 'POST', body: JSON.stringify(body) },
    ),
  remove: (id: string) => apiFetch<void>(`/hr/payroll/statements/${id}/`, { method: 'DELETE' }),
};

export const payrollApi = {
  sheet: (year: number, month: number, branchId?: string) => {
    const q = new URLSearchParams({ year: String(year), month: String(month) });
    if (branchId) q.set('branch_id', branchId);
    return apiFetch<{ year: number; month: number; rows: PayrollSheetRow[]; totals: Record<string, string> }>(
      `/hr/payroll/sheet/?${q.toString()}`,
    );
  },
};

export const payrollPaymentsApi = {
  list: (year?: number, month?: number) => {
    const q = new URLSearchParams();
    if (year) q.set('year', String(year));
    if (month) q.set('month', String(month));
    const s = q.toString();
    return apiFetch<PayrollPaymentRow[]>(s ? `/hr/payroll-payments/?${s}` : '/hr/payroll-payments/');
  },
  create: (body: Record<string, unknown>) =>
    apiFetch<PayrollPaymentRow>('/hr/payroll-payments/', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

export const advancesApi = {
  list: () => apiFetch<AdvanceRow[]>('/hr/advances/'),
  create: (body: Record<string, unknown>) =>
    apiFetch<AdvanceRow>('/hr/advances/', { method: 'POST', body: JSON.stringify(body) }),
};
