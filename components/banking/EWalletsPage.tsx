import React, { useCallback, useEffect, useState } from 'react';
import { Smartphone, Plus, Send } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ApiRequestError } from '@/lib/api/errors';
import {
  bankAccountsApi,
  channelTransfersApi,
  eWalletsApi,
  walletMovementsApi,
  walletProvidersApi,
  type BankAccountDto,
  type EWalletAccountDto,
  type EWalletMovementDto,
  type EWalletProviderDto,
} from '@/lib/api/banking';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageSectionHeader, PageToolbar, fmtMoney } from '@/components/accounting/AccountingUi';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const MOVEMENT_TYPES = ['deposit', 'withdrawal', 'transfer_out'] as const;

export function EWalletsPage() {
  const { t } = useLanguage();
  const [providers, setProviders] = useState<EWalletProviderDto[]>([]);
  const [wallets, setWallets] = useState<EWalletAccountDto[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountDto[]>([]);
  const [movements, setMovements] = useState<EWalletMovementDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provOpen, setProvOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [movOpen, setMovOpen] = useState(false);
  const [xferOpen, setXferOpen] = useState(false);
  const [provForm, setProvForm] = useState({ name_ar: '', code: '' });
  const [walletForm, setWalletForm] = useState({
    name_ar: '',
    provider: '',
    wallet_number: '',
    bank_account: '',
    code: '',
  });
  const [movForm, setMovForm] = useState({
    e_wallet_account: '',
    movement_type: 'deposit' as (typeof MOVEMENT_TYPES)[number],
    counter_wallet: '',
    amount: '',
    movement_date: new Date().toISOString().slice(0, 10),
    notes: '',
    post: true,
  });
  const [xferForm, setXferForm] = useState({
    mode: 'bank_to_wallet' as 'bank_to_wallet' | 'wallet_to_bank',
    from_bank_account: '',
    from_wallet: '',
    to_bank_account: '',
    to_wallet: '',
    amount: '',
    transfer_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, w, b, m] = await Promise.all([
        walletProvidersApi.list(),
        eWalletsApi.list(),
        bankAccountsApi.list(),
        walletMovementsApi.list(),
      ]);
      setProviders(p);
      setWallets(w);
      setBankAccounts(b);
      setMovements(m);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t('banking.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const movementLabel = (ty: string) => t(`banking.mov_${ty}` as 'banking.mov_deposit');

  return (
    <div className="space-y-4">
      <PageSectionHeader
        icon={<Smartphone className="h-6 w-6" />}
        title={t('nav.eWallets')}
        description={t('bankingChannels.walletsDesc')}
        actions={
          <PageToolbar onRefresh={load}>
            <Button size="sm" variant="outline" onClick={() => setProvOpen(true)}>
              <Plus className="h-4 w-4 me-1" />
              {t('bankingChannels.addProvider')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setWalletForm({
                  name_ar: '',
                  provider: providers[0]?.id ?? '',
                  wallet_number: '',
                  bank_account: bankAccounts[0]?.id ?? '',
                  code: '',
                });
                setWalletOpen(true);
              }}
            >
              {t('bankingChannels.addWallet')}
            </Button>
            <Button size="sm" onClick={() => setMovOpen(true)} disabled={!wallets.length}>
              <Send className="h-4 w-4 me-1" />
              {t('banking.addMovement')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setXferOpen(true)}>
              {t('bankingChannels.addTransfer')}
            </Button>
          </PageToolbar>
        }
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {wallets.map((w) => (
          <div key={w.id} className="rounded-xl border bg-gradient-to-br from-emerald-50/80 to-white p-4">
            <div className="font-semibold">{w.name_ar}</div>
            <div className="text-xs text-slate-500">{w.provider_name}</div>
            <div className="mt-2 text-2xl font-bold tabular-nums">{fmtMoney(w.current_balance)}</div>
            <div className="text-xs font-mono text-slate-500">{w.wallet_number || w.code}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-start">{t('inventory.code')}</th>
              <th className="px-3 py-2 text-start">{t('purchases.date')}</th>
              <th className="px-3 py-2 text-start">{t('banking.movementType')}</th>
              <th className="px-3 py-2 text-start">{t('banking.account')}</th>
              <th className="px-3 py-2 text-end">{t('accounting.amount')}</th>
              <th className="px-3 py-2 text-start">{t('inventory.status')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : (
              movements.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{m.code}</td>
                  <td className="px-3 py-2">{m.movement_date}</td>
                  <td className="px-3 py-2">{movementLabel(m.movement_type)}</td>
                  <td className="px-3 py-2">{m.e_wallet_account_name}</td>
                  <td className="px-3 py-2 text-end tabular-nums">{fmtMoney(m.amount)}</td>
                  <td className="px-3 py-2">{m.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Sheet open={provOpen} onOpenChange={setProvOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t('bankingChannels.addProvider')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <Input
              value={provForm.name_ar}
              onChange={(e) => setProvForm({ ...provForm, name_ar: e.target.value })}
              placeholder={t('accounting.nameAr')}
            />
          </div>
          <SheetFooter>
            <Button
              onClick={async () => {
                await walletProvidersApi.create({ name_ar: provForm.name_ar });
                setProvOpen(false);
                load();
              }}
            >
              {t('inventory.save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={walletOpen} onOpenChange={setWalletOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t('bankingChannels.addWallet')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <Input
              value={walletForm.name_ar}
              onChange={(e) => setWalletForm({ ...walletForm, name_ar: e.target.value })}
              placeholder={t('accounting.nameAr')}
            />
            <select
              className="w-full rounded-md border px-2 py-2 text-sm"
              value={walletForm.provider}
              onChange={(e) => setWalletForm({ ...walletForm, provider: e.target.value })}
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name_ar}
                </option>
              ))}
            </select>
            <Input
              value={walletForm.wallet_number}
              onChange={(e) => setWalletForm({ ...walletForm, wallet_number: e.target.value })}
              placeholder={t('bankingChannels.walletNumber')}
            />
          </div>
          <SheetFooter>
            <Button
              onClick={async () => {
                await eWalletsApi.create({
                  name_ar: walletForm.name_ar,
                  provider: walletForm.provider,
                  wallet_number: walletForm.wallet_number,
                });
                setWalletOpen(false);
                load();
              }}
            >
              {t('inventory.save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={movOpen} onOpenChange={setMovOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t('banking.addMovement')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <select
              className="w-full rounded-md border px-2 py-2 text-sm"
              value={movForm.e_wallet_account}
              onChange={(e) => setMovForm({ ...movForm, e_wallet_account: e.target.value })}
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name_ar}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-md border px-2 py-2 text-sm"
              value={movForm.movement_type}
              onChange={(e) =>
                setMovForm({
                  ...movForm,
                  movement_type: e.target.value as (typeof MOVEMENT_TYPES)[number],
                })
              }
            >
              {MOVEMENT_TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {movementLabel(ty)}
                </option>
              ))}
            </select>
            <Input
              type="number"
              value={movForm.amount}
              onChange={(e) => setMovForm({ ...movForm, amount: e.target.value })}
              placeholder={t('accounting.amount')}
            />
          </div>
          <SheetFooter>
            <Button
              onClick={async () => {
                await walletMovementsApi.create({ ...movForm });
                setMovOpen(false);
                load();
              }}
            >
              {t('inventory.save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={xferOpen} onOpenChange={setXferOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t('bankingChannels.addTransfer')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <select
              className="w-full rounded-md border px-2 py-2 text-sm"
              value={xferForm.mode}
              onChange={(e) =>
                setXferForm({
                  ...xferForm,
                  mode: e.target.value as 'bank_to_wallet' | 'wallet_to_bank',
                })
              }
            >
              <option value="bank_to_wallet">
                {t('bankingChannels.sourceBank')} → {t('bankingChannels.destWallet')}
              </option>
              <option value="wallet_to_bank">
                {t('bankingChannels.sourceWallet')} → {t('bankingChannels.destBank')}
              </option>
            </select>
            {xferForm.mode === 'bank_to_wallet' ? (
              <>
                <select
                  className="w-full rounded-md border px-2 py-2 text-sm"
                  value={xferForm.from_bank_account}
                  onChange={(e) =>
                    setXferForm({ ...xferForm, from_bank_account: e.target.value })
                  }
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name_ar}
                    </option>
                  ))}
                </select>
                <select
                  className="w-full rounded-md border px-2 py-2 text-sm"
                  value={xferForm.to_wallet}
                  onChange={(e) => setXferForm({ ...xferForm, to_wallet: e.target.value })}
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name_ar}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <select
                  className="w-full rounded-md border px-2 py-2 text-sm"
                  value={xferForm.from_wallet}
                  onChange={(e) => setXferForm({ ...xferForm, from_wallet: e.target.value })}
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name_ar}
                    </option>
                  ))}
                </select>
                <select
                  className="w-full rounded-md border px-2 py-2 text-sm"
                  value={xferForm.to_bank_account}
                  onChange={(e) =>
                    setXferForm({ ...xferForm, to_bank_account: e.target.value })
                  }
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name_ar}
                    </option>
                  ))}
                </select>
              </>
            )}
            <Input
              type="number"
              value={xferForm.amount}
              onChange={(e) => setXferForm({ ...xferForm, amount: e.target.value })}
              placeholder={t('accounting.amount')}
            />
          </div>
          <SheetFooter>
            <Button
              onClick={async () => {
                const payload: Record<string, unknown> = {
                  amount: xferForm.amount,
                  transfer_date: xferForm.transfer_date,
                  post: true,
                };
                if (xferForm.mode === 'bank_to_wallet') {
                  payload.from_bank_account = xferForm.from_bank_account;
                  payload.to_wallet = xferForm.to_wallet;
                } else {
                  payload.from_wallet = xferForm.from_wallet;
                  payload.to_bank_account = xferForm.to_bank_account;
                }
                await channelTransfersApi.create(payload);
                setXferOpen(false);
                load();
              }}
            >
              {t('inventory.save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
