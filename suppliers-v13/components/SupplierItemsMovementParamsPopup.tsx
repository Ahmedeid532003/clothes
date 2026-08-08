import React, { useState } from 'react';
import { X, ArrowLeft, ArrowRight, Check, Boxes } from 'lucide-react';
import { motion } from 'motion/react';
import { MultiSelect } from './BulkPriceModificationPopup';

interface SupplierItemsMovementParamsPopupProps {
  lang: 'ar' | 'en';
  products: any[];
  onClose: () => void;
  onSubmit: (params: any) => void;
}

export function SupplierItemsMovementParamsPopup({ lang, products, onClose, onSubmit }: SupplierItemsMovementParamsPopupProps) {
  const isAr = lang === 'ar';

  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
  
  const today = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [ignoreDateRange, setIgnoreDateRange] = useState(true);
  const [showCountsOnly, setShowCountsOnly] = useState(false);
  const [hideBranchBalances, setHideBranchBalances] = useState(false);

  // Extract unique values from products
  const uniqueVals = (key: string) => Array.from(new Set((products || []).map(p => p[key]).filter(Boolean)));
  
  const suppliers = uniqueVals('supplier');
  const seasons = uniqueVals('season');

  const handleSubmit = () => {
    onSubmit({
      suppliers: selectedSuppliers,
      seasons: selectedSeasons,
      fromDate: ignoreDateRange ? null : fromDate,
      toDate: ignoreDateRange ? null : toDate,
      ignoreDateRange,
      showCountsOnly,
      hideBranchBalances
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[12px] shadow-2xl w-[697px] max-w-[95vw] max-h-[90vh] overflow-visible flex flex-col border border-gray-200"
      >
        <div className="bg-[#FF6900] rounded-t-[12px] h-[60px] px-6 flex items-center justify-between shrink-0">
             <div className="flex flex-col">
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 <Boxes className="w-6 h-6" />
                 {isAr ? 'ادخل معاملات التقرير' : 'Enter Report Parameters'}
               </h2>
               <p className="text-sm font-medium text-white/90">
                 {isAr ? 'تقرير مبيعات وحركه اصناف مورد' : 'Supplier Sales & Items Movement Report'}
               </p>
             </div>
             <button onClick={onClose} className="text-white/80 hover:text-white transition-colors cursor-pointer p-2 hover:bg-white/10 rounded-full">
               <X size={24} />
             </button>
          </div>

        <div className="p-6 overflow-visible flex-1">
          {/* Settings Bar */}
          <div className="mb-4 flex flex-col gap-[10px]">
            <label className="flex items-center gap-2 cursor-pointer select-none group h-[32px] px-3 bg-orange-50 border border-orange-100 rounded-[8px]">
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={showCountsOnly}
                  onChange={(e) => setShowCountsOnly(e.target.checked)}
                  className="peer appearance-none w-4 h-4 border-2 border-orange-200 rounded-[4px] checked:bg-orange-500 checked:border-orange-500 transition-all cursor-pointer"
                />
                <Check size={10} className="absolute text-white scale-0 peer-checked:scale-100 transition-transform pointer-events-none" strokeWidth={4} />
              </div>
              <span className="text-[11px] font-bold text-[#0a1945] group-hover:text-orange-600 transition-colors">
                {isAr ? 'عرض التقرير بالاعداد فقط بدون قيم' : 'Show report with quantities only without values'}
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none group h-[32px] px-3 bg-orange-50 border border-orange-100 rounded-[8px]">
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={hideBranchBalances}
                  onChange={(e) => setHideBranchBalances(e.target.checked)}
                  className="peer appearance-none w-4 h-4 border-2 border-orange-200 rounded-[4px] checked:bg-orange-500 checked:border-orange-500 transition-all cursor-pointer"
                />
                <Check size={10} className="absolute text-white scale-0 peer-checked:scale-100 transition-transform pointer-events-none" strokeWidth={4} />
              </div>
              <span className="text-[11px] font-bold text-[#0a1945] group-hover:text-orange-600 transition-colors">
                {isAr ? 'عرض التقرير باجمالى الرصيد (بدون ارصدة الفروع)' : 'Show report with total balance (without branch balances)'}
              </span>
            </label>
          </div>

          {/* Top Date Filters & Selection Toggle */}
          <div className="mb-[12px] h-[76px] pb-2 px-5 bg-slate-50 border border-gray-300 rounded-xl">
            <div className="flex flex-col md:flex-row items-end gap-6 h-full">
              <div className="flex flex-col justify-end pb-1 px-4 border-r border-gray-200 rtl:border-r-0 rtl:border-l h-[35px] mb-[6px] mr-[-12px]">
                <label className="flex items-center gap-1.5 cursor-pointer select-none group mr-[-15px]">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={ignoreDateRange}
                      onChange={(e) => setIgnoreDateRange(e.target.checked)}
                      className="peer appearance-none w-4 h-4 border-2 border-orange-300 rounded-[4px] checked:bg-orange-500 checked:border-orange-500 transition-all cursor-pointer"
                    />
                    <Check size={10} className="absolute text-white scale-0 peer-checked:scale-100 transition-transform pointer-events-none" strokeWidth={4} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-700 leading-tight">
                      {isAr ? 'كل التواريخ' : 'All Dates'}
                    </span>
                    <span className="text-[8px] text-slate-500 leading-tight">
                      {isAr ? '(تجاهل نطاق التاريخ)' : '(Ignore date range)'}
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-700 mb-1.5 px-1 mr-[-26px] w-[303px]">
                    {isAr ? 'من تاريخ' : 'From Date'}
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    disabled={ignoreDateRange}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full h-[38px] bg-white border border-gray-300 rounded-lg text-sm px-3 transition-all outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed mt-[-2px] mr-[-26px]"
                  />
                </div>
                <div className="flex flex-col mr-[-13px]">
                  <label className="text-xs font-bold text-slate-700 mb-1.5 px-1">
                    {isAr ? 'الى تاريخ' : 'To Date'}
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    disabled={ignoreDateRange}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full h-[38px] bg-white border border-gray-300 rounded-lg text-sm px-3 transition-all outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Other Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-4">
              <MultiSelect label={isAr ? 'اختر المورد' : 'Select Supplier'} options={suppliers} selected={selectedSuppliers} onChange={setSelectedSuppliers} isAr={isAr} />
            </div>
            <div className="flex flex-col gap-4">
              <MultiSelect label={isAr ? 'اختر الموسم' : 'Select Season'} options={seasons} selected={selectedSeasons} onChange={setSelectedSeasons} isAr={isAr} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-8 text-center">
            {isAr ? 'سيتم جلب جميع الأصناف التي تتطابق مع الفلاتر المحددة. إذا لم تقم بتحديد خيارات في فلتر معين، سيتم تجاهله.' : 'All items matching the selected filters will be fetched. If no options are selected in a filter, it will be ignored.'}
          </p>
        </div>

        <div className="h-[57px] rounded-b-[12px] px-4 border-t border-black bg-slate-50 flex items-center justify-between">
          <button 
            onClick={onClose}
            className="flex items-center gap-1.5 px-6 py-2 border border-red-100 text-red-500 bg-red-50/50 hover:bg-red-50 rounded-[8px] text-[12px] font-bold transition cursor-pointer shadow-sm"
          >
            <span>{isAr ? "الغاء ورجوع" : "Cancel & Return"}</span>
            {isAr ? <ArrowLeft size={14} className="opacity-70" /> : <ArrowRight size={14} className="opacity-70" />}
          </button>
          <button 
            onClick={handleSubmit}
            className="h-[43px] pt-0 text-[13px] leading-[23px] bg-[#FF6900] hover:bg-[#e05d00] text-white font-black px-10 rounded-lg shadow-lg shadow-orange-200 transition-all active:scale-95 cursor-pointer"
          >
            {isAr ? 'عرض التقرير' : 'Show Report'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
