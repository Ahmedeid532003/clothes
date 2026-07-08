import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Package, Plus, Search, Check, ChevronDown, ChevronRight, ChevronLeft, Eye, Edit2, Trash2, Filter, Grid, List, X, Settings, FileText, Boxes } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// MultiSelect Component
interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  isAr: boolean;
  disabled?: boolean;
}

function MultiSelect({ label, options, selected, onChange, isAr, disabled }: MultiSelectProps) {
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
    if (disabled) return;
    if (selected.includes(opt)) {
      onChange(selected.filter(item => item !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const handleSelectAll = () => {
    if (disabled) return;
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg p-2.5 flex justify-between items-center transition",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-orange-300"
        )}
      >
        <span className="truncate flex-1 text-right rtl:text-right font-bold">
          {selected.length === 0 ? label : `${label} (${selected.length})`}
        </span>
        <ChevronDown size={14} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </div>
      
      <AnimatePresence>
        {isOpen && !disabled && (
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

// Interfaces
interface InventoryCheckTabProps {
  lang: 'en' | 'ar';
  products: any[];
}

// Data for list
const mockInventoryChecks = [
  { id: 'INV-001', date: '2023-10-25', username: 'Ahmed Y.', diffValue: -15, status: 'settled' },
  { id: 'INV-002', date: '2023-10-26', username: 'Sarah K.', diffValue: 20, status: 'pending' },
  { id: 'INV-003', date: '2023-10-27', username: 'Hany D.', diffValue: -5, status: 'settled' },
  { id: 'INV-004', date: '2023-10-28', username: 'Omar F.', diffValue: 0, status: 'pending' },
];

export function InventoryCheckTab({ lang, products }: InventoryCheckTabProps) {
  const isAr = lang === 'ar';
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // List states
  const [searchTerm, setSearchTerm] = useState("");
  const [activePage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  
  const columnsList = [
    { key: 'date', labelEn: 'Date', labelAr: 'تاريخ' },
    { key: 'inventoryNumber', labelEn: 'Inventory Number', labelAr: 'رقم الجرد' },
    { key: 'username', labelEn: 'User Name', labelAr: 'اسم المستخدم' },
    { key: 'diffValue', labelEn: 'Difference Value', labelAr: 'قيمة الفروقات' },
    { key: 'status', labelEn: 'Status', labelAr: 'حالة الجرد' }
  ];

  const defaultVisibleColumns = columnsList.reduce((acc, col) => ({ ...acc, [col.key]: true }), {});
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(defaultVisibleColumns);
  const [tempVisibleColumns, setTempVisibleColumns] = useState<Record<string, boolean>>(defaultVisibleColumns);

  const applyColumnSettings = () => {
    setVisibleColumns(tempVisibleColumns);
    setColumnSettingsOpen(false);
  };

  const filteredData = mockInventoryChecks.filter(item => 
    item.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.username.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = filteredData.slice((activePage - 1) * pageSize, activePage * pageSize);

  if (isWizardOpen) {
    return <InventoryCheckWizard lang={lang} products={products} onClose={() => setIsWizardOpen(false)} />;
  }

  return (
    <div
      className={cn(
        "bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-6 font-sans",
        isAr && "rtl font-[Cairo] text-right"
      )}
    >
      {/* Page Header */}
      <div className="border-b border-[#eaeff2] pb-4 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="rtl:text-right text-left flex flex-col items-start shrink-0">
          <div className="flex items-center gap-2.5">
            <h3 className="text-md font-bold text-[#0a1945] flex items-center gap-1.5 font-sans">
              <Package className="text-orange-500" size={18} />
              <span>
                {isAr ? 'جرد الأصناف' : 'Inventory Check'}
              </span>
            </h3>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full border border-slate-200">
              {isAr ? `إجمالي الحركات: ${filteredData.length}` : `Checks: ${filteredData.length}`}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium block w-full mt-1">
            {isAr ? 'إدارة عمليات جرد الأصناف والفروقات' : 'Manage inventory checks and differences'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-start xl:justify-end">
          <button 
            onClick={() => setIsWizardOpen(true)}
            className="h-[38px] px-4 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer text-[11px] uppercase tracking-wider min-w-[200px]"
          >
            <Plus size={15} />
            <span>{isAr ? 'إضافة جرد جديد' : 'Add New Inventory Check'}</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col-reverse sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50 p-2.5 rounded-2xl border border-[#eaeff2]">
        {/* Right side (First in DOM so it goes to the Right in RTL) */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Settings Button */}
          <div className="relative">
            <button
              onClick={() => {
                setTempVisibleColumns({ ...visibleColumns });
                setColumnSettingsOpen(!columnSettingsOpen);
              }}
              className={cn(
                "w-[36px] h-[36px] flex items-center justify-center rounded-lg border transition cursor-pointer select-none",
                columnSettingsOpen
                  ? "bg-[#0a1945] text-white border-[#0a1945]"
                  : "bg-white text-slate-650 hover:text-orange-500 border-slate-200 hover:border-orange-400"
              )}
              title={isAr ? "تخصيص الأعمدة" : "Column Settings"}
            >
              <Settings size={15} />
            </button>
            {columnSettingsOpen && (
              <div className="absolute right-0 rtl:right-0 rtl:left-auto mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 p-3.5 text-xs text-left rtl:text-right">
                <div className="pb-2 border-b border-slate-100 mb-2.5 flex justify-between items-center rtl:flex-row-reverse">
                  <h4 className="font-extrabold text-slate-800 text-[12px]">{isAr ? 'أعمدة الجرد' : 'Check Columns'}</h4>
                  <button onClick={() => setColumnSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
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
                        className="accent-orange-500 rounded text-white cursor-pointer"
                      />
                      <span className="font-bold text-slate-700">{isAr ? col.labelAr : col.labelEn}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                  <button onClick={applyColumnSettings} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-1.5 rounded-lg font-bold transition-colors cursor-pointer">{isAr ? 'تطبيق' : 'Apply'}</button>
                  <button onClick={() => setColumnSettingsOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded-lg font-bold transition-colors cursor-pointer">{isAr ? 'إلغاء' : 'Cancel'}</button>
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

          {/* View Toggle */}
          <button
            onClick={() =>
              setViewMode(viewMode === "table" ? "kanban" : "table")
            }
            className="h-[36px] px-3 flex items-center justify-center gap-1.5 bg-white border border-slate-200 rounded-lg hover:border-orange-400 hover:text-orange-500 text-slate-650 hover:shadow-xs transition cursor-pointer select-none font-black text-[11px]"
            title={isAr ? "تبديل العرض" : "Toggle View"}
          >
            {viewMode === "table" ? (
              <>
                <Grid size={14} className="text-[#0a1945]" />
                <span>{isAr ? "بطاقات" : "Cards"}</span>
              </>
            ) : (
              <>
                <List size={14} className="text-orange-500" />
                <span>{isAr ? "جدول" : "Table"}</span>
              </>
            )}
          </button>
        </div>

        {/* Left side (Second in DOM so it goes to the Left in RTL) */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1 max-w-md justify-end">
          <button
            onClick={() => setIsAdvancedSearchOpen(!isAdvancedSearchOpen)}
            className={cn(
              "w-[36px] h-[36px] flex items-center justify-center rounded-lg border transition cursor-pointer select-none",
              isAdvancedSearchOpen
                ? "bg-[#0a1945] text-white border-[#0a1945]"
                : "bg-white text-orange-500 border-slate-200 hover:border-orange-400"
            )}
            title={isAr ? "بحث متقدم" : "Advanced Search"}
          >
            <Filter size={15} />
          </button>
          
          <div className="relative flex-1 flex items-center max-w-[300px]">
            <Search
              size={14}
              className="absolute left-3 rtl:right-3 rtl:left-auto text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={isAr ? "بحث برقم الجرد، أو المستخدم..." : "Search by ID or User..."}
              className="w-full text-xs p-2 pl-8 pr-8 rtl:pr-8 rtl:pl-8 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-400 transition h-[36px]"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
                className="absolute right-3 rtl:left-3 rtl:right-auto text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Search Panel */}
      {isAdvancedSearchOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-slate-50/80 border border-[#eaeff2] rounded-2xl p-4 overflow-hidden mb-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 rtl:text-right">
                {isAr ? "من تاريخ" : "Date From"}
              </label>
              <input
                type="date"
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-400 transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 rtl:text-right">
                {isAr ? "إلى تاريخ" : "Date To"}
              </label>
              <input
                type="date"
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-400 transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 rtl:text-right">
                {isAr ? "الحالة" : "Status"}
              </label>
              <select className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-400 transition appearance-none">
                <option value="">{isAr ? "الكل" : "All"}</option>
                <option value="settled">{isAr ? "تم التسويه" : "Settled"}</option>
                <option value="pending">{isAr ? "معلق كمسوده" : "Pending"}</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-200/60">
            <button
              onClick={() => setIsAdvancedSearchOpen(false)}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition cursor-pointer"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              className="px-4 py-1.5 bg-[#0a1945] hover:bg-[#11245b] text-white font-bold rounded-lg text-xs transition shadow-md cursor-pointer"
            >
              {isAr ? "تطبيق" : "Apply Filter"}
            </button>
          </div>
        </motion.div>
      )}

      {/* Table / Kanban */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm relative">
        {viewMode === "table" ? (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-xs text-left rtl:text-right text-slate-600 whitespace-nowrap">
              <thead className="text-[10px] text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                <tr>
                  {visibleColumns.date && <th className="px-4 py-3 font-extrabold">{isAr ? 'تاريخ' : 'Date'}</th>}
                  {visibleColumns.inventoryNumber && <th className="px-4 py-3 font-extrabold">{isAr ? 'رقم الجرد' : 'Inventory Number'}</th>}
                  {visibleColumns.username && <th className="px-4 py-3 font-extrabold">{isAr ? 'اسم المستخدم' : 'User Name'}</th>}
                  {visibleColumns.diffValue && <th className="px-4 py-3 font-extrabold">{isAr ? 'قيمة الفروقات' : 'Difference Value'}</th>}
                  {visibleColumns.status && <th className="px-4 py-3 font-extrabold">{isAr ? 'حالة الجرد' : 'Status'}</th>}
                  <th className="px-4 py-3 font-extrabold text-center w-32">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map(m => (
                  <motion.tr key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-slate-100 hover:bg-orange-50/30 transition-colors">
                    {visibleColumns.date && <td className="px-4 py-3.5 font-bold text-slate-700">{m.date}</td>}
                    {visibleColumns.inventoryNumber && <td className="px-4 py-3.5 font-mono font-black text-orange-600"><span className="bg-orange-50 px-2 py-1 rounded-md">{m.id}</span></td>}
                    {visibleColumns.username && <td className="px-4 py-3.5 font-bold text-slate-600">{m.username}</td>}
                    {visibleColumns.diffValue && (
                      <td className="px-4 py-3.5">
                        <span className={cn(
                          "font-black px-2 py-1 rounded text-[11px]",
                          m.diffValue > 0 ? "bg-emerald-100 text-emerald-700" :
                          m.diffValue < 0 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
                        )}>
                          {m.diffValue > 0 ? '+' : ''}{m.diffValue}
                        </span>
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="px-4 py-3.5">
                        <span className={cn(
                          "font-bold text-[10px] px-2 py-1 rounded-full uppercase tracking-wider border",
                          m.status === 'settled' ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"
                        )}>
                          {m.status === 'settled' ? (isAr ? 'تم التسويه' : 'Settled') : (isAr ? 'معلق كمسوده' : 'Pending')}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3.5 w-32">
                      <div className="flex gap-1 justify-center">
                        <button className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center hover:bg-sky-500 hover:text-white transition-colors cursor-pointer shadow-xs border border-sky-100 hover:border-sky-500" title={isAr ? "عرض" : "View"}><Eye size={13} strokeWidth={2.5} /></button>
                        <button className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-colors cursor-pointer shadow-xs border border-indigo-100 hover:border-indigo-500" title={isAr ? "تعديل" : "Edit"}><Edit2 size={13} strokeWidth={2.5} /></button>
                        <button className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors cursor-pointer shadow-xs border border-rose-100 hover:border-rose-500" title={isAr ? "حذف" : "Delete"}><Trash2 size={13} strokeWidth={2.5} /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-500">{isAr ? 'لا توجد بيانات مطابقة' : 'No matching data found'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 bg-slate-50/50">
            {paginatedData.map(m => (
              <motion.div key={m.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-orange-300 transition-all">
                <div className="flex justify-between items-start mb-3">
                  <div className="bg-orange-50 px-2.5 py-1 rounded-lg text-orange-600 font-mono font-black text-xs border border-orange-100">
                    {m.id}
                  </div>
                  <span className={cn(
                    "font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider border",
                    m.status === 'settled' ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"
                  )}>
                    {m.status === 'settled' ? (isAr ? 'تم التسويه' : 'Settled') : (isAr ? 'معلق كمسوده' : 'Pending')}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-bold">{isAr ? 'التاريخ:' : 'Date:'}</span>
                    <span className="font-bold text-slate-700">{m.date}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-bold">{isAr ? 'المستخدم:' : 'User:'}</span>
                    <span className="font-bold text-slate-700">{m.username}</span>
                  </div>
                  <div className="flex justify-between text-xs pt-2 border-t border-slate-100">
                    <span className="text-slate-400 font-bold">{isAr ? 'الفروقات:' : 'Differences:'}</span>
                    <span className={cn(
                      "font-black px-2 py-0.5 rounded text-[11px]",
                      m.diffValue > 0 ? "bg-emerald-100 text-emerald-700" :
                      m.diffValue < 0 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
                    )}>
                      {m.diffValue > 0 ? '+' : ''}{m.diffValue}
                    </span>
                  </div>
                </div>

                <div className="flex gap-1 justify-center pt-3 border-t border-slate-100">
                  <button className="flex-1 py-1.5 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center gap-1 hover:bg-sky-500 hover:text-white transition-colors cursor-pointer shadow-xs border border-sky-100 hover:border-sky-500 text-xs font-bold" title={isAr ? "عرض" : "View"}><Eye size={13} strokeWidth={2.5} /> <span>{isAr ? "عرض" : "View"}</span></button>
                  <button className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-colors cursor-pointer shadow-xs border border-indigo-100 hover:border-indigo-500" title={isAr ? "تعديل" : "Edit"}><Edit2 size={13} strokeWidth={2.5} /></button>
                  <button className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors cursor-pointer shadow-xs border border-rose-100 hover:border-rose-500" title={isAr ? "حذف" : "Delete"}><Trash2 size={13} strokeWidth={2.5} /></button>
                </div>
              </motion.div>
            ))}
            {paginatedData.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 font-bold bg-white rounded-xl border border-slate-100">
                {isAr ? 'لا توجد بيانات مطابقة' : 'No matching data found'}
              </div>
            )}
          </div>
        )}

        {/* Footer Pagination */}
        <div className="p-4 border-t border-slate-150 flex flex-col md:flex-row items-center justify-between gap-4 text-xs bg-slate-50/40 rounded-b-3xl text-slate-600">
          <div className="flex items-center gap-2 font-bold w-full md:w-1/3 justify-center md:justify-start">
            <select 
              value={pageSize} 
              onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
              }}
              className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg focus:ring-orange-500 focus:border-orange-500 block h-[28px] w-[45px] p-0 text-center outline-none cursor-pointer"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
            <span>{isAr ? 'سطر لكل صفحة' : 'Rows per page'}</span>
          </div>

          <div className="flex items-center gap-1 select-none w-full md:w-1/3 justify-center">
            <button disabled={activePage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="p-1.5 border border-slate-200 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-600 hover:border-orange-400 hover:text-orange-500 transition cursor-pointer">
              {isAr ? <ChevronRight size={13} strokeWidth={2.5} /> : <ChevronLeft size={13} strokeWidth={2.5} />}
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                if (page === 1 || page === totalPages || Math.abs(page - activePage) <= 1) {
                  return (
                    <button key={page} onClick={() => setCurrentPage(page)} className={cn("w-7 h-7 flex items-center justify-center rounded-lg font-black transition cursor-pointer", activePage === page ? "bg-orange-500 text-white shadow-sm border border-orange-600" : "bg-white text-slate-600 border border-slate-200 hover:border-orange-400 hover:text-orange-500")}>
                      {page}
                    </button>
                  );
                }
                if (Math.abs(page - activePage) === 2) return <span key={page} className="px-1 text-slate-400">...</span>;
                return null;
              })}
            </div>
            <button disabled={activePage === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className="p-1.5 border border-slate-200 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-600 hover:border-orange-400 hover:text-orange-500 transition cursor-pointer">
              {isAr ? <ChevronLeft size={13} strokeWidth={2.5} /> : <ChevronRight size={13} strokeWidth={2.5} />}
            </button>
          </div>

          <div className="flex items-center gap-1.5 font-bold w-full md:w-1/3 justify-center md:justify-end">
            {isAr ? (
              <><span>عرض</span><span className="font-mono font-black bg-slate-200/50 border border-slate-300 px-2 py-0.5 rounded text-[#0a1945]">{paginatedData.length}</span><span>من أصل</span><span className="font-mono font-black bg-orange-100/50 border border-orange-200 px-2 py-0.5 rounded text-[#f06424]">{filteredData.length}</span></>
            ) : (
              <><span>Showing</span><span className="font-mono font-black bg-slate-200/50 border border-slate-300 px-2 py-0.5 rounded text-[#0a1945]">{paginatedData.length}</span><span>of</span><span className="font-mono font-black bg-orange-100/50 border border-orange-200 px-2 py-0.5 rounded text-[#f06424]">{filteredData.length}</span></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface InventoryCheckWizardProps {
  lang: 'en' | 'ar';
  products: any[];
  onClose: () => void;
}

export function InventoryCheckWizard({ lang, products, onClose }: InventoryCheckWizardProps) {
  const isAr = lang === 'ar';
  const [step, setStep] = useState(1);
  
  // Step 1 states
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [isOrderPopupOpen, setIsOrderPopupOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  
  const [searchBarcode, setSearchBarcode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  
  // Step 2 states
  const [compareMode, setCompareMode] = useState<'book' | 'custom'>('book');
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
  const locations = uniqueVals('branch');

  // Headers texts
  const stepTitles = [
    isAr ? '1. ادخال الاصناف' : '1. Enter Items',
    isAr ? '2. اختيار المقارنة' : '2. Select Comparison',
    isAr ? '3. المراجعة والتسوية' : '3. Review & Settle'
  ];
  const stepDescriptions = [
    isAr ? '1 - قم بادخال الجرد الفعلى للاصناف سواء يدوى او من اوردر' : '1 - Enter the actual physical inventory, manually or from an order',
    isAr ? '2 - قم باختيار هل تقارن الصنف الفعلى برصيده الدفترى ام ستقارن الاصناف المدخله باصناف مجموعه - مورد - براند - او اى تصنيف معين' : '2 - Choose whether to compare the actual item with its book balance or compare the entered items with items of a specific group, supplier, brand, or any specific classification',
    isAr ? '3 - بعد مقارنه الاعداد الفعليه بالدفتره اضغط على تسويه سيقوم النظام بعمل تسويه بالفروقات اليا وضبط الرصيد الدفترى على الجرد الفعلى' : '3 - After comparing actual and book numbers, click settle. The system will automatically settle the differences and adjust the book balance to the actual inventory'
  ];

  const handleSearchEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchBarcode.trim()) {
      // Find product
      const product = products.find(p => p.barcode === searchBarcode.trim() || p.code === searchBarcode.trim() || p.nameAr?.includes(searchBarcode.trim()) || p.nameEn?.includes(searchBarcode.trim()));
      if (product) {
        setSelectedProduct(product);
        setTimeout(() => qtyInputRef.current?.focus(), 10);
      } else {
        // If not found, just use the barcode as name for mock
        setSelectedProduct({ barcode: searchBarcode.trim(), nameAr: 'صنف غير معروف', nameEn: 'Unknown Item', bookQty: 0 });
        setTimeout(() => qtyInputRef.current?.focus(), 10);
      }
    }
  };

  const handleQtyEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && quantity && selectedProduct) {
      // Add to scanned items
      const existing = scannedItems.find(i => i.barcode === selectedProduct.barcode);
      if (existing) {
        setScannedItems(scannedItems.map(i => i.barcode === selectedProduct.barcode ? { ...i, actualQty: i.actualQty + Number(quantity) } : i));
      } else {
        // Mock book qty based on actual qty to simulate diffs later
        const bookQty = selectedProduct.bookQty !== undefined ? selectedProduct.bookQty : Math.floor(Math.random() * 20);
        setScannedItems([...scannedItems, { ...selectedProduct, actualQty: Number(quantity), bookQty }]);
      }
      
      // Reset
      setSearchBarcode('');
      setQuantity('');
      setSelectedProduct(null);
      setTimeout(() => searchInputRef.current?.focus(), 10);
    }
  };

  const handleOrderSubmit = () => {
    if (!orderNumber) return;
    // Mock loading items from order
    const mockOrderItems = [
      { barcode: '100011', nameAr: 'تي شيرت قطني', nameEn: 'Cotton T-Shirt', actualQty: 10, bookQty: 12 },
      { barcode: '100012', nameAr: 'بنطلون جينز', nameEn: 'Jeans', actualQty: 5, bookQty: 5 },
      { barcode: '100013', nameAr: 'حذاء رياضي', nameEn: 'Sneakers', actualQty: 3, bookQty: 1 },
    ];
    
    // Merge into scanned items
    const newItems = [...scannedItems];
    mockOrderItems.forEach(mi => {
      const ex = newItems.find(i => i.barcode === mi.barcode);
      if (ex) {
        ex.actualQty += mi.actualQty;
      } else {
        newItems.push(mi);
      }
    });
    
    setScannedItems(newItems);
    setIsOrderPopupOpen(false);
    setOrderNumber('');
  };

  const totalDifferences = useMemo(() => {
    let shortage = 0;
    let surplus = 0;
    scannedItems.forEach(item => {
      const diff = item.actualQty - item.bookQty;
      if (diff < 0) shortage += Math.abs(diff);
      if (diff > 0) surplus += diff;
    });
    return { shortage, surplus };
  }, [scannedItems]);

  return (
    <div className={cn("space-y-6 pb-20", isAr && "rtl font-[Cairo]")}>
      {/* Wizard Header */}
      <div className="bg-white border border-[#eaeff2] rounded-3xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col gap-4 relative z-10">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <div className="bg-orange-100 text-orange-600 p-2 rounded-xl">
                <Package size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800">
                  {isAr ? 'جرد أصناف جديد' : 'New Inventory Check'}
                </h2>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-xl transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Stepper */}
          <div className="flex justify-between items-center w-full max-w-3xl mx-auto mt-4">
            {[1, 2, 3].map((s, idx) => (
              <React.Fragment key={s}>
                <div 
                  className={cn(
                    "flex flex-col items-center gap-2 relative group cursor-default transition-all",
                    step >= s ? "opacity-100" : "opacity-50"
                  )}
                  title={stepDescriptions[s-1]}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-colors shadow-sm",
                    step === s ? "bg-orange-500 text-white border-4 border-orange-100" : 
                    step > s ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400 border border-slate-200"
                  )}>
                    {step > s ? <Check size={18} strokeWidth={3} /> : s}
                  </div>
                  <span className={cn(
                    "text-[11px] font-bold absolute -bottom-6 whitespace-nowrap",
                    step >= s ? "text-slate-800" : "text-slate-400"
                  )}>
                    {stepTitles[s-1]}
                  </span>
                  
                  {/* Tooltip on hover */}
                  <div className="absolute top-12 w-64 bg-slate-800 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 text-center font-medium shadow-xl">
                    {stepDescriptions[s-1]}
                  </div>
                </div>
                {idx < 2 && (
                  <div className={cn(
                    "flex-1 h-1 rounded-full mx-4 transition-colors",
                    step > s ? "bg-emerald-400" : "bg-slate-100"
                  )} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Current Step Description */}
          <div className="mt-8 text-center">
            <p className="text-[13px] font-bold text-slate-600 bg-slate-50 border border-slate-200 py-2 px-6 rounded-xl inline-block shadow-sm">
              {stepDescriptions[step - 1]}
            </p>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm min-h-[400px] flex flex-col"
        >
          {step === 1 && (
            <>
              {/* Toolbar */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <button
                  onClick={() => setIsOrderPopupOpen(true)}
                  className="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-indigo-100 shadow-sm cursor-pointer"
                >
                  <FileText size={15} />
                  <span>{isAr ? 'ادخال من اوردر' : 'Enter from Order'}</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <input 
                      ref={searchInputRef}
                      type="text"
                      value={searchBarcode}
                      onChange={e => setSearchBarcode(e.target.value)}
                      onKeyDown={handleSearchEnter}
                      placeholder={isAr ? 'بحث بالباركود أو الاسم...' : 'Search by barcode or name...'}
                      className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded-xl focus:ring-orange-500 focus:border-orange-500 block p-2.5 rtl:pr-10 outline-none shadow-sm font-medium"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 right-3 rtl:right-3 rtl:left-auto" />
                  </div>
                  
                  <div className="w-24">
                    <input 
                      ref={qtyInputRef}
                      type="number"
                      value={quantity}
                      onChange={e => setQuantity(e.target.value)}
                      onKeyDown={handleQtyEnter}
                      placeholder={isAr ? 'الكمية' : 'Qty'}
                      className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded-xl focus:ring-orange-500 focus:border-orange-500 block p-2.5 text-center outline-none shadow-sm font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="flex-1 overflow-x-auto p-4">
                <table className="w-full text-xs text-left rtl:text-right text-slate-600">
                  <thead className="text-[10px] text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">{isAr ? 'الباركود' : 'Barcode'}</th>
                      <th className="px-4 py-3">{isAr ? 'اسم الصنف' : 'Item Name'}</th>
                      <th className="px-4 py-3 text-center">{isAr ? 'الكمية الفعلية' : 'Actual Qty'}</th>
                      <th className="px-4 py-3 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scannedItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-slate-400 font-medium border-b border-slate-100">
                          <div className="flex flex-col items-center gap-2">
                            <Boxes size={32} className="text-slate-300" />
                            <span>{isAr ? 'لم يتم إدخال أي أصناف بعد' : 'No items entered yet'}</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      scannedItems.map((item, idx) => (
                        <tr key={idx} className="bg-white border-b border-slate-100 hover:bg-slate-50/50 transition">
                          <td className="px-4 py-3 font-mono font-bold text-slate-800">{item.barcode}</td>
                          <td className="px-4 py-3 font-bold text-slate-700">{isAr ? item.nameAr : item.nameEn}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-emerald-50 text-emerald-600 font-black px-3 py-1 rounded-lg">
                              {item.actualQty}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button 
                              onClick={() => setScannedItems(scannedItems.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition cursor-pointer"
                            >
                              <X size={14} strokeWidth={3} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="p-6 flex-1 flex flex-col">
              <div className="mb-6 space-y-4 max-w-2xl mx-auto w-full">
                {/* Options */}
                <div 
                  onClick={() => setCompareMode('book')}
                  className={cn(
                    "p-4 border rounded-2xl cursor-pointer transition-all flex items-center gap-3",
                    compareMode === 'book' ? "border-orange-500 bg-orange-50 shadow-md" : "border-slate-200 hover:border-orange-300 bg-white"
                  )}
                >
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors", compareMode === 'book' ? "border-orange-500" : "border-slate-300")}>
                    {compareMode === 'book' && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                  </div>
                  <span className="font-bold text-sm text-slate-800">
                    {isAr ? 'مقارنة الاكواد المدخلة بأرصدتها الدفترية' : 'Compare entered codes with book balances'}
                  </span>
                </div>

                <div 
                  onClick={() => setCompareMode('custom')}
                  className={cn(
                    "p-4 border rounded-2xl cursor-pointer transition-all flex items-center gap-3",
                    compareMode === 'custom' ? "border-orange-500 bg-orange-50 shadow-md" : "border-slate-200 hover:border-orange-300 bg-white"
                  )}
                >
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors", compareMode === 'custom' ? "border-orange-500" : "border-slate-300")}>
                    {compareMode === 'custom' && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                  </div>
                  <span className="font-bold text-sm text-slate-800">
                    {isAr ? 'مقارنة الاكواد المدخلة بفئات مخصصة' : 'Compare entered codes with custom categories'}
                  </span>
                </div>
              </div>

              {/* Filters */}
              <div className={cn("transition-opacity duration-300 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto w-full", compareMode === 'custom' ? "opacity-100" : "opacity-40 pointer-events-none")}>
                <MultiSelect label={isAr ? 'اختر المورد' : 'Select Supplier'} options={suppliers} selected={selectedSuppliers} onChange={setSelectedSuppliers} isAr={isAr} disabled={compareMode !== 'custom'} />
                <MultiSelect label={isAr ? 'اختر القسم' : 'Select Department'} options={departments} selected={selectedDepartments} onChange={setSelectedDepartments} isAr={isAr} disabled={compareMode !== 'custom'} />
                <MultiSelect label={isAr ? 'اختر الموسم' : 'Select Season'} options={seasons} selected={selectedSeasons} onChange={setSelectedSeasons} isAr={isAr} disabled={compareMode !== 'custom'} />
                <MultiSelect label={isAr ? 'اختر البراند' : 'Select Brand'} options={brands} selected={selectedBrands} onChange={setSelectedBrands} isAr={isAr} disabled={compareMode !== 'custom'} />
                <MultiSelect label={isAr ? 'اختر مجموعة الصنف' : 'Select Category'} options={categories} selected={selectedCategories} onChange={setSelectedCategories} isAr={isAr} disabled={compareMode !== 'custom'} />
                <MultiSelect label={isAr ? 'اختر بند الصنف' : 'Select Subcategory'} options={subcategories} selected={selectedSubcategories} onChange={setSelectedSubcategories} isAr={isAr} disabled={compareMode !== 'custom'} />
                <MultiSelect label={isAr ? 'اختر مكان الصنف' : 'Select Location'} options={locations} selected={selectedLocations} onChange={setSelectedLocations} isAr={isAr} disabled={compareMode !== 'custom'} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex-1 flex flex-col p-4">
              <div className="overflow-x-auto border border-slate-200 rounded-2xl mb-4 bg-white shadow-sm">
                <table className="w-full text-xs text-left rtl:text-right text-slate-600">
                  <thead className="text-[10px] text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">{isAr ? 'الباركود' : 'Barcode'}</th>
                      <th className="px-4 py-3">{isAr ? 'اسم الصنف' : 'Item Name'}</th>
                      <th className="px-4 py-3 text-center bg-orange-50/50">{isAr ? 'الكمية الفعلية' : 'Actual Qty'}</th>
                      <th className="px-4 py-3 text-center bg-slate-100/50">{isAr ? 'الرصيد الدفتري' : 'Book Balance'}</th>
                      <th className="px-4 py-3 text-center">{isAr ? 'الفرق' : 'Difference'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scannedItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-slate-400 font-medium">
                          {isAr ? 'لا توجد أصناف للمقارنة' : 'No items to compare'}
                        </td>
                      </tr>
                    ) : (
                      scannedItems.map((item, idx) => {
                        const diff = item.actualQty - item.bookQty;
                        return (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition">
                            <td className="px-4 py-3 font-mono font-bold text-slate-800">{item.barcode}</td>
                            <td className="px-4 py-3 font-bold text-slate-700">{isAr ? item.nameAr : item.nameEn}</td>
                            <td className="px-4 py-3 text-center bg-orange-50/20 font-black text-slate-800">{item.actualQty}</td>
                            <td className="px-4 py-3 text-center bg-slate-50/50 font-bold text-slate-500">{item.bookQty}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={cn(
                                "px-2 py-1 rounded-md font-black font-mono text-[11px]",
                                diff === 0 ? "bg-slate-100 text-slate-500" :
                                diff > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                              )}>
                                {diff > 0 ? '+' : ''}{diff}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex justify-between items-center mt-auto">
                <span className="font-bold text-sm text-slate-700">{isAr ? 'إجمالي الفروقات:' : 'Total Differences:'}</span>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-emerald-600 font-bold uppercase mb-1">{isAr ? 'زيادة' : 'Surplus'}</span>
                    <span className="font-black text-emerald-600 text-lg bg-emerald-100 px-4 py-1 rounded-xl">+{totalDifferences.surplus}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-red-600 font-bold uppercase mb-1">{isAr ? 'عجز' : 'Shortage'}</span>
                    <span className="font-black text-red-600 text-lg bg-red-100 px-4 py-1 rounded-xl">-{totalDifferences.shortage}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Wizard Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex justify-between items-center rounded-b-3xl">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
              >
                {isAr ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                <span>{isAr ? 'السابق' : 'Previous'}</span>
              </button>
            ) : <div />}

            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && scannedItems.length === 0}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>{isAr ? 'التالي' : 'Next'}</span>
                {isAr ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs transition-colors shadow-sm cursor-pointer">
                  {isAr ? 'حفظ مسودة' : 'Save Draft'}
                </button>
                <button onClick={onClose} className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-colors shadow-md cursor-pointer">
                  <Check size={16} strokeWidth={3} />
                  <span>{isAr ? 'تسوية الآن' : 'Settle Now'}</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Order Popup */}
      <AnimatePresence>
        {isOrderPopupOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-lg text-slate-800">{isAr ? 'إدخال من أوردر' : 'Enter from Order'}</h3>
                <button onClick={() => setIsOrderPopupOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-lg transition cursor-pointer">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2">{isAr ? 'رقم الأوردر' : 'Order Number'}</label>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleOrderSubmit()}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="ORD-..."
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleOrderSubmit}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-3 rounded-xl shadow-md transition-colors text-sm cursor-pointer"
                >
                  {isAr ? 'تأكيد' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
