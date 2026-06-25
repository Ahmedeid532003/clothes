import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, MinusCircle, PlusCircle, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  approveStockTransfer,
  createStockTransfer,
  fetchStockTransferOptions,
  type StockTransferOptions,
} from '@/lib/api/inventory';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export type PosShortageLine = {
  key: string;
  variant: string;
  label: string;
  quantity: number;
  available: number;
  deficit: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  shortageLines: PosShortageLine[];
  targetBranchId: string;
  onSaved: () => void;
};

const SHEET_SHELL =
  'w-full sm:max-w-[720px] p-0 flex flex-col gap-0 border-s-0 h-full max-h-[100dvh] overflow-hidden [&>button]:hidden';

export function PosStockTransferCanvas({
  open,
  onClose,
  shortageLines,
  targetBranchId,
  onSaved,
}: Props) {
  const { t } = useLanguage();
  const [options, setOptions] = useState<StockTransferOptions | null>(null);
  const [fromBranchId, setFromBranchId] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFromBranchId('');
    setSelectedKeys(new Set(shortageLines.map((l) => l.key)));
    fetchStockTransferOptions().then(setOptions).catch(() => setOptions(null));
  }, [open, shortageLines]);

  const sourceBranches = useMemo(
    () => (options?.branches ?? []).filter((b) => b.id !== targetBranchId),
    [options, targetBranchId],
  );

  const selectedLines = useMemo(
    () => shortageLines.filter((l) => selectedKeys.has(l.key)),
    [shortageLines, selectedKeys],
  );

  const selectedDeficit = useMemo(
    () => selectedLines.reduce((s, l) => s + l.deficit, 0),
    [selectedLines],
  );

  const toggleLine = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = useCallback(async () => {
    if (!fromBranchId) {
      setError(t('pos.transferPickBranch'));
      return;
    }
    if (selectedLines.length === 0) {
      setError(t('pos.transferNoLines'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        transfer_type: 'branch_branch',
        from_branch: fromBranchId,
        to_branch: targetBranchId,
        notes: t('pos.transferFromPosNote'),
        requires_approval: options?.transfer_requires_approval ?? true,
        lines: selectedLines.map((l) => ({
          variant: l.variant,
          quantity: String(l.deficit),
        })),
      };
      if (options?.can_approve && !options.transfer_requires_approval) {
        payload.approve = true;
      } else if (options?.can_approve) {
        payload.approve = true;
      } else {
        payload.submit = true;
      }
      const created = await createStockTransfer(payload);
      if (created.status === 'pending' && options?.can_approve) {
        await approveStockTransfer(created.id);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('inventory.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [fromBranchId, onClose, onSaved, options, selectedLines, t, targetBranchId]);

  const cell = 'border border-slate-400 px-3 py-2 text-sm font-bold bg-white';
  const label = `${cell} text-slate-800`;
  const value = `${cell} text-end font-black tabular-nums`;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className={SHEET_SHELL}>
        <div className="flex items-center justify-between bg-emerald-700 px-4 py-3.5 text-white shrink-0">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-base font-black">{t('pos.stockTransferTitle')}</h2>
          <ArrowLeftRight className="h-5 w-5 opacity-80" />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 bg-white">
          <p className="text-sm font-bold text-slate-700 leading-relaxed">{t('pos.stockTransferHint')}</p>
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 leading-relaxed">
            {t('pos.transferMultiBranchHint')}
          </p>

          <div>
            <label className="block text-sm font-black text-slate-800 mb-1.5">{t('pos.transferFromBranch')}</label>
            <select
              className="w-full h-11 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 text-sm font-bold"
              value={fromBranchId}
              onChange={(e) => setFromBranchId(e.target.value)}
            >
              <option value="">{t('pos.transferPickBranch')}</option>
              {sourceBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name_ar}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto rounded-xl border-2 border-slate-200">
            <table className="w-full min-w-[480px] border-collapse text-sm" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
              <thead>
                <tr className="bg-slate-100">
                  <th className={cell}>#</th>
                  <th className={cell}>{t('pos.colName')}</th>
                  <th className={cell}>{t('pos.colQty')}</th>
                  <th className={cell}>{t('pos.avlQty')}</th>
                  <th className={cell}>{t('pos.transferDeficit')}</th>
                  <th className={cell}>{t('pos.transferExcludeCol')}</th>
                </tr>
              </thead>
              <tbody>
                {shortageLines.map((line, idx) => {
                  const on = selectedKeys.has(line.key);
                  return (
                    <tr key={line.key} className={on ? '' : 'opacity-50 bg-slate-50'}>
                      <td className={label}>{idx + 1}</td>
                      <td className={label}>{line.label}</td>
                      <td className={value}>{line.quantity}</td>
                      <td className={value}>{line.available}</td>
                      <td className={`${value} text-red-700`}>{line.deficit}</td>
                      <td className={cell}>
                        <button
                          type="button"
                          className={`mx-auto flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-black ${
                            on
                              ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                              : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          }`}
                          title={on ? t('pos.transferExcludeLine') : t('pos.transferIncludeLine')}
                          onClick={() => toggleLine(line.key)}
                        >
                          {on ? (
                            <>
                              <MinusCircle className="h-3.5 w-3.5" />
                              {t('pos.transferExcludeShort')}
                            </>
                          ) : (
                            <>
                              <PlusCircle className="h-3.5 w-3.5" />
                              {t('pos.transferIncludeShort')}
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-center text-xs font-bold text-slate-600">
            {t('pos.transferSelectedSummary', {
              count: String(selectedLines.length),
              deficit: String(selectedDeficit),
            })}
          </p>

          {error ? (
            <p className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 text-center">
              {error}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 border-t bg-slate-50 px-4 py-4 flex gap-2">
          <Button
            className="h-11 flex-1 bg-emerald-600 font-black hover:bg-emerald-700"
            disabled={saving || selectedLines.length === 0}
            onClick={() => void handleSave()}
          >
            {saving ? t('inventory.loading') : t('pos.stockTransferSave')}
          </Button>
          <Button variant="outline" className="h-11 font-bold" onClick={onClose} disabled={saving}>
            {t('inventory.cancel')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
