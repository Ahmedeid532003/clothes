import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Search, Check, ChevronDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  isAr: boolean;
}

export function MultiSelect({ label, options, selected, onChange, isAr }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  const handleToggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(item => item !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const handleSelectAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg p-2.5 flex justify-between items-center cursor-pointer hover:border-orange-300 transition"
      >
        <span className="truncate flex-1 text-right rtl:text-right font-bold">
          {selected.length === 0 ? label : `${label} (${selected.length})`}
        </span>
        <ChevronDown size={14} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-64"
          >
            <div className="p-2 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <input 
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={isAr ? 'بحث...' : 'Search...'}
                  className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-8 text-xs outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                />
                <Search size={13} className="absolute top-1/2 -translate-y-1/2 left-2.5 text-slate-400" />
              </div>
            </div>
            
            <div className="overflow-y-auto p-1 flex-1">
              {options.length > 0 && (
                <div 
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer text-xs font-bold text-slate-700"
                >
                  <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors", selected.length === options.length ? "bg-orange-500 border-orange-500" : "border-slate-300 bg-white")}>
                    {selected.length === options.length && <Check size={10} className="text-white" />}
                  </div>
                  <span>{isAr ? 'تحديد الكل' : 'Select All'}</span>
                </div>
              )}
              
              {filteredOptions.length > 0 ? filteredOptions.map(opt => (
                <div 
                  key={opt}
                  onClick={() => handleToggle(opt)}
                  className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer text-xs font-bold text-slate-700"
                >
                  <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors", selected.includes(opt) ? "bg-orange-500 border-orange-500" : "border-slate-300 bg-white")}>
                    {selected.includes(opt) && <Check size={10} className="text-white" />}
                  </div>
                  <span>{opt}</span>
                </div>
              )) : (
                <div className="p-4 text-center text-xs text-slate-400">
                  {isAr ? 'لا توجد نتائج' : 'No results'}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface BulkPriceModificationPopupProps {
  lang: 'en' | 'ar';
  products: any[];
  onClose: () => void;
  onReview: (settings: any) => void;
}

export default function BulkPriceModificationPopup({ lang, products, onClose, onReview }: BulkPriceModificationPopupProps) {
  const isAr = lang === 'ar';
  
  const [modType, setModType] = useState<'increase' | 'decrease'>('increase');
  const [calcMethod, setCalcMethod] = useState<'value' | 'percentage'>('value');
  const [modValue, setModValue] = useState("");
  
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  // Extract unique values from products
  const uniqueVals = (key: string) => Array.from(new Set(products.map(p => p[key]).filter(Boolean)));
  
  const suppliers = uniqueVals('supplier');
  const departments = uniqueVals('department');
  const seasons = uniqueVals('season');
  const brands = uniqueVals('brand');
  const categories = uniqueVals('category');
  const subcategories = uniqueVals('subcategory');
  const locations = uniqueVals('location');

  const handleReview = () => {
    onReview({
      modType,
      calcMethod,
      modValue: Number(modValue) || 0,
      filters: {
        suppliers: selectedSuppliers,
        departments: selectedDepartments,
        seasons: selectedSeasons,
        brands: selectedBrands,
        categories: selectedCategories,
        subcategories: selectedSubcategories,
        locations: selectedLocations
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir={isAr ? 'rtl' : 'ltr'}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-4 border-b border-orange-600 bg-orange-500">
          <h2 className="text-lg font-black text-white">
            {isAr ? 'إنشاء تعديل أسعار مجمع' : 'Create Bulk Price Modification'}
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 border border-white/30 text-white hover:bg-white/30 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Header Controls (Mod Type, Calc Method, Value) */}
          <div className="flex flex-col md:flex-row items-stretch md:items-start gap-4 flex-1 w-full mt-4">
            <div className="flex flex-col border border-[#e5ebf2] rounded-lg p-2 bg-white relative pt-3.5 w-full md:w-auto flex-none md:-me-2 md:pe-2" style={{ height: 92, minWidth: isAr ? 161 : 140 }}>
              <span className="absolute -top-2.5 rtl:right-2 rtl:left-auto ltr:left-2 bg-white px-1.5 text-[13px] font-bold text-slate-700 whitespace-nowrap">{isAr ? "نوع التعديل" : "Modification Type"}</span>
              <div className="flex flex-col gap-1.5 mt-1">
                <label onClick={() => setModType('increase')} className={cn("flex items-center justify-between gap-2 py-1 px-2 border rounded cursor-pointer transition w-full", modType === 'increase' ? "border-orange-500 bg-orange-50/50" : "border-slate-200 bg-white hover:border-slate-300")} style={{ minWidth: isAr ? 143 : 122 }}>
                  <span className={cn("text-[12px] leading-4 font-bold", modType === 'increase' ? "text-slate-800" : "text-slate-600")}>{isAr ? "زياده قيمه الاسعار" : "Increase Price"}</span>
                  <div className={cn("w-3.5 h-3.5 rounded-sm flex items-center justify-center border transition-colors shrink-0", modType === 'increase' ? "bg-orange-500 border-orange-500 text-white" : "border-slate-300 bg-white")}>
                    {modType === 'increase' && <Check size={10} strokeWidth={4} />}
                  </div>
                </label>
                <label onClick={() => setModType('decrease')} className={cn("flex items-center justify-between gap-2 py-1 px-2 border rounded cursor-pointer transition w-full", modType === 'decrease' ? "border-orange-500 bg-orange-50/50" : "border-slate-200 bg-white hover:border-slate-300")} style={{ minWidth: isAr ? 143 : 122 }}>
                  <span className={cn("text-[12px] leading-4 font-bold", modType === 'decrease' ? "text-slate-800" : "text-slate-600")}>{isAr ? "خفض قيمه الاسعار" : "Decrease Price"}</span>
                  <div className={cn("w-3.5 h-3.5 rounded-sm flex items-center justify-center border transition-colors shrink-0", modType === 'decrease' ? "bg-orange-500 border-orange-500 text-white" : "border-slate-300 bg-white")}>
                    {modType === 'decrease' && <Check size={10} strokeWidth={4} />}
                  </div>
                </label>
              </div>
            </div>
            
            <div className="flex flex-col border border-[#e5ebf2] rounded-lg p-2 bg-white relative pt-3.5 w-full md:w-auto flex-none" style={{ height: 92, minWidth: isAr ? 146 : 137 }}>
              <span className="absolute -top-2.5 rtl:right-2 rtl:left-auto ltr:left-2 bg-white px-1.5 text-[13px] font-bold text-slate-700 whitespace-nowrap">{isAr ? "طريقه حساب التعديل" : "Calculation Method"}</span>
              <div className="flex flex-col gap-1.5 mt-1">
                <label onClick={() => setCalcMethod('value')} className={cn("flex items-center justify-between gap-2 py-1 px-2 border rounded cursor-pointer transition w-full", calcMethod === 'value' ? "border-orange-500 bg-orange-50/50" : "border-slate-200 bg-white hover:border-slate-300")} style={{ minWidth: isAr ? 124 : 111 }}>
                  <span className={cn("text-[12px] leading-4 font-bold", calcMethod === 'value' ? "text-slate-800" : "text-slate-600")}>{isAr ? "قيمه $" : "Value $"}</span>
                  <div className={cn("w-3.5 h-3.5 rounded-sm flex items-center justify-center border transition-colors shrink-0", calcMethod === 'value' ? "bg-orange-500 border-orange-500 text-white" : "border-slate-300 bg-white")}>
                    {calcMethod === 'value' && <Check size={10} strokeWidth={4} />}
                  </div>
                </label>
                <label onClick={() => setCalcMethod('percentage')} className={cn("flex items-center justify-between gap-2 py-1 px-2 border rounded cursor-pointer transition w-full", calcMethod === 'percentage' ? "border-orange-500 bg-orange-50/50" : "border-slate-200 bg-white hover:border-slate-300")} style={{ minWidth: isAr ? 124 : 114 }}>
                  <span className={cn("text-[12px] leading-4 font-bold", calcMethod === 'percentage' ? "text-slate-800" : "text-slate-600")}>{isAr ? "نسبه %" : "Percentage %"}</span>
                  <div className={cn("w-3.5 h-3.5 rounded-sm flex items-center justify-center border transition-colors shrink-0", calcMethod === 'percentage' ? "bg-orange-500 border-orange-500 text-white" : "border-slate-300 bg-white")}>
                    {calcMethod === 'percentage' && <Check size={10} strokeWidth={4} />}
                  </div>
                </label>
              </div>
            </div>

            <div className="relative flex flex-col gap-1 w-full md:flex-1 md:max-w-xl md:mt-[37px]">
              <label className="text-[12px] font-bold text-[#141415]">{isAr ? "قيمة التعديل" : "Adjustment Value"}</label>
              <div className="relative text-[#111212]">
                <input 
                  type="number" 
                  value={modValue}
                  onChange={(e) => setModValue(e.target.value)}
                  placeholder="0.00"
                  className="w-full md:w-[237px] bg-white border border-slate-200 text-slate-800 text-sm font-black rounded-lg focus:ring-orange-500 focus:border-orange-500 block h-[36px] px-3 outline-none"
                />
                <div className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 flex items-center pr-3 rtl:pr-0 rtl:pl-3 pointer-events-none md:w-[237px] justify-end">
                  <span className="text-slate-400 font-bold text-xs">{calcMethod === 'percentage' ? '%' : (isAr ? 'ر.س' : 'SAR')}</span>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />
          
          {/* Filters */}
          <div>
            <h3 className="text-sm font-black text-slate-800 mb-4">{isAr ? 'فلاتر المنتجات' : 'Product Filters'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MultiSelect label={isAr ? 'اختر المورد' : 'Select Supplier'} options={suppliers} selected={selectedSuppliers} onChange={setSelectedSuppliers} isAr={isAr} />
              <MultiSelect label={isAr ? 'اختر القسم' : 'Select Department'} options={departments} selected={selectedDepartments} onChange={setSelectedDepartments} isAr={isAr} />
              <MultiSelect label={isAr ? 'اختر الموسم' : 'Select Season'} options={seasons} selected={selectedSeasons} onChange={setSelectedSeasons} isAr={isAr} />
              <MultiSelect label={isAr ? 'اختر البراند' : 'Select Brand'} options={brands} selected={selectedBrands} onChange={setSelectedBrands} isAr={isAr} />
              <MultiSelect label={isAr ? 'اختر مجموعة الصنف' : 'Select Category'} options={categories} selected={selectedCategories} onChange={setSelectedCategories} isAr={isAr} />
              <MultiSelect label={isAr ? 'اختر بند الصنف' : 'Select Subcategory'} options={subcategories} selected={selectedSubcategories} onChange={setSelectedSubcategories} isAr={isAr} />
              <MultiSelect label={isAr ? 'اختر مكان الصنف' : 'Select Location'} options={locations} selected={selectedLocations} onChange={setSelectedLocations} isAr={isAr} />
            </div>
            <p className="text-xs text-slate-500 mt-4 text-center">
              {isAr ? 'سيتم جلب جميع الأصناف التي تتطابق مع الفلاتر المحددة. إذا لم تقم بتحديد خيارات في فلتر معين، سيتم تجاهله.' : 'All items matching the selected filters will be fetched. If no options are selected in a filter, it will be ignored.'}
            </p>
          </div>

        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button 
            onClick={onClose}
            className="flex items-center gap-1.5 px-6 py-2 border border-red-100 text-red-500 bg-red-50/50 hover:bg-red-50 rounded-lg text-[12px] font-bold transition cursor-pointer shadow-sm"
          >
            <span>{isAr ? "الغاء ورجوع" : "Cancel & Return"}</span>
            {isAr ? <ArrowLeft size={14} className="opacity-70" /> : <ArrowRight size={14} className="opacity-70" />}
          </button>
          <button 
            onClick={handleReview}
            disabled={!modValue || Number(modValue) <= 0}
            className="px-8 py-2 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-lg text-[13px] shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAr ? 'استعراض' : 'Review'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
