import React, { useState, useMemo, useEffect } from 'react';
import {
  GripVertical, 
  Search, 
  Filter, 
  Settings, 
  List, 
  Eye, 
  Edit2, 
  Trash2, 
  Grid, 
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ProductsListContainerProps {
  initialViewMode?: 'table' | 'kanban';
  defaultVisibleColumns?: Record<string, boolean>;
  customColumnLabels?: Record<string, { en: string; ar: string }>;
  lang: 'ar' | 'en';
  filteredProducts: any[];
  richProducts: any[];
  brands: any[];
  groups: any[];
  colors: any[];
  sizes: any[];
  divisions?: any[];
  items?: any[];
  setViewingProduct: (p: any) => void;
  openEditProductModal: (p: any) => void;
  handleDeleteProduct: (id: string) => void;
  triggerToast: (msg: string) => void;
  prodSearchQuery: string;
  setProdSearchQuery: (q: string) => void;
  isColumnFiltersOpen: boolean;
  setIsColumnFiltersOpen: (open: boolean) => void;
  extraToolbarAction?: React.ReactNode;
  extraRowActions?: (p: any) => React.ReactNode;
  nameFirst?: boolean;
  advCode: string;
  setAdvCode: (v: string) => void;
  advBarcode: string;
  setAdvBarcode: (v: string) => void;
  advBrandId: string;
  setAdvBrandId: (v: string) => void;
  advGroupId: string;
  setAdvGroupId: (v: string) => void;
  advColorId: string;
  setAdvColorId: (v: string) => void;
  advSizeId: string;
  setAdvSizeId: (v: string) => void;
  advDivisionId: string;
  setAdvDivisionId: (v: string) => void;
  advItemId: string;
  setAdvItemId: (v: string) => void;
  advSupplierName: string;
  setAdvSupplierName: (v: string) => void;
}

export const ProductsListContainer: React.FC<ProductsListContainerProps> = ({
  lang,
  filteredProducts,
  richProducts,
  brands,
  groups,
  colors,
  sizes,
  divisions,
  items,
  setViewingProduct,
  openEditProductModal,
  handleDeleteProduct,
  triggerToast,
  prodSearchQuery,
  setProdSearchQuery,
  isColumnFiltersOpen,
  setIsColumnFiltersOpen,
  extraToolbarAction,
  extraRowActions,
  nameFirst = false,
  advCode,
  setAdvCode,
  advBarcode,
  setAdvBarcode,
  advBrandId,
  setAdvBrandId,
  advGroupId,
  setAdvGroupId,
  advColorId,
  setAdvColorId,
  advSizeId,
  setAdvSizeId,
  advDivisionId,
  setAdvDivisionId,
  advItemId,
  setAdvItemId,
  advSupplierName,
  setAdvSupplierName,
  defaultVisibleColumns,
  customColumnLabels,
  initialViewMode = 'table'
}) => {
  // View states
  const [dirViewMode, setDirViewMode] = useState<'table' | 'kanban'>(initialViewMode);
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  
  // Pagination states
  const [prodCurrentPage, setProdCurrentPage] = useState(1);
  const [prodPageSize, setProdPageSize] = useState(5);

  // Column visibility states
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(defaultVisibleColumns || {
    code: true,
    barcode: true,
    name: true,
    brand: false,
    group: false,
    color: false,
    size: false,
    division: true,
    item: false,
    costPrice: true,
    profitMargin: true,
    sellPrice: true,
    promoPrice: false,
    supplierName: true,
    reorderPoint: true
  });

  const [tempVisibleColumns, setTempVisibleColumns] = useState<Record<string, boolean>>({ ...visibleColumns });

  // Re-sync if defaultVisibleColumns changes
  useEffect(() => {
    if (defaultVisibleColumns) {
      setVisibleColumns(defaultVisibleColumns);
      setTempVisibleColumns(defaultVisibleColumns);
    }
  }, [JSON.stringify(defaultVisibleColumns)]);

  // Reset pagination when filters or searches change
  useEffect(() => {
    setProdCurrentPage(1);
  }, [prodSearchQuery, filteredProducts.length]);

  // Pagination calculation
  const totalProdPages = Math.ceil(filteredProducts.length / prodPageSize) || 1;
  const activeProdPage = Math.min(prodCurrentPage, totalProdPages);
  const prodStartIndex = (activeProdPage - 1) * prodPageSize;
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(prodStartIndex, prodStartIndex + prodPageSize);
  }, [filteredProducts, prodStartIndex, prodPageSize]);

  return (
    <div className="space-y-6 min-h-fit">
      {/* VIEW 1: DESKTOP CONTAINER (Visible on md and larger) */}
      <div className="hidden md:block bg-white border border-gray-300 rounded-lg overflow-visible shadow-sm relative pt-[13px] mt-[0px] mb-[0px] min-h-fit -mx-[8px]">
        {/* Toolbar bar */}
        <div className="p-[5px] mt-[-13px] h-[43px] border-b border-[#eaeff2] bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 w-full rounded-t-lg">
          
          {/* Right Actions (Visually on the Right in RTL, so First in DOM) */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => { setTempVisibleColumns({ ...visibleColumns }); setColumnSettingsOpen(!columnSettingsOpen); }} className="w-[32px] h-[32px] flex items-center justify-center text-orange-500 bg-white border border-gray-300 hover:border-orange-400 hover:bg-orange-50 rounded-lg shadow-sm transition-all cursor-pointer active:scale-95 shrink-0" title={lang === 'ar' ? 'تخصيص الأعمدة' : 'Columns'}>
                <Settings size={15} />
              </button>
                            {columnSettingsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setColumnSettingsOpen(false)} />
                  <div className="absolute left-0 rtl:left-auto rtl:right-0 mt-2 w-48 bg-white rounded-lg border border-gray-300 shadow-2xl z-50 overflow-visible">
                    <div className="px-3 py-2 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-lg rtl:flex-row-reverse">
                      <button onClick={() => setColumnSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={12} />
                      </button>
                      <h4 className="font-bold text-[#1e293b] text-[11px]">
                        {lang === 'ar' ? 'اختر الأعمدة' : 'Choose Columns'}
                      </h4>
                    </div>
                    <div className="p-1.5 space-y-0 max-h-72 overflow-y-auto custom-scrollbar text-start rtl:text-right bg-white">
                      {(Object.entries(customColumnLabels || {
                        code: { en: 'Product Code', ar: 'كود الصنف' },
                        barcode: { en: 'Barcode', ar: 'الباركود العالمي' },
                        name: { en: 'Item Description', ar: 'اسم ووصف الصنف' },
                        brand: { en: 'Brand Label', ar: 'البراند / العلامة' },
                        group: { en: 'Group Collection', ar: 'مجموعة الصنف' },
                        color: { en: 'Color Hue', ar: 'اللون والدرجة' },
                        size: { en: 'Size Class', ar: 'المقاس الحالي' },
                        division: { en: 'Division Dept', ar: 'القسم الرئيسي' },
                        item: { en: 'Apparel Category', ar: 'نوع البند' },
                        costPrice: { en: 'Purchase Price', ar: 'سعر الشراء' },
                        profitMargin: { en: 'Profit Margin %', ar: 'نسبة الأرباح %' },
                        sellPrice: { en: 'Selling Price', ar: 'سعر البيع للجمهور' },
                        promoPrice: { en: 'Seasonal Offer / Sale', ar: 'العرض الأوكازيون' },
                        supplierName: { en: 'Supplier', ar: 'اسم الشركة الموردة' },
                        reorderPoint: { en: 'Reorder Buffer Limit', ar: 'حد طلب الأمان' }
                      }) as [string, { en: string, ar: string }][]).map(([key, value]) => (
                        <label key={key} className="flex items-center gap-3 hover:bg-slate-50 p-1.5 rounded-md cursor-pointer select-none group transition-colors">
                          <GripVertical size={12} className="text-gray-400 shrink-0" />
                          <div className="relative flex items-center justify-center shrink-0">
                              <input 
                                type="checkbox"
                                checked={tempVisibleColumns[key] ?? false}
                                onChange={(e) => setTempVisibleColumns({ ...tempVisibleColumns, [key]: e.target.checked })}
                                className="peer h-[14px] w-[14px] cursor-pointer appearance-none rounded-[4px] border-2 border-gray-300 bg-white checked:border-[#2563eb] checked:bg-[#2563eb] transition-all"
                              />
                              <svg className="pointer-events-none absolute h-2.5 w-2.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <span className="text-[#334155] font-bold text-[10px] transition-colors flex-1">{lang === 'ar' ? value.ar : value.en}</span>
                        </label>
                      ))}
                    </div>
                    <div className="p-2 border-t border-gray-200 flex items-center justify-between gap-2 bg-white rounded-b-lg">
                      <button 
                        onClick={() => {
                          setTempVisibleColumns({ ...visibleColumns });
                        }}
                        className="px-2.5 py-1 bg-white border border-gray-300 hover:bg-gray-50 text-slate-700 rounded-lg text-[10px] font-bold transition-all"
                      >
                        {lang === 'ar' ? 'إعادة' : 'Reset'}
                      </button>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setColumnSettingsOpen(false)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all"
                        >
                          {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button 
                          onClick={() => {
                            setVisibleColumns({ ...tempVisibleColumns });
                            setColumnSettingsOpen(false);
                            
                          }}
                          className="px-2.5 py-1 bg-[#2563eb] hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm active:scale-95"
                        >
                          {lang === 'ar' ? 'تطبيق' : 'Apply'}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {extraToolbarAction && (
              <div className="flex items-center">
                {extraToolbarAction}
              </div>
            )}
            <button onClick={() => setDirViewMode(dirViewMode === 'table' ? 'kanban' : 'table')} className="h-[32px] px-3 flex items-center justify-center gap-1.5 bg-white border border-gray-300 rounded-[8px] hover:border-orange-400 hover:text-orange-500 text-slate-650 hover:shadow-xs transition cursor-pointer select-none font-black text-[11px]" title={lang === 'ar' ? 'تبديل العرض' : 'Toggle View'}>
              {dirViewMode === 'table' ? (
                <>
                  <Grid size={14} className="text-orange-500" />
                  <span>{lang === 'ar' ? 'بطاقات' : 'Cards'}</span>
                </>
              ) : (
                <>
                  <List size={14} className="text-orange-500" />
                  <span>{lang === 'ar' ? 'جدول' : 'Table'}</span>
                </>
              )}
            </button>
          </div>

          {/* Search / Filter Left side (Visually on the Left in RTL, so Last in DOM) */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1 max-w-md justify-end">
            <button onClick={() => setIsColumnFiltersOpen(!isColumnFiltersOpen)} className={cn("w-[32px] h-[32px] flex items-center justify-center rounded-[8px] border transition cursor-pointer select-none", isColumnFiltersOpen ? "bg-[#0a1945] text-white border-[#0a1945]" : "bg-white text-orange-500 border-gray-300 hover:border-orange-400")} title={lang === 'ar' ? 'بحث متقدم' : 'Advanced Search'}>
              <Filter size={15} />
            </button>
            <div className="relative flex-1 flex items-center max-w-[300px]">
              <Search size={14} className="absolute left-3 rtl:right-3 rtl:left-auto text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={prodSearchQuery}
                onChange={(e) => {
                  setProdSearchQuery(e.target.value);
                  setProdCurrentPage(1);
                }}
                placeholder={lang === 'ar' ? "البحث بالاسم، الكود، الباركود..." : "Search by name, SKU..."}
                className="w-full text-xs p-2 pl-8 pr-8 rtl:pr-8 rtl:pl-8 bg-white border border-gray-300 rounded-[8px] outline-none focus:border-orange-400 transition h-[32px]"
              />
              {prodSearchQuery && (
                <button onClick={() => { setProdSearchQuery(''); setProdCurrentPage(1); }} className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-orange-500 rounded-lg hover:bg-slate-100 transition cursor-pointer">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Display (Table or Cards) */}
        {dirViewMode === 'table' ? (
          <div className="overflow-x-auto relative bg-white">
            <table className="w-full text-left rtl:text-right border-collapse text-xs font-bold text-slate-700">
              <thead className="sticky top-0 z-30 bg-orange-500 text-white select-none">
                <tr className="bg-[#f06424] text-white font-extrabold border-b border-orange-600">
                  {nameFirst && visibleColumns.name && <th className="p-3.5 h-[35.5px] min-w-[185px]">{customColumnLabels?.['name']?.[lang] || (lang === 'ar' ? 'اسم ووصف الصنف' : 'Item Description')}</th>}
                  {visibleColumns.code && <th className="p-3.5 h-[35.5px] text-center">{customColumnLabels?.['code']?.[lang] || (lang === 'ar' ? 'الكود' : 'SKU Code')}</th>}
                  {visibleColumns.barcode && <th className="p-3.5 h-[35.5px] text-center">{customColumnLabels?.['barcode']?.[lang] || (lang === 'ar' ? 'الباركود' : 'Barcode')}</th>}
                  {!nameFirst && visibleColumns.name && <th className="p-3.5 h-[35.5px] min-w-[185px]">{customColumnLabels?.['name']?.[lang] || (lang === 'ar' ? 'اسم ووصف الصنف' : 'Item Description')}</th>}
                  {visibleColumns.brand && <th className="p-3.5 h-[35.5px] text-center">{customColumnLabels?.['brand']?.[lang] || (lang === 'ar' ? 'البراند' : 'Brand')}</th>}
                  {visibleColumns.group && <th className="p-3.5 h-[35.5px] text-center">{customColumnLabels?.['group']?.[lang] || (lang === 'ar' ? 'المجموعة' : 'Group')}</th>}
                  {visibleColumns.color && <th className="p-3.5 h-[35.5px] text-center">{customColumnLabels?.['color']?.[lang] || (lang === 'ar' ? 'اللون' : 'Color')}</th>}
                  {visibleColumns.size && <th className="p-3.5 h-[35.5px] text-center">{customColumnLabels?.['size']?.[lang] || (lang === 'ar' ? 'المقاس' : 'Size')}</th>}
                  {visibleColumns.division && <th className="p-3.5 h-[35.5px] text-center">{customColumnLabels?.['division']?.[lang] || (lang === 'ar' ? 'القسم' : 'Division')}</th>}
                  {visibleColumns.item && <th className="p-3.5 h-[35.5px] text-center">{customColumnLabels?.['item']?.[lang] || (lang === 'ar' ? 'البند' : 'Item')}</th>}
                  {visibleColumns.costPrice && <th className="p-3.5 h-[35.5px] text-center">{customColumnLabels?.['costPrice']?.[lang] || (lang === 'ar' ? 'سعر الشراء' : 'Purchase Cost')}</th>}
                  {visibleColumns.profitMargin && <th className="p-3.5 h-[35.5px] text-center">{customColumnLabels?.['profitMargin']?.[lang] || (lang === 'ar' ? 'نسبة الأرباح %' : 'Profit Margin')}</th>}
                  {visibleColumns.sellPrice && <th className="p-3.5 h-[35.5px] text-center">{customColumnLabels?.['sellPrice']?.[lang] || (lang === 'ar' ? 'سعر البيع' : 'Sell Price')}</th>}
                  {visibleColumns.promoPrice && <th className="p-3.5 h-[35.5px] text-center">{customColumnLabels?.['promoPrice']?.[lang] || (lang === 'ar' ? 'الأوكازيون' : 'Promo Sale')}</th>}
                  {visibleColumns.supplierName && <th className="p-3.5 h-[35.5px]">{customColumnLabels?.['supplierName']?.[lang] || (lang === 'ar' ? 'المورد' : 'Supplier')}</th>}
                  {visibleColumns.reorderPoint && <th className="p-3.5 h-[35.5px] text-center">{customColumnLabels?.['reorderPoint']?.[lang] || (lang === 'ar' ? 'حد الطلب' : 'Min Alert')}</th>}
                  <th className="p-3.5 h-[35.5px] text-center min-w-[120px]">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
                {isColumnFiltersOpen && (
                  <tr className="bg-slate-100 border-b border-gray-300 text-slate-700">
                    {nameFirst && visibleColumns.name && (
                      <td className="py-2 px-3 text-center">
                        <div className="text-[10px] text-slate-400 font-bold truncate">
                          {lang === 'ar' ? 'البحث بالاسم مفعل' : 'Search by name'}
                        </div>
                      </td>
                    )}
                    {visibleColumns.code && (
                      <td className="py-2 px-3">
                        <div className="relative">
                          <input
                            type="text"
                            value={advCode}
                            onChange={(e) => setAdvCode(e.target.value)}
                            placeholder={lang === 'ar' ? 'بحث بالكود...' : 'Filter...'}
                            className="w-full text-[10px] p-1.5 px-2 bg-white border border-gray-300 rounded-lg outline-none focus:border-orange-400 font-sans text-center font-bold"
                          />
                          {advCode && (
                            <button onClick={() => setAdvCode('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.barcode && (
                      <td className="py-2 px-3">
                        <div className="relative">
                          <input
                            type="text"
                            value={advBarcode}
                            onChange={(e) => setAdvBarcode(e.target.value)}
                            placeholder={lang === 'ar' ? 'بحث بالباركود...' : 'Filter...'}
                            className="w-full text-[10px] p-1.5 px-2 bg-white border border-gray-300 rounded-lg outline-none focus:border-orange-400 font-sans text-center font-bold"
                          />
                          {advBarcode && (
                            <button onClick={() => setAdvBarcode('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                    {!nameFirst && visibleColumns.name && (
                      <td className="py-2 px-3 text-center">
                        <div className="text-[10px] text-slate-400 font-bold truncate">
                          {lang === 'ar' ? 'البحث بالاسم مفعل' : 'Search by name'}
                        </div>
                      </td>
                    )}
                    {visibleColumns.brand && (
                      <td className="py-2 px-3">
                        <select
                          value={advBrandId}
                          onChange={(e) => setAdvBrandId(e.target.value)}
                          className="w-full text-[10px] p-1 bg-white border border-gray-300 rounded-lg outline-none focus:border-orange-400 font-sans font-bold"
                        >
                          <option value="ALL">{lang === 'ar' ? 'الكل' : 'All'}</option>
                          {brands.map((b) => (
                            <option key={b.id} value={b.id}>{lang === 'ar' ? b.nameAr : b.nameEn}</option>
                          ))}
                        </select>
                      </td>
                    )}
                    {visibleColumns.group && (
                      <td className="py-2 px-3">
                        <select
                          value={advGroupId}
                          onChange={(e) => setAdvGroupId(e.target.value)}
                          className="w-full text-[10px] p-1 bg-white border border-gray-300 rounded-lg outline-none focus:border-orange-400 font-sans font-bold"
                        >
                          <option value="ALL">{lang === 'ar' ? 'الكل' : 'All'}</option>
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>{lang === 'ar' ? g.nameAr : g.nameEn}</option>
                          ))}
                        </select>
                      </td>
                    )}
                    {visibleColumns.color && (
                      <td className="py-2 px-3">
                        <select
                          value={advColorId}
                          onChange={(e) => setAdvColorId(e.target.value)}
                          className="w-full text-[10px] p-1 bg-white border border-gray-300 rounded-lg outline-none focus:border-orange-400 font-sans font-bold"
                        >
                          <option value="ALL">{lang === 'ar' ? 'الكل' : 'All'}</option>
                          {colors.map((c) => (
                            <option key={c.id} value={c.id}>{lang === 'ar' ? c.nameAr : c.nameEn}</option>
                          ))}
                        </select>
                      </td>
                    )}
                    {visibleColumns.size && (
                      <td className="py-2 px-3">
                        <select
                          value={advSizeId}
                          onChange={(e) => setAdvSizeId(e.target.value)}
                          className="w-full text-[10px] p-1 bg-white border border-gray-300 rounded-lg outline-none focus:border-orange-400 font-sans font-bold"
                        >
                          <option value="ALL">{lang === 'ar' ? 'الكل' : 'All'}</option>
                          {sizes.map((s) => (
                            <option key={s.id} value={s.id}>{lang === 'ar' ? s.nameAr : s.nameEn}</option>
                          ))}
                        </select>
                      </td>
                    )}
                    {visibleColumns.division && (
                      <td className="py-2 px-3">
                        <select
                          value={advDivisionId}
                          onChange={(e) => setAdvDivisionId(e.target.value)}
                          className="w-full text-[10px] p-1 bg-white border border-gray-300 rounded-lg outline-none focus:border-orange-400 font-sans font-bold"
                        >
                          <option value="ALL">{lang === 'ar' ? 'الكل' : 'All'}</option>
                          {divisions.map((d) => (
                            <option key={d.id} value={d.id}>{lang === 'ar' ? d.nameAr : d.nameEn}</option>
                          ))}
                        </select>
                      </td>
                    )}
                    {visibleColumns.item && (
                      <td className="py-2 px-3">
                        <select
                          value={advItemId}
                          onChange={(e) => setAdvItemId(e.target.value)}
                          className="w-full text-[10px] p-1 bg-white border border-gray-300 rounded-lg outline-none focus:border-orange-400 font-sans font-bold"
                        >
                          <option value="ALL">{lang === 'ar' ? 'الكل' : 'All'}</option>
                          {items.map((i) => (
                            <option key={i.id} value={i.id}>{lang === 'ar' ? i.nameAr : i.nameEn}</option>
                          ))}
                        </select>
                      </td>
                    )}
                    {visibleColumns.costPrice && <td className="py-2 px-3"></td>}
                    {visibleColumns.profitMargin && <td className="py-2 px-3"></td>}
                    {visibleColumns.sellPrice && <td className="py-2 px-3"></td>}
                    {visibleColumns.promoPrice && <td className="py-2 px-3"></td>}
                    {visibleColumns.supplierName && (
                      <td className="py-2 px-3">
                        <div className="relative">
                          <input
                            type="text"
                            value={advSupplierName}
                            onChange={(e) => setAdvSupplierName(e.target.value)}
                            placeholder={lang === 'ar' ? 'مورد...' : 'Supplier...'}
                            className="w-full text-[10px] p-1.5 px-2 bg-white border border-gray-300 rounded-lg outline-none focus:border-orange-400 font-sans font-bold text-center"
                          />
                          {advSupplierName && (
                            <button onClick={() => setAdvSupplierName('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.reorderPoint && <td className="py-2 px-3"></td>}
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => {
                          setAdvCode('');
                          setAdvBarcode('');
                          setAdvBrandId('ALL');
                          setAdvGroupId('ALL');
                          setAdvColorId('ALL');
                          setAdvSizeId('ALL');
                          setAdvDivisionId('ALL');
                          setAdvItemId('ALL');
                          setAdvSupplierName('');
                        }}
                        title={lang === 'ar' ? 'تصفير الفلاتر' : 'Reset Filters'}
                        className="p-1 px-2 bg-white border border-red-200 hover:border-red-400 text-red-500 rounded-lg hover:bg-red-50 transition text-[10px] font-black cursor-pointer"
                      >
                        {lang === 'ar' ? 'إعادة ضبط' : 'Reset'}
                      </button>
                    </td>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-gray-300 text-[#040466]">
                {paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="p-10 text-center text-slate-400">
                      <AlertTriangle className="mx-auto w-10 h-10 text-amber-500 mb-2" />
                      <p className="font-extrabold">{lang === 'ar' ? 'لا يوجد أية أصناف مطابقة لمعايير البحث' : 'No products matched filters.'}</p>
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((p, index) => {
                    const brand = brands.find(b => b.id === p.brandId);
                    const group = groups.find(g => g.id === p.groupId);
                    const color = colors.find(c => c.id === p.colorId);
                    const size = sizes.find(s => s.id === p.sizeId);
                    const division = divisions.find(d => d.id === p.divisionId);
                    const item = items.find(i => i.id === p.itemId);
                    const pInitialQty = p.initialQty !== undefined ? p.initialQty : p.qty;
                    const pReorderSalePercent = p.reorderSalePercent !== undefined ? p.reorderSalePercent : 50;
                    const soldQty = Math.max(0, pInitialQty - p.qty);
                    const salesPercent = pInitialQty > 0 ? (soldQty / pInitialQty) * 100 : 0;
                    const hasReachedSalePercent = pReorderSalePercent > 0 ? (salesPercent >= pReorderSalePercent) : false;
                    const isBelowReorder = p.qty <= p.reorderPoint || hasReachedSalePercent;
                    return (
                      <tr key={`${p.id}-${index}`} className={cn("hover:bg-slate-50 transition-colors border-b border-gray-300", isBelowReorder && "bg-red-50/20 hover:bg-red-50/30")}>
                        {nameFirst && visibleColumns.name && (
                          <td className="p-3">
                            <div className="text-[#040466] font-extrabold text-[12.5px]">
                              {p.name || (lang === "ar" ? p.nameAr : p.nameEn)}
                            </div>
                            {p.qty !== undefined && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.2 rounded font-bold",
                                p.qty > 15 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                p.qty > 0 ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                "bg-rose-50 text-rose-600 border border-rose-100"
                              )}>
                                {lang === 'ar' ? `مخزون: ${p.qty} قطة` : `Qty: ${p.qty} pcs`}
                              </span>
                              {isBelowReorder && (
                                <span className="bg-rose-100 text-rose-700 text-[9px] px-1.5 py-0.2 rounded font-black border border-rose-200 animate-pulse">
                                  {lang === 'ar' ? 'تحت حد الطلب!' : 'Refill Alert'}
                                </span>
                              )}
                              {pInitialQty > 0 && soldQty > 0 && (
                                <span className="bg-orange-50 text-orange-600 text-[9.5px] px-1.5 py-0.2 rounded font-bold border border-orange-100">
                                  {lang === 'ar' ? `مبيعات: ${Math.round(salesPercent)}%` : `Sales: ${Math.round(salesPercent)}%`}
                                </span>
                              )}
                            </div>
                          )}
                          </td>
                        )}
                        {visibleColumns.code && (
                          <td className="p-3 text-center">
                            <span className="text-[#040466] font-bold text-[12.5px] block text-center">
                              {p.code}
                            </span>
                          </td>
                        )}
                        {visibleColumns.barcode && (
                          <td className="p-3 text-center">
                            <span className="font-mono text-[#040466] tracking-wider text-[11px] block">
                              {p.barcode}
                            </span>
                          </td>
                        )}
                        {!nameFirst && visibleColumns.name && (
                          <td className="p-3">
                            <div className="text-[#040466] font-extrabold text-[12.5px]">
                              {p.name || (lang === "ar" ? p.nameAr : p.nameEn)}
                            </div>
                            {p.qty !== undefined && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.2 rounded font-bold",
                                p.qty > 15 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                p.qty > 0 ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                "bg-rose-50 text-rose-600 border border-rose-100"
                              )}>
                                {lang === 'ar' ? `مخزون: ${p.qty} قطة` : `Qty: ${p.qty} pcs`}
                              </span>
                              {isBelowReorder && (
                                <span className="bg-rose-100 text-rose-700 text-[9px] px-1.5 py-0.2 rounded font-black border border-rose-200 animate-pulse">
                                  {lang === 'ar' ? 'تحت حد الطلب!' : 'Refill Alert'}
                                </span>
                              )}
                              {pInitialQty > 0 && soldQty > 0 && (
                                <span className="bg-orange-50 text-orange-600 text-[9.5px] px-1.5 py-0.2 rounded font-bold border border-orange-100">
                                  {lang === 'ar' ? `مبيعات: ${Math.round(salesPercent)}%` : `Sales: ${Math.round(salesPercent)}%`}
                                </span>
                              )}
                            </div>
                          )}
                          </td>
                        )}
                        {visibleColumns.brand && (
                          <td className="p-3 text-center text-[#040466]">
                            {brand ? (lang === 'ar' ? brand.nameAr : brand.nameEn) : '—'}
                          </td>
                        )}
                        {visibleColumns.group && (
                          <td className="p-3 text-center">
                            {group ? (
                              <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold px-2 rounded-none h-[25.6562px] text-white shrink-0", group.color)}>
                                {lang === 'ar' ? group.nameAr : group.nameEn}
                              </span>
                            ) : '—'}
                          </td>
                        )}
                        {visibleColumns.color && (
                          <td className="p-3 text-center">
                            {color ? (
                              <div className="flex items-center gap-1 justify-center">
                                {color.hex && <span className="w-2.5 h-2.5 rounded-full border border-gray-300" style={{ backgroundColor: color.hex }} />}
                                <span className="text-[11px] text-[#040466]">{lang === 'ar' ? color.nameAr : color.nameEn}</span>
                              </div>
                            ) : '—'}
                          </td>
                        )}
                        {visibleColumns.size && (
                          <td className="p-3 text-center text-[#040466]">
                            {size ? (lang === 'ar' ? size.nameAr : size.nameEn) : '—'}
                          </td>
                        )}
                        {visibleColumns.division && (
                          <td className="p-3 text-center text-[#040466]">
                            {division ? (lang === 'ar' ? division.nameAr : division.nameEn) : '—'}
                          </td>
                        )}
                        {visibleColumns.item && (
                          <td className="p-3 text-center text-[#040466] font-black">
                            {item ? (lang === 'ar' ? item.nameAr : item.nameEn) : '—'}
                          </td>
                        )}
                        {visibleColumns.costPrice && (
                          <td className="p-3 text-center text-[#040466] font-mono text-[10px]">
                            ${p.costPrice.toFixed(2)}
                          </td>
                        )}
                        {visibleColumns.profitMargin && (
                          <td className="p-3 text-center text-[#040466] font-mono">
                            %{p.profitMargin}
                          </td>
                        )}
                        {visibleColumns.sellPrice && (
                          <td className="p-3 text-center text-[#040466] font-mono text-[10px] font-extrabold">
                            ${p.sellPrice.toFixed(2)}
                          </td>
                        )}
                        {visibleColumns.promoPrice && (
                          <td className="p-3 text-center">
                            {p.promoPrice !== null ? (
                              <div>
                                <span className="text-red-650 font-mono text-[10px] font-black block">${Number(p.promoPrice).toFixed(2)}</span>
                                <span className="text-[9px] text-rose-500 font-extrabold bg-rose-50 px-1 py-0.1 border border-rose-100 rounded">
                                  {lang === 'ar' ? 'خصم مفعّل' : 'Sale'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        )}
                        {visibleColumns.supplierName && (
                          <td className="p-3 text-[#040466] font-extrabold max-w-[120px] truncate">
                            {p.supplierName}
                          </td>
                        )}
                        {visibleColumns.reorderPoint && (
                          <td className="p-3 text-center">
                            <span className="font-mono text-[11.5px] font-bold text-[#040466]">
                              {p.reorderPoint} {lang === 'ar' ? 'قطعة' : 'pcs'}
                            </span>
                          </td>
                        )}
                        <td className="p-3 text-center">
                          <div className="flex items-center gap-1 justify-center bg-white border border-gray-300 rounded-lg p-0.5 shadow-xs w-fit mx-auto">
                            {extraRowActions && extraRowActions(p)}
                            <button 
                              onClick={() => setViewingProduct(p)}
                              className="p-1.5 hover:bg-slate-50 text-slate-650 rounded-lg transition cursor-pointer"
                            >
                              <Eye size={13} strokeWidth={2.5} />
                            </button>
                            <button 
                              onClick={() => openEditProductModal(p)}
                              className="p-1.5 hover:bg-slate-50 text-blue-650 rounded-lg transition cursor-pointer"
                            >
                              <Edit2 size={13} strokeWidth={2.5} />
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا الصنف؟' : 'Are you sure you want to delete this?')) {
                                  handleDeleteProduct(p.id);
                                }
                              }}
                              className="p-1.5 hover:bg-slate-50 text-red-650 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 size={13} strokeWidth={2.5} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Cards Bento view */
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedProducts.map((p, index) => {
              const brand = brands.find(b => b.id === p.brandId);
              const group = groups.find(g => g.id === p.groupId);
              const color = colors.find(c => c.id === p.colorId);
              const size = sizes.find(s => s.id === p.sizeId);
              const pInitialQty = p.initialQty !== undefined ? p.initialQty : p.qty;
              const pReorderSalePercent = p.reorderSalePercent !== undefined ? p.reorderSalePercent : 50;
              const soldQty = Math.max(0, pInitialQty - p.qty);
              const salesPercent = pInitialQty > 0 ? (soldQty / pInitialQty) * 100 : 0;
              const hasReachedSalePercent = pReorderSalePercent > 0 ? (salesPercent >= pReorderSalePercent) : false;
              const isBelowReorder = p.qty <= p.reorderPoint || hasReachedSalePercent;

              return (
                <div 
                  key={`${p.id}-${index}`} 
                  className={cn(
                    "bg-white border rounded-lg p-5 shadow-xs flex flex-col justify-between hover:border-orange-300 transition-all text-right",
                    isBelowReorder ? "border-rose-250 bg-rose-50/5" : "border-gray-300"
                  )}
                >
                  <div className="flex justify-between items-center mb-3.5 rtl:flex-row-reverse">
                    <span className="text-[12.5px] text-[#040466] font-bold">
                      {p.code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isBelowReorder && (
                        <span className="bg-rose-100 text-rose-700 text-[9px] px-1.5 py-0.5 rounded font-black border border-rose-200 animate-pulse shrink-0">
                          {lang === 'ar' ? 'حد الطلب!' : 'Refill Alert'}
                        </span>
                      )}
                      {pInitialQty > 0 && soldQty > 0 && (
                        <span className="bg-orange-50 text-orange-600 text-[9px] px-1.5 py-0.5 rounded font-bold border border-orange-100 shrink-0">
                          {lang === 'ar' ? `مبيعات: ${Math.round(salesPercent)}%` : `Sales: ${Math.round(salesPercent)}%`}
                        </span>
                      )}
                      {p.qty !== undefined && (
                        <span className={cn(
                          "text-[9.5px] font-black px-2 py-0.5 rounded-full shrink-0",
                          p.qty > 15 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        )}>
                          {lang === 'ar' ? `مخزون: ${p.qty} قطعة` : `In Stock: ${p.qty}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <h4 className="text-[11px] font-black text-slate-800 leading-snug">{p.name || (lang === "ar" ? p.nameAr : p.nameEn)}</h4>

                  <div className="flex gap-2 justify-between items-center py-2 border-y border-gray-300 my-3 text-[10px] text-slate-500 font-bold rtl:flex-row-reverse">
                    <div>{customColumnLabels?.['brand']?.[lang] ? customColumnLabels['brand'][lang] + ': ' : (lang === 'ar' ? 'العلامة: ' : 'Brand: ')}{brand ? (lang === 'ar' ? brand.nameAr : brand.nameEn) : '—'}</div>
                    <div>{customColumnLabels?.['size']?.[lang] ? customColumnLabels['size'][lang] + ': ' : (lang === 'ar' ? 'المقاس: ' : 'Size: ')}{size ? (lang === 'ar' ? size.nameAr : size.nameEn) : '—'}</div>
                  </div>

                  <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2 rounded-lg text-center text-[10px] font-bold border border-gray-300 mb-3.5">
                    <div>
                      <span className="text-slate-400 block text-[8px]">{lang === 'ar' ? 'شراء' : 'Cost'}</span>
                      <span className="font-mono text-slate-700">${p.costPrice.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[8px]">{lang === 'ar' ? 'الربح' : 'Margin'}</span>
                      <span className="font-mono text-orange-500">%{p.profitMargin}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[8px]">{lang === 'ar' ? 'بيع' : 'Sell'}</span>
                      <span className="font-mono text-[#0a1945] font-extrabold">${p.sellPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-black rtl:flex-row-reverse">
                    <span className="text-[10px] text-slate-400">{p.supplierName}</span>
                    <div className="flex gap-1">
                      {extraRowActions && extraRowActions(p)}
                      <button onClick={() => setViewingProduct(p)} className="p-1.5 bg-[#0a1945] text-white rounded-lg transition"><Eye size={12} /></button>
                      <button onClick={() => openEditProductModal(p)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg transition"><Edit2 size={12} /></button>
                      <button onClick={() => handleDeleteProduct(p.id)} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg transition"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Desktop Pagination Controls */}
        <div className="px-4 h-[41px] pt-[0px] pb-[0px] border-t border-black flex flex-col md:flex-row items-center justify-between gap-4 text-xs bg-slate-50/40 rounded-b-lg text-slate-600">
          <div className="flex items-center gap-1.5 text-slate-500 font-bold font-sans">
            {lang === 'ar' ? (
              <>
                <span>عرض</span>
                <span className="font-mono font-black bg-slate-200/50 border border-gray-300 px-2 py-0.5 rounded text-[#0a1945]">{paginatedProducts.length}</span>
                <span>من أصل</span>
                <span className="font-mono font-black bg-orange-100/50 border border-orange-200 px-2 py-0.5 rounded text-orange-650">{filteredProducts.length}</span>
              </>
            ) : (
              <>
                <span>Showing</span>
                <span className="font-mono font-black bg-slate-200/50 border border-gray-300 px-2 py-0.5 rounded text-[#0a1945]">{paginatedProducts.length}</span>
                <span>of</span>
                <span className="font-mono font-black bg-orange-100/50 border border-orange-200 px-2 py-0.5 rounded text-orange-650">{filteredProducts.length}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 select-none">
            <button
              disabled={activeProdPage === 1}
              onClick={() => setProdCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1.5 border border-gray-300 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white hover:border-orange-400 hover:text-orange-500 cursor-pointer h-7 w-7 flex items-center justify-center transition"
            >
              {lang === 'ar' ? <ChevronRight size={13} strokeWidth={2.5} /> : <ChevronLeft size={13} strokeWidth={2.5} />}
            </button>

            {Array.from({ length: totalProdPages }, (_, i) => i + 1).map(page => {
              const isActive = page === activeProdPage;
              return (
                <button
                  key={page}
                  onClick={() => setProdCurrentPage(page)}
                  className={cn(
                    "w-7 h-7 rounded-lg font-extrabold cursor-pointer text-xs flex items-center justify-center border font-mono transition",
                    isActive
                      ? "bg-[#0a1945] text-white border-[#0a1945]"
                      : "bg-white text-slate-700 border-gray-300 hover:border-orange-400 hover:text-orange-500"
                  )}
                >
                  {page}
                </button>
              );
            })}

            <button
              disabled={activeProdPage === totalProdPages}
              onClick={() => setProdCurrentPage(prev => Math.min(totalProdPages, prev + 1))}
              className="p-1.5 border border-gray-300 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white hover:border-orange-400 hover:text-orange-500 cursor-pointer h-7 w-7 flex items-center justify-center transition"
            >
              {lang === 'ar' ? <ChevronLeft size={13} strokeWidth={2.5} /> : <ChevronRight size={13} strokeWidth={2.5} />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span>{lang === 'ar' ? 'عرض' : 'Show'}</span>
            <select
              value={prodPageSize}
              onChange={(e) => {
                setProdPageSize(Number(e.target.value));
                setProdCurrentPage(1);
              }}
              className="bg-white border border-gray-300 rounded-[8px] text-xs font-bold outline-none cursor-pointer h-[27px] w-[37px] pt-0 pb-0 pr-[7px] pl-0"
            >
              {[5, 10, 20, 50].map(sz => (
                <option key={sz} value={sz}>{sz}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* VIEW 2: MOBILE CONTAINER (Visible on screens smaller than md) */}
      <div className="block md:hidden space-y-4">
        {paginatedProducts.length === 0 ? (
          <div className="p-8 text-center bg-white border border-gray-300 rounded-3xl text-slate-400">
            <AlertTriangle className="mx-auto w-10 h-10 text-amber-500 mb-2" />
            <p className="font-extrabold">{lang === 'ar' ? 'لا يوجد أصناف مطابقة' : 'No products matched.'}</p>
          </div>
        ) : (
          paginatedProducts.map((p, index) => {
            const brand = brands.find(b => b.id === p.brandId);
            const group = groups.find(g => g.id === p.groupId);
            const color = colors.find(c => c.id === p.colorId);
            const size = sizes.find(s => s.id === p.sizeId);
            const division = divisions.find(d => d.id === p.divisionId);
            const item = items.find(i => i.id === p.itemId);
            const pInitialQty = p.initialQty !== undefined ? p.initialQty : p.qty;
            const pReorderSalePercent = p.reorderSalePercent !== undefined ? p.reorderSalePercent : 50;
            const soldQty = Math.max(0, pInitialQty - p.qty);
            const salesPercent = pInitialQty > 0 ? (soldQty / pInitialQty) * 100 : 0;
            const hasReachedSalePercent = pReorderSalePercent > 0 ? (salesPercent >= pReorderSalePercent) : false;
            const isBelowReorder = p.qty <= p.reorderPoint || hasReachedSalePercent;
            return (
              <div 
                key={`${p.id}-${index}`} 
                className={cn(
                  "bg-white border rounded-lg p-5 shadow-xs flex flex-col justify-between hover:border-orange-300 transition-all text-right relative overflow-hidden",
                  isBelowReorder ? "border-rose-250 bg-rose-50/5" : "border-gray-300"
                )}
              >
                <div className="flex justify-between items-center mb-3 rtl:flex-row-reverse">
                  <span className="text-[12.5px] text-[#040466] font-bold">
                      {p.code}
                    </span>
                  <div className="flex items-center gap-1.5">
                    {isBelowReorder && (
                      <span className="bg-rose-100 text-rose-700 text-[9px] px-1.5 py-0.5 rounded font-black border border-rose-200 animate-pulse">
                        {lang === 'ar' ? 'حد الطلب!' : 'Refill Alert'}
                      </span>
                    )}
                    {pInitialQty > 0 && soldQty > 0 && (
                      <span className="bg-orange-50 text-orange-600 text-[9px] px-1.5 py-0.5 rounded font-bold border border-orange-100">
                        {lang === 'ar' ? `مبيعات: ${Math.round(salesPercent)}%` : `Sales: ${Math.round(salesPercent)}%`}
                      </span>
                    )}
                    {p.qty !== undefined && (
                      <span className={cn(
                        "text-[9.5px] font-black px-2 py-0.5 rounded-full",
                        p.qty > 15 ? "bg-emerald-50 text-emerald-600" :
                        p.qty > 0 ? "bg-amber-50 text-amber-600" :
                        "bg-rose-50 text-rose-600"
                      )}>
                        {lang === 'ar' ? `${p.qty} قطعة` : `${p.qty} in stock`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-[11px] font-black text-slate-800 leading-snug">{p.name || (lang === "ar" ? p.nameAr : p.nameEn)}</h4>
                  <div className="flex flex-wrap gap-1 mt-1 justify-end">
                    {brand && <span className="text-[9px] bg-slate-50 border border-gray-300 px-1.5 py-0.2 rounded text-slate-500 font-bold">{lang === 'ar' ? brand.nameAr : brand.nameEn}</span>}
                    {division && <span className="text-[9px] bg-blue-50 border border-blue-100 px-1.5 py-0.2 rounded text-blue-650 font-bold">{lang === 'ar' ? division.nameAr : division.nameEn}</span>}
                    {item && <span className="text-[9px] bg-orange-50 border border-orange-100 px-1.5 py-0.2 rounded text-orange-600 font-extrabold">{lang === 'ar' ? item.nameAr : item.nameEn}</span>}
                  </div>
                </div>

                <div className="flex justify-between items-center py-2 border-y border-gray-300 my-3 text-[10px] text-slate-500 font-bold rtl:flex-row-reverse">
                  <div className="flex items-center gap-1 rtl:flex-row-reverse">
                    <span>{customColumnLabels?.['color']?.[lang] ? customColumnLabels['color'][lang] + ':' : (lang === 'ar' ? 'اللون:' : 'Color:')}</span>
                    {color ? (
                      <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded-md">
                        {color.hex && <span className="w-2.5 h-2.5 rounded-full border border-gray-300" style={{ backgroundColor: color.hex }} />}
                        <span className="text-[9px] text-slate-600">{lang === 'ar' ? color.nameAr : color.nameEn}</span>
                      </div>
                    ) : '—'}
                  </div>
                  <div className="flex items-center gap-1 rtl:flex-row-reverse">
                    <span>{lang === 'ar' ? 'المقاس:' : 'Size:'}</span>
                    <span className="bg-slate-50 px-1.5 py-0.5 rounded-md text-slate-600 text-[9px]">{size ? (lang === 'ar' ? size.nameAr : size.nameEn) : '—'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2.5 rounded-lg text-center text-[10px] font-bold border border-gray-300 mb-3">
                  <div>
                    <span className="text-slate-400 block text-[8px]">{lang === 'ar' ? 'شراء' : 'Cost'}</span>
                    <span className="font-mono text-slate-700 text-[11px]">${p.costPrice.toFixed(2)}</span>
                  </div>
                  <div className="border-x border-gray-300">
                    <span className="text-slate-400 block text-[8px]">{lang === 'ar' ? 'الربح' : 'Margin'}</span>
                    <span className="font-mono text-orange-500 text-[11px]">%{p.profitMargin}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[8px]">{lang === 'ar' ? 'بيع' : 'Sell'}</span>
                    <span className="font-mono text-[#0a1945] text-[11px] font-black">${p.sellPrice.toFixed(2)}</span>
                  </div>
                </div>

                {p.promoPrice !== null && (
                  <div className="mb-3 bg-rose-50 border border-rose-100 p-2 rounded-lg flex items-center justify-between text-[11px] font-bold text-rose-600 rtl:flex-row-reverse">
                    <span>{lang === 'ar' ? 'أوكازيون العرض:' : 'Sale Promo:'}</span>
                    <span className="font-mono font-black text-red-650 text-[10px]">${Number(p.promoPrice).toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-black rtl:flex-row-reverse">
                  <div className="text-[10px] text-slate-400 text-right">
                    <span className="block">{lang === 'ar' ? 'المورد:' : 'Supplier:'}</span>
                    <span className="text-slate-600 font-extrabold truncate block max-w-[125px]">{p.supplierName}</span>
                  </div>
                  <div className="flex gap-1">
                    {extraRowActions && extraRowActions(p)}
                    <button onClick={() => setViewingProduct(p)} className="p-2 bg-[#0a1945] hover:bg-slate-900 text-white rounded-lg transition cursor-pointer"><Eye size={12} /></button>
                    <button onClick={() => openEditProductModal(p)} className="p-2 bg-blue-50 text-blue-650 rounded-lg transition cursor-pointer"><Edit2 size={12} /></button>
                    <button 
                      onClick={() => {
                        if (confirm(lang === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete?')) {
                          handleDeleteProduct(p.id);
                        }
                      }} 
                      className="p-2 bg-rose-50 text-red-650 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Mobile Pagination Controls */}
        <div className="mt-4 pt-4 border-t border-black flex flex-col items-center gap-3">
          <div className="flex items-center gap-1 select-none">
            <button
              disabled={activeProdPage === 1}
              onClick={() => setProdCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-2 border border-gray-300 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-650 h-8 w-8 flex items-center justify-center cursor-pointer shadow-xs"
            >
              {lang === 'ar' ? <ChevronRight size={13} strokeWidth={2.5} /> : <ChevronLeft size={13} strokeWidth={2.5} />}
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalProdPages }, (_, i) => i + 1).map(page => {
                const isActive = page === activeProdPage;
                return (
                  <button
                    key={page}
                    onClick={() => setProdCurrentPage(page)}
                    className={cn(
                      "w-8 h-8 rounded-lg font-extrabold cursor-pointer text-xs flex items-center justify-center border font-mono transition",
                      isActive ? "bg-[#0a1945] text-white border-[#0a1945]" : "bg-white text-slate-700 border-gray-300"
                    )}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              disabled={activeProdPage === totalProdPages}
              onClick={() => setProdCurrentPage(prev => Math.min(totalProdPages, prev + 1))}
              className="p-2 border border-gray-300 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-650 h-8 w-8 flex items-center justify-center cursor-pointer shadow-xs"
            >
              {lang === 'ar' ? <ChevronLeft size={13} strokeWidth={2.5} /> : <ChevronRight size={13} strokeWidth={2.5} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
