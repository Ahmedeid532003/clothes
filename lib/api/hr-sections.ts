import { apiFetch } from '@/lib/api/client';

export type HrSectionDto = {
  id: string;
  department_id: string;
  department_code: string;
  department_name: string;
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function fetchHrSections(departmentId?: string) {
  const q = departmentId ? `?department=${departmentId}` : '';
  return apiFetch<HrSectionDto[]>(`/hr/sections${q}`);
}

export function createHrSection(body: {
  department_id: string;
  name: string;
  code?: string;
}) {
  return apiFetch<HrSectionDto>('/hr/sections/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateHrSection(id: string, body: { name: string }) {
  return apiFetch<HrSectionDto>(`/hr/sections/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteHrSection(id: string) {
  return apiFetch<void>(`/hr/sections/${id}/`, { method: 'DELETE' });
}
