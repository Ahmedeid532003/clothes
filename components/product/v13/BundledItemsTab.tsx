import React, { useState, useEffect, useRef } from 'react';
import { Package, Plus, Trash2, Edit, Save, X, Search, FileDown, CheckCircle2, ImagePlus, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductsListContainer } from './ProductsListContainer';
import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExportDataButton } from './ui/ExportDataButton';

interface BundledComponent {
  productId: string;
  qty: number;
}

export interface BundledItem {
  id: string;
  name: string;
  code: string;
  barcode?: string;
  sellPrice: number;
  costPrice?: number;
  groupId?: string;
  image?: string;
  components: BundledComponent[];
}

interface BundledItemsTabProps {
  lang: "ar" | "en";
  products: any[];
  bundledItems: BundledItem[];
  setBundledItems: (items: BundledItem[]) => void;
  groups?: any[];
}

export function BundledItemsTab({ lang, products, bundledItems, setBundledItems, groups = [] }: BundledItemsTabProps) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingItem, setViewingItem] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
  const [components, setComponents] = useState<BundledComponent[]>([]);
  
  // Auto-calculate cost price
  useEffect(() => {
    const total = components.reduce((sum, comp) => {
      const product = products.find(p => p.id === comp.productId);
      const price = product?.costPrice || 0;
      return sum + price; // Quantity is always 1 for bundled items
    }, 0);
    const average = components.length > 0 ? total / components.length : 0;
    setCostPrice(Number(average.toFixed(2)));
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
      const pName = (p.name || "").toLowerCase();
      const pNameAr = (p.nameAr || "").toLowerCase();
      const pNameEn = (p.nameEn || "").toLowerCase();
      const pCode = (p.code || "").toLowerCase();
      const pBarcode = (p.barcode || "").toLowerCase();
      return pName.includes(q) || pNameAr.includes(q) || pNameEn.includes(q) || pCode.includes(q) || pBarcode.includes(q);
    }).slice(0, 30);
  }, [products, productSearchQuery]);

  const handleSelectProduct = (prod: any) => {
    const existing = components.find(c => c.productId === prod.id);
    if (!existing) {
      setComponents([...components, { productId: prod.id, qty: 1 }]);
    }
    setSelectedProductId("");
    setProductSearchQuery("");
    setProductSearchFocused(false);
    setTimeout(() => {
      productSearchInputRef.current?.focus();
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

  const mappedBundledItems = useMemo(() => {
    return bundledItems.map(item => {
      const groupObj = groups.find(g => g.id === item.groupId);
      const groupName = groupObj 
        ? (isAr ? groupObj.nameAr : groupObj.nameEn) 
        : (isAr ? "غير محدد" : "Unassigned");
      
      return {
        ...item,
        nameAr: item.name,
        nameEn: item.name,
        qty: 0,
        costPrice: item.costPrice || 0,
        brandId: '',
        groupId: item.groupId || '',
        group: groupName,
        colorId: '',
        sizeId: '',
        promoPrice: null,
        status: 'In Stock',
        barcode: item.barcode || ''
      };
    });
  }, [bundledItems, groups, isAr]);

  const filteredMappedItems = useMemo(() => {
    return mappedBundledItems.filter((p: any) => {
      const search = prodSearchQuery.toLowerCase().trim();
      if (search) {
        const matchesGlobal =
          p.code.toLowerCase().includes(search) ||
          p.barcode.toLowerCase().includes(search) ||
          p.nameAr.toLowerCase().includes(search) ||
          p.nameEn.toLowerCase().includes(search);
        if (!matchesGlobal) return false;
      }
      
      if (advCode && !p.code.toLowerCase().includes(advCode.toLowerCase())) return false;
      if (advBarcode && !p.barcode.toLowerCase().includes(advBarcode.toLowerCase())) return false;
      if (advSellMin && p.sellPrice < Number(advSellMin)) return false;
      if (advSellMax && p.sellPrice > Number(advSellMax)) return false;
      
      return true;
    });
  }, [mappedBundledItems, prodSearchQuery, advCode, advBarcode, advSellMin, advSellMax]);


  const handleAddBundled = () => {
    if (!name || !code || components.length === 0 || sellPrice === "") {
      alert(isAr ? "يرجى تعبئة جميع الحقول وإضافة صنف واحد على الأقل للمكونات." : "Please fill all fields and add at least one component.");
      return;
    }
    const newItem: BundledItem = {
      id: "BNDL-" + Date.now(),
      name,
      code,
      barcode,
      sellPrice: Number(sellPrice),
      costPrice,
      groupId,
      image: image || undefined,
      components
    };
    setBundledItems([...bundledItems, newItem]);
    resetForm();
    setIsModalOpen(false);
    triggerToast(isAr ? "تمت إضافة الصنف المجمع بنجاح" : "Bundled item added successfully");
  };

  const handleUpdateBundled = () => {
    if (!name || !code || components.length === 0 || sellPrice === "") return;
    setBundledItems(bundledItems.map(item => 
      item.id === editingId 
        ? { ...item, name, code, barcode, sellPrice: Number(sellPrice), costPrice, groupId, image: image || undefined, components }
        : item
    ));
    resetForm();
    setIsModalOpen(false);
    triggerToast(isAr ? "تم تحديث الصنف المجمع بنجاح" : "Bundled item updated successfully");
  };

  const handleDeleteBundled = (id: string) => {
    if (confirm(isAr ? "هل أنت متأكد من الحذف؟" : "Are you sure you want to delete?")) {
      setBundledItems(bundledItems.filter(item => item.id !== id));
    }
  };

  const handleEditBundled = (item: BundledItem) => {
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
        <title>${isAr ? 'بيانات الصنف المجمع' : 'Bundled Item Details'}</title>
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

  const filteredItems = bundledItems.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    item.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={cn("space-y-6", isAr ? "rtl font-[Cairo]" : "ltr")}>
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Package className="w-6 h-6 text-orange-500" />
              {isAr ? "الأصناف المجمعة" : "Bundled Items"}
            </h2>
            <p className="text-xs text-slate-500 font-bold">
              {isAr ? "إنشاء كود موحد لأصناف متعددة" : "Create a unified code for multiple items"}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs uppercase tracking-wider h-[42px] w-full sm:w-auto"
              style={{ borderRadius: '8px' }}
            >
              <Plus size={15} />
              <span className="text-[11px] whitespace-nowrap font-black">
                {isAr ? "إنشاء صنف مجمع جديد" : "Create New Bundled Item"}
              </span>
            </button>

            <ExportDataButton
              lang={lang}
              onToast={triggerToast}
              onCopy={() =>
                triggerToast(
                  isAr
                    ? "تم نسخ البيانات إلى الحافظة"
                    : "Data copied to clipboard!",
                )
              }
              onPrint={() =>
                triggerToast(
                  isAr
                    ? "تم فتح خيارات الطباعة للجدول"
                    : "Print dialog opened!",
                )
              }
              className="w-full sm:w-auto h-[42px]"
              style={{
                borderRadius: "8px",
              }}
            />
          </div>
        </div>

        {/* Modal Form */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={resetForm}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
              >
                <div className="p-4 border-b border-orange-600 flex items-center justify-between bg-orange-500 text-white">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight">
                        {editingId 
                          ? (isAr ? "تعديل صنف مجمع" : "Edit Bundled Item")
                          : (isAr ? "إضافة صنف مجمع جديد" : "Add New Bundled Item")
                        }
                      </h3>
                      <p className="text-[10px] text-orange-50 font-bold uppercase tracking-widest opacity-90">
                        {isAr ? "كود موحد لبيع أصناف متعددة" : "Unified code to sell multiple items"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={resetForm}
                    className="p-2 hover:bg-white/20 rounded-lg transition-all text-white active:scale-95"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-4 md:p-6 max-h-[60vh] sm:max-h-[72vh] overflow-y-auto space-y-6 w-full">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                    {/* Column 1: Name, Code, Cost Price */}
                    <div className="flex flex-col gap-4 w-full">
                      <div className="space-y-1.5 w-full">
                        <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{isAr ? "اسم الصنف المجمع" : "Bundled Item Name"}</label>
                        <input 
                          type="text" 
                          value={name} 
                          onChange={e => setName(e.target.value)} 
                          className="w-full h-[35px] border border-slate-200 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-sm" 
                          placeholder={isAr ? "مثال: عرض مجمع" : "e.g. Bundled Offer"}
                        />
                      </div>
                      <div className="space-y-1.5 w-full">
                        <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{isAr ? "الكود" : "Code"}</label>
                        <input 
                          type="text" 
                          value={code} 
                          onChange={e => setCode(e.target.value)} 
                          className="w-full h-[35px] border border-slate-200 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-sm" 
                          placeholder="BND-001"
                        />
                      </div>
                      <div className="space-y-1.5 w-full">
                        <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{isAr ? "متوسط سعر التكلفة" : "Average Cost Price"}</label>
                        <input 
                          type="number" 
                          value={costPrice} 
                          readOnly
                          className="w-full h-[35px] border border-slate-200 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-slate-100 transition-all shadow-sm font-bold text-slate-700" 
                        />
                      </div>
                    </div>

                    {/* Column 2: Group, Barcode, Sell Price */}
                    <div className="flex flex-col gap-4 w-full">
                      <div className="space-y-1.5 w-full">
                        <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{isAr ? "مجموعة الصنف" : "Group Collection"}</label>
                        <select
                          value={groupId}
                          onChange={e => setGroupId(e.target.value)}
                          className="w-full h-[35px] border border-slate-200 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-sm"
                        >
                          <option value="">{isAr ? "اختر مجموعة..." : "Select group..."}</option>
                          {groups.map(g => (
                            <option key={g.id} value={g.id}>{isAr ? g.nameAr : g.nameEn}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5 w-full">
                        <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{isAr ? "الباركود" : "Barcode"}</label>
                        <input 
                          type="text" 
                          value={barcode} 
                          onChange={e => setBarcode(e.target.value)} 
                          className="w-full h-[35px] border border-slate-200 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-sm" 
                          placeholder="622..."
                        />
                      </div>
                      <div className="space-y-1.5 w-full">
                        <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{isAr ? "سعر البيع" : "Sell Price"}</label>
                        <input 
                          type="number" 
                          value={sellPrice} 
                          onChange={e => setSellPrice(e.target.value === "" ? "" : Number(e.target.value))} 
                          className="w-full h-[35px] border border-slate-200 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-sm" 
                        />
                      </div>
                    </div>

                    {/* Column 3: Item Image */}
                    <div className="flex flex-col space-y-1.5 w-full h-full self-stretch min-h-[150px]">
                      <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{isAr ? "صورة الصنف" : "Item Image"}</label>
                      <div className="relative border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 hover:border-orange-300 transition-all cursor-pointer group overflow-hidden flex-1 w-full">
                        {image ? (
                          <div className="relative w-full h-full">
                            <img src={image} alt="Bundled" className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setImage(null); }}
                              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer p-4 rounded-lg">
                            <div className="p-2 bg-white rounded-xl shadow-sm mb-1 group-hover:scale-110 transition-transform">
                              <ImagePlus className="w-5 h-5 text-orange-500" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{isAr ? "رفع صورة" : "Upload Image"}</span>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => setImage(reader.result as string);
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 md:p-5 rounded-lg border border-slate-200 space-y-4 w-full">
                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-orange-500" />
                      {isAr ? "مكونات الصنف المجمع" : "Bundled Components"}
                    </h4>
                    <div 
                      className="flex flex-col md:flex-row gap-3 items-end w-full"
                    >
                      <div className="flex-1 w-full space-y-1 relative">
                        <div className="relative w-full">
                          <input 
                            ref={productSearchInputRef}
                            type="text" 
                            value={productSearchQuery} 
                            onChange={e => {
                              setProductSearchQuery(e.target.value);
                              setSelectedProductId("");
                              setProductHighlightedIndex(0);
                              setProductSearchFocused(true);
                            }}
                            onFocus={() => {
                              setProductSearchFocused(true);
                              setProductHighlightedIndex(0);
                            }}
                            onBlur={() => {
                              // Small timeout so onMouseDown executes first
                              setTimeout(() => setProductSearchFocused(false), 200);
                            }}
                            onKeyDown={e => {
                              if (e.key === "ArrowDown") {
                                e.preventDefault();
                                setProductHighlightedIndex(prev => 
                                  filteredProductsList.length > 0 
                                    ? (prev + 1) % filteredProductsList.length 
                                    : 0
                                );
                              } else if (e.key === "ArrowUp") {
                                e.preventDefault();
                                setProductHighlightedIndex(prev => 
                                  filteredProductsList.length > 0 
                                    ? (prev - 1 + filteredProductsList.length) % filteredProductsList.length 
                                    : 0
                                );
                              } else if (e.key === "Enter") {
                                e.preventDefault();
                                if (filteredProductsList.length > 0) {
                                  handleSelectProduct(filteredProductsList[productHighlightedIndex]);
                                }
                              } else if (e.key === "Escape") {
                                setProductSearchFocused(false);
                              }
                            }}
                            className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm focus:border-orange-500 outline-none bg-white shadow-xs font-bold text-slate-700 h-[38px]" 
                            placeholder={isAr ? "ابحث بالاسم، الكود، أو الباركود..." : "Search by name, code, or barcode..."}
                            id="focused-bundled-product-select"
                          />

                          {/* Autocomplete suggestions dropdown */}
                          {productSearchFocused && productSearchQuery.trim() !== "" && filteredProductsList.length > 0 && (
                            <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100 text-right">
                              {filteredProductsList.map((p: any, idx: number) => (
                                <div
                                  key={p.id}
                                  onMouseDown={() => handleSelectProduct(p)}
                                  onMouseEnter={() => setProductHighlightedIndex(idx)}
                                  className={cn(
                                    "px-4 py-2.5 cursor-pointer text-xs flex justify-between items-center transition-colors font-bold",
                                    idx === productHighlightedIndex
                                      ? "bg-orange-50 text-orange-950"
                                      : "text-slate-700 hover:bg-slate-50"
                                  )}
                                >
                                  <div className="text-left font-mono text-slate-400 text-[10px]">
                                    {p.barcode || "-"}
                                  </div>
                                  <div className="text-right flex flex-col">
                                    <span className="text-slate-900">
                                      {isAr ? (p.nameAr || p.name) : (p.nameEn || p.name)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono font-medium">
                                      {p.code}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                    </div>

                    {components.length > 0 ? (
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm w-full">
                        {/* Desktop Table View */}
                        <table className="w-full text-sm hidden md:table">
                          <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                            <tr>
                              <th className="p-3 text-start font-bold uppercase text-[10px] tracking-wider">{isAr ? "الصنف" : "Item"}</th>
                              <th className="p-3 w-32 text-center font-bold uppercase text-[10px] tracking-wider">{isAr ? "سعر الشراء" : "Purchase Price"}</th>

                              <th className="p-3 w-16 text-center"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {components.map((c, idx) => {
                              const prod = products.find(p => p.id === c.productId);
                              return (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="p-3 font-medium text-slate-700">{prod ? (isAr ? prod.nameAr || prod.name : prod.nameEn || prod.name) : "Unknown"}</td>
                                  <td className="p-3 text-center font-black text-orange-600">{prod?.costPrice || 0}</td>

                                  <td className="p-3 text-center">
                                    <button 
                                      onClick={() => handleRemoveComponent(idx)} 
                                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                      <Trash2 className="w-4 h-4 mx-auto" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        {/* Mobile Card View */}
                        <div className="grid grid-cols-1 divide-y divide-slate-100 md:hidden">
                          {components.map((c, idx) => {
                            const prod = products.find(p => p.id === c.productId);
                            return (
                              <div key={idx} className="p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-start gap-2">
                                  <span className="font-medium text-slate-700 text-sm">
                                    {prod ? (isAr ? prod.nameAr || prod.name : prod.nameEn || prod.name) : "Unknown"}
                                  </span>
                                  <button 
                                    onClick={() => handleRemoveComponent(idx)} 
                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shrink-0 -mt-1 -mr-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{isAr ? "سعر الشراء" : "Purchase Price"}</span>
                                    <span className="font-black text-orange-600 text-sm">{prod?.costPrice || 0}</span>
                                  </div>

                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-400 font-medium">
                          {isAr ? "لا توجد مكونات مضافة بعد" : "No components added yet"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div 
                  className="px-6 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-3 py-3 w-full"
                >
                  <button 
                    onClick={resetForm} 
                    className="px-6 py-1 rounded-lg text-slate-600 bg-white border border-slate-200 font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95 text-[12px] h-[32px] flex items-center justify-center"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                  <button 
                    onClick={editingId ? handleUpdateBundled : handleAddBundled} 
                    className="px-8 py-1 rounded-lg text-white bg-orange-500 font-extrabold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 active:scale-95 flex items-center justify-center gap-2 text-[12px] h-[32px]"
                  >
                    <Save className="w-4 h-4" />
                    {isAr ? "حفظ" : "Save"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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
                className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
              >
                <div className="p-4 border-b border-orange-600 flex items-center justify-between bg-orange-500 text-white">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5" />
                    <h3 className="text-lg font-black">{isAr ? "عرض بيانات الصنف المجمع" : "View Bundled Item Details"}</h3>
                  </div>
                  <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-white/20 rounded-lg transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
                  <div className="flex flex-col md:flex-row gap-6">
                    {viewingItem.image && (
                      <div className="w-full md:w-48 h-48 rounded-2xl overflow-hidden border border-slate-200 shadow-sm shrink-0">
                        <img src={viewingItem.image} alt={viewingItem.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 space-y-4">
                      <div>
                        <h4 className="text-2xl font-black text-slate-800">{viewingItem.name}</h4>
                        <p className="text-slate-500 font-bold">{viewingItem.code} | {viewingItem.barcode || "---"}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isAr ? "متوسط سعر التكلفة" : "Average Cost Price"}</span>
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
                    <h5 className="font-bold text-slate-700 border-b border-slate-100 pb-2">{isAr ? "مكونات الصنف" : "Item Components"}</h5>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                          <tr>
                            <th className="p-3 text-start font-bold uppercase text-[10px] tracking-wider">{isAr ? "الصنف" : "Item"}</th>
                            <th className="p-3 w-32 text-center font-bold uppercase text-[10px] tracking-wider">{isAr ? "الكمية" : "Qty"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
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

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                    <h5 className="font-bold text-slate-700">{isAr ? "خيارات الطباعة" : "Printing Options"}</h5>
                    <div className="flex flex-col gap-3">
                      <select 
                        value={printType}
                        onChange={(e) => setPrintType(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 focus:border-orange-500 outline-none shadow-sm"
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
            lang={lang}
            filteredProducts={filteredMappedItems}
            richProducts={mappedBundledItems}
            brands={[]}
            groups={groups}
            colors={[]}
            sizes={[]}
            divisions={[]}
            items={[]}
            setViewingProduct={(p) => {
              setViewingItem(p);
              setIsViewModalOpen(true);
            }}
            openEditProductModal={(p) => handleEditBundled(p)}
            handleDeleteProduct={(id) => handleDeleteBundled(id)}
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
              code: { en: 'Bundled Code', ar: 'كود الصنف المجمع' },
              barcode: { en: 'Barcode', ar: 'الباركود' },
              name: { en: 'Item Name', ar: 'اسم الصنف' },
              group: { en: 'Group Collection', ar: 'مجموعة الصنف' },
              costPrice: { en: 'Average Cost Price', ar: 'متوسط سعر التكلفة' },
              sellPrice: { en: 'Selling Price', ar: 'سعر البيع' }
            }}
            defaultVisibleColumns={{
              code: true,
              barcode: true,
              group: true,
              costPrice: true,
              sellPrice: true,
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8 hidden">
            {filteredItems.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                <div className="p-4 border-b border-slate-100 flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 group-hover:text-orange-600 transition-colors">{item.name}</h3>
                    <p className="text-xs text-slate-400 font-medium tracking-wider">{item.code}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEditBundled(item)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDeleteBundled(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">{isAr ? "المكونات" : "Components"}</span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-bold">{item.components.length}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isAr ? "التكلفة" : "Cost"}</span>
                      <span className="text-sm font-black text-slate-700">${item.costPrice}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">{isAr ? "البيع" : "Sell"}</span>
                      <span className="text-lg font-black text-orange-600">${item.sellPrice}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
