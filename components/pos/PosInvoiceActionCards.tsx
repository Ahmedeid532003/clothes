import React from 'react';
import { Package, FileText, Truck, PauseCircle } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Button } from '@/components/ui/button';

type ActionId = 'reserve' | 'quotation' | 'delivery' | 'hold';

type Props = {
  onReserve?: () => void;
  onQuotation?: () => void;
  onDelivery?: () => void;
  onHold?: () => void;
  disabled?: boolean;
  docSaving?: boolean;
  deliveryActive?: boolean;
  compact?: boolean;
  showHold?: boolean;
};

const ACTIONS: Array<{
  id: ActionId;
  icon: React.ElementType;
  titleKey: string;
  descKey: string;
  color: string;
  border: string;
  bg: string;
}> = [
  {
    id: 'reserve',
    icon: Package,
    titleKey: 'pos.actionReserveTitle',
    descKey: 'pos.actionReserveDesc',
    color: 'text-blue-800',
    border: 'border-blue-300',
    bg: 'bg-blue-50 hover:bg-blue-100',
  },
  {
    id: 'quotation',
    icon: FileText,
    titleKey: 'pos.actionQuotationTitle',
    descKey: 'pos.actionQuotationDesc',
    color: 'text-slate-800',
    border: 'border-slate-300',
    bg: 'bg-slate-50 hover:bg-slate-100',
  },
  {
    id: 'delivery',
    icon: Truck,
    titleKey: 'pos.actionDeliveryTitle',
    descKey: 'pos.actionDeliveryDesc',
    color: 'text-orange-800',
    border: 'border-orange-300',
    bg: 'bg-orange-50 hover:bg-orange-100',
  },
  {
    id: 'hold',
    icon: PauseCircle,
    titleKey: 'pos.actionHoldTitle',
    descKey: 'pos.actionHoldDesc',
    color: 'text-amber-900',
    border: 'border-amber-300',
    bg: 'bg-amber-50 hover:bg-amber-100',
  },
];

export function PosInvoiceActionCards({
  onReserve,
  onQuotation,
  onDelivery,
  onHold,
  disabled,
  docSaving,
  deliveryActive,
  compact,
  showHold = true,
}: Props) {
  const { t } = useLanguage();

  const handlers: Record<ActionId, (() => void) | undefined> = {
    reserve: onReserve,
    quotation: onQuotation,
    delivery: onDelivery,
    hold: onHold,
  };

  const visible = ACTIONS.filter((a) => (a.id === 'hold' ? showHold && onHold : handlers[a.id]));

  return (
    <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
      {visible.map((action) => {
        const Icon = action.icon;
        const isDelivery = action.id === 'delivery';
        const isActive = isDelivery && deliveryActive;
        return (
          <button
            key={action.id}
            type="button"
            disabled={disabled || docSaving}
            onClick={handlers[action.id]}
            className={`group rounded-xl border-2 p-3 text-start transition shadow-sm disabled:opacity-50 ${
              isActive
                ? 'border-orange-500 bg-orange-100 ring-2 ring-orange-300'
                : `${action.border} ${action.bg}`
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-white ${action.border} ${action.color}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-black leading-snug ${action.color}`}>{t(action.titleKey)}</p>
                <p className="mt-1 text-[11px] leading-snug text-slate-600">{t(action.descKey)}</p>
                {isActive ? (
                  <span className="mt-1.5 inline-block rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black text-white">
                    {t('pos.deliveryModeOn')}
                  </span>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function PosInvoiceActionBar({
  onReserve,
  onQuotation,
  onDelivery,
  disabled,
  docSaving,
}: Pick<Props, 'onReserve' | 'onQuotation' | 'onDelivery' | 'disabled' | 'docSaving'>) {
  const { t } = useLanguage();
  return (
    <div className="rounded-xl border-2 border-violet-200 bg-violet-50/80 p-3 space-y-2">
      <p className="text-center text-xs font-black text-violet-900">{t('pos.installmentActionsTitle')}</p>
      <PosInvoiceActionCards
        compact
        showHold={false}
        onReserve={onReserve}
        onQuotation={onQuotation}
        onDelivery={onDelivery}
        disabled={disabled}
        docSaving={docSaving}
      />
    </div>
  );
}
