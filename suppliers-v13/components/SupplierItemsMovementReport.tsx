import React, { useState } from 'react';
import { TrendingUp, List, X, Grid, Search, ChevronLeft, ChevronRight, Package, DollarSign, Layers, Settings, GripVertical } from 'lucide-react';
import { cn } from '../lib/utils';
import { ExportDataButton } from './ui/ExportDataButton';

interface SupplierItemsMovementReportProps {
  lang: 'ar' | 'en';
  params?: any;
}

export function SupplierItemsMovementReport({ lang, params }: SupplierItemsMovementReportProps) {
  const showCountsOnly = params?.showCountsOnly || false;
  const hideBranchBalances = params?.hideBranchBalances || false;
  const [dirViewMode, setDirViewMode] = useState<'table' | 'cards'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    barcode: true,
    name: true,
    purchases: true,
    purchaseReturns: true,
    netSales: true,
    branchBalances: true,
    totalBalance: true,
  });
  const [tempVisibleColumns, setTempVisibleColumns] = useState({ ...visibleColumns });

  // Dummy data matching the image structure
  const reportData = [
    {
      id: 1,
      barcode: '12345677',
      nameAr: '650بلوزه حريمى',
      nameEn: '650 Women Blouse',
      purchases: { qty: 50, value: 50000 },
      purchaseReturns: { qty: 10, value: 10000 },
      netSales: { qty: 30, value: 30000 },
      branchBalances: {
        roman: 0,
        passage: 5,
        saad: 5
      },
      totalBalance: { qty: 10, value: 10000 }
    },
    {
      id: 2,
      barcode: '12345677',
      nameAr: '650بلوزه حريمى',
      nameEn: '650 Women Blouse',
      purchases: { qty: 50, value: 50000 },
      purchaseReturns: { qty: 10, value: 10000 },
      netSales: { qty: 30, value: 30000 },
      branchBalances: {
        roman: 0,
        passage: 5,
        saad: 5
      },
      totalBalance: { qty: 10, value: 10000 }
    },
    {
      id: 3,
      barcode: '12345677',
      nameAr: '650بلوزه حريمى',
      nameEn: '650 Women Blouse',
      purchases: { qty: 50, value: 50000 },
      purchaseReturns: { qty: 10, value: 10000 },
      netSales: { qty: 30, value: 30000 },
      branchBalances: {
        roman: 0,
        passage: 5,
        saad: 5
      },
      totalBalance: { qty: 10, value: 10000 }
    }
  ];

  const totalPages = Math.ceil(reportData.length / pageSize) || 1;
  const paginatedData = reportData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="flex flex-col gap-[20px] -mx-[8px]">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white border border-gray-300 hover:border-orange-300 rounded-[12px] h-[84px] p-3 text-left rtl:text-right flex items-center gap-3 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
          <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center shrink-0">
            <Package size={20} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center mt-1">
            <h4 className="text-[11px] font-semibold text-[#141313] mb-1.5 truncate">
              {lang === 'ar' ? 'المشتريات' : 'Purchases'}
            </h4>
            <div className="flex items-center gap-3">
              <div className="flex flex-col leading-none">
                 <span className="text-[13px] font-black text-slate-800">142</span>
                 <span className="text-[10px] font-bold text-slate-400 mt-1">{lang === 'ar' ? 'عدد' : 'Count'}</span>
              </div>
              {!showCountsOnly && (
                <>
                  <div className="w-[1px] h-6 bg-slate-200"></div>
                  <div className="flex flex-col leading-none">
                     <span className="text-[13px] font-black text-slate-800">14,250</span>
                     <span className="text-[10px] font-bold text-slate-400 mt-1">{lang === 'ar' ? 'قيمه' : 'Value'}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-gray-300 hover:border-orange-300 rounded-[12px] h-[84px] p-3 text-left rtl:text-right flex items-center gap-3 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
          <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center mt-1">
            <h4 className="text-[11px] font-semibold text-[#141313] mb-1.5 truncate">
              {lang === 'ar' ? 'مردود مشتريات' : 'Purchase Returns'}
            </h4>
            <div className="flex items-center gap-3">
              <div className="flex flex-col leading-none">
                 <span className="text-[13px] font-black text-slate-800">12</span>
                 <span className="text-[10px] font-bold text-slate-400 mt-1">{lang === 'ar' ? 'عدد' : 'Count'}</span>
              </div>
              {!showCountsOnly && (
                <>
                  <div className="w-[1px] h-6 bg-slate-200"></div>
                  <div className="flex flex-col leading-none">
                     <span className="text-[13px] font-black text-slate-800">1,250</span>
                     <span className="text-[10px] font-bold text-slate-400 mt-1">{lang === 'ar' ? 'قيمه' : 'Value'}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-gray-300 hover:border-orange-300 rounded-[12px] h-[84px] p-3 text-left rtl:text-right flex items-center gap-3 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
          <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp size={20} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center mt-1">
            <h4 className="text-[11px] font-semibold text-[#141313] mb-1.5 truncate">
              {lang === 'ar' ? 'صافى مبيعات' : 'Net Sales'}
            </h4>
            <div className="flex items-center gap-3">
              <div className="flex flex-col leading-none">
                 <span className="text-[13px] font-black text-slate-800">540</span>
                 <span className="text-[10px] font-bold text-slate-400 mt-1">{lang === 'ar' ? 'عدد' : 'Count'}</span>
              </div>
              {!showCountsOnly && (
                <>
                  <div className="w-[1px] h-6 bg-slate-200"></div>
                  <div className="flex flex-col leading-none">
                     <span className="text-[13px] font-black text-slate-800">54,000</span>
                     <span className="text-[10px] font-bold text-slate-400 mt-1">{lang === 'ar' ? 'قيمه' : 'Value'}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white border border-gray-300 hover:border-orange-300 rounded-[12px] h-[84px] p-3 text-left rtl:text-right flex items-center gap-3 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
          <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center shrink-0">
            <Layers size={20} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center mt-1">
            <h4 className="text-[11px] font-semibold text-[#141313] mb-1.5 truncate">
              {lang === 'ar' ? 'رصيد حالى' : 'Current Balance'}
            </h4>
            <div className="flex items-center gap-3">
              <div className="flex flex-col leading-none">
                 <span className="text-[13px] font-black text-slate-800">1,200</span>
                 <span className="text-[10px] font-bold text-slate-400 mt-1">{lang === 'ar' ? 'عدد' : 'Count'}</span>
              </div>
              {!showCountsOnly && (
                <>
                  <div className="w-[1px] h-6 bg-slate-200"></div>
                  <div className="flex flex-col leading-none">
                     <span className="text-[13px] font-black text-slate-800">120,000</span>
                     <span className="text-[10px] font-bold text-slate-400 mt-1">{lang === 'ar' ? 'قيمه' : 'Value'}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-300 rounded-[10px] overflow-visible shadow-sm relative pt-[13px] mt-[-10px] mb-[0px] h-auto min-h-[427px] flex flex-col">
        {/* Toolbar bar */}
        <div className="p-[5px] mt-[-13px] h-[43px] border-b border-[#eaeff2] bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 w-full rounded-t-[12px]">
          
          <div className="flex items-center gap-2" dir="ltr">
            <button 
              onClick={() => setDirViewMode(dirViewMode === 'table' ? 'cards' : 'table')} 
              className="h-[32px] px-3 flex items-center justify-center gap-1.5 bg-white border border-gray-300 rounded-[8px] hover:border-orange-400 hover:text-orange-500 text-slate-650 hover:shadow-xs transition cursor-pointer select-none font-black text-[11px] shrink-0"
              title={lang === 'ar' ? 'تبديل العرض' : 'Toggle View'}
            >
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

            <ExportDataButton 
              data={reportData}
              filename="SupplierItemsMovementReport"
              lang={lang}
              className="w-[32px] h-[32px]"
              hideText={true}
            />

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => { setTempVisibleColumns({ ...visibleColumns }); setColumnSettingsOpen(!columnSettingsOpen); }}
                className="w-[32px] h-[32px] flex items-center justify-center text-orange-500 bg-white border border-gray-300 hover:border-orange-400 hover:bg-orange-50 rounded-lg shadow-sm transition-all cursor-pointer active:scale-95"
                title={lang === 'ar' ? 'تخصيص الأعمدة' : 'Columns'}
              >
                <Settings size={15} />
              </button>
              {columnSettingsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setColumnSettingsOpen(false)} />
                  <div className="absolute mt-2 top-full left-0 w-48 bg-white rounded-lg border border-gray-300 shadow-2xl z-50 overflow-visible">
                    <div className="px-3 py-2 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-lg rtl:flex-row-reverse">
                      <button type="button" onClick={() => setColumnSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={12} />
                      </button>
                      <h4 className="font-bold text-[#1e293b] text-[11px]">
                        {lang === 'ar' ? 'اختر الأعمدة' : 'Choose Columns'}
                      </h4>
                    </div>
                    <div className="p-1.5 space-y-0 max-h-72 overflow-y-auto custom-scrollbar text-start rtl:text-right bg-white">
                      {Object.entries({
                        barcode: { en: 'Barcode', ar: 'باركود' },
                        name: { en: 'Item Name', ar: 'اسم الصنف' },
                        purchases: { en: 'Purchases', ar: 'مشتريات' },
                        purchaseReturns: { en: 'Purchase Returns', ar: 'مردود مشتريات' },
                        netSales: { en: 'Net Sales', ar: 'صافى مبيعات' },
                        branchBalances: { en: 'Branch Balance', ar: 'رصيد الافرع' },
                        totalBalance: { en: 'Total Balance', ar: 'اجمالى الرصيد' },
                      }).map(([key, value]) => (
                        <label key={key} className="flex items-center gap-3 hover:bg-slate-50 p-1.5 rounded-md cursor-pointer select-none group transition-colors">
                          <GripVertical size={12} className="text-gray-400 shrink-0" />
                          <div className="relative flex items-center justify-center shrink-0">
                            <input
                              type="checkbox"
                              checked={tempVisibleColumns[key as keyof typeof tempVisibleColumns] ?? false}
                              onChange={(e) => setTempVisibleColumns((prev) => ({ ...prev, [key]: e.target.checked }))}
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
                        onClick={() => setTempVisibleColumns({ ...visibleColumns })}
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

          <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1 max-w-md justify-end">
            <div className="relative flex-1 flex items-center max-w-[300px]">
              <Search size={14} className="absolute left-3 rtl:right-3 rtl:left-auto text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'ar' ? "البحث بالاسم، الكود، الباركود..." : "Search by name, SKU..."}
                className="w-full text-xs p-2 pl-8 pr-8 rtl:pr-8 rtl:pl-8 bg-white border border-gray-300 rounded-[8px] outline-none focus:border-orange-400 transition h-[32px]"
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
                <tr className="bg-[#FF6900] text-white font-extrabold">
                  <th rowSpan={2} className="p-2 border border-orange-600 text-center">{lang === 'ar' ? 'باركود' : 'Barcode'}</th>
                  <th rowSpan={2} className="p-2 border border-orange-600 text-center min-w-[150px]">{lang === 'ar' ? 'اسم الصنف' : 'Item Name'}</th>
                  <th colSpan={2} className="p-2 border border-orange-600 text-center">{lang === 'ar' ? 'مشتريات' : 'Purchases'}</th>
                  <th colSpan={2} className="p-2 border border-orange-600 text-center">{lang === 'ar' ? 'مردود مشتريات' : 'Purchase Returns'}</th>
                  <th colSpan={2} className="p-2 border border-orange-600 text-center">{lang === 'ar' ? 'صافى مبيعات' : 'Net Sales'}</th>
                  {!hideBranchBalances && <th colSpan={3} className="p-2 border border-orange-600 text-center">{lang === 'ar' ? 'رصيد الافرع' : 'Branch Balance'}</th>}
                  <th colSpan={2} className="p-2 border border-orange-600 text-center">{lang === 'ar' ? 'اجمالى الرصيد' : 'Total Balance'}</th>
                </tr>
                <tr className="bg-[#FF6900] text-white font-bold border-b border-orange-600">
                  <th className="p-1 border border-orange-600 text-center w-16">{lang === 'ar' ? 'عدد' : 'Qty'}</th>
                  <th className="p-1 border border-orange-600 text-center w-20">{lang === 'ar' ? 'قيمه' : 'Value'}</th>
                  <th className="p-1 border border-orange-600 text-center w-16">{lang === 'ar' ? 'عدد' : 'Qty'}</th>
                  <th className="p-1 border border-orange-600 text-center w-20">{lang === 'ar' ? 'قيمه' : 'Value'}</th>
                  <th className="p-1 border border-orange-600 text-center w-16">{lang === 'ar' ? 'عدد' : 'Qty'}</th>
                  <th className="p-1 border border-orange-600 text-center w-20">{lang === 'ar' ? 'قيمه' : 'Value'}</th>
                  {!hideBranchBalances && (
                    <>
                      <th className="p-1 border border-orange-600 text-center min-w-[80px]">{lang === 'ar' ? 'فرع المسرح الرومانى' : 'Roman Theater'}</th>
                      <th className="p-1 border border-orange-600 text-center min-w-[80px]">{lang === 'ar' ? 'فرع الممر' : 'Passage'}</th>
                      <th className="p-1 border border-orange-600 text-center min-w-[80px]">{lang === 'ar' ? 'فرع سعد زغلول' : 'Saad Zaghloul'}</th>
                    </>
                  )}
                  <th className="p-1 border border-orange-600 text-center w-16">{lang === 'ar' ? 'عدد' : 'Qty'}</th>
                  <th className="p-1 border border-orange-600 text-center w-20">{lang === 'ar' ? 'قيمه' : 'Value'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {paginatedData.map((item) => (
                  <tr key={item.id} className="hover:bg-orange-50/50 transition-colors group">
                    <td className="p-2 border border-gray-300 text-center font-mono text-[11px] text-slate-800 font-bold">{item.barcode}</td>
                    <td className="p-2 border border-gray-300 text-right font-bold text-slate-700">{lang === 'ar' ? item.nameAr : item.nameEn}</td>
                    <td className="p-2 border border-gray-300 text-center font-black text-slate-800">{item.purchases.qty}</td>
                    <td className="p-2 border border-gray-300 text-center font-black text-slate-800">{showCountsOnly ? '-' : item.purchases.value.toLocaleString()}</td>
                    <td className="p-2 border border-gray-300 text-center font-black text-slate-800">{item.purchaseReturns.qty}</td>
                    <td className="p-2 border border-gray-300 text-center font-black text-slate-800">{showCountsOnly ? '-' : item.purchaseReturns.value.toLocaleString()}</td>
                    <td className="p-2 border border-gray-300 text-center font-black text-slate-800">{item.netSales.qty}</td>
                    <td className="p-2 border border-gray-300 text-center font-black text-slate-800">{showCountsOnly ? '-' : item.netSales.value.toLocaleString()}</td>
                    {!hideBranchBalances && (
                      <>
                        <td className="p-2 border border-gray-300 text-center font-black text-slate-800">{item.branchBalances.roman}</td>
                        <td className="p-2 border border-gray-300 text-center font-black text-slate-800">{item.branchBalances.passage}</td>
                        <td className="p-2 border border-gray-300 text-center font-black text-slate-800">{item.branchBalances.saad}</td>
                      </>
                    )}
                    <td className="p-2 border border-gray-300 text-center font-black text-slate-800">{item.totalBalance.qty}</td>
                    <td className="p-2 border border-gray-300 text-center font-black text-slate-800">{showCountsOnly ? '-' : item.totalBalance.value.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-slate-50/50 rounded-b-3xl">
            {paginatedData.map((item, index) => (
              <div key={item.id} className="bg-white border border-gray-300 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-orange-200 transition-all">
                 <div className="flex items-center justify-between mb-3 border-b border-gray-300 pb-3">
                   <div className="flex items-center gap-2">
                     <span className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 text-slate-500 font-bold text-xs">{index + 1}</span>
                     <span className="text-xs font-mono text-slate-400">{item.barcode}</span>
                   </div>
                 </div>
                 <h4 className="font-bold text-sm text-slate-800 mb-4 line-clamp-2">{lang === 'ar' ? item.nameAr : item.nameEn}</h4>
                 <div className="space-y-2 text-xs">
                   <div className="flex justify-between items-center py-1 border-b border-gray-300">
                     <span className="text-slate-500 font-bold">{lang === 'ar' ? 'المشتريات' : 'Purchases'}</span>
                     <span className="font-black text-slate-700">{item.purchases.qty} {showCountsOnly ? '' : `/ ${item.purchases.value.toLocaleString()}`}</span>
                   </div>
                   <div className="flex justify-between items-center py-1 border-b border-gray-300">
                     <span className="text-slate-500 font-bold">{lang === 'ar' ? 'صافى مبيعات' : 'Net Sales'}</span>
                     <span className="font-black text-emerald-600">{item.netSales.qty} {showCountsOnly ? '' : `/ ${item.netSales.value.toLocaleString()}`}</span>
                   </div>
                   <div className="flex justify-between items-center py-1 border-b border-gray-300">
                     <span className="text-slate-500 font-bold">{lang === 'ar' ? 'اجمالى الرصيد' : 'Total Balance'}</span>
                     <span className="font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded">{item.totalBalance.qty} {showCountsOnly ? '' : `/ ${item.totalBalance.value.toLocaleString()}`}</span>
                   </div>
                 </div>
              </div>
            ))}
          </div>
        )}
        {/* Pagination */}
        <div className="px-4 pt-[4px] pb-[0px] min-h-[44px] border-t border-black flex flex-col md:flex-row items-center justify-between gap-4 text-xs bg-slate-50/40 mt-auto rounded-b-[10px] text-slate-600">
          <div className="flex items-center gap-1.5 text-slate-500 font-bold font-sans">
            <span>{lang === 'ar' ? 'عرض' : 'Show'}</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="font-mono font-black bg-slate-200/50 border border-gray-300 rounded text-[#0a1945] outline-none focus:border-orange-400 cursor-pointer text-xs h-[27px] w-[45px]"
            >
              {[5, 10, 25, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span>{lang === 'ar' ? 'من أصل' : 'of'}</span>
            <span className="font-mono font-black bg-orange-100/50 border border-orange-200 px-2 py-0.5 rounded text-[#f06424] text-xs h-[24px] flex items-center justify-center">
              {reportData.length}
            </span>
          </div>
          
          <div className="flex items-center gap-1 select-none" dir="ltr">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1 border border-gray-300 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-600 hover:border-orange-400 hover:text-orange-500 transition cursor-pointer flex items-center justify-center w-7 h-7"
            >
              <ChevronLeft size={13} strokeWidth={2.5} />
            </button>
            
            <div className="flex items-center px-1 gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1;
                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black font-mono transition-colors cursor-pointer border ${
                        currentPage === page 
                          ? "bg-[#0a1945] text-white border-[#0a1945]" 
                          : "bg-white text-[#0a1945] border-gray-300 hover:border-[#0a1945]"
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="text-slate-400 px-1 text-xs">...</span>;
                }
                return null;
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1 border border-gray-300 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-600 hover:border-orange-400 hover:text-orange-500 transition cursor-pointer flex items-center justify-center w-7 h-7"
            >
              <ChevronRight size={13} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
