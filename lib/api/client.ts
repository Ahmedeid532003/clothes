import {
  ApiRequestError,
  emitTenantFrozen,
} from './errors';
import { getDeployAccessKey } from '@/lib/deploy-gate';
import {
  applyDefaultDatesToFormData,
  applyDefaultDatesToPayload,
} from '@/lib/dates';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1';

function applyDeployGateHeader(headers: Headers) {
  const key = getDeployAccessKey();
  if (key) headers.set('X-Mahaly-Deploy-Key', key);
}

export type ApiError = { detail: string | unknown; code?: string };

function flattenApiErrorDetail(detail: unknown): string {
  if (detail == null) return '';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map(flattenApiErrorDetail).filter(Boolean).join(' — ');
  }
  if (typeof detail === 'object') {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(detail as Record<string, unknown>)) {
      const flat = flattenApiErrorDetail(value);
      if (!flat) continue;
      parts.push(key === 'detail' || key === 'non_field_errors' ? flat : `${key}: ${flat}`);
    }
    return parts.join(' — ');
  }
  return String(detail);
}

function getStored() {
  return {
    access: localStorage.getItem('access_token'),
    refresh: localStorage.getItem('refresh_token'),
    tenant: localStorage.getItem('tenant_slug') ?? 'demo',
  };
}

export function setAuthTokens(access: string, refresh: string, tenantSlug: string) {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
  localStorage.setItem('tenant_slug', tenantSlug);
}

export function clearAuthTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

function normalizeWriteOptions(options: RequestInit): RequestInit {
  const method = (options.method || 'GET').toUpperCase();
  if (!['POST', 'PUT', 'PATCH'].includes(method) || !options.body) {
    return options;
  }
  if (typeof options.body === 'string') {
    try {
      const parsed = JSON.parse(options.body);
      return {
        ...options,
        body: JSON.stringify(applyDefaultDatesToPayload(parsed)),
      };
    } catch {
      return options;
    }
  }
  return options;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const normalized = normalizeWriteOptions(options);
  const { access, tenant } = getStored();
  const headers = new Headers(normalized.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('X-Tenant-Slug', tenant);
  applyDeployGateHeader(headers);
  if (access) headers.set('Authorization', `Bearer ${access}`);
  const branchId = localStorage.getItem('active_branch_id');
  if (branchId) headers.set('X-Branch-Id', branchId);

  const res = await fetch(`${API_BASE}${path}`, {
    ...normalized,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && path !== '/auth/login/') {
    const refreshed = await tryRefresh();
    if (refreshed) return apiFetch(path, options);
    clearAuthTokens();
    window.dispatchEvent(new Event('auth:logout'));
  }

  const data = (await res.json().catch(() => ({}))) as ApiError;
  if (!res.ok) {
    const detail = flattenApiErrorDetail(data.detail ?? data);
    const code = typeof data.code === 'string' ? data.code : undefined;
    if (res.status === 403 && code === 'tenant_frozen') {
      emitTenantFrozen(detail);
    }
    throw new ApiRequestError(detail || res.statusText, res.status, code);
  }
  return data as T;
}

export async function apiFetchFormData<T>(
  path: string,
  formData: FormData,
  method: 'PATCH' | 'POST' = 'PATCH',
): Promise<T> {
  const body = applyDefaultDatesToFormData(formData);
  const { access, tenant } = getStored();
  const headers = new Headers();
  headers.set('X-Tenant-Slug', tenant);
  applyDeployGateHeader(headers);
  if (access) headers.set('Authorization', `Bearer ${access}`);
  const branchId = localStorage.getItem('active_branch_id');
  if (branchId) headers.set('X-Branch-Id', branchId);

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body,
    credentials: 'include',
  });

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) return apiFetchFormData(path, formData, method);
    clearAuthTokens();
    window.dispatchEvent(new Event('auth:logout'));
  }

  const data = (await res.json().catch(() => ({}))) as ApiError;
  if (!res.ok) {
    const detail = flattenApiErrorDetail(data.detail ?? data);
    const code = typeof data.code === 'string' ? data.code : undefined;
    if (res.status === 403 && code === 'tenant_frozen') {
      emitTenantFrozen(detail);
    }
    throw new ApiRequestError(detail || res.statusText, res.status, code);
  }
  return data as T;
}

export async function apiFetchBlob(path: string): Promise<{ blob: Blob; filename: string }> {
  const { access, tenant } = getStored();
  const headers = new Headers();
  headers.set('X-Tenant-Slug', tenant);
  applyDeployGateHeader(headers);
  if (access) headers.set('Authorization', `Bearer ${access}`);
  const branchId = localStorage.getItem('active_branch_id');
  if (branchId) headers.set('X-Branch-Id', branchId);

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) return apiFetchBlob(path);
    clearAuthTokens();
    window.dispatchEvent(new Event('auth:logout'));
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as ApiError;
    const detail = flattenApiErrorDetail(data.detail ?? data);
    throw new ApiRequestError(detail || res.statusText, res.status);
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = /filename\*?=(?:UTF-8''|"?)([^";]+)/i.exec(disposition);
  const filename = match ? decodeURIComponent(match[1].replace(/"/g, '')) : 'download';
  return { blob, filename };
}

async function tryRefresh(): Promise<boolean> {
  const { refresh, tenant } = getStored();
  if (!refresh) return false;
  try {
    const refreshHeaders = new Headers({
      'Content-Type': 'application/json',
      'X-Tenant-Slug': tenant,
    });
    applyDeployGateHeader(refreshHeaders);
    const res = await fetch(`${API_BASE}/auth/refresh/`, {
      method: 'POST',
      headers: refreshHeaders,
      body: JSON.stringify({ refresh }),
      credentials: 'include',
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem('access_token', data.access);
    if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
    return true;
  } catch {
    return false;
  }
}
