import React, { useMemo, useRef, useState } from 'react';
import { FileText, Printer, Receipt, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { SalesQuotationDto } from '@/lib/api/sales';
import { Button } from '@/components/ui/button';
import {
  buildPosQuotationPrintHtml,
  openPosQuotationPrint,
  type QuotationPrintFormat,
  type QuotationPrintMeta,
} from '@/lib/print/posQuotationPrint';

type Props = {
  quotation: SalesQuotationDto;
  meta: QuotationPrintMeta;
  onClose: () => void;
};

export function PosQuotationPreviewPage({ quotation, meta, onClose }: Props) {
  const { t } = useLanguage();
  const [format, setFormat] = useState<QuotationPrintFormat>('a4');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const previewHtml = useMemo(
    () => buildPosQuotationPrintHtml(quotation, meta, format, undefined, true),
    [quotation, meta, format],
  );

  const handlePrint = () => {
    openPosQuotationPrint(quotation, meta, format);
  };

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-slate-900/95 backdrop-blur-sm">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-900 px-4 py-3 text-white">
        <div className="min-w-0">
          <p className="text-xs font-bold text-blue-300">{t('pos.quotationPreviewTitle')}</p>
          <h1 className="truncate text-lg font-black font-mono">{quotation.code}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-white/10 p-1">
            <button
              type="button"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black transition ${
                format === 'a4' ? 'bg-white text-slate-900 shadow' : 'text-white/80 hover:bg-white/10'
              }`}
              onClick={() => setFormat('a4')}
            >
              <FileText className="h-4 w-4" />
              {t('pos.quotationPrintA4')}
            </button>
            <button
              type="button"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black transition ${
                format === 'receipt' ? 'bg-white text-slate-900 shadow' : 'text-white/80 hover:bg-white/10'
              }`}
              onClick={() => setFormat('receipt')}
            >
              <Receipt className="h-4 w-4" />
              {t('pos.quotationPrintReceipt')}
            </button>
          </div>
          <Button
            className="h-10 bg-emerald-600 font-black hover:bg-emerald-700"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 me-2" />
            {t('pos.quotationPreviewPrint')}
          </Button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto p-4 md:p-8">
        <div
          className={`shrink-0 origin-top shadow-2xl transition-all ${
            format === 'a4' ? 'w-full max-w-[210mm]' : 'w-[80mm]'
          }`}
        >
          <iframe
            ref={iframeRef}
            title={quotation.code}
            srcDoc={previewHtml}
            className={`w-full border-0 bg-white ${
              format === 'a4' ? 'min-h-[297mm] rounded-sm' : 'min-h-[400px] rounded-lg'
            }`}
            style={{ height: format === 'a4' ? '297mm' : 'auto', minHeight: format === 'receipt' ? '420px' : undefined }}
          />
        </div>
      </div>

      <footer className="shrink-0 border-t border-white/10 bg-slate-900 px-4 py-3 text-center text-xs text-slate-400">
        {t('pos.quotationPreviewFooter')}
      </footer>
    </div>
  );
}
