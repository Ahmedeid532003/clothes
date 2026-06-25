import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Check, Send } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  approveStockTransfer,
  createStockTransfer,
  fetchStockBalances,
  fetchStockTransferOptions,
  fetchStockTransfers,
  submitStockTransfer,
  type StockBalanceDto,
  type StockTransferDto,
  type StockTransferOptions,
} from '@/lib/api/inventory';
import { ApiRequestError } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { LoadFromOrderButton } from '@/components/orders/LoadFromOrderButton';
import { scanOrdersApi, type ScanOrderDto } from '@/lib/api/scanOrders';

type LineForm = { variant: string; quantity: string; label: string };
type TransferType = 'warehouse_warehouse' | 'warehouse_branch' | 'branch_branch';

export function StockTransfersPage() {
  const { t } = useLanguage();
  const { activeBranchId } = useAuth();
  const [rows, setRows] = useState<StockTransferDto[]>([]);
  const [options, setOptions] = useState<StockTransferOptions | null>(null);
  const [balances, setBalances] = useState<StockBalanceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    transfer_type: 'warehouse_warehouse' as TransferType,
    from_warehouse: '',
    to_warehouse: '',
    from_branch: '',
    to_branch: '',
    notes: '',
    requires_approval: true,
    lineVariant: '',
    lineQty: '1',
  });
  const [lines, setLines] = useState<LineForm[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadedOrderId, setLoadedOrderId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tr, opt] = await Promise.all([fetchStockTransfers(), fetchStockTransferOptions()]);
      setRows(tr);
      setOptions(opt);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const storageWarehouses = useMemo(
    () => options?.warehouses.filter((w) => !w.is_branch_sale) ?? [],
    [options],
  );

  const sourceWarehouseId = useMemo(() => {
    if (form.transfer_type === 'branch_branch' && form.from_branch) {
      return options?.branches.find((b) => b.id === form.from_branch)?.sale_warehouse_id ?? '';
    }
    return form.from_warehouse;
  }, [form.transfer_type, form.from_branch, form.from_warehouse, options]);

  useEffect(() => {
    if (!sourceWarehouseId) {
      setBalances([]);
      return;
    }
    fetchStockBalances(sourceWarehouseId).then(setBalances);
  }, [sourceWarehouseId]);

  const transferTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      warehouse_warehouse: t('inventory.transferWarehouseWarehouse'),
      warehouse_branch: t('inventory.transferWarehouseBranch'),
      branch_branch: t('inventory.transferBranchBranch'),
    };
    return map[type] ?? type;
  };

  const routeLabel = (r: StockTransferDto) => {
    if (r.transfer_type === 'branch_branch') {
      return `${r.from_branch_name || r.from_warehouse_name} → ${r.to_branch_name || r.to_warehouse_name}`;
    }
    if (r.transfer_type === 'warehouse_branch') {
      return `${r.from_warehouse_name} → ${r.to_branch_name || r.to_warehouse_name}`;
    }
    return `${r.from_warehouse_name} → ${r.to_warehouse_name}`;
  };

  const pickOtherWarehouse = (fromId: string, list: { id: string }[]) => {
    const other = list.find((w) => w.id !== fromId);
    return other?.id ?? fromId;
  };

  const openNew = () => {
    const opt = options;
    const storage = opt?.warehouses.filter((w) => !w.is_branch_sale) ?? [];
    const allWh = opt?.warehouses ?? [];
    const branches = opt?.branches ?? [];
    const fromWh = storage[0]?.id ?? allWh[0]?.id ?? '';
    setForm({
      transfer_type: 'warehouse_warehouse',
      from_warehouse: fromWh,
      to_warehouse: pickOtherWarehouse(fromWh, allWh.length ? allWh : storage),
      from_branch: branches[0]?.id ?? '',
      to_branch:
        (activeBranchId && branches.find((b) => b.id !== branches[0]?.id)?.id) ||
        branches[1]?.id ||
        branches[0]?.id ||
        '',
      notes: '',
      requires_approval: opt?.transfer_requires_approval ?? true,
      lineVariant: '',
      lineQty: '1',
    });
    setLines([]);
    setFormError(null);
    setLoadedOrderId(null);
    setOpen(true);
  };

  const loadFromScanOrder = (order: ScanOrderDto) => {
    const newLines = (order.lines ?? []).map((ln) => ({
      variant: ln.variant_id,
      quantity: ln.quantity,
      label: `${ln.product_name} — ${ln.size_name} / ${ln.color_name}`,
    }));
    setLines((prev) => [...prev, ...newLines]);
    setLoadedOrderId(order.id);
  };

  const addLine = () => {
    const bal = balances.find((b) => b.variant === form.lineVariant);
    if (!bal) return;
    setLines([
      ...lines,
      {
        variant: bal.variant,
        quantity: form.lineQty,
        label: `${bal.product_name} — ${bal.size_name} / ${bal.color_name}`,
      },
    ]);
    setForm({ ...form, lineVariant: '', lineQty: '1' });
  };

  const validateForm = (): string | null => {
    if (lines.length === 0) return t('inventory.transferNeedLines');
    if (form.transfer_type === 'warehouse_warehouse') {
      if (!form.from_warehouse || !form.to_warehouse) return t('inventory.transferNeedWarehouses');
      if (form.from_warehouse === form.to_warehouse) return t('inventory.transferSameRoute');
    }
    if (form.transfer_type === 'warehouse_branch') {
      if (!form.from_warehouse || !form.to_branch) return t('inventory.transferNeedWarehouseBranch');
    }
    if (form.transfer_type === 'branch_branch') {
      if (!form.from_branch || !form.to_branch) return t('inventory.transferNeedBranches');
      if (form.from_branch === form.to_branch) return t('inventory.transferSameRoute');
    }
    return null;
  };

  const buildPayload = () => {
    const base: Record<string, unknown> = {
      transfer_type: form.transfer_type,
      notes: form.notes,
      requires_approval: form.requires_approval,
      lines: lines.map((l) => ({ variant: l.variant, quantity: l.quantity })),
    };
    if (form.transfer_type === 'warehouse_warehouse') {
      base.from_warehouse = form.from_warehouse;
      base.to_warehouse = form.to_warehouse;
    } else if (form.transfer_type === 'warehouse_branch') {
      base.from_warehouse = form.from_warehouse;
      base.to_branch = form.to_branch;
    } else {
      base.from_branch = form.from_branch;
      base.to_branch = form.to_branch;
    }
    return base;
  };

  const onSave = async (action: 'draft' | 'submit' | 'approve') => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = buildPayload();
      if (action === 'submit') payload.submit = true;
      if (action === 'approve') payload.approve = true;
      await createStockTransfer(payload);
      if (loadedOrderId) {
        try {
          await scanOrdersApi.markLoaded(loadedOrderId, 'stock-transfer');
        } catch {
          /* non-blocking */
        }
      }
      setOpen(false);
      setLines([]);
      setLoadedOrderId(null);
      load();
    } catch (e) {
      const msg =
        e instanceof ApiRequestError
          ? e.message
          : e instanceof Error
            ? e.message
            : t('inventory.saveFailed');
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      draft: t('inventory.statusDraft'),
      pending: t('inventory.statusPending'),
      approved: t('inventory.statusApproved'),
      cancelled: t('inventory.statusCancelled'),
    };
    return map[s] ?? s;
  };

  const canApprove = options?.can_approve ?? false;

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('nav.stockTransfers')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={openNew} disabled={!options}>
            <Plus className="h-4 w-4 me-1" />
            {t('inventory.add')}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-start">{t('inventory.code')}</th>
              <th className="px-3 py-2 text-start">{t('inventory.transferType')}</th>
              <th className="px-3 py-2 text-start">{t('inventory.fromWarehouse')}</th>
              <th className="px-3 py-2 text-start">{t('inventory.status')}</th>
              <th className="px-3 py-2 text-end">{t('inventory.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-6 text-center">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                  <td className="px-3 py-2 text-xs">{transferTypeLabel(r.transfer_type)}</td>
                  <td className="px-3 py-2">{routeLabel(r)}</td>
                  <td className="px-3 py-2">
                    {statusLabel(r.status)}
                    {r.requires_approval && r.status === 'pending' && (
                      <span className="block text-[10px] text-amber-600">
                        {t('inventory.requiresApproval')}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-end space-x-1">
                    {r.status === 'draft' && r.requires_approval && (
                      <Button
                        size="sm"
                        variant="outline"
                        title={t('inventory.submitForApproval')}
                        onClick={() => submitStockTransfer(r.id).then(load)}
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    )}
                    {(r.status === 'draft' || r.status === 'pending') && canApprove && (
                      <Button
                        size="sm"
                        title={t('inventory.saveAndApprove')}
                        onClick={() => approveStockTransfer(r.id).then(load)}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('inventory.add')}</SheetTitle>
            <LoadFromOrderButton onLoaded={loadFromScanOrder} expectedType="transfer" className="mt-2" />
          </SheetHeader>
          <div className="space-y-3 py-4">
            {formError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
            )}
            <div>
              <p className="text-xs font-medium text-slate-600 mb-1">{t('inventory.transferType')}</p>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={form.transfer_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    transfer_type: e.target.value as TransferType,
                    to_branch: activeBranchId || form.to_branch,
                  })
                }
              >
                <option value="warehouse_warehouse">{t('inventory.transferWarehouseWarehouse')}</option>
                <option value="warehouse_branch">{t('inventory.transferWarehouseBranch')}</option>
                <option value="branch_branch">{t('inventory.transferBranchBranch')}</option>
              </select>
            </div>

            {form.transfer_type === 'warehouse_warehouse' && (
              <>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={form.from_warehouse}
                  onChange={(e) => setForm({ ...form, from_warehouse: e.target.value })}
                >
                  {options?.warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name_ar} ({t('inventory.fromWarehouse')})
                    </option>
                  ))}
                </select>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={form.to_warehouse}
                  onChange={(e) => setForm({ ...form, to_warehouse: e.target.value })}
                >
                  {options?.warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name_ar} ({t('inventory.toWarehouse')})
                    </option>
                  ))}
                </select>
              </>
            )}

            {form.transfer_type === 'warehouse_branch' && (
              <>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={form.from_warehouse}
                  onChange={(e) => setForm({ ...form, from_warehouse: e.target.value })}
                >
                  {storageWarehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name_ar} ({t('inventory.fromWarehouse')})
                    </option>
                  ))}
                </select>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={form.to_branch}
                  onChange={(e) => setForm({ ...form, to_branch: e.target.value })}
                >
                  {options?.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name_ar} — {b.sale_warehouse_name}
                    </option>
                  ))}
                </select>
              </>
            )}

            {form.transfer_type === 'branch_branch' && (
              <>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={form.from_branch}
                  onChange={(e) => setForm({ ...form, from_branch: e.target.value })}
                >
                  {options?.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name_ar} ({t('inventory.fromBranch')})
                    </option>
                  ))}
                </select>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={form.to_branch}
                  onChange={(e) => setForm({ ...form, to_branch: e.target.value })}
                >
                  {options?.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name_ar} ({t('inventory.toBranch')})
                    </option>
                  ))}
                </select>
              </>
            )}

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.requires_approval}
                onChange={(e) => setForm({ ...form, requires_approval: e.target.checked })}
              />
              <span>
                <span className="font-medium">{t('inventory.requiresApproval')}</span>
                <span className="block text-xs text-slate-500">
                  {t('inventory.transferRequiresApprovalHint')}
                </span>
              </span>
            </label>

            <Input
              placeholder={t('inventory.notes')}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            <div className="flex gap-2">
              <select
                className="flex-1 rounded-md border px-2 py-2 text-sm"
                value={form.lineVariant}
                onChange={(e) => setForm({ ...form, lineVariant: e.target.value })}
              >
                <option value="">{t('inventory.selectVariant')}</option>
                {balances.map((b) => (
                  <option key={b.variant} value={b.variant}>
                    {b.product_name} — {b.size_name}/{b.color_name} ({b.quantity})
                  </option>
                ))}
              </select>
              <Input
                className="w-20"
                value={form.lineQty}
                onChange={(e) => setForm({ ...form, lineQty: e.target.value })}
              />
              <Button type="button" variant="secondary" onClick={addLine}>
                +
              </Button>
            </div>
            {lines.length === 0 && (
              <p className="text-xs text-amber-700">{t('inventory.transferAddLineHint')}</p>
            )}
            <ul className="text-sm text-slate-600 space-y-1">
              {lines.map((l, i) => (
                <li key={i}>
                  {l.label} × {l.quantity}
                </li>
              ))}
            </ul>
          </div>
          <SheetFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="button"
              disabled={saving}
              onClick={() => onSave('draft')}
            >
              {saving ? t('inventory.saving') : t('inventory.saveDraft')}
            </Button>
            {form.requires_approval && (
              <Button
                type="button"
                disabled={saving}
                variant="secondary"
                onClick={() => onSave('submit')}
              >
                {saving ? t('inventory.saving') : t('inventory.submitForApproval')}
              </Button>
            )}
            {(canApprove || !form.requires_approval) && (
              <Button type="button" disabled={saving} onClick={() => onSave('approve')}>
                {saving ? t('inventory.saving') : t('inventory.saveAndApprove')}
              </Button>
            )}
            {form.requires_approval && !canApprove && (
              <p className="text-xs text-amber-700 text-center">{t('inventory.cannotApprove')}</p>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
