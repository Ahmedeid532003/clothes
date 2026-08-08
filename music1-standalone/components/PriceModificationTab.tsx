import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, Settings, X, Grid, List, ChevronLeft, ChevronRight, Eye, Edit, Trash2, Calendar, Hash, User, DollarSign } from 'lucide-react';
import { cn } from '../lib/utils';
import { ProductTablePagination } from './ProductTablePagination';
import { motion } from 'motion/react';
import { ExportDataButton } from './ui/ExportDataButton';

import PriceModificationCreateCanvas from './PriceModificationCanvas';
import BulkPriceModificationPopup from './BulkPriceModificationPopup';
import BulkPriceModificationCanvas from './BulkPriceModificationCanvas';

interface PriceModificationTabProps {
  lang: 'en' | 'ar';
  products: any[];
  setActiveSubTab: (tab: string) => void;
}

export function PriceModificationTab({ lang, products, setActiveSubTab }: PriceModificationTabProps) {
  const isAr = lang === 'ar';
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // States
  const [isCreateCanvasOpen, setIsCreateCanvasOpen] = useState(false);
  const [isBulkPopupOpen, setIsBulkPopupOpen] = useState(false);
  const [bulkSettings, setBulkSettings] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [isColumnFiltersOpen, setIsColumnFiltersOpen] = useState(false);
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [advDocId, setAdvDocId] = useState("");
  const [advUser, setAdvUser] = useState("");
  const [advDate, setAdvDate] = useState("");

  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    documentId: true,
    username: true,
    adjustmentValue: true,
    actions: true
  });
  const [tempVisibleColumns, setTempVisibleColumns] = useState({ ...visibleColumns });

  // Dummy data
  const [modifications, setModifications] = useState<any[]>(() => {
    return Array.from({ length: 15 }, (_, i) => ({
      id: `PM-2026-${1000 + i}`,
      date: `2026-07-${String((i % 28) + 1).padStart(2, '0')}`,
      username: i % 2 === 0 ? "هاني دياب" : "مدير النظام",
      adjustmentValue: (i + 1) * 50,
    }));
  });

  const filteredData = useMemo(() => {
    return modifications.filter(m => {
      const q = searchQuery.toLowerCase();
      if (q && !m.id.toLowerCase().includes(q) && !m.username.toLowerCase().includes(q)) return false;
      if (advDocId && !m.id.toLowerCase().includes(advDocId.toLowerCase())) return false;
      if (advUser && !m.username.toLowerCase().includes(advUser.toLowerCase())) return false;
      if (advDate && m.date !== advDate) return false;
      return true;
    });
  }, [modifications, searchQuery, advDocId, advUser, advDate]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  const columnsList = [
    { key: 'date', labelAr: 'تاريخ', labelEn: 'Date' },
    { key: 'documentId', labelAr: 'رقم المستند', labelEn: 'Document No.' },
    { key: 'username', labelAr: 'المستخدم', labelEn: 'User' },
    { key: 'adjustmentValue', labelAr: 'قيمة التعديل', labelEn: 'Adjustment Value' },
  ];

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-5 left-5 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl z-50 text-xs font-bold">
          {toastMessage}
        </div>
      )}
      {/* Header and Buttons */}
      <div className={cn("bg-white border border-[#eaeff2] rounded-3xl p-6 shadow-xs", isAr && "rtl font-[Cairo]")}>
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 pb-6 -mb-[15px] h-[107px] -mt-[12px] border-none">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <DollarSign className="text-orange-500 w-5 h-5" />
              <span>
                {isAr ? 'تعديل اسعار الاصناف' : 'Item Price Modifications'}
              </span>
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              {isAr ? 'إدارة وتعديل أسعار بيع المنتجات' : 'Manage and modify product selling prices'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <button 
              onClick={() => setIsCreateCanvasOpen(true)}
              className="py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer text-[11px] uppercase tracking-wider h-[38px] sm:min-w-[200px]"
            >
              <Plus size={15} />
              <span>{isAr ? 'إنشاء تعديل أسعار جديد' : 'Create New Price Modification'}</span>
            </button>
            <button 
              onClick={() => setIsBulkPopupOpen(true)}
              className="py-2.5 px-4 bg-blue-500 hover:bg-blue-600 text-white font-extrabold rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer text-[11px] uppercase tracking-wider h-[38px] sm:min-w-[200px]"
            >
              <Plus size={15} />
              <span>{isAr ? 'إنشاء تعديل أسعار مجمع' : 'Create Bulk Price Modification'}</span>
            </button>
          </div>
        </div>

        <div className="mt-[66px] border border-slate-200 rounded-3xl overflow-visible shadow-sm relative">
        {/* Toolbar */}
        <div className="p-3.5 pt-[7px] mt-[37px] border-b border-[#eaeff2] bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 w-full">
          
          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => { setTempVisibleColumns({ ...visibleColumns }); setColumnSettingsOpen(!columnSettingsOpen); }} className="w-[36px] h-[36px] flex items-center justify-center text-[#f06424] bg-white border border-slate-200 hover:border-orange-400 rounded-lg hover:shadow-xs transition cursor-pointer" title={isAr ? 'تخصيص الأعمدة' : 'Columns'}>
                <Settings size={15} className="!text-[#f06424] shrink-0" stroke="currentColor" />
              </button>
              {columnSettingsOpen && (
                <div className="absolute right-0 rtl:right-0 rtl:left-auto mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 p-3.5 text-xs text-left rtl:text-right">
                  <div className="pb-2 border-b border-slate-100 mb-2.5 flex justify-between items-center rtl:flex-row-reverse">
                    <h4 className="font-extrabold text-slate-800 text-[12px]">{isAr ? 'أعمدة تعديل الأسعار' : 'Modification Columns'}</h4>
                    <button onClick={() => setColumnSettingsOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X size={12} />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {columnsList.map((col) => (
                      <label key={col.key} className="flex items-center gap-2 hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer select-none rtl:flex-row-reverse">
                        <input 
                          type="checkbox"
                          checked={(tempVisibleColumns as any)[col.key] ?? false}
                          onChange={(e) => setTempVisibleColumns({ ...tempVisibleColumns, [col.key]: e.target.checked })}
                          className="accent-orange-500 rounded text-white"
                        />
                        <span className="text-slate-700 font-bold">{isAr ? col.labelAr : col.labelEn}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-3 mt-3 border-t border-slate-100">
                    <button onClick={() => setColumnSettingsOpen(false)} className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold">
                      {isAr ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button onClick={() => { setVisibleColumns({ ...tempVisibleColumns }); setColumnSettingsOpen(false); }} className="flex-1 py-1.5 bg-orange-500 hover:bg-orange-650 text-white rounded-lg text-[10px] font-bold">
                      {isAr ? 'تطبيق' : 'Apply'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <ExportDataButton
              lang={lang}
              onToast={triggerToast}
              hideText={true}
              onCopy={() =>
                triggerToast(
                  isAr
                    ? 'تم نسخ البيانات إلى الحافظة'
                    : 'Data copied to clipboard!',
                )
              }
              onPrint={() =>
                triggerToast(
                  isAr
                    ? 'تم فتح خيارات الطباعة للجدول'
                    : 'Print dialog opened!',
                )
              }
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
              }}
            />
            <button onClick={() => setViewMode(viewMode === 'table' ? 'kanban' : 'table')} className="h-[36px] px-3 flex items-center justify-center gap-1.5 bg-white border border-slate-200 rounded-lg hover:border-orange-400 hover:shadow-xs transition cursor-pointer select-none font-black text-[11px] text-slate-700" title={isAr ? 'تبديل العرض' : 'Toggle View'}>
              {viewMode === 'table' ? (
                <>
                  <Grid size={14} className="!text-[#f06424] shrink-0" stroke="currentColor" />
                  <span className="text-slate-700">{isAr ? 'بطاقات' : 'Cards'}</span>
                </>
              ) : (
                <>
                  <List size={14} className="!text-[#f06424] shrink-0" stroke="currentColor" />
                  <span className="text-slate-700">{isAr ? 'جدول' : 'Table'}</span>
                </>
              )}
            </button>
          </div>

          {/* Left side search */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1 max-w-md justify-end">
            <button onClick={() => setIsColumnFiltersOpen(!isColumnFiltersOpen)} className={cn("w-[36px] h-[36px] flex items-center justify-center rounded-lg border transition cursor-pointer", isColumnFiltersOpen ? "bg-[#0a1945] text-white border-[#0a1945]" : "bg-white text-orange-500 border-slate-200 hover:border-orange-400")}>
              <Filter size={15} />
            </button>
            <div className="relative flex-1 flex items-center max-w-[300px]">
              <Search size={14} className="absolute left-3 rtl:right-3 rtl:left-auto text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder={isAr ? "بحث برقم المستند..." : "Search document..."}
                className="w-full text-xs p-2 pl-8 pr-8 rtl:pr-8 rtl:pl-8 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 transition h-[36px]"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setCurrentPage(1); }} className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-orange-500 rounded-full hover:bg-slate-100 transition cursor-pointer">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        {isColumnFiltersOpen && viewMode === 'kanban' && (
          <div className="p-4 border-b border-slate-100 bg-slate-50 grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs text-right animate-fadeIn">
            <div className="space-y-1">
              <label className="text-slate-500 font-bold block">{isAr ? 'رقم المستند' : 'Document No'}</label>
              <input type="text" value={advDocId} onChange={e => { setAdvDocId(e.target.value); setCurrentPage(1); }} className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400" />
            </div>
            <div className="space-y-1">
              <label className="text-slate-500 font-bold block">{isAr ? 'التاريخ' : 'Date'}</label>
              <input type="date" value={advDate} onChange={e => { setAdvDate(e.target.value); setCurrentPage(1); }} className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400" />
            </div>
            <div className="space-y-1">
              <label className="text-slate-500 font-bold block">{isAr ? 'المستخدم' : 'User'}</label>
              <input type="text" value={advUser} onChange={e => { setAdvUser(e.target.value); setCurrentPage(1); }} className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400" />
            </div>
          </div>
        )}

        {viewMode === 'table' ? (
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto relative border border-slate-200 rounded-b-2xl shadow-xs bg-white">
            <table className="w-full text-left rtl:text-right border-collapse text-xs font-bold text-slate-700">
              <thead className="sticky top-0 z-30 bg-orange-500 text-white select-none">
                <tr className="bg-[#f06424] text-white font-extrabold border-b border-orange-600">
                  {visibleColumns.date && <th className="p-3.5 text-center whitespace-nowrap">{isAr ? 'تاريخ' : 'Date'}</th>}
                  {visibleColumns.documentId && <th className="p-3.5 text-center whitespace-nowrap">{isAr ? 'رقم المستند' : 'Document No'}</th>}
                  {visibleColumns.username && <th className="p-3.5 text-center whitespace-nowrap">{isAr ? 'المستخدم' : 'User'}</th>}
                  {visibleColumns.adjustmentValue && <th className="p-3.5 text-center whitespace-nowrap">{isAr ? 'قيمة التعديل' : 'Adjustment Value'}</th>}
                  {visibleColumns.actions && <th className="p-3.5 text-center whitespace-nowrap w-[44px]"><Settings size={14} className="mx-auto" /></th>}
                </tr>
                {isColumnFiltersOpen && (
                  <tr className="bg-orange-50 text-slate-600 border-b border-slate-200">
                    {visibleColumns.date && (
                      <td className="p-2"><input type="date" value={advDate} onChange={e => { setAdvDate(e.target.value); setCurrentPage(1); }} className="w-full p-1.5 text-[10px] border border-slate-200 rounded-lg outline-none" /></td>
                    )}
                    {visibleColumns.documentId && (
                      <td className="p-2"><input type="text" value={advDocId} onChange={e => { setAdvDocId(e.target.value); setCurrentPage(1); }} className="w-full p-1.5 text-[10px] border border-slate-200 rounded-lg outline-none" /></td>
                    )}
                    {visibleColumns.username && (
                      <td className="p-2"><input type="text" value={advUser} onChange={e => { setAdvUser(e.target.value); setCurrentPage(1); }} className="w-full p-1.5 text-[10px] border border-slate-200 rounded-lg outline-none" /></td>
                    )}
                    {visibleColumns.adjustmentValue && <td className="p-2"></td>}
                    {visibleColumns.actions && <td className="p-2"></td>}
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.map((m, i) => (
                  <tr key={m.id} className={cn("hover:bg-slate-50/70 transition-colors", i % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                    {visibleColumns.date && <td className="p-3.5 text-center whitespace-nowrap"><span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md font-mono">{m.date}</span></td>}
                    {visibleColumns.documentId && <td className="p-3.5 text-center whitespace-nowrap"><span className="text-orange-600 font-black">{m.id}</span></td>}
                    {visibleColumns.username && <td className="p-3.5 text-center whitespace-nowrap">{m.username}</td>}
                    {visibleColumns.adjustmentValue && <td className="p-3.5 text-center whitespace-nowrap"><span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">{m.adjustmentValue}</span></td>}
                    {visibleColumns.actions && (
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-colors cursor-pointer" title={isAr ? "عرض" : "View"}><Eye size={14} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">{isAr ? 'لا توجد بيانات مطابقة' : 'No matching data found'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-slate-50/50 rounded-b-3xl">
            {paginatedData.map(m => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-orange-200 transition-all">
                <div className="flex justify-between items-start mb-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">
                    <Hash size={14} />
                    <span className="font-black text-xs">{m.id}</span>
                  </div>
                  <div className="flex gap-1">
                    <button className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-colors cursor-pointer"><Eye size={13} /></button>
                    <button className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors cursor-pointer"><Edit size={13} /></button>
                  </div>
                </div>
                <div className="space-y-2 text-xs font-bold text-slate-600 mb-4">
                  <div className="flex items-center gap-2"><Calendar size={14} className="text-slate-400" /><span>{m.date}</span></div>
                  <div className="flex items-center gap-2"><User size={14} className="text-slate-400" /><span>{m.username}</span></div>
                  <div className="flex items-center gap-2"><DollarSign size={14} className="text-emerald-500" /><span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{m.adjustmentValue}</span></div>
                </div>
              </motion.div>
            ))}
            {paginatedData.length === 0 && (
              <div className="col-span-full p-8 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">{isAr ? 'لا توجد بيانات مطابقة' : 'No matching data found'}</div>
            )}
          </div>
        )}

        <ProductTablePagination
          lang={lang}
          page={activePage}
          pageCount={totalPages}
          pageSize={pageSize}
          shown={paginatedData.length}
          total={filteredData.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          className="mt-0 border-t-0 rounded-t-none"
        />
      </div>
      </div>
      
      {isCreateCanvasOpen && (
        <PriceModificationCreateCanvas 
          lang={lang} 
          products={products}
          onClose={() => setIsCreateCanvasOpen(false)}
          onSave={(items) => {
            console.log("Saving items:", items);
            // Here we would typically save it to database or parent state
            // For now just close
            setIsCreateCanvasOpen(false);
          }}
          onSaveAndPrint={(items) => {
             console.log("Saving items and printing:", items);
             // Save logic here
             
             // Transition to barcode printing tab
             // Note: In a real app we'd pass items to the print tab, possibly via a context or store.
             setIsCreateCanvasOpen(false);
             setActiveSubTab('barcode-printing');
          }}
        />
      )}

      {isBulkPopupOpen && (
        <BulkPriceModificationPopup 
          lang={lang}
          products={products}
          onClose={() => setIsBulkPopupOpen(false)}
          onReview={(settings) => {
            setBulkSettings(settings);
            setIsBulkPopupOpen(false);
          }}
        />
      )}

      {bulkSettings && (
        <BulkPriceModificationCanvas 
          lang={lang}
          products={products}
          settings={bulkSettings}
          onClose={() => setBulkSettings(null)}
          onSave={(items) => {
            console.log("Saving bulk items:", items);
            setBulkSettings(null);
          }}
          onSaveAndPrint={(items) => {
            console.log("Saving bulk items and printing:", items);
            setBulkSettings(null);
            setActiveSubTab('barcode-printing');
          }}
        />
      )}
    </div>
  );
}
