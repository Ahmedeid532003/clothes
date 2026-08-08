import React, { useState } from 'react';
import { FileText, ArrowLeft, ArrowRight, FileSpreadsheet, Tag, CreditCard, Users, Percent, ShoppingCart } from 'lucide-react';
import { cn } from '../lib/utils';
import { SupplierStatementReportParamsPopup } from './SupplierStatementReportParamsPopup';
import { SupplierStatementReport } from './SupplierStatementReport';
import { SupplierItemsMovementParamsPopup } from './SupplierItemsMovementParamsPopup';
import { SupplierItemsMovementReport } from './SupplierItemsMovementReport';
import { Boxes } from 'lucide-react';

interface SupplierReportsTabProps {
  lang: 'ar' | 'en';
}

export function SupplierReportsTab({ lang }: SupplierReportsTabProps) {
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [isParamsPopupOpen, setIsParamsPopupOpen] = useState(false);
  const [reportParams, setReportParams] = useState<any>(null);

  const renderParamsBar = () => {
    if (!activeReport || !reportParams) return null;
    let paramsContent = [];

    if (activeReport === 'supplier-statement') {
      paramsContent = [];
      if (reportParams.searchTerm) {
        paramsContent.push(<span key="supplierCode">{lang === 'ar' ? 'كود المورد: SUP-001' : 'Supplier Code: SUP-001'}</span>);
        paramsContent.push(<span key="supplierName">{lang === 'ar' ? `المورد: ${reportParams.searchTerm}` : `Supplier: ${reportParams.searchTerm}`}</span>);
      }
      if (reportParams.season) {
        paramsContent.push(<span key="season">{lang === 'ar' ? `الموسم: ${reportParams.season}` : `Season: ${reportParams.season}`}</span>);
      }
      if (reportParams.fromDate && reportParams.toDate) {
         paramsContent.push(<span key="date">{lang === 'ar' ? `التاريخ: ${reportParams.fromDate} - ${reportParams.toDate}` : `Date: ${reportParams.fromDate} - ${reportParams.toDate}`}</span>);
      }
    } else if (activeReport === 'items-movement') {
      if (reportParams.branches?.length) {
         const branches = reportParams.branches.join(', ');
         paramsContent.push(<span key="branch">{lang === 'ar' ? `الفرع: ${branches}` : `Branch: ${branches}`}</span>);
      }
      if (reportParams.fromDate && reportParams.toDate) {
         paramsContent.push(<span key="date">{lang === 'ar' ? `التاريخ: ${reportParams.fromDate} - ${reportParams.toDate}` : `Date: ${reportParams.fromDate} - ${reportParams.toDate}`}</span>);
      }
    }

    return (
      <div className="h-[26px] bg-[#FF6900] rounded-[6px] px-4 flex flex-wrap items-center gap-6 text-white text-[11px] font-bold mb-[10px] shadow-sm -mx-[8px] sm:mx-0 overflow-hidden shrink-0 mt-[10px] relative z-10 w-auto">
        {paramsContent.map((content, idx) => (
          <div key={idx} className="flex items-center gap-2 whitespace-nowrap">
            {content}
          </div>
        ))}
      </div>
    );
  };


  const reportsList = [
    {
      id: 'supplier-data-balances',
      icon: Users,
      titleAr: 'تقرير بيانات وارصده الموردين',
      titleEn: 'Supplier Data & Balances Report',
      descAr: 'تقرير لعرض بيانات وارصده الموردين المستحقه',
      descEn: 'Report showing data and outstanding balances of suppliers'
    },
    {
      id: 'supplier-statement',
      icon: FileSpreadsheet,
      titleAr: 'كشف حساب مورد',
      titleEn: 'Supplier Statement of Account',
      descAr: 'تقرير يعرض تفاصيل حركات وحسابات المورد',
      descEn: 'Report showing supplier transactions and account details'
    },
    {
      id: 'supplier-discounts',
      icon: Percent,
      titleAr: 'تقرير خصم مورد',
      titleEn: 'Supplier Discount Report',
      descAr: 'تقرير لعرض ومتابعه خصومات من الموردين',
      descEn: 'Report to view and track discounts from suppliers'
    },
    {
      id: 'purchases-returns-movement',
      icon: ShoppingCart,
      titleAr: 'تقرير حركه المشتريات ومردود المشتريات',
      titleEn: 'Purchases and Returns Movement Report',
      descAr: 'تقرير لعرض حركه المشتريات ومرتد المشتريات لمورد او فرع',
      descEn: 'Report showing purchases and returns movement for a supplier or branch'
    },
    {
      id: 'items-movement',
      icon: Boxes,
      titleAr: 'تقرير مبيعات وحركه اصناف مورد',
      titleEn: 'Supplier Sales & Items Movement Report',
      descAr: 'تقرير لعرض مبيعات وحركه الاصناف لمورد معين ورصيده بالافرع',
      descEn: 'Report to show sales and item movement for a specific supplier and their branch balances'
    },
    {
      id: 'sale-discounts',
      icon: Tag,
      titleAr: 'خصومات الاوكازيون',
      titleEn: 'Sale Discounts',
      descAr: 'تقرير يعرض خصومات الاوكازيون المرتبطة بالموردين',
      descEn: 'Report showing sale discounts related to suppliers'
    },
    {
      id: 'supplier-payments',
      icon: CreditCard,
      titleAr: 'دفعات الموردين',
      titleEn: 'Supplier Payments',
      descAr: 'تقرير يعرض الدفعات المسددة للموردين',
      descEn: 'Report showing payments made to suppliers'
    }
  ];

  const activeReportObj = reportsList.find(r => r.id === activeReport);

  const handleCardClick = (id: string) => {
    setActiveReport(id);
    setIsParamsPopupOpen(true);
  };

  return (
    <div className={cn("space-y-6 flex-1", lang === 'ar' ? "rtl font-[Cairo]" : "ltr")} dir={lang === 'ar' ? "rtl" : "ltr"}>
      {!activeReport ? (
        <>
          {/* Header */}
          <div className="bg-white shadow-sm border border-gray-300 rounded-[12px] h-[76px] pt-[9px] pb-[9px] px-[10px] my-0 -mx-[8px]">
            <div className="flex items-center justify-between h-full gap-4">
              <div className="space-y-0.5 overflow-hidden text-left rtl:text-right">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2 truncate">
                  <FileText className="w-5 h-5 text-orange-500 shrink-0" />
                  <span className="truncate">{lang === 'ar' ? 'تقارير الموردين' : 'Supplier Reports'}</span>
                </h2>
                <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                  {lang === 'ar' ? 'التقارير والإحصائيات والتحليلات لعمليات الموردين' : 'Reports, statistics and analysis for supplier operations'}
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="mt-8 flex-1 -mx-[8px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportsList.map((report) => (
                <button
                  key={report.id}
                  onClick={() => handleCardClick(report.id)}
                  className="bg-white border border-gray-300 hover:border-orange-300 rounded-[8px] p-5 text-left rtl:text-right flex items-start gap-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 group"
                >
                  <div className="p-3 bg-orange-50 text-orange-500 rounded-[8px] shrink-0 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <report.icon size={22} />
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <h4 className="text-sm font-black text-[#0a1945] font-sans truncate">
                      {lang === 'ar' ? report.titleAr : report.titleEn}
                    </h4>
                    <p className="text-[11px] text-slate-450 leading-relaxed font-sans whitespace-normal line-clamp-2">
                      {lang === 'ar' ? report.descAr : report.descEn}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          {activeReportObj && (
            <div className="bg-white shadow-sm border border-gray-300 rounded-[12px] h-[84px] pt-[9px] pb-[9px] px-[10px] mt-[-13px] mb-[10px] -mx-[8px]">
              <div className="flex items-center justify-between h-full gap-4">
                <div className="space-y-0.5 overflow-hidden text-left rtl:text-right flex-1">
                  <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2 truncate">
                    <activeReportObj.icon className="w-5 h-5 text-orange-500 shrink-0" />
                    <span className="truncate">{lang === 'ar' ? activeReportObj.titleAr : activeReportObj.titleEn}</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-normal truncate">
                    {lang === 'ar' ? activeReportObj.descAr : activeReportObj.descEn}
                  </p>
                </div>
                <div className="flex flex-col items-stretch gap-1.5 shrink-0 min-w-[150px] h-[70px]">
                  <button
                    onClick={() => { setActiveReport(null); setReportParams(null); }}
                    className="px-4 h-[32px] flex items-center justify-center gap-2 border border-red-200 text-red-500 bg-red-50/50 hover:bg-red-50 rounded-[8px] text-[12px] font-black transition cursor-pointer mt-[2px] -mb-[2px]"
                  >
                    {lang === 'ar' ? <ArrowLeft size={14} strokeWidth={2.5} /> : <ArrowLeft size={14} strokeWidth={2.5} />}
                    <span className="whitespace-nowrap">{lang === 'ar' ? "الغاء ورجوع" : "Cancel & Return"}</span>
                  </button>
                  <button
                    onClick={() => setIsParamsPopupOpen(true)}
                    className="px-4 h-[32px] flex items-center justify-center bg-[#FF6900] text-white hover:bg-[#e05d00] rounded-[8px] text-[12px] font-black transition cursor-pointer shadow-sm -mt-[1px]"
                  >
                    <span className="whitespace-nowrap">
                      {lang === 'ar' ? 'عرض معاملات التقرير' : 'Report Parameters'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
          
          
          {activeReport === 'supplier-statement' && isParamsPopupOpen && (
            <SupplierStatementReportParamsPopup 
              lang={lang} 
              products={[]} 
              onClose={() => { setIsParamsPopupOpen(false); if (!reportParams) setActiveReport(null); }} 
              onSubmit={(params) => { setReportParams(params); setIsParamsPopupOpen(false); }} 
            />
          )}

          {activeReport === 'items-movement' && isParamsPopupOpen && (
            <SupplierItemsMovementParamsPopup 
              lang={lang} 
              products={[]} 
              onClose={() => { setIsParamsPopupOpen(false); if (!reportParams) setActiveReport(null); }} 
              onSubmit={(params) => { setReportParams(params); setIsParamsPopupOpen(false); }} 
            />
          )}

          {renderParamsBar()}

          {activeReport === 'supplier-statement' && reportParams ? (
            <SupplierStatementReport lang={lang} />
          ) : activeReport === 'items-movement' && reportParams ? (
            <SupplierItemsMovementReport lang={lang} params={reportParams} />
          ) : (
            <div className="bg-white border border-orange-500 rounded-3xl p-8 shadow-sm min-h-[400px] flex flex-col items-center justify-center text-center transition-all duration-300">
              <span className="text-slate-400 font-sans text-xs">
                {lang === 'ar' ? 'هذا التقرير قيد التطوير وسيتم ربطه بالصفحة الخاصة به قريباً' : 'This report is under development and will be linked to its page soon'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
