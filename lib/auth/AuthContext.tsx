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
import { getStoredBranchId, setStoredBranchId } from '@/lib/auth/branchStorage';

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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tenant, setTenant] = useState<AuthTenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeBranchId, setActiveBranchIdState] = useState<string | null>(null);
  const sessionLoadingRef = useRef(false);

  const branches = useMemo(() => (user ? resolveBranches(user) : []), [user]);
  const canSwitchAllBranches = user?.can_switch_all_branches ?? false;

  const applyUser = useCallback((next: AuthUser) => {
    const list = resolveBranches(next);
    setUser(next);
    setActiveBranchIdState(resolveInitialBranch(next, list));
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
      setLoading(false);
      return;
    }
    sessionLoadingRef.current = true;
    try {
      const data = await fetchMe();
      setTenant(data.tenant);
      applyUser(data.user);
    } catch {
      clearAuthTokens();
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
      setUser(null);
      setTenant(null);
      setActiveBranchIdState(null);
    };
    const onFocus = () => {
      if (isLoggedIn()) loadSession();
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

  const login = async (tenantSlug: string, username: string, password: string) => {
    const data = await apiLogin(tenantSlug, username, password);
    setTenant(data.tenant);
    applyUser(data.user);
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
    setTenant(null);
    setActiveBranchIdState(null);
    setStoredBranchId(null);
  };

  const refreshUser = useCallback(async () => {
    if (!isLoggedIn()) return;
    const data = await fetchMe();
    setTenant(data.tenant);
    applyUser(data.user);
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
