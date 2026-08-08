import React, { useState } from 'react';
import { FileText, FileBarChart2, ShoppingCart, RotateCcw, TrendingUp, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { PurchaseReportParamsPopup } from './PurchaseReportParamsPopup';

import { ItemPriceMovementReport } from './ItemPriceMovementReport';

interface PurchaseReportsTabProps {
  lang: 'ar' | 'en';
  products?: any[];
}

export function PurchaseReportsTab({ lang, products = [] }: PurchaseReportsTabProps) {
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [isParamsPopupOpen, setIsParamsPopupOpen] = useState(false);
  const [showReportContent, setShowReportContent] = useState(false);
  const [reportParams, setReportParams] = useState<any>(null);

  const isAr = lang === 'ar';

  const reportsList = [
    {
      id: 'price-movement',
      icon: TrendingUp,
      titleAr: 'تقرير حركه سعر الاصناف',
      titleEn: 'Item Price Movement Report',
      descAr: 'تقرير لمعرفه مدى التغير فى اسعار شراء الاصناف',
      descEn: 'Report to see changes in item purchase prices'
    },
    {
      id: 'purchase-movement',
      icon: ShoppingCart,
      titleAr: 'تقرير حركه المشتريات',
      titleEn: 'Purchase Movement Report',
      descAr: 'تقرير يعرض حركه المشتريات لفرع/ كل الفروع',
      descEn: 'Report showing purchase movement for a branch or all branches'
    },
    {
      id: 'purchase-returns-movement',
      icon: RotateCcw,
      titleAr: 'تقرير حركه مرتد مشتريات',
      titleEn: 'Purchase Returns Movement Report',
      descAr: 'تقرير يعرض حركه مرتد مشتريات فرع / مورد معين',
      descEn: 'Report showing purchase returns movement for a specific branch or supplier'
    },
    {
      id: 'top-purchased-items',
      icon: FileText,
      titleAr: 'تقرير الاصناف الاكثر شراء',
      titleEn: 'Top Purchased Items Report',
      descAr: 'تقرير يعرض الاصناف الأكثر شراءً وتحليلاً لمعدلات الشراء',
      descEn: 'Report showing the most purchased items and analysis of purchase rates'
    }
  ];

  const activeReportObj = reportsList.find(r => r.id === activeReport);

  const handleCardClick = (id: string) => {
    setActiveReport(id);
    setIsParamsPopupOpen(true);
    setShowReportContent(false);
  };

  const handleParamsSubmit = (params: any) => {
    setReportParams(params);
    setIsParamsPopupOpen(false);
    setShowReportContent(true);
  };

  const handleClosePopup = () => {
    setIsParamsPopupOpen(false);
    if (!showReportContent) {
      setActiveReport(null);
    }
  };

  return (
    <div className={cn("space-y-6 flex-1", isAr ? "rtl font-[Cairo]" : "ltr")} dir={isAr ? "rtl" : "ltr"}>
      {/* Params Popup */}
      {isParamsPopupOpen && activeReportObj && (
        <PurchaseReportParamsPopup 
          lang={lang}
          reportTitle={isAr ? activeReportObj.titleAr : activeReportObj.titleEn}
          products={products}
          onClose={handleClosePopup}
          onSubmit={handleParamsSubmit}
        />
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border border-gray-300 rounded-[12px] h-[76px] pt-[9px] pb-[9px] px-[10px] my-0 -mx-[8px]">
        <div className="flex items-center justify-between h-full gap-4">
          <div className="space-y-0.5 overflow-hidden text-left rtl:text-right">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2 truncate">
              <FileBarChart2 className="w-5 h-5 text-orange-500 shrink-0" />
              <span className="truncate">
                {showReportContent && activeReportObj 
                  ? (isAr ? activeReportObj.titleAr : activeReportObj.titleEn)
                  : (isAr ? "تقارير المشتريات" : "Purchase Reports")
                }
              </span>
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 truncate">
              {showReportContent && activeReportObj 
                ? (isAr ? activeReportObj.descAr : activeReportObj.descEn)
                : (isAr ? "التقارير والإحصائيات والتحليلات لعمليات المشتريات" : "Reports, statistics and analysis for purchase operations")
              }
            </p>
          </div>

          {activeReport && (
            <div className="flex flex-col items-stretch gap-1.5 shrink-0 min-w-[150px] h-[70px]">
              <button
                onClick={() => {
                  setActiveReport(null);
                  setShowReportContent(false);
                }}
                className="px-4 h-[32px] flex items-center justify-center gap-2 border border-red-200 text-red-500 bg-red-50/50 hover:bg-red-50 rounded-[8px] text-[12px] font-black transition cursor-pointer mt-[2px] -mb-[2px]"
              >
                {isAr ? <ArrowLeft size={14} strokeWidth={2.5} /> : <ArrowLeft size={14} strokeWidth={2.5} />}
                <span className="whitespace-nowrap">{isAr ? "الغاء ورجوع" : "Cancel & Return"}</span>
              </button>
              
              {showReportContent && (
                <button
                  onClick={() => setIsParamsPopupOpen(true)}
                  className="px-4 h-[32px] flex items-center justify-center bg-[#FF6900] text-white hover:bg-[#e05d00] rounded-[8px] text-[12px] font-black transition cursor-pointer shadow-sm -mt-[1px]"
                >
                  <span className="whitespace-nowrap">{isAr ? "عرض معاملات التقرير" : "Report Parameters"}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="mt-8 flex-1">
        {!showReportContent ? (
          <div className="-mx-[8px]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              {reportsList.map((report) => (
                <button
                  key={report.id}
                  onClick={() => handleCardClick(report.id)}
                  className="bg-white border border-gray-300 hover:border-orange-300 rounded-[8px] p-5 text-left rtl:text-right flex items-start gap-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 group"
                >
                  <div className="p-3 bg-orange-50 text-orange-500 rounded-[8px] shrink-0 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <report.icon size={24} />
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <h4 className="text-sm font-black text-[#0a1945] truncate">
                      {isAr ? report.titleAr : report.titleEn}
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium whitespace-normal line-clamp-2">
                      {isAr ? report.descAr : report.descEn}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : activeReport === 'price-movement' && showReportContent ? (
          <ItemPriceMovementReport lang={lang} params={reportParams} />
        ) : (
          <div className="bg-white border border-gray-300 rounded-3xl p-12 shadow-sm min-h-[400px] flex flex-col items-center justify-center text-center transition-all duration-300">
            <div className="p-6 bg-slate-50 rounded-full mb-6">
              {activeReportObj && <activeReportObj.icon className="w-12 h-12 text-slate-300" />}
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              {activeReportObj && (isAr ? activeReportObj.titleAr : activeReportObj.titleEn)}
            </h3>
            <p className="text-slate-400 font-sans text-xs max-w-md">
              {isAr 
                ? 'هذا التقرير قيد التطوير حالياً. سيتم ربطه بقاعدة البيانات وعرض النتائج في التحديث القادم.' 
                : 'This report is currently under development. It will be linked to the database and results displayed in the next update.'}
            </p>
            <div className="mt-4 p-4 bg-orange-50 rounded-xl text-[11px] text-orange-700 font-bold border border-orange-100">
              {isAr ? 'المعاملات المحددة:' : 'Selected Parameters:'}
              <pre className="mt-2 text-left rtl:text-right whitespace-pre-wrap opacity-80">
                {JSON.stringify(reportParams, null, 2)}
              </pre>
            </div>
            <button 
              onClick={() => {
                setActiveReport(null);
                setShowReportContent(false);
              }}
              className="mt-8 px-6 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
            >
              {isAr ? "العودة للتقارير" : "Back to Reports"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
