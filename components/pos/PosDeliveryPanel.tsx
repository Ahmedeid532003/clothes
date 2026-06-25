import React from 'react';
import { Truck, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fmtPosAmount } from './pos-utils';

type Props = {
  active: boolean;
  fees: string;
  onFeesChange: (v: string) => void;
  onClose: () => void;
  onPay?: () => void;
  payDisabled?: boolean;
  paying?: boolean;
  netTotal: number;
  grossTotal: number;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  agents?: Array<{ id: string; full_name: string }>;
  agentId?: string;
  onAgentChange?: (id: string) => void;
};

export function PosDeliveryPanel({
  active,
  fees,
  onFeesChange,
  onClose,
  onPay,
  payDisabled,
  paying,
  netTotal,
  grossTotal,
  inputRef,
  agents = [],
  agentId = '',
  onAgentChange,
}: Props) {
  const { t } = useLanguage();
  if (!active) return null;

  const feeNum = parseFloat(fees) || 0;

  return (
    <div className="rounded-2xl border-2 border-orange-400 bg-gradient-to-b from-orange-100 via-orange-50 to-white p-4 shadow-md ring-2 ring-orange-200">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow">
            <Truck className="h-6 w-6" />
          </span>
          <div>
            <p className="text-base font-black text-orange-950">{t('pos.deliveryPanelTitle')}</p>
            <p className="text-xs font-bold text-orange-800/80 leading-snug">{t('pos.deliveryPanelDesc')}</p>
          </div>
        </div>
        <button
          type="button"
          className="rounded-lg bg-orange-200/80 p-1.5 text-orange-900 hover:bg-orange-300"
          onClick={onClose}
          title={t('pos.deliveryPanelOff')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-black text-orange-900">
              {t('pos.deliveryFees')} ({t('dashboard.currency')})
            </label>
            <Input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              className="h-14 text-2xl font-black tabular-nums text-center border-2 border-orange-400 bg-white shadow-inner"
              value={fees}
              onChange={(e) => onFeesChange(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="0.00"
            />
          </div>
          {onAgentChange && agents.length > 0 ? (
            <div>
              <label className="mb-1.5 block text-xs font-black text-orange-900">
                {t('pos.deliveryHubAgent')}
              </label>
              <select
                className="h-11 w-full rounded-md border-2 border-orange-300 bg-white px-3 text-sm font-black"
                value={agentId}
                onChange={(e) => onAgentChange(e.target.value)}
              >
                <option value="">{t('pos.deliveryHubPickAgent')}</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
        <div className="rounded-xl bg-white border border-orange-200 px-4 py-2 text-center min-w-[120px]">
          <p className="text-[10px] font-bold text-slate-500">{t('pos.invoiceTotal')}</p>
          <p className="text-lg font-black tabular-nums">{fmtPosAmount(grossTotal)}</p>
        </div>
        <div className="rounded-xl bg-orange-500 px-4 py-2 text-center text-white min-w-[140px]">
          <p className="text-[10px] font-bold opacity-90">{t('pos.netInvoice')}</p>
          <p className="text-xl font-black tabular-nums">{fmtPosAmount(netTotal)}</p>
          {feeNum > 0 ? (
            <p className="text-[10px] opacity-90">+ {fmtPosAmount(feeNum)} {t('pos.deliveryFeesShort')}</p>
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-center text-[11px] font-bold text-orange-800/90">{t('pos.deliveryPanelPayHint')}</p>

      {onPay ? (
        <Button
          type="button"
          className="mt-3 h-14 w-full bg-[#4169E1] text-lg font-black hover:bg-[#3451b2] shadow-lg disabled:opacity-60"
          disabled={payDisabled || paying}
          onClick={onPay}
        >
          {paying ? t('inventory.loading') : t('pos.payButton')}
        </Button>
      ) : null}
    </div>
  );
}
