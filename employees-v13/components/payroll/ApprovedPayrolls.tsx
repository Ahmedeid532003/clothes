import React, { useState, useMemo } from 'react';
import { 
  Users, Calculator, Calendar, Landmark, Settings, 
  Plus, Check, Trash2, Edit2, FileText, Download, 
  Printer, ArrowUpRight, ArrowLeft, RefreshCw, Layers, Edit3, Eye, Search,
  TrendingUp, TrendingDown, LayoutGrid, List, X, Filter, GripVertical, ChevronDown
} from 'lucide-react';
import { ReusableModal } from '../ui/ReusableModal';
import { ExportDataButton } from '../ui/ExportDataButton';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

// Single row of the spreadsheet
interface PayrollGridRow {
  employeeId: string;
  code: string;
  name: string;
  basicSalary: number;
  shiftHours: number;
  actualHours: number;
  overtime: number;
  salesValue: number;
  salesPct: number;
  netCommission: number; // calculated: salesValue * (salesPct/100)
  incentive1: number;
  incentive2: number;
  totalEarned: number; // calculated: (basicSalary * (actualHours / shiftHours)) + overtime + netCommission + incentive1 + incentive2
  delayDeduction: number; // calculated: if actualHours < shiftHours -> (shiftHours - actualHours) * (basicSalary / shiftHours)
  deduction2: number;
  advances: number;
  totalDeductions: number; // calculated: delayDeduction + deduction2 + advances
  netPay: number; // calculated: totalEarned - totalDeductions
}

// Full Payroll Document
interface ApprovedPayrollDoc {
  id: string;
  month: string;
  year: number;
  branch: string;
  totalSum: number;
  createdBy: string;
  createdAt: string;
  rows: PayrollGridRow[];
}

interface ApprovedPayrollsProps {
  lang: 'en' | 'ar';
  staffList: Array<{
    id: string;
    name: string;
    nameAr: string;
    baseSalary: number;
    allowanceValue?: number;
    clockStatus?: string;
  }>;
  advanceOrders?: Array<{
    empId: string;
    monthlyDeduction: number;
  }>;
}

