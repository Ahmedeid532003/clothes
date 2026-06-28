import { apiFetch } from './client';
import type { BranchAccessMode } from './auth';

export type UserPermissions = {
  pages: Record<string, boolean>;
  features: Record<string, Record<string, boolean>>;
  actions: Record<string, { view: boolean; update: boolean; delete: boolean }>;
};

export type EmployeeDto = {
  id: string;
  employee_code: string;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  department: string | null;
  department_name: string;
  department_code: string;
  hr_section: string | null;
  hr_section_name: string;
  hr_section_code: string;
  work_shift: string | null;
  work_shift_name: string;
  work_shift_code: string;
  hire_date: string | null;
  uses_system: boolean;
  is_active: boolean;
  is_owner: boolean;
  permissions: UserPermissions;
  branch_access_mode: BranchAccessMode;
  default_branch: string | null;
  allowed_branch_ids: string[] | null;
  created_by_name: string;
  created_at: string;
  updated_by_name: string;
  updated_at: string;
};

export type EmployeeLimitsDto = {
  current_users: number;
  max_users: number;
  can_add: boolean;
  plan_name: string;
};

export type PermissionsSchemaDto = {
  pages: { key: string; label_en: string; label_ar: string }[];
  features: Record<string, { key: string; label_en: string; label_ar: string }[]>;
  actions: string[];
};

export async function fetchEmployees(): Promise<EmployeeDto[]> {
  return apiFetch<EmployeeDto[]>('/hr/employees/');
}

export async function fetchEmployeeLimits(): Promise<EmployeeLimitsDto> {
  return apiFetch<EmployeeLimitsDto>('/hr/employees/limits/');
}

export async function fetchPermissionsSchema(): Promise<PermissionsSchemaDto> {
  return apiFetch<PermissionsSchemaDto>('/hr/permissions-schema/');
}

export type EmployeeRegistrationMetaDto = {
  departments: Array<{ id: string; code: string; name: string }>;
  work_shifts: Array<{ id: string; code: string; name: string }>;
  job_titles: Array<{ id: string; code: string; name: string }>;
  employee_groups: Array<{ id: string; code: string; name: string }>;
  branches: Array<{ id: string; name_ar: string; name_en: string; is_active: boolean }>;
  permissions_schema: PermissionsSchemaDto;
  limits: EmployeeLimitsDto;
};

export async function fetchEmployeeRegistrationMeta(): Promise<EmployeeRegistrationMetaDto> {
  return apiFetch<EmployeeRegistrationMetaDto>('/hr/employee-registration-meta/');
}

export type CreateEmployeePayload = {
  username?: string;
  password?: string;
  uses_system?: boolean;
  hire_date?: string | null;
  full_name?: string;
  email?: string;
  phone?: string;
  employee_code?: string;
  department_id?: string | null;
  hr_section_id?: string | null;
  work_shift_id?: string | null;
  permissions?: UserPermissions;
  grant_all_permissions?: boolean;
  branch_access_mode?: BranchAccessMode;
  default_branch_id?: string | null;
  allowed_branch_ids?: string[];
};

export type UpdateEmployeePayload = Partial<Omit<CreateEmployeePayload, 'username'>> & {
  is_active?: boolean;
};

export async function createEmployee(payload: CreateEmployeePayload): Promise<EmployeeDto> {
  return apiFetch<EmployeeDto>('/hr/employees/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateEmployee(id: string, payload: UpdateEmployeePayload): Promise<EmployeeDto> {
  return apiFetch<EmployeeDto>(`/hr/employees/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deactivateEmployee(id: string): Promise<void> {
  await apiFetch<void>(`/hr/employees/${id}/`, { method: 'DELETE' });
}

export function emptyPermissions(): UserPermissions {
  return {
    pages: {},
    features: {},
    actions: {},
  };
}
