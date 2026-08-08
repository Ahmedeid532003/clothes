import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, ArrowLeft, ArrowRight, Search, FileBarChart2, Calendar, Package, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { MultiSelect } from './BulkPriceModificationPopup';

interface PurchaseReportParamsPopupProps {
  lang: 'ar' | 'en';
  reportTitle: string;
  onClose: () => void;
  onSubmit: (params: any) => void;
  products?: any[];
}

export function PurchaseReportParamsPopup({ lang, reportTitle, onClose, onSubmit, products = [] }: PurchaseReportParamsPopupProps) {
  const isAr = lang === 'ar';

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedSeason, setSelectedSeason] = useState<string[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string[]>([]);
  const [selectedItemSubgroup, setSelectedItemSubgroup] = useState<string[]>([]);

  // Search state for product
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const productDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products.slice(0, 50);
    const s = productSearch.toLowerCase();
    return products.filter(p => 
      (p.name && p.name.toLowerCase().includes(s)) ||
      (p.nameAr && p.nameAr.toLowerCase().includes(s)) ||
      (p.nameEn && p.nameEn.toLowerCase().includes(s)) ||
      (p.code && p.code.toLowerCase().includes(s)) ||
      (p.barcode && p.barcode.toLowerCase().includes(s))
    ).slice(0, 50);
  }, [products, productSearch]);

  const handleSubmit = () => {
    onSubmit({
      fromDate,
      toDate,
      product: selectedProduct,
      seasons: selectedSeason,
      divisions: selectedDivision,
      groups: selectedGroup,
      brands: selectedBrand,
      locations: selectedLocation,
      itemSubgroups: selectedItemSubgroup
    });
  };

  // Mock data for filters if products are empty (since we might not have them yet)
  const getOptions = (key: string) => Array.from(new Set(products.map(p => p[key]).filter(Boolean)));
  
  const seasons = getOptions('season');
  const divisions = getOptions('division');
  const groups = getOptions('group');
  const brands = getOptions('brand');
  const locations = getOptions('location');
  const items = getOptions('item');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir={isAr ? 'rtl' : 'ltr'}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#FF6900] text-white flex items-center justify-between border-b border-orange-600 rounded-t-[12px] h-[76px]">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
               <FileBarChart2 size={24} className="text-white" />
             </div>
             <div>
               <h2 className="text-lg font-bold">
                 {reportTitle}
               </h2>
               <p className="text-sm font-medium text-white/90">
                 {isAr ? 'ادخل معاملات التقرير' : 'Enter Report Parameters'}
               </p>
             </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-black/10 rounded-lg transition cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Row 1: Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block px-1">
                {isAr ? 'من تاريخ' : 'From Date'}
              </label>
              <div className="relative">
                <input 
                  type="date" 
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-300 rounded-lg py-2 px-3 text-xs outline-none focus:border-orange-400 font-bold"
                />
                <Calendar size={14} className="absolute top-1/2 -translate-y-1/2 left-3 rtl:left-auto rtl:right-3 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block px-1">
                {isAr ? 'إلى تاريخ' : 'To Date'}
              </label>
              <div className="relative">
                <input 
                  type="date" 
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-300 rounded-lg py-2 px-3 text-xs outline-none focus:border-orange-400 font-bold"
                />
                <Calendar size={14} className="absolute top-1/2 -translate-y-1/2 left-3 rtl:left-auto rtl:right-3 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Row 2: Select Item (Full Width) */}
          <div className="space-y-1" ref={productDropdownRef}>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block px-1">
              {isAr ? 'اختر صنف معين' : 'Select Specific Item'}
            </label>
            <div className="relative">
              <div 
                onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                className="w-full bg-slate-50 border border-gray-300 rounded-lg py-2 px-3 text-xs flex justify-between items-center cursor-pointer hover:border-orange-300 transition h-[38px]"
              >
                <div className="flex items-center gap-2 truncate">
                  <Package size={14} className="text-slate-400" />
                  <span className={cn("font-bold truncate", !selectedProduct ? "text-slate-400" : "text-slate-700")}>
                    {selectedProduct 
                      ? (isAr ? (selectedProduct.nameAr || selectedProduct.name) : (selectedProduct.nameEn || selectedProduct.name))
                      : (isAr ? 'البحث بالاسم والموديل والباركود...' : 'Search by name, model, barcode...')}
                  </span>
                </div>
                <ChevronDown size={14} className={cn("text-slate-400 transition-transform", isProductDropdownOpen && "rotate-180")} />
              </div>

              <AnimatePresence>
                {isProductDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute z-[110] mt-1 w-full bg-white border border-gray-300 rounded-xl shadow-xl overflow-hidden flex flex-col"
                  >
                    <div className="p-2 bg-slate-50 border-b border-gray-200">
                      <div className="relative">
                        <input 
                          type="text" 
                          autoFocus
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder={isAr ? 'ابحث بالاسم أو الكود أو الباركود...' : 'Search by name, code or barcode...'}
                          className="w-full bg-white border border-gray-300 rounded-lg py-1.5 px-8 text-xs outline-none focus:border-orange-400"
                        />
                        <Search size={14} className="absolute top-1/2 -translate-y-1/2 left-2.5 rtl:left-auto rtl:right-2.5 text-slate-400" />
                      </div>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((p) => (
                          <div 
                            key={p.id}
                            onClick={() => {
                              setSelectedProduct(p);
                              setIsProductDropdownOpen(false);
                            }}
                            className="p-2 hover:bg-orange-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                          >
                            <div className="text-[12px] font-bold text-slate-700">{isAr ? (p.nameAr || p.name) : (p.nameEn || p.name)}</div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                              <span>{p.code}</span>
                              {p.barcode && <span>• {p.barcode}</span>}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-slate-400 text-xs">{isAr ? 'لا توجد نتائج' : 'No results found'}</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Grid Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MultiSelect label={isAr ? 'اختر الموسم' : 'Select Season'} options={seasons} selected={selectedSeason} onChange={setSelectedSeason} isAr={isAr} />
            <MultiSelect label={isAr ? 'اختر القسم' : 'Select Division'} options={divisions} selected={selectedDivision} onChange={setSelectedDivision} isAr={isAr} />
            <MultiSelect label={isAr ? 'اختر مجموعة الصنف' : 'Select Group'} options={groups} selected={selectedGroup} onChange={setSelectedGroup} isAr={isAr} />
            <MultiSelect label={isAr ? 'اختر البراند' : 'Select Brand'} options={brands} selected={selectedBrand} onChange={setSelectedBrand} isAr={isAr} />
            <MultiSelect label={isAr ? 'اختر مكان الصنف' : 'Select Item Location'} options={locations} selected={selectedLocation} onChange={setSelectedLocation} isAr={isAr} />
            <MultiSelect label={isAr ? 'اختر بند الصنف' : 'Select Sub-group'} options={items} selected={selectedItemSubgroup} onChange={setSelectedItemSubgroup} isAr={isAr} />
          </div>

          <p className="text-[11px] text-slate-400 font-medium text-center py-2">
            {isAr ? 'سيتم جلب جميع الأصناف التي تتطابق مع الفلاتر المحددة. إذا لم تقم بتحديد خيارات في فلتر معين، سيتم تجاهله.' : 'All items matching the selected filters will be fetched. If no options are selected in a filter, it will be ignored.'}
          </p>
        </div>

        {/* Footer: Cancel left, Show right (physical) even in RTL pages */}
        <div className="px-6 py-4 bg-slate-50 border-t border-gray-200 flex items-center justify-between" dir="ltr">
          <button 
            onClick={onClose}
            className="flex items-center gap-1.5 px-6 py-2 border border-red-100 text-red-500 bg-red-50/50 hover:bg-red-50 rounded-lg text-[12px] font-bold transition cursor-pointer shadow-sm"
          >
            {isAr ? <ArrowLeft size={14} className="opacity-70" /> : <ArrowRight size={14} className="opacity-70" />}
            <span>{isAr ? "الغاء ورجوع" : "Cancel & Return"}</span>
          </button>
          <button 
            onClick={handleSubmit}
            className="px-10 py-2 bg-[#FF6900] hover:bg-[#e05d00] text-white font-black rounded-[8px] text-[13px] shadow-md transition-all active:scale-95"
          >
            {isAr ? 'عرض' : 'Show'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
