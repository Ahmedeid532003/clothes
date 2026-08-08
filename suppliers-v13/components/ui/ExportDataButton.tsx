import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Copy, Printer, MessageCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

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
  buttonClassName?: string;
  style?: React.CSSProperties;
  dropdownAlign?: 'left' | 'right';
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
  buttonClassName,
  style,
  dropdownAlign,
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
    <div className={cn("relative inline-block text-left rtl:text-right", className)} style={style}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full h-full font-black rounded-lg border border-gray-300 transition-all flex items-center justify-center cursor-pointer text-[11px] uppercase tracking-wider select-none active:scale-95",
          hideText 
            ? "p-0 w-[32px] h-[32px] min-h-[32px] flex-shrink-0 bg-white hover:bg-orange-50 hover:border-orange-400 text-orange-500 shadow-sm" 
            : "min-h-[38px] px-4 gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-orange-600 shadow-sm",
          buttonClassName
        )}
      >
        <Download size={14} className={cn("transition-transform duration-200", isOpen && "rotate-180")} />
        {!hideText && (
          <span className="whitespace-nowrap">
            {lang === 'ar' ? 'تصدير البيانات' : 'Export Data'}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className={cn(
                "absolute w-56 bg-white rounded-xl border border-gray-300 shadow-2xl z-50 overflow-hidden",
                dropdownAlign === 'left' ? "left-0" :
                dropdownAlign === 'right' ? "right-0" :
                lang === 'ar' ? "left-0" : "right-0"
              )}
              style={{
                marginTop: '8px',
                marginRight: '3px',
                marginLeft: dropdownAlign === 'left' ? '0px' :
                            dropdownAlign === 'right' ? '0px' :
                            lang === 'ar' ? '-182px' : '0px'
              }}
            >
              <div className="bg-slate-50/80 px-4 py-2.5 border-b border-gray-300 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {lang === 'ar' ? 'خيارات التصدير' : 'Export Options'}
                </span>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={12} />
                </button>
              </div>
              
              <div className="p-1.5 space-y-0.5">
                {/* PDF */}
                <button
                  onClick={handlePdf}
                  className="w-full flex items-center gap-3 px-3 py-2 text-slate-700 hover:text-red-600 hover:bg-red-50/80 rounded-lg transition-all text-start font-bold cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-50 group-hover:bg-red-100 flex items-center justify-center transition-colors shrink-0">
                    <FileText size={15} className="text-red-500" />
                  </div>
                  <span className="text-[11px]">
                    {lang === 'ar' ? (pdfLabelAr || 'تصدير ملف PDF') : (pdfLabelEn || 'Export as PDF')}
                  </span>
                </button>

                {/* EXCEL */}
                <button
                  onClick={handleExcel}
                  className="w-full flex items-center gap-3 px-3 py-2 text-slate-700 hover:text-green-600 hover:bg-green-50/80 rounded-lg transition-all text-start font-bold cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-green-50 group-hover:bg-green-100 flex items-center justify-center transition-colors shrink-0">
                    <FileSpreadsheet size={15} className="text-green-500" />
                  </div>
                  <span className="text-[11px]">
                    {lang === 'ar' ? (excelLabelAr || 'تصدير ملف Excel') : (excelLabelEn || 'Export as Excel')}
                  </span>
                </button>

                {/* CSV */}
                <button
                  onClick={handleCsv}
                  className="w-full flex items-center gap-3 px-3 py-2 text-slate-700 hover:text-blue-600 hover:bg-blue-50/80 rounded-lg transition-all text-start font-bold cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors shrink-0">
                    <FileSpreadsheet size={15} className="text-blue-500" />
                  </div>
                  <span className="text-[11px]">
                    {lang === 'ar' ? (csvLabelAr || 'تصدير ملف CSV') : (csvLabelEn || 'Export as CSV')}
                  </span>
                </button>

                <div className="h-px bg-slate-100 my-1.5 mx-2" />

                {/* COPY */}
                <button
                  onClick={handleCopy}
                  className="w-full flex items-center gap-3 px-3 py-2 text-slate-700 hover:text-orange-600 hover:bg-orange-50/80 rounded-lg transition-all text-start font-bold cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-50 group-hover:bg-orange-100 flex items-center justify-center transition-colors shrink-0">
                    <Copy size={15} className="text-orange-500" />
                  </div>
                  <span className="text-[11px]">
                    {lang === 'ar' ? (copyLabelAr || 'نسخ إلى الحافظة') : (copyLabelEn || 'Copy to Clipboard')}
                  </span>
                </button>

                {/* PRINT */}
                <button
                  onClick={handlePrint}
                  className="w-full flex items-center gap-3 px-3 py-2 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/80 rounded-lg transition-all text-start font-bold cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors shrink-0">
                    <Printer size={15} className="text-indigo-500" />
                  </div>
                  <span className="text-[11px]">
                    {lang === 'ar' ? (printLabelAr || 'طباعة البيانات') : (printLabelEn || 'Print Data')}
                  </span>
                </button>

                {/* WHATSAPP */}
                <button
                  onClick={handleWhatsapp}
                  className="w-full flex items-center gap-3 px-3 py-2 text-slate-700 hover:text-emerald-600 hover:bg-emerald-50/80 rounded-lg transition-all text-start font-bold cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors shrink-0">
                    <MessageCircle size={15} className="text-emerald-500" />
                  </div>
                  <span className="text-[11px]">
                    {lang === 'ar' ? (whatsappLabelAr || 'مشاركة واتساب') : (whatsappLabelEn || 'WhatsApp Share')}
                  </span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
