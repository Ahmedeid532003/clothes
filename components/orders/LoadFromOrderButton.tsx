import React, { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { scanOrdersApi, type ScanOrderDto } from '@/lib/api/scanOrders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export type LoadedScanOrder = ScanOrderDto;

type Props = {
  onLoaded: (order: LoadedScanOrder) => void;
  expectedType?: ScanOrderDto['order_type'];
  className?: string;
  size?: 'sm' | 'default';
};

export function LoadFromOrderButton({ onLoaded, expectedType, className, size = 'sm' }: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const order = await scanOrdersApi.lookup(code.trim());
      if (expectedType && order.order_type !== expectedType) {
        setError(t('scanOrders.wrongOrderType'));
        return;
      }
      onLoaded(order);
      setOpen(false);
      setCode('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <ClipboardList className="h-4 w-4 me-1" />
        {t('scanOrders.loadFromOrder')}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t('scanOrders.loadFromOrder')}</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-slate-600">{t('scanOrders.loadHint')}</p>
            <Input
              autoFocus
              placeholder={t('scanOrders.orderCode')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('inventory.cancel')}
            </Button>
            <Button onClick={load} disabled={loading || !code.trim()}>
              {loading ? t('inventory.loading') : t('scanOrders.load')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
