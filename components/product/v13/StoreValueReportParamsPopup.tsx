import React, { useState } from 'react';
import { X, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { MultiSelect } from './BulkPriceModificationPopup';

interface StoreValueReportParamsPopupProps {
  lang: 'ar' | 'en';
  products: any[];
  onClose: () => void;
  onSubmit: (params: any) => void;
}

export function StoreValueReportParamsPopup({ lang, products, onClose, onSubmit }: StoreValueReportParamsPopupProps) {
  const isAr = lang === 'ar';

  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  // Extract unique values from products (if products were real, this would work. Using empty for now or deriving from products)
  const uniqueVals = (key: string) => Array.from(new Set((products || []).map(p => p[key]).filter(Boolean)));
  
  const suppliers = uniqueVals('supplier');
  const departments = uniqueVals('department');
  const seasons = uniqueVals('season');
  const brands = uniqueVals('brand');
  const categories = uniqueVals('category');
  const subcategories = uniqueVals('subcategory');
  const locations = uniqueVals('location');

  const handleSubmit = () => {
    onSubmit({
      suppliers: selectedSuppliers,
      departments: selectedDepartments,
      seasons: selectedSeasons,
      brands: selectedBrands,
      categories: selectedCategories,
      subcategories: selectedSubcategories,
      locations: selectedLocations
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir={isAr ? 'rtl' : 'ltr'}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-5 py-4 bg-[#FF6900] text-white flex items-center justify-between border-b border-orange-600 rounded-t-[12px]">
          <h2 className="text-lg font-bold">
            {isAr ? 'ادخل معاملات التقرير' : 'Enter Report Parameters'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-black/10 rounded-lg transition cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
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
