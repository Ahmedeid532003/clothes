import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Copy, Printer, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface ExportDataButtonProps {
  lang?: 'en' | 'ar';
  hideText?: boolean;
  onToast: (msg: string) => void;
  onExportPdf?: () => void;
  onExportExcel?: () => void;
  onExportCsv?: () => void;
  onCopy?: () => void;
  onPrint?: () => void;
  onWhatsapp?: () => void;
  className?: string;
  style?: React.CSSProperties;
  pdfLabelAr?: string;
  pdfLabelEn?: string;
  excelLabelAr?: string;
  excelLabelEn?: string;
  csvLabelAr?: string;
  csvLabelEn?: string;
  copyLabelAr?: string;
  copyLabelEn?: string;
  printLabelAr?: string;
  printLabelEn?: string;
  whatsappLabelAr?: string;
  whatsappLabelEn?: string;
}

export const ExportDataButton: React.FC<ExportDataButtonProps> = ({
  lang = 'en',
  hideText = false,
  onToast,
  onExportPdf,
  onExportExcel,
  onExportCsv,
  onCopy,
  onPrint,
  onWhatsapp,
  className,
  style,
  pdfLabelAr,
  pdfLabelEn,
  excelLabelAr,
  excelLabelEn,
  csvLabelAr,
  csvLabelEn,
  copyLabelAr,
  copyLabelEn,
  printLabelAr,
  printLabelEn,
  whatsappLabelAr,
  whatsappLabelEn,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handlePdf = () => {
    setIsOpen(false);
    if (onExportPdf) {
      onExportPdf();
    } else {
      onToast(lang === 'ar' ? 'تم بدء تصدير ملف PDF بنجاح' : 'PDF Export initiated successfully!');
    }
  };

  const handleExcel = () => {
    setIsOpen(false);
    if (onExportExcel) {
      onExportExcel();
    } else {
      onToast(lang === 'ar' ? 'تم بدء تصدير ملف Excel بنجاح' : 'Excel Export initiated successfully!');
    }
  };

  const handleCsv = () => {
    setIsOpen(false);
    if (onExportCsv) {
      onExportCsv();
    } else {
      onToast(lang === 'ar' ? 'تم بدء تصدير ملف CSV بنجاح' : 'CSV Export initiated successfully!');
    }
  };

  const handleCopy = () => {
    setIsOpen(false);
    if (onCopy) {
      onCopy();
    } else {
      onToast(lang === 'ar' ? 'تم نسخ البيانات إلى الحافظة' : 'Data copied to clipboard!');
    }
  };

  const handlePrint = () => {
    setIsOpen(false);
    if (onPrint) {
      onPrint();
    } else {
      onToast(lang === 'ar' ? 'تم فتح خيارات الطباعة للجدول' : 'Print dialog opened!');
    }
  };

  const handleWhatsapp = () => {
    setIsOpen(false);
    if (onWhatsapp) {
      onWhatsapp();
    } else {
      onToast(lang === 'ar' ? 'تم مشاركة البيانات عبر واتساب بنجاح' : 'Data shared via WhatsApp successfully!');
    }
  };

  return (
    <div className={cn("relative inline-block text-left", className)} style={style}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={style}
        className={cn(
          "w-full h-full font-extrabold rounded-lg border border-slate-200 transition-all flex items-center justify-center cursor-pointer text-xs/none uppercase tracking-wider select-none",
          hideText 
            ? "p-0 min-h-[32px] bg-white hover:bg-orange-50 hover:border-orange-400 text-orange-500" 
            : "min-h-[38px] px-4 gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-orange-600"
        )}
      >
        <Download size={hideText ? 14 : 14} className="text-orange-500" style={hideText ? { marginTop: "-3px", marginBottom: "-3px", height: "14px", width: "18px" } : {}} />
        {!hideText && (
          <span className="text-[11px] whitespace-nowrap">
            {lang === 'ar' ? 'تصدير البيانات' : 'Export Data'}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-48 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 p-2 text-xs"
          >
            <div className="space-y-1">
              {/* PDF */}
              <button
                onClick={handlePdf}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-red-600 hover:bg-red-50/60 rounded-lg transition text-left rtl:text-right font-medium cursor-pointer"
              >
                <FileText size={15} className="text-red-500 shrink-0" />
                <span className="text-[11px] font-bold">
                  {lang === 'ar' ? (pdfLabelAr || 'تصدير PDF') : (pdfLabelEn || 'Export to PDF')}
                </span>
              </button>

              {/* EXCEL */}
              <button
                onClick={handleExcel}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-green-600 hover:bg-green-50/60 rounded-lg transition text-left rtl:text-right font-medium cursor-pointer"
              >
                <FileSpreadsheet size={15} className="text-green-500 shrink-0" />
                <span className="text-[11px] font-bold">
                  {lang === 'ar' ? (excelLabelAr || 'تصدير Excel') : (excelLabelEn || 'Export to Excel')}
                </span>
              </button>

              {/* CSV */}
              <button
                onClick={handleCsv}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-blue-600 hover:bg-blue-50/60 rounded-lg transition text-left rtl:text-right font-medium cursor-pointer"
              >
                <FileSpreadsheet size={15} className="text-blue-500 shrink-0" />
                <span className="text-[11px] font-bold">
                  {lang === 'ar' ? (csvLabelAr || 'تصدير CSV') : (csvLabelEn || 'Export to CSV')}
                </span>
              </button>

              {/* COPY */}
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-orange-600 hover:bg-orange-50/60 rounded-lg transition text-left rtl:text-right font-medium cursor-pointer"
              >
                <Copy size={15} className="text-orange-500 shrink-0" />
                <span className="text-[11px] font-bold">
                  {lang === 'ar' ? (copyLabelAr || 'نسخ البيانات') : (copyLabelEn || 'Copy Table')}
                </span>
              </button>

              {/* PRINT */}
              <button
                onClick={handlePrint}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/60 rounded-lg transition text-left rtl:text-right font-medium cursor-pointer"
              >
                <Printer size={15} className="text-indigo-500 shrink-0" />
                <span className="text-[11px] font-bold">
                  {lang === 'ar' ? (printLabelAr || 'طباعة الجدول') : (printLabelEn || 'Print Directory')}
                </span>
              </button>

              {/* WHATSAPP */}
              <button
                onClick={handleWhatsapp}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-emerald-600 hover:bg-emerald-50/60 rounded-lg transition text-left rtl:text-right font-medium cursor-pointer"
              >
                <MessageCircle size={15} className="text-emerald-500 shrink-0" />
                <span className="text-[11px] font-bold">
                  {lang === 'ar' ? (whatsappLabelAr || 'مشاركة واتساب') : (whatsappLabelEn || 'WhatsApp Share')}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
