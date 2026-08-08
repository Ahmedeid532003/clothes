import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Landmark, ClipboardList, Clock, ShieldAlert, BadgePercent, Calendar, 
  Wallet, FileSpreadsheet, Plus, Check, Trash2, Edit2, Upload, DollarSign, 
  HelpCircle, ChevronRight, Calculator, CalendarDays, RefreshCw, Star, 
  AlertCircle, Briefcase, Layers, UserPlus, FileText, FileBarChart2, ArrowUpRight, X, Receipt,
  Eye, Settings, Settings2, GripVertical, Printer, Copy, Download, MessageCircle, Filter, Search, ChevronLeft, Gift, Building2, ChevronDown, LayoutGrid, List,
  ArrowLeft, ArrowRight, Maximize2, Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ApprovedPayrolls } from './payroll/ApprovedPayrolls';
import { ExportDataButton } from './ui/ExportDataButton';

interface EmployeeAllowance {
  id: string;
  nameAr: string;
  nameEn: string;
  amount: number;
}

interface EmployeeExt {
  id: string;
  name: string;
  nameAr: string;
  role: string;
  roleAr: string;
  email: string;
  departmentId: string;
  sectionId: string;
  groupId: string;
  baseSalary: number;
  allowanceValue: number;
  bonusValue: number;
  deductValue: number;
  clockStatus: 'Checked-In' | 'Absent';
  shiftId?: string;
  allowances?: EmployeeAllowance[];

  // Rich professional folder details matching the uploaded screenshots:
  hireDate?: string;             // تاريخ التعيين
  managerEn?: string;            // المدير المباشر En
  managerAr?: string;            // المدير المباشر Ar
  grade?: string;                // درجة الموظف
  costCenterEn?: string;         // مركز التكلفة En
  costCenterAr?: string;         // مركز التكلفة Ar
  workType?: string;             // نوع الدوام (e.g., Full-Time, Part-Time, Remote)
  
  // Bank Details (بيانات البنك)
  bankNameEn?: string;
  bankNameAr?: string;
  bankHolderEn?: string;
  bankHolderAr?: string;
  bankAccountNum?: string;
  bankIban?: string;
  bankSwift?: string;
  bankBranchEn?: string;
  bankBranchAr?: string;

  // Commission Info (بيانات العمولات)
  commType?: string; // Percentage, Fixed, None
  commRate?: number;
  commAmount?: number;
  commMinSales?: number;
  commStartDate?: string;
  commEndDate?: string;

  // Insurance Info (بيانات التأمينات)
  insNumber?: string;
  insSubDate?: string;
  insWage?: number;
  insRateEmp?: number;
  insRateComp?: number;

  // System Usage Info (استخدام النظام)
  isSystemUser?: boolean;
  username?: string;
  password?: string;
  permissionGroup?: string;
  hasSubSafe?: boolean;
  customPermissions?: Record<string, { view: boolean; add: boolean; edit: boolean; export: boolean; delete: boolean }>;
}

interface ShiftPreset {
  id: string;
  nameEn: string;
  nameAr: string;
  periodsCount: number; // 1, 2, or 3
  daysLocked: Record<string, boolean>; // e.g., { sun: false, mon: false, ... }
  hours: Record<string, { p1In: string, p1Out: string, p2In: string, p2Out: string, p3In: string, p3Out: string }>;
}

interface Department {
  id: string;
  nameEn: string;
  nameAr: string;
  managerEn: string;
  managerAr: string;
}

interface Section {
  id: string;
  deptId: string;
  nameEn: string;
  nameAr: string;
}

interface JobTitle {
  id: string;
  titleEn: string;
  titleAr: string;
  grade: string;
}

interface EmployeeGroup {
  id: string;
  nameEn: string;
  nameAr: string;
  color: string;
}

export const EmployeesTab: React.FC<{ 
  lang: 'en' | 'ar';
  activeSubTab?: string;
  setActiveSubTab?: (id: string) => void;
}> = ({ lang, activeSubTab, setActiveSubTab }) => {
  // Navigation groupings
  const hrMenus = [
    { id: 'org', labelEn: 'Org Hierarchy', labelAr: 'الهيكل الوظيفي', icon: Layers, descEn: 'Depts, Sections, Titles & Groups', descAr: 'الإدارات، الأقسام، المسميات والمجموعات' },
    { id: 'shifts', labelEn: 'Shifts & Hours', labelAr: 'إدارة الورديات', icon: Clock, descEn: 'Multi-period Weekly Rosters & Days Off', descAr: 'تصميم فترات الدوام وتخصيص الإجازات الأسبوعية' },
    { id: 'directory', labelEn: 'Staff Profiles', labelAr: 'بيانات الموظفين', icon: UserPlus, descEn: 'Active Employee Registry & Salaries', descAr: 'ملفات طاقم العمل وتفاصيل الرواتب الأساسية' },
    { id: 'attendance', labelEn: 'Attendance & Imports', labelAr: 'الحضور والبصمه', icon: ClipboardList, descEn: 'Biometric imports & Manual logs', descAr: 'تسجيل الحضور يدوي أو رفع ملفات جهاز البصمة' },
    { id: 'bonus', labelEn: 'Rewards Registration', labelAr: 'تسجيل مكافأت', icon: Gift, descEn: 'Register employee bonuses and rewards', descAr: 'تسجيل وإثبات حوافز ومكافآت الموظفين' },
    { id: 'deduct', labelEn: 'Deductions Registration', labelAr: 'تسجيل خصومات', icon: AlertCircle, descEn: 'Register employee administrative deductions', descAr: 'تسجيل وإثبات خصومات الموظفين وجزاءاتهم' },
    { id: 'commissions', labelEn: 'Employee Commissions', labelAr: 'عمولات الموظفين', icon: BadgePercent, descEn: 'Sales commission percentage registry and report', descAr: 'سجل وأرصدة عمولات الموظفين ونسب المبيعات الفردية' },
    { id: 'payroll', labelEn: 'Payroll & Advances', labelAr: 'كشوف الرواتب', icon: Wallet, descEn: 'Instalments ledger, Salaries slips & Orders', descAr: 'أقساط السلف، كشوفات المرتبات وتصنيفات الدفع' },
    { id: 'disbursals', labelEn: 'Salary Disbursals', labelAr: 'اذون صرف الرواتب', icon: Receipt, descEn: 'Salary disbursement orders & payment vouchers', descAr: 'إصدار وإثبات أذونات صرف رواتب وسلف الموظفين' },
    { id: 'reports', labelEn: 'Staff Reports', labelAr: 'تقارير الموظفين', icon: FileBarChart2, descEn: 'Staff statistics and analytical reports', descAr: 'التقارير والإحصائيات والتحليلات لملفات وحضور الموظفين' },
  ];

  const [activeMenu, setActiveMenu] = useState<string>('org');
  const [maximizedBox, setMaximizedBox] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<'profile' | 'commission' | 'attendance' | 'bonus_deduct' | 'disbursals' | null>(null);

  React.useEffect(() => {
    if (activeSubTab && ['org', 'directory', 'shifts', 'attendance', 'bonus', 'deduct', 'commissions', 'payroll', 'disbursals', 'reports'].includes(activeSubTab)) {
      setActiveMenu(activeSubTab);
      if (activeSubTab === 'reports') {
        setActiveReport(null);
      }
    }
  }, [activeSubTab]);

  const handleMenuChange = (id: string) => {
    setActiveMenu(id);
    if (setActiveSubTab) {
      setActiveSubTab(id);
    }
    if (id === 'reports') {
      setActiveReport(null);
    }
  };

  // Multi-state configuration
  // 1. Organizational Hierachy States
  const [departments, setDepartments] = useState<Department[]>([
    { id: 'D1', nameEn: 'Finance & Treasury', nameAr: 'الإدارة المالية والخزينة', managerEn: 'Hazem Soliman', managerAr: 'حازم سليمان' },
    { id: 'D2', nameEn: 'Sales & Operations', nameAr: 'المبيعات والتشغيل', managerEn: 'Tarek Alaa', managerAr: 'طارق علاء' },
    { id: 'D3', nameEn: 'Human Resources', nameAr: 'الموارد البشرية', managerEn: 'Farida Kamel', managerAr: 'فريدة كامل' },
  ]);
  const [sections, setSections] = useState<Section[]>([
    { id: 'S1', deptId: 'D1', nameEn: 'Main Cash Desk', nameAr: 'الخزينة الرئيسية' },
    { id: 'S2', deptId: 'D2', nameEn: 'Retail Branches', nameAr: 'فروع التجزئة والأكشاك' },
    { id: 'S3', deptId: 'D2', nameEn: 'Inventory Logistics', nameAr: 'اللوجستيات والمخازن' },
  ]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([
    { id: 'JT1', titleEn: 'Branch Manager', titleAr: 'مدير فرع', grade: 'A' },
    { id: 'JT2', titleEn: 'Cashier Clerk', titleAr: 'أمين خزنة / كاشير', grade: 'B' },
    { id: 'JT3', titleEn: 'Store Keeper', titleAr: 'أمين مستودع', grade: 'B' },
    { id: 'JT4', titleEn: 'HR Consultant', titleAr: 'أخصائي موارد بشرية', grade: 'A' },
  ]);
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeGroup[]>([
    { id: 'G1', nameEn: 'HQ Staff', nameAr: 'موظفي الإدارة العامة', color: 'bg-blue-500' },
    { id: 'G2', nameEn: 'Frontline Cashiers', nameAr: 'كاشيري الفروع النشطة', color: 'bg-orange-500' },
    { id: 'G3', nameEn: 'Logistics Ward', nameAr: 'فريق مستودعات الشحن', color: 'bg-violet-500' },
  ]);

  // Organizational Hierarchy Search States
  const [searchDept, setSearchDept] = useState('');
  const [searchSection, setSearchSection] = useState('');
  const [searchJobTitle, setSearchJobTitle] = useState('');
  const [searchEmpGroup, setSearchEmpGroup] = useState('');
  const [searchFinItem, setSearchFinItem] = useState('');
  const [searchHoliday, setSearchHoliday] = useState('');

  // 2. Staff Profiles State with detailed mock values to populate the professional profile tabs
  const [staff, setStaff] = useState<EmployeeExt[]>([
    { 
      id: 'EMP1', 
      name: 'Ahmed Mohamed Ali', 
      nameAr: 'أحمد محمد علي', 
      role: 'HQ Finance Manager', 
      roleAr: 'مدير مالية الإدارة العامة', 
      email: 'ahmed.ali@ma7aly.com', 
      departmentId: 'D1', 
      sectionId: 'S1', 
      groupId: 'G1', 
      baseSalary: 12500, 
      allowanceValue: 1500, 
      allowances: [
        { id: 'al1', nameAr: 'بدل انتقال ومواصلات ومبيت خارجي', nameEn: 'Transit & accommodation allowances', amount: 1000 },
        { id: 'al2', nameAr: 'بدل هاتف محمول مخصص', nameEn: 'Custom mobile and cellular allowance', amount: 500 }
      ],
      bonusValue: 800, 
      deductValue: 0, 
      clockStatus: 'Checked-In', 
      shiftId: 'SFT1',
      hireDate: '2024-05-12',
      managerEn: 'Hazem Soliman',
      managerAr: 'حازم سليمان',
      grade: '05 — مدير مالي',
      costCenterEn: '001 — Finance HQ',
      costCenterAr: '001 — إدارة الحسابات العامة',
      workType: 'Full-Time',
      bankNameEn: 'CIB Bank Egypt',
      bankNameAr: 'البنك التجاري الدولي CIB',
      bankHolderEn: 'Ahmed Mohamed Ali',
      bankHolderAr: 'أحمد محمد علي',
      bankAccountNum: '100045678912',
      bankIban: 'EG12000201000456789120001',
      bankSwift: 'CIBEEGXX',
      bankBranchEn: 'Mohandessin Branch',
      bankBranchAr: 'فرع المهندسين',
      commType: 'Percentage',
      commRate: 2.5,
      commAmount: 3500,
      commMinSales: 100000,
      commStartDate: '2026-01-01',
      commEndDate: '2026-12-31',
      insNumber: '32456711',
      insSubDate: '2024-05-15',
      insWage: 12000,
      insRateEmp: 11,
      insRateComp: 18.75
    },
    { 
      id: 'EMP2', 
      name: 'Sara Mahmoud', 
      nameAr: 'سارة محمود', 
      role: 'Chief Treasurer', 
      roleAr: 'أمين الخزينة الرئيسية', 
      email: 'sara.m@ma7aly.com', 
      departmentId: 'D1', 
      sectionId: 'S1', 
      groupId: 'G1', 
      baseSalary: 8500, 
      allowanceValue: 900, 
      allowances: [
        { id: 'al1', nameAr: 'بدل إعانة عائلية إضافية', nameEn: 'Family support allowance', amount: 600 },
        { id: 'al2', nameAr: 'بدل مراجع ومراجعة عهود', nameEn: 'Auditing duty and treasury allowance', amount: 300 }
      ],
      bonusValue: 200, 
      deductValue: 400, 
      clockStatus: 'Absent', 
      shiftId: 'SFT1',
      hireDate: '2025-02-18',
      managerEn: 'Hazem Soliman',
      managerAr: 'حازم سليمان',
      grade: '04 — رئيس خزينة',
      costCenterEn: '001 — Treasury Desk',
      costCenterAr: '001 — الخزينة الرئيسية والعهود',
      workType: 'Full-Time',
      bankNameEn: 'National Bank of Egypt',
      bankNameAr: 'البنك الأهلي المصري',
      bankHolderEn: 'Sara Mahmoud Soliman',
      bankHolderAr: 'سارة محمود سليمان',
      bankAccountNum: '500034567812',
      bankIban: 'EG89000301000345678120002',
      bankSwift: 'NBEGEGXX',
      bankBranchEn: 'Doha Street Branch',
      bankBranchAr: 'فرع شارع أحمد عرابي',
      commType: 'None',
      commRate: 0,
      commAmount: 0,
      commMinSales: 0,
      commStartDate: '',
      commEndDate: '',
      insNumber: '54129845',
      insSubDate: '2025-03-01',
      insWage: 8000,
      insRateEmp: 11,
      insRateComp: 18.75
    },
    { 
      id: 'EMP3', 
      name: 'Sameh Raafat', 
      nameAr: 'سامح رأفت', 
      role: 'Branch Lead Cashier', 
      roleAr: 'رئيس كاشير فرع', 
      email: 'sameh.r@ma7aly.com', 
      departmentId: 'D2', 
      sectionId: 'S2', 
      groupId: 'G2', 
      baseSalary: 6200, 
      allowanceValue: 500, 
      allowances: [
        { id: 'al1', nameAr: 'بدل وجبة عمل يومية', nameEn: 'Daily meal allowance', amount: 500 }
      ],
      bonusValue: 1200, 
      deductValue: 150, 
      clockStatus: 'Checked-In', 
      shiftId: 'SFT2',
      hireDate: '2025-06-01',
      managerEn: 'Tarek Alaa',
      managerAr: 'طارق علاء',
      grade: '03 — كاشير رئيسي فرع',
      costCenterEn: '003 — Cairo Branches',
      costCenterAr: '003 — فروع القاهرة والمبيعات',
      workType: 'Full-Time',
      bankNameEn: 'Banque Misr',
      bankNameAr: 'بنك مصر',
      bankHolderEn: 'Sameh Raafat Aly',
      bankHolderAr: 'سامح رأفت علي',
      bankAccountNum: '200010987654',
      bankIban: 'EG45000401000109876540003',
      bankSwift: 'BMISGEGXX',
      bankBranchEn: 'Nasr City Branch',
      bankBranchAr: 'فرع مدينة نصر',
      commType: 'Fixed',
      commRate: 0,
      commAmount: 1500,
      commMinSales: 25000,
      commStartDate: '2026-03-01',
      commEndDate: '2026-09-30',
      insNumber: '65432101',
      insSubDate: '2025-06-15',
      insWage: 5800,
      insRateEmp: 11,
      insRateComp: 18.75
    },
    { 
      id: 'EMP4', 
      name: 'Mona Ahmed', 
      nameAr: 'منى أحمد', 
      role: 'Inventory Officer', 
      roleAr: 'مسؤول مراجعة مخزن', 
      email: 'mona.a@ma7aly.com', 
      departmentId: 'D2', 
      sectionId: 'S3', 
      groupId: 'G3', 
      baseSalary: 5800, 
      allowanceValue: 400, 
      allowances: [
        { id: 'al1', nameAr: 'بدل مبيت وساعات إضافية', nameEn: 'Overtime and overnight allowance', amount: 400 }
      ],
      bonusValue: 300, 
      deductValue: 0, 
      clockStatus: 'Checked-In', 
      shiftId: 'SFT3',
      hireDate: '2025-09-10',
      managerEn: 'Tarek Alaa',
      managerAr: 'طارق علاء',
      grade: '03 — مراجع مخازن',
      costCenterEn: '004 — Central Logistics',
      costCenterAr: '004 — اللوجستيات والمخزن المركزي',
      workType: 'Full-Time',
      bankNameEn: 'QNB AHLI',
      bankNameAr: 'بنك قطري الوطني الأهلي QNB',
      bankHolderEn: 'Mona Ahmed Hassan',
      bankHolderAr: 'منى أحمد حسن',
      bankAccountNum: '400055123456',
      bankIban: 'EG7000050100040005512345601',
      bankSwift: 'MSAREGXX',
      bankBranchEn: 'Giza Branch',
      bankBranchAr: 'فرع الجيزة الرئيسي',
      commType: 'None',
      commRate: 0,
      commAmount: 0,
      commMinSales: 0,
      commStartDate: '',
      commEndDate: '',
      insNumber: '11223344',
      insSubDate: '2025-10-01',
      insWage: 5400,
      insRateEmp: 11,
      insRateComp: 18.75
    },
    { 
      id: 'EMP5', 
      name: 'Kamel Youssef', 
      nameAr: 'كامل يوسف', 
      role: 'Regional Auditor', 
      roleAr: 'مراجع إقليمي', 
      email: 'kamel.y@ma7aly.com', 
      departmentId: 'D1', 
      sectionId: 'S1', 
      groupId: 'G1', 
      baseSalary: 9500, 
      allowanceValue: 800, 
      allowances: [{ id: 'al5', nameAr: 'بدل فحص ومراجعة ميدانية', nameEn: 'Field auditing allowance', amount: 800 }],
      bonusValue: 400, 
      deductValue: 0, 
      clockStatus: 'Checked-In', 
      shiftId: 'SFT1',
      hireDate: '2024-08-15',
      managerEn: 'Ahmed Mohamed Ali',
      managerAr: 'أحمد محمد علي',
      grade: '04 — مراجع مالي أول',
      costCenterEn: '001 — Finance HQ',
      costCenterAr: '001 — إدارة الحسابات العامة',
      workType: 'Full-Time',
      bankNameEn: 'CIB Bank Egypt',
      bankNameAr: 'البنك التجاري الدولي CIB',
      bankHolderEn: 'Kamel Youssef',
      bankHolderAr: 'كامل يوسف سليمان',
      bankAccountNum: '100067895412',
      bankIban: 'EG12000201000678954120005',
      bankSwift: 'CIBEEGXX',
      bankBranchEn: 'Mohandessin Branch',
      bankBranchAr: 'فرع المهندسين',
      commType: 'None',
      commRate: 0,
      commAmount: 0,
      commMinSales: 0,
      commStartDate: '',
      commEndDate: '',
      insNumber: '32145698',
      insSubDate: '2024-08-20',
      insWage: 9000,
      insRateEmp: 11,
      insRateComp: 18.75
    },
    { 
      id: 'EMP6', 
      name: 'Fatma El-Sayed', 
      nameAr: 'فاطمة السيد', 
      role: 'Store Associate', 
      roleAr: 'أخصائي مبيعات فرع', 
      email: 'fatma.s@ma7aly.com', 
      departmentId: 'D2', 
      sectionId: 'S2', 
      groupId: 'G2', 
      baseSalary: 4500, 
      allowanceValue: 300, 
      allowances: [{ id: 'al6', nameAr: 'بدل تمثيل ومظهر فرع', nameEn: 'Appearance & representation allowance', amount: 300 }],
      bonusValue: 500, 
      deductValue: 100, 
      clockStatus: 'Checked-In', 
      shiftId: 'SFT2',
      hireDate: '2025-11-01',
      managerEn: 'Sameh Raafat',
      managerAr: 'سامح رأفت',
      grade: '02 — منسق مبيعات ومعرض',
      costCenterEn: '003 — Cairo Branches',
      costCenterAr: '003 — فروع القاهرة والمبيعات',
      workType: 'Full-Time',
      bankNameEn: 'Banque Misr',
      bankNameAr: 'بنك مصر',
      bankHolderEn: 'Fatma El-Sayed Aly',
      bankHolderAr: 'فاطمة السيد علي',
      bankAccountNum: '200010984321',
      bankIban: 'EG45000401000109843210006',
      bankSwift: 'BMISGEGXX',
      bankBranchEn: 'Zamalek Branch',
      bankBranchAr: 'فرع الزمالك',
      commType: 'Percentage',
      commRate: 1.2,
      commAmount: 1200,
      commMinSales: 15000,
      commStartDate: '2026-01-01',
      commEndDate: '2026-12-31',
      insNumber: '75412985',
      insSubDate: '2025-11-05',
      insWage: 4200,
      insRateEmp: 11,
      insRateComp: 18.75
    },
    { 
      id: 'EMP7', 
      name: 'Adel Ibrahim', 
      nameAr: 'عادل إبراهيم', 
      role: 'Security Lead', 
      roleAr: 'مشرف أمن عام', 
      email: 'adel.i@ma7aly.com', 
      departmentId: 'D2', 
      sectionId: 'S2', 
      groupId: 'G2', 
      baseSalary: 5000, 
      allowanceValue: 350, 
      allowances: [{ id: 'al7', nameAr: 'بدل خطورة ومناوبة حراسة', nameEn: 'Risk and guard shifts allowance', amount: 350 }],
      bonusValue: 150, 
      deductValue: 0, 
      clockStatus: 'Checked-In', 
      shiftId: 'SFT2',
      hireDate: '2025-01-10',
      managerEn: 'Tarek Alaa',
      managerAr: 'طارق علاء',
      grade: '02 — مشرف أمن الفروع',
      costCenterEn: '003 — Cairo Branches',
      costCenterAr: '003 — فروع القاهرة والمبيعات',
      workType: 'Full-Time',
      bankNameEn: 'National Bank of Egypt',
      bankNameAr: 'البنك الأهلي المصري',
      bankHolderEn: 'Adel Ibrahim Kamel',
      bankHolderAr: 'عادل إبراهيم كامل',
      bankAccountNum: '500034561298',
      bankIban: 'EG89000301000345612980007',
      bankSwift: 'NBEGEGXX',
      bankBranchEn: 'Maadi Branch',
      bankBranchAr: 'فرع المعادي الدائري',
      commType: 'None',
      commRate: 0,
      commAmount: 0,
      commMinSales: 0,
      commStartDate: '',
      commEndDate: '',
      insNumber: '95421312',
      insSubDate: '2025-01-15',
      insWage: 4800,
      insRateEmp: 11,
      insRateComp: 18.75
    },
    { 
      id: 'EMP8', 
      name: 'Yasmin Aly', 
      nameAr: 'ياسمين علي', 
      role: 'HR Generalist', 
      roleAr: 'أخصائي موارد بشرية', 
      email: 'yasmin.a@ma7aly.com', 
      departmentId: 'D1', 
      sectionId: 'S1', 
      groupId: 'G1', 
      baseSalary: 7200, 
      allowanceValue: 500, 
      allowances: [{ id: 'al8', nameAr: 'بدل تحديث وتطوير مهارات', nameEn: 'Skill development allowance', amount: 500 }],
      bonusValue: 300, 
      deductValue: 0, 
      clockStatus: 'Checked-In', 
      shiftId: 'SFT1',
      hireDate: '2025-03-01',
      managerEn: 'Ahmed Mohamed Ali',
      managerAr: 'أحمد محمد علي',
      grade: '03 — أخصائي تنمية بشرية',
      costCenterEn: '001 — Finance HQ',
      costCenterAr: '001 — إدارة الحسابات العامة',
      workType: 'Full-Time',
      bankNameEn: 'QNB AHLI',
      bankNameAr: 'بنك قطري الوطني الأهلي QNB',
      bankHolderEn: 'Yasmin Aly',
      bankHolderAr: 'ياسمين علي حسن',
      bankAccountNum: '400055127811',
      bankIban: 'EG7000050100040005512781108',
      bankSwift: 'MSAREGXX',
      bankBranchEn: 'Heliopolis Branch',
      bankBranchAr: 'فرع مصر الجديدة',
      commType: 'None',
      commRate: 0,
      commAmount: 0,
      commMinSales: 0,
      commStartDate: '',
      commEndDate: '',
      insNumber: '12458963',
      insSubDate: '2025-03-05',
      insWage: 6900,
      insRateEmp: 11,
      insRateComp: 18.75
    },
    { 
      id: 'EMP9', 
      name: 'Mohamed Farouk', 
      nameAr: 'محمد فاروق', 
      role: 'Senior Sales Specialist', 
      roleAr: 'مندوب مبيعات كبار العملاء', 
      email: 'mohamed.f@ma7aly.com', 
      departmentId: 'D2', 
      sectionId: 'S2', 
      groupId: 'G2', 
      baseSalary: 5500, 
      allowanceValue: 600, 
      allowances: [{ id: 'al9', nameAr: 'بدل وقود وانتقالات حقلية', nameEn: 'Fuel and transport allowance', amount: 600 }],
      bonusValue: 2000, 
      deductValue: 0, 
      clockStatus: 'Checked-In', 
      shiftId: 'SFT2',
      hireDate: '2024-10-10',
      managerEn: 'Sameh Raafat',
      managerAr: 'سامح رأفت',
      grade: '03 — مسؤول تسويق ومبيعات أول',
      costCenterEn: '003 — Cairo Branches',
      costCenterAr: '003 — فروع القاهرة والمبيعات',
      workType: 'Full-Time',
      bankNameEn: 'Banque Misr',
      bankNameAr: 'بنك مصر',
      bankHolderEn: 'Mohamed Farouk',
      bankHolderAr: 'محمد فاروق محمد',
      bankAccountNum: '200010985544',
      bankIban: 'EG45000401000109855440009',
      bankSwift: 'BMISGEGXX',
      bankBranchEn: 'Maadi Branch',
      bankBranchAr: 'فرع المعادي الرئيسي',
      commType: 'Percentage',
      commRate: 3.0,
      commAmount: 4800,
      commMinSales: 80000,
      commStartDate: '2026-01-01',
      commEndDate: '2026-12-31',
      insNumber: '25419832',
      insSubDate: '2024-10-15',
      insWage: 5200,
      insRateEmp: 11,
      insRateComp: 18.75
    },
    { 
      id: 'EMP10', 
      name: 'Nourhan Gamal', 
      nameAr: 'نورهان جمال', 
      role: 'Operations Coordinator', 
      roleAr: 'منسق عمليات تشغيل', 
      email: 'nourhan.g@ma7aly.com', 
      departmentId: 'D1', 
      sectionId: 'S1', 
      groupId: 'G1', 
      baseSalary: 6000, 
      allowanceValue: 450, 
      allowances: [{ id: 'al10', nameAr: 'بدل اتصالات وتنسيق عن بعد', nameEn: 'Coordination allowance', amount: 450 }],
      bonusValue: 500, 
      deductValue: 0, 
      clockStatus: 'Checked-In', 
      shiftId: 'SFT1',
      hireDate: '2025-05-15',
      managerEn: 'Ahmed Mohamed Ali',
      managerAr: 'أحمد محمد علي',
      grade: '02 — منسق تجاري',
      costCenterEn: '001 — Finance HQ',
      costCenterAr: '001 — إدارة الحسابات العامة',
      workType: 'Full-Time',
      bankNameEn: 'CIB Bank Egypt',
      bankNameAr: 'البنك التجاري الدولي CIB',
      bankHolderEn: 'Nourhan Gamal',
      bankHolderAr: 'نورهان جمال السيد',
      bankAccountNum: '100045611299',
      bankIban: 'EG12000201000456112990010',
      bankSwift: 'CIBEEGXX',
      bankBranchEn: 'Pyramids Branch',
      bankBranchAr: 'فرع الجيزة والهرم',
      commType: 'None',
      commRate: 0,
      commAmount: 0,
      commMinSales: 0,
      commStartDate: '',
      commEndDate: '',
      insNumber: '44556633',
      insSubDate: '2025-05-20',
      insWage: 5600,
      insRateEmp: 11,
      insRateComp: 18.75
    },
    { 
      id: 'EMP11', 
      name: 'Mostafa Shaaban', 
      nameAr: 'مصطفى شعبان', 
      role: 'Delivery Team Leader', 
      roleAr: 'قائد فريق التوصيل والتسليم', 
      email: 'mostafa.s@ma7aly.com', 
      departmentId: 'D2', 
      sectionId: 'S3', 
      groupId: 'G3', 
      baseSalary: 5500, 
      allowanceValue: 700, 
      allowances: [{ id: 'al11', nameAr: 'بدل انتقال ومستهلكات حركة', nameEn: 'Vehicles maintenance allowance', amount: 700 }],
      bonusValue: 800, 
      deductValue: 150, 
      clockStatus: 'Checked-In', 
      shiftId: 'SFT3',
      hireDate: '2025-03-12',
      managerEn: 'Mona Ahmed',
      managerAr: 'منى أحمد',
      grade: '03 — مشرف حركة اللوجستيات',
      costCenterEn: '004 — Central Logistics',
      costCenterAr: '004 — اللوجستيات والمخزن المركزي',
      workType: 'Full-Time',
      bankNameEn: 'Banque Misr',
      bankNameAr: 'بنك مصر',
      bankHolderEn: 'Mostafa Shaaban El-Sawy',
      bankHolderAr: 'مصطفى شعبان الصاوي',
      bankAccountNum: '200010912344',
      bankIban: 'EG45000401000109123440011',
      bankSwift: 'BMISGEGXX',
      bankBranchEn: 'Feisal Branch',
      bankBranchAr: 'فرع فيصل الرئيسي',
      commType: 'Fixed',
      commRate: 0,
      commAmount: 1000,
      commMinSales: 30000,
      commStartDate: '2026-02-01',
      commEndDate: '2026-08-31',
      insNumber: '66778899',
      insSubDate: '2025-03-15',
      insWage: 5000,
      insRateEmp: 11,
      insRateComp: 18.75
    },
    { 
      id: 'EMP12', 
      name: 'Aya Mansour', 
      nameAr: 'آية منصور', 
      role: 'Senior Cashier', 
      roleAr: 'كاشير ممتاز فرع', 
      email: 'aya.m@ma7aly.com', 
      departmentId: 'D2', 
      sectionId: 'S2', 
      groupId: 'G2', 
      baseSalary: 4800, 
      allowanceValue: 400, 
      allowances: [{ id: 'al12', nameAr: 'بدل عجز خزينة وتمثيل', nameEn: 'Cash deficit allowance', amount: 400 }],
      bonusValue: 450, 
      deductValue: 0, 
      clockStatus: 'Checked-In', 
      shiftId: 'SFT2',
      hireDate: '2025-07-15',
      managerEn: 'Sameh Raafat',
      managerAr: 'سامح رأفت',
      grade: '02 — صراف فرع ثان',
      costCenterEn: '003 — Cairo Branches',
      costCenterAr: '003 — فروع القاهرة والمبيعات',
      workType: 'Full-Time',
      bankNameEn: 'National Bank of Egypt',
      bankNameAr: 'البنك الأهلي المصري',
      bankHolderEn: 'Aya Mansour Abas',
      bankHolderAr: 'آية منصور عباس',
      bankAccountNum: '500034560199',
      bankIban: 'EG89000301000345601990012',
      bankSwift: 'NBEGEGXX',
      bankBranchEn: 'El Dokki Branch',
      bankBranchAr: 'فرع الدقي',
      commType: 'None',
      commRate: 0,
      commAmount: 0,
      commMinSales: 0,
      commStartDate: '',
      commEndDate: '',
      insNumber: '33441112',
      insSubDate: '2025-07-20',
      insWage: 4500,
      insRateEmp: 11,
      insRateComp: 18.75
    },
    { 
      id: 'EMP13', 
      name: 'Sherif Nour', 
      nameAr: 'شريف نور', 
      role: 'Legal Advisor', 
      roleAr: 'مستشار قانوني عقود العمل', 
      email: 'sherif.n@ma7aly.com', 
      departmentId: 'D1', 
      sectionId: 'S1', 
      groupId: 'G1', 
      baseSalary: 11000, 
      allowanceValue: 1200, 
      allowances: [{ id: 'al13', nameAr: 'بدل مستشار وتمثيل خارجي للشركة', nameEn: 'Institutional legal representation', amount: 1200 }],
      bonusValue: 1000, 
      deductValue: 0, 
      clockStatus: 'Checked-In', 
      shiftId: 'SFT1',
      hireDate: '2024-03-01',
      managerEn: 'Ahmed Mohamed Ali',
      managerAr: 'أحمد محمد علي',
      grade: '05 — مستشار قانوني شؤون الموظفين',
      costCenterEn: '001 — Finance HQ',
      costCenterAr: '001 — إدارة الحسابات العامة',
      workType: 'Full-Time',
      bankNameEn: 'CIB Bank Egypt',
      bankNameAr: 'البنك التجاري الدولي CIB',
      bankHolderEn: 'Sherif Nour El Din',
      bankHolderAr: 'شريف نور الدين علي',
      bankAccountNum: '100045612349',
      bankIban: 'EG12000201000456123490013',
      bankSwift: 'CIBEEGXX',
      bankBranchEn: 'Garden City Branch',
      bankBranchAr: 'فرع جاردن سيتي',
      commType: 'None',
      commRate: 0,
      commAmount: 0,
      commMinSales: 0,
      commStartDate: '',
      commEndDate: '',
      insNumber: '99887711',
      insSubDate: '2024-03-05',
      insWage: 10500,
      insRateEmp: 11,
      insRateComp: 18.75
    },
    { 
      id: 'EMP14', 
      name: 'Rania Fouad', 
      nameAr: 'رانيا فؤاد', 
      role: 'Visual Merchandiser', 
      roleAr: 'منسق معروضات وتصاميم فروع', 
      email: 'rania.f@ma7aly.com', 
      departmentId: 'D2', 
      sectionId: 'S2', 
      groupId: 'G2', 
      baseSalary: 6700, 
      allowanceValue: 500, 
      allowances: [{ id: 'al14', nameAr: 'بدل تصميم وزيارات ميدانية', nameEn: 'Design visitation allowance', amount: 500 }],
      bonusValue: 600, 
      deductValue: 0, 
      clockStatus: 'Checked-In', 
      shiftId: 'SFT2',
      hireDate: '2025-04-01',
      managerEn: 'Sameh Raafat',
      managerAr: 'سامح رأفت',
      grade: '03 — مصمم فروع منسق علامة تجارية',
      costCenterEn: '003 — Cairo Branches',
      costCenterAr: '003 — فروع القاهرة والمبيعات',
      workType: 'Full-Time',
      bankNameEn: 'QNB AHLI',
      bankNameAr: 'بنك قطري الوطني الأهلي QNB',
      bankHolderEn: 'Rania Fouad',
      bankHolderAr: 'رانيا فؤاد محمود',
      bankAccountNum: '400055123999',
      bankIban: 'EG7000050100040005512399914',
      bankSwift: 'MSAREGXX',
      bankBranchEn: 'Downtown Branch',
      bankBranchAr: 'فرع وسط البلد',
      commType: 'None',
      commRate: 0,
      commAmount: 0,
      commMinSales: 0,
      commStartDate: '',
      commEndDate: '',
      insNumber: '55667711',
      insSubDate: '2025-04-05',
      insWage: 6300,
      insRateEmp: 11,
      insRateComp: 18.75
    },
    { 
      id: 'EMP15', 
      name: 'Youssef Khalil', 
      nameAr: 'يوسف خليل', 
      role: 'Warehouse Attendant', 
      roleAr: 'موظف تجهيز واستلام مخازن', 
      email: 'youssef.k@ma7aly.com', 
      departmentId: 'D2', 
      sectionId: 'S3', 
      groupId: 'G3', 
      baseSalary: 4200, 
      allowanceValue: 400, 
      allowances: [{ id: 'al15', nameAr: 'بدل مجهود عمل بدني وتحميل', nameEn: 'Physical logistics support allowance', amount: 400 }],
      bonusValue: 300, 
      deductValue: 50, 
      clockStatus: 'Checked-In', 
      shiftId: 'SFT3',
      hireDate: '2025-08-20',
      managerEn: 'Mona Ahmed',
      managerAr: 'منى أحمد',
      grade: '01 — فني مناولة وتجهيز بضائع',
      costCenterEn: '004 — Central Logistics',
      costCenterAr: '004 — اللوجستيات والمخزن المركزي',
      workType: 'Full-Time',
      bankNameEn: 'Banque Misr',
      bankNameAr: 'بنك مصر',
      bankHolderEn: 'Youssef Khalil Ibrahim',
      bankHolderAr: 'يوسف خليل إبراهيم',
      bankAccountNum: '200010915566',
      bankIban: 'EG45000401000109155660015',
      bankSwift: 'BMISGEGXX',
      bankBranchEn: 'Imbaba Branch',
      bankBranchAr: 'فرع إمبابة',
      commType: 'None',
      commRate: 0,
      commAmount: 0,
      commMinSales: 0,
      commStartDate: '',
      commEndDate: '',
      insNumber: '32158941',
      insSubDate: '2025-08-25',
      insWage: 3900,
      insRateEmp: 11,
      insRateComp: 18.75
    },
    { 
      id: 'EMP16', 
      name: 'Noha Tawfik', 
      nameAr: 'نهى توفيق', 
      role: 'Customer Care Specialist', 
      roleAr: 'أخصائي العناية بالعملاء والدعم', 
      email: 'noha.t@ma7aly.com', 
      departmentId: 'D2', 
      sectionId: 'S2', 
      groupId: 'G2', 
      baseSalary: 4900, 
      allowanceValue: 300, 
      allowances: [{ id: 'al16', nameAr: 'بدل اتصالات وحل شكاوى عملاء', nameEn: 'Telecommunications care allowance', amount: 300 }],
      bonusValue: 500, 
      deductValue: 0, 
      clockStatus: 'Checked-In', 
      shiftId: 'SFT2',
      hireDate: '2025-05-10',
      managerEn: 'Sameh Raafat',
      managerAr: 'سامح رأفت',
      grade: '02 — أخصائي اتصالات دعم',
      costCenterEn: '003 — Cairo Branches',
      costCenterAr: '003 — فروع القاهرة والمبيعات',
      workType: 'Full-Time',
      bankNameEn: 'National Bank of Egypt',
      bankNameAr: 'البنك الأهلي المصري',
      bankHolderEn: 'Noha Tawfik',
      bankHolderAr: 'نهى توفيق عثمان',
      bankAccountNum: '500034561239',
      bankIban: 'EG89000301000345612390016',
      bankSwift: 'NBEGEGXX',
      bankBranchEn: 'Haram Branch',
      bankBranchAr: 'فرع شارع الهرم الرئيسي',
      commType: 'None',
      commRate: 0,
      commAmount: 0,
      commMinSales: 0,
      commStartDate: '',
      commEndDate: '',
      insNumber: '44521321',
      insSubDate: '2025-05-15',
      insWage: 4600,
      insRateEmp: 11,
      insRateComp: 18.75
    },
    { 
      id: 'EMP17', 
      name: 'Khaled Abdelaziz', 
      nameAr: 'خالد عبد العزيز', 
      role: 'Procurement Officer', 
      roleAr: 'مسؤول مشتريات وتوريد', 
      email: 'khaled.a@ma7aly.com', 
      departmentId: 'D1', 
      sectionId: 'S1', 
      groupId: 'G1', 
      baseSalary: 7400, 
      allowanceValue: 550, 
      allowances: [{ id: 'al17', nameAr: 'بدل انتقالات مصانع وموردين وفحص', nameEn: 'Vendors inspection travel allowance', amount: 550 }],
      bonusValue: 400, 
      deductValue: 0, 
      clockStatus: 'Checked-In', 
      shiftId: 'SFT1',
      hireDate: '2025-02-01',
      managerEn: 'Ahmed Mohamed Ali',
      managerAr: 'أحمد محمد علي',
      grade: '03 — أخصائي تعاقدات وتوريد',
      costCenterEn: '001 — Finance HQ',
      costCenterAr: '001 — إدارة الحسابات العامة',
      workType: 'Full-Time',
      bankNameEn: 'CIB Bank Egypt',
      bankNameAr: 'البنك التجاري الدولي CIB',
      bankHolderEn: 'Khaled Abdelaziz',
      bankHolderAr: 'خالد عبد العزيز فراج',
      bankAccountNum: '100045644556',
      bankIban: 'EG12000201000456445560017',
      bankSwift: 'CIBEEGXX',
      bankBranchEn: 'Mohandessin Branch',
      bankBranchAr: 'فرع المهندسين',
      commType: 'None',
      commRate: 0,
      commAmount: 0,
      commMinSales: 0,
      commStartDate: '',
      commEndDate: '',
      insNumber: '12457812',
      insSubDate: '2025-02-05',
      insWage: 7000,
      insRateEmp: 11,
      insRateComp: 18.75
    },
    { 
      id: 'EMP18', 
      name: 'Dina Mourad', 
      nameAr: 'دينا مراد', 
      role: 'Digital Marketing Executive', 
      roleAr: 'أخصائي تسويق رقمي وإعلانات', 
      email: 'dina.m@ma7aly.com', 
      departmentId: 'D1', 
      sectionId: 'S1', 
      groupId: 'G1', 
      baseSalary: 6800, 
      allowanceValue: 450, 
      allowances: [{ id: 'al18', nameAr: 'بدل متابعة حملات تسويقية إلكترونية', nameEn: 'Web Ads optimization allowance', amount: 450 }],
      bonusValue: 300, 
      deductValue: 0, 
      clockStatus: 'Checked-In', 
      shiftId: 'SFT1',
      hireDate: '2025-06-15',
      managerEn: 'Ahmed Mohamed Ali',
      managerAr: 'أحمد محمد علي',
      grade: '03 — أخصائي تسويق وإعلانات',
      costCenterEn: '001 — Finance HQ',
      costCenterAr: '001 — إدارة الحسابات العامة',
      workType: 'Full-Time',
      bankNameEn: 'QNB AHLI',
      bankNameAr: 'بنك قطري الوطني الأهلي QNB',
      bankHolderEn: 'Dina Mourad Soliman',
      bankHolderAr: 'دينا مراد سليمان',
      bankAccountNum: '400055121212',
      bankIban: 'EG7000050100040005512121218',
      bankSwift: 'MSAREGXX',
      bankBranchEn: 'Zamalek Branch',
      bankBranchAr: 'فرع الزمالك الرئيسي',
      commType: 'None',
      commRate: 0,
      commAmount: 0,
      commMinSales: 0,
      commStartDate: '',
      commEndDate: '',
      insNumber: '32145654',
      insSubDate: '2025-06-20',
      insWage: 6400,
      insRateEmp: 11,
      insRateComp: 18.75
    },
    { 
      id: 'EMP19', 
      name: 'Amr Hegazi', 
      nameAr: 'عمرو حجازي', 
      role: 'Senior Data Analyst', 
      roleAr: 'محلل بيانات أول', 
      email: 'amr.h@ma7aly.com', 
      departmentId: 'D1', 
      sectionId: 'S1', 
      groupId: 'G1', 
      baseSalary: 10500, 
      allowanceValue: 1000, 
      allowances: [{ id: 'al19', nameAr: 'بدل تحليلات وبحوث سوق وتقارير', nameEn: 'Analytics visualization allowance', amount: 1000 }],
      bonusValue: 500, 
      deductValue: 0, 
      clockStatus: 'Checked-In', 
      shiftId: 'SFT1',
      hireDate: '2024-11-01',
      managerEn: 'Ahmed Mohamed Ali',
      managerAr: 'أحمد محمد علي',
      grade: '04 — محلل تجاري نظم القرار',
      costCenterEn: '001 — Finance HQ',
      costCenterAr: '001 — إدارة الحسابات العامة',
      workType: 'Full-Time',
      bankNameEn: 'CIB Bank Egypt',
      bankNameAr: 'البنك التجاري الدولي CIB',
      bankHolderEn: 'Amr Hegazi Aly',
      bankHolderAr: 'عمرو حجازي علي',
      bankAccountNum: '100045699887',
      bankIban: 'EG12000201000456998870019',
      bankSwift: 'CIBEEGXX',
      bankBranchEn: 'Mohandessin Branch',
      bankBranchAr: 'فرع المهندسين',
      commType: 'None',
      commRate: 0,
      commAmount: 0,
      commMinSales: 0,
      commStartDate: '',
      commEndDate: '',
      insNumber: '12457896',
      insSubDate: '2024-11-05',
      insWage: 10000,
      insRateEmp: 11,
      insRateComp: 18.75
    },
    { 
      id: 'EMP20', 
      name: 'Farida Selim', 
      nameAr: 'فريدة سليم', 
      role: 'Office Administrator', 
      roleAr: 'سكرتارية وإدارة مكتبية', 
      email: 'farida.s@ma7aly.com', 
      departmentId: 'D1', 
      sectionId: 'S1', 
      groupId: 'G1', 
      baseSalary: 5200, 
      allowanceValue: 300, 
      allowances: [{ id: 'al20', nameAr: 'بدل تأمين وتجهيز مراسلات وضيافة', nameEn: 'Office support logistics allowance', amount: 300 }],
      bonusValue: 400, 
      deductValue: 0, 
      clockStatus: 'Checked-In', 
      shiftId: 'SFT1',
      hireDate: '2025-08-01',
      managerEn: 'Ahmed Mohamed Ali',
      managerAr: 'أحمد محمد علي',
      grade: '02 — سكرتير إدارة عامة',
      costCenterEn: '001 — Finance HQ',
      costCenterAr: '001 — إدارة الحسابات العامة',
      workType: 'Full-Time',
      bankNameEn: 'National Bank of Egypt',
      bankNameAr: 'البنك الأهلي المصري',
      bankHolderEn: 'Farida Selim',
      bankHolderAr: 'فريدة سليم محمود',
      bankAccountNum: '500034567788',
      bankIban: 'EG89000301000345677880020',
      bankSwift: 'NBEGEGXX',
      bankBranchEn: 'Zamalek Branch',
      bankBranchAr: 'فرع الزمالك ش شريف',
      commType: 'None',
      commRate: 0,
      commAmount: 0,
      commMinSales: 0,
      commStartDate: '',
      commEndDate: '',
      insNumber: '85412589',
      insSubDate: '2025-08-05',
      insWage: 4900,
      insRateEmp: 11,
      insRateComp: 18.75
    },
    { 
      id: 'EMP21', 
      name: 'Hassan Roushdy', 
      nameAr: 'حسن رشدي', 
      role: 'Chief IT Support', 
      roleAr: 'مسؤول الدعم الفني وتكنولوجيا المعلومات', 
      email: 'hassan.r@ma7aly.com', 
      departmentId: 'D1', 
      sectionId: 'S1', 
      groupId: 'G1', 
      baseSalary: 7300, 
      allowanceValue: 500, 
      allowances: [{ id: 'al21', nameAr: 'بدل صيانة دورية ونظم الحواسب', nameEn: 'Hardware maintenance allowance', amount: 500 }],
      bonusValue: 450, 
      deductValue: 0, 
      clockStatus: 'Checked-In', 
      shiftId: 'SFT1',
      hireDate: '2025-04-10',
      managerEn: 'Ahmed Mohamed Ali',
      managerAr: 'أحمد محمد علي',
      grade: '03 — أخصائي دعم فني نظم معلومات',
      costCenterEn: '001 — Finance HQ',
      costCenterAr: '001 — إدارة الحسابات العامة',
      workType: 'Full-Time',
      bankNameEn: 'CIB Bank Egypt',
      bankNameAr: 'البنك التجاري الدولي CIB',
      bankHolderEn: 'Hassan Roushdy',
      bankHolderAr: 'حسن رشدي حنفي',
      bankAccountNum: '100045611322',
      bankIban: 'EG12000201000456113220021',
      bankSwift: 'CIBEEGXX',
      bankBranchEn: 'Giza Branch',
      bankBranchAr: 'فرع الجيزة الرئيسي',
      commType: 'None',
      commRate: 0,
      commAmount: 0,
      commMinSales: 0,
      commStartDate: '',
      commEndDate: '',
      insNumber: '41258796',
      insSubDate: '2025-04-15',
      insWage: 6900,
      insRateEmp: 11,
      insRateComp: 18.75
    },
    { 
      id: 'EMP22', 
      name: 'Hana El-Gamil', 
      nameAr: 'هناء الجميل', 
      role: 'Payroll Officer', 
      roleAr: 'مسؤول الرواتب والمزايا', 
      email: 'hana.g@ma7aly.com', 
      departmentId: 'D1', 
      sectionId: 'S1', 
      groupId: 'G1', 
      baseSalary: 7100, 
      allowanceValue: 400, 
      allowances: [{ id: 'al22', nameAr: 'بدل إعداد وبناء دفاتر الرواتب والضرائب', nameEn: 'Payroll preparation allowance', amount: 400 }],
      bonusValue: 350, 
      deductValue: 0, 
      clockStatus: 'Checked-In', 
      shiftId: 'SFT1',
      hireDate: '2025-05-01',
      managerEn: 'Ahmed Mohamed Ali',
      managerAr: 'أحمد محمد علي',
      grade: '03 — أخصائي حسابات رواتب موظفين',
      costCenterEn: '001 — Finance HQ',
      costCenterAr: '001 — إدارة الحسابات العامة',
      workType: 'Full-Time',
      bankNameEn: 'Banque Misr',
      bankNameAr: 'بنك مصر',
      bankHolderEn: 'Hana El-Gamil',
      bankHolderAr: 'هناء الجميل حسن',
      bankAccountNum: '200010915432',
      bankIban: 'EG45000401000109154320022',
      bankSwift: 'BMISGEGXX',
      bankBranchEn: 'Nasr City Branch',
      bankBranchAr: 'فرع عباس العقاد',
      commType: 'None',
      commRate: 0,
      commAmount: 0,
      commMinSales: 0,
      commStartDate: '',
      commEndDate: '',
      insNumber: '65478912',
      insSubDate: '2025-05-05',
      insWage: 6700,
      insRateEmp: 11,
      insRateComp: 18.75
    },
    { 
      id: 'EMP23', 
      name: 'Mahmoud Saad', 
      nameAr: 'محمود سعد', 
      role: 'Fleet Supervisor', 
      roleAr: 'مشرف حركة ونقل مركبات', 
      email: 'mahmoud.s@ma7aly.com', 
      departmentId: 'D2', 
      sectionId: 'S3', 
      groupId: 'G3', 
      baseSalary: 5600, 
      allowanceValue: 600, 
      allowances: [{ id: 'al23', nameAr: 'بدل تشغيل وصيانة أسطول المركبات', nameEn: 'Fleet operations support allowance', amount: 600 }],
      bonusValue: 400, 
      deductValue: 0, 
      clockStatus: 'Checked-In', 
      shiftId: 'SFT3',
      hireDate: '2025-06-01',
      managerEn: 'Mona Ahmed',
      managerAr: 'منى أحمد',
      grade: '02 — مشرف تشغيل نقليات بضائع',
      costCenterEn: '004 — Central Logistics',
      costCenterAr: '004 — اللوجستيات والمخزن المركزي',
      workType: 'Full-Time',
      bankNameEn: 'National Bank of Egypt',
      bankNameAr: 'البنك الأهلي المصري',
      bankHolderEn: 'Mahmoud Saad Abas',
      bankHolderAr: 'محمود سعد عباس',
      bankAccountNum: '500034569871',
      bankIban: 'EG89000301000345698710023',
      bankSwift: 'NBEGEGXX',
      bankBranchEn: 'Ain Shams Branch',
      bankBranchAr: 'فرع عين شمس',
      commType: 'None',
      commRate: 0,
      commAmount: 0,
      commMinSales: 0,
      commStartDate: '',
      commEndDate: '',
      insNumber: '32145892',
      insSubDate: '2025-06-05',
      insWage: 5200,
      insRateEmp: 11,
      insRateComp: 18.75
    },
    { 
      id: 'EMP24', 
      name: 'Azza Hegazi', 
      nameAr: 'عزة حجازي', 
      role: 'Senior Receptionist', 
      roleAr: 'موظف استقبال أول الإدارة', 
      email: 'azza.h@ma7aly.com', 
      departmentId: 'D1', 
      sectionId: 'S1', 
      groupId: 'G1', 
      baseSalary: 4700, 
      allowanceValue: 250, 
      allowances: [{ id: 'al24', nameAr: 'بدل مظهر واستقبال زوار الإدارة', nameEn: 'Receptionist desk client representation', amount: 250 }],
      bonusValue: 300, 
      deductValue: 0, 
      clockStatus: 'Checked-In', 
      shiftId: 'SFT1',
      hireDate: '2025-09-01',
      managerEn: 'Ahmed Mohamed Ali',
      managerAr: 'أحمد محمد علي',
      grade: '01 — كاتب وموظف استقبال',
      costCenterEn: '001 — Finance HQ',
      costCenterAr: '001 — إدارة الحسابات العامة',
      workType: 'Full-Time',
      bankNameEn: 'Banque Misr',
      bankNameAr: 'بنك مصر',
      bankHolderEn: 'Azza Hegazi Ali',
      bankHolderAr: 'عزة حجازي علي',
      bankAccountNum: '200010915671',
      bankIban: 'EG45000401000109156710024',
      bankSwift: 'BMISGEGXX',
      bankBranchEn: 'Downtown Giza Branch',
      bankBranchAr: 'فرع الجيزة القديم',
      commType: 'None',
      commRate: 0,
      commAmount: 0,
      commMinSales: 0,
      commStartDate: '',
      commEndDate: '',
      insNumber: '25418963',
      insSubDate: '2025-09-05',
      insWage: 4400,
      insRateEmp: 11,
      insRateComp: 18.75
    },
  ]);

  // Pagination states matching system requirement (default to 5 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Manual Attendance States
  const [isManualAttendanceOpen, setIsManualAttendanceOpen] = useState(false);
  const [manualAttendanceType, setManualAttendanceType] = useState<'in' | 'out'>('in');
  const [manualAttendanceEmpId, setManualAttendanceEmpId] = useState('');
  const [manualAttendanceTime, setManualAttendanceTime] = useState('09:00');

  // Column visibility for interactive table & Kanban boards (Choose Columns)
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [attendanceColumnSettingsOpen, setAttendanceColumnSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [tempVisibleColumns, setTempVisibleColumns] = useState<Record<string, boolean>>({
    name: true,
    role: true,
    department: false,
    branch: false,
    salary: true,
    hireDate: false,
    status: true,
  });
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    name: true,
    role: true,
    department: false,
    branch: false,
    salary: true,
    hireDate: false,
    status: true,
  });

  const [tempAttendanceVisibleColumns, setTempAttendanceVisibleColumns] = useState<Record<string, boolean>>({
    period1: true,
    period2: true,
    period3: true,
    deviceType: true,
    actions: true,
  });
  const [attendanceVisibleColumns, setAttendanceVisibleColumns] = useState<Record<string, boolean>>({
    period1: true,
    period2: true,
    period3: true,
    deviceType: true,
    actions: true,
  });

  const [comColumnSettingsOpen, setComColumnSettingsOpen] = useState(false);
  const [tempComVisibleColumns, setTempComVisibleColumns] = useState<Record<string, boolean>>({
    empId: true,
    name: true,
    dept: true,
    section: true,
    branch: true,
    consumerSales: true,
    purchaseSales: true,
    rate: true,
    commission: true,
  });
  const [comVisibleColumns, setComVisibleColumns] = useState<Record<string, boolean>>({
    empId: true,
    name: true,
    dept: true,
    section: true,
    branch: true,
    consumerSales: true,
    purchaseSales: true,
    rate: true,
    commission: true,
  });

  // --- Profile Report State ---
  const [profileSearch, setProfileSearch] = useState<string>('');
  const [isProfileColumnFiltersOpen, setIsProfileColumnFiltersOpen] = useState(false);
  const [profileStartDate, setProfileStartDate] = useState<string>('');
  const [profileEndDate, setProfileEndDate] = useState<string>('');
  const [profileViewMode, setProfileViewMode] = useState<'table' | 'kanban'>('table');
  const [profileCurrentPage, setProfileCurrentPage] = useState(1);
  const [profilePageSize, setProfilePageSize] = useState(5);
  const [selectedProfileBranches, setSelectedProfileBranches] = useState<string[]>(['all']);
  const [profileBranchDropdownOpen, setProfileBranchDropdownOpen] = useState(false);
  const [profileColumnSettingsOpen, setProfileColumnSettingsOpen] = useState(false);
  const [profileVisibleColumns, setProfileVisibleColumns] = useState<Record<string, boolean>>({
    empId: true,
    name: true,
    dept: true,
    section: true,
    branch: true,
    hireDate: true,
    baseSalary: true,
    status: true,
  });
  const [tempProfileVisibleColumns, setTempProfileVisibleColumns] = useState<Record<string, boolean>>({
    empId: true,
    name: true,
    dept: true,
    section: true,
    branch: true,
    hireDate: true,
    baseSalary: true,
    status: true,
  });
  const [profColSearchEmpId, setProfColSearchEmpId] = useState('');
  const [profColSearchName, setProfColSearchName] = useState('');
  const [profColSearchDept, setProfColSearchDept] = useState('');
  const [profColSearchSection, setProfColSearchSection] = useState('');
  const [profColSearchBranch, setProfColSearchBranch] = useState('');
  const [profColSearchHireDate, setProfColSearchHireDate] = useState('');
  const [profColSearchSalary, setProfColSearchSalary] = useState('');
  const [profColSearchStatus, setProfColSearchStatus] = useState('');

  // --- Attendance Report State ---
  const [attendanceSearchReport, setAttendanceSearchReport] = useState<string>('');
  const [isAttendanceColumnFiltersOpenReport, setIsAttendanceColumnFiltersOpenReport] = useState(false);
  const [attendanceStartDateReport, setAttendanceStartDateReport] = useState<string>('');
  const [attendanceEndDateReport, setAttendanceEndDateReport] = useState<string>('');
  const [attendanceViewModeReport, setAttendanceViewModeReport] = useState<'table' | 'kanban'>('table');
  const [attendanceCurrentPageReport, setAttendanceCurrentPageReport] = useState(1);
  const [attendancePageSizeReport, setAttendancePageSizeReport] = useState(5);
  const [selectedAttendanceBranchesReport, setSelectedAttendanceBranchesReport] = useState<string[]>(['all']);
  const [attendanceBranchDropdownOpenReport, setAttendanceBranchDropdownOpenReport] = useState(false);
  const [attendanceColumnSettingsOpenReport, setAttendanceColumnSettingsOpenReport] = useState(false);
  const [attendanceVisibleColumnsReport, setAttendanceVisibleColumnsReport] = useState<Record<string, boolean>>({
    empId: true,
    name: true,
    date: true,
    timeIn: true,
    timeOut: true,
    mode: true,
    status: true,
  });
  const [tempAttendanceVisibleColumnsReport, setTempAttendanceVisibleColumnsReport] = useState<Record<string, boolean>>({
    empId: true,
    name: true,
    date: true,
    timeIn: true,
    timeOut: true,
    mode: true,
    status: true,
  });
  const [attColSearchEmpId, setAttColSearchEmpId] = useState('');
  const [attColSearchName, setAttColSearchName] = useState('');
  const [attColSearchDate, setAttColSearchDate] = useState('');
  const [attColSearchTimeIn, setAttColSearchTimeIn] = useState('');
  const [attColSearchTimeOut, setAttColSearchTimeOut] = useState('');
  const [attColSearchMode, setAttColSearchMode] = useState('');
  const [attColSearchStatus, setAttColSearchStatus] = useState('');

  // --- Rewards & Deductions Report State ---
  const [bonusDeductSearchReport, setBonusDeductSearchReport] = useState<string>('');
  const [isBonusDeductColumnFiltersOpenReport, setIsBonusDeductColumnFiltersOpenReport] = useState(false);
  const [bonusDeductStartDateReport, setBonusDeductStartDateReport] = useState<string>('');
  const [bonusDeductEndDateReport, setBonusDeductEndDateReport] = useState<string>('');
  const [bonusDeductViewModeReport, setBonusDeductViewModeReport] = useState<'table' | 'kanban'>('table');
  const [bonusDeductCurrentPageReport, setBonusDeductCurrentPageReport] = useState(1);
  const [bonusDeductPageSizeReport, setBonusDeductPageSizeReport] = useState(5);
  const [selectedBonusDeductBranchesReport, setSelectedBonusDeductBranchesReport] = useState<string[]>(['all']);
  const [bonusDeductBranchDropdownOpenReport, setBonusDeductBranchDropdownOpenReport] = useState(false);
  const [bonusDeductColumnSettingsOpenReport, setBonusDeductColumnSettingsOpenReport] = useState(false);
  const [bonusDeductVisibleColumnsReport, setBonusDeductVisibleColumnsReport] = useState<Record<string, boolean>>({
    empId: true,
    name: true,
    type: true,
    amount: true,
    reasonEn: true,
    reasonAr: true,
    date: true,
  });
  const [tempBonusDeductVisibleColumnsReport, setTempBonusDeductVisibleColumnsReport] = useState<Record<string, boolean>>({
    empId: true,
    name: true,
    type: true,
    amount: true,
    reasonEn: true,
    reasonAr: true,
    date: true,
  });
  const [bdColSearchEmpId, setBdColSearchEmpId] = useState('');
  const [bdColSearchName, setBdColSearchName] = useState('');
  const [bdColSearchType, setBdColSearchType] = useState('');
  const [bdColSearchAmount, setBdColSearchAmount] = useState('');
  const [bdColSearchReason, setBdColSearchReason] = useState('');
  const [bdColSearchDate, setBdColSearchDate] = useState('');

  // --- Salary Disbursals Report State ---
  const [disbursalsSearchReport, setDisbursalsSearchReport] = useState<string>('');
  const [isDisbursalsColumnFiltersOpenReport, setIsDisbursalsColumnFiltersOpenReport] = useState(false);
  const [disbursalsStartDateReport, setDisbursalsStartDateReport] = useState<string>('');
  const [disbursalsEndDateReport, setDisbursalsEndDateReport] = useState<string>('');
  const [disbursalsViewModeReport, setDisbursalsViewModeReport] = useState<'table' | 'kanban'>('table');
  const [disbursalsCurrentPageReport, setDisbursalsCurrentPageReport] = useState(1);
  const [disbursalsPageSizeReport, setDisbursalsPageSizeReport] = useState(5);
  const [selectedDisbursalsBranchesReport, setSelectedDisbursalsBranchesReport] = useState<string[]>(['all']);
  const [disbursalsBranchDropdownOpenReport, setDisbursalsBranchDropdownOpenReport] = useState(false);
  const [disbursalsColumnSettingsOpenReport, setDisbursalsColumnSettingsOpenReport] = useState(false);
  const [reportMonthDisbursals, setReportMonthDisbursals] = useState<string>('all');
  const [disbursalsVisibleColumnsReport, setDisbursalsVisibleColumnsReport] = useState<Record<string, boolean>>({
    id: true,
    empId: true,
    name: true,
    type: true,
    amount: true,
    safeName: true,
    date: true,
    salaryMonth: true
  });
  const [tempDisbursalsVisibleColumnsReport, setTempDisbursalsVisibleColumnsReport] = useState<Record<string, boolean>>({
    id: true,
    empId: true,
    name: true,
    type: true,
    amount: true,
    safeName: true,
    date: true,
    salaryMonth: true
  });
  const [dbColSearchId, setDbColSearchId] = useState('');
  const [dbColSearchEmpId, setDbColSearchEmpId] = useState('');
  const [dbColSearchName, setDbColSearchName] = useState('');
  const [dbColSearchType, setDbColSearchType] = useState('');
  const [dbColSearchAmount, setDbColSearchAmount] = useState('');
  const [dbColSearchSafeName, setDbColSearchSafeName] = useState('');
  const [dbColSearchDate, setDbColSearchDate] = useState('');
  const [dbColSearchSalaryMonth, setDbColSearchSalaryMonth] = useState('');


  // Attendance Edit states
  const [editingAttendanceLog, setEditingAttendanceLog] = useState<any | null>(null);
  const [isEditAttendanceOpen, setIsEditAttendanceOpen] = useState(false);

  // Modals for Employee View/Edit/Add Actions
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null); // if null, represent Add, else Edit
  const [viewingEmp, setViewingEmp] = useState<EmployeeExt | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<'job' | 'salary' | 'bank' | 'ins' | 'system'>('job');
  const [activeEditTab, setActiveEditTab] = useState<'job' | 'salary' | 'bank' | 'ins' | 'system'>('job');
  const [searchQuery, setSearchQuery] = useState('');

  // Column-specific search states
  const [isColumnFiltersOpen, setIsColumnFiltersOpen] = useState(false);
  const [colSearchName, setColSearchName] = useState('');
  const [colSearchRole, setColSearchRole] = useState('');
  const [colSearchDept, setColSearchDept] = useState('');
  const [colSearchBranch, setColSearchBranch] = useState('');
  const [colSearchSalary, setColSearchSalary] = useState('');
  const [colSearchHireDate, setColSearchHireDate] = useState('');
  const [colSearchStatus, setColSearchStatus] = useState('');

  // Reset page of employees when any search filter is updated
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, colSearchName, colSearchRole, colSearchDept, colSearchBranch, colSearchSalary, colSearchHireDate, colSearchStatus]);

  const handleToggleColumnFilters = () => {
    if (isColumnFiltersOpen) {
      setColSearchName('');
      setColSearchRole('');
      setColSearchDept('');
      setColSearchBranch('');
      setColSearchSalary('');
      setColSearchHireDate('');
      setColSearchStatus('');
    }
    setIsColumnFiltersOpen(!isColumnFiltersOpen);
  };

  // Constants for System Usage screens and group presets
  const SCREENS_LIST = useMemo(() => [
    { id: 'dashboard', nameEn: 'Dashboard', nameAr: 'لوحة القيادة' },
    { id: 'employees', nameEn: 'Employees Tab', nameAr: 'الهيكل والوظائف وملفات الموظفين' },
    { id: 'inventory', nameEn: 'Inventory Stock', nameAr: 'رصيد السلع والمستودعات' },
    { id: 'sales', nameEn: 'Sales & POS cashier', nameAr: 'الفواتير ونظام الكاشير وعملاء المعرض' },
    { id: 'purchases', nameEn: 'Purchases & Suppliers', nameAr: 'المشتريات وطلبات التوريد والموردين' },
    { id: 'accounts', nameEn: 'Accounts & Capital Safes', nameAr: 'الخزائن والقيود والوضع المالي النقدي' },
    { id: 'reports', nameEn: 'Reports & Analytics', nameAr: 'التقارير التفصيلية والإحصائيات' },
    { id: 'settings', nameEn: 'Settings & Configurations', nameAr: 'الإعدادات العامة والتهيئات الأساسية' },
  ], []);

  const PERM_GROUPS = useMemo(() => [
    { id: 'Admin', nameEn: 'System Admin', nameAr: 'المدير العام (أدمن)' },
    { id: 'Manager', nameEn: 'Branch Manager', nameAr: 'مدير فرع / مسؤول تشغيلي' },
    { id: 'Cashier', nameEn: 'Cashier Terminal', nameAr: 'كاشير نقطة بيع' },
    { id: 'Representative', nameEn: 'Sales Representative', nameAr: 'مندوب مبيعات خارجي' },
    { id: 'HR', nameEn: 'HR / Personnel Staff', nameAr: 'مسؤول الموارد البشرية (HR)' },
  ], []);

  const getDefaultPermissions = (group: string) => {
    const defaults: Record<string, { view: boolean; add: boolean; edit: boolean; export: boolean; delete: boolean }> = {};
    SCREENS_LIST.forEach(scr => {
      defaults[scr.id] = { view: false, add: false, edit: false, export: false, delete: false };
    });

    if (group === 'Admin') {
      SCREENS_LIST.forEach(scr => {
        defaults[scr.id] = { view: true, add: true, edit: true, export: true, delete: true };
      });
    } else if (group === 'Manager') {
      SCREENS_LIST.forEach(scr => {
        defaults[scr.id] = { view: true, add: true, edit: true, export: true, delete: false };
      });
      defaults['settings'] = { view: false, add: false, edit: false, export: false, delete: false };
    } else if (group === 'Cashier') {
      defaults['sales'] = { view: true, add: true, edit: true, export: false, delete: false };
      defaults['inventory'] = { view: true, add: false, edit: false, export: false, delete: false };
    } else if (group === 'Representative') {
      defaults['sales'] = { view: true, add: true, edit: false, export: false, delete: false };
      defaults['inventory'] = { view: true, add: false, edit: false, export: false, delete: false };
    } else if (group === 'HR') {
      defaults['employees'] = { view: true, add: true, edit: true, export: true, delete: false };
      defaults['dashboard'] = { view: true, add: false, edit: false, export: false, delete: false };
    }
    return defaults;
  };

  // System usage fields states
  const [empFormIsSystemUser, setEmpFormIsSystemUser] = useState(false);
  const [empFormUsername, setEmpFormUsername] = useState('');
  const [empFormPassword, setEmpFormPassword] = useState('');
  const [empFormPermGroup, setEmpFormPermGroup] = useState('Admin');
  const [empFormIsCashierOrRep, setEmpFormIsCashierOrRep] = useState(false);
  const [empFormCustomPermissions, setEmpFormCustomPermissions] = useState<Record<string, { view: boolean; add: boolean; edit: boolean; export: boolean; delete: boolean }>>(() => {
    const init: Record<string, { view: boolean; add: boolean; edit: boolean; export: boolean; delete: boolean }> = {};
    [
      { id: 'dashboard' }, { id: 'employees' }, { id: 'inventory' }, { id: 'sales' },
      { id: 'purchases' }, { id: 'accounts' }, { id: 'reports' }, { id: 'settings' }
    ].forEach(scr => {
      init[scr.id] = { view: true, add: true, edit: true, export: true, delete: true };
    });
    return init;
  });

  // Form Field States
  const [empFormNameEn, setEmpFormNameEn] = useState('');
  const [empFormNameAr, setEmpFormNameAr] = useState('');
  const [empFormEmail, setEmpFormEmail] = useState('');
  const [empFormRoleEn, setEmpFormRoleEn] = useState('');
  const [empFormRoleAr, setEmpFormRoleAr] = useState('');
  const [empFormDept, setEmpFormDept] = useState('D1');
  const [empFormSect, setEmpFormSect] = useState('S1');
  const [empFormGroup, setEmpFormGroup] = useState('G1');
  const [empFormSalary, setEmpFormSalary] = useState(6000);
  const [empFormAllowance, setEmpFormAllowance] = useState(200);
  const [empFormAllowances, setEmpFormAllowances] = useState<EmployeeAllowance[]>([]);
  const [newAlwTypeAr, setNewAlwTypeAr] = useState('');
  const [newAlwTypeEn, setNewAlwTypeEn] = useState('');
  const [newAlwAmount, setNewAlwAmount] = useState<number>(0);
  const [empFormShift, setEmpFormShift] = useState('SFT1');
  
  const [empFormHireDate, setEmpFormHireDate] = useState('2026-05-21');
  const [empFormManagerEn, setEmpFormManagerEn] = useState('');
  const [empFormManagerAr, setEmpFormManagerAr] = useState('');
  const [empFormGrade, setEmpFormGrade] = useState('03 — أمين مخزن');
  const [empFormCostCenterEn, setEmpFormCostCenterEn] = useState('002 — Storage Desk');
  const [empFormCostCenterAr, setEmpFormCostCenterAr] = useState('002 — إدارة المخازن');
  const [empFormWorkType, setEmpFormWorkType] = useState<string>('Full-Time');

  const [empFormBankNameEn, setEmpFormBankNameEn] = useState('');
  const [empFormBankNameAr, setEmpFormBankNameAr] = useState('');
  const [empFormBankHolderEn, setEmpFormBankHolderEn] = useState('');
  const [empFormBankHolderAr, setEmpFormBankHolderAr] = useState('');
  const [empFormBankAccountNum, setEmpFormBankAccountNum] = useState('');
  const [empFormBankIban, setEmpFormBankIban] = useState('');
  const [empFormBankSwift, setEmpFormBankSwift] = useState('');
  const [empFormBankBranchEn, setEmpFormBankBranchEn] = useState('');
  const [empFormBankBranchAr, setEmpFormBankBranchAr] = useState('');

  const [empFormCommType, setEmpFormCommType] = useState<string>('None');
  const [empFormCommRate, setEmpFormCommRate] = useState(0);
  const [empFormCommAmount, setEmpFormCommAmount] = useState(0);
  const [empFormCommMinSales, setEmpFormCommMinSales] = useState(0);
  const [empFormCommStartDate, setEmpFormCommStartDate] = useState('');
  const [empFormCommEndDate, setEmpFormCommEndDate] = useState('');

  const [empFormInsNumber, setEmpFormInsNumber] = useState('');
  const [empFormInsSubDate, setEmpFormInsSubDate] = useState('');
  const [empFormInsWage, setEmpFormInsWage] = useState(0);
  const [empFormInsRateEmp, setEmpFormInsRateEmp] = useState(11);
  const [empFormInsRateComp, setEmpFormInsRateComp] = useState(18.75);

  const handleTogglePermission = (screenId: string, action: 'view' | 'add' | 'edit' | 'export' | 'delete') => {
    setEmpFormCustomPermissions(prev => {
      const current = prev?.[screenId] || { view: false, add: false, edit: false, export: false, delete: false };
      return {
        ...prev,
        [screenId]: {
          ...current,
          [action]: !current[action]
        }
      };
    });
  };

  const handlePermGroupChange = (group: string) => {
    setEmpFormPermGroup(group);
    setEmpFormCustomPermissions(getDefaultPermissions(group));
    if (group === 'Cashier' || group === 'Representative') {
      setEmpFormIsCashierOrRep(true);
    } else {
      setEmpFormIsCashierOrRep(false);
    }
  };

  const openAddEmployeeModal = () => {
    setEditingEmpId(null);
    setActiveEditTab('job');
    setEmpFormNameEn('');
    setEmpFormNameAr('');
    setEmpFormEmail('');
    setEmpFormRoleEn('');
    setEmpFormRoleAr('');
    setEmpFormDept('D1');
    setEmpFormSect('S1');
    setEmpFormGroup('G1');
    setEmpFormSalary(6000);
    setEmpFormAllowance(200);
    setEmpFormAllowances([]);
    setNewAlwTypeAr('');
    setNewAlwTypeEn('');
    setNewAlwAmount(0);
    setEmpFormShift('SFT1');
    setEmpFormHireDate('2026-05-21');
    setEmpFormManagerEn('Hazem Soliman');
    setEmpFormManagerAr('حازم سليمان');
    setEmpFormGrade('03 — أمين مخزن');
    setEmpFormCostCenterEn('002 — Storage Desk');
    setEmpFormCostCenterAr('002 — إدارة المخازن');
    setEmpFormWorkType('Full-Time');
    setEmpFormBankNameEn('');
    setEmpFormBankNameAr('');
    setEmpFormBankHolderEn('');
    setEmpFormBankHolderAr('');
    setEmpFormBankAccountNum('');
    setEmpFormBankIban('');
    setEmpFormBankSwift('');
    setEmpFormBankBranchEn('');
    setEmpFormBankBranchAr('');
    setEmpFormCommType('None');
    setEmpFormCommRate(0);
    setEmpFormCommAmount(0);
    setEmpFormCommMinSales(0);
    setEmpFormCommStartDate('');
    setEmpFormCommEndDate('');
    setEmpFormInsNumber('');
    setEmpFormInsSubDate('');
    setEmpFormInsWage(0);
    setEmpFormInsRateEmp(11);
    setEmpFormInsRateComp(18.75);

    // Reset system usage fields
    setEmpFormIsSystemUser(false);
    setEmpFormUsername('');
    setEmpFormPassword('');
    setEmpFormPermGroup('Admin');
    setEmpFormIsCashierOrRep(false);
    setEmpFormCustomPermissions(getDefaultPermissions('Admin'));

    setIsEmpModalOpen(true);
  };

  const openEditEmployeeModal = (emp: EmployeeExt) => {
    setEditingEmpId(emp.id);
    setActiveEditTab('job');
    setEmpFormNameEn(emp.name);
    setEmpFormNameAr(emp.nameAr);
    setEmpFormEmail(emp.email);
    setEmpFormRoleEn(emp.role);
    setEmpFormRoleAr(emp.roleAr);
    setEmpFormDept(emp.departmentId);
    setEmpFormSect(emp.sectionId);
    setEmpFormGroup(emp.groupId);
    setEmpFormSalary(emp.baseSalary);
    setEmpFormAllowance(emp.allowanceValue || 200);
    setEmpFormAllowances(emp.allowances || (emp.allowanceValue ? [{ id: 'al_init', nameAr: 'بدل انتقال ومواصلات ومبيت خارجي', nameEn: 'Transit & accommodation allowances', amount: emp.allowanceValue }] : []));
    setNewAlwTypeAr('');
    setNewAlwTypeEn('');
    setNewAlwAmount(0);
    setEmpFormShift(emp.shiftId || 'SFT1');
    setEmpFormHireDate(emp.hireDate || '2026-05-21');
    setEmpFormManagerEn(emp.managerEn || 'Hazem Soliman');
    setEmpFormManagerAr(emp.managerAr || 'حازم سليمان');
    setEmpFormGrade(emp.grade || '03 — أمين مخزن');
    setEmpFormCostCenterEn(emp.costCenterEn || '002 — Storage Desk');
    setEmpFormCostCenterAr(emp.costCenterAr || '002 — إدارة المخازن');
    setEmpFormWorkType(emp.workType || 'Full-Time');
    setEmpFormBankNameEn(emp.bankNameEn || '');
    setEmpFormBankNameAr(emp.bankNameAr || '');
    setEmpFormBankHolderEn(emp.bankHolderEn || '');
    setEmpFormBankHolderAr(emp.bankHolderAr || '');
    setEmpFormBankAccountNum(emp.bankAccountNum || '');
    setEmpFormBankIban(emp.bankIban || '');
    setEmpFormBankSwift(emp.bankSwift || '');
    setEmpFormBankBranchEn(emp.bankBranchEn || '');
    setEmpFormBankBranchAr(emp.bankBranchAr || '');
    setEmpFormCommType(emp.commType || 'None');
    setEmpFormCommRate(emp.commRate || 0);
    setEmpFormCommAmount(emp.commAmount || 0);
    setEmpFormCommMinSales(emp.commMinSales || 0);
    setEmpFormCommStartDate(emp.commStartDate || '');
    setEmpFormCommEndDate(emp.commEndDate || '');
    setEmpFormInsNumber(emp.insNumber || '');
    setEmpFormInsSubDate(emp.insSubDate || '');
    setEmpFormInsWage(emp.insWage || 0);
    setEmpFormInsRateEmp(emp.insRateEmp || 11);
    setEmpFormInsRateComp(emp.insRateComp || 18.75);

    // Load system usage fields
    setEmpFormIsSystemUser(emp.isSystemUser || false);
    setEmpFormUsername(emp.username || '');
    setEmpFormPassword(emp.password || '');
    setEmpFormPermGroup(emp.permissionGroup || 'Admin');
    setEmpFormIsCashierOrRep(emp.hasSubSafe || false);
    setEmpFormCustomPermissions(emp.customPermissions || getDefaultPermissions(emp.permissionGroup || 'Admin'));

    setIsEmpModalOpen(true);
  };

  const handleDeleteEmployee = (id: string) => {
    if (confirm(lang === 'ar' ? 'هل أنت متأكد من رغبتك في حذف هذا الموظف؟' : 'Are you sure you want to delete this employee?')) {
      setStaff(prev => prev.filter(emp => emp.id !== id));
      triggerHrToast(lang === 'ar' ? 'تم حذف ملف الموظف بنجاح' : 'Employee profile deleted successfully!');
    }
  };

  // Multiple Shifts/Presets Database State
  const [shifts, setShifts] = useState<ShiftPreset[]>([
    {
      id: 'SFT1',
      nameEn: 'Standard Day Roster',
      nameAr: 'الوردية الصباحية الموحدة',
      periodsCount: 1,
      daysLocked: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: true, sat: true },
      hours: {
        sun: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
        mon: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
        tue: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
        wed: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
        thu: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
        fri: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
        sat: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
      }
    },
    {
      id: 'SFT2',
      nameEn: 'Double-Shift Operations',
      nameAr: 'وردية الفترتين المتعاقبة',
      periodsCount: 2,
      daysLocked: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: true, sat: false },
      hours: {
        sun: { p1In: '08:00', p1Out: '15:00', p2In: '15:00', p2Out: '22:00', p3In: '22:00', p3Out: '06:00' },
        mon: { p1In: '08:00', p1Out: '15:00', p2In: '15:00', p2Out: '22:00', p3In: '22:00', p3Out: '06:00' },
        tue: { p1In: '08:00', p1Out: '15:00', p2In: '15:00', p2Out: '22:00', p3In: '22:00', p3Out: '06:00' },
        wed: { p1In: '08:00', p1Out: '15:00', p2In: '15:00', p2Out: '22:00', p3In: '22:00', p3Out: '06:00' },
        thu: { p1In: '08:00', p1Out: '15:00', p2In: '15:00', p2Out: '22:00', p3In: '22:00', p3Out: '06:00' },
        fri: { p1In: '08:00', p1Out: '15:00', p2In: '15:00', p2Out: '22:00', p3In: '22:00', p3Out: '06:00' },
        sat: { p1In: '08:00', p1Out: '15:00', p2In: '15:00', p2Out: '22:00', p3In: '22:00', p3Out: '06:00' },
      }
    },
    {
      id: 'SFT3',
      nameEn: 'Triple Shift Duty',
      nameAr: 'وردية الطوارئ وتأمين الثلاث فترات',
      periodsCount: 3,
      daysLocked: { sun: true, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
      hours: {
        sun: { p1In: '08:00', p1Out: '16:00', p2In: '16:00', p2Out: '00:00', p3In: '00:00', p3Out: '08:00' },
        mon: { p1In: '08:00', p1Out: '16:00', p2In: '16:00', p2Out: '00:00', p3In: '00:00', p3Out: '08:00' },
        tue: { p1In: '08:00', p1Out: '16:00', p2In: '16:00', p2Out: '00:00', p3In: '00:00', p3Out: '08:00' },
        wed: { p1In: '08:00', p1Out: '16:00', p2In: '16:00', p2Out: '00:00', p3In: '00:00', p3Out: '08:00' },
        thu: { p1In: '08:00', p1Out: '16:00', p2In: '16:00', p2Out: '00:00', p3In: '00:00', p3Out: '08:00' },
        fri: { p1In: '08:00', p1Out: '16:00', p2In: '16:00', p2Out: '00:00', p3In: '00:00', p3Out: '08:00' },
        sat: { p1In: '08:00', p1Out: '16:00', p2In: '16:00', p2Out: '00:00', p3In: '00:00', p3Out: '08:00' },
      }
    }
  ]);

  // 3. Working Shifts configuration with customizable weekdays (single, double, or triple period)
  const daysOfWeek = [
    { id: 'sun', labelEn: 'Sunday', labelAr: 'الأحد' },
    { id: 'mon', labelEn: 'Monday', labelAr: 'الاثنين' },
    { id: 'tue', labelEn: 'Tuesday', labelAr: 'الثلاثاء' },
    { id: 'wed', labelEn: 'Wednesday', labelAr: 'الأربعاء' },
    { id: 'thu', labelEn: 'Thursday', labelAr: 'الخميس' },
    { id: 'fri', labelEn: 'Friday', labelAr: 'الجمعة' },
    { id: 'sat', labelEn: 'Saturday', labelAr: 'السبت' },
  ];

  const [selectedShiftPeriods, setSelectedShiftPeriods] = useState<number>(1); // 1, 2, or 3 periods
  const [shiftDaysLocked, setShiftDaysLocked] = useState<Record<string, boolean>>({
    sun: false, mon: false, tue: false, wed: false, thu: false, fri: true, sat: true
  });
  // Daily clock times
  const [shiftHours, setShiftHours] = useState<Record<string, { p1In: string, p1Out: string, p2In: string, p2Out: string, p3In: string, p3Out: string }>>({
    sun: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
    mon: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
    tue: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
    wed: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
    thu: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
    fri: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
    sat: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
  });

  // 4. Manual Attendance registry states & Biometric Imports logs Simulation
  const [attendanceDate, setAttendanceDate] = useState<string>('2026-06-15');
  const [attendanceSearchTerm, setAttendanceSearchTerm] = useState<string>('');
  const [attendanceDirViewMode, setAttendanceDirViewMode] = useState<'table' | 'kanban'>('table');
  const [isAttendanceColumnFiltersOpen, setIsAttendanceColumnFiltersOpen] = useState(false);
  const [attendanceCurrentPage, setAttendanceCurrentPage] = useState(1);
  const [attendancePageSize, setAttendancePageSize] = useState(5);

  useEffect(() => {
    setAttendanceCurrentPage(1);
  }, [attendanceSearchTerm, attendanceDate]);
  const [attendanceLogs, setAttendanceLogs] = useState([
    { 
      id: 'AL1', 
      empId: 'EMP1', 
      timeIn1: '08:55 AM', 
      timeOut1: '12:30 PM', 
      timeIn2: '01:30 PM', 
      timeOut2: '05:04 PM', 
      timeIn3: '--', 
      timeOut3: '--', 
      mode: 'Biometric Fingerprint', 
      status: 'On-Time' 
    },
    { 
      id: 'AL2', 
      empId: 'EMP3', 
      timeIn1: '09:45 AM', 
      timeOut1: '12:15 PM', 
      timeIn2: '01:00 PM', 
      timeOut2: '04:30 PM', 
      timeIn3: '05:00 PM', 
      timeOut3: '07:30 PM', 
      mode: 'Manual Portal Log', 
      status: 'Multi-Period Duty' 
    },
    { 
      id: 'AL3', 
      empId: 'EMP4', 
      timeIn1: '09:00 AM', 
      timeOut1: '01:00 PM', 
      timeIn2: '02:00 PM', 
      timeOut2: '--', 
      timeIn3: '--', 
      timeOut3: '--', 
      mode: 'Biometric FaceID', 
      status: 'Active Duty' 
    },
  ]);
  const [importDragActive, setImportDragActive] = useState<boolean>(false);
  const [importedFileText, setImportedFileText] = useState<string | null>(null);

  // 5. Earnings & Deductions ledger registers
  const [bonusesList, setBonusesList] = useState([
    { id: 'B1', empId: 'EMP1', reasonAr: 'مكافأة جودة إغلاق الميزانية والالتزام', reasonEn: 'Excellence in ledger alignment & timing', amount: 800, date: '2026-06-12' },
    { id: 'B2', empId: 'EMP3', reasonAr: 'عمولة تحقيق مبيعات فروع التجزئة', reasonEn: 'In-store retail target breakthrough credit', amount: 1200, date: '2026-06-14' }
  ]);
  const [deductionsList, setDeductionsList] = useState([
    { id: 'DED1', empId: 'EMP2', reasonAr: 'تأخير متكرر وغياب يوم عمل دون عذر مقنع', reasonEn: 'Unexcused 1 full-day absence from retail station', amount: 400, date: '2026-06-10' },
    { id: 'DED2', empId: 'EMP3', reasonAr: 'خصم عجز صندوق جزئي تم تسويته', reasonEn: 'Partial register balancing discrepancy deduction', amount: 150, date: '2026-06-11' }
  ]);
  const [allowancesList, setAllowancesList] = useState([
    { id: 'ALW1', nameAr: 'بدل انتقال ومواصلات ومبيت خارجي', nameEn: 'Transit & accommodation allowances', amount: 500, type: 'Recurring' },
    { id: 'ALW2', nameAr: 'بدل مخاطر عجز خزينة لكاشير مالي', nameEn: 'Risk liability and cashiering allowances', amount: 300, type: 'Base Contract' }
  ]);
  const [commissions, setCommissions] = useState([
    { id: 'C1', empId: 'EMP3', baseSales: 45000, rate: 0.025, computed: 1125, status: 'Calculated' }
  ]);

  // Extra config states
  const [newBonusEmp, setNewBonusEmp] = useState('EMP1');
  const [newBonusAmount, setNewBonusAmount] = useState<number>(250);
  const [newBonusReason, setNewBonusReason] = useState('');

  const [newDeductEmp, setNewDeductEmp] = useState('EMP2');
  const [newDeductAmount, setNewDeductAmount] = useState<number>(100);
  const [newDeductReason, setNewDeductReason] = useState('');

  const [showRewardModal, setShowRewardModal] = useState<boolean>(false);
  const [showDeductionModal, setShowDeductionModal] = useState<boolean>(false);
  const [selectedRewardType, setSelectedRewardType] = useState<string>('custom');
  const [selectedDeductType, setSelectedDeductType] = useState<string>('custom');
  const [editingBonusId, setEditingBonusId] = useState<string | null>(null);
  const [editingDeductId, setEditingDeductId] = useState<string | null>(null);
  const [viewingDisbursal, setViewingDisbursal] = useState<any | null>(null);
  const [disbursalPaperSize, setDisbursalPaperSize] = useState<string>('A4');

  const [bonusSearchQuery, setBonusSearchQuery] = useState('');
  const [bonusFilterMonth, setBonusFilterMonth] = useState('all');
  const [deductSearchQuery, setDeductSearchQuery] = useState('');
  const [deductFilterMonth, setDeductFilterMonth] = useState('all');
  const [reportMonthAttendance, setReportMonthAttendance] = useState('all');
  const [reportMonthCommission, setReportMonthCommission] = useState('all');
  const [reportMonthBonusDeduct, setReportMonthBonusDeduct] = useState('all');

  // Pagination states for bonuses & deductions
  const [bonusPageSize, setBonusPageSize] = useState<number>(5);
  const [bonusCurrentPage, setBonusCurrentPage] = useState<number>(1);
  const [bonusDirViewMode, setBonusDirViewMode] = useState<'table' | 'kanban'>('table');
  const [isBonusColumnFiltersOpen, setIsBonusColumnFiltersOpen] = useState(false);
  const [bonusDate, setBonusDate] = useState<string>('2026-06-15');
  const [bonusColumnSettingsOpen, setBonusColumnSettingsOpen] = useState(false);
  const [bonusVisibleColumns, setBonusVisibleColumns] = useState<Record<string, boolean>>({
    empId: true,
    name: true,
    amount: true,
    reason: true,
    date: true,
    actions: true
  });
  const [tempBonusVisibleColumns, setTempBonusVisibleColumns] = useState<Record<string, boolean>>({
    empId: true,
    name: true,
    amount: true,
    reason: true,
    date: true,
    actions: true
  });
  const [deductPageSize, setDeductPageSize] = useState<number>(5);
  const [deductCurrentPage, setDeductCurrentPage] = useState<number>(1);
  const [deductDirViewMode, setDeductDirViewMode] = useState<'table' | 'kanban'>('table');
  const [isDeductColumnFiltersOpen, setIsDeductColumnFiltersOpen] = useState(false);
  const [deductDate, setDeductDate] = useState<string>('2026-06-15');
  const [deductColumnSettingsOpen, setDeductColumnSettingsOpen] = useState(false);
  const [deductVisibleColumns, setDeductVisibleColumns] = useState<Record<string, boolean>>({
    empId: true,
    name: true,
    amount: true,
    reason: true,
    date: true,
    actions: true
  });
  const [tempDeductVisibleColumns, setTempDeductVisibleColumns] = useState<Record<string, boolean>>({
    empId: true,
    name: true,
    amount: true,
    reason: true,
    date: true,
    actions: true
  });

  const filteredBonuses = bonusesList.filter(b => {
    const emp = staff.find(s => s.id === b.empId);
    const empName = emp ? (lang === 'ar' ? emp.nameAr : emp.name) : '';
    const query = bonusSearchQuery.toLowerCase();
    
    const matchesSearch = !query || 
      empName.toLowerCase().includes(query) ||
      b.empId.toLowerCase().includes(query) ||
      (b.reasonAr || '').toLowerCase().includes(query) ||
      (b.reasonEn || '').toLowerCase().includes(query);

    const matchesMonth = bonusFilterMonth === 'all' || b.date.startsWith(bonusFilterMonth);
    return matchesSearch && matchesMonth;
  });

  const filteredDeductions = deductionsList.filter(d => {
    const emp = staff.find(s => s.id === d.empId);
    const empName = emp ? (lang === 'ar' ? emp.nameAr : emp.name) : '';
    const query = deductSearchQuery.toLowerCase();
    
    const matchesSearch = !query || 
      empName.toLowerCase().includes(query) ||
      d.empId.toLowerCase().includes(query) ||
      (d.reasonAr || '').toLowerCase().includes(query) ||
      (d.reasonEn || '').toLowerCase().includes(query);

    const matchesMonth = deductFilterMonth === 'all' || d.date.startsWith(deductFilterMonth);
    return matchesSearch && matchesMonth;
  });

  // Paginated collections
  const totalBonusPages = Math.ceil(filteredBonuses.length / bonusPageSize) || 1;
  const activeBonusPage = Math.min(bonusCurrentPage, totalBonusPages);
  const bonusStartIndex = (activeBonusPage - 1) * bonusPageSize;
  const paginatedBonuses = filteredBonuses.slice(bonusStartIndex, bonusStartIndex + bonusPageSize);

  const totalDeductPages = Math.ceil(filteredDeductions.length / deductPageSize) || 1;
  const activeDeductPage = Math.min(deductCurrentPage, totalDeductPages);
  const deductStartIndex = (activeDeductPage - 1) * deductPageSize;
  const paginatedDeductions = filteredDeductions.slice(deductStartIndex, deductStartIndex + deductPageSize);

  // Disbursals states
  const [disbursalsList, setDisbursalsList] = useState([
    { id: 'DSB1', empId: 'EMP1', type: 'advance', safeName: 'الخزينة الرئيسية', amount: 1500, date: '2026-06-10' },
    { id: 'DSB2', empId: 'EMP3', type: 'salary', safeName: 'خزينة فرع التجمع', amount: 5000, date: '2026-06-25' },
    { id: 'DSB3', empId: 'EMP2', type: 'advance_carried', safeName: 'الخزينة الرئيسية', amount: 1000, date: '2026-06-15' },
  ]);

  const [newDisbursalEmp, setNewDisbursalEmp] = useState('EMP1');
  const [newDisbursalType, setNewDisbursalType] = useState<'advance' | 'advance_carried' | 'salary'>('advance');
  const [newDisbursalSafe, setNewDisbursalSafe] = useState<string>('الخزينة الرئيسية');
  const [newDisbursalAmount, setNewDisbursalAmount] = useState<number>(1000);
  const [newDisbursalDate, setNewDisbursalDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newDisbursalSalaryMonth, setNewDisbursalSalaryMonth] = useState<string>('2026-06');
  const [showDisbursalModal, setShowDisbursalModal] = useState<boolean>(false);
  const [editingDisbursalId, setEditingDisbursalId] = useState<string | null>(null);

  // Installments splits for carried advances
  const [showInstallmentsModal, setShowInstallmentsModal] = useState<boolean>(false);
  const [installmentMonths, setInstallmentMonths] = useState<number>(3);
  const [installmentsDistribution, setInstallmentsDistribution] = useState<Array<{ month: string, amount: number }>>([]);
  
  const [disbursalSearchQuery, setDisbursalSearchQuery] = useState('');
  const [isDisbursalColumnFiltersOpen, setIsDisbursalColumnFiltersOpen] = useState(false);
  const [disbursalFilterMonth, setDisbursalFilterMonth] = useState('all');
  const [disbursalFilterBranches, setDisbursalFilterBranches] = useState<string[]>(['all']);
  const [disbursalBranchDropdownOpen, setDisbursalBranchDropdownOpen] = useState(false);

  const handleDisbursalBranchToggle = (branchId: string) => {
    if (branchId === 'all') {
      setDisbursalFilterBranches(['all']);
    } else {
      let updated = [...disbursalFilterBranches];
      if (updated.includes('all')) {
        updated = updated.filter(id => id !== 'all');
      }
      if (updated.includes(branchId)) {
        updated = updated.filter(id => id !== branchId);
      } else {
        updated.push(branchId);
      }
      if (updated.length === 0) {
        updated = ['all'];
      }
      setDisbursalFilterBranches(updated);
    }
    setDisbursalCurrentPage(1);
  };

  const [disbursalViewMode, setDisbursalViewMode] = useState<'table' | 'cards'>('table');
  const [disbursalVisibleColumns, setDisbursalVisibleColumns] = useState({
    id: true,
    emp: true,
    type: true,
    safeName: true,
    date: true,
    amount: true,
    actions: true,
  });
  const [tempDisbursalVisibleColumns, setTempDisbursalVisibleColumns] = useState({...disbursalVisibleColumns});
  const [disbursalColumnDropdownOpen, setDisbursalColumnDropdownOpen] = useState(false);
  const [disbursalPageSize, setDisbursalPageSize] = useState<number>(5);
  const [disbursalCurrentPage, setDisbursalCurrentPage] = useState<number>(1);

  const filteredDisbursals = disbursalsList.filter(d => {
    const emp = staff.find(s => s.id === d.empId);
    
    // Calculate branchId dynamically using the same logic as profile and report filters
    const empNum = emp ? (parseInt(emp.id.replace(/\D/g, '')) || 1) : 1;
    const branchId = empNum % 3 === 0 ? 'mamar' : empNum % 3 === 1 ? 'theater' : 'zaghloul';

    if (!disbursalFilterBranches.includes('all') && !disbursalFilterBranches.includes(branchId)) {
      return false;
    }

    const empName = emp ? (lang === 'ar' ? emp.nameAr : emp.name) : '';
    const query = disbursalSearchQuery.toLowerCase();
    
    const matchesSearch = !query || 
      empName.toLowerCase().includes(query) ||
      d.empId.toLowerCase().includes(query) ||
      d.safeName.toLowerCase().includes(query) ||
      d.id.toLowerCase().includes(query);

    const matchesMonth = disbursalFilterMonth === 'all' || d.date.startsWith(disbursalFilterMonth);
    return matchesSearch && matchesMonth;
  });

  const totalDisbursalPages = Math.ceil(filteredDisbursals.length / disbursalPageSize) || 1;
  const activeDisbursalPage = Math.min(disbursalCurrentPage, totalDisbursalPages);
  const disbursalStartIndex = (activeDisbursalPage - 1) * disbursalPageSize;
  const paginatedDisbursals = filteredDisbursals.slice(disbursalStartIndex, disbursalStartIndex + disbursalPageSize);

  // 6. Holidays & Leaves Tracker
  const [publicHolidays, setPublicHolidays] = useState([
    { id: 'H1', nameAr: 'عيد الأضحى المبارك', nameEn: 'Eid UI-Adha Festivities', date: '2026-06-16' },
    { id: 'H2', nameAr: 'عطلة رأس السنة الهجرية', nameEn: 'Islamic New Year Off', date: '2026-07-15' },
  ]);
  const [activeHolidayModal, setActiveHolidayModal] = useState<boolean>(false);
  const [editingHolidayItem, setEditingHolidayItem] = useState<{ id: string } | null>(null);
  const [holidayNameEn, setHolidayNameEn] = useState('');
  const [holidayNameAr, setHolidayNameAr] = useState('');
  const [holidayDate, setHolidayDate] = useState('2026-06-16');
  const [leaves, setLeaves] = useState([
    { id: 'L1', empId: 'EMP2', reason: 'Sick leave report approved', reasonAr: 'وعكة صحية طارئة وتقرير معتمد', days: 3, status: 'Approved' },
    { id: 'L2', empId: 'EMP4', reason: 'Personal holiday request', reasonAr: 'طلب عطلة اعتيادية سنوية', days: 5, status: 'Pending Approval' }
  ]);

  // 7. Salary Advance, Dividends, Payments & Slips
  const [advanceOrders, setAdvanceOrders] = useState([
    { id: 'AO1', empId: 'EMP2', loanAmount: 6000, monthlyDeduction: 1000, monthsTerm: 6, paidMonths: 2, totalRepaid: 2000, remMonths: 4, type: 'Amortized Advance' },
    { id: 'AO2', empId: 'EMP3', loanAmount: 1500, monthlyDeduction: 500, monthsTerm: 3, paidMonths: 0, totalRepaid: 0, remMonths: 3, type: 'Deferred Short Advance' }
  ]);

  // New Advance Issuing calculator
  const [newLoanEmp, setNewLoanEmp] = useState('EMP3');
  const [newLoanAmount, setNewLoanAmount] = useState<number>(3000);
  const [newLoanMonths, setNewLoanMonths] = useState<number>(6);
  const [newLoanType, setNewLoanType] = useState('Amortized Advance');

  // Input bindings for adding data models
  // Modal tracking state for org hierarchy
  const [activeOrgModal, setActiveOrgModal] = useState<'dept' | 'section' | 'title' | 'group' | null>(null);
  const [comShowDept, setComShowDept] = useState<boolean>(false);
  const [comShowSection, setComShowSection] = useState<boolean>(false);
  const [commissionSearch, setCommissionSearch] = useState<string>('');
  const [isComColumnFiltersOpen, setIsComColumnFiltersOpen] = useState(false);
  const [comColSearchEmpId, setComColSearchEmpId] = useState('');
  const [comColSearchName, setComColSearchName] = useState('');
  const [comColSearchDept, setComColSearchDept] = useState('');
  const [comColSearchSection, setComColSearchSection] = useState('');
  const [comColSearchBranch, setComColSearchBranch] = useState('');
  const [comColSearchConsumerSales, setComColSearchConsumerSales] = useState('');
  const [comColSearchPurchaseSales, setComColSearchPurchaseSales] = useState('');
  const [comColSearchRate, setComColSearchRate] = useState('');
  const [comColSearchCommission, setComColSearchCommission] = useState('');
  const [comStartDate, setComStartDate] = useState<string>('');
  const [comEndDate, setComEndDate] = useState<string>('');
  const [comViewMode, setComViewMode] = useState<'table' | 'kanban'>('table');
  const [comCurrentPage, setComCurrentPage] = useState(1);
  const [comPageSize, setComPageSize] = useState(5);
  const [dirViewMode, setDirViewMode] = useState<'table' | 'kanban'>('table');
  const [selectedComBranches, setSelectedComBranches] = useState<string[]>(['all']);
  const [comBranchDropdownOpen, setComBranchDropdownOpen] = useState(false);
  const [reportDropdownOpen, setReportDropdownOpen] = useState(false);

  useEffect(() => {
    setComCurrentPage(1);
  }, [
    commissionSearch,
    comStartDate,
    comEndDate,
    comColSearchEmpId,
    comColSearchName,
    comColSearchDept,
    comColSearchSection,
    comColSearchBranch,
    comColSearchConsumerSales,
    comColSearchPurchaseSales,
    comColSearchRate,
    comColSearchCommission,
    selectedComBranches
  ]);
  const comBranches = [
    { id: 'all', labelEn: 'All Branches', labelAr: 'كل الفروع' },
    { id: 'mamar', labelEn: 'Al-Mamar Branch', labelAr: 'فرع الممر' },
    { id: 'theater', labelEn: 'Roman Theater Branch', labelAr: 'فرع المسرح الروماني' },
    { id: 'zaghloul', labelEn: 'Saad Zaghloul Branch', labelAr: 'فرع سعد زغلول' },
  ];
  const handleComBranchToggle = (branchId: string) => {
    if (branchId === 'all') {
      setSelectedComBranches(['all']);
    } else {
      let updated = [...selectedComBranches];
      if (updated.includes('all')) {
        updated = updated.filter(id => id !== 'all');
      }
      if (updated.includes(branchId)) {
        updated = updated.filter(id => id !== branchId);
      } else {
        updated.push(branchId);
      }
      if (updated.length === 0) {
        updated = ['all'];
      }
      setSelectedComBranches(updated);
    }
  };
  const [editingItem, setEditingItem] = useState<{
    type: 'dept' | 'section' | 'title' | 'group';
    id: string;
  } | null>(null);

  // 1. Adding Dept
  const [addDeptEn, setAddDeptEn] = useState('');
  const [addDeptAr, setAddDeptAr] = useState('');
  const [addDeptMgr, setAddDeptMgr] = useState('');
  // 2. Adding Section
  const [addSectDept, setAddSectDept] = useState('D1');
  const [addSectEn, setAddSectEn] = useState('');
  const [addSectAr, setAddSectAr] = useState('');
  // 3. Adding Title
  const [addTitleEn, setAddTitleEn] = useState('');
  const [addTitleAr, setAddTitleAr] = useState('');
  const [addTitleGrade, setAddTitleGrade] = useState('A');
  // 4. Adding Group
  const [addGroupEn, setAddGroupEn] = useState('');
  const [addGroupAr, setAddGroupAr] = useState('');
  const [addGroupColor, setAddGroupColor] = useState('bg-blue-500');
  // 5. Adding Profile
  const [addEmpNameEn, setAddEmpNameEn] = useState('');
  const [addEmpNameAr, setAddEmpNameAr] = useState('');
  const [addEmpEmail, setAddEmpEmail] = useState('');
  const [addEmpSalary, setAddEmpSalary] = useState<number>(5000);
  const [addEmpDept, setAddEmpDept] = useState('D1');
  const [addEmpSect, setAddEmpSect] = useState('S1');
  const [addEmpGroup, setAddEmpGroup] = useState('G1');
  const [addEmpRoleAr, setAddEmpRoleAr] = useState('');
  const [addEmpRoleEn, setAddEmpRoleEn] = useState('');
  const [addEmpShift, setAddEmpShift] = useState('SFT1');

  // Shifts presets form and interaction states
  const [activeShiftModal, setActiveShiftModal] = useState<boolean>(false);
  const [editingShiftPreset, setEditingShiftPreset] = useState<ShiftPreset | null>(null);
  const [shiftPresetNameEn, setShiftPresetNameEn] = useState('');
  const [shiftPresetNameAr, setShiftPresetNameAr] = useState('');
  const [shiftPresetPeriodsCount, setShiftPresetPeriodsCount] = useState<number>(1);
  const [shiftPresetDaysLocked, setShiftPresetDaysLocked] = useState<Record<string, boolean>>({
    sun: false, mon: false, tue: false, wed: false, thu: false, fri: true, sat: true
  });
  const [shiftPresetHours, setShiftPresetHours] = useState<Record<string, { p1In: string, p1Out: string, p2In: string, p2Out: string, p3In: string, p3Out: string }>>({
    sun: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
    mon: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
    tue: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
    wed: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
    thu: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
    fri: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
    sat: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
  });

  // Financial allowances/deductions settings state
  const [financialSettings, setFinancialSettings] = useState([
    { id: 'FIN1', type: 'Allowance', nameEn: 'Transit & Commute Allowance', nameAr: 'بدل انتقال ومواصلات', amount: 500 },
    { id: 'FIN2', type: 'Allowance', nameEn: 'Treasury Risk & Balancing Allowance', nameAr: 'بدل مخاطر عجز خزينة وكاشير', amount: 300 },
    { id: 'FIN3', type: 'Deduction', nameEn: 'Uniform / Dress Code Penalty', nameAr: 'خصم مخالفة الزي الرسمي والمهندم', amount: 150 },
    { id: 'FIN4', type: 'Deduction', nameEn: 'Equipment Misuse / Loss Penalty', nameAr: 'خصم سوء استخدام أجهزة العمل أو الإتلاف', amount: 250 },
  ]);

  const [activeFinModal, setActiveFinModal] = useState<boolean>(false);
  const [editingFinItem, setEditingFinItem] = useState<{ id: string } | null>(null);

  const [finType, setFinType] = useState<'Allowance' | 'Deduction'>('Allowance');
  const [finNameEn, setFinNameEn] = useState('');
  const [finNameAr, setFinNameAr] = useState('');
  const [finAmount, setFinAmount] = useState<number>(150);

  // Toast feedback
  const [hrToast, setHrToast] = useState<string | null>(null);
  const triggerHrToast = (msg: string) => {
    setHrToast(msg);
    setTimeout(() => setHrToast(null), 3500);
  };

  // Start Edit Operations
  const startEditDept = (dept: Department) => {
    setAddDeptEn(dept.nameEn);
    setAddDeptAr(dept.nameAr);
    setAddDeptMgr(dept.managerEn === 'Undecided' || dept.managerEn === 'غير معين' ? '' : dept.managerEn);
    setEditingItem({ type: 'dept', id: dept.id });
    setActiveOrgModal('dept');
  };

  const startEditSection = (sect: Section) => {
    setAddSectDept(sect.deptId);
    setAddSectEn(sect.nameEn);
    setAddSectAr(sect.nameAr);
    setEditingItem({ type: 'section', id: sect.id });
    setActiveOrgModal('section');
  };

  const startEditTitle = (jt: JobTitle) => {
    setAddTitleEn(jt.titleEn);
    setAddTitleAr(jt.titleAr);
    setAddTitleGrade(jt.grade);
    setEditingItem({ type: 'title', id: jt.id });
    setActiveOrgModal('title');
  };

  const startEditGroup = (grp: EmployeeGroup) => {
    setAddGroupEn(grp.nameEn);
    setAddGroupAr(grp.nameAr);
    setAddGroupColor(grp.color);
    setEditingItem({ type: 'group', id: grp.id });
    setActiveOrgModal('group');
  };

  // Delete Operations (prevent deleting linked items)
  const handleDeleteDept = (id: string) => {
    const isLinkedToStaff = staff.some(s => s.departmentId === id);
    const isLinkedToSection = sections.some(sec => sec.deptId === id);
    if (isLinkedToStaff || isLinkedToSection) {
      triggerHrToast(
        lang === 'ar' 
          ? 'لا يمكن حذف الإدارة لوجود أقسام فرعية أو موظفين مرتبطين بها!' 
          : 'Cannot delete Department: section dependencies or registered employees exist!'
      );
      return;
    }
    setDepartments(departments.filter(d => d.id !== id));
    triggerHrToast(lang === 'ar' ? 'تم حذف الإدارة بنجاح' : 'Department deleted successfully.');
  };

  const handleDeleteSection = (id: string) => {
    const isLinked = staff.some(s => s.sectionId === id);
    if (isLinked) {
      triggerHrToast(
        lang === 'ar' 
          ? 'لا يمكن حذف القسم لوجود موظفين مرتبطين به!' 
          : 'Cannot delete Section: associated staff members exist!'
      );
      return;
    }
    setSections(sections.filter(s => s.id !== id));
    triggerHrToast(lang === 'ar' ? 'تم حذف القسم بنجاح' : 'Section deleted successfully.');
  };

  const handleDeleteJobTitle = (id: string) => {
    const jt = jobTitles.find(j => j.id === id);
    if (jt) {
      const isLinked = staff.some(s => s.role === jt.titleEn || s.roleAr === jt.titleAr);
      if (isLinked) {
        triggerHrToast(
          lang === 'ar' 
            ? 'لا يمكن حذف المسمى الوظيفي لوجود موظف يشغل هذه الوظيفة!' 
            : 'Cannot delete Job Title: active staff members hold this title!'
        );
        return;
      }
    }
    setJobTitles(jobTitles.filter(j => j.id !== id));
    triggerHrToast(lang === 'ar' ? 'تم حذف المسمى الوظيفي بنجاح' : 'Job Title deleted successfully.');
  };

  const handleDeleteGroup = (id: string) => {
    const isLinked = staff.some(s => s.groupId === id);
    if (isLinked) {
      triggerHrToast(
        lang === 'ar' 
          ? 'لا يمكن حذف فئة الموظفين لوجود موظفين مسجلين بها!' 
          : 'Cannot delete group: registered employees exist in this segment!'
      );
      return;
    }
    setEmployeeGroups(employeeGroups.filter(g => g.id !== id));
    triggerHrToast(lang === 'ar' ? 'تم حذف مجموعة الموظفين بنجاح' : 'Employee group deleted successfully.');
  };

  // Financial system configuration handlers
  const handleSaveFinItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!finNameAr || !finNameEn) return;

    if (editingFinItem) {
      setFinancialSettings(prev => prev.map(item => {
        if (item.id === editingFinItem.id) {
          return {
            ...item,
            type: finType,
            nameEn: finNameEn,
            nameAr: finNameAr,
            amount: finAmount
          };
        }
        return item;
      }));
      triggerHrToast(lang === 'ar' ? 'تم تعديل بند النظام المالي بنجاح' : 'Financial setup item updated successfully!');
    } else {
      const nextId = `FIN${financialSettings.length + 1}`;
      setFinancialSettings(prev => [
        ...prev,
        {
          id: nextId,
          type: finType,
          nameEn: finNameEn,
          nameAr: finNameAr,
          amount: finAmount
        }
      ]);
      triggerHrToast(lang === 'ar' ? 'تم إضافة البند المالي الجديد بنجاح' : 'New financial item registered successfully!');
    }

    // Reset and close
    setFinNameAr('');
    setFinNameEn('');
    setFinAmount(150);
    setEditingFinItem(null);
    setActiveFinModal(false);
  };

  const startEditFin = (item: any) => {
    setFinType(item.type);
    setFinNameEn(item.nameEn);
    setFinNameAr(item.nameAr);
    setFinAmount(item.amount);
    setEditingFinItem({ id: item.id });
    setActiveFinModal(true);
  };

  const handleDeleteFin = (id: string) => {
    setFinancialSettings(prev => prev.filter(item => item.id !== id));
    triggerHrToast(lang === 'ar' ? 'تم حذف البند المالي بنجاح' : 'Financial item removed successfully!');
  };

  // Holidays system configuration handlers
  const handleSaveHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayNameAr || !holidayNameEn || !holidayDate) return;

    if (editingHolidayItem) {
      setPublicHolidays(prev => prev.map(item => {
        if (item.id === editingHolidayItem.id) {
          return {
            ...item,
            nameEn: holidayNameEn,
            nameAr: holidayNameAr,
            date: holidayDate
          };
        }
        return item;
      }));
      triggerHrToast(lang === 'ar' ? 'تم تعديل الإجازة بنجاح' : 'Holiday updated successfully!');
    } else {
      const nextId = `H${publicHolidays.length + 1}`;
      setPublicHolidays(prev => [
        ...prev,
        {
          id: nextId,
          nameEn: holidayNameEn,
          nameAr: holidayNameAr,
          date: holidayDate
        }
      ]);
      triggerHrToast(lang === 'ar' ? 'تم إضافة الإجازة الرسمية بنجاح' : 'New holiday added successfully!');
    }

    setHolidayNameAr('');
    setHolidayNameEn('');
    setHolidayDate('2026-06-16');
    setEditingHolidayItem(null);
    setActiveHolidayModal(false);
  };

  const startEditHoliday = (item: any) => {
    setHolidayNameEn(item.nameEn);
    setHolidayNameAr(item.nameAr);
    setHolidayDate(item.date);
    setEditingHolidayItem({ id: item.id });
    setActiveHolidayModal(true);
  };

  const handleDeleteHoliday = (id: string) => {
    setPublicHolidays(prev => prev.filter(item => item.id !== id));
    triggerHrToast(lang === 'ar' ? 'تم حذف الإجازة الرسمية' : 'Holiday removed successfully!');
  };

  // Shift presets system configuration handlers
  const handleSaveShiftPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftPresetNameEn || !shiftPresetNameAr) return;

    if (editingShiftPreset) {
      setShifts(prev => prev.map(item => {
        if (item.id === editingShiftPreset.id) {
          return {
            ...item,
            nameEn: shiftPresetNameEn,
            nameAr: shiftPresetNameAr,
            periodsCount: shiftPresetPeriodsCount,
            daysLocked: { ...shiftPresetDaysLocked },
            hours: JSON.parse(JSON.stringify(shiftPresetHours))
          };
        }
        return item;
      }));
      triggerHrToast(lang === 'ar' ? 'تم تعديل مسمى وتوقيتات الوردية بنجاح!' : 'Shift preset updated successfully!');
    } else {
      const nextId = `SFT${shifts.length + 1}`;
      setShifts(prev => [
        ...prev,
        {
          id: nextId,
          nameEn: shiftPresetNameEn,
          nameAr: shiftPresetNameAr,
          periodsCount: shiftPresetPeriodsCount,
          daysLocked: { ...shiftPresetDaysLocked },
          hours: JSON.parse(JSON.stringify(shiftPresetHours))
        }
      ]);
      triggerHrToast(lang === 'ar' ? 'تم إنشاء الوردية الجديدة بنجاح!' : 'New shift preset added successfully!');
    }

    setShiftPresetNameEn('');
    setShiftPresetNameAr('');
    setShiftPresetPeriodsCount(1);
    setShiftPresetDaysLocked({ sun: false, mon: false, tue: false, wed: false, thu: false, fri: true, sat: true });
    setEditingShiftPreset(null);
    setActiveShiftModal(false);
  };

  const startEditShiftPreset = (item: ShiftPreset) => {
    setShiftPresetNameEn(item.nameEn);
    setShiftPresetNameAr(item.nameAr);
    setShiftPresetPeriodsCount(item.periodsCount);
    setShiftPresetDaysLocked({ ...item.daysLocked });
    setShiftPresetHours(JSON.parse(JSON.stringify(item.hours)));
    setEditingShiftPreset(item);
    setActiveShiftModal(true);
  };

  const handleDeleteShiftPreset = (id: string) => {
    if (shifts.length <= 1) {
      triggerHrToast(lang === 'ar' ? 'يجب الإبقاء على وردية واحدة على الأقل بالمنشأة' : 'At least one active shift must be maintained.');
      return;
    }
    const remShifts = shifts.filter(item => item.id !== id);
    setShifts(remShifts);
    const firstRemainingShift = remShifts[0];
    if (firstRemainingShift) {
      setStaff(prev => prev.map(emp => {
        if (emp.shiftId === id) {
          return { ...emp, shiftId: firstRemainingShift.id };
        }
        return emp;
      }));
    }
    triggerHrToast(lang === 'ar' ? 'تم إزالة الوردية وإلحاق طاقمها بالوردية المتاحة' : 'Shift preset removed and assigned workers migrated!');
  };

  // Submit Operations
  const handleCreateDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addDeptEn || !addDeptAr) return;
    if (editingItem && editingItem.type === 'dept') {
      setDepartments(departments.map(d => d.id === editingItem.id ? { 
        ...d, 
        nameEn: addDeptEn, 
        nameAr: addDeptAr, 
        managerEn: addDeptMgr || 'Undecided', 
        managerAr: addDeptMgr || 'غير معين' 
      } : d));
      triggerHrToast(lang === 'ar' ? 'تم تعديل الإدارة بنجاح' : 'Department updated successfully!');
    } else {
      const nextId = `D${departments.length + 1}`;
      setDepartments([{ id: nextId, nameEn: addDeptEn, nameAr: addDeptAr, managerEn: addDeptMgr || 'Undecided', managerAr: addDeptMgr || 'غير معين' }, ...departments]);
      triggerHrToast(lang === 'ar' ? 'تم إنشاء الإدارة بنجاح' : 'New Department provisioned successfully!');
    }
    setAddDeptEn('');
    setAddDeptAr('');
    setAddDeptMgr('');
    setEditingItem(null);
    setActiveOrgModal(null);
  };

  const handleCreateSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addSectEn || !addSectAr) return;
    if (editingItem && editingItem.type === 'section') {
      setSections(sections.map(s => s.id === editingItem.id ? { 
        ...s, 
        deptId: addSectDept, 
        nameEn: addSectEn, 
        nameAr: addSectAr 
      } : s));
      triggerHrToast(lang === 'ar' ? 'تم تعديل القسم بنجاح' : 'Section updated successfully!');
    } else {
      const nextId = `S${sections.length + 1}`;
      setSections([{ id: nextId, deptId: addSectDept, nameEn: addSectEn, nameAr: addSectAr }, ...sections]);
      triggerHrToast(lang === 'ar' ? 'تم إضافة القسم الفرعي بنجاح' : 'New sub-department section added!');
    }
    setAddSectEn('');
    setAddSectAr('');
    setEditingItem(null);
    setActiveOrgModal(null);
  };

  const handleCreateTitle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTitleEn || !addTitleAr) return;
    if (editingItem && editingItem.type === 'title') {
      setJobTitles(jobTitles.map(j => j.id === editingItem.id ? { 
        ...j, 
        titleEn: addTitleEn, 
        titleAr: addTitleAr, 
        grade: addTitleGrade 
      } : j));
      triggerHrToast(lang === 'ar' ? 'تم تعديل المسمى الوظيفي بنجاح' : 'Job Title updated successfully!');
    } else {
      const nextId = `JT${jobTitles.length + 1}`;
      setJobTitles([{ id: nextId, titleEn: addTitleEn, titleAr: addTitleAr, grade: addTitleGrade }, ...jobTitles]);
      triggerHrToast(lang === 'ar' ? 'تم حفظ المسمى الوظيفي الجديد' : 'New Job Title registered successfully!');
    }
    setAddTitleEn('');
    setAddTitleAr('');
    setEditingItem(null);
    setActiveOrgModal(null);
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addGroupEn || !addGroupAr) return;
    if (editingItem && editingItem.type === 'group') {
      setEmployeeGroups(employeeGroups.map(g => g.id === editingItem.id ? { 
        ...g, 
        nameEn: addGroupEn, 
        nameAr: addGroupAr, 
        color: addGroupColor 
      } : g));
      triggerHrToast(lang === 'ar' ? 'تم تعديل مجموعة الموظفين بنجاح' : 'Employee Group updated successfully!');
    } else {
      const nextId = `G${employeeGroups.length + 1}`;
      setEmployeeGroups([{ id: nextId, nameEn: addGroupEn, nameAr: addGroupAr, color: addGroupColor }, ...employeeGroups]);
      triggerHrToast(lang === 'ar' ? 'تم إضافة مجموعة الموظفين بنجاح' : 'New Employee Group added successfully!');
    }
    setAddGroupEn('');
    setAddGroupAr('');
    setAddGroupColor('bg-blue-500');
    setEditingItem(null);
    setActiveOrgModal(null);
  };

  const handleAddAllowanceToForm = () => {
    if (!newAlwTypeAr && !newAlwTypeEn) return;
    const amount = Number(newAlwAmount) || 0;
    if (amount <= 0) return;
    const newAlw: EmployeeAllowance = {
      id: `alw_${Date.now()}`,
      nameAr: newAlwTypeAr || newAlwTypeEn,
      nameEn: newAlwTypeEn || newAlwTypeAr,
      amount
    };
    setEmpFormAllowances([newAlw, ...empFormAllowances]);
    setNewAlwTypeAr('');
    setNewAlwTypeEn('');
    setNewAlwAmount(0);
  };

  const handleRemoveAllowanceFromForm = (id: string) => {
    setEmpFormAllowances(empFormAllowances.filter(a => a.id !== id));
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empFormNameEn || !empFormNameAr) return;

    const calculatedAllowanceTotal = empFormAllowances.reduce((sum, alw) => sum + alw.amount, 0);

    if (editingEmpId) {
      // Editing Mode
      setStaff(prev => prev.map(emp => emp.id === editingEmpId ? {
        ...emp,
        name: empFormNameEn,
        nameAr: empFormNameAr,
        email: empFormEmail || `${emp.id.toLowerCase()}@ma7aly.com`,
        role: empFormRoleEn || 'Officer Staff',
        roleAr: empFormRoleAr || 'معاون تشغيلي',
        departmentId: empFormDept,
        sectionId: empFormSect,
        groupId: empFormGroup,
        baseSalary: empFormSalary,
        allowanceValue: calculatedAllowanceTotal,
        allowances: empFormAllowances,
        shiftId: empFormShift,
        
        hireDate: empFormHireDate,
        managerEn: empFormManagerEn,
        managerAr: empFormManagerAr,
        grade: empFormGrade,
        costCenterEn: empFormCostCenterEn,
        costCenterAr: empFormCostCenterAr,
        workType: empFormWorkType,
        
        bankNameEn: empFormBankNameEn,
        bankNameAr: empFormBankNameAr,
        bankHolderEn: empFormBankHolderEn,
        bankHolderAr: empFormBankHolderAr,
        bankAccountNum: empFormBankAccountNum,
        bankIban: empFormBankIban,
        bankSwift: empFormBankSwift,
        bankBranchEn: empFormBankBranchEn,
        bankBranchAr: empFormBankBranchAr,
        
        commType: empFormCommType,
        commRate: empFormCommRate,
        commAmount: empFormCommAmount,
        commMinSales: empFormCommMinSales,
        commStartDate: empFormCommStartDate,
        commEndDate: empFormCommEndDate,
        
        insNumber: empFormInsNumber,
        insSubDate: empFormInsSubDate,
        insWage: empFormInsWage,
        insRateEmp: empFormInsRateEmp,
        insRateComp: empFormInsRateComp,

        // System Usage Fields
        isSystemUser: empFormIsSystemUser,
        username: empFormIsSystemUser ? empFormUsername : '',
        password: empFormIsSystemUser ? empFormPassword : '',
        permissionGroup: empFormIsSystemUser ? empFormPermGroup : '',
        hasSubSafe: empFormIsSystemUser ? empFormIsCashierOrRep : false,
        customPermissions: empFormIsSystemUser ? empFormCustomPermissions : undefined,
      } as EmployeeExt : emp));
      triggerHrToast(lang === 'ar' ? 'تم تعديل ملف الموظف بنجاح!' : 'Staff Profile updated successfully!');
    } else {
      // Adding New Employee Contract
      const nextId = `EMP${staff.length + 1}`;
      const newStaff: EmployeeExt = {
        id: nextId,
        name: empFormNameEn,
        nameAr: empFormNameAr,
        email: empFormEmail || `${nextId.toLowerCase()}@ma7aly.com`,
        role: empFormRoleEn || 'Officer Staff',
        roleAr: empFormRoleAr || 'معاون تشغيلي',
        departmentId: empFormDept,
        sectionId: empFormSect,
        groupId: empFormGroup,
        baseSalary: empFormSalary,
        allowanceValue: calculatedAllowanceTotal,
        allowances: empFormAllowances,
        bonusValue: 0,
        deductValue: 0,
        clockStatus: 'Absent',
        shiftId: empFormShift,
        
        hireDate: empFormHireDate,
        managerEn: empFormManagerEn,
        managerAr: empFormManagerAr,
        grade: empFormGrade,
        costCenterEn: empFormCostCenterEn,
        costCenterAr: empFormCostCenterAr,
        workType: empFormWorkType,
        
        bankNameEn: empFormBankNameEn,
        bankNameAr: empFormBankNameAr,
        bankHolderEn: empFormBankHolderEn,
        bankHolderAr: empFormBankHolderAr,
        bankAccountNum: empFormBankAccountNum,
        bankIban: empFormBankIban,
        bankSwift: empFormBankSwift,
        bankBranchEn: empFormBankBranchEn,
        bankBranchAr: empFormBankBranchAr,
        
        commType: empFormCommType,
        commRate: empFormCommRate,
        commAmount: empFormCommAmount,
        commMinSales: empFormCommMinSales,
        commStartDate: empFormCommStartDate,
        commEndDate: empFormCommEndDate,
        
        insNumber: empFormInsNumber,
        insSubDate: empFormInsSubDate,
        insWage: empFormInsWage,
        insRateEmp: empFormInsRateEmp,
        insRateComp: empFormInsRateComp,

        // System Usage Fields
        isSystemUser: empFormIsSystemUser,
        username: empFormIsSystemUser ? empFormUsername : '',
        password: empFormIsSystemUser ? empFormPassword : '',
        permissionGroup: empFormIsSystemUser ? empFormPermGroup : '',
        hasSubSafe: empFormIsSystemUser ? empFormIsCashierOrRep : false,
        customPermissions: empFormIsSystemUser ? empFormCustomPermissions : undefined,
      };
      setStaff([newStaff, ...staff]);
      triggerHrToast(lang === 'ar' ? 'تم تسجيل عقد موظف جديد بنجاح!' : 'New Employee contract registered successfully!');
    }
    setIsEmpModalOpen(false);
  };

  const handleRewardTypeChange = (val: string) => {
    setSelectedRewardType(val);
    if (val !== 'custom') {
      const finAlw = financialSettings.find(f => f.id === val);
      if (finAlw) {
        setNewBonusAmount(finAlw.amount);
      } else {
        setNewBonusAmount(250);
      }
    }
  };

  const handleDeductTypeChange = (val: string) => {
    setSelectedDeductType(val);
    if (val !== 'custom') {
      const finDed = financialSettings.find(f => f.id === val);
      if (finDed) {
        setNewDeductAmount(finDed.amount);
      }
    }
  };

  const startEditBonus = (bonus: any) => {
    setEditingBonusId(bonus.id);
    setNewBonusEmp(bonus.empId);
    setNewBonusAmount(bonus.amount);
    setNewBonusReason(bonus.reasonAr === 'حافز أداء استثنائي مسجل' ? '' : bonus.reasonAr);
    setSelectedRewardType('custom');
    setShowRewardModal(true);
  };

  const startEditDeduction = (deduct: any) => {
    setEditingDeductId(deduct.id);
    setNewDeductEmp(deduct.empId);
    setNewDeductAmount(deduct.amount);
    setNewDeductReason(deduct.reasonAr === 'خصم مخالفة إجرائية مسجلة' ? '' : deduct.reasonAr);
    setSelectedDeductType('custom');
    setShowDeductionModal(true);
  };

  const handleAddBonus = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBonusAmount <= 0) return;
    
    let finalReasonEn = '';
    let finalReasonAr = '';
    
    if (selectedRewardType === 'custom') {
      finalReasonEn = newBonusReason || 'Performance Reward Credit';
      finalReasonAr = newBonusReason || 'حافز أداء استثنائي مسجل';
    } else {
      const finAlw = financialSettings.find(f => f.id === selectedRewardType);
      if (finAlw) {
        finalReasonEn = finAlw.nameEn + (newBonusReason ? ` (${newBonusReason})` : '');
        finalReasonAr = finAlw.nameAr + (newBonusReason ? ` (${newBonusReason})` : '');
      } else {
        const titleItem = jobTitles.find(t => t.id === selectedRewardType);
        if (titleItem) {
          finalReasonEn = `Incentive: ${titleItem.titleEn}` + (newBonusReason ? ` (${newBonusReason})` : '');
          finalReasonAr = `حافز أداء: ${titleItem.titleAr}` + (newBonusReason ? ` (${newBonusReason})` : '');
        } else {
          finalReasonEn = newBonusReason || 'Performance Reward Credit';
          finalReasonAr = newBonusReason || 'حافز أداء استثنائي مسجل';
        }
      }
    }

    if (editingBonusId) {
      // Edit Mode
      const oldBonus = bonusesList.find(b => b.id === editingBonusId);
      if (oldBonus) {
        // Adjust cached bonusValue
        setStaff(prev => prev.map(s => {
          let updated = { ...s };
          if (s.id === oldBonus.empId) {
            updated.bonusValue = Math.max(0, updated.bonusValue - oldBonus.amount);
          }
          if (s.id === newBonusEmp) {
            updated.bonusValue = updated.bonusValue + newBonusAmount;
          }
          return updated;
        }));

        setBonusesList(prev => prev.map(b => {
          if (b.id === editingBonusId) {
            return {
              ...b,
              empId: newBonusEmp,
              amount: newBonusAmount,
              reasonEn: finalReasonEn,
              reasonAr: finalReasonAr,
            };
          }
          return b;
        }));
      }
    } else {
      // Create Mode
      const nextId = `B${bonusesList.length + 1}`;
      setBonusesList([{
        id: nextId,
        empId: newBonusEmp,
        amount: newBonusAmount,
        reasonEn: finalReasonEn,
        reasonAr: finalReasonAr,
        date: new Date().toISOString().split('T')[0]
      }, ...bonusesList]);

      // Update staff cached bonus value instantly
      setStaff(prev => prev.map(s => {
        if (s.id === newBonusEmp) {
          return { ...s, bonusValue: s.bonusValue + newBonusAmount };
        }
        return s;
      }));
    }

    setNewBonusAmount(250);
    setNewBonusReason('');
    setSelectedRewardType('custom');
    setEditingBonusId(null);
    setShowRewardModal(false);
    triggerHrToast(lang === 'ar' ? `تم حفظ تعديلات المكافأة بنجاح` : `Bonus order parsed and updated!`);
  };

  const handleAddDeduction = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDeductAmount <= 0) return;

    let finalReasonEn = '';
    let finalReasonAr = '';
    
    if (selectedDeductType === 'custom') {
      finalReasonEn = newDeductReason || 'Policy Infringement Offence';
      finalReasonAr = newDeductReason || 'خصم مخالفة إجرائية مسجلة';
    } else {
      const finDed = financialSettings.find(f => f.id === selectedDeductType);
      if (finDed) {
        finalReasonEn = finDed.nameEn + (newDeductReason ? ` (${newDeductReason})` : '');
        finalReasonAr = finDed.nameAr + (newDeductReason ? ` (${newDeductReason})` : '');
      } else {
        finalReasonEn = newDeductReason || 'Policy Infringement Offence';
        finalReasonAr = newDeductReason || 'خصم مخالفة إجرائية مسجلة';
      }
    }

    if (editingDeductId) {
      // Edit Mode
      const oldDeduct = deductionsList.find(d => d.id === editingDeductId);
      if (oldDeduct) {
        // Adjust cached deductValue
        setStaff(prev => prev.map(s => {
          let updated = { ...s };
          if (s.id === oldDeduct.empId) {
            updated.deductValue = Math.max(0, updated.deductValue - oldDeduct.amount);
          }
          if (s.id === newDeductEmp) {
            updated.deductValue = updated.deductValue + newDeductAmount;
          }
          return updated;
        }));

        setDeductionsList(prev => prev.map(d => {
          if (d.id === editingDeductId) {
            return {
              ...d,
              empId: newDeductEmp,
              amount: newDeductAmount,
              reasonEn: finalReasonEn,
              reasonAr: finalReasonAr,
            };
          }
          return d;
        }));
      }
    } else {
      // Create Mode
      const nextId = `DED${deductionsList.length + 1}`;
      setDeductionsList([{
        id: nextId,
        empId: newDeductEmp,
        amount: newDeductAmount,
        reasonEn: finalReasonEn,
        reasonAr: finalReasonAr,
        date: new Date().toISOString().split('T')[0]
      }, ...deductionsList]);

      // Update staff cached deduct value instantly
      setStaff(prev => prev.map(s => {
        if (s.id === newDeductEmp) {
          return { ...s, deductValue: s.deductValue + newDeductAmount };
        }
        return s;
      }));
    }

    setNewDeductAmount(100);
    setNewDeductReason('');
    setSelectedDeductType('custom');
    setEditingDeductId(null);
    setShowDeductionModal(false);
    triggerHrToast(lang === 'ar' ? `تم حفظ تعديلات الخصم بنجاح` : `Deduction policy enforced!`);
  };

  const handleDeleteBonus = (id: string, empId: string, amount: number) => {
    setBonusesList(prev => prev.filter(b => b.id !== id));
    setStaff(prev => prev.map(s => {
      if (s.id === empId) {
        return { ...s, bonusValue: Math.max(0, s.bonusValue - amount) };
      }
      return s;
    }));
    triggerHrToast(lang === 'ar' ? 'تم حذف المكافأة بنجاح' : 'Bonus record deleted successfully!');
  };

  const handleDeleteDeduction = (id: string, empId: string, amount: number) => {
    setDeductionsList(prev => prev.filter(d => d.id !== id));
    setStaff(prev => prev.map(s => {
      if (s.id === empId) {
        return { ...s, deductValue: Math.max(0, s.deductValue - amount) };
      }
      return s;
    }));
    triggerHrToast(lang === 'ar' ? 'تم إلغاء الخصم بنجاح' : 'Deduction record removed successfully!');
  };

  const handleAddDisbursal = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDisbursalAmount <= 0) return;

    if (newDisbursalType === 'advance_carried' && !showInstallmentsModal) {
      const sum = installmentsDistribution?.reduce((s, x) => s + x.amount, 0) || 0;
      if (installmentsDistribution && installmentsDistribution.length > 0 && sum === newDisbursalAmount) {
        setShowInstallmentsModal(true);
        return;
      }

      // Prepare default split of 3 months following current date (2026-06-25)
      const dist = [];
      const today = new Date('2026-06-25');
      for (let i = 1; i <= 3; i++) {
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const monthStr = nextMonth.toISOString().substring(0, 7); // YYYY-MM
        dist.push({
          month: monthStr,
          amount: Math.round(newDisbursalAmount / 3)
        });
      }
      setInstallmentsDistribution(dist);
      setInstallmentMonths(3);
      setShowInstallmentsModal(true);
      return;
    }

    saveDisbursalData();
  };

  const saveDisbursalData = (customInstallments?: any[]) => {
    if (editingDisbursalId) {
      setDisbursalsList(prev => prev.map(d => {
        if (d.id === editingDisbursalId) {
          return {
            ...d,
            empId: newDisbursalEmp,
            type: newDisbursalType,
            safeName: newDisbursalSafe,
            amount: newDisbursalAmount,
            date: newDisbursalDate,
            salaryMonth: newDisbursalType === 'salary' ? newDisbursalSalaryMonth : undefined,
            installments: newDisbursalType === 'advance_carried' ? (customInstallments || installmentsDistribution) : undefined
          };
        }
        return d;
      }));
      triggerHrToast(lang === 'ar' ? 'تم تعديل إذن الصرف بنجاح' : 'Disbursal order updated successfully!');
    } else {
      const nextId = `DSB${disbursalsList.length + 1}`;
      setDisbursalsList([{
        id: nextId,
        empId: newDisbursalEmp,
        type: newDisbursalType,
        safeName: newDisbursalSafe,
        amount: newDisbursalAmount,
        date: newDisbursalDate,
        salaryMonth: newDisbursalType === 'salary' ? newDisbursalSalaryMonth : undefined,
        installments: newDisbursalType === 'advance_carried' ? (customInstallments || installmentsDistribution) : undefined
      }, ...disbursalsList]);
      triggerHrToast(lang === 'ar' ? 'تم إضافة إذن الصرف بنجاح' : 'Disbursal order added successfully!');
    }

    setShowDisbursalModal(false);
    setShowInstallmentsModal(false);
    setEditingDisbursalId(null);
    setNewDisbursalAmount(1000);
  };

  const startEditDisbursal = (dsb: any) => {
    setEditingDisbursalId(dsb.id);
    setNewDisbursalEmp(dsb.empId);
    setNewDisbursalType(dsb.type);
    setNewDisbursalSafe(dsb.safeName);
    setNewDisbursalAmount(dsb.amount);
    setNewDisbursalDate(dsb.date);
    if (dsb.salaryMonth) {
      setNewDisbursalSalaryMonth(dsb.salaryMonth);
    }
    if (dsb.installments) {
      setInstallmentsDistribution(dsb.installments);
      setInstallmentMonths(dsb.installments.length);
    }
    setShowDisbursalModal(true);
  };

  const handleDeleteDisbursal = (id: string) => {
    setDisbursalsList(prev => prev.filter(d => d.id !== id));
    triggerHrToast(lang === 'ar' ? 'تم حذف إذن الصرف بنجاح' : 'Disbursal order deleted successfully!');
  };

  // Add Dynamic advance / installments order split over multiple months
  const handleIssueAdvanceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLoanAmount <= 0) return;
    const monthlyAmt = Math.round(newLoanAmount / newLoanMonths);
    const nextId = `AO${advanceOrders.length + 1}`;
    const targetStaff = staff.find(s => s.id === newLoanEmp);
    const nameStr = targetStaff ? (lang === 'ar' ? targetStaff.nameAr : targetStaff.name) : 'Staff';

    setAdvanceOrders([{
      id: nextId,
      empId: newLoanEmp,
      loanAmount: newLoanAmount,
      monthlyDeduction: monthlyAmt,
      monthsTerm: newLoanMonths,
      paidMonths: 0,
      totalRepaid: 0,
      remMonths: newLoanMonths,
      type: newLoanType
    }, ...advanceOrders]);

    triggerHrToast(
      lang === 'ar' 
        ? `تم إصدار سلفة (${newLoanType}) لـ ${nameStr} بقيمة ${newLoanAmount.toLocaleString()} ج.م مقسمة على ${newLoanMonths} أشهر بقسط شهري ${monthlyAmt} ج.م.`
        : `Advance order issued: split ${newLoanAmount.toLocaleString()} EGP over ${newLoanMonths} months (${monthlyAmt} EGP/mo).`
    );
  };

  // Drag and drop parser biometrics file
  const handleImportDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setImportDragActive(true);
  };
  const handleImportDragLeave = () => {
    setImportDragActive(false);
  };
  const handleImportDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setImportDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setImportedFileText(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      triggerHrToast(lang === 'ar' ? `تم قراءة ملف بصمة البصمة وتطبيقه للورديات` : `Biometric logs imported dynamically into the attendance grid!`);
      // Simulate adding a multi-period record
      setAttendanceLogs(prev => [
        { id: `AL${prev.length+1}`, empId: 'EMP2', timeIn1: '08:50 AM', timeOut1: '12:00 PM', timeIn2: '01:00 PM', timeOut2: '05:00 PM', timeIn3: '--', timeOut3: '--', mode: 'Imported Biometrics File', status: 'On-Time Verified' },
        ...prev
      ]);
    }
  };

  const handleSimulateClockIn = (empId: string, type: 'Checked-In' | 'Absent') => {
    setStaff(prev => prev.map(s => {
      if (s.id === empId) {
        return { ...s, clockStatus: type };
      }
      return s;
    }));
    if (type === 'Checked-In') {
      setAttendanceLogs(prev => {
        const existingIdx = prev.findIndex(log => log.empId === empId);
        if (existingIdx !== -1) {
          const updated = [...prev];
          const log = { ...updated[existingIdx] };
          if (!log.timeIn1 || log.timeIn1 === '--') {
            log.timeIn1 = '09:02 AM';
          } else if (!log.timeIn2 || log.timeIn2 === '--') {
            log.timeIn2 = '01:05 PM';
          } else {
            log.timeIn3 = '05:00 PM';
          }
          log.status = lang === 'ar' ? 'فترة نشطة' : 'Active Period';
          updated[existingIdx] = log;
          return updated;
        } else {
          const nextId = `AL${prev.length + 1}`;
          return [
            { id: nextId, empId: empId, timeIn1: '09:02 AM', timeOut1: '--', timeIn2: '--', timeOut2: '--', timeIn3: '--', timeOut3: '--', mode: 'Manual Attendance System', status: 'Checked-In' },
            ...prev
          ];
        }
      });
      triggerHrToast(lang === 'ar' ? 'تم تسجيل حضور الموظف يدوياً' : 'Attendance verified & timestamped successfully!');
    } else {
      setAttendanceLogs(prev => {
        const existingIdx = prev.findIndex(log => log.empId === empId);
        if (existingIdx !== -1) {
          const updated = [...prev];
          const log = { ...updated[existingIdx] };
          if (log.timeIn1 && log.timeIn1 !== '--' && (!log.timeOut1 || log.timeOut1 === '--')) {
            log.timeOut1 = '05:00 PM';
          } else if (log.timeIn2 && log.timeIn2 !== '--' && (!log.timeOut2 || log.timeOut2 === '--')) {
            log.timeOut2 = '05:00 PM';
          } else {
            log.timeOut3 = '05:00 PM';
          }
          log.status = lang === 'ar' ? 'خارج الدوام' : 'Absent';
          updated[existingIdx] = log;
          return updated;
        }
        return prev;
      });
      triggerHrToast(lang === 'ar' ? 'تم تسجيل انصراف الموظف أو الغياب' : 'Clock status updated successfully!');
    }
  };

  const handleSaveManualAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAttendanceEmpId) {
      triggerHrToast(lang === 'ar' ? 'برجاء اختيار موظف أولاً' : 'Please select an employee first!');
      return;
    }

    const [hourStr, minStr] = manualAttendanceTime.split(':');
    const hour = parseInt(hourStr) || 0;
    const min = parseInt(minStr) || 0;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    const formattedHourStr = formattedHour < 10 ? `0${formattedHour}` : `${formattedHour}`;
    const formattedTime = `${formattedHourStr}:${min < 10 ? '0' + min : min} ${ampm}`;

    // Update staff check status
    setStaff(prev => prev.map(s => {
      if (s.id === manualAttendanceEmpId) {
        return { ...s, clockStatus: manualAttendanceType === 'in' ? 'Checked-In' : 'Absent' };
      }
      return s;
    }));

    setAttendanceLogs(prev => {
      const existingIdx = prev.findIndex(log => log.empId === manualAttendanceEmpId);
      if (existingIdx !== -1) {
        const updated = [...prev];
        const log = { ...updated[existingIdx] };
        
        if (manualAttendanceType === 'in') {
          if (!log.timeIn1 || log.timeIn1 === '--') {
            log.timeIn1 = formattedTime;
          } else if (!log.timeIn2 || log.timeIn2 === '--') {
            log.timeIn2 = formattedTime;
          } else {
            log.timeIn3 = formattedTime;
          }
          log.status = lang === 'ar' ? 'فترة نشطة' : 'Active Period';
        } else {
          if (log.timeIn1 && log.timeIn1 !== '--' && (!log.timeOut1 || log.timeOut1 === '--')) {
            log.timeOut1 = formattedTime;
          } else if (log.timeIn2 && log.timeIn2 !== '--' && (!log.timeOut2 || log.timeOut2 === '--')) {
            log.timeOut2 = formattedTime;
          } else {
            log.timeOut3 = formattedTime;
          }
          log.status = lang === 'ar' ? 'مكتمل الدوام' : 'Completed';
        }
        updated[existingIdx] = log;
        return updated;
      } else {
        const nextId = `AL${prev.length + 1}`;
        const newLog = {
          id: nextId,
          empId: manualAttendanceEmpId,
          timeIn1: manualAttendanceType === 'in' ? formattedTime : '--',
          timeOut1: manualAttendanceType === 'out' ? formattedTime : '--',
          timeIn2: '--',
          timeOut2: '--',
          timeIn3: '--',
          timeOut3: '--',
          mode: 'Manual Portal Log',
          status: manualAttendanceType === 'in' ? (lang === 'ar' ? 'حضور' : 'Active Regular') : (lang === 'ar' ? 'انصراف' : 'Checked Out')
        };
        return [newLog, ...prev];
      }
    });

    triggerHrToast(
      manualAttendanceType === 'in'
        ? (lang === 'ar' ? 'تم تسجيل حضور الموظف يدوياً بنجاح' : 'Employee attendance checked in successfully!')
        : (lang === 'ar' ? 'تم تسجيل انصراف الموظف يدوياً بنجاح' : 'Employee departure recorded successfully!')
    );

    setIsManualAttendanceOpen(false);
  };

  // Dynamic Real-time search query filter for Staff Profile Directory & Directory Cards
  const filteredStaff = staff.filter(emp => {
    // 1. General search query
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchGeneral = (
        emp.id.toLowerCase().includes(q) ||
        emp.name.toLowerCase().includes(q) ||
        (emp.nameAr && emp.nameAr.toLowerCase().includes(q)) ||
        emp.role.toLowerCase().includes(q) ||
        (emp.roleAr && emp.roleAr.toLowerCase().includes(q)) ||
        (emp.email && emp.email.toLowerCase().includes(q))
      );
      if (!matchGeneral) return false;
    }

    // 2. Name / ID column filter
    if (colSearchName) {
      const cnQuery = colSearchName.toLowerCase().trim();
      const matchName = (
        emp.id.toLowerCase().includes(cnQuery) ||
        emp.name.toLowerCase().includes(cnQuery) ||
        (emp.nameAr && emp.nameAr.toLowerCase().includes(cnQuery)) ||
        (emp.email && emp.email.toLowerCase().includes(cnQuery))
      );
      if (!matchName) return false;
    }

    // 3. Role Title column filter
    if (colSearchRole) {
      const crQuery = colSearchRole.toLowerCase().trim();
      const matchRole = (
        emp.role.toLowerCase().includes(crQuery) ||
        (emp.roleAr && emp.roleAr.toLowerCase().includes(crQuery))
      );
      if (!matchRole) return false;
    }

    // 4. Department column filter
    if (colSearchDept) {
      const cdQuery = colSearchDept.toLowerCase().trim();
      const dept = departments.find(d => d.id === emp.departmentId);
      const sect = sections.find(s => s.id === emp.sectionId);
      const grp = employeeGroups.find(g => g.id === emp.groupId);
      const matchDept = (
        (dept && (dept.nameEn.toLowerCase().includes(cdQuery) || dept.nameAr.toLowerCase().includes(cdQuery))) ||
        (sect && (sect.nameEn.toLowerCase().includes(cdQuery) || sect.nameAr.toLowerCase().includes(cdQuery))) ||
        (grp && (grp.nameEn.toLowerCase().includes(cdQuery) || grp.nameAr.toLowerCase().includes(cdQuery)))
      );
      if (!matchDept) return false;
    }

    // 4.5 Branch column filter
    if (colSearchBranch) {
      const cbQuery = colSearchBranch.toLowerCase().trim();
      const matchBranch = (
        (emp.bankBranchEn && emp.bankBranchEn.toLowerCase().includes(cbQuery)) ||
        (emp.bankBranchAr && emp.bankBranchAr.toLowerCase().includes(cbQuery))
      );
      if (!matchBranch) return false;
    }

    // 5. Salary column filter
    if (colSearchSalary) {
      const csQuery = colSearchSalary.toLowerCase().trim();
      const salText = String(emp.baseSalary);
      const totalSalText = String(emp.baseSalary + (emp.allowanceValue || 0));
      if (!salText.includes(csQuery) && !totalSalText.includes(csQuery)) return false;
    }

    // 6. Hire Date column filter
    if (colSearchHireDate) {
      const chQuery = colSearchHireDate.toLowerCase().trim();
      const hireDateText = emp.hireDate || '';
      if (!hireDateText.toLowerCase().includes(chQuery)) return false;
    }

    // 7. Status column filter
    if (colSearchStatus) {
      const cstQuery = colSearchStatus.toLowerCase().trim();
      const statusText = emp.clockStatus === 'Checked-In' ? (lang === 'ar' ? 'حاضر بالعمل' : 'clocked in') : (lang === 'ar' ? 'خارج الدوام' : 'absent');
      if (!statusText.toLowerCase().includes(cstQuery)) return false;
    }

    return true;
  });

  // Derive total pages and slice staff based on page configuration
  const totalPages = Math.ceil(filteredStaff.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedStaff = filteredStaff.slice(startIndex, startIndex + pageSize);

  // Derive total pages and slice attendance logs based on page configuration
  const filteredAttendanceLogs = attendanceLogs.filter(log => {
    const emp = staff.find(s => s.id === log.empId);
    const nameToSearch = emp ? (lang === 'ar' ? emp.nameAr : emp.name) : '';
    return nameToSearch.toLowerCase().includes(attendanceSearchTerm.toLowerCase());
  });
  const totalAttendancePages = Math.ceil(filteredAttendanceLogs.length / attendancePageSize) || 1;
  const attendanceStartIndex = (attendanceCurrentPage - 1) * attendancePageSize;
  const paginatedAttendanceLogs = filteredAttendanceLogs.slice(attendanceStartIndex, attendanceStartIndex + attendancePageSize);

  // Filtered organizational hierarchy lists
  const filteredDepts = departments.filter(d => {
    const term = searchDept.toLowerCase().trim();
    if (!term) return true;
    return d.nameAr.toLowerCase().includes(term) || d.nameEn.toLowerCase().includes(term) || d.managerAr.toLowerCase().includes(term) || d.managerEn.toLowerCase().includes(term) || d.id.toLowerCase().includes(term);
  });

  const filteredSections = sections.filter(s => {
    const term = searchSection.toLowerCase().trim();
    if (!term) return true;
    const parent = departments.find(d => d.id === s.deptId);
    const parentLabel = parent ? (lang === 'ar' ? parent.nameAr : parent.nameEn) : '';
    return s.nameAr.toLowerCase().includes(term) || s.nameEn.toLowerCase().includes(term) || s.id.toLowerCase().includes(term) || parentLabel.toLowerCase().includes(term);
  });

  const filteredJobTitles = jobTitles.filter(j => {
    const term = searchJobTitle.toLowerCase().trim();
    if (!term) return true;
    return j.titleAr.toLowerCase().includes(term) || j.titleEn.toLowerCase().includes(term) || j.grade.toLowerCase().includes(term) || j.id.toLowerCase().includes(term);
  });

  const filteredEmployeeGroups = employeeGroups.filter(g => {
    const term = searchEmpGroup.toLowerCase().trim();
    if (!term) return true;
    return g.nameAr.toLowerCase().includes(term) || g.nameEn.toLowerCase().includes(term) || g.id.toLowerCase().includes(term);
  });

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col min-h-[500px]">
      
      {/* Toast Alert Feedback */}
      <AnimatePresence>
        {hrToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#0a1945] border border-orange-500 text-white p-3.5 px-6 rounded-2xl shadow-xl flex items-center gap-3 text-xs md:text-sm font-semibold"
          >
            <Check className="text-orange-500 animate-bounce" size={18} strokeWidth={3} />
            <span>{hrToast}</span>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Primary HR layout active tab viewport */}
      <div className="w-full min-h-[500px]">
        
        {/* Dynamic Viewport View column */}
        <div className="w-full p-6 bg-slate-50/10">
          
          {/* TAB 1: Org Hierarchy Setup */}
          {activeMenu === 'org' && (
            <div className="space-y-6">
              
              {/* Introduction header */}
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-md font-bold text-[#0a1945] flex items-center gap-1.5">
                  <Layers className="text-orange-500" size={18} />
                  <span>{lang === 'ar' ? 'الهيكل الإداري والمجموعات' : 'Administrative Structures & Positions'}</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">{lang === 'ar' ? 'المستويات التنظيمية، الإدارات الرئيسية، الأقسام الفرعية والمسميات الإدارية لسهولة توزيع الصلاحيات ومسميات المرتبات.' : 'Structural hierarchy defining departments, sub-level units, administrative job titles and billing workgroups.'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1A. Departments form and table */}
                {(!maximizedBox || maximizedBox === 'dept') && (
                <div className={`bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4 flex flex-col justify-between ${maximizedBox === 'dept' ? 'col-span-1 md:col-span-2' : ''}`}>
                  <div>
                    <div className="flex items-center justify-between border-b pb-2.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[13.8px] font-black text-slate-700">{lang === 'ar' ? 'الإدارات الرئيسية' : 'Departments'}</h4>
                        <span className="bg-blue-50 text-[#0a1945] text-[11.5px] font-bold px-2 py-0.5 rounded border border-blue-105">{departments.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMaximizedBox(maximizedBox === 'dept' ? null : 'dept')}
                          className="p-1 border-[0.5px] border-[#dee1eb] hover:border-orange-500 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg transition duration-150 active:scale-95 cursor-pointer shadow-xs"
                          title="Maximize"
                        >
                          {maximizedBox === 'dept' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        </button>
                        <button 
                          type="button"
                          onClick={() => { setEditingItem(null); setAddDeptEn(''); setAddDeptAr(''); setAddDeptMgr(''); setActiveOrgModal('dept'); }}
                          className="text-[11.5px] font-extrabold bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg flex items-center gap-1 transition shadow-xs cursor-pointer"
                        >
                          <Plus size={12} strokeWidth={3} />
                          <span>{lang === 'ar' ? 'إضافة' : 'Add'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Search Box */}
                    <div className="pt-2">
                      <div className="relative w-full">
                        <Search className="absolute top-2.5 left-2.5 rtl:left-auto rtl:right-2.5 text-slate-400 pointer-events-none" size={12} />
                        <input 
                          type="text" 
                          value={searchDept} 
                          onChange={e => setSearchDept(e.target.value)} 
                          placeholder={lang === 'ar' ? 'البحث والتصفية...' : 'Search and filter...'} 
                          className="w-full h-8 pl-8 pr-3 rtl:pr-8 rtl:pl-3 text-[11.5px] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-orange-500 transition-all font-sans text-left rtl:text-right"
                        />
                        {searchDept && (
                          <button 
                            type="button" 
                            onClick={() => setSearchDept('')} 
                            className="absolute top-2 right-2.5 rtl:right-auto rtl:left-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-[480px] overflow-y-auto space-y-1.5 pt-3">
                      {filteredDepts.map(dept => (
                        <div
                          key={dept.id}
                          dir="ltr"
                          className="p-2 border border-slate-100 bg-slate-50/60 rounded-xl text-[12.7px] flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-1 bg-white border border-slate-100 shadow-xs rounded-lg p-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => startEditDept(dept)}
                              className="p-1 hover:bg-slate-50 text-blue-600 rounded-lg transition cursor-pointer"
                              title={lang === 'ar' ? 'تعديل' : 'Edit'}
                            >
                              <Edit2 size={10} strokeWidth={3} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDept(dept.id)}
                              className="p-1 hover:bg-slate-50 text-red-650 hover:text-red-700 rounded-lg transition cursor-pointer"
                              title={lang === 'ar' ? 'حذف' : 'Delete'}
                            >
                              <Trash2 size={10} strokeWidth={3} />
                            </button>
                          </div>
                          <div className="flex-1 text-right min-w-0">
                            <p className="font-bold text-slate-800">{lang === 'ar' ? dept.nameAr : dept.nameEn}</p>
                            <p className="text-[11.5px] text-slate-400 font-medium">Mgr: {lang === 'ar' ? dept.managerAr : dept.managerEn}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                )}

                {/* 1B. Sections form and table */}
                {(!maximizedBox || maximizedBox === 'section') && (
                <div className={`bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4 flex flex-col justify-between ${maximizedBox === 'section' ? 'col-span-1 md:col-span-2' : ''}`}>
                  <div>
                    <div className="flex items-center justify-between border-b pb-2.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[13.8px] font-black text-slate-700">{lang === 'ar' ? 'الاقسام' : 'Sections (Sub-Depts)'}</h4>
                        <span className="bg-[#0a1945]/5 text-[#0a1945] text-[11.5px] font-bold px-2 py-0.5 rounded border border-[#0a1945]/10">{sections.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMaximizedBox(maximizedBox === 'section' ? null : 'section')}
                          className="p-1 border-[0.5px] border-[#dee1eb] hover:border-orange-500 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg transition duration-150 active:scale-95 cursor-pointer shadow-xs"
                          title="Maximize"
                        >
                          {maximizedBox === 'section' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        </button>
                        <button 
                          type="button"
                          onClick={() => { setEditingItem(null); setAddSectEn(''); setAddSectAr(''); setAddSectDept(departments[0]?.id || 'D1'); setActiveOrgModal('section'); }}
                          className="text-[11.5px] font-extrabold bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg flex items-center gap-1 transition shadow-xs cursor-pointer"
                        >
                          <Plus size={12} strokeWidth={3} />
                          <span>{lang === 'ar' ? 'إضافة' : 'Add'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Search Box */}
                    <div className="pt-2">
                      <div className="relative w-full">
                        <Search className="absolute top-2.5 left-2.5 rtl:left-auto rtl:right-2.5 text-slate-400 pointer-events-none" size={12} />
                        <input 
                          type="text" 
                          value={searchSection} 
                          onChange={e => setSearchSection(e.target.value)} 
                          placeholder={lang === 'ar' ? 'البحث والتصفية...' : 'Search and filter...'} 
                          className="w-full h-8 pl-8 pr-3 rtl:pr-8 rtl:pl-3 text-[11.5px] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-orange-500 transition-all font-sans text-left rtl:text-right"
                        />
                        {searchSection && (
                          <button 
                            type="button" 
                            onClick={() => setSearchSection('')} 
                            className="absolute top-2 right-2.5 rtl:right-auto rtl:left-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-[480px] overflow-y-auto space-y-1.5 pt-3">
                      {filteredSections.map(sect => {
                        const parent = departments.find(d => d.id === sect.deptId);
                        return (
                          <div
                            key={sect.id}
                            dir="ltr"
                            className="p-2 border border-slate-100 bg-slate-50/60 rounded-xl text-[12.7px] flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-1 bg-white border border-slate-100 shadow-xs rounded-lg p-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => startEditSection(sect)}
                                className="p-1 hover:bg-slate-50 text-blue-600 rounded-lg transition cursor-pointer"
                                title={lang === 'ar' ? 'تعديل' : 'Edit'}
                              >
                                <Edit2 size={10} strokeWidth={3} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSection(sect.id)}
                                className="p-1 hover:bg-slate-50 text-red-650 hover:text-red-750 rounded-lg transition cursor-pointer"
                                title={lang === 'ar' ? 'حذف' : 'Delete'}
                              >
                                <Trash2 size={10} strokeWidth={3} />
                              </button>
                            </div>
                            <div className="flex-1 text-right min-w-0">
                              <p className="font-bold text-slate-800">{lang === 'ar' ? sect.nameAr : sect.nameEn}</p>
                              <p className="text-[11.5px] text-orange-500 font-semibold">{lang === 'ar' ? `تابع لـ: ${parent?.nameAr}` : `Under: ${parent?.nameEn}`}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                )}

                {/* 1C. Job Titles setup */}
                {(!maximizedBox || maximizedBox === 'title') && (
                <div className={`bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4 flex flex-col justify-between ${maximizedBox === 'title' ? 'col-span-1 md:col-span-2' : ''}`}>
                  <div>
                    <div className="flex items-center justify-between border-b pb-2.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[13.8px] font-black text-slate-700 w-[81.297px] text-center">{lang === 'ar' ? 'المسميات الوظيفيه' : 'Job Titles'}</h4>
                        <span className="bg-orange-50 text-orange-600 text-[11.5px] font-bold px-2 py-0.5 rounded border border-orange-100 -ml-[5px]">{jobTitles.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMaximizedBox(maximizedBox === 'title' ? null : 'title')}
                          className="p-1 border-[0.5px] border-[#dee1eb] hover:border-orange-500 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg transition duration-150 active:scale-95 cursor-pointer shadow-xs"
                          title="Maximize"
                        >
                          {maximizedBox === 'title' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        </button>
                        <button 
                          type="button"
                          onClick={() => { setEditingItem(null); setAddTitleEn(''); setAddTitleAr(''); setAddTitleGrade('A'); setActiveOrgModal('title'); }}
                          className="text-[11.5px] font-extrabold bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg flex items-center gap-1 transition shadow-xs cursor-pointer"
                        >
                          <Plus size={12} strokeWidth={3} />
                          <span>{lang === 'ar' ? 'إضافة' : 'Add'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Search Box */}
                    <div className="pt-2">
                      <div className="relative w-full">
                        <Search className="absolute top-2.5 left-2.5 rtl:left-auto rtl:right-2.5 text-slate-400 pointer-events-none" size={12} />
                        <input 
                          type="text" 
                          value={searchJobTitle} 
                          onChange={e => setSearchJobTitle(e.target.value)} 
                          placeholder={lang === 'ar' ? 'البحث والتصفية...' : 'Search and filter...'} 
                          className="w-full h-8 pl-8 pr-3 rtl:pr-8 rtl:pl-3 text-[11.5px] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-orange-500 transition-all font-sans text-left rtl:text-right"
                        />
                        {searchJobTitle && (
                          <button 
                            type="button" 
                            onClick={() => setSearchJobTitle('')} 
                            className="absolute top-2 right-2.5 rtl:right-auto rtl:left-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-[480px] overflow-y-auto space-y-1.5 pt-3">
                      {filteredJobTitles.map(jt => (
                        <div
                          key={jt.id}
                          dir="ltr"
                          className="p-2 border border-slate-100 bg-slate-50/60 rounded-xl text-[12.7px] flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-1 bg-white border border-slate-100 shadow-xs rounded-lg p-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => startEditTitle(jt)}
                              className="p-1 hover:bg-slate-50 text-blue-600 rounded-lg transition cursor-pointer"
                              title={lang === 'ar' ? 'تعديل' : 'Edit'}
                            >
                              <Edit2 size={10} strokeWidth={3} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteJobTitle(jt.id)}
                              className="p-1 hover:bg-slate-50 text-red-650 hover:text-red-750 rounded-lg transition cursor-pointer"
                              title={lang === 'ar' ? 'حذف' : 'Delete'}
                            >
                              <Trash2 size={10} strokeWidth={3} />
                            </button>
                          </div>
                          <div className="flex-1 text-right min-w-0">
                            <p className="font-bold text-slate-850">{lang === 'ar' ? jt.titleAr : jt.titleEn}</p>
                            <p className="text-[11.5px] text-slate-400 font-semibold">{lang === 'ar'? 'المستوى الوظيفي':'Grade Rank'}: <strong className="text-orange-500">{jt.grade}</strong></p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                )}

                {/* 1D. Employee Groups layout */}
                {(!maximizedBox || maximizedBox === 'group') && (
                <div className={`bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4 flex flex-col justify-between ${maximizedBox === 'group' ? 'col-span-1 md:col-span-2' : ''}`}>
                  <div>
                    <div className="flex items-center justify-between border-b pb-2.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[13.8px] font-black text-slate-700 text-center w-[75.75px]">{lang === 'ar' ? 'مجموعات الموظفين' : 'Employee Groups'}</h4>
                        <span className="bg-indigo-50 text-indigo-600 text-[11.5px] font-bold px-2 py-0.5 rounded border border-indigo-100">{employeeGroups.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMaximizedBox(maximizedBox === 'group' ? null : 'group')}
                          className="p-1 border-[0.5px] border-[#dee1eb] hover:border-orange-500 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg transition duration-150 active:scale-95 cursor-pointer shadow-xs"
                          title="Maximize"
                        >
                          {maximizedBox === 'group' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        </button>
                        <button 
                          type="button"
                          onClick={() => { setEditingItem(null); setAddGroupEn(''); setAddGroupAr(''); setAddGroupColor('bg-blue-500'); setActiveOrgModal('group'); }}
                          className="text-[11.5px] font-extrabold bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg flex items-center gap-1 transition shadow-xs cursor-pointer"
                        >
                          <Plus size={12} strokeWidth={3} />
                          <span>{lang === 'ar' ? 'إضافة' : 'Add'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Search Box */}
                    <div className="pt-2">
                      <div className="relative w-full">
                        <Search className="absolute top-2.5 left-2.5 rtl:left-auto rtl:right-2.5 text-slate-400 pointer-events-none" size={12} />
                        <input 
                          type="text" 
                          value={searchEmpGroup} 
                          onChange={e => setSearchEmpGroup(e.target.value)} 
                          placeholder={lang === 'ar' ? 'البحث والتصفية...' : 'Search and filter...'} 
                          className="w-full h-8 pl-8 pr-3 rtl:pr-8 rtl:pl-3 text-[11.5px] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-orange-500 transition-all font-sans text-left rtl:text-right"
                        />
                        {searchEmpGroup && (
                          <button 
                            type="button" 
                            onClick={() => setSearchEmpGroup('')} 
                            className="absolute top-2 right-2.5 rtl:right-auto rtl:left-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>


                    <div className="max-h-[480px] overflow-y-auto space-y-1.5 pt-3 pr-1">
                      {filteredEmployeeGroups.map(grp => (
                        <div
                          key={grp.id}
                          dir="ltr"
                          className="p-2.5 border border-slate-100 bg-slate-50/60 rounded-xl flex items-center justify-between gap-2 text-[13.8px]"
                        >
                          <div className="flex items-center gap-1 bg-white border border-slate-100 shadow-xs rounded-lg p-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => startEditGroup(grp)}
                              className="p-1 hover:bg-slate-50 text-blue-600 rounded-lg transition cursor-pointer"
                              title={lang === 'ar' ? 'تعديل' : 'Edit'}
                            >
                              <Edit2 size={10} strokeWidth={3} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteGroup(grp.id)}
                              className="p-1 hover:bg-slate-50 text-red-650 hover:text-red-750 rounded-lg transition cursor-pointer"
                              title={lang === 'ar' ? 'حذف' : 'Delete'}
                            >
                              <Trash2 size={10} strokeWidth={3} />
                            </button>
                          </div>
                          <div className="flex items-center justify-end gap-2 min-w-0 flex-1">
                            <span className="font-extrabold text-slate-700 truncate text-right">{lang === 'ar' ? grp.nameAr : grp.nameEn}</span>
                            <span className={cn("w-3 h-3 rounded-full shrink-0", grp.color)} />
                          </div>
                        </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                  {/* 5C. Allowances & Deductions dynamic setup */}
                {(!maximizedBox || maximizedBox === 'fin') && (
                <div className={`bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4 flex flex-col justify-between ${maximizedBox === 'fin' ? 'col-span-1 md:col-span-2' : ''}`}>
                  <div>
                    <div className="flex items-center justify-between border-b pb-2.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[13.8px] font-black text-slate-700">{lang === 'ar' ? 'بدلات + خصومات' : 'Financial Settings (Allowances & Deductions)'}</h4>
                        <span className="bg-[#0a1945]/5 text-[#0a1945] text-[11.5px] font-bold px-2 py-0.5 rounded border border-[#0a1945]/10 -ml-[5px]">{financialSettings.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMaximizedBox(maximizedBox === 'fin' ? null : 'fin')}
                          className="p-1 border-[0.5px] border-[#dee1eb] hover:border-orange-500 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg transition duration-150 active:scale-95 cursor-pointer shadow-xs"
                          title="Maximize"
                        >
                          {maximizedBox === 'fin' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        </button>
                        <button 
                          type="button"
                          onClick={() => { setEditingFinItem(null); setFinType('Allowance'); setFinNameEn(''); setFinNameAr(''); setFinAmount(150); setActiveFinModal(true); }}
                          className="text-[11.5px] font-extrabold bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg flex items-center gap-1 transition shadow-xs cursor-pointer"
                        >
                          <Plus size={12} strokeWidth={3} />
                          <span>{lang === 'ar' ? 'إضافة' : 'Add'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-2.5">
                      <div className="relative">
                        <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                          type="text"
                          value={searchFinItem}
                          onChange={(e) => setSearchFinItem(e.target.value)}
                          placeholder={lang === 'ar' ? 'بحث في العناصر المالية...' : 'Search financial settings...'}
                          className="w-full text-xs p-2 pl-9 pr-3.5 rtl:pr-9 rtl:pl-3.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 transition font-sans"
                        />
                        {searchFinItem && (
                          <button 
                            type="button" 
                            onClick={() => setSearchFinItem('')} 
                            className="absolute top-2 right-2.5 rtl:right-auto rtl:left-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-[480px] overflow-y-auto space-y-2 pt-3">
                      {financialSettings.filter(item => {
                        const q = searchFinItem.toLowerCase();
                        return item.nameAr.toLowerCase().includes(q) || item.nameEn.toLowerCase().includes(q);
                      }).map(item => (
                        <div
                          key={item.id}
                          dir="ltr"
                          className="p-2.5 border border-slate-100 bg-slate-50/60 rounded-xl flex items-center justify-between gap-2 text-[12.7px]"
                        >
                          <div className="flex items-center gap-1 bg-white border border-slate-100 shadow-xs rounded-lg p-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => startEditFin(item)}
                              className="p-1 hover:bg-slate-50 text-blue-600 rounded-lg transition cursor-pointer"
                              title={lang === 'ar' ? 'تعديل' : 'Edit'}
                            >
                              <Edit2 size={10} strokeWidth={3} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteFin(item.id)}
                              className="p-1 hover:bg-slate-50 text-red-650 hover:text-red-750 rounded-lg transition cursor-pointer"
                              title={lang === 'ar' ? 'حذف' : 'Delete'}
                            >
                              <Trash2 size={10} strokeWidth={3} />
                            </button>
                          </div>
                          <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
                            <div className="min-w-0">
                              <p className="font-extrabold text-slate-800">{lang === 'ar' ? item.nameAr : item.nameEn}</p>
                              <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] font-semibold">
                                <span className="text-slate-500 font-mono font-bold">
                                  {item.amount.toLocaleString()} EGP
                                </span>
                                <span className={cn(
                                  "px-1.5 py-0.3 rounded border font-bold text-[9px]",
                                  item.type === 'Allowance'
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-150"
                                    : "bg-rose-50 text-rose-650 border-red-150"
                                )}>
                                  {item.type === 'Allowance'
                                    ? (lang === 'ar' ? 'بدلات (تضاف)' : 'Allowance (+)')
                                    : (lang === 'ar' ? 'خصومات (تخصم)' : 'Deduction (-)')}
                                </span>
                              </div>
                            </div>
                            <span className={cn(
                              "w-3 h-3 rounded-full shrink-0",
                              item.type === 'Allowance' ? 'bg-emerald-500' : 'bg-rose-500'
                            )} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                )}

                {/* 1E. Public Holidays & Vacations */}
                {(!maximizedBox || maximizedBox === 'holiday') && (
                <div className={`bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4 flex flex-col justify-between ${maximizedBox === 'holiday' ? 'col-span-1 md:col-span-2' : ''}`}>
                  <div>
                    <div className="flex items-center justify-between border-b pb-2.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[13.8px] font-black text-slate-700">{lang === 'ar' ? 'الاجازات الرسميه' : 'Public & Corporate Holidays'}</h4>
                        <span className="bg-orange-50 text-orange-600 text-[11.5px] font-bold px-2 py-0.5 rounded border border-orange-100">{publicHolidays.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMaximizedBox(maximizedBox === 'holiday' ? null : 'holiday')}
                          className="p-1 border-[0.5px] border-[#dee1eb] hover:border-orange-500 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg transition duration-150 active:scale-95 cursor-pointer shadow-xs"
                          title="Maximize"
                        >
                          {maximizedBox === 'holiday' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        </button>
                        <button 
                          type="button"
                          onClick={() => { setEditingHolidayItem(null); setHolidayNameEn(''); setHolidayNameAr(''); setHolidayDate('2026-06-16'); setActiveHolidayModal(true); }}
                          className="text-[11.5px] font-extrabold bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg flex items-center gap-1 transition shadow-xs cursor-pointer"
                        >
                          <Plus size={12} strokeWidth={3} />
                          <span>{lang === 'ar' ? 'إضافة' : 'Add'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-2.5">
                      <div className="relative">
                        <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                          type="text"
                          value={searchHoliday}
                          onChange={(e) => setSearchHoliday(e.target.value)}
                          placeholder={lang === 'ar' ? 'بحث في الإجازات والأعياد...' : 'Search holidays...'}
                          className="w-full text-xs p-2 pl-9 pr-3.5 rtl:pr-9 rtl:pl-3.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 transition font-sans"
                        />
                        {searchHoliday && (
                          <button 
                            type="button" 
                            onClick={() => setSearchHoliday('')} 
                            className="absolute top-2 right-2.5 rtl:right-auto rtl:left-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-[480px] overflow-y-auto space-y-2 pt-3">
                      {publicHolidays.filter(item => {
                        const q = searchHoliday.toLowerCase();
                        return item.nameAr.toLowerCase().includes(q) || item.nameEn.toLowerCase().includes(q);
                      }).map(item => (
                        <div
                          key={item.id}
                          dir="ltr"
                          className="p-2.5 border border-slate-100 bg-slate-50/60 rounded-xl flex items-center justify-between gap-2 text-[12.7px]"
                        >
                          <div className="flex items-center gap-1 bg-white border border-slate-100 shadow-xs rounded-lg p-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => startEditHoliday(item)}
                              className="p-1 hover:bg-slate-50 text-blue-600 rounded-lg transition cursor-pointer"
                              title={lang === 'ar' ? 'تعديل' : 'Edit'}
                            >
                              <Edit2 size={10} strokeWidth={3} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteHoliday(item.id)}
                              className="p-1 hover:bg-slate-50 text-red-650 hover:text-red-750 rounded-lg transition cursor-pointer"
                              title={lang === 'ar' ? 'حذف' : 'Delete'}
                            >
                              <Trash2 size={10} strokeWidth={3} />
                            </button>
                          </div>
                          <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
                            <div className="min-w-0">
                              <p className="font-extrabold text-slate-800">{lang === 'ar' ? item.nameAr : item.nameEn}</p>
                              <p className="text-[9px] text-slate-400 font-mono font-bold mt-0.5">{item.date}</p>
                            </div>
                            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                )}

              </div>

              {/* Dynamic Pop-up Modal for Holidays Settings */}
              <AnimatePresence>
                {activeHolidayModal && (
                  <div className="fixed inset-0 bg-[#0a1945]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0, y: -40 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.95, opacity: 0, y: -40 }}
                      className="bg-white border border-slate-105 rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full text-xs select-none"
                    >
                      {/* Modal header */}
                      <div className="flex items-center justify-between bg-orange-500 text-white px-5" style={{ height: '56px' }}>
                        <h3 className="text-xs font-black text-white flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-white" />
                          <span>
                            {editingHolidayItem 
                              ? (lang === 'ar' ? 'تعديل الإجازة الرسمية' : 'Edit Public Holiday') 
                              : (lang === 'ar' ? 'إضافة إجازة رسمية جديدة' : 'Add New Public Holiday')}
                          </span>
                        </h3>
                        <button 
                          type="button"
                          onClick={() => { setEditingHolidayItem(null); setActiveHolidayModal(false); }}
                          className="text-white hover:text-orange-100 p-1.5 rounded-lg hover:bg-orange-600 transition cursor-pointer"
                        >
                          <X size={14} strokeWidth={2.5} />
                        </button>
                      </div>

                      <div className="p-6 space-y-4">
                      {/* Modal Body Form */}
                      <form onSubmit={handleSaveHoliday} className="space-y-4 text-left rtl:text-right">
                        
                        {/* Name - Generic */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1 rtl:text-right text-left">
                            {lang === 'ar' ? 'المسمى' : 'Name'}
                          </label>
                          <input 
                            type="text" 
                            value={holidayNameAr} 
                            onChange={e => {
                              setHolidayNameAr(e.target.value);
                              setHolidayNameEn(e.target.value);
                            }} 
                            placeholder={lang === 'ar' ? 'مثال: ثورة الأحرار' : 'e.g. Revolution Day'} 
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500/50 focus:bg-white transition text-xs font-semibold text-slate-800" 
                            required 
                          />
                        </div>

                        {/* Target Date */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1 rtl:text-right text-left">
                            {lang === 'ar' ? 'يوم الإجازة المحدد' : 'Selected Vacation Day'}
                          </label>
                          <input 
                            type="date" 
                            value={holidayDate} 
                            onChange={e => setHolidayDate(e.target.value)} 
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500/50 focus:bg-white transition text-xs font-bold font-mono text-slate-800"
                            required 
                          />
                        </div>

                        {/* Footer buttons */}
                        <div className="flex items-center gap-2 pt-2">
                          <button type="submit" className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-lg text-xs transition cursor-pointer">
                            {lang === 'ar' 
                              ? (editingHolidayItem ? 'تعديل وحفظ' : 'حفظ الإجازة') 
                              : (editingHolidayItem ? 'Update Holiday' : 'Save Holiday')}
                          </button>
                          <button 
                            type="button" 
                            onClick={() => { setEditingHolidayItem(null); setActiveHolidayModal(false); }} 
                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-lg text-xs transition cursor-pointer"
                          >
                            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                        </div>

                      </form>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Dynamic Pop-up Modal for Financial Settings */}
              <AnimatePresence>
                {activeFinModal && (
                  <div className="fixed inset-0 bg-[#0a1945]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0, y: -40 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.95, opacity: 0, y: -40 }}
                      className="bg-white border border-slate-105 rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full text-xs select-none"
                    >
                      {/* Modal header */}
                      <div className="flex items-center justify-between bg-orange-500 text-white px-5" style={{ height: '56px' }}>
                        <h3 className="text-xs font-black text-white flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-white" />
                          <span>
                            {editingFinItem 
                              ? (lang === 'ar' ? 'تعديل البند المالي' : 'Edit Financial Setup Item') 
                              : (lang === 'ar' ? 'إضافة بند مالي جديد' : 'Add Financial Setup Item')}
                          </span>
                        </h3>
                        <button 
                          type="button"
                          onClick={() => { setEditingFinItem(null); setActiveFinModal(false); }}
                          className="text-white hover:text-orange-100 p-1.5 rounded-lg hover:bg-orange-600 transition cursor-pointer"
                        >
                          <X size={14} strokeWidth={2.5} />
                        </button>
                      </div>

                      <div className="p-6 space-y-4">
                      {/* Modal Body Form */}
                      <form onSubmit={handleSaveFinItem} className="space-y-4 text-left rtl:text-right">
                        
                        {/* Choice Selector between Allowance and Deduction */}
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-2 rtl:text-right text-left">
                            {lang === 'ar' ? 'نوع البند المالي' : 'Financial Item Category'}
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setFinType('Allowance')}
                              className={cn(
                                "py-2.5 px-3 rounded-lg border font-bold text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer",
                                finType === 'Allowance'
                                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-extrabold"
                                  : "border-slate-200 hover:bg-slate-50 text-slate-500"
                              )}
                            >
                              <span className="text-xs font-black">
                                {lang === 'ar' ? 'بدلات (تضاف للراتب)' : 'Allowance (Add)'}
                              </span>
                              <span className="text-[9px] opacity-75">
                                {lang === 'ar' ? 'تُصرف مع المرتب' : 'Allowance'}
                              </span>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => setFinType('Deduction')}
                              className={cn(
                                "py-2.5 px-3 rounded-lg border font-bold text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer",
                                finType === 'Deduction'
                                  ? "border-rose-500 bg-rose-50 text-rose-700 font-extrabold"
                                  : "border-slate-200 hover:bg-slate-50 text-slate-500"
                              )}
                            >
                              <span className="text-xs font-black">
                                {lang === 'ar' ? 'خصومات (تخصم من الراتب)' : 'Deduction (Deduct)'}
                              </span>
                              <span className="text-[9px] opacity-75">
                                {lang === 'ar' ? 'تُستقطع جزائياً' : 'Deduction'}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Name (Mسمى) - En */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1 rtl:text-right text-left">
                            {lang === 'ar' ? 'المسمى بالإنجليزية' : 'Name (English)'}
                          </label>
                          <input 
                            type="text" 
                            value={finNameEn} 
                            onChange={e => setFinNameEn(e.target.value)} 
                            placeholder="e.g. Health Insurance Plan" 
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500/50 focus:bg-white transition text-xs font-semibold text-slate-800" 
                            required 
                          />
                        </div>

                        {/* Name (Mسمى) - Ar */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1 rtl:text-right text-left">
                            {lang === 'ar' ? 'المسمى بالعربية' : 'Name (Arabic)'}
                          </label>
                          <input 
                            type="text" 
                            value={finNameAr} 
                            onChange={e => setFinNameAr(e.target.value)} 
                            placeholder="مثال: خصم التأمين الطبي" 
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500/50 focus:bg-white transition text-xs font-semibold text-slate-800" 
                            required 
                          />
                        </div>

                        {/* Value (القيمة) */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1 rtl:text-right text-left">
                            {lang === 'ar' ? 'القيمة المالية (ج.م)' : 'Value (EGP)'}
                          </label>
                          <input 
                            type="number" 
                            value={finAmount || ''} 
                            onChange={e => setFinAmount(parseFloat(e.target.value) || 0)} 
                            placeholder="e.g. 200" 
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500/50 focus:bg-white transition text-xs font-bold font-mono text-slate-800"
                            required 
                          />
                        </div>

                        {/* Footer buttons */}
                        <div className="flex items-center gap-2 pt-2">
                          <button type="submit" className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-lg text-xs transition cursor-pointer">
                            {lang === 'ar' 
                              ? (editingFinItem ? 'تعديل وحفظ' : 'حفظ البند المالي') 
                              : (editingFinItem ? 'Update Financial Item' : 'Save Item')}
                          </button>
                          <button 
                            type="button" 
                            onClick={() => { setEditingFinItem(null); setActiveFinModal(false); }} 
                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-lg text-xs transition cursor-pointer"
                          >
                            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                        </div>

                      </form>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Dynamic Pop-up Modal for Organization Hierarchy */}
              <AnimatePresence>
                {activeOrgModal && (
                  <div className="fixed inset-0 bg-[#0a1945]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full text-xs select-none"
                    >
                      {/* Modal header */}
                      <div className="flex items-center justify-between bg-orange-500 text-white px-5" style={{ height: '56px' }}>
                        <h3 className="text-xs font-black text-white flex items-center gap-2">
                          <Layers className="w-5 h-5" />
                          <span>
                            {activeOrgModal === 'dept' && (
                              editingItem 
                                ? (lang === 'ar' ? 'تعديل الإدارة الرئيسية' : 'Edit Department') 
                                : (lang === 'ar' ? 'إضافة إدارة جديدة' : 'Add New Department')
                            )}
                            {activeOrgModal === 'section' && (
                              editingItem 
                                ? (lang === 'ar' ? 'تعديل القسم الفرعي' : 'Edit Section (Sub-Dept)') 
                                : (lang === 'ar' ? 'إضافة قسم فرعي جديد' : 'Add New Section')
                            )}
                            {activeOrgModal === 'title' && (
                              editingItem 
                                ? (lang === 'ar' ? 'تعديل المسمى الوظيفي' : 'Edit Job Title') 
                                : (lang === 'ar' ? 'إضافة مسمى وظيفي جديد' : 'Add Job Title')
                            )}
                            {activeOrgModal === 'group' && (
                              editingItem 
                                ? (lang === 'ar' ? 'تعديل مجموعة الموظفين' : 'Edit Employee Group') 
                                : (lang === 'ar' ? 'إضافة مجموعة موظفين جديدة' : 'Add Employee Group')
                            )}
                          </span>
                        </h3>
                        <button 
                          type="button"
                          onClick={() => { setEditingItem(null); setActiveOrgModal(null); }}
                          className="text-white hover:text-orange-100 p-1.5 rounded-lg hover:bg-orange-600 transition cursor-pointer"
                        >
                          <X size={14} strokeWidth={2.5} />
                        </button>
                      </div>

                      <div className="p-6 space-y-4">
                        {/* Modal Body Forms */}
                        {activeOrgModal === 'dept' && (
                          <form onSubmit={handleCreateDept} className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 rtl:text-right text-left">{lang === 'ar' ? 'الاسم' : 'Name'}</label>
                            <input type="text" value={addDeptAr} onChange={e=>{setAddDeptAr(e.target.value); setAddDeptEn(e.target.value);}} placeholder={lang === 'ar' ? 'مثال: المبيعات' : 'e.g. Sales'} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500/50 focus:bg-white transition text-xs" required />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 rtl:text-right text-left">{lang === 'ar' ? 'مدير الإدارة المسئول' : 'Department Manager'}</label>
                            <input type="text" value={addDeptMgr} onChange={e=>setAddDeptMgr(e.target.value)} placeholder={lang === 'ar' ? 'مثال: حازم سليمان' : 'Manager Name'} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500/50 focus:bg-white transition text-xs" />
                          </div>
                          
                          {/* Footer buttons */}
                          <div className="flex items-center gap-2 pt-2">
                            <button type="submit" className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-lg text-xs transition cursor-pointer">
                              {lang === 'ar' 
                                ? (editingItem ? 'تعديل وحفظ' : 'حفظ البيانات') 
                                : (editingItem ? 'Update Department' : 'Save Department')}
                            </button>
                            <button type="button" onClick={() => { setEditingItem(null); setActiveOrgModal(null); }} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-lg text-xs transition cursor-pointer">
                              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                            </button>
                          </div>
                        </form>
                      )}

                      {activeOrgModal === 'section' && (
                        <form onSubmit={handleCreateSection} className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 rtl:text-right text-left">{lang === 'ar' ? 'الاسم' : 'Name'}</label>
                            <input type="text" value={addSectAr} onChange={e=>{setAddSectAr(e.target.value); setAddSectEn(e.target.value);}} placeholder={lang === 'ar' ? 'مثال: الخدمة السريعة' : 'e.g. Retail Branches'} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500/50 focus:bg-white transition text-xs" required />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 rtl:text-right text-left">{lang === 'ar' ? 'الإدارة التابع لها' : 'Parent Department'}</label>
                            <select value={addSectDept} onChange={e=>setAddSectDept(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500/50 focus:bg-white transition text-xs">
                              {departments.map(d=>(
                                <option key={d.id} value={d.id}>{lang === 'ar' ? d.nameAr : d.nameEn}</option>
                              ))}
                            </select>
                          </div>

                          {/* Footer buttons */}
                          <div className="flex items-center gap-2 pt-2">
                            <button type="submit" className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-lg text-xs transition cursor-pointer">
                              {lang === 'ar' 
                                ? (editingItem ? 'تعديل وحفظ' : 'حفظ البيانات') 
                                : (editingItem ? 'Update Section' : 'Save Section')}
                            </button>
                            <button type="button" onClick={() => { setEditingItem(null); setActiveOrgModal(null); }} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-lg text-xs transition cursor-pointer">
                              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                            </button>
                          </div>
                        </form>
                      )}

                      {activeOrgModal === 'title' && (
                        <form onSubmit={handleCreateTitle} className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 rtl:text-right text-left">{lang === 'ar' ? 'الاسم' : 'Title'}</label>
                            <input type="text" value={addTitleAr} onChange={e=>{setAddTitleAr(e.target.value); setAddTitleEn(e.target.value);}} placeholder={lang === 'ar' ? 'مثال: مشرف فرع' : 'e.g. Branch Supervisor'} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500/50 focus:bg-white transition text-xs" required />
                          </div>

                          {/* Footer buttons */}
                          <div className="flex items-center gap-2 pt-2">
                            <button type="submit" className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-lg text-xs transition cursor-pointer">
                              {lang === 'ar' 
                                ? (editingItem ? 'تعديل وحفظ' : 'حفظ البيانات') 
                                : (editingItem ? 'Update Job Title' : 'Save Title')}
                            </button>
                            <button type="button" onClick={() => { setEditingItem(null); setActiveOrgModal(null); }} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-lg text-xs transition cursor-pointer">
                              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                            </button>
                          </div>
                        </form>
                      )}

                      {activeOrgModal === 'group' && (
                        <form onSubmit={handleCreateGroup} className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 rtl:text-right text-left">{lang === 'ar' ? 'الاسم' : 'Group Name'}</label>
                            <input type="text" value={addGroupAr} onChange={e=>{setAddGroupAr(e.target.value); setAddGroupEn(e.target.value);}} placeholder={lang === 'ar' ? 'مثال: موظفي التسويق' : 'e.g. Sales Staff'} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500/50 focus:bg-white transition text-xs" required />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 rtl:text-right text-left">{lang === 'ar' ? 'اللون المميز' : 'Highlight Color'}</label>
                            <div className="grid grid-cols-4 gap-2 pt-1">
                              {[
                                { class: 'bg-blue-500', name: lang === 'ar' ? 'أزرق' : 'Blue' },
                                { class: 'bg-orange-500', name: lang === 'ar' ? 'برتقالي' : 'Orange' },
                                { class: 'bg-indigo-500', name: lang === 'ar' ? 'بنفسجي' : 'Indigo' },
                                { class: 'bg-rose-500', name: lang === 'ar' ? 'وردي' : 'Rose' },
                              ].map(colorOpt => (
                                <button
                                  key={colorOpt.class}
                                  type="button"
                                  onClick={() => setAddGroupColor(colorOpt.class)}
                                  className={cn(
                                    "p-2 rounded-lg border flex flex-col items-center gap-1 transition-all text-[9px] font-black cursor-pointer",
                                    addGroupColor === colorOpt.class ? "border-[#0a1945] bg-[#0a1945]/5" : "border-slate-100 hover:bg-slate-50 text-slate-400"
                                  )}
                                >
                                  <span className={cn("w-3 h-3 rounded-full", colorOpt.class)} />
                                  <span>{colorOpt.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Footer buttons */}
                          <div className="flex items-center gap-2 pt-2">
                            <button type="submit" className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-lg text-xs transition cursor-pointer">
                              {lang === 'ar' 
                                ? (editingItem ? 'تعديل وحفظ' : 'حفظ البيانات') 
                                : (editingItem ? 'Update Group' : 'Save Group')}
                            </button>
                            <button type="button" onClick={() => { setEditingItem(null); setActiveOrgModal(null); }} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-lg text-xs transition cursor-pointer">
                              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                            </button>
                          </div>
                        </form>
                      )}
                      </div>

                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {activeMenu === 'directory' && (
            <div className="space-y-6">
              
              {/* Stylish and elegant Header Section */}
              <div className="bg-gradient-to-r from-slate-50 to-orange-50/30 p-5 rounded-2xl border border-slate-200/65 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-[22px] -mt-[10px] md:h-[93.5px] h-auto">
                <div className="rtl:text-right text-left pb-1">
                  <span className="bg-orange-500 text-white font-extrabold text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full">
                    {lang === 'ar' ? 'سجل طاقم العمل' : 'Staff Directory'}
                  </span>
                  <h3 className="text-md md:text-lg font-black text-[#0a1945] mt-1.5 flex items-center gap-2">
                    <Users className="text-orange-500 animate-pulse" size={19} />
                    <span>{lang === 'ar' ? 'ملفات طاقم العمل والموظفين' : 'Staff Registry & Profile Directory'}</span>
                  </h3>
                  <p className="text-slate-500 text-xs mt-1 max-w-xl font-medium leading-relaxed">
                    {lang === 'ar' 
                      ? 'انشاء ملفات الموظفين الجدد وتحديد الادارات والاقسام' 
                      : 'Create new employee profiles and assign departments & sections'}
                  </p>
                </div>

                {/* Summary Badges and Actions on the right */}
                <div className="flex flex-col gap-2.5 shrink-0 w-full md:w-[280px]">
                  {/* Total Employees Card */}
                  <div className="bg-orange-50 border border-orange-100 py-2.5 px-4 rounded-xl text-center font-sans w-full">
                    <span className="block text-[10px] uppercase tracking-wider font-extrabold text-orange-500">{lang === 'ar' ? 'إجمالي الموظفين' : 'Total Employees'}</span>
                    <span className="text-base font-black text-orange-600 font-mono mt-0.5 block leading-none">
                      {filteredStaff.length}
                    </span>
                  </div>
                  
                  {/* Add Employee — under total, inside header strip */}
                  <div className="hidden md:flex items-center w-full">
                    <button 
                      onClick={openAddEmployeeModal}
                      className="w-full h-[36px] bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs uppercase tracking-wider"
                    >
                      <UserPlus size={15} />
                      <span className="text-[10px] whitespace-nowrap">{lang === 'ar' ? 'إضافة موظف' : 'Add Employee'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile Actions Panel (Search, Add, Filter/View/Columns) */}
              <div className="flex md:hidden flex-col gap-3 mb-4 mt-2">
                {/* 1. Search */}
                <div className="relative w-full">
                  <Search size={16} className="absolute left-3 rtl:right-3 rtl:left-auto text-slate-400 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={lang === 'ar' ? 'البحث بالاسم، الكود، البريد...' : 'Search by name, ID...'}
                    className="w-full text-sm p-3 pl-10 pr-10 rtl:pr-10 rtl:pl-10 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-400 transition shadow-sm h-[44px]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 -translate-y-1/2 p-1 text-slate-450 hover:text-orange-500 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* 2. Add Employee */}
                <button 
                  onClick={openAddEmployeeModal}
                  className="w-full h-[44px] bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm uppercase tracking-wider"
                >
                  <UserPlus size={18} />
                  <span>{lang === 'ar' ? 'إضافة موظف' : 'Add Employee'}</span>
                </button>

                {/* 3. Filter, View Mode, Columns Setup */}
                <div className="flex items-center justify-between gap-2 w-full">
                  {/* Filter */}
                  <button
                    onClick={handleToggleColumnFilters}
                    className={cn(
                      "flex-1 h-[44px] text-xs font-black rounded-lg border transition flex items-center justify-center gap-1.5 cursor-pointer select-none shadow-sm",
                      isColumnFiltersOpen 
                        ? "bg-[#0a1945] text-white border-[#0a1945]" 
                        : "bg-white text-black border-slate-200 hover:border-orange-400 hover:text-orange-500"
                    )}
                  >
                    <Filter size={15} className={isColumnFiltersOpen ? "text-white" : "text-orange-500"} />
                    <span>{lang === 'ar' ? 'تصفية' : 'Filter'}</span>
                  </button>
                  
                  {/* View Mode */}
                  <button
                    onClick={() => setDirViewMode(dirViewMode === 'table' ? 'kanban' : 'table')}
                    className="flex-1 h-[44px] text-xs font-black bg-white border border-slate-200 hover:border-orange-400 hover:text-orange-500 text-slate-700 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer select-none shadow-sm"
                  >
                    {dirViewMode === 'table' ? (
                      <>
                        <LayoutGrid size={15} className="text-orange-500" />
                        <span>{lang === 'ar' ? 'بطاقات' : 'Cards'}</span>
                      </>
                    ) : (
                      <>
                        <List size={15} className="text-orange-500" />
                        <span>{lang === 'ar' ? 'جدول' : 'Table'}</span>
                      </>
                    )}
                  </button>

                  {/* Columns Setup */}
                  <button 
                    onClick={() => {
                      setTempVisibleColumns({ ...visibleColumns });
                      setColumnSettingsOpen(!columnSettingsOpen);
                    }}
                    className="flex-1 h-[44px] text-xs font-black bg-white border border-slate-200 hover:border-orange-400 hover:text-orange-500 text-slate-700 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer select-none shadow-sm"
                  >
                    <Settings2 size={15} className="text-[#0a1945]" />
                    <span>{lang === 'ar' ? 'أعمدة' : 'Columns'}</span>
                  </button>
                </div>
              </div>

              {/* Profiles Directory CONTAINER (Responsive Views) */}
              
              {/* VIEW 1: DESKTOP INTERACTIVE TABLE (Large screens only) */}
              <div className="bg-white border-4 border-white rounded-2xl overflow-visible shadow-md relative hidden md:block">
                <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 hidden md:flex flex-col sm:flex-row justify-between items-start sm:items-center rtl:flex-row-reverse gap-3.5 min-h-[48px] h-auto">
                  <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1 max-w-md">
                    <div className="relative flex-1 flex items-center">
                      <Search size={14} className="absolute left-3 rtl:right-3 rtl:left-auto text-slate-400 pointer-events-none" />
                      <input 
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={lang === 'ar' ? 'البحث بالاسم، الكود، البريد...' : 'Search by name, ID...'}
                        style={{ height: '36px' }}
                        className="w-full text-xs p-2 pl-8 pr-8 rtl:pr-8 rtl:pl-8 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-400 transition h-[36px]"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 -translate-y-1/2 p-0.5 text-slate-450 hover:text-orange-500 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                          title={lang === 'ar' ? 'مسح البحث' : 'Clear search'}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {dirViewMode === 'table' && (
                      <div className="relative group/filter">
                        <button
                          onClick={handleToggleColumnFilters}
                          style={{ height: '36px' }}
                          className={cn(
                            "p-2 px-3 text-xs font-black rounded-lg border transition flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap min-h-[36px]",
                            isColumnFiltersOpen 
                              ? "bg-[#0a1945] text-white border-[#0a1945]" 
                              : "bg-white text-black border-slate-200 hover:border-orange-400 hover:text-orange-500"
                          )}
                        >
                          <Filter size={13} className="text-orange-500" />
                        </button>
                        
                        {/* Tooltip on Hover */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/filter:block bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-50 font-bold font-sans pointer-events-none">
                          {lang === 'ar' ? 'بحث متقدم' : 'Advanced Search'}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div
                    className="flex items-center gap-2 w-full justify-between sm:w-auto sm:justify-start"
                    style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}
                  >
                    {/* Settings (rightmost in Arabic) */}
                    <div className="relative group/settings">
                      <button 
                        onClick={() => {
                          setTempVisibleColumns({ ...visibleColumns });
                          setColumnSettingsOpen(!columnSettingsOpen);
                        }}
                        style={{ height: '36px' }}
                        className="p-2 text-black hover:text-orange-500 bg-white border border-slate-200 hover:border-orange-400 rounded-lg hover:shadow-xs transition cursor-pointer flex items-center justify-center font-black text-[11px] min-h-[36px] w-[36px]"
                      >
                        <Settings size={14} className="text-orange-500 animate-spin-hover" />
                      </button>
                      
                      {/* Tooltip on Hover */}
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/settings:block bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-50 font-bold font-sans pointer-events-none">
                        {lang === 'ar' ? 'تخصيص الأعمدة' : 'Customize Columns'}
                      </div>
                    
                    {/* Choose Columns Popover - EXACT MATCH with screenshot */}
                    <AnimatePresence>
                      {columnSettingsOpen && (
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 p-3.5 text-xs">
                          {/* Title */}
                          <div className="pb-2 border-b border-slate-100 mb-2.5">
                            <h4 className="font-extrabold text-slate-800 text-[12px] text-left rtl:text-right">{lang === 'ar' ? 'اختر الأعمدة' : 'Choose Columns'}</h4>
                          </div>
                          
                          {/* Columns List with Drag Indicators & Checkboxes */}
                          <div className="space-y-2.5 max-h-68 overflow-y-auto">
                            {Object.entries({
                              name: { en: 'Staff & ID', ar: 'الموظف والكود' },
                              role: { en: 'Role Title', ar: 'المسمى الوظيفي' },
                              department: { en: 'Admin Dept', ar: 'القسم والعمليات' },
                              branch: { en: 'Assigned Branch', ar: 'الفرع التابع له' },
                              salary: { en: 'Base Salary', ar: 'المرتب الأساسي' },
                              hireDate: { en: 'Hire Date', ar: 'تاريخ التعيين' },
                              status: { en: 'Attendance Sync', ar: 'حالة الحضور' }
                            }).map(([key, label]) => (
                              <div key={key} className="flex items-center gap-2 py-0.5 select-none font-sans">
                                {/* Grip Drag pattern */}
                                <GripVertical size={13} className="text-slate-400 shrink-0" />
                                
                                <label className="flex items-center gap-2 w-full cursor-pointer select-none font-bold text-slate-700 text-left rtl:text-right">
                                  <input 
                                    type="checkbox" 
                                    checked={tempVisibleColumns[key]} 
                                    onChange={(e) => setTempVisibleColumns(prev => ({ ...prev, [key]: e.target.checked }))}
                                    className="w-4 h-4 rounded border border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition shrink-0"
                                  />
                                  <span className="text-[11px] font-medium text-slate-700 truncate">{lang === 'ar' ? label.ar : label.en}</span>
                                </label>
                              </div>
                            ))}
                          </div>
                          
                          {/* Choose Columns Buttons matching layout exactly */}
                          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1">
                            <button 
                              onClick={() => setTempVisibleColumns({ name: true, role: true, department: true, branch: true, salary: true, hireDate: true, status: true })}
                              className="px-2 py-1 border border-slate-200 text-slate-700 hover:text-[#0a1945] bg-white rounded-lg text-[10px] font-bold transition cursor-pointer uppercase tracking-tight font-sans"
                            >
                              {lang === 'ar' ? 'إعادة' : 'RESET'}
                            </button>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => setColumnSettingsOpen(false)}
                                className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[9px] font-bold transition cursor-pointer uppercase tracking-tight"
                              >
                                {lang === 'ar' ? 'إلغاء' : 'CANCEL'}
                              </button>
                              <button 
                                onClick={() => {
                                  setVisibleColumns({ ...tempVisibleColumns });
                                  setColumnSettingsOpen(false);
                                  triggerHrToast(lang === 'ar' ? 'تم تطبيق تفضيلات أعمدة الجدول' : 'Columns layout filter applied!');
                                }}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] font-bold hover:shadow-xs transition cursor-pointer uppercase tracking-tight"
                              >
                                {lang === 'ar' ? 'تطبيق' : 'APPLY'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>

                    {/* Download / Export — between settings and cards */}
                    <div className="relative group/export shrink-0" style={{ height: '36px', width: '36px' }}>
                      <ExportDataButton
                        lang={lang}
                        hideText
                        onToast={triggerHrToast}
                        onCopy={() => triggerHrToast(lang === 'ar' ? 'تم نسخ بيانات الموظفين إلى الحافظة' : 'Staff profiles copied to clipboard!')}
                        onPrint={() => triggerHrToast(lang === 'ar' ? 'تم فتح خيارات الطباعة للجدول' : 'Print dialog opened!')}
                        className="w-[36px] h-[36px] block"
                        style={{ height: '36px', width: '36px', minHeight: '36px' }}
                      />
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/export:block bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-50 font-bold font-sans pointer-events-none">
                        {lang === 'ar' ? 'تصدير / تحميل' : 'Export / Download'}
                      </div>
                    </div>

                    {/* Toggle View Mode (Cards) — orange icon like settings */}
                    <div className="relative group/toggle">
                      <button
                        onClick={() => setDirViewMode(dirViewMode === 'table' ? 'kanban' : 'table')}
                        style={{ height: '36px' }}
                        className="flex items-center justify-center gap-1.5 p-2 px-3 bg-white border border-slate-200 rounded-lg hover:border-orange-400 hover:text-orange-500 text-slate-650 hover:shadow-xs transition cursor-pointer select-none min-h-[36px] text-[11px] font-black"
                      >
                        {dirViewMode === 'table' ? (
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
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/toggle:block bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-50 font-bold font-sans">
                        {dirViewMode === 'table' 
                          ? (lang === 'ar' ? 'تحويل لعرض البطاقات' : 'Switch to Cards view')
                          : (lang === 'ar' ? 'تحويل للجدول الكلاسيكي' : 'Switch to Classic Table view')
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {dirViewMode === 'table' ? (
                  <div className="overflow-x-auto max-h-[520px] overflow-y-auto relative border-[3px] border-white rounded-2xl shadow-md bg-white">
                  <table className="w-full text-left rtl:text-right text-xs table-auto">
                    <thead className="font-sans border-b border-slate-300 sticky top-0 z-30 bg-orange-500 text-white select-none">
                      <tr className="bg-orange-500 text-white font-extrabold rounded-none">
                        {visibleColumns.name && <th className="py-3.5 px-5 font-bold rounded-none">{lang==='ar'?'الموظف والكود':'Staff Member & ID'}</th>}
                        {visibleColumns.role && <th className="py-3.5 px-5 font-bold">{lang==='ar'?'المسمى التنظيمي':'Role title'}</th>}
                        {visibleColumns.department && <th className="py-3.5 px-5 font-bold">{lang==='ar'?'الإدارات والأقسام':'Admin Dept'}</th>}
                        {visibleColumns.branch && <th className="py-3.5 px-5 font-bold text-center">{lang==='ar'?'الفرع التابع له':'Assigned Branch'}</th>}
                        {visibleColumns.salary && <th className="py-3.5 px-5 text-center font-bold">{lang==='ar'?'المرتب الأساسي':'Base Salary'}</th>}
                        {visibleColumns.hireDate && <th className="py-3.5 px-5 text-center font-bold">{lang==='ar'?'تاريخ التعيين':'Hire Date'}</th>}
                        {visibleColumns.status && <th className="py-3.5 px-5 text-center font-bold">{lang==='ar'?'الدوام والبصمة':'Attendance'}</th>}
                        <th className="py-3.5 px-5 text-center font-bold">{lang==='ar'?'التحكم والعمليات':'Actions'}</th>
                      </tr>
                      {isColumnFiltersOpen && (
                        <tr className="bg-slate-100 border-b border-slate-200">
                          {visibleColumns.name && (
                            <td className="py-2 px-3">
                              <div className="relative">
                                <input
                                  type="text"
                                  value={colSearchName}
                                  onChange={(e) => setColSearchName(e.target.value)}
                                  placeholder={lang === 'ar' ? 'بحث بالاسم...' : 'Filter...'}
                                  className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans"
                                />
                                {colSearchName && (
                                  <button onClick={() => setColSearchName('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                    <X size={10} />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                          {visibleColumns.role && (
                            <td className="py-2 px-3">
                              <div className="relative">
                                <input
                                  type="text"
                                  value={colSearchRole}
                                  onChange={(e) => setColSearchRole(e.target.value)}
                                  placeholder={lang === 'ar' ? 'بحث بمسمى...' : 'Filter...'}
                                  className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans"
                                />
                                {colSearchRole && (
                                  <button onClick={() => setColSearchRole('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                    <X size={10} />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                          {visibleColumns.department && (
                            <td className="py-2 px-3">
                              <div className="relative">
                                <input
                                  type="text"
                                  value={colSearchDept}
                                  onChange={(e) => setColSearchDept(e.target.value)}
                                  placeholder={lang === 'ar' ? 'بحث بقسم...' : 'Filter...'}
                                  className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans"
                                />
                                {colSearchDept && (
                                  <button onClick={() => setColSearchDept('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                    <X size={10} />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                          {visibleColumns.branch && (
                            <td className="py-2 px-3">
                              <div className="relative">
                                <input
                                  type="text"
                                  value={colSearchBranch}
                                  onChange={(e) => setColSearchBranch(e.target.value)}
                                  placeholder={lang === 'ar' ? 'بحث بفرع...' : 'Filter...'}
                                  className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans text-center"
                                />
                                {colSearchBranch && (
                                  <button onClick={() => setColSearchBranch('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                    <X size={10} />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                          {visibleColumns.salary && (
                            <td className="py-2 px-3">
                              <div className="relative">
                                <input
                                  type="text"
                                  value={colSearchSalary}
                                  onChange={(e) => setColSearchSalary(e.target.value)}
                                  placeholder={lang === 'ar' ? 'بحث براتب...' : 'Filter...'}
                                  className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 text-center font-sans"
                                />
                                {colSearchSalary && (
                                  <button onClick={() => setColSearchSalary('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                    <X size={10} />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                          {visibleColumns.hireDate && (
                            <td className="py-2 px-3">
                              <div className="relative">
                                <input
                                  type="text"
                                  value={colSearchHireDate}
                                  onChange={(e) => setColSearchHireDate(e.target.value)}
                                  placeholder={lang === 'ar' ? 'تاريخ...' : 'Filter...'}
                                  className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 text-center font-sans"
                                />
                                {colSearchHireDate && (
                                  <button onClick={() => setColSearchHireDate('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                    <X size={10} />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                          {visibleColumns.status && (
                            <td className="py-2 px-3">
                              <div className="relative">
                                <input
                                  type="text"
                                  value={colSearchStatus}
                                  onChange={(e) => setColSearchStatus(e.target.value)}
                                  placeholder={lang === 'ar' ? 'حالة...' : 'Filter...'}
                                  className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 text-center font-sans"
                                />
                                {colSearchStatus && (
                                  <button onClick={() => setColSearchStatus('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                    <X size={10} />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                          <td className="py-2 px-3 text-center">
                            {(colSearchName || colSearchRole || colSearchDept || colSearchBranch || colSearchSalary || colSearchHireDate || colSearchStatus) && (
                              <button
                                onClick={() => {
                                  setColSearchName('');
                                  setColSearchRole('');
                                  setColSearchDept('');
                                  setColSearchBranch('');
                                  setColSearchSalary('');
                                  setColSearchHireDate('');
                                  setColSearchStatus('');
                                }}
                                className="text-[9px] font-bold text-red-500 hover:text-red-650 hover:underline transition"
                              >
                                {lang === 'ar' ? 'مسح' : 'Clear'}
                              </button>
                            )}
                          </td>
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-slate-300 border-x border-b border-slate-300 text-slate-700 text-xs">
                      {paginatedStaff.map(emp => {
                        const dept = departments.find(d => d.id === emp.departmentId);
                        const sect = sections.find(s => s.id === emp.sectionId);
                        const grp = employeeGroups.find(g => g.id === emp.groupId);
                        const empShift = shifts.find(s => s.id === emp.shiftId);
                        
                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/20 transition-all">
                            {/* 1. Employee Info Column */}
                            {visibleColumns.name && (
                              <td className="py-[13px] px-5">
                                <div className="flex items-center gap-3 rtl:flex-row-reverse text-left rtl:text-right">
                                  <div className="w-9 h-9 rounded-xl bg-[#0a1945] text-white font-black flex items-center justify-center text-[10px] tracking-wider relative group-hover:scale-105 transition-all outline outline-1 outline-slate-105">
                                    {emp.name.split(' ').slice(0, 2).map(n=>n[0]).join('')}
                                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${grp?.color || 'bg-slate-400'}`} />
                                  </div>
                                  <div>
                                    <p className="font-extrabold text-slate-800 text-[13px]">{lang === 'ar' ? emp.nameAr : emp.name}</p>
                                    <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 rtl:flex-row-reverse mt-0.5">
                                      <span className="bg-slate-100 text-slate-500 font-extrabold px-1.5 py-0.5 rounded text-[8px]">{emp.id}</span>
                                      <span className="text-slate-300">•</span>
                                      <span>{emp.email}</span>
                                    </p>
                                  </div>
                                </div>
                              </td>
                            )}

                            {/* 2. Role Designation */}
                            {visibleColumns.role && (
                              <td className="py-[13px] px-5 font-bold">
                                <div>
                                  <p className="font-black text-[#0a1945] text-[12px]">{lang === 'ar' ? emp.roleAr : emp.role}</p>
                                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">{emp.grade || '03 — الدرجة الثالثة'}</p>
                                </div>
                              </td>
                            )}

                            {/* 3. Department & Section info */}
                            {visibleColumns.department && (
                              <td className="py-[13px] px-5">
                                <div className="text-left rtl:text-right">
                                  <p className="font-extrabold text-[#0a1945] text-[11px]">
                                    {lang === 'ar' ? `إدارة: ${dept?.nameAr || 'غير مسمى'}` : `Dept: ${dept?.nameEn || 'Unassigned'}`}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                    {lang === 'ar' ? `قسم: ${sect?.nameAr || 'غير مسمى'}` : `Section: ${sect?.nameEn || 'Unassigned'}`}
                                  </p>
                                </div>
                              </td>
                            )}

                            {/* 3.5 Branch Info */}
                            {visibleColumns.branch && (
                              <td className="py-[13px] px-5 text-center">
                                <div className="inline-block text-center bg-slate-50/55 p-1.5 px-3 rounded-2xl border border-slate-100 font-sans">
                                  <span className="font-extrabold text-[#0a1945] text-[11px]">
                                    {lang === 'ar' ? (emp.bankBranchAr || 'الفرع الرئيسي') : (emp.bankBranchEn || 'HQ Main Branch')}
                                  </span>
                                </div>
                              </td>
                            )}

                            {/* 4. Base Wages and Allowances */}
                            {visibleColumns.salary && (
                              <td className="py-[13px] px-5 text-center">
                                <div className="inline-block text-center bg-slate-50/50 p-1.5 px-3 rounded-2xl border border-slate-100 font-mono">
                                  <p className="font-black text-[#0a1945] text-xs">{(emp.baseSalary).toLocaleString()}</p>
                                  <p className="text-[9px] text-emerald-500 font-extrabold mt-0.5">+{emp.allowanceValue} {lang==='ar'?'بدلات':'Allow.'}</p>
                                </div>
                              </td>
                            )}

                            {/* 5. Date hired */}
                            {visibleColumns.hireDate && (
                              <td className="py-[13px] px-5 text-center font-mono font-extrabold text-slate-500">
                                {emp.hireDate || '2025-06-01'}
                              </td>
                            )}

                            {/* 6. Attendance Verification */}
                            {visibleColumns.status && (
                              <td className="py-[13px] px-5 text-center">
                                <div className="flex flex-col items-center gap-1.5">
                                  {empShift ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 rounded-md text-[9px] font-extrabold border border-orange-100">
                                      <Clock size={8} />
                                      <span>{lang === 'ar' ? empShift.nameAr : empShift.nameEn}</span>
                                    </span>
                                  ) : null}
                                  <button 
                                    onClick={() => handleSimulateClockIn(emp.id, emp.clockStatus === 'Checked-In' ? 'Absent' : 'Checked-In')}
                                    className={cn(
                                      "p-1 px-3 rounded-lg text-[10px] font-black transition cursor-pointer flex items-center justify-center gap-1 border",
                                      emp.clockStatus === 'Checked-In' 
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/50" 
                                        : "bg-red-50 text-rose-500 border-red-105 hover:bg-rose-100/50"
                                    )}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${emp.clockStatus === 'Checked-In' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    <span>{emp.clockStatus === 'Checked-In' ? (lang === 'ar' ? 'حاضر بالعمل' : 'Clocked In') : (lang === 'ar' ? 'خارج الدوام' : 'Absent')}</span>
                                  </button>
                                </div>
                              </td>
                            )}

                            {/* 7. Action Control Buttons matching products style: عرض تعديل حذف */}
                            <td className="p-3 text-center">
                              <div className="flex items-center gap-1 justify-center bg-white border border-slate-100 rounded-lg p-0.5 shadow-xs w-fit mx-auto">
                                {/* View button (Eye icon / عرض) */}
                                <button 
                                  onClick={() => { setActiveViewTab('job'); setViewingEmp(emp); }}
                                  title={lang === 'ar' ? 'عرض السجل التعاقدي وملف الموظف' : 'View Detailed Employment Card'}
                                  className="p-1.5 hover:bg-slate-50 text-slate-650 rounded-lg transition cursor-pointer"
                                >
                                  <Eye size={13} strokeWidth={2.5} />
                                </button>
                                
                                {/* Edit button (Pencil icon / تعديل) */}
                                <button 
                                  onClick={() => openEditEmployeeModal(emp)}
                                  title={lang === 'ar' ? 'تعديل بيانات الموظف والامتيازات' : 'Edit Employee details'}
                                  className="p-1.5 hover:bg-slate-50 text-blue-650 rounded-lg transition cursor-pointer"
                                >
                                  <Edit2 size={13} strokeWidth={2.5} />
                                </button>
                                
                                {/* Delete button (Trash / حذف) */}
                                <button 
                                  onClick={() => handleDeleteEmployee(emp.id)}
                                  title={lang === 'ar' ? 'حذف ملف الموظف نهائياً' : 'Delete employee profile'}
                                  className="p-1.5 hover:bg-slate-50 text-red-650 rounded-lg transition cursor-pointer"
                                >
                                  <Trash2 size={13} strokeWidth={2.5} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="hidden md:grid p-5 bg-slate-50/50 border-t border-slate-100 rounded-b-3xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {paginatedStaff.map(emp => {
                    const dept = departments.find(d => d.id === emp.departmentId);
                    const sect = sections.find(s => s.id === emp.sectionId);
                    const grp = employeeGroups.find(g => g.id === emp.groupId);
                    const empShift = shifts.find(s => s.id === emp.shiftId);
                    
                    return (
                      <motion.div 
                        key={emp.id}
                        layout
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-slate-200/95 rounded-3xl p-5 shadow-xs hover:border-orange-200 transition-all flex flex-col gap-4 relative font-sans text-left rtl:text-right"
                      >
                        {/* Card Header (Avatar, Name, Code ID, WorkGroup color dot & Shift) */}
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5 font-sans">
                          <div className="flex items-center gap-3 rtl:flex-row-reverse text-left rtl:text-right font-sans">
                            <div className="w-10 h-10 rounded-2xl bg-[#0a1945] text-white font-black flex items-center justify-center text-xs tracking-wider relative font-sans shrink-0">
                              {emp.name.split(' ').slice(0,2).map(n=>n[0]).join('')}
                              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${grp?.color || 'bg-slate-400'}`} />
                            </div>
                            <div className="font-sans flex-1 min-w-0">
                              <p className="font-extrabold text-[14px] text-slate-800 font-sans truncate">{lang === 'ar' ? emp.nameAr : emp.name}</p>
                              <p className="text-[10px] text-slate-450 font-mono mt-0.5 flex items-center gap-1.5 rtl:flex-row-reverse">
                                <span className="bg-slate-100 text-[#0a1945] font-extrabold px-1.5 py-0.5 rounded text-[8px]">{emp.id}</span>
                                <span>•</span>
                                <span className="truncate max-w-28">{emp.email}</span>
                              </p>
                              {/* Mobile Attendance state button within name/details context */}
                              <div className="mt-2 text-left rtl:text-right font-sans">
                                <button 
                                  onClick={() => handleSimulateClockIn(emp.id, emp.clockStatus === 'Checked-In' ? 'Absent' : 'Checked-In')}
                                  className={cn(
                                    "p-1 px-3 rounded-lg text-[10px] font-extrabold transition cursor-pointer inline-flex items-center gap-1.5 border font-sans",
                                    emp.clockStatus === 'Checked-In' 
                                      ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                      : "bg-red-50 text-rose-500 border-red-105"
                                  )}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${emp.clockStatus === 'Checked-In' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                  <span>{emp.clockStatus === 'Checked-In' ? (lang === 'ar' ? 'حاضر' : 'Clocked In') : (lang === 'ar' ? 'غائب' : 'Absent')}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card Employment details grid list */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-[11px] text-slate-500 font-sans">
                          {/* Role Title */}
                          {visibleColumns.role && (
                            <div className="bg-slate-50/55 p-2 rounded-2xl border border-slate-100 min-w-0 font-sans">
                              <span className="block text-[8px] uppercase tracking-widest font-bold text-slate-400 mb-0.5">{lang === 'ar' ? 'المسمى التنظيمي' : 'Role Title'}</span>
                              <span className="font-extrabold text-[#0a1945] truncate block">{lang === 'ar' ? emp.roleAr : emp.role}</span>
                              <span className="block text-[8px] text-slate-450 mt-0.5">{emp.grade || 'Grade 3'}</span>
                            </div>
                          )}

                          {/* Department/Section */}
                          {visibleColumns.department && (
                            <div className="bg-slate-50/55 p-2 rounded-2xl border border-slate-100 min-w-0 font-sans">
                              <span className="block text-[8px] uppercase tracking-widest font-bold text-slate-400 mb-0.5">{lang === 'ar' ? 'الإدارة والقسم' : 'Admin Dept'}</span>
                              <span className="font-extrabold text-slate-700 truncate block">{lang === 'ar' ? dept?.nameAr : dept?.nameEn}</span>
                              <span className="block text-[9px] text-slate-450 mt-0.5 truncate">{lang === 'ar' ? `قسم: ${sect?.nameAr}` : `Sec: ${sect?.nameEn}`}</span>
                            </div>
                          )}

                          {/* Salary and Allowance */}
                          {visibleColumns.salary && (
                            <div className="bg-slate-50/55 p-2 rounded-2xl border border-slate-100 min-w-0 font-sans">
                              <span className="block text-[8px] uppercase tracking-widest font-bold text-slate-400 mb-0.5">{lang === 'ar' ? 'المرتب الأساسي والبدل' : 'Base Salary'}</span>
                              <span className="font-extrabold text-slate-800 font-mono text-[11px] block">{emp.baseSalary.toLocaleString()} EGP</span>
                              <span className="block text-[9px] text-emerald-600 font-bold font-sans mt-0.5">+{emp.allowanceValue} Allow.</span>
                            </div>
                          )}

                          {/* Hire Date */}
                          {visibleColumns.hireDate && (
                            <div className="bg-slate-50/55 p-2 rounded-2xl border border-slate-100 min-w-0 font-sans">
                              <span className="block text-[8px] uppercase tracking-widest font-bold text-slate-400 mb-0.5">{lang === 'ar' ? 'تاريخ التعيين' : 'Hire Date'}</span>
                              <span className="font-extrabold text-slate-600 font-mono block">{emp.hireDate || '2025-06-01'}</span>
                              <span className="block text-[9px] text-slate-450 mt-0.5">{emp.workType || 'Full-Time'}</span>
                            </div>
                          )}

                          {/* Shift details */}
                          {visibleColumns.status && empShift && (
                            <div className="md:col-span-2 bg-orange-50/30 p-2 rounded-2xl border border-orange-100 col-span-2 min-w-0 font-sans">
                              <span className="block text-[8px] uppercase tracking-widest font-bold text-orange-400 mb-0.5 font-sans">{lang === 'ar' ? 'وردية العمل الحالية' : 'Assigned Shift'}</span>
                              <span className="font-black text-[#0a1945] block truncate font-sans">{lang === 'ar' ? empShift.nameAr : empShift.nameEn}</span>
                            </div>
                          )}
                        </div>

                        {/* Card bottom action controls matching: عرض تعديل حذف */}
                        <div className="flex items-center gap-2 w-full mt-auto border-t border-slate-100 pt-3">
                          {/* Edit */}
                          <button 
                            onClick={() => openEditEmployeeModal(emp)}
                            className="p-2 bg-orange-50 hover:bg-orange-100 text-[#0a1945] rounded-lg transition cursor-pointer border border-orange-100 shrink-0"
                          >
                            <Edit2 size={12} />
                          </button>
                          
                          {/* View (Center) */}
                          <button 
                            onClick={() => { setActiveViewTab('job'); setViewingEmp(emp); }}
                            className="flex-1 flex justify-center items-center gap-1.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition cursor-pointer border border-blue-105 text-[10px] font-black font-sans"
                          >
                            <Eye size={12} />
                            <span>{lang === 'ar' ? 'عرض' : 'View'}</span>
                          </button>
                          
                          {/* Delete */}
                          <button 
                            onClick={() => handleDeleteEmployee(emp.id)}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer border border-rose-105 shrink-0"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>


              {/* VIEW 2: PHONE KANBAN CARD BOARD (Visible on mobile/tablet screen widths only) */}
              <div className="block md:hidden space-y-4">
                
                {paginatedStaff.map(emp => {
                  const dept = departments.find(d => d.id === emp.departmentId);
                  const sect = sections.find(s => s.id === emp.sectionId);
                  const grp = employeeGroups.find(g => g.id === emp.groupId);
                  const empShift = shifts.find(s => s.id === emp.shiftId);
                  
                  return (
                    <motion.div 
                      key={emp.id}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white border-[3px] border-white rounded-3xl p-4 shadow-md transition-all flex flex-col gap-4 relative overflow-hidden"
                    >
                      {/* Top ribbon for status indicator */}
                      <div className={cn(
                        "absolute top-0 left-0 w-full h-1.5",
                        emp.clockStatus === 'Checked-In' ? 'bg-emerald-500' : 'bg-rose-500'
                      )} />

                      {/* Card Header (Avatar, Name, Code ID, WorkGroup color dot) */}
                      <div className="flex justify-between items-start pt-1 gap-3">
                        <div className="flex items-center gap-3 rtl:flex-row-reverse text-left rtl:text-right">
                          <div className="w-11 h-11 rounded-2xl bg-[#0a1945] text-white font-black flex items-center justify-center text-sm tracking-wider relative shrink-0 shadow-sm">
                            {emp.name.split(' ').slice(0,2).map(n=>n[0]).join('')}
                            <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${grp?.color || 'bg-slate-400'}`} />
                          </div>
                          <div className="flex flex-col">
                            <p className="font-black text-[15px] text-slate-800 leading-tight">{lang === 'ar' ? emp.nameAr : emp.name}</p>
                            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5 rtl:flex-row-reverse flex-wrap">
                              <span className="bg-slate-100 text-[#0a1945] font-black px-1.5 py-0.5 rounded-md border border-slate-200">{emp.id}</span>
                              <span className="opacity-50">•</span>
                              <span className="truncate max-w-[140px] font-medium">{emp.email}</span>
                            </div>
                          </div>
                        </div>

                        {/* Clock In/Out button */}
                        <div className="shrink-0">
                           <button 
                             onClick={() => handleSimulateClockIn(emp.id, emp.clockStatus === 'Checked-In' ? 'Absent' : 'Checked-In')}
                             className={cn(
                               "p-1.5 px-3 rounded-lg text-[10px] font-black transition cursor-pointer inline-flex items-center gap-1.5 border shadow-sm",
                               emp.clockStatus === 'Checked-In' 
                                 ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
                                 : "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100"
                             )}
                           >
                             <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${emp.clockStatus === 'Checked-In' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                             <span>{emp.clockStatus === 'Checked-In' ? (lang === 'ar' ? 'حاضر' : 'Clocked In') : (lang === 'ar' ? 'غائب' : 'Absent')}</span>
                           </button>
                        </div>
                      </div>

                      {/* Card Employment details grid list */}
                      <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-500 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                        {/* Role Title */}
                        {visibleColumns.role && (
                          <div className="flex flex-col gap-0.5">
                            <span className="block text-[9px] font-bold text-slate-400">{lang === 'ar' ? 'المسمى التنظيمي' : 'Role Title'}</span>
                            <span className="font-extrabold text-[#0a1945] text-xs">{lang === 'ar' ? emp.roleAr : emp.role}</span>
                            <span className="block text-[9px] text-slate-500">{emp.grade || 'Grade 3'}</span>
                          </div>
                        )}

                        {/* Department/Section */}
                        {visibleColumns.department && (
                          <div className="flex flex-col gap-0.5">
                            <span className="block text-[9px] font-bold text-slate-400">{lang === 'ar' ? 'الإدارة والقسم' : 'Admin Dept'}</span>
                            <span className="font-extrabold text-slate-700 text-xs truncate">{lang === 'ar' ? dept?.nameAr : dept?.nameEn}</span>
                            <span className="block text-[9px] text-slate-500 truncate">{lang === 'ar' ? `قسم: ${sect?.nameAr}` : `Sec: ${sect?.nameEn}`}</span>
                          </div>
                        )}

                        {/* Salary and Allowance */}
                        {visibleColumns.salary && (
                          <div className="flex flex-col gap-0.5">
                            <span className="block text-[9px] font-bold text-slate-400">{lang === 'ar' ? 'المرتب والبدل' : 'Base Salary'}</span>
                            <span className="font-extrabold text-slate-800 font-mono text-[12px]">{emp.baseSalary.toLocaleString()} <span className="text-[9px] font-sans">EGP</span></span>
                            <span className="block text-[9px] text-emerald-600 font-bold">+{emp.allowanceValue} Allow.</span>
                          </div>
                        )}

                        {/* Hire Date */}
                        {visibleColumns.hireDate && (
                          <div className="flex flex-col gap-0.5">
                            <span className="block text-[9px] font-bold text-slate-400">{lang === 'ar' ? 'تاريخ التعيين' : 'Hire Date'}</span>
                            <span className="font-extrabold text-slate-600 font-mono">{emp.hireDate || '2025-06-01'}</span>
                            <span className="block text-[9px] text-slate-500">{emp.workType || 'Full-Time'}</span>
                          </div>
                        )}

                        {/* Shift details */}
                        {visibleColumns.status && empShift && (
                          <div className="col-span-2 pt-2 border-t border-slate-200 mt-1 flex flex-col gap-0.5">
                            <span className="block text-[9px] font-bold text-orange-500">{lang === 'ar' ? 'وردية العمل الحالية' : 'Assigned Shift'}</span>
                            <span className="font-black text-[#0a1945] text-xs">{lang === 'ar' ? empShift.nameAr : empShift.nameEn}</span>
                          </div>
                        )}
                      </div>

                      {/* Card bottom action controls */}
                      <div className="flex items-center gap-2 w-full mt-1">
                        {/* Edit */}
                        <button 
                          onClick={() => openEditEmployeeModal(emp)}
                          className="p-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg transition cursor-pointer border border-orange-200 shrink-0"
                        >
                          <Edit2 size={14} />
                        </button>

                        {/* View (Center) */}
                        <button 
                          onClick={() => { setActiveViewTab('job'); setViewingEmp(emp); }}
                          className="flex-1 flex justify-center items-center gap-1.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition cursor-pointer border border-blue-200 text-[11px] font-black"
                        >
                          <Eye size={14} />
                          <span>{lang === 'ar' ? 'عرض' : 'View'}</span>
                        </button>
                        
                        {/* Delete */}
                        <button 
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer border border-rose-200 shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Dynamic Pagination Controls with orange/navy theme details - matches Ma7aly.com identity */}
              <div className="mt-6 pt-[11px] md:h-[43px] border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 font-sans text-xs text-slate-650">
                {/* 1. Showing elements counter range */}
                <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                  {lang === 'ar' ? (
                    <>
                      <span>عرض</span>
                      <span className="font-extrabold text-[#0a1945] font-mono bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                        {paginatedStaff.length}
                      </span>
                      <span>من أصل</span>
                      <span className="font-extrabold text-orange-650 font-mono bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                        {filteredStaff.length}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>Show</span>
                      <span className="font-extrabold text-[#0a1945] font-mono bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                        {paginatedStaff.length}
                      </span>
                      <span>of</span>
                      <span className="font-extrabold text-orange-650 font-mono bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                        {filteredStaff.length}
                      </span>
                    </>
                  )}
                </div>

                {/* 2. Numerical Pagination Items - limited strictly to pages 1, 2, 3 and previous/next arrows */}
                <div className="flex items-center gap-1 shrink-0 select-none">
                  {/* Previous Page arrow */}
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-2 border border-slate-200 hover:border-orange-400 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-650 hover:text-orange-500 hover:bg-orange-50/20 transition cursor-pointer h-8 w-8 flex items-center justify-center shadow-xs"
                    title={lang === 'ar' ? 'الصفحة السابقة' : 'Previous page'}
                  >
                    {lang === 'ar' ? <ChevronRight size={13} strokeWidth={2.5} /> : <ChevronLeft size={13} strokeWidth={2.5} />}
                  </button>

                  {/* Calculated dynamic pages range - limited to 1, 2, 3 only as requested */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map(page => {
                      const isActive = page === currentPage;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "w-8 h-8 rounded-lg font-extrabold transition cursor-pointer text-xs flex items-center justify-center border font-mono shadow-xs",
                            isActive
                              ? "bg-[#0a1945] text-white border-[#0a1945]"
                              : "bg-white text-slate-700 border-slate-200 hover:border-orange-400 hover:text-orange-500"
                          )}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Page arrow */}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-2 border border-slate-200 hover:border-orange-400 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-650 hover:text-orange-500 hover:bg-orange-50/20 transition cursor-pointer h-8 w-8 flex items-center justify-center shadow-xs"
                    title={lang === 'ar' ? 'الصفحة التالية' : 'Next page'}
                  >
                    {lang === 'ar' ? <ChevronLeft size={13} strokeWidth={2.5} /> : <ChevronRight size={13} strokeWidth={2.5} />}
                  </button>
                </div>

                {/* 3. Page Size Dropdown Select Menu */}
                <div className="flex items-center gap-2 text-slate-500 font-bold shrink-0">
                  <span>{lang === 'ar' ? 'عرض' : 'Show'}</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1); // Reset back to first page safely
                    }}
                    className="bg-white border border-slate-200 text-[#0a1945] rounded-xl px-2 py-1.5 text-xs font-black shadow-xs outline-none focus:border-orange-400 cursor-pointer w-16 text-center"
                  >
                    {[5, 10, 20, 50, 100].map(sz => (
                      <option key={sz} value={sz} className="font-bold">
                        {sz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: Shifts config & weekly template periods with holidays toggle */}
          {activeMenu === 'shifts' && (
            <div className="space-y-6">
              
              {/* Header with Add New Shift Button */}
              <div className="border-b border-slate-100 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="rtl:text-right text-left">
                  <h3 className="text-md font-bold text-[#0a1945] flex items-center gap-2">
                    <Clock className="text-orange-500" size={18} />
                    <span>{lang === 'ar' ? 'لوحة إدارة ورديات العمل المتقدمة' : 'Advanced Roster & Shift Presets'}</span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {lang === 'ar' 
                      ? 'صمم عدد غير محدود من الورديات اليومية متعددة الفترات لربط كل موظف بوردية خاصة تناسب مواعيد دوامه.' 
                      : 'Design unlimited multi-period work shift presets and assign them to custom personnel tags.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingShiftPreset(null);
                    setShiftPresetNameEn('');
                    setShiftPresetNameAr('');
                    setShiftPresetPeriodsCount(1);
                    setShiftPresetDaysLocked({ sun: false, mon: false, tue: false, wed: false, thu: false, fri: true, sat: true });
                    setShiftPresetHours({
                      sun: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
                      mon: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
                      tue: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
                      wed: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
                      thu: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
                      fri: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
                      sat: { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' },
                    });
                    setActiveShiftModal(true);
                  }}
                  className="mahaly-action-btn mahaly-action-btn--toolbar"
                >
                  <Plus size={16} strokeWidth={2.5} />
                  <span>{lang === 'ar' ? 'إضافة وردية جديدة' : 'Create New Shift'}</span>
                </button>
              </div>

              {/* Kanban Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shifts.filter(shift => !maximizedBox || maximizedBox === shift.id).map(shift => {
                  const shiftWorkers = staff.filter(emp => emp.shiftId === shift.id);
                  return (
                    <motion.div
                      key={shift.id}
                      layoutId={`shift-${shift.id}`}
                      dir={lang === 'ar' ? 'rtl' : 'ltr'}
                      className={`bg-white border border-slate-200 hover:border-orange-500/30 rounded-3xl p-5 shadow-xs transition-all duration-300 relative flex flex-col justify-between space-y-4 no-underline ${maximizedBox === shift.id ? 'col-span-1 md:col-span-2 lg:col-span-3' : ''}`}
                    >
                      {/* Top segment: Title (start/right) + badges (end/left) */}
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-black text-[#0a1945] flex items-center gap-1.5 text-start no-underline">
                            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                            <span className="no-underline">{lang === 'ar' ? shift.nameAr : shift.nameEn}</span>
                          </h4>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-500 text-[9px] font-extrabold rounded-md font-mono shrink-0 no-underline">
                              {shift.periodsCount === 1 
                                ? (lang === 'ar' ? 'فترة واحدة' : '1 Period') 
                                : shift.periodsCount === 2 
                                ? (lang === 'ar' ? 'فترتين' : '2 Periods') 
                                : (lang === 'ar' ? '٣ فترات/يوم' : '3 Periods')}
                            </span>
                            <button
                              type="button"
                              onClick={() => setMaximizedBox(maximizedBox === shift.id ? null : shift.id)}
                              className="p-1 border-[0.5px] border-[#dee1eb] hover:border-orange-500 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg transition duration-150 active:scale-95 cursor-pointer shadow-xs"
                              title="Maximize"
                            >
                              {maximizedBox === shift.id ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Employee count — start/right in RTL */}
                        <div className="flex items-center gap-1 text-[9.5px] font-bold text-slate-400 justify-start">
                          <Users size={11} className="text-slate-400 shrink-0" />
                          <span className="no-underline">
                            {lang === 'ar' 
                              ? `طاقم العمل: ${shiftWorkers.length} موظف` 
                              : `Assigned: ${shiftWorkers.length} personnel`}
                          </span>
                        </div>
                      </div>

                      {/* Weekday hours: day at start (right), times at end (left) */}
                      <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-3 space-y-2 text-[10.5px]">
                        <p className="text-[9px] font-black uppercase text-slate-400 select-none border-b pb-1 text-start no-underline">
                          {lang === 'ar' ? 'جدول الدوام وتوقيتات الفترات' : 'Roster Sheet & Hours Map'}
                        </p>
                        
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pe-1">
                          {daysOfWeek.map(day => {
                            const isHoliday = !!shift.daysLocked[day.id];
                            const times = shift.hours[day.id] || { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:00', p3Out: '03:00' };
                            return (
                              <div key={day.id} className="flex items-center justify-between gap-2 border-b border-slate-100/40 pb-1 text-[10px]">
                                <span className={`font-extrabold text-slate-600 shrink-0 text-start no-underline ${maximizedBox === shift.id ? 'text-[13px] px-[30px]' : ''}`}>
                                  {lang === 'ar' ? day.labelAr : day.labelEn}
                                </span>

                                {isHoliday ? (
                                  <span className={`font-bold text-rose-500 px-1 py-0.2 bg-rose-50 border border-rose-100/40 rounded no-underline ${maximizedBox === shift.id ? 'text-[13px] mx-[30px]' : 'text-[9px]'}`}>
                                    {lang === 'ar' ? 'عطلة رسمية' : 'Holiday OFF'}
                                  </span>
                                ) : (
                                  <div className={`font-mono text-slate-500 space-y-0.5 text-end no-underline ${maximizedBox === shift.id ? 'text-[13px] px-[30px]' : 'text-[9px]'}`}>
                                    <div className="font-semibold text-slate-800 no-underline">
                                      {times.p1In} {times.p1In && '»'} {times.p1Out}
                                    </div>
                                    {shift.periodsCount >= 2 && times.p2In && (
                                      <div className="text-orange-500 font-semibold no-underline">
                                        {times.p2In} » {times.p2Out}
                                      </div>
                                    )}
                                    {shift.periodsCount >= 3 && times.p3In && (
                                      <div className="text-violet-500 font-semibold no-underline">
                                        {times.p3In} » {times.p3Out}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Day dots — end/left in RTL */}
                      <div className="flex items-center gap-1 justify-end text-[9px] text-slate-400 select-none pb-1 border-b border-slate-100">
                        {daysOfWeek.map(day => {
                          const isH = !!shift.daysLocked[day.id];
                          return (
                            <div 
                              key={day.id} 
                              className={cn(
                                "w-4 h-4 rounded-full flex items-center justify-center font-bold font-mono text-[8.5px] uppercase",
                                isH ? "bg-rose-50 text-rose-500 border border-rose-250" : "bg-emerald-50 text-emerald-600 border border-emerald-250"
                              )}
                              title={`${lang === 'ar' ? day.labelAr : day.labelEn}: ${isH ? (lang === 'ar' ? 'إجازة' : 'OFF') : (lang === 'ar' ? 'عمل' : 'ON')}`}
                            >
                              {day.id.slice(0,1)}
                            </div>
                          );
                        })}
                      </div>

                      {/* Actions: Edit (visual start/left) + delete beside it */}
                      <div className="flex items-center gap-2 pt-1 flex-row-reverse">
                        <button
                          type="button"
                          onClick={() => startEditShiftPreset(shift)}
                          className="flex-1 py-2 bg-slate-50 hover:bg-orange-50 text-slate-600 hover:text-orange-500 border border-slate-150 rounded-lg text-[10.5px] font-extrabold transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer no-underline"
                        >
                          <Edit2 size={11} />
                          <span className="no-underline">{lang === 'ar' ? 'تعديل التوقيتات' : 'Configuration'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteShiftPreset(shift.id)}
                          className="px-3.5 py-2 bg-slate-50 hover:bg-rose-50 hover:border-rose-100 text-slate-400 hover:text-rose-500 border border-slate-150 rounded-lg text-xs transition-all cursor-pointer"
                          title={lang === 'ar' ? 'حذف الوردية' : 'Remove Shift Template'}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Dynamic Shift Presets Pop-up Modal Panel */}
              <AnimatePresence>
                {activeShiftModal && (
                  <div className="fixed inset-0 bg-[#0a1945]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      dir={lang === 'ar' ? 'rtl' : 'ltr'}
                      className="bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl max-w-2xl w-full space-y-5 text-xs text-start select-none no-underline"
                    >
                      {/* Modal Header: title at start (right in RTL), X at end (left in RTL) */}
                      <div className="-mt-6 -mx-6 px-6 py-3 bg-orange-500 rounded-t-3xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shrink-0" />
                          <h3 className="text-sm font-black text-white drop-shadow-sm text-start no-underline">
                            {editingShiftPreset 
                              ? (lang === 'ar' ? 'تعديل وحفظ إعدادات الوردية' : 'Edit Shift preset parameters') 
                              : (lang === 'ar' ? 'إضافة وتصنيف وردية جديدة' : 'Add Custom Corporate Shift')}
                          </h3>
                        </div>
                        <button 
                          type="button"
                          onClick={() => { setEditingShiftPreset(null); setActiveShiftModal(false); }}
                          className="text-white hover:text-orange-100 p-1.5 rounded-lg hover:bg-orange-600 transition cursor-pointer shrink-0"
                        >
                          <X size={15} strokeWidth={2.5} />
                        </button>
                      </div>

                      {/* Modal Form */}
                      <form onSubmit={handleSaveShiftPreset} className="space-y-5">
                        
                        {/* Name Inputs Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="text-start">
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 text-start no-underline">
                              {lang === 'ar' ? 'اسم الوردية بالإنجليزية' : 'Shift Name En'}
                            </label>
                            <input 
                              type="text" 
                              value={shiftPresetNameEn} 
                              onChange={e => setShiftPresetNameEn(e.target.value)} 
                              placeholder="e.g. Double-Period Retail Shift" 
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-orange-500/50 transition font-extrabold text-slate-700 font-sans text-start"
                              dir="ltr"
                              required 
                            />
                          </div>

                          <div className="text-start">
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 text-start no-underline">
                              {lang === 'ar' ? 'اسم الوردية بالعربية' : 'Shift Name Ar'}
                            </label>
                            <input 
                              type="text" 
                              value={shiftPresetNameAr} 
                              onChange={e => setShiftPresetNameAr(e.target.value)} 
                              placeholder="مثال: وردية منافذ ومبيعات فترتين" 
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-orange-500/50 transition font-extrabold text-slate-700 text-start font-sans"
                              required 
                            />
                          </div>
                        </div>

                        {/* Period slider control */}
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="text-start">
                            <h4 className="text-[11px] font-black text-[#0a1945] text-start no-underline">{lang === 'ar' ? 'تقسيم فترات الوردية اليومية' : 'Daily Shift Period System'}</h4>
                            <p className="text-[9.5px] text-slate-450 mt-0.5 text-start no-underline">{lang === 'ar' ? 'اختر عدد فترات العمل المنفصلة التي تسري للوردية خلال اليوم الواحد' : 'Set the concurrent active work shifts/periods occurring daily'}</p>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                            {[1, 2, 3].map(num => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setShiftPresetPeriodsCount(num)}
                                className={cn(
                                  "px-3.5 py-1.5 rounded-lg font-black transition-all cursor-pointer text-xs no-underline",
                                  shiftPresetPeriodsCount === num 
                                    ? "bg-[#0a1945] text-white" 
                                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                                )}
                              >
                                {num} {lang === 'ar' ? 'فترات' : 'Periods'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Week Day planner inside modal */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 border-b pb-1 text-start no-underline">
                            {lang === 'ar' ? 'تعيين الجدول الزمني وتوقيتات الأسبوع' : 'Daily timing bounds & weekdays templates'}
                          </h4>

                          <div className="grid grid-cols-1 gap-2.5 max-h-[220px] overflow-y-auto overflow-x-auto pe-1 pb-2 sidebar-scrollbar">
                            {daysOfWeek.map(day => {
                              const isLocked = !!shiftPresetDaysLocked[day.id];
                              const dayHours = shiftPresetHours[day.id] || { p1In: '09:00', p1Out: '17:00', p2In: '17:00', p2Out: '21:00', p3In: '21:05', p3Out: '03:00' };
                              return (
                                <div key={day.id} className="p-2.5 border border-slate-150 rounded-2xl bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs" style={{ minWidth: shiftPresetPeriodsCount === 3 ? '850px' : 'auto' }}>
                                  
                                  {/* Day Name & Toggle — start/right in RTL */}
                                  <div className="flex items-center gap-2.5 w-full sm:w-1/4 justify-start">
                                    <input 
                                      type="checkbox"
                                      id={`daylock-${day.id}`}
                                      checked={isLocked}
                                      onChange={() => {
                                        setShiftPresetDaysLocked(prev => ({ ...prev, [day.id]: !prev[day.id] }));
                                      }}
                                      className="rounded border-slate-300 text-rose-500 focus:ring-rose-450 w-4 h-4 cursor-pointer"
                                    />
                                    <label htmlFor={`daylock-${day.id}`} className="cursor-pointer text-start no-underline">
                                      <p className="font-extrabold text-slate-800 no-underline">{lang === 'ar' ? day.labelAr : day.labelEn}</p>
                                      <p className={cn(
                                        "text-[8.5px] font-extrabold uppercase mt-0.2 no-underline",
                                        isLocked ? "text-rose-500" : "text-emerald-600"
                                      )}>
                                        {isLocked ? (lang === 'ar' ? 'إجازة' : 'Holiday') : (lang === 'ar' ? 'يوم عمل' : 'Duty Day')}
                                      </p>
                                    </label>
                                  </div>

                                  {/* Day-specific inputs */}
                                  <div className="flex-1">
                                    {isLocked ? (
                                      <div className="p-2 bg-rose-50/55 border border-dashed border-rose-100/50 rounded-xl text-center text-[9px] font-black text-rose-500 uppercase no-underline">
                                        ❌ {lang === 'ar' ? 'معطل - إجازة أسبوعية رسمية' : 'OFF - HOLIDAY SPECIFIED'}
                                      </div>
                                    ) : (
                                      <div className={`grid grid-cols-2 ${shiftPresetPeriodsCount === 1 ? 'sm:grid-cols-2' : shiftPresetPeriodsCount === 2 ? 'sm:grid-cols-4' : 'sm:grid-cols-6'} gap-2.5`}>
                                        
                                        {/* Period 1 In/Out */}
                                        {shiftPresetPeriodsCount >= 1 && (
                                          <>
                                            <div className="p-2 px-3 bg-slate-50/70 border border-slate-100 rounded-xl text-start">
                                              <p className="text-[9.5px] font-black uppercase text-slate-400 mb-1.5 text-start no-underline">{lang === 'ar' ? 'ف1 - حضور' : 'P1 - In'}</p>
                                              <input 
                                                type="time" 
                                                value={dayHours.p1In} 
                                                onChange={e => {
                                                  setShiftPresetHours(prev => ({
                                                    ...prev,
                                                    [day.id]: { ...(prev[day.id] || dayHours), p1In: e.target.value }
                                                  }));
                                                }}
                                                className="bg-white border-2 border-slate-200 rounded-xl p-2 md:p-2.5 w-full text-center font-black text-[#0a1945] focus:border-orange-500/50 outline-none transition-all font-mono text-base md:text-[18px]"
                                              />
                                            </div>
                                            <div className="p-2 px-3 bg-slate-50/70 border border-slate-100 rounded-xl text-start">
                                              <p className="text-[9.5px] font-black uppercase text-slate-400 mb-1.5 text-start no-underline">{lang === 'ar' ? 'ف1 - انصراف' : 'P1 - Out'}</p>
                                              <input 
                                                type="time" 
                                                value={dayHours.p1Out} 
                                                onChange={e => {
                                                  setShiftPresetHours(prev => ({
                                                    ...prev,
                                                    [day.id]: { ...(prev[day.id] || dayHours), p1Out: e.target.value }
                                                  }));
                                                }}
                                                className="bg-white border-2 border-slate-200 rounded-xl p-2 md:p-2.5 w-full text-center font-black text-[#0a1945] focus:border-orange-500/50 outline-none transition-all font-mono text-base md:text-[18px]"
                                              />
                                            </div>
                                          </>
                                        )}

                                        {/* Period 2 In/Out */}
                                        {shiftPresetPeriodsCount >= 2 && (
                                          <>
                                            <div className="p-2 px-3 bg-slate-50/70 border border-slate-100 rounded-xl text-start">
                                              <p className="text-[9.5px] font-black uppercase text-orange-400 mb-1.5 text-start no-underline">{lang === 'ar' ? 'ف2 - حضور' : 'P2 - In'}</p>
                                              <input 
                                                type="time" 
                                                value={dayHours.p2In} 
                                                onChange={e => {
                                                  setShiftPresetHours(prev => ({
                                                    ...prev,
                                                    [day.id]: { ...(prev[day.id] || dayHours), p2In: e.target.value }
                                                  }));
                                                }}
                                                className="bg-white border-2 border-slate-200 rounded-xl p-2 md:p-2.5 w-full text-center font-black text-orange-600 focus:border-orange-500/50 outline-none transition-all font-mono text-base md:text-[18px]"
                                              />
                                            </div>
                                            <div className="p-2 px-3 bg-slate-50/70 border border-slate-100 rounded-xl text-start">
                                              <p className="text-[9.5px] font-black uppercase text-orange-400 mb-1.5 text-start no-underline">{lang === 'ar' ? 'ف2 - انصراف' : 'P2 - Out'}</p>
                                              <input 
                                                type="time" 
                                                value={dayHours.p2Out} 
                                                onChange={e => {
                                                  setShiftPresetHours(prev => ({
                                                    ...prev,
                                                    [day.id]: { ...(prev[day.id] || dayHours), p2Out: e.target.value }
                                                  }));
                                                }}
                                                className="bg-white border-2 border-slate-200 rounded-xl p-2 md:p-2.5 w-full text-center font-black text-orange-600 focus:border-orange-500/50 outline-none transition-all font-mono text-base md:text-[18px]"
                                              />
                                            </div>
                                          </>
                                        )}

                                        {/* Period 3 In/Out */}
                                        {shiftPresetPeriodsCount >= 3 && (
                                          <>
                                            <div className="p-2 px-3 bg-[#fbf5ff] border border-violet-100 rounded-xl text-start">
                                              <p className="text-[9.5px] font-black uppercase text-violet-500 mb-1.5 text-start no-underline">{lang === 'ar' ? 'ف3 - حضور' : 'P3 - In'}</p>
                                              <input 
                                                type="time" 
                                                value={dayHours.p3In} 
                                                onChange={e => {
                                                  setShiftPresetHours(prev => ({
                                                    ...prev,
                                                    [day.id]: { ...(prev[day.id] || dayHours), p3In: e.target.value }
                                                  }));
                                                }}
                                                className="bg-white border-2 border-slate-200 rounded-xl p-2 md:p-2.5 w-full text-center font-black text-violet-600 focus:border-orange-500/50 outline-none transition-all font-mono text-base md:text-[18px]"
                                              />
                                            </div>
                                            <div className="p-2 px-3 bg-[#fbf5ff] border border-violet-100 rounded-xl text-start">
                                              <p className="text-[9.5px] font-black uppercase text-violet-500 mb-1.5 text-start no-underline">{lang === 'ar' ? 'ف3 - انصراف' : 'P3 - Out'}</p>
                                              <input 
                                                type="time" 
                                                value={dayHours.p3Out} 
                                                onChange={e => {
                                                  setShiftPresetHours(prev => ({
                                                    ...prev,
                                                    [day.id]: { ...(prev[day.id] || dayHours), p3Out: e.target.value }
                                                  }));
                                                }}
                                                className="bg-white border-2 border-slate-200 rounded-xl p-2 md:p-2.5 w-full text-center font-black text-violet-600 focus:border-orange-500/50 outline-none transition-all font-mono text-base md:text-[18px]"
                                              />
                                            </div>
                                          </>
                                        )}

                                      </div>
                                    )}
                                  </div>

                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Footer: Save (start/right) + Cancel (end/left) */}
                        <div className="flex items-center gap-3 pt-3 border-t">
                          <button
                            type="submit"
                            className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-lg transition cursor-pointer text-xs no-underline"
                          >
                            {lang === 'ar' 
                              ? (editingShiftPreset ? 'حفظ تجميع التوقيتات' : 'إضافة وحفظ الوردية') 
                              : (editingShiftPreset ? 'Confirm Timings Update' : 'Apply New Shift preset')}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => { setEditingShiftPreset(null); setActiveShiftModal(false); }}
                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-550 font-black rounded-lg transition cursor-pointer text-xs no-underline"
                          >
                            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                        </div>

                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

            </div>
          )}

          {/* TAB 4: Attendance & Biometric Data Import */}
          {activeMenu === 'attendance' && (
            <div className="space-y-6">
              
              <div className="border-b border-slate-100 pb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 w-full">
                {/* Title Section (Right/Left automatic based on text-right/text-left and dir) */}
                <div className="rtl:text-right text-left">
                  <h3 className="text-md font-bold text-[#0a1945] flex items-center gap-1.5 font-sans">
                    <ClipboardList className="text-orange-500 shrink-0" size={18} />
                    <span>{lang === 'ar' ? 'إدارة الحضور والانصراف والبصمة' : 'Attendance & Biometrics Management'}</span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {lang === 'ar'
                      ? 'سجل حضور وانصراف الموظفين يدوياً أو قم باستيراد ملفات الدوام والخصائص الحيوية لجهاز البصمة.'
                      : 'Record staff attendance manually or import biometric logs from file.'}
                  </p>
                </div>

                {/* Buttons and Status block */}
                <div className="flex flex-col gap-3 w-full md:w-auto items-stretch md:items-end">
                  {/* Row 1 Of Buttons: Clock In & Clock Out */}
                  <div className="flex flex-row items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        setManualAttendanceType('in');
                        setManualAttendanceEmpId(staff[0]?.id || '');
                        const now = new Date();
                        const hours = String(now.getHours()).padStart(2, '0');
                        const mins = String(now.getMinutes()).padStart(2, '0');
                        setManualAttendanceTime(`${hours}:${mins}`);
                        setIsManualAttendanceOpen(true);
                      }}
                      className="py-1.5 px-4 text-xs font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 h-10 transition-all focus:ring-2 focus:ring-emerald-500/20 outline-none flex-1 sm:flex-initial sm:w-[140px] justify-between"
                    >
                      <span className="font-bold">{lang === 'ar' ? 'تسجيل حضور' : 'Clock In'}</span>
                      <Check size={14} className="text-emerald-500 shrink-0" />
                    </button>

                    <button
                      onClick={() => {
                        setManualAttendanceType('out');
                        setManualAttendanceEmpId(staff[0]?.id || '');
                        const now = new Date();
                        const hours = String(now.getHours()).padStart(2, '0');
                        const mins = String(now.getMinutes()).padStart(2, '0');
                        setManualAttendanceTime(`${hours}:${mins}`);
                        setIsManualAttendanceOpen(true);
                      }}
                      className="py-1.5 px-4 text-xs font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 h-10 transition-all focus:ring-2 focus:ring-rose-500/20 outline-none flex-1 sm:flex-initial sm:w-[140px] justify-between"
                    >
                      <span className="font-bold">{lang === 'ar' ? 'تسجيل انصراف' : 'Clock Out'}</span>
                      <X size={14} className="text-rose-500 shrink-0" />
                    </button>
                  </div>

                  {/* Row 2 Of Buttons: Import Biometrics & Status Box */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        setImportedFileText("biometric_dump_june_15.csv (42.5 KB)");
                        triggerHrToast(lang === 'ar' ? 'تم استيراد ومعالجة البصمات آلياً لثلاث فترات بنجاح!' : 'Processed biometric dumps safely across 3 periods!');
                        setAttendanceLogs(prev => [
                          { id: `AL${prev.length+1}`, empId: 'EMP3', timeIn1: '08:58 AM', timeOut1: '12:00 PM', timeIn2: '01:00 PM', timeOut2: '05:01 PM', timeIn3: '05:30 PM', timeOut3: '08:00 PM', mode: 'Imported Biometrics File', status: 'Biometric Verified' },
                          { id: `AL${prev.length+2}`, empId: 'EMP1', timeIn1: '08:45 AM', timeOut1: '12:15 PM', timeIn2: '01:15 PM', timeOut2: '04:59 PM', timeIn3: '--', timeOut3: '--', mode: 'Imported Biometrics File', status: 'Biometric Verified' },
                          ...prev
                        ]);
                      }}
                      className="py-1.5 px-4 text-xs font-black text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg shadow-xs cursor-pointer flex items-center justify-between gap-2 h-10 transition-all focus:ring-2 focus:ring-orange-500/20 outline-none w-full sm:w-[292px]"
                    >
                      <span className="font-bold truncate">{lang === 'ar' ? 'استيراد بيانات البصمه' : 'Import Biometrics'}</span>
                      <Upload size={14} className="text-orange-500 shrink-0" />
                    </button>

                    {importedFileText && (
                      <div className="p-2 px-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-700 w-full sm:w-[260px] animate-fadeIn text-[10px] font-semibold h-10" style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
                        {lang === 'ar' ? (
                          <>
                            <Check size={12} strokeWidth={3} className="shrink-0 text-emerald-500 ml-1" />
                            <div className="min-w-0 flex-1 text-right mr-1">
                              <p className="truncate font-mono leading-none text-emerald-800 text-[9px] font-bold">{importedFileText}</p>
                              <p className="text-[7.5px] text-emerald-400 font-bold mt-0.5 leading-none">
                                تمت المزامنة آلياً للثلاث فترات بنجاح
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="min-w-0 flex-1 text-left mr-1">
                              <p className="truncate font-mono leading-none text-emerald-800 text-[9px] font-bold">{importedFileText}</p>
                              <p className="text-[7.5px] text-emerald-400 font-bold mt-0.5 leading-none">
                                Synchronized successfully
                              </p>
                            </div>
                            <Check size={12} strokeWidth={3} className="shrink-0 text-emerald-500 ml-1" />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Attendance logs table full width layout */}
              <div className="space-y-4">
                  <div className="bg-white border-4 border-white rounded-2xl overflow-visible shadow-md relative hidden md:block">
                    <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 hidden md:flex flex-col sm:flex-row justify-between items-start sm:items-center rtl:flex-row-reverse gap-3.5 min-h-[48px] h-auto">
                      <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1 max-w-md">
                        <div className="relative flex-1 flex items-center">
                          <Search size={14} className="absolute left-3 rtl:right-3 rtl:left-auto text-slate-400 pointer-events-none" />
                          <input 
                            type="text"
                            value={attendanceSearchTerm}
                            onChange={e => setAttendanceSearchTerm(e.target.value)}
                            placeholder={lang === 'ar' ? 'البحث باسم الموظف...' : 'Search employee...'}
                            style={{ height: '36px' }}
                            className="w-full text-xs p-2 pl-8 pr-8 rtl:pr-8 rtl:pl-8 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-400 transition h-[36px]"
                          />
                          {attendanceSearchTerm && (
                            <button
                              onClick={() => setAttendanceSearchTerm('')}
                              className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 -translate-y-1/2 p-0.5 text-slate-450 hover:text-orange-500 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                              title={lang === 'ar' ? 'مسح البحث' : 'Clear search'}
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>

                        {attendanceDirViewMode === 'table' && (
                          <div className="relative group/filter">
                            <button
                              onClick={() => setIsAttendanceColumnFiltersOpen(!isAttendanceColumnFiltersOpen)}
                              style={{ height: '36px' }}
                              className={cn(
                                "p-2 px-3 text-xs font-black rounded-lg border transition flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap min-h-[36px]",
                                isAttendanceColumnFiltersOpen 
                                  ? "bg-[#0a1945] text-white border-[#0a1945]" 
                                  : "bg-white text-black border-slate-200 hover:border-orange-400 hover:text-orange-500"
                              )}
                            >
                              <Filter size={13} className="text-orange-500" />
                            </button>
                            
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/filter:block bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-50 font-bold font-sans pointer-events-none">
                              {lang === 'ar' ? 'بحث متقدم' : 'Advanced Search'}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div
                        className="flex items-center gap-2 w-full justify-between sm:w-auto sm:justify-start"
                        style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}
                      >
                        {/* Settings (rightmost in Arabic) */}
                        <div className="relative group/settings">
                          <button 
                            onClick={() => {
                              setTempAttendanceVisibleColumns({ ...attendanceVisibleColumns });
                              setAttendanceColumnSettingsOpen(!attendanceColumnSettingsOpen);
                            }}
                            style={{ height: '36px' }}
                            className="p-2 text-black hover:text-orange-500 bg-white border border-slate-200 hover:border-orange-400 rounded-lg hover:shadow-xs transition cursor-pointer flex items-center justify-center font-black text-[11px] min-h-[36px] w-[36px]"
                          >
                            <Settings size={14} className="text-orange-500 animate-spin-hover" />
                          </button>
                          
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/settings:block bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-50 font-bold font-sans pointer-events-none">
                            {lang === 'ar' ? 'تخصيص الأعمدة' : 'Customize Columns'}
                          </div>
                        
                          <AnimatePresence>
                            {attendanceColumnSettingsOpen && (
                              <div className="absolute right-0 left-auto mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 p-3.5 text-xs text-right">
                                <div className="pb-2 border-b border-slate-100 mb-2.5">
                                  <h4 className="font-extrabold text-slate-800 text-[12px] text-left rtl:text-right">{lang === 'ar' ? 'اختر الأعمدة' : 'Choose Columns'}</h4>
                                </div>
                                
                                <div className="space-y-2.5 max-h-68 overflow-y-auto">
                                  {Object.entries({
                                    period1: { en: 'Period 1 Duty', ar: 'الفترة الأولى (1)' },
                                    period2: { en: 'Period 2 Duty', ar: 'الفترة الثانية (2)' },
                                    period3: { en: 'Period 3 Duty', ar: 'الفترة الثالثة (3)' },
                                    deviceType: { en: 'Device / Type', ar: 'الحال والوسيلة' },
                                    actions: { en: 'Actions Column', ar: 'خيارات الإجراءات' }
                                  }).map(([key, label]) => (
                                    <div key={key} className="flex items-center gap-2 py-0.5 select-none rtl:flex-row-reverse">
                                      <GripVertical size={12} className="text-slate-400 shrink-0" />
                                      
                                      <label className="flex items-center gap-2 w-full cursor-pointer select-none font-bold text-slate-700 text-left rtl:text-right flex-row rtl:flex-row-reverse">
                                        <input 
                                          type="checkbox" 
                                          checked={tempAttendanceVisibleColumns[key]} 
                                          onChange={(e) => setTempAttendanceVisibleColumns(prev => ({ ...prev, [key]: e.target.checked }))}
                                          className="w-4 h-4 rounded border border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition shrink-0"
                                        />
                                        <span className="text-[10px] font-semibold text-slate-700 truncate">{lang === 'ar' ? label.ar : label.en}</span>
                                      </label>
                                    </div>
                                  ))}
                                </div>
                                
                                <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1">
                                  <button 
                                    onClick={() => setTempAttendanceVisibleColumns({ period1: true, period2: true, period3: true, deviceType: true, actions: true })}
                                    className="px-1.5 py-1 border border-slate-200 text-slate-700 hover:text-[#0a1945] bg-white rounded-lg text-[8.5px] font-bold transition cursor-pointer uppercase tracking-tight"
                                  >
                                    {lang === 'ar' ? 'إعادة' : 'RESET'}
                                  </button>
                                  <div className="flex items-center gap-1">
                                    <button 
                                      onClick={() => setAttendanceColumnSettingsOpen(false)}
                                      className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-lg text-[8.5px] font-bold transition cursor-pointer uppercase tracking-tight"
                                    >
                                      {lang === 'ar' ? 'إلغاء' : 'CANCEL'}
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setAttendanceVisibleColumns({ ...tempAttendanceVisibleColumns });
                                        setAttendanceColumnSettingsOpen(false);
                                        triggerHrToast(lang === 'ar' ? 'تم تطبيق تفضيلات أرشيف الحضور' : 'Attendance table layout applied!');
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

                        {/* Download — between settings and cards */}
                        <div className="relative group/export shrink-0" style={{ height: '36px', width: '36px' }}>
                          <ExportDataButton
                            lang={lang}
                            hideText
                            onToast={triggerHrToast}
                            onCopy={() => triggerHrToast(lang === 'ar' ? 'تم نسخ سجل الحضور إلى الحافظة' : 'Attendance log copied!')}
                            onPrint={() => triggerHrToast(lang === 'ar' ? 'تم فتح خيارات الطباعة لسجل الحضور' : 'Print dialog opened!')}
                            className="w-[36px] h-[36px] block"
                            style={{ height: '36px', width: '36px', minHeight: '36px' }}
                          />
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/export:block bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-50 font-bold font-sans pointer-events-none">
                            {lang === 'ar' ? 'تصدير / تحميل' : 'Export / Download'}
                          </div>
                        </div>

                        {/* Cards toggle — orange icon like settings */}
                        <div className="relative group/toggle">
                          <button
                            onClick={() => setAttendanceDirViewMode(attendanceDirViewMode === 'table' ? 'kanban' : 'table')}
                            style={{ height: '36px' }}
                            className="flex items-center justify-center gap-1.5 p-2 px-3 bg-white border border-slate-200 rounded-lg hover:border-orange-400 hover:text-orange-500 text-slate-650 hover:shadow-xs transition cursor-pointer select-none min-h-[36px] text-[11px] font-black"
                          >
                            {attendanceDirViewMode === 'table' ? (
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
                            {attendanceDirViewMode === 'table' 
                              ? (lang === 'ar' ? 'تحويل لعرض البطاقات' : 'Switch to Cards view')
                              : (lang === 'ar' ? 'تحويل للجدول الكلاسيكي' : 'Switch to Classic Table view')
                            }
                          </div>
                        </div>

                        {/* Attendance Date Filter */}
                        <div className="relative group/date">
                           <input 
                             type="date" 
                             value={attendanceDate} 
                             onChange={e=>setAttendanceDate(e.target.value)} 
                             style={{ height: '36px' }}
                             className="p-1 px-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold font-mono outline-none w-full sm:w-auto min-h-[36px] hover:border-orange-400 focus:border-orange-400 transition" 
                           />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col">
                    {/* Desktop table layout: visible only on medium screens and up */}
                    <div className="hidden md:block overflow-x-auto max-h-[480px] overflow-y-auto relative">
                      <table className="w-full text-left rlt:text-right text-xs table-auto">
                        <thead className="bg-[#fa5a15] text-white uppercase font-sans tracking-wide border-b border-orange-600 sticky top-0 z-30 select-none">
                          <tr>
                            <th className="py-2.5 px-3 bg-[#fa5a15] text-white text-xs font-black text-center border-l border-r border-orange-400/30" rowSpan={2}>{lang==='ar'?'الموظف':'Employee'}</th>
                            {attendanceVisibleColumns.period1 && (
                              <th className="py-1 px-3 bg-[#fa5a15] text-white text-[11px] font-black text-center border-l border-r border-orange-400/40" colSpan={2}>{lang==='ar'?'الفترة الأولى (1)':'Period 1'}</th>
                            )}
                            {attendanceVisibleColumns.period2 && (
                              <th className="py-1 px-3 bg-[#fa5a15] text-white text-[11px] font-black text-center border-l border-r border-orange-400/40" colSpan={2}>{lang==='ar'?'الفترة الثانية (2)':'Period 2'}</th>
                            )}
                            {attendanceVisibleColumns.period3 && (
                              <th className="py-1 px-3 bg-[#fa5a15] text-white text-[11px] font-black text-center border-l border-r border-orange-400/40" colSpan={2}>{lang==='ar'?'الفترة الثالثة (3)':'Period 3'}</th>
                            )}
                            {attendanceVisibleColumns.deviceType && (
                              <th className="py-2 px-3 bg-[#fa5a15] text-white text-xs font-black text-center border-l border-r border-orange-400/30" rowSpan={2}>{lang==='ar'?'الحال والوسيلة':'Device / Type'}</th>
                            )}
                            {attendanceVisibleColumns.actions && (
                              <th className="py-2 px-3 bg-[#fa5a15] text-white text-xs font-black text-center border-l border-r border-orange-400/30" rowSpan={2}>{lang==='ar'?'الجراءات':'Actions'}</th>
                            )}
                          </tr>
                          <tr className="bg-orange-600 text-white text-[10px]">
                            {attendanceVisibleColumns.period1 && (
                              <>
                                <th className="py-1 px-2 text-center font-bold border-l border-orange-400/30 bg-orange-600">{lang==='ar'?'حضور':'In'}</th>
                                <th className="py-1 px-2 text-center font-bold border-r border-orange-400/30 bg-orange-600">{lang==='ar'?'انصراف':'Out'}</th>
                              </>
                            )}
                            {attendanceVisibleColumns.period2 && (
                              <>
                                <th className="py-1 px-2 text-center font-bold border-l border-orange-400/30 bg-orange-600">{lang==='ar'?'حضور':'In'}</th>
                                <th className="py-1 px-2 text-center font-bold border-r border-orange-400/30 bg-orange-600">{lang==='ar'?'انصراف':'Out'}</th>
                              </>
                            )}
                            {attendanceVisibleColumns.period3 && (
                              <>
                                <th className="py-1 px-2 text-center font-bold border-l border-orange-400/30 bg-orange-600">{lang==='ar'?'حضور':'In'}</th>
                                <th className="py-1 px-2 text-center font-bold border-r border-orange-400/30 bg-orange-600">{lang==='ar'?'انصراف':'Out'}</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-705 font-sans">
                          {paginatedAttendanceLogs.map(log => {
                            const emp = staff.find(s => s.id === log.empId);
                            return (
                              <tr key={log.id} className="hover:bg-slate-50/20 text-xs">
                                <td className="py-3 px-4 font-bold text-slate-800">
                                  {emp ? (lang === 'ar' ? emp.nameAr : emp.name) : 'Staff'}
                                </td>
                                {attendanceVisibleColumns.period1 && (
                                  <>
                                    <td className="py-3 px-2 text-center font-mono font-bold text-blue-600 border-r border-slate-100 bg-sky-50/20">{log.timeIn1 || '--'}</td>
                                    <td className="py-3 px-2 text-center font-mono font-bold text-slate-500 border-r border-slate-100">{log.timeOut1 || '--'}</td>
                                  </>
                                )}
                                {attendanceVisibleColumns.period2 && (
                                  <>
                                    <td className="py-3 px-2 text-center font-mono font-bold text-blue-600 border-r border-slate-100 bg-sky-50/20">{log.timeIn2 || '--'}</td>
                                    <td className="py-3 px-2 text-center font-mono font-bold text-slate-500 border-r border-slate-100">{log.timeOut2 || '--'}</td>
                                  </>
                                )}
                                {attendanceVisibleColumns.period3 && (
                                  <>
                                    <td className="py-3 px-2 text-center font-mono font-bold text-blue-600 border-r border-slate-100 bg-sky-50/20">{log.timeIn3 || '--'}</td>
                                    <td className="py-3 px-2 text-center font-mono font-bold text-slate-500 border-r border-slate-100">{log.timeOut3 || '--'}</td>
                                  </>
                                )}
                                {attendanceVisibleColumns.deviceType && (
                                  <td className="py-3 px-4 text-center">
                                    <div className="flex flex-col items-center">
                                      <span className="text-[9px] font-bold text-slate-450">{log.mode}</span>
                                      <span className="text-[8px] bg-blue-50 text-blue-600 font-semibold px-1 rounded border border-blue-100 mt-0.5">{log.status}</span>
                                    </div>
                                  </td>
                                )}
                                {attendanceVisibleColumns.actions && (
                                  <td className="py-3 px-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        onClick={() => {
                                          setEditingAttendanceLog({ ...log });
                                          setIsEditAttendanceOpen(true);
                                        }}
                                        className="p-1.5 text-blue-650 hover:text-blue-800 hover:bg-blue-50 border border-blue-200 hover:border-blue-300 rounded-lg cursor-pointer transition-all flex items-center justify-center shadow-2xs"
                                        title={lang === 'ar' ? 'تعديل السجل' : 'Edit Log'}
                                      >
                                        <Edit2 size={13} className="text-blue-550 shrink-0" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (confirm(lang === 'ar' ? 'هل أنت متأكد من حذف سجل الحضور هذا؟' : 'Are you sure you want to delete this attendance log?')) {
                                            setAttendanceLogs(prev => prev.filter(l => l.id !== log.id));
                                            triggerHrToast(lang === 'ar' ? 'تم حذف سجل الحضور بنجاح' : 'Attendance record deleted');
                                          }
                                        }}
                                        className="p-1.5 text-red-650 hover:text-red-800 hover:bg-red-50 border border-red-200 hover:border-red-300 rounded-lg cursor-pointer transition-all flex items-center justify-center shadow-2xs"
                                        title={lang === 'ar' ? 'حذف السجل' : 'Delete Log'}
                                      >
                                        <Trash2 size={13} className="text-red-550 shrink-0" />
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                          {paginatedAttendanceLogs.length === 0 && (
                            <tr>
                              <td colSpan={10} className="py-8 text-center text-slate-400 font-semibold text-xs bg-white">
                                {lang === 'ar' ? 'لا يوجد نتائج تطابق بحثك' : 'No matching attendance logs found'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Kanban Card Layout: rendered as cards instead of a table on small screens */}
                    <div className="block md:hidden p-4 space-y-3 bg-slate-50/40">
                      {paginatedAttendanceLogs.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 font-semibold text-xs bg-white rounded-2xl border border-slate-100">
                          {lang === 'ar' ? 'لا يوجد نتائج تطابق بحثك' : 'No matching attendance logs found'}
                        </div>
                      ) : (
                        paginatedAttendanceLogs.map(log => {
                          const emp = staff.find(s => s.id === log.empId);
                          const empName = emp ? (lang === 'ar' ? emp.nameAr : emp.name) : 'Staff';
                          return (
                            <div key={log.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden transition-all hover:border-slate-300">
                              {/* Card Header with Employee Name */}
                              <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                                <span className="font-extrabold text-slate-800 text-xs text-right w-full">{empName}</span>
                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                  {attendanceVisibleColumns.actions && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingAttendanceLog({ ...log });
                                          setIsEditAttendanceOpen(true);
                                        }}
                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                        title={lang === 'ar' ? 'تعديل السجل' : 'Edit Log'}
                                      >
                                        <Edit2 size={12} />
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (confirm(lang === 'ar' ? 'هل أنت متأكد من حذف سجل الحضور هذا؟' : 'Are you sure you want to delete this attendance log?')) {
                                            setAttendanceLogs(prev => prev.filter(l => l.id !== log.id));
                                            triggerHrToast(lang === 'ar' ? 'تم حذف سجل الحضور بنجاح' : 'Attendance record deleted');
                                          }
                                        }}
                                        className="p-1 text-red-650 hover:bg-red-55 rounded-lg transition cursor-pointer"
                                        title={lang === 'ar' ? 'حذف السجل' : 'Delete Log'}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </>
                                  )}
                                </div>
                                <span className="text-[9px] font-mono text-slate-450 bg-slate-100 px-1.5 py-0.5 rounded ml-2 shrink-0">{log.id}</span>
                              </div>

                              {/* Card Body with Attendance Periods */}
                              <div className="grid grid-cols-3 gap-2 text-center text-[13px] mb-3">
                                {/* Period 1 */}
                                <div className="bg-slate-50/80 p-1.5 rounded-xl border border-slate-100">
                                  <span className="text-[10.5px] font-black text-orange-600 block mb-1">{lang === 'ar' ? 'الفترة ١' : 'Period 1'}</span>
                                  <div className="flex flex-col gap-0.5 text-[11.7px]">
                                    <div className="flex justify-between items-center gap-1 font-mono">
                                      <span className="text-slate-400 text-[10.5px]">{lang === 'ar' ? 'حضور' : 'In'}</span>
                                      <span className="text-blue-600 font-bold">{log.timeIn1 || '--'}</span>
                                    </div>
                                    <div className="flex justify-between items-center gap-1 font-mono border-t border-slate-100 pt-0.5">
                                      <span className="text-slate-400 text-[10.5px]">{lang === 'ar' ? 'انصراف' : 'Out'}</span>
                                      <span className="text-slate-500 font-bold">{log.timeOut1 || '--'}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Period 2 */}
                                <div className="bg-slate-50/80 p-1.5 rounded-xl border border-slate-100">
                                  <span className="text-[10.5px] font-black text-orange-600 block mb-1">{lang === 'ar' ? 'الفترة ٢' : 'Period 2'}</span>
                                  <div className="flex flex-col gap-0.5 text-[11.7px]">
                                    <div className="flex justify-between items-center gap-1 font-mono">
                                      <span className="text-slate-400 text-[10.5px]">{lang === 'ar' ? 'حضور' : 'In'}</span>
                                      <span className="text-blue-600 font-bold">{log.timeIn2 || '--'}</span>
                                    </div>
                                    <div className="flex justify-between items-center gap-1 font-mono border-t border-slate-100 pt-0.5">
                                      <span className="text-slate-400 text-[10.5px]">{lang === 'ar' ? 'انصراف' : 'Out'}</span>
                                      <span className="text-slate-500 font-bold">{log.timeOut2 || '--'}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Period 3 */}
                                <div className="bg-slate-50/80 p-1.5 rounded-xl border border-slate-100">
                                  <span className="text-[10.5px] font-black text-orange-600 block mb-1">{lang === 'ar' ? 'الفترة ٣' : 'Period 3'}</span>
                                  <div className="flex flex-col gap-0.5 text-[11.7px]">
                                    <div className="flex justify-between items-center gap-1 font-mono">
                                      <span className="text-slate-400 text-[10.5px]">{lang === 'ar' ? 'حضور' : 'In'}</span>
                                      <span className="text-blue-600 font-bold">{log.timeIn3 || '--'}</span>
                                    </div>
                                    <div className="flex justify-between items-center gap-1 font-mono border-t border-slate-100 pt-0.5">
                                      <span className="text-slate-400 text-[10.5px]">{lang === 'ar' ? 'انصراف' : 'Out'}</span>
                                      <span className="text-slate-500 font-bold">{log.timeOut3 || '--'}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Card Footer with Device / Status */}
                              <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 text-[10px] w-full">
                                <span className="text-[8.5px] font-bold text-slate-450">{log.mode}</span>
                                <span className="text-[8px] bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded border border-blue-100">{log.status}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Dynamic Attendance Pagination Controls with orange/navy theme details */}
                    <div className="p-4 border-t border-slate-100 bg-[#fbfbfb] flex flex-col md:flex-row items-center justify-between gap-4 font-sans text-xs text-slate-650">
                      {/* 1. Showing elements counter range */}
                      <div className="flex items-center gap-1.5 font-bold shrink-0">
                        <span>{lang === 'ar' ? 'عرض' : 'Showing'}</span>
                        {filteredAttendanceLogs.length === 0 ? (
                          <span className="font-extrabold text-[#0a1945] font-mono bg-slate-100 px-2.5 py-0.5 rounded-lg text-[10.5px]">0</span>
                        ) : (
                          <>
                            <span className="font-extrabold text-[#0a1945] font-mono bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                              {attendanceStartIndex + 1}
                            </span>
                            <span>-</span>
                            <span className="font-extrabold text-[#0a1945] font-mono bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                              {Math.min(attendanceStartIndex + attendancePageSize, filteredAttendanceLogs.length)}
                            </span>
                            <span>{lang === 'ar' ? 'من أصل' : 'of'}</span>
                            <span className="font-extrabold text-orange-650 font-mono bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                              {filteredAttendanceLogs.length}
                            </span>
                          </>
                        )}
                      </div>

                      {/* 2. Numerical Pagination Items */}
                      <div className="flex items-center gap-1 shrink-0 select-none">
                        {/* Previous Page arrow */}
                        <button
                          disabled={attendanceCurrentPage === 1}
                          onClick={() => setAttendanceCurrentPage(prev => Math.max(1, prev - 1))}
                          className="p-2 border border-slate-200 hover:border-orange-400 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-650 hover:text-orange-500 hover:bg-orange-50/20 transition cursor-pointer h-8 w-8 flex items-center justify-center shadow-xs"
                          title={lang === 'ar' ? 'الصفحة السابقة' : 'Previous page'}
                        >
                          {lang === 'ar' ? <ChevronRight size={13} strokeWidth={2.5} /> : <ChevronLeft size={13} strokeWidth={2.5} />}
                        </button>

                        {/* Calculated dynamic pages range */}
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(totalAttendancePages, 3) }, (_, i) => i + 1).map(page => {
                            const isActive = page === attendanceCurrentPage;
                            return (
                              <button
                                key={page}
                                onClick={() => setAttendanceCurrentPage(page)}
                                className={cn(
                                  "w-8 h-8 rounded-lg font-extrabold transition cursor-pointer text-xs flex items-center justify-center border font-mono shadow-xs",
                                  isActive
                                    ? "bg-[#0a1945] text-white border-[#0a1945]"
                                    : "bg-white text-slate-700 border-slate-200 hover:border-orange-400 hover:text-orange-500"
                                )}
                              >
                                {page}
                              </button>
                            );
                          })}
                        </div>

                        {/* Next Page arrow */}
                        <button
                          disabled={attendanceCurrentPage === totalAttendancePages}
                          onClick={() => setAttendanceCurrentPage(prev => Math.min(totalAttendancePages, prev + 1))}
                          className="p-2 border border-slate-200 hover:border-orange-400 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-650 hover:text-orange-500 hover:bg-orange-50/20 transition cursor-pointer h-8 w-8 flex items-center justify-center shadow-xs"
                          title={lang === 'ar' ? 'الصفحة التالية' : 'Next page'}
                        >
                          {lang === 'ar' ? <ChevronLeft size={13} strokeWidth={2.5} /> : <ChevronRight size={13} strokeWidth={2.5} />}
                        </button>
                      </div>

                      {/* 3. Page Size Dropdown Select Menu */}
                      <div className="flex items-center gap-2 text-slate-500 font-bold shrink-0">
                        <span>{lang === 'ar' ? 'عرض' : 'Show'}</span>
                        <select
                          value={attendancePageSize}
                          onChange={(e) => {
                            setAttendancePageSize(Number(e.target.value));
                            setAttendanceCurrentPage(1); // Reset back to first page safely
                          }}
                          className="bg-white border border-slate-200 text-[#0a1945] rounded-xl px-2 py-1.5 text-xs font-black shadow-xs outline-none focus:border-orange-400 cursor-pointer w-16 text-center"
                        >
                          {[5, 6, 10, 20, 50].map(sz => (
                            <option key={sz} value={sz} className="font-bold">
                              {sz}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
          )}

          {/* TAB 6A: Employee Rewards Registrar */}
          {activeMenu === 'bonus' && (
            <div className="space-y-6 animate-fadeIn font-sans">
              
              {/* Stylish and elegant Header Section */}
              <div className="bg-gradient-to-r from-slate-50 to-orange-50/30 p-5 rounded-2xl border border-slate-200/65 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="rtl:text-right text-left pb-1">
                  <span className="bg-emerald-600 text-white font-extrabold text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full">
                    {lang === 'ar' ? 'سجل المكافآت الفوري' : 'Live Reward Registrar'}
                  </span>
                  <h3 className="text-md md:text-lg font-black text-[#0a1945] mt-1.5 flex items-center gap-2">
                    <Gift className="text-emerald-600 animate-pulse" size={19} />
                    <span>{lang === 'ar' ? 'تسجيل مكافآت الموظفين' : 'Employee Rewards'}</span>
                  </h3>
                  <p className="text-slate-500 text-xs mt-1 max-w-xl font-medium leading-relaxed">
                    {lang === 'ar' 
                      ? 'قم بتسجيل البدلات والمكافأت وسوف تسجل فى مسيرات الروات تلقائياً' 
                      : 'Reward staff members for outstanding performance and excellence. All incentives are instantly synced with payroll slips.'}
                  </p>
                </div>

                {/* Summary + Add Bonus under total, inside header strip */}
                <div className="flex flex-col gap-2.5 shrink-0 w-full md:w-[280px]">
                  <div className="bg-emerald-50 border border-emerald-100 p-3.5 px-5 rounded-2xl text-center font-sans w-full">
                    <span className="block text-[10px] uppercase tracking-wider font-extrabold text-emerald-500">{lang === 'ar' ? 'إجمالي المكافآت' : 'Total Issued Rewards'}</span>
                    <span className="text-base font-black text-emerald-600 font-mono mt-1 block">
                      {bonusesList.filter(b => bonusFilterMonth === 'all' || b.date.startsWith(bonusFilterMonth)).reduce((sum, b) => sum + b.amount, 0).toLocaleString()} <span className="text-xs font-sans font-bold">{lang === 'ar' ? 'ج.م' : 'EGP'}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBonusId(null);
                      setNewBonusEmp(staff[0]?.id || 'EMP1');
                      setNewBonusAmount(250);
                      setNewBonusReason('');
                      setSelectedRewardType('custom');
                      setShowRewardModal(true);
                    }}
                    className="w-full h-[36px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Plus size={15} strokeWidth={2.5} />
                    <span className="text-[10px] whitespace-nowrap">{lang === 'ar' ? 'إضافة مكافأة' : 'Add Bonus'}</span>
                  </button>
                </div>
              </div>

              {/* Reward Modal Popup */}
              <AnimatePresence>
                {showRewardModal && (
                  <div className="fixed inset-0 bg-[#0a1945]/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0, y: -20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.95, opacity: 0, y: -20 }}
                      className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-2xl max-w-md w-full text-xs select-none"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between bg-orange-500 text-white px-5" style={{ height: '66px' }}>
                        <span className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-xl bg-orange-600/30 text-white flex items-center justify-center font-bold">🏆</span>
                          <div className="text-left rtl:text-right">
                            <h3 className="text-sm font-black text-white">
                              {editingBonusId 
                                ? (lang === 'ar' ? 'تعديل مكافأة / حافز أداء الموظف' : 'Edit Performance Reward')
                                : (lang === 'ar' ? 'إثبات مكافأة / حافز أداء' : 'Issue Performance Reward')
                              }
                            </h3>
                            <p className="text-[10px] text-white/80 font-bold mt-0.5">
                              {lang === 'ar' ? 'إضافة مبالغ إضافية على راتب الشهر المفتوح' : 'Add cash increments to the active payroll cycle'}
                            </p>
                          </div>
                        </span>
                        <button 
                          type="button"
                          onClick={() => setShowRewardModal(false)}
                          className="text-white hover:text-orange-100 p-1.5 rounded-lg hover:bg-orange-600 transition cursor-pointer"
                        >
                          <X size={16} strokeWidth={2.5} />
                        </button>
                      </div>

                      <div className="p-6 space-y-4">
                      {/* Form */}
                      <form onSubmit={handleAddBonus} className="space-y-4 text-left rtl:text-right">
                        {/* Select Employee */}
                        <div>
                          <label className="block text-[11px] font-extrabold text-slate-500 mb-1.5">
                            {lang === 'ar' ? 'اختر الموظف المستفيد' : 'Select Staff Member'}
                          </label>
                          <select
                            value={newBonusEmp}
                            onChange={e => setNewBonusEmp(e.target.value)}
                            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-800 transition"
                          >
                            {staff.map(emp => (
                              <option key={emp.id} value={emp.id}>
                                {emp.id} - {lang === 'ar' ? emp.nameAr : emp.name} ({lang === 'ar' ? emp.roleAr : emp.role})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Select Reward Category Dropdown */}
                        <div>
                          <label className="block text-[11px] font-extrabold text-slate-505 mb-1.5">
                            {lang === 'ar' ? 'تصنيف المكافأة أو البدل أو الحافز' : 'Reward / Allowance / Bonus Category'}
                          </label>
                          <select
                            value={selectedRewardType}
                            onChange={e => handleRewardTypeChange(e.target.value)}
                            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-800 transition"
                          >
                            <option value="custom">
                              {lang === 'ar' ? '✨ مكافأة / بدل مخصص (تحديد يدوي)' : '✨ Custom Reward / Allowance (Manual)'}
                            </option>
                            <optgroup label={lang === 'ar' ? '💡 البدلات المالية من المسميات المالية' : '💡 Allowances from Financial Namings'}>
                              {financialSettings.filter(f => f.type === 'Allowance').map(alw => (
                                <option key={alw.id} value={alw.id}>
                                  {lang === 'ar' ? alw.nameAr : alw.nameEn} ({alw.amount} EGP)
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label={lang === 'ar' ? '💼 حوافز الهيكل الوظيفي' : '💼 Job Position Incentives'}>
                              {jobTitles.map(title => (
                                <option key={title.id} value={title.id}>
                                  {lang === 'ar' ? `حافز أداء - ${title.titleAr}` : `Incentive - ${title.titleEn}`}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>

                        {/* Amount Input with Quick Selection Buttons */}
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-[11px] font-extrabold text-slate-505">
                              {lang === 'ar' ? 'قيمة المكافأة المستحقة' : 'Reward amount (EGP)'}
                            </label>
                            <span className="text-[10px] font-mono text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded font-black">+{newBonusAmount} EGP</span>
                          </div>
                          <input
                            type="number"
                            min="1"
                            value={newBonusAmount}
                            onChange={e => setNewBonusAmount(Number(e.target.value))}
                            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-800 font-mono transition"
                            placeholder="250"
                            required
                          />
                          
                          {/* Quick click presets */}
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {[100, 250, 500, 1000, 2000].map(amt => (
                              <button
                                type="button"
                                key={amt}
                                onClick={() => setNewBonusAmount(amt)}
                                className={cn(
                                  "text-[10px] font-extrabold px-3 py-1 rounded-lg border transition cursor-pointer select-none",
                                  newBonusAmount === amt 
                                    ? "bg-emerald-500 text-white border-emerald-500" 
                                    : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-600"
                                )}
                              >
                                +{amt}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Reward Reason Notes */}
                        <div>
                          <label className="block text-[11px] font-extrabold text-slate-505 mb-1.5 font-sans">
                            {lang === 'ar' ? 'سبب ومسوّغات المكافأة' : 'Reason / Performance Notes'}
                          </label>
                          <input
                            type="text"
                            value={newBonusReason}
                            onChange={e => setNewBonusReason(e.target.value)}
                            placeholder={lang === 'ar' ? 'مثال: تميز في تنظيم مخزون فرع التجمع والالتزام بالدوام' : 'e.g. Exceptional customer service leadership & weekend support'}
                            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-800 transition"
                          />
                        </div>

                        {/* Submit Actions */}
                        <div className="flex items-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowRewardModal(false)}
                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-lg cursor-pointer transition text-xs uppercase"
                          >
                            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                          <button
                            type="submit"
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg shadow-md cursor-pointer transition text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-[0.98]"
                          >
                            <Plus size={15} />
                            <span>{editingBonusId 
                              ? (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes')
                              : (lang === 'ar' ? 'إعتماد ومكافأة' : 'Approve & Post')
                            }</span>
                          </button>
                        </div>
                      </form>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Bonus Toolbar */}
              <div className="bg-white border-4 border-white rounded-2xl overflow-visible shadow-md relative hidden md:block mb-4">
                <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 hidden md:flex flex-col sm:flex-row justify-between items-start sm:items-center rtl:flex-row-reverse gap-3.5 min-h-[48px] h-auto">
                  <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1 max-w-md">
                    <div className="relative flex-1 flex items-center">
                      <Search size={14} className="absolute left-3 rtl:right-3 rtl:left-auto text-slate-400 pointer-events-none" />
                      <input 
                        type="text"
                        value={bonusSearchQuery}
                        onChange={e => setBonusSearchQuery(e.target.value)}
                        placeholder={lang === 'ar' ? 'البحث باسم الموظف، الكود أو سبب المكافأة...' : 'Search employee, code or reason...'}
                        style={{ height: '36px' }}
                        className="w-full text-xs p-2 pl-8 pr-8 rtl:pr-8 rtl:pl-8 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-400 transition h-[36px]"
                      />
                      {bonusSearchQuery && (
                        <button
                          onClick={() => setBonusSearchQuery('')}
                          className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 -translate-y-1/2 p-0.5 text-slate-450 hover:text-orange-500 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                          title={lang === 'ar' ? 'مسح البحث' : 'Clear search'}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {bonusDirViewMode === 'table' && (
                      <div className="relative group/filter">
                        <button
                          onClick={() => setIsBonusColumnFiltersOpen(!isBonusColumnFiltersOpen)}
                          style={{ height: '36px' }}
                          className={cn(
                            "p-2 px-3 text-xs font-black rounded-lg border transition flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap min-h-[36px]",
                            isBonusColumnFiltersOpen 
                              ? "bg-[#0a1945] text-white border-[#0a1945]" 
                              : "bg-white text-black border-slate-200 hover:border-orange-400 hover:text-orange-500"
                          )}
                        >
                          <Filter size={13} className="text-orange-500" />
                        </button>
                        
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/filter:block bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-50 font-bold font-sans pointer-events-none">
                          {lang === 'ar' ? 'بحث متقدم' : 'Advanced Search'}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div
                    className="flex items-center gap-2 w-full justify-between sm:w-auto sm:justify-start"
                    style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}
                  >
                    {/* Settings */}
                    <div className="relative group/settings">
                      <button 
                        onClick={() => {
                          setTempBonusVisibleColumns({ ...bonusVisibleColumns });
                          setBonusColumnSettingsOpen(!bonusColumnSettingsOpen);
                        }}
                        style={{ height: '36px' }}
                        className="p-2 text-black hover:text-orange-500 bg-white border border-slate-200 hover:border-orange-400 rounded-lg hover:shadow-xs transition cursor-pointer flex items-center justify-center font-black text-[11px] min-h-[36px] w-[36px]"
                      >
                        <Settings size={14} className="text-orange-500 animate-spin-hover" />
                      </button>
                      
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/settings:block bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-50 font-bold font-sans pointer-events-none">
                        {lang === 'ar' ? 'تخصيص الأعمدة' : 'Customize Columns'}
                      </div>
                    
                      <AnimatePresence>
                        {bonusColumnSettingsOpen && (
                          <div className="absolute right-0 left-auto mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 p-3.5 text-xs text-right">
                            <div className="pb-2 border-b border-slate-100 mb-2.5">
                              <h4 className="font-extrabold text-slate-800 text-[12px] text-left rtl:text-right">{lang === 'ar' ? 'اختر الأعمدة' : 'Choose Columns'}</h4>
                            </div>
                            
                            <div className="space-y-2.5 max-h-68 overflow-y-auto">
                              {Object.entries({
                                empId: { en: 'Emp ID', ar: 'كود الموظف' },
                                name: { en: 'Employee', ar: 'الموظف' },
                                amount: { en: 'Amount', ar: 'القيمة' },
                                reason: { en: 'Reason', ar: 'السبب' },
                                date: { en: 'Date', ar: 'التاريخ' },
                                actions: { en: 'Actions', ar: 'خيارات' }
                              }).map(([key, label]) => (
                                <div key={key} className="flex items-center gap-2 py-0.5 select-none rtl:flex-row-reverse">
                                  <GripVertical size={12} className="text-slate-400 shrink-0" />
                                  
                                  <label className="flex items-center gap-2 w-full cursor-pointer select-none font-bold text-slate-700 text-left rtl:text-right flex-row rtl:flex-row-reverse">
                                    <input 
                                      type="checkbox" 
                                      checked={tempBonusVisibleColumns[key]} 
                                      onChange={(e) => setTempBonusVisibleColumns(prev => ({ ...prev, [key]: e.target.checked }))}
                                      className="w-4 h-4 rounded border border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition shrink-0"
                                    />
                                    <span className="text-[10px] font-semibold text-slate-700 truncate">{lang === 'ar' ? label.ar : label.en}</span>
                                  </label>
                                </div>
                              ))}
                            </div>
                            
                            <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1">
                              <button 
                                onClick={() => setTempBonusVisibleColumns({ empId: true, name: true, amount: true, reason: true, date: true, actions: true })}
                                className="px-1.5 py-1 border border-slate-200 text-slate-700 hover:text-[#0a1945] bg-white rounded-lg text-[8.5px] font-bold transition cursor-pointer uppercase tracking-tight"
                              >
                                {lang === 'ar' ? 'إعادة' : 'RESET'}
                              </button>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => setBonusColumnSettingsOpen(false)}
                                  className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-lg text-[8.5px] font-bold transition cursor-pointer uppercase tracking-tight"
                                >
                                  {lang === 'ar' ? 'إلغاء' : 'CANCEL'}
                                </button>
                                <button 
                                  onClick={() => {
                                    setBonusVisibleColumns({ ...tempBonusVisibleColumns });
                                    setBonusColumnSettingsOpen(false);
                                    triggerHrToast(lang === 'ar' ? 'تم تطبيق تفضيلات أرشيف المكافآت' : 'Bonus table layout applied!');
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

                    {/* Download — between settings and cards */}
                    <div className="relative group/export shrink-0" style={{ height: '36px', width: '36px' }}>
                      <ExportDataButton
                        lang={lang}
                        hideText
                        onToast={triggerHrToast}
                        onCopy={() => triggerHrToast(lang === 'ar' ? 'تم نسخ سجل المكافآت' : 'Rewards registry copied!')}
                        onPrint={() => triggerHrToast(lang === 'ar' ? 'تم فتح خيارات الطباعة لسجل المكافآت' : 'Print options opened for rewards!')}
                        className="w-[36px] h-[36px] block"
                        style={{ height: '36px', width: '36px', minHeight: '36px' }}
                      />
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/export:block bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-50 font-bold font-sans pointer-events-none">
                        {lang === 'ar' ? 'تصدير / تحميل' : 'Export / Download'}
                      </div>
                    </div>

                    {/* Cards — orange icon */}
                    <div className="relative group/toggle">
                      <button
                        onClick={() => setBonusDirViewMode(bonusDirViewMode === 'table' ? 'kanban' : 'table')}
                        style={{ height: '36px' }}
                        className="flex items-center justify-center gap-1.5 p-2 px-3 bg-white border border-slate-200 rounded-lg hover:border-orange-400 hover:text-orange-500 text-slate-650 hover:shadow-xs transition cursor-pointer select-none min-h-[36px] text-[11px] font-black"
                      >
                        {bonusDirViewMode === 'table' ? (
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
                        {bonusDirViewMode === 'table' 
                          ? (lang === 'ar' ? 'تحويل لعرض البطاقات' : 'Switch to Cards view')
                          : (lang === 'ar' ? 'تحويل للجدول الكلاسيكي' : 'Switch to Classic Table view')
                        }
                      </div>
                    </div>

                    {/* Month filter */}
                    <div className="relative group/date">
                      <select
                        value={bonusFilterMonth}
                        onChange={(e) => {
                          setBonusFilterMonth(e.target.value);
                          setBonusCurrentPage(1);
                        }}
                        style={{ height: '36px' }}
                        className="p-1 px-3 pr-7 rtl:pl-7 rtl:pr-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold font-sans outline-none w-full sm:w-auto min-h-[36px] hover:border-orange-400 focus:border-orange-400 transition cursor-pointer appearance-none text-[#0a1945]"
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

              {/* Live Interactive Ledgers Section */}
              <div className="bg-white border border-slate-205 rounded-3xl p-5 shadow-sm">

                <div className="space-y-3">
                  {bonusDirViewMode === 'table' ? (
                  <>
                  {/* Web Tables view */}
                  <div className="hidden sm:block overflow-x-auto border border-slate-150 rounded-2xl max-h-[320px] overflow-y-auto">
                    <table className="w-full text-left rtl:text-right text-xs table-auto">
                      <thead className="bg-orange-500 text-white sticky top-0 z-10 font-bold select-none rounded-t-2xl">
                        <tr className="border-b border-orange-600/20 text-white">
                          {bonusVisibleColumns.name && <th className="py-3 px-3 text-white font-extrabold">{lang === 'ar' ? 'الموظف' : 'Employee'}</th>}
                          {bonusVisibleColumns.amount && <th className="py-3 px-3 text-center text-white font-extrabold">{lang === 'ar' ? 'القيمة' : 'Amount'}</th>}
                          {bonusVisibleColumns.reason && <th className="py-3 px-3 text-white font-extrabold">{lang === 'ar' ? 'التفاصيل والسبب' : 'Reason / Note'}</th>}
                          {bonusVisibleColumns.date && <th className="py-3 px-3 text-center text-white font-extrabold">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>}
                          {bonusVisibleColumns.actions && <th className="py-3 px-3 text-center"></th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-705">
                        {filteredBonuses.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">
                              {lang === 'ar' ? 'لا توجد مكافآت مسجلة حالياً' : 'No rewards registered yet.'}
                            </td>
                          </tr>
                        ) : (
                          paginatedBonuses.map(b => {
                            const emp = staff.find(s => s.id === b.empId);
                            return (
                              <tr key={b.id} className="hover:bg-slate-55/40 transition">
                                {bonusVisibleColumns.name && (
                                <td className="py-2.5 px-3">
                                  <div>
                                    <p className="font-extrabold text-slate-800 text-[11px] font-sans">{emp ? (lang === 'ar' ? emp.nameAr : emp.name) : 'Unknown'}</p>
                                    {bonusVisibleColumns.empId && <p className="text-[9px] text-slate-400 font-mono tracking-tight">{b.empId}</p>}
                                  </div>
                                </td>
                                )}
                                {bonusVisibleColumns.amount && (
                                <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-600">
                                  +{b.amount.toLocaleString()} EGP
                                </td>
                                )}
                                {bonusVisibleColumns.reason && (
                                <td className="py-2.5 px-3 text-slate-500 text-[11px] font-medium leading-tight max-w-[250px] truncate" title={lang === 'ar' ? b.reasonAr : b.reasonEn}>
                                  {lang === 'ar' ? b.reasonAr : b.reasonEn}
                                </td>
                                )}
                                {bonusVisibleColumns.date && (
                                <td className="py-2.5 px-3 text-center font-mono text-[10px] text-slate-400">
                                  {b.date}
                                </td>
                                )}
                                {bonusVisibleColumns.actions && (
                                <td className="py-2.5 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => startEditBonus(b)}
                                      className="p-1 text-slate-450 hover:text-[#0a1945] hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                      title={lang === 'ar' ? 'تعديل المعاملة' : 'Edit transaction'}
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteBonus(b.id, b.empId, b.amount)}
                                      className="p-1 text-slate-450 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                      title={lang === 'ar' ? 'حذف المعاملة' : 'Delete transaction'}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                                )}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  </>
                  ) : (
                    <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredBonuses.length === 0 ? (
                        <div className="col-span-full py-8 text-center text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-2xl">
                          {lang === 'ar' ? 'لا توجد بيانات للعرض' : 'No data to display'}
                        </div>
                      ) : (
                        paginatedBonuses.map(b => {
                          const emp = staff.find(s => s.id === b.empId);
                          return (
                            <div key={b.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h4 className="font-extrabold text-[#0a1945] text-xs font-sans">{emp ? (lang === 'ar' ? emp.nameAr : emp.name) : 'Unknown'}</h4>
                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{b.empId}</p>
                                </div>
                                <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-[11px] font-black font-mono">
                                  +{b.amount.toLocaleString()}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mb-3">{lang === 'ar' ? b.reasonAr : b.reasonEn}</p>
                              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                <span className="text-[10px] text-slate-400 font-mono">{b.date}</span>
                                <div className="flex gap-1.5">
                                  <button onClick={() => startEditBonus(b)} className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg transition cursor-pointer">
                                    <Edit2 size={12} />
                                  </button>
                                  <button onClick={() => handleDeleteBonus(b.id, b.empId, b.amount)} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition cursor-pointer">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}


                  {/* Mobile Kanban Cards View */}
                  <div className="block sm:hidden space-y-4">
                    {filteredBonuses.length === 0 ? (
                      <div className="py-10 text-center text-slate-400 font-bold bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        {lang === 'ar' ? 'لا توجد مكافآت مسجلة حالياً' : 'No rewards registered yet.'}
                      </div>
                    ) : (
                      paginatedBonuses.map(b => {
                        const emp = staff.find(s => s.id === b.empId);
                        return (
                          <div key={b.id} className="bg-white border border-slate-200/95 rounded-3xl p-5 shadow-xs hover:border-emerald-300 transition flex flex-col gap-4 relative">
                            <div className="flex justify-between items-start">
                              <div className="text-left rtl:text-right">
                                <p className="font-extrabold text-slate-800 text-xs">
                                  {emp ? (lang === 'ar' ? emp.nameAr : emp.name) : 'Unknown'}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono tracking-tight">{b.empId}</p>
                              </div>
                              <span className="text-xs font-mono font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                                +{b.amount.toLocaleString()} EGP
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-705 bg-white/70 border border-slate-100 rounded-xl p-2.5 text-left rtl:text-right">
                              <span className="text-slate-400 text-[9px] font-extrabold uppercase tracking-widest block mb-0.5">
                                {lang === 'ar' ? 'السبب والتفاصيل' : 'Reason & Details'}
                              </span>
                              {lang === 'ar' ? b.reasonAr : b.reasonEn}
                            </div>

                            <div className="flex justify-between items-center pt-2.5 border-t border-slate-100">
                              <span className="text-slate-400 text-[10px] font-mono font-bold">{b.date}</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => startEditBonus(b)}
                                  className="p-1.5 text-slate-550 hover:text-[#0a1945] hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                  title={lang === 'ar' ? 'تعديل المعاملة' : 'Edit transaction'}
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBonus(b.id, b.empId, b.amount)}
                                  className="p-1.5 text-slate-550 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  title={lang === 'ar' ? 'حذف المعاملة' : 'Delete transaction'}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Dynamic Bonus Pagination Controls with orange/navy theme details */}
                  <div className="p-4 border border-slate-150 rounded-2xl bg-[#fbfbfb] flex flex-col md:flex-row items-center justify-between gap-4 font-sans text-xs text-slate-650 mt-4">
                    {/* 1. Showing elements counter range */}
                    <div className="flex items-center gap-1.5 font-bold shrink-0">
                      <span>{lang === 'ar' ? 'عرض' : 'Showing'}</span>
                      {filteredBonuses.length === 0 ? (
                        <span className="font-extrabold text-[#0a1945] font-mono bg-slate-100 px-2.5 py-0.5 rounded-lg text-[10.5px]">0</span>
                      ) : (
                        <>
                          <span className="font-extrabold text-[#0a1945] font-mono bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                            {bonusStartIndex + 1}
                          </span>
                          <span>-</span>
                          <span className="font-extrabold text-[#0a1945] font-mono bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                            {Math.min(bonusStartIndex + bonusPageSize, filteredBonuses.length)}
                          </span>
                          <span>{lang === 'ar' ? 'من أصل' : 'of'}</span>
                          <span className="font-extrabold text-orange-650 font-mono bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                            {filteredBonuses.length}
                          </span>
                        </>
                      )}
                    </div>

                    {/* 2. Numerical Pagination Items */}
                    <div className="flex items-center gap-1 shrink-0 select-none">
                      {/* Previous Page arrow */}
                      <button
                        type="button"
                        disabled={activeBonusPage === 1}
                        onClick={() => setBonusCurrentPage(prev => Math.max(1, prev - 1))}
                        className="p-2 border border-slate-200 hover:border-orange-400 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-650 hover:text-orange-500 hover:bg-orange-50/20 transition cursor-pointer h-8 w-8 flex items-center justify-center shadow-xs"
                        title={lang === 'ar' ? 'الصفحة السابقة' : 'Previous page'}
                      >
                        {lang === 'ar' ? <ChevronRight size={13} strokeWidth={2.5} /> : <ChevronLeft size={13} strokeWidth={2.5} />}
                      </button>

                      {/* Calculated dynamic pages range */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalBonusPages, 3) }, (_, i) => i + 1).map(page => {
                          const isActive = page === activeBonusPage;
                          return (
                            <button
                              type="button"
                              key={page}
                              onClick={() => setBonusCurrentPage(page)}
                              className={cn(
                                "w-8 h-8 rounded-lg font-extrabold transition cursor-pointer text-xs flex items-center justify-center border font-mono shadow-xs",
                                isActive
                                  ? "bg-[#0a1945] text-white border-[#0a1945]"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-orange-400 hover:text-orange-500"
                              )}
                            >
                              {page}
                            </button>
                          );
                        })}
                      </div>

                      {/* Next Page arrow */}
                      <button
                        type="button"
                        disabled={activeBonusPage === totalBonusPages}
                        onClick={() => setBonusCurrentPage(prev => Math.min(totalBonusPages, prev + 1))}
                        className="p-2 border border-slate-200 hover:border-orange-400 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-650 hover:text-orange-500 hover:bg-orange-50/20 transition cursor-pointer h-8 w-8 flex items-center justify-center shadow-xs"
                        title={lang === 'ar' ? 'الصفحة التالية' : 'Next page'}
                      >
                        {lang === 'ar' ? <ChevronLeft size={13} strokeWidth={2.5} /> : <ChevronRight size={13} strokeWidth={2.5} />}
                      </button>
                    </div>

                    {/* 3. Page Size Dropdown Select Menu */}
                    <div className="flex items-center gap-2 text-slate-500 font-bold shrink-0">
                      <span>{lang === 'ar' ? 'عرض' : 'Show'}</span>
                      <select
                        value={bonusPageSize}
                        onChange={(e) => {
                          setBonusPageSize(Number(e.target.value));
                          setBonusCurrentPage(1); // Reset back to first page safely
                        }}
                        className="bg-white border border-slate-200 text-[#0a1945] rounded-xl px-2 py-1.5 text-xs font-black shadow-xs outline-none focus:border-orange-400 cursor-pointer w-16 text-center"
                      >
                        {[5, 10, 20, 50].map(sz => (
                          <option key={sz} value={sz} className="font-bold">
                            {sz}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 6B: Employee Deductions Registrar */}
          {activeMenu === 'deduct' && (
            <div className="space-y-6 animate-fadeIn font-sans">
              
              {/* Stylish and elegant Header Section */}
              <div className="bg-gradient-to-r from-slate-50 to-orange-50/30 p-5 rounded-2xl border border-slate-200/65 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="rtl:text-right text-left pb-1">
                  <span className="bg-rose-500 text-white font-extrabold text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full">
                    {lang === 'ar' ? 'سجل الخصومات الفوري' : 'Live Deduction Registrar'}
                  </span>
                  <h3 className="text-md md:text-lg font-black text-[#0a1945] mt-1.5 flex items-center gap-2">
                    <AlertCircle className="text-rose-550 animate-pulse" size={19} />
                    <span>{lang === 'ar' ? 'تسجيل خصومات الموظفين' : 'Employee Deductions'}</span>
                  </h3>
                  <p className="text-slate-500 text-xs mt-1 max-w-xl font-medium leading-relaxed">
                    {lang === 'ar' 
                      ? 'قم بتقييد الخصومات الإدارية والتأخيرات وتنعكس على مسيرات الرواتب تلقائياً.' 
                      : 'Record disciplinary deductions, delays, and offenses. All deductions are instantly processed inside payroll sheets.'}
                  </p>
                </div>

                {/* Summary Badges on the right */}
                <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
                  <div className="bg-rose-50 border border-rose-100 p-3.5 px-5 rounded-2xl text-center font-sans w-full">
                    <span className="block text-[10px] uppercase tracking-wider font-extrabold text-red-500">{lang === 'ar' ? 'إجمالي الخصومات' : 'Total Deductions'}</span>
                    <span className="text-base font-black text-red-600 font-mono mt-1 block">
                      {deductionsList.filter(d => deductFilterMonth === 'all' || d.date.startsWith(deductFilterMonth)).reduce((sum, d) => sum + d.amount, 0).toLocaleString()} <span className="text-xs font-sans font-bold">{lang === 'ar' ? 'ج.م' : 'EGP'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Search, Filter & Export Panel */}
              <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs">
                {/* Row 1: Export Button + Apply Deduction button */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                    {/* Export Data Button */}
                    <div className="w-full sm:w-28 shrink-0">
                      <ExportDataButton
                        lang={lang}
                        onToast={triggerHrToast}
                        onCopy={() => triggerHrToast(lang === 'ar' ? 'تم نسخ سجل الخصومات' : 'Deductions registry copied!')}
                        onPrint={() => triggerHrToast(lang === 'ar' ? 'تم فتح خيارات الطباعة لسجل الخصومات' : 'Print options opened for deductions!')}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Apply Deduction Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDeductId(null);
                      setNewDeductEmp(staff[0]?.id || 'EMP1');
                      setNewDeductAmount(100);
                      setNewDeductReason('');
                      setSelectedDeductType('custom');
                      setShowDeductionModal(true);
                    }}
                    className="mahaly-action-btn mahaly-action-btn--toolbar"
                  >
                    <Plus size={16} strokeWidth={2.5} />
                    <span>{lang === 'ar' ? 'تسجيل خصم جديد' : 'Register New Deduction'}</span>
                  </button>
                </div>
              </div>

              {/* Deduct Toolbar */}
              <div className="bg-white border-4 border-white rounded-2xl overflow-visible shadow-md relative hidden md:block mb-4">
                <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 hidden md:flex flex-col sm:flex-row justify-between items-start sm:items-center rtl:flex-row-reverse gap-3.5 min-h-[48px] h-auto">
                  <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1 max-w-md">
                    <div className="relative flex-1 flex items-center">
                      <Search size={14} className="absolute left-3 rtl:right-3 rtl:left-auto text-slate-400 pointer-events-none" />
                      <input 
                        type="text"
                        value={deductSearchQuery}
                        onChange={e => setDeductSearchQuery(e.target.value)}
                        placeholder={lang === 'ar' ? 'البحث باسم الموظف، الكود أو سبب الخصم...' : 'Search employee, code or reason...'}
                        style={{ height: '36px' }}
                        className="w-full text-xs p-2 pl-8 pr-8 rtl:pr-8 rtl:pl-8 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-400 transition h-[36px]"
                      />
                      {deductSearchQuery && (
                        <button
                          onClick={() => setDeductSearchQuery('')}
                          className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 -translate-y-1/2 p-0.5 text-slate-450 hover:text-orange-500 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                          title={lang === 'ar' ? 'مسح البحث' : 'Clear search'}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {deductDirViewMode === 'table' && (
                      <div className="relative group/filter">
                        <button
                          onClick={() => setIsDeductColumnFiltersOpen(!isDeductColumnFiltersOpen)}
                          style={{ height: '36px' }}
                          className={cn(
                            "p-2 px-3 text-xs font-black rounded-lg border transition flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap min-h-[36px]",
                            isDeductColumnFiltersOpen 
                              ? "bg-[#0a1945] text-white border-[#0a1945]" 
                              : "bg-white text-black border-slate-200 hover:border-orange-400 hover:text-orange-500"
                          )}
                        >
                          <Filter size={13} className="text-orange-500" />
                        </button>
                        
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/filter:block bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-50 font-bold font-sans pointer-events-none">
                          {lang === 'ar' ? 'بحث متقدم' : 'Advanced Search'}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 rtl:flex-row-reverse w-full justify-between sm:w-auto sm:justify-start">
                    {/* Deduct Date Filter Input (Changed to Month Dropdown) */}
                    <div className="relative group/date">
                      <select
                        value={deductFilterMonth}
                        onChange={(e) => {
                          setDeductFilterMonth(e.target.value);
                          setDeductCurrentPage(1);
                        }}
                        style={{ height: '36px' }}
                        className="p-1 px-3 pr-7 rtl:pl-7 rtl:pr-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold font-sans outline-none w-full sm:w-auto min-h-[36px] hover:border-orange-400 focus:border-orange-400 transition cursor-pointer appearance-none text-[#0a1945]"
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

                    <div className="relative group/toggle">
                      <button
                        onClick={() => setDeductDirViewMode(deductDirViewMode === 'table' ? 'kanban' : 'table')}
                        style={{ height: '36px' }}
                        className="flex items-center justify-center gap-1.5 p-2 px-3 bg-white border border-slate-200 rounded-lg hover:border-orange-400 hover:text-orange-500 text-slate-650 hover:shadow-xs transition cursor-pointer select-none min-h-[36px] text-[11px] font-black"
                      >
                        {deductDirViewMode === 'table' ? (
                          <>
                            <LayoutGrid size={14} className="text-[#0a1945]" />
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
                        {deductDirViewMode === 'table' 
                          ? (lang === 'ar' ? 'تحويل لعرض البطاقات' : 'Switch to Cards view')
                          : (lang === 'ar' ? 'تحويل للجدول الكلاسيكي' : 'Switch to Classic Table view')
                        }
                      </div>
                    </div>

                    <div className="relative group/settings">
                      <button 
                        onClick={() => {
                          setTempDeductVisibleColumns({ ...deductVisibleColumns });
                          setDeductColumnSettingsOpen(!deductColumnSettingsOpen);
                        }}
                        style={{ height: '36px' }}
                        className="p-2 text-black hover:text-orange-500 bg-white border border-slate-200 hover:border-orange-400 rounded-lg hover:shadow-xs transition cursor-pointer flex items-center justify-center font-black text-[11px] min-h-[36px] w-[36px]"
                      >
                        <Settings size={14} className="text-orange-500 animate-spin-hover" />
                      </button>
                      
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/settings:block bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-50 font-bold font-sans pointer-events-none">
                        {lang === 'ar' ? 'تخصيص الأعمدة' : 'Customize Columns'}
                      </div>
                    
                      <AnimatePresence>
                        {deductColumnSettingsOpen && (
                          <div className="absolute right-0 left-auto mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 p-3.5 text-xs text-right">
                            <div className="pb-2 border-b border-slate-100 mb-2.5">
                              <h4 className="font-extrabold text-slate-800 text-[12px] text-left rtl:text-right">{lang === 'ar' ? 'اختر الأعمدة' : 'Choose Columns'}</h4>
                            </div>
                            
                            <div className="space-y-2.5 max-h-68 overflow-y-auto">
                              {Object.entries({
                                empId: { en: 'Emp ID', ar: 'كود الموظف' },
                                name: { en: 'Employee', ar: 'الموظف' },
                                amount: { en: 'Amount', ar: 'القيمة' },
                                reason: { en: 'Reason', ar: 'السبب' },
                                date: { en: 'Date', ar: 'التاريخ' },
                                actions: { en: 'Actions', ar: 'خيارات' }
                              }).map(([key, label]) => (
                                <div key={key} className="flex items-center gap-2 py-0.5 select-none rtl:flex-row-reverse">
                                  <GripVertical size={12} className="text-slate-400 shrink-0" />
                                  
                                  <label className="flex items-center gap-2 w-full cursor-pointer select-none font-bold text-slate-700 text-left rtl:text-right flex-row rtl:flex-row-reverse">
                                    <input 
                                      type="checkbox" 
                                      checked={tempDeductVisibleColumns[key]} 
                                      onChange={(e) => setTempDeductVisibleColumns(prev => ({ ...prev, [key]: e.target.checked }))}
                                      className="w-4 h-4 rounded border border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition shrink-0"
                                    />
                                    <span className="text-[10px] font-semibold text-slate-700 truncate">{lang === 'ar' ? label.ar : label.en}</span>
                                  </label>
                                </div>
                              ))}
                            </div>
                            
                            <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1">
                              <button 
                                onClick={() => setTempDeductVisibleColumns({ empId: true, name: true, amount: true, reason: true, date: true, actions: true })}
                                className="px-1.5 py-1 border border-slate-200 text-slate-700 hover:text-[#0a1945] bg-white rounded-lg text-[8.5px] font-bold transition cursor-pointer uppercase tracking-tight"
                              >
                                {lang === 'ar' ? 'إعادة' : 'RESET'}
                              </button>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => setDeductColumnSettingsOpen(false)}
                                  className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-lg text-[8.5px] font-bold transition cursor-pointer uppercase tracking-tight"
                                >
                                  {lang === 'ar' ? 'إلغاء' : 'CANCEL'}
                                </button>
                                <button 
                                  onClick={() => {
                                    setDeductVisibleColumns({ ...tempDeductVisibleColumns });
                                    setDeductColumnSettingsOpen(false);
                                    triggerHrToast(lang === 'ar' ? 'تم تطبيق تفضيلات جدول الخصومات' : 'Deduction table layout applied!');
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
                  </div>
                </div>
              </div>

              {/* Ledger Card */}
              <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-xs space-y-4">

                <div className="space-y-3">
                  {deductDirViewMode === 'table' ? (
                  <>
                  {/* Web Tables view */}
                  <div className="hidden sm:block overflow-x-auto border border-slate-150 rounded-2xl max-h-[320px] overflow-y-auto">
                    <table className="w-full text-left rtl:text-right text-xs table-auto">
                      <thead className="bg-orange-500 text-white sticky top-0 z-10 font-bold select-none rounded-t-2xl">
                        <tr className="border-b border-orange-600/20 text-white">
                          {deductVisibleColumns.name && <th className="py-3 px-3 text-white font-extrabold">{lang === 'ar' ? 'الموظف' : 'Employee'}</th>}
                          {deductVisibleColumns.amount && <th className="py-3 px-3 text-center text-white font-extrabold">{lang === 'ar' ? 'القيمة' : 'Amount'}</th>}
                          {deductVisibleColumns.reason && <th className="py-3 px-3 text-white font-extrabold">{lang === 'ar' ? 'التفاصيل والسبب' : 'Reason / Note'}</th>}
                          {deductVisibleColumns.date && <th className="py-3 px-3 text-center text-white font-extrabold">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>}
                          {deductVisibleColumns.actions && <th className="py-3 px-3 text-center"></th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-755">
                        {filteredDeductions.length === 0 ? (
                          <tr>
                            <td colSpan={Object.values(deductVisibleColumns).filter(Boolean).length} className="py-8 text-center text-slate-400 font-bold">
                              {lang === 'ar' ? 'لا توجد خصومات مقيدة حالياً' : 'No deductions applied yet.'}
                            </td>
                          </tr>
                        ) : (
                          paginatedDeductions.map(d => {
                            const emp = staff.find(s => s.id === d.empId);
                            return (
                              <tr key={d.id} className="hover:bg-slate-50/50 transition">
                                {deductVisibleColumns.name && (
                                <td className="py-2.5 px-3">
                                  <div>
                                    <p className="font-extrabold text-slate-800 text-[11px] font-sans">{emp ? (lang === 'ar' ? emp.nameAr : emp.name) : 'Unknown'}</p>
                                    {deductVisibleColumns.empId && <p className="text-[9px] text-slate-400 font-mono tracking-tight">{d.empId}</p>}
                                  </div>
                                </td>
                                )}
                                {deductVisibleColumns.amount && (
                                <td className="py-2.5 px-3 text-center font-mono font-black text-rose-600">
                                  -{d.amount.toLocaleString()} EGP
                                </td>
                                )}
                                {deductVisibleColumns.reason && (
                                <td className="py-2.5 px-3 text-slate-500 text-[11px] font-medium leading-tight max-w-[250px] truncate" title={lang === 'ar' ? d.reasonAr : d.reasonEn}>
                                  {lang === 'ar' ? d.reasonAr : d.reasonEn}
                                </td>
                                )}
                                {deductVisibleColumns.date && (
                                <td className="py-2.5 px-3 text-center font-mono text-[10px] text-slate-400">
                                  {d.date}
                                </td>
                                )}
                                {deductVisibleColumns.actions && (
                                <td className="py-2.5 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => startEditDeduction(d)}
                                      className="p-1 text-slate-450 hover:text-[#0a1945] hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                      title={lang === 'ar' ? 'تعديل المعاملة' : 'Edit transaction'}
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDeduction(d.id, d.empId, d.amount)}
                                      className="p-1 text-slate-450 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                      title={lang === 'ar' ? 'حذف المعاملة' : 'Delete transaction'}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                                )}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  </>
                  ) : (
                    <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredDeductions.length === 0 ? (
                        <div className="col-span-full py-8 text-center text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-2xl">
                          {lang === 'ar' ? 'لا توجد بيانات للعرض' : 'No data to display'}
                        </div>
                      ) : (
                        paginatedDeductions.map(d => {
                          const emp = staff.find(s => s.id === d.empId);
                          return (
                            <div key={d.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h4 className="font-extrabold text-[#0a1945] text-xs font-sans">{emp ? (lang === 'ar' ? emp.nameAr : emp.name) : 'Unknown'}</h4>
                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{d.empId}</p>
                                </div>
                                <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded text-[11px] font-black font-mono">
                                  -{d.amount.toLocaleString()}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mb-3">{lang === 'ar' ? d.reasonAr : d.reasonEn}</p>
                              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                <span className="text-[10px] text-slate-400 font-mono">{d.date}</span>
                                <div className="flex gap-1.5">
                                  <button onClick={() => startEditDeduction(d)} className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg transition cursor-pointer">
                                    <Edit2 size={12} />
                                  </button>
                                  <button onClick={() => handleDeleteDeduction(d.id, d.empId, d.amount)} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition cursor-pointer">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Mobile Kanban Cards View */}
                  <div className="block sm:hidden space-y-4">
                    {filteredDeductions.length === 0 ? (
                      <div className="py-10 text-center text-slate-400 font-bold bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        {lang === 'ar' ? 'لا توجد خصومات مقيدة حالياً' : 'No deductions applied yet.'}
                      </div>
                    ) : (
                      paginatedDeductions.map(d => {
                        const emp = staff.find(s => s.id === d.empId);
                        return (
                          <div key={d.id} className="bg-white border border-slate-200/95 rounded-3xl p-5 shadow-xs hover:border-rose-300 transition flex flex-col gap-4 relative">
                            <div className="flex justify-between items-start">
                              <div className="text-left rtl:text-right">
                                <p className="font-extrabold text-slate-800 text-xs">
                                  {emp ? (lang === 'ar' ? emp.nameAr : emp.name) : 'Unknown'}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono tracking-tight">{d.empId}</p>
                              </div>
                              <span className="text-xs font-mono font-black text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg">
                                -{d.amount.toLocaleString()} EGP
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-705 bg-white/70 border border-slate-100 rounded-xl p-2.5 text-left rtl:text-right">
                              <span className="text-slate-400 text-[9px] font-extrabold uppercase tracking-widest block mb-0.5">
                                {lang === 'ar' ? 'السبب والتفاصيل' : 'Reason & Details'}
                              </span>
                              {lang === 'ar' ? d.reasonAr : d.reasonEn}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Dynamic Deductions Pagination Controls with orange/navy theme details */}
                  <div className="p-4 border border-slate-150 rounded-2xl bg-[#fbfbfb] flex flex-col md:flex-row items-center justify-between gap-4 font-sans text-xs text-slate-650 mt-4 font-bold">
                    {/* 1. Showing elements counter range */}
                    <div className="flex items-center gap-1.5 font-bold shrink-0">
                      <span>{lang === 'ar' ? 'عرض' : 'Showing'}</span>
                      {filteredDeductions.length === 0 ? (
                        <span className="font-extrabold text-[#0a1945] font-mono bg-slate-100 px-2.5 py-0.5 rounded-lg text-[10.5px]">0</span>
                      ) : (
                        <>
                          <span className="font-extrabold text-[#0a1945] font-mono bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                            {deductStartIndex + 1}
                          </span>
                          <span>-</span>
                          <span className="font-extrabold text-[#0a1945] font-mono bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                            {Math.min(deductStartIndex + deductPageSize, filteredDeductions.length)}
                          </span>
                          <span>{lang === 'ar' ? 'من أصل' : 'of'}</span>
                          <span className="font-extrabold text-orange-650 font-mono bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                            {filteredDeductions.length}
                          </span>
                        </>
                      )}
                    </div>

                    {/* 2. Numerical Pagination Items */}
                    <div className="flex items-center gap-1 shrink-0 select-none">
                      {/* Previous Page arrow */}
                      <button
                        type="button"
                        disabled={activeDeductPage === 1}
                        onClick={() => setDeductCurrentPage(prev => Math.max(1, prev - 1))}
                        className="p-2 border border-slate-200 hover:border-orange-400 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-650 hover:text-orange-500 hover:bg-orange-50/20 transition cursor-pointer h-8 w-8 flex items-center justify-center shadow-xs"
                        title={lang === 'ar' ? 'الصفحة السابقة' : 'Previous page'}
                      >
                        {lang === 'ar' ? <ChevronRight size={13} strokeWidth={2.5} /> : <ChevronLeft size={13} strokeWidth={2.5} />}
                      </button>

                      {/* Calculated dynamic pages range */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalDeductPages, 3) }, (_, i) => i + 1).map(page => {
                          const isActive = page === activeDeductPage;
                          return (
                            <button
                              type="button"
                              key={page}
                              onClick={() => setDeductCurrentPage(page)}
                              className={cn(
                                "w-8 h-8 rounded-lg font-extrabold transition cursor-pointer text-xs flex items-center justify-center border font-mono shadow-xs",
                                isActive
                                  ? "bg-[#0a1945] text-white border-[#0a1945]"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-orange-400 hover:text-orange-500"
                              )}
                            >
                              {page}
                            </button>
                          );
                        })}
                      </div>

                      {/* Next Page arrow */}
                      <button
                        type="button"
                        disabled={activeDeductPage === totalDeductPages}
                        onClick={() => setDeductCurrentPage(prev => Math.min(totalDeductPages, prev + 1))}
                        className="p-2 border border-slate-200 hover:border-orange-400 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-650 hover:text-orange-500 hover:bg-orange-50/20 transition cursor-pointer h-8 w-8 flex items-center justify-center shadow-xs"
                        title={lang === 'ar' ? 'الصفحة التالية' : 'Next page'}
                      >
                        {lang === 'ar' ? <ChevronLeft size={13} strokeWidth={2.5} /> : <ChevronRight size={13} strokeWidth={2.5} />}
                      </button>
                    </div>

                    {/* 3. Page Size Dropdown Select Menu */}
                    <div className="flex items-center gap-2 text-slate-500 font-bold shrink-0">
                      <span>{lang === 'ar' ? 'عرض' : 'Show'}</span>
                      <select
                        value={deductPageSize}
                        onChange={(e) => {
                          setDeductPageSize(Number(e.target.value));
                          setDeductCurrentPage(1); // Reset back to first page safely
                        }}
                        className="bg-white border border-slate-200 text-[#0a1945] rounded-xl px-2 py-1.5 text-xs font-black shadow-xs outline-none focus:border-orange-400 cursor-pointer w-16 text-center"
                      >
                        {[5, 10, 20, 50].map(sz => (
                          <option key={sz} value={sz} className="font-bold">
                            {sz}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deduction Modal Popup */}
              <AnimatePresence>
                {showDeductionModal && (
                  <div className="fixed inset-0 bg-[#0a1945]/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0, y: -20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.95, opacity: 0, y: -20 }}
                      className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-2xl max-w-md w-full text-xs select-none"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between bg-orange-500 text-white px-5" style={{ height: '66px' }}>
                        <span className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-xl bg-orange-600/30 text-white flex items-center justify-center font-bold">⚠️</span>
                          <div className="text-left rtl:text-right">
                            <h3 className="text-sm font-black text-white">
                              {editingDeductId 
                                ? (lang === 'ar' ? 'تعديل جزاء أو خصم إداري للموظف' : 'Edit Employee Deduction')
                                : (lang === 'ar' ? 'تسجيل جزاء أو خصم إداري' : 'Apply Employee Deduction')
                              }
                            </h3>
                            <p className="text-[10px] text-white/80 font-bold mt-0.5">
                              {lang === 'ar' ? 'استقطاع مالي من استحقاقات الشهر الجاري لسبب تأديبي' : 'Debit amount from current ledger for infractions'}
                            </p>
                          </div>
                        </span>
                        <button 
                          type="button"
                          onClick={() => setShowDeductionModal(false)}
                          className="text-white hover:text-orange-100 p-1.5 rounded-lg hover:bg-orange-600 transition cursor-pointer"
                        >
                          <X size={16} strokeWidth={2.5} />
                        </button>
                      </div>

                      <div className="p-6 space-y-4">
                      {/* Form */}
                      <form onSubmit={handleAddDeduction} className="space-y-4 text-left rtl:text-right">
                        {/* Select Employee */}
                        <div>
                          <label className="block text-[11px] font-extrabold text-slate-505 mb-1.5">
                            {lang === 'ar' ? 'اختر الموظف الخاضع للخصم' : 'Select Staff Member'}
                          </label>
                          <select
                            value={newDeductEmp}
                            onChange={e => setNewDeductEmp(e.target.value)}
                            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-red-500 font-bold text-slate-800 transition"
                          >
                            {staff.map(emp => (
                              <option key={emp.id} value={emp.id}>
                                {emp.id} - {lang === 'ar' ? emp.nameAr : emp.name} ({lang === 'ar' ? emp.roleAr : emp.role})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Select Deduction Category Selector */}
                        <div>
                          <label className="block text-[11px] font-extrabold text-slate-505 mb-1.5">
                            {lang === 'ar' ? 'تصنيف الخصم أو الجزاء الإداري' : 'Deduction / Offence Category'}
                          </label>
                          <select
                            value={selectedDeductType}
                            onChange={e => handleDeductTypeChange(e.target.value)}
                            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-red-500 font-bold text-slate-800 transition"
                          >
                            <option value="custom">
                              {lang === 'ar' ? '⚙️ خصم / جزاء مخصص (تحديد يدوي)' : '⚙️ Custom Penalty / Deduction (Manual)'}
                            </option>
                            <optgroup label={lang === 'ar' ? '⚠️ المخالفات والخصومات المالية المسجلة' : '⚠️ Registered Penalties & Offenses'}>
                              {financialSettings.filter(f => f.type === 'Deduction').map(ded => (
                                <option key={ded.id} value={ded.id}>
                                  {lang === 'ar' ? ded.nameAr : ded.nameEn} ({ded.amount} EGP)
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>

                        {/* Amount Input with Presets */}
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-[11px] font-extrabold text-slate-550">
                              {lang === 'ar' ? 'قيمة الجزاء المالي' : 'Deduction amount (EGP)'}
                            </label>
                            <span className="text-[10px] font-mono text-red-550 bg-red-50 px-2 py-0.5 rounded font-black">-{newDeductAmount} EGP</span>
                          </div>
                          <input
                            type="number"
                            min="1"
                            value={newDeductAmount}
                            onChange={e => setNewDeductAmount(Number(e.target.value))}
                            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-red-500 font-bold text-slate-800 font-mono transition"
                            placeholder="100"
                            required
                          />
                          
                          {/* Presets */}
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {[50, 100, 150, 250, 500].map(amt => (
                              <button
                                type="button"
                                key={amt}
                                onClick={() => setNewDeductAmount(amt)}
                                className={cn(
                                  "text-[10px] font-extrabold px-3 py-1 rounded-lg border transition cursor-pointer select-none",
                                  newDeductAmount === amt 
                                    ? "bg-red-500 text-white border-red-500" 
                                    : "bg-white text-slate-600 border-slate-200 hover:border-red-300 hover:text-red-450"
                                )}
                              >
                                -{amt}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Deduction notes/reason */}
                        <div>
                          <label className="block text-[11px] font-extrabold text-slate-505 mb-1.5 font-sans">
                            {lang === 'ar' ? 'سبب المخالفة / ملخص الجزاء' : 'Deduction Reason / Infraction Details'}
                          </label>
                          <input
                            type="text"
                            value={newDeductReason}
                            onChange={e => setNewDeductReason(e.target.value)}
                            placeholder={lang === 'ar' ? 'مثال: غياب يوم كامل دون عذر أو تأخير متكرر بدون موافقة' : 'e.g. Excessive unexcused store shift delay or missing key balancing'}
                            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-red-500 font-bold text-slate-800 transition"
                          />
                        </div>

                        {/* Submit Actions */}
                        <div className="flex items-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowDeductionModal(false)}
                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-lg cursor-pointer transition text-xs"
                          >
                            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                          <button
                            type="submit"
                            className="flex-1 py-2.5 bg-red-650 hover:bg-red-700 text-white font-extrabold rounded-lg shadow-md cursor-pointer transition text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-[0.98]"
                          >
                            <Plus size={15} />
                            <span>{editingDeductId 
                              ? (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes')
                              : (lang === 'ar' ? 'إقرار وتطبيق' : 'Apply Ledger')
                            }</span>
                          </button>
                        </div>
                      </form>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>



            </div>
          )}

          {/* TAB: Employee Commissions Report Menu View */}
          {activeMenu === 'commissions' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header Box */}
              <div className="border-b border-slate-100 pb-4 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div className="rtl:text-right text-left flex items-center gap-2.5 shrink-0">
                  <h3 className="text-md font-bold text-[#0a1945] flex items-center gap-1.5 font-sans">
                    <BadgePercent className="text-orange-500 animate-pulse" size={18} />
                    <span>{lang === 'ar' ? 'تقرير عمولات ومبيعات طاقم العمل' : 'Employee Sales Commissions Ledger'}</span>
                  </h3>
                  <span className="text-[12px] leading-[16px] text-center bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full border border-slate-200 font-mono">
                    {lang === 'ar' ? `${staff.length} موظف` : `${staff.length} staff`}
                  </span>
                </div>
              </div>

              {/* Advanced Controls Toolbar */}
              <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-4 w-full bg-slate-50/50 p-4 border border-slate-150 rounded-2xl">
                {/* Left Side: Search Box */}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2 w-full md:max-w-2xl md:w-[480px] self-end">
                  {/* Date filter choosing */}
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 shadow-xs select-none h-[38px] w-full font-bold leading-6 text-base">
                    <Calendar size={13} className="text-orange-500 shrink-0" />
                    <div className="flex items-center gap-0.5 min-w-0 flex-1">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase shrink-0">{lang === 'ar' ? 'من' : 'From'}</span>
                      <input
                        type="date"
                        value={comStartDate}
                        onChange={e => setComStartDate(e.target.value)}
                        className="text-[10px] font-sans font-bold text-slate-700 bg-transparent outline-none border-none w-full cursor-pointer focus:text-orange-600 p-0"
                      />
                    </div>
                    <div className="w-[1px] h-3.5 bg-slate-200 shrink-0 mx-1" />
                    <div className="flex items-center gap-0.5 min-w-0 flex-1">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase shrink-0">{lang === 'ar' ? 'إلى' : 'To'}</span>
                      <input
                        type="date"
                        value={comEndDate}
                        onChange={e => setComEndDate(e.target.value)}
                        className="text-[10px] font-sans font-bold text-slate-700 bg-transparent outline-none border-none w-full cursor-pointer focus:text-orange-600 p-0"
                      />
                    </div>
                    {(comStartDate || comEndDate) && (
                      <button
                        onClick={() => { setComStartDate(''); setComEndDate(''); }}
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition cursor-pointer shrink-0"
                        title={lang === 'ar' ? 'مسح التاريخ' : 'Clear dates'}
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>

                  <ExportDataButton
                    lang={lang}
                    onToast={triggerHrToast}
                    onCopy={() => triggerHrToast(lang === 'ar' ? 'تم نسخ بيانات العمولات إلى الحافظة' : 'Commissions report copied to clipboard!')}
                    onPrint={() => triggerHrToast(lang === 'ar' ? 'تم فتح خيارات الطباعة لجدول العمولات' : 'Print dialog opened for commissions!')}
                    className="w-full"
                  />

                  {/* Search input matched with the date range */}
                  <div className="relative flex items-center h-[38px] w-full">
                    <Search className="absolute left-3 rtl:right-3 text-slate-400 pointer-events-none" size={13} />
                    <input 
                      type="text"
                      value={commissionSearch}
                      onChange={e => setCommissionSearch(e.target.value)}
                      placeholder={lang === 'ar' ? 'البحث بالاسم أو كود الموظف...' : 'Search by name or code...'}
                      className="w-full text-xs p-2.5 pl-9 pr-3.5 rtl:pr-9 rtl:pl-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-400 transition h-[38px] font-sans"
                    />
                    {commissionSearch && (
                      <button
                        onClick={() => setCommissionSearch('')}
                        className="absolute right-3 rtl:left-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-orange-500 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setIsComColumnFiltersOpen(!isComColumnFiltersOpen)}
                    className={cn(
                      "p-2 px-3 text-xs font-black rounded-lg border transition flex items-center justify-center gap-1.5 cursor-pointer select-none whitespace-nowrap h-[38px] min-h-[38px] w-full",
                      isComColumnFiltersOpen 
                        ? "bg-[#0a1945] text-white border-[#0a1945]" 
                        : "bg-white text-black border-slate-200 hover:border-orange-400 hover:text-orange-500"
                    )}
                    title={lang === 'ar' ? 'بحث متقدم' : 'Advanced Search'}
                  >
                    <Filter size={13} className="text-orange-500" />
                    <span>{lang === 'ar' ? 'بحث متقدم' : 'Advanced Search'}</span>
                  </button>
                </div>

                {/* Right Side: Stack of Dropdown + Two Buttons under it */}
                <div className="flex flex-col gap-2 w-full md:w-[220px]">
                  {/* Top Row: Branch Dropdown - aligned properly and spans full width of the block */}
                  <div className="relative w-full">
                    <div className="relative w-full">
                      <button
                        onClick={() => setComBranchDropdownOpen(!comBranchDropdownOpen)}
                        className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-white border border-slate-200/90 hover:border-slate-300 text-slate-700 rounded-lg shadow-xs transition duration-150 cursor-pointer text-xs font-semibold select-none h-[38px]"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-orange-500 hover:scale-110 transition" />
                          <span className={lang === 'ar' ? 'font-sans text-[12px]' : ''}>
                            {selectedComBranches.includes('all')
                              ? (lang === 'ar' ? 'كل الفروع' : 'All Branches')
                              : selectedComBranches.length === 1
                              ? (lang === 'ar'
                                  ? comBranches.find(b => b.id === selectedComBranches[0])?.labelAr
                                  : comBranches.find(b => b.id === selectedComBranches[0])?.labelEn)
                              : (lang === 'ar'
                                  ? `محدّد (${selectedComBranches.length}) فروع`
                                  : `Selected (${selectedComBranches.length}) branches`
                                )
                            }
                          </span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${comBranchDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {comBranchDropdownOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setComBranchDropdownOpen(false)} 
                          />
                          
                          <div className="absolute right-0 left-0 mt-2 w-full bg-white border border-slate-200/90 rounded-2xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100 p-1.5 animate-in fade-in slide-in-from-top-2 duration-150 text-xs text-left rtl:text-right">
                            <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              {lang === 'ar' ? 'تصفية حسب الفرع' : 'Filter by Branch'}
                            </div>
                            <div className="space-y-0.5 pt-1.5">
                              {comBranches.map((branch) => {
                                const isSelected = selectedComBranches.includes(branch.id);
                                return (
                                  <button
                                    key={branch.id}
                                    onClick={() => handleComBranchToggle(branch.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors duration-150 cursor-pointer ${
                                      isSelected
                                        ? 'bg-slate-50 text-orange-600 font-bold'
                                        : 'text-slate-600 hover:bg-slate-50/60 hover:text-slate-900'
                                    } flex-row rtl:flex-row-reverse`}
                                  >
                                    <span className={lang === 'ar' ? 'font-sans' : ''}>
                                      {lang === 'ar' ? branch.labelAr : branch.labelEn}
                                    </span>
                                    {isSelected ? (
                                      <Check className="w-4 h-4 text-orange-500 shrink-0" />
                                    ) : (
                                      <div className="w-4 h-4 border border-slate-300 rounded-md shrink-0" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Toggle View Button + Customize Columns Button (sitting side-by-side, perfectly aligned) */}
                  <div className="flex gap-2 w-full">
                    {/* Toggle View Mode Button with Tooltip (Table/Kanban) */}
                    <div className="relative group flex-1 md:flex-none md:w-[76px]">
                      <button
                        onClick={() => setComViewMode(comViewMode === 'table' ? 'kanban' : 'table')}
                        className="w-full flex items-center justify-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-orange-400 hover:text-orange-500 text-slate-650 transition cursor-pointer select-none h-[38px] active:scale-[0.98] shadow-xs"
                      >
                        {comViewMode === 'table' ? (
                          <>
                            <LayoutGrid size={14} className="text-[#0a1945]" />
                            <span className="text-[11px] font-bold font-sans">
                              {lang === 'ar' ? 'بطاقات' : 'Cards'}
                            </span>
                          </>
                        ) : (
                          <>
                            <ClipboardList size={14} className="text-orange-500" />
                            <span className="text-[11px] font-bold font-sans">
                              {lang === 'ar' ? 'جدول' : 'Table'}
                            </span>
                          </>
                        )}
                      </button>
                      
                      {/* Tooltip on Hover */}
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-50 font-bold font-sans">
                        {comViewMode === 'table' 
                          ? (lang === 'ar' ? 'تحويل لجدول بطاقات كانبان' : 'Switch to Kanban Card layout')
                          : (lang === 'ar' ? 'تحويل للجدول الكلاسيكي' : 'Switch to Classic Table view')
                        }
                      </div>
                    </div>

                    {/* Customize Columns Button */}
                    <div className="relative flex-1">
                      <button 
                        onClick={() => {
                          setTempComVisibleColumns({ ...comVisibleColumns });
                          setComColumnSettingsOpen(!comColumnSettingsOpen);
                        }}
                        className="w-full flex items-center justify-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-orange-400 hover:text-orange-500 text-slate-650 transition cursor-pointer select-none h-[38px] active:scale-[0.98] shadow-xs"
                      >
                        <Settings size={14} className="text-orange-500" />
                        <span className="text-[11px] font-bold font-sans">
                          {lang === 'ar' ? 'تخصيص الأعمدة' : 'Columns'}
                        </span>
                      </button>
                      
                      {/* Choose Columns Popover - EXACT MATCH with other screens */}
                      <AnimatePresence>
                        {comColumnSettingsOpen && (
                          <div className="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-2xl p-3.5 text-xs z-50 animate-fadeIn">
                            {/* Title */}
                            <div className="pb-2 border-b border-slate-100 mb-2.5">
                              <h5 className="font-extrabold text-slate-800 text-[12px] text-left rtl:text-right">{lang === 'ar' ? 'اختر الأعمدة' : 'Choose Columns'}</h5>
                            </div>
                            
                            {/* Columns List with Drag Indicators & Checkboxes */}
                            <div className="space-y-2.5 max-h-72 overflow-y-auto">
                              {Object.entries({
                                empId: { en: 'Emp ID', ar: 'كود الموظف' },
                                name: { en: 'Staff & Role', ar: 'اسم الموظف' },
                                dept: { en: 'Department', ar: 'الإدارة' },
                                section: { en: 'Section', ar: 'القسم' },
                                branch: { en: 'Bank Branch', ar: 'الفرع البنكي' },
                                consumerSales: { en: 'Sales (Consumer)', ar: 'مبيعات بسعر المستهلك' },
                                purchaseSales: { en: 'Sales (Purchase)', ar: 'مبيعات بسعر الشراء' },
                                rate: { en: 'Sales Rate', ar: 'نسبة المبيعات' },
                                commission: { en: 'Net Commission', ar: 'صافي العمولة' }
                              }).map(([key, label]) => (
                                <div key={key} className="flex items-center gap-2 py-0.5 select-none text-left rtl:text-right">
                                  {/* Grip Drag indicator */}
                                  <GripVertical size={13} className="text-slate-400 shrink-0" />
                                  <label className="flex items-center gap-2 w-full cursor-pointer select-none font-bold text-slate-700">
                                    <input 
                                      type="checkbox" 
                                      checked={tempComVisibleColumns[key]} 
                                      onChange={(e) => setTempComVisibleColumns(prev => ({ ...prev, [key]: e.target.checked }))}
                                      className="w-4 h-4 rounded border border-slate-300 text-orange-500 focus:ring-orange-500 cursor-pointer transition shrink-0"
                                    />
                                    <span className="text-[11px] font-medium text-slate-700 truncate">{lang === 'ar' ? label.ar : label.en}</span>
                                  </label>
                                </div>
                              ))}
                            </div>
                            
                            {/* Actions */}
                            <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1">
                              <button 
                                onClick={() => setTempComVisibleColumns({
                                  empId: true,
                                  name: true,
                                  dept: true,
                                  section: true,
                                  branch: true,
                                  consumerSales: true,
                                  purchaseSales: true,
                                  rate: true,
                                  commission: true,
                                })}
                                className="px-1.5 py-1 border border-slate-200 text-slate-700 hover:text-[#0a1945] bg-white rounded-lg text-[9px] font-bold transition cursor-pointer uppercase tracking-tight"
                              >
                                {lang === 'ar' ? 'إعادة' : 'RESET'}
                              </button>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => setComColumnSettingsOpen(false)}
                                  className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[9px] font-bold transition cursor-pointer uppercase tracking-tight"
                                >
                                  {lang === 'ar' ? 'إلغاء' : 'CANCEL'}
                                </button>
                                <button 
                                  onClick={() => {
                                    setComVisibleColumns({ ...tempComVisibleColumns });
                                    setComColumnSettingsOpen(false);
                                    triggerHrToast(lang === 'ar' ? 'تم تطبيق تفضيلات أعمدة جدول العمولات' : 'Commissions layout filter applied!');
                                  }}
                                  className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[9px] font-bold hover:shadow-xs transition cursor-pointer uppercase tracking-tight"
                                >
                                  {lang === 'ar' ? 'تطبيق' : 'APPLY'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>

              {/* KPI Summaries and Data Table */}
              {(() => {
                const filteredEmps = staff.filter(emp => {
                  const query = commissionSearch.toLowerCase().trim();
                  let matchesQuery = true;
                  if (query) {
                    matchesQuery = emp.id.toLowerCase().includes(query) || 
                                   emp.name.toLowerCase().includes(query) || 
                                   (emp.nameAr && emp.nameAr.toLowerCase().includes(query));
                  }
                  if (!matchesQuery) return false;

                  if (comStartDate || comEndDate) {
                    const itemDateStr = emp.hireDate || '2025-01-01';
                    if (comStartDate && itemDateStr < comStartDate) return false;
                    if (comEndDate && itemDateStr > comEndDate) return false;
                  }
                  return true;
                });

                const computedDataAllMapped = filteredEmps.map(emp => {
                  const empNum = parseInt(emp.id.replace(/\D/g, '')) || 1;
                  
                  // Map employees to dashboard branches dynamically
                  let branchId = empNum % 3 === 0 ? 'mamar' : empNum % 3 === 1 ? 'theater' : 'zaghloul';
                  if (emp.bankBranchEn === 'Al-Mamar Branch') branchId = 'mamar';
                  else if (emp.bankBranchEn === 'Roman Theater Branch') branchId = 'theater';
                  else if (emp.bankBranchEn === 'Saad Zaghloul Branch') branchId = 'zaghloul';

                  const branchLabelEn = branchId === 'mamar' ? 'Al-Mamar Branch' : branchId === 'theater' ? 'Roman Theater Branch' : 'Saad Zaghloul Branch';
                  const branchLabelAr = branchId === 'mamar' ? 'فرع الممر' : branchId === 'theater' ? 'فرع المسرح الروماني' : 'فرع سعد زغلول';

                  // Deterministic sales calculation
                  const finalSales = emp.baseSalary * (emp.departmentId === 'D2' ? 15 : emp.departmentId === 'D1' ? 6 : 3) + (empNum * 4500) % 35000;
                  const purchaseSales = finalSales * 0.75;
                  const rate = emp.commRate || 0;
                  const commission = (finalSales * rate) / 100;
                  return { emp, finalSales, purchaseSales, rate, commission, branchId, branchLabelEn, branchLabelAr };
                });

                const computedData = computedDataAllMapped.filter(row => {
                  if (!selectedComBranches.includes('all') && !selectedComBranches.includes(row.branchId)) {
                    return false;
                  }

                  // Column filter - Employee ID
                  if (comColSearchEmpId) {
                    const val = row.emp.id.toLowerCase();
                    const q = comColSearchEmpId.toLowerCase().trim();
                    if (!val.includes(q)) return false;
                  }

                  // Column filter - Staff Name
                  if (comColSearchName) {
                    const q = comColSearchName.toLowerCase().trim();
                    const nameEn = row.emp.name.toLowerCase();
                    const nameAr = (row.emp.nameAr || '').toLowerCase();
                    const roleEn = (row.emp.role || '').toLowerCase();
                    const roleAr = (row.emp.roleAr || '').toLowerCase();
                    if (!nameEn.includes(q) && !nameAr.includes(q) && !roleEn.includes(q) && !roleAr.includes(q)) {
                      return false;
                    }
                  }

                  // Column filter - Department
                  if (comColSearchDept) {
                    const q = comColSearchDept.toLowerCase().trim();
                    const dept = departments.find(d => d.id === row.emp.departmentId);
                    const deptEn = dept ? dept.nameEn.toLowerCase() : '';
                    const deptAr = dept ? dept.nameAr.toLowerCase() : '';
                    if (!deptEn.includes(q) && !deptAr.includes(q)) {
                      return false;
                    }
                  }

                  // Column filter - Section
                  if (comColSearchSection) {
                    const q = comColSearchSection.toLowerCase().trim();
                    const sect = sections.find(s => s.id === row.emp.sectionId);
                    const sectEn = sect ? sect.nameEn.toLowerCase() : '';
                    const sectAr = sect ? sect.nameAr.toLowerCase() : '';
                    if (!sectEn.includes(q) && !sectAr.includes(q)) {
                      return false;
                    }
                  }

                  // Column filter - Branch
                  if (comColSearchBranch) {
                    const q = comColSearchBranch.toLowerCase().trim();
                    const bEn = row.branchLabelEn.toLowerCase();
                    const bAr = row.branchLabelAr.toLowerCase();
                    if (!bEn.includes(q) && !bAr.includes(q)) {
                      return false;
                    }
                  }

                  // Column filter - Consumer Sales
                  if (comColSearchConsumerSales) {
                    const q = comColSearchConsumerSales.toLowerCase().trim();
                    const salesStr = row.finalSales.toString().toLowerCase();
                    const formattedSalesStr = row.finalSales.toLocaleString(undefined, { minimumFractionDigits: 1 }).toLowerCase();
                    if (!salesStr.includes(q) && !formattedSalesStr.includes(q)) return false;
                  }

                  // Column filter - Purchase Sales
                  if (comColSearchPurchaseSales) {
                    const q = comColSearchPurchaseSales.toLowerCase().trim();
                    const purchaseStr = row.purchaseSales.toString().toLowerCase();
                    const formattedPurchaseStr = row.purchaseSales.toLocaleString(undefined, { minimumFractionDigits: 1 }).toLowerCase();
                    if (!purchaseStr.includes(q) && !formattedPurchaseStr.includes(q)) return false;
                  }

                  // Column filter - Sales Rate
                  if (comColSearchRate) {
                    const q = comColSearchRate.toLowerCase().trim();
                    const rateStr = row.rate.toString().toLowerCase();
                    if (!rateStr.includes(q)) return false;
                  }

                  // Column filter - Net Commission
                  if (comColSearchCommission) {
                    const q = comColSearchCommission.toLowerCase().trim();
                    const commStr = row.commission.toString().toLowerCase();
                    const formattedCommStr = row.commission.toLocaleString(undefined, { minimumFractionDigits: 1 }).toLowerCase();
                    if (!commStr.includes(q) && !formattedCommStr.includes(q)) return false;
                  }

                  return true;
                });

                const totalSales = computedData.reduce((acc, d) => acc + d.finalSales, 0);
                const totalPurchaseSales = computedData.reduce((acc, d) => acc + d.purchaseSales, 0);
                const totalCommission = computedData.reduce((acc, d) => acc + d.commission, 0);
                const avgRate = computedData.length > 0 ? (computedData.reduce((acc, d) => acc + d.rate, 0) / computedData.length) : 0;

                const totalComPages = Math.ceil(computedData.length / comPageSize);
                const comStartIndex = (comCurrentPage - 1) * comPageSize;
                const paginatedComData = computedData.slice(comStartIndex, comStartIndex + comPageSize);

                return (
                  <>
                    {/* Bento Grid Analytics Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Card 1: Net Sales (Consumer) */}
                      <div className="p-4 bg-[#0a1945] rounded-2xl text-white shadow-sm border border-[#0a1945]/60 flex items-center justify-between min-h-[96px]">
                        <div>
                          <span className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider block mb-1">
                            {lang === 'ar' ? 'صافي المبيعات بسعر المستهلك' : 'Net Sales at Consumer Price'}
                          </span>
                          <span className="text-lg font-black font-mono tracking-tight text-white font-sans">
                            {totalSales.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP
                          </span>
                        </div>
                        <div className="h-9 w-9 bg-white/10 rounded-xl flex items-center justify-center text-orange-400">
                          <DollarSign size={18} />
                        </div>
                      </div>

                      {/* Card 2: Net Sales (Purchase) */}
                      <div className="p-4 bg-orange-500 rounded-2xl text-white shadow-sm border border-orange-400 flex items-center justify-between min-h-[96px]">
                        <div>
                          <span className="text-[10px] text-orange-100 font-extrabold uppercase tracking-wider block mb-1">
                            {lang === 'ar' ? 'صافي المبيعات بسعر الشراء الحالي' : 'Net Sales at Current Purchase Price'}
                          </span>
                          <span className="text-lg font-black font-mono tracking-tight text-white">
                             {totalPurchaseSales.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP
                          </span>
                        </div>
                        <div className="h-9 w-9 bg-white/15 rounded-xl flex items-center justify-center text-white">
                          <ArrowUpRight size={18} />
                        </div>
                      </div>

                      {/* Card 3: Total Commission Payable */}
                      <div className="p-4 bg-emerald-600 rounded-2xl text-white shadow-sm border border-emerald-500 flex items-center justify-between min-h-[96px]">
                        <div>
                          <span className="text-[10px] text-emerald-100 font-extrabold uppercase tracking-wider block mb-1">
                            {lang === 'ar' ? 'إجمالي صافي العمولات المستحقة' : 'Total Payable Commissions'}
                          </span>
                          <span className="text-lg font-black font-mono tracking-tight text-white">
                             {totalCommission.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP
                          </span>
                        </div>
                        <div className="h-9 w-9 bg-white/15 rounded-xl flex items-center justify-center text-emerald-100">
                          <DollarSign size={18} />
                        </div>
                      </div>
                    </div>

                    {comViewMode === 'table' ? (
                      <>
                        {/* Report Table - Web View */}
                        <div className="relative hidden sm:block border border-slate-150 rounded-2xl bg-white shadow-sm overflow-hidden">
                          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                            <table className="w-full text-left rtl:text-right text-xs table-auto">
                              <thead className="bg-[#f97316] text-white sticky top-0 z-10 font-bold select-none border-b border-orange-600">
                              <tr>
                                {comVisibleColumns.empId && <th className="py-3 px-4 text-center w-20 text-white">{lang === 'ar' ? 'كود الموظف' : 'Emp ID'}</th>}
                                {comVisibleColumns.name && <th className="py-3 px-4 text-white">{lang === 'ar' ? 'اسم الموظف' : 'Staff Member'}</th>}
                                {comVisibleColumns.dept && <th className="py-3 px-4 text-white">{lang === 'ar' ? 'الإدارة' : 'Department'}</th>}
                                {comVisibleColumns.section && <th className="py-3 px-4 text-white">{lang === 'ar' ? 'القسم' : 'Section'}</th>}
                                {comVisibleColumns.branch && <th className="py-3 px-4 text-white">{lang === 'ar' ? 'الفرع البنكي' : 'Registered Branch'}</th>}
                                {comVisibleColumns.consumerSales && <th className="py-3 px-4 text-right font-mono text-white">{lang === 'ar' ? 'صافي المبيعات (سعر المستهلك)' : 'Net Sales (Consumer)'}</th>}
                                {comVisibleColumns.purchaseSales && <th className="py-3 px-4 text-right font-mono text-white">{lang === 'ar' ? 'صافي المبيعات (سعر الشراء)' : 'Net Sales (Purchase)'}</th>}
                                {comVisibleColumns.rate && <th className="py-3 px-4 text-center text-white">{lang === 'ar' ? 'نسبة المبيعات' : 'Sales Rate'}</th>}
                                {comVisibleColumns.commission && <th className="py-3 px-4 text-right font-mono text-white bg-[#ea580c]">{lang === 'ar' ? 'صافي العمولة' : 'Net Commission'}</th>}
                              </tr>
                              {isComColumnFiltersOpen && (
                                <tr className="bg-slate-100 border-b border-slate-200">
                                  {comVisibleColumns.empId && (
                                    <td className="py-1.5 px-2">
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={comColSearchEmpId}
                                          onChange={(e) => setComColSearchEmpId(e.target.value)}
                                          placeholder={lang === 'ar' ? 'تصفية...' : 'Filter...'}
                                          className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans text-slate-850"
                                        />
                                        {comColSearchEmpId && (
                                          <button onClick={() => setComColSearchEmpId('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                            <X size={10} />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                  {comVisibleColumns.name && (
                                    <td className="py-1.5 px-2">
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={comColSearchName}
                                          onChange={(e) => setComColSearchName(e.target.value)}
                                          placeholder={lang === 'ar' ? 'تصفية...' : 'Filter...'}
                                          className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans text-slate-850"
                                        />
                                        {comColSearchName && (
                                          <button onClick={() => setComColSearchName('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                            <X size={10} />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                  {comVisibleColumns.dept && (
                                    <td className="py-1.5 px-2">
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={comColSearchDept}
                                          onChange={(e) => setComColSearchDept(e.target.value)}
                                          placeholder={lang === 'ar' ? 'تصفية...' : 'Filter...'}
                                          className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans text-slate-850"
                                        />
                                        {comColSearchDept && (
                                          <button onClick={() => setComColSearchDept('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                            <X size={10} />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                  {comVisibleColumns.section && (
                                    <td className="py-1.5 px-2">
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={comColSearchSection}
                                          onChange={(e) => setComColSearchSection(e.target.value)}
                                          placeholder={lang === 'ar' ? 'تصفية...' : 'Filter...'}
                                          className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans text-slate-850"
                                        />
                                        {comColSearchSection && (
                                          <button onClick={() => setComColSearchSection('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                            <X size={10} />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                  {comVisibleColumns.branch && (
                                    <td className="py-1.5 px-2">
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={comColSearchBranch}
                                          onChange={(e) => setComColSearchBranch(e.target.value)}
                                          placeholder={lang === 'ar' ? 'تصفية...' : 'Filter...'}
                                          className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans text-slate-850"
                                        />
                                        {comColSearchBranch && (
                                          <button onClick={() => setComColSearchBranch('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                            <X size={10} />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                  {comVisibleColumns.consumerSales && (
                                    <td className="py-1.5 px-2">
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={comColSearchConsumerSales}
                                          onChange={(e) => setComColSearchConsumerSales(e.target.value)}
                                          placeholder={lang === 'ar' ? 'تصفية...' : 'Filter...'}
                                          className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans text-slate-850 text-right font-mono"
                                        />
                                        {comColSearchConsumerSales && (
                                          <button onClick={() => setComColSearchConsumerSales('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                            <X size={10} />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                  {comVisibleColumns.purchaseSales && (
                                    <td className="py-1.5 px-2">
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={comColSearchPurchaseSales}
                                          onChange={(e) => setComColSearchPurchaseSales(e.target.value)}
                                          placeholder={lang === 'ar' ? 'تصفية...' : 'Filter...'}
                                          className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans text-slate-850 text-right font-mono"
                                        />
                                        {comColSearchPurchaseSales && (
                                          <button onClick={() => setComColSearchPurchaseSales('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                            <X size={10} />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                  {comVisibleColumns.rate && (
                                    <td className="py-1.5 px-2">
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={comColSearchRate}
                                          onChange={(e) => setComColSearchRate(e.target.value)}
                                          placeholder={lang === 'ar' ? 'تصفية...' : 'Filter...'}
                                          className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans text-slate-850 text-center font-mono"
                                        />
                                        {comColSearchRate && (
                                          <button onClick={() => setComColSearchRate('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                            <X size={10} />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                  {comVisibleColumns.commission && (
                                    <td className="py-1.5 px-2">
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={comColSearchCommission}
                                          onChange={(e) => setComColSearchCommission(e.target.value)}
                                          placeholder={lang === 'ar' ? 'تصفية...' : 'Filter...'}
                                          className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans text-slate-850 text-right font-mono bg-orange-50/50"
                                        />
                                        {comColSearchCommission && (
                                          <button onClick={() => setComColSearchCommission('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                            <X size={10} />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              )}
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {paginatedComData.length === 0 ? (
                                <tr>
                                  <td colSpan={9} className="py-12 text-center text-slate-400 font-bold italic bg-slate-50/50">
                                    {lang === 'ar' ? 'لا توجد نتائج مطابقة لبحثك' : 'No staff profiles match this filter.'}
                                  </td>
                                </tr>
                              ) : (
                                paginatedComData.map(row => {
                                  const dept = departments.find(d => d.id === row.emp.departmentId);
                                  const sect = sections.find(s => s.id === row.emp.sectionId);
                                  return (
                                    <tr key={row.emp.id} className="hover:bg-slate-50/60 transition-colors">
                                      {comVisibleColumns.empId && <td className="py-3 px-4 text-center font-mono font-bold text-slate-500 bg-slate-50/40">{row.emp.id}</td>}
                                      {comVisibleColumns.name && (
                                        <td className="py-3 px-4">
                                          <div className="text-left rtl:text-right">
                                            <p className="font-extrabold text-slate-800">{lang === 'ar' ? row.emp.nameAr : row.emp.name}</p>
                                            <p className="text-[10px] text-white/80 font-bold mt-0.5">{lang === 'ar' ? row.emp.roleAr : row.emp.role}</p>
                                          </div>
                                        </td>
                                      )}
                                      {comVisibleColumns.dept && (
                                        <td className="py-3 px-4 font-bold text-slate-600">
                                          {dept ? (lang === 'ar' ? dept.nameAr : dept.nameEn) : '--'}
                                        </td>
                                      )}
                                      {comVisibleColumns.section && (
                                        <td className="py-3 px-4 font-semibold text-slate-500">
                                          {sect ? (lang === 'ar' ? sect.nameAr : sect.nameEn) : '--'}
                                        </td>
                                      )}
                                      {comVisibleColumns.branch && (
                                        <td className="py-3 px-4 font-semibold text-slate-600">
                                          {lang === 'ar' ? (row.emp.bankBranchAr || 'الفرع الرئيسي') : (row.emp.bankBranchEn || 'HQ Main Branch')}
                                        </td>
                                      )}
                                      {comVisibleColumns.consumerSales && (
                                        <td className="py-3 px-4 text-right font-mono font-bold text-[#0a1945]">
                                          {row.finalSales.toLocaleString(undefined, { minimumFractionDigits: 1 })} EGP
                                        </td>
                                      )}
                                      {comVisibleColumns.purchaseSales && (
                                        <td className="py-3 px-4 text-right font-mono font-bold text-orange-600">
                                          {row.purchaseSales.toLocaleString(undefined, { minimumFractionDigits: 1 })} EGP
                                        </td>
                                      )}
                                      {comVisibleColumns.rate && (
                                        <td className="py-3 px-4 text-center">
                                          <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-650 font-black font-mono text-[10.5px] px-2.5 py-1 rounded-lg border border-orange-100">
                                            {row.rate}%
                                          </span>
                                        </td>
                                      )}
                                      {comVisibleColumns.commission && (
                                        <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-700 bg-emerald-50/20">
                                          {row.commission.toLocaleString(undefined, { minimumFractionDigits: 1 })} EGP
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                        {/* Scrollbar header corner cover to force scrollbar to start below table header */}
                        <div className={cn(
                          "absolute top-[1px] right-[1px] rtl:left-[1px] rtl:right-auto w-[12px] bg-[#ea580c] z-20 pointer-events-none rounded-tr-xl rtl:rounded-tl-xl rtl:rounded-tr-none",
                          isComColumnFiltersOpen ? "h-[85px]" : "h-[44px]"
                        )} />
                      </div>

                      {/* Mobile Kanban View */}
                      <div className="block sm:hidden space-y-3.5 max-h-[550px] overflow-y-auto pr-1">
                        {paginatedComData.length === 0 ? (
                          <div className="py-12 text-center text-slate-400 font-bold italic bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            {lang === 'ar' ? 'لا توجد نتائج مطابقة لبحثك' : 'No staff profiles match this filter.'}
                          </div>
                        ) : (
                          paginatedComData.map(row => {
                            const dept = departments.find(d => d.id === row.emp.departmentId);
                            const sect = sections.find(s => s.id === row.emp.sectionId);
                            return (
                              <div key={row.emp.id} className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-orange-300 transition-colors shadow-sm space-y-3">
                                <div className="flex justify-between items-start">
                                  <div className="text-left rtl:text-right">
                                    {comVisibleColumns.empId && <span className="text-[9px] font-bold text-slate-440 font-mono tracking-wider block">{row.emp.id}</span>}
                                    {comVisibleColumns.name && (
                                      <>
                                        <h4 className="font-black text-slate-800 text-xs">{lang === 'ar' ? row.emp.nameAr : row.emp.name}</h4>
                                        <p className="text-[10px] text-slate-400 font-bold leading-tight">{lang === 'ar' ? row.emp.roleAr : row.emp.role}</p>
                                      </>
                                    )}
                                  </div>
                                  {comVisibleColumns.rate && (
                                    <span className="text-xs font-mono font-black text-orange-650 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-lg">
                                      {row.rate}%
                                    </span>
                                  )}
                                </div>

                                {/* Flexible Hidden Columns Details on Demand */}
                                {(comVisibleColumns.dept || comVisibleColumns.section) && (
                                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                                    {comVisibleColumns.dept && (
                                      <div>
                                        <span className="text-[9px] text-slate-400 font-extrabold block">{lang === 'ar' ? 'الإدارة' : 'Department'}</span>
                                        <span className="font-bold">{dept ? (lang === 'ar' ? dept.nameAr : dept.nameEn) : '--'}</span>
                                      </div>
                                    )}
                                    {comVisibleColumns.section && (
                                      <div>
                                        <span className="text-[9px] text-slate-400 font-extrabold block">{lang === 'ar' ? 'القسم' : 'Section'}</span>
                                        <span className="font-semibold">{sect ? (lang === 'ar' ? sect.nameAr : sect.nameEn) : '--'}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-[11px]">
                                  {comVisibleColumns.branch && (
                                    <div>
                                      <span className="text-slate-400 text-[9px] font-bold block mb-0.5">{lang === 'ar' ? 'الفرع البنكي' : 'Bank Branch'}</span>
                                      <span className="font-bold text-slate-700">{lang === 'ar' ? (row.emp.bankBranchAr || 'الفرع الرئيسي') : (row.emp.bankBranchEn || 'HQ Branch')}</span>
                                    </div>
                                  )}
                                  {comVisibleColumns.consumerSales && (
                                    <div>
                                      <span className="text-slate-400 text-[9px] font-bold block mb-0.5">{lang === 'ar' ? 'صافي المبيعات (المستهلك)' : 'Net Sales (Consumer)'}</span>
                                      <span className="font-extrabold text-[#0a1945] font-mono">{row.finalSales.toLocaleString(undefined, { minimumFractionDigits: 1 })} EGP</span>
                                    </div>
                                  )}
                                  {comVisibleColumns.purchaseSales && (
                                    <div className="col-span-2 sm:col-span-1">
                                      <span className="text-slate-400 text-[9px] font-bold block mb-0.5">{lang === 'ar' ? 'صافي المبيعات (الشراء)' : 'Net Sales (Purchase)'}</span>
                                      <span className="font-extrabold text-orange-650 font-mono">{row.purchaseSales.toLocaleString(undefined, { maximumFractionDigits: 1 })} EGP</span>
                                    </div>
                                  )}
                                </div>

                                {comVisibleColumns.commission && (
                                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl flex justify-between items-center text-xs">
                                    <span className="font-extrabold text-emerald-800">{lang === 'ar' ? 'صافي العمولة المستحقة' : 'Net Earned Commission'}</span>
                                    <span className="font-black text-emerald-700 font-mono">{row.commission.toLocaleString(undefined, { minimumFractionDigits: 1 })} EGP</span>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Dynamic Pagination Controls with orange/navy theme details */}
                      <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 font-sans text-xs text-slate-650">
                        {/* 1. Showing elements counter range */}
                        <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                          {lang === 'ar' ? (
                            <>
                              <span>عرض</span>
                              <span className="font-extrabold text-[#0a1945] font-mono bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                                {paginatedComData.length}
                              </span>
                              <span>من أصل</span>
                              <span className="font-extrabold text-orange-650 font-mono bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                                {computedData.length}
                              </span>
                            </>
                          ) : (
                            <>
                              <span>Show</span>
                              <span className="font-extrabold text-[#0a1945] font-mono bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                                {paginatedComData.length}
                              </span>
                              <span>of</span>
                              <span className="font-extrabold text-orange-650 font-mono bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                                {computedData.length}
                              </span>
                            </>
                          )}
                        </div>

                        {/* 2. Numerical Pagination Items */}
                        <div className="flex items-center gap-1 shrink-0 select-none">
                          {/* Previous Page arrow */}
                          <button
                            disabled={comCurrentPage === 1}
                            onClick={() => setComCurrentPage(prev => Math.max(1, prev - 1))}
                            className="p-2 border border-slate-200 hover:border-orange-400 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-650 hover:text-orange-500 hover:bg-orange-50/20 transition cursor-pointer h-8 w-8 flex items-center justify-center shadow-xs"
                            title={lang === 'ar' ? 'الصفحة السابقة' : 'Previous page'}
                          >
                            {lang === 'ar' ? <ChevronRight size={13} strokeWidth={2.5} /> : <ChevronLeft size={13} strokeWidth={2.5} />}
                          </button>

                          {/* Pages links */}
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(totalComPages, 3) }, (_, i) => i + 1).map(page => {
                              const isActive = page === comCurrentPage;
                              return (
                                <button
                                  key={page}
                                  onClick={() => setComCurrentPage(page)}
                                  className={cn(
                                    "w-8 h-8 rounded-lg font-extrabold transition cursor-pointer text-xs flex items-center justify-center border font-mono shadow-xs",
                                    isActive
                                      ? "bg-[#0a1945] text-white border-[#0a1945]"
                                      : "bg-white text-slate-700 border-slate-200 hover:border-orange-400 hover:text-orange-500"
                                  )}
                                >
                                  {page}
                                </button>
                              );
                            })}
                          </div>

                          {/* Next Page arrow */}
                          <button
                            disabled={comCurrentPage === totalComPages}
                            onClick={() => setComCurrentPage(prev => Math.min(totalComPages, prev + 1))}
                            className="p-2 border border-slate-200 hover:border-orange-400 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-650 hover:text-orange-500 hover:bg-orange-50/20 transition cursor-pointer h-8 w-8 flex items-center justify-center shadow-xs"
                            title={lang === 'ar' ? 'الصفحة التالية' : 'Next page'}
                          >
                            {lang === 'ar' ? <ChevronLeft size={13} strokeWidth={2.5} /> : <ChevronRight size={13} strokeWidth={2.5} />}
                          </button>
                        </div>

                        {/* 3. Page Size Dropdown */}
                        <div className="flex items-center gap-2 text-slate-500 font-bold shrink-0">
                          <span>{lang === 'ar' ? 'عرض' : 'Show'}</span>
                          <select
                            value={comPageSize}
                            onChange={(e) => {
                              setComPageSize(Number(e.target.value));
                              setComCurrentPage(1);
                            }}
                            className="bg-white border border-slate-200 text-[#0a1945] rounded-xl px-2 py-1.5 text-xs font-black shadow-xs outline-none focus:border-orange-400 cursor-pointer w-16 text-center"
                          >
                            {[5, 10, 20, 50, 100].map(sz => (
                              <option key={sz} value={sz} className="font-bold">
                                {sz}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Kanban View Mode: Grouped by Branch */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                      {comBranches.filter(b => b.id !== 'all').map(branch => {
                        const branchRows = computedData.filter(row => row.branchId === branch.id);
                        const isFilteredOut = !selectedComBranches.includes('all') && !selectedComBranches.includes(branch.id);
                        
                        if (isFilteredOut) return null;

                        const branchSales = branchRows.reduce((acc, d) => acc + d.finalSales, 0);
                        const branchCom = branchRows.reduce((acc, d) => acc + d.commission, 0);

                        return (
                          <div key={branch.id} className="bg-slate-50 border border-slate-200/85 rounded-2xl p-4 flex flex-col gap-4 shadow-xs transition-all duration-200">
                            {/* Branch Header block with status stats */}
                            <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-xs">
                              <div className="text-left rtl:text-right">
                                <h4 className="font-black text-[#0a1945] text-xs flex items-center gap-1.5 leading-tight font-sans">
                                  <Building2 className="w-4 h-4 text-orange-500 shrink-0" />
                                  <span>{lang === 'ar' ? branch.labelAr : branch.labelEn}</span>
                                </h4>
                                <span className="text-[10px] text-slate-400 font-bold block mt-1 font-sans">
                                  {branchRows.length} {lang === 'ar' ? 'موظفين' : 'employees'}
                                </span>
                              </div>
                              <div className="text-right rtl:text-left">
                                <span className="text-[11px] text-emerald-650 font-black block leading-none font-mono">
                                  +{branchCom.toLocaleString(undefined, { maximumFractionDigits: 1 })} EGP
                                </span>
                                <span className="text-[9px] text-slate-400 font-extrabold block mt-1 uppercase tracking-wider font-sans">
                                  {lang === 'ar' ? 'عمولات' : 'COMMS'}
                                </span>
                              </div>
                            </div>

                            {/* Cards List with scrolling */}
                            <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1 text-right">
                              {branchRows.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 font-bold bg-white/40 border border-dashed border-slate-200 rounded-2xl text-xs font-sans">
                                  {lang === 'ar' ? 'لا يوجد موظفون في هذا الفرع' : 'No employees in this branch'}
                                </div>
                              ) : (
                                branchRows.map(row => {
                                  const dept = departments.find(d => d.id === row.emp.departmentId);
                                  const sect = sections.find(s => s.id === row.emp.sectionId);
                                  const initials = row.emp.name.split(' ').slice(0, 2).map(n => n[0]).join('');

                                  return (
                                    <motion.div
                                      key={row.emp.id}
                                      layout
                                      initial={{ opacity: 0, scale: 0.95 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      className="bg-white border border-slate-200/95 hover:border-orange-300 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col gap-3.5 group relative text-right"
                                    >
                                      {/* Avatar, Name & Code ID */}
                                      <div className="flex items-center gap-3 rtl:flex-row-reverse text-left rtl:text-right border-b border-dashed border-slate-100 pb-3">
                                        <div className="w-9 h-9 rounded-xl bg-[#0a1945] text-white font-mono font-bold flex items-center justify-center text-xs shrink-0 select-none border-2 border-orange-100">
                                          {initials}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <h4 className="font-extrabold text-[#0a1945] text-[12px] leading-tight group-hover:text-orange-500 transition truncate font-sans">
                                            {lang === 'ar' ? row.emp.nameAr : row.emp.name}
                                          </h4>
                                          <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5 font-sans">
                                            {lang === 'ar' ? row.emp.roleAr : row.emp.role} • <span className="font-mono text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{row.emp.id}</span>
                                          </p>
                                        </div>
                                      </div>

                                      {/* Org unit badges */}
                                      <div className="flex flex-wrap gap-1 justify-end">
                                        {dept && (
                                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100/70 border border-slate-200/20 px-2 py-0.5 rounded-lg font-sans">
                                            {lang === 'ar' ? dept.nameAr : dept.nameEn}
                                          </span>
                                        )}
                                        {sect && (
                                          <span className="text-[9.5px] font-semibold text-slate-500 bg-slate-50 border border-slate-200/10 px-2 py-0.5 rounded-lg font-sans">
                                            {lang === 'ar' ? sect.nameAr : sect.nameEn}
                                          </span>
                                        )}
                                      </div>

                                      {/* Sales details (Consumer vs Purchase) */}
                                      <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-2.5 rounded-xl text-[10.5px] border border-slate-100">
                                        <div className="text-left rtl:text-right">
                                          <span className="text-slate-400 font-bold block mb-0.5 font-sans">{lang === 'ar' ? 'سعر المستهلك' : 'Consumer Price'}</span>
                                          <span className="font-black font-sans text-slate-800 text-[11px] font-mono">{row.finalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })} EGP</span>
                                        </div>
                                        <div className="text-right rtl:text-left border-l rtl:border-l-0 rtl:border-r border-slate-150 pl-2 rtl:pl-0 rtl:pr-2">
                                          <span className="text-slate-400 font-bold block mb-0.5 font-sans">{lang === 'ar' ? 'سعر الشراء' : 'Purchase Price'}</span>
                                          <span className="font-bold text-orange-500 font-sans text-[11px] font-mono">{row.purchaseSales.toLocaleString(undefined, { maximumFractionDigits: 0 })} EGP</span>
                                        </div>
                                      </div>

                                      {/* Bottom section: Rate Badge and calculated commission */}
                                      <div className="flex justify-between items-center bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 px-3 py-2.5 rounded-xl transition-colors text-[11px] font-bold">
                                        <div className="flex items-center gap-1.5">
                                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                                          <span className="text-emerald-800 text-[11px] font-sans">{lang === 'ar' ? 'العمولة المستحقة' : 'Net Commission'}</span>
                                        </div>
                                        <div className="text-right flex items-center gap-1 flex-row rtl:flex-row-reverse">
                                          <span className="text-[9.5px] font-extrabold text-slate-440 font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded-md">
                                            {row.rate}%
                                          </span>
                                          <span className="font-black text-emerald-600 font-mono text-[12.5px]">
                                            {row.commission.toLocaleString(undefined, { maximumFractionDigits: 1 })} EGP
                                          </span>
                                        </div>
                                      </div>
                                    </motion.div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* TAB 7: Certified & Approved Payroll Spreadsheet tracker */}
        {activeMenu === 'payroll' && (
          <div className="space-y-6">
            <ApprovedPayrolls 
              staffList={staff} 
              advanceOrders={advanceOrders} 
              lang={lang} 
            />
          </div>
        )}

        {/* TAB: Salary Disbursals / أذونات صرف الرواتب */}
        {activeMenu === 'disbursals' && (
          <div className="space-y-6 animate-fadeIn font-sans">
            
            {/* Stylish and elegant Header Section */}
            <div className="bg-gradient-to-r from-slate-50 to-orange-50/30 p-4 sm:p-5 rounded-2xl border border-slate-200/65 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="rtl:text-right text-left">
                <span className="bg-emerald-600 text-white font-extrabold text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full">
                  {lang === 'ar' ? 'سجل أذونات الصرف الفوري' : 'Live Disbursal Registrar'}
                </span>
                <h3 className="text-lg md:text-xl font-black text-[#0a1945] mt-2 flex items-center gap-2">
                  <Receipt className="text-emerald-600 animate-pulse" size={20} />
                  <span>{lang === 'ar' ? 'أذونات صرف الرواتب والسلف' : 'Salary & Advances Disbursals'}</span>
                </h3>
                <p className="text-slate-500 text-xs mt-1.5 max-w-xl font-medium leading-relaxed">
                  {lang === 'ar' 
                    ? 'إصدار ومتابعة أذونات صرف الرواتب، الدفعات مقدمة والسلف' 
                    : 'Issue and track salary disbursements, advance payments, and employee loans with comprehensive logs.'}
                </p>
              </div>

              {/* Summary Badges on the right */}
              <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
                <div className="bg-emerald-50 border border-emerald-100 p-3.5 px-5 rounded-2xl text-center font-sans w-full md:w-auto">
                  <span className="block text-[10px] uppercase tracking-wider font-extrabold text-emerald-500">{lang === 'ar' ? 'إجمالي أذونات الصرف' : 'Total Disbursals'}</span>
                  <span className="text-lg md:text-xl font-black text-emerald-600 font-mono mt-1 block">
                    {filteredDisbursals.reduce((sum, d) => sum + d.amount, 0).toLocaleString()} <span className="text-xs font-sans font-bold">{lang === 'ar' ? 'ج.م' : 'EGP'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Search, Filter & Export Panel */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:px-5 sm:py-5 lg:py-3 shadow-xs">
              
              {/* Top Row: Filters & Add Button */}
              <div className="flex flex-row justify-between items-center gap-4 rtl:flex-row-reverse">
                <div className="w-auto shrink-0">
                  {/* Export Data Button */}
                  <div className="w-[140px] sm:w-36 shrink-0 h-[45px]">
                    <ExportDataButton
                      lang={lang}
                      onToast={triggerHrToast}
                      onCopy={() => triggerHrToast(lang === 'ar' ? 'تم نسخ سجل أذونات الصرف' : 'Disbursals registry copied!')}
                      onPrint={() => triggerHrToast(lang === 'ar' ? 'تم فتح خيارات الطباعة لسجل أذونات الصرف' : 'Print options opened for disbursals!')}
                      className="w-full h-[45px]"
                    />
                  </div>
                </div>

                {/* Add Disbursal Button */}
                <div className="w-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDisbursalId(null);
                      setNewDisbursalEmp(staff[0]?.id || 'EMP1');
                      setNewDisbursalAmount(1000);
                      setNewDisbursalType('advance');
                      setNewDisbursalSafe('الخزينة الرئيسية');
                      setNewDisbursalDate(new Date().toISOString().split('T')[0]);
                      setShowDisbursalModal(true);
                    }}
                    className="h-[45px] px-4 sm:px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg shadow-xs cursor-pointer transition-all flex items-center justify-center gap-2 text-xs uppercase active:scale-[0.98]"
                  >
                    <span className="text-sm">💸</span>
                    <span>{lang === 'ar' ? 'إضافة إذن صرف' : 'Add Disbursal'}</span>
                  </button>
                </div>
              </div>

              {/* Disbursals Toolbar */}
              <div className="bg-white border-4 border-white rounded-2xl overflow-visible shadow-md relative hidden md:block mt-4 mb-2">
                <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 hidden md:flex flex-col sm:flex-row justify-between items-start sm:items-center rtl:flex-row-reverse gap-3.5 min-h-[48px] h-auto">
                  <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1 max-w-md">
                    <div className="relative flex-1 flex items-center">
                      <Search size={14} className="absolute left-3 rtl:right-3 rtl:left-auto text-slate-400 pointer-events-none" />
                      <input 
                        type="text"
                        value={disbursalSearchQuery}
                        onChange={e => setDisbursalSearchQuery(e.target.value)}
                        placeholder={lang === 'ar' ? 'ابحث باسم الموظف...' : 'Search employee...'}
                        style={{ height: '36px' }}
                        className="w-full text-xs p-2 pl-8 pr-8 rtl:pr-8 rtl:pl-8 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-400 transition h-[36px]"
                      />
                      {disbursalSearchQuery && (
                        <button
                          onClick={() => setDisbursalSearchQuery('')}
                          className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 -translate-y-1/2 p-0.5 text-slate-450 hover:text-orange-500 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                          title={lang === 'ar' ? 'مسح البحث' : 'Clear search'}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {disbursalViewMode === 'table' && (
                      <div className="relative group/filter">
                        <button
                          onClick={() => setIsDisbursalColumnFiltersOpen(!isDisbursalColumnFiltersOpen)}
                          style={{ height: '36px' }}
                          className={cn(
                            "p-2 px-3 text-xs font-black rounded-lg border transition flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap min-h-[36px]",
                            isDisbursalColumnFiltersOpen 
                              ? "bg-[#0a1945] text-white border-[#0a1945]" 
                              : "bg-white text-black border-slate-200 hover:border-orange-400 hover:text-orange-500"
                          )}
                        >
                          <Filter size={13} className="text-orange-500" />
                        </button>
                        
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/filter:block bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-50 font-bold font-sans pointer-events-none">
                          {lang === 'ar' ? 'بحث متقدم' : 'Advanced Search'}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 rtl:flex-row-reverse w-full justify-between sm:w-auto sm:justify-start">
                    {/* Date Filter Input (Changed to Month Dropdown) */}
                    <div className="relative group/date">
                      <select
                        value={disbursalFilterMonth}
                        onChange={(e) => {
                          setDisbursalFilterMonth(e.target.value);
                          setDisbursalCurrentPage(1);
                        }}
                        style={{ height: '36px' }}
                        className="p-1 px-3 pr-7 rtl:pl-7 rtl:pr-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold font-sans outline-none w-full sm:w-auto min-h-[36px] hover:border-orange-400 focus:border-orange-400 transition cursor-pointer appearance-none text-[#0a1945]"
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

                    <div className="relative group/toggle">
                      <button
                        onClick={() => setDisbursalViewMode(disbursalViewMode === 'table' ? 'cards' : 'table')}
                        style={{ height: '36px' }}
                        className="flex items-center justify-center gap-1.5 p-2 px-3 bg-white border border-slate-200 rounded-lg hover:border-orange-400 hover:text-orange-500 text-slate-650 hover:shadow-xs transition cursor-pointer select-none min-h-[36px] text-[11px] font-black"
                      >
                        {disbursalViewMode === 'table' ? (
                          <>
                            <LayoutGrid size={14} className="text-[#0a1945]" />
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
                        {disbursalViewMode === 'table' 
                          ? (lang === 'ar' ? 'تحويل لعرض البطاقات' : 'Switch to Cards view')
                          : (lang === 'ar' ? 'تحويل للجدول الكلاسيكي' : 'Switch to Classic Table view')
                        }
                      </div>
                    </div>

                    <div className="relative group/settings">
                      <button 
                        onClick={() => {
                          setTempDisbursalVisibleColumns({ ...disbursalVisibleColumns });
                          setDisbursalColumnDropdownOpen(!disbursalColumnDropdownOpen);
                        }}
                        style={{ height: '36px' }}
                        className="p-2 text-black hover:text-orange-500 bg-white border border-slate-200 hover:border-orange-400 rounded-lg hover:shadow-xs transition cursor-pointer flex items-center justify-center font-black text-[11px] min-h-[36px] w-[36px]"
                      >
                        <Settings size={14} className="text-orange-500 animate-spin-hover" />
                      </button>
                      
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/settings:block bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-50 font-bold font-sans pointer-events-none">
                        {lang === 'ar' ? 'تخصيص الأعمدة' : 'Customize Columns'}
                      </div>
                    
                      <AnimatePresence>
                        {disbursalColumnDropdownOpen && (
                          <div className="absolute right-0 left-auto mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 p-3.5 text-xs text-right">
                            <div className="pb-2 border-b border-slate-100 mb-2.5 flex justify-between items-center">
                              <h4 className="font-extrabold text-slate-800 text-[12px] text-left rtl:text-right">{lang === 'ar' ? 'اختر الأعمدة' : 'Choose Columns'}</h4>
                              <button onClick={() => setDisbursalColumnDropdownOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                                <X size={14} />
                              </button>
                            </div>
                            
                            <div className="space-y-2.5 max-h-68 overflow-y-auto">
                              {[
                                { key: 'id', labelAr: 'رقم الإذن', labelEn: 'Order No.' },
                                { key: 'emp', labelAr: 'الموظف', labelEn: 'Employee' },
                                { key: 'type', labelAr: 'نوع الصرف', labelEn: 'Disbursal Type' },
                                { key: 'safeName', labelAr: 'اسم الخزينة', labelEn: 'Safe Name' },
                                { key: 'date', labelAr: 'التاريخ', labelEn: 'Date' },
                                { key: 'amount', labelAr: 'المبلغ', labelEn: 'Amount' }
                              ].map((col) => (
                                <div key={col.key} className="flex items-center gap-2 py-0.5 select-none rtl:flex-row-reverse">
                                  <GripVertical size={12} className="text-slate-400 shrink-0" />
                                  <label className="flex items-center gap-2 w-full cursor-pointer select-none font-bold text-slate-700 text-left rtl:text-right flex-row rtl:flex-row-reverse">
                                    <input 
                                      type="checkbox" 
                                      checked={tempDisbursalVisibleColumns[col.key as keyof typeof tempDisbursalVisibleColumns]} 
                                      onChange={() => setTempDisbursalVisibleColumns(prev => ({ ...prev, [col.key]: !prev[col.key as keyof typeof tempDisbursalVisibleColumns] }))}
                                      className="w-4 h-4 rounded border border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition shrink-0"
                                    />
                                    <span className="text-[10px] font-semibold text-slate-700 truncate">{lang === 'ar' ? col.labelAr : col.labelEn}</span>
                                  </label>
                                </div>
                              ))}
                            </div>

                            <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1">
                              <button 
                                onClick={() => setTempDisbursalVisibleColumns({ id: true, emp: true, type: true, safeName: true, date: true, amount: true, actions: true })}
                                className="px-1.5 py-1 border border-slate-200 text-slate-700 hover:text-[#0a1945] bg-white rounded-lg text-[8.5px] font-bold transition cursor-pointer uppercase tracking-tight"
                              >
                                {lang === 'ar' ? 'إعادة' : 'RESET'}
                              </button>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => setDisbursalColumnDropdownOpen(false)}
                                  className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-lg text-[8.5px] font-bold transition cursor-pointer uppercase tracking-tight"
                                >
                                  {lang === 'ar' ? 'إلغاء' : 'CANCEL'}
                                </button>
                                <button 
                                  onClick={() => {
                                    setDisbursalVisibleColumns({ ...tempDisbursalVisibleColumns });
                                    setDisbursalColumnDropdownOpen(false);
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
                  </div>
                </div>
              </div>
            </div>

              {/* Disbursal Modal Popup */}
              <AnimatePresence>
                {showDisbursalModal && (
                  <div className="fixed inset-0 bg-[#0a1945]/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0, y: -20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.95, opacity: 0, y: -20 }}
                      className="bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-4 text-xs select-none max-h-[95vh] overflow-y-auto my-auto relative"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            💵
                          </span>
                          <div className="text-left rtl:text-right">
                            <h3 className="text-sm font-black text-white">
                              {editingDisbursalId 
                                ? (lang === 'ar' ? 'تعديل إذن صرف راتب / سلفة' : 'Edit Disbursal Order')
                                : (lang === 'ar' ? 'إصدار إذن صرف راتب / سلفة' : 'Issue Disbursal Order')
                              }
                            </h3>
                            <p className="text-[10px] text-white/80 font-bold mt-0.5">
                              {lang === 'ar' ? 'إصدار إذن وتوثيقه بالخزينة المحددة لليوم' : 'Create disbursal order and sign with safe for today'}
                            </p>
                          </div>
                        </span>
                        <button 
                          type="button"
                          onClick={() => setShowDisbursalModal(false)}
                          className="text-white hover:text-orange-100 p-1.5 rounded-lg hover:bg-orange-600 transition cursor-pointer"
                        >
                          <X size={16} strokeWidth={2.5} />
                        </button>
                      </div>

                      <div className="p-6 space-y-4">
                      {/* Form */}
                      <form onSubmit={handleAddDisbursal} className="space-y-4 text-left rtl:text-right">
                        {/* Select Employee */}
                        <div>
                          <label className="block text-[11px] font-extrabold text-slate-505 mb-1.5">
                            {lang === 'ar' ? 'الموظف المستفيد' : 'Beneficiary Staff'}
                          </label>
                          <select
                            value={newDisbursalEmp}
                            onChange={e => setNewDisbursalEmp(e.target.value)}
                            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-800 transition"
                          >
                            {staff.map(emp => (
                              <option key={emp.id} value={emp.id}>
                                {emp.id} - {lang === 'ar' ? emp.nameAr : emp.name} ({lang === 'ar' ? emp.roleAr : emp.role})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* ROW 1: Disbursal Type + Amount in the SAME row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Disbursal Type */}
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-505 mb-1.5">
                              {lang === 'ar' ? 'نوع الصرف' : 'Disbursal Type'}
                            </label>
                            <select
                              value={newDisbursalType}
                              onChange={e => {
                                const val = e.target.value as any;
                                setNewDisbursalType(val);
                                // If advance or carried, date should be frozen as today
                                if (val === 'advance' || val === 'advance_carried') {
                                  setNewDisbursalDate('2026-06-25');
                                }
                              }}
                              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-800 transition"
                            >
                              <option value="advance">{lang === 'ar' ? 'سلفة' : 'Advance Loan'}</option>
                              <option value="advance_carried">{lang === 'ar' ? 'سلفة مرحلة' : 'Carried Advance'}</option>
                              <option value="salary">{lang === 'ar' ? 'راتب' : 'Salary Payment'}</option>
                            </select>
                          </div>

                          {/* Amount Input */}
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-505 mb-1.5">
                              {lang === 'ar' ? 'المبلغ المستحق صرفه' : 'Amount (EGP)'}
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={newDisbursalAmount}
                              onChange={e => setNewDisbursalAmount(Number(e.target.value))}
                              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-800 font-mono transition"
                              placeholder="1000"
                              required
                            />
                          </div>
                        </div>

                        {/* Quick presets for amount */}
                        <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                          <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">{lang === 'ar' ? 'تحديد سريع للمبلغ:' : 'Quick amount select:'}</span>
                          <div className="flex gap-1.5 flex-wrap">
                            {[500, 1000, 2000, 5000, 10000].map(amt => (
                              <button
                                type="button"
                                key={amt}
                                onClick={() => setNewDisbursalAmount(amt)}
                                className={cn(
                                  "text-[10px] font-extrabold px-3 py-1 rounded-lg border transition cursor-pointer select-none",
                                  newDisbursalAmount === amt 
                                    ? "bg-emerald-500 text-white border-emerald-500" 
                                    : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-600"
                                )}
                              >
                                {amt}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* ROW 2: Date + Safe Name in the SAME row, both disabled */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Safe Name (Disabled) */}
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-400 mb-1.5">
                              {lang === 'ar' ? 'خزنة الصرف (ثابتة)' : 'Disbursal Safe (Fixed)'}
                            </label>
                            <input
                              type="text"
                              value={lang === 'ar' ? 'الخزينة الرئيسية للمستخدم' : 'Main Treasury'}
                              className="w-full text-xs p-2.5 bg-slate-100 border border-slate-200 rounded-xl outline-none font-bold text-slate-500 transition cursor-not-allowed"
                              disabled
                            />
                          </div>

                          {/* Disbursal Date (Disabled) */}
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-400 mb-1.5">
                              {lang === 'ar' ? 'تاريخ الصرف (ثابت لليوم)' : 'Disbursal Date (Fixed)'}
                            </label>
                            <input
                              type="text"
                              value="2026-06-25"
                              className="w-full text-xs p-2.5 bg-slate-100 border border-slate-200 rounded-xl outline-none font-bold text-slate-500 transition cursor-not-allowed font-mono"
                              disabled
                            />
                          </div>
                        </div>

                        {/* Conditionally show Salary Month Selector only for "salary" type */}
                        {newDisbursalType === 'salary' && (
                          <div className="bg-emerald-50/40 p-3 rounded-2xl border border-emerald-100/60 animate-fadeIn space-y-1.5">
                            <label className="block text-[11px] font-extrabold text-[#0a1945]">
                              {lang === 'ar' ? 'استحقاق راتب شهر' : 'Salary Eligible Month'}
                            </label>
                            <select
                              value={newDisbursalSalaryMonth}
                              onChange={e => setNewDisbursalSalaryMonth(e.target.value)}
                              className="w-full text-xs p-2.5 bg-white border border-slate-250 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-800 transition cursor-pointer"
                            >
                              <option value="2026-05">{lang === 'ar' ? 'مايو - 2026' : 'May - 2026'}</option>
                              <option value="2026-06">{lang === 'ar' ? 'يونيو - 2026' : 'June - 2026'}</option>
                              <option value="2026-07">{lang === 'ar' ? 'يوليو - 2026' : 'July - 2026'}</option>
                              <option value="2026-08">{lang === 'ar' ? 'أغسطس - 2026' : 'August - 2026'}</option>
                            </select>
                          </div>
                        )}

                        {/* Direct view/edit of installments for carried advance */}
                        {newDisbursalType === 'advance_carried' && (
                          <div className="bg-orange-50/40 p-3 rounded-2xl border border-orange-100/60 space-y-2 animate-fadeIn">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="block text-[11px] font-extrabold text-[#0a1945]">
                                  {lang === 'ar' ? 'تقسيم أقساط السلفة' : 'Advance Installments Split'}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  {installmentsDistribution && installmentsDistribution.length > 0
                                    ? (lang === 'ar' 
                                        ? `موزعة على ${installmentsDistribution.length} أشهر` 
                                        : `Distributed over ${installmentsDistribution.length} months`)
                                    : (lang === 'ar' ? 'لم يتم التقسيم بعد' : 'Not split yet')
                                  }
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!installmentsDistribution || installmentsDistribution.length === 0) {
                                    const dist = [];
                                    const today = new Date('2026-06-25');
                                    for (let i = 1; i <= 3; i++) {
                                      const nextMonth = new Date(today.getFullYear(), today.getMonth() + i, 1);
                                      const monthStr = nextMonth.toISOString().substring(0, 7); // YYYY-MM
                                      dist.push({
                                        month: monthStr,
                                        amount: Math.round(newDisbursalAmount / 3)
                                      });
                                    }
                                    setInstallmentsDistribution(dist);
                                    setInstallmentMonths(3);
                                  }
                                  setShowInstallmentsModal(true);
                                }}
                                className="py-1.5 px-3 bg-orange-100 hover:bg-orange-200 text-orange-700 font-extrabold rounded-lg text-[10px] transition cursor-pointer flex items-center gap-1"
                              >
                                🗓️ {lang === 'ar' ? 'تعديل / عرض التقسيم' : 'View / Edit Split'}
                              </button>
                            </div>
                            
                            {installmentsDistribution && installmentsDistribution.length > 0 && (
                              <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-orange-100/50 max-h-[80px] overflow-y-auto">
                                {installmentsDistribution.map((inst, idx) => (
                                  <div key={idx} className="bg-white/85 p-1 rounded-lg border border-slate-100 text-center font-mono text-[9px]">
                                    <span className="text-slate-400 block text-[8px]">{inst.month}</span>
                                    <span className="font-bold text-slate-700">{inst.amount} ج.م</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Submit Actions */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setShowDisbursalModal(false)}
                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-lg cursor-pointer transition text-xs uppercase"
                          >
                            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                          <button
                            type="submit"
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg shadow-md cursor-pointer transition text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-[0.98]"
                          >
                            <Plus size={15} />
                            <span>{editingDisbursalId 
                              ? (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes')
                              : (newDisbursalType === 'advance_carried' 
                                  ? (lang === 'ar' ? 'الانتقال لتقسيم السلفة' : 'Proceed to Installments Split')
                                  : (lang === 'ar' ? 'إعتماد وصرف فوري' : 'Approve & Disburse'))
                            }</span>
                          </button>
                        </div>
                      </form>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Installments Split Modal Popup for Carried Advances */}
              <AnimatePresence>
                {showInstallmentsModal && (
                  <div className="fixed inset-0 bg-[#0a1945]/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 overflow-y-auto">
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-2xl max-w-lg w-full text-xs select-none max-h-[95vh] my-auto relative text-left rtl:text-right flex flex-col"
                    >
                      <div className="flex items-center justify-between bg-orange-500 px-5 shrink-0" style={{ height: '66px' }}>
                        <span className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-xl bg-orange-600/30 text-white flex items-center justify-center font-bold">
                            🗓️
                          </span>
                          <div>
                            <h3 className="text-sm font-black text-white">
                              {lang === 'ar' ? 'تقسيم السلفة المرحلة' : 'Installments Split Planning'}
                            </h3>
                            <p className="text-[10px] text-white/80 font-bold mt-0.5">
                              {lang === 'ar' ? 'توزيع قيمة السلفة على أشهر تالية معتمدة' : 'Distribute the advance amount over consecutive future months'}
                            </p>
                          </div>
                        </span>
                        <button 
                          type="button"
                          onClick={() => setShowInstallmentsModal(false)}
                          className="text-white hover:text-orange-100 p-1.5 rounded-lg hover:bg-orange-600 transition cursor-pointer"
                        >
                          <X size={16} strokeWidth={2.5} />
                        </button>
                      </div>

                      <div className="p-6 space-y-4 overflow-y-auto">

                      {/* Info box */}
                      <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 flex justify-between items-center">
                        <div>
                          <span className="text-slate-500 font-bold block">{lang === 'ar' ? 'إجمالي مبلغ السلفة:' : 'Total Advance Amount:'}</span>
                          <span className="text-sm font-black text-slate-800 font-mono">{newDisbursalAmount.toLocaleString()} EGP</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold block">{lang === 'ar' ? 'المبلغ الموزع حالياً:' : 'Currently Distributed:'}</span>
                          <span className={cn(
                            "text-sm font-black font-mono px-2 py-1 rounded-lg",
                            installmentsDistribution.reduce((sum, inst) => sum + inst.amount, 0) === newDisbursalAmount
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                              : "bg-rose-50 text-rose-600 border border-rose-100 animate-pulse"
                          )}>
                            {installmentsDistribution.reduce((sum, inst) => sum + inst.amount, 0).toLocaleString()} EGP
                          </span>
                        </div>
                      </div>

                      {/* Inputs to adjust Months Term */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-extrabold text-slate-505 mb-1.5">
                            {lang === 'ar' ? 'عدد أشهر التقسيط' : 'Number of Months'}
                          </label>
                          <select
                            value={installmentMonths}
                            onChange={e => {
                              const terms = Number(e.target.value);
                              setInstallmentMonths(terms);
                              // Auto distribute equally
                              const dist = [];
                              const today = new Date('2026-06-25');
                              for (let i = 1; i <= terms; i++) {
                                const nextMonth = new Date(today.getFullYear(), today.getMonth() + i, 1);
                                const monthStr = nextMonth.toISOString().substring(0, 7); // YYYY-MM
                                dist.push({
                                  month: monthStr,
                                  amount: Math.round(newDisbursalAmount / terms)
                                });
                              }
                              setInstallmentsDistribution(dist);
                            }}
                            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-orange-500 font-bold text-slate-800 transition cursor-pointer"
                          >
                            {[2, 3, 4, 5, 6, 8, 10, 12].map(val => (
                              <option key={val} value={val}>{val} {lang === 'ar' ? 'أشهر' : 'months'}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              const terms = installmentMonths;
                              const dist = [];
                              const today = new Date('2026-06-25');
                              let remaining = newDisbursalAmount;
                              for (let i = 1; i <= terms; i++) {
                                const nextMonth = new Date(today.getFullYear(), today.getMonth() + i, 1);
                                const monthStr = nextMonth.toISOString().substring(0, 7); // YYYY-MM
                                const currentPart = i === terms ? remaining : Math.round(newDisbursalAmount / terms);
                                remaining -= currentPart;
                                dist.push({
                                  month: monthStr,
                                  amount: currentPart
                                });
                              }
                              setInstallmentsDistribution(dist);
                            }}
                            className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-[#0a1945] font-extrabold rounded-lg text-center cursor-pointer transition"
                          >
                            🔄 {lang === 'ar' ? 'توزيع بالتساوي' : 'Distribute Equally'}
                          </button>
                        </div>
                      </div>

                      {/* Dynamic installments input lines */}
                      <div className="space-y-3.5 max-h-[220px] overflow-y-auto border border-slate-150 rounded-2xl p-3.5 bg-slate-50/40">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block border-b border-slate-100 pb-1 mb-2">
                          {lang === 'ar' ? 'توزيع الأقساط الشهرية' : 'Monthly Installments Plan'}
                        </span>
                        {installmentsDistribution.map((inst, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-white border border-slate-200 rounded-xl p-2 sm:p-2.5">
                            <span className="font-mono font-bold text-slate-500 bg-slate-50 p-2 py-1 rounded-lg self-start sm:self-auto text-center w-full sm:w-auto">#{idx + 1}</span>
                            
                            <div className="flex-1">
                              <label className="block text-[9px] text-slate-400 font-extrabold mb-0.5">{lang === 'ar' ? 'الشهر المستحق (يجب أن يكون مستقبلاً)' : 'Due Month (must be future)'}</label>
                              <input
                                type="month"
                                value={inst.month}
                                min="2026-07"
                                onChange={e => {
                                  const newMonth = e.target.value;
                                  const minAllowed = "2026-07";
                                  if (newMonth < minAllowed) {
                                    triggerHrToast(lang === 'ar' ? 'لا يمكن اختيار تاريخ سابق أو مساوي للشهر الحالي!' : 'Must choose a future month!');
                                    return;
                                  }
                                  const updated = [...installmentsDistribution];
                                  updated[idx].month = newMonth;
                                  setInstallmentsDistribution(updated);
                                }}
                                className="w-full text-xs p-1.5 sm:p-1 bg-slate-50 border border-slate-200 rounded-lg font-bold font-mono outline-none focus:border-orange-500 text-slate-800"
                                required
                              />
                            </div>

                            <div className="w-full sm:w-32">
                              <label className="block text-[9px] text-slate-400 font-extrabold mb-0.5">{lang === 'ar' ? 'القيمة (ج.م)' : 'Amount (EGP)'}</label>
                              <input
                                type="number"
                                min="1"
                                value={inst.amount}
                                onChange={e => {
                                  const updated = [...installmentsDistribution];
                                  updated[idx].amount = Number(e.target.value);
                                  setInstallmentsDistribution(updated);
                                }}
                                className="w-full text-xs p-1.5 sm:p-1 bg-slate-50 border border-slate-200 rounded-lg font-bold font-mono outline-none focus:border-orange-500 text-slate-800"
                                required
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Validation message */}
                      {installmentsDistribution.reduce((sum, inst) => sum + inst.amount, 0) !== newDisbursalAmount && (
                        <p className="text-[10px] text-rose-600 font-bold bg-rose-50 border border-rose-100 p-2.5 rounded-xl text-center animate-pulse">
                          ⚠️ {lang === 'ar' 
                            ? `المجموع الحالي هو ${installmentsDistribution.reduce((sum, inst) => sum + inst.amount, 0).toLocaleString()} ج.م. يجب أن يكون مساوياً لمبلغ السلفة الكلي: ${newDisbursalAmount.toLocaleString()} ج.م.`
                            : `Sum is ${installmentsDistribution.reduce((sum, inst) => sum + inst.amount, 0).toLocaleString()} EGP. Must equal the total advance: ${newDisbursalAmount.toLocaleString()} EGP.`
                          }
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setShowInstallmentsModal(false)}
                          className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-lg cursor-pointer transition text-xs"
                        >
                          {lang === 'ar' ? 'السابق' : 'Back'}
                        </button>
                        <button
                          type="button"
                          disabled={installmentsDistribution.reduce((sum, inst) => sum + inst.amount, 0) !== newDisbursalAmount}
                          onClick={() => {
                            saveDisbursalData(installmentsDistribution);
                          }}
                          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold rounded-lg shadow-md cursor-pointer transition text-xs flex items-center justify-center gap-1.5"
                        >
                          🏆
                          <span>{lang === 'ar' ? 'تأكيد وحفظ التقسيم' : 'Confirm & Save Split'}</span>
                        </button>
                      </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* View Disbursal Modal */}
              {viewingDisbursal && (
                <div className="fixed inset-0 bg-[#0a1945]/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-2xl max-w-md w-full text-xs relative text-left rtl:text-right"
                  >
                    <div className="flex justify-between items-center bg-orange-500 text-white px-5" style={{ height: '56px' }}>
                      <h3 className="text-sm font-black text-white flex items-center gap-2">
                        <Eye size={18} className="text-white" />
                        {lang === 'ar' ? 'تفاصيل إذن صرف الرواتب والسلف' : 'Disbursal Order Details'}
                      </h3>
                      <button 
                        onClick={() => setViewingDisbursal(null)}
                        className="text-white hover:text-orange-100 p-1.5 rounded-lg hover:bg-orange-600 transition cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="p-6 space-y-4">

                    <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-slate-400 font-bold">{lang === 'ar' ? 'رقم الإذن:' : 'Order Number:'}</span>
                        <span className="font-mono font-black text-[#0a1945]">{viewingDisbursal.id}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-slate-400 font-bold">{lang === 'ar' ? 'الموظف:' : 'Employee:'}</span>
                        <span className="font-bold text-slate-800">
                          {(() => {
                            const emp = staff.find(s => s.id === viewingDisbursal.empId);
                            return emp ? (lang === 'ar' ? emp.nameAr : emp.name) : 'Unknown';
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-slate-400 font-bold">{lang === 'ar' ? 'كود الموظف:' : 'Employee Code:'}</span>
                        <span className="font-mono font-bold text-slate-600">{viewingDisbursal.empId}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-slate-400 font-bold">{lang === 'ar' ? 'نوع الصرف:' : 'Disbursal Type:'}</span>
                        <span className="font-bold px-2 py-0.5 rounded-lg text-[10px] bg-blue-50 text-blue-700">
                          {viewingDisbursal.type === 'advance' && (lang === 'ar' ? 'سلفة' : 'Advance')}
                          {viewingDisbursal.type === 'advance_carried' && (lang === 'ar' ? 'سلفة مرحلة' : 'Carried Advance')}
                          {viewingDisbursal.type === 'salary' && (lang === 'ar' ? 'راتب' : 'Salary')}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-slate-400 font-bold">{lang === 'ar' ? 'اسم الخزنة:' : 'Safe Name:'}</span>
                        <span className="font-bold text-slate-700">{viewingDisbursal.safeName}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-slate-400 font-bold">{lang === 'ar' ? 'التاريخ:' : 'Date:'}</span>
                        <span className="font-mono text-slate-600">{viewingDisbursal.date}</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-slate-400 font-extrabold">{lang === 'ar' ? 'المبلغ الصافي:' : 'Net Amount:'}</span>
                        <span className="font-mono font-black text-emerald-600 text-sm">
                          {viewingDisbursal.amount.toLocaleString()} EGP
                        </span>
                      </div>
                    </div>

                    {/* Show installments split for viewing and editing if it is a carried advance */}
                    {viewingDisbursal.type === 'advance_carried' && (
                      <div className="border border-slate-150 rounded-2xl p-4 bg-orange-50/20 space-y-2.5 text-left rtl:text-right">
                        <span className="block text-[10px] font-extrabold text-orange-700 uppercase tracking-wider">
                          🗓️ {lang === 'ar' ? 'خطة أقساط السلفة المرحّلة:' : 'Carried Advance Installments Plan:'}
                        </span>
                        
                        {viewingDisbursal.installments && viewingDisbursal.installments.length > 0 ? (
                          <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                            {viewingDisbursal.installments.map((inst: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center bg-white border border-slate-100 p-2 rounded-xl font-mono text-[10px]">
                                <span className="text-slate-500 font-bold">#{idx + 1} {inst.month}</span>
                                <span className="font-black text-slate-800">{inst.amount.toLocaleString()} EGP</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic">
                            {lang === 'ar' ? 'لم يتم تحديد جدول أقساط بعد لهذه السلفة' : 'No installment schedule set for this advance.'}
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setEditingDisbursalId(viewingDisbursal.id);
                            setNewDisbursalEmp(viewingDisbursal.empId);
                            setNewDisbursalType(viewingDisbursal.type);
                            setNewDisbursalSafe(viewingDisbursal.safeName);
                            setNewDisbursalAmount(viewingDisbursal.amount);
                            setNewDisbursalDate(viewingDisbursal.date);
                            
                            const existingInstallments = viewingDisbursal.installments || [];
                            if (existingInstallments.length > 0) {
                              setInstallmentsDistribution(existingInstallments);
                              setInstallmentMonths(existingInstallments.length);
                            } else {
                              const dist = [];
                              const today = new Date('2026-06-25');
                              for (let i = 1; i <= 3; i++) {
                                const nextMonth = new Date(today.getFullYear(), today.getMonth() + i, 1);
                                const monthStr = nextMonth.toISOString().substring(0, 7); // YYYY-MM
                                dist.push({
                                  month: monthStr,
                                  amount: Math.round(viewingDisbursal.amount / 3)
                                });
                              }
                              setInstallmentsDistribution(dist);
                              setInstallmentMonths(3);
                            }
                            
                            setShowInstallmentsModal(true);
                            setViewingDisbursal(null);
                          }}
                          className="w-full py-2 px-3 bg-orange-100 hover:bg-orange-200 text-orange-700 font-extrabold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 mt-1"
                        >
                          ⚙️
                          <span>{lang === 'ar' ? 'تعديل أو إعادة تقسيم السلفة' : 'Edit or Redistribute Advance'}</span>
                        </button>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-3 border-t border-slate-100">
                      {/* Paper Size selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">
                          {lang === 'ar' ? 'مقاس الورق:' : 'Paper size:'}
                        </span>
                        <select
                          value={disbursalPaperSize}
                          onChange={(e) => setDisbursalPaperSize(e.target.value)}
                          className="text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none focus:border-orange-400 font-sans cursor-pointer flex-1 sm:flex-none"
                        >
                          <option value="A4">A4</option>
                          <option value="A5">A5</option>
                          <option value="thermal">{lang === 'ar' ? 'ورق حراري' : 'Thermal'}</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => {
                            const sizeLabel = disbursalPaperSize === 'A4' ? 'A4' : disbursalPaperSize === 'A5' ? 'A5' : (lang === 'ar' ? 'ورق حراري' : 'Thermal');
                            triggerHrToast(lang === 'ar' ? `تم إرسال الإذن للطباعة بمقاس ${sizeLabel}` : `Sent to print queue with ${sizeLabel} paper size!`);
                            setViewingDisbursal(null);
                          }}
                          className="py-2 px-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer active:scale-[0.98] shadow-xs"
                        >
                          <Printer size={13} />
                          <span>{lang === 'ar' ? 'طباعة' : 'Print'}</span>
                        </button>
                        <button
                          onClick={() => setViewingDisbursal(null)}
                          className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition cursor-pointer active:scale-[0.98]"
                        >
                          {lang === 'ar' ? 'إغلاق' : 'Close'}
                        </button>
                      </div>
                    </div>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Live Interactive Ledgers Section */}
              <div className="bg-white border border-slate-205 rounded-3xl p-5 shadow-sm">

                <div className="space-y-3">
                  {disbursalViewMode === 'table' ? (
                    <>
                      {/* Web Tables view - shown on desktop (lg and up) */}
                      <div className="hidden md:block bg-white border border-slate-150 rounded-2xl shadow-xs overflow-hidden w-full">
                        <div className="overflow-x-auto w-full">
                          <table className="w-full text-left rtl:text-right border-collapse">
                            <thead className="bg-[#f97316] text-[11px] font-sans text-white font-bold uppercase tracking-wider whitespace-nowrap h-10 border-b border-orange-600">
                              <tr>
                                {disbursalVisibleColumns.id && <th className="py-2.5 px-4 text-white">{lang === 'ar' ? 'رقم الإذن' : 'Order No.'}</th>}
                                {disbursalVisibleColumns.emp && <th className="py-2.5 px-4 text-white">{lang === 'ar' ? 'الموظف' : 'Employee'}</th>}
                                {disbursalVisibleColumns.type && <th className="py-2.5 px-4 text-white">{lang === 'ar' ? 'نوع الصرف' : 'Disbursal Type'}</th>}
                                {disbursalVisibleColumns.safeName && <th className="py-2.5 px-4 text-white">{lang === 'ar' ? 'اسم الخزينة' : 'Safe Name'}</th>}
                                {disbursalVisibleColumns.date && <th className="py-2.5 px-4 text-center text-white">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>}
                                {disbursalVisibleColumns.amount && <th className="py-2.5 px-4 text-center text-white">{lang === 'ar' ? 'المبلغ' : 'Amount'}</th>}
                                {disbursalVisibleColumns.actions && <th className="py-2.5 px-4 text-center text-white">{lang === 'ar' ? 'خيارات الإجراءات' : 'Actions'}</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-sans">
                        {filteredDisbursals.length === 0 ? (
                           <tr>
                            <td colSpan={Object.values(disbursalVisibleColumns).filter(Boolean).length} className="py-8 text-center text-slate-400 font-bold">
                              {lang === 'ar' ? 'لا توجد أذونات صرف مسجلة حالياً' : 'No disbursals registered yet.'}
                            </td>
                          </tr>
                        ) : (
                          paginatedDisbursals.map(d => {
                            const emp = staff.find(s => s.id === d.empId);
                            return (
                              <tr key={d.id} className="hover:bg-slate-55/40 transition">
                                {disbursalVisibleColumns.id && (
                                  <td className="py-2.5 px-3 font-mono font-black text-slate-800">
                                    {d.id}
                                  </td>
                                )}
                                {disbursalVisibleColumns.emp && (
                                  <td className="py-2.5 px-3">
                                    <div>
                                      <p className="font-extrabold text-slate-800 text-[11px] font-sans">{emp ? (lang === 'ar' ? emp.nameAr : emp.name) : 'Unknown'}</p>
                                      <p className="text-[9px] text-slate-400 font-mono tracking-tight">{d.empId}</p>
                                    </div>
                                  </td>
                                )}
                                {disbursalVisibleColumns.type && (
                                  <td className="py-2.5 px-3">
                                    <span className="font-extrabold text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                                      {d.type === 'advance' && (lang === 'ar' ? 'سلفة' : 'Advance')}
                                      {d.type === 'advance_carried' && (lang === 'ar' ? 'سلفة مرحلة' : 'Carried Advance')}
                                      {d.type === 'salary' && (lang === 'ar' ? 'راتب' : 'Salary')}
                                    </span>
                                  </td>
                                )}
                                {disbursalVisibleColumns.safeName && (
                                  <td className="py-2.5 px-3 font-medium text-slate-600">
                                    {d.safeName}
                                  </td>
                                )}
                                {disbursalVisibleColumns.date && (
                                  <td className="py-2.5 px-3 text-center font-mono text-[10px] text-slate-400">
                                    {d.date}
                                  </td>
                                )}
                                {disbursalVisibleColumns.amount && (
                                  <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-600">
                                    {d.amount.toLocaleString()} EGP
                                  </td>
                                )}
                                {disbursalVisibleColumns.actions && (
                                  <td className="py-2.5 px-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setViewingDisbursal(d)}
                                        className="p-1 text-slate-450 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                        title={lang === 'ar' ? 'عرض الإذن' : 'View order'}
                                      >
                                        <Eye size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => startEditDisbursal(d)}
                                        className="p-1 text-slate-450 hover:text-[#0a1945] hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                        title={lang === 'ar' ? 'تعديل المعاملة' : 'Edit transaction'}
                                      >
                                        <Edit2 size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteDisbursal(d.id)}
                                        className="p-1 text-slate-450 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                        title={lang === 'ar' ? 'حذف المعاملة' : 'Delete transaction'}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                      {/* Mobile & Tablet Kanban Cards View - fallback below lg */}
                      <div className="block md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredDisbursals.length === 0 ? (
                      <div className="py-10 text-center text-slate-400 font-bold bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        {lang === 'ar' ? 'لا توجد أذونات صرف مسجلة حالياً' : 'No disbursals registered yet.'}
                      </div>
                    ) : (
                      paginatedDisbursals.map(d => {
                        const emp = staff.find(s => s.id === d.empId);
                        return (
                          <div key={d.id} className="bg-white border border-slate-200/95 rounded-3xl p-5 shadow-xs hover:border-emerald-300 transition flex flex-col gap-4 relative">
                            <div className="flex justify-between items-start">
                              <div className="text-left rtl:text-right">
                                <span className="text-[9px] font-mono bg-slate-100 text-slate-500 rounded-lg px-2 py-0.5 block w-max mb-1">{d.id}</span>
                                <p className="font-extrabold text-slate-800 text-xs">
                                  {emp ? (lang === 'ar' ? emp.nameAr : emp.name) : 'Unknown'}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono tracking-tight">{d.empId}</p>
                              </div>
                              <span className="text-xs font-mono font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                                {d.amount.toLocaleString()} EGP
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-705 bg-white/70 border border-slate-100 rounded-xl p-2.5 text-left rtl:text-right">
                              <div>
                                <span className="text-slate-400 text-[8px] font-extrabold uppercase tracking-widest block mb-0.5">
                                  {lang === 'ar' ? 'نوع الصرف' : 'Disbursal Type'}
                                </span>
                                <span className="font-bold">
                                  {d.type === 'advance' && (lang === 'ar' ? 'سلفة' : 'Advance')}
                                  {d.type === 'advance_carried' && (lang === 'ar' ? 'سلفة مرحلة' : 'Carried Advance')}
                                  {d.type === 'salary' && (lang === 'ar' ? 'راتب' : 'Salary')}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 text-[8px] font-extrabold uppercase tracking-widest block mb-0.5">
                                  {lang === 'ar' ? 'الخزنة' : 'Safe Name'}
                                </span>
                                <span className="font-bold">{d.safeName}</span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center pt-2.5 border-t border-slate-100">
                              <span className="text-slate-400 text-[10px] font-mono font-bold">{d.date}</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setViewingDisbursal(d)}
                                  className="p-1.5 text-slate-550 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                  title={lang === 'ar' ? 'عرض الإذن' : 'View order'}
                                >
                                  <Eye size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => startEditDisbursal(d)}
                                  className="p-1.5 text-slate-550 hover:text-[#0a1945] hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                  title={lang === 'ar' ? 'تعديل المعاملة' : 'Edit transaction'}
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDisbursal(d.id)}
                                  className="p-1.5 text-slate-550 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  title={lang === 'ar' ? 'حذف المعاملة' : 'Delete transaction'}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                /* Pure Cards View for all screen widths */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDisbursals.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 font-bold bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 col-span-full">
                      {lang === 'ar' ? 'لا توجد أذونات صرف مسجلة حالياً' : 'No disbursals registered yet.'}
                    </div>
                  ) : (
                    paginatedDisbursals.map(d => {
                      const emp = staff.find(s => s.id === d.empId);
                      return (
                        <div key={d.id} className="bg-white border border-slate-200/95 rounded-3xl p-5 shadow-xs hover:border-emerald-300 transition flex flex-col gap-4 relative">
                          <div className="flex justify-between items-start">
                            <div className="text-left rtl:text-right">
                              <span className="text-[9px] font-mono bg-slate-100 text-slate-500 rounded-lg px-2 py-0.5 block w-max mb-1">{d.id}</span>
                              <p className="font-extrabold text-slate-800 text-xs">
                                {emp ? (lang === 'ar' ? emp.nameAr : emp.name) : 'Unknown'}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono tracking-tight">{d.empId}</p>
                            </div>
                            <span className="text-xs font-mono font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                              {d.amount.toLocaleString()} EGP
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-705 bg-white/70 border border-slate-100 rounded-xl p-2.5 text-left rtl:text-right">
                            <div>
                              <span className="text-slate-400 text-[8px] font-extrabold uppercase tracking-widest block mb-0.5">
                                {lang === 'ar' ? 'نوع الصرف' : 'Disbursal Type'}
                              </span>
                              <span className="font-bold">
                                {d.type === 'advance' && (lang === 'ar' ? 'سلفة' : 'Advance')}
                                {d.type === 'advance_carried' && (lang === 'ar' ? 'سلفة مرحلة' : 'Carried Advance')}
                                {d.type === 'salary' && (lang === 'ar' ? 'راتب' : 'Salary')}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[8px] font-extrabold uppercase tracking-widest block mb-0.5">
                                {lang === 'ar' ? 'الخزنة' : 'Safe Name'}
                              </span>
                              <span className="font-bold">{d.safeName}</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-2.5 border-t border-slate-100">
                            <span className="text-slate-400 text-[10px] font-mono font-bold">{d.date}</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setViewingDisbursal(d)}
                                className="p-1.5 text-slate-550 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                title={lang === 'ar' ? 'عرض الإذن' : 'View order'}
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => startEditDisbursal(d)}
                                className="p-1.5 text-slate-550 hover:text-[#0a1945] hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                title={lang === 'ar' ? 'تعديل المعاملة' : 'Edit transaction'}
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDisbursal(d.id)}
                                className="p-1.5 text-slate-550 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title={lang === 'ar' ? 'حذف المعاملة' : 'Delete transaction'}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

                  {/* Dynamic Disbursal Pagination Controls with orange/navy theme details */}
                  <div className="p-4 border border-slate-150 rounded-2xl bg-[#fbfbfb] flex flex-col md:flex-row items-center justify-between gap-4 font-sans text-xs text-slate-650 mt-4">
                    {/* 1. Showing elements counter range */}
                    <div className="flex items-center gap-1.5 font-bold shrink-0 text-center flex-wrap justify-center">
                      <span>{lang === 'ar' ? 'عرض' : 'Showing'}</span>
                      {filteredDisbursals.length === 0 ? (
                        <span className="font-extrabold text-[#0a1945] font-mono bg-slate-100 px-2.5 py-0.5 rounded-lg text-[10.5px]">0</span>
                      ) : (
                        <>
                          <span className="font-extrabold text-[#0a1945] font-mono bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                            {disbursalStartIndex + 1}
                          </span>
                          <span>-</span>
                          <span className="font-extrabold text-[#0a1945] font-mono bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                            {Math.min(disbursalStartIndex + disbursalPageSize, filteredDisbursals.length)}
                          </span>
                          <span>{lang === 'ar' ? 'من أصل' : 'of'}</span>
                          <span className="font-extrabold text-orange-650 font-mono bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                            {filteredDisbursals.length}
                          </span>
                        </>
                      )}
                    </div>

                    {/* 2. Numerical Pagination Items */}
                    <div className="flex items-center justify-center gap-1 shrink-0 select-none flex-wrap">
                      {/* Previous Page arrow */}
                      <button
                        type="button"
                        disabled={activeDisbursalPage === 1}
                        onClick={() => setDisbursalCurrentPage(prev => Math.max(1, prev - 1))}
                        className="p-2 border border-slate-200 hover:border-orange-400 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-650 hover:text-orange-500 hover:bg-orange-50/20 transition cursor-pointer h-8 w-8 flex items-center justify-center shadow-xs shrink-0"
                        title={lang === 'ar' ? 'الصفحة السابقة' : 'Previous page'}
                      >
                        {lang === 'ar' ? <ChevronRight size={13} strokeWidth={2.5} /> : <ChevronLeft size={13} strokeWidth={2.5} />}
                      </button>

                      {/* Calculated dynamic pages range */}
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {Array.from({ length: totalDisbursalPages }, (_, i) => i + 1).map(page => {
                          const isActive = page === activeDisbursalPage;
                          return (
                            <button
                              type="button"
                              key={page}
                              onClick={() => setDisbursalCurrentPage(page)}
                              className={cn(
                                "w-8 h-8 rounded-lg font-extrabold transition cursor-pointer text-xs flex items-center justify-center border font-mono shadow-xs shrink-0",
                                isActive
                                  ? "bg-[#0a1945] text-white border-[#0a1945]"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-orange-400 hover:text-orange-500"
                              )}
                            >
                              {page}
                            </button>
                          );
                        })}
                      </div>

                      {/* Next Page arrow */}
                      <button
                        type="button"
                        disabled={activeDisbursalPage === totalDisbursalPages}
                        onClick={() => setDisbursalCurrentPage(prev => Math.min(totalDisbursalPages, prev + 1))}
                        className="p-2 border border-slate-200 hover:border-orange-400 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-650 hover:text-orange-500 hover:bg-orange-50/20 transition cursor-pointer h-8 w-8 flex items-center justify-center shadow-xs shrink-0"
                        title={lang === 'ar' ? 'الصفحة التالية' : 'Next page'}
                      >
                        {lang === 'ar' ? <ChevronLeft size={13} strokeWidth={2.5} /> : <ChevronRight size={13} strokeWidth={2.5} />}
                      </button>
                    </div>

                    {/* 3. Page Size Dropdown Select Menu */}
                    <div className="flex items-center gap-2 text-slate-500 font-bold shrink-0">
                      <span>{lang === 'ar' ? 'عرض' : 'Show'}</span>
                      <select
                        value={disbursalPageSize}
                        onChange={(e) => {
                          setDisbursalPageSize(Number(e.target.value));
                          setDisbursalCurrentPage(1);
                        }}
                        className="p-2 border border-slate-200 rounded-xl outline-none focus:border-orange-400 font-extrabold text-slate-700 transition bg-white cursor-pointer h-8 text-[11px] font-mono shadow-xs"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={20}>20</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: Staff Reports / معالج تقارير الموظفين */}
          {activeMenu === 'reports' && (
            <div className="space-y-6">
              
              {/* Main Content Pane representing selected report state */}
              {activeReport === null ? (
                <div className="space-y-4 max-w-4xl mx-auto my-4 text-left rtl:text-right">
                  {/* Compact Header */}
                  <div className="border-b border-slate-100 pb-2 flex flex-col items-start gap-1 text-left rtl:text-right">
                    <div className="flex items-center gap-2.5">
                      <FileBarChart2 className="text-orange-500 shrink-0" size={18} />
                      <h3 className="text-md font-bold text-[#0a1945] font-sans">
                        {lang === 'ar' ? 'تقارير الموظفين' : 'Staff Reports'}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 font-sans mt-1">
                      {lang === 'ar' ? 'اختر التقرير المراد عرضه عند الضغط على الكروت بها تفتح صفحات التقارير' : 'Select the report you want to view; clicking on the cards opens the report page.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Report 1: Staff Profiles */}
                    <button
                      onClick={() => setActiveReport('profile')}
                      className="bg-white border border-slate-200 hover:border-orange-300 rounded-lg p-5 text-left rtl:text-right flex items-start gap-4 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5"
                    >
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
                        <Users size={22} />
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <h4 className="text-sm font-black text-[#0a1945] font-sans truncate">
                          {lang === 'ar' ? 'تقرير بيانات ومظاهر طاقم العمل' : 'Staff Profiles Report'}
                        </h4>
                        <p className="text-xs text-slate-450 leading-relaxed font-sans">
                          {lang === 'ar' 
                            ? 'عرض شامل لبيانات الموظفين، تواريخ التعيين، الرواتب والبدلات الأساسية.' 
                            : 'Comprehensive registry displaying employee metadata, hire dates, salaries, and allowances.'}
                        </p>
                      </div>
                    </button>

                    {/* Report 2: Commissions */}
                    <button
                      onClick={() => setActiveReport('commission')}
                      className="bg-white border border-slate-200 hover:border-orange-300 rounded-lg p-5 text-left rtl:text-right flex items-start gap-4 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5"
                    >
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
                        <BadgePercent size={22} />
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <h4 className="text-sm font-black text-[#0a1945] font-sans truncate">
                          {lang === 'ar' ? 'تقرير عمولات ومبيعات الموظفين' : 'Employee Commissions Report'}
                        </h4>
                        <p className="text-xs text-slate-450 leading-relaxed font-sans">
                          {lang === 'ar' 
                            ? 'متابعة تفصيلية لنسب مبيعات البائعين وقيمة العمولات المستحقة لكل موظف.' 
                            : 'Track sales percentage ratios and calculated commissions dues for retail floor reps.'}
                        </p>
                      </div>
                    </button>

                    {/* Report 3: Attendance */}
                    <button
                      onClick={() => setActiveReport('attendance')}
                      className="bg-white border border-slate-200 hover:border-orange-300 rounded-lg p-5 text-left rtl:text-right flex items-start gap-4 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5"
                    >
                      <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl shrink-0">
                        <Clock size={22} />
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <h4 className="text-sm font-black text-[#0a1945] font-sans truncate">
                          {lang === 'ar' ? 'تقرير حضور وانصراف طاقم العمل' : 'Employee Attendance Report'}
                        </h4>
                        <p className="text-xs text-slate-450 leading-relaxed font-sans">
                          {lang === 'ar' 
                            ? 'مراجعة وتتبع سجلات تسجيل الدخول والإنصراف اليومي وساعات الحضور الإجمالية.' 
                            : 'Audit checklist tracking staff check-in/out, daily delays, and total productive hours.'}
                        </p>
                      </div>
                    </button>

                    {/* Report 4: Saving & Rewards */}
                    <button
                      onClick={() => setActiveReport('bonus_deduct')}
                      className="bg-white border border-slate-200 hover:border-orange-300 rounded-lg p-5 text-left rtl:text-right flex items-start gap-4 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5"
                    >
                      <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl shrink-0">
                        <DollarSign size={22} />
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <h4 className="text-sm font-black text-[#0a1945] font-sans truncate">
                          {lang === 'ar' ? 'تقرير مكافآت وخصومات الموظفين' : 'Rewards & Deductions Report'}
                        </h4>
                        <p className="text-xs text-slate-450 leading-relaxed font-sans">
                          {lang === 'ar' 
                            ? 'كشف تفصيلي بجميع الحوافز، المكافآت الاستثنائية والخصومات المطبقة.' 
                            : 'Audit history logging extra allowances, custom payroll penalties, and savings.'}
                        </p>
                      </div>
                    </button>

                    {/* Report 5: Salary Disbursals */}
                    <button
                      onClick={() => {
                        // Reset search/filters if needed
                        setDisbursalsSearchReport('');
                        setDisbursalsStartDateReport('');
                        setDisbursalsEndDateReport('');
                        setSelectedDisbursalsBranchesReport(['all']);
                        setReportMonthDisbursals('all');
                        setActiveReport('disbursals');
                      }}
                      className="bg-white border border-slate-200 hover:border-orange-300 rounded-lg p-5 text-left rtl:text-right flex items-start gap-4 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 md:col-span-2"
                    >
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
                        <Receipt size={22} />
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <h4 className="text-sm font-black text-[#0a1945] font-sans truncate">
                          {lang === 'ar' ? 'تقرير أذونات صرف رواتب وسلف الموظفين' : 'Employee Salary & Advances Disbursals Report'}
                        </h4>
                        <p className="text-xs text-slate-450 leading-relaxed font-sans">
                          {lang === 'ar' 
                            ? 'تقرير تفصيلي وشامل لأذونات صرف الرواتب والسلف العادية والمرحّلة مع تصفية بالشهر والتاريخ والفروع.' 
                            : 'Comprehensive report tracking salary, advance, and carried advance disbursement orders with robust filters.'}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              ) : activeReport === 'commission' ? (
                <div className="space-y-6 animate-fadeIn">
                  {/* Header Box */}
                  <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left rtl:text-right">
                    <div className="rtl:text-right text-left flex flex-col shrink-0">
                      <div className="flex items-center gap-2.5">
                        <BadgePercent className="text-orange-500 animate-pulse" size={18} />
                        <h3 className="text-md font-bold text-[#0a1945] flex items-center gap-1.5 font-sans">
                          <span>{lang === 'ar' ? 'تقرير عمولات ومبيعات طاقم العمل' : 'Employee Sales Commissions Ledger'}</span>
                        </h3>
                        <span className="text-[12px] leading-[16px] text-center bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full border border-slate-200 font-mono">
                          {lang === 'ar' ? `${staff.length} موظف` : `${staff.length} staff`}
                        </span>
                      </div>
                      
                      {/* Month filter select right below title */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2 w-full max-w-sm">
                        <span className="text-xs font-bold text-slate-500 shrink-0">{lang === 'ar' ? 'تصفية بالشهر:' : 'Filter by Month:'}</span>
                        <div className="relative w-full sm:w-44">
                          <select
                            value={reportMonthCommission}
                            onChange={(e) => setReportMonthCommission(e.target.value)}
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-400 font-bold text-[#0a1945] cursor-pointer appearance-none pr-8 pl-8 rtl:pr-8 rtl:pl-8"
                          >
                            <option value="all">{lang === 'ar' ? 'كل الأشهر' : 'All Months'}</option>
                            <option value="2026-05">{lang === 'ar' ? 'مايو - 2026' : 'May - 2026'}</option>
                            <option value="2026-06">{lang === 'ar' ? 'يونيو - 2026' : 'June - 2026'}</option>
                            <option value="2026-07">{lang === 'ar' ? 'يوليو - 2026' : 'July - 2026'}</option>
                            <option value="2026-08">{lang === 'ar' ? 'أغسطس - 2026' : 'August - 2026'}</option>
                          </select>
                          <div className="absolute top-1/2 right-3 rtl:left-3 rtl:right-auto -translate-y-1/2 pointer-events-none text-slate-500">
                            <ChevronDown size={12} />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setActiveReport(null)}
                      className="order-first md:order-last w-[35%] sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer shadow-xs active:scale-[0.98] self-start md:self-auto"
                    >
                      {lang === 'ar' ? <ArrowRight size={16} className="shrink-0" /> : <ArrowLeft size={16} className="shrink-0" />}
                      <span>{lang === 'ar' ? 'الرجوع' : 'Back'}</span>
                    </button>
                  </div>

                  {/* Advanced Controls Toolbar */}
                  <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-4 w-full bg-slate-50/50 p-4 border border-slate-150 rounded-2xl text-left rtl:text-right">
                    {/* Left Side: Search Box */}
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2 w-full md:max-w-2xl md:w-[480px] self-end">
                      {/* Date filter choosing */}
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 shadow-xs select-none h-[38px] w-full font-bold leading-6 text-base">
                        <Calendar size={13} className="text-orange-500 shrink-0" />
                        <div className="flex items-center gap-0.5 min-w-0 flex-1">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase shrink-0">{lang === 'ar' ? 'من' : 'From'}</span>
                          <input
                            type="date"
                            value={comStartDate}
                            onChange={e => setComStartDate(e.target.value)}
                            className="text-[10px] font-sans font-bold text-slate-700 bg-transparent outline-none border-none w-full cursor-pointer focus:text-orange-600 p-0"
                          />
                        </div>
                        <div className="w-[1px] h-3.5 bg-slate-200 shrink-0 mx-1" />
                        <div className="flex items-center gap-0.5 min-w-0 flex-1">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase shrink-0">{lang === 'ar' ? 'إلى' : 'To'}</span>
                          <input
                            type="date"
                            value={comEndDate}
                            onChange={e => setComEndDate(e.target.value)}
                            className="text-[10px] font-sans font-bold text-slate-700 bg-transparent outline-none border-none w-full cursor-pointer focus:text-orange-600 p-0"
                          />
                        </div>
                        {(comStartDate || comEndDate) && (
                          <button
                            onClick={() => { setComStartDate(''); setComEndDate(''); }}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition cursor-pointer shrink-0"
                            title={lang === 'ar' ? 'مسح التاريخ' : 'Clear dates'}
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>

                      <ExportDataButton
                        lang={lang}
                        onToast={triggerHrToast}
                        onCopy={() => triggerHrToast(lang === 'ar' ? 'تم نسخ بيانات العمولات إلى الحافظة' : 'Commissions report copied to clipboard!')}
                        onPrint={() => triggerHrToast(lang === 'ar' ? 'تم فتح خيارات الطباعة لجدول العمولات' : 'Print dialog opened for commissions!')}
                        className="w-full"
                      />

                      {/* Search input matched with the date range */}
                      <div className="relative flex items-center h-[38px] w-full">
                        <Search className="absolute left-3 rtl:right-3 text-slate-400 pointer-events-none" size={13} />
                        <input 
                          type="text"
                          value={commissionSearch}
                          onChange={e => setCommissionSearch(e.target.value)}
                          placeholder={lang === 'ar' ? 'البحث بالاسم أو كود الموظف...' : 'Search by name or code...'}
                          className="w-full text-xs p-2.5 pl-9 pr-3.5 rtl:pr-9 rtl:pl-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-400 transition h-[38px] font-sans"
                        />
                        {commissionSearch && (
                          <button
                            onClick={() => setCommissionSearch('')}
                            className="absolute right-3 rtl:left-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-orange-500 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => setIsComColumnFiltersOpen(!isComColumnFiltersOpen)}
                        className={cn(
                          "p-2 px-3 text-xs font-black rounded-lg border transition flex items-center justify-center gap-1.5 cursor-pointer select-none whitespace-nowrap h-[38px] min-h-[38px] w-full",
                          isComColumnFiltersOpen 
                            ? "bg-[#0a1945] text-white border-[#0a1945]" 
                            : "bg-white text-black border-slate-200 hover:border-orange-400 hover:text-orange-500"
                        )}
                        title={lang === 'ar' ? 'بحث متقدم' : 'Advanced Search'}
                      >
                        <Filter size={13} className="text-orange-500" />
                        <span>{lang === 'ar' ? 'بحث متقدم' : 'Advanced Search'}</span>
                      </button>
                    </div>

                    {/* Right Side: Stack of Dropdown + Two Buttons under it */}
                    <div className="flex flex-col gap-2 w-full md:w-[220px]">
                      {/* Top Row: Branch Dropdown - aligned properly and spans full width of the block */}
                      <div className="relative w-full">
                        <div className="relative w-full">
                          <button
                            onClick={() => setComBranchDropdownOpen(!comBranchDropdownOpen)}
                            className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-white border border-slate-200/90 hover:border-slate-300 text-slate-700 rounded-lg shadow-xs transition duration-150 cursor-pointer text-xs font-semibold select-none h-[38px]"
                          >
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-orange-500 hover:scale-110 transition" />
                              <span className={lang === 'ar' ? 'font-sans text-[12px]' : ''}>
                                {selectedComBranches.includes('all')
                                  ? (lang === 'ar' ? 'كل الفروع' : 'All Branches')
                                  : selectedComBranches.length === 1
                                  ? (lang === 'ar'
                                      ? comBranches.find(b => b.id === selectedComBranches[0])?.labelAr
                                      : comBranches.find(b => b.id === selectedComBranches[0])?.labelEn)
                                  : (lang === 'ar'
                                      ? `محدّد (${selectedComBranches.length}) فروع`
                                      : `Selected (${selectedComBranches.length}) branches`
                                    )
                                }
                              </span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${comBranchDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>

                          {comBranchDropdownOpen && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setComBranchDropdownOpen(false)} 
                              />
                              
                              <div className="absolute right-0 left-0 mt-2 w-full bg-white border border-slate-200/90 rounded-2xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100 p-1.5 animate-in fade-in slide-in-from-top-2 duration-150 text-xs text-left rtl:text-right">
                                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                  {lang === 'ar' ? 'تصفية حسب الفرع' : 'Filter by Branch'}
                                </div>
                                <div className="space-y-0.5 pt-1.5">
                                  {comBranches.map((branch) => {
                                    const isSelected = selectedComBranches.includes(branch.id);
                                    return (
                                      <button
                                        key={branch.id}
                                        onClick={() => handleComBranchToggle(branch.id)}
                                        className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors duration-150 cursor-pointer ${
                                          isSelected
                                            ? 'bg-slate-50 text-orange-600 font-bold'
                                            : 'text-slate-600 hover:bg-slate-50/60 hover:text-slate-900'
                                        } flex-row rtl:flex-row-reverse`}
                                      >
                                        <span className={lang === 'ar' ? 'font-sans' : ''}>
                                          {lang === 'ar' ? branch.labelAr : branch.labelEn}
                                        </span>
                                        {isSelected ? (
                                          <Check className="w-4 h-4 text-orange-500 shrink-0" />
                                        ) : (
                                          <div className="w-4 h-4 border border-slate-300 rounded-md shrink-0" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: Toggle View Button + Customize Columns Button (sitting side-by-side, perfectly aligned) */}
                      <div className="flex gap-2 w-full">
                        {/* Toggle View Mode Button with Tooltip (Table/Kanban) */}
                        <div className="relative group flex-1 md:flex-none md:w-[76px]">
                          <button
                            onClick={() => setComViewMode(comViewMode === 'table' ? 'kanban' : 'table')}
                            className="w-full flex items-center justify-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-orange-400 hover:text-orange-500 text-slate-655 transition cursor-pointer select-none h-[38px] active:scale-[0.98] shadow-xs"
                          >
                            {comViewMode === 'table' ? (
                              <>
                                <LayoutGrid size={14} className="text-[#0a1945]" />
                                <span className="text-[11px] font-bold font-sans">
                                  {lang === 'ar' ? 'بطاقات' : 'Cards'}
                                </span>
                              </>
                            ) : (
                              <>
                                <ClipboardList size={14} className="text-orange-500" />
                                <span className="text-[11px] font-bold font-sans">
                                  {lang === 'ar' ? 'جدول' : 'Table'}
                                </span>
                              </>
                            )}
                          </button>
                          
                          {/* Tooltip on Hover */}
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-50 font-bold font-sans">
                            {comViewMode === 'table' 
                              ? (lang === 'ar' ? 'تحويل لجدول بطاقات كانبان' : 'Switch to Kanban Card layout')
                              : (lang === 'ar' ? 'تحويل للجدول الكلاسيكي' : 'Switch to Classic Table view')
                            }
                          </div>
                        </div>

                        {/* Customize Columns Button */}
                        <div className="relative flex-1">
                          <button 
                            onClick={() => {
                              setTempComVisibleColumns({ ...comVisibleColumns });
                              setComColumnSettingsOpen(!comColumnSettingsOpen);
                            }}
                            className="w-full flex items-center justify-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-orange-400 hover:text-orange-500 text-slate-655 transition cursor-pointer select-none h-[38px] active:scale-[0.98] shadow-xs"
                          >
                            <Settings size={14} className="text-orange-500" />
                            <span className="text-[11px] font-bold font-sans">
                              {lang === 'ar' ? 'تخصيص الأعمدة' : 'Columns'}
                            </span>
                          </button>
                          
                          {/* Choose Columns Popover */}
                          <AnimatePresence>
                            {comColumnSettingsOpen && (
                              <div className="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-2xl p-3.5 text-xs z-50 animate-fadeIn text-left rtl:text-right">
                                {/* Title */}
                                <div className="pb-2 border-b border-slate-100 mb-2.5">
                                  <h5 className="font-extrabold text-slate-800 text-[12px] text-left rtl:text-right">{lang === 'ar' ? 'اختر الأعمدة' : 'Choose Columns'}</h5>
                                </div>
                                
                                {/* Columns List with Drag Indicators & Checkboxes */}
                                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                                  {Object.entries({
                                    empId: { en: 'Emp ID', ar: 'كود الموظف' },
                                    name: { en: 'Staff & Role', ar: 'اسم الموظف' },
                                    dept: { en: 'Department', ar: 'الإدارة' },
                                    section: { en: 'Section', ar: 'القسم' },
                                    branch: { en: 'Bank Branch', ar: 'الفرع البنكي' },
                                    consumerSales: { en: 'Sales (Consumer)', ar: 'مبيعات بسعر المستهلك' },
                                    purchaseSales: { en: 'Sales (Purchase)', ar: 'مبيعات بسعر الشراء' },
                                    rate: { en: 'Sales Rate', ar: 'نسبة المبيعات' },
                                    commission: { en: 'Net Commission', ar: 'صافي العمولة' }
                                  }).map(([key, label]) => (
                                    <div key={key} className="flex items-center gap-2 py-0.5 select-none text-left rtl:text-right">
                                      {/* Grip Drag indicator */}
                                      <GripVertical size={13} className="text-slate-400 shrink-0" />
                                      <label className="flex items-center gap-2 w-full cursor-pointer select-none font-bold text-slate-700">
                                        <input 
                                          type="checkbox" 
                                          checked={tempComVisibleColumns[key]} 
                                          onChange={(e) => setTempComVisibleColumns(prev => ({ ...prev, [key]: e.target.checked }))}
                                          className="w-4 h-4 rounded border border-slate-300 text-orange-500 focus:ring-orange-500 cursor-pointer transition shrink-0"
                                        />
                                        <span className="text-[11px] font-medium text-slate-700 truncate">{lang === 'ar' ? label.ar : label.en}</span>
                                      </label>
                                    </div>
                                  ))}
                                </div>
                                
                                {/* Actions */}
                                <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1">
                                  <button 
                                    onClick={() => setTempComVisibleColumns({
                                      empId: true,
                                      name: true,
                                      dept: true,
                                      section: true,
                                      branch: true,
                                      consumerSales: true,
                                      purchaseSales: true,
                                      rate: true,
                                      commission: true,
                                    })}
                                    className="px-1.5 py-1 border border-slate-200 text-slate-700 hover:text-[#0a1945] bg-white rounded-lg text-[9px] font-bold transition cursor-pointer uppercase tracking-tight"
                                  >
                                    {lang === 'ar' ? 'إعادة' : 'RESET'}
                                  </button>
                                  <div className="flex items-center gap-1">
                                    <button 
                                      onClick={() => setComColumnSettingsOpen(false)}
                                      className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[9px] font-bold transition cursor-pointer uppercase tracking-tight"
                                    >
                                      {lang === 'ar' ? 'إلغاء' : 'CANCEL'}
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setComVisibleColumns({ ...tempComVisibleColumns });
                                        setComColumnSettingsOpen(false);
                                        triggerHrToast(lang === 'ar' ? 'تم تطبيق تفضيلات أعمدة جدول العمولات' : 'Commissions layout filter applied!');
                                      }}
                                      className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[9px] font-bold hover:shadow-xs transition cursor-pointer uppercase tracking-tight"
                                    >
                                      {lang === 'ar' ? 'تطبيق' : 'APPLY'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* KPI Summaries and Data Table */}
                  {(() => {
                    const filteredEmps = staff.filter(emp => {
                      const query = commissionSearch.toLowerCase().trim();
                      let matchesQuery = true;
                      if (query) {
                        matchesQuery = emp.id.toLowerCase().includes(query) || 
                                       emp.name.toLowerCase().includes(query) || 
                                       (emp.nameAr && emp.nameAr.toLowerCase().includes(query));
                      }
                      if (!matchesQuery) return false;

                      if (comStartDate || comEndDate) {
                        const itemDateStr = emp.hireDate || '2025-01-01';
                        if (comStartDate && itemDateStr < comStartDate) return false;
                        if (comEndDate && itemDateStr > comEndDate) return false;
                      }
                      if (reportMonthCommission !== 'all') {
                        const itemDateStr = emp.hireDate || '2026-06-15';
                        if (!itemDateStr.startsWith(reportMonthCommission)) return false;
                      }
                      return true;
                    });

                    const computedDataAllMapped = filteredEmps.map(emp => {
                      const empNum = parseInt(emp.id.replace(/\D/g, '')) || 1;
                      
                      // Map employees to dashboard branches dynamically
                      let branchId = empNum % 3 === 0 ? 'mamar' : empNum % 3 === 1 ? 'theater' : 'zaghloul';
                      if (emp.bankBranchEn === 'Al-Mamar Branch') branchId = 'mamar';
                      else if (emp.bankBranchEn === 'Roman Theater Branch') branchId = 'theater';
                      else if (emp.bankBranchEn === 'Saad Zaghloul Branch') branchId = 'zaghloul';

                      const branchLabelEn = branchId === 'mamar' ? 'Al-Mamar Branch' : branchId === 'theater' ? 'Roman Theater Branch' : 'Saad Zaghloul Branch';
                      const branchLabelAr = branchId === 'mamar' ? 'فرع الممر' : branchId === 'theater' ? 'فرع المسرح الروماني' : 'فرع سعد زغلول';

                      // Deterministic sales calculation
                      const finalSales = emp.baseSalary * (emp.departmentId === 'D2' ? 15 : emp.departmentId === 'D1' ? 6 : 3) + (empNum * 4500) % 35000;
                      const purchaseSales = finalSales * 0.75;
                      const rate = emp.commRate || 0;
                      const commission = (finalSales * rate) / 100;
                      return { emp, finalSales, purchaseSales, rate, commission, branchId, branchLabelEn, branchLabelAr };
                    });

                    const computedData = computedDataAllMapped.filter(row => {
                      if (!selectedComBranches.includes('all') && !selectedComBranches.includes(row.branchId)) {
                        return false;
                      }

                      // Column filter - Employee ID
                      if (comColSearchEmpId) {
                        const val = row.emp.id.toLowerCase();
                        const q = comColSearchEmpId.toLowerCase().trim();
                        if (!val.includes(q)) return false;
                      }

                      // Column filter - Staff Name
                      if (comColSearchName) {
                        const q = comColSearchName.toLowerCase().trim();
                        const nameEn = row.emp.name.toLowerCase();
                        const nameAr = (row.emp.nameAr || '').toLowerCase();
                        const roleEn = (row.emp.role || '').toLowerCase();
                        const roleAr = (row.emp.roleAr || '').toLowerCase();
                        if (!nameEn.includes(q) && !nameAr.includes(q) && !roleEn.includes(q) && !roleAr.includes(q)) {
                          return false;
                        }
                      }

                      // Column filter - Department
                      if (comColSearchDept) {
                        const q = comColSearchDept.toLowerCase().trim();
                        const dept = departments.find(d => d.id === row.emp.departmentId);
                        const deptEn = dept ? dept.nameEn.toLowerCase() : '';
                        const deptAr = dept ? dept.nameAr.toLowerCase() : '';
                        if (!deptEn.includes(q) && !deptAr.includes(q)) {
                          return false;
                        }
                      }

                      // Column filter - Section
                      if (comColSearchSection) {
                        const q = comColSearchSection.toLowerCase().trim();
                        const sect = sections.find(s => s.id === row.emp.sectionId);
                        const sectEn = sect ? sect.nameEn.toLowerCase() : '';
                        const sectAr = sect ? sect.nameAr.toLowerCase() : '';
                        if (!sectEn.includes(q) && !sectAr.includes(q)) {
                          return false;
                        }
                      }

                      // Column filter - Branch
                      if (comColSearchBranch) {
                        const q = comColSearchBranch.toLowerCase().trim();
                        const bEn = row.branchLabelEn.toLowerCase();
                        const bAr = row.branchLabelAr.toLowerCase();
                        if (!bEn.includes(q) && !bAr.includes(q)) {
                          return false;
                        }
                      }

                      // Column filter - Consumer Sales
                      if (comColSearchConsumerSales) {
                        const q = comColSearchConsumerSales.toLowerCase().trim();
                        const salesStr = row.finalSales.toString().toLowerCase();
                        const formattedSalesStr = row.finalSales.toLocaleString(undefined, { minimumFractionDigits: 1 }).toLowerCase();
                        if (!salesStr.includes(q) && !formattedSalesStr.includes(q)) return false;
                      }

                      // Column filter - Purchase Sales
                      if (comColSearchPurchaseSales) {
                        const q = comColSearchPurchaseSales.toLowerCase().trim();
                        const purchaseStr = row.purchaseSales.toString().toLowerCase();
                        const formattedPurchaseStr = row.purchaseSales.toLocaleString(undefined, { minimumFractionDigits: 1 }).toLowerCase();
                        if (!purchaseStr.includes(q) && !formattedPurchaseStr.includes(q)) return false;
                      }

                      // Column filter - Sales Rate
                      if (comColSearchRate) {
                        const q = comColSearchRate.toLowerCase().trim();
                        const rateStr = row.rate.toString().toLowerCase();
                        if (!rateStr.includes(q)) return false;
                      }

                      // Column filter - Net Commission
                      if (comColSearchCommission) {
                        const q = comColSearchCommission.toLowerCase().trim();
                        const commStr = row.commission.toString().toLowerCase();
                        const formattedCommStr = row.commission.toLocaleString(undefined, { minimumFractionDigits: 1 }).toLowerCase();
                        if (!commStr.includes(q) && !formattedCommStr.includes(q)) return false;
                      }

                      return true;
                    });

                    const totalSales = computedData.reduce((acc, d) => acc + d.finalSales, 0);
                    const totalPurchaseSales = computedData.reduce((acc, d) => acc + d.purchaseSales, 0);
                    const totalCommission = computedData.reduce((acc, d) => acc + d.commission, 0);

                    const totalComPages = Math.ceil(computedData.length / comPageSize);
                    const comStartIndex = (comCurrentPage - 1) * comPageSize;
                    const paginatedComData = computedData.slice(comStartIndex, comStartIndex + comPageSize);

                    return (
                      <>
                        {/* Bento Grid Analytics Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {/* Card 1: Net Sales (Consumer) */}
                          <div className="p-4 bg-[#0a1945] rounded-2xl text-white shadow-sm border border-[#0a1945]/60 flex items-center justify-between min-h-[96px] text-right">
                            <div>
                              <span className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider block mb-1">
                                {lang === 'ar' ? 'صافي المبيعات بسعر المستهلك' : 'Net Sales at Consumer Price'}
                              </span>
                              <span className="text-lg font-black font-mono tracking-tight text-white font-sans">
                                {totalSales.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP
                              </span>
                            </div>
                            <div className="h-9 w-9 bg-white/10 rounded-xl flex items-center justify-center text-orange-400">
                              <DollarSign size={18} />
                            </div>
                          </div>

                          {/* Card 2: Net Sales (Purchase) */}
                          <div className="p-4 bg-orange-500 rounded-2xl text-white shadow-sm border border-orange-400 flex items-center justify-between min-h-[96px] text-right">
                            <div>
                              <span className="text-[10px] text-orange-100 font-extrabold uppercase tracking-wider block mb-1">
                                {lang === 'ar' ? 'صافي المبيعات بسعر الشراء الحالي' : 'Net Sales at Current Purchase Price'}
                              </span>
                              <span className="text-lg font-black font-mono tracking-tight text-white">
                                 {totalPurchaseSales.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP
                              </span>
                            </div>
                            <div className="h-9 w-9 bg-white/15 rounded-xl flex items-center justify-center text-white">
                              <ArrowUpRight size={18} />
                            </div>
                          </div>

                          {/* Card 3: Total Commission Payable */}
                          <div className="p-4 bg-emerald-600 rounded-2xl text-white shadow-sm border border-emerald-500 flex items-center justify-between min-h-[96px] text-right">
                            <div>
                              <span className="text-[10px] text-emerald-100 font-extrabold uppercase tracking-wider block mb-1">
                                {lang === 'ar' ? 'إجمالي صافي العمولات المستحقة' : 'Total Payable Commissions'}
                              </span>
                              <span className="text-lg font-black font-mono tracking-tight text-white">
                                 {totalCommission.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP
                              </span>
                            </div>
                            <div className="h-9 w-9 bg-white/15 rounded-xl flex items-center justify-center text-emerald-100">
                              <DollarSign size={18} />
                            </div>
                          </div>
                        </div>

                        {comViewMode === 'table' ? (
                          <>
                            {/* Report Table - Web View */}
                            <div className="relative hidden sm:block border border-slate-150 rounded-2xl bg-white shadow-sm overflow-visible">
                              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                                <table className="w-full text-left rtl:text-right text-xs table-auto">
                                  <thead className="bg-[#f97316] text-white sticky top-0 z-10 font-bold select-none border-b border-orange-600">
                                  <tr>
                                    {comVisibleColumns.empId && <th className="py-3 px-4 text-center w-20 text-white">{lang === 'ar' ? 'كود الموظف' : 'Emp ID'}</th>}
                                    {comVisibleColumns.name && <th className="py-3 px-4 text-white">{lang === 'ar' ? 'اسم الموظف' : 'Staff Member'}</th>}
                                    {comVisibleColumns.dept && <th className="py-3 px-4 text-white">{lang === 'ar' ? 'الإدارة' : 'Department'}</th>}
                                    {comVisibleColumns.section && <th className="py-3 px-4 text-white">{lang === 'ar' ? 'القسم' : 'Section'}</th>}
                                    {comVisibleColumns.branch && <th className="py-3 px-4 text-white">{lang === 'ar' ? 'الفرع البنكي' : 'Registered Branch'}</th>}
                                    {comVisibleColumns.consumerSales && <th className="py-3 px-4 text-right font-mono text-white">{lang === 'ar' ? 'صافي المبيعات (سعر المستهلك)' : 'Net Sales (Consumer)'}</th>}
                                    {comVisibleColumns.purchaseSales && <th className="py-3 px-4 text-right font-mono text-white">{lang === 'ar' ? 'صافي المبيعات (سعر الشراء)' : 'Net Sales (Purchase)'}</th>}
                                    {comVisibleColumns.rate && <th className="py-3 px-4 text-center text-white">{lang === 'ar' ? 'نسبة المبيعات' : 'Sales Rate'}</th>}
                                    {comVisibleColumns.commission && <th className="py-3 px-4 text-right font-mono text-white bg-[#ea580c]">{lang === 'ar' ? 'صافي العمولة' : 'Net Commission'}</th>}
                                  </tr>
                                  {isComColumnFiltersOpen && (
                                    <tr className="bg-slate-100 border-b border-slate-200">
                                      {comVisibleColumns.empId && (
                                        <td className="py-1.5 px-2">
                                          <div className="relative">
                                            <input
                                              type="text"
                                              value={comColSearchEmpId}
                                              onChange={(e) => setComColSearchEmpId(e.target.value)}
                                              placeholder={lang === 'ar' ? 'تصفية...' : 'Filter...'}
                                              className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans text-slate-850"
                                            />
                                            {comColSearchEmpId && (
                                              <button onClick={() => setComColSearchEmpId('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                                <X size={10} />
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      )}
                                      {comVisibleColumns.name && (
                                        <td className="py-1.5 px-2">
                                          <div className="relative">
                                            <input
                                              type="text"
                                              value={comColSearchName}
                                              onChange={(e) => setComColSearchName(e.target.value)}
                                              placeholder={lang === 'ar' ? 'تصفية...' : 'Filter...'}
                                              className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans text-slate-850"
                                            />
                                            {comColSearchName && (
                                              <button onClick={() => setComColSearchName('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                                <X size={10} />
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      )}
                                      {comVisibleColumns.dept && (
                                        <td className="py-1.5 px-2">
                                          <div className="relative">
                                            <input
                                              type="text"
                                              value={comColSearchDept}
                                              onChange={(e) => setComColSearchDept(e.target.value)}
                                              placeholder={lang === 'ar' ? 'تصفية...' : 'Filter...'}
                                              className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans text-slate-850"
                                            />
                                            {comColSearchDept && (
                                              <button onClick={() => setComColSearchDept('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                                <X size={10} />
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      )}
                                      {comVisibleColumns.section && (
                                        <td className="py-1.5 px-2">
                                          <div className="relative">
                                            <input
                                              type="text"
                                              value={comColSearchSection}
                                              onChange={(e) => setComColSearchSection(e.target.value)}
                                              placeholder={lang === 'ar' ? 'تصفية...' : 'Filter...'}
                                              className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans text-slate-850"
                                            />
                                            {comColSearchSection && (
                                              <button onClick={() => setComColSearchSection('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                                <X size={10} />
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      )}
                                      {comVisibleColumns.branch && (
                                        <td className="py-1.5 px-2">
                                          <div className="relative">
                                            <input
                                              type="text"
                                              value={comColSearchBranch}
                                              onChange={(e) => setComColSearchBranch(e.target.value)}
                                              placeholder={lang === 'ar' ? 'تصفية...' : 'Filter...'}
                                              className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans text-slate-850"
                                            />
                                            {comColSearchBranch && (
                                              <button onClick={() => setComColSearchBranch('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                                <X size={10} />
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      )}
                                      {comVisibleColumns.consumerSales && (
                                        <td className="py-1.5 px-2">
                                          <div className="relative">
                                            <input
                                              type="text"
                                              value={comColSearchConsumerSales}
                                              onChange={(e) => setComColSearchConsumerSales(e.target.value)}
                                              placeholder={lang === 'ar' ? 'تصفية...' : 'Filter...'}
                                              className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans text-slate-850 text-right font-mono"
                                            />
                                            {comColSearchConsumerSales && (
                                              <button onClick={() => setComColSearchConsumerSales('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                                <X size={10} />
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      )}
                                      {comVisibleColumns.purchaseSales && (
                                        <td className="py-1.5 px-2">
                                          <div className="relative">
                                            <input
                                              type="text"
                                              value={comColSearchPurchaseSales}
                                              onChange={(e) => setComColSearchPurchaseSales(e.target.value)}
                                              placeholder={lang === 'ar' ? 'تصفية...' : 'Filter...'}
                                              className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans text-slate-850 text-right font-mono"
                                            />
                                            {comColSearchPurchaseSales && (
                                              <button onClick={() => setComColSearchPurchaseSales('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                                <X size={10} />
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      )}
                                      {comVisibleColumns.rate && (
                                        <td className="py-1.5 px-2">
                                          <div className="relative">
                                            <input
                                              type="text"
                                              value={comColSearchRate}
                                              onChange={(e) => setComColSearchRate(e.target.value)}
                                              placeholder={lang === 'ar' ? 'تصفية...' : 'Filter...'}
                                              className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans text-slate-850 text-center font-mono"
                                            />
                                            {comColSearchRate && (
                                              <button onClick={() => setComColSearchRate('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                                <X size={10} />
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      )}
                                      {comVisibleColumns.commission && (
                                        <td className="py-1.5 px-2">
                                          <div className="relative">
                                            <input
                                              type="text"
                                              value={comColSearchCommission}
                                              onChange={(e) => setComColSearchCommission(e.target.value)}
                                              placeholder={lang === 'ar' ? 'تصفية...' : 'Filter...'}
                                              className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans text-slate-850 text-right font-mono bg-orange-50/50"
                                            />
                                            {comColSearchCommission && (
                                              <button onClick={() => setComColSearchCommission('')} className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                                <X size={10} />
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      )}
                                    </tr>
                                  )}
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {paginatedComData.length === 0 ? (
                                      <tr>
                                        <td colSpan={9} className="py-12 text-center text-slate-400 font-bold italic bg-slate-50/50">
                                          {lang === 'ar' ? 'لا توجد نتائج مطابقة لبحثك' : 'No staff profiles match this filter.'}
                                        </td>
                                      </tr>
                                    ) : (
                                      paginatedComData.map(row => {
                                        const dept = departments.find(d => d.id === row.emp.departmentId);
                                        const sect = sections.find(s => s.id === row.emp.sectionId);
                                        return (
                                          <tr key={row.emp.id} className="hover:bg-slate-50/60 transition-colors">
                                            {comVisibleColumns.empId && <td className="py-3 px-4 text-center font-mono font-bold text-slate-500 bg-slate-50/40">{row.emp.id}</td>}
                                            {comVisibleColumns.name && (
                                              <td className="py-3 px-4">
                                                <div className="text-left rtl:text-right">
                                                  <p className="font-extrabold text-slate-800">{lang === 'ar' ? row.emp.nameAr : row.emp.name}</p>
                                                  <p className="text-[10px] text-white/80 font-bold mt-0.5">{lang === 'ar' ? row.emp.roleAr : row.emp.role}</p>
                                                </div>
                                              </td>
                                            )}
                                            {comVisibleColumns.dept && (
                                              <td className="py-3 px-4 font-bold text-slate-600">
                                                {dept ? (lang === 'ar' ? dept.nameAr : dept.nameEn) : '--'}
                                              </td>
                                            )}
                                            {comVisibleColumns.section && (
                                              <td className="py-3 px-4 font-semibold text-slate-500">
                                                {sect ? (lang === 'ar' ? sect.nameAr : sect.nameEn) : '--'}
                                              </td>
                                            )}
                                            {comVisibleColumns.branch && (
                                              <td className="py-3 px-4 font-semibold text-slate-600">
                                                {lang === 'ar' ? (row.emp.bankBranchAr || 'الفرع الرئيسي') : (row.emp.bankBranchEn || 'HQ Main Branch')}
                                              </td>
                                            )}
                                            {comVisibleColumns.consumerSales && (
                                              <td className="py-3 px-4 text-right font-mono font-bold text-[#0a1945]">
                                                {row.finalSales.toLocaleString(undefined, { minimumFractionDigits: 1 })} EGP
                                              </td>
                                            )}
                                            {comVisibleColumns.purchaseSales && (
                                              <td className="py-3 px-4 text-right font-mono font-bold text-orange-600">
                                                {row.purchaseSales.toLocaleString(undefined, { minimumFractionDigits: 1 })} EGP
                                              </td>
                                            )}
                                            {comVisibleColumns.rate && (
                                              <td className="py-3 px-4 text-center">
                                                <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-650 font-black font-mono text-[10.5px] px-2.5 py-1 rounded-lg border border-orange-100">
                                                  {row.rate}%
                                                </span>
                                              </td>
                                            )}
                                            {comVisibleColumns.commission && (
                                              <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-700 bg-emerald-50/20">
                                                {row.commission.toLocaleString(undefined, { minimumFractionDigits: 1 })} EGP
                                              </td>
                                            )}
                                          </tr>
                                        );
                                      })
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Mobile View Cards - Auto Card Fallback for Phone Screens */}
                            <div className="block sm:hidden space-y-4">
                              {paginatedComData.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 font-bold italic bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                  {lang === 'ar' ? 'لا توجد نتائج مطابقة لبحثك' : 'No staff profiles match this filter.'}
                                </div>
                              ) : (
                                paginatedComData.map(row => {
                                  const dept = departments.find(d => d.id === row.emp.departmentId);
                                  const sect = sections.find(s => s.id === row.emp.sectionId);
                                  return (
                                    <div key={row.emp.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 text-right rtl:text-right">
                                      <div className="flex justify-between items-center border-b border-slate-100 pb-2 flex-row rtl:flex-row-reverse">
                                        <div className="text-left rtl:text-right">
                                          <h4 className="font-extrabold text-[#0a1945] text-sm">{lang === 'ar' ? row.emp.nameAr : row.emp.name}</h4>
                                          <p className="text-[10px] text-slate-400 font-semibold">{lang === 'ar' ? row.emp.roleAr : row.emp.role}</p>
                                        </div>
                                        <div>
                                          <span className="text-xs font-black text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-md">{row.emp.id}</span>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-xs text-right rtl:text-right">
                                        <div>
                                          <span className="text-slate-400 block text-[9px]">{lang === 'ar' ? 'الإدارة' : 'Department'}</span>
                                          <span className="font-bold text-slate-700">{dept ? (lang === 'ar' ? dept.nameAr : dept.nameEn) : '--'}</span>
                                        </div>
                                        <div>
                                          <span className="text-slate-400 block text-[9px]">{lang === 'ar' ? 'الفرع البنكي' : 'Branch'}</span>
                                          <span className="font-bold text-slate-700">{lang === 'ar' ? (row.emp.bankBranchAr || 'الفرع الرئيسي') : (row.emp.bankBranchEn || 'HQ')}</span>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-right rtl:text-right">
                                        <div>
                                          <span className="text-slate-500 block text-[9px]">{lang === 'ar' ? 'صافي المبيعات' : 'Net Sales'}</span>
                                          <span className="font-bold text-[#0a1945] font-mono">{row.finalSales.toLocaleString()} EGP</span>
                                        </div>
                                        <div>
                                          <span className="text-slate-500 block text-[9px]">{lang === 'ar' ? 'نسبة المبيعات' : 'Rate'}</span>
                                          <span className="font-bold text-slate-700 font-mono">{row.rate}%</span>
                                        </div>
                                      </div>
                                      <div className="flex justify-between items-center pt-2 border-t border-slate-100 flex-row rtl:flex-row-reverse">
                                        <span className="text-xs font-bold text-slate-500">{lang === 'ar' ? 'صافي العمولة:' : 'Net Commission:'}</span>
                                        <span className="text-sm font-black text-emerald-600 font-mono">{row.commission.toLocaleString()} EGP</span>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </>
                        ) : (
                          /* Mobile Kanban View Mode or Grouped card listing */
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start text-right rtl:text-right">
                            {comBranches.filter(b => b.id !== 'all').map(branch => {
                              const branchRows = computedData.filter(row => row.branchId === branch.id);
                              const isFilteredOut = !selectedComBranches.includes('all') && !selectedComBranches.includes(branch.id);
                              
                              if (isFilteredOut) return null;

                              const branchSales = branchRows.reduce((acc, d) => acc + d.finalSales, 0);
                              const branchCom = branchRows.reduce((acc, d) => acc + d.commission, 0);

                              return (
                                <div key={branch.id} className="bg-slate-50 border border-slate-200/85 rounded-2xl p-4 flex flex-col gap-4 shadow-xs transition-all duration-200">
                                  {/* Branch Header block with status stats */}
                                  <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-xs">
                                    <div className="text-left rtl:text-right">
                                      <h4 className="font-black text-[#0a1945] text-xs flex items-center gap-1.5 leading-tight font-sans">
                                        <Building2 className="w-4 h-4 text-orange-500 shrink-0" />
                                        <span>{lang === 'ar' ? branch.labelAr : branch.labelEn}</span>
                                      </h4>
                                      <span className="text-[10px] text-slate-400 font-bold block mt-1 font-sans">
                                        {branchRows.length} {lang === 'ar' ? 'موظفين' : 'employees'}
                                      </span>
                                    </div>
                                    <div className="text-right rtl:text-left">
                                      <span className="text-[11px] text-emerald-650 font-black block leading-none font-mono">
                                        +{branchCom.toLocaleString(undefined, { maximumFractionDigits: 1 })} EGP
                                      </span>
                                      <span className="text-[9px] text-slate-400 font-extrabold block mt-1 uppercase tracking-wider font-sans">
                                        {lang === 'ar' ? 'عمولات' : 'COMMS'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Cards List with scrolling */}
                                  <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1 text-right">
                                    {branchRows.length === 0 ? (
                                      <div className="py-12 text-center text-slate-400 font-bold bg-white/40 border border-dashed border-slate-200 rounded-2xl text-xs font-sans">
                                        {lang === 'ar' ? 'لا يوجد موظفون في هذا الفرع' : 'No employees in this branch'}
                                      </div>
                                    ) : (
                                      branchRows.map(row => {
                                        const dept = departments.find(d => d.id === row.emp.departmentId);
                                        const sect = sections.find(s => s.id === row.emp.sectionId);
                                        const initials = row.emp.name.split(' ').slice(0, 2).map(n => n[0]).join('');

                                        return (
                                          <motion.div
                                            key={row.emp.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="bg-white border border-slate-200/95 hover:border-orange-300 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col gap-3.5 group relative text-right"
                                          >
                                            {/* Avatar, Name & Code ID */}
                                            <div className="flex items-center gap-3 rtl:flex-row-reverse text-left rtl:text-right border-b border-dashed border-slate-100 pb-3">
                                              <div className="w-9 h-9 rounded-xl bg-[#0a1945] text-white font-mono font-bold flex items-center justify-center text-xs shrink-0 select-none border-2 border-orange-100">
                                                {initials}
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                <h4 className="font-extrabold text-[#0a1945] text-[12px] leading-tight group-hover:text-orange-500 transition truncate font-sans">
                                                  {lang === 'ar' ? row.emp.nameAr : row.emp.name}
                                                </h4>
                                                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5 font-sans">
                                                  {lang === 'ar' ? row.emp.roleAr : row.emp.role} • <span className="font-mono text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{row.emp.id}</span>
                                                </p>
                                              </div>
                                            </div>

                                            {/* Org unit badges */}
                                            <div className="flex flex-wrap gap-1 justify-end">
                                              {dept && (
                                                <span className="text-[10px] font-bold text-slate-600 bg-slate-100/70 border border-slate-200/20 px-2 py-0.5 rounded-lg font-sans">
                                                  {lang === 'ar' ? dept.nameAr : dept.nameEn}
                                                </span>
                                              )}
                                              {sect && (
                                                <span className="text-[9.5px] font-semibold text-slate-500 bg-slate-50 border border-slate-200/10 px-2 py-0.5 rounded-lg font-sans">
                                                  {lang === 'ar' ? sect.nameAr : sect.nameEn}
                                                </span>
                                              )}
                                            </div>

                                            {/* Sales details (Consumer vs Purchase) */}
                                            <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-2.5 rounded-xl text-[10.5px] border border-slate-100">
                                              <div className="text-left rtl:text-right">
                                                <span className="text-slate-400 font-bold block mb-0.5 font-sans">{lang === 'ar' ? 'سعر المستهلك' : 'Consumer Price'}</span>
                                                <span className="font-black font-sans text-slate-800 text-[11px] font-mono">{row.finalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })} EGP</span>
                                              </div>
                                              <div className="text-right rtl:text-left border-l rtl:border-l-0 rtl:border-r border-slate-150 pl-2 rtl:pl-0 rtl:pr-2">
                                                <span className="text-slate-400 font-bold block mb-0.5 font-sans">{lang === 'ar' ? 'سعر الشراء' : 'Purchase Price'}</span>
                                                <span className="font-bold text-orange-500 font-sans text-[11px] font-mono">{row.purchaseSales.toLocaleString(undefined, { maximumFractionDigits: 0 })} EGP</span>
                                              </div>
                                            </div>

                                            {/* Bottom section: Rate Badge and calculated commission */}
                                            <div className="flex justify-between items-center bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 px-3 py-2.5 rounded-xl transition-colors text-[11px] font-bold">
                                              <div className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                                                <span className="text-emerald-800 text-[11px] font-sans">{lang === 'ar' ? 'العمولة المستحقة' : 'Net Commission'}</span>
                                              </div>
                                              <div className="text-right flex items-center gap-1 flex-row rtl:flex-row-reverse">
                                                <span className="text-[9.5px] font-extrabold text-slate-440 font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded-md">
                                                  {row.rate}%
                                                </span>
                                                <span className="font-black text-emerald-600 font-mono text-[12.5px]">
                                                  {row.commission.toLocaleString(undefined, { maximumFractionDigits: 1 })} EGP
                                                </span>
                                              </div>
                                            </div>
                                          </motion.div>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Dynamic Pagination Controls with orange/navy theme details */}
                        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 font-sans text-xs text-slate-655">
                          {/* 1. Showing elements counter range */}
                          <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                            {lang === 'ar' ? (
                              <>
                                <span>عرض</span>
                                <span className="font-extrabold text-[#0a1945] font-mono bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                                  {paginatedComData.length}
                                </span>
                                <span>من أصل</span>
                                <span className="font-extrabold text-orange-650 font-mono bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                                  {computedData.length}
                                </span>
                              </>
                            ) : (
                              <>
                                <span>Show</span>
                                <span className="font-extrabold text-[#0a1945] font-mono bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                                  {paginatedComData.length}
                                </span>
                                <span>of</span>
                                <span className="font-extrabold text-orange-655 font-mono bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                                  {computedData.length}
                                </span>
                              </>
                            )}
                          </div>

                          {/* 2. Numerical Pagination Items */}
                          <div className="flex items-center gap-1 shrink-0 select-none">
                            {/* Previous Page arrow */}
                            <button
                              type="button"
                              disabled={comCurrentPage === 1}
                              onClick={() => setComCurrentPage(prev => Math.max(1, prev - 1))}
                              className="p-2 border border-slate-200 hover:border-orange-400 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-655 hover:text-orange-500 hover:bg-orange-50/20 transition cursor-pointer h-8 w-8 flex items-center justify-center shadow-xs"
                              title={lang === 'ar' ? 'الصفحة السابقة' : 'Previous page'}
                            >
                              {lang === 'ar' ? <ChevronRight size={13} strokeWidth={2.5} /> : <ChevronLeft size={13} strokeWidth={2.5} />}
                            </button>

                            {/* Pages links */}
                            <div className="flex items-center gap-1">
                              {Array.from({ length: Math.min(totalComPages, 3) }, (_, i) => i + 1).map(page => {
                                const isActive = page === comCurrentPage;
                                return (
                                  <button
                                    key={page}
                                    type="button"
                                    onClick={() => setComCurrentPage(page)}
                                    className={cn(
                                      "w-8 h-8 rounded-lg font-extrabold transition cursor-pointer text-xs flex items-center justify-center border font-mono shadow-xs",
                                      isActive
                                        ? "bg-[#0a1945] text-white border-[#0a1945]"
                                        : "bg-white text-slate-700 border-slate-200 hover:border-orange-400 hover:text-orange-500"
                                    )}
                                  >
                                    {page}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Next Page arrow */}
                            <button
                              type="button"
                              disabled={comCurrentPage === totalComPages}
                              onClick={() => setComCurrentPage(prev => Math.min(totalComPages, prev + 1))}
                              className="p-2 border border-slate-200 hover:border-orange-400 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-655 hover:text-orange-500 hover:bg-orange-50/20 transition cursor-pointer h-8 w-8 flex items-center justify-center shadow-xs"
                              title={lang === 'ar' ? 'الصفحة التالية' : 'Next page'}
                            >
                              {lang === 'ar' ? <ChevronLeft size={13} strokeWidth={2.5} /> : <ChevronRight size={13} strokeWidth={2.5} />}
                            </button>
                          </div>

                          {/* 3. Page Size Dropdown */}
                          <div className="flex items-center gap-2 text-slate-500 font-bold shrink-0">
                            <span>{lang === 'ar' ? 'عرض' : 'Show'}</span>
                            <select
                              value={comPageSize}
                              onChange={(e) => {
                                setComPageSize(Number(e.target.value));
                                setComCurrentPage(1);
                              }}
                              className="bg-white border border-slate-200 text-[#0a1945] rounded-xl px-2 py-1.5 text-xs font-black shadow-xs outline-none focus:border-orange-400 cursor-pointer w-16 text-center"
                            >
                              {[5, 10, 20, 50, 100].map(sz => (
                                <option key={sz} value={sz} className="font-bold">
                                  {sz}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : activeReport === 'profile' ? (
                <div className="space-y-6 animate-fadeIn text-left rtl:text-right">
                  {/* Header Box */}
                  <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left rtl:text-right">
                    <div className="rtl:text-right text-left flex items-center gap-2.5 shrink-0">
                      <h3 className="text-md font-bold text-[#0a1945] flex items-center gap-1.5 font-sans">
                        <Users className="text-orange-500" size={18} />
                        <span>{lang === 'ar' ? 'تقرير بيانات ومظاهر طاقم العمل' : 'Employee Profiles & Demographics Registry'}</span>
                      </h3>
                      <span className="text-[12px] leading-[16px] text-center bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full border border-slate-200 font-mono">
                        {lang === 'ar' ? `${staff.length} موظف` : `${staff.length} staff`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveReport(null)}
                      className="order-first md:order-last w-[35%] sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer shadow-xs active:scale-[0.98] self-start md:self-auto"
                    >
                      {lang === 'ar' ? <ArrowRight size={16} className="shrink-0" /> : <ArrowLeft size={16} className="shrink-0" />}
                      <span>{lang === 'ar' ? 'الرجوع' : 'Back'}</span>
                    </button>
                  </div>

                  {/* Advanced Controls Toolbar */}
                  <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-4 w-full bg-slate-50/50 p-4 border border-slate-150 rounded-2xl text-left rtl:text-right">
                    {/* Left Side: Search Box */}
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2 w-full md:max-w-2xl md:w-[480px] self-end">
                      {/* Date Range filter */}
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 shadow-xs select-none h-[38px] w-full font-bold leading-6 text-base">
                        <Calendar size={13} className="text-orange-500 shrink-0" />
                        <div className="flex items-center gap-0.5 min-w-0 flex-1">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase shrink-0">{lang === 'ar' ? 'من' : 'From'}</span>
                          <input
                            type="date"
                            value={profileStartDate}
                            onChange={e => setProfileStartDate(e.target.value)}
                            className="text-[10px] font-sans font-bold text-slate-700 bg-transparent outline-none border-none w-full cursor-pointer focus:text-orange-600 p-0"
                          />
                        </div>
                        <div className="w-[1px] h-3.5 bg-slate-200 shrink-0 mx-1" />
                        <div className="flex items-center gap-0.5 min-w-0 flex-1">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase shrink-0">{lang === 'ar' ? 'إلى' : 'To'}</span>
                          <input
                            type="date"
                            value={profileEndDate}
                            onChange={e => setProfileEndDate(e.target.value)}
                            className="text-[10px] font-sans font-bold text-slate-700 bg-transparent outline-none border-none w-full cursor-pointer focus:text-orange-600 p-0"
                          />
                        </div>
                        {(profileStartDate || profileEndDate) && (
                          <button
                            onClick={() => { setProfileStartDate(''); setProfileEndDate(''); }}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition cursor-pointer shrink-0"
                            title={lang === 'ar' ? 'مسح التاريخ' : 'Clear dates'}
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>

                      <ExportDataButton
                        lang={lang}
                        onToast={triggerHrToast}
                        onCopy={() => triggerHrToast(lang === 'ar' ? 'تم نسخ التقرير لحافظتك' : 'Report copied to clipboard!')}
                        onPrint={() => triggerHrToast(lang === 'ar' ? 'فتح شاشة الطباعة لتقرير الموظفين' : 'Opening profiles print setup!')}
                        className="w-full"
                      />

                      {/* Main Search input */}
                      <div className="relative flex items-center h-[38px] w-full">
                        <Search className="absolute left-3 rtl:right-3 text-slate-400 pointer-events-none" size={13} />
                        <input 
                          type="text"
                          value={profileSearch}
                          onChange={e => setProfileSearch(e.target.value)}
                          placeholder={lang === 'ar' ? 'البحث بالاسم أو كود الموظف...' : 'Search by name or code...'}
                          className="w-full text-xs p-2.5 pl-9 pr-3.5 rtl:pr-9 rtl:pl-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-400 transition h-[38px] font-sans"
                        />
                        {profileSearch && (
                          <button
                            onClick={() => setProfileSearch('')}
                            className="absolute right-3 rtl:left-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-orange-500 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => setIsProfileColumnFiltersOpen(!isProfileColumnFiltersOpen)}
                        className={cn(
                          "p-2 px-3 text-xs font-black rounded-lg border transition flex items-center justify-center gap-1.5 cursor-pointer select-none whitespace-nowrap h-[38px] min-h-[38px] w-full",
                          isProfileColumnFiltersOpen 
                            ? "bg-[#0a1945] text-white border-[#0a1945]" 
                            : "bg-white text-black border-slate-200 hover:border-orange-400 hover:text-orange-500"
                        )}
                        title={lang === 'ar' ? 'بحث متقدم' : 'Advanced Search'}
                      >
                        <Filter size={13} className="text-orange-500" />
                        <span>{lang === 'ar' ? 'بحث متقدم' : 'Advanced Search'}</span>
                      </button>
                    </div>

                    {/* Right Side: Stack of Dropdown + Two Buttons under it */}
                    <div className="flex flex-col gap-2 w-full md:w-[220px]">
                      {/* Top Row: Branch Dropdown - aligned properly and spans full width of the block */}
                      <div className="relative w-full">
                        <button
                          onClick={() => setProfileBranchDropdownOpen(!profileBranchDropdownOpen)}
                          className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-white border border-slate-200/90 hover:border-slate-300 text-slate-700 rounded-lg shadow-xs transition duration-150 cursor-pointer text-xs font-semibold select-none h-[38px]"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Building2 className="w-4 h-4 text-orange-500 hover:scale-110 transition" />
                            <span className={lang === 'ar' ? 'font-sans text-[12px] truncate' : 'truncate'}>
                              {selectedProfileBranches.includes('all')
                                ? (lang === 'ar' ? 'كل الفروع' : 'All Branches')
                                : selectedProfileBranches.length === 1
                                ? (lang === 'ar'
                                    ? comBranches.find(b => b.id === selectedProfileBranches[0])?.labelAr
                                    : comBranches.find(b => b.id === selectedProfileBranches[0])?.labelEn)
                                : (lang === 'ar'
                                    ? `محدّد (${selectedProfileBranches.length}) فروع`
                                    : `Selected (${selectedProfileBranches.length}) branches`
                                  )
                              }
                            </span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${profileBranchDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {profileBranchDropdownOpen && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setProfileBranchDropdownOpen(false)} 
                            />
                            
                            <div className="absolute right-0 left-0 mt-2 w-full bg-white border border-slate-200/90 rounded-2xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100 p-1.5 animate-in fade-in slide-in-from-top-2 duration-150 text-xs text-left rtl:text-right">
                              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                                {lang === 'ar' ? 'تصفية حسب الفرع' : 'Filter by Branch'}
                              </div>
                              <div className="space-y-0.5 pt-1.5">
                                {comBranches.map((branch) => {
                                  const isSelected = selectedProfileBranches.includes(branch.id);
                                  return (
                                    <button
                                      key={branch.id}
                                      onClick={() => {
                                        let updated = [...selectedProfileBranches].filter(id => id !== 'all');
                                        if (isSelected) updated = updated.filter(id => id !== branch.id);
                                        else updated.push(branch.id);
                                        if (updated.length === 0) updated = ['all'];
                                        setSelectedProfileBranches(updated);
                                      }}
                                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors duration-150 cursor-pointer ${
                                        isSelected
                                          ? 'bg-slate-50 text-orange-600 font-bold'
                                          : 'text-slate-600 hover:bg-slate-50/60 hover:text-slate-900'
                                      } flex-row rtl:flex-row-reverse`}
                                    >
                                      <span className={lang === 'ar' ? 'font-sans' : ''}>
                                        {lang === 'ar' ? branch.labelAr : branch.labelEn}
                                      </span>
                                      {isSelected ? (
                                        <Check className="w-4 h-4 text-orange-500 shrink-0" />
                                      ) : (
                                        <div className="w-4 h-4 border border-slate-300 rounded-md shrink-0" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Bottom Row: Toggle View Button + Customize Columns Button */}
                      <div className="flex gap-2 w-full">
                        <div className="relative group flex-1 md:flex-none md:w-[76px]">
                          <button
                            onClick={() => setProfileViewMode(profileViewMode === 'table' ? 'kanban' : 'table')}
                            className="w-full flex items-center justify-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-orange-400 hover:text-orange-500 text-slate-655 transition cursor-pointer select-none h-[38px] active:scale-[0.98] shadow-xs"
                          >
                            {profileViewMode === 'table' ? (
                              <>
                                <LayoutGrid size={14} className="text-[#0a1945]" />
                                <span className="text-[11px] font-bold font-sans">
                                  {lang === 'ar' ? 'بطاقات' : 'Cards'}
                                </span>
                              </>
                            ) : (
                              <>
                                <ClipboardList size={14} className="text-orange-500" />
                                <span className="text-[11px] font-bold font-sans">
                                  {lang === 'ar' ? 'جدول' : 'Table'}
                                </span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="relative flex-1">
                          <button 
                            onClick={() => { setTempProfileVisibleColumns({ ...profileVisibleColumns }); setProfileColumnSettingsOpen(!profileColumnSettingsOpen); }}
                            className="w-full flex items-center justify-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-orange-400 hover:text-orange-500 text-slate-655 transition cursor-pointer select-none h-[38px] active:scale-[0.98] shadow-xs"
                          >
                            <Settings size={14} className="text-orange-500" />
                            <span className="text-[11px] font-bold font-sans">
                              {lang === 'ar' ? 'الأعمدة' : 'Columns'}
                            </span>
                          </button>
                          
                          {profileColumnSettingsOpen && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setProfileColumnSettingsOpen(false)} />
                              <div className="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-2xl p-3.5 text-xs z-50 animate-fadeIn text-left rtl:text-right">
                                <div className="pb-2 border-b border-slate-100 mb-2.5">
                                  <h5 className="font-extrabold text-slate-800 text-[12px] text-left rtl:text-right">{lang === 'ar' ? 'اختر الأعمدة' : 'Choose Columns'}</h5>
                                </div>
                                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                                  {Object.entries({
                                    empId: { en: 'Emp ID', ar: 'كود الموظف' },
                                    name: { en: 'Staff & Role', ar: 'اسم الموظف' },
                                    dept: { en: 'Department', ar: 'الإدارة' },
                                    section: { en: 'Section', ar: 'القسم' },
                                    branch: { en: 'Branch', ar: 'الفرع' },
                                    hireDate: { en: 'Hiring Date', ar: 'تاريخ التعيين' },
                                    baseSalary: { en: 'Salary', ar: 'الراتب الأساسي' },
                                    status: { en: 'Status', ar: 'حالة الدوام' }
                                  }).map(([key, label]) => (
                                    <label key={key} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-slate-900 text-slate-600 flex-row rtl:flex-row-reverse justify-between">
                                      <span className={lang === 'ar' ? 'font-sans' : ''}>{lang === 'ar' ? label.ar : label.en}</span>
                                      <input 
                                        type="checkbox" 
                                        checked={tempProfileVisibleColumns[key]} 
                                        onChange={(e) => setTempProfileVisibleColumns(prev => ({ ...prev, [key]: e.target.checked }))}
                                        className="rounded border border-slate-300 text-orange-500 focus:ring-orange-500 w-3.5 h-3.5"
                                      />
                                    </label>
                                  ))}
                                </div>
                                <div className="mt-3.5 pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                                  <button onClick={() => setProfileColumnSettingsOpen(false)} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase transition">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                                  <button 
                                    onClick={() => { setProfileVisibleColumns({ ...tempProfileVisibleColumns }); setProfileColumnSettingsOpen(false); triggerHrToast(lang === 'ar' ? 'تم تطبيق اختيار الأعمدة بنجاح' : 'Columns selection applied!'); }}
                                    className="px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[10px] font-bold transition shadow-xs cursor-pointer uppercase"
                                  >
                                    {lang === 'ar' ? 'تطبيق' : 'Apply'}
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* KPIs & Results Grid */}
                  {(() => {
                    const filteredEmps = staff.filter(emp => {
                      const query = profileSearch.toLowerCase().trim();
                      if (query) {
                        const hasMatch = emp.id.toLowerCase().includes(query) || emp.name.toLowerCase().includes(query) || (emp.nameAr || '').toLowerCase().includes(query);
                        if (!hasMatch) return false;
                      }
                      if (profileStartDate || profileEndDate) {
                        const hire = emp.hireDate || '2025-01-01';
                        if (profileStartDate && hire < profileStartDate) return false;
                        if (profileEndDate && hire > profileEndDate) return false;
                      }
                      return true;
                    });

                    const computedData = filteredEmps.filter(row => {
                      const empNum = parseInt(row.id.replace(/\D/g, '')) || 1;
                      const branchId = empNum % 3 === 0 ? 'mamar' : empNum % 3 === 1 ? 'theater' : 'zaghloul';

                      if (!selectedProfileBranches.includes('all') && !selectedProfileBranches.includes(branchId)) return false;

                      // Column-level advanced search filters
                      if (profColSearchEmpId && !row.id.toLowerCase().includes(profColSearchEmpId.toLowerCase().trim())) return false;
                      if (profColSearchName) {
                        const q = profColSearchName.toLowerCase().trim();
                        const match = row.name.toLowerCase().includes(q) || (row.nameAr || '').toLowerCase().includes(q);
                        if (!match) return false;
                      }
                      if (profColSearchDept) {
                        const d = departments.find(dep => dep.id === row.departmentId);
                        const depText = d ? (lang === 'ar' ? d.nameAr : d.nameEn) : '';
                        if (!depText.toLowerCase().includes(profColSearchDept.toLowerCase().trim())) return false;
                      }
                      if (profColSearchSection) {
                        const s = sections.find(sec => sec.id === row.sectionId);
                        const secText = s ? (lang === 'ar' ? s.nameAr : s.nameEn) : '';
                        if (!secText.toLowerCase().includes(profColSearchSection.toLowerCase().trim())) return false;
                      }
                      if (profColSearchBranch) {
                        const bLabel = branchId === 'mamar' ? 'Al-Mamar' : branchId === 'theater' ? 'Roman Theater' : 'Saad Zaghloul';
                        if (!bLabel.toLowerCase().includes(profColSearchBranch.toLowerCase().trim())) return false;
                      }
                      if (profColSearchStatus && !(row.status || '').toLowerCase().includes(profColSearchStatus.toLowerCase().trim())) return false;

                      return true;
                    });

                    // KPIs
                    const totalEmployees = computedData.length;
                    const totalSalarySum = computedData.reduce((acc, r) => acc + r.baseSalary, 0);
                    const avgSalary = Math.round(totalSalarySum / (totalEmployees || 1));
                    const activeEmployees = computedData.filter(r => r.status === 'On-Duty' || r.status === 'Active' || !r.status).length;

                    // Pagination
                    const profPageSize = profilePageSize;
                    const totalProfPages = Math.ceil(computedData.length / profPageSize) || 1;
                    const activeProfPage = Math.min(profileCurrentPage, totalProfPages);
                    const startIndex = (activeProfPage - 1) * profPageSize;
                    const paginatedProfData = computedData.slice(startIndex, startIndex + profPageSize);

                    return (
                      <>
                        {/* Bento Grid Analytics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full select-none text-left rtl:text-right">
                          <div className="bg-[#0a1945] rounded-[24px] p-5 text-white border border-slate-800 shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[120px]">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-300 text-xs font-bold font-sans uppercase tracking-wider">{lang === 'ar' ? 'إجمالي عدد الموظفين' : 'Total Employees'}</span>
                              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-orange-400 shrink-0"><Users size={15} /></div>
                            </div>
                            <div className="mt-3">
                              <span className="text-2xl font-black font-mono tracking-tight text-white block leading-none">{totalEmployees}</span>
                              <span className="text-[10px] text-slate-300 font-semibold block mt-1.5">{lang === 'ar' ? 'ملفات كاملة على النظام' : 'Complete synchronized files'}</span>
                            </div>
                          </div>

                          <div className="bg-white rounded-[24px] p-5 border border-slate-150 shadow-xs flex flex-col justify-between min-h-[120px]">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 text-xs font-bold font-sans uppercase tracking-wider">{lang === 'ar' ? 'متوسط الراتب الأساسي' : 'Average Base Salary'}</span>
                              <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0"><DollarSign size={15} /></div>
                            </div>
                            <div className="mt-3">
                              <span className="text-2xl font-black font-mono tracking-tight text-[#0a1945] block leading-none">{avgSalary.toLocaleString()} <span className="text-xs">{lang === 'ar' ? 'ج.م' : 'EGP'}</span></span>
                              <p className="text-[10px] text-slate-450 font-bold block mt-1.5">{lang === 'ar' ? 'حسب العقود المسجلة' : 'Based on registered contracts'}</p>
                            </div>
                          </div>

                          <div className="bg-white rounded-[24px] p-5 border border-slate-150 shadow-xs flex flex-col justify-between min-h-[120px]">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 text-xs font-bold font-sans uppercase tracking-wider">{lang === 'ar' ? 'على رأس العمل' : 'On-Duty Employees'}</span>
                              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0"><Check size={15} /></div>
                            </div>
                            <div className="mt-3">
                              <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black font-mono tracking-tight text-[#0a1945] block leading-none">{activeEmployees}</span>
                                <span className="text-xs text-emerald-600 font-extrabold">({Math.round((activeEmployees / (totalEmployees || 1)) * 100)}%)</span>
                              </div>
                              <p className="text-[10px] text-slate-455 font-bold block mt-1.5">{lang === 'ar' ? 'في الدورة التشغيلية الحالية' : 'Within active duty rosters'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Layout rendering */}
                        {profileViewMode === 'table' ? (
                          <>
                            {/* Desktop Web View Table */}
                            <div className="hidden md:block bg-white border border-slate-150 rounded-2xl shadow-xs overflow-hidden w-full">
                              <div className="overflow-x-auto w-full">
                                <table className="w-full text-left rtl:text-right border-collapse">
                                  <thead className="bg-[#f97316] text-[11px] font-sans text-white font-bold uppercase tracking-wider whitespace-nowrap h-10 border-b border-orange-600">
                                    <tr>
                                      {profileVisibleColumns.empId && <th className="py-2.5 px-4 text-center text-white">{lang === 'ar' ? 'كود الموظف' : 'Emp ID'}</th>}
                                      {profileVisibleColumns.name && <th className="py-2.5 px-4 text-white">{lang === 'ar' ? 'اسم الموظف' : 'Staff Member'}</th>}
                                      {profileVisibleColumns.dept && <th className="py-2.5 px-4 text-white">{lang === 'ar' ? 'الإدارة' : 'Department'}</th>}
                                      {profileVisibleColumns.section && <th className="py-2.5 px-4 text-white">{lang === 'ar' ? 'القسم' : 'Section'}</th>}
                                      {profileVisibleColumns.branch && <th className="py-2.5 px-4 text-white">{lang === 'ar' ? 'الفرع' : 'Branch'}</th>}
                                      {profileVisibleColumns.hireDate && <th className="py-2.5 px-4 text-white">{lang === 'ar' ? 'التعيين' : 'Hiring Date'}</th>}
                                      {profileVisibleColumns.baseSalary && <th className="py-2.5 px-4 text-right text-white">{lang === 'ar' ? 'الراتب' : 'Salary'}</th>}
                                      {profileVisibleColumns.status && <th className="py-2.5 px-4 text-center text-white bg-[#ea580c]">{lang === 'ar' ? 'حالة الدوام' : 'Status'}</th>}
                                    </tr>
                                    {isProfileColumnFiltersOpen && (
                                      <tr className="bg-slate-50 border-t border-slate-150 h-9 font-sans">
                                        {profileVisibleColumns.empId && <td className="p-1 px-2.5"><input type="text" value={profColSearchEmpId} onChange={e => setProfColSearchEmpId(e.target.value)} placeholder="ID..." className="w-full p-1 text-[10px] bg-white border border-slate-200 rounded outline-none" /></td>}
                                        {profileVisibleColumns.name && <td className="p-1 px-2.5"><input type="text" value={profColSearchName} onChange={e => setProfColSearchName(e.target.value)} placeholder="Name..." className="w-full p-1 text-[10px] bg-white border border-slate-200 rounded outline-none" /></td>}
                                        {profileVisibleColumns.dept && <td className="p-1 px-2.5"><input type="text" value={profColSearchDept} onChange={e => setProfColSearchDept(e.target.value)} placeholder="Dept..." className="w-full p-1 text-[10px] bg-white border border-slate-200 rounded outline-none" /></td>}
                                        {profileVisibleColumns.section && <td className="p-1 px-2.5"><input type="text" value={profColSearchSection} onChange={e => setProfColSearchSection(e.target.value)} placeholder="Sect..." className="w-full p-1 text-[10px] bg-white border border-slate-200 rounded outline-none" /></td>}
                                        {profileVisibleColumns.branch && <td className="p-1 px-2.5"><input type="text" value={profColSearchBranch} onChange={e => setProfColSearchBranch(e.target.value)} placeholder="Branch..." className="w-full p-1 text-[10px] bg-white border border-slate-200 rounded outline-none" /></td>}
                                        {profileVisibleColumns.hireDate && <td className="p-1 px-2.5"></td>}
                                        {profileVisibleColumns.baseSalary && <td className="p-1 px-2.5"></td>}
                                        {profileVisibleColumns.status && <td className="p-1 px-2.5 bg-slate-100"><input type="text" value={profColSearchStatus} onChange={e => setProfColSearchStatus(e.target.value)} placeholder="Status..." className="w-full p-1 text-[10px] bg-white border border-slate-200 rounded outline-none" /></td>}
                                      </tr>
                                    )}
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-sans">
                                    {paginatedProfData.map(row => {
                                      const dept = departments.find(d => d.id === row.departmentId);
                                      const sect = sections.find(s => s.id === row.sectionId);
                                      const empNum = parseInt(row.id.replace(/\D/g, '')) || 1;
                                      const branchId = empNum % 3 === 0 ? 'mamar' : empNum % 3 === 1 ? 'theater' : 'zaghloul';
                                      const branchLabel = branchId === 'mamar' ? (lang === 'ar' ? 'الممر' : 'Al-Mamar') : branchId === 'theater' ? (lang === 'ar' ? 'المسرح الروماني' : 'Roman Theater') : (lang === 'ar' ? 'سعد زغلول' : 'Saad Zaghloul');

                                      return (
                                        <tr key={row.id} className="hover:bg-slate-50/40 transition">
                                          {profileVisibleColumns.empId && <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-500 bg-slate-50/30">{row.id}</td>}
                                          {profileVisibleColumns.name && (
                                            <td className="py-2.5 px-4 font-extrabold text-slate-800">
                                              <div>{lang === 'ar' ? (row.nameAr || row.name) : row.name}</div>
                                              <div className="text-[10px] text-orange-500 font-sans font-semibold mt-0.5">{row.role || 'Officer'}</div>
                                            </td>
                                          )}
                                          {profileVisibleColumns.dept && <td className="py-2.5 px-4 text-slate-600">{dept ? (lang === 'ar' ? dept.nameAr : dept.nameEn) : '--'}</td>}
                                          {profileVisibleColumns.section && <td className="py-2.5 px-4 text-slate-600">{sect ? (lang === 'ar' ? sect.nameAr : sect.nameEn) : '--'}</td>}
                                          {profileVisibleColumns.branch && <td className="py-2.5 px-4 font-semibold text-slate-600">{branchLabel}</td>}
                                          {profileVisibleColumns.hireDate && <td className="py-2.5 px-4 font-mono text-slate-500">{row.hireDate || '2025-01-10'}</td>}
                                          {profileVisibleColumns.baseSalary && <td className="py-2.5 px-4 text-right font-mono font-extrabold text-slate-700">{row.baseSalary.toLocaleString()} EGP</td>}
                                          {profileVisibleColumns.status && (
                                            <td className="py-2.5 px-4 text-center bg-orange-50/10">
                                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                                {row.status || (lang === 'ar' ? 'على رأس العمل' : 'On-Duty')}
                                              </span>
                                            </td>
                                          )}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Mobile Phone Screen Cards Fallback */}
                            <div className="block md:hidden space-y-4">
                              {paginatedProfData.map(row => {
                                const dept = departments.find(d => d.id === row.departmentId);
                                const sect = sections.find(s => s.id === row.sectionId);
                                const empNum = parseInt(row.id.replace(/\D/g, '')) || 1;
                                const branchId = empNum % 3 === 0 ? 'mamar' : empNum % 3 === 1 ? 'theater' : 'zaghloul';
                                const branchLabel = branchId === 'mamar' ? (lang === 'ar' ? 'الممر' : 'Al-Mamar') : branchId === 'theater' ? (lang === 'ar' ? 'المسرح الروماني' : 'Roman Theater') : (lang === 'ar' ? 'سعد زغلول' : 'Saad Zaghloul');

                                return (
                                  <div key={row.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 text-right rtl:text-right">
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-2 flex-row rtl:flex-row-reverse">
                                      <div className="text-left rtl:text-right">
                                        <h4 className="font-extrabold text-[#0a1945] text-sm">{lang === 'ar' ? (row.nameAr || row.name) : row.name}</h4>
                                        <p className="text-[10px] text-orange-500 font-semibold">{row.role || 'Officer'}</p>
                                      </div>
                                      <span className="text-xs font-black text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-md">{row.id}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-right rtl:text-right">
                                      <div>
                                        <span className="text-slate-400 block text-[9px]">{lang === 'ar' ? 'الإدارة' : 'Department'}</span>
                                        <span className="font-bold text-slate-700">{dept ? (lang === 'ar' ? dept.nameAr : dept.nameEn) : '--'}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 block text-[9px]">{lang === 'ar' ? 'الفرع' : 'Branch'}</span>
                                        <span className="font-bold text-slate-700">{branchLabel}</span>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-right rtl:text-right">
                                      <div>
                                        <span className="text-slate-400 block text-[9px]">{lang === 'ar' ? 'تاريخ التعيين' : 'Hiring Date'}</span>
                                        <span className="font-semibold text-slate-600 font-mono">{row.hireDate || '2025-01-10'}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 block text-[9px]">{lang === 'ar' ? 'حالة الدوام' : 'Status'}</span>
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                          {row.status || (lang === 'ar' ? 'على رأس العمل' : 'On-Duty')}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 flex-row rtl:flex-row-reverse">
                                      <span className="text-xs font-bold text-slate-500">{lang === 'ar' ? 'الراتب الأساسي:' : 'Base Salary:'}</span>
                                      <span className="text-sm font-black text-slate-800 font-mono">{row.baseSalary.toLocaleString()} EGP</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {paginatedProfData.map(row => (
                              <div key={row.id} className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col justify-between hover:shadow-sm transition">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="text-[9px] font-mono text-slate-400 font-bold">{row.id}</span>
                                    <h4 className="text-xs font-black text-[#0a1945] leading-tight mt-0.5">{lang === 'ar' ? (row.nameAr || row.name) : row.name}</h4>
                                    <p className="text-[10px] text-slate-450 mt-0.5 font-bold">{row.role || 'Specialist'}</p>
                                  </div>
                                  <span className="px-2 py-0.5 bg-slate-50 border text-[9px] text-slate-500 font-bold rounded">{row.status || (lang === 'ar' ? 'نشط' : 'On-Duty')}</span>
                                </div>
                                <div className="border-t border-slate-100 pt-2.5 mt-3 flex items-center justify-between font-mono text-xs font-extrabold text-[#0a1945]">
                                  <span className="text-[10px] font-sans font-medium text-slate-400">{lang === 'ar' ? 'الراتب الأساسي' : 'Base Salary'}</span>
                                  <span>{row.baseSalary.toLocaleString()} EGP</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Dynamic Pagination Controls with orange/navy theme details */}
                        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 font-sans text-xs text-slate-655">
                          {/* 1. Showing elements counter range */}
                          <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                            {lang === 'ar' ? (
                              <>
                                <span>عرض</span>
                                <span className="font-extrabold text-[#0a1945] font-mono bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                                  {paginatedProfData.length}
                                </span>
                                <span>من أصل</span>
                                <span className="font-extrabold text-orange-650 font-mono bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                                  {computedData.length}
                                </span>
                              </>
                            ) : (
                              <>
                                <span>Show</span>
                                <span className="font-extrabold text-[#0a1945] font-mono bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                                  {paginatedProfData.length}
                                </span>
                                <span>of</span>
                                <span className="font-extrabold text-orange-655 font-mono bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                                  {computedData.length}
                                </span>
                              </>
                            )}
                          </div>

                          {/* 2. Numerical Pagination Items */}
                          <div className="flex items-center gap-1 shrink-0 select-none">
                            {/* Previous Page arrow */}
                            <button
                              type="button"
                              disabled={activeProfPage === 1}
                              onClick={() => setProfileCurrentPage(prev => Math.max(1, prev - 1))}
                              className="p-2 border border-slate-200 hover:border-orange-400 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-655 hover:text-orange-500 hover:bg-orange-50/20 transition cursor-pointer h-8 w-8 flex items-center justify-center shadow-xs"
                              title={lang === 'ar' ? 'الصفحة السابقة' : 'Previous page'}
                            >
                              {lang === 'ar' ? <ChevronRight size={13} strokeWidth={2.5} /> : <ChevronLeft size={13} strokeWidth={2.5} />}
                            </button>

                            {/* Pages links */}
                            <div className="flex items-center gap-1">
                              {Array.from({ length: Math.min(totalProfPages, 3) }, (_, i) => i + 1).map(page => {
                                const isActive = page === activeProfPage;
                                return (
                                  <button
                                    key={page}
                                    type="button"
                                    onClick={() => setProfileCurrentPage(page)}
                                    className={cn(
                                      "w-8 h-8 rounded-lg font-extrabold transition cursor-pointer text-xs flex items-center justify-center border font-mono shadow-xs",
                                      isActive
                                        ? "bg-[#0a1945] text-white border-[#0a1945]"
                                        : "bg-white text-slate-700 border-slate-200 hover:border-orange-400 hover:text-orange-500"
                                    )}
                                  >
                                    {page}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Next Page arrow */}
                            <button
                              type="button"
                              disabled={activeProfPage === totalProfPages}
                              onClick={() => setProfileCurrentPage(prev => Math.min(totalProfPages, prev + 1))}
                              className="p-2 border border-slate-200 hover:border-orange-400 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-655 hover:text-orange-500 hover:bg-orange-50/20 transition cursor-pointer h-8 w-8 flex items-center justify-center shadow-xs"
                              title={lang === 'ar' ? 'الصفحة التالية' : 'Next page'}
                            >
                              {lang === 'ar' ? <ChevronLeft size={13} strokeWidth={2.5} /> : <ChevronRight size={13} strokeWidth={2.5} />}
                            </button>
                          </div>

                          {/* 3. Page Size Dropdown */}
                          <div className="flex items-center gap-2 text-slate-500 font-bold shrink-0">
                            <span>{lang === 'ar' ? 'عرض' : 'Show'}</span>
                            <select
                              value={profilePageSize}
                              onChange={(e) => {
                                setProfilePageSize(Number(e.target.value));
                                setProfileCurrentPage(1);
                              }}
                              className="bg-white border border-slate-200 text-[#0a1945] rounded-xl px-2 py-1.5 text-xs font-black shadow-xs outline-none focus:border-orange-400 cursor-pointer w-16 text-center"
                            >
                              {[5, 10, 20, 50, 100].map(sz => (
                                <option key={sz} value={sz} className="font-bold">
                                  {sz}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : activeReport === 'attendance' ? (
                <div className="space-y-6 animate-fadeIn text-left rtl:text-right pt-2.5 px-2 md:px-0">
                  {/* Header Box */}
                  <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left rtl:text-right">
                    <div className="rtl:text-right text-left flex flex-col shrink-0">
                      <div className="flex items-center gap-2.5">
                        <Clock className="text-orange-500" size={18} />
                        <h3 className="text-md font-bold text-[#0a1945] flex items-center gap-1.5 font-sans">
                          <span>{lang === 'ar' ? 'تقرير حضور وانصراف طاقم العمل' : 'Employee Attendance & Biometric Ledger'}</span>
                        </h3>
                        <span className="text-[12px] leading-[16px] text-center bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full border border-slate-200 font-mono">
                          {lang === 'ar' ? `${staff.length} موظف` : `${staff.length} staff`}
                        </span>
                      </div>
                      
                      {/* Month filter select right below title */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2 w-full max-w-sm">
                        <span className="text-xs font-bold text-slate-500 shrink-0">{lang === 'ar' ? 'تصفية بالشهر:' : 'Filter by Month:'}</span>
                        <div className="relative w-full sm:w-44">
                          <select
                            value={reportMonthAttendance}
                            onChange={(e) => setReportMonthAttendance(e.target.value)}
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-400 font-bold text-[#0a1945] cursor-pointer appearance-none pr-8 pl-8 rtl:pr-8 rtl:pl-8"
                          >
                            <option value="all">{lang === 'ar' ? 'كل الأشهر' : 'All Months'}</option>
                            <option value="2026-05">{lang === 'ar' ? 'مايو - 2026' : 'May - 2026'}</option>
                            <option value="2026-06">{lang === 'ar' ? 'يونيو - 2026' : 'June - 2026'}</option>
                            <option value="2026-07">{lang === 'ar' ? 'يوليو - 2026' : 'July - 2026'}</option>
                            <option value="2026-08">{lang === 'ar' ? 'أغسطس - 2026' : 'August - 2026'}</option>
                          </select>
                          <div className="absolute top-1/2 right-3 rtl:left-3 rtl:right-auto -translate-y-1/2 pointer-events-none text-slate-500">
                            <ChevronDown size={12} />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setActiveReport(null)}
                      className="order-first md:order-last w-[35%] sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer shadow-xs active:scale-[0.98] self-start md:self-auto"
                    >
                      {lang === 'ar' ? <ArrowRight size={16} className="shrink-0" /> : <ArrowLeft size={16} className="shrink-0" />}
                      <span>{lang === 'ar' ? 'الرجوع' : 'Back'}</span>
                    </button>
                  </div>

                  {/* Advanced Controls Toolbar */}
                  <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-4 w-full bg-slate-50/50 p-4 border border-slate-150 rounded-2xl text-left rtl:text-right">
                    {/* Left Side: Search Box */}
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2 w-full md:max-w-2xl md:w-[480px] self-end">
                      {/* Date Range filter */}
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 shadow-xs select-none h-[38px] w-full font-bold leading-6 text-base">
                        <Calendar size={13} className="text-orange-500 shrink-0" />
                        <div className="flex items-center gap-0.5 min-w-0 flex-1">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase shrink-0">{lang === 'ar' ? 'من' : 'From'}</span>
                          <input
                            type="date"
                            value={attendanceStartDateReport}
                            onChange={e => setAttendanceStartDateReport(e.target.value)}
                            className="text-[10px] font-sans font-bold text-slate-700 bg-transparent outline-none border-none w-full cursor-pointer focus:text-orange-600 p-0"
                          />
                        </div>
                        <div className="w-[1px] h-3.5 bg-slate-200 shrink-0 mx-1" />
                        <div className="flex items-center gap-0.5 min-w-0 flex-1">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase shrink-0">{lang === 'ar' ? 'إلى' : 'To'}</span>
                          <input
                            type="date"
                            value={attendanceEndDateReport}
                            onChange={e => setAttendanceEndDateReport(e.target.value)}
                            className="text-[10px] font-sans font-bold text-slate-700 bg-transparent outline-none border-none w-full cursor-pointer focus:text-orange-600 p-0"
                          />
                        </div>
                        {(attendanceStartDateReport || attendanceEndDateReport) && (
                          <button
                            onClick={() => { setAttendanceStartDateReport(''); setAttendanceEndDateReport(''); }}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition cursor-pointer shrink-0"
                            title={lang === 'ar' ? 'مسح التاريخ' : 'Clear dates'}
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>

                      <ExportDataButton
                        lang={lang}
                        onToast={triggerHrToast}
                        onCopy={() => triggerHrToast(lang === 'ar' ? 'تم نسخ التقرير لحافظتك' : 'Report copied to clipboard!')}
                        onPrint={() => triggerHrToast(lang === 'ar' ? 'فتح شاشة الطباعة لجدول الحضور' : 'Opening attendance registers print setup!')}
                        className="w-full"
                      />

                      {/* Main Search input */}
                      <div className="relative flex items-center h-[38px] w-full">
                        <Search className="absolute left-3 rtl:right-3 text-slate-400 pointer-events-none" size={13} />
                        <input 
                          type="text"
                          value={attendanceSearchReport}
                          onChange={e => setAttendanceSearchReport(e.target.value)}
                          placeholder={lang === 'ar' ? 'البحث بالاسم أو كود الموظف...' : 'Search by name or code...'}
                          className="w-full text-xs p-2.5 pl-9 pr-3.5 rtl:pr-9 rtl:pl-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-400 transition h-[38px] font-sans"
                        />
                        {attendanceSearchReport && (
                          <button
                            onClick={() => setAttendanceSearchReport('')}
                            className="absolute right-3 rtl:left-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-orange-500 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => setIsAttendanceColumnFiltersOpenReport(!isAttendanceColumnFiltersOpenReport)}
                        className={cn(
                          "p-2 px-3 text-xs font-black rounded-lg border transition flex items-center justify-center gap-1.5 cursor-pointer select-none whitespace-nowrap h-[38px] min-h-[38px] w-full",
                          isAttendanceColumnFiltersOpenReport 
                            ? "bg-[#0a1945] text-white border-[#0a1945]" 
                            : "bg-white text-black border-slate-200 hover:border-orange-400 hover:text-orange-500"
                        )}
                        title={lang === 'ar' ? 'بحث متقدم' : 'Advanced Search'}
                      >
                        <Filter size={13} className="text-orange-500" />
                        <span>{lang === 'ar' ? 'بحث متقدم' : 'Advanced Search'}</span>
                      </button>
                    </div>

                    {/* Right Side: Stack of Dropdown + Two Buttons under it */}
                    <div className="flex flex-col gap-2 w-full md:w-[220px]">
                      {/* Top Row: Branch Dropdown - aligned properly and spans full width of the block */}
                      <div className="relative w-full">
                        <button
                          onClick={() => setAttendanceBranchDropdownOpenReport(!attendanceBranchDropdownOpenReport)}
                          className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-white border border-slate-200/90 hover:border-slate-300 text-slate-700 rounded-lg shadow-xs transition duration-150 cursor-pointer text-xs font-semibold select-none h-[38px]"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Building2 className="w-4 h-4 text-orange-500 hover:scale-110 transition" />
                            <span className={lang === 'ar' ? 'font-sans text-[12px] truncate' : 'truncate'}>
                              {selectedAttendanceBranchesReport.includes('all')
                                ? (lang === 'ar' ? 'كل الفروع' : 'All Branches')
                                : selectedAttendanceBranchesReport.length === 1
                                ? (lang === 'ar'
                                    ? comBranches.find(b => b.id === selectedAttendanceBranchesReport[0])?.labelAr
                                    : comBranches.find(b => b.id === selectedAttendanceBranchesReport[0])?.labelEn)
                                : (lang === 'ar'
                                    ? `محدّد (${selectedAttendanceBranchesReport.length}) فروع`
                                    : `Selected (${selectedAttendanceBranchesReport.length}) branches`
                                  )
                              }
                            </span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${attendanceBranchDropdownOpenReport ? 'rotate-180' : ''}`} />
                        </button>

                        {attendanceBranchDropdownOpenReport && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setAttendanceBranchDropdownOpenReport(false)} 
                            />
                            
                            <div className="absolute right-0 left-0 mt-2 w-full bg-white border border-slate-200/90 rounded-2xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100 p-1.5 animate-in fade-in slide-in-from-top-2 duration-150 text-xs text-left rtl:text-right">
                              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                                {lang === 'ar' ? 'تصفية حسب الفرع' : 'Filter by Branch'}
                              </div>
                              <div className="space-y-0.5 pt-1.5">
                                {comBranches.map((branch) => {
                                  const isSelected = selectedAttendanceBranchesReport.includes(branch.id);
                                  return (
                                    <button
                                      key={branch.id}
                                      onClick={() => {
                                        let updated = [...selectedAttendanceBranchesReport].filter(id => id !== 'all');
                                        if (isSelected) updated = updated.filter(id => id !== branch.id);
                                        else updated.push(branch.id);
                                        if (updated.length === 0) updated = ['all'];
                                        setSelectedAttendanceBranchesReport(updated);
                                      }}
                                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors duration-150 cursor-pointer ${
                                        isSelected
                                          ? 'bg-slate-50 text-orange-600 font-bold'
                                          : 'text-slate-600 hover:bg-slate-50/60 hover:text-slate-900'
                                      } flex-row rtl:flex-row-reverse`}
                                    >
                                      <span className={lang === 'ar' ? 'font-sans' : ''}>
                                        {lang === 'ar' ? branch.labelAr : branch.labelEn}
                                      </span>
                                      {isSelected ? (
                                        <Check className="w-4 h-4 text-orange-500 shrink-0" />
                                      ) : (
                                        <div className="w-4 h-4 border border-slate-300 rounded-md shrink-0" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Bottom Row: Toggle View Button + Customize Columns Button */}
                      <div className="flex gap-2 w-full">
                        <div className="relative group flex-1 md:flex-none md:w-[76px]">
                          <button
                            onClick={() => setAttendanceViewModeReport(attendanceViewModeReport === 'table' ? 'kanban' : 'table')}
                            className="w-full flex items-center justify-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-orange-400 hover:text-orange-500 text-slate-655 transition cursor-pointer select-none h-[38px] active:scale-[0.98] shadow-xs"
                          >
                            {attendanceViewModeReport === 'table' ? (
                              <>
                                <LayoutGrid size={14} className="text-[#0a1945]" />
                                <span className="text-[11px] font-bold font-sans">
                                  {lang === 'ar' ? 'بطاقات' : 'Cards'}
                                </span>
                              </>
                            ) : (
                              <>
                                <ClipboardList size={14} className="text-orange-500" />
                                <span className="text-[11px] font-bold font-sans">
                                  {lang === 'ar' ? 'جدول' : 'Table'}
                                </span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="relative flex-1">
                          <button 
                            onClick={() => { setTempAttendanceVisibleColumnsReport({ ...attendanceVisibleColumnsReport }); setAttendanceColumnSettingsOpenReport(!attendanceColumnSettingsOpenReport); }}
                            className="w-full flex items-center justify-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-orange-400 hover:text-orange-500 text-slate-655 transition cursor-pointer select-none h-[38px] active:scale-[0.98] shadow-xs"
                          >
                            <Settings size={14} className="text-orange-500" />
                            <span className="text-[11px] font-bold font-sans">
                              {lang === 'ar' ? 'الأعمدة' : 'Columns'}
                            </span>
                          </button>
                          
                          {attendanceColumnSettingsOpenReport && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setAttendanceColumnSettingsOpenReport(false)} />
                              <div className="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-2xl p-3.5 text-xs z-50 animate-fadeIn text-left rtl:text-right">
                                <div className="pb-2 border-b border-slate-100 mb-2.5">
                                  <h5 className="font-extrabold text-slate-800 text-[12px] text-left rtl:text-right">{lang === 'ar' ? 'اختر الأعمدة' : 'Choose Columns'}</h5>
                                </div>
                                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                                  {Object.entries({
                                    empId: { en: 'Emp ID', ar: 'كود الموظف' },
                                    name: { en: 'Staff Member', ar: 'اسم الموظف' },
                                    date: { en: 'Date', ar: 'التاريخ' },
                                    timeIn: { en: 'Clock In', ar: 'حضور الموظف' },
                                    timeOut: { en: 'Clock Out', ar: 'انصراف الموظف' },
                                    mode: { en: 'Device Mode', ar: 'وسيلة الدوّام' },
                                    status: { en: 'Duty Status', ar: 'الانضباط' }
                                  }).map(([key, label]) => (
                                    <label key={key} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-slate-900 text-slate-600 flex-row rtl:flex-row-reverse justify-between">
                                      <span className={lang === 'ar' ? 'font-sans' : ''}>{lang === 'ar' ? label.ar : label.en}</span>
                                      <input 
                                        type="checkbox" 
                                        checked={tempAttendanceVisibleColumnsReport[key]} 
                                        onChange={(e) => setTempAttendanceVisibleColumnsReport(prev => ({ ...prev, [key]: e.target.checked }))}
                                        className="rounded border border-slate-300 text-orange-500 focus:ring-orange-500 w-3.5 h-3.5"
                                      />
                                    </label>
                                  ))}
                                </div>
                                <div className="mt-3.5 pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                                  <button onClick={() => setAttendanceColumnSettingsOpenReport(false)} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase transition">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                                  <button 
                                    onClick={() => { setAttendanceVisibleColumnsReport({ ...tempAttendanceVisibleColumnsReport }); setAttendanceColumnSettingsOpenReport(false); triggerHrToast(lang === 'ar' ? 'تم تطبيق خيارات أعمدة الحضور بنجاح' : 'Attendance layout filter applied!'); }}
                                    className="px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[10px] font-bold transition shadow-xs cursor-pointer uppercase"
                                  >
                                    {lang === 'ar' ? 'تطبيق' : 'Apply'}
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* KPIs and Grid */}
                  {(() => {
                    const computedLogsAll = attendanceLogs.map(log => {
                      const emp = staff.find(s => s.id === log.empId) || staff[0];
                      const empNum = emp ? (parseInt(emp.id.replace(/\D/g, '')) || 1) : 1;
                      const branchId = empNum % 3 === 0 ? 'mamar' : empNum % 3 === 1 ? 'theater' : 'zaghloul';
                      return { log, emp, branchId };
                    });

                    const filteredLogs = computedLogsAll.filter(row => {
                      const query = attendanceSearchReport.toLowerCase().trim();
                      if (query) {
                        const hasMatch = row.log.empId.toLowerCase().includes(query) || 
                                         (row.emp && row.emp.name.toLowerCase().includes(query)) || 
                                         (row.emp && row.emp.nameAr && row.emp.nameAr.toLowerCase().includes(query));
                        if (!hasMatch) return false;
                      }

                      const logNum = parseInt(row.log.id.replace(/\D/g, '')) || 1;
                      const simMonth = logNum % 3 === 0 ? '05' : logNum % 3 === 1 ? '06' : '07';
                      const simDay = (10 + (logNum * 3) % 18).toString().padStart(2, '0');
                      const logDate = `2026-${simMonth}-${simDay}`;

                      if (attendanceStartDateReport || attendanceEndDateReport) {
                        if (attendanceStartDateReport && logDate < attendanceStartDateReport) return false;
                        if (attendanceEndDateReport && logDate > attendanceEndDateReport) return false;
                      }

                      if (reportMonthAttendance !== 'all') {
                        if (!logDate.startsWith(reportMonthAttendance)) return false;
                      }

                      if (!selectedAttendanceBranchesReport.includes('all') && !selectedAttendanceBranchesReport.includes(row.branchId)) return false;

                      // Advanced grid-column live search filters
                      if (attColSearchEmpId && !row.log.empId.toLowerCase().includes(attColSearchEmpId.toLowerCase().trim())) return false;
                      if (attColSearchName) {
                        const q = attColSearchName.toLowerCase().trim();
                        const match = row.emp && (row.emp.name.toLowerCase().includes(q) || (row.emp.nameAr || '').toLowerCase().includes(q));
                        if (!match) return false;
                      }
                      if (attColSearchStatus && !(row.log.status || '').toLowerCase().includes(attColSearchStatus.toLowerCase().trim())) return false;

                      return true;
                    });

                    // KPIs
                    const totalLogs = filteredLogs.length;
                    const onTimeLogs = filteredLogs.filter(f => f.log.status === 'On-Time').length;
                    const exceptionLogs = totalLogs - onTimeLogs;

                    // Pagination
                    const pageSize = attendancePageSizeReport;
                    const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
                    const activePage = Math.min(attendanceCurrentPageReport, totalPages);
                    const idxSt = (activePage - 1) * pageSize;
                    const paginatedLogs = filteredLogs.slice(idxSt, idxSt + pageSize);

                    return (
                      <>
                        {/* Bento KPI widgets */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full select-none text-left rtl:text-right">
                          <div className="bg-[#0a1945] rounded-[24px] p-5 text-white shadow-xs flex flex-col justify-between min-h-[120px]">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-300 text-xs font-bold uppercase tracking-wider">{lang === 'ar' ? 'إجمالي قيود الدوام اليومية' : 'Total Shifts Logs'}</span>
                              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-orange-400 shrink-0"><Clock size={15} /></div>
                            </div>
                            <div className="mt-3">
                              <span className="text-2xl font-black font-mono tracking-tight text-white block leading-none">{totalLogs}</span>
                              <p className="text-[10px] text-slate-300 mt-1.5 font-sans font-bold">{lang === 'ar' ? 'حركات مسجلة بالبصمة الحيوية' : 'Recorded biometric shifts transactions'}</p>
                            </div>
                          </div>

                          <div className="bg-white rounded-[24px] p-5 border border-slate-150 shadow-xs flex flex-col justify-between min-h-[120px]">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{lang === 'ar' ? 'حضور انضباطي كامل' : 'On-Time Check-Ins'}</span>
                              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0"><Check size={15} /></div>
                            </div>
                            <div className="mt-3">
                              <span className="text-2xl font-black text-emerald-600 block leading-none font-mono">{onTimeLogs} <span className="text-xs text-slate-500">({Math.round((onTimeLogs / (totalLogs || 1)) * 100)}%)</span></span>
                              <p className="text-[10px] text-slate-450 mt-1.5 font-bold">{lang === 'ar' ? 'حضور ضمن النافذة المسموحة' : 'Duty arrival within graceful buffer'}</p>
                            </div>
                          </div>

                          <div className="bg-white rounded-[24px] p-5 border border-slate-150 shadow-xs flex flex-col justify-between min-h-[120px]">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{lang === 'ar' ? 'ساعات تأخير أو دورات استثنائية' : 'Late Clock-Ins'}</span>
                              <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0"><X size={15} /></div>
                            </div>
                            <div className="mt-3">
                              <span className="text-2xl font-black text-rose-600 block leading-none font-mono">{exceptionLogs} <span className="text-xs text-slate-500">({100 - Math.round((onTimeLogs / (totalLogs || 1)) * 100)}%)</span></span>
                              <p className="text-[10px] text-slate-455 mt-1.5 font-bold">{lang === 'ar' ? 'تستوجب تبريراً إدارياً' : 'Awaiting admin justification'}</p>
                            </div>
                          </div>
                        </div>

                        {attendanceViewModeReport === 'table' ? (
                          <>
                            {/* Desktop View Table */}
                            <div className="hidden md:block bg-white border border-slate-150 rounded-2xl shadow-xs overflow-hidden w-full">
                              <div className="overflow-x-auto w-full">
                                <table className="w-full text-left rtl:text-right border-collapse">
                                  <thead className="bg-[#f97316] text-[11px] text-white font-bold uppercase tracking-wider h-10 border-b border-orange-600">
                                    <tr>
                                      {attendanceVisibleColumnsReport.empId && <th className="py-2.5 px-4 text-center text-white">{lang === 'ar' ? 'كود الموظف' : 'Emp ID'}</th>}
                                      {attendanceVisibleColumnsReport.name && <th className="py-2.5 px-4 text-white">{lang === 'ar' ? 'اسم الموظف' : 'Staff Member'}</th>}
                                      {attendanceVisibleColumnsReport.date && <th className="py-2.5 px-4 text-white">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>}
                                      {attendanceVisibleColumnsReport.timeIn && <th className="py-2.5 px-4 text-center text-white">{lang === 'ar' ? 'الحضور' : 'Clock In'}</th>}
                                      {attendanceVisibleColumnsReport.timeOut && <th className="py-2.5 px-4 text-center text-white">{lang === 'ar' ? 'الانصراف' : 'Clock Out'}</th>}
                                      {attendanceVisibleColumnsReport.mode && <th className="py-2.5 px-4 text-white">{lang === 'ar' ? 'الجهاز' : 'Device'}</th>}
                                      {attendanceVisibleColumnsReport.status && <th className="py-2.5 px-4 text-center text-white bg-[#ea580c]">{lang === 'ar' ? 'الحالة' : 'Status'}</th>}
                                    </tr>
                                    {isAttendanceColumnFiltersOpenReport && (
                                      <tr className="bg-slate-50 border-t border-slate-150 h-9 font-sans">
                                        {attendanceVisibleColumnsReport.empId && <td className="p-1 px-2.5"><input type="text" value={attColSearchEmpId} onChange={e => setAttColSearchEmpId(e.target.value)} placeholder="ID..." className="w-full p-1 text-[10px] bg-white border border-slate-200 rounded outline-none" /></td>}
                                        {attendanceVisibleColumnsReport.name && <td className="p-1 px-2.5"><input type="text" value={attColSearchName} onChange={e => setAttColSearchName(e.target.value)} placeholder="Search..." className="w-full p-1 text-[10px] bg-white border border-slate-200 rounded outline-none" /></td>}
                                        {attendanceVisibleColumnsReport.date && <td className="p-1 px-2.5"></td>}
                                        {attendanceVisibleColumnsReport.timeIn && <td className="p-1 px-2.5"></td>}
                                        {attendanceVisibleColumnsReport.timeOut && <td className="p-1 px-2.5"></td>}
                                        {attendanceVisibleColumnsReport.mode && <td className="p-1 px-2.5"></td>}
                                        {attendanceVisibleColumnsReport.status && <td className="p-1 px-2.5 bg-slate-100"><input type="text" value={attColSearchStatus} onChange={e => setAttColSearchStatus(e.target.value)} placeholder="Status..." className="w-full p-1 text-[10px] bg-white border border-slate-200 rounded outline-none" /></td>}
                                      </tr>
                                    )}
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-sans">
                                    {paginatedLogs.map(row => {
                                      const branchLabel = row.branchId === 'mamar' ? (lang === 'ar' ? 'الممر' : 'Al-Mamar') : row.branchId === 'theater' ? (lang === 'ar' ? 'المسرح الروماني' : 'Roman Theater') : (lang === 'ar' ? 'سعد زغلول' : 'Saad Zaghloul');
                                      const logNum = parseInt(row.log.id.replace(/\D/g, '')) || 1;
                                      const simMonth = logNum % 3 === 0 ? '05' : logNum % 3 === 1 ? '06' : '07';
                                      const simDay = (10 + (logNum * 3) % 18).toString().padStart(2, '0');
                                      const logDate = `2026-${simMonth}-${simDay}`;

                                      return (
                                        <tr key={row.log.id} className="hover:bg-slate-50/40 transition">
                                          {attendanceVisibleColumnsReport.empId && <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-500 bg-slate-50/30">{row.log.empId}</td>}
                                          {attendanceVisibleColumnsReport.name && (
                                            <td className="py-2.5 px-4 font-extrabold text-slate-800">
                                              <div>{row.emp ? (lang === 'ar' ? (row.emp.nameAr || row.emp.name) : row.emp.name) : 'Biometric ID'}</div>
                                              <div className="text-[10px] text-orange-500 mt-0.5 font-sans font-semibold">{branchLabel}</div>
                                            </td>
                                          )}
                                          {attendanceVisibleColumnsReport.date && <td className="py-2.5 px-4 font-mono text-slate-500">{logDate}</td>}
                                          {attendanceVisibleColumnsReport.timeIn && <td className="py-2.5 px-4 text-center font-mono font-bold text-blue-600">{row.log.timeIn1 || '--'}</td>}
                                          {attendanceVisibleColumnsReport.timeOut && <td className="py-2.5 px-4 text-center font-mono text-slate-500">{row.log.timeOut1 || '--'}</td>}
                                          {attendanceVisibleColumnsReport.mode && <td className="py-2.5 px-4 font-semibold text-slate-600">{row.log.mode}</td>}
                                          {attendanceVisibleColumnsReport.status && (
                                            <td className="py-2.5 px-4 text-center bg-orange-50/10">
                                              <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black", row.log.status === 'On-Time' ? 'bg-emerald-100 text-emerald-800' : 'bg-[#e0f2fe] text-blue-800')}>
                                                {row.log.status || 'Active'}
                                              </span>
                                            </td>
                                          )}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Mobile View Cards */}
                            <div className="block md:hidden space-y-4">
                              {paginatedLogs.map(row => {
                                const branchLabel = row.branchId === 'mamar' ? (lang === 'ar' ? 'الممر' : 'Al-Mamar') : row.branchId === 'theater' ? (lang === 'ar' ? 'المسرح الروماني' : 'Roman Theater') : (lang === 'ar' ? 'سعد زغلول' : 'Saad Zaghloul');
                                const logNum = parseInt(row.log.id.replace(/\D/g, '')) || 1;
                                const simMonth = logNum % 3 === 0 ? '05' : logNum % 3 === 1 ? '06' : '07';
                                const simDay = (10 + (logNum * 3) % 18).toString().padStart(2, '0');
                                const logDate = `2026-${simMonth}-${simDay}`;

                                return (
                                  <div key={row.log.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 text-right rtl:text-right">
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-2 flex-row rtl:flex-row-reverse">
                                      <div className="text-left rtl:text-right">
                                        <h4 className="font-extrabold text-[#0a1945] text-sm">{row.emp ? (lang === 'ar' ? (row.emp.nameAr || row.emp.name) : row.emp.name) : 'Biometric ID'}</h4>
                                        <p className="text-[10px] text-orange-500 font-semibold">{branchLabel}</p>
                                      </div>
                                      <span className="text-xs font-black text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-md">{row.log.empId}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-right rtl:text-right">
                                      <div>
                                        <span className="text-slate-400 block text-[9px]">{lang === 'ar' ? 'التاريخ' : 'Date'}</span>
                                        <span className="font-bold text-slate-700 font-mono">{logDate}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 block text-[9px]">{lang === 'ar' ? 'وسيلة الدوّام' : 'Device Mode'}</span>
                                        <span className="font-bold text-slate-700">{row.log.mode}</span>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-right rtl:text-right">
                                      <div>
                                        <span className="text-slate-500 block text-[9px]">{lang === 'ar' ? 'حضور' : 'Clock In'}</span>
                                        <span className="font-bold text-blue-600 font-mono">{row.log.timeIn1 || '--'}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-500 block text-[9px]">{lang === 'ar' ? 'انصراف' : 'Clock Out'}</span>
                                        <span className="font-bold text-slate-600 font-mono">{row.log.timeOut1 || '--'}</span>
                                      </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 flex-row rtl:flex-row-reverse">
                                      <span className="text-xs font-bold text-slate-500">{lang === 'ar' ? 'حالة الانضباط:' : 'Duty Status:'}</span>
                                      <span className={cn("text-xs font-black px-2.5 py-0.5 rounded-full", row.log.status === 'On-Time' ? 'bg-emerald-100 text-emerald-800' : 'bg-[#e0f2fe] text-blue-800')}>
                                        {row.log.status || 'Active'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {paginatedLogs.map(row => {
                              const branchLabel = row.branchId === 'mamar' ? (lang === 'ar' ? 'فرع الممر' : 'Al-Mamar') : row.branchId === 'theater' ? (lang === 'ar' ? 'فرع المسرح الروماني' : 'Roman Theater') : (lang === 'ar' ? 'فرع سعد زغلول' : 'Saad Zaghloul');
                              return (
                                <div key={row.log.id} className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col justify-between hover:shadow-xs transition">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="text-[9px] font-mono text-slate-400 font-bold">{row.log.empId}</span>
                                      <h4 className="text-xs font-black text-[#0a1945] leading-tight mt-0.5">{row.emp ? (lang === 'ar' ? (row.emp.nameAr || row.emp.name) : row.emp.name) : 'Staff Member'}</h4>
                                      <p className="text-[10px] text-slate-450 mt-0.5 font-bold">{branchLabel}</p>
                                    </div>
                                    <span className="px-2 py-0.5 bg-slate-50 border text-[9px] text-slate-500 font-bold rounded">{row.log.status}</span>
                                  </div>
                                  <div className="border-t border-slate-100 pt-2.5 mt-3 flex items-center justify-between font-mono text-xs text-slate-500">
                                    <span>{row.log.timeIn1 || '--'}</span>
                                    <span>{row.log.timeOut1 || '--'}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Dynamic Pagination Controls with orange/navy theme details */}
                        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 font-sans text-xs text-slate-655">
                          {/* 1. Showing elements counter range */}
                          <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                            {lang === 'ar' ? (
                              <>
                                <span>عرض</span>
                                <span className="font-extrabold text-[#0a1945] font-mono bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                                  {paginatedLogs.length}
                                </span>
                                <span>من أصل</span>
                                <span className="font-extrabold text-orange-655 font-mono bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                                  {computedLogsAll.length}
                                </span>
                              </>
                            ) : (
                              <>
                                <span>Show</span>
                                <span className="font-extrabold text-[#0a1945] font-mono bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                                  {paginatedLogs.length}
                                </span>
                                <span>of</span>
                                <span className="font-extrabold text-orange-655 font-mono bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                                  {computedLogsAll.length}
                                </span>
                              </>
                            )}
                          </div>

                          {/* 2. Numerical Pagination Items */}
                          <div className="flex items-center gap-1 shrink-0 select-none">
                            {/* Previous Page arrow */}
                            <button
                              type="button"
                              disabled={activePage === 1}
                              onClick={() => setAttendanceCurrentPageReport(prev => Math.max(1, prev - 1))}
                              className="p-2 border border-slate-200 hover:border-orange-400 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-655 hover:text-orange-500 hover:bg-orange-50/20 transition cursor-pointer h-8 w-8 flex items-center justify-center shadow-xs"
                              title={lang === 'ar' ? 'الصفحة السابقة' : 'Previous page'}
                            >
                              {lang === 'ar' ? <ChevronRight size={13} strokeWidth={2.5} /> : <ChevronLeft size={13} strokeWidth={2.5} />}
                            </button>

                            {/* Pages links */}
                            <div className="flex items-center gap-1">
                              {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map(page => {
                                const isActive = page === activePage;
                                return (
                                  <button
                                    key={page}
                                    type="button"
                                    onClick={() => setAttendanceCurrentPageReport(page)}
                                    className={cn(
                                      "w-8 h-8 rounded-lg font-extrabold transition cursor-pointer text-xs flex items-center justify-center border font-mono shadow-xs",
                                      isActive
                                        ? "bg-[#0a1945] text-white border-[#0a1945]"
                                        : "bg-white text-slate-700 border-slate-200 hover:border-orange-400 hover:text-orange-500"
                                    )}
                                  >
                                    {page}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Next Page arrow */}
                            <button
                              type="button"
                              disabled={activePage === totalPages}
                              onClick={() => setAttendanceCurrentPageReport(prev => Math.min(totalPages, prev + 1))}
                              className="p-2 border border-slate-200 hover:border-orange-400 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-655 hover:text-orange-500 hover:bg-orange-50/20 transition cursor-pointer h-8 w-8 flex items-center justify-center shadow-xs"
                              title={lang === 'ar' ? 'الصفحة التالية' : 'Next page'}
                            >
                              {lang === 'ar' ? <ChevronLeft size={13} strokeWidth={2.5} /> : <ChevronRight size={13} strokeWidth={2.5} />}
                            </button>
                          </div>

                          {/* 3. Page Size Dropdown */}
                          <div className="flex items-center gap-2 text-slate-500 font-bold shrink-0">
                            <span>{lang === 'ar' ? 'عرض' : 'Show'}</span>
                            <select
                              value={attendancePageSizeReport}
                              onChange={(e) => {
                                setAttendancePageSizeReport(Number(e.target.value));
                                setAttendanceCurrentPageReport(1);
                              }}
                              className="bg-white border border-slate-200 text-[#0a1945] rounded-xl px-2 py-1.5 text-xs font-black shadow-xs outline-none focus:border-orange-400 cursor-pointer w-16 text-center"
                            >
                              {[5, 10, 20, 50, 100].map(sz => (
                                <option key={sz} value={sz} className="font-bold">
                                  {sz}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : activeReport === 'bonus_deduct' ? (
                <div className="space-y-6 animate-fadeIn text-left rtl:text-right">
                  {/* Header Box */}
                  <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left rtl:text-right">
                    <div className="rtl:text-right text-left flex flex-col shrink-0">
                      <div className="flex items-center gap-2.5">
                        <DollarSign className="text-orange-500" size={18} />
                        <h3 className="text-md font-bold text-[#0a1945] flex items-center gap-1.5 font-sans">
                          <span>{lang === 'ar' ? 'تقرير مكافآت + خصومات طاقم العمل' : 'Employee Saving & Rewards Ledger'}</span>
                        </h3>
                        <span className="text-[12px] leading-[16px] text-center bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full border border-slate-200 font-mono">
                          {lang === 'ar' ? `${staff.length} موظف` : `${staff.length} staff`}
                        </span>
                      </div>
                      
                      {/* Month filter select right below title */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2 w-full max-w-sm">
                        <span className="text-xs font-bold text-slate-500 shrink-0">{lang === 'ar' ? 'تصفية بالشهر:' : 'Filter by Month:'}</span>
                        <div className="relative w-full sm:w-44">
                          <select
                            value={reportMonthBonusDeduct}
                            onChange={(e) => setReportMonthBonusDeduct(e.target.value)}
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-400 font-bold text-[#0a1945] cursor-pointer appearance-none pr-8 pl-8 rtl:pr-8 rtl:pl-8"
                          >
                            <option value="all">{lang === 'ar' ? 'كل الأشهر' : 'All Months'}</option>
                            <option value="2026-05">{lang === 'ar' ? 'مايو - 2026' : 'May - 2026'}</option>
                            <option value="2026-06">{lang === 'ar' ? 'يونيو - 2026' : 'June - 2026'}</option>
                            <option value="2026-07">{lang === 'ar' ? 'يوليو - 2026' : 'July - 2026'}</option>
                            <option value="2026-08">{lang === 'ar' ? 'أغسطس - 2026' : 'August - 2026'}</option>
                          </select>
                          <div className="absolute top-1/2 right-3 rtl:left-3 rtl:right-auto -translate-y-1/2 pointer-events-none text-slate-500">
                            <ChevronDown size={12} />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setActiveReport(null)}
                      className="order-first md:order-last w-[35%] sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer shadow-xs active:scale-[0.98] self-start md:self-auto"
                    >
                      {lang === 'ar' ? <ArrowRight size={16} className="shrink-0" /> : <ArrowLeft size={16} className="shrink-0" />}
                      <span>{lang === 'ar' ? 'الرجوع' : 'Back'}</span>
                    </button>
                  </div>

                  {/* Advanced Controls Toolbar */}
                  <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-4 w-full bg-slate-50/50 p-4 border border-slate-150 rounded-2xl text-left rtl:text-right">
                    {/* Left Side: Search Box */}
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2 w-full md:max-w-2xl md:w-[480px] self-end">
                      {/* Date Range filter */}
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 shadow-xs select-none h-[38px] w-full font-bold leading-6 text-base">
                        <Calendar size={13} className="text-orange-500 shrink-0" />
                        <div className="flex items-center gap-0.5 min-w-0 flex-1">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase shrink-0">{lang === 'ar' ? 'من' : 'From'}</span>
                          <input
                            type="date"
                            value={bonusDeductStartDateReport}
                            onChange={e => setBonusDeductStartDateReport(e.target.value)}
                            className="text-[10px] font-sans font-bold text-slate-700 bg-transparent outline-none border-none w-full cursor-pointer focus:text-orange-600 p-0"
                          />
                        </div>
                        <div className="w-[1px] h-3.5 bg-slate-200 shrink-0 mx-1" />
                        <div className="flex items-center gap-0.5 min-w-0 flex-1">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase shrink-0">{lang === 'ar' ? 'إلى' : 'To'}</span>
                          <input
                            type="date"
                            value={bonusDeductEndDateReport}
                            onChange={e => setBonusDeductEndDateReport(e.target.value)}
                            className="text-[10px] font-sans font-bold text-slate-700 bg-transparent outline-none border-none w-full cursor-pointer focus:text-orange-600 p-0"
                          />
                        </div>
                        {(bonusDeductStartDateReport || bonusDeductEndDateReport) && (
                          <button
                            onClick={() => { setBonusDeductStartDateReport(''); setBonusDeductEndDateReport(''); }}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition cursor-pointer shrink-0"
                            title={lang === 'ar' ? 'مسح التاريخ' : 'Clear dates'}
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>

                      <ExportDataButton
                        lang={lang}
                        onToast={triggerHrToast}
                        onCopy={() => triggerHrToast(lang === 'ar' ? 'تم نسخ التقرير لحافظتك' : 'Report copied to clipboard!')}
                        onPrint={() => triggerHrToast(lang === 'ar' ? 'فتح شاشة الطباعة للجزاءات والحوافز' : 'Opening rewards/deductions print setup!')}
                        className="w-full"
                      />

                      {/* Main Search input */}
                      <div className="relative flex items-center h-[38px] w-full">
                        <Search className="absolute left-3 rtl:right-3 text-slate-400 pointer-events-none" size={13} />
                        <input 
                          type="text"
                          value={bonusDeductSearchReport}
                          onChange={e => setBonusDeductSearchReport(e.target.value)}
                          placeholder={lang === 'ar' ? 'البحث بالاسم أو كود الموظف...' : 'Search by name or code...'}
                          className="w-full text-xs p-2.5 pl-9 pr-3.5 rtl:pr-9 rtl:pl-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-400 transition h-[38px] font-sans"
                        />
                        {bonusDeductSearchReport && (
                          <button
                            onClick={() => setBonusDeductSearchReport('')}
                            className="absolute right-3 rtl:left-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-orange-500 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => setIsBonusDeductColumnFiltersOpenReport(!isBonusDeductColumnFiltersOpenReport)}
                        className={cn(
                          "p-2 px-3 text-xs font-black rounded-lg border transition flex items-center justify-center gap-1.5 cursor-pointer select-none whitespace-nowrap h-[38px] min-h-[38px] w-full",
                          isBonusDeductColumnFiltersOpenReport 
                            ? "bg-[#0a1945] text-white border-[#0a1945]" 
                            : "bg-white text-black border-slate-200 hover:border-orange-400 hover:text-orange-500"
                        )}
                        title={lang === 'ar' ? 'بحث متقدم' : 'Advanced Search'}
                      >
                        <Filter size={13} className="text-orange-500" />
                        <span>{lang === 'ar' ? 'بحث متقدم' : 'Advanced Search'}</span>
                      </button>
                    </div>

                    {/* Right Side: Stack of Dropdown + Two Buttons under it */}
                    <div className="flex flex-col gap-2 w-full md:w-[220px]">
                      {/* Top Row: Branch Dropdown - aligned properly and spans full width of the block */}
                      <div className="relative w-full">
                        <button
                          onClick={() => setBonusDeductBranchDropdownOpenReport(!bonusDeductBranchDropdownOpenReport)}
                          className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-white border border-slate-200/90 hover:border-slate-300 text-slate-700 rounded-lg shadow-xs transition duration-150 cursor-pointer text-xs font-semibold select-none h-[38px]"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Building2 className="w-4 h-4 text-orange-500 hover:scale-110 transition" />
                            <span className={lang === 'ar' ? 'font-sans text-[12px] truncate' : 'truncate'}>
                              {selectedBonusDeductBranchesReport.includes('all')
                                ? (lang === 'ar' ? 'كل الفروع' : 'All Branches')
                                : selectedBonusDeductBranchesReport.length === 1
                                ? (lang === 'ar'
                                    ? comBranches.find(b => b.id === selectedBonusDeductBranchesReport[0])?.labelAr
                                    : comBranches.find(b => b.id === selectedBonusDeductBranchesReport[0])?.labelEn)
                                : (lang === 'ar'
                                    ? `محدّد (${selectedBonusDeductBranchesReport.length}) فروع`
                                    : `Selected (${selectedBonusDeductBranchesReport.length}) branches`
                                  )
                              }
                            </span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${bonusDeductBranchDropdownOpenReport ? 'rotate-180 text-orange-500' : ''}`} />
                        </button>

                        {bonusDeductBranchDropdownOpenReport && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setBonusDeductBranchDropdownOpenReport(false)} 
                            />
                            
                            <div className="absolute right-0 left-0 mt-2 w-full bg-white border border-slate-200/90 rounded-2xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100 p-1.5 animate-in fade-in slide-in-from-top-2 duration-150 text-xs text-left rtl:text-right">
                              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                                {lang === 'ar' ? 'تصفية حسب الفرع' : 'Filter by Branch'}
                              </div>
                              <div className="space-y-0.5 pt-1.5">
                                {comBranches.map((branch) => {
                                  const isSelected = selectedBonusDeductBranchesReport.includes(branch.id);
                                  return (
                                    <button
                                      key={branch.id}
                                      onClick={() => {
                                        let updated = [...selectedBonusDeductBranchesReport].filter(id => id !== 'all');
                                        if (isSelected) updated = updated.filter(id => id !== branch.id);
                                        else updated.push(branch.id);
                                        if (updated.length === 0) updated = ['all'];
                                        setSelectedBonusDeductBranchesReport(updated);
                                      }}
                                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors duration-150 cursor-pointer ${
                                        isSelected
                                          ? 'bg-slate-50 text-orange-600 font-bold'
                                          : 'text-slate-600 hover:bg-slate-50/60 hover:text-slate-900'
                                      } flex-row rtl:flex-row-reverse`}
                                    >
                                      <span className={lang === 'ar' ? 'font-sans' : ''}>
                                        {lang === 'ar' ? branch.labelAr : branch.labelEn}
                                      </span>
                                      {isSelected ? (
                                        <Check className="w-4 h-4 text-orange-500 shrink-0" />
                                      ) : (
                                        <div className="w-4 h-4 border border-slate-300 rounded-md shrink-0" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Bottom Row: Toggle View Button + Customize Columns Button */}
                      <div className="flex gap-2 w-full">
                        <div className="relative group flex-1 md:flex-none md:w-[76px]">
                          <button
                            onClick={() => setBonusDeductViewModeReport(bonusDeductViewModeReport === 'table' ? 'kanban' : 'table')}
                            className="w-full flex items-center justify-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-orange-400 hover:text-orange-500 text-slate-655 transition cursor-pointer select-none h-[38px] active:scale-[0.98] shadow-xs"
                          >
                            {bonusDeductViewModeReport === 'table' ? (
                              <>
                                <LayoutGrid size={14} className="text-[#0a1945]" />
                                <span className="text-[11px] font-bold font-sans">
                                  {lang === 'ar' ? 'بطاقات' : 'Cards'}
                                </span>
                              </>
                            ) : (
                              <>
                                <ClipboardList size={14} className="text-orange-500" />
                                <span className="text-[11px] font-bold font-sans">
                                  {lang === 'ar' ? 'جدول' : 'Table'}
                                </span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="relative flex-1">
                          <button 
                            onClick={() => { setTempBonusDeductVisibleColumnsReport({ ...bonusDeductVisibleColumnsReport }); setBonusDeductColumnSettingsOpenReport(!bonusDeductColumnSettingsOpenReport); }}
                            className="w-full flex items-center justify-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-orange-400 hover:text-orange-500 text-slate-655 transition cursor-pointer select-none h-[38px] active:scale-[0.98] shadow-xs"
                          >
                            <Settings size={14} className="text-orange-500" />
                            <span className="text-[11px] font-bold font-sans">
                              {lang === 'ar' ? 'الأعمدة' : 'Columns'}
                            </span>
                          </button>
                          
                          {bonusDeductColumnSettingsOpenReport && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setBonusDeductColumnSettingsOpenReport(false)} />
                              <div className="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-2xl p-3.5 text-xs z-50 animate-fadeIn text-left rtl:text-right">
                                <div className="pb-2 border-b border-slate-100 mb-2.5">
                                  <h5 className="font-extrabold text-slate-800 text-[12px] text-left rtl:text-right">{lang === 'ar' ? 'اختر الأعمدة' : 'Choose Columns'}</h5>
                                </div>
                                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                                  {Object.entries({
                                    empId: { en: 'Emp ID', ar: 'كود الموظف' },
                                    name: { en: 'Staff Member', ar: 'اسم الموظف' },
                                    type: { en: 'Type', ar: 'نوع القيد' },
                                    amount: { en: 'Amount', ar: 'المبلغ' },
                                    reasonAr: { en: 'Description', ar: 'البيان بالعربية' },
                                    reasonEn: { en: 'Description (EN)', ar: 'البيان بالإنجليزية' },
                                    date: { en: 'Date', ar: 'التاريخ' }
                                  }).map(([key, label]) => (
                                    <label key={key} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-slate-900 text-slate-600 flex-row rtl:flex-row-reverse justify-between">
                                      <span className={lang === 'ar' ? 'font-sans' : ''}>{lang === 'ar' ? label.ar : label.en}</span>
                                      <input 
                                        type="checkbox" 
                                        checked={tempBonusDeductVisibleColumnsReport[key]} 
                                        onChange={(e) => setTempBonusDeductVisibleColumnsReport(prev => ({ ...prev, [key]: e.target.checked }))}
                                        className="rounded border border-slate-300 text-orange-500 focus:ring-orange-500 w-3.5 h-3.5"
                                      />
                                    </label>
                                  ))}
                                </div>
                                <div className="mt-3.5 pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5 font-sans">
                                  <button onClick={() => setBonusDeductColumnSettingsOpenReport(false)} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase transition">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                                  <button 
                                    onClick={() => { setBonusDeductVisibleColumnsReport({ ...tempBonusDeductVisibleColumnsReport }); setBonusDeductColumnSettingsOpenReport(false); triggerHrToast(lang === 'ar' ? 'تم تطبيق خيارات أعمدة الجزاءات والحوافز بنجاح' : 'Rewards layout applied!'); }}
                                    className="px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[10px] font-bold transition shadow-xs cursor-pointer uppercase"
                                  >
                                    {lang === 'ar' ? 'تطبيق' : 'Apply'}
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* KPIs & Data Grid */}
                  {(() => {
                    const combinedList = [
                      ...bonusesList.map(b => ({ ...b, txType: 'Bonus', actualAmount: b.amount })),
                      ...deductionsList.map(d => ({ ...d, txType: 'Deduction', actualAmount: -d.amount }))
                    ];

                    const mapped = combinedList.map(item => {
                      const emp = staff.find(s => s.id === item.empId) || staff[0];
                      const empNum = emp ? (parseInt(emp.id.replace(/\D/g, '')) || 1) : 1;
                      const branchId = empNum % 3 === 0 ? 'mamar' : empNum % 3 === 1 ? 'theater' : 'zaghloul';
                      return { item, emp, branchId };
                    });

                    const filteredData = mapped.filter(row => {
                      const query = bonusDeductSearchReport.toLowerCase().trim();
                      if (query) {
                        const hasMatch = row.item.empId.toLowerCase().includes(query) || 
                                         (row.emp && row.emp.name.toLowerCase().includes(query)) || 
                                         (row.emp && row.emp.nameAr && row.emp.nameAr.toLowerCase().includes(query)) ||
                                         (row.item.reasonEn || '').toLowerCase().includes(query) ||
                                         (row.item.reasonAr || '').toLowerCase().includes(query);
                        if (!hasMatch) return false;
                      }

                      const idNum = parseInt(row.item.id.replace(/\D/g, '')) || 1;
                      const simMonth = idNum % 3 === 0 ? '05' : idNum % 3 === 1 ? '06' : '07';
                      const recDate = row.item.date ? row.item.date : `2026-${simMonth}-15`;

                      if (bonusDeductStartDateReport || bonusDeductEndDateReport) {
                        if (bonusDeductStartDateReport && recDate < bonusDeductStartDateReport) return false;
                        if (bonusDeductEndDateReport && recDate > bonusDeductEndDateReport) return false;
                      }

                      if (reportMonthBonusDeduct !== 'all') {
                        if (!recDate.startsWith(reportMonthBonusDeduct)) return false;
                      }

                      if (!selectedBonusDeductBranchesReport.includes('all') && !selectedBonusDeductBranchesReport.includes(row.branchId)) return false;

                      // Advanced grid-column live search filters
                      if (bdColSearchEmpId && !row.item.empId.toLowerCase().includes(bdColSearchEmpId.toLowerCase().trim())) return false;
                      if (bdColSearchName) {
                        const q = bdColSearchName.toLowerCase().trim();
                        const match = row.emp && (row.emp.name.toLowerCase().includes(q) || (row.emp.nameAr || '').toLowerCase().includes(q));
                        if (!match) return false;
                      }
                      return true;
                    });

                    // KPIs
                    const totalBonuses = bonusesList.reduce((acc, b) => acc + b.amount, 0);
                    const totalDeductions = deductionsList.reduce((acc, d) => acc + d.amount, 0);
                    const netImpact = totalBonuses - totalDeductions;

                    // Pagination
                    const pageSize = bonusDeductPageSizeReport;
                    const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
                    const activePage = Math.min(bonusDeductCurrentPageReport, totalPages);
                    const stIdx = (activePage - 1) * pageSize;
                    const paginatedBonusDeductData = filteredData.slice(stIdx, stIdx + pageSize);

                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full select-none text-left rtl:text-right">
                          <div className="bg-[#0a1945] rounded-[24px] p-5 text-white shadow-xs flex flex-col justify-between min-h-[120px]">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-300 text-xs font-bold uppercase tracking-wider">{lang === 'ar' ? 'إجمالي الحوافز المعتمدة' : 'Total Performance Bonuses'}</span>
                              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400 shrink-0"><Gift size={15} /></div>
                            </div>
                            <div className="mt-3">
                              <span className="text-2xl font-black font-mono tracking-tight text-white block leading-none">{totalBonuses.toLocaleString()} <span className="text-xs">EGP</span></span>
                              <p className="text-[10px] text-emerald-300 mt-1.5 font-bold">{lang === 'ar' ? 'إضافات تسير بشكل إيجابي' : 'Bonus processing completed'}</p>
                            </div>
                          </div>

                          <div className="bg-white rounded-[24px] p-5 border border-slate-150 shadow-xs flex flex-col justify-between min-h-[120px]">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{lang === 'ar' ? 'إجمالي الخصومات والتدابير' : 'Total Applied Deductions'}</span>
                              <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0"><X size={15} /></div>
                            </div>
                            <div className="mt-3">
                              <span className="text-2xl font-black text-rose-600 block leading-none font-mono">{totalDeductions.toLocaleString()} <span className="text-xs text-slate-500">EGP</span></span>
                              <p className="text-[10px] text-slate-450 mt-1.5 font-bold">{lang === 'ar' ? 'مسجلة بقرارات إدارية' : 'Penalty adjustments registered'}</p>
                            </div>
                          </div>

                          <div className="bg-white rounded-[24px] p-5 border border-slate-150 shadow-xs flex flex-col justify-between min-h-[120px]">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{lang === 'ar' ? 'صافي أثر الدفعة الكلي' : 'Net Accruals Balance'}</span>
                              <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0"><DollarSign size={15} /></div>
                            </div>
                            <div className="mt-3">
                              <span className={cn("text-2xl font-black block leading-none font-mono", netImpact >= 0 ? "text-emerald-600" : "text-rose-600")}>{netImpact.toLocaleString()} <span className="text-xs text-slate-500">EGP</span></span>
                              <p className="text-[10px] text-slate-455 mt-1.5 font-bold">{lang === 'ar' ? 'الأثر المالي المباشر' : 'Net fiscal impact'}</p>
                            </div>
                          </div>
                        </div>

                        {bonusDeductViewModeReport === 'table' ? (
                          <>
                            {/* Desktop View Table */}
                            <div className="hidden md:block bg-white border border-slate-150 rounded-2xl shadow-xs overflow-hidden w-full">
                              <div className="overflow-x-auto w-full">
                                <table className="w-full text-left rtl:text-right border-collapse">
                                  <thead className="bg-[#f97316] text-[11px] text-white font-bold uppercase tracking-wider h-10 border-b border-orange-600">
                                    <tr>
                                      {bonusDeductVisibleColumnsReport.empId && <th className="py-2.5 px-4 text-center text-white">{lang === 'ar' ? 'كود الموظف' : 'Emp ID'}</th>}
                                      {bonusDeductVisibleColumnsReport.name && <th className="py-2.5 px-4 text-white">{lang === 'ar' ? 'اسم الموظف' : 'Staff Member'}</th>}
                                      {bonusDeductVisibleColumnsReport.type && <th className="py-2.5 px-4 text-white">{lang === 'ar' ? 'النوع' : 'Type'}</th>}
                                      {bonusDeductVisibleColumnsReport.amount && <th className="py-2.5 px-4 text-right text-white">{lang === 'ar' ? 'القيمة' : 'Amount'}</th>}
                                      {bonusDeductVisibleColumnsReport.reasonAr && <th className="py-2.5 px-4 text-white">{lang === 'ar' ? 'البيان' : 'Notes'}</th>}
                                      {bonusDeductVisibleColumnsReport.date && <th className="py-2.5 px-4 text-white bg-[#ea580c]">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>}
                                    </tr>
                                    {isBonusDeductColumnFiltersOpenReport && (
                                      <tr className="bg-slate-50 border-t border-slate-150 h-9 font-sans">
                                        {bonusDeductVisibleColumnsReport.empId && <td className="p-1 px-2.5"><input type="text" value={bdColSearchEmpId} onChange={e => setBdColSearchEmpId(e.target.value)} placeholder="ID..." className="w-full p-1 text-[10px] bg-white border border-slate-200 rounded outline-none" /></td>}
                                        {bonusDeductVisibleColumnsReport.name && <td className="p-1 px-2.5"><input type="text" value={bdColSearchName} onChange={e => setBdColSearchName(e.target.value)} placeholder="Search..." className="w-full p-1 text-[10px] bg-white border border-slate-200 rounded outline-none" /></td>}
                                        {bonusDeductVisibleColumnsReport.type && <td></td>}
                                        {bonusDeductVisibleColumnsReport.amount && <td></td>}
                                        {bonusDeductVisibleColumnsReport.reasonAr && <td></td>}
                                        {bonusDeductVisibleColumnsReport.date && <td className="bg-slate-100"></td>}
                                      </tr>
                                    )}
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-sans">
                                    {paginatedBonusDeductData.map(row => {
                                      const branchLabel = row.branchId === 'mamar' ? (lang === 'ar' ? 'الممر' : 'Al-Mamar') : row.branchId === 'theater' ? (lang === 'ar' ? 'المسرح الروماني' : 'Roman Theater') : (lang === 'ar' ? 'سعد زغلول' : 'Saad Zaghloul');
                                      const idNum = parseInt(row.item.id.replace(/\D/g, '')) || 1;
                                      const simMonth = idNum % 3 === 0 ? '05' : idNum % 3 === 1 ? '06' : '07';
                                      const recDate = row.item.date ? row.item.date : `2026-${simMonth}-15`;

                                      return (
                                        <tr key={row.item.id} className="hover:bg-slate-50/40 transition">
                                          {bonusDeductVisibleColumnsReport.empId && <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-500 bg-slate-50/30">{row.item.empId}</td>}
                                          {bonusDeductVisibleColumnsReport.name && (
                                            <td className="py-2.5 px-4 font-extrabold text-slate-800">
                                              <div>{row.emp ? (lang === 'ar' ? (row.emp.nameAr || row.emp.name) : row.emp.name) : 'Biometric ID'}</div>
                                              <div className="text-[10px] text-orange-500 mt-0.5 font-sans font-semibold">{branchLabel}</div>
                                            </td>
                                          )}
                                          {bonusDeductVisibleColumnsReport.type && (
                                            <td className="py-2.5 px-4">
                                              <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black", row.item.txType === 'Bonus' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800')}>
                                                {row.item.txType === 'Bonus' ? (lang === 'ar' ? 'مكافأة' : 'Bonus') : (lang === 'ar' ? 'خصم مالي' : 'Deductive')}
                                              </span>
                                            </td>
                                          )}
                                          {bonusDeductVisibleColumnsReport.amount && (
                                            <td className={cn("py-2.5 px-4 text-right font-mono font-extrabold", row.item.txType === 'Bonus' ? 'text-emerald-600' : 'text-rose-600')}>
                                              {row.item.txType === 'Bonus' ? '+' : ''}{row.item.actualAmount.toLocaleString()} EGP
                                            </td>
                                          )}
                                          {bonusDeductVisibleColumnsReport.reasonAr && <td className="py-2.5 px-4 text-slate-600 font-semibold">{lang === 'ar' ? row.item.reasonAr : row.item.reasonEn}</td>}
                                          {bonusDeductVisibleColumnsReport.date && <td className="py-2.5 px-4 font-mono text-slate-500 bg-orange-50/10">{recDate}</td>}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Mobile View Cards */}
                            <div className="block md:hidden space-y-4">
                              {paginatedBonusDeductData.map(row => {
                                const branchLabel = row.branchId === 'mamar' ? (lang === 'ar' ? 'الممر' : 'Al-Mamar') : row.branchId === 'theater' ? (lang === 'ar' ? 'المسرح الروماني' : 'Roman Theater') : (lang === 'ar' ? 'سعد زغلول' : 'Saad Zaghloul');
                                const idNum = parseInt(row.item.id.replace(/\D/g, '')) || 1;
                                const simMonth = idNum % 3 === 0 ? '05' : idNum % 3 === 1 ? '06' : '07';
                                const recDate = row.item.date ? row.item.date : `2026-${simMonth}-15`;

                                return (
                                  <div key={row.item.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 text-right rtl:text-right">
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-2 flex-row rtl:flex-row-reverse">
                                      <div className="text-left rtl:text-right">
                                        <h4 className="font-extrabold text-[#0a1945] text-sm">{row.emp ? (lang === 'ar' ? (row.emp.nameAr || row.emp.name) : row.emp.name) : 'Staff Member'}</h4>
                                        <p className="text-[10px] text-orange-500 font-semibold">{branchLabel}</p>
                                      </div>
                                      <span className="text-xs font-black text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-md">{row.item.empId}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-right rtl:text-right">
                                      <div>
                                        <span className="text-slate-400 block text-[9px]">{lang === 'ar' ? 'النوع' : 'Type'}</span>
                                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black mt-0.5", row.item.txType === 'Bonus' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800')}>
                                          {row.item.txType === 'Bonus' ? (lang === 'ar' ? 'مكافأة' : 'Bonus') : (lang === 'ar' ? 'خصم' : 'Deductive')}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 block text-[9px]">{lang === 'ar' ? 'التاريخ' : 'Date'}</span>
                                        <span className="font-bold text-slate-700 font-mono">{recDate}</span>
                                      </div>
                                    </div>
                                    <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-right rtl:text-right">
                                      <span className="text-slate-500 block text-[9px]">{lang === 'ar' ? 'البيان' : 'Notes'}</span>
                                      <span className="font-semibold text-slate-700">{lang === 'ar' ? row.item.reasonAr : row.item.reasonEn}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 flex-row rtl:flex-row-reverse">
                                      <span className="text-xs font-bold text-slate-500">{lang === 'ar' ? 'القيمة:' : 'Amount:'}</span>
                                      <span className={cn("text-sm font-black font-mono", row.item.txType === 'Bonus' ? 'text-emerald-600' : 'text-rose-600')}>
                                        {row.item.txType === 'Bonus' ? '+' : ''}{row.item.actualAmount.toLocaleString()} EGP
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {paginatedBonusDeductData.map(row => {
                              const branchLabel = row.branchId === 'mamar' ? (lang === 'ar' ? 'فرع الممر' : 'Al-Mamar') : row.branchId === 'theater' ? (lang === 'ar' ? 'فرع المسرح الروماني' : 'Roman Theater') : (lang === 'ar' ? 'فرع سعد زغلول' : 'Saad Zaghloul');
                              return (
                                <div key={row.item.id} className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col justify-between hover:shadow-xs transition">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="text-[9px] font-mono text-slate-400 font-bold">{row.item.empId}</span>
                                      <h4 className="text-xs font-black text-[#0a1945] leading-tight mt-0.5">{row.emp ? (lang === 'ar' ? (row.emp.nameAr || row.emp.name) : row.emp.name) : 'Staff Member'}</h4>
                                      <p className="text-[10px] text-slate-455 mt-0.5 font-bold">{branchLabel}</p>
                                    </div>
                                    <span className={cn("px-2 py-0.5 border text-[9px] font-bold rounded", row.item.txType === 'Bonus' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>{row.item.txType}</span>
                                  </div>
                                  <div className="border-t border-slate-100 pt-2.5 mt-3 flex items-center justify-between font-mono text-xs font-extrabold text-slate-550">
                                    <span className="max-w-[120px] truncate">{lang === 'ar' ? row.item.reasonAr : row.item.reasonEn}</span>
                                    <span className={row.item.txType === 'Bonus' ? 'text-emerald-600' : 'text-rose-600'}>{row.item.actualAmount.toLocaleString()} EGP</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Dynamic Pagination Controls with orange/navy theme details */}
                        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 font-sans text-xs text-slate-655">
                          {/* 1. Showing elements counter range */}
                          <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                            {lang === 'ar' ? (
                              <>
                                <span>عرض</span>
                                <span className="font-extrabold text-[#0a1945] font-mono bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                                  {paginatedBonusDeductData.length}
                                </span>
                                <span>من أصل</span>
                                <span className="font-extrabold text-orange-655 font-mono bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                                  {filteredData.length}
                                </span>
                              </>
                            ) : (
                              <>
                                <span>Show</span>
                                <span className="font-extrabold text-[#0a1945] font-mono bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                                  {paginatedBonusDeductData.length}
                                </span>
                                <span>of</span>
                                <span className="font-extrabold text-orange-655 font-mono bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                                  {filteredData.length}
                                </span>
                              </>
                            )}
                          </div>

                          {/* 2. Numerical Pagination Items */}
                          <div className="flex items-center gap-1 shrink-0 select-none">
                            {/* Previous Page arrow */}
                            <button
                              type="button"
                              disabled={activePage === 1}
                              onClick={() => setBonusDeductCurrentPageReport(prev => Math.max(1, prev - 1))}
                              className="p-2 border border-slate-200 hover:border-orange-400 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-655 hover:text-orange-500 hover:bg-orange-50/20 transition cursor-pointer h-8 w-8 flex items-center justify-center shadow-xs"
                              title={lang === 'ar' ? 'الصفحة السابقة' : 'Previous page'}
                            >
                              {lang === 'ar' ? <ChevronRight size={13} strokeWidth={2.5} /> : <ChevronLeft size={13} strokeWidth={2.5} />}
                            </button>

                            {/* Pages links */}
                            <div className="flex items-center gap-1">
                              {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map(page => {
                                const isActive = page === activePage;
                                return (
                                  <button
                                    key={page}
                                    type="button"
                                    onClick={() => setBonusDeductCurrentPageReport(page)}
                                    className={cn(
                                      "w-8 h-8 rounded-lg font-extrabold transition cursor-pointer text-xs flex items-center justify-center border font-mono shadow-xs",
                                      isActive
                                        ? "bg-[#0a1945] text-white border-[#0a1945]"
                                        : "bg-white text-slate-700 border-slate-200 hover:border-orange-400 hover:text-orange-500"
                                    )}
                                  >
                                    {page}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Next Page arrow */}
                            <button
                              type="button"
                              disabled={activePage === totalPages}
                              onClick={() => setBonusDeductCurrentPageReport(prev => Math.min(totalPages, prev + 1))}
                              className="p-2 border border-slate-200 hover:border-orange-400 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-655 hover:text-orange-500 hover:bg-orange-50/20 transition cursor-pointer h-8 w-8 flex items-center justify-center shadow-xs"
                              title={lang === 'ar' ? 'الصفحة التالية' : 'Next page'}
                            >
                              {lang === 'ar' ? <ChevronLeft size={13} strokeWidth={2.5} /> : <ChevronRight size={13} strokeWidth={2.5} />}
                            </button>
                          </div>

                          {/* 3. Page Size Dropdown */}
                          <div className="flex items-center gap-2 text-slate-500 font-bold shrink-0">
                            <span>{lang === 'ar' ? 'عرض' : 'Show'}</span>
                            <select
                              value={bonusDeductPageSizeReport}
                              onChange={(e) => {
                                setBonusDeductPageSizeReport(Number(e.target.value));
                                setBonusDeductCurrentPageReport(1);
                              }}
                              className="bg-white border border-slate-200 text-[#0a1945] rounded-xl px-2 py-1.5 text-xs font-black shadow-xs outline-none focus:border-orange-400 cursor-pointer w-16 text-center"
                            >
                              {[5, 10, 20, 50, 100].map(sz => (
                                <option key={sz} value={sz} className="font-bold">
                                  {sz}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : activeReport === 'disbursals' ? (
                <div className="space-y-6 animate-fadeIn text-left rtl:text-right">
                  {/* Header Box */}
                  <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left rtl:text-right">
                    <div className="rtl:text-right text-left flex flex-col shrink-0">
                      <div className="flex items-center gap-2.5">
                        <Receipt className="text-orange-500" size={18} />
                        <h3 className="text-md font-bold text-[#0a1945] flex items-center gap-1.5 font-sans">
                          <span>{lang === 'ar' ? 'تقرير أذونات صرف رواتب وسلف الموظفين' : 'Employee Salary & Advances Disbursals Report'}</span>
                        </h3>
                        <span className="text-[12px] leading-[16px] text-center bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full border border-slate-200 font-mono">
                          {lang === 'ar' ? `${disbursalsList.length} إذن صرف` : `${disbursalsList.length} orders`}
                        </span>
                      </div>
                      
                      {/* Month filter select right below title */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2 w-full max-w-sm">
                        <span className="text-xs font-bold text-slate-500 shrink-0">{lang === 'ar' ? 'تصفية بالشهر:' : 'Filter by Month:'}</span>
                        <div className="relative w-full sm:w-44">
                          <select
                            value={reportMonthDisbursals}
                            onChange={(e) => {
                              setReportMonthDisbursals(e.target.value);
                              setDisbursalsCurrentPageReport(1);
                            }}
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-400 font-bold text-[#0a1945] cursor-pointer appearance-none pr-8 pl-8 rtl:pr-8 rtl:pl-8 font-sans"
                          >
                            <option value="all">{lang === 'ar' ? 'كل الأشهر' : 'All Months'}</option>
                            <option value="2026-05">{lang === 'ar' ? 'مايو - 2026' : 'May - 2026'}</option>
                            <option value="2026-06">{lang === 'ar' ? 'يونيو - 2026' : 'June - 2026'}</option>
                            <option value="2026-07">{lang === 'ar' ? 'يوليو - 2026' : 'July - 2026'}</option>
                            <option value="2026-08">{lang === 'ar' ? 'أغسطس - 2026' : 'August - 2026'}</option>
                          </select>
                          <div className="absolute top-1/2 right-3 rtl:left-3 rtl:right-auto -translate-y-1/2 pointer-events-none text-slate-500">
                            <ChevronDown size={12} />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setActiveReport(null)}
                      className="order-first md:order-last w-[35%] sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer shadow-xs active:scale-[0.98] font-sans self-start md:self-auto"
                    >
                      {lang === 'ar' ? <ArrowRight size={16} className="shrink-0" /> : <ArrowLeft size={16} className="shrink-0" />}
                      <span>{lang === 'ar' ? 'الرجوع' : 'Back'}</span>
                    </button>
                  </div>

                  {/* Advanced Controls Toolbar */}
                  <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-4 w-full bg-slate-50/50 p-4 border border-slate-150 rounded-2xl text-left rtl:text-right">
                    {/* Left Side: Search & Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2 w-full md:max-w-2xl md:w-[480px] self-end">
                      {/* Date Range filter */}
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 shadow-xs select-none h-[38px] w-full font-bold leading-6 text-base">
                        <Calendar size={13} className="text-orange-500 shrink-0" />
                        <div className="flex items-center gap-0.5 min-w-0 flex-1">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase shrink-0">{lang === 'ar' ? 'من' : 'From'}</span>
                          <input
                            type="date"
                            value={disbursalsStartDateReport}
                            onChange={e => { setDisbursalsStartDateReport(e.target.value); setDisbursalsCurrentPageReport(1); }}
                            className="text-[10px] font-sans font-bold text-slate-700 bg-transparent outline-none border-none w-full cursor-pointer focus:text-orange-600 p-0"
                          />
                        </div>
                        <div className="w-[1px] h-3.5 bg-slate-200 shrink-0 mx-1" />
                        <div className="flex items-center gap-0.5 min-w-0 flex-1">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase shrink-0">{lang === 'ar' ? 'إلى' : 'To'}</span>
                          <input
                            type="date"
                            value={disbursalsEndDateReport}
                            onChange={e => { setDisbursalsEndDateReport(e.target.value); setDisbursalsCurrentPageReport(1); }}
                            className="text-[10px] font-sans font-bold text-slate-700 bg-transparent outline-none border-none w-full cursor-pointer focus:text-orange-600 p-0"
                          />
                        </div>
                        {(disbursalsStartDateReport || disbursalsEndDateReport) && (
                          <button
                            onClick={() => { setDisbursalsStartDateReport(''); setDisbursalsEndDateReport(''); setDisbursalsCurrentPageReport(1); }}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition cursor-pointer shrink-0"
                            title={lang === 'ar' ? 'مسح التاريخ' : 'Clear dates'}
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>

                      <ExportDataButton
                        lang={lang}
                        onToast={triggerHrToast}
                        onCopy={() => triggerHrToast(lang === 'ar' ? 'تم نسخ التقرير لحافظتك' : 'Report copied to clipboard!')}
                        onPrint={() => triggerHrToast(lang === 'ar' ? 'فتح شاشة الطباعة لتقرير صرف الرواتب' : 'Opening salary disbursals print setup!')}
                        className="w-full"
                      />

                      {/* Main Search input */}
                      <div className="relative flex items-center h-[38px] w-full">
                        <Search className="absolute left-3 rtl:right-3 text-slate-400 pointer-events-none" size={13} />
                        <input 
                          type="text"
                          value={disbursalsSearchReport}
                          onChange={e => { setDisbursalsSearchReport(e.target.value); setDisbursalsCurrentPageReport(1); }}
                          placeholder={lang === 'ar' ? 'البحث بالاسم أو كود الموظف...' : 'Search by name or code...'}
                          className="w-full text-xs p-2.5 pl-9 pr-3.5 rtl:pr-9 rtl:pl-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-400 transition h-[38px] font-sans"
                        />
                        {disbursalsSearchReport && (
                          <button
                            onClick={() => { setDisbursalsSearchReport(''); setDisbursalsCurrentPageReport(1); }}
                            className="absolute right-3 rtl:left-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-orange-500 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => setIsDisbursalsColumnFiltersOpenReport(!isDisbursalsColumnFiltersOpenReport)}
                        className={cn(
                          "p-2 px-3 text-xs font-black rounded-lg border transition flex items-center justify-center gap-1.5 cursor-pointer select-none whitespace-nowrap h-[38px] min-h-[38px] w-full font-sans",
                          isDisbursalsColumnFiltersOpenReport 
                            ? "bg-[#0a1945] text-white border-[#0a1945]" 
                            : "bg-white text-black border-slate-200 hover:border-orange-400 hover:text-orange-500"
                        )}
                        title={lang === 'ar' ? 'بحث متقدم' : 'Advanced Search'}
                      >
                        <Filter size={13} className="text-orange-500" />
                        <span>{lang === 'ar' ? 'بحث متقدم' : 'Advanced Search'}</span>
                      </button>
                    </div>

                    {/* Right Side: Stack of Dropdown + Two Buttons under it */}
                    <div className="flex flex-col gap-2 w-full md:w-[220px]">
                      {/* Top Row: Branch Dropdown */}
                      <div className="relative w-full">
                        <button
                          onClick={() => setDisbursalsBranchDropdownOpenReport(!disbursalsBranchDropdownOpenReport)}
                          className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-white border border-slate-200/90 hover:border-slate-300 text-slate-700 rounded-lg shadow-xs transition duration-150 cursor-pointer text-xs font-semibold select-none h-[38px]"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Building2 className="w-4 h-4 text-orange-500 hover:scale-110 transition" />
                            <span className={lang === 'ar' ? 'font-sans text-[12px] truncate' : 'truncate'}>
                              {selectedDisbursalsBranchesReport.includes('all')
                                ? (lang === 'ar' ? 'كل الفروع' : 'All Branches')
                                : selectedDisbursalsBranchesReport.length === 1
                                ? (lang === 'ar'
                                    ? comBranches.find(b => b.id === selectedDisbursalsBranchesReport[0])?.labelAr
                                    : comBranches.find(b => b.id === selectedDisbursalsBranchesReport[0])?.labelEn)
                                : (lang === 'ar'
                                    ? `محدّد (${selectedDisbursalsBranchesReport.length}) فروع`
                                    : `Selected (${selectedDisbursalsBranchesReport.length}) branches`
                                  )
                              }
                            </span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${disbursalsBranchDropdownOpenReport ? 'rotate-180 text-orange-500' : ''}`} />
                        </button>

                        {disbursalsBranchDropdownOpenReport && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setDisbursalsBranchDropdownOpenReport(false)} 
                            />
                            
                            <div className="absolute right-0 left-0 mt-2 w-full bg-white border border-slate-200/90 rounded-2xl shadow-xl z-25 overflow-hidden divide-y divide-slate-100 p-1.5 animate-in fade-in slide-in-from-top-2 duration-150 text-xs text-left rtl:text-right">
                              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                                {lang === 'ar' ? 'تصفية حسب الفرع' : 'Filter by Branch'}
                              </div>
                              <div className="space-y-0.5 pt-1.5 font-sans">
                                {comBranches.map((branch) => {
                                  const isSelected = selectedDisbursalsBranchesReport.includes(branch.id);
                                  return (
                                    <button
                                      key={branch.id}
                                      onClick={() => {
                                        let updated = [...selectedDisbursalsBranchesReport].filter(id => id !== 'all');
                                        if (isSelected) updated = updated.filter(id => id !== branch.id);
                                        else updated.push(branch.id);
                                        if (updated.length === 0) updated = ['all'];
                                        setSelectedDisbursalsBranchesReport(updated);
                                        setDisbursalsCurrentPageReport(1);
                                      }}
                                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors duration-150 cursor-pointer ${
                                        isSelected
                                          ? 'bg-slate-50 text-orange-600 font-bold'
                                          : 'text-slate-600 hover:bg-slate-50/60 hover:text-slate-900'
                                      } flex-row rtl:flex-row-reverse`}
                                    >
                                      <span className={lang === 'ar' ? 'font-sans' : ''}>
                                        {lang === 'ar' ? branch.labelAr : branch.labelEn}
                                      </span>
                                      {isSelected ? (
                                        <Check className="w-4 h-4 text-orange-500 shrink-0" />
                                      ) : (
                                        <div className="w-4 h-4 border border-slate-300 rounded-md shrink-0" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Bottom Row: Toggle View Button + Customize Columns Button */}
                      <div className="flex gap-2 w-full">
                        <div className="relative group flex-1 md:flex-none md:w-[76px]">
                          <button
                            onClick={() => setDisbursalsViewModeReport(disbursalsViewModeReport === 'table' ? 'kanban' : 'table')}
                            className="w-full flex items-center justify-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-orange-400 hover:text-orange-500 text-slate-655 transition cursor-pointer select-none h-[38px] active:scale-[0.98] shadow-xs"
                          >
                            {disbursalsViewModeReport === 'table' ? (
                              <>
                                <LayoutGrid size={14} className="text-[#0a1945]" />
                                <span className="text-[11px] font-bold font-sans">
                                  {lang === 'ar' ? 'بطاقات' : 'Cards'}
                                </span>
                              </>
                            ) : (
                              <>
                                <ClipboardList size={14} className="text-orange-500" />
                                <span className="text-[11px] font-bold font-sans">
                                  {lang === 'ar' ? 'جدول' : 'Table'}
                                </span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="relative flex-1">
                          <button 
                            onClick={() => { setTempDisbursalsVisibleColumnsReport({ ...disbursalsVisibleColumnsReport }); setDisbursalsColumnSettingsOpenReport(!disbursalsColumnSettingsOpenReport); }}
                            className="w-full flex items-center justify-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-orange-400 hover:text-orange-500 text-slate-655 transition cursor-pointer select-none h-[38px] active:scale-[0.98] shadow-xs"
                          >
                            <Settings size={14} className="text-orange-500" />
                            <span className="text-[11px] font-bold font-sans">
                              {lang === 'ar' ? 'الأعمدة' : 'Columns'}
                            </span>
                          </button>
                          
                          {disbursalsColumnSettingsOpenReport && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setDisbursalsColumnSettingsOpenReport(false)} />
                              <div className="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-2xl p-3.5 text-xs z-50 animate-fadeIn text-left rtl:text-right">
                                <div className="pb-2 border-b border-slate-100 mb-2.5">
                                  <h5 className="font-extrabold text-slate-800 text-[12px] text-left rtl:text-right font-sans">{lang === 'ar' ? 'اختر الأعمدة' : 'Choose Columns'}</h5>
                                </div>
                                <div className="space-y-2.5 max-h-72 overflow-y-auto font-sans">
                                  {Object.entries({
                                    id: { en: 'Order ID', ar: 'رقم الإذن' },
                                    empId: { en: 'Emp ID', ar: 'كود الموظف' },
                                    name: { en: 'Staff Member', ar: 'اسم الموظف' },
                                    type: { en: 'Type', ar: 'نوع الصرف' },
                                    safeName: { en: 'Safe', ar: 'الخزينة' },
                                    amount: { en: 'Amount', ar: 'المبلغ' },
                                    date: { en: 'Date', ar: 'التاريخ' },
                                    salaryMonth: { en: 'Salary Month', ar: 'شهر الراتب' }
                                  }).map(([key, label]) => (
                                    <label key={key} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-slate-900 text-slate-600 flex-row rtl:flex-row-reverse justify-between">
                                      <span className={lang === 'ar' ? 'font-sans' : ''}>{lang === 'ar' ? label.ar : label.en}</span>
                                      <input 
                                        type="checkbox" 
                                        checked={tempDisbursalsVisibleColumnsReport[key]} 
                                        onChange={(e) => setTempDisbursalsVisibleColumnsReport(prev => ({ ...prev, [key]: e.target.checked }))}
                                        className="rounded border border-slate-300 text-[#0a1945] focus:ring-[#0a1945] w-3.5 h-3.5"
                                      />
                                    </label>
                                  ))}
                                </div>
                                <div className="mt-3.5 pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5 font-sans">
                                  <button onClick={() => setDisbursalsColumnSettingsOpenReport(false)} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase transition">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                                  <button 
                                    onClick={() => { setDisbursalsVisibleColumnsReport({ ...tempDisbursalsVisibleColumnsReport }); setDisbursalsColumnSettingsOpenReport(false); triggerHrToast(lang === 'ar' ? 'تم تطبيق خيارات الأعمدة بنجاح' : 'Columns layout applied!'); }}
                                    className="px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[10px] font-bold transition shadow-xs cursor-pointer uppercase"
                                  >
                                    {lang === 'ar' ? 'تطبيق' : 'Apply'}
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Calculations & Rendering for Disbursals report */}
                  {(() => {
                    // Filter the original disbursalsList
                    const filtered = disbursalsList.filter(d => {
                      const emp = staff.find(s => s.id === d.empId);
                      const branchId = emp ? emp.branchId : '';
                      const empName = emp ? (lang === 'ar' ? emp.nameAr : emp.name) : '';
                      
                      // 1. Month filter
                      if (reportMonthDisbursals !== 'all') {
                        // Check if d.date or d.salaryMonth matches
                        const dateMonth = d.date.substring(0, 7);
                        const salMonth = d.salaryMonth || '';
                        if (dateMonth !== reportMonthDisbursals && salMonth !== reportMonthDisbursals) {
                          return false;
                        }
                      }

                      // 2. Date Range filter
                      if (disbursalsStartDateReport && d.date < disbursalsStartDateReport) return false;
                      if (disbursalsEndDateReport && d.date > disbursalsEndDateReport) return false;

                      // 3. Branch filter
                      if (!selectedDisbursalsBranchesReport.includes('all')) {
                        if (!selectedDisbursalsBranchesReport.includes(branchId)) return false;
                      }

                      // 4. Main Search text
                      if (disbursalsSearchReport) {
                        const q = disbursalsSearchReport.toLowerCase();
                        const matchId = d.id.toLowerCase().includes(q);
                        const matchEmpId = d.empId.toLowerCase().includes(q);
                        const matchName = empName.toLowerCase().includes(q);
                        const matchSafe = d.safeName.toLowerCase().includes(q);
                        if (!matchId && !matchEmpId && !matchName && !matchSafe) return false;
                      }

                      // 5. Advanced column-specific filters
                      if (isDisbursalsColumnFiltersOpenReport) {
                        if (dbColSearchId && !d.id.toLowerCase().includes(dbColSearchId.toLowerCase())) return false;
                        if (dbColSearchEmpId && !d.empId.toLowerCase().includes(dbColSearchEmpId.toLowerCase())) return false;
                        if (dbColSearchName && !empName.toLowerCase().includes(dbColSearchName.toLowerCase())) return false;
                        if (dbColSearchSafeName && !d.safeName.toLowerCase().includes(dbColSearchSafeName.toLowerCase())) return false;
                        if (dbColSearchDate && !d.date.includes(dbColSearchDate)) return false;
                        if (dbColSearchSalaryMonth && !(d.salaryMonth || '').includes(dbColSearchSalaryMonth)) return false;
                        if (dbColSearchAmount && !d.amount.toString().includes(dbColSearchAmount)) return false;
                        
                        if (dbColSearchType) {
                          const typeLabelAr = d.type === 'advance' ? 'سلفة' : d.type === 'advance_carried' ? 'سلفة مرحلة' : 'راتب';
                          const typeLabelEn = d.type === 'advance' ? 'Advance' : d.type === 'advance_carried' ? 'Carried Advance' : 'Salary';
                          const labelToSearch = (lang === 'ar' ? typeLabelAr : typeLabelEn).toLowerCase();
                          if (!labelToSearch.includes(dbColSearchType.toLowerCase())) return false;
                        }
                      }

                      return true;
                    });

                    // Summarize totals reactively based on filtered results
                    const totalAdvances = filtered
                      .filter(d => d.type === 'advance')
                      .reduce((sum, d) => sum + d.amount, 0);

                    const totalCarriedAdvances = filtered
                      .filter(d => d.type === 'advance_carried')
                      .reduce((sum, d) => sum + d.amount, 0);

                    const totalSalaries = filtered
                      .filter(d => d.type === 'salary')
                      .reduce((sum, d) => sum + d.amount, 0);

                    // Pagination
                    const totalItems = filtered.length;
                    const totalPages = Math.ceil(totalItems / disbursalsPageSizeReport) || 1;
                    const activePage = Math.min(disbursalsCurrentPageReport, totalPages);
                    const startIndex = (activePage - 1) * disbursalsPageSizeReport;
                    const paginated = filtered.slice(startIndex, startIndex + disbursalsPageSizeReport);

                    return (
                      <>
                        {/* Three summary cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Card 1: Total Advances */}
                          <div className="bg-gradient-to-br from-white to-amber-50/20 border border-slate-200/85 p-4.5 rounded-3xl flex items-center justify-between shadow-xs">
                            <div className="space-y-1.5 text-left rtl:text-right">
                              <span className="text-[11px] font-extrabold text-slate-400 block uppercase tracking-wider font-sans">
                                {lang === 'ar' ? 'إجمالي السلف' : 'Total Advances'}
                              </span>
                              <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black font-mono text-amber-600">
                                  {totalAdvances.toLocaleString()}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold">EGP</span>
                              </div>
                            </div>
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shrink-0">
                              <DollarSign size={20} />
                            </div>
                          </div>

                          {/* Card 2: Total Carried Advances */}
                          <div className="bg-gradient-to-br from-white to-orange-50/20 border border-slate-200/85 p-4.5 rounded-3xl flex items-center justify-between shadow-xs">
                            <div className="space-y-1.5 text-left rtl:text-right">
                              <span className="text-[11px] font-extrabold text-slate-400 block uppercase tracking-wider font-sans">
                                {lang === 'ar' ? 'إجمالي سلف مرحّلة' : 'Total Carried Advances'}
                              </span>
                              <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black font-mono text-orange-600">
                                  {totalCarriedAdvances.toLocaleString()}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold">EGP</span>
                              </div>
                            </div>
                            <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl shrink-0">
                              <Wallet size={20} />
                            </div>
                          </div>

                          {/* Card 3: Total Salaries */}
                          <div className="bg-gradient-to-br from-white to-blue-50/20 border border-slate-200/85 p-4.5 rounded-3xl flex items-center justify-between shadow-xs">
                            <div className="space-y-1.5 text-left rtl:text-right">
                              <span className="text-[11px] font-extrabold text-slate-400 block uppercase tracking-wider font-sans">
                                {lang === 'ar' ? 'إجمالي رواتب منصرفة' : 'Total Salaries Disbursed'}
                              </span>
                              <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black font-mono text-blue-600">
                                  {totalSalaries.toLocaleString()}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold">EGP</span>
                              </div>
                            </div>
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
                              <Receipt size={20} />
                            </div>
                          </div>
                        </div>

                        {/* Column Filters Input Row (Advanced Search) */}
                        {isDisbursalsColumnFiltersOpenReport && (
                          <div className="bg-slate-50/40 p-4 rounded-2xl border border-slate-150 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5 animate-fadeIn text-left rtl:text-right">
                            {disbursalsVisibleColumnsReport.id && (
                              <div className="space-y-1 font-sans">
                                <span className="text-[10px] font-extrabold text-slate-455 block">{lang === 'ar' ? 'رقم الإذن' : 'Order ID'}</span>
                                <input 
                                  type="text" 
                                  value={dbColSearchId}
                                  onChange={e => { setDbColSearchId(e.target.value); setDisbursalsCurrentPageReport(1); }}
                                  placeholder="Ex: DSB1" 
                                  className="w-full text-[10px] p-1.5 bg-white border border-slate-200 rounded-lg outline-none font-mono font-bold"
                                />
                              </div>
                            )}

                            {disbursalsVisibleColumnsReport.empId && (
                              <div className="space-y-1 font-sans">
                                <span className="text-[10px] font-extrabold text-slate-455 block">{lang === 'ar' ? 'كود الموظف' : 'Emp ID'}</span>
                                <input 
                                  type="text" 
                                  value={dbColSearchEmpId}
                                  onChange={e => { setDbColSearchEmpId(e.target.value); setDisbursalsCurrentPageReport(1); }}
                                  placeholder="Ex: EMP1" 
                                  className="w-full text-[10px] p-1.5 bg-white border border-slate-200 rounded-lg outline-none font-mono font-bold"
                                />
                              </div>
                            )}

                            {disbursalsVisibleColumnsReport.name && (
                              <div className="space-y-1 font-sans">
                                <span className="text-[10px] font-extrabold text-slate-455 block">{lang === 'ar' ? 'اسم الموظف' : 'Employee'}</span>
                                <input 
                                  type="text" 
                                  value={dbColSearchName}
                                  onChange={e => { setDbColSearchName(e.target.value); setDisbursalsCurrentPageReport(1); }}
                                  placeholder={lang === 'ar' ? 'بحث بالاسم' : 'Name...'} 
                                  className="w-full text-[10px] p-1.5 bg-white border border-slate-200 rounded-lg outline-none font-bold"
                                />
                              </div>
                            )}

                            {disbursalsVisibleColumnsReport.type && (
                              <div className="space-y-1 font-sans">
                                <span className="text-[10px] font-extrabold text-slate-455 block">{lang === 'ar' ? 'نوع الصرف' : 'Type'}</span>
                                <input 
                                  type="text" 
                                  value={dbColSearchType}
                                  onChange={e => { setDbColSearchType(e.target.value); setDisbursalsCurrentPageReport(1); }}
                                  placeholder={lang === 'ar' ? 'سلفة / راتب' : 'Type...'} 
                                  className="w-full text-[10px] p-1.5 bg-white border border-slate-200 rounded-lg outline-none font-bold"
                                />
                              </div>
                            )}

                            {disbursalsVisibleColumnsReport.safeName && (
                              <div className="space-y-1 font-sans">
                                <span className="text-[10px] font-extrabold text-slate-455 block">{lang === 'ar' ? 'اسم الخزينة' : 'Safe Name'}</span>
                                <input 
                                  type="text" 
                                  value={dbColSearchSafeName}
                                  onChange={e => { setDbColSearchSafeName(e.target.value); setDisbursalsCurrentPageReport(1); }}
                                  placeholder={lang === 'ar' ? 'الرئيسية...' : 'Safe...'} 
                                  className="w-full text-[10px] p-1.5 bg-white border border-slate-200 rounded-lg outline-none font-bold"
                                />
                              </div>
                            )}

                            {disbursalsVisibleColumnsReport.amount && (
                              <div className="space-y-1 font-sans">
                                <span className="text-[10px] font-extrabold text-slate-455 block">{lang === 'ar' ? 'المبلغ' : 'Amount'}</span>
                                <input 
                                  type="text" 
                                  value={dbColSearchAmount}
                                  onChange={e => { setDbColSearchAmount(e.target.value); setDisbursalsCurrentPageReport(1); }}
                                  placeholder="5000" 
                                  className="w-full text-[10px] p-1.5 bg-white border border-slate-200 rounded-lg outline-none font-mono font-bold"
                                />
                              </div>
                            )}

                            {disbursalsVisibleColumnsReport.date && (
                              <div className="space-y-1 font-sans">
                                <span className="text-[10px] font-extrabold text-slate-455 block">{lang === 'ar' ? 'التاريخ' : 'Date'}</span>
                                <input 
                                  type="text" 
                                  value={dbColSearchDate}
                                  onChange={e => { setDbColSearchDate(e.target.value); setDisbursalsCurrentPageReport(1); }}
                                  placeholder="YYYY-MM-DD" 
                                  className="w-full text-[10px] p-1.5 bg-white border border-slate-200 rounded-lg outline-none font-mono font-bold"
                                />
                              </div>
                            )}

                            {disbursalsVisibleColumnsReport.salaryMonth && (
                              <div className="space-y-1 font-sans">
                                <span className="text-[10px] font-extrabold text-slate-455 block">{lang === 'ar' ? 'شهر الراتب' : 'Salary Month'}</span>
                                <input 
                                  type="text" 
                                  value={dbColSearchSalaryMonth}
                                  onChange={e => { setDbColSearchSalaryMonth(e.target.value); setDisbursalsCurrentPageReport(1); }}
                                  placeholder="YYYY-MM" 
                                  className="w-full text-[10px] p-1.5 bg-white border border-slate-200 rounded-lg outline-none font-mono font-bold"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* List Grid / Table */}
                        {disbursalsViewModeReport === 'table' ? (
                          <>
                            {/* Desktop/Tablet Table View */}
                            <div className="hidden md:block border border-slate-150 rounded-2xl overflow-hidden bg-white shadow-xs">
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left rtl:text-right border-collapse">
                                  <thead>
                                    <tr className="bg-orange-500 text-white border-b border-orange-600 font-bold font-sans uppercase text-[10px] tracking-wider select-none">
                                      {disbursalsVisibleColumnsReport.id && (
                                        <th className="py-3 px-4 font-black bg-orange-500 text-white">{lang === 'ar' ? 'رقم الإذن' : 'Order ID'}</th>
                                      )}
                                      {disbursalsVisibleColumnsReport.empId && (
                                        <th className="py-3 px-4 font-black bg-orange-500 text-white">{lang === 'ar' ? 'كود الموظف' : 'Emp ID'}</th>
                                      )}
                                      {disbursalsVisibleColumnsReport.name && (
                                        <th className="py-3 px-4 font-black bg-orange-500 text-white">{lang === 'ar' ? 'اسم الموظف' : 'Employee'}</th>
                                      )}
                                      {disbursalsVisibleColumnsReport.type && (
                                        <th className="py-3 px-4 font-black bg-orange-500 text-white">{lang === 'ar' ? 'نوع الصرف' : 'Type'}</th>
                                      )}
                                      {disbursalsVisibleColumnsReport.safeName && (
                                        <th className="py-3 px-4 font-black bg-orange-500 text-white">{lang === 'ar' ? 'الخزينة' : 'Safe'}</th>
                                      )}
                                      {disbursalsVisibleColumnsReport.amount && (
                                        <th className="py-3 px-4 font-black bg-orange-500 text-white text-right rtl:text-left">{lang === 'ar' ? 'المبلغ' : 'Amount'}</th>
                                      )}
                                      {disbursalsVisibleColumnsReport.date && (
                                        <th className="py-3 px-4 font-black bg-orange-500 text-white">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                                      )}
                                      {disbursalsVisibleColumnsReport.salaryMonth && (
                                        <th className="py-3 px-4 font-black bg-orange-500 text-white">{lang === 'ar' ? 'شهر الراتب' : 'Salary Month'}</th>
                                      )}
                                      <th className="py-3 px-4 text-center font-black bg-orange-500 text-white">{lang === 'ar' ? 'الخيارات' : 'Actions'}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {paginated.length > 0 ? (
                                      paginated.map((d: any) => {
                                        const emp = staff.find(s => s.id === d.empId);
                                        const empName = emp ? (lang === 'ar' ? emp.nameAr : emp.name) : 'Staff Member';
                                        
                                        return (
                                          <tr key={d.id} className="hover:bg-slate-50/60 transition duration-150">
                                            {disbursalsVisibleColumnsReport.id && (
                                              <td className="py-3 px-4 font-mono font-black text-[#0a1945]">{d.id}</td>
                                            )}
                                            {disbursalsVisibleColumnsReport.empId && (
                                              <td className="py-3 px-4 font-mono font-bold text-slate-450">{d.empId}</td>
                                            )}
                                            {disbursalsVisibleColumnsReport.name && (
                                              <td className="py-3 px-4 font-black text-slate-800">{empName}</td>
                                            )}
                                            {disbursalsVisibleColumnsReport.type && (
                                              <td className="py-3 px-4">
                                                <span className={cn(
                                                  "px-2 py-0.5 rounded-lg text-[10px] font-bold inline-block font-sans",
                                                  d.type === 'advance' ? 'bg-amber-50 text-amber-700 border border-amber-200/50' :
                                                  d.type === 'advance_carried' ? 'bg-orange-50 text-orange-700 border border-orange-200/50' :
                                                  'bg-blue-50 text-blue-700 border border-blue-200/50'
                                                )}>
                                                  {d.type === 'advance' && (lang === 'ar' ? 'سلفة' : 'Advance')}
                                                  {d.type === 'advance_carried' && (lang === 'ar' ? 'سلفة مرحلة' : 'Carried Advance')}
                                                  {d.type === 'salary' && (lang === 'ar' ? 'راتب' : 'Salary')}
                                                </span>
                                              </td>
                                            )}
                                            {disbursalsVisibleColumnsReport.safeName && (
                                              <td className="py-3 px-4 text-slate-550 font-sans">{d.safeName}</td>
                                            )}
                                            {disbursalsVisibleColumnsReport.amount && (
                                              <td className="py-3 px-4 text-right rtl:text-left font-mono font-black text-slate-800">
                                                {d.amount.toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">EGP</span>
                                              </td>
                                            )}
                                            {disbursalsVisibleColumnsReport.date && (
                                              <td className="py-3 px-4 font-mono font-bold text-slate-500">{d.date}</td>
                                            )}
                                            {disbursalsVisibleColumnsReport.salaryMonth && (
                                              <td className="py-3 px-4 font-mono font-bold text-slate-500">{d.salaryMonth || '-'}</td>
                                            )}
                                            <td className="py-3 px-4 text-center">
                                              <div className="flex items-center justify-center gap-1">
                                                <button
                                                  type="button"
                                                  onClick={() => setViewingDisbursal(d)}
                                                  className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                                  title={lang === 'ar' ? 'عرض الإذن' : 'View order'}
                                                >
                                                  <Eye size={12} />
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })
                                    ) : (
                                      <tr>
                                        <td colSpan={9} className="py-8 text-center text-slate-450 font-sans italic">
                                          {lang === 'ar' ? 'لا توجد أذونات صرف مطابقة للفلاتر المحددة' : 'No disbursement orders found matching filters.'}
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Mobile/Tablet Card View (shown automatically on small screens) */}
                            <div className="block md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {paginated.length > 0 ? (
                                paginated.map((d: any) => {
                                  const emp = staff.find(s => s.id === d.empId);
                                  const empName = emp ? (lang === 'ar' ? emp.nameAr : emp.name) : 'Staff Member';
                                  const branchLabel = emp ? (emp.branchId === 'mamar' ? (lang === 'ar' ? 'فرع الممر' : 'Al-Mamar') : emp.branchId === 'theater' ? (lang === 'ar' ? 'فرع المسرح الروماني' : 'Roman Theater') : (lang === 'ar' ? 'فرع سعد زغلول' : 'Saad Zaghloul')) : '-';
                                  
                                  return (
                                    <div key={d.id} className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between hover:shadow-xs transition space-y-3 shadow-xs">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-mono text-slate-400 font-bold">{d.empId}</span>
                                            <span className="text-[9px] font-mono text-[#0a1945] font-black bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md">{d.id}</span>
                                          </div>
                                          <h4 className="text-xs font-black text-[#0a1945] leading-tight mt-1">{empName}</h4>
                                          <p className="text-[10px] text-slate-450 mt-0.5 font-bold font-sans">{branchLabel}</p>
                                        </div>
                                        
                                        <span className={cn(
                                          "px-2 py-0.5 text-[9px] font-bold rounded-lg border font-sans",
                                          d.type === 'advance' ? 'bg-amber-50 text-amber-700 border-amber-200/50' :
                                          d.type === 'advance_carried' ? 'bg-orange-50 text-orange-700 border-orange-200/50' :
                                          'bg-blue-50 text-blue-700 border-blue-200/50'
                                        )}>
                                          {d.type === 'advance' && (lang === 'ar' ? 'سلفة' : 'Advance')}
                                          {d.type === 'advance_carried' && (lang === 'ar' ? 'سلفة مرحلة' : 'Carried Advance')}
                                          {d.type === 'salary' && (lang === 'ar' ? 'راتب' : 'Salary')}
                                        </span>
                                      </div>
                                      
                                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] font-medium text-slate-600 space-y-1 font-sans">
                                        <div className="flex justify-between">
                                          <span className="text-slate-400">{lang === 'ar' ? 'الخزينة:' : 'Safe:'}</span>
                                          <span className="font-bold text-slate-700">{d.safeName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-slate-400">{lang === 'ar' ? 'التاريخ:' : 'Date:'}</span>
                                          <span className="font-mono font-bold text-slate-500">{d.date}</span>
                                        </div>
                                        {d.salaryMonth && (
                                          <div className="flex justify-between">
                                            <span className="text-slate-400">{lang === 'ar' ? 'شهر الراتب:' : 'Salary Month:'}</span>
                                            <span className="font-mono font-bold text-slate-500">{d.salaryMonth}</span>
                                          </div>
                                        )}
                                      </div>

                                      <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                                        <span className="font-mono font-black text-slate-800 text-xs">
                                          {d.amount.toLocaleString()} EGP
                                        </span>
                                        
                                        <div className="flex gap-1">
                                          <button
                                            type="button"
                                            onClick={() => setViewingDisbursal(d)}
                                            className="p-1.5 text-slate-450 hover:text-emerald-600 hover:bg-slate-50 rounded-lg transition cursor-pointer"
                                            title={lang === 'ar' ? 'عرض الإذن' : 'View order'}
                                          >
                                            <Eye size={12} />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="py-8 text-center text-slate-400 font-sans italic">
                                  {lang === 'ar' ? 'لا توجد أذونات صرف مطابقة للفلاتر المحددة' : 'No disbursement orders found matching filters.'}
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          // Kanban cards view (shown on all screens)
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {paginated.length > 0 ? (
                              paginated.map((d: any) => {
                                const emp = staff.find(s => s.id === d.empId);
                                const empName = emp ? (lang === 'ar' ? emp.nameAr : emp.name) : 'Staff Member';
                                const branchLabel = emp ? (emp.branchId === 'mamar' ? (lang === 'ar' ? 'فرع الممر' : 'Al-Mamar') : emp.branchId === 'theater' ? (lang === 'ar' ? 'فرع المسرح الروماني' : 'Roman Theater') : (lang === 'ar' ? 'فرع سعد زغلول' : 'Saad Zaghloul')) : '-';
                                
                                return (
                                  <div key={d.id} className="bg-white border border-slate-200 p-4.5 rounded-2xl flex flex-col justify-between hover:shadow-xs transition space-y-3.5">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] font-mono text-slate-400 font-bold">{d.empId}</span>
                                          <span className="text-[9px] font-mono text-[#0a1945] font-black bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md">{d.id}</span>
                                        </div>
                                        <h4 className="text-xs font-black text-[#0a1945] leading-tight mt-1">{empName}</h4>
                                        <p className="text-[10px] text-slate-450 mt-0.5 font-bold font-sans">{branchLabel}</p>
                                      </div>
                                      
                                      <span className={cn(
                                        "px-2 py-0.5 text-[9px] font-bold rounded-lg border font-sans",
                                        d.type === 'advance' ? 'bg-amber-50 text-amber-700 border-amber-200/50' :
                                        d.type === 'advance_carried' ? 'bg-orange-50 text-orange-700 border-orange-200/50' :
                                        'bg-blue-50 text-blue-700 border-blue-200/50'
                                      )}>
                                        {d.type === 'advance' && (lang === 'ar' ? 'سلفة' : 'Advance')}
                                        {d.type === 'advance_carried' && (lang === 'ar' ? 'سلفة مرحلة' : 'Carried Advance')}
                                        {d.type === 'salary' && (lang === 'ar' ? 'راتب' : 'Salary')}
                                      </span>
                                    </div>
                                    
                                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] font-medium text-slate-600 space-y-1 font-sans">
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">{lang === 'ar' ? 'الخزينة:' : 'Safe:'}</span>
                                        <span className="font-bold text-slate-700">{d.safeName}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">{lang === 'ar' ? 'التاريخ:' : 'Date:'}</span>
                                        <span className="font-mono font-bold text-slate-500">{d.date}</span>
                                      </div>
                                      {d.salaryMonth && (
                                        <div className="flex justify-between">
                                          <span className="text-slate-400">{lang === 'ar' ? 'شهر الراتب:' : 'Salary Month:'}</span>
                                          <span className="font-mono font-bold text-slate-500">{d.salaryMonth}</span>
                                        </div>
                                      )}
                                    </div>

                                    <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between">
                                      <span className="font-mono font-black text-slate-800 text-xs">
                                        {d.amount.toLocaleString()} EGP
                                      </span>
                                      
                                      <div className="flex gap-1">
                                        <button
                                          type="button"
                                          onClick={() => setViewingDisbursal(d)}
                                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-50 rounded-lg transition cursor-pointer"
                                          title={lang === 'ar' ? 'عرض الإذن' : 'View order'}
                                        >
                                          <Eye size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="col-span-full py-8 text-center text-slate-400 font-sans italic">
                                {lang === 'ar' ? 'لا توجد أذونات صرف مطابقة للفلاتر المحددة' : 'No disbursement orders found matching filters.'}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Pagination controls */}
                        {totalItems > 0 && (
                          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 font-sans text-xs text-slate-655">
                            <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                              {lang === 'ar' ? (
                                <>
                                  <span>عرض</span>
                                  <span className="font-extrabold text-[#0a1945] font-mono bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                                    {paginated.length}
                                  </span>
                                  <span>من أصل</span>
                                  <span className="font-extrabold text-orange-655 font-mono bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                                    {totalItems}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span>Show</span>
                                  <span className="font-extrabold text-[#0a1945] font-mono bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                                    {paginated.length}
                                  </span>
                                  <span>of</span>
                                  <span className="font-extrabold text-orange-655 font-mono bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-lg text-[10.5px]">
                                    {totalItems}
                                  </span>
                                </>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0 select-none">
                              <button
                                type="button"
                                disabled={activePage === 1}
                                onClick={() => setDisbursalsCurrentPageReport(prev => Math.max(1, prev - 1))}
                                className="p-2 border border-slate-200 hover:border-orange-400 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-655 hover:text-orange-500 hover:bg-orange-50/20 transition cursor-pointer h-8 w-8 flex items-center justify-center shadow-xs"
                                title={lang === 'ar' ? 'الصفحة السابقة' : 'Previous page'}
                              >
                                {lang === 'ar' ? <ChevronRight size={13} strokeWidth={2.5} /> : <ChevronLeft size={13} strokeWidth={2.5} />}
                              </button>

                              <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                                  const isActive = page === activePage;
                                  return (
                                    <button
                                      key={page}
                                      type="button"
                                      onClick={() => setDisbursalsCurrentPageReport(page)}
                                      className={cn(
                                        "w-8 h-8 rounded-lg font-extrabold transition cursor-pointer text-xs flex items-center justify-center border font-mono shadow-xs",
                                        isActive
                                          ? "bg-[#0a1945] text-white border-[#0a1945]"
                                          : "bg-white text-slate-700 border-slate-200 hover:border-orange-400 hover:text-orange-500"
                                      )}
                                    >
                                      {page}
                                    </button>
                                  );
                                })}
                              </div>

                              <button
                                type="button"
                                disabled={activePage === totalPages}
                                onClick={() => setDisbursalsCurrentPageReport(prev => Math.min(totalPages, prev + 1))}
                                className="p-2 border border-slate-200 hover:border-orange-400 disabled:opacity-40 disabled:pointer-events-none rounded-lg bg-white text-slate-655 hover:text-orange-500 hover:bg-orange-50/20 transition cursor-pointer h-8 w-8 flex items-center justify-center shadow-xs"
                                title={lang === 'ar' ? 'الصفحة التالية' : 'Next page'}
                              >
                                {lang === 'ar' ? <ChevronLeft size={13} strokeWidth={2.5} /> : <ChevronRight size={13} strokeWidth={2.5} />}
                              </button>
                            </div>

                            <div className="flex items-center gap-2 text-slate-500 font-bold shrink-0">
                              <span>{lang === 'ar' ? 'عرض' : 'Show'}</span>
                              <select
                                value={disbursalsPageSizeReport}
                                onChange={(e) => {
                                  setDisbursalsPageSizeReport(Number(e.target.value));
                                  setDisbursalsCurrentPageReport(1);
                                }}
                                className="bg-white border border-slate-200 text-[#0a1945] rounded-xl px-2 py-1.5 text-xs font-black shadow-xs outline-none focus:border-orange-400 cursor-pointer w-16 text-center animate-none"
                              >
                                {[5, 10, 20, 50, 100].map(sz => (
                                  <option key={sz} value={sz} className="font-bold">
                                    {sz}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="bg-white border border-slate-150 rounded-3xl p-8 shadow-sm min-h-[400px] flex flex-col items-center justify-center text-center transition-all duration-300 animate-fadeIn">
                  {/* Deprecated/other tab structures fallback layout */}
                  <span className="text-slate-400 font-sans text-xs">No active report selected/initialized</span>
                </div>
              )}

            </div>
          )}
          {/* DEPRECATED BLOCK FOR ACCURATE MERGING */}
          {false && (
            <div className="bg-white border border-slate-150 rounded-3xl p-8 shadow-xs min-h-[400px] flex flex-col items-center justify-center text-center max-w-2xl mx-auto my-4">
              <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-6 border border-orange-100 text-orange-500">
                <FileBarChart2 size={28} />
              </div>
              <h2 className="text-lg font-black text-[#0a1945] mb-2 font-sans tracking-tight">
                {lang === 'ar' ? 'تقارير الموظفين' : 'Staff Reports'}
              </h2>
              <p className="text-slate-500 font-sans text-xs md:text-sm max-w-md leading-relaxed">
                {lang === 'ar' ? (
                  'مرحباً بك في صفحة تقارير الموظفين الفارغة. بانتظار توجيهاتك وشرحك لتصميم وبناء صفحات هذا التبويب لعرض تحليلات وبيانات الموظفين بشكل منظم ومتقدم.'
                ) : (
                  'Welcome to the empty Staff Reports section. Waiting for your instructions and designs to build custom reporting modules and statistical dashboards.'
                )}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-2 select-none">
                <span className="text-[10px] bg-slate-50 border border-slate-200 text-slate-500 px-3 py-1.5 rounded-xl font-bold font-sans">
                  {lang === 'ar' ? 'جاهز للبرمجة ⚡' : 'Ready for Coding ⚡'}
                </span>
                <span className="text-[10px] bg-orange-50 border border-orange-100 text-orange-600 px-3 py-1.5 rounded-xl font-bold font-sans">
                  {lang === 'ar' ? 'تصميم مخصص 🎨' : 'Custom Tailorable 🎨'}
                </span>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ========================================================== */}
      {/* DETAILED EMPLOYEE PROFILE FLIP FOLDER VIEW (viewingEmp)   */}
      {/* ========================================================== */}
      <AnimatePresence>
        {viewingEmp && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingEmp(null)}
              className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[32px] shadow-2xl max-w-4xl w-full z-50 overflow-hidden border border-slate-150 flex flex-col max-h-[90vh]"
            >
              {/* Profile Card Colored Top Ribbon Header */}
              <div className="py-1.5 px-6 bg-gradient-to-r from-[#0a1945] to-orange-500 text-white relative flex items-center justify-start min-h-[56px]">
                <button 
                  onClick={() => setViewingEmp(null)}
                  className="absolute top-1/2 -translate-y-1/2 right-5 p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition cursor-pointer z-10"
                >
                  <X size={14} />
                </button>
                
                <div className="flex items-center gap-3.5 text-left rtl:text-right pr-12">
                  <div className="w-9 h-9 rounded-xl bg-white text-[#0a1945] font-black flex items-center justify-center text-xs shadow-md border border-orange-500 shrink-0">
                    {viewingEmp.name.split(' ').slice(0, 2).map(n=>n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-sm font-black flex flex-wrap items-center gap-1.5">
                      <span className="bg-orange-500 text-white text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-orange-450/40">
                        ID: {viewingEmp.id}
                      </span>
                      <span>{lang === 'ar' ? viewingEmp.nameAr : viewingEmp.name}</span>
                    </h3>
                    <p className="text-white/80 text-[9px] font-medium leading-none mt-0.5">{lang === 'ar' ? viewingEmp.roleAr : viewingEmp.role} ({viewingEmp.grade || 'Grade A'})</p>
                  </div>
                </div>
              </div>

              {/* View Sheet Internal Tab Bars — 1 on the right in Arabic */}
              <div
                className="bg-slate-50 border-b border-slate-100 p-2.5 flex items-center justify-start gap-1.5 overflow-x-auto select-none"
                style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}
              >
                {[
                  { id: 'job', en: 'Employment Profile', ar: 'البيانات الوظيفية' },
                  { id: 'salary', en: 'Salary & Increments', ar: 'الراتب الأساسي والزيادات' },
                  { id: 'ins', en: 'Welfare & Bank Account', ar: 'التأمينات وحساب البنك' },
                  { id: 'system', en: 'System Usage', ar: 'استخدام النظام' }
                ].map((tb) => (
                  <button
                    key={tb.id}
                    onClick={() => setActiveViewTab(tb.id as any)}
                    className={cn(
                      "px-4 py-2 text-[10px] md:text-xs font-black rounded-lg transition cursor-pointer whitespace-nowrap shrink-0",
                      activeViewTab === tb.id 
                        ? "bg-[#0a1945] text-white shadow-md font-sans" 
                        : "bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    {lang === 'ar' ? tb.ar : tb.en}
                  </button>
                ))}
              </div>

              {/* View Sheet Body Area Content Grid */}
              <div className="p-6 overflow-y-auto h-[380px] md:h-[400px] text-left rtl:text-right text-xs">
                {activeViewTab === 'job' && (
                  <div className="space-y-5">
                    <h4 className="text-xs font-black text-[#0a1945] uppercase tracking-wider border-b pb-2">{lang === 'ar' ? 'البطاقة الوظيفية المعتمدة' : 'Official Professional Job Folder'}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{lang === 'ar' ? 'الاسم بالإنجليزية' : 'English Full Name'}</span>
                        <span className="font-extrabold text-slate-700">{viewingEmp.name}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{lang === 'ar' ? 'الاسم بالكامل (رسمي)' : 'Arabic Legal Name'}</span>
                        <span className="font-extrabold text-[#0a1945]">{viewingEmp.nameAr}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{lang === 'ar' ? 'المسمى الوظيفي والدرجة' : 'Job Title & Grade'}</span>
                        <span className="font-extrabold text-slate-800">{lang === 'ar' ? viewingEmp.roleAr : viewingEmp.role}</span>
                        <span className="block text-[10px] text-slate-450 mt-1 font-mono font-bold">{viewingEmp.grade || '03 — الدرجة الثالثة'}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{lang === 'ar' ? 'المدير المباشر المسؤول' : 'Immediate Line Manager'}</span>
                        <span className="font-extrabold text-slate-700">{lang === 'ar' ? viewingEmp.managerAr || 'غير مخصص حاليا' : viewingEmp.managerEn || 'Unassigned Line Manager'}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{lang === 'ar' ? 'تاريخ المباشرة والتعيين' : 'Enrollment / Hire Date'}</span>
                        <span className="font-extrabold font-mono text-slate-700">{viewingEmp.hireDate || '2025-06-01'}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{lang === 'ar' ? 'نوع الدوام وعقد العمل' : 'Work Type Setting'}</span>
                        <span className="font-extrabold text-slate-705">{viewingEmp.workType || 'Full-Time (رسمي كامل اليوم)'}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{lang === 'ar' ? 'الإدارة والقطاع' : 'Associated Department'}</span>
                        <span className="font-extrabold text-[#0a1945]">
                          {lang === 'ar' 
                            ? departments.find(d=>d.id === viewingEmp.departmentId)?.nameAr 
                            : departments.find(d=>d.id === viewingEmp.departmentId)?.nameEn || 'Unassigned'}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{lang === 'ar' ? 'القسم الفرعي للنشاط' : 'Associated Sub-section'}</span>
                        <span className="font-extrabold text-slate-700">
                          {lang === 'ar' 
                            ? sections.find(s=>s.id === viewingEmp.sectionId)?.nameAr 
                            : sections.find(s=>s.id === viewingEmp.sectionId)?.nameEn || 'Unassigned'}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{lang === 'ar' ? 'مركز التكلفة للموازنة' : 'Cost Center Budget code'}</span>
                        <span className="font-extrabold font-mono text-slate-650">{lang === 'ar' ? viewingEmp.costCenterAr || 'عقد عام' : viewingEmp.costCenterEn || 'HQ Pool'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeViewTab === 'salary' && (
                  <div className="space-y-5">
                    <h4 className="text-xs font-black text-[#0a1945] uppercase tracking-wider border-b pb-2">{lang === 'ar' ? 'تفاصيل الراتب الأساسي والزيادات التراكمية' : 'Base Contract Salary & Salary Increments'}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 font-mono">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-110 text-center">
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1 font-sans">{lang === 'ar' ? 'الراتب الأساسي عند التعيين' : 'Hiring Base Salary'}</span>
                        <span className="text-lg font-black text-[#0a1945]">{viewingEmp.baseSalary.toLocaleString()}</span>
                        <span className="text-[9px] text-slate-400 block font-sans mt-0.5">EGP / monthly</span>
                      </div>
                      <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 text-center">
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-orange-500 block mb-1 font-sans">{lang === 'ar' ? 'إجمالي زيادات الراتب' : 'Total Salary Increments'}</span>
                        <span className="text-lg font-black text-orange-600 font-bold">+{viewingEmp.allowanceValue.toLocaleString()}</span>
                        <span className="text-[9px] text-orange-450 block font-sans mt-0.5">EGP / monthly</span>
                      </div>
                      <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 text-center">
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-600 block mb-1 font-sans">{lang === 'ar' ? 'الراتب الأساسي الحالي للموظف' : 'Current Base Salary'}</span>
                        <span className="text-lg font-black text-emerald-600 font-bold">{(viewingEmp.baseSalary + viewingEmp.allowanceValue).toLocaleString()}</span>
                        <span className="text-[9px] text-emerald-500 block font-sans mt-0.5">EGP / monthly</span>
                      </div>
                    </div>

                    {/* ENROLLED ALLOWANCES DETAILED SHEETS - INDIVIDUAL ITEMS */}
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-150 space-y-2.5">
                      <p className="text-[10px] font-black text-[#0a1945] uppercase tracking-wider">{lang === 'ar' ? 'تفصيل بنود الزيادات والعلاوات المستحقة للموظف' : 'Itemized Contractual Salary Increments Enrolled'}</p>
                      {!viewingEmp.allowances || viewingEmp.allowances.length === 0 ? (
                        <div className="bg-white p-3 rounded-xl border border-slate-100 text-[11px] text-slate-500">
                          {lang === 'ar' ? 'مسجل زيادة دورية سنوية افتراضية بقيمة ' : 'Default regular increment is registered for '} {viewingEmp.allowanceValue} EGP
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {viewingEmp.allowances.map((alw, idx) => (
                            <div key={idx} className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-100 flex justify-between items-center text-[11px] shadow-2xs">
                              <div>
                                <span className="font-extrabold text-slate-800">{lang === 'ar' ? alw.nameAr : alw.nameEn}</span>
                              </div>
                              <span className="font-bold text-orange-650 font-mono">+{alw.amount.toLocaleString()} EGP</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* DIRECT COMMISSIONS INTEGRATION HERE WITH AN ORANGE SEPARATOR */}
                    <div className="border-t border-orange-500/30 pt-4 mt-5">
                      <h5 className="text-[11px] font-black text-orange-655 flex items-center gap-1.5 uppercase tracking-wider mb-3">
                        <span className="w-1.5 h-3.5 bg-orange-500 rounded-xs" />
                        <span>{lang === 'ar' ? 'خطة تفعيل المبيعات وإطار عمولات الأداء والعملاء' : 'Performance Sales & Commission Plan'}</span>
                      </h5>
                      {viewingEmp.commType === 'None' || !viewingEmp.commType ? (
                        <div className="p-4 bg-orange-50/10 border border-orange-100 rounded-xl text-center text-slate-450 text-[10px] font-extrabold italic">
                          {lang === 'ar' ? 'هذا الموظف غير مستحق لوثيقة عمولة أداء مبيعات حالياً.' : 'This employee profile is currently exempt from automated sales commission schemas.'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-[11px]">
                          <div className="bg-white p-3 rounded-xl border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 block mb-0.5">{lang === 'ar' ? 'نوع وهيكل احتساب العمولات' : 'Commission Formula'}</span>
                            <span className="font-extrabold text-[#0a1945]">{viewingEmp.commType === 'Percentage' ? (lang === 'ar' ? 'نسبة مئوية' : 'Percentage') : (lang === 'ar' ? 'مبلغ ثابت' : 'Fixed Bonus')}</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-100 font-mono">
                            <span className="text-[9px] font-bold text-slate-400 block mb-0.5 font-sans">{lang === 'ar' ? 'نسبة أو قيمة العمولة' : 'Ratio / Commission fixed payout'}</span>
                            <span className="font-black text-orange-600">
                              {viewingEmp.commType === 'Percentage' ? `${viewingEmp.commRate}% margins` : `${viewingEmp.commAmount} EGP`}
                            </span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-100 font-mono">
                            <span className="text-[9px] font-bold text-slate-400 block mb-0.5 font-sans">{lang === 'ar' ? 'الحد الأدنى لشرط تفعيل الاستحقاف' : 'Minimum Quota Sales Threshold'}</span>
                            <span className="font-extrabold text-slate-700 font-bold">{(viewingEmp.commMinSales || 0).toLocaleString()} EGP target</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-100 font-mono">
                            <span className="text-[9px] font-bold text-slate-400 block mb-0.5 font-sans">{lang === 'ar' ? 'تاريخ تفعيل واستحقاق الحافز' : 'Commencement Date'}</span>
                            <span className="font-extrabold text-slate-600">{viewingEmp.commStartDate || '2026-01-01'}</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-100 font-mono">
                            <span className="text-[9px] font-bold text-slate-400 block mb-0.5 font-sans">{lang === 'ar' ? 'تاريخ انقضاء صلاحية البند' : 'Expiration Date'}</span>
                            <span className="font-extrabold text-slate-600">{viewingEmp.commEndDate || '2026-12-31'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeViewTab === 'ins' && (
                  <div className="space-y-5">
                    <h4 className="text-xs font-black text-[#0a1945] uppercase tracking-wider border-b pb-2">{lang === 'ar' ? 'قضايا وتطبيقات التأمينات الاجتماعية والخصم' : 'Social Security Enrollment & Insured Wages'}</h4>
                    {!viewingEmp.insNumber ? (
                      <div className="p-8 bg-slate-50 border rounded-3xl text-center text-slate-450 font-extrabold text-xs">
                        {lang === 'ar' ? 'لا توجد سجل التأمينات الاجتماعية مخصصة لملف هذا الموظف حالياً.' : 'This employee profile is not enrolled in social security or insurance calculations yet.'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{lang === 'ar' ? 'الرقم التأميني للموظف' : 'Insurance Account ID'}</span>
                          <span className="font-extrabold font-mono text-[#0a1945] text-sm">{viewingEmp.insNumber}</span>
                        </div>
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 font-mono">
                          <span className="text-[10px] font-bold text-slate-400 block mb-0.5 font-sans">{lang === 'ar' ? 'تاريخ سريان العمل بالتأمين' : 'Subscription Active Date'}</span>
                          <span className="font-extrabold text-slate-700">{viewingEmp.insSubDate || '2024-05-15'}</span>
                        </div>
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 font-mono">
                          <span className="text-[10px] font-bold text-slate-400 block mb-0.5 font-sans">{lang === 'ar' ? 'أجر الاشتراك الأساسي الخاضع للتأمين' : 'Insurance Wage Base'}</span>
                          <span className="font-black text-emerald-600">{(viewingEmp.insWage || 0).toLocaleString()} EGP</span>
                        </div>
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{lang === 'ar' ? 'حصة الموظف من الاستقطاع' : 'Employee Contribution Rent'}</span>
                          <span className="font-extrabold text-rose-500 font-mono">{viewingEmp.insRateEmp || 11}% ded. from salary</span>
                        </div>
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{lang === 'ar' ? 'عبء صاحب العمل المالي' : 'Employer (Ma7aly) Contribution'}</span>
                          <span className="font-extrabold text-slate-650 font-mono">{viewingEmp.insRateComp || 18.75}% on gross budget</span>
                        </div>
                      </div>
                    )}

                    {/* Orange line separator as requested */}
                    <div className="border-t-2 border-orange-500 pt-5 mt-6" />

                    <h4 className="text-xs font-black text-[#0a1945] uppercase tracking-wider border-b pb-2">{lang === 'ar' ? 'مستندات وبيانات التحويل المصرفي' : 'Bank Accounts & Wire Transfer details'}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{lang === 'ar' ? 'اسم المؤسسة المصرفية' : 'Bank Name'}</span>
                        <span className="font-extrabold text-slate-800">{lang === 'ar' ? viewingEmp.bankNameAr || 'البنك التجاري الدولي CIB' : viewingEmp.bankNameEn || 'CIB Bank Egypt'}</span>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{lang === 'ar' ? 'اسم المستفيد بالكامل ورقم الهوية' : 'Beneficiary Account Name'}</span>
                        <span className="font-extrabold text-slate-700">{lang === 'ar' ? viewingEmp.bankHolderAr || viewingEmp.nameAr : viewingEmp.bankHolderEn || viewingEmp.nameEn}</span>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{lang === 'ar' ? 'رقم الحساب المصرفي' : 'Account Number'}</span>
                        <span className="text-slate-800 font-extrabold font-mono text-[13px]">{viewingEmp.bankAccountNum || '1000 — 4321 — 1120'}</span>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 col-span-1 sm:col-span-2">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{lang === 'ar' ? 'رقم الآيبان الدولي (IBAN String)' : 'IBAN Code String'}</span>
                        <span className="text-[#0a1945] font-extrabold font-mono text-[12px]">{viewingEmp.bankIban || 'EG12 0002 0100 0456 7891 2000 1'}</span>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{lang === 'ar' ? 'رمز السويفت الدولي (SWIFT Code)' : 'SWIFT Code'}</span>
                        <span className="text-slate-700 font-extrabold font-mono font-bold">{viewingEmp.bankSwift || 'CIBEEGXX'}</span>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{lang === 'ar' ? 'فرع البنك الحالي' : 'Bank Branch Name'}</span>
                        <span className="font-extrabold text-slate-755">{lang === 'ar' ? viewingEmp.bankBranchAr || 'فرع الدقي الرئيسي' : viewingEmp.bankBranchEn || 'Dokki Main Branch'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeViewTab === 'system' && (
                  <div className="space-y-5">
                    <h4 className="text-xs font-black text-[#0a1945] uppercase tracking-wider border-b pb-2">
                      {lang === 'ar' ? 'صلاحيات وسجلات حساب النظام' : 'System Account Credentials & Permissions'}
                    </h4>

                    {!viewingEmp.isSystemUser ? (
                      <div className="p-8 bg-slate-50 border rounded-3xl text-center text-slate-450 font-extrabold text-xs">
                        {lang === 'ar' ? 'هذا الموظف ليس لديه صلاحية للوصول إلى النظام (ليس مستخدماً نشطاً للسيستم).' : 'This employee in not configured as a system user and has no login credentials assigned.'}
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{lang === 'ar' ? 'اسم المستخدم (Username)' : 'Account Username'}</span>
                            <span className="font-extrabold text-slate-800 font-mono text-sm">{viewingEmp.username}</span>
                          </div>
                          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{lang === 'ar' ? 'مجموعة الصلاحيات المرتبطة' : 'Permission Template Group'}</span>
                            <span className="font-extrabold text-[#0a1945]">
                              {lang === 'ar' 
                                ? (PERM_GROUPS.find(g => g.id === viewingEmp.permissionGroup)?.nameAr || viewingEmp.permissionGroup || 'مخصص')
                                : (PERM_GROUPS.find(g => g.id === viewingEmp.permissionGroup)?.nameEn || viewingEmp.permissionGroup || 'Custom Template')}
                            </span>
                          </div>
                          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{lang === 'ar' ? 'بيانات وحجوزات الخزينة المالية' : 'Sub-Safe Cash Drawer Option'}</span>
                            <span className="font-extrabold text-slate-700">
                              {viewingEmp.hasSubSafe 
                                ? (lang === 'ar' ? 'نعم، لديه صندوق / خزينة فرعية باسمه واشتراكاته' : 'Yes, assigned dedicated sub-safe terminal') 
                                : (lang === 'ar' ? 'لا توجد حاجة لخزينة / صندوق باسم الموظف' : 'No sub-safe needed / HR Admin role')}
                            </span>
                          </div>
                        </div>

                        {/* Custom screen permissions read-only display */}
                        <div className="border border-slate-150 rounded-2xl overflow-hidden mt-4 bg-white">
                          <div className="bg-slate-50 p-3 border-b border-slate-150 flex items-center justify-between">
                            <span className="text-[10px] font-black text-[#0a1945] uppercase tracking-wider">
                              {lang === 'ar' ? 'سجل الصلاحيات المخصصة والمفعّلة للموظف حالياً' : 'Enabled Screen Access & Operations Grid'}
                            </span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left rtl:text-right border-collapse text-[11px]">
                              <thead>
                                <tr className="bg-slate-100 text-slate-500 font-extrabold border-b border-slate-150">
                                  <th className="p-3 font-black text-slate-600">{lang === 'ar' ? 'الرابط الأساسي / الشاشة (السايد بار)' : 'Sidebar Section'}</th>
                                  <th className="p-3 text-center w-14 font-black">{lang === 'ar' ? 'عرض' : 'View'}</th>
                                  <th className="p-3 text-center w-14 font-black">{lang === 'ar' ? 'إضافة' : 'Add'}</th>
                                  <th className="p-3 text-center w-14 font-black">{lang === 'ar' ? 'تعديل' : 'Edit'}</th>
                                  <th className="p-3 text-center w-14 font-black">{lang === 'ar' ? 'تصدير' : 'Export'}</th>
                                  <th className="p-3 text-center w-14 font-black">{lang === 'ar' ? 'حذف' : 'Delete'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {SCREENS_LIST.map((scr) => {
                                  // fallback on group standard if custom permissions is empty
                                  const rawPerm = viewingEmp.customPermissions || getDefaultPermissions(viewingEmp.permissionGroup || 'HR');
                                  const userScrPerm = rawPerm?.[scr.id] || { view: false, add: false, edit: false, export: false, delete: false };
                                  return (
                                    <tr key={scr.id} className="border-b border-slate-100 hover:bg-slate-55/30 transition">
                                      <td className="p-3 font-extrabold text-slate-705">
                                        {lang === 'ar' ? scr.nameAr : scr.nameEn}
                                        <span className="block text-[8px] text-slate-400 font-mono mt-0.5 font-normal uppercase">{scr.id} navigation route</span>
                                      </td>
                                      {(['view', 'add', 'edit', 'export', 'delete'] as const).map((act) => (
                                        <td key={act} className="p-3 text-center">
                                          <input
                                            type="checkbox"
                                            className="w-4 h-4 accent-orange-500 rounded scale-95 opacity-80 cursor-not-allowed"
                                            checked={userScrPerm[act] || false}
                                            disabled
                                          />
                                        </td>
                                      ))}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Close Bottom Actions controls */}
              <div className="p-5 border-t bg-slate-50 flex justify-end gap-3 rounded-b-[32px]">
                <button 
                  onClick={() => setViewingEmp(null)}
                  className="px-6 py-2.5 bg-[#0a1945] hover:bg-orange-500 text-white font-extrabold rounded-lg transition cursor-pointer text-xs uppercase"
                >
                  {lang === 'ar' ? 'إغلاق الملف' : 'Dismiss Folder'}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* ========================================================== */}
      {/* EDIT ATTENDANCE LOG MODAL (isEditAttendanceOpen)          */}
      {/* ========================================================== */}
      <AnimatePresence>
        {isEditAttendanceOpen && editingAttendanceLog && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditAttendanceOpen(false)}
              className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[32px] shadow-2xl max-w-lg w-full z-50 overflow-hidden border border-slate-150 flex flex-col"
            >
              <div className="p-6 bg-gradient-to-r from-[#0a1945] to-orange-500 text-white relative flex justify-between items-center shrink-0">
                <div className="rtl:text-right text-left pb-1">
                  <h3 className="text-md md:text-lg font-black font-sans">
                    {lang === 'ar' ? 'تعديل سجل حضور وانصراف الموظف' : 'Edit Employee Attendance Times'}
                  </h3>
                  <p className="text-white/80 text-[11px] mt-0.5 font-medium font-sans">
                    {lang === 'ar' ? 'تحديث أوقات حضور وانصراف الموظف المحددة وعرض تفاصيل السجل.' : 'Update exact attendance clock-in & out times for the chosen daily ledger.'}
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsEditAttendanceOpen(false)}
                  className="absolute top-6 left-6 rtl:left-auto rtl:right-6 text-white/70 hover:text-white transition duration-200 cursor-pointer"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh] font-sans text-right rtl:text-right">
                {/* Employee Name & Date details */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-[#0a1945]">
                      {(() => {
                        const emp = staff.find(s => s.id === editingAttendanceLog.empId);
                        return emp ? (lang === 'ar' ? emp.nameAr : emp.name) : 'Staff';
                      })()}
                    </span>
                    <span className="text-slate-400 font-bold">{lang === 'ar' ? 'اسم الموظف' : 'Employee Name'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-slate-200/40 pt-2">
                    <span className="font-bold text-orange-650 font-mono bg-orange-50 px-2 py-0.5 rounded-lg">
                      {attendanceDate}
                    </span>
                    <span className="text-slate-400 font-bold">{lang === 'ar' ? 'التاريخ' : 'Date'}</span>
                  </div>
                </div>

                {/* Period Times Input Fields */}
                <div className="space-y-4 pt-1">
                  <h4 className="text-xs font-black text-slate-700 pb-1 border-b border-slate-100">
                    {lang === 'ar' ? 'تسجيل وساعات الفترات' : 'Configure Period Shifts'}
                  </h4>

                  {/* Period 1 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 text-right">
                      <label className="text-[10px] font-black text-slate-500 block">
                        {lang === 'ar' ? 'الفترة ١: انصراف' : 'Period 1: Out'}
                      </label>
                      <input 
                        type="text"
                        value={editingAttendanceLog.timeOut1}
                        onChange={e => setEditingAttendanceLog(prev => ({ ...prev, timeOut1: e.target.value }))}
                        className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none w-full text-center focus:border-orange-500/50"
                        placeholder="e.g. 12:30 PM"
                      />
                    </div>
                    <div className="space-y-1.5 text-right">
                      <label className="text-[10px] font-black text-slate-500 block">
                        {lang === 'ar' ? 'الفترة ١: حضور' : 'Period 1: In'}
                      </label>
                      <input 
                        type="text"
                        value={editingAttendanceLog.timeIn1}
                        onChange={e => setEditingAttendanceLog(prev => ({ ...prev, timeIn1: e.target.value }))}
                        className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none w-full text-center focus:border-orange-500/50"
                        placeholder="e.g. 08:55 AM"
                      />
                    </div>
                  </div>

                  {/* Period 2 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 text-right">
                      <label className="text-[10px] font-black text-slate-500 block">
                        {lang === 'ar' ? 'الفترة ٢: انصراف' : 'Period 2: Out'}
                      </label>
                      <input 
                        type="text"
                        value={editingAttendanceLog.timeOut2}
                        onChange={e => setEditingAttendanceLog(prev => ({ ...prev, timeOut2: e.target.value }))}
                        className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none w-full text-center focus:border-orange-500/50"
                        placeholder="e.g. 05:00 PM"
                      />
                    </div>
                    <div className="space-y-1.5 text-right">
                      <label className="text-[10px] font-black text-slate-500 block">
                        {lang === 'ar' ? 'الفترة ٢: حضور' : 'Period 2: In'}
                      </label>
                      <input 
                        type="text"
                        value={editingAttendanceLog.timeIn2}
                        onChange={e => setEditingAttendanceLog(prev => ({ ...prev, timeIn2: e.target.value }))}
                        className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none w-full text-center focus:border-orange-500/50"
                        placeholder="e.g. 01:30 PM"
                      />
                    </div>
                  </div>

                  {/* Period 3 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 text-right">
                      <label className="text-[10px] font-black text-slate-500 block">
                        {lang === 'ar' ? 'الفترة ٣: انصراف' : 'Period 3: Out'}
                      </label>
                      <input 
                        type="text"
                        value={editingAttendanceLog.timeOut3}
                        onChange={e => setEditingAttendanceLog(prev => ({ ...prev, timeOut3: e.target.value }))}
                        className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none w-full text-center focus:border-orange-500/50"
                        placeholder="e.g. 07:30 PM"
                      />
                    </div>
                    <div className="space-y-1.5 text-right">
                      <label className="text-[10px] font-black text-slate-500 block">
                        {lang === 'ar' ? 'الفترة ٣: حضور' : 'Period 3: In'}
                      </label>
                      <input 
                        type="text"
                        value={editingAttendanceLog.timeIn3}
                        onChange={e => setEditingAttendanceLog(prev => ({ ...prev, timeIn3: e.target.value }))}
                        className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none w-full text-center focus:border-orange-500/50"
                        placeholder="e.g. 05:00 PM"
                      />
                    </div>
                  </div>

                  {/* Device / Status */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 text-right">
                      <label className="text-[10px] font-black text-slate-500 block">
                        {lang === 'ar' ? 'الحالة' : 'Status'}
                      </label>
                      <input 
                        type="text"
                        value={editingAttendanceLog.status}
                        onChange={e => setEditingAttendanceLog(prev => ({ ...prev, status: e.target.value }))}
                        className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none w-full text-center focus:border-orange-500/50"
                        placeholder="On-Time, Late..."
                      />
                    </div>
                    <div className="space-y-1.5 text-right">
                      <label className="text-[10px] font-black text-slate-500 block">
                        {lang === 'ar' ? 'الوسيلة والمنفذ' : 'Mode / Device'}
                      </label>
                      <input 
                        type="text"
                        value={editingAttendanceLog.mode}
                        onChange={e => setEditingAttendanceLog(prev => ({ ...prev, mode: e.target.value }))}
                        className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none w-full text-center focus:border-orange-500/50"
                        placeholder="Biometric, Manual..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Save / Cancel action buttons */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5 rounded-b-[32px]">
                <button
                  type="button"
                  onClick={() => setIsEditAttendanceOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-650 hover:bg-slate-100 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAttendanceLogs(prev => prev.map(l => l.id === editingAttendanceLog.id ? editingAttendanceLog : l));
                    setIsEditAttendanceOpen(false);
                    triggerHrToast(lang === 'ar' ? 'تم حفظ تعديلات سجل الحضور بنجاح' : 'Attendance record updated successfully!');
                  }}
                  className="px-5 py-2 bg-[#0a1945] hover:bg-orange-600 text-white rounded-lg text-xs font-black transition cursor-pointer shadow-xs"
                >
                  {lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* ========================================================== */}
      {/* DETAILED ADD / EDIT EMPLOYEE CONTRACT MODAL (isEmpModalOpen)*/}
      {/* ========================================================== */}
      <AnimatePresence>
        {isEmpModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEmpModalOpen(false)}
              className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[32px] shadow-2xl max-w-4xl w-full z-50 overflow-hidden border border-slate-150 flex flex-col max-h-[92vh]"
            >
              <form onSubmit={handleSaveEmployee} className="flex flex-col h-full overflow-hidden">
                
                {/* Modal Banner Header */}
                <div className="p-6 bg-gradient-to-r from-[#0a1945] to-orange-500 text-white relative flex justify-between items-center shrink-0">
                  <div className="rtl:text-right text-left pb-1">
                    <h3 className="text-md md:text-lg font-black">{editingEmpId ? (lang === 'ar' ? 'تعديل السجل التعاقدي وملف الموظف' : 'Edit Employee Contract Specs') : (lang === 'ar' ? 'صياغة عقد وتسجيل موظف جديد' : 'Register New Employee Contract')}</h3>
                    <p className="text-white/80 text-[11px] mt-0.5 font-medium">{lang === 'ar' ? 'حدد البيانات الوظيفية واللائحة المالية وبنود البنك الحسابية لتسجيلها في الملف' : 'Configure operational settings, banking wire details and insurance tiers safely.'}</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsEmpModalOpen(false)}
                    className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Form Tabs for Data Sections — 1 on the right in Arabic */}
                <div
                  className="bg-slate-50 border-b border-slate-150 p-2.5 flex items-center justify-start gap-1.5 overflow-x-auto select-none shrink-0"
                  style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}
                >
                  {[
                    { id: 'job', en: '1. Role Setups', ar: '١. البيانات الوظيفية' },
                    { id: 'salary', en: '2. Salary & Increments', ar: '٢. الراتب الأساسي والزيادات' },
                    { id: 'ins', en: '3. Welfare & Bank Account', ar: '٣. التأمين الاجتماعي والحساب البنكي' },
                    { id: 'system', en: '4. System Access', ar: '٤. استخدام النظام' }
                  ].map((tb) => (
                    <button
                      key={tb.id}
                      type="button"
                      onClick={() => setActiveEditTab(tb.id as any)}
                      className={cn(
                        "px-3.5 py-2.5 text-[10px] md:text-xs font-black rounded-lg transition cursor-pointer whitespace-nowrap shrink-0",
                        activeEditTab === tb.id 
                          ? "bg-[#0a1945] text-white shadow-xs font-sans" 
                          : "bg-white text-slate-550 border border-slate-150 hover:text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      {lang === 'ar' ? tb.ar : tb.en}
                    </button>
                  ))}
                </div>

                {/* Form Inputs Grid body */}
                <div className="p-6 overflow-y-auto text-left rtl:text-right text-xs space-y-5 h-[380px] md:h-[400px]">
                  
                  {/* TAB 1: Role setups & Personal info */}
                  {activeEditTab === 'job' && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-[#0a1945] uppercase tracking-wider border-b pb-2">{lang === 'ar' ? 'البيانات الشخصية والتعيين الأساسي' : 'Personal & Administrative Profile Information'}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'الاسم بالكامل (الإنجليزية)' : 'Full Name (English)'}</label>
                          <input type="text" value={empFormNameEn} onChange={e=>setEmpFormNameEn(e.target.value)} placeholder="e.g. Sara Mahmoud" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" required />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'الاسم بالكامل (العربية)' : 'Full Name (Arabic)'}</label>
                          <input type="text" value={empFormNameAr} onChange={e=>setEmpFormNameAr(e.target.value)} placeholder="مثال: سارة محمود" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" required />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'البريد الإلكتروني للعمل' : 'Operational Email Address'}</label>
                          <input type="email" value={empFormEmail} onChange={e=>setEmpFormEmail(e.target.value)} placeholder="alias@ma7aly.com" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'المسمى الوظيفي (شاح مبيعات - En)' : 'Role Title designation (En)'}</label>
                          <input type="text" value={empFormRoleEn} onChange={e=>setEmpFormRoleEn(e.target.value)} placeholder="e.g. Head of Accounts" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'المسمى الوظيفي (العربية)' : 'Role Title designation (Ar)'}</label>
                          <input type="text" value={empFormRoleAr} onChange={e=>setEmpFormRoleAr(e.target.value)} placeholder="مثال: رئيس الحسابات والعهود" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'المدير المباشر المسؤول عن التقييم En' : 'Direct Line Manager (En)'}</label>
                          <input type="text" value={empFormManagerEn} onChange={e=>setEmpFormManagerEn(e.target.value)} placeholder="e.g. Hazem Soliman" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'المدير المباشر المسؤول عن التقييم Ar' : 'Direct Line Manager (Ar)'}</label>
                          <input type="text" value={empFormManagerAr} onChange={e=>setEmpFormManagerAr(e.target.value)} placeholder="مثال: حازم سليمان" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'تاريخ صياغة العقد والتعيين' : 'Hire / Enrollment Date'}</label>
                          <input type="date" value={empFormHireDate} onChange={e=>setEmpFormHireDate(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'الإدارة التابع إليها' : 'Assigned Admin Department'}</label>
                          <select value={empFormDept} onChange={e=>setEmpFormDept(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-extrabold text-[#0a1945]">
                            {departments.map(d=>(
                              <option key={d.id} value={d.id}>{lang === 'ar' ? d.nameAr : d.nameEn}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'القسم الفرعي للدوام' : 'Sub-department section'}</label>
                          <select value={empFormSect} onChange={e=>setEmpFormSect(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700 font-bold">
                            {sections.map(s=>(
                              <option key={s.id} value={s.id}>{lang === 'ar' ? s.nameAr : s.nameEn}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'مجموعة الطاقم والوردية المعهودة' : 'Staff WorkGroup Color'}</label>
                          <select value={empFormGroup} onChange={e=>setEmpFormGroup(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700 font-bold">
                            {employeeGroups.map(g=>(
                              <option key={g.id} value={g.id}>{lang === 'ar' ? g.nameAr : g.nameEn}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">
                            {lang === 'ar' ? 'الفرع التابع له الموظف' : 'Assigned Branch'}
                          </label>
                          <select 
                            value={empFormBankBranchEn} 
                            onChange={e => {
                              const valEn = e.target.value;
                              setEmpFormBankBranchEn(valEn);
                              if (valEn === 'Al-Mamar Branch') setEmpFormBankBranchAr('فرع الممر');
                              else if (valEn === 'Roman Theater Branch') setEmpFormBankBranchAr('فرع المسرح الروماني');
                              else if (valEn === 'Saad Zaghloul Branch') setEmpFormBankBranchAr('فرع سعد زغلول');
                              else if (valEn === 'HQ Main Branch') setEmpFormBankBranchAr('الفرع الرئيسي');
                              else if (valEn === 'Mohandessin Branch') setEmpFormBankBranchAr('فرع المهندسين');
                              else if (valEn === 'Nasr City Branch') setEmpFormBankBranchAr('فرع مدينة نصر');
                              else if (valEn === 'Zamalek Branch') setEmpFormBankBranchAr('فرع الزمالك');
                              else if (valEn === 'Maadi Branch') setEmpFormBankBranchAr('فرع المعادي');
                              else if (valEn === 'Heliopolis Branch') setEmpFormBankBranchAr('فرع مصر الجديدة');
                              else setEmpFormBankBranchAr(valEn);
                            }} 
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-[#0a1945] font-extrabold"
                          >
                            <option value="">{lang === 'ar' ? 'اختر الفرع التابع له...' : 'Select assigned branch...'}</option>
                            <option value="Al-Mamar Branch">{lang === 'ar' ? 'فرع الممر' : 'Al-Mamar Branch'}</option>
                            <option value="Roman Theater Branch">{lang === 'ar' ? 'فرع المسرح الروماني' : 'Roman Theater Branch'}</option>
                            <option value="Saad Zaghloul Branch">{lang === 'ar' ? 'فرع سعد زغلول' : 'Saad Zaghloul Branch'}</option>
                            <option value="HQ Main Branch">{lang === 'ar' ? 'الفرع الرئيسي' : 'HQ Main Branch'}</option>
                            <option value="Mohandessin Branch">{lang === 'ar' ? 'فرع المهندسين' : 'Mohandessin Branch'}</option>
                            <option value="Nasr City Branch">{lang === 'ar' ? 'فرع مدينة نصر' : 'Nasr City Branch'}</option>
                            <option value="Zamalek Branch">{lang === 'ar' ? 'فرع الزمالك' : 'Zamalek Branch'}</option>
                            <option value="Maadi Branch">{lang === 'ar' ? 'فرع المعادي' : 'Maadi Branch'}</option>
                            <option value="Heliopolis Branch">{lang === 'ar' ? 'فرع مصر الجديدة' : 'Heliopolis Branch'}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1 bg-orange-50 text-orange-700 px-1 py-0.5 rounded text-center shrink border border-orange-100">{lang === 'ar' ? 'تحديد وردية الدوام اليومي والالتزام' : 'Assigned Daily Work Shift Presets'}</label>
                          <select value={empFormShift} onChange={e=>setEmpFormShift(e.target.value)} className="w-full p-2.5 bg-orange-50/20 border border-orange-100 text-orange-700 rounded-xl outline-none font-black">
                            {shifts.map(s=>(
                              <option key={s.id} value={s.id}>{lang === 'ar' ? s.nameAr : s.nameEn}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Wages and allowances setups */}
                  {activeEditTab === 'salary' && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-[#0a1945] uppercase tracking-wider border-b pb-2">{lang === 'ar' ? 'هيكل الراتب الأساسي والزيادات ومجموعة الكلفة' : 'Base Salary Structure & Base Increments Settings'}</h4>
                      
                      {/* Interactive block showing the equation */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 mb-1">{lang === 'ar' ? 'الراتب الأساسي عند التعيين (أساسي التعيين)' : 'Base Salary at Hire (Hiring Base)'}</label>
                            <span className="text-[9px] text-slate-400 block mb-2 font-medium leading-tight">{lang === 'ar' ? 'الراتب المعتمد في مستند التعيين الأصلي للموظف' : 'Approved standard base contract salary at hire date'}</span>
                          </div>
                          <input 
                            type="number" 
                            value={empFormSalary} 
                            onChange={e=>setEmpFormSalary(parseFloat(e.target.value)||0)} 
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold font-mono outline-none text-[#0a1945]" 
                            required 
                          />
                        </div>

                        <div className="bg-orange-50/55 p-4 rounded-2xl border border-orange-100 flex flex-col justify-between">
                          <div>
                            <label className="block text-[10px] font-black text-orange-850 mb-1">{lang === 'ar' ? 'إجمالي الزيادات على الراتب الأساسي (+)' : 'Total Salary Increments (+)'}</label>
                            <span className="text-[9px] text-orange-600 block mb-2 font-medium leading-tight">{lang === 'ar' ? 'مجموع كافة العلاوات والزيادات التشجيعية التراكمية' : 'Total accumulated base salary increments'}</span>
                          </div>
                          <div className="w-full p-2.5 bg-white border border-orange-100 text-orange-750 font-black font-mono rounded-xl text-center shadow-2xs">
                            +{empFormAllowances.reduce((s, a) => s + a.amount, 0).toLocaleString()} <span className="text-[8px] font-bold">EGP</span>
                          </div>
                        </div>

                        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-150 flex flex-col justify-between">
                          <div>
                            <label className="block text-[10px] font-black text-emerald-800 mb-1">{lang === 'ar' ? 'الراتب الأساسي الحالي للموظف (=)' : 'Employee\'s Current Base Salary (=)'}</label>
                            <span className="text-[9px] text-emerald-600 block mb-2 font-medium leading-tight">{lang === 'ar' ? 'ينتج تلقائياً: أساسي التعيين مضافاً إليه إجمالي الزيادات' : 'Hiring Base Salary + All Accumulative Increments'}</span>
                          </div>
                          <div className="w-full p-2.5 bg-white border border-emerald-100 text-emerald-650 font-extrabold font-mono rounded-xl text-center shadow-xs">
                            {(empFormSalary + empFormAllowances.reduce((s, a) => s + a.amount, 0)).toLocaleString()} <span className="text-[8px] font-bold">EGP</span>
                          </div>
                        </div>
                      </div>

                      {/* Second Row of general settings */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'الدرجة الوظيفية للمسمى (مثل: الدرجة الثالثة)' : 'Grade Designation Rank'}</label>
                          <input type="text" value={empFormGrade} onChange={e=>setEmpFormGrade(e.target.value)} placeholder="e.g. 05 — مدير مالي" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'مركز التكلفة للموازنة En' : 'Cost Center Budget Tag (En)'}</label>
                          <input type="text" value={empFormCostCenterEn} onChange={e=>setEmpFormCostCenterEn(e.target.value)} placeholder="e.g. 001 — Finance HQ" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'مركز التكلفة للموازنة Ar' : 'Cost Center Budget Tag (Ar)'}</label>
                          <input type="text" value={empFormCostCenterAr} onChange={e=>setEmpFormCostCenterAr(e.target.value)} placeholder="مثال: 001 — إدارة الحسابات العامة" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'طبيعة وموقع الدوام (دوام كامل - جزئي - عن بعد)' : 'Assigned Work Type Setting'}</label>
                          <select value={empFormWorkType} onChange={e=>setEmpFormWorkType(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold">
                            <option value="Full-Time">{lang === 'ar' ? 'دوام كامل (رسمي بمقر الشركة)' : 'Full-Time (Onsite Contract)'}</option>
                            <option value="Part-Time">{lang === 'ar' ? 'دوام جزءي بالتوقيتات' : 'Part-Time'}</option>
                            <option value="Remote">{lang === 'ar' ? 'عن بعد بالكامل (أونلاين)' : 'Remote work contract'}</option>
                          </select>
                        </div>
                      </div>

                      {/* MULTIPLE ALLOWANCES WORKFLOW PANEL */}
                      <div className="bg-slate-50/50 p-4 border border-slate-150 rounded-2xl space-y-3 mt-4">
                        <h5 className="text-[11px] font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wider border-b pb-1">
                          <span>{lang === 'ar' ? 'بنود الزيادات الإضافية المقررة على الراتب الأساسي' : 'Enrolled Contractual Salary Increments List'}</span>
                        </h5>
                        
                        {empFormAllowances.length === 0 ? (
                          <p className="text-[10px] text-slate-400 font-semibold italic">{lang === 'ar' ? 'لا توجـد زيادات مضافة حالياً لملف هذا الموظف.' : 'No salary increments enrolled in this contract yet.'}</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {empFormAllowances.map((alw) => (
                              <div key={alw.id} className="bg-white px-3 py-2 rounded-xl border border-slate-100 flex justify-between items-center text-[11px] shadow-2xs">
                                <div className="text-left rtl:text-right">
                                  <p className="font-extrabold text-slate-800">{lang === 'ar' ? alw.nameAr : alw.nameEn}</p>
                                  <p className="text-[10px] text-orange-500 font-mono font-bold">+{alw.amount.toLocaleString()} EGP</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAllowanceFromForm(alw.id)}
                                  className="p-1 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition"
                                  title={lang === 'ar' ? 'حذف البند' : 'Delete increment'}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Subform to append a new allowance */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-3">
                          <p className="text-[10px] font-black text-[#0a1945]">{lang === 'ar' ? 'تسجيل وإعلاء بند زيادة جديد للراتب الأساسي' : 'Enact New Salary Increment Option'}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 mb-1">{lang === 'ar' ? 'مسمى بند الزيادة بالعربية' : 'Increment Title (Ar)'}</label>
                              <input
                                type="text"
                                value={newAlwTypeAr}
                                onChange={(e) => setNewAlwTypeAr(e.target.value)}
                                placeholder={lang === 'ar' ? 'مثال: علاوة دورية سنوية' : 'e.g. Merit Increment'}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-[11px] outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 mb-1">{lang === 'ar' ? 'مسمى بند الزيادة بالإنجليزية' : 'Increment Title (En)'}</label>
                              <input
                                type="text"
                                value={newAlwTypeEn}
                                onChange={(e) => setNewAlwTypeEn(e.target.value)}
                                placeholder="e.g. Annual base increment"
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-[11px] outline-none"
                              />
                            </div>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="block text-[9px] font-bold text-slate-400 mb-1">{lang === 'ar' ? 'القيمة المالية (ج.م)' : 'Amount (EGP)'}</label>
                                <input
                                  type="number"
                                  value={newAlwAmount || ''}
                                  onChange={(e) => setNewAlwAmount(parseFloat(e.target.value) || 0)}
                                  placeholder="500"
                                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold font-mono text-[11px] outline-none"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={handleAddAllowanceToForm}
                                className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-[10px] px-3.5 rounded-lg active:scale-95 transition flex items-center justify-center h-[31px]"
                              >
                                <Plus size={14} className="mr-0.5" />
                                <span>{lang === 'ar' ? 'إضافة' : 'Add'}</span>
                              </button>
                            </div>
                          </div>
                          
                          {/* Presets Grid to speed things up */}
                          <div className="flex flex-wrap gap-1.5 items-center pt-2 border-t border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400">{lang === 'ar' ? 'قوالب زيادات جاهزة:' : 'Presets:'}</span>
                            {[
                              { ar: 'زيادة سنوية دورية', en: 'Annual regular increment', val: 600 },
                              { ar: 'علاوة ترقية استثنائية', en: 'Exceptional promotion raise', val: 1500 },
                              { ar: 'علاوة مواجهة التضخم', en: 'Cost of living support', val: 1000 },
                              { ar: 'زيادة جدارة وتقييم تميز', en: 'Merit quality performance', val: 800 },
                              { ar: 'علاوة مسؤولية العهدة', en: 'Treasury accountability duty', val: 400 }
                            ].map((p, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setNewAlwTypeAr(p.ar);
                                  setNewAlwTypeEn(p.en);
                                  setNewAlwAmount(p.val);
                                }}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-orange-50 hover:text-orange-600 rounded-lg text-[9px] font-extrabold text-slate-500 transition cursor-pointer"
                              >
                                {lang === 'ar' ? p.ar : p.en} (+{p.val})
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* SALES COMMISSION / SALES PLAN SUBSECTION - WITH A THIN ORANGE LINE SEPARATOR */}
                      <div className="border-t border-orange-500/40 my-6 pt-5">
                        <h4 className="text-xs font-black text-orange-600 uppercase tracking-wider mb-3.5 flex items-center gap-2">
                          <span className="w-1.5 h-3.5 bg-orange-500 rounded-xs" />
                          <span>{lang === 'ar' ? 'خطة تفعيل المبيعات والعمولات للأداء' : 'Direct Performance Sales Plan & Commissions'}</span>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'طريقة احتساب العمولات' : 'Commission Type'}</label>
                            <select value={empFormCommType} onChange={e=>setEmpFormCommType(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold">
                              <option value="None">{lang === 'ar' ? 'لا يوجد عمولة حالياً' : 'None / Not Applicable'}</option>
                              <option value="Percentage">{lang === 'ar' ? 'نسبة مئوية (%) من المبيعات' : 'Percentage (%) on sales volume'}</option>
                              <option value="Fixed">{lang === 'ar' ? 'حافز أداء ثابت مقطوع' : 'Fixed bonus payout'}</option>
                            </select>
                          </div>
                          
                          {empFormCommType !== 'None' && (
                            <>
                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'نسبة العمولة المئوية (%)' : 'Commission Rate (%)'}</label>
                                <input type="number" step="0.01" value={empFormCommRate} onChange={e=>setEmpFormCommRate(parseFloat(e.target.value)||0)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono outline-none" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'مبلغ الحافز المقطوع (ج.م)' : 'Fixed payout amount (EGP)'}</label>
                                <input type="number" value={empFormCommAmount} onChange={e=>setEmpFormCommAmount(parseFloat(e.target.value)||0)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono outline-none" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-[#0a1945] font-extrabold mb-1">{lang === 'ar' ? 'الحد الأدنى لتنشيط العمولة (Quota)' : 'Sales Quota Floor target (EGP)'}</label>
                                <input type="number" value={empFormCommMinSales} onChange={e=>setEmpFormCommMinSales(parseFloat(e.target.value)||0)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono outline-none" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'تاريخ بداية السريان' : 'Timeline Commencement Date'}</label>
                                <input type="date" value={empFormCommStartDate} onChange={e=>setEmpFormCommStartDate(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono font-bold" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'تاريخ نهاية السريان' : 'Timeline Expiration Date'}</label>
                                <input type="date" value={empFormCommEndDate} onChange={e=>setEmpFormCommEndDate(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono font-bold" />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Welfare & Bank Account */}
                  {activeEditTab === 'ins' && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-[#0a1945] uppercase tracking-wider border-b pb-2">{lang === 'ar' ? 'اللوائح والاشتراكات التأمينية الحكومية' : 'Social Insurance Registry Setup'}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'الرقم التأميني للموظف' : 'Insurance Code / File number'}</label>
                          <input type="text" value={empFormInsNumber} onChange={e=>setEmpFormInsNumber(e.target.value)} placeholder="e.g. 54129845" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'تاريخ الاشتراك والتسجيل' : 'Insurance Activation Date'}</label>
                          <input type="date" value={empFormInsSubDate} onChange={e=>setEmpFormInsSubDate(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'قيمة الأجر التأميني للشهر' : 'Insured Base Salary Wage (EGP)'}</label>
                          <input type="number" value={empFormInsWage} onChange={e=>setEmpFormInsWage(parseFloat(e.target.value)||0)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'حصة الموظف من سداد التأمين (%)' : 'Employee Deduct % (Default 11%)'}</label>
                          <input type="number" value={empFormInsRateEmp} onChange={e=>setEmpFormInsRateEmp(parseFloat(e.target.value)||0)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'حصة الشركة من التمويل (%)' : 'Employer Contribution % (Default 18.75%)'}</label>
                          <input type="number" value={empFormInsRateComp} onChange={e=>setEmpFormInsRateComp(parseFloat(e.target.value)||0)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold outline-none" />
                        </div>

                        {/* Orange partition separator for Bank Details inside the form */}
                        <div className="md:col-span-3 border-t-2 border-orange-500 pt-4 mt-2">
                          <h4 className="text-xs font-black text-[#0a1945] uppercase tracking-wider pb-1">{lang === 'ar' ? 'بيانات البنك والحساب التفصيلية للتحويل' : 'Banking Credentials for Automated Bank Auditing'}</h4>
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'اسم البنك بالإنجليزية' : 'Bank Name (En)'}</label>
                          <input type="text" value={empFormBankNameEn} onChange={e=>setEmpFormBankNameEn(e.target.value)} placeholder="e.g. CIB Bank Egypt" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'اسم البنك بالعربية' : 'Bank Name (Ar)'}</label>
                          <input type="text" value={empFormBankNameAr} onChange={e=>setEmpFormBankNameAr(e.target.value)} placeholder="مثال: البنك التجاري الدولي CIB" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'اسم المستفيد في البنك En' : 'Beneficiary Account Holder (En)'}</label>
                          <input type="text" value={empFormBankHolderEn} onChange={e=>setEmpFormBankHolderEn(e.target.value)} placeholder="e.g. Ahmed Ahmed Aly" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'اسم المستفيد في البنك Ar' : 'Beneficiary Account Holder (Ar)'}</label>
                          <input type="text" value={empFormBankHolderAr} onChange={e=>setEmpFormBankHolderAr(e.target.value)} placeholder="مثال: أحمد أحمد علي" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'رقم الحساب المصرفي (الدقيق)' : 'Bank Account Number'}</label>
                          <input type="text" value={empFormBankAccountNum} onChange={e=>setEmpFormBankAccountNum(e.target.value)} placeholder="100054321012" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'رمز السويفت الدولي (SWIFT)' : 'SWIFT Code'}</label>
                          <input type="text" value={empFormBankSwift} onChange={e=>setEmpFormBankSwift(e.target.value)} placeholder="CIBEEGXX" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono outline-none" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'رقم الآيبان الدولي الحسابي (IBAN)' : 'IBAN Account Code'}</label>
                          <input type="text" value={empFormBankIban} onChange={e=>setEmpFormBankIban(e.target.value)} placeholder="EG12000201000456789120001" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">{lang === 'ar' ? 'اسم فرع البنك المسجل' : 'Account Bank Branch Name'}</label>
                          <input type="text" value={empFormBankBranchAr} onChange={e=>setEmpFormBankBranchAr(e.target.value)} placeholder="مثال: فرع المهندسين" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeEditTab === 'system' && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-[#0a1945] uppercase tracking-wider border-b pb-2">
                        {lang === 'ar' ? 'تهيئة صلاحيات واستخدام النظام للموظف' : 'Configure System Access & Security Permissions'}
                      </h4>

                      {/* Main system user toggle */}
                      <div className="flex items-center gap-3 bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                        <input
                          type="checkbox"
                          id="empFormIsSystemUser"
                          className="w-4.5 h-4.5 accent-orange-500 rounded cursor-pointer"
                          checked={empFormIsSystemUser}
                          onChange={(e) => setEmpFormIsSystemUser(e.target.checked)}
                        />
                        <label htmlFor="empFormIsSystemUser" className="text-xs font-black text-slate-700 cursor-pointer select-none">
                          {lang === 'ar' ? 'تمكين الموظف كمستخدم نشط للسيستم' : 'Enable employee as an active system user'}
                        </label>
                      </div>

                      {empFormIsSystemUser && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4"
                        >
                          {/* Username & Password */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-400 mb-1">
                                {lang === 'ar' ? 'اسم المستخدم (Username)' : 'Username'}
                              </label>
                              <input
                                type="text"
                                value={empFormUsername}
                                onChange={(e) => setEmpFormUsername(e.target.value)}
                                placeholder="eg. sara_mahod"
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                                required={empFormIsSystemUser}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-400 mb-1">
                                {lang === 'ar' ? 'كلمة المرور المؤقتة' : 'Temporary Password'}
                              </label>
                              <input
                                type="password"
                                value={empFormPassword}
                                onChange={(e) => setEmpFormPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono font-bold"
                                required={empFormIsSystemUser}
                              />
                            </div>
                          </div>

                          {/* Permission group selection & cashier toggle */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-400 mb-1">
                                {lang === 'ar' ? 'مجموعة الصلاحيات الافتراضية' : 'Default Security Permission Group'}
                              </label>
                              <select
                                value={empFormPermGroup}
                                onChange={(e) => handlePermGroupChange(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 cursor-pointer"
                              >
                                {PERM_GROUPS.map((grp) => (
                                  <option key={grp.id} value={grp.id}>
                                    {lang === 'ar' ? grp.nameAr : grp.nameEn}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="flex flex-col justify-end">
                              <div className="flex items-center gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-150">
                                <input
                                  type="checkbox"
                                  id="empFormIsCashierOrRep"
                                  className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                                  checked={empFormIsCashierOrRep}
                                  onChange={(e) => setEmpFormIsCashierOrRep(e.target.checked)}
                                />
                                <div className="leading-tight">
                                  <label htmlFor="empFormIsCashierOrRep" className="block text-[10px] font-black text-slate-700 cursor-pointer select-none">
                                    {lang === 'ar' ? 'إنشاء وتخصيص خزينة/صندوق فرعي للموظف باسمه' : 'Provision a dedicated Cash Safe / Drawer'}
                                  </label>
                                  <span className="text-[9px] text-slate-400 block font-medium mt-0.5">
                                    {lang === 'ar' ? '(تلقائي للكاشير والمندوبين، وغير مطلوب لموظفي الـ HR والإدارة)' : '(Auto-enabled for Cashiers/Reps, unneeded for HR/Admin)'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Detailed individual permission customization table */}
                          <div className="border border-slate-150 rounded-2xl overflow-hidden mt-4 bg-white">
                            <div className="bg-slate-50 p-3 border-b border-slate-150 flex items-center justify-between">
                              <span className="text-[10px] font-black text-[#0a1945] uppercase tracking-wider">
                                {lang === 'ar' ? 'جدول الصلاحيات المخصصة لشاشات النظام' : 'Detailed UI Access & Operations Customization'}
                              </span>
                              <span className="bg-[#0a1945] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                                {lang === 'ar' ? `المجموعة الحالية: ${PERM_GROUPS.find(g=>g.id===empFormPermGroup)?.nameAr || empFormPermGroup}` : `Active template: ${empFormPermGroup}`}
                              </span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left rtl:text-right border-collapse text-[11px]">
                                <thead>
                                  <tr className="bg-slate-105 text-slate-500 font-extrabold border-b border-slate-150">
                                    <th className="p-3 font-black text-slate-600">{lang === 'ar' ? 'الرابط الأساسي / الشاشة (السايد بار)' : 'Sidebar Section'}</th>
                                    <th className="p-3 text-center w-14 font-black">{lang === 'ar' ? 'عرض' : 'View'}</th>
                                    <th className="p-3 text-center w-14 font-black">{lang === 'ar' ? 'إضافة' : 'Add'}</th>
                                    <th className="p-3 text-center w-14 font-black">{lang === 'ar' ? 'تعديل' : 'Edit'}</th>
                                    <th className="p-3 text-center w-14 font-black">{lang === 'ar' ? 'تصدير' : 'Export'}</th>
                                    <th className="p-3 text-center w-14 font-black">{lang === 'ar' ? 'حذف' : 'Delete'}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {SCREENS_LIST.map((scr) => {
                                    const userScrPerm = empFormCustomPermissions?.[scr.id] || { view: false, add: false, edit: false, export: false, delete: false };
                                    return (
                                      <tr key={scr.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                                        <td className="p-3 font-extrabold text-slate-700">
                                          {lang === 'ar' ? scr.nameAr : scr.nameEn}
                                          <span className="block text-[8px] text-slate-400 font-mono mt-0.5 font-normal uppercase">{scr.id} navigation route</span>
                                        </td>
                                        {(['view', 'add', 'edit', 'export', 'delete'] as const).map((act) => (
                                          <td key={act} className="p-3 text-center">
                                            <input
                                              type="checkbox"
                                              className="w-4 h-4 accent-orange-500 rounded cursor-pointer scale-95"
                                              checked={userScrPerm[act] || false}
                                              onChange={() => handleTogglePermission(scr.id, act)}
                                            />
                                          </td>
                                        ))}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}

                </div>

                {/* Modal Footer controls */}
                <div className="p-5 border-t bg-slate-50 flex items-center justify-end gap-3 rounded-b-[32px] shrink-0">
                  <button 
                    type="button"
                    onClick={() => setIsEmpModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-250 text-slate-600 rounded-lg text-xs font-black transition cursor-pointer"
                  >
                    {lang === 'ar' ? 'إلغاء الأمر' : 'Cancel'}
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-lg transition cursor-pointer hover:shadow-md text-xs"
                  >
                    {editingEmpId ? (lang === 'ar' ? 'حفظ وتحديث الملف' : 'Save Profile Specs') : (lang === 'ar' ? 'اعتماد العقد وتسجيل الموظف' : 'Sign & Hire Employee')}
                  </button>
                </div>

              </form>
                    </motion.div>
                  </div>
        )}
      </AnimatePresence>

      {/* ========================================================== */}
      {/* BEAUTIFUL MANUAL ATTENDANCE POPUP REGISTER MODAL */}
      {/* ========================================================== */}
      <AnimatePresence>
        {isManualAttendanceOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsManualAttendanceOpen(false)}
              className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 z-50 flex flex-col font-sans text-xs"
            >
              {/* Header section with theme style */}
              <div className="px-5 flex items-center justify-between bg-orange-500" style={{ height: '66px' }}>
                <div className="text-left rtl:text-right">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/80 block mb-1">
                    {lang === 'ar' ? 'تسجيل يدوي موثق' : 'MANUAL ATTENDANCE LOG'}
                  </span>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    {manualAttendanceType === 'in' ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{lang === 'ar' ? 'سجل حضور الموظف الجديد' : 'Clock In Employee'}</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        <span>{lang === 'ar' ? 'سجل انصراف الموظف الجديد' : 'Clock Out Employee'}</span>
                      </>
                    )}
                  </h3>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsManualAttendanceOpen(false)}
                  className="p-2 text-slate-400 hover:text-orange-500 hover:bg-slate-100/80 rounded-lg transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveManualAttendance} className="p-6 space-y-5">
                {/* 1. Today's date displayed beautifully at the top */}
                <div className="p-3.5 bg-orange-50/60 border border-orange-100/80 rounded-2xl text-center">
                  <span className="block text-[9px] font-bold text-orange-500 uppercase tracking-widest mb-0.5">
                    {lang === 'ar' ? 'تاريخ اليوم' : 'TODAY\'S REGISTERED DATE'}
                  </span>
                  <span className="text-xs font-black text-[#0a1945] font-sans">
                    {new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>

                {/* 2. Employee Dropdown */}
                <div className="space-y-1.5 text-left rtl:text-right">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {lang === 'ar' ? 'اختر اسم الموظف من الطاقم' : 'Select Employee Name'}
                  </label>
                  <select
                    value={manualAttendanceEmpId}
                    onChange={(e) => setManualAttendanceEmpId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-205 rounded-xl text-xs font-bold text-[#0a1945] outline-none focus:border-orange-400 cursor-pointer text-center"
                    required
                  >
                    <option value="" disabled>
                      {lang === 'ar' ? '-- حدد الموظف --' : '-- Select employee --'}
                    </option>
                    {staff.map((emp) => (
                      <option key={emp.id} value={emp.id} className="font-bold">
                        {lang === 'ar' ? `${emp.nameAr} (${emp.id})` : `${emp.name} (${emp.id})`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Record Time manually */}
                <div className="space-y-1.5 text-left rtl:text-right">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {lang === 'ar' ? 'تسجيل الوقت' : 'Record Time'}
                  </label>
                  <input
                    type="time"
                    value={manualAttendanceTime}
                    onChange={(e) => setManualAttendanceTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-205 rounded-xl text-xs font-black text-[#0a1945] font-mono outline-none focus:border-orange-400 text-center"
                    required
                  />
                </div>

                {/* Footer Submit Buttons */}
                <div className="pt-3 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsManualAttendanceOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-black transition cursor-pointer"
                  >
                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-lg transition cursor-pointer text-xs shadow-md"
                  >
                    {lang === 'ar' ? 'تسجيل الآن' : 'Save Attendance'}
                  </button>
                </div>
              </form>
                    </motion.div>
                  </div>
        )}
      </AnimatePresence>

    </div>
  );
};
