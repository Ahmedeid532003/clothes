import { apiFetch } from './client';
import { cacheKey, cachedGet } from './request-cache';

export type BranchDto = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  image_url: string | null;
  is_sale_outlet?: boolean;
  sale_warehouse_id?: string | null;
  sale_warehouse_name?: string | null;
  is_active: boolean;
};

export async function fetchBranches(): Promise<BranchDto[]> {
  return cachedGet(
    cacheKey('/organization/branches/'),
    () => apiFetch<BranchDto[]>('/organization/branches/'),
    300_000,
  );
}
