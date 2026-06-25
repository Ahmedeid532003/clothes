import React, { useCallback, useEffect, useState } from 'react';
import { Landmark, Plus, Pencil, Trash2, RefreshCw, Send } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ApiRequestError } from '@/lib/api/errors';
import {
  bankAccountsApi,
  bankMovementsApi,
  banksApi,
  type BankAccountDto,
  type BankDto,
  type BankMovementDto,
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

const MOVEMENT_TYPES = ['deposit', 'withdrawal', 'transfer_out', 'payment'] as const;

export function BankAccountsPage() {
  const { t } = useLanguage();
  const [banks, setBanks] = useState<BankDto[]>([]);
  const [accounts, setAccounts] = useState<BankAccountDto[]>([]);
  const [movements, setMovements] = useState<BankMovementDto[]>([]);
  const [filterAccount, setFilterAccount] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accOpen, setAccOpen] = useState(false);
  const [movOpen, setMovOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccountDto | null>(null);
  const [accForm, setAccForm] = useState({
    code: '',
    name_ar: '',
    name_en: '',
    bank: '',
    account_number: '',
    opening_balance: '0',
    notes: '',
  });
  const [movForm, setMovForm] = useState({
    bank_account: '',
    movement_type: 'deposit' as (typeof MOVEMENT_TYPES)[number],
    counter_account: '',
    movement_date: new Date().toISOString().slice(0, 10),
    amount: '',
    notes: '',
    post: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, a, m] = await Promise.all([
        banksApi.list(),
        bankAccountsApi.list(),
        bankMovementsApi.list(filterAccount || undefined),
      ]);
      setBanks(b);
      setAccounts(a);
      setMovements(m);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t('banking.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [filterAccount, t]);

  useEffect(() => {
    load();
  }, [load]);

  const openAddAccount = () => {
    setEditing(null);
    setAccForm({
      code: '',
      name_ar: '',
      name_en: '',
      bank: banks[0]?.id ?? '',
      account_number: '',
      opening_balance: '0',
      notes: '',
    });
    setAccOpen(true);
  };

  const openEditAccount = (row: BankAccountDto) => {
    setEditing(row);
    setAccForm({
      code: row.code,
      name_ar: row.name_ar,
      name_en: row.name_en || '',
      bank: row.bank,
      account_number: row.account_number,
      opening_balance: row.opening_balance,
      notes: row.notes || '',
    });
    setAccOpen(true);
  };

  const saveAccount = async () => {
    if (!accForm.name_ar.trim() || !accForm.bank) {
      setError(t('banking.accountRequired'));
      return;
    }
    const payload = {
      name_ar: accForm.name_ar.trim(),
      name_en: accForm.name_en.trim() || accForm.name_ar.trim(),
      bank: accForm.bank,
      account_number: accForm.account_number.trim(),
      opening_balance: accForm.opening_balance || '0',
      notes: accForm.notes.trim(),
    };
    if (accForm.code.trim()) Object.assign(payload, { code: accForm.code.trim() });
    try {
      if (editing) await bankAccountsApi.update(editing.id, payload);
      else await bankAccountsApi.create(payload);
      setAccOpen(false);
      load();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t('banking.saveFailed'));
    }
  };

  const openMovement = (accountId?: string) => {
    setMovForm({
      bank_account: accountId || accounts[0]?.id || '',
      movement_type: 'deposit',
      counter_account: '',
      movement_date: new Date().toISOString().slice(0, 10),
      amount: '',
      notes: '',
      post: true,
    });
    setMovOpen(true);
  };

  const saveMovement = async () => {
    if (!movForm.bank_account || !movForm.amount) {
      setError(t('banking.movementRequired'));
      return;
    }
    try {
      await bankMovementsApi.create({
        bank_account: movForm.bank_account,
        movement_type: movForm.movement_type,
        counter_account:
          movForm.movement_type === 'transfer_out' ? movForm.counter_account : undefined,
        movement_date: movForm.movement_date,
        amount: movForm.amount,
        notes: movForm.notes,
        post: movForm.post,
      });
      setMovOpen(false);
      load();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t('banking.saveFailed'));
    }
  };

  const postMovement = async (id: string) => {
    try {
      await bankMovementsApi.post(id);
      load();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t('banking.saveFailed'));
    }
  };

  const movementLabel = (ty: string) =>
    t(`banking.mov_${ty}` as 'banking.mov_deposit');

  return (
    <div className="space-y-4">
      <PageSectionHeader
        icon={<Landmark className="h-6 w-6" />}
        title={t('nav.bankAccounts')}
        description={t('banking.accountsDesc')}
        actions={
          <PageToolbar onRefresh={load}>
            <Button size="sm" variant="outline" onClick={openAddAccount} disabled={!banks.length}>
              <Plus className="h-4 w-4 me-1" />
              {t('banking.addAccount')}
            </Button>
            <Button size="sm" onClick={() => openMovement()} disabled={!accounts.length}>
              <Send className="h-4 w-4 me-1" />
              {t('banking.addMovement')}
            </Button>
          </PageToolbar>
        }
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {!banks.length && !loading && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {t('banking.setupBanksFirst')}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((a) => (
          <div
            key={a.id}
            className="rounded-xl border bg-gradient-to-br from-blue-50/80 to-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-slate-900">{a.name_ar}</div>
                <div className="text-xs text-slate-500">{a.bank_name}</div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditAccount(a)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600"
                  onClick={() => bankAccountsApi.remove(a.id).then(load)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums">{fmtMoney(a.current_balance)}</div>
            <div className="text-xs text-slate-500 font-mono mt-1">
              {a.code} · {a.account_number || '—'}
            </div>
            <Button
              variant="link"
              size="sm"
              className="mt-2 h-auto p-0 text-blue-700"
              onClick={() => {
                setFilterAccount(a.id);
                openMovement(a.id);
              }}
            >
              {t('banking.recordMovement')}
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-600">{t('banking.filterMovements')}:</span>
        <select
          className="rounded-md border border-slate-200 px-2 py-1 text-sm"
          value={filterAccount}
          onChange={(e) => setFilterAccount(e.target.value)}
        >
          <option value="">{t('banking.allAccounts')}</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name_ar}
            </option>
          ))}
        </select>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-start">{t('inventory.code')}</th>
              <th className="px-3 py-2 text-start">{t('purchases.date')}</th>
              <th className="px-3 py-2 text-start">{t('banking.movementType')}</th>
              <th className="px-3 py-2 text-start">{t('banking.account')}</th>
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
            ) : movements.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  {t('banking.noMovements')}
                </td>
              </tr>
            ) : (
              movements.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{m.code}</td>
                  <td className="px-3 py-2">{m.movement_date}</td>
                  <td className="px-3 py-2">{movementLabel(m.movement_type)}</td>
                  <td className="px-3 py-2">{m.bank_account_name}</td>
                  <td className="px-3 py-2 text-end tabular-nums">{fmtMoney(m.amount)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        m.status === 'posted'
                          ? 'text-green-700'
                          : m.status === 'draft'
                            ? 'text-amber-700'
                            : 'text-slate-500'
                      }
                    >
                      {t(`banking.status_${m.status}` as 'banking.status_posted')}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-end">
                    {m.status === 'draft' && (
                      <Button size="sm" variant="outline" onClick={() => postMovement(m.id)}>
                        {t('banking.postMovement')}
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Sheet open={accOpen} onOpenChange={setAccOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editing ? t('banking.editAccount') : t('banking.addAccount')}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <Input
              placeholder={t('inventory.code')}
              value={accForm.code}
              onChange={(e) => setAccForm({ ...accForm, code: e.target.value })}
            />
            <Input
              placeholder={t('accounting.nameAr')}
              value={accForm.name_ar}
              onChange={(e) => setAccForm({ ...accForm, name_ar: e.target.value })}
            />
            <select
              className="w-full rounded-md border px-2 py-2 text-sm"
              value={accForm.bank}
              onChange={(e) => setAccForm({ ...accForm, bank: e.target.value })}
            >
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name_ar}
                </option>
              ))}
            </select>
            <Input
              placeholder={t('banking.accountNumber')}
              value={accForm.account_number}
              onChange={(e) => setAccForm({ ...accForm, account_number: e.target.value })}
            />
            <Input
              type="number"
              placeholder={t('accounting.openingBalance')}
              value={accForm.opening_balance}
              onChange={(e) => setAccForm({ ...accForm, opening_balance: e.target.value })}
            />
            <textarea
              className="w-full min-h-[80px] rounded-md border px-3 py-2 text-sm"
              placeholder={t('accounting.notes')}
              value={accForm.notes}
              onChange={(e) => setAccForm({ ...accForm, notes: e.target.value })}
            />
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setAccOpen(false)}>
              {t('inventory.cancel')}
            </Button>
            <Button onClick={saveAccount}>{t('inventory.save')}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={movOpen} onOpenChange={setMovOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t('banking.addMovement')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <select
              className="w-full rounded-md border px-2 py-2 text-sm"
              value={movForm.bank_account}
              onChange={(e) => setMovForm({ ...movForm, bank_account: e.target.value })}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name_ar} ({a.bank_name})
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
            {movForm.movement_type === 'transfer_out' && (
              <select
                className="w-full rounded-md border px-2 py-2 text-sm"
                value={movForm.counter_account}
                onChange={(e) => setMovForm({ ...movForm, counter_account: e.target.value })}
              >
                <option value="">{t('banking.counterAccount')}</option>
                {accounts
                  .filter((a) => a.id !== movForm.bank_account)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name_ar}
                    </option>
                  ))}
              </select>
            )}
            <Input
              type="date"
              value={movForm.movement_date}
              onChange={(e) => setMovForm({ ...movForm, movement_date: e.target.value })}
            />
            <Input
              type="number"
              placeholder={t('accounting.amount')}
              value={movForm.amount}
              onChange={(e) => setMovForm({ ...movForm, amount: e.target.value })}
            />
            <textarea
              className="w-full min-h-[80px] rounded-md border px-3 py-2 text-sm"
              value={movForm.notes}
              onChange={(e) => setMovForm({ ...movForm, notes: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={movForm.post}
                onChange={(e) => setMovForm({ ...movForm, post: e.target.checked })}
              />
              {t('banking.postOnSave')}
            </label>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setMovOpen(false)}>
              {t('inventory.cancel')}
            </Button>
            <Button onClick={saveMovement}>{t('inventory.save')}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
