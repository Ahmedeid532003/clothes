import React, { useState } from 'react';
import { ChevronDown, X, ArrowLeft, ArrowRight, Check, Search, Building2, ArrowRightLeft, Boxes, Files, Package, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { MultiSelect } from './BulkPriceModificationPopup';

interface SupplierStatementReportParamsPopupProps {
  lang: 'ar' | 'en';
  products: any[];
  onClose: () => void;
  onSubmit: (params: any) => void;
}

const SingleSelect = ({ label, options, selected, onChange, isAr }: { label: string, options: string[], selected: string, onChange: (v: string) => void, isAr: boolean }) => {
  const [isOpen, React_setIsOpen] = React.useState(false);
  const [search, React_setSearch] = React.useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        React_setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    return options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div 
        onClick={() => React_setIsOpen(!isOpen)}
        className="w-full bg-white h-10 border border-gray-300 text-slate-700 text-sm px-3 rounded-lg flex justify-between items-center cursor-pointer hover:border-orange-300 transition"
      >
        <span className={cn("truncate flex-1 font-semibold", !selected && "text-slate-400 font-normal", isAr ? "text-right" : "text-left")}>
          {selected || label}
        </span>
        <ChevronDown size={14} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </div>
      
      {isOpen && (
        <div className="absolute z-[9999] top-full mt-[50px] w-full bg-white border border-gray-300 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[160px]">
          <div className="p-2 border-b border-gray-300 bg-slate-50/50">
            <div className="relative">
              <input 
                type="text" 
                value={search}
                onChange={(e) => React_setSearch(e.target.value)}
                placeholder={isAr ? 'بحث...' : 'Search...'}
                className="w-full bg-white border border-gray-300 rounded-md py-1.5 px-8 text-xs outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
              />
              <Search size={13} className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400", isAr ? "right-2.5" : "left-2.5")} />
            </div>
          </div>
          
          <div className="overflow-y-auto p-1 flex-1">
            {filteredOptions.length > 0 ? filteredOptions.map(opt => (
              <div 
                key={opt}
                onClick={() => { onChange(opt); React_setIsOpen(false); React_setSearch(""); }}
                className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer text-xs font-bold text-slate-700"
              >
                <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center transition-colors", selected === opt ? "border-orange-500" : "border-gray-300 bg-white")}>
                  {selected === opt && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                </div>
                <span>{opt}</span>
              </div>
            )) : (
              <div className="p-3 text-center text-xs text-slate-500">
                {isAr ? 'لا توجد نتائج' : 'No results found'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export function SupplierStatementReportParamsPopup({ lang, products, onClose, onSubmit }: SupplierStatementReportParamsPopupProps) {
  const isAr = lang === 'ar';

  const [selectedSeason, setSelectedSeason] = useState(isAr ? 'كل المواسم' : 'All Seasons');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  
  
  
  
  
  
  

  // Extract unique values from products (if products were real, this would work. Using empty for now or deriving from products)
  const uniqueVals = (key: string) => Array.from(new Set((products || []).map(p => p[key]).filter(Boolean)));
  
  const seasons = [
    isAr ? 'اختيار الكل' : 'Select All',
    'موسم الصيف 2024', 
    'موسم الشتاء 2024', 
    'موسم الربيع 2024'
  ];
  const suppliers = ['الشركة العربية للمنسوجات', 'المصرية للتجارة', 'مصنع النور', 'شركة الامل'];
  
  
  
  
  
  
  

  const handleSubmit = () => {
    onSubmit({
      season: selectedSeason,
      searchTerm: selectedSupplier,
      fromDate,
      toDate
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir={isAr ? 'rtl' : 'ltr'}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-visible flex flex-col max-h-[90vh]"
      >
        <div className="px-5 py-4 bg-[#FF6900] text-white flex items-center justify-between border-b border-orange-600 rounded-t-[12px] h-[76px]">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
               <ArrowRightLeft size={24} className="text-white" />
             </div>
             <div>
               <h2 className="text-lg font-bold">
                 {isAr ? 'ادخل معاملات التقرير' : 'Enter Report Parameters'}
               </h2>
               <p className="text-sm font-medium text-white/90">
                 {isAr ? 'تقرير كشف حساب مورد' : 'Supplier Statement Report'}
               </p>
             </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-black/10 rounded-lg transition cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-visible flex-1">
          {/* Filters */}
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-700 mb-1.5 px-1">
                    {isAr ? 'من تاريخ' : 'From Date'}
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full h-10 bg-white border border-gray-300 rounded-lg text-sm px-3 transition-all outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-700 mb-1.5 px-1">
                    {isAr ? 'الى تاريخ' : 'To Date'}
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full h-10 bg-white border border-gray-300 rounded-lg text-sm px-3 transition-all outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-700 mb-1.5 px-1">
                    {isAr ? 'المورد' : 'Supplier'}
                  </label>
                  <SingleSelect 
                    label={isAr ? 'اختيار اسم المورد ....' : 'Select Supplier Name...'} 
                    options={suppliers} 
                    selected={selectedSupplier} 
                    onChange={setSelectedSupplier} 
                    isAr={isAr} 
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-700 mb-1.5 px-1">
                    {isAr ? 'الموسم' : 'Season'}
                  </label>
                  <SingleSelect 
                    label={isAr ? 'اختر موسم معين ...' : 'Select a specific season...'} 
                    options={seasons} 
                    selected={selectedSeason} 
                    onChange={setSelectedSeason} 
                    isAr={isAr} 
                  />
                </div>
            </div>
            
            
            <p className="text-xs text-slate-500 mt-4 text-center">
              {isAr ? 'سيتم جلب جميع الأصناف التي تتطابق مع الفلاتر المحددة. إذا لم تقم بتحديد خيارات في فلتر معين، سيتم تجاهله.' : 'All items matching the selected filters will be fetched. If no options are selected in a filter, it will be ignored.'}
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-black bg-slate-50 flex items-center justify-between">
          <button 
            onClick={onClose}
            className="flex items-center gap-1.5 px-6 py-2 border border-red-100 text-red-500 bg-red-50/50 hover:bg-red-50 rounded-lg text-[12px] font-bold transition cursor-pointer shadow-sm"
          >
            <span>{isAr ? "الغاء ورجوع" : "Cancel & Return"}</span>
            {isAr ? <ArrowLeft size={14} className="opacity-70" /> : <ArrowRight size={14} className="opacity-70" />}
          </button>
          <button 
            onClick={handleSubmit}
            className="px-8 py-2 bg-[#FF6900] hover:bg-[#e05d00] text-white font-black rounded-[8px] text-[13px] shadow-md transition-colors"
          >
            {isAr ? 'استعراض' : 'Review'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
