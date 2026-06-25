import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Gift, Plus, Printer } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  fetchBarcodeLabels,
  fetchStoreOfferNotices,
  type StoreOfferNoticeListItem,
} from '@/lib/api/inventory';
import { useAuth } from '@/lib/auth/AuthContext';
import { StoreOfferNoticePage } from '@/components/inventory/StoreOfferNoticePage';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { printOkazionBarcodeLabels } from '@/lib/print/okazionBarcodePrint';
import { ERP_NATIVE_SELECT } from '@/lib/ui/erpNativeSelect';

function fmt(n: string) {
  const v = parseFloat(n);
  if (Number.isNaN(v)) return '0';
  return v.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function StoreOfferHubPage() {
  const { t } = useLanguage();
  const { branches } = useAuth();
  const [mode, setMode] = useState<'list' | 'editor'>('list');
  const [rows, setRows] = useState<StoreOfferNoticeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [barcodeNoticeId, setBarcodeNoticeId] = useState('');
  const [barcodeBranch, setBarcodeBranch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchStoreOfferNotices());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode === 'list') load();
  }, [mode, load]);

  const openBarcode = (noticeId: string) => {
    setBarcodeNoticeId(noticeId);
    setBarcodeBranch(branches[0]?.id ?? '');
    setBarcodeOpen(true);
  };

  const printBarcodes = async () => {
    if (!barcodeNoticeId || !barcodeBranch) return;
    const labels = await fetchBarcodeLabels({
      store_offer_notice: barcodeNoticeId,
      branch: barcodeBranch,
    });
    if (!labels.length) return;
    printOkazionBarcodeLabels(labels);
    setBarcodeOpen(false);
  };

  if (mode === 'editor') {
    return <StoreOfferNoticePage onBack={() => { setMode('list'); load(); }} />;
  }

  return (
    <div
      className="flex flex-col rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white shadow-lg overflow-hidden"
      style={{ height: 'calc(100dvh - 7.5rem)', minHeight: '560px' }}
    >
      <header className="shrink-0 border-b border-slate-200 bg-white/95 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Gift className="h-5 w-5 text-violet-600" />
            {t('storeOffer.hubTitle')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('storeOffer.hubDesc')}</p>
        </div>
        <Button size="sm" className="bg-violet-600 hover:bg-violet-700 font-bold" onClick={() => setMode('editor')}>
          <Plus className="h-4 w-4 me-1" />
          {t('common.add')}
        </Button>
      </header>

      {error && <p className="mx-4 mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">{error}</p>}

      <div className="flex-1 min-h-0 overflow-auto px-4 py-3">
        <table className="w-full text-sm border-collapse min-w-[900px]">
          <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
            <tr className="text-[10px] font-black uppercase text-slate-700">
              <th className="border px-3 py-2">{t('storeOffer.noticeNo')}</th>
              <th className="border px-3 py-2">{t('storeOffer.noticeDate')}</th>
              <th className="border px-3 py-2">{t('storeOffer.noticeUser')}</th>
              <th className="border px-3 py-2">{t('storeOffer.executeFrom')}</th>
              <th className="border px-3 py-2">{t('storeOffer.executeTo')}</th>
              <th className="border px-3 py-2">{t('storeOffer.totalNoticeValue')}</th>
              <th className="border px-3 py-2 w-28">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-16 text-center text-slate-400">{t('loading')}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="py-16 text-center text-slate-500">{t('storeOffer.noNotices')}</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-violet-50/30">
                  <td className="border px-3 py-2 font-mono text-violet-800">{r.code}</td>
                  <td className="border px-3 py-2 tabular-nums">{r.notice_date}</td>
                  <td className="border px-3 py-2">{r.user_name}</td>
                  <td className="border px-3 py-2 tabular-nums">{r.offer_starts_at || '—'}</td>
                  <td className="border px-3 py-2 tabular-nums">{r.offer_ends_at || '—'}</td>
                  <td className="border px-3 py-2 tabular-nums font-black text-violet-700">{fmt(r.total_value)}</td>
                  <td className="border px-2 py-2">
                    <Button variant="outline" size="sm" onClick={() => openBarcode(r.id)}>
                      <Printer className="h-3.5 w-3.5 me-1" />
                      {t('storeOffer.barcode')}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
        {t('storeOffer.totalItems')}: <span className="font-black text-slate-800">{rows.length}</span>
      </footer>

      <Sheet open={barcodeOpen} onOpenChange={setBarcodeOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader><SheetTitle>{t('storeOffer.printBarcodeTitle')}</SheetTitle></SheetHeader>
          <p className="text-sm text-slate-600 py-2">{t('storeOffer.printBarcodeBranchDesc')}</p>
          <select className={ERP_NATIVE_SELECT} value={barcodeBranch} onChange={(e) => setBarcodeBranch(e.target.value)}>
            <option value="">{t('storeOffer.selectBranch')}</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name_ar}</option>)}
          </select>
          <SheetFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setBarcodeOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={printBarcodes} disabled={!barcodeBranch}>
              <ArrowRight className="h-4 w-4 me-1" />
              {t('print')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
