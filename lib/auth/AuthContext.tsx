import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearAuthTokens,
  fetchMe,
  isLoggedIn,
  login as apiLogin,
  logout as apiLogout,
  type AuthTenant,
  type AuthUser,
  type BranchSummary,
} from '@/lib/api/auth';
import { invalidateApiCache } from '@/lib/api/request-cache';
import { warmInventoryCache } from '@/lib/api/inventory-prefetch';
import { getStoredBranchId, setStoredBranchId } from '@/lib/auth/branchStorage';
import {
  clearAuthSessionCache,
  readAuthSessionCache,
  writeAuthSessionCache,
} from '@/lib/auth/sessionCache';

type AuthContextValue = {
  user: AuthUser | null;
  tenant: AuthTenant | null;
  loading: boolean;
  branches: BranchSummary[];
  activeBranchId: string | null;
  setActiveBranchId: (id: string | null) => void;
  canSwitchAllBranches: boolean;
  login: (tenantSlug: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function resolveBranches(user: AuthUser): BranchSummary[] {
  if (user.allowed_branches?.length) return user.allowed_branches;
  return [];
}

function resolveInitialBranch(user: AuthUser, branches: BranchSummary[]): string | null {
  const stored = getStoredBranchId();
  if (stored && branches.some((b) => b.id === stored)) return stored;
  if (user.default_branch && branches.some((b) => b.id === user.default_branch)) {
    return user.default_branch;
  }
  return branches[0]?.id ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const boot = typeof window !== 'undefined' ? readAuthSessionCache() : null;
  const [user, setUser] = useState<AuthUser | null>(() => boot?.user ?? null);
  const [tenant, setTenant] = useState<AuthTenant | null>(() => boot?.tenant ?? null);
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (!isLoggedIn()) return false;
    return !boot;
  });
  const [activeBranchId, setActiveBranchIdState] = useState<string | null>(null);
  const sessionLoadingRef = useRef(false);

  const branches = useMemo(() => (user ? resolveBranches(user) : []), [user]);
  const canSwitchAllBranches = user?.can_switch_all_branches ?? false;

  const applyUser = useCallback((next: AuthUser, nextTenant?: AuthTenant | null) => {
    const list = resolveBranches(next);
    const branchId = resolveInitialBranch(next, list);
    setUser(next);
    setActiveBranchIdState(branchId);
    setStoredBranchId(branchId);
    if (nextTenant) {
      setTenant(nextTenant);
      writeAuthSessionCache(next, nextTenant);
    }
  }, []);

  const setActiveBranchId = useCallback(
    (id: string | null) => {
      if (id === null && !canSwitchAllBranches) return;
      if (id && !branches.some((b) => b.id === id)) return;
      setActiveBranchIdState(id);
      setStoredBranchId(id);
    },
    [branches, canSwitchAllBranches],
  );

  const loadSession = useCallback(async () => {
    if (sessionLoadingRef.current) return;
    if (!isLoggedIn()) {
      setUser(null);
      setTenant(null);
      setActiveBranchIdState(null);
      clearAuthSessionCache();
      setLoading(false);
      return;
    }
    sessionLoadingRef.current = true;
    try {
      const data = await fetchMe();
      setTenant(data.tenant);
      applyUser(data.user, data.tenant);
      warmInventoryCache();
    } catch {
      clearAuthTokens();
      clearAuthSessionCache();
      setUser(null);
      setTenant(null);
      setActiveBranchIdState(null);
    } finally {
      sessionLoadingRef.current = false;
      setLoading(false);
    }
  }, [applyUser]);

  useEffect(() => {
    loadSession();
    const onLogout = () => {
      clearAuthSessionCache();
      setUser(null);
      setTenant(null);
      setActiveBranchIdState(null);
    };
    const onFocus = () => {
      if (!isLoggedIn()) return;
      if (sessionLoadingRef.current) return;
      void loadSession();
    };
    window.addEventListener('auth:logout', onLogout);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('auth:logout', onLogout);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadSession]);

  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => {
      loadSession();
    }, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [user, loadSession]);

  useEffect(() => {
    if (!user || loading) return;
    warmInventoryCache();
  }, [user, loading]);

  const login = async (tenantSlug: string, username: string, password: string) => {
    invalidateApiCache();
    clearAuthSessionCache();
    const data = await apiLogin(tenantSlug, username, password);
    setTenant(data.tenant);
    applyUser(data.user, data.tenant);
    setLoading(false);
    warmInventoryCache();
  };

  const logout = async () => {
    await apiLogout();
    invalidateApiCache();
    clearAuthSessionCache();
    setUser(null);
    setTenant(null);
    setActiveBranchIdState(null);
    setStoredBranchId(null);
  };

  const refreshUser = useCallback(async () => {
    if (!isLoggedIn()) return;
    const data = await fetchMe();
    setTenant(data.tenant);
    applyUser(data.user, data.tenant);
  }, [applyUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        loading,
        branches,
        activeBranchId,
        setActiveBranchId,
        canSwitchAllBranches,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