export const ApprovedPayrolls: React.FC<ApprovedPayrollsProps> = ({ 
  lang, 
  staffList, 
  advanceOrders = [] 
}) => {
  // Mock base files: Approved Payroll Sheets inside local state saved for persistent simulation
  const [payrolls, setPayrolls] = useState<ApprovedPayrollDoc[]>([
    {
      id: 'APR-001',
      month: lang === 'ar' ? 'مايو' : 'May',
      year: 2026,
      branch: lang === 'ar' ? 'الفرع الرئيسي' : 'Main Branch',
      totalSum: 48500,
      createdBy: lang === 'ar' ? 'حازم سليمان' : 'Hazem Soliman',
      createdAt: '2026-05-31',
      rows: []
    },
    {
      id: 'APR-002',
      month: lang === 'ar' ? 'أبريل' : 'April',
      year: 2026,
      branch: lang === 'ar' ? 'فرع المهندسين' : 'Mohandessin Branch',
      totalSum: 32600,
      createdBy: lang === 'ar' ? 'طارق علاء' : 'Tarek Alaa',
      createdAt: '2026-04-30',
      rows: []
    }
  ]);

  // UI Phase toggles
  const [screen, setScreen] = useState<'list' | 'spreadsheet'>('list');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // New Payroll Modal / Screen choices State
  const [isNewPayrollModalOpen, setIsNewPayrollModalOpen] = useState(false);
  const [newYear, setNewYear] = useState<number>(2026);
  const [newMonth, setNewMonth] = useState<string>('يونيو');
  const [newBranch, setNewBranch] = useState<string>('الفرع الرئيسي');

  // Print single employee salary slip modal state setup
  const [isEmpSlipModalOpen, setIsEmpSlipModalOpen] = useState(false);
  const [slipSelectedEmp, setSlipSelectedEmp] = useState<string>('');
  const [slipSelectedMonth, setSlipSelectedMonth] = useState<string>('يونيو');
  const [slipSelectedYear, setSlipSelectedYear] = useState<number>(2026);
  const [slipPaperType, setSlipPaperType] = useState<'thermal' | 'A5' | 'A4'>('thermal');
  const [isSlipGenerated, setIsSlipGenerated] = useState(false);
  const [generatedSlipData, setGeneratedSlipData] = useState<PayrollGridRow | null>(null);

  // Column visibility for salary statement print slips
  const [slipVisibleRows, setSlipVisibleRows] = useState<Record<string, boolean>>({
    code: true,
    name: true,
    basicSalary: true,
    shiftHours: true,
    actualHours: true,
    overtime: true,
    salesValue: false, // Default to FALSE to keep the total sales confidential
    salesPct: false,   // Default to FALSE for confidentiality
    netCommission: true,
    incentive1: true,
    incentive2: true,
    totalEarned: true,
    delayDeduction: true,
    deduction2: true,
    advances: true,
    totalDeductions: true,
    netPay: true,
  });
  const [isCustomizeDropdownOpen, setIsCustomizeDropdownOpen] = useState(false);

  // Active spreadsheet state editing variables
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [gridData, setGridData] = useState<PayrollGridRow[]>([]);
  const [gridMeta, setGridMeta] = useState({
    year: 2026,
    month: 'يونيو',
    branch: 'الفرع الرئيسي'
  });

  // Printing or viewing custom sheet
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printDoc, setPrintDoc] = useState<ApprovedPayrollDoc | null>(null);

  // Search filter query state
  const [searchQuery, setSearchQuery] = useState('');

  // Toolbar state
  const [payrollViewMode, setPayrollViewMode] = useState<'table' | 'kanban'>('table');
  const [payrollDate, setPayrollDate] = useState('all');
  const [isPayrollColumnFiltersOpen, setIsPayrollColumnFiltersOpen] = useState(false);
  const [payrollColumnSettingsOpen, setPayrollColumnSettingsOpen] = useState(false);
  const [payrollVisibleColumns, setPayrollVisibleColumns] = useState({
    id: true, month: true, year: true, branch: true, total: true, createdBy: true, date: true, actions: true
  });
  const [tempPayrollVisibleColumns, setTempPayrollVisibleColumns] = useState({...payrollVisibleColumns});

  // Handlers for single employee slip
  const handleOpenEmpSlipModal = () => {
    if (staffList.length > 0) {
      setSlipSelectedEmp(staffList[0].id);
    }
    setSlipSelectedMonth('يونيو');
    setSlipSelectedYear(2026);
    setSlipPaperType('thermal');
    setIsSlipGenerated(false);
    setGeneratedSlipData(null);
    setIsEmpSlipModalOpen(true);
  };

  const handleGenerateEmpSlip = () => {
    // Check if there is a saved document matching month & year
    const matchedDoc = payrolls.find(p => p.month === slipSelectedMonth && p.year === slipSelectedYear);
    let rowData: PayrollGridRow | null = null;

    if (matchedDoc && matchedDoc.rows && matchedDoc.rows.length > 0) {
      const matchedRow = matchedDoc.rows.find(r => r.employeeId === slipSelectedEmp);
      if (matchedRow) {
        rowData = matchedRow;
      }
    }

    // Fallback generation logic matching standard algorithms
    if (!rowData) {
      const emp = staffList.find(e => e.id === slipSelectedEmp);
      if (emp) {
        const idx = staffList.indexOf(emp);
        const code = emp.id.replace('EMP', '') || String(idx + 1);
        const loan = advanceOrders.find(a => a.empId === emp.id)?.monthlyDeduction || 0;
        const basic = emp.baseSalary + (emp.allowanceValue || 0);
        
        const shiftH = 300;
        const actualH = emp.clockStatus === 'Absent' ? 260 : 290;
        const salesVal = 800000;
        const salesPercent = 2; // 2%
        const comm = (salesVal * salesPercent) / 100;
        
        const totalEarned = Math.round(basic * (actualH / shiftH)) + comm;
        const delay = Math.round(basic * Math.max(0, shiftH - actualH) / shiftH);
        const totalDeduct = delay + loan;
        const net = totalEarned - totalDeduct;

        rowData = {
          employeeId: emp.id,
          code: code,
          name: lang === 'ar' ? emp.nameAr : emp.name,
          basicSalary: basic,
          shiftHours: shiftH,
          actualHours: actualH,
          overtime: 0,
          salesValue: salesVal,
          salesPct: salesPercent,
          netCommission: comm,
          incentive1: 0,
          incentive2: 0,
          totalEarned: totalEarned,
          delayDeduction: delay,
          deduction2: 0,
          advances: loan,
          totalDeductions: totalDeduct,
          netPay: net
        };
      }
    }

    if (rowData) {
      setGeneratedSlipData(rowData);
      setIsSlipGenerated(true);
    } else {
      alert(lang === 'ar' ? 'عذراً، الموظف المحدد غير موجود حالياً.' : 'Selected employee not found.');
    }
  };

  const monthsList = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const branchesList = [
    'الفرع الرئيسي', 'فرع المهندسين', 'فرع مصر الجديدة', 'فرع التجمع الخامس', 'فرع الإسكندرية'
  ];

  // Open modal step
  const handleOpenCreator = () => {
    setIsNewPayrollModalOpen(true);
  };

  // Confirm selection in the pop-up modal and load automatic items
  const handleGeneratePayrollGrid = () => {
    setIsNewPayrollModalOpen(false);
    
    // Automatically fill from existing employee details
    const initialRows: PayrollGridRow[] = staffList.map((emp, i) => {
      const code = emp.id.replace('EMP', '') || String(i + 1);
      const loan = advanceOrders.find(a => a.empId === emp.id)?.monthlyDeduction || 0;
      
      const basic = emp.baseSalary + (emp.allowanceValue || 0);
      const shiftH = 300;
      const actualH = emp.clockStatus === 'Absent' ? 260 : 290;
      const salesVal = 800000;
      const salesPercent = 2; // e.g. 2%
      const comm = (salesVal * salesPercent) / 100;
      
      // Calculate
      const totalEarned = Math.round(basic * (actualH / shiftH)) + comm;
      const delay = Math.round(basic * Math.max(0, shiftH - actualH) / shiftH);
      const totalDeduct = delay + loan;
      const net = totalEarned - totalDeduct;

      return {
        employeeId: emp.id,
        code: code,
        name: lang === 'ar' ? emp.nameAr : emp.name,
        basicSalary: basic,
        shiftHours: shiftH,
        actualHours: actualH,
        overtime: 0,
        salesValue: salesVal,
        salesPct: salesPercent,
        netCommission: comm,
        incentive1: 0,
        incentive2: 0,
        totalEarned: totalEarned,
        delayDeduction: delay,
        deduction2: 0,
        advances: loan,
        totalDeductions: totalDeduct,
        netPay: net
      };
    });

    setGridData(initialRows);
    setGridMeta({
      year: newYear,
      month: newMonth,
      branch: newBranch
    });
    setEditingDocId(null); // creation mode
    setScreen('spreadsheet');
  };

  // Grid Cell Changes (Recalculating downstream cells automatically on-the-fly)
  const handleCellUpdate = (index: number, key: keyof PayrollGridRow, value: any) => {
    const updated = [...gridData];
    const row = { ...updated[index] };

    // Convert values safely
    const numVal = parseFloat(value) || 0;
    (row as any)[key] = numVal;

    // Trigger reactive recalculation
    row.netCommission = Math.round((row.salesValue * row.salesPct) / 100);
    
    // Total gross earnings: basic based on hours proportion + overtime + net commission + incentive 1 + incentive 2
    row.totalEarned = Math.round(row.basicSalary * (row.actualHours / row.shiftHours)) + 
                      row.overtime + 
                      row.netCommission + 
                      row.incentive1 + 
                      row.incentive2;

    // Delay deductions
    row.delayDeduction = row.actualHours < row.shiftHours 
      ? Math.round(row.basicSalary * (row.shiftHours - row.actualHours) / row.shiftHours) 
      : 0;

    // Total deductions = delay + deduction2 + loans (advances)
    row.totalDeductions = row.delayDeduction + row.deduction2 + row.advances;

    // Net pay
    row.netPay = row.totalEarned - row.totalDeductions;

    updated[index] = row;
    setGridData(updated);
  };

  // Saving the full spreadsheet to CRUD registry and transition back to table
  const handleSaveDocument = () => {
    // Generate total sum for the sheet
    const totalSheetPay = gridData.reduce((acc, row) => acc + row.netPay, 0);

    if (editingDocId) {
      // Edit existing doc
      setPayrolls(prev => prev.map(p => {
        if (p.id === editingDocId) {
          return {
            ...p,
            totalSum: totalSheetPay,
            rows: gridData
          };
        }
        return p;
      }));
    } else {
      // Create new doc
      const newDoc: ApprovedPayrollDoc = {
        id: `APR-00${payrolls.length + 1}`,
        month: gridMeta.month,
        year: gridMeta.year,
        branch: gridMeta.branch,
        totalSum: totalSheetPay,
        createdBy: lang === 'ar' ? 'حازم سليمان' : 'Hazem Soliman',
        createdAt: new Date().toISOString().split('T')[0],
        rows: gridData
      };
      setPayrolls([newDoc, ...payrolls]);
    }

    setScreen('list');
    setEditingDocId(null);
  };

  // Re-load sheet for editing
  const handleEditDocumentInGrid = (doc: ApprovedPayrollDoc) => {
    setGridMeta({
      year: doc.year,
      month: doc.month,
      branch: doc.branch
    });
    setEditingDocId(doc.id);
    
    // If has actual rows, load them. Else generate default rows based on current staff list
    if (doc.rows && doc.rows.length > 0) {
      setGridData(doc.rows);
    } else {
      // fallback auto-generation
      const initialRows: PayrollGridRow[] = staffList.map((emp, i) => {
        const code = emp.id.replace('EMP', '') || String(i + 1);
        const loan = advanceOrders.find(a => a.empId === emp.id)?.monthlyDeduction || 0;
        return {
          employeeId: emp.id,
          code: code,
          name: lang === 'ar' ? emp.nameAr : emp.name,
          basicSalary: emp.baseSalary + (emp.allowanceValue || 0),
          shiftHours: 300,
          actualHours: 290,
          overtime: 0,
          salesValue: 800000,
          salesPct: 2,
          netCommission: 16000,
          incentive1: 0,
          incentive2: 0,
          totalEarned: 21850,
          delayDeduction: 200,
          deduction2: 0,
          advances: loan,
          totalDeductions: 200 + loan,
          netPay: 21850 - (200 + loan)
        };
      });
      setGridData(initialRows);
    }
    
    setScreen('spreadsheet');
  };

  // Delete Document
  const handleDeleteDocument = (id: string) => {
    if (confirm(lang === 'ar' ? 'هل أنت متأكد من حذف كشف رواتب هذا الشهر؟' : 'Are you sure you want to delete this payroll sheet?')) {
      setPayrolls(prev => prev.filter(p => p.id !== id));
    }
  };

  // Print Preview step
  const handlePrintDocument = (doc: ApprovedPayrollDoc) => {
    setPrintDoc(doc);
    setIsPrintModalOpen(true);
  };

  // Memoized search filtering for the payroll lists
  const filteredPayrolls = useMemo(() => {
    if (!searchQuery.trim()) return payrolls;
    const q = searchQuery.toLowerCase();
    return payrolls.filter(p => {
      const idMatch = p.id.toLowerCase().includes(q);
      const monthMatch = p.month.toLowerCase().includes(q);
      const branchMatch = p.branch.toLowerCase().includes(q);
      const yearMatch = p.year.toString().includes(q);
      const creatorMatch = p.createdBy.toLowerCase().includes(q);
      return idMatch || monthMatch || branchMatch || yearMatch || creatorMatch;
    });
  }, [payrolls, searchQuery]);

  // Dynamic branch listing for mobile Kanban columns
  const branches = useMemo(() => {
    const list = Array.from(new Set(filteredPayrolls.map(p => p.branch)));
    return list.length > 0 ? list : [lang === 'ar' ? 'الفرع الرئيسي' : 'Main Branch'];
  }, [filteredPayrolls, lang]);

  return (
    <div className="space-y-6">
      
      {/* HEADER — title RIGHT; Create + Print stacked on the LEFT */}
      <div
        className="border-b border-gray-300 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        <h2 className="text-xl font-bold text-[#0a1945] flex items-center gap-2 no-underline text-start">
          <Layers className="text-orange-500 shrink-0" size={22} />
          <span className="no-underline">{lang === 'ar' ? 'كشوف الرواتب المعتمدة' : 'Approved Certified Payroll Registry'}</span>
        </h2>

        {screen === 'list' && (
          <div className="flex flex-col gap-2 w-full sm:w-[200px] shrink-0">
            <button
              type="button"
              onClick={handleOpenCreator}
              className="w-full py-2.5 px-5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-lg shadow-md shadow-orange-500/15 hover:shadow-orange-200 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              <Plus size={16} />
              <span>{lang === 'ar' ? 'إنشاء كشف جديد' : 'New Payroll Sheet'}</span>
            </button>
            <button
              type="button"
              onClick={handleOpenEmpSlipModal}
              className="w-full py-2.5 px-5 bg-[#0a1945] hover:bg-[#15275a] text-white font-extrabold rounded-lg shadow-md hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              <Printer size={16} />
              <span>{lang === 'ar' ? 'طباعة راتب موظف' : 'Print Employee Slip'}</span>
            </button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        
        {/* VIEW 1: INDEX LIST (CRUD Table / Kanban) */}
        {screen === 'list' && (
          <motion.div
            key="list-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-5"
          >
            {/* Payroll Toolbar */}
            <div className="bg-white border-4 border-white rounded-2xl overflow-visible shadow-md relative hidden md:block mb-4">
              <div className="p-3.5 border-b border-gray-300 bg-slate-50/50 hidden md:flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 min-h-[48px] h-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                {/* Search group: grid forces filter on the physical RIGHT of the search bar */}
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 w-full sm:w-auto flex-1 max-w-md" style={{ direction: 'ltr' }}>
                  <div className="relative flex-1 flex items-center min-w-0">
                    <Search size={14} className="absolute left-3 rtl:right-3 rtl:left-auto text-slate-400 pointer-events-none" />
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder={lang === 'ar' ? 'البحث بكود الكشف، اسم الكشف، الفرع...' : 'Search doc, month, branch...'}
                      style={{ height: '36px' }}
                      dir={lang === 'ar' ? 'rtl' : 'ltr'}
                      className="w-full text-xs p-2 pl-8 pr-8 rtl:pr-8 rtl:pl-8 bg-white border border-gray-300 rounded-xl outline-none focus:border-orange-400 transition h-[36px]"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 -translate-y-1/2 p-0.5 text-slate-450 hover:text-orange-500 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                        title={lang === 'ar' ? 'مسح البحث' : 'Clear search'}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  {payrollViewMode === 'table' && (
                    <div className="relative group/filter shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsPayrollColumnFiltersOpen(!isPayrollColumnFiltersOpen)}
                        style={{ height: '36px' }}
                        className={cn(
                          "p-2 px-3 text-xs font-black rounded-lg border transition flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap min-h-[36px]",
                          isPayrollColumnFiltersOpen 
                            ? "bg-[#0a1945] text-white border-[#0a1945]" 
                            : "bg-white text-black border-gray-300 hover:border-orange-400 hover:text-orange-500"
                        )}
                      >
                        <Filter size={13} className={isPayrollColumnFiltersOpen ? "text-white" : "text-orange-500"} />
                      </button>
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/filter:block bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-50 font-bold font-sans pointer-events-none">
                        {lang === 'ar' ? 'بحث متقدم' : 'Advanced Search'}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 w-full justify-between sm:w-auto sm:justify-start" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                  {/* 1 Settings */}
                  <div className="relative group/settings">
                    <button 
                      type="button"
                      onClick={() => {
                        setTempPayrollVisibleColumns({ ...payrollVisibleColumns });
                        setPayrollColumnSettingsOpen(!payrollColumnSettingsOpen);
                      }}
                      style={{ height: '36px' }}
                      className="p-2 text-black hover:text-orange-500 bg-white border border-gray-300 hover:border-orange-400 rounded-lg hover:shadow-xs transition cursor-pointer flex items-center justify-center font-black text-[11px] min-h-[36px] w-[36px]"
                    >
                      <Settings size={14} className="text-orange-500 animate-spin-hover" />
                    </button>
                    
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/settings:block bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-50 font-bold font-sans pointer-events-none">
                      {lang === 'ar' ? 'تخصيص الأعمدة' : 'Customize Columns'}
                    </div>
                  
                    <AnimatePresence>
                      {payrollColumnSettingsOpen && (
                        <div className="absolute right-0 left-auto mt-2 w-64 bg-white rounded-2xl border border-gray-300 shadow-2xl z-50 p-3.5 text-xs text-right">
                          <div className="pb-2 border-b border-gray-300 mb-2.5">
                            <h4 className="font-extrabold text-slate-800 text-[12px] text-left rtl:text-right">{lang === 'ar' ? 'اختر الأعمدة' : 'Choose Columns'}</h4>
                          </div>
                          
                          <div className="space-y-2.5 max-h-68 overflow-y-auto">
                            {Object.entries({
                              id: { en: 'Doc ID', ar: 'كود الكشف' },
                              month: { en: 'Month', ar: 'الشهر' },
                              year: { en: 'Year', ar: 'العام' },
                              branch: { en: 'Branch', ar: 'الفرع' },
                              total: { en: 'Total Sum', ar: 'إجمالي الكشف' },
                              createdBy: { en: 'Created By', ar: 'منشئ الكشف' },
                              date: { en: 'Date', ar: 'تاريخ الإنشاء' },
                              actions: { en: 'Actions', ar: 'خيارات' }
                            }).map(([key, label]) => (
                              <div key={key} className="flex items-center gap-2 py-0.5 select-none rtl:flex-row-reverse">
                                <GripVertical size={12} className="text-slate-400 shrink-0" />
                                
                                <label className="flex items-center gap-2 w-full cursor-pointer select-none font-bold text-slate-700 text-left rtl:text-right flex-row rtl:flex-row-reverse">
                                  <input 
                                    type="checkbox" 
                                    checked={(tempPayrollVisibleColumns as any)[key]} 
                                    onChange={(e) => setTempPayrollVisibleColumns(prev => ({ ...prev, [key]: e.target.checked }))}
                                    className="w-4 h-4 rounded border border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition shrink-0"
                                  />
                                  <span className="text-[10px] font-semibold text-slate-700 truncate">{lang === 'ar' ? label.ar : label.en}</span>
                                </label>
                              </div>
                            ))}
                          </div>
                          
                          <div className="mt-3.5 pt-2.5 border-t border-black flex items-center justify-between gap-1">
                            <button 
                              type="button"
                              onClick={() => setTempPayrollVisibleColumns({ id: true, month: true, year: true, branch: true, total: true, createdBy: true, date: true, actions: true })}
                              className="px-1.5 py-1 border border-gray-300 text-slate-700 hover:text-[#0a1945] bg-white rounded-lg text-[8.5px] font-bold transition cursor-pointer uppercase tracking-tight"
                            >
                              {lang === 'ar' ? 'إعادة' : 'RESET'}
                            </button>
                            <div className="flex items-center gap-1">
                              <button 
                                type="button"
                                onClick={() => setPayrollColumnSettingsOpen(false)}
                                className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-lg text-[8.5px] font-bold transition cursor-pointer uppercase tracking-tight"
                              >
                                {lang === 'ar' ? 'إلغاء' : 'CANCEL'}
                              </button>
                              <button 
                                type="button"
                                onClick={() => {
                                  setPayrollVisibleColumns({ ...tempPayrollVisibleColumns });
                                  setPayrollColumnSettingsOpen(false);
                                }}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[8.5px] font-bold hover:shadow-xs transition cursor-pointer uppercase tracking-tight"
                              >
                                {lang === 'ar' ? 'تطبيق' : 'APPLY'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 2 Download between settings and cards */}
                  <div className="relative shrink-0" style={{ height: '36px', width: '36px' }} title={lang === 'ar' ? 'تحميل / تصدير' : 'Download / Export'}>
                    <ExportDataButton
                      lang={lang}
                      hideText
                      onToast={() => {}}
                      className="w-full h-full block"
                      buttonClassName="!w-[36px] !h-[36px] !min-h-[36px]"
                    />
                  </div>

                  {/* 3 Cards — orange grid */}
                  <div className="relative group/toggle">
                    <button
                      type="button"
                      onClick={() => setPayrollViewMode(payrollViewMode === 'table' ? 'kanban' : 'table')}
                      style={{ height: '36px' }}
                      className="flex items-center justify-center gap-1.5 p-2 px-3 bg-white border border-gray-300 rounded-lg hover:border-orange-400 hover:text-orange-500 text-slate-650 hover:shadow-xs transition cursor-pointer select-none min-h-[36px] text-[11px] font-black"
                    >
                      {payrollViewMode === 'table' ? (
                        <>
                          <LayoutGrid size={14} className="text-orange-500" />
                          <span className="font-sans">
                            {lang === 'ar' ? 'بطاقات' : 'Cards'}
                          </span>
                        </>
                      ) : (
                        <>
                          <List size={14} className="text-orange-500" />
                          <span className="font-sans">
                            {lang === 'ar' ? 'جدول' : 'Table'}
                          </span>
                        </>
                      )}
                    </button>
                    
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/toggle:block bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-50 font-bold font-sans pointer-events-none">
                      {payrollViewMode === 'table' 
                        ? (lang === 'ar' ? 'تحويل لعرض البطاقات' : 'Switch to Cards view')
                        : (lang === 'ar' ? 'تحويل للجدول الكلاسيكي' : 'Switch to Classic Table view')
                      }
                    </div>
                  </div>

                  {/* 4 Month filter */}
                  <div className="relative group/date">
                    <select
                      value={payrollDate}
                      onChange={(e) => setPayrollDate(e.target.value)}
                      style={{ height: '36px' }}
                      className="p-1 px-3 pr-7 rtl:pl-7 rtl:pr-3 bg-white border border-gray-300 rounded-xl text-[11px] font-bold font-sans outline-none w-full sm:w-auto min-h-[36px] hover:border-orange-400 focus:border-orange-400 transition cursor-pointer appearance-none text-[#0a1945]"
                    >
                      <option value="all">{lang === 'ar' ? 'كل الأشهر' : 'All Months'}</option>
                      <option value="2026-05">{lang === 'ar' ? 'مايو - 2026' : 'May - 2026'}</option>
                      <option value="2026-06">{lang === 'ar' ? 'يونيو - 2026' : 'June - 2026'}</option>
                      <option value="2026-07">{lang === 'ar' ? 'يوليو - 2026' : 'July - 2026'}</option>
                      <option value="2026-08">{lang === 'ar' ? 'أغسطس - 2026' : 'August - 2026'}</option>
                    </select>
                    <div className="absolute top-1/2 right-2.5 rtl:left-2.5 rtl:right-auto -translate-y-1/2 pointer-events-none text-slate-500">
                      <ChevronDown size={13} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {payrollViewMode === 'table' ? (
            <>
              {/* DESKTOP VIEW: SPREADSHEET TABLE */}
              <div className="hidden md:block bg-white border border-gray-300 rounded-2xl shadow-xs overflow-hidden w-full">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left rtl:text-right border-collapse">
                  <thead className="bg-[#f97316] text-[11px] font-sans text-white font-bold uppercase tracking-wider whitespace-nowrap h-10 border-b border-orange-600">
                    <tr>
                      {payrollVisibleColumns.id && <th className="py-2.5 px-4 text-center text-white">{lang === 'ar' ? 'كود الكشف' : 'Doc ID'}</th>}
                      {payrollVisibleColumns.month && <th className="py-2.5 px-4 text-white">{lang === 'ar' ? 'راتب شهر / الشهر' : 'Salary Month / Month'}</th>}
                      {payrollVisibleColumns.year && <th className="py-2.5 px-4 text-center text-white">{lang === 'ar' ? 'عام' : 'Year'}</th>}
                      {payrollVisibleColumns.branch && <th className="py-2.5 px-4 text-center text-white">{lang === 'ar' ? 'الفرع' : 'Branch'}</th>}
                      {payrollVisibleColumns.total && <th className="py-2.5 px-4 text-center text-white">{lang === 'ar' ? 'إجمالي الكشف' : 'Total Payroll Sum'}</th>}
                      {payrollVisibleColumns.createdBy && <th className="py-2.5 px-4 text-center text-white">{lang === 'ar' ? 'منشئ الكشف' : 'Created By'}</th>}
                      {payrollVisibleColumns.date && <th className="py-2.5 px-4 text-center text-white">{lang === 'ar' ? 'تاريخ الإنشاء' : 'Date of Creation'}</th>}
                      {payrollVisibleColumns.actions && <th className="py-2.5 px-4 text-center text-white">{lang === 'ar' ? 'خيارات الإجراءات' : 'Actions'}</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300 text-slate-700 text-xs font-sans">
                    {filteredPayrolls.map(doc => (
                      <tr key={doc.id} className="hover:bg-slate-50/40 transition">
                        {payrollVisibleColumns.id && <td className="py-3 px-4 text-center font-mono font-bold text-slate-500 bg-slate-50/30">{doc.id}</td>}
                        {payrollVisibleColumns.month && <td className="py-3 px-4 font-black text-[#0a1945]">{doc.month}</td>}
                        {payrollVisibleColumns.year && <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">{doc.year}</td>}
                        {payrollVisibleColumns.branch && (
                          <td className="py-3 px-4 text-center">
                            <span className="bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-full border border-blue-100 text-[10px]">
                              {doc.branch}
                            </span>
                          </td>
                        )}
                        {payrollVisibleColumns.total && (
                          <td className="py-3 px-4 text-center font-mono font-black text-rose-600 text-sm">
                            {doc.totalSum ? doc.totalSum.toLocaleString() : '54,200'} <span className="text-[8px] font-normal text-slate-400">EGP</span>
                          </td>
                        )}
                        {payrollVisibleColumns.createdBy && <td className="py-3 px-4 text-center font-semibold text-slate-600">{doc.createdBy}</td>}
                        {payrollVisibleColumns.date && <td className="py-3 px-4 text-center font-mono text-slate-450">{doc.createdAt}</td>}
                        {payrollVisibleColumns.actions && (
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* View / Print button */}
                              <button
                                onClick={() => handlePrintDocument(doc)}
                                className="p-1 px-2.5 bg-slate-50 text-[#0a1945] hover:bg-orange-50 hover:text-orange-600 text-[10px] font-black rounded-lg border border-gray-300 hover:border-orange-200 transition flex items-center gap-1 cursor-pointer"
                                title={lang === 'ar' ? 'عرض وطباعة' : 'View or Print Slips'}
                              >
                                <Printer size={12} />
                                <span>{lang === 'ar' ? 'طباعة' : 'Print'}</span>
                              </button>
  
                              {/* Edit button */}
                              <button
                                onClick={() => handleEditDocumentInGrid(doc)}
                                className="p-1.5 bg-slate-50 text-[#0a1945] hover:bg-blue-50 hover:text-blue-600 rounded-lg border border-gray-300 hover:border-blue-200 transition cursor-pointer"
                                title={lang === 'ar' ? 'تعديل الكشف' : 'Edit Payroll Sheet'}
                              >
                                <Edit2 size={12} />
                              </button>
  
                              {/* Delete button */}
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="p-1.5 bg-slate-50 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg border border-gray-300 hover:border-rose-200 transition cursor-pointer"
                                title={lang === 'ar' ? 'حذف سجل الكشف' : 'Delete Record'}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            </>
            ) : (
            <>
            {/* MOBILE VIEW: HEURISTIC KANBAN BOARD GROUPED BY BRANCH */}
            <div className="block space-y-4">
              <div className="flex justify-between items-center px-1 rtl:flex-row-reverse">
                <span className="text-[10px] font-black tracking-wider text-slate-450 uppercase">
                  {lang === 'ar' ? 'لوحة كانبان الكشوف المعتمدة (حسب الفرع)' : 'Certified Payroll Kanban (By Branch)'}
                </span>
                <span className="bg-[#0a1945] text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                  {filteredPayrolls.length} {lang === 'ar' ? 'كشف' : 'Docs'}
                </span>
              </div>

              <div className="flex overflow-x-auto gap-4 pb-4 snap-x select-none rtl:flex-row-reverse text-left rtl:text-right scrollbar-thin">
                {branches.map(branchName => {
                  const branchDocs = filteredPayrolls.filter(p => p.branch === branchName);
                  
                  return (
                    <div 
                      key={branchName} 
                      className="w-[85vw] sm:w-[325px] shrink-0 bg-slate-50 border border-gray-300/60 rounded-2xl p-4.5 space-y-4.5 snap-center"
                    >
                      {/* Column Header */}
                      <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-300 shadow-3xs rtl:flex-row-reverse">
                        <span className="font-extrabold text-[#0a1945] text-xs max-w-[75%] truncate">
                          {branchName}
                        </span>
                        <span className="bg-orange-50 text-orange-600 border border-orange-100 text-[10px] font-black px-2 py-0.5 rounded-full">
                          {branchDocs.length}
                        </span>
                      </div>

                      {/* Cards list container */}
                      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                        {branchDocs.length === 0 ? (
                          <div className="bg-white/60 border border-dashed border-gray-300 rounded-xl py-8 p-4 text-center text-[10px] text-slate-450 font-bold">
                            {lang === 'ar' ? 'لا توجد كشوف لهذا الفرع حالياً' : 'No sheets for this node'}
                          </div>
                        ) : (
                          branchDocs.map(doc => (
                            <div 
                              key={doc.id} 
                              className="bg-white border border-gray-300 rounded-xl p-3.5 space-y-3.5 shadow-3xs hover:border-orange-200 transition-colors"
                            >
                              {/* Header Title with Sum */}
                              <div className="flex justify-between items-center rtl:flex-row-reverse">
                                <div>
                                  <h4 className="font-extrabold text-[#0a1945] text-xs">
                                    {doc.month} {doc.year}
                                  </h4>
                                  <span className="text-[9px] font-mono font-bold text-slate-400">
                                    #{doc.id}
                                  </span>
                                </div>
                                <div className="text-right rtl:text-left">
                                  <span className="text-xs font-mono font-black text-rose-600 block">
                                    {(doc.totalSum || 54200).toLocaleString()}
                                  </span>
                                  <span className="text-[8px] font-bold text-slate-400">
                                    EGP
                                  </span>
                                </div>
                              </div>

                              {/* Info Metas Grid */}
                              <div className="grid grid-cols-2 gap-2 text-[9px] border-t border-b border-gray-300 py-2.5 text-slate-500">
                                <div className="rtl:text-right text-left">
                                  <span className="block text-[8px] text-slate-400 font-bold">
                                    {lang === 'ar' ? 'منشئ الكشف:' : 'Author:'}
                                  </span>
                                  <span className="font-semibold text-slate-700 truncate block">
                                    {doc.createdBy}
                                  </span>
                                </div>
                                <div className="rtl:text-right text-left">
                                  <span className="block text-[8px] text-slate-400 font-bold">
                                    {lang === 'ar' ? 'تاريخ الإنشاء:' : 'Date:'}
                                  </span>
                                  <span className="font-mono text-slate-600 block">
                                    {doc.createdAt}
                                  </span>
                                </div>
                              </div>

                              {/* Card Action Buttons */}
                              <div className="flex items-center justify-between gap-2 pt-1">
                                <button
                                  onClick={() => handlePrintDocument(doc)}
                                  className="w-1/2 py-2 bg-slate-50 hover:bg-orange-50 text-[#0a1945] hover:text-orange-600 text-[10px] font-black rounded-lg border border-gray-300 hover:border-orange-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Printer size={12} />
                                  <span>{lang === 'ar' ? 'طباعة' : 'Print'}</span>
                                </button>
                                
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    onClick={() => handleEditDocumentInGrid(doc)}
                                    className="p-2 bg-slate-50 hover:bg-blue-50 text-[#0a1945] hover:text-blue-600 rounded-lg border border-gray-300 hover:border-blue-200 transition cursor-pointer"
                                    title={lang === 'ar' ? 'تعديل الكشف' : 'Edit Sheet'}
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDocument(doc.id)}
                                    className="p-2 bg-slate-50 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded-lg border border-gray-300 hover:border-rose-200 transition cursor-pointer"
                                    title={lang === 'ar' ? 'حذف سجل الكشف' : 'Delete Record'}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </>
            )}
          </motion.div>
        )}

        {/* VIEW 2: FULL GRID ENTRY AND CALCULATOR SPREADSHEET */}
        {screen === 'spreadsheet' && (
          <motion.div
            key="spreadsheet-panel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Top Back Control Ribbon */}
            <div className="flex justify-between items-center bg-slate-50 p-4 border border-gray-300 rounded-2xl">
              <div className="flex items-center gap-3 rtl:flex-row-reverse">
                <button
                  onClick={() => setScreen('list')}
                  className="p-2 bg-white hover:bg-slate-100 text-slate-600 hover:text-orange-500 rounded-lg border border-gray-300 transition cursor-pointer flex items-center justify-center"
                >
                  <ArrowLeft size={16} className="rtl:rotate-180" />
                </button>
                <div className="rtl:text-right text-left">
                  <h3 className="text-xs font-black text-slate-800">
                    {editingDocId ? (lang === 'ar' ? `تعديل كشف: ${editingDocId}` : `Edit Sheet: ${editingDocId}`) : (lang === 'ar' ? 'تعبئة كشف رواتب جديد' : 'Compose New Salary Sheet')}
                  </h3>
                  <p className="text-[10px] text-slate-450 mt-0.5 font-bold">
                    {lang === 'ar' 
                      ? `${gridMeta.month} / ${gridMeta.year} (فرع: ${gridMeta.branch})` 
                      : `${gridMeta.month} / ${gridMeta.year} — Node: ${gridMeta.branch}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveDocument}
                  className="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs hover:shadow-lg hover:shadow-emerald-100 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Check size={14} />
                  <span>{lang === 'ar' ? 'حفظ واعتماد الكشف' : 'Save & Certify Sheet'}</span>
                </button>
              </div>
            </div>

            {/* INTUITIVE RECONSTRUCTED SLIP CARDS PANEL */}
            <div className="space-y-6">
              {/* Info ribbon summarizing calculation rules */}
              <div className="p-4 bg-orange-50/70 border border-orange-200/80 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-[#0a1945] font-extrabold rtl:flex-row-reverse">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                  <span>
                    {lang === 'ar' 
                      ? 'واجهة مسيرات الرواتب الذكية: كشف ومسير مالي منفصل لكل موظف' 
                      : 'Smart Salary Cards Interface: Individual pay slip card per employee'}
                  </span>
                </div>
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-wider bg-orange-100/50 px-2.5 py-1 rounded-md">
                  {lang === 'ar' ? 'اللون الذهبي والأخضر يحسب تلقائياً • الخلايا البيضاء قابلة للإدخال والتحيين يدوياً' : 'Golden & Green are calculated • White fields are free entry inputs'}
                </span>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gridData.map((row, index) => (
                  <motion.div 
                    key={row.employeeId}
                    whileHover={{ y: -3 }}
                    className="bg-white border-2 border-gray-300/80 rounded-[24px] shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                  >
                    {/* Card Header: Employee Avatar, ID Code, Name, and Print Action */}
                    <div className="p-4 bg-[#0a1945] text-white flex justify-between items-center relative">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full translate-x-12 -translate-y-12" />
                      
                      <div className="flex items-center gap-3 relative z-10 rtl:flex-row-reverse">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-400 to-orange-600 flex items-center justify-center font-black text-sm text-white shrink-0 shadow-sm">
                          {row.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left rtl:text-right">
                          <h4 className="font-extrabold text-sm text-white line-clamp-1">{row.name}</h4>
                          <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded-full font-mono text-orange-300 font-black">
                            {row.code}
                          </span>
                        </div>
                      </div>
                      
                      {/* Printable View simulation button */}
                      <button
                        onClick={() => {
                          const slipText = `
=============================================
         DECO SALARY SLIP (DEC-PRINT)
=============================================
Employee: ${row.name} (${row.code})
Period  : ${gridMeta.month} / ${gridMeta.year}
Branch  : ${gridMeta.branch}
---------------------------------------------
1. OPERATIONAL HOURS
   - Target Shift Hours: ${row.shiftHours} hrs
   - Actual Worked     : ${row.actualHours} hrs
---------------------------------------------
2. PAY SPEC DETAILS (EARNINGS)
   - Basic Salary      : ${row.basicSalary} EGP
   - Overtime Paid     : ${row.overtime} EGP
   - Sales Target Vol  : ${row.salesValue} EGP
   - Comm Share Rate   : ${row.salesPct}%
   - Calculated Comm   : ${row.netCommission} EGP
   - Extra Bonus 1     : ${row.incentive1} EGP
   - Extra Bonus 2     : ${row.incentive2} EGP
   - TOTAL EARNED      : ${row.totalEarned} EGP
---------------------------------------------
3. PAY SPEC DETAILS (DEDUCTIONS)
   - Attendance Delay  : ${row.delayDeduction} EGP
   - Other Deductions  : ${row.deduction2} EGP
   - Upfront Advances  : ${row.advances} EGP
   - TOTAL DEDUCTIONS  : ${row.totalDeductions} EGP
=============================================
* NET DISBURSED PAY : ${row.netPay} EGP
=============================================
`;
                          alert(lang === 'ar' ? `مسير راتب الموظف جاهز للطباعة والتسليم:\n\n${slipText}` : `Employee salary ledger slip is ready to print:\n\n${slipText}`);
                        }}
                        title={lang === 'ar' ? 'طباعة بيان الموظف' : 'Print Slip'}
                        className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition cursor-pointer relative z-10 shrink-0"
                      >
                        <Printer size={16} />
                      </button>
                    </div>

                    {/* Card Content Payload split into neat sections */}
                    <div className="p-4 space-y-4 text-xs">
                      {/* Section 1: Standard Duty / Shift Hours */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-250 flex items-center justify-between gap-4">
                        <div className="text-center flex-1">
                          <span className="text-[9px] text-slate-400 font-bold block mb-1">{lang === 'ar' ? 'ساعات الشفت المطلوبة' : 'Required Shift hrs'}</span>
                          <input
                            type="number"
                            value={row.shiftHours}
                            onChange={e => handleCellUpdate(index, 'shiftHours', e.target.value)}
                            className="w-full text-center bg-white border border-gray-300 focus:border-orange-400 rounded-lg h-7 font-mono font-bold text-[#0a1945] outline-none"
                          />
                        </div>
                        <div className="w-px h-7 bg-slate-200 shrink-0" />
                        <div className="text-center flex-1">
                          <span className="text-[9px] text-slate-400 font-bold block mb-1">{lang === 'ar' ? 'ساعات الدوام الفعلية' : 'Actual worked hrs'}</span>
                          <input
                            type="number"
                            value={row.actualHours}
                            onChange={e => handleCellUpdate(index, 'actualHours', e.target.value)}
                            className="w-full text-center bg-white border border-gray-300 focus:border-orange-400 rounded-lg h-7 font-mono font-bold text-[#0a1945] outline-none"
                          />
                        </div>
                      </div>

                      {/* Section 2: Financial columns structured two-column grids */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* LEFT COLUMN: EARNINGS AND BONUSES */}
                        <div className="space-y-3">
                          <div className="border-b border-orange-200 pb-1 flex items-center gap-1 rtl:flex-row-reverse text-orange-600 font-extrabold uppercase text-[10px]">
                            <TrendingUp size={12} />
                            <span>{lang === 'ar' ? 'المستحقات' : 'Earnings'}</span>
                          </div>

                          {/* Basic Salary */}
                          <div>
                            <label className="text-[9px] text-slate-400 font-bold block mb-1">{lang === 'ar' ? 'الراتب الأساسي' : 'Basic:'}</label>
                            <input
                              type="number"
                              value={row.basicSalary}
                              onChange={e => handleCellUpdate(index, 'basicSalary', e.target.value)}
                              className="w-full text-xs font-bold font-mono h-7 px-2 border border-gray-300 rounded-lg bg-[#fdfdfd] focus:border-orange-400 outline-none"
                            />
                          </div>

                          {/* Overtime */}
                          <div>
                            <label className="text-[9px] text-slate-400 font-bold block mb-1">{lang === 'ar' ? 'إضافي مبيعات/عمل' : 'Overtime Val:'}</label>
                            <input
                              type="number"
                              value={row.overtime === 0 ? '' : row.overtime}
                              placeholder="0"
                              onChange={e => handleCellUpdate(index, 'overtime', e.target.value)}
                              className="w-full text-xs font-bold font-mono h-7 px-2 border border-orange-200 rounded-lg bg-orange-50/10 focus:bg-orange-50/30 outline-none"
                            />
                          </div>

                          {/* Interactive Sales / Commission subblock */}
                          <div className="bg-teal-50/30 border border-teal-100 p-2 rounded-xl space-y-1.5">
                            <span className="text-[8px] text-teal-700 font-black tracking-wider block uppercase">{lang === 'ar' ? 'المبيعات وعمولة %' : 'Sales share & Com %'}</span>
                            <div className="grid grid-cols-2 gap-1.5">
                              <input
                                type="number"
                                placeholder={lang === 'ar' ? 'مبيعات' : 'Sales'}
                                value={row.salesValue}
                                onChange={e => handleCellUpdate(index, 'salesValue', e.target.value)}
                                className="w-full text-[10px] font-mono h-6 border border-gray-300 rounded bg-white text-center outline-none"
                                title={lang === 'ar' ? 'حجم مبيعات الموظف' : 'Sales Target'}
                              />
                              <input
                                type="text"
                                placeholder={lang === 'ar' ? 'عمولة%' : 'Pct%'}
                                value={row.salesPct}
                                onChange={e => handleCellUpdate(index, 'salesPct', e.target.value)}
                                className="w-full text-[10px] font-mono h-6 border border-gray-300 rounded bg-white text-center outline-none"
                                title={lang === 'ar' ? 'نسبة العمولة' : 'Comm rate'}
                              />
                            </div>
                            <div className="flex justify-between text-[9px] font-black text-teal-700 pt-1 border-t border-teal-100/60 font-mono">
                              <span>{lang === 'ar' ? 'صافي العمولة' : 'Commission:'}</span>
                              <span>{row.netCommission.toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Incentives */}
                          <div className="bg-slate-50 p-2 rounded-xl space-y-1 text-[#0a1945]">
                            <span className="text-[8px] text-slate-500 font-bold block uppercase">{lang === 'ar' ? 'الحوافز التقديرية' : 'Extra Incentives:'}</span>
                            <div className="grid grid-cols-2 gap-1.5">
                              <input
                                type="number"
                                value={row.incentive1 === 0 ? '' : row.incentive1}
                                placeholder="Inc 1"
                                onChange={e => handleCellUpdate(index, 'incentive1', e.target.value)}
                                className="w-full text-[10px] font-mono h-6 border border-gray-300 rounded bg-white text-center outline-none"
                                title={lang === 'ar' ? 'حافز رقم ١' : 'Incentive 1'}
                              />
                              <input
                                type="number"
                                value={row.incentive2 === 0 ? '' : row.incentive2}
                                placeholder="Inc 2"
                                onChange={e => handleCellUpdate(index, 'incentive2', e.target.value)}
                                className="w-full text-[10px] font-mono h-6 border border-gray-300 rounded bg-white text-center outline-none"
                                title={lang === 'ar' ? 'حافز رقم ٢' : 'Incentive 2'}
                              />
                            </div>
                          </div>
                        </div>

                        {/* RIGHT COLUMN: DEDUCTIONS AND PENALTIES */}
                        <div className="space-y-3">
                          <div className="border-b border-rose-200 pb-1 flex items-center gap-1 rtl:flex-row-reverse text-rose-500 font-extrabold uppercase text-[10px]">
                            <TrendingDown size={12} />
                            <span>{lang === 'ar' ? 'المستقطعات' : 'Deductions'}</span>
                          </div>

                          {/* Delay Deductions */}
                          <div>
                            <label className="text-[9px] text-slate-400 font-bold block mb-1">{lang === 'ar' ? 'خصم التأخير التلقائي' : 'Delay Penalty:'}</label>
                            <div className="h-7 px-2 flex items-center justify-center font-bold font-mono border border-rose-100 bg-rose-50/20 text-rose-600 rounded-lg text-xs">
                              - {row.delayDeduction.toLocaleString()}
                            </div>
                          </div>

                          {/* Manual Deduction 2 */}
                          <div>
                            <label className="text-[9px] text-slate-400 font-bold block mb-1">{lang === 'ar' ? 'خصم مالي إداري' : 'Other Deduct:'}</label>
                            <input
                              type="number"
                              value={row.deduction2 === 0 ? '' : row.deduction2}
                              placeholder="0"
                              onChange={e => handleCellUpdate(index, 'deduction2', e.target.value)}
                              className="w-full text-xs font-bold font-mono h-7 px-2 border border-rose-200 rounded-lg bg-rose-50/5 focus:bg-rose-50 outline-none text-rose-600"
                            />
                          </div>

                          {/* Advances */}
                          <div>
                            <label className="text-[9px] text-slate-400 font-bold block mb-1">{lang === 'ar' ? 'قيمة السُلَف الكلية' : 'Advances:'}</label>
                            <div className="h-7 px-2 flex items-center justify-center font-bold font-mono border border-indigo-105 bg-indigo-50/20 text-indigo-700 rounded-lg text-[11px]">
                              {row.advances.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Cumulative Subtotals badge group */}
                      <div className="grid grid-cols-2 gap-3 pt-1.5 border-t border-gray-300">
                        <div className="bg-yellow-50 text-slate-800 rounded-xl p-2 text-center border border-yellow-205">
                          <span className="text-[8px] font-bold block text-yellow-700/90">{lang === 'ar' ? 'إجمالي المستحق' : 'Gross Earned:'}</span>
                          <span className="font-mono font-black text-xs text-[#0a1945]">{row.totalEarned.toLocaleString()}</span>
                        </div>
                        <div className="bg-rose-50/40 text-slate-800 rounded-xl p-2 text-center border border-rose-105">
                          <span className="text-[8px] font-bold block text-rose-600/95">{lang === 'ar' ? 'إجمالي المستقطع' : 'Gross Deductions:'}</span>
                          <span className="font-mono font-black text-xs text-rose-600">{row.totalDeductions.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Net payable Banner block */}
                    <div className="bg-emerald-600 text-white p-3.5 px-4.5 flex justify-between items-center rounded-b-[22px]">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#d1facf]">{lang === 'ar' ? 'صافي دخل الموظف' : 'NET PAYABLE:'}</span>
                      <div className="flex items-center gap-1 flex-row-reverse">
                        <span className="text-xl font-black font-mono tracking-wide">{row.netPay.toLocaleString()}</span>
                        <span className="text-[9px] font-bold opacity-80">EGP</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Bottom footer compiled statistics aggregation */}
              <div className="p-5 bg-[#0a1945]/5 border border-slate-250 rounded-[28px] flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold shadow-xs">
                <span className="text-slate-600 text-sm">{lang === 'ar' ? 'ميزانية الدورة المالية المقدرة الإجمالية لهذا الكشف:' : 'Total Compiled Slip sum to disburse:'}</span>
                <div className="flex items-center gap-2 rtl:flex-row-reverse">
                  <span className="text-2xl font-black text-[#0a1945]">
                    {gridData.reduce((acc, r) => acc + r.netPay, 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] uppercase font-black text-slate-500 bg-slate-205 px-2 py-0.5 rounded-full">EGP</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* POPUP MODAL: YEAR, MONTH, BRANCH CHOICES SCREEN ON CREATION */}
      <ReusableModal
        isOpen={isNewPayrollModalOpen}
        onClose={() => setIsNewPayrollModalOpen(false)}
        title={lang === 'ar' ? 'إعداد كشف رواتب جديد' : 'New Approved Payroll Form'}
        lang={lang}
      >
        <div className="space-y-5 text-xs text-slate-700">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 text-left rtl:text-right">
              {lang === 'ar' ? 'السنة المالية' : 'Fiscal Year'}
            </label>
            <select
              value={newYear}
              onChange={e => setNewYear(parseInt(e.target.value) || 2026)}
              className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl outline-none focus:border-orange-500 transition text-xs font-black"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 text-left rtl:text-right">
              {lang === 'ar' ? 'الشهر' : 'Salary Month'}
            </label>
            <select
              value={newMonth}
              onChange={e => setNewMonth(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl outline-none focus:border-orange-500 transition text-xs font-black"
            >
              {monthsList.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 text-left rtl:text-right">
              {lang === 'ar' ? 'الفرع المستهدف' : 'Retail Branch Node'}
            </label>
            <select
              value={newBranch}
              onChange={e => setNewBranch(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl outline-none focus:border-orange-500 transition text-xs font-black"
            >
              {branchesList.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="pt-3">
            <button
              onClick={handleGeneratePayrollGrid}
              className="w-full py-3 bg-[#0a1945] hover:bg-orange-500 text-white font-extrabold rounded-lg transition-all cursor-pointer text-xs"
            >
              {lang === 'ar' ? 'بدء إنشاء وتعبئة الجدول' : 'Start filling the spreadsheet'}
            </button>
          </div>
        </div>
      </ReusableModal>

      {/* POPUP MODAL: PRINT INDIVIDUAL EMPLOYEE SALARY SLIP */}
      <ReusableModal
        isOpen={isEmpSlipModalOpen}
        onClose={() => setIsEmpSlipModalOpen(false)}
        title={lang === 'ar' ? 'طباعة بيان راتب موظف منفرد' : 'Print Individual Employee Wage Slip'}
        size="lg"
        lang={lang}
      >
        <div className="space-y-6 text-xs text-slate-700">
          
          {/* Settings Section (Hidden in print) */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-gray-300 space-y-4 no-print text-left rtl:text-right">
            <p className="font-extrabold text-[#0a1945] text-xs">
              {lang === 'ar' ? 'خيارات إعداد وتجهيز بيان راتب الموظف' : 'Configure Employee Salary Statement Slip'}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Select Employee */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 text-left rtl:text-right">
                  {lang === 'ar' ? 'الموظف المستهدف:' : 'Select Employee:'}
                </label>
                <select
                  value={slipSelectedEmp}
                  onChange={e => {
                    setSlipSelectedEmp(e.target.value);
                    setIsSlipGenerated(false);
                  }}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-xl outline-none text-xs font-black focus:border-orange-500"
                >
                  <option value="" disabled>{lang === 'ar' ? '-- اختر موظف --' : '-- Choose employee --'}</option>
                  {staffList.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {lang === 'ar' ? emp.nameAr : emp.name} ({emp.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Month */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 text-left rtl:text-right">
                  {lang === 'ar' ? 'الشهر المستهدف:' : 'Salary Month:'}
                </label>
                <select
                  value={slipSelectedMonth}
                  onChange={e => {
                    setSlipSelectedMonth(e.target.value);
                    setIsSlipGenerated(false);
                  }}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-xl outline-none text-xs font-black focus:border-orange-500"
                >
                  {monthsList.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Select Year */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 text-left rtl:text-right">
                  {lang === 'ar' ? 'العام المستهدف:' : 'Salary Year:'}
                </label>
                <select
                  value={slipSelectedYear}
                  onChange={e => {
                    setSlipSelectedYear(parseInt(e.target.value) || 2026);
                    setIsSlipGenerated(false);
                  }}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-xl outline-none text-xs font-black focus:border-orange-500"
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
              </div>

              {/* Select Paper Type */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 text-left rtl:text-right">
                  {lang === 'ar' ? 'قياس الورق المطلوب:' : 'Output Paper Format:'}
                </label>
                <select
                  value={slipPaperType}
                  onChange={e => {
                    setSlipPaperType(e.target.value as 'thermal' | 'A5' | 'A4');
                  }}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-xl outline-none text-xs font-black focus:border-orange-500"
                >
                  <option value="thermal">
                    {lang === 'ar' ? 'ورق حراري (كاشير)' : 'Thermal (80mm Cashier Roll)'}
                  </option>
                  <option value="A5">
                    {lang === 'ar' ? 'ورق A5' : 'A5 Page Format'}
                  </option>
                  <option value="A4">
                    {lang === 'ar' ? 'ورق A4' : 'A4 Standard Paper'}
                  </option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 relative">
              
              {/* Customize Rows Dropdown Toggler */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCustomizeDropdownOpen(!isCustomizeDropdownOpen)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-lg border border-gray-300 transition-all cursor-pointer text-xs flex items-center gap-2 shadow-sm"
                >
                  <Settings size={14} className="text-slate-600" />
                  <span>{lang === 'ar' ? 'تخصيص بنود الطباعة' : 'Customize Rows'}</span>
                </button>

                {isCustomizeDropdownOpen && (
                  <div className="absolute z-50 bottom-full mb-2 left-[50%] -translate-x-[50%] sm:left-auto sm:translate-x-0 sm:right-0 bg-white border border-gray-300 rounded-2xl shadow-xl p-4 w-[280px] sm:w-72 max-h-[300px] sm:max-h-80 overflow-y-auto text-left rtl:text-right space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-300">
                      <span className="font-extrabold text-[#0a1945] text-xs">
                        {lang === 'ar' ? 'تحديد السطور لبيان الراتب' : 'Select Visible Rows'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const allChecked = Object.values(slipVisibleRows).every(v => v);
                          const newVals = { ...slipVisibleRows };
                          Object.keys(newVals).forEach(k => {
                            newVals[k] = !allChecked;
                          });
                          setSlipVisibleRows(newVals);
                        }}
                        className="text-[10px] text-orange-500 font-black hover:underline"
                      >
                        {lang === 'ar' ? 'تحديد/إلغاء الكل' : 'Toggle All'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5">
                      {[
                        { key: 'code', labelAr: 'كود الموظف', labelEn: 'Employee Code' },
                        { key: 'basicSalary', labelAr: 'الراتب الاساسي', labelEn: 'Basic Salary' },
                        { key: 'shiftHours', labelAr: 'عدد ساعات الشفت', labelEn: 'Target Shift Hours' },
                        { key: 'actualHours', labelAr: 'ساعات العمل الفعليه', labelEn: 'Actual Working Hours' },
                        { key: 'overtime', labelAr: 'اضافي', labelEn: 'Overtime' },
                        { key: 'salesValue', labelAr: 'قيمه المبيعات (سري)', labelEn: 'Sales Volume (Private)' },
                        { key: 'salesPct', labelAr: 'نسبه المبيعات', labelEn: 'Commission Rate' },
                        { key: 'netCommission', labelAr: 'صافى العموله', labelEn: 'Net Commission' },
                        { key: 'incentive1', labelAr: 'حافز ١', labelEn: 'Incentive 1' },
                        { key: 'incentive2', labelAr: 'حافز ٢', labelEn: 'Incentive 2' },
                        { key: 'totalEarned', labelAr: 'اجمالي المستحق', labelEn: 'Total Earned' },
                        { key: 'delayDeduction', labelAr: 'خصم تاخيرات', labelEn: 'Delay Deductions' },
                        { key: 'deduction2', labelAr: 'خصم ٢', labelEn: 'Penalties (Deduction 2)' },
                        { key: 'advances', labelAr: 'سلف', labelEn: 'Advances/Loans' },
                        { key: 'totalDeductions', labelAr: 'اجمالي المستقطع', labelEn: 'Total Deductions' }
                      ].map(item => (
                        <label key={item.key} className="flex items-center gap-2 cursor-pointer py-1 px-1.5 hover:bg-slate-50 rounded-lg select-none transition-colors">
                          <input
                            type="checkbox"
                            checked={slipVisibleRows[item.key] !== false}
                            onChange={() => {
                              setSlipVisibleRows(prev => ({
                                ...prev,
                                [item.key]: !prev[item.key]
                              }));
                            }}
                            className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-700">
                            {lang === 'ar' ? item.labelAr : item.labelEn}
                          </span>
                        </label>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-black flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsCustomizeDropdownOpen(false)}
                        className="py-1 px-3 bg-[#0a1945] hover:bg-[#152e6f] text-white rounded-lg text-[10px] font-bold transition-all"
                      >
                        {lang === 'ar' ? 'تم الحفظ' : 'Done'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleGenerateEmpSlip}
                className="py-2.5 px-6 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-lg transition-all cursor-pointer text-xs shadow-md"
              >
                {lang === 'ar' ? 'عرض مفرَدات الراتب وتوليد البيان' : 'Compute & Generate Statement'}
              </button>
            </div>
          </div>

          {/* Generated Slip Display Area */}
          {isSlipGenerated && generatedSlipData && (
            <div className="space-y-4">
              <div className="border-b border-gray-300 my-2" />
              
              <div className="flex justify-between items-center no-print">
                <span className="text-slate-400 text-[10px] font-bold tracking-wider uppercase">
                  {lang === 'ar' ? 'معاينة جاهزة للطباعة' : 'Print Ready Layout Preview'}
                </span>
                
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-3 py-1 rounded-full uppercase">
                  {slipPaperType === 'thermal' && (lang === 'ar' ? 'ورق حراري 80 ملم' : 'Thermal Roll 80mm')}
                  {slipPaperType === 'A5' && (lang === 'ar' ? 'ورق A5' : 'A5 Medium Page')}
                  {slipPaperType === 'A4' && (lang === 'ar' ? 'ورق A4' : 'A4 Full Page')}
                </span>
              </div>

              {/* Actual paper container shaped wrapper depending on paperType style */}
              <div className="flex justify-center bg-slate-100 p-6 rounded-2xl border border-gray-300 overflow-x-auto">
                <div 
                  className={cn(
                    "bg-white shadow-xl border p-6 font-sans text-stone-900 leading-normal transition-all",
                    slipPaperType === 'thermal' && "w-[300px] border-dashed border-stone-400 p-4 font-mono text-[11px]",
                    slipPaperType === 'A5' && "w-[440px] border-double border-4 border-stone-800 rounded-lg p-5",
                    slipPaperType === 'A4' && "w-[100%] max-w-[650px] border-2 border-slate-800 rounded-xl p-8"
                  )}
                  id="employee-slip-paper"
                >
                  
                  {/* Top Title Bar */}
                  <div className="text-center pb-4 mb-4 border-b border-stone-300">
                    <p className="font-black uppercase tracking-wide text-xs text-[#0a1945]">
                      {lang === 'ar' ? 'بيان مفردات راتب موظف' : 'Employee Wage Slip'}
                    </p>
                    <div className="flex justify-center gap-2 text-[9px] text-slate-500 font-black mt-1">
                      <span>{lang === 'ar' ? `الشهر: ${slipSelectedMonth}` : `Month: ${slipSelectedMonth}`}</span>
                      <span>•</span>
                      <span>{lang === 'ar' ? `العام: ${slipSelectedYear}` : `Year: ${slipSelectedYear}`}</span>
                    </div>
                    {slipPaperType === 'thermal' && (
                      <p className="text-[8px] text-stone-400 mt-1 font-mono text-center">
                        {new Date().toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* High fidelity spreadsheet grid copycat style simulating the user's vertical image */}
                  <div className="border border-[#1e293b] overflow-hidden text-xs" style={{ direction: 'rtl' }}>
                    
                    {/* COD/CODE Row */}
                    {slipVisibleRows.code !== false && (
                      <div className="flex border-b border-[#1e293b]">
                        <div className="w-1/2 p-2 bg-stone-50 font-bold border-l border-[#1e293b] text-right">
                          {lang === 'ar' ? 'كود الموظف' : 'Employee Code'}
                        </div>
                        <div className="w-1/2 p-2 font-bold text-center">
                          {generatedSlipData.code}
                        </div>
                      </div>
                    )}

                    {/* NAME Row - Gray BG */}
                    <div className="flex border-b border-[#1e293b] bg-slate-100">
                      <div className="w-1/2 p-2 font-extrabold border-l border-[#1e293b] text-right">
                        {lang === 'ar' ? 'اسم الموظف' : 'Employee Name'}
                      </div>
                      <div className="w-1/2 p-2 font-extrabold text-center text-slate-800">
                        {generatedSlipData.name}
                      </div>
                    </div>

                    {/* BASIC Row */}
                    {slipVisibleRows.basicSalary !== false && (
                      <div className="flex border-b border-[#1e293b]">
                        <div className="w-1/2 p-2 font-bold border-l border-[#1e293b] text-right">
                          {lang === 'ar' ? 'الراتب الاساسي' : 'Basic Salary'}
                        </div>
                        <div className="w-1/2 p-2 text-center font-mono font-bold">
                          {generatedSlipData.basicSalary.toLocaleString()} EGP
                        </div>
                      </div>
                    )}

                    {/* SHIFT HOURS Row */}
                    {slipVisibleRows.shiftHours !== false && (
                      <div className="flex border-b border-[#1e293b]">
                        <div className="w-1/2 p-2 border-l border-[#1e293b] text-right">
                          {lang === 'ar' ? 'عدد ساعات الشفت' : 'Shift Target Hours'}
                        </div>
                        <div className="w-1/2 p-2 text-center font-mono">
                          {generatedSlipData.shiftHours}
                        </div>
                      </div>
                    )}

                    {/* ACTUAL HOURS Row */}
                    {slipVisibleRows.actualHours !== false && (
                      <div className="flex border-b border-[#1e293b]">
                        <div className="w-1/2 p-2 border-l border-[#1e293b] text-right">
                          {lang === 'ar' ? 'ساعات العمل الفعليه' : 'Actual Logged Hours'}
                        </div>
                        <div className="w-1/2 p-2 text-center font-mono">
                          {generatedSlipData.actualHours}
                        </div>
                      </div>
                    )}

                    {/* OVERTIME Row */}
                    {slipVisibleRows.overtime !== false && (
                      <div className="flex border-b border-[#1e293b]">
                        <div className="w-1/2 p-2 border-l border-[#1e293b] text-right">
                          {lang === 'ar' ? 'اضافي' : 'Overtime Credit'}
                        </div>
                        <div className="w-1/2 p-2 text-center font-mono">
                          {generatedSlipData.overtime > 0 ? `${generatedSlipData.overtime.toLocaleString()} EGP` : (lang === 'ar' ? 'فارغ' : '--')}
                        </div>
                      </div>
                    )}

                    {/* SALES VALUE Row */}
                    {slipVisibleRows.salesValue !== false && (
                      <div className="flex border-b border-[#1e293b]">
                        <div className="w-1/2 p-2 border-l border-[#1e293b] text-right">
                          {lang === 'ar' ? 'قيمه المبيعات' : 'Sales Volume'}
                        </div>
                        <div className="w-1/2 p-2 text-center font-mono text-stone-600">
                          {generatedSlipData.salesValue > 0 ? `${generatedSlipData.salesValue.toLocaleString()} EGP` : (lang === 'ar' ? 'فارغ' : '--')}
                        </div>
                      </div>
                    )}

                    {/* SALES PCT Row */}
                    {slipVisibleRows.salesPct !== false && (
                      <div className="flex border-b border-[#1e293b]">
                        <div className="w-1/2 p-2 border-l border-[#1e293b] text-right">
                          {lang === 'ar' ? 'نسبه المبيعات' : 'Commission Rate'}
                        </div>
                        <div className="w-1/2 p-2 text-center font-mono text-stone-600">
                          {generatedSlipData.salesPct > 0 ? `${generatedSlipData.salesPct}%` : (lang === 'ar' ? 'فارغ' : '--')}
                        </div>
                      </div>
                    )}

                    {/* NET COMMISSION Row */}
                    {slipVisibleRows.netCommission !== false && (
                      <div className="flex border-b border-[#1e293b]">
                        <div className="w-1/2 p-2 border-l border-[#1e293b] text-right font-bold text-emerald-700">
                          {lang === 'ar' ? 'صافى العموله' : 'Net Sales Commission'}
                        </div>
                        <div className="w-1/2 p-2 text-center font-mono font-bold text-emerald-700">
                          {generatedSlipData.netCommission > 0 ? `${generatedSlipData.netCommission.toLocaleString()} EGP` : (lang === 'ar' ? 'فارغ' : '--')}
                        </div>
                      </div>
                    )}

                    {/* INCENTIVE 1 Row */}
                    {slipVisibleRows.incentive1 !== false && (
                      <div className="flex border-b border-[#1e293b]">
                        <div className="w-1/2 p-2 border-l border-[#1e293b] text-right">
                          {lang === 'ar' ? 'حافز ١' : 'Performance Bonus 1'}
                        </div>
                        <div className="w-1/2 p-2 text-center text-stone-400 italic">
                          {generatedSlipData.incentive1 > 0 ? `${generatedSlipData.incentive1.toLocaleString()} EGP` : (lang === 'ar' ? 'فارغ' : 'Empty')}
                        </div>
                      </div>
                    )}

                    {/* INCENTIVE 2 Row */}
                    {slipVisibleRows.incentive2 !== false && (
                      <div className="flex border-b border-[#1e293b]">
                        <div className="w-1/2 p-2 border-l border-[#1e293b] text-right">
                          {lang === 'ar' ? 'حافز ٢' : 'Discretionary Bonus 2'}
                        </div>
                        <div className="w-1/2 p-2 text-center text-stone-400 italic">
                          {generatedSlipData.incentive2 > 0 ? `${generatedSlipData.incentive2.toLocaleString()} EGP` : (lang === 'ar' ? 'فارغ' : 'Empty')}
                        </div>
                      </div>
                    )}

                    {/* TOTAL EARNED - YELLOW Highlighted to copycat image */}
                    {slipVisibleRows.totalEarned !== false && (
                      <div className="flex border-b border-[#1e293b] bg-yellow-250 bg-yellow-200">
                        <div className="w-1/2 p-2 font-black border-l border-[#1e293b] text-[#0a1945] text-right">
                          {lang === 'ar' ? 'اجمالي المستحق' : 'Gross Total Earned'}
                        </div>
                        <div className="w-1/2 p-2 text-center font-mono font-black text-[#0a1945]">
                          {generatedSlipData.totalEarned.toLocaleString()} EGP
                        </div>
                      </div>
                    )}

                    {/* DELAY DEDUCTIONS Row */}
                    {slipVisibleRows.delayDeduction !== false && (
                      <div className="flex border-b border-[#1e293b]">
                        <div className="w-1/2 p-2 border-l border-[#1e293b] text-right text-rose-600 font-medium">
                          {lang === 'ar' ? 'خصم تاخيرات' : 'Delay Deductions'}
                        </div>
                        <div className="w-1/2 p-2 text-center font-mono text-rose-600 font-semibold">
                          {generatedSlipData.delayDeduction > 0 ? `-${generatedSlipData.delayDeduction.toLocaleString()} EGP` : (lang === 'ar' ? 'فارغ' : '--')}
                        </div>
                      </div>
                    )}

                    {/* DEDUCTION 2 Row */}
                    {slipVisibleRows.deduction2 !== false && (
                      <div className="flex border-b border-[#1e293b]">
                        <div className="w-1/2 p-2 border-l border-[#1e293b] text-right text-rose-500">
                          {lang === 'ar' ? 'خصم ٢' : 'Penalties & Violations'}
                        </div>
                        <div className="w-1/2 p-2 text-center text-stone-400 italic">
                          {generatedSlipData.deduction2 > 0 ? `-${generatedSlipData.deduction2.toLocaleString()} EGP` : (lang === 'ar' ? 'فارغ' : 'Empty')}
                        </div>
                      </div>
                    )}

                    {/* ADVANCES/LOANS Row */}
                    {slipVisibleRows.advances !== false && (
                      <div className="flex border-b border-[#1e293b]">
                        <div className="w-1/2 p-2 border-l border-[#1e293b] text-right text-rose-600 font-medium">
                          {lang === 'ar' ? 'سلف' : 'Advances Deducts'}
                        </div>
                        <div className="w-1/2 p-2 text-center font-mono font-semibold text-rose-600">
                          {generatedSlipData.advances > 0 ? `-${generatedSlipData.advances.toLocaleString()} EGP` : (lang === 'ar' ? 'فارغ' : '--')}
                        </div>
                      </div>
                    )}

                    {/* TOTAL DEDUCTED - YELLOW Highlighted */}
                    {slipVisibleRows.totalDeductions !== false && (
                      <div className="flex border-b border-[#1e293b] bg-yellow-150 bg-yellow-200">
                        <div className="w-1/2 p-2 font-black border-l border-[#1e293b] text-[#0a1945] text-right">
                          {lang === 'ar' ? 'اجمالي المستقطع' : 'Total Deductions'}
                        </div>
                        <div className="w-1/2 p-2 text-center font-mono font-black text-[#0a1945]">
                          {generatedSlipData.totalDeductions.toLocaleString()} EGP
                        </div>
                      </div>
                    )}

                    {/* NET PAY - GREEN Highlighted as in image */}
                    <div className="flex bg-emerald-600 text-white font-black">
                      <div className="w-1/2 p-2 font-black border-l border-[#1e293b] text-white text-right">
                        {lang === 'ar' ? 'الصافي' : 'Net Payable Take-Home'}
                      </div>
                      <div className="w-1/2 p-2 text-center font-mono font-black text-white text-sm">
                        {generatedSlipData.netPay.toLocaleString()} EGP
                      </div>
                    </div>

                  </div>

                  {/* Stamp/Disclaimer message */}
                  <div className="text-center pt-5 text-[8px] text-stone-400 font-bold border-t border-dashed mt-4">
                    <span>{lang === 'ar' ? 'معتمد من نظام الإدارة المالية والرواتب الموحد.' : 'Officially audited and signed electronically.'}</span>
                  </div>

                </div>
              </div>

              {/* Action commands */}
              <div className="flex justify-end gap-2 pt-2 no-print">
                <button
                  onClick={() => {
                    const printContents = document.getElementById('employee-slip-paper')?.innerHTML;
                    if (!printContents) return;
                    
                    const specDirection = lang === 'ar' ? 'rtl' : 'ltr';
                    const specAlign = lang === 'ar' ? 'right' : 'left';
                    const styles = `
                      <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@450;700;900&display=swap');
                        body { 
                          font-family: 'Inter', system-ui, sans-serif; 
                          padding: 15px; 
                          direction: ${specDirection}; 
                          text-align: center; 
                          background-color: #fff;
                          color: #000;
                        }
                        .text-center { text-align: center; }
                        .pb-4 { padding-bottom: 16px; }
                        .mb-4 { margin-bottom: 16px; }
                        .flex { display: flex; }
                        .justify-center { justify-content: center; }
                        .gap-2 { gap: 8px; }
                        .text-xs { font-size: 12px; }
                        .text-[9px] { font-size: 9px; }
                        .text-[8px] { font-size: 8px; }
                        .text-sm { font-size: 14px; }
                        .text-neutral-500, .text-slate-500, .text-stone-400 { color: #6b7280; }
                        .font-bold { font-weight: bold; }
                        .font-black { font-weight: 900; }
                        .font-extrabold { font-weight: 800; }
                        .border-t { border-top: 1px solid #1e293b; }
                        .border-b { border-bottom: 1px solid #1e293b; border-color: #1e293b !important; }
                        .border-l { border-left: 1px solid #1e293b; }
                        .border-r { border-right: 1px solid #1e293b; }
                        .border { border: 1px solid #1e293b; }
                        .w-1\\/2 { width: 50%; }
                        .p-2 { padding: 8px; }
                        .bg-slate-100 { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .bg-yellow-200 { background-color: #fef08a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .bg-emerald-600 { background-color: #059669 !important; color: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .bg-stone-50 { background-color: #fafaf9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .text-right { text-align: ${specAlign}; }
                        .text-white { color: #ffffff !important; }
                        @media print {
                          .no-print { display: none !important; }
                        }
                      </style>
                    `;
                    
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write('<html><head><title>Salary Slip - ' + generatedSlipData.name + '</title>' + styles + '</head><body>');
                      printWindow.document.write(printContents);
                      printWindow.document.write('</body></html>');
                      printWindow.document.close();
                      printWindow.focus();
                      setTimeout(() => {
                        printWindow.print();
                        printWindow.close();
                      }, 500);
                    }
                  }}
                  className="py-2.5 px-5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-lg text-xs hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Printer size={14} />
                  <span>{lang === 'ar' ? 'طباعة الاستمارة' : 'Print Slip'}</span>
                </button>
              </div>

            </div>
          )}

        </div>
      </ReusableModal>

      {/* POPUP MODAL: BEAUTIFUL PRINT-FRIENDLY INDIVIDUAL/CONSOLIDATED PAYSLIPS */}
      <ReusableModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={lang === 'ar' ? 'طباعة كشف ميزانية رواتب معتمد' : 'View or Print Slips'}
        size="lg"
        lang={lang}
      >
        {printDoc && (
          <div className="space-y-6 text-xs text-slate-800" id="print-area">
            {/* Invoice upper banner */}
            <div className="border-b-2 border-slate-900 pb-5 text-center space-y-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">{lang === 'ar' ? 'محلي للأزياء والتجزئة ERP — كشف رواتب معتمد' : 'Ma7aly Retail ERP — Payroll Slips'}</h1>
              <p className="text-xs text-slate-500">{lang === 'ar' ? 'شركة محلي المحدودة لخطوط الإنتاج والتسويق' : 'Ma7aly Ltd. for Retail & Fashion lines'}</p>
              
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-black text-left rtl:text-right font-black">
                <div>
                  <span className="text-[10px] text-slate-400 block font-normal">{lang === 'ar' ? 'راتب شهر:' : 'Month:'}</span>
                  <span>{printDoc.month}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-normal">{lang === 'ar' ? 'العام المالي:' : 'Year:'}</span>
                  <span>{printDoc.year}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-normal">{lang === 'ar' ? 'الفرع المستهدف:' : 'Branch:'}</span>
                  <span>{printDoc.branch}</span>
                </div>
              </div>
            </div>

            {/* Structured payroll table */}
            <div className="overflow-hidden border border-gray-300 rounded-lg">
              <table className="w-full text-xs text-left rtl:text-right">
                <thead className="bg-slate-100 border-b border-gray-300 text-slate-700 font-bold">
                  <tr>
                    <th className="p-2 py-2.5">{lang === 'ar' ? 'اسم الموظف' : 'Staff'}</th>
                    <th className="p-2 py-2.5 text-center">{lang === 'ar' ? 'الأساسي' : 'Base'}</th>
                    <th className="p-2 py-2.5 text-center">{lang === 'ar' ? 'العمولات' : 'Sales Comm.'}</th>
                    <th className="p-2 py-2.5 text-center">{lang === 'ar' ? 'حوافز' : 'Incentives'}</th>
                    <th className="p-2 py-2.5 text-center text-rose-600">{lang === 'ar' ? 'مستقطعات (-)' : 'Deductions'}</th>
                    <th className="p-2 py-2.5 text-center font-bold">{lang === 'ar' ? 'الصافي المقبوض' : 'Net Salary'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {printDoc.rows && printDoc.rows.length > 0 ? (
                    printDoc.rows.map(r => (
                      <tr key={r.employeeId}>
                        <td className="p-2 font-extrabold">{r.name}</td>
                        <td className="p-2 text-center font-mono">{r.basicSalary.toLocaleString()}</td>
                        <td className="p-2 text-center font-mono">{(r.netCommission).toLocaleString()}</td>
                        <td className="p-2 text-center font-mono">{(r.overtime + r.incentive1 + r.incentive2).toLocaleString()}</td>
                        <td className="p-2 text-center font-mono text-rose-500">-{r.totalDeductions.toLocaleString()}</td>
                        <td className="p-2 text-center font-mono font-black text-slate-900">{r.netPay.toLocaleString()} EGP</td>
                      </tr>
                    ))
                  ) : (
                    staffList.map((emp, i) => {
                      const base = emp.baseSalary + (emp.allowanceValue || 0);
                      const loan = advanceOrders.find(a => a.empId === emp.id)?.monthlyDeduction || 0;
                      const net = base - loan;
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/50">
                          <td className="p-2 font-extrabold">{lang === 'ar' ? emp.nameAr : emp.name}</td>
                          <td className="p-2 text-center font-mono">{base.toLocaleString()} EGP</td>
                          <td className="p-2 text-center font-mono">16,000 EGP</td>
                          <td className="p-2 text-center font-mono">0 EGP</td>
                          <td className="p-2 text-center font-mono text-rose-500">-{loan.toLocaleString()} EGP</td>
                          <td className="p-2 text-center font-mono font-black text-slate-900">{net.toLocaleString()} EGP</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Total Summary Footer */}
            <div className="border-t-2 border-slate-900 pt-4 flex justify-between items-center bg-slate-50 p-4 rounded-xl font-black text-slate-900">
              <span>{lang === 'ar' ? 'إجمالي رواتب الكشف المعتمده:' : 'Grand Certified Total Sum:'}</span>
              <span className="text-lg font-mono underline decoration-double">
                {printDoc.totalSum ? printDoc.totalSum.toLocaleString() : '54,200'} EGP
              </span>
            </div>

            {/* Stamp & signoff rows */}
            <div className="grid grid-cols-2 gap-4 pt-8 text-center text-xs font-bold text-slate-400">
              <div className="space-y-12">
                <span>{lang === 'ar' ? 'توقيع المدير المالي للشركة' : 'Certified Corporate Treasurer Signature'}</span>
                <div className="h-0.5 bg-slate-200 w-32 mx-auto" />
              </div>
              <div className="space-y-12">
                <span>{lang === 'ar' ? 'توقيع واعتماد الإدارة العامة' : 'Senior VP General Manager Assent'}</span>
                <div className="h-0.5 bg-slate-200 w-32 mx-auto" />
              </div>
            </div>

            {/* Immediate window print script option */}
            <div className="pt-4 flex justify-end gap-2" id="print-action-row">
              <button
                onClick={() => {
                  try {
                    window.print();
                  } catch (e) {
                    alert('Use browser print dialog');
                  }
                }}
                className="py-2 px-5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-lg text-xs hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <Printer size={14} />
                <span>{lang === 'ar' ? 'إرسال إلى الطابعة' : 'Print Document Invoice'}</span>
              </button>
            </div>
          </div>
        )}
      </ReusableModal>

    </div>
  );
};
