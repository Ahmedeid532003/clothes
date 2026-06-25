import { apiFetch } from '@/lib/api/client';

export type JobTitleDto = {
  id: string;
  code: string;
  name: string;
  job_level: string;
  is_active: boolean;
};

export const jobTitlesApi = {
  list: () => apiFetch<JobTitleDto[]>('/hr/job-titles/'),
  create: (body: { name: string; code?: string; job_level?: string }) =>
    apiFetch<JobTitleDto>('/hr/job-titles/', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: { name: string; job_level?: string }) =>
    apiFetch<JobTitleDto>(`/hr/job-titles/${id}/`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (id: string) => apiFetch<void>(`/hr/job-titles/${id}/`, { method: 'DELETE' }),
};
