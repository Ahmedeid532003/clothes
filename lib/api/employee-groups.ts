import { apiFetch } from '@/lib/api/client';

export type EmployeeGroupDto = {
  id: string;
  code: string;
  name: string;
  description: string;
  color: string;
  is_active: boolean;
};

export const employeeGroupsApi = {
  list: () => apiFetch<EmployeeGroupDto[]>('/hr/employee-groups/'),
  create: (body: { name: string; code?: string; description?: string; color?: string }) =>
    apiFetch<EmployeeGroupDto>('/hr/employee-groups/', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: { name: string; description?: string; color?: string }) =>
    apiFetch<EmployeeGroupDto>(`/hr/employee-groups/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  remove: (id: string) => apiFetch<void>(`/hr/employee-groups/${id}/`, { method: 'DELETE' }),
};
