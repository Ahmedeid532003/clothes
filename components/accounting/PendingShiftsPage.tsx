import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  Check,
  Clock,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { pendingShiftsApi, type PendingShiftsDashboard } from '@/lib/api/accounting';
import { Button } from '@/components/ui/button';
import {
  AlertBanner,
  DataCard,
  DataTable,
  LinkAction,
  PageSectionHeader,
  PageToolbar,
  TableHead,
  Th,
} from '@/components/accounting/AccountingUi';
import { emitExpensesRefresh } from '@/components/accounting/ExpensesHub';

const SEV_STYLE: Record<string, string> = {
  critical: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
};

const ISSUE_ICON: Record<string, React.ReactNode> = {
  open: <Clock className="h-4 w-4" />,
  stale: <AlertOctagon className="h-4 w-4" />,
  deficit: <AlertTriangle className="h-4 w-4" />,
  unapproved: <ShieldAlert className="h-4 w-4" />,
  no_handover: <Bell className="h-4 w-4" />,
  surplus: <AlertTriangle className="h-4 w-4" />,
};

export function PendingShiftsPage() {
  const { t, lang } = useLanguage();
  const [data, setData] = useState<PendingShiftsDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await pendingShiftsApi.dashboard());
    } finally {
      setLoading(false);
      emitExpensesRefresh();
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const issueLabel = (issue: string) => t(`accounting.pending_${issue}` as 'accounting.pending_open');

  const counts = data?.counts ?? {};

  return (
    <div className="space-y-4">
      <PageSectionHeader
        icon={<ShieldAlert className="h-6 w-6" />}
        title={t('nav.pendingShifts')}
        description={t('accounting.pendingDesc')}
        actions={<PageToolbar onRefresh={load} />}
      />

      {data?.block_new_shift && (
        <AlertBanner variant="warning">
          {t('accounting.pendingBlock')}{' '}
          <LinkAction label={t('nav.cashShifts')} tab="cash-shifts" />
        </AlertBanner>
      )}

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {(['open', 'deficit', 'unapproved', 'stale', 'no_handover', 'total'] as const).map((k) => (
          <div key={k} className="rounded-xl border bg-white p-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-slate-800">{counts[k] ?? 0}</div>
            <div className="text-xs text-slate-500 mt-1">{t(`accounting.pendingCount_${k}`)}</div>
          </div>
        ))}
      </div>

      {data?.notifications && data.notifications.length > 0 && (
        <div className="space-y-2">
          {data.notifications.map((n, i) => (
            <div
              key={i}
              className={`rounded-lg border px-3 py-2 text-sm ${SEV_STYLE[n.level] ?? SEV_STYLE.info}`}
            >
              {lang === 'ar' ? n.message_ar : n.message_en}
            </div>
          ))}
        </div>
      )}

      <DataCard>
        <DataTable minWidth="720px">
          <TableHead>
            <Th>{t('accounting.pendingIssue')}</Th>
            <Th>{t('inventory.code')}</Th>
            <Th>{t('accounting.employee')}</Th>
            <Th align="end">{t('accounting.difference')}</Th>
            <Th align="end">{t('inventory.actions')}</Th>
          </TableHead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : !data?.items.length ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-emerald-600">
                  {t('accounting.pendingClear')}
                </td>
              </tr>
            ) : (
              data.items.map((row, idx) => (
                <tr key={`${row.id}-${row.issue}-${idx}`} className="border-t">
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                        SEV_STYLE[row.severity] ?? ''
                      }`}
                    >
                      {ISSUE_ICON[row.issue]}
                      {issueLabel(row.issue)}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{row.code}</td>
                  <td className="px-3 py-2">{row.employee_name}</td>
                  <td className="px-3 py-2 text-end">{row.difference}</td>
                  <td className="px-3 py-2 text-end">
                    {row.issue === 'unapproved' && (
                      <Button
                        size="sm"
                        onClick={() => pendingShiftsApi.forceApprove(row.id).then(load)}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>
      </DataCard>
    </div>
  );
}
