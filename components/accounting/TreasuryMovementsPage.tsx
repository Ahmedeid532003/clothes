import React, { useCallback, useEffect, useState } from 'react';
import {
  Banknote,
  Landmark,
  Plus,
  Send,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  treasuryLiquidityApi,
  treasuriesApi,
  type TreasuryBalanceDto,
  type TreasuryMovementDto,
} from '@/lib/api/accounting';
import { fetchBranches } from '@/lib/api/branches';
import { Button } from '@/components/ui/button';
import { PageSectionHeader, PageToolbar, fmtMoney } from '@/components/accounting/AccountingUi';
import { emitExpensesRefresh } from '@/components/accounting/ExpensesHub';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const KIND_ICON: Record<string, React.ReactNode> = {
  cash: <Wallet className="h-5 w-5" />,
  bank: <Landmark className="h-5 w-5" />,
  e_wallet: <Smartphone className="h-5 w-5" />,
};

export function TreasuryMovementsPage() {
  const { t } = useLanguage();
  const [balances, setBalances] = useState<TreasuryBalanceDto[]>([]);
  const [movements, setMovements] = useState<TreasuryMovementDto[]>([]);
  const [audit, setAudit] = useState<
    { action: string; entity_code: string; user_name: string; created_at: string }[]
  >([]);
  const [treasuries, setTreasuries] = useState<{ id: string; label: string }[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    movement_date: new Date().toISOString().slice(0, 10),
    movement_type: 'receipt',
    treasury: '',
    counter_treasury: '',
    amount: '',
    branch: '',
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bal, mov, aud, tr, br] = await Promise.all([
        treasuryLiquidityApi.balances(),
        treasuryLiquidityApi.movements(),
        treasuryLiquidityApi.audit(),
        treasuriesApi.list(),
        fetchBranches(),
      ]);
      setBalances(bal);
      setMovements(mov);
      setAudit(aud.slice(0, 15));
      setTreasuries(tr.map((x) => ({ id: x.id, label: `${x.code} — ${x.name_ar}` })));
      setBranches(br.map((b) => ({ id: b.id, name: b.name_ar || b.code })));
    } finally {
      setLoading(false);
      emitExpensesRefresh();
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const typeLabel = (ty: string) => t(`accounting.tmv_${ty}` as 'accounting.tmv_receipt');

  const onSave = async () => {
    await treasuryLiquidityApi.create({
      ...form,
      counter_treasury: form.movement_type === 'transfer' ? form.counter_treasury : null,
      branch: form.branch || null,
    });
    setOpen(false);
    load();
  };

  return (
    <div className="space-y-4">
      <PageSectionHeader
        icon={<Banknote className="h-6 w-6" />}
        title={t('nav.treasuryMovements')}
        description={t('accounting.treasuryDesc')}
        actions={
          <PageToolbar onRefresh={load}>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 me-1" />
              {t('accounting.tmvAdd')}
            </Button>
          </PageToolbar>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {balances.map((b) => (
          <div
            key={b.id}
            className="rounded-xl border bg-gradient-to-br from-teal-50/80 to-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 text-teal-800">
              {KIND_ICON[b.kind] ?? <Wallet className="h-5 w-5" />}
              <span className="font-semibold">{b.name_ar}</span>
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums">
              {fmtMoney(b.balance)} <span className="text-sm font-normal">{b.currency}</span>
            </div>
            <div className="text-xs text-slate-500 font-mono">{b.code}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-start">{t('inventory.code')}</th>
              <th className="px-3 py-2 text-start">{t('purchases.date')}</th>
              <th className="px-3 py-2 text-start">{t('accounting.tmvType')}</th>
              <th className="px-3 py-2 text-start">{t('accounting.treasury')}</th>
              <th className="px-3 py-2 text-end">{t('accounting.amount')}</th>
              <th className="px-3 py-2 text-start">{t('inventory.status')}</th>
              <th className="px-3 py-2 text-end">{t('inventory.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : (
              movements.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{m.code}</td>
                  <td className="px-3 py-2">{m.movement_date}</td>
                  <td className="px-3 py-2">{typeLabel(m.movement_type)}</td>
                  <td className="px-3 py-2">
                    {m.treasury_name}
                    {m.counter_treasury_name && (
                      <span className="text-xs text-slate-500"> → {m.counter_treasury_name}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-end font-semibold">{m.amount}</td>
                  <td className="px-3 py-2">{m.status}</td>
                  <td className="px-3 py-2 text-end">
                    {(m.status === 'draft' || m.status === 'pending_approval') && (
                      <Button size="sm" onClick={() => treasuryLiquidityApi.post(m.id).then(load)}>
                        <Send className="h-3 w-3" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border bg-slate-50/50 p-4">
        <h3 className="font-semibold text-sm mb-2">{t('accounting.tmvAudit')}</h3>
        <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
          {audit.map((a, i) => (
            <li key={i} className="flex justify-between gap-2 border-b border-slate-200/60 py-1">
              <span>
                <strong>{a.action}</strong> {a.entity_code} — {a.user_name}
              </span>
              <span className="text-slate-500 shrink-0">{a.created_at?.slice(0, 16)}</span>
            </li>
          ))}
        </ul>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t('accounting.tmvAdd')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <Input
              type="date"
              value={form.movement_date}
              onChange={(e) => setForm({ ...form, movement_date: e.target.value })}
            />
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={form.movement_type}
              onChange={(e) => setForm({ ...form, movement_type: e.target.value })}
            >
              <option value="receipt">{t('accounting.tmv_receipt')}</option>
              <option value="payment">{t('accounting.tmv_payment')}</option>
              <option value="transfer">{t('accounting.tmv_transfer')}</option>
              <option value="deposit">{t('accounting.tmv_deposit')}</option>
              <option value="withdrawal">{t('accounting.tmv_withdrawal')}</option>
            </select>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={form.treasury}
              onChange={(e) => setForm({ ...form, treasury: e.target.value })}
            >
              {treasuries.map((tr) => (
                <option key={tr.id} value={tr.id}>
                  {tr.label}
                </option>
              ))}
            </select>
            {form.movement_type === 'transfer' && (
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={form.counter_treasury}
                onChange={(e) => setForm({ ...form, counter_treasury: e.target.value })}
              >
                {treasuries.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.label}
                  </option>
                ))}
              </select>
            )}
            <Input
              type="number"
              placeholder={t('accounting.amount')}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <Input
              placeholder={t('inventory.notes')}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <SheetFooter>
            <Button onClick={onSave}>{t('inventory.saveDraft')}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
