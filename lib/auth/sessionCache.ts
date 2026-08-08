import type { AuthTenant, AuthUser } from '@/lib/api/auth';

const AUTH_SESSION_KEY = 'mahaly_auth_session_v1';

type AuthSessionSnapshot = {
  user: AuthUser;
  tenant: AuthTenant;
};

export function readAuthSessionCache(): AuthSessionSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSessionSnapshot;
  } catch {
    return null;
  }
}

export function writeAuthSessionCache(user: AuthUser, tenant: AuthTenant) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ user, tenant }));
  } catch {
    /* ignore */
  }
}

export function clearAuthSessionCache() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(AUTH_SESSION_KEY);
}
