import React, { useState } from 'react';
import { Settings, X, FileOutput, Grid, Search, Filter, Hash, Edit, Eye, ShoppingCart, DollarSign, Tag, Building2, Package } from 'lucide-react';
import { cn } from '../lib/utils';
import { ExportDataButton } from './ui/ExportDataButton';

interface StoreValueReportProps {
  lang: 'ar' | 'en';
}

export function StoreValueReport({ lang }: StoreValueReportProps) {
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [isColumnFiltersOpen, setIsColumnFiltersOpen] = useState(false);
  const [dirViewMode, setDirViewMode] = useState<'table' | 'cards'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    barcode: true,
    name: true,
    quantity: true,
    costPrice: true,
    sellPrice: true,
    promoPrice: true,
    group: false,
    supplierName: false,
    department: false,
    brand: false,
  });

  const [tempVisibleColumns, setTempVisibleColumns] = useState({ ...visibleColumns });

  // Dummy data
  const reportData = [
    {
      id: 1,
      barcode: '123456789',
      name: 'Test Product 1',
      nameAr: 'منتج تجريبي 1',
      quantity: 100,
      costPrice: 50,
      sellPrice: 100,
      promoPrice: 90,
      group: 'Group A',
      groupAr: 'مجموعة أ',
      supplierName: 'Supplier 1',
      supplierNameAr: 'مورد 1',
      department: 'Dept 1',
      departmentAr: 'قسم 1',
      brand: 'Brand X',
      brandAr: 'براند س'
    }
  ];

  return (
    <div className="bg-white border border-[#FF6900] rounded-[12px] shadow-sm relative pt-[13px] mt-[0px] mb-[0px] min-h-[427px]">
        {/* Toolbar bar */}
        <div className="p-[5px] mt-[-13px] h-[43px] border-b border-[#eaeff2] bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 w-full rounded-t-[12px]">
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => { setTempVisibleColumns({ ...visibleColumns }); setColumnSettingsOpen(!columnSettingsOpen); }} className="w-[32px] h-[32px] flex items-center justify-center text-orange-500 bg-white border border-slate-200 hover:border-orange-400 rounded-[8px] hover:shadow-xs transition cursor-pointer" title={lang === 'ar' ? 'تخصيص الأعمدة' : 'Columns'}>
                <Settings size={15} />
              </button>
              {columnSettingsOpen && (
                <div className="absolute right-0 rtl:right-0 rtl:left-auto mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 p-3.5 text-xs text-left rtl:text-right">
                  <div className="pb-2 border-b border-slate-100 mb-2.5 flex justify-between items-center rtl:flex-row-reverse">
                    <h4 className="font-extrabold text-slate-800 text-[12px]">{lang === 'ar' ? 'أعمدة التقرير' : 'Report Columns'}</h4>
                    <button onClick={() => setColumnSettingsOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X size={12} />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {Object.entries({
                      id: { en: '#', ar: '#' },
                      barcode: { en: 'Barcode', ar: 'الباركود' },
                      name: { en: 'Item Name / Model', ar: 'اسم وموديل الصنف' },
                      quantity: { en: 'Quantity', ar: 'الكمية' },
                      costPrice: { en: 'Purchase Price', ar: 'سعر الشراء' },
                      sellPrice: { en: 'Sell Price', ar: 'سعر البيع' },
                      promoPrice: { en: 'Offer Price', ar: 'سعر العرض' },
                      group: { en: 'Item Group', ar: 'مجموعة الصنف' },
                      supplierName: { en: 'Supplier Name', ar: 'اسم المورد' },
                      department: { en: 'Department', ar: 'القسم' },
                      brand: { en: 'Brand', ar: 'البراند' },
                    }).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2.5 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer rtl:flex-row-reverse">
                        <input
                          type="checkbox"
                          checked={tempVisibleColumns[key as keyof typeof tempVisibleColumns]}
                          onChange={(e) => setTempVisibleColumns(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="w-3.5 h-3.5 text-orange-500 rounded border-slate-300 focus:ring-orange-500"
                        />
                        <span className="font-bold text-slate-700">{lang === 'ar' ? label.ar : label.en}</span>
                      </label>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-slate-100 mt-2 flex justify-end gap-2">
                    <button onClick={() => setColumnSettingsOpen(false)} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                    <button 
                      onClick={() => { setVisibleColumns({ ...tempVisibleColumns }); setColumnSettingsOpen(false); }} 
                      className="px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[10px] font-bold uppercase transition cursor-pointer"
                    >
                      {lang === 'ar' ? 'تطبيق' : 'Apply'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <ExportDataButton 
              data={reportData}
              filename="StoreValueReport"
              lang={lang}
              className="w-[32px] h-[32px] flex items-center justify-center text-emerald-600 bg-white border border-slate-200 hover:border-emerald-400 rounded-[8px] hover:shadow-xs transition cursor-pointer"
            >
              <FileOutput size={15} />
            </ExportDataButton>

            <button 
              onClick={() => setDirViewMode(dirViewMode === 'table' ? 'cards' : 'table')} 
              className={cn("w-[32px] h-[32px] flex items-center justify-center rounded-[8px] hover:shadow-xs transition cursor-pointer select-none", dirViewMode === 'cards' ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-indigo-500 border-slate-200 hover:border-indigo-400")} 
              title={lang === 'ar' ? 'عرض كبطاقات' : 'Cards View'}
            >
              <Grid size={15} />
            </button>
          </div>

          <div className="flex flex-1 sm:flex-none items-center gap-2 w-full sm:w-auto">
            <button onClick={() => setIsColumnFiltersOpen(!isColumnFiltersOpen)} className={cn("w-[32px] h-[32px] flex items-center justify-center rounded-[8px] hover:shadow-xs transition cursor-pointer select-none", isColumnFiltersOpen ? "bg-[#0a1945] text-white border-[#0a1945]" : "bg-white text-orange-500 border-slate-200 hover:border-orange-400")} title={lang === 'ar' ? 'بحث متقدم' : 'Advanced Search'}>
              <Filter size={15} />
            </button>
            <div className="relative flex-1 flex items-center max-w-[300px]">
              <Search size={14} className="absolute left-3 rtl:right-3 rtl:left-auto text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'ar' ? "البحث بالاسم، الباركود..." : "Search by name, barcode..."}
                className="w-full text-xs p-2 pl-8 pr-8 rtl:pr-8 rtl:pl-8 bg-white border border-slate-200 rounded-[8px] outline-none focus:border-orange-400 transition h-[32px]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-orange-500 rounded-lg hover:bg-slate-100 transition cursor-pointer">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Display (Table or Cards) */}
        {dirViewMode === 'table' ? (
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto relative bg-white">
            <table className="w-full text-left rtl:text-right border-collapse text-xs font-bold text-slate-700">
              <thead className="sticky top-0 z-30 bg-orange-500 text-white select-none">
                <tr className="bg-[#FF6900] text-white font-extrabold border-b border-orange-600">
                  {visibleColumns.id && <th className="p-3.5 text-center w-10">#</th>}
                  {visibleColumns.barcode && <th className="p-3.5 text-center">{lang === 'ar' ? 'الباركود' : 'Barcode'}</th>}
                  {visibleColumns.name && <th className="p-3.5 min-w-[185px]">{lang === 'ar' ? 'اسم وموديل الصنف' : 'Item Name / Model'}</th>}
                  {visibleColumns.quantity && <th className="p-3.5 text-center">{lang === 'ar' ? 'الكمية' : 'Quantity'}</th>}
                  {visibleColumns.costPrice && <th className="p-3.5 text-center">{lang === 'ar' ? 'سعر الشراء' : 'Purchase Cost'}</th>}
                  {visibleColumns.sellPrice && <th className="p-3.5 text-center">{lang === 'ar' ? 'سعر البيع' : 'Sell Price'}</th>}
                  {visibleColumns.promoPrice && <th className="p-3.5 text-center">{lang === 'ar' ? 'سعر العرض' : 'Offer Price'}</th>}
                  {visibleColumns.group && <th className="p-3.5 text-center">{lang === 'ar' ? 'مجموعة الصنف' : 'Item Group'}</th>}
                  {visibleColumns.supplierName && <th className="p-3.5">{lang === 'ar' ? 'اسم المورد' : 'Supplier'}</th>}
                  {visibleColumns.department && <th className="p-3.5 text-center">{lang === 'ar' ? 'القسم' : 'Department'}</th>}
                  {visibleColumns.brand && <th className="p-3.5 text-center">{lang === 'ar' ? 'البراند' : 'Brand'}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map((item, index) => (
                  <tr key={item.id} className="hover:bg-orange-50/50 transition-colors group">
                    {visibleColumns.id && <td className="p-3.5 text-center text-slate-400">{index + 1}</td>}
                    {visibleColumns.barcode && <td className="p-3.5 text-center font-mono text-[11px] text-slate-500">{item.barcode}</td>}
                    {visibleColumns.name && (
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                            <Tag size={12} className="text-slate-400" />
                          </div>
                          <span className="font-bold text-slate-700 truncate max-w-[200px]" title={lang === 'ar' ? item.nameAr : item.name}>{lang === 'ar' ? item.nameAr : item.name}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.quantity && (
                      <td className="p-3.5 text-center">
                        <span className="inline-flex items-center justify-center min-w-[36px] h-6 px-2 text-xs font-black rounded bg-orange-100 text-orange-600 border border-orange-200">
                          {item.quantity}
                        </span>
                      </td>
                    )}
                    {visibleColumns.costPrice && <td className="p-3.5 text-center text-emerald-600 font-black">{item.costPrice.toFixed(2)}</td>}
                    {visibleColumns.sellPrice && <td className="p-3.5 text-center text-blue-600 font-black">{item.sellPrice.toFixed(2)}</td>}
                    {visibleColumns.promoPrice && <td className="p-3.5 text-center text-purple-600 font-black">{item.promoPrice.toFixed(2)}</td>}
                    {visibleColumns.group && <td className="p-3.5 text-center"><span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] whitespace-nowrap">{lang === 'ar' ? item.groupAr : item.group}</span></td>}
                    {visibleColumns.supplierName && <td className="p-3.5 text-slate-600"><span className="flex items-center gap-1.5"><Building2 size={12} className="text-slate-400" />{lang === 'ar' ? item.supplierNameAr : item.supplierName}</span></td>}
                    {visibleColumns.department && <td className="p-3.5 text-center text-slate-500 text-[11px]">{lang === 'ar' ? item.departmentAr : item.department}</td>}
                    {visibleColumns.brand && <td className="p-3.5 text-center text-slate-500 text-[11px]">{lang === 'ar' ? item.brandAr : item.brand}</td>}
                  </tr>
                ))}
                {reportData.length === 0 && (
                  <tr>
                    <td colSpan={15} className="p-8 text-center text-slate-500">{lang === 'ar' ? 'لا توجد بيانات مطابقة' : 'No matching data found'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-slate-50/50 rounded-b-3xl">
            {reportData.map((item, index) => (
              <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-orange-200 transition-all">
                 <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                   <div className="flex items-center gap-2">
                     <span className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 text-slate-500 font-bold text-xs">{index + 1}</span>
                     <span className="text-xs font-mono text-slate-400">{item.barcode}</span>
                   </div>
                 </div>
                 <h4 className="font-bold text-sm text-slate-800 mb-4 line-clamp-2">{lang === 'ar' ? item.nameAr : item.name}</h4>
                 <div className="space-y-2 text-xs">
                   <div className="flex justify-between items-center py-1 border-b border-slate-50">
                     <span className="text-slate-500">{lang === 'ar' ? 'الكمية' : 'Quantity'}</span>
                     <span className="font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded">{item.quantity}</span>
                   </div>
                   <div className="flex justify-between items-center py-1 border-b border-slate-50">
                     <span className="text-slate-500">{lang === 'ar' ? 'سعر الشراء' : 'Purchase Cost'}</span>
                     <span className="font-black text-emerald-600">{item.costPrice.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between items-center py-1 border-b border-slate-50">
                     <span className="text-slate-500">{lang === 'ar' ? 'سعر البيع' : 'Sell Price'}</span>
                     <span className="font-black text-blue-600">{item.sellPrice.toFixed(2)}</span>
                   </div>
                   {item.promoPrice > 0 && (
                     <div className="flex justify-between items-center py-1">
                       <span className="text-slate-500">{lang === 'ar' ? 'سعر العرض' : 'Offer Price'}</span>
                       <span className="font-black text-purple-600">{item.promoPrice.toFixed(2)}</span>
                     </div>
                   )}
                 </div>
              </div>
            ))}
            {reportData.length === 0 && (
              <div className="col-span-full p-8 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">{lang === 'ar' ? 'لا توجد بيانات مطابقة' : 'No matching data found'}</div>
            )}
          </div>
        )}
    </div>
  );
}
