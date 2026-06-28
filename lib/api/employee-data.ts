import { apiFetch, apiFetchBlob, apiFetchFormData } from '@/lib/api/client';

export type EmployeeAllowanceRow = {
  id: string;
  name: string;
  amount: string;
  is_active: boolean;
};

export type EmployeeIncreaseRow = {
  id: string;
  amount: string;
  effective_date: string;
  notes: string;
};

export type EmployeeDataRow = {
  id: string;
  employee_code: string;
  username: string;
  full_name: string;
  phone: string;
  email: string;
  is_active: boolean;
  is_owner: boolean;
  photo_url?: string;
  has_id_card?: boolean;
  id_card_filename?: string;
  department_id: string | null;
  department_name: string;
  hr_section_id: string | null;
  hr_section_name: string;
  work_shift_id: string | null;
  work_shift_name: string;
  job_title_id: string | null;
  job_title_name: string;
  employee_group_id: string | null;
  employee_group_name: string;
  hire_date: string | null;
  commission_mode: 'none' | 'percent' | 'per_thousand';
  commission_percent: string;
  commission_per_1000: string;
  commission_label: string;
  hire_salary: string;
  basic_salary: string;
  total_increases: string;
  current_salary: string;
  total_allowances: string;
  gross_with_allowances: string;
  notes: string;
  extra_data: Record<string, string | number | boolean>;
  allowances?: EmployeeAllowanceRow[];
  salary_increases?: EmployeeIncreaseRow[];
};

export const employeeDataApi = {
  list: () => apiFetch<EmployeeDataRow[]>('/hr/employee-data/'),
  get: (id: string) => apiFetch<EmployeeDataRow>(`/hr/employee-data/${id}/`),
  update: (id: string, body: Record<string, unknown>) =>
    apiFetch<EmployeeDataRow>(`/hr/employee-data/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  addAllowance: (id: string, body: { name: string; amount: string | number }) =>
    apiFetch<EmployeeAllowanceRow>(`/hr/employee-data/${id}/allowances/`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  removeAllowance: (id: string, allowanceId: string) =>
    apiFetch<void>(`/hr/employee-data/${id}/allowances/${allowanceId}/`, { method: 'DELETE' }),
  addIncrease: (id: string, body: { amount: string | number; effective_date: string; notes?: string }) =>
    apiFetch<EmployeeIncreaseRow>(`/hr/employee-data/${id}/salary-increases/`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  removeIncrease: (id: string, increaseId: string) =>
    apiFetch<void>(`/hr/employee-data/${id}/salary-increases/${increaseId}/`, {
      method: 'DELETE',
    }),
  uploadPhoto: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('photo', file);
    return apiFetchFormData<EmployeeDataRow>(`/hr/employee-data/${id}/photo/`, fd, 'POST');
  },
  uploadIdCard: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('id_card', file);
    return apiFetchFormData<EmployeeDataRow>(`/hr/employee-data/${id}/id-card/`, fd, 'POST');
  },
  downloadIdCard: async (id: string, fallbackName = 'id-card.pdf') => {
    const { blob, filename } = await apiFetchBlob(`/hr/employee-data/${id}/id-card/`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || fallbackName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
