import React, { useState } from 'react';
import { Lock, Store } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const STORAGE_KEY = 'mahaly_deploy_key';
const COOKIE_NAME = 'mahaly_deploy_key';
const ENV_CODE = import.meta.env.VITE_DEPLOY_ACCESS_CODE as string | undefined;

function setDeployCookie(code: string) {
  const maxAge = 60 * 60 * 12;
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(code)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function clearDeployCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

export function getDeployAccessKey(): string | null {
  if (!ENV_CODE?.trim()) return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

export function setDeployAccessKey(code: string) {
  sessionStorage.setItem(STORAGE_KEY, code);
  setDeployCookie(code);
}

export function clearDeployAccessKey() {
  sessionStorage.removeItem(STORAGE_KEY);
  clearDeployCookie();
}

export function isDeployGateRequired(): boolean {
  return Boolean(ENV_CODE?.trim());
}

export function DeployGate({ children }: { children: React.ReactNode }) {
  const { t, isRtl } = useLanguage();
  const required = isDeployGateRequired();
  const [unlocked, setUnlocked] = useState(() => {
    if (!required) return true;
    return getDeployAccessKey() === ENV_CODE;
  });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  if (!required || unlocked) {
    return <>{children}</>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed !== ENV_CODE) {
      setError(isRtl ? 'كلمة الدخول غير صحيحة' : 'Invalid access code');
      return;
    }
    const apiBase =
      (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
      'http://127.0.0.1:8000/api/v1';
    try {
      const res = await fetch(`${apiBase}/deploy/unlock/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: trimmed }),
      });
      if (!res.ok) {
        setError(isRtl ? 'كلمة الدخول غير صحيحة' : 'Invalid access code');
        return;
      }
      setDeployAccessKey(trimmed);
      setError('');
      setUnlocked(true);
    } catch {
      setError(isRtl ? 'تعذر الاتصال بالخادم' : 'Could not reach server');
    }
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4"
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-900/90 p-8 shadow-2xl"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600">
          <Store className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-center text-xl font-bold text-white">Ma7alyERP</h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          {isRtl
            ? 'أدخل كلمة دخول النظام على هذا السيرفر'
            : 'Enter server access code'}
        </p>
        <div className="mt-6">
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            {isRtl ? 'كلمة الدخول' : 'Access code'}
          </label>
          <div className="relative">
            <Lock className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 ltr:left-3 rtl:right-3" />
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 py-2.5 text-white outline-none focus:border-blue-500 ltr:pl-10 ltr:pr-3 rtl:pl-3 rtl:pr-10"
              autoComplete="off"
              autoFocus
            />
          </div>
          {error ? (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          ) : null}
        </div>
        <button
          type="submit"
          className="mt-6 w-full rounded-lg bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-500"
        >
          {isRtl ? 'دخول' : 'Enter'}
        </button>
        <p className="mt-4 text-center text-xs text-slate-500">{t('copyright')}</p>
      </form>
    </div>
  );
}
