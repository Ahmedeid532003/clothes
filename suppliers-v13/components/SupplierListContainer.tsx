import React, { useState, useMemo, useEffect } from 'react';
import { 
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
  AlertTriangle,
  MessageCircle,
  FileSpreadsheet,
  GripVertical,
  Wallet,
  MoreVertical
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SupplierListContainerProps {
  lang: 'ar' | 'en';
  filteredSuppliers: any[];
  richSuppliers: any[];
  groups: any[];
  setViewingSupplier: (p: any) => void;
  openEditSupplierModal: (p: any) => void;
  handleDeleteSupplier: (id: string) => void;
  onOpenStatement?: (p: any) => void;
  onAddPayment?: (p: any) => void;
  triggerToast: (msg: string) => void;
  prodSearchQuery: string;
  setProdSearchQuery: (q: string) => void;
  isColumnFiltersOpen: boolean;
  setIsColumnFiltersOpen: (open: boolean) => void;
  extraToolbarAction?: React.ReactNode;
  advName: string;
  setAdvName: (v: string) => void;
  advPhone: string;
  setAdvPhone: (v: string) => void;
  advType: string;
  setAdvType: (v: string) => void;
  advGroup: string;
  setAdvGroup: (v: string) => void;
  initialViewMode?: 'table' | 'kanban';
  defaultVisibleColumns?: Record<string, boolean>;
}

export const SupplierListContainer: React.FC<SupplierListContainerProps> = ({
  lang,
  filteredSuppliers,
  groups,
  setViewingSupplier,
  openEditSupplierModal,
  handleDeleteSupplier,
  onOpenStatement,
  onAddPayment,
  triggerToast,
  prodSearchQuery,
  setProdSearchQuery,
  isColumnFiltersOpen,
  setIsColumnFiltersOpen,
  extraToolbarAction,
  advName,
  setAdvName,
  advPhone,
  setAdvPhone,
  advType,
  setAdvType,
  advGroup,
  setAdvGroup,
  defaultVisibleColumns,
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
    name: true,
    type: true,
    group: true,
    phone: true,
    whatsapp: true,
    inventoryDay: true,
    address: true,
    contactPerson: true,
    checkName: true,
    departments: true,
    balance: true
  });

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.supplier-action-dropdown')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [tempVisibleColumns, setTempVisibleColumns] = useState<Record<string, boolean>>({ ...visibleColumns });

  // Re-sync if defaultVisibleColumns changes
  useEffect(() => {
    if (defaultVisibleColumns) {
      setVisibleColumns(defaultVisibleColumns);
      setTempVisibleColumns(defaultVisibleColumns);
    }
  }, [JSON.stringify(defaultVisibleColumns)]);

  // Reset pagination when search changes
  useEffect(() => {
    setProdCurrentPage(1);
  }, [prodSearchQuery, filteredSuppliers.length]);

  // Pagination calculation
  const totalProdPages = Math.ceil(filteredSuppliers.length / prodPageSize) || 1;
  const activeProdPage = Math.min(prodCurrentPage, totalProdPages);
  const prodStartIndex = (activeProdPage - 1) * prodPageSize;
  const paginatedSuppliers = useMemo(() => {
    return filteredSuppliers.slice(prodStartIndex, prodStartIndex + prodPageSize);
  }, [filteredSuppliers, prodStartIndex, prodPageSize]);

  const customColumnLabels: Record<string, { en: string; ar: string }> = {
    name: { en: 'Supplier Name', ar: 'اسم المورد' },
    type: { en: 'Type', ar: 'النوع' },
    group: { en: 'Group', ar: 'المجموعة' },
    phone: { en: 'Phone', ar: 'الهاتف' },
    whatsapp: { en: 'WhatsApp', ar: 'واتساب' },
    inventoryDay: { en: 'Inventory Day', ar: 'يوم الجرد' },
    address: { en: 'Address', ar: 'العنوان' },
    contactPerson: { en: 'Contact Person', ar: 'المسؤول' },
    checkName: { en: 'Check Name', ar: 'اسم الشيكات' },
    departments: { en: 'Departments', ar: 'الأقسام' },
    balance: { en: 'Current Balance', ar: 'الرصيد الحالي' },
  };

  return (
    <div className="space-y-4">
      {/* VIEW 1: DESKTOP CONTAINER (Visible on md and larger) */}
      <div className="hidden md:block bg-white border border-gray-300 rounded-lg overflow-visible shadow-sm relative pt-[13px] mt-[0px] mb-[0px] min-h-fit -mx-[8px]">
        <div className="p-[5px] mt-[-13px] h-[43px] border-b border-[#eaeff2] bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 w-full rounded-t-lg overflow-visible relative z-40">
          {/* Actions: Cards | Download | Settings (physical LTR so Settings is right of Download) */}
          <div className="flex items-center gap-2 w-full md:w-auto h-full" dir="ltr">
            <button 
              onClick={() => setDirViewMode(dirViewMode === 'table' ? 'kanban' : 'table')} 
              className="h-8 px-3 flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-lg hover:border-orange-400 hover:text-orange-500 text-slate-600 transition-all cursor-pointer active:scale-95 font-black text-[11px] shadow-sm shrink-0"
            >
              {dirViewMode === 'table' ? (
                <>
                  <Grid size={14} className="text-[#f06424]" />
                  <span className="hidden sm:inline">{lang === 'ar' ? 'بطاقات' : 'Cards'}</span>
                </>
              ) : (
                <>
                  <List size={14} className="text-[#f06424]" />
                  <span className="hidden sm:inline">{lang === 'ar' ? 'جدول' : 'Table'}</span>
                </>
              )}
            </button>

            {extraToolbarAction && (
              <div className="flex items-center h-8 shrink-0">
                {extraToolbarAction}
              </div>
            )}

            <div className="relative flex items-center h-8 shrink-0">
              <button 
                type="button"
                onClick={() => { setTempVisibleColumns({ ...visibleColumns }); setColumnSettingsOpen(!columnSettingsOpen); }} 
                className="w-8 h-8 flex items-center justify-center text-orange-500 bg-white border border-gray-300 hover:border-orange-400 hover:bg-orange-50 rounded-lg shadow-sm transition-all cursor-pointer active:scale-95"
                title={lang === 'ar' ? 'تخصيص الأعمدة' : 'Columns'}
              >
                <Settings size={15} />
              </button>
              {columnSettingsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setColumnSettingsOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="absolute mt-2 top-full left-0 w-48 bg-white rounded-lg border border-gray-300 shadow-2xl z-50 overflow-visible"
                  >
                    <div className="px-3 py-2 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-lg rtl:flex-row-reverse">
                      <button type="button" onClick={() => setColumnSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={12} />
                      </button>
                      <h4 className="font-bold text-[#1e293b] text-[11px]">
                        {lang === 'ar' ? 'اختر الأعمدة' : 'Choose Columns'}
                      </h4>
                    </div>
                    <div className="p-1.5 space-y-0 max-h-72 overflow-y-auto custom-scrollbar text-start rtl:text-right bg-white">
                      {Object.entries(customColumnLabels).map(([key, value]) => (
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
                        type="button"
                        onClick={() => {
                          setTempVisibleColumns({ ...visibleColumns });
                        }}
                        className="px-2.5 py-1 bg-white border border-gray-300 hover:bg-gray-50 text-slate-700 rounded-lg text-[10px] font-bold transition-all"
                      >
                        {lang === 'ar' ? 'إعادة' : 'Reset'}
                      </button>
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={() => setColumnSettingsOpen(false)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all"
                        >
                          {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button 
                          type="button"
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
                  </motion.div>
                </>
              )}
            </div>
          </div>

          {/* Right / Bottom on mobile: Search / Advanced Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto md:flex-1 md:max-w-md md:justify-end h-full">
            <button 
              onClick={() => setIsColumnFiltersOpen(!isColumnFiltersOpen)} 
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-lg border transition-all cursor-pointer active:scale-95 shadow-sm", 
                isColumnFiltersOpen ? "bg-[#0a1945] text-white border-[#0a1945]" : "bg-white text-orange-500 border-gray-300 hover:border-orange-400"
              )} 
              title={lang === 'ar' ? 'بحث متقدم' : 'Advanced Search'}
            >
              <Filter size={15} />
            </button>
            <div className="relative flex-1 md:max-w-[280px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 rtl:right-3 rtl:left-auto text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={prodSearchQuery}
                onChange={(e) => {
                  setProdSearchQuery(e.target.value);
                  setProdCurrentPage(1);
                }}
                placeholder={lang === 'ar' ? "البحث بالاسم..." : "Search by name..."}
                className="w-full h-8 text-xs pl-9 pr-9 rtl:pr-9 rtl:pl-9 bg-white border border-gray-300 rounded-lg outline-none focus:border-orange-400 transition-all font-bold placeholder:text-slate-400"
              />
              {prodSearchQuery && (
                <button 
                  onClick={() => { setProdSearchQuery(''); setProdCurrentPage(1); }} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 rtl:left-3 rtl:right-auto p-1 text-slate-300 hover:text-orange-500 transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {dirViewMode === 'table' ? (
          <div className="overflow-x-auto relative bg-white min-h-[350px] pb-[300px] w-full">
            <table className="w-full text-left rtl:text-right border-collapse text-xs font-bold text-slate-700">
              <thead className="sticky top-0 z-30 bg-orange-500 text-white select-none">
                <tr className="bg-[#f06424] text-white font-extrabold border-b border-orange-600">
                  <th className="p-3.5 h-[35.5px] w-[50px] text-center" />
                  {visibleColumns.name && <th className="p-3.5 h-[35.5px] min-w-[185px] text-start uppercase tracking-wider">{lang === 'ar' ? 'اسم المورد' : 'Supplier Name'}</th>}
                  {visibleColumns.type && <th className="p-3.5 h-[35.5px] text-center uppercase tracking-wider">{lang === 'ar' ? 'النوع' : 'Type'}</th>}
                  {visibleColumns.group && <th className="p-3.5 h-[35.5px] text-center uppercase tracking-wider">{lang === 'ar' ? 'المجموعة' : 'Group'}</th>}
                  {visibleColumns.phone && <th className="p-3.5 h-[35.5px] text-center uppercase tracking-wider">{lang === 'ar' ? 'الهاتف' : 'Phone'}</th>}
                  {visibleColumns.whatsapp && <th className="p-3.5 h-[35.5px] text-center uppercase tracking-wider">{lang === 'ar' ? 'واتساب' : 'WhatsApp'}</th>}
                  {visibleColumns.inventoryDay && <th className="p-3.5 h-[35.5px] text-center uppercase tracking-wider">{lang === 'ar' ? 'يوم الجرد' : 'Inventory Day'}</th>}
                  {visibleColumns.address && <th className="p-3.5 h-[35.5px] text-center uppercase tracking-wider">{lang === 'ar' ? 'العنوان' : 'Address'}</th>}
                  {visibleColumns.contactPerson && <th className="p-3.5 h-[35.5px] text-center uppercase tracking-wider">{lang === 'ar' ? 'المسؤول' : 'Contact'}</th>}
                  {visibleColumns.checkName && <th className="p-3.5 h-[35.5px] text-center uppercase tracking-wider">{lang === 'ar' ? 'اسم الشيكات' : 'Check Name'}</th>}
                  {visibleColumns.departments && <th className="p-3.5 h-[35.5px] text-center uppercase tracking-wider">{lang === 'ar' ? 'الأقسام' : 'Departments'}</th>}
                  {visibleColumns.balance && <th className="p-3.5 h-[35.5px] text-center uppercase tracking-wider">{lang === 'ar' ? 'الرصيد الحالي' : 'Current Balance'}</th>}
                </tr>
                  {isColumnFiltersOpen && (
                    <tr className="bg-slate-100 border-b border-gray-300 text-slate-700">
                      <td className="py-1.5 px-2 text-center">
                        <button
                          onClick={() => {
                            setAdvName('');
                            setAdvPhone('');
                            setAdvType('');
                            setAdvGroup('');
                          }}
                          className="p-1 mx-auto bg-white border border-red-200 hover:border-red-400 text-red-500 rounded text-[10px] font-black cursor-pointer block"
                          title={lang === 'ar' ? 'إعادة ضبط' : 'Reset'}
                        >
                          <X size={14} className="mx-auto" />
                        </button>
                      </td>
                      {visibleColumns.name && (
                        <td className="py-1.5 px-3">
                          <input
                            type="text"
                            value={advName}
                            onChange={(e) => setAdvName(e.target.value)}
                            placeholder={lang === 'ar' ? 'بحث بالاسم...' : 'Filter...'}
                            className="w-full text-[10px] p-1.5 px-2 bg-white border border-gray-300 rounded-lg outline-none focus:border-orange-400 font-sans text-center font-bold"
                          />
                        </td>
                      )}
                      {visibleColumns.type && (
                        <td className="py-1.5 px-3 text-center">
                          <select
                            value={advType}
                            onChange={(e) => setAdvType(e.target.value)}
                            className="w-full text-[10px] p-1 bg-white border border-gray-300 rounded-lg outline-none focus:border-orange-400 font-sans font-bold"
                          >
                            <option value="">{lang === 'ar' ? 'الكل' : 'All'}</option>
                            <option value="مكتب">{lang === 'ar' ? 'مكتب' : 'Office'}</option>
                            <option value="مصنع">{lang === 'ar' ? 'مصنع' : 'Factory'}</option>
                            <option value="مكتب + مصنع">{lang === 'ar' ? 'مكتب + مصنع' : 'Office + Factory'}</option>
                          </select>
                        </td>
                      )}
                      {visibleColumns.group && (
                        <td className="py-1.5 px-3">
                          <select
                            value={advGroup}
                            onChange={(e) => setAdvGroup(e.target.value)}
                            className="w-full text-[10px] p-1 bg-white border border-gray-300 rounded-lg outline-none focus:border-orange-400 font-sans font-bold"
                          >
                            <option value="">{lang === 'ar' ? 'الكل' : 'All'}</option>
                            {groups.map((g) => (
                              <option key={g.id} value={g.id}>{lang === 'ar' ? g.nameAr : g.nameEn}</option>
                            ))}
                          </select>
                        </td>
                      )}
                      {visibleColumns.phone && (
                        <td className="py-1.5 px-3">
                          <input
                            type="text"
                            value={advPhone}
                            onChange={(e) => setAdvPhone(e.target.value)}
                            placeholder={lang === 'ar' ? 'رقم الهاتف...' : 'Filter...'}
                            className="w-full text-[10px] p-1.5 px-2 bg-white border border-gray-300 rounded-lg outline-none focus:border-orange-400 font-sans text-center font-bold"
                          />
                        </td>
                      )}
                      {visibleColumns.whatsapp && <td className="py-1.5 px-3"></td>}
                      {visibleColumns.inventoryDay && <td className="py-1.5 px-3"></td>}
                      {visibleColumns.address && <td className="py-1.5 px-3"></td>}
                      {visibleColumns.contactPerson && <td className="py-1.5 px-3"></td>}
                      {visibleColumns.checkName && <td className="py-1.5 px-3"></td>}
                      {visibleColumns.departments && <td className="py-1.5 px-3"></td>}
                      {visibleColumns.balance && <td className="py-1.5 px-3"></td>}
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {paginatedSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-10 text-center text-slate-400">
                        <AlertTriangle className="mx-auto w-10 h-10 text-amber-500 mb-2" />
                        <p className="font-extrabold">{lang === 'ar' ? 'لا يوجد أية موردين مطابقة لمعايير البحث' : 'No suppliers matched filters.'}</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedSuppliers.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors border-b border-gray-300">
                        <td className="py-1.5 px-3 pr-[6px] w-[43px] text-center relative supplier-action-dropdown">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdown(activeDropdown === s.id ? null : s.id);
                            }}
                            style={{ marginRight: "-6px" }}
                            className={`w-[24px] h-[24px] p-1 border rounded hover:border-[#f06424] hover:bg-transparent hover:text-[#f06424] transition-colors cursor-pointer inline-flex items-center justify-center ${
                              activeDropdown === s.id ? 'border-[#f06424] text-[#f06424]' : 'border-transparent text-slate-400'
                            }`}
                          >
                            <GripVertical size={16} className="-mr-[1px]" />
                          </button>
                          
                          <AnimatePresence>
                            {activeDropdown === s.id && (
                              <motion.div
                                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute top-full ltr:left-5 rtl:right-5 mt-1 min-w-[180px] w-max bg-white rounded-lg shadow-xl border border-[#1e3a8a]/20 z-[100] py-1 overflow-hidden h-auto"
                              >
                                <button
                                  onClick={() => { setActiveDropdown(null); setViewingSupplier(s); }}
                                  className="w-full text-start px-4 py-2.5 text-[12.5px] font-normal text-[#1e3a8a] hover:bg-orange-50 hover:text-[#f06424] flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <Eye size={14} className="text-[#f06424]" />
                                  {lang === 'ar' ? 'عرض بيانات المورد' : 'View supplier data'}
                                </button>
                                {onOpenStatement && (
                                  <button
                                    onClick={() => { setActiveDropdown(null); onOpenStatement(s); }}
                                    className="w-full text-start px-4 py-2.5 text-[12.5px] font-normal text-[#1e3a8a] hover:bg-orange-50 hover:text-[#f06424] flex items-center gap-2.5 transition-colors cursor-pointer"
                                  >
                                    <FileSpreadsheet size={14} className="text-[#f06424]" />
                                    {lang === 'ar' ? 'كشف حساب المورد' : 'Supplier statement'}
                                  </button>
                                )}
                                {onAddPayment && (
                                  <button
                                    onClick={() => { setActiveDropdown(null); onAddPayment(s); }}
                                    className="w-full text-start px-4 py-2.5 text-[12.5px] font-normal text-[#1e3a8a] hover:bg-orange-50 hover:text-[#f06424] flex items-center gap-2.5 transition-colors cursor-pointer"
                                  >
                                    <Wallet size={14} className="text-[#f06424]" />
                                    {lang === 'ar' ? 'تسجيل دفعه للمورد' : 'Record payment'}
                                  </button>
                                )}
                                <div className="border-t border-[#1e3a8a]/10 my-1 mx-2"></div>
                                <button
                                  onClick={() => { setActiveDropdown(null); openEditSupplierModal(s); }}
                                  className="w-full text-start px-4 py-2.5 text-[12.5px] font-normal text-[#1e3a8a] hover:bg-orange-50 hover:text-[#f06424] flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <Edit2 size={14} className="text-[#f06424]" />
                                  {lang === 'ar' ? 'تعديل بيانات المورد' : 'Edit supplier data'}
                                </button>
                                <button
                                  onClick={() => { 
                                    setActiveDropdown(null);
                                    if (confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا المورد؟' : 'Are you sure you want to delete this?')) {
                                      handleDeleteSupplier(s.id);
                                    }
                                  }}
                                  className="w-full text-start px-4 py-2.5 text-[12.5px] font-normal text-[#1e3a8a] hover:bg-rose-50 hover:text-rose-600 flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <Trash2 size={14} className="text-[#f06424]" />
                                  {lang === 'ar' ? 'حذف المورد' : 'Delete supplier'}
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                        {visibleColumns.name && (
                          <td className="py-1.5 px-3">
                            <div className="font-extrabold text-slate-800 text-[12.5px] whitespace-nowrap">{s.name}</div>
                          </td>
                        )}
                        {visibleColumns.type && (
                          <td className="py-1.5 px-3 text-center text-[11px] font-bold text-slate-700">
                            {s.type || '—'}
                          </td>
                        )}
                        {visibleColumns.group && (
                          <td className="py-1.5 px-3 text-center text-[11px] font-bold text-slate-700 whitespace-nowrap">
                            {groups.find(g => g.id === s.groupId)?.nameAr || s.groupId || '—'}
                          </td>
                        )}
                        {visibleColumns.phone && (
                          <td className="py-1.5 px-3 text-center font-mono text-[11px] text-slate-600">{s.phone || '—'}</td>
                        )}
                        {visibleColumns.whatsapp && (
                          <td className="py-1.5 px-3 text-center text-emerald-600">
                            {s.whatsapp ? (
                              <div className="flex items-center justify-center gap-1 font-mono text-[11px] font-bold">
                                <MessageCircle size={12} />
                                {s.whatsapp}
                              </div>
                            ) : '—'}
                          </td>
                        )}
                        {visibleColumns.inventoryDay && (
                          <td className="py-1.5 px-3 text-center">
                            <span className="text-[11px] font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded-lg border border-gray-300 whitespace-nowrap">
                              {s.inventoryDay || '—'}
                            </span>
                          </td>
                        )}
                        {visibleColumns.address && (
                          <td className="py-1.5 px-3 text-center text-slate-500 max-w-[150px] truncate">{s.address || '—'}</td>
                        )}
                        {visibleColumns.contactPerson && (
                          <td className="py-1.5 px-3 text-center text-slate-700">{s.contactPerson || '—'}</td>
                        )}
                        {visibleColumns.checkName && (
                          <td className="py-1.5 px-3 text-center text-slate-600 max-w-[120px] truncate">{s.checkName || '—'}</td>
                        )}
                        {visibleColumns.departments && (
                          <td className="py-1.5 px-3 text-center text-[11px] font-bold text-slate-700">
                            {s.departments && s.departments.length > 0 ? s.departments.join(' - ') : '—'}
                          </td>
                        )}
                        {visibleColumns.balance && (
                          <td className="py-1.5 px-3 text-center text-[11px] font-bold text-red-600">
                            {s.balance ? s.balance.toLocaleString() : '0'}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Kanban Cards View */
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedSuppliers.map((s) => (
                <div key={s.id} className="bg-white border border-gray-300 rounded-lg p-5 shadow-xs flex flex-col justify-between hover:border-orange-300 transition-all text-right">
                  <div className="flex justify-between items-center mb-3.5 rtl:flex-row-reverse">
                    <span className="text-[10px] font-bold text-slate-700 uppercase">
                      {s.type || '—'}
                    </span>
                    <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                      {groups.find(g => g.id === s.groupId)?.nameAr || s.groupId || '—'}
                    </span>
                  </div>
                  <div className="mb-3">
                    <div className="overflow-hidden">
                      <h4 className="text-[11px] font-black text-slate-800 leading-snug truncate">{s.name}</h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-gray-300 mb-3 text-[10px] font-bold">
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase tracking-wider">{lang === 'ar' ? 'الهاتف' : 'Phone'}</span>
                      <span className="font-mono text-slate-700">{s.phone || '—'}</span>
                    </div>
                    <div className="border-r border-gray-300 pr-2">
                      <span className="text-emerald-400 block text-[8px] uppercase tracking-wider">{lang === 'ar' ? 'واتساب' : 'WhatsApp'}</span>
                      <span className="font-mono text-emerald-600">{s.whatsapp || '—'}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-black rtl:flex-row-reverse">
                    <span className="text-[10.5px] font-bold text-red-600 truncate max-w-[120px]">{s.balance ? s.balance.toLocaleString() : '0'}</span>
                    <div className="flex gap-1">
                      <button onClick={() => setViewingSupplier(s)} className="p-1.5 bg-[#0a1945] text-white rounded-lg transition"><Eye size={12} /></button>
                      <button onClick={() => openEditSupplierModal(s)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg transition"><Edit2 size={12} /></button>
                      <button onClick={() => handleDeleteSupplier(s.id)} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg transition"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Desktop Pagination */}
          <div className="px-4 h-[41px] pt-[0px] pb-[0px] border-t border-black flex flex-col md:flex-row items-center justify-between gap-4 text-xs bg-slate-50/40 rounded-b-lg text-slate-600">
            <div className="flex items-center gap-1.5 text-slate-500 font-bold font-sans">
              {lang === 'ar' ? (
                <>
                  <span>عرض</span>
                  <span className="font-mono font-black bg-slate-200/50 border border-gray-300 px-2 py-0.5 rounded text-[#0a1945]">{paginatedSuppliers.length}</span>
                  <span>من أصل</span>
                  <span className="font-mono font-black bg-orange-100/50 border border-orange-200 px-2 py-0.5 rounded text-orange-650">{filteredSuppliers.length}</span>
                </>
              ) : (
                <>
                  <span>Showing</span>
                  <span className="font-mono font-black bg-slate-200/50 border border-gray-300 px-2 py-0.5 rounded text-[#0a1945]">{paginatedSuppliers.length}</span>
                  <span>of</span>
                  <span className="font-mono font-black bg-orange-100/50 border border-orange-200 px-2 py-0.5 rounded text-orange-650">{filteredSuppliers.length}</span>
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

              {Array.from({ length: totalProdPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setProdCurrentPage(page)}
                  className={cn(
                    "w-7 h-7 rounded-lg font-extrabold cursor-pointer text-xs flex items-center justify-center border font-mono transition",
                    page === activeProdPage
                      ? "bg-[#0a1945] text-white border-[#0a1945]"
                      : "bg-white text-slate-700 border-gray-300 hover:border-orange-400 hover:text-orange-500"
                  )}
                >
                  {page}
                </button>
              ))}

              <button
                disabled={activeProdPage === totalProdPages}
                onClick={() => setProdCurrentPage(prev => Math.min(totalProdPages, prev + 1))}
                className="p-1.5 border border-gray-300 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white hover:border-orange-400 hover:text-orange-500 cursor-pointer h-7 w-7 flex items-center justify-center transition"
              >
                {lang === 'ar' ? <ChevronLeft size={13} strokeWidth={2.5} /> : <ChevronRight size={13} strokeWidth={2.5} />}
              </button>
            </div>

            <div className="flex items-center gap-2 font-bold">
              <span>{lang === 'ar' ? 'عرض' : 'Show'}</span>
              <select
                value={prodPageSize}
                onChange={(e) => {
                  setProdPageSize(Number(e.target.value));
                  setProdCurrentPage(1);
                }}
                className="bg-white border border-gray-300 rounded-[8px] text-xs font-black outline-none cursor-pointer h-[27px] w-[45px] px-1 focus:border-orange-400"
              >
                {[5, 10, 20, 50].map(sz => (
                  <option key={sz} value={sz}>{sz}</option>
                ))}
              </select>
            </div>
          </div>
        </div>


      {/* VIEW 2: MOBILE VIEW (Visible on small screens) */}
      <div className="md:hidden space-y-4">
        {paginatedSuppliers.length === 0 ? (
          <div className="bg-white border border-gray-300 rounded-lg p-10 text-center text-slate-400">
            <AlertTriangle className="mx-auto w-10 h-10 text-amber-500 mb-2" />
            <p className="font-extrabold">{lang === 'ar' ? 'لا يوجد أية موردين مطابقة' : 'No suppliers matched.'}</p>
          </div>
        ) : (
          paginatedSuppliers.map((s) => (
            <div key={s.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm relative overflow-hidden flex flex-col gap-3">
              <div className="absolute top-0 right-0 left-0 h-1 bg-orange-500/20" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 font-black shrink-0">
                  {s.name?.charAt(0) || 'S'}
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-sm font-black text-slate-800 truncate">{s.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-700 font-bold">
                      {s.type || '—'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold truncate">
                      {s.contactPerson || '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                <div className="bg-slate-50 p-2 rounded-lg border border-gray-300">
                  <span className="text-slate-400 text-[8px] block mb-0.5">{lang === 'ar' ? 'الهاتف' : 'Phone'}</span>
                  <span className="font-mono text-slate-700">{s.phone || '—'}</span>
                </div>
                <div className="bg-emerald-50/30 p-2 rounded-lg border border-emerald-100">
                  <span className="text-emerald-400 text-[8px] block mb-0.5">{lang === 'ar' ? 'واتساب' : 'WhatsApp'}</span>
                  <span className="font-mono text-emerald-600">{s.whatsapp || '—'}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-black">
                <div className="flex items-center gap-1.5 text-red-600 font-bold text-[11px] truncate max-w-[180px]">
                  <span className="truncate">{s.balance ? s.balance.toLocaleString() : '0'}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setViewingSupplier(s)} className="p-2 bg-[#0a1945] text-white rounded-lg transition"><Eye size={14} /></button>
                  <button onClick={() => openEditSupplierModal(s)} className="p-2 bg-blue-50 text-blue-600 rounded-lg transition"><Edit2 size={14} /></button>
                  <button onClick={() => handleDeleteSupplier(s.id)} className="p-2 bg-rose-50 text-rose-600 rounded-lg transition"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Mobile Pagination */}
        <div className="flex items-center justify-center gap-2 py-2">
          <button
            disabled={activeProdPage === 1}
            onClick={() => setProdCurrentPage(prev => Math.max(1, prev - 1))}
            className="p-2 bg-white border border-gray-300 rounded-lg disabled:opacity-30"
          >
            {lang === 'ar' ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <span className="text-xs font-black text-slate-600 bg-white border border-gray-300 px-4 py-2 rounded-lg shadow-sm">
            {activeProdPage} / {totalProdPages}
          </span>
          <button
            disabled={activeProdPage === totalProdPages}
            onClick={() => setProdCurrentPage(prev => Math.min(totalProdPages, prev + 1))}
            className="p-2 bg-white border border-gray-300 rounded-lg disabled:opacity-30"
          >
            {lang === 'ar' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </div>

    </div>
  );
};
