import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  Check,
  PenLine,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  cashShiftsApi,
  shiftHandoversApi,
  type CashShiftDto,
  type ShiftHandoverDto,
} from '@/lib/api/accounting';
import { fetchEmployees } from '@/lib/api/employees';
import { Button } from '@/components/ui/button';
import { PageSectionHeader, PageToolbar } from '@/components/accounting/AccountingUi';
import { emitExpensesRefresh } from '@/components/accounting/ExpensesHub';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const STEPS = ['create', 'sign', 'receive', 'done'] as const;

export function ShiftHandoversPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<ShiftHandoverDto[]>([]);
  const [closedShifts, setClosedShifts] = useState<CashShiftDto[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ShiftHandoverDto | null>(null);
  const [form, setForm] = useState({ from_shift: '', to_employee: '', difference_reason: '' });
  const [received, setReceived] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [h, shifts, emp] = await Promise.all([
        shiftHandoversApi.list(),
        cashShiftsApi.list({ status: 'closed' }),
        fetchEmployees(),
      ]);
      setRows(h);
      setClosedShifts(shifts.filter((s) => s.handover_status === 'none'));
      setEmployees(emp.map((e) => ({ id: e.id, name: e.full_name || e.username })));
    } finally {
      setLoading(false);
      emitExpensesRefresh();
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const statusLabel = (s: string) => {
    const m: Record<string, string> = {
      draft: t('accounting.hndDraft'),
      sender_signed: t('accounting.hndSenderSigned'),
      pending_review: t('accounting.hndPendingReview'),
      received: t('accounting.hndReceived'),
      completed: t('accounting.hndCompleted'),
    };
    return m[s] ?? s;
  };

  const stepIndex = (s: string) => {
    if (s === 'draft') return 0;
    if (s === 'sender_signed') return 1;
    if (s === 'pending_review' || s === 'received') return 2;
    if (s === 'completed') return 3;
    return 0;
  };

  const onCreate = async () => {
    const row = await shiftHandoversApi.create(form);
    setOpen(false);
    setActive(row);
    load();
  };

  const runAction = async (fn: () => Promise<ShiftHandoverDto>) => {
    const row = await fn();
    setActive(row);
    load();
  };

  return (
    <div className="space-y-4">
      <PageSectionHeader
        icon={<ArrowLeftRight className="h-6 w-6" />}
        title={t('nav.shiftHandovers')}
        description={t('accounting.handoverDesc')}
        actions={
          <PageToolbar onRefresh={load}>
            <Button size="sm" onClick={() => setOpen(true)} disabled={!closedShifts.length}>
              {t('accounting.newHandover')}
            </Button>
          </PageToolbar>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        {STEPS.map((step, i) => (
          <div
            key={step}
            className="rounded-xl border bg-gradient-to-br from-slate-50 to-white p-3 text-center"
          >
            <div className="text-xs text-slate-500">{t(`accounting.hndStep${i + 1}`)}</div>
            <div className="font-semibold text-sm mt-1">{t(`accounting.hndStepLabel_${step}`)}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[880px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-start">{t('inventory.code')}</th>
              <th className="px-3 py-2 text-start">{t('accounting.hndFrom')}</th>
              <th className="px-3 py-2 text-start">{t('accounting.hndTo')}</th>
              <th className="px-3 py-2 text-end">{t('accounting.actualBalance')}</th>
              <th className="px-3 py-2 text-end">{t('accounting.difference')}</th>
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
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                  <td className="px-3 py-2">{r.from_employee_name}</td>
                  <td className="px-3 py-2">{r.to_employee_name}</td>
                  <td className="px-3 py-2 text-end">{r.actual_balance}</td>
                  <td
                    className={`px-3 py-2 text-end font-semibold ${
                      Number(r.difference) !== 0 ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  >
                    {r.difference}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                      {statusLabel(r.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-end">
                    <Button size="sm" variant="outline" onClick={() => setActive(r)}>
                      {t('accounting.hndManage')}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t('accounting.newHandover')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={form.from_shift}
              onChange={(e) => setForm({ ...form, from_shift: e.target.value })}
            >
              <option value="">{t('accounting.hndSelectShift')}</option>
              {closedShifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.actual_balance} ({s.employee_name})
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={form.to_employee}
              onChange={(e) => setForm({ ...form, to_employee: e.target.value })}
            >
              <option value="">{t('accounting.hndSelectReceiver')}</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <Input
              placeholder={t('accounting.hndDiffReason')}
              value={form.difference_reason}
              onChange={(e) => setForm({ ...form, difference_reason: e.target.value })}
            />
          </div>
          <SheetFooter>
            <Button onClick={onCreate}>{t('accounting.hndStart')}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={!!active} onOpenChange={(v) => !v && setActive(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{active?.code}</SheetTitle>
          </SheetHeader>
          {active && (
            <div className="space-y-4 py-4">
              <div className="flex gap-1">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded ${
                      i <= stepIndex(active.status) ? 'bg-indigo-500' : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-slate-600">{statusLabel(active.status)}</p>
              {active.status === 'draft' && (
                <Button
                  className="w-full"
                  onClick={() => runAction(() => shiftHandoversApi.signSender(active.id))}
                >
                  <PenLine className="h-4 w-4 me-2" />
                  {t('accounting.hndSignSender')}
                </Button>
              )}
              {active.status === 'sender_signed' && (
                <>
                  <Input
                    type="number"
                    placeholder={t('accounting.hndCountCash')}
                    value={received}
                    onChange={(e) => setReceived(e.target.value)}
                  />
                  <Button
                    className="w-full"
                    onClick={() =>
                      runAction(() =>
                        shiftHandoversApi.receive(active.id, {
                          received_balance: received,
                          difference_reason: active.difference_reason,
                        }),
                      )
                    }
                  >
                    <UserCheck className="h-4 w-4 me-2" />
                    {t('accounting.hndReceive')}
                  </Button>
                </>
              )}
              {active.status === 'pending_review' && (
                <Button
                  className="w-full"
                  onClick={() => runAction(() => shiftHandoversApi.approve(active.id))}
                >
                  <ShieldCheck className="h-4 w-4 me-2" />
                  {t('accounting.hndMgrApprove')}
                </Button>
              )}
              {active.status === 'received' && (
                <Button
                  className="w-full"
                  onClick={() => runAction(() => shiftHandoversApi.complete(active.id))}
                >
                  <Check className="h-4 w-4 me-2" />
                  {t('accounting.hndComplete')}
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
