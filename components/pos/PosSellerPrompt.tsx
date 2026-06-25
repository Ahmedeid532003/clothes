import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UserCircle, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { PosSellerDto } from '@/lib/api/pos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  open: boolean;
  productLabel: string;
  employees: PosSellerDto[];
  busy: boolean;
  error: string | null;
  onConfirm: (code: string) => void;
  onCancel: () => void;
};

export function PosSellerPrompt({
  open,
  productLabel,
  employees,
  busy,
  error,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setCode('');
    const timer = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, [open, productLabel]);

  const suggestions = useMemo(() => {
    const q = code.trim().toLowerCase();
    if (!q) return employees.slice(0, 8);
    return employees
      .filter(
        (e) =>
          e.employee_code.toLowerCase().includes(q) ||
          e.full_name.toLowerCase().includes(q) ||
          (e.username || '').toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [code, employees]);

  if (!open) return null;

  const submit = () => {
    if (!code.trim() || busy) return;
    onConfirm(code.trim());
  };

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/55 p-4">
      <div
        className="w-full max-w-md rounded-2xl border-2 border-amber-400 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4 text-white rounded-t-2xl">
          <div>
            <p className="text-xs font-bold uppercase opacity-90">{t('pos.sellerPromptTitle')}</p>
            <p className="mt-1 text-lg font-black leading-snug">{productLabel}</p>
          </div>
          <button
            type="button"
            className="rounded-lg bg-white/20 p-1.5 hover:bg-white/30"
            onClick={onCancel}
            aria-label={t('inventory.cancel')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-sm text-slate-600">{t('pos.sellerPromptHint')}</p>

          <div>
            <label className="text-xs font-bold text-slate-700">{t('pos.exchangeSellerCode')}</label>
            <Input
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="EMP-001"
              className="mt-1 h-12 text-lg font-mono font-bold"
              autoComplete="off"
              disabled={busy}
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
              {error}
            </p>
          ) : null}

          {suggestions.length > 0 ? (
            <div className="rounded-xl border bg-slate-50 p-2">
              <p className="px-2 pb-1 text-[10px] font-bold uppercase text-slate-500">
                {t('pos.sellerQuickPick')}
              </p>
              <div className="max-h-36 overflow-auto">
                {suggestions.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-start text-sm hover:bg-white"
                    onClick={() => {
                      setCode(e.employee_code);
                      setTimeout(() => onConfirm(e.employee_code), 0);
                    }}
                  >
                    <UserCircle className="h-4 w-4 shrink-0 text-blue-600" />
                    <span className="font-mono text-xs font-black text-blue-700">{e.employee_code}</span>
                    <span className="truncate font-semibold text-slate-800">{e.full_name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 font-bold" onClick={onCancel} disabled={busy}>
              {t('inventory.cancel')}
            </Button>
            <Button
              className="flex-1 bg-emerald-600 font-black hover:bg-emerald-700"
              onClick={submit}
              disabled={busy || !code.trim()}
            >
              {busy ? t('inventory.loading') : t('pos.sellerConfirmAdd')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
