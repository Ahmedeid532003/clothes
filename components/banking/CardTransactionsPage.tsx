import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, Plus, Check, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ApiRequestError } from '@/lib/api/errors';
import {
  bankAccountsApi,
  cardAccountsApi,
  cardNetworksApi,
  cardTransactionsApi,
  type BankAccountDto,
  type CardAccountDto,
  type CardNetworkDto,
  type CardTransactionDto,
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

export function CardTransactionsPage() {
  const { t } = useLanguage();
  const [networks, setNetworks] = useState<CardNetworkDto[]>([]);
  const [accounts, setAccounts] = useState<CardAccountDto[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountDto[]>([]);
  const [rows, setRows] = useState<CardTransactionDto[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [txOpen, setTxOpen] = useState(false);
  const [accOpen, setAccOpen] = useState(false);
  const [netOpen, setNetOpen] = useState(false);
  const [txForm, setTxForm] = useState({
    card_merchant_account: '',
    transaction_number: '',
    amount: '',
    transaction_date: new Date().toISOString().slice(0, 10),
    party_name: '',
    notes: '',
  });
  const [accForm, setAccForm] = useState({
    name_ar: '',
    card_network: '',
    bank_account: '',
    code: '',
  });
  const [netForm, setNetForm] = useState({ name_ar: '', code: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [n, a, b, tx] = await Promise.all([
        cardNetworksApi.list(),
        cardAccountsApi.list(),
        bankAccountsApi.list(),
        cardTransactionsApi.list(statusFilter ? { status: statusFilter } : undefined),
      ]);
      setNetworks(n);
      setAccounts(a);
      setBankAccounts(b);
      setRows(tx);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t('banking.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, t]);

  useEffect(() => {
    load();
  }, [load]);

  const saveNetwork = async () => {
    if (!netForm.name_ar.trim()) return;
    await cardNetworksApi.create({ name_ar: netForm.name_ar, code: netForm.code || undefined });
    setNetOpen(false);
    load();
  };

  const saveAccount = async () => {
    if (!accForm.name_ar.trim() || !accForm.card_network || !accForm.bank_account) return;
    await cardAccountsApi.create({
      name_ar: accForm.name_ar,
      card_network: accForm.card_network,
      bank_account: accForm.bank_account,
      code: accForm.code || undefined,
    });
    setAccOpen(false);
    load();
  };

  const saveTx = async () => {
    if (!txForm.card_merchant_account || !txForm.amount) return;
    await cardTransactionsApi.create({
      ...txForm,
      party_type: 'other',
    });
    setTxOpen(false);
    load();
  };

  const statusBadge = (status: string) => {
    const cls =
      status === 'settled'
        ? 'bg-green-100 text-green-800'
        : status === 'rejected'
          ? 'bg-red-100 text-red-800'
          : 'bg-amber-100 text-amber-800';
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>
        {t(`bankingChannels.cardStatus_${status}` as 'bankingChannels.cardStatus_pending')}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <PageSectionHeader
        icon={<CreditCard className="h-6 w-6" />}
        title={t('nav.cardTransactions')}
        description={t('bankingChannels.cardsDesc')}
        actions={
          <PageToolbar onRefresh={load}>
            <Button size="sm" variant="outline" onClick={() => setNetOpen(true)}>
              <Plus className="h-4 w-4 me-1" />
              {t('bankingChannels.addNetwork')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAccForm({
                  name_ar: '',
                  card_network: networks[0]?.id ?? '',
                  bank_account: bankAccounts[0]?.id ?? '',
                  code: '',
                });
                setAccOpen(true);
              }}
              disabled={!networks.length || !bankAccounts.length}
            >
              {t('bankingChannels.addCardAccount')}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setTxForm({
                  card_merchant_account: accounts[0]?.id ?? '',
                  transaction_number: '',
                  amount: '',
                  transaction_date: new Date().toISOString().slice(0, 10),
                  party_name: '',
                  notes: '',
                });
                setTxOpen(true);
              }}
              disabled={!accounts.length}
            >
              {t('bankingChannels.addTransaction')}
            </Button>
          </PageToolbar>
        }
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {!accounts.length && !loading && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {t('bankingChannels.setupCardFirst')}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((a) => (
          <div key={a.id} className="rounded-xl border bg-gradient-to-br from-violet-50/80 to-white p-4">
            <div className="font-semibold">{a.name_ar}</div>
            <div className="text-xs text-slate-500">
              {a.card_network_name} · {a.bank_name}
            </div>
            <div className="mt-2 text-xl font-bold tabular-nums">{fmtMoney(a.current_balance)}</div>
            <div className="text-xs text-amber-700 mt-1">
              {t('bankingChannels.pendingBalance')}: {fmtMoney(a.pending_balance)}
            </div>
          </div>
        ))}
      </div>

      <select
        className="rounded-md border px-2 py-1 text-sm"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
      >
        <option value="">{t('banking.allStatuses')}</option>
        <option value="pending">{t('bankingChannels.cardStatus_pending')}</option>
        <option value="settled">{t('bankingChannels.cardStatus_settled')}</option>
        <option value="rejected">{t('bankingChannels.cardStatus_rejected')}</option>
      </select>

      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[960px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-start">{t('bankingChannels.transactionNumber')}</th>
              <th className="px-3 py-2 text-start">{t('purchases.date')}</th>
              <th className="px-3 py-2 text-start">{t('banking.account')}</th>
              <th className="px-3 py-2 text-end">{t('accounting.amount')}</th>
              <th className="px-3 py-2 text-start">{t('bankingChannels.party')}</th>
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
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  —
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 font-mono">{r.transaction_number}</td>
                  <td className="px-3 py-2">{r.transaction_date}</td>
                  <td className="px-3 py-2">
                    {r.card_merchant_account_name}
                    <div className="text-xs text-slate-500">{r.bank_name}</div>
                  </td>
                  <td className="px-3 py-2 text-end tabular-nums">{fmtMoney(r.amount)}</td>
                  <td className="px-3 py-2">
                    {r.party_name || r.customer_name || r.supplier_name || '—'}
                    {r.sale_code && (
                      <div className="text-xs text-blue-600">POS {r.sale_code}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">{statusBadge(r.status)}</td>
                  <td className="px-3 py-2 text-end">
                    {r.status === 'pending' && (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-700"
                          onClick={() => cardTransactionsApi.settle(r.id).then(load)}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-700"
                          onClick={() => cardTransactionsApi.reject(r.id).then(load)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Sheet open={netOpen} onOpenChange={setNetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t('bankingChannels.addNetwork')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <Input
              placeholder={t('accounting.nameAr')}
              value={netForm.name_ar}
              onChange={(e) => setNetForm({ ...netForm, name_ar: e.target.value })}
            />
            <Input
              placeholder={t('inventory.code')}
              value={netForm.code}
              onChange={(e) => setNetForm({ ...netForm, code: e.target.value })}
            />
          </div>
          <SheetFooter>
            <Button onClick={saveNetwork}>{t('inventory.save')}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={accOpen} onOpenChange={setAccOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t('bankingChannels.addCardAccount')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <Input
              placeholder={t('accounting.nameAr')}
              value={accForm.name_ar}
              onChange={(e) => setAccForm({ ...accForm, name_ar: e.target.value })}
            />
            <select
              className="w-full rounded-md border px-2 py-2 text-sm"
              value={accForm.card_network}
              onChange={(e) => setAccForm({ ...accForm, card_network: e.target.value })}
            >
              {networks.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name_ar}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-md border px-2 py-2 text-sm"
              value={accForm.bank_account}
              onChange={(e) => setAccForm({ ...accForm, bank_account: e.target.value })}
            >
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name_ar} — {b.bank_name}
                </option>
              ))}
            </select>
          </div>
          <SheetFooter>
            <Button onClick={saveAccount}>{t('inventory.save')}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={txOpen} onOpenChange={setTxOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t('bankingChannels.addTransaction')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <select
              className="w-full rounded-md border px-2 py-2 text-sm"
              value={txForm.card_merchant_account}
              onChange={(e) => setTxForm({ ...txForm, card_merchant_account: e.target.value })}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name_ar}
                </option>
              ))}
            </select>
            <Input
              placeholder={t('bankingChannels.transactionNumber')}
              value={txForm.transaction_number}
              onChange={(e) => setTxForm({ ...txForm, transaction_number: e.target.value })}
            />
            <Input
              type="number"
              placeholder={t('accounting.amount')}
              value={txForm.amount}
              onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
            />
            <Input
              type="date"
              value={txForm.transaction_date}
              onChange={(e) => setTxForm({ ...txForm, transaction_date: e.target.value })}
            />
            <Input
              placeholder={t('bankingChannels.party')}
              value={txForm.party_name}
              onChange={(e) => setTxForm({ ...txForm, party_name: e.target.value })}
            />
          </div>
          <SheetFooter>
            <Button onClick={saveTx}>{t('inventory.save')}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
