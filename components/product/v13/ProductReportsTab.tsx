import React, { useState } from 'react';
import { FileBarChart2, ArrowRightLeft, Files, Building2, Package, Tag, Layers, Boxes, PieChart, Activity } from 'lucide-react';
import { StoreValueReportParamsPopup } from './StoreValueReportParamsPopup';
import { StoreValueReport } from './StoreValueReport';

interface ProductReportsTabProps {
  lang: 'ar' | 'en';
}

export function ProductReportsTab({ lang }: ProductReportsTabProps) {
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [isParamsPopupOpen, setIsParamsPopupOpen] = useState(false);
  const [reportParams, setReportParams] = useState<any>(null);

  const handleCardClick = (reportId: string) => {
    if (reportId === 'store-value') {
      setIsParamsPopupOpen(true);
      setActiveReport(reportId);
    } else {
      setActiveReport(reportId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-sm min-h-[500px]">
        {/* Compact Header */}
        <div className="border-b border-slate-100 pb-2 mb-6 flex flex-col items-start gap-1 text-left rtl:text-right">
          <div className="flex items-center gap-2.5">
            <FileBarChart2 className="text-orange-500 shrink-0" size={18} />
            <h3 className="text-md font-bold text-[#0a1945] font-sans">
              {lang === 'ar' ? 'تقارير الاصناف' : 'Products Reports'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-sans mt-1">
            {lang === 'ar' ? 'تقارير تفصيليه عن الاصناف الارصده مستندات المخازن وحركه المخزون' : 'Detailed reports on products, balances, store documents and inventory movement'}
          </p>
        </div>

        {!activeReport ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Report 1 */}
            <button
              onClick={() => handleCardClick('store-value')}
              className="bg-white border border-slate-200 hover:border-orange-300 rounded-lg p-5 text-left rtl:text-right flex items-start gap-4 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
                <Building2 size={22} />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <h4 className="text-sm font-black text-[#0a1945] font-sans truncate">
                  {lang === 'ar' ? 'تقرير قيمه مخزن / فرع' : 'Store/Branch Value Report'}
                </h4>
                <p className="text-xs text-slate-450 leading-relaxed font-sans whitespace-normal">
                  {lang === 'ar' 
                    ? 'تقرير مفصل بقيمه المخزون بسعر الشراء وسعر البيع لمخزن / فرع'
                    : 'Detailed report on inventory value at purchase and selling prices for a store/branch'}
                </p>
              </div>
            </button>

            {/* Report 2 */}
            <button
              onClick={() => handleCardClick('item-movement')}
              className="bg-white border border-slate-200 hover:border-orange-300 rounded-lg p-5 text-left rtl:text-right flex items-start gap-4 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
                <ArrowRightLeft size={22} />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <h4 className="text-sm font-black text-[#0a1945] font-sans truncate">
                  {lang === 'ar' ? 'تقرير حركه صنف' : 'Item Movement Report'}
                </h4>
                <p className="text-xs text-slate-450 leading-relaxed font-sans whitespace-normal">
                  {lang === 'ar' 
                    ? 'تقرير يعرض حركه الصنف لفرع او كل الافرع'
                    : 'Report displaying item movement for a branch or all branches'}
                </p>
              </div>
            </button>

            {/* Report 3 */}
            <button
              onClick={() => handleCardClick('store-documents')}
              className="bg-white border border-slate-200 hover:border-orange-300 rounded-lg p-5 text-left rtl:text-right flex items-start gap-4 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl shrink-0">
                <Files size={22} />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <h4 className="text-sm font-black text-[#0a1945] font-sans truncate">
                  {lang === 'ar' ? 'تقرير مستندات المخازن' : 'Store Documents Report'}
                </h4>
                <p className="text-xs text-slate-450 leading-relaxed font-sans whitespace-normal">
                  {lang === 'ar' 
                    ? 'اعرض اى مستند حركه اذون اضافه تحويل مبيعات مشتريات .... الخ'
                    : 'Display any movement document: addition vouchers, transfers, sales, purchases, etc.'}
                </p>
              </div>
            </button>

            {/* Report 4 */}
            <button
              onClick={() => handleCardClick('branch-balance')}
              className="bg-white border border-slate-200 hover:border-orange-300 rounded-lg p-5 text-left rtl:text-right flex items-start gap-4 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shrink-0">
                <Package size={22} />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <h4 className="text-sm font-black text-[#0a1945] font-sans truncate">
                  {lang === 'ar' ? 'تقرير رصيد فرع / مخزن' : 'Branch/Store Balance Report'}
                </h4>
                <p className="text-xs text-slate-450 leading-relaxed font-sans whitespace-normal">
                  {lang === 'ar' 
                    ? 'تقرير ارصده الفروع ويمكن معرفه رصيد قسم او موسم'
                    : 'Branch balances report, with ability to check balance by department or season'}
                </p>
              </div>
            </button>

            {/* Report 5 */}
            <button
              onClick={() => handleCardClick('branch-movement')}
              className="bg-white border border-slate-200 hover:border-orange-300 rounded-lg p-5 text-left rtl:text-right flex items-start gap-4 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl shrink-0">
                <Activity size={22} />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <h4 className="text-sm font-black text-[#0a1945] font-sans truncate">
                  {lang === 'ar' ? 'تقرير حركه فرع' : 'Branch Movement Report'}
                </h4>
                <p className="text-xs text-slate-450 leading-relaxed font-sans whitespace-normal">
                  {lang === 'ar' 
                    ? 'تقرير عرض حركه فرع من مبيعات مشتريات مرتجعات عملاء ومرتجعات مشتريات'
                    : 'Report showing branch movement including sales, purchases, customer returns, and purchase returns'}
                </p>
              </div>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex justify-start rtl:justify-end">
              <button
                onClick={() => {
                  setActiveReport(null);
                  setReportParams(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                {lang === 'ar' ? 'عودة للتقارير' : 'Back to Reports'}
              </button>
            </div>
            
            {activeReport === 'store-value' && reportParams ? (
              <StoreValueReport lang={lang} />
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

      {isParamsPopupOpen && (
        <StoreValueReportParamsPopup
          lang={lang}
          products={[]} // would pass actual products here in real implementation
          onClose={() => {
            setIsParamsPopupOpen(false);
            if (!reportParams) setActiveReport(null);
          }}
          onSubmit={(params) => {
            setReportParams(params);
            setIsParamsPopupOpen(false);
          }}
        />
      )}
    </div>
  );
}
