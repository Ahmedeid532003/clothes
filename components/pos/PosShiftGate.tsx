import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { cashShiftsApi, type PosShiftGate } from '@/lib/api/accounting';
import { fmtMoney } from '@/components/accounting/AccountingUi';
import { Button } from '@/components/ui/button';

export function PosShiftGate() {
  const { t } = useLanguage();
  const [gate, setGate] = useState<PosShiftGate | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setGate(await cashShiftsApi.posGate());
    } catch {
      setGate(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const onRefresh = () => load();
    window.addEventListener('expenses:refresh', onRefresh);
    return () => window.removeEventListener('expenses:refresh', onRefresh);
  }, [load]);

  if (loading || !gate?.required) return null;

  if (gate.open_shift) {
    const s = gate.open_shift;
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2 text-emerald-900">
          <CheckCircle2 className="h-4 w-4" />
          <span className="font-bold">{t('accounting.myOpenShift')}</span>
          <span className="font-mono text-xs">{s.code}</span>
        </div>
        <span className="text-xs text-emerald-800 tabular-nums">
          {t('accounting.expectedBalance')}: {fmtMoney(s.expected_balance)}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-start gap-2 text-amber-950">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm">{t('accounting.posShiftRequired')}</p>
          <p className="text-xs text-amber-800 mt-0.5 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {t('accounting.openShiftNow')}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        className="bg-amber-600 hover:bg-amber-700"
        onClick={() =>
          window.dispatchEvent(new CustomEvent('app:navigate', { detail: 'cash-shifts' }))
        }
      >
        {t('accounting.openShift')}
      </Button>
    </div>
  );
}
