import React, { useState, useMemo, useEffect } from 'react';
import {
  User, 
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
  MessageCircle
, GripVertical} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SupplierPaymentNotesContainerProps {
  lang: 'ar' | 'en';
  filteredSuppliers: any[];
  richSuppliers: any[];
  groups: any[];
  setViewingSupplier: (p: any) => void;
  openEditSupplierModal: (p: any) => void;
  handleDeleteSupplier: (id: string) => void;
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

export const SupplierPaymentNotesContainer: React.FC<SupplierPaymentNotesContainerProps> = ({
  lang,
  filteredSuppliers,
  groups,
  setViewingSupplier,
  openEditSupplierModal,
  handleDeleteSupplier,
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
    documentNo: true,
    supplierName: true,
    documentDate: true,
    documentValue: true,
    documentType: true,
    user: true
  });

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
    documentNo: { en: 'Document No.', ar: 'رقم المستند' },
    supplierName: { en: 'Supplier Name', ar: 'اسم المورد' },
    documentDate: { en: 'Document Date', ar: 'تاريخ الصرف' },
    documentValue: { en: 'Document Value', ar: 'قيمه المستند' },
    documentType: { en: 'Document Type', ar: 'نوع الدفع' },
    user: { en: 'User', ar: 'المستخدم' }
  };

  return (
    <div className="space-y-4">
      {/* VIEW 1: DESKTOP CONTAINER (Visible on md and larger) */}
      <div className="hidden md:block bg-white border border-gray-300 rounded-xl overflow-visible shadow-sm relative pt-[13px] mt-[0px] mb-[0px] min-h-fit -mx-[8px]">
        <div className="h-[41px] px-3 border-b border-[#eaeff2] bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-3 w-full rounded-t-xl overflow-visible mt-[-13px] relative z-40">
          {/* Actions: Cards | Download | Settings */}
          <div className="flex items-center gap-2 w-full md:w-auto h-full" dir="ltr">
            <button 
              onClick={() => setDirViewMode(dirViewMode === 'table' ? 'kanban' : 'table')} 
              className="h-8 px-3 flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-lg hover:border-orange-400 hover:text-orange-500 text-slate-600 transition-all cursor-pointer active:scale-95 font-black text-[11px] shadow-sm shrink-0"
            >
              {dirViewMode === 'table' ? (
                <>
                  <Grid size={14} className="text-orange-500" />
                  <span className="hidden sm:inline">{lang === 'ar' ? 'بطاقات' : 'Cards'}</span>
                </>
              ) : (
                <>
                  <List size={14} className="text-orange-500" />
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
                  <div 
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
                                onChange={(e) => setTempVisibleColumns(prev => ({ ...prev, [key]: e.target.checked }))}
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
                  </div>
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
          <div className="overflow-x-auto relative bg-white border-x border-white">
            <table className="w-full text-left rtl:text-right border-collapse text-xs font-bold text-slate-700">
              <thead className="sticky top-0 z-30 bg-orange-500 text-white select-none">
                <tr className="bg-[#f06424] text-white font-extrabold border-b border-orange-600">
                  {visibleColumns.documentNo && <th className="p-3.5 h-[35.5px] text-start">{lang === 'ar' ? 'رقم المستند' : 'Document No.'}</th>}
                  {visibleColumns.supplierName && <th className="p-3.5 h-[35.5px] min-w-[90px] w-[90px] text-start">{lang === 'ar' ? 'اسم المورد' : 'Supplier Name'}</th>}
                  {visibleColumns.documentDate && <th className="p-3.5 h-[35.5px] text-center">{lang === 'ar' ? 'تاريخ الصرف' : 'Document Date'}</th>}
                  {visibleColumns.documentValue && <th className="p-3.5 h-[35.5px] text-center">{lang === 'ar' ? 'قيمه المستند' : 'Document Value'}</th>}
                  {visibleColumns.documentType && <th className="p-3.5 h-[35.5px] text-center">{lang === 'ar' ? 'نوع الدفع' : 'Document Type'}</th>}
                  {visibleColumns.user && <th className="p-3.5 h-[35.5px] text-center">{lang === 'ar' ? 'المستخدم' : 'User'}</th>}
                  <th className="p-3.5 h-[35.5px] text-center min-w-[120px]">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
                  {isColumnFiltersOpen && (
                    <tr className="bg-slate-100 border-b border-gray-300 text-slate-700">
                      {visibleColumns.documentNo && <td className="py-2 px-3"></td>}
                      {visibleColumns.supplierName && (
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={advName}
                            onChange={(e) => setAdvName(e.target.value)}
                            placeholder={lang === 'ar' ? 'بحث بالاسم...' : 'Filter...'}
                            className="w-full text-[10px] p-1.5 px-2 bg-white border border-gray-300 rounded-lg outline-none focus:border-orange-400 font-sans text-center font-bold"
                          />
                        </td>
                      )}
                      {visibleColumns.documentDate && <td className="py-2 px-3"></td>}
                      {visibleColumns.documentValue && <td className="py-2 px-3"></td>}
                      {visibleColumns.documentType && (
                        <td className="py-2 px-3 text-center">
                          <select
                            value={advType}
                            onChange={(e) => setAdvType(e.target.value)}
                            className="w-full text-[10px] p-1 bg-white border border-gray-300 rounded-lg outline-none focus:border-orange-400 font-sans font-bold"
                          >
                            <option value="">{lang === 'ar' ? 'الكل' : 'All'}</option>
                            <option value="نقدى">{lang === 'ar' ? 'نقدى' : 'Cash'}</option>
                            <option value="شيك">{lang === 'ar' ? 'شيك' : 'Check'}</option>
                            <option value="حافظه شيكات">{lang === 'ar' ? 'حافظه شيكات' : 'Check Portfolio'}</option>
                          </select>
                        </td>
                      )}
                      {visibleColumns.user && <td className="py-2 px-3"></td>}
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => {
                            setAdvName('');
                            setAdvPhone('');
                            setAdvType('');
                            setAdvGroup('');
                          }}
                          className="p-1 px-2 bg-white border border-red-200 hover:border-red-400 text-red-500 rounded-lg hover:bg-red-50 transition text-[10px] font-black cursor-pointer"
                        >
                          {lang === 'ar' ? 'إعادة ضبط' : 'Reset'}
                        </button>
                      </td>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {paginatedSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-10 text-center text-slate-400">
                        <AlertTriangle className="mx-auto w-10 h-10 text-amber-500 mb-2" />
                        <p className="font-extrabold">{lang === 'ar' ? 'لا يوجد أية موردين مطابقة لمعايير البحث' : 'No suppliers matched filters.'}</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedSuppliers.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors border-b border-blue-200">
                        {visibleColumns.documentNo && (
                          <td className="py-2 px-3 text-start">
                            <span className="font-mono text-[12px] font-bold text-blue-600">{s.documentNo || '—'}</span>
                          </td>
                        )}
                        {visibleColumns.supplierName && (
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col">
                                <div className="font-extrabold text-[#040466] text-[12.5px] truncate max-w-[90px]">{s.supplierName}</div>
                              </div>
                            </div>
                          </td>
                        )}
                        {visibleColumns.documentDate && (
                          <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-600 font-bold">
                            {s.documentDate || '—'}
                          </td>
                        )}
                        {visibleColumns.documentValue && (
                          <td className="py-2 px-3 text-center font-mono text-[12px] font-black text-[#0a1945]">
                            ${Number(s.documentValue || 0).toLocaleString()}
                          </td>
                        )}
                        {visibleColumns.documentType && (
                          <td className="py-2 px-3 text-center">
                            <span className="text-[11px] font-normal text-slate-700">
                              {s.documentType || '—'}
                            </span>
                          </td>
                        )}
                        {visibleColumns.user && (
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <User className="w-3 h-3 text-slate-400" />
                              <span className="text-[11px] font-bold text-slate-600">{s.user || 'أحمد علي'}</span>
                            </div>
                          </td>
                        )}
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center gap-1 justify-center w-fit mx-auto">
                            <button onClick={() => setViewingSupplier(s)} className="p-1.5 hover:bg-emerald-100 hover:text-emerald-600 text-emerald-500 rounded-lg transition-colors cursor-pointer" title={lang === 'ar' ? 'عرض' : 'View'}>
                              <Eye size={15} strokeWidth={2.5} />
                            </button>
                            <button onClick={() => openEditSupplierModal(s)} className="p-1.5 hover:bg-blue-100 hover:text-blue-600 text-blue-500 rounded-lg transition-colors cursor-pointer" title={lang === 'ar' ? 'تعديل' : 'Edit'}>
                              <Edit2 size={15} strokeWidth={2.5} />
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا المورد؟' : 'Are you sure you want to delete this?')) {
                                  handleDeleteSupplier(s.id);
                                }
                              }} 
                              className="p-1.5 hover:bg-rose-100 hover:text-rose-600 text-rose-500 rounded-lg transition-colors cursor-pointer"
                              title={lang === 'ar' ? 'حذف' : 'Delete'}
                            >
                              <Trash2 size={15} strokeWidth={2.5} />
                            </button>
                          </div>
                        </td>
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
                <div key={s.id} className="bg-white border border-gray-300 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-orange-300 transition-all text-right">
                  <div className="flex justify-between items-center mb-3.5 rtl:flex-row-reverse">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black rounded border border-gray-300 uppercase">
                      {s.type || '—'}
                    </span>
                    <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                      {groups.find(g => g.id === s.groupId)?.nameAr || s.groupId || '—'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <div className="overflow-hidden">
                      <h4 className="text-[13px] font-black text-slate-800 leading-snug truncate">{s.supplierName}</h4>
                      <p className="text-[10px] text-slate-400 font-bold truncate">{s.contactPerson || '—'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-gray-300 mb-3 text-[10px] font-bold">
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase tracking-wider">{lang === 'ar' ? 'قيمه المستند' : 'Value'}</span>
                      <span className="font-mono text-[#0a1945] font-black">${Number(s.documentValue || 0).toLocaleString()}</span>
                    </div>
                    <div className="border-r border-gray-300 px-2">
                      <span className="text-blue-400 block text-[8px] uppercase tracking-wider">{lang === 'ar' ? 'نوع الدفع' : 'Type'}</span>
                      <span className="font-normal text-slate-700">{s.documentType || '—'}</span>
                    </div>
                    <div className="border-r border-gray-300 pr-2">
                      <span className="text-emerald-500 block text-[8px] uppercase tracking-wider">{lang === 'ar' ? 'المستخدم' : 'User'}</span>
                      <span className="font-bold text-emerald-600 flex items-center gap-1"><User size={10} /> {s.user || 'Admin'}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-black rtl:flex-row-reverse">
                    <span className="text-[10px] text-slate-400 truncate max-w-[120px] font-mono font-bold">{s.documentDate || '—'}</span>
                    <div className="flex gap-1">
                      <button onClick={() => setViewingSupplier(s)} className="p-1.5 hover:bg-emerald-100 hover:text-emerald-600 text-emerald-500 rounded-lg transition-colors cursor-pointer"><Eye size={15} strokeWidth={2.5} /></button>
                      <button onClick={() => openEditSupplierModal(s)} className="p-1.5 hover:bg-blue-100 hover:text-blue-600 text-blue-500 rounded-lg transition-colors cursor-pointer"><Edit2 size={15} strokeWidth={2.5} /></button>
                      <button onClick={() => handleDeleteSupplier(s.id)} className="p-1.5 hover:bg-rose-100 hover:text-rose-600 text-rose-500 rounded-lg transition-colors cursor-pointer"><Trash2 size={15} strokeWidth={2.5} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Desktop Pagination */}
          <div className="px-4 h-[41px] border-t border-[#f1e7e1] border-x border-[#f1e7e1] border-b border-[#f1e7e1] flex flex-col md:flex-row items-center justify-between gap-4 text-xs bg-slate-50/40 rounded-b-xl text-slate-600">
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
                className="bg-white border border-gray-300 rounded-[8px] text-xs font-black outline-none cursor-pointer h-[27px] w-[37px] pt-0 pb-0 pr-[7px] pl-0 focus:border-orange-400"
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
          <div className="bg-white border border-gray-300 rounded-xl p-10 text-center text-slate-400">
            <AlertTriangle className="mx-auto w-10 h-10 text-amber-500 mb-2" />
            <p className="font-extrabold">{lang === 'ar' ? 'لا يوجد أية موردين مطابقة' : 'No suppliers matched.'}</p>
          </div>
        ) : (
          paginatedSuppliers.map((s) => (
            <div key={s.id} className="bg-white border border-gray-300 rounded-xl p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="overflow-hidden">
                  <h4 className="text-sm font-black text-[#040466] truncate">{s.supplierName}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-blue-600 text-[10px] font-bold font-mono">
                      {s.documentNo || '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                <div className="bg-slate-50 p-2 rounded-lg border border-gray-300">
                  <span className="text-slate-400 text-[8px] block mb-0.5">{lang === 'ar' ? 'قيمه المستند' : 'Value'}</span>
                  <span className="font-mono text-[#0a1945] font-black">${Number(s.documentValue || 0).toLocaleString()}</span>
                </div>
                <div className="bg-blue-50/30 p-2 rounded-lg border border-blue-100">
                  <span className="text-blue-400 text-[8px] block mb-0.5">{lang === 'ar' ? 'نوع المستند' : 'Type'}</span>
                  <span className="font-normal text-slate-700">{s.documentType || '—'}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-black">
                <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[10px] truncate max-w-[180px]">
                  <span className="font-mono font-bold">{s.documentDate || '—'}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setViewingSupplier(s)} className="flex items-center justify-center p-1.5 hover:bg-emerald-100 hover:text-emerald-600 text-emerald-500 rounded-lg transition-colors cursor-pointer"><Eye size={15} strokeWidth={2.5} /></button>
                  <button onClick={() => openEditSupplierModal(s)} className="flex items-center justify-center p-1.5 hover:bg-blue-100 hover:text-blue-600 text-blue-500 rounded-lg transition-colors cursor-pointer"><Edit2 size={15} strokeWidth={2.5} /></button>
                  <button onClick={() => handleDeleteSupplier(s.id)} className="flex items-center justify-center p-1.5 hover:bg-rose-100 hover:text-rose-600 text-rose-500 rounded-lg transition-colors cursor-pointer"><Trash2 size={15} strokeWidth={2.5} /></button>
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
