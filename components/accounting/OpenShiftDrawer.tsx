import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { cashShiftsApi } from '@/lib/api/accounting';
import { Input } from '@/components/ui/input';
import { ErpSideDrawer } from '@/components/erp/ErpSideDrawer';
import { emitExpensesRefresh } from '@/components/accounting/ExpensesHub';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function OpenShiftDrawer({ open, onOpenChange, onSuccess }: Props) {
  const { t } = useLanguage();
  const { activeBranchId } = useAuth();
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [treasuries, setTreasuries] = useState<{ id: string; label: string }[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState({
    branch: '',
    treasury: '',
    opening_balance: '0',
  });

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    setError(null);
    try {
      const opts = await cashShiftsApi.openOptions();
      const branchRows = opts.branches ?? [];
      const treasuryRows = (opts.treasuries ?? []).map((x) => ({
        id: x.id,
        label: x.label || `${x.code} — ${x.name_ar}`,
      }));
      setBranches(branchRows);
      setTreasuries(treasuryRows);
      setPayload({
        branch: activeBranchId || branchRows[0]?.id || '',
        treasury: treasuryRows[0]?.id || '',
        opening_balance: '0',
      });
      if (opts.block_reason) {
        setError(opts.block_reason);
      } else if (!treasuryRows.length) {
        setError(t('accounting.openShiftNoTreasury'));
      } else if (!branchRows.length) {
        setError(t('accounting.openShiftNoBranch'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('accounting.openShiftLoadFailed'));
    } finally {
      setLoadingOptions(false);
    }
  }, [activeBranchId, t]);

  useEffect(() => {
    if (open) void loadOptions();
  }, [open, loadOptions]);

  const onSave = async () => {
    if (!payload.branch || !payload.treasury) {
      setError(t('accounting.openShiftMissingFields'));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await cashShiftsApi.open(payload);
      onOpenChange(false);
      emitExpensesRefresh();
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const canSave =
    !loadingOptions &&
    !saving &&
    Boolean(payload.branch) &&
    Boolean(payload.treasury);

  return (
    <ErpSideDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={t('accounting.openShift')}
      onSave={() => void onSave()}
      saveLabel={t('accounting.openShift')}
      disabled={!canSave}
    >
      <div className="space-y-4">
        {error ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {error}
          </p>
        ) : null}
        {loadingOptions ? (
          <p className="text-sm text-slate-500">{t('inventory.loading')}</p>
        ) : (
          <>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">{t('accounting.colBranch')}</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={payload.branch}
                onChange={(e) => setPayload({ ...payload, branch: e.target.value })}
                aria-label={t('accounting.colBranch')}
              >
                {branches.length === 0 ? (
                  <option value="">{t('accounting.openShiftNoBranch')}</option>
                ) : null}
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">{t('accounting.treasury')}</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={payload.treasury}
                onChange={(e) => setPayload({ ...payload, treasury: e.target.value })}
                aria-label={t('accounting.treasury')}
              >
                {treasuries.length === 0 ? (
                  <option value="">{t('accounting.openShiftNoTreasury')}</option>
                ) : null}
                {treasuries.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">{t('accounting.openingBalance')}</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={payload.opening_balance}
                onChange={(e) => setPayload({ ...payload, opening_balance: e.target.value })}
              />
              <p className="text-[10px] text-slate-500 mt-1">{t('accounting.openingBalanceHint')}</p>
            </div>
          </>
        )}
      </div>
    </ErpSideDrawer>
  );
}
