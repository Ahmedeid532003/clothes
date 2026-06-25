import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { customerReservationsApi, salesQuotationsApi } from '@/lib/api/sales';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type DocKind = 'quotation' | 'reservation';

type Props = {
  kind: DocKind;
  onLoaded: (doc: Awaited<ReturnType<typeof salesQuotationsApi.lookup>>) => void;
  className?: string;
  size?: 'sm' | 'default';
};

export function LoadFromDocButton({ kind, onLoaded, className, size = 'sm' }: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label =
    kind === 'quotation' ? t('pos.loadQuotation') : t('pos.loadReservation');

  const load = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const doc =
        kind === 'quotation'
          ? await salesQuotationsApi.lookup(code.trim())
          : await customerReservationsApi.lookup(code.trim());
      onLoaded(doc);
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
        <FileText className="h-4 w-4 me-1" />
        {label}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{label}</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-slate-600">{t('pos.loadDocHint')}</p>
            <Input
              autoFocus
              placeholder={t('inventory.code')}
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
