import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, Plus, RefreshCw, Send, Trash2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  chartOfAccountsApi,
  journalEntriesApi,
  type ChartAccountDto,
  type JournalEntryDto,
} from '@/lib/api/accounting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type LineForm = { gl_account: string; debit: string; credit: string; memo: string };

const emptyLine = (): LineForm => ({ gl_account: '', debit: '', credit: '', memo: '' });

export function JournalEntriesPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<JournalEntryDto[]>([]);
  const [accounts, setAccounts] = useState<ChartAccountDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [header, setHeader] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    description: '',
  });
  const [lines, setLines] = useState<LineForm[]>([emptyLine(), emptyLine()]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [j, acc] = await Promise.all([journalEntriesApi.list(), chartOfAccountsApi.list()]);
      setRows(j);
      setAccounts(acc);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    let d = 0;
    let c = 0;
    lines.forEach((ln) => {
      d += Number(ln.debit) || 0;
      c += Number(ln.credit) || 0;
    });
    return { d, c, ok: Math.abs(d - c) < 0.01 && d > 0 };
  }, [lines]);

  const statusLabel = (s: string) => {
    const m: Record<string, string> = {
      draft: t('accounting.jeDraft'),
      approved: t('accounting.jeApproved'),
      posted: t('accounting.jePosted'),
      void: t('accounting.jeVoid'),
    };
    return m[s] ?? s;
  };

  const onSave = async (approve: boolean, post: boolean) => {
    await journalEntriesApi.create({
      ...header,
      lines: lines.filter((ln) => ln.gl_account),
      approve,
      post,
    });
    setOpen(false);
    load();
  };

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-blue-800" />
            {t('nav.journalEntries')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t('accounting.jeDesc')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 me-1" />
            {t('accounting.jeAdd')}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-start">{t('inventory.code')}</th>
              <th className="px-3 py-2 text-start">{t('purchases.date')}</th>
              <th className="px-3 py-2 text-start">{t('accounting.jeDescription')}</th>
              <th className="px-3 py-2 text-end">{t('accounting.debit')}</th>
              <th className="px-3 py-2 text-end">{t('accounting.credit')}</th>
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
                  <td className="px-3 py-2">{r.entry_date}</td>
                  <td className="px-3 py-2">{r.description}</td>
                  <td className="px-3 py-2 text-end">{r.total_debit}</td>
                  <td className="px-3 py-2 text-end">{r.total_credit}</td>
                  <td className="px-3 py-2">
                    <span className="text-xs rounded-full bg-slate-100 px-2 py-0.5">
                      {statusLabel(r.status)}
                      {r.entry_kind === 'system' && ' · آلي'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-end gap-1 flex justify-end">
                    {r.status === 'draft' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => journalEntriesApi.approve(r.id).then(load)}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="sm" onClick={() => journalEntriesApi.post(r.id).then(load)}>
                          <Send className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    {r.status === 'approved' && (
                      <Button size="sm" onClick={() => journalEntriesApi.post(r.id).then(load)}>
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

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{t('accounting.jeAdd')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <Input
              type="date"
              value={header.entry_date}
              onChange={(e) => setHeader({ ...header, entry_date: e.target.value })}
            />
            <Input
              placeholder={t('accounting.jeDescription')}
              value={header.description}
              onChange={(e) => setHeader({ ...header, description: e.target.value })}
            />
            <p className="text-xs font-semibold text-slate-600">{t('accounting.jeLines')}</p>
            {lines.map((ln, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-1 items-center border rounded-lg p-2">
                <select
                  className="col-span-5 rounded border px-2 py-1 text-xs"
                  value={ln.gl_account}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx] = { ...ln, gl_account: e.target.value };
                    setLines(next);
                  }}
                >
                  <option value="">—</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} {a.name_ar}
                    </option>
                  ))}
                </select>
                <Input
                  className="col-span-2 h-8 text-xs"
                  placeholder={t('accounting.debit')}
                  value={ln.debit}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx] = { ...ln, debit: e.target.value, credit: e.target.value ? '' : ln.credit };
                    setLines(next);
                  }}
                />
                <Input
                  className="col-span-2 h-8 text-xs"
                  placeholder={t('accounting.credit')}
                  value={ln.credit}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx] = { ...ln, credit: e.target.value, debit: e.target.value ? '' : ln.debit };
                    setLines(next);
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="col-span-1"
                  onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setLines([...lines, emptyLine()])}>
              <Plus className="h-3 w-3 me-1" />
              {t('accounting.jeAddLine')}
            </Button>
            <div
              className={`text-sm font-semibold p-2 rounded ${totals.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}
            >
              {t('accounting.debit')}: {totals.d} — {t('accounting.credit')}: {totals.c}
              {!totals.ok && ` (${t('accounting.jeUnbalanced')})`}
            </div>
          </div>
          <SheetFooter className="flex-col gap-2 sm:flex-col">
            <Button disabled={!totals.ok} onClick={() => onSave(false, false)}>
              {t('purchases.saveDraft')}
            </Button>
            <Button disabled={!totals.ok} onClick={() => onSave(true, false)}>
              {t('purchases.saveAndApprove')}
            </Button>
            <Button disabled={!totals.ok} onClick={() => onSave(true, true)}>
              {t('accounting.jeSavePost')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
