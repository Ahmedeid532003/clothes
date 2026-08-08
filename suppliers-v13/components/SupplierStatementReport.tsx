import React, { useState } from 'react';
import { TrendingUp, Settings, ChevronLeft, ChevronRight, List, X, FileOutput, Grid, Search, Filter, Hash, Edit, Eye, ShoppingCart, Layers, DollarSign, Tag, Building2, Package , GripVertical} from 'lucide-react';
import { cn } from '../lib/utils';
import { ExportDataButton } from './ui/ExportDataButton';

interface SupplierStatementReportProps {
  lang: 'ar' | 'en';
  supplier?: any;
}

export function SupplierStatementReport({ lang, supplier }: SupplierStatementReportProps) {
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [isColumnFiltersOpen, setIsColumnFiltersOpen] = useState(false);
  const [dirViewMode, setDirViewMode] = useState<'table' | 'cards'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  
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
  type SupplierStatementData = {
  date: string;
  docNo: string;
  descAr: string;
  descEn: string;
  inNet: number | null;
  inDiscount: number | null;
  inTotal: number | null;
  returnNet: number | null;
  returnDiscount: number | null;
  returnTotal: number | null;
  discounts: number | null;
  payments: number | null;
  balance: number;
  notes: string;
};

const reportData: SupplierStatementData[] = [
    {
      date: "30/11/2026",
      docNo: "6005000",
      descAr: "فاتوره مشتريات",
      descEn: "Purchase Invoice",
      inNet: 167900090,
      inDiscount: 2000000,
      inTotal: 169900090,
      returnNet: null,
      returnDiscount: null,
      returnTotal: null,
      discounts: null,
      payments: null,
      balance: 16970000,
      notes: "عجز 4 فى موديل 750",
    },
    {
      date: "30/12/2026",
      docNo: "65000000",
      descAr: "مرتد مشتريات",
      descEn: "Purchase Return",
      inNet: null,
      inDiscount: null,
      inTotal: null,
      returnNet: 450000,
      returnDiscount: 50000,
      returnTotal: 500000,
      discounts: null,
      payments: null,
      balance: 16520000,
      notes: "",
    },
    {
      date: "30/01/2026",
      docNo: "15",
      descAr: "خصم اوكازيون",
      descEn: "Sale Discount",
      inNet: null,
      inDiscount: null,
      inTotal: null,
      returnNet: null,
      returnDiscount: null,
      returnTotal: null,
      discounts: 100000,
      payments: null,
      balance: 16420000,
      notes: "",
    },
    {
      date: "28/202026",
      docNo: "97",
      descAr: "حافظه شيكات",
      descEn: "Cheque Portfolio",
      inNet: null,
      inDiscount: null,
      inTotal: null,
      returnNet: null,
      returnDiscount: null,
      returnTotal: null,
      discounts: null,
      payments: 250000,
      balance: 16170000,
      notes: "",
    },
    {
      date: "28/202026",
      docNo: "9999",
      descAr: "دفعه نقدى",
      descEn: "Cash Payment",
      inNet: null,
      inDiscount: null,
      inTotal: null,
      returnNet: null,
      returnDiscount: null,
      returnTotal: null,
      discounts: null,
      payments: 200000,
      balance: 15970000,
      notes: "",
    }
];

  const totalPages = Math.ceil(reportData.length / pageSize) || 1;
  const paginatedData = reportData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="flex flex-col gap-[20px] -mx-[8px]">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white border border-gray-300 hover:border-orange-300 rounded-[12px] h-[84px] p-3 text-left rtl:text-right flex items-center gap-3 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer relative">
          <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center shrink-0">
            <Package size={20} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center mt-1">
            <h4 className="text-[11px] font-semibold text-[#141313] mb-1.5 truncate">
              {lang === 'ar' ? 'المشتريات' : 'Purchases'}
            </h4>
            <div className="flex items-center gap-3">
              <div className="flex flex-col leading-none">
                 <span className="text-[10px] font-bold text-slate-400 mb-1">{lang === 'ar' ? 'وارد' : 'Inward'}</span>
                 <span className="text-[13px] font-black text-slate-800">169,900,090</span>
              </div>
              <div className="w-[1px] h-6 bg-slate-200"></div>
              <div className="flex flex-col leading-none">
                 <span className="text-[10px] font-bold text-slate-400 mb-1">{lang === 'ar' ? 'خصم' : 'Discount'}</span>
                 <span className="text-[13px] font-black text-slate-800">2,000,000</span>
              </div>
            </div>
          </div>
          <div className="absolute top-[6px] rtl:left-[12px] right-[12px] rtl:right-auto flex flex-col items-end rtl:items-start shrink-0 leading-none">
             <span className="text-lg font-black text-orange-600">167,900,090</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-gray-300 hover:border-orange-300 rounded-[12px] h-[84px] p-3 text-left rtl:text-right flex items-center gap-3 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer relative">
          <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center mt-1">
            <h4 className="text-[11px] font-semibold text-[#141313] mb-1.5 truncate">
              {lang === 'ar' ? 'مرتد مشتريات' : 'Purchase Returns'}
            </h4>
            <div className="flex items-center gap-3">
              <div className="flex flex-col leading-none">
                 <span className="text-[10px] font-bold text-slate-400 mb-1">{lang === 'ar' ? 'مرتجع' : 'Returned'}</span>
                 <span className="text-[13px] font-black text-slate-800">500,000</span>
              </div>
              <div className="w-[1px] h-6 bg-slate-200"></div>
              <div className="flex flex-col leading-none">
                 <span className="text-[10px] font-bold text-slate-400 mb-1">{lang === 'ar' ? 'خصم' : 'Discount'}</span>
                 <span className="text-[13px] font-black text-slate-800">50,000</span>
              </div>
            </div>
          </div>
          <div className="absolute top-[6px] rtl:left-[12px] right-[12px] rtl:right-auto flex flex-col items-end rtl:items-start shrink-0 leading-none">
             <span className="text-lg font-black text-orange-600">450,000</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-gray-300 hover:border-orange-300 rounded-[12px] h-[84px] p-3 text-left rtl:text-right flex items-center gap-3 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer relative">
          <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp size={20} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center mt-1">
            <h4 className="text-[11px] font-semibold text-[#141313] mb-1.5 truncate">
              {lang === 'ar' ? 'دفعات' : 'Payments'}
            </h4>
            <div className="flex items-center gap-3">
              <div className="flex flex-col leading-none">
                 <span className="text-[10px] font-bold text-slate-400 mb-1">{lang === 'ar' ? 'نقدى' : 'Cash'}</span>
                 <span className="text-[13px] font-black text-slate-800">200,000</span>
              </div>
              <div className="w-[1px] h-6 bg-slate-200"></div>
              <div className="flex flex-col leading-none">
                 <span className="text-[10px] font-bold text-slate-400 mb-1">{lang === 'ar' ? 'اوراق' : 'Papers'}</span>
                 <span className="text-[13px] font-black text-slate-800">250,000</span>
              </div>
            </div>
          </div>
          <div className="absolute top-[6px] rtl:left-[12px] right-[12px] rtl:right-auto flex flex-col items-end rtl:items-start shrink-0 leading-none">
             <span className="text-lg font-black text-orange-600">450,000</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white border border-gray-300 hover:border-orange-300 rounded-[12px] h-[84px] p-3 text-left rtl:text-right flex items-center gap-3 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer relative">
          <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center shrink-0">
            <Layers size={20} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center mt-1">
            <h4 className="text-[11px] font-semibold text-[#141313] mb-1.5 truncate">
              {lang === 'ar' ? 'رصيد حالى' : 'Current Balance'}
            </h4>
            <div className="flex items-center gap-3">
              <div className="flex flex-col leading-none">
                 <span className="text-[10px] font-bold text-slate-400 mb-1">{lang === 'ar' ? 'صافى الوارد' : 'Net Inward'}</span>
                 <span className="text-[13px] font-black text-slate-800">167,450,090</span>
              </div>
              <div className="w-[1px] h-6 bg-slate-200"></div>
              <div className="flex flex-col leading-none">
                 <span className="text-[10px] font-bold text-slate-400 mb-1">{lang === 'ar' ? 'اجمالى الدفعات' : 'Total Payments'}</span>
                 <span className="text-[13px] font-black text-slate-800">450,000</span>
              </div>
            </div>
          </div>
          <div className="absolute top-[6px] rtl:left-[12px] right-[12px] rtl:right-auto flex flex-col items-end rtl:items-start shrink-0 leading-none">
             <span className="text-lg font-black text-orange-600">167,000,090</span>
          </div>
        </div>
      </div>
      <div className="bg-white border border-gray-300 rounded-[10px] overflow-visible shadow-sm relative pt-[13px] mt-[-10px] mb-[0px] h-auto min-h-[427px] flex flex-col">
        {/* Toolbar bar */}
        <div className="p-[5px] mt-[-13px] h-auto min-h-[43px] border-b border-[#eaeff2] bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 w-full rounded-t-[12px]">
          
          {/* Actions: Cards | Download | Settings */}
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
              filename="SupplierStatementReport"
              lang={lang}
              className="w-[32px] h-[32px]"
              hideText={true}
            />

            <div className="relative shrink-0">
              <button type="button" onClick={() => { setTempVisibleColumns({ ...visibleColumns }); setColumnSettingsOpen(!columnSettingsOpen); }} className="w-[32px] h-[32px] flex items-center justify-center text-orange-500 bg-white border border-gray-300 hover:border-orange-400 hover:bg-orange-50 rounded-lg shadow-sm transition-all cursor-pointer active:scale-95" title={lang === 'ar' ? 'تخصيص الأعمدة' : 'Columns'}>
                <Settings size={15} />
              </button>
              {columnSettingsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setColumnSettingsOpen(false)} />
                  <div 
                    className="absolute mt-2 top-full left-0 rtl:left-auto rtl:right-0 w-48 bg-white rounded-lg border border-gray-300 shadow-2xl z-50 overflow-visible"
                  >
                    <div className="px-3 py-2 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-lg rtl:flex-row-reverse">
                      <button onClick={() => setColumnSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={12} />
                      </button>
                      <h4 className="font-bold text-[#1e293b] text-[11px]">
                        {lang === 'ar' ? 'اختر الأعمدة' : 'Choose Columns'}
                      </h4>
                    </div>
                    <div className="p-1.5 space-y-0 max-h-72 overflow-y-auto custom-scrollbar text-start rtl:text-right bg-white">
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
                    }).map(([key, value]) => (
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
        
                          {/* Movement Table Container */}
                          <div className="space-y-4 mt-4 sm:mt-0">
                            {/* Desktop: Movement Table */}
                            <div className="hidden md:block border border-gray-300 rounded-2xl overflow-hidden overflow-x-auto">
                              <table
                                dir={lang === "ar" ? "rtl" : "ltr"}
                                className="w-full text-center border-collapse border border-gray-300 text-xs font-bold text-slate-700"
                              >
                                <thead>
                                  <tr className="bg-slate-100 border-b border-gray-300">
                                    <th
                                      rowSpan={2}
                                      className="py-2 px-1 border-r border-gray-300 w-px whitespace-nowrap text-center"
                                    >
                                      {lang === "ar" ? "تاريخ" : "Date"}
                                    </th>
                                    <th
                                      rowSpan={2}
                                      className="p-2 border-r border-gray-300 w-px whitespace-nowrap text-center"
                                    >
                                      {lang === "ar"
                                        ? "رقم المستند"
                                        : "Doc No."}
                                    </th>
                                    <th
                                      rowSpan={2}
                                      className="p-2 border-r border-gray-300 text-center px-2 w-px whitespace-nowrap"
                                    >
                                      {lang === "ar" ? "نوع الحركه" : "Movement Type"}
                                    </th>
                                    <th
                                      colSpan={3}
                                      className="p-2 border-r border-gray-300 text-center w-px whitespace-nowrap"
                                    >
                                      {lang === "ar" ? "وارد" : "Inward"}
                                    </th>
                                    <th
                                      colSpan={3}
                                      className="p-2 border-r border-gray-300 text-center w-px whitespace-nowrap"
                                    >
                                      {lang === "ar" ? "مرتد" : "Return"}
                                    </th>
                                    <th
                                      rowSpan={2}
                                      className="p-2 border-r border-gray-300 whitespace-nowrap text-center w-auto"
                                    >
                                      {lang === "ar" ? "خصومات" : "Discounts"}
                                    </th>
                                    <th
                                      rowSpan={2}
                                      className="p-2 border-r border-gray-300 w-px whitespace-nowrap text-center"
                                    >
                                      {lang === "ar" ? "دفعات" : "Payments"}
                                    </th>
                                    <th
                                      rowSpan={2}
                                      className="p-2 border-r border-gray-300 w-px whitespace-nowrap text-center"
                                    >
                                      {lang === "ar" ? "رصيد حالى" : "Current Balance"}
                                    </th>
                                    <th
                                      rowSpan={2}
                                      className="p-2 border-r border-gray-300 text-center w-auto whitespace-nowrap"
                                    >
                                      {lang === "ar" ? "ملاحظات" : "Notes"}
                                    </th>
                                  </tr>
                                  <tr className="bg-slate-50 border-b border-gray-300 text-[10px]">
                                    {/* وارد */}
                                    <th className="p-1 border-r border-gray-300 text-center w-px whitespace-nowrap">
                                      {lang === "ar" ? "اجمالى" : "Total"}
                                    </th>
                                    <th className="p-1 border-r border-gray-300 text-center w-px whitespace-nowrap">
                                      {lang === "ar" ? "خصم" : "Discount"}
                                    </th>
                                    <th className="p-1 border-r border-gray-300 text-center w-px whitespace-nowrap">
                                      {lang === "ar" ? "صافى" : "Net"}
                                    </th>
                                    {/* مرتد */}
                                    <th className="p-1 border-r border-gray-300 text-center w-px whitespace-nowrap">
                                      {lang === "ar" ? "اجمالى" : "Total"}
                                    </th>
                                    <th className="p-1 border-r border-gray-300 text-center w-px whitespace-nowrap">
                                      {lang === "ar" ? "خصم" : "Discount"}
                                    </th>
                                    <th className="p-1 border-r border-gray-300 text-center w-px whitespace-nowrap">
                                      {lang === "ar" ? "صافى" : "Net"}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-300">
                                  {paginatedData.length === 0 ? (
                                    <tr>
                                      <td
                                        colSpan={12}
                                        className="p-6 text-center text-slate-400 font-bold"
                                      >
                                        {lang === "ar"
                                          ? "لا توجد قيود لهذه الفترة والفرع المحددين."
                                          : "No movement records found for selected period & branch."}
                                      </td>
                                    </tr>
                                  ) : (
                                    paginatedData.map((m, idx) => (
                                      <tr
                                        key={idx}
                                        className="hover:bg-slate-50 text-slate-700 text-[11px] font-bold border-b border-gray-300"
                                      >
                                        {/* تاريخ */}
                                        <td className="py-2.5 px-1 border-r border-gray-300 font-mono text-[13px] text-center text-slate-600 whitespace-nowrap">
                                          {m.date}
                                        </td>

                                        {/* رقم المستند */}
                                        <td className="p-2.5 border-r border-gray-300 font-mono text-[13px] text-center text-slate-900 font-bold whitespace-nowrap">
                                          <button 
                                            onClick={() => window.open('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', '_blank')}
                                            className="text-orange-500 hover:text-orange-600 hover:underline font-black cursor-pointer transition-colors"
                                          >
                                            {m.docNo}
                                          </button>
                                        </td>

                                        {/* نوع الحركه */}
                                        <td className="p-2.5 border-r border-gray-300 text-[13px] text-center px-2 text-slate-800 whitespace-nowrap">
                                          {lang === "ar" ? m.descAr : m.descEn}
                                        </td>

                                        {/* وارد - اجمالى */}
                                        <td className="p-2.5 border-r border-gray-300 font-mono text-[13px] text-center text-emerald-700 font-black whitespace-nowrap">
                                          {m.inTotal !== null ? m.inTotal : ""}
                                        </td>
                                        {/* وارد - خصم */}
                                        <td className="p-2.5 border-r border-gray-300 font-mono text-[13px] text-center text-emerald-700 font-black whitespace-nowrap">
                                          {m.inDiscount !== null ? m.inDiscount : ""}
                                        </td>
                                        {/* وارد - صافى */}
                                        <td className="p-2.5 border-r border-gray-300 font-mono text-[13px] text-center text-emerald-700 font-black whitespace-nowrap">
                                          {m.inNet !== null ? m.inNet : ""}
                                        </td>

                                        {/* مرتد - اجمالى */}
                                        <td className="p-2.5 border-r border-gray-300 font-mono text-[13px] text-center text-red-700 font-black whitespace-nowrap">
                                          {m.returnTotal !== null ? m.returnTotal : ""}
                                        </td>
                                        {/* مرتد - خصم */}
                                        <td className="p-2.5 border-r border-gray-300 font-mono text-[13px] text-center text-red-700 font-black whitespace-nowrap">
                                          {m.returnDiscount !== null ? m.returnDiscount : ""}
                                        </td>
                                        {/* مرتد - صافى */}
                                        <td className="p-2.5 border-r border-gray-300 font-mono text-[13px] text-center text-red-700 font-black whitespace-nowrap">
                                          {m.returnNet !== null ? m.returnNet : ""}
                                        </td>

                                        {/* خصومات */}
                                        <td className="p-2.5 border-r border-gray-300 font-mono text-[13px] text-center text-slate-800 font-bold whitespace-nowrap">
                                          {m.discounts !== null ? m.discounts : ""}
                                        </td>

                                        {/* دفعات */}
                                        <td className="p-2.5 border-r border-gray-300 font-mono text-[13px] text-center text-slate-800 font-bold whitespace-nowrap">
                                          {m.payments !== null ? m.payments : ""}
                                        </td>

                                        {/* رصيد حالى */}
                                        <td className="p-2.5 border-r border-gray-300 font-mono text-[14px] text-center text-slate-900 font-black whitespace-nowrap">
                                          {m.balance}
                                        </td>
                                        
                                        {/* ملاحظات */}
                                        <td className="p-2.5 border-r border-gray-300 text-[12px] text-right pr-2 text-slate-600 whitespace-nowrap">
                                          {m.notes}
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>

                            {/* Mobile: Cards View */}
                            <div
                              className="block md:hidden space-y-2.5"
                              dir={lang === "ar" ? "rtl" : "ltr"}
                            >
                              {paginatedData.length === 0 ? (
                                <div className="p-6 text-center text-slate-400 bg-slate-50 border border-gray-300 rounded-2xl font-bold">
                                  {lang === "ar"
                                    ? "لا توجد قيود لهذه الفترة والفرع المحددين."
                                    : "No movement records found for selected period & branch."}
                                </div>
                              ) : (
                                paginatedData.map((m, idx) => {
                                  const isReturn = m.returnTotal !== null;
                                  const isPayment = m.payments !== null;
                                  const isDiscount = m.discounts !== null;
                                  let bgColor = "bg-emerald-50/20 border-emerald-300";
                                  let typeLabel = lang === "ar" ? "وارد" : "Inward";
                                  let typeColor = "bg-emerald-500";
                                  
                                  if (isReturn) {
                                    bgColor = "bg-rose-50/20 border-red-300";
                                    typeLabel = lang === "ar" ? "مرتد" : "Return";
                                    typeColor = "bg-red-500";
                                  } else if (isPayment) {
                                    bgColor = "bg-blue-50/20 border-blue-300";
                                    typeLabel = lang === "ar" ? "دفعه" : "Payment";
                                    typeColor = "bg-blue-500";
                                  } else if (isDiscount) {
                                    bgColor = "bg-purple-50/20 border-purple-300";
                                    typeLabel = lang === "ar" ? "خصم" : "Discount";
                                    typeColor = "bg-purple-500";
                                  }

                                  return (
                                    <div
                                      key={idx}
                                      className={cn(
                                        "p-4 rounded-2xl shadow-xs transition-all text-xs font-bold space-y-3 border",
                                        bgColor
                                      )}
                                    >
                                      {/* Title & Type Badge */}
                                      <div className="flex items-center justify-between border-b pb-2 border-black/10">
                                        <span
                                          className={cn(
                                            "px-3 py-1 rounded-full text-[11px] font-black tracking-wide shadow-xs text-white",
                                            typeColor
                                          )}
                                        >
                                          {typeLabel}
                                        </span>
                                        <div className="text-right flex items-center gap-2">
                                          <span className="font-mono text-[13px] text-slate-500">
                                            {m.date}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Details Grid */}
                                      <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                                        {/* Description */}
                                        <div className="col-span-2 flex flex-col items-start gap-1">
                                          <span className="text-[10px] text-slate-450 uppercase tracking-wider">
                                            {lang === "ar" ? "البيان" : "Description"}
                                          </span>
                                          <span className="text-slate-800 text-sm font-black text-right w-full">
                                            {lang === "ar" ? m.descAr : m.descEn}
                                          </span>
                                        </div>

                                        {/* Document Number */}
                                        <div className="flex flex-col items-start gap-1">
                                          <span className="text-[10px] text-slate-450 uppercase tracking-wider">
                                            {lang === "ar" ? "رقم المستند" : "Doc No."}
                                          </span>
                                          <button 
                                            onClick={() => window.open('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', '_blank')}
                                            className="font-mono text-[13px] text-orange-500 hover:text-orange-600 hover:underline font-black cursor-pointer transition-colors"
                                          >
                                            {m.docNo}
                                          </button>
                                        </div>

                                        {/* Current Balance */}
                                        <div className="flex flex-col items-start gap-1">
                                          <span className="text-[10px] text-slate-450 uppercase tracking-wider">
                                            {lang === "ar" ? "الرصيد الحالي" : "Current Balance"}
                                          </span>
                                          <span className="text-slate-900 font-mono text-[14px] font-black">
                                            {m.balance}
                                          </span>
                                        </div>

                                        {/* Totals based on type */}
                                        <div className="col-span-2 flex justify-between bg-white/50 p-2 rounded-lg">
                                           {isReturn && (
                                              <>
                                                <div className="flex flex-col"><span className="text-[10px] text-slate-500">{lang === "ar" ? "الاجمالى" : "Total"}</span><span className="text-red-700 font-mono text-sm">{m.returnTotal}</span></div>
                                                <div className="flex flex-col"><span className="text-[10px] text-slate-500">{lang === "ar" ? "خصم" : "Discount"}</span><span className="text-red-700 font-mono text-sm">{m.returnDiscount}</span></div>
                                                <div className="flex flex-col"><span className="text-[10px] text-slate-500">{lang === "ar" ? "الصافى" : "Net"}</span><span className="text-red-700 font-mono text-sm">{m.returnNet}</span></div>
                                              </>
                                           )}
                                           {!isReturn && !isPayment && !isDiscount && (
                                              <>
                                                <div className="flex flex-col"><span className="text-[10px] text-slate-500">{lang === "ar" ? "الاجمالى" : "Total"}</span><span className="text-emerald-700 font-mono text-sm">{m.inTotal}</span></div>
                                                <div className="flex flex-col"><span className="text-[10px] text-slate-500">{lang === "ar" ? "خصم" : "Discount"}</span><span className="text-emerald-700 font-mono text-sm">{m.inDiscount}</span></div>
                                                <div className="flex flex-col"><span className="text-[10px] text-slate-500">{lang === "ar" ? "الصافى" : "Net"}</span><span className="text-emerald-700 font-mono text-sm">{m.inNet}</span></div>
                                              </>
                                           )}
                                           {isPayment && (
                                              <div className="flex flex-col w-full items-center"><span className="text-[10px] text-slate-500">{lang === "ar" ? "دفعه" : "Payment"}</span><span className="text-blue-700 font-mono text-sm">{m.payments}</span></div>
                                           )}
                                           {isDiscount && (
                                              <div className="flex flex-col w-full items-center"><span className="text-[10px] text-slate-500">{lang === "ar" ? "خصم" : "Discount"}</span><span className="text-purple-700 font-mono text-sm">{m.discounts}</span></div>
                                           )}
                                        </div>

                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

        {/* Pagination */}
        <div className="px-4 pt-[4px] pb-[0px] h-[34px] border-t border-black flex flex-col md:flex-row items-center justify-between gap-4 text-xs bg-slate-50/40 mt-auto rounded-b-[10px] text-slate-600">
          <div className="flex items-center gap-1.5 text-slate-500 font-bold font-sans">
            <span>{lang === 'ar' ? 'عرض' : 'Show'}</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="font-mono font-black bg-slate-200/50 border border-gray-300 rounded text-[#0a1945] outline-none focus:border-orange-400 cursor-pointer text-xs h-[27px] w-[37px] pt-0 pb-0 pr-[7px] pl-0"
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
          
          {/* Page Numbers navigation */}
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