import React, { useState, useEffect, useRef } from 'react';
import { Package, Plus, Trash2, Edit, Save, X, Search, FileDown, CheckCircle2, ImagePlus, Printer } from 'lucide-react';
import { cn } from '../lib/utils';
import { PurchaseReturnCreator } from './PurchaseReturnCreator';
import { ProductsListContainer } from './ProductsListContainer';
import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExportDataButton } from './ui/ExportDataButton';


export interface PurchaseItem {
  [key: string]: any;
  productName: string;
  productId?: string;
  qty: number;
  costPrice: number;
  total: number;
}
export interface PurchaseReturn {
  [key: string]: any;
  id?: string;
  returnNo: string;
  supplierName: string;
  returnDate: string;
  dueDate?: string;
  itemsCount?: number;
  totalAmount: number;
  paidAmount?: number;
  remainingAmount?: number;
  paymentMethod: string;
  paymentStatus?: string;
  deliveryStatus?: string;
  items?: PurchaseItem[];
  notes?: string;
  refNo?: string;
  username?: string;
  branch?: string;
  shippingCompany?: string;
  waybillNumber?: string;
}


interface PurchaseReturnsTabProps {
  lang: "ar" | "en";
  products: any[];
  purchaseReturns: PurchaseReturn[];
  setPurchaseReturns: (items: PurchaseReturn[]) => void;
  groups?: any[];
}

export function PurchaseReturnsTab({ lang, products, purchaseReturns, setPurchaseReturns, groups = [] }: PurchaseReturnsTabProps) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingItem, setViewingItem] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isCreatingReturn, setIsCreatingReturn] = useState(false);
  const [currentReturnData, setCurrentReturnData] = useState<any>(null);



  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [printType, setPrintType] = useState<'thermal' | 'a4' | 'a5'>('thermal');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };
  
  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [barcode, setBarcode] = useState("");
  const [sellPrice, setSellPrice] = useState<number | "">("");
  const [costPrice, setCostPrice] = useState<number>(0);
  const [groupId, setGroupId] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [components, setComponents] = useState<any[]>([]);

  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [supplierName, setSupplierName] = useState("");
  const [season, setSeason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("اجل");
  const [cashAmount, setCashAmount] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [checkAmount, setCheckAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  
  // Auto-calculate cost price
  useEffect(() => {
    const total = components.reduce((sum, comp) => {
      const product = products.find(p => p.id === comp.productId);
      const price = product?.costPrice || 0;
      return sum + (price * comp.qty);
    }, 0);
    setCostPrice(total);
  }, [components, products]);
  
  // Component Selection State
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedProductQty, setSelectedProductQty] = useState<number | "">("");

  // Search autocomplete states for components
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productSearchFocused, setProductSearchFocused] = useState(false);
  const [productHighlightedIndex, setProductHighlightedIndex] = useState(0);

  // Refs for navigation and focus
  const productSearchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  const isAr = lang === "ar";

  // Filtered products list for component selection autocomplete
  const filteredProductsList = useMemo(() => {
    const q = productSearchQuery.toLowerCase().trim();
    if (!q) {
      return [];
    }
    return products.filter(p => {
      const pName = (p.name || p.supplierName || "").toLowerCase();
      const pNameAr = (p.nameAr || "").toLowerCase();
      const pNameEn = (p.nameEn || "").toLowerCase();
      const pCode = (p.code || p.returnNo || "").toLowerCase();
      const pBarcode = (p.barcode || p.returnDate || "").toLowerCase();
      return pName.includes(q) || pNameAr.includes(q) || pNameEn.includes(q) || pCode.includes(q) || pBarcode.includes(q);
    }).slice(0, 30);
  }, [products, productSearchQuery]);

  const handleSelectProduct = (prod: any) => {
    setSelectedProductId(prod.id);
    setProductSearchQuery(isAr ? (prod.nameAr || prod.name) : (prod.nameEn || prod.name));
    setProductSearchFocused(false);
    // Focus quantity input and select text
    setTimeout(() => {
      qtyInputRef.current?.focus();
      qtyInputRef.current?.select();
    }, 50);
  };

  // ProductsListContainer State
  const [prodSearchQuery, setProdSearchQuery] = useState("");
  const [isColumnFiltersOpen, setIsColumnFiltersOpen] = useState(false);
  const [advCode, setAdvCode] = useState("");
  const [advBarcode, setAdvBarcode] = useState("");
  const [advCostMin, setAdvCostMin] = useState("");
  const [advCostMax, setAdvCostMax] = useState("");
  const [advSellMin, setAdvSellMin] = useState("");
  const [advSellMax, setAdvSellMax] = useState("");
  const [advBrand, setAdvBrand] = useState("");
  const [advGroup, setAdvGroup] = useState("");
  const [advColor, setAdvColor] = useState("");
  const [advSize, setAdvSize] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const visibleCols = {
    code: true,
    barcode: true,
    brand: true,
    group: true,
    size: true,
    color: true,
    cost: true,
    sell: true,
    qty: true,
    actions: true,
  };

  const resetAdvFilters = () => {
    setAdvCode("");
    setAdvBarcode("");
    setAdvCostMin("");
    setAdvCostMax("");
    setAdvSellMin("");
    setAdvSellMax("");
    setAdvBrand("");
    setAdvGroup("");
    setAdvColor("");
    setAdvSize("");
  };

  const mappedCompositeItems = purchaseReturns.map(item => ({
  ...item,
  brandId: item.totalAmount?.toString(),
  groupId: item.paymentMethod,
  colorId: item.username,
  sizeId: item.branch,
  divisionId: item.shippingCompany,
  itemId: item.waybillNumber,
  costPrice: item.totalAmount,
  sellPrice: 0,
  promoPrice: null,
  name: item.supplierName,
  barcode: item.returnDate,
  code: item.returnNo
}));

  const filteredMappedItems = useMemo(() => {
    return mappedCompositeItems.filter((p: any) => {
      const search = prodSearchQuery.toLowerCase().trim();
      if (search) {
        const matchesGlobal =
          (p.code || '').toLowerCase().includes(search) ||
          (p.barcode || '').toLowerCase().includes(search) ||
          (p.name || '').toLowerCase().includes(search) ||
          (p.supplierName || '').toLowerCase().includes(search);
        if (!matchesGlobal) return false;
      }
      
      if (advCode && !(p.code || '').toLowerCase().includes(advCode.toLowerCase())) return false;
      if (advBarcode && !(p.barcode || '').toLowerCase().includes(advBarcode.toLowerCase())) return false;
      if (advSellMin && p.sellPrice < Number(advSellMin)) return false;
      if (advSellMax && p.sellPrice > Number(advSellMax)) return false;
      if (advBrand && p.brandId !== advBrand) return false;
      if (advGroup && p.groupId !== advGroup) return false;
      if (advColor && p.colorId !== advColor) return false;
      if (advSize && p.sizeId !== advSize) return false;
      return true;
    });
  }, [mappedCompositeItems, prodSearchQuery, advCode, advBarcode, advSellMin, advSellMax, advBrand, advGroup, advColor, advSize]);


  const handleAddComposite = () => {
    if (!name || !code || components.length === 0 || sellPrice === "") {
      alert(isAr ? "يرجى تعبئة جميع الحقول وإضافة صنف واحد على الأقل للمكونات." : "Please fill all fields and add at least one component.");
      return;
    }
    const newItem: any = {
      id: "COMP-" + Date.now(),
      name,
      code,
      barcode,
      sellPrice: Number(sellPrice),
      costPrice,
      groupId,
      image: image || undefined,
      components
    };
    setPurchaseReturns([...purchaseReturns, newItem]);
    resetForm();
    setIsModalOpen(false);
    triggerToast(isAr ? "تمت إضافة الصنف المركب بنجاح" : "Composite item added successfully");
  };

  const handleUpdateComposite = () => {
    if (!name || !code || components.length === 0 || sellPrice === "") return;
    setPurchaseReturns(purchaseReturns.map(item => 
      item.id === editingId 
        ? { ...item, name, code, barcode, sellPrice: Number(sellPrice), costPrice, groupId, image: image || undefined, components }
        : item
    ));
    resetForm();
    setIsModalOpen(false);
    triggerToast(isAr ? "تم تحديث الصنف المركب بنجاح" : "Composite item updated successfully");
  };

  const handleDeleteComposite = (id: string) => {
    if (confirm(isAr ? "هل أنت متأكد من الحذف؟" : "Are you sure you want to delete?")) {
      setPurchaseReturns(purchaseReturns.filter(item => item.id !== id));
    }
  };

  const handleEditComposite = (item: any) => {
    setEditingId(item.id);
    setName(item.name);
    setCode(item.code);
    setBarcode(item.barcode || "");
    setSellPrice(item.sellPrice);
    setCostPrice(item.costPrice || 0);
    setGroupId(item.groupId || "");
    setImage(item.image || null);
    setComponents(item.components);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setCode("");
    setBarcode("");
    setSellPrice("");
    setCostPrice(0);
    setGroupId("");
    setImage(null);
    setComponents([]);
    setSelectedProductId("");
    setSelectedProductQty("");
    setProductSearchQuery("");
    setProductSearchFocused(false);
    setIsModalOpen(false);
  };

  const handlePrint = () => {
    if (!viewingItem) return;
    
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    const isAr = lang === 'ar';
    const item = viewingItem;
    
    // Calculate totals
    const totalCost = item.costPrice || 0;
    
    let columnsHtml = '';
    let itemsRowsHtml = '';

    if (printType === 'thermal') {
      columnsHtml = `
        <th style="padding: 6px; text-align: right; border-bottom: 2px solid #000;">${isAr ? 'الصنف' : 'Item'}</th>
        <th style="padding: 6px; text-align: center; border-bottom: 2px solid #000;">${isAr ? 'الكمية' : 'Qty'}</th>
      `;
      itemsRowsHtml = item.components.map((comp: any) => {
        const p = products.find(prod => prod.id === comp.productId);
        return `
          <tr style="border-bottom: 1px dashed #ccc;">
            <td style="padding: 6px 4px; text-align: right; font-weight: bold; font-size: 13px;">${p ? (isAr ? p.nameAr : p.nameEn) : 'Unknown'}</td>
            <td style="padding: 6px 4px; text-align: center; font-weight: bold; font-size: 13px;">${comp.qty}</td>
          </tr>
        `;
      }).join('');
    } else {
      columnsHtml = `
        <th style="padding: 10px; text-align: right; border-bottom: 2px solid #334155; background: #f8fafc;">${isAr ? 'اسم المكون' : 'Component Name'}</th>
        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #334155; background: #f8fafc;">${isAr ? 'الكمية' : 'Qty'}</th>
        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #334155; background: #f8fafc;">${isAr ? 'سعر التكلفة' : 'Cost Price'}</th>
        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #334155; background: #f8fafc;">${isAr ? 'الإجمالي' : 'Total'}</th>
      `;
      itemsRowsHtml = item.components.map((comp: any) => {
        const p = products.find(prod => prod.id === comp.productId);
        const cost = p?.costPrice || 0;
        return `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; text-align: right; font-weight: bold; color: #0f172a;">${p ? (isAr ? p.nameAr : p.nameEn) : 'Unknown'}</td>
            <td style="padding: 10px; text-align: center; font-weight: bold; color: #0f172a;">${comp.qty}</td>
            <td style="padding: 10px; text-align: center; font-family: monospace; color: #475569;">${cost}</td>
            <td style="padding: 10px; text-align: left; font-family: monospace; font-weight: bold; color: #15803d;">${(comp.qty * cost).toLocaleString()}</td>
          </tr>
        `;
      }).join('');
    }

    const printHtml = `
      <!DOCTYPE html>
      <html lang="${isAr ? 'ar' : 'en'}" dir="${isAr ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8">
        <title>${isAr ? 'بيانات الصنف المركب' : 'Composite Item Details'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=Inter:wght@400;700&display=swap');
          body {
            font-family: ${isAr ? "'Cairo', sans-serif" : "'Inter', sans-serif"};
            color: #333;
            margin: 0;
            padding: ${printType === 'thermal' ? '10px' : '40px'};
            font-size: ${printType === 'thermal' ? '12px' : '14px'};
            line-height: 1.4;
            background: #fff;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: ${printType === 'thermal' ? '2px dashed #000' : '2px solid #ea580c'};
            padding-bottom: 10px;
          }
          .title {
            font-size: ${printType === 'thermal' ? '16px' : '22px'};
            font-weight: 900;
            margin: 5px 0;
            color: ${printType === 'thermal' ? '#000' : '#c2410c'};
          }
          .meta-grid {
            display: grid;
            grid-template-columns: ${printType === 'thermal' ? '1fr' : '1fr 1fr'};
            gap: 10px;
            margin-bottom: 20px;
            background: ${printType === 'thermal' ? 'transparent' : '#f8fafc'};
            padding: ${printType === 'thermal' ? '0' : '15px'};
            border-radius: ${printType === 'thermal' ? '0' : '10px'};
            border: ${printType === 'thermal' ? 'none' : '1px solid #e2e8f0'};
          }
          .meta-item {
            display: flex;
            justify-content: space-between;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 4px;
          }
          .meta-label {
            color: #64748b;
            font-weight: bold;
          }
          .meta-value {
            font-weight: bold;
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          .totals {
            margin-top: 20px;
            text-align: left;
            padding: 10px;
            background: ${printType === 'thermal' ? 'transparent' : '#f8fafc'};
            border-top: ${printType === 'thermal' ? '2px dashed #000' : '1px solid #e2e8f0'};
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            font-size: ${printType === 'thermal' ? '13px' : '16px'};
            font-weight: bold;
            margin-top: 5px;
          }
          @media print {
            body { padding: 0; }
            @page {
              size: ${printType === 'a4' ? 'A4' : printType === 'a5' ? 'A5' : '80mm auto'};
              margin: ${printType === 'thermal' ? '0' : '15mm'};
            }
          }
        </style>
      </head>
      <body onload="window.print(); setTimeout(() => { document.body.removeChild(window.frameElement); }, 1000);">
        <div class="header">
          <div class="title">${item.name}</div>
          <div style="font-weight: bold;">${isAr ? 'كود الصنف:' : 'Item Code:'} ${item.code}</div>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">${isAr ? 'الباركود:' : 'Barcode:'}</span>
            <span class="meta-value">${item.barcode || '-'}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">${isAr ? 'سعر البيع:' : 'Sell Price:'}</span>
            <span class="meta-value">${item.sellPrice}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">${isAr ? 'التكلفة الإجمالية:' : 'Total Cost:'}</span>
            <span class="meta-value">${totalCost}</span>
          </div>
        </div>

        <table style="width: 100%;">
          <thead>
            <tr>
              ${columnsHtml}
            </tr>
          </thead>
          <tbody>
            ${itemsRowsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>${isAr ? 'سعر البيع النهائي:' : 'Final Sell Price:'}</span>
            <span>${item.sellPrice}</span>
          </div>
        </div>
      </body>
      </html>
    `;

    doc.open();
    doc.write(printHtml);
    doc.close();
  };

  const handleAddComponent = () => {
    if (!selectedProductId || selectedProductQty === "") return;
    const existing = components.find(c => c.productId === selectedProductId);
    if (existing) {
      setComponents(components.map(c => c.productId === selectedProductId ? { ...c, qty: c.qty + Number(selectedProductQty) } : c));
    } else {
      setComponents([...components, { productId: selectedProductId, qty: Number(selectedProductQty) }]);
    }
    setSelectedProductId("");
    setSelectedProductQty("");
    setProductSearchQuery("");
    setTimeout(() => {
      productSearchInputRef.current?.focus();
    }, 50);
  };

  const handleRemoveComponent = (idx: number) => {
    setComponents(components.filter((_, i) => i !== idx));
  };

  const filteredItems = purchaseReturns.filter(item => 
    item.supplierName.toLowerCase().includes(search.toLowerCase()) || 
    item.returnNo.toLowerCase().includes(search.toLowerCase())
  );

  
  
  const uniqueAmounts = Array.from(new Set(purchaseReturns.map(inv => inv.totalAmount))).map(a => ({ id: a?.toString() || "", nameEn: a?.toString() || "", nameAr: a?.toString() || "" }));
  const uniquePaymentMethods = Array.from(new Set(purchaseReturns.map(inv => inv.paymentMethod).filter(Boolean))).map(p => ({ id: p, nameEn: p, nameAr: p }));
  const uniqueUsers = Array.from(new Set(purchaseReturns.map(inv => inv.username).filter(Boolean))).map(u => ({ id: u, nameEn: u, nameAr: u }));
  const uniqueBranches = Array.from(new Set(purchaseReturns.map(inv => inv.branch).filter(Boolean))).map(b => ({ id: b, nameEn: b, nameAr: b }));
  const uniqueShippingCompanies = Array.from(new Set(purchaseReturns.map(inv => inv.shippingCompany).filter(Boolean))).map(s => {
    let nameAr = s;
    let nameEn = s;
    if (s === "urgent") { nameAr = "ايرجنت"; nameEn = "Urgent"; }
    else if (s === "mirage") { nameAr = "ميراج"; nameEn = "Mirage"; }
    else if (s === "rapido") { nameAr = "رابيدو"; nameEn = "Rapido"; }
    else if (s === "barq_star") { nameAr = "برق ستار"; nameEn = "Barq Star"; }
    return { id: s, nameEn, nameAr };
  });
  const uniqueWaybills = Array.from(new Set(purchaseReturns.map(inv => inv.waybillNumber).filter(Boolean))).map(w => ({ id: w, nameEn: w, nameAr: w }));


  

  
  if (isCreatingReturn) {
    return (
      <PurchaseReturnCreator 
        lang={lang} 
        returnData={{}}
        products={products}
        onCancel={() => {
          setIsCreatingReturn(false);
          setCurrentReturnData(null);
        }}
        onSave={(data) => {
          setIsCreatingReturn(false);
          setCurrentReturnData(null);
          // Here we should save the data, but for now we just close
        }}
      />
    );
  }

  return (
    <div className={cn("space-y-6", isAr ? "rtl font-[Cairo]" : "ltr")}>
      <div className="bg-white shadow-sm border border-gray-300 rounded-[12px] h-[76px] pt-[9px] pb-[9px] px-[10px] my-0 -mx-[8px]">
        <div className="flex items-center justify-between h-full gap-4">
          <div className="space-y-0.5 overflow-hidden">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2 truncate">
              <Package className="w-5 h-5 text-orange-500 shrink-0" />
              <span className="truncate">{isAr ? "مرتدات المشتريات" : "Purchase Returns"}</span>
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 truncate">
              {isAr ? "إدارة وعرض جميع مرتدات المشتريات" : "Manage and view all purchase returns"}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsCreatingReturn(true)}
              className="px-3 w-[190px] bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs uppercase tracking-wider h-[36px]"
            >
              <Plus size={15} />
              <span className="text-[11px] whitespace-nowrap font-black hidden sm:inline-block">
                {isAr ? "مرتد مشتريات جديد" : "New Return"}
              </span>
            </button>
          </div>
        </div>
      </div>

        
                {/* View Modal */}
        <AnimatePresence>
          {isViewModalOpen && viewingItem && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsViewModalOpen(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-300"
              >
                <div className="p-4 border-b border-orange-600 flex items-center justify-between bg-orange-500 text-white">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5" />
                    <h3 className="text-lg font-black">{isAr ? "عرض بيانات الصنف المركب" : "View Composite Item Details"}</h3>
                  </div>
                  <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-white/20 rounded-lg transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
                  <div className="flex flex-col md:flex-row gap-6">
                    {viewingItem.image && (
                      <div className="w-full md:w-48 h-48 rounded-2xl overflow-hidden border border-gray-300 shadow-sm shrink-0">
                        <img src={viewingItem.image} alt={viewingItem.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 space-y-4">
                      <div>
                        <h4 className="text-2xl font-black text-slate-800">{viewingItem.name}</h4>
                        <p className="text-slate-500 font-bold">{viewingItem.code} | {viewingItem.barcode || "---"}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded-xl border border-gray-300">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isAr ? "سعر التكلفة" : "Cost Price"}</span>
                          <span className="text-lg font-black text-slate-700">${viewingItem.costPrice}</span>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                          <span className="block text-[10px] font-bold text-orange-400 uppercase tracking-wider">{isAr ? "سعر البيع" : "Sell Price"}</span>
                          <span className="text-lg font-black text-orange-600">${viewingItem.sellPrice}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="font-bold text-slate-700 border-b border-gray-300 pb-2">{isAr ? "مكونات الصنف" : "Item Components"}</h5>
                    <div className="bg-white rounded-xl border border-gray-300 overflow-hidden shadow-sm">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 border-b border-gray-300">
                          <tr>
                            <th className="p-3 text-start font-bold uppercase text-[10px] tracking-wider">{isAr ? "الصنف" : "Item"}</th>
                            <th className="p-3 w-32 text-center font-bold uppercase text-[10px] tracking-wider">{isAr ? "الكمية" : "Qty"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-300">
                          {viewingItem.components.map((c: any, idx: number) => {
                            const prod = products.find(p => p.id === c.productId);
                            return (
                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3 font-medium text-slate-700">{prod ? (isAr ? prod.nameAr || prod.name : prod.nameEn || prod.name) : "Unknown"}</td>
                                <td className="p-3 text-center">
                                  <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600">
                                    {c.qty}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-gray-300 space-y-4">
                    <h5 className="font-bold text-slate-700">{isAr ? "خيارات الطباعة" : "Printing Options"}</h5>
                    <div className="flex flex-col gap-3">
                      <select 
                        value={printType}
                        onChange={(e) => setPrintType(e.target.value as any)}
                        className="w-full bg-white border border-gray-300 rounded-xl p-3 text-sm font-bold text-slate-700 focus:border-orange-500 outline-none shadow-sm"
                      >
                        <option value="thermal">{isAr ? 'طباعة حرارية (80mm)' : 'Thermal Printing (80mm)'}</option>
                        <option value="a4">{isAr ? 'طباعة A4' : 'A4 Printing'}</option>
                        <option value="a5">{isAr ? 'طباعة A5' : 'A5 Printing'}</option>
                      </select>
                      
                      <div className="flex gap-3">
                        <button 
                          onClick={handlePrint}
                          className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-black hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-200"
                        >
                          <Printer className="w-4 h-4" />
                          {isAr ? "طباعة" : "Print"}
                        </button>
                        <button 
                          onClick={() => setIsViewModalOpen(false)}
                          className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-lg font-black hover:bg-slate-300 transition-all"
                        >
                          {isAr ? "خروج" : "Close"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Custom Toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-6 left-6 z-[200] bg-slate-800 text-white px-6 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="font-bold text-sm">{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8">
          <ProductsListContainer
            extraToolbarAction={
              <ExportDataButton
                hideText={true}
                lang={lang}
                onToast={triggerToast}
                onCopy={() =>
                  triggerToast(
                    lang === 'ar'
                      ? "تم نسخ البيانات إلى الحافظة"
                      : "Data copied to clipboard!",
                  )
                }
                onPrint={() =>
                  triggerToast(
                    lang === 'ar'
                      ? "تم فتح خيارات الطباعة للجدول"
                      : "Print dialog opened!",
                  )
                }
                className="w-[32px] h-[32px]"
              />
            }
            lang={lang}
            filteredProducts={filteredMappedItems}
            richProducts={mappedCompositeItems}
            brands={uniqueAmounts}
            groups={uniquePaymentMethods}
            colors={uniqueUsers}
            sizes={uniqueBranches}
            divisions={uniqueShippingCompanies}
            items={uniqueWaybills}
            setViewingProduct={(p) => {
              setViewingItem(p);
              setIsViewModalOpen(true);
            }}
            openEditProductModal={(p) => handleEditComposite(p)}
            handleDeleteProduct={(id) => handleDeleteComposite(id)}
            triggerToast={() => {}}
            prodSearchQuery={prodSearchQuery}
            setProdSearchQuery={setProdSearchQuery}
            isColumnFiltersOpen={isColumnFiltersOpen}
            setIsColumnFiltersOpen={setIsColumnFiltersOpen}
            advCode={advCode}
            setAdvCode={setAdvCode}
            advBarcode={advBarcode}
            setAdvBarcode={setAdvBarcode}
            advBrandId={advBrand}
            setAdvBrandId={setAdvBrand}
            advGroupId={advGroup}
            setAdvGroupId={setAdvGroup}
            advColorId={advColor}
            setAdvColorId={setAdvColor}
            advSizeId={advSize}
            setAdvSizeId={setAdvSize}
            advDivisionId={""}
            setAdvDivisionId={() => {}}
            advItemId={""}
            setAdvItemId={() => {}}
            advSupplierName={""}
            setAdvSupplierName={() => {}}
            initialViewMode={window.innerWidth <= 1024 ? "kanban" : "table"}
                                                customColumnLabels={{
              code: { en: 'Return Number', ar: 'رقم المرتد' },
              barcode: { en: 'Return Date', ar: 'تاريخ المرتد' },
              name: { en: 'Supplier Name', ar: 'اسم المورد' },
              brand: { en: 'Return Value', ar: 'قيمة المرتد' },
              group: { en: 'Payment Method', ar: 'طريقه الدفع' },
              color: { en: 'User', ar: 'المستخدم' },
              size: { en: 'Branch', ar: 'مخزن / فرع' },
              division: { en: 'Shipping Company', ar: 'شركه الشحن' },
              item: { en: 'Waybill Number', ar: 'رقم البوليصه' }
            }}
                        defaultVisibleColumns={{
              code: true,
              barcode: true,
              name: true,
              brand: true,
              group: true,
              color: true,
              size: true,
              division: true,
              item: true
            }}
          />

        </div>
    </div>
  );
}
