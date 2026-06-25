import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, RefreshCw, Users } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { fetchSuppliers, type SupplierDto, type SupplierListFilters } from '@/lib/api/inventory';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  filters: SupplierListFilters;
  onAddSupplier?: () => void;
  onEditSupplier?: (row: SupplierDto) => void;
};

export function FilteredSuppliersSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  filters,
  onAddSupplier,
  onEditSupplier,
}: Props) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<SupplierDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterKey = JSON.stringify(filters);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchSuppliers(filters));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('suppliers.loadFailed'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [open, filterKey, t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            {title}
          </SheetTitle>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </SheetHeader>

        <div className="flex flex-wrap gap-2 py-3">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {onAddSupplier && (
            <Button size="sm" onClick={onAddSupplier}>
              <Plus className="h-4 w-4 me-1" />
              {t('inventory.add')}
            </Button>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>
        )}

        {loading ? (
          <p className="text-center text-slate-500 py-8">{t('inventory.loading')}</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-slate-500 py-8 rounded-lg border bg-slate-50">
            {t('suppliers.noSuppliersInFilter')}
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{row.name_ar}</p>
                  <p className="text-xs text-slate-500 font-mono">{row.code}</p>
                  {row.phone && <p className="text-xs text-slate-600 mt-0.5">{row.phone}</p>}
                </div>
                {onEditSupplier && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditSupplier(row)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}
