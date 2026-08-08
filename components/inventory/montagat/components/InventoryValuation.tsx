/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchBranches, type BranchDto } from '@/lib/api/branches';
import { useAuth } from '@/lib/auth/AuthContext';
import { 
  Home, 
  Search, 
  Plus, 
  Trash2, 
  TrendingUp, 
  Coins, 
  FileSpreadsheet, 
  ChevronDown, 
  Sparkles,
  AlertCircle,
  X,
  MapPin,
  Percent,
  Download,
  Printer,
  FileText
} from 'lucide-react';
import { Product, InventoryBalance, Warehouse, Season, Size, Color } from '../types';

interface InventoryValuationProps {
  products: Product[];
  balances: InventoryBalance[];
  warehouses: Warehouse[];
  seasons: Season[];
  sizes: Size[];
  colors: Color[];
  
  onAddWarehouse: (wh: Warehouse) => void | Promise<void>;
  onDeleteWarehouse: (code: string) => void;
  onUpdateBalance: (id: string, qty: number) => void;
}

export default function InventoryValuation({
  products,
  balances,
  warehouses,
  seasons,
  sizes,
  colors,
  onAddWarehouse,
  onDeleteWarehouse,
  onUpdateBalance,
}: InventoryValuationProps) {
  const { branches: authBranches, activeBranchId } = useAuth();

  // Sub-tabs inside Inventory module
  const [activeSubTab, setActiveSubTab] = useState<'balances' | 'valuation' | 'warehouses'>('balances');
  
  // Balances filter
  const [balanceSearch, setBalanceSearch] = useState('');
  const [balanceWhFilter, setBalanceWhFilter] = useState('');

  // Valuation filters (As seen in User Screenshot - Warehouse & Season)
  const [valWhFilter, setValWhFilter] = useState(warehouses[0]?.code || '');
  const [valSeasonFilter, setValSeasonFilter] = useState('current');

  // New warehouse state
  const [isWhModalOpen, setIsWhModalOpen] = useState(false);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [newWh, setNewWh] = useState({
    code: '',
    name: '',
    branchId: '',
    manager: '',
    isDefaultSalePoint: false,
    description: '',
  });
  const [whError, setWhError] = useState('');
  const [whSaving, setWhSaving] = useState(false);

  useEffect(() => {
    void fetchBranches()
      .then((rows) => setBranches(rows.filter((b) => b.is_active)))
      .catch(() => setBranches([]));
  }, []);

  const branchOptions = useMemo(() => {
    if (branches.length > 0) return branches;
    return authBranches.map(
      (b): BranchDto => ({
        id: b.id,
        code: b.code,
        name_ar: b.name_ar,
        name_en: b.name_en,
        image_url: b.image_url ?? null,
        is_active: true,
      }),
    );
  }, [branches, authBranches]);

  const openWhModal = () => {
    setWhError('');
    const preferred =
      activeBranchId && branchOptions.some((b) => b.id === activeBranchId)
        ? activeBranchId
        : '';
    const defaultBranchId =
      branchOptions.length === 1 ? branchOptions[0].id : preferred;
    setNewWh((prev) => ({
      ...prev,
      branchId: prev.branchId || defaultBranchId,
    }));
    setIsWhModalOpen(true);
  };

  // Inline editing state for balances
  const [editingBalanceId, setEditingBalanceId] = useState<string | null>(null);
  const [editingQtyValue, setEditingQtyValue] = useState(0);

  // Toast confirmation state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleCopyBalancesTSV = () => {
    const headers = [
      "كود الصنف",
      "اسم الصنف",
      "المستودع",
      "المقاس",
      "اللون",
      "سعر البيع (ج.م)",
      "الكمية المتاحة (رصيد)",
      "إجمالي قيمة معروض (ج.م)"
    ];

    const rows = filteredBalances.map(b => {
      const prod = products.find(p => p.code === b.productCode);
      const sObj = sizes.find(s => s.code === b.sizeCode);
      const cObj = colors.find(c => c.code === b.colorCode);
      const whObj = warehouses.find(w => w.code === b.warehouseCode);

      return [
        b.productCode,
        prod ? prod.name : '',
        whObj ? whObj.name : b.warehouseCode,
        sObj ? sObj.name : b.sizeCode,
        cObj ? cObj.name : b.colorCode,
        prod ? prod.sellPrice : 0,
        b.quantity,
        prod ? (prod.sellPrice * b.quantity) : 0
      ];
    });

    const tsvContent = [
      headers.join("\t"),
      ...rows.map(row => row.join("\t"))
    ].join("\n");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsvContent)
        .then(() => {
          triggerToast("📋 تم نسخ جرد أرصدة المخازن بنجاح! يمكنك الآن لصقها مباشرة (Ctrl+V) في Excel أو Google Sheets.");
        })
        .catch(() => {
          fallbackCopyText(tsvContent, "أرصدة المخازن");
        });
    } else {
      fallbackCopyText(tsvContent, "أرصدة المخازن");
    }
  };

  const handleCopyValuationTSV = () => {
    const headers = [
      "كود الصنف",
      "اسم وموديل الصنف",
      "الكمية الإجمالية",
      "تكلفة الشراء الفردية (ج.م)",
      "إجمالي تكلفة الشراء (ج.م)",
      "سعر البيع الفردي (ج.م)",
      "إجمالي قيمة البيع (ج.م)",
      "هامش الربح المساهم (ج.م)"
    ];

    const rows = valuationContributions.map(({ product, qty, buySum, sellSum }) => [
      product.code,
      product.name,
      qty,
      product.buyPrice,
      buySum,
      product.sellPrice,
      sellSum,
      sellSum - buySum
    ]);

    const tsvContent = [
      headers.join("\t"),
      ...rows.map(row => row.join("\t"))
    ].join("\n");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsvContent)
        .then(() => {
          triggerToast("📊 تم نسخ تقرير تقييم المخزون والأرباح المتوقعة! يمكنك الآن لصقها مباشرة (Ctrl+V) في Excel.");
        })
        .catch(() => {
          fallbackCopyText(tsvContent, "تقييم المخزون");
        });
    } else {
      fallbackCopyText(tsvContent, "تقييم المخزون");
    }
  };

  const fallbackCopyText = (text: string, title: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      triggerToast(`📋 تم نسخ تقرير ${title} بنجاح عبر النسخ الاحتياطي! جاهز للصق في Excel.`);
    } catch (err) {
      triggerToast("❌ لم نتمكن من النسخ تلقائياً، يرجى تفعيل صلاحية الحافظة في متصفحك.");
    }
    document.body.removeChild(textArea);
  };

  // Export CSV Helper with UTF-8 BOM for perfect Excel Arabic support
  const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent = [
      headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(","),
      ...rows.map(row => row.map(cell => {
        const cellStr = cell === null || cell === undefined ? '' : String(cell);
        return `"${cellStr.replace(/"/g, '""')}"`;
      }).join(","))
    ].join("\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportBalancesExcel = () => {
    const headers = [
      "كود الصنف",
      "اسم الصنف",
      "المستودع",
      "المقاس",
      "اللون",
      "سعر البيع (ج.م)",
      "الكمية المتاحة (رصيد)",
      "إجمالي قيمة معروض (ج.م)"
    ];

    const rows = filteredBalances.map(b => {
      const prod = products.find(p => p.code === b.productCode);
      const sObj = sizes.find(s => s.code === b.sizeCode);
      const cObj = colors.find(c => c.code === b.colorCode);
      const whObj = warehouses.find(w => w.code === b.warehouseCode);

      return [
        b.productCode,
        prod ? prod.name : '',
        whObj ? whObj.name : b.warehouseCode,
        sObj ? sObj.name : b.sizeCode,
        cObj ? cObj.name : b.colorCode,
        prod ? prod.sellPrice : 0,
        b.quantity,
        prod ? (prod.sellPrice * b.quantity) : 0
      ];
    });

    const whName = balanceWhFilter 
      ? (warehouses.find(w => w.code === balanceWhFilter)?.name || 'مستودع_محدد') 
      : 'كافة_المستودعات';

    exportToCSV(`تقرير_أرصدة_المخازن_${whName}_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const handleExportValuationExcel = () => {
    const headers = [
      "كود الصنف",
      "اسم وموديل الصنف",
      "الكمية الإجمالية",
      "تكلفة الشراء الفردية (ج.م)",
      "إجمالي تكلفة الشراء (ج.م)",
      "سعر البيع الفردي (ج.م)",
      "إجمالي قيمة البيع (ج.م)",
      "هامش الربح المساهم (ج.م)"
    ];

    const rows = valuationContributions.map(({ product, qty, buySum, sellSum }) => [
      product.code,
      product.name,
      qty,
      product.buyPrice,
      buySum,
      product.sellPrice,
      sellSum,
      sellSum - buySum
    ]);

    const whName = valWhFilter 
      ? (warehouses.find(w => w.code === valWhFilter)?.name || 'مستودع_محدد') 
      : 'كافة_المستودعات';
    const seasonName = valSeasonFilter 
      ? (seasons.find(s => s.code === valSeasonFilter)?.name || 'موسم_محدد') 
      : 'كافة_المواسم';

    exportToCSV(`تقرير_تقييم_مخزون_${whName}_${seasonName}_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const printReportHTML = (title: string, subtitle: string, headers: string[], rows: (string | number)[][], summaryStats?: { label: string, value: string }[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("عذراً، يرجى السماح بالنوافذ المنبثقة (Popups) في متصفحك لتتمكن من معاينة وطباعة التقرير.");
      return;
    }

    const currentDate = new Date().toLocaleString('ar-EG', {
      calendar: 'gregorian',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });

    const statsHTML = summaryStats && summaryStats.length > 0 
      ? `
        <div class="stats-container">
          ${summaryStats.map(stat => `
            <div class="stat-card">
              <div class="stat-label">${stat.label}</div>
              <div class="stat-value">${stat.value}</div>
            </div>
          `).join('')}
        </div>
      `
      : '';

    const tableHeaderHTML = headers.map(h => `<th>${h}</th>`).join('');
    
    const tableRowsHTML = rows.map((row, i) => `
      <tr style="${i % 2 === 0 ? 'background-color: #ffffff;' : 'background-color: #f8fafc;'}">
        ${row.map(cell => `<td>${cell}</td>`).join('')}
      </tr>
    `).join('');

    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>${title}</title>
          <meta charset="utf-8" />
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
            body {
              font-family: 'Cairo', sans-serif;
              color: #1e293b;
              padding: 40px;
              margin: 0;
              background-color: #ffffff;
              font-size: 11px;
            }
            .header-print {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #cbd5e1;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .company-info h1 {
              font-size: 16px;
              font-weight: 800;
              color: #1e3a8a;
              margin: 0 0 4px 0;
            }
            .company-info p {
              font-size: 10px;
              color: #64748b;
              margin: 0;
            }
            .report-meta {
              text-align: left;
              font-size: 10px;
              color: #64748b;
              line-height: 1.5;
            }
            .report-title-block {
              text-align: center;
              margin-bottom: 25px;
            }
            .report-title {
              font-size: 18px;
              font-weight: 800;
              color: #0f172a;
              margin: 0 0 6px 0;
            }
            .report-subtitle {
              font-size: 11px;
              color: #475569;
              margin: 0;
            }
            .stats-container {
              display: grid;
              grid-template-columns: repeat(${summaryStats ? summaryStats.length : 1}, 1fr);
              gap: 12px;
              margin-bottom: 20px;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 12px;
              border-radius: 8px;
            }
            .stat-card {
              text-align: center;
              border-left: 1px solid #e2e8f0;
              padding: 4px;
            }
            .stat-card:last-child {
              border-left: none;
            }
            .stat-label {
              font-size: 10px;
              color: #64748b;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .stat-value {
              font-size: 13px;
              color: #1e3a8a;
              font-weight: 800;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th {
              padding: 8px 10px;
              border-bottom: 2px solid #e2e8f0;
              background-color: #f1f5f9;
              text-align: right;
              font-size: 10px;
              color: #475569;
              font-weight: bold;
            }
            td {
              padding: 8px 10px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 10px;
              color: #334155;
            }
            .signatures {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
              gap: 20px;
            }
            .signature-box {
              flex: 1;
              border-top: 1px dashed #94a3b8;
              text-align: center;
              padding-top: 6px;
              font-size: 10px;
              font-weight: bold;
              color: #475569;
            }
            .no-print {
              text-align: center;
              margin-bottom: 20px;
              background-color: #eff6ff;
              border: 1px solid #bfdbfe;
              padding: 10px;
              border-radius: 6px;
            }
            .btn-print {
              background-color: #2563eb;
              color: white;
              border: none;
              padding: 8px 24px;
              font-size: 11px;
              font-weight: bold;
              border-radius: 6px;
              cursor: pointer;
              font-family: 'Cairo', sans-serif;
              transition: all 0.2s;
            }
            .btn-print:hover {
              background-color: #1d4ed8;
            }
            @media print {
              body { padding: 10px; }
              .no-print { display: none; }
              th { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .stats-container { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="no-print">
            <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: bold; color: #1e40af;">📄 تقرير جاهز للطباعة والتحميل كملف PDF</p>
            <button class="btn-print" onclick="window.print();">تأكيد الطباعة أو الحفظ كـ PDF 🖨️</button>
          </div>

          <div class="header-print">
            <div class="company-info">
              <h1>مجموعة الشامي للأزياء والموضة</h1>
              <p>قسم إدارة المستودعات واللوجستيات الموحد</p>
            </div>
            <div class="report-meta">
              <div><strong>تاريخ الطباعة:</strong> ${currentDate}</div>
              <div><strong>نوع التقرير:</strong> تقرير جرد إداري شهري</div>
            </div>
          </div>

          <div class="report-title-block">
            <h2 class="report-title">${title}</h2>
            <p class="report-subtitle">${subtitle}</p>
          </div>

          ${statsHTML}

          <table>
            <thead>
              <tr>
                ${tableHeaderHTML}
              </tr>
            </thead>
            <tbody>
              ${tableRowsHTML}
            </tbody>
          </table>

          <div class="signatures">
            <div class="signature-box">توقيع مسؤول المستودع / أمين العهدة</div>
            <div class="signature-box">توقيع مراجع الحسابات المالية</div>
            <div class="signature-box">اعتماد المدير العام للشركة</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintBalancesPDF = () => {
    const title = "تقرير جرد أرصدة بضائع ومعارض الملابس";
    const whName = balanceWhFilter 
      ? (warehouses.find(w => w.code === balanceWhFilter)?.name || 'مستودع محدد') 
      : 'جميع المعارض والمستودعات بالتفصيل';
    const subtitle = `مستخرج من مستودع: [${whName}] - لحالة الأرصدة الحالية في النظام`;

    const headers = [
      "كود الصنف",
      "اسم وموديل الملبس",
      "المستودع المتواجد",
      "المقاس",
      "اللون",
      "سعر البيع",
      "الرصيد المتاح",
      "إجمالي قيمة معروض"
    ];

    const rows = filteredBalances.map(b => {
      const prod = products.find(p => p.code === b.productCode);
      const sObj = sizes.find(s => s.code === b.sizeCode);
      const cObj = colors.find(c => c.code === b.colorCode);
      const whObj = warehouses.find(w => w.code === b.warehouseCode);

      return [
        b.productCode,
        prod ? prod.name : '',
        whObj ? whObj.name : b.warehouseCode,
        sObj ? sObj.name : b.sizeCode,
        cObj ? cObj.name : b.colorCode,
        prod ? `${prod.sellPrice.toLocaleString()} ج.م` : '0 ج.م',
        `${b.quantity} قطعة`,
        prod ? `${(prod.sellPrice * b.quantity).toLocaleString()} ج.م` : '0 ج.م'
      ];
    });

    const totalQty = filteredBalances.reduce((acc, b) => acc + b.quantity, 0);
    const totalVal = filteredBalances.reduce((acc, b) => {
      const prod = products.find(p => p.code === b.productCode);
      return acc + (prod ? (prod.sellPrice * b.quantity) : 0);
    }, 0);

    const summaryStats = [
      { label: "إجمالي السجلات المفحوصة", value: `${filteredBalances.length} سجل` },
      { label: "إجمالي كميات قطع الملابس المتاحة", value: `${totalQty.toLocaleString()} قطعة` },
      { label: "القيمة السوقية الإجمالية لمعروض البضاعة", value: `${totalVal.toLocaleString()} ج.م` }
    ];

    printReportHTML(title, subtitle, headers, rows, summaryStats);
  };

  const handlePrintValuationPDF = () => {
    const title = "تقرير تقييم رأس المال ومخازن التجزئة الفصلي";
    const whName = valWhFilter 
      ? (warehouses.find(w => w.code === valWhFilter)?.name || 'مستودع محدد') 
      : 'كافة المستودعات والمنافذ الإدارية بالتوالي';
    const seasonName = valSeasonFilter 
      ? (seasons.find(s => s.code === valSeasonFilter)?.name || 'كافة المواسم') 
      : 'جميع مواسم الملابس المعرفة';
    const subtitle = `المستودع: [${whName}] | الموسم المستهدف: [${seasonName}]`;

    const headers = [
      "كود الصنف",
      "اسم الصنف",
      "الكمية المتاحة",
      "تكلفة الشراء الكلية",
      "قيمة البيع المتوقعة الكلية",
      "صافي الربح التقديري"
    ];

    const rows = valuationContributions.map(({ product, qty, buySum, sellSum }) => [
      product.code,
      product.name,
      `${qty} قطعة`,
      `${buySum.toLocaleString()} ج.م`,
      `${sellSum.toLocaleString()} ج.م`,
      `${(sellSum - buySum).toLocaleString()} ج.م`
    ]);

    const summaryStats = [
      { label: "الكمية المتاحة إجمالاً", value: `${valuationMetrics.totalQty.toLocaleString()} قطعة` },
      { label: "إجمالي قيمة الشراء (التكلفة)", value: `${valuationMetrics.buyValue.toLocaleString()} ج.م` },
      { label: "إجمالي قيمة البيع (السوقية)", value: `${valuationMetrics.sellValue.toLocaleString()} ج.م` },
      { label: "هامش الربح المتوقع الكلي", value: `${valuationMetrics.expectedProfit.toLocaleString()} ج.م (${valuationMetrics.margin.toFixed(1)}%)` }
    ];

    printReportHTML(title, subtitle, headers, rows, summaryStats);
  };

  // Filtered Stock Balances
  const filteredBalances = useMemo(() => {
    return balances.filter(b => {
      if (balanceWhFilter && b.warehouseCode !== balanceWhFilter) return false;
      
      const prod = products.find(p => p.code === b.productCode);
      if (!prod) return false;

      if (balanceSearch) {
        const query = balanceSearch.toLowerCase();
        const matchesName = prod.name.toLowerCase().includes(query);
        const matchesCode = prod.code.toLowerCase().includes(query);
        return matchesName || matchesCode;
      }

      return true;
    });
  }, [balances, products, balanceSearch, balanceWhFilter]);

  // Valuation computations (Inspired by User Screenshot style: Buy, Sell, Display, Qty)
  const valuationMetrics = useMemo(() => {
    let totalQty = 0;
    let buyValue = 0;
    let sellValue = 0;

    // Filter balances first by selected warehouse and selected season's products
    const targetBalances = balances.filter(b => {
      if (valWhFilter && b.warehouseCode !== valWhFilter) return false;
      
      const prod = products.find(p => p.code === b.productCode);
      if (!prod) return false;

      if (valSeasonFilter && prod.seasonCode !== valSeasonFilter) return false;
      
      return true;
    });

    targetBalances.forEach(b => {
      const prod = products.find(p => p.code === b.productCode);
      if (prod) {
        totalQty += b.quantity;
        buyValue += (prod.buyPrice * b.quantity);
        sellValue += (prod.sellPrice * b.quantity);
      }
    });

    return {
      totalQty,
      buyValue,
      sellValue,
      displayValue: sellValue, // typically same as selling in retail ERP
      expectedProfit: sellValue - buyValue,
      margin: sellValue ? ((sellValue - buyValue) / sellValue) * 100 : 0
    };
  }, [balances, products, valWhFilter, valSeasonFilter]);

  // List of products contributing to selected valuation filter
  const valuationContributions = useMemo(() => {
    const contributionMap: Record<string, { product: Product; qty: number; buySum: number; sellSum: number }> = {};
    
    balances.forEach(b => {
      if (valWhFilter && b.warehouseCode !== valWhFilter) return false;
      
      const prod = products.find(p => p.code === b.productCode);
      if (!prod) return;

      if (valSeasonFilter && prod.seasonCode !== valSeasonFilter) return;

      if (!contributionMap[b.productCode]) {
        contributionMap[b.productCode] = { product: prod, qty: 0, buySum: 0, sellSum: 0 };
      }
      contributionMap[b.productCode].qty += b.quantity;
      contributionMap[b.productCode].buySum += (prod.buyPrice * b.quantity);
      contributionMap[b.productCode].sellSum += (prod.sellPrice * b.quantity);
    });

    return Object.values(contributionMap).sort((a, b) => b.sellSum - a.sellSum);
  }, [balances, products, valWhFilter, valSeasonFilter]);

  // Handle warehouse form submit
  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhError('');

    if (!newWh.name.trim()) {
      setWhError('الرجاء إدخال اسم المستودع.');
      return;
    }
    if (!newWh.branchId.trim()) {
      setWhError('الرجاء اختيار الفرع من القائمة.');
      return;
    }

    if (newWh.code.trim() && warehouses.some((w) => w.code === newWh.code.trim())) {
      setWhError('كود هذا المستودع موجود بالفعل!');
      return;
    }

    const branch = branchOptions.find((b) => b.id === newWh.branchId);
    setWhSaving(true);
    try {
      await onAddWarehouse({
        code: newWh.code.trim(),
        name: newWh.name.trim(),
        branch: branch ? `${branch.code} — ${branch.name_ar}` : '—',
        branchId: newWh.branchId.trim(),
        manager: newWh.manager.trim(),
        isDefaultSalePoint: newWh.isDefaultSalePoint,
        description: newWh.description.trim() || undefined,
      });
      setNewWh({ code: '', name: '', branchId: '', manager: '', isDefaultSalePoint: false, description: '' });
      setIsWhModalOpen(false);
      setActiveSubTab('warehouses');
      triggerToast('تم إضافة المستودع بنجاح');
    } catch (err) {
      setWhError(err instanceof Error ? err.message : 'تعذر إضافة المستودع');
    } finally {
      setWhSaving(false);
    }
  };

  const handleStartEditQty = (balanceId: string, currentQty: number) => {
    setEditingBalanceId(balanceId);
    setEditingQtyValue(currentQty);
  };

  const handleSaveQty = (balanceId: string) => {
    onUpdateBalance(balanceId, editingQtyValue);
    setEditingBalanceId(null);
  };

  return (
    <div dir="rtl" className="space-y-6">
      
      {/* Title block */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-blue-900 tracking-tight flex items-center gap-2">
            <Home className="text-blue-600" />
            إدارة المخازن، الأرصدة وتقييم البضاعة (Warehousing & Valuation)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            مراقبة أرصدة المقاسات والألوان بالتفصيل، وتقييم حجم رأس المال والربحية لكل مخزن وموسم.
          </p>
        </div>
      </div>

      {/* Internal Sub-Tabs Navigation */}
      <div className="flex border-b border-gray-200 gap-1.5">
        <button 
          onClick={() => setActiveSubTab('balances')}
          className={`pb-3 px-5 text-xs font-bold transition-all relative ${
            activeSubTab === 'balances' 
              ? 'text-blue-600 font-extrabold border-b-2 border-blue-600' 
              : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          أرصدة البضائع بالمعارض ({balances.length})
        </button>
        <button 
          onClick={() => setActiveSubTab('valuation')}
          className={`pb-3 px-5 text-xs font-bold transition-all relative ${
            activeSubTab === 'valuation' 
              ? 'text-blue-600 font-extrabold border-b-2 border-blue-600' 
              : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          📊 حاسبة وتقييم مخازن التجزئة
        </button>
        <button 
          onClick={() => setActiveSubTab('warehouses')}
          className={`pb-3 px-5 text-xs font-bold transition-all relative ${
            activeSubTab === 'warehouses' 
              ? 'text-blue-600 font-extrabold border-b-2 border-blue-600' 
              : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          🏢 دليل المستودعات والفروع ({warehouses.length})
        </button>
      </div>

      {/* RENDER ACTIVE SUB TAB */}
      
      {activeSubTab === 'balances' && (
        <div className="space-y-4">
          
          {/* Filters & Actions */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
            <div className="flex flex-col sm:flex-row flex-1 gap-3">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  placeholder="ابحث باسم الملبس أو الموديل للتحقق من الرصيد..."
                  value={balanceSearch}
                  onChange={(e) => setBalanceSearch(e.target.value)}
                  className="w-full text-xs p-2.5 pr-9 border border-gray-100 rounded-xl bg-gray-50/50 focus:bg-white focus:outline-none"
                />
                <Search size={14} className="absolute right-3 top-3 text-gray-400" />
              </div>

              <div className="w-full sm:w-56 text-xs">
                <select 
                  value={balanceWhFilter} 
                  onChange={(e) => setBalanceWhFilter(e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-150 rounded-xl"
                >
                  <option value="">جميع مخازن وفروع البيع</option>
                  {warehouses.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                </select>
              </div>
            </div>

            {/* Compact Export & Copy Actions */}
            <div className="flex items-center gap-1.5 self-end lg:self-auto shrink-0">
              <button
                onClick={handleCopyBalancesTSV}
                className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="نسخ الجدول لقصقه مباشرة في Excel"
              >
                <FileText size={13} className="text-slate-500" />
                <span>نسخ لـ Excel 📋</span>
              </button>
              <button
                onClick={handleExportBalancesExcel}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 text-[11px] font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download size={13} className="text-emerald-600" />
                <span>ملف Excel 🟢</span>
              </button>
              <button
                onClick={handlePrintBalancesPDF}
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-250 text-[11px] font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer size={13} className="text-blue-600" />
                <span>تقرير PDF 🖨️</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold">
                    <th className="p-4">الصنف والموديل</th>
                    <th className="p-4">المخزن المتواجد</th>
                    <th className="p-4">المقاس</th>
                    <th className="p-4">اللون</th>
                    <th className="p-4">سعر البيع</th>
                    <th className="p-4">الكمية المتاحة (رصيد)</th>
                    <th className="p-4">إجمالي قيمة معروض</th>
                    <th className="p-4 text-center">تعديل رصيد مبرم</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBalances.map((b) => {
                    const prod = products.find(p => p.code === b.productCode);
                    const sObj = sizes.find(s => s.code === b.sizeCode);
                    const cObj = colors.find(c => c.code === b.colorCode);
                    const whObj = warehouses.find(w => w.code === b.warehouseCode);

                    if (!prod) return null;

                    const isEditing = editingBalanceId === b.id;

                    return (
                      <tr key={b.id} className="border-b border-gray-50 hover:bg-blue-50/5 transition-all">
                        {/* Name */}
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                            <div>
                              <span className="font-bold text-gray-800">{prod.name}</span>
                              <span className="block text-[10px] text-gray-400 font-mono">كود: {prod.code}</span>
                            </div>
                          </div>
                        </td>

                        {/* Warehouse */}
                        <td className="p-4 text-gray-600 font-semibold">
                          {whObj ? whObj.name : b.warehouseCode}
                        </td>

                        {/* Size */}
                        <td className="p-4">
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-bold font-mono">
                            {sObj ? sObj.name : b.sizeCode}
                          </span>
                        </td>

                        {/* Color */}
                        <td className="p-4">
                          {cObj ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: cObj.hex }} />
                              <span>{cObj.name}</span>
                            </div>
                          ) : b.colorCode}
                        </td>

                        {/* Sell Price */}
                        <td className="p-4 font-mono font-bold text-gray-500">
                          {prod.sellPrice.toFixed(2)} ج.م
                        </td>

                        {/* Quantity with inline editing support */}
                        <td className="p-4 font-mono">
                          {isEditing ? (
                            <input 
                              type="number" 
                              value={editingQtyValue} 
                              onChange={(e) => setEditingQtyValue(parseInt(e.target.value) || 0)}
                              className="w-20 p-1 border border-blue-400 rounded-lg text-center font-bold focus:outline-none"
                            />
                          ) : (
                            <span className={`font-bold px-2.5 py-1 rounded-full ${
                              b.quantity <= 10 ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {b.quantity} قطعة
                            </span>
                          )}
                        </td>

                        {/* Expected Value */}
                        <td className="p-4 font-mono font-bold text-blue-900">
                          {(prod.sellPrice * b.quantity).toLocaleString()} ج.م
                        </td>

                        {/* Edit actions */}
                        <td className="p-4 text-center">
                          {isEditing ? (
                            <div className="flex justify-center gap-1">
                              <button 
                                onClick={() => handleSaveQty(b.id)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                حفظ
                              </button>
                              <button 
                                onClick={() => setEditingBalanceId(null)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleStartEditQty(b.id, b.quantity)}
                              className="text-xs text-blue-600 hover:underline hover:text-blue-800 font-bold"
                            >
                              تعديل يدوي
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {activeSubTab === 'valuation' && (
        <div className="space-y-6">
          
          {/* Filters for valuation - EXACTLY as screenshots: Warehouse & Season */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-gray-100">
              <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                <MapPin size={14} className="text-indigo-600" />
                فرز وتصفية تقييم المخزون المالي
              </h4>
              <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                <button
                  onClick={handleCopyValuationTSV}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="نسخ الجدول لقصقه مباشرة في Excel"
                >
                  <FileText size={12} className="text-slate-500" />
                  <span>نسخ لـ Excel 📋</span>
                </button>
                <button
                  onClick={handleExportValuationExcel}
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download size={12} className="text-emerald-600" />
                  <span>ملف Excel 🟢</span>
                </button>
                <button
                  onClick={handlePrintValuationPDF}
                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-250 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer size={12} className="text-blue-600" />
                  <span>تقرير PDF 🖨️</span>
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">المستودع أو منفذ البيع المستهدف</label>
                <select 
                  value={valWhFilter} 
                  onChange={(e) => setValWhFilter(e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- كافة المستودعات والمنافذ بالتوالي --</option>
                  {warehouses.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">موسم الملابس المستهدف</label>
                <select 
                  value={valSeasonFilter} 
                  onChange={(e) => setValSeasonFilter(e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- جميع مواسم الملابس معاً --</option>
                  {seasons.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          
          {/* Sum Valuation Cards - MATCHING SCREENSHOT EXACTLY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Buy Value */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-gray-400 block mb-1">قيمة الشراء التكلفة</span>
                  <h3 className="text-2xl font-extrabold text-gray-800 tracking-tight font-mono">
                    {valuationMetrics.buyValue.toLocaleString()} <span className="text-xs font-medium text-gray-400">ج.م</span>
                  </h3>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl text-gray-600">
                  <Coins size={20} />
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-3">التكلفة المالية الحقيقية لشراء البضائع</p>
            </div>

            {/* Sell Value */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-gray-400 block mb-1">قيمة البيع (التجزئة)</span>
                  <h3 className="text-2xl font-extrabold text-blue-900 tracking-tight font-mono">
                    {valuationMetrics.sellValue.toLocaleString()} <span className="text-xs font-medium text-blue-500">ج.م</span>
                  </h3>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                  <TrendingUp size={20} />
                </div>
              </div>
              <p className="text-[10px] text-blue-500 mt-3">القيمة السوقية الكلية للبضاعة بالمعرض</p>
            </div>

            {/* Display Value */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-gray-400 block mb-1">قيمة العرض الحالية</span>
                  <h3 className="text-2xl font-extrabold text-indigo-900 tracking-tight font-mono">
                    {valuationMetrics.displayValue.toLocaleString()} <span className="text-xs font-medium text-indigo-500">ج.م</span>
                  </h3>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                  <Sparkles size={20} />
                </div>
              </div>
              <p className="text-[10px] text-indigo-500 mt-3">إجمالي قيمة العرض والتعليق الحالي بالباركود</p>
            </div>

            {/* Total Quantity */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-gray-400 block mb-1">الكمية الإجمالية المعنية</span>
                  <h3 className="text-2xl font-extrabold text-emerald-900 tracking-tight font-mono">
                    {valuationMetrics.totalQty.toLocaleString()} <span className="text-xs font-medium text-emerald-500">قطعة</span>
                  </h3>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                  <Percent size={20} />
                </div>
              </div>
              <p className="text-[10px] text-emerald-600 mt-3">متوسط هامش الربح: {valuationMetrics.margin.toFixed(1)}%</p>
            </div>

          </div>

          {/* Underlay Contributors list */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center text-xs">
              <span className="font-bold text-gray-700">الأصناف المساهمة في تقييم هذا المخزن/الموسم</span>
              <span className="text-blue-600 font-bold font-mono">الربح المتوقع للمخزن: {valuationMetrics.expectedProfit.toLocaleString()} ج.م</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold">
                    <th className="p-4">الصنف</th>
                    <th className="p-4 text-center">الكمية المتواجدة</th>
                    <th className="p-4">قيمة الشراء الكلية</th>
                    <th className="p-4 font-bold text-blue-900">قيمة البيع الكلية</th>
                    <th className="p-4">هامش الربح المساهم</th>
                  </tr>
                </thead>
                <tbody>
                  {valuationContributions.map(({ product, qty, buySum, sellSum }) => (
                    <tr key={product.code} className="border-b border-gray-50 hover:bg-gray-50/50 transition-all">
                      <td className="p-4 font-bold text-gray-800">
                        {product.name} <span className="text-[10px] text-gray-400 font-mono">({product.code})</span>
                      </td>
                      <td className="p-4 font-mono text-center font-bold text-gray-700">
                        {qty} قطن
                      </td>
                      <td className="p-4 font-mono text-gray-500">
                        {buySum.toLocaleString()} ج.م
                      </td>
                      <td className="p-4 font-mono font-bold text-blue-900">
                        {sellSum.toLocaleString()} ج.م
                      </td>
                      <td className="p-4 font-mono font-bold text-emerald-700">
                        {(sellSum - buySum).toLocaleString()} ج.م
                      </td>
                    </tr>
                  ))}
                  {valuationContributions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400">
                        لا توجد بضائع متوفرة للمخزن والفرع المختار حالياً.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {activeSubTab === 'warehouses' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <div>
              <h4 className="text-xs font-bold text-gray-700">دليل المستودعات المحددة</h4>
              <p className="text-[10px] text-gray-400">إضافة الفروع ونقاط البيع لتتبع الأرصدة تلقائياً</p>
            </div>
            <button 
              onClick={openWhModal}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-all"
            >
              <Plus size={14} />
              إضافة مستودع / فرع جديد
            </button>
          </div>

          {/* Warehouse Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {warehouses.length === 0 ? (
              <p className="col-span-full rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
                لا توجد مستودعات مسجّلة — اضغط «إضافة مستودع / فرع جديد» أعلاه.
              </p>
            ) : null}
            {warehouses.map((wh) => (
              <div
                key={wh.code}
                className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs hover:border-blue-200 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-800">{wh.name}</h4>
                        <span className="text-[10px] text-gray-400 font-mono font-bold">الكود: {wh.code}</span>
                      </div>
                    </div>
                    {wh.isDefaultSalePoint && (
                      <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                        نقطة بيع تلقائية
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 my-2 leading-relaxed">{wh.description || 'لا يوجد وصف مضاف لهذا المستودع.'}</p>
                  
                  <div className="pt-3 border-t border-gray-50 space-y-1.5 text-xs text-gray-600">
                    <p><span className="font-bold text-gray-400">الفرع الرئيسي التابع له:</span> {wh.branch}</p>
                    <p><span className="font-bold text-gray-400">أمين / مدير المستودع المسؤول:</span> {wh.manager || 'غير معين'}</p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-gray-100 flex justify-end">
                  <button 
                    onClick={() => onDeleteWarehouse(wh.code)}
                    disabled={wh.isDefaultSalePoint}
                    title={wh.isDefaultSalePoint ? "لا يمكن حذف مستودع المبيعات الافتراضي" : "حذف المستودع"}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* Modal: Create Warehouse */}
      <AnimatePresence>
        {isWhModalOpen && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-blue-900 text-white">
                <h4 className="text-sm font-bold flex items-center gap-1.5">
                  <Plus size={16} />
                  إضافة مستودع / منفذ بيع ملابس جديد
                </h4>
                <button 
                  onClick={() => setIsWhModalOpen(false)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleCreateWarehouse} className="p-5 space-y-4 text-xs">
                {whError && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 border border-red-100 font-semibold">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{whError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-gray-700 font-bold mb-1">كود المستودع (اختياري)</label>
                  <input 
                    type="text" 
                    value={newWh.code}
                    onChange={(e) => setNewWh({ ...newWh, code: e.target.value })}
                    placeholder="يُولَّد تلقائياً إن تُرك فارغاً"
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">اسم ومسمى المستودع الكامل *</label>
                  <input 
                    type="text" 
                    required
                    value={newWh.name}
                    onChange={(e) => setNewWh({ ...newWh, name: e.target.value })}
                    placeholder="مثال: منفذ بيع ملابس المنصورة"
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">الفرع التابع *</label>
                    <select
                      required
                      value={newWh.branchId}
                      onChange={(e) => setNewWh({ ...newWh, branchId: e.target.value })}
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none bg-white"
                    >
                      <option value="">اختر الفرع...</option>
                      {branchOptions.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code} — {b.name_ar}
                        </option>
                      ))}
                    </select>
                    {branchOptions.length === 0 ? (
                      <p className="mt-1 text-[10px] text-amber-700">
                        لا توجد فروع — أنشئ فرعاً من إعدادات المنشأة أولاً.
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">مسؤول / أمين العهدة للمخزن</label>
                    <input 
                      type="text" 
                      value={newWh.manager}
                      onChange={(e) => setNewWh({ ...newWh, manager: e.target.value })}
                      placeholder="أستاذ سالم عبد العال"
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">وصف موجز للمستودع</label>
                  <textarea 
                    value={newWh.description}
                    onChange={(e) => setNewWh({ ...newWh, description: e.target.value })}
                    placeholder="مخزن لتجميع بضائع صيف 2026..."
                    rows={2}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                  <input 
                    type="checkbox" 
                    id="isDefaultSalePoint"
                    checked={newWh.isDefaultSalePoint} 
                    onChange={(e) => setNewWh({ ...newWh, isDefaultSalePoint: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isDefaultSalePoint" className="text-xs font-bold text-gray-700 cursor-pointer">تعيين هذا المستودع كنقطة بيع افتراضية للمعارض</label>
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                  <button 
                    type="button"
                    onClick={() => setIsWhModalOpen(false)}
                    className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-100 transition-all"
                  >
                    إلغاء
                  </button>
                  <button 
                    type="submit"
                    disabled={whSaving || branchOptions.length === 0 || !newWh.branchId.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/10 disabled:opacity-60"
                  >
                    {whSaving ? 'جاري الحفظ...' : 'حفظ المستودع'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md text-white text-xs font-bold py-3.5 px-6 rounded-2xl shadow-xl border border-slate-800 flex items-center gap-2"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
