import { apiFetch } from './client';

export type DepartmentDto = {
  id: string;
  code: string;
  name: string;
  manager_name: string;
  operational_budget: string;
  description: string;
  is_active: boolean;
  created_by_name: string;
  created_by_avatar_url: string;
  created_at: string;
  updated_by_name: string;
  updated_by_avatar_url: string;
  updated_at: string;
};

export async function fetchDepartments(): Promise<DepartmentDto[]> {
  return apiFetch<DepartmentDto[]>('/hr/departments/');
}

export type DepartmentPayload = {
  name: string;
  code?: string;
  manager_name?: string;
  operational_budget?: string;
  description?: string;
};

export async function createDepartment(payload: DepartmentPayload): Promise<DepartmentDto> {
  return apiFetch<DepartmentDto>('/hr/departments/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDepartment(id: string, payload: DepartmentPayload): Promise<DepartmentDto> {
  return apiFetch<DepartmentDto>(`/hr/departments/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteDepartment(id: string): Promise<void> {
  await apiFetch<void>(`/hr/departments/${id}/`, { method: 'DELETE' });
}
