import { apiFetch, setAuthTokens, clearAuthTokens } from './client';
import type { UserPermissions } from './employees';

export type BranchAccessMode = 'single' | 'multiple' | 'all';

export type BranchSummary = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  image_url?: string | null;
};

export type AuthUser = {
  id: string;
  username: string;
  full_name: string;
  email?: string;
  phone?: string;
  avatar_url?: string | null;
  is_owner: boolean;
  permissions: UserPermissions;
  branch_access_mode: BranchAccessMode;
  default_branch: string | null;
  allowed_branch_ids: string[] | null;
  allowed_branches: BranchSummary[];
  can_switch_all_branches: boolean;
};

export type TenantSubscription = {
  status: 'ok' | 'warning' | 'critical' | 'grace' | 'frozen' | 'none';
  show_banner: boolean;
  plan_name: string;
  ends_at: string | null;
  grace_days: number;
  deadline: string | null;
  days_until_end: number | null;
  days_until_deadline: number | null;
  is_frozen: boolean;
  tenant_status: string;
  message_ar: string;
  message_en: string;
};

export type AuthTenant = {
  slug: string;
  name: string;
  modules: string[];
  subscription?: TenantSubscription | null;
};

export type LoginResponse = {
  access: string;
  refresh: string;
  user: AuthUser;
  tenant: AuthTenant;
};

export async function login(
  tenantSlug: string,
  username: string,
  password: string,
): Promise<LoginResponse> {
  const slug = tenantSlug.trim().toLowerCase();
  if (!slug) {
    throw new Error('Store code is required.');
  }
  localStorage.setItem('tenant_slug', slug);
  const data = await apiFetch<LoginResponse>('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({
      username: username.trim().toLowerCase(),
      password,
    }),
    headers: { 'X-Tenant-Slug': slug },
  });
  setAuthTokens(data.access, data.refresh, slug);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch('/auth/logout/', { method: 'POST' });
  } catch {
    /* ignore */
  }
  clearAuthTokens();
}

export async function fetchMe() {
  return apiFetch<{ user: AuthUser; tenant: AuthTenant }>('/auth/me/');
}

export function isLoggedIn(): boolean {
  return Boolean(localStorage.getItem('access_token'));
}

export { clearAuthTokens };
