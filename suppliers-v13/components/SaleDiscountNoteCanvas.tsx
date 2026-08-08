
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  X, 
  Trash2, 
  Barcode, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Settings,
  ChevronDown,
  ChevronUp,
  Plus,
  Filter,
  Edit,
  MoreVertical,
  LayoutGrid,
  Table as TableIcon,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../lib/utils';


function SaleDiscountNoteCanvas({ 
  onClose, 
  lang, 
  products, 
  supplierName,
  season,
  autoLoadItems,
  onSave, 
  onSaveAndPrint 
}: { 
  onClose: () => void; 
  lang: 'en' | 'ar'; 
  products: any[]; 
  supplierName: string;
  season: string;
  autoLoadItems: boolean;
  onSave: (items: any[]) => void; 
  onSaveAndPrint: (items: any[]) => void; 
}) {
  const isAr = lang === 'ar';
  
  const [modType, setModType] = useState<'increase' | 'decrease'>('decrease'); // Default to decrease for discounts
  const [calcMethod, setCalcMethod] = useState<'value' | 'percentage'>('percentage'); // Default to percentage for discounts
  const [filterType, setFilterType] = useState<'all' | 'withDiscount' | 'withoutDiscount'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [modValue, setModValue] = useState("");
  const [offerProfitMargin, setOfferProfitMargin] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  const [items, setItems] = useState<any[]>([]);

  // Add dummy data on mount
  React.useEffect(() => {
    if (autoLoadItems) {
      const dummyItems = [
        {
          id: 'dummy-1',
          productId: 'p1',
          nameAr: 'بلوزه حريمى ربيعى',
          nameEn: 'Women Spring Blouse',
          barcode: '123456',
          stock: 15,
          quantity: 1,
          oldPrice: 1200,
          oldPurchasePrice: 800,
          newPurchasePrice: 800,
          profitMargin: 50,
          suggestedSellPrice: 1200,
          modType: 'decrease',
          calcMethod: 'percentage',
          modValue: 10,
          modAmount: 120,
          newPrice: 1080
        },
        ...Array.from({ length: 9 }).map((_, i) => ({
          id: `dummy-${i + 2}`,
          productId: `p${i + 2}`,
          nameAr: `صنف تجريبى ${i + 2}`,
          nameEn: `Test Item ${i + 2}`,
          barcode: `Barcode-${1000 + i}`,
          stock: 20 + i,
          quantity: 1,
          oldPrice: 500 + (i * 100),
          oldPurchasePrice: 300 + (i * 50),
          newPurchasePrice: 300 + (i * 50),
          profitMargin: 40,
          suggestedSellPrice: 500 + (i * 100),
          modType: 'decrease',
          calcMethod: 'percentage',
          modValue: 0,
          modAmount: 0,
          newPrice: 500 + (i * 100)
        }))
      ];
      setItems(dummyItems);
    } else {
      setItems([]);
    }
  }, [autoLoadItems]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filterType === 'withDiscount') return item.modValue > 0;
      if (filterType === 'withoutDiscount') return !item.modValue || item.modValue === 0;
      return true;
    });
  }, [items, filterType]);

  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const valueInputRef = React.useRef<HTMLInputElement>(null);
  const quantityInputRef = React.useRef<HTMLInputElement>(null);
  const profitMarginInputRef = React.useRef<HTMLInputElement>(null);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return products.filter(p => 
      (p.nameAr && p.nameAr.toLowerCase().includes(q)) ||
      (p.nameEn && p.nameEn.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.code && p.code.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [searchQuery, products]);

  const handleProductSelect = (product: any) => {
    setSelectedProduct(product);
    setSearchQuery(isAr ? product.nameAr : product.nameEn);
    setShowDropdown(false);
    
    // Focus discount value box
    setTimeout(() => {
      if (valueInputRef.current) {
        valueInputRef.current.focus();
      }
    }, 50);
  };

  const handleAddProduct = () => {
    if (!selectedProduct) return;
    
    if (!offerProfitMargin) {
      alert(isAr ? "برجاء ادخال نسبه الربح لسعر العرض" : "Please enter the offer profit margin");
      if (profitMarginInputRef.current) {
        profitMarginInputRef.current.focus();
      }
      return;
    }
    
    const val = parseFloat(modValue) || 0;
    const qty = parseFloat(quantity) || 1;
    const oldPrice = selectedProduct.sellPrice || selectedProduct.price || 0;
    let calculatedModAmount = 0;
    
    if (calcMethod === 'value') {
      calculatedModAmount = val;
    } else {
      calculatedModAmount = (oldPrice * val) / 100;
    }
    
    const newPrice = modType === 'increase' ? oldPrice + calculatedModAmount : Math.max(0, oldPrice - calculatedModAmount);
    
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      productId: selectedProduct.id,
      nameAr: selectedProduct.nameAr,
      nameEn: selectedProduct.nameEn,
      barcode: selectedProduct.barcode,
      stock: selectedProduct.balance || selectedProduct.currentStock || 0,
      quantity: qty,
      oldPrice: oldPrice,
      oldPurchasePrice: selectedProduct.purchasePrice || selectedProduct.costPrice || 0,
      newPurchasePrice: selectedProduct.purchasePrice || selectedProduct.costPrice || 0,
      profitMargin: parseFloat(offerProfitMargin) || 25,
      suggestedSellPrice: oldPrice,
      modType,
      calcMethod,
      modValue: val,
      modAmount: calculatedModAmount,
      newPrice: newPrice
    };
    
    setItems(prev => [newItem, ...prev]);
    
    // Reset
    setSelectedProduct(null);
    setSearchQuery("");
    setModValue("");
    setQuantity("1");
    
    // Move focus back to search
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 50);
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddProduct();
    }
  };

  const handleValueKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddProduct();
    }
  };


  const handleItemUpdate = (id: string, updates: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, ...updates };
        
        // Recalculate price if modValue or profitMargin changed
        if ('modValue' in updates || 'calcMethod' in updates || 'profitMargin' in updates) {
          const oldPrice = updatedItem.oldPrice;
          let calculatedModAmount = 0;
          if (updatedItem.calcMethod === 'value') {
            calculatedModAmount = updatedItem.modValue;
          } else {
            calculatedModAmount = (oldPrice * updatedItem.modValue) / 100;
          }
          updatedItem.modAmount = calculatedModAmount;
          updatedItem.newPrice = updatedItem.modType === 'increase' ? oldPrice + calculatedModAmount : Math.max(0, oldPrice - calculatedModAmount);
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const handleClearItemData = (id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          stock: 0,
          newPurchasePrice: 0,
          profitMargin: 0,
          suggestedSellPrice: 0,
          modValue: 0,
          modAmount: 0,
          newPrice: item.oldPrice
        };
      }
      return item;
    }));
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Recalculate
        const oldPrice = updated.oldPrice;
        const val = parseFloat(updated.modValue) || 0;
        let amt = 0;
        if (updated.calcMethod === 'value') {
          amt = val;
        } else {
          amt = (oldPrice * val) / 100;
        }
        
        const newPrice = updated.modType === 'increase' ? oldPrice + amt : Math.max(0, oldPrice - amt);
        updated.modAmount = amt;
        updated.newPrice = newPrice;
        
        return updated;
      }
      return item;
    }));
  };

  const handleClose = () => {
    if (items.length > 0) {
      setShowCloseWarning(true);
    } else {
      onClose();
    }
  };

  const totalPieces = items.length;
  const totalSignedModAmount = items.reduce((sum, item) => sum + (item.modType === 'increase' ? item.modAmount : -item.modAmount), 0);
  
  return (
    <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col w-full h-[100dvh] animate-in fade-in zoom-in-95 duration-200">
      {/* Top Header (New) */}
      <div className="bg-[#FF6900] flex items-center justify-between px-6 shrink-0 z-30" style={{ height: '47px' }}>
        <div className="flex flex-col md:flex-row md:items-center md:gap-3">
          <h1 className="text-white font-bold text-[16px] leading-[29.5px]">{isAr ? "انشاء خصم اوكازيون" : "Create Sale Discount"}</h1>
          <p className="text-white font-bold w-[123.453px] text-[12px] leading-[20px]" style={{ height: '20px', paddingBottom: '-4px', marginBottom: '-11px' }}>{supplierName} + {season}</p>
        </div>
        <button 
          onClick={handleClose}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-white/30 text-white bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition cursor-pointer shadow-sm"
        >
          <span>{isAr ? "الغاء ورجوع" : "Cancel & Return"}</span>
          {isAr ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
        </button>
      </div>

      {/* Fixed Sub-Header */}
      <div className="bg-white border-b border-gray-300 shadow-sm flex flex-col sticky top-0 z-20 shrink-0" style={{ height: '115px', paddingTop: '22px' }}>
        
        <div className="px-4 pb-2.5 flex flex-col gap-2.5">
          {/* Main Header Row */}
        <div className="flex flex-col md:flex-row justify-between items-start w-full gap-4 md:gap-0">
          
          {/* RTL aligns right side naturally first in flex */}
          <div className="flex flex-col md:flex-row items-stretch md:items-start gap-4 flex-1 w-full">
            <div className="flex flex-col md:flex-row items-stretch md:items-start gap-4 w-full md:w-auto">
              
              {/* New Filter Box (3 options, no title) */}
              <div className="flex flex-col border border-[#e5ebf2] rounded-lg p-2 bg-white relative pt-1.5 w-full md:w-auto flex-none" style={{ height: 92, minWidth: isAr ? 146 : 137, marginTop: -6 }}>
                <div className="flex flex-col gap-1 mt-0.5">
                  <label onClick={() => setFilterType('all')} className={cn("flex items-center justify-between gap-2 py-0.5 px-2 border rounded cursor-pointer transition w-full", filterType === 'all' ? "border-orange-500 bg-orange-50/50" : "border-gray-300 bg-white hover:border-gray-300")}>
                    <span className={cn("text-[11px] leading-4 font-bold", filterType === 'all' ? "text-slate-800" : "text-slate-600")}>{isAr ? "كل الاصناف" : "All Items"}</span>
                    <div className={cn("w-3 h-3 rounded-sm flex items-center justify-center border transition-colors shrink-0", filterType === 'all' ? "bg-orange-500 border-orange-500 text-white" : "border-gray-300 bg-white")}>
                      {filterType === 'all' && <Check size={8} strokeWidth={4} />}
                    </div>
                  </label>
                  <label onClick={() => setFilterType('withDiscount')} className={cn("flex items-center justify-between gap-2 py-0.5 px-2 border rounded cursor-pointer transition w-full", filterType === 'withDiscount' ? "border-orange-500 bg-orange-50/50" : "border-gray-300 bg-white hover:border-gray-300")}>
                    <span className={cn("text-[11px] leading-4 font-bold", filterType === 'withDiscount' ? "text-slate-800" : "text-slate-600")}>{isAr ? "اصناف بخصم" : "Items with discount"}</span>
                    <div className={cn("w-3 h-3 rounded-sm flex items-center justify-center border transition-colors shrink-0", filterType === 'withDiscount' ? "bg-orange-500 border-orange-500 text-white" : "border-gray-300 bg-white")}>
                      {filterType === 'withDiscount' && <Check size={8} strokeWidth={4} />}
                    </div>
                  </label>
                  <label onClick={() => setFilterType('withoutDiscount')} className={cn("flex items-center justify-between gap-2 py-0.5 px-2 border rounded cursor-pointer transition w-full", filterType === 'withoutDiscount' ? "border-orange-500 bg-orange-50/50" : "border-gray-300 bg-white hover:border-gray-300")}>
                    <span className={cn("text-[11px] leading-4 font-bold", filterType === 'withoutDiscount' ? "text-slate-800" : "text-slate-600")}>{isAr ? "اصناف بدون خصم" : "Items without discount"}</span>
                    <div className={cn("w-3 h-3 rounded-sm flex items-center justify-center border transition-colors shrink-0", filterType === 'withoutDiscount' ? "bg-orange-500 border-orange-500 text-white" : "border-gray-300 bg-white")}>
                      {filterType === 'withoutDiscount' && <Check size={8} strokeWidth={4} />}
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex flex-col border border-[#e5ebf2] rounded-lg p-2 bg-white relative pt-3.5 w-full md:w-auto flex-none" style={{ height: 92, minWidth: isAr ? 146 : 137, marginTop: -6 }}>
                <span className="absolute -top-2.5 rtl:right-2 rtl:left-auto ltr:left-2 bg-white px-1.5 text-[13px] font-bold text-slate-700 whitespace-nowrap">{isAr ? "نوع الخصم" : "Discount Type"}</span>
                <div className="flex flex-col gap-1.5 mt-1">
                  <label onClick={() => setCalcMethod('value')} className={cn("flex items-center justify-between gap-2 py-1 px-2 border rounded cursor-pointer transition w-full", calcMethod === 'value' ? "border-orange-500 bg-orange-50/50" : "border-gray-300 bg-white hover:border-gray-300")} style={{ minWidth: isAr ? 124 : 111 }}>
                    <span className={cn("text-[12px] leading-4 font-bold", calcMethod === 'value' ? "text-slate-800" : "text-slate-600")}>{isAr ? "قيمه $" : "Value $"}</span>
                    <div className={cn("w-3.5 h-3.5 rounded-sm flex items-center justify-center border transition-colors shrink-0", calcMethod === 'value' ? "bg-orange-500 border-orange-500 text-white" : "border-gray-300 bg-white")}>
                      {calcMethod === 'value' && <Check size={10} strokeWidth={4} />}
                    </div>
                  </label>
                  <label onClick={() => setCalcMethod('percentage')} className={cn("flex items-center justify-between gap-2 py-1 px-2 border rounded cursor-pointer transition w-full", calcMethod === 'percentage' ? "border-orange-500 bg-orange-50/50" : "border-gray-300 bg-white hover:border-gray-300")} style={{ minWidth: isAr ? 124 : 114 }}>
                    <span className={cn("text-[12px] leading-4 font-bold", calcMethod === 'percentage' ? "text-slate-800" : "text-slate-600")}>{isAr ? "نسبه %" : "Percentage %"}</span>
                    <div className={cn("w-3.5 h-3.5 rounded-sm flex items-center justify-center border transition-colors shrink-0", calcMethod === 'percentage' ? "bg-orange-500 border-orange-500 text-white" : "border-gray-300 bg-white")}>
                      {calcMethod === 'percentage' && <Check size={10} strokeWidth={4} />}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col border border-[#e5ebf2] rounded-lg p-2 bg-white relative pt-3 w-full md:w-[223px] flex-none" style={{ height: 92, marginTop: -6 }}>
              <div className="flex flex-row items-center justify-between gap-2 w-full shrink-0">
                <label className="text-[11px] font-bold text-[#191a1b] whitespace-nowrap">{isAr ? "نسبة الربح لسعر العرض" : "Offer Profit Margin"}</label>
                <input
                  ref={profitMarginInputRef}
                  type="number"
                  value={offerProfitMargin}
                  onChange={e => setOfferProfitMargin(e.target.value)}
                  placeholder="0"
                  className="text-xs font-bold p-1 text-center bg-white border border-gray-300 rounded outline-none focus:ring-2 focus:ring-orange-100 transition shadow-sm w-[80px]"
                  style={{ height: '26px' }}
                />
              </div>
              <div className="flex flex-row items-center justify-between gap-2 w-full shrink-0 mt-3">
                <label className="text-[11px] font-bold text-[#191a1b] whitespace-nowrap">{isAr ? "قيمه الخصم" : "Discount Value"}</label>
                <input
                  ref={valueInputRef}
                  type="number"
                  value={modValue}
                  onChange={e => setModValue(e.target.value)}
                  onKeyDown={handleValueKeyDown}
                  placeholder="0"
                  className="text-xs font-bold p-1 text-center bg-white border border-gray-300 rounded outline-none focus:ring-2 focus:ring-orange-100 transition shadow-sm w-full"
                  style={{ height: '24px' }}
                />
              </div>
            </div>

            <div className="flex flex-col border border-[#e5ebf2] rounded-lg p-2 bg-white relative pt-3 w-full md:w-[280px] flex-none" style={{ height: 92, marginTop: -6 }}>
              <div className="flex flex-row items-center justify-between gap-2 w-full shrink-0">
                <label className="text-[11px] font-bold text-[#191a1b] whitespace-nowrap">{isAr ? "بحث عن صنف" : "Search Product"}</label>
                <div className="relative flex-1">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    placeholder={isAr ? "كود او اسم الصنف..." : "Barcode or name..."}
                    className="w-full text-xs font-bold p-1 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-orange-100"
                    style={{ height: '26px' }}
                  />
                  {showDropdown && searchQuery.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-40 overflow-y-auto">
                      {filteredProducts.map(p => (
                        <div key={p.id} onClick={() => handleProductSelect(p)} className="p-2 hover:bg-orange-50 cursor-pointer text-xs flex flex-col gap-0.5 border-b border-gray-50 last:border-0">
                          <span className="font-bold text-slate-800">{isAr ? p.nameAr : p.nameEn}</span>
                          <span className="text-slate-400 font-mono text-[10px]">{p.barcode}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
      {/* Table Area */}
      <div className="flex-1 overflow-auto p-4 bg-slate-50 min-h-0">
        
        {/* Desktop Table Layout */}
        <div className="hidden md:block bg-white border border-gray-300 rounded-xl overflow-x-auto overflow-y-visible shadow-sm">
          <table className="w-full min-w-max text-left rtl:text-right border-collapse text-xs font-bold text-slate-700">
            <thead className="sticky top-0 z-10 bg-slate-100 text-slate-800 select-none">
              <tr className="border-b border-gray-300">
                <th className="p-3 whitespace-nowrap ltr:border-r rtl:border-l border-gray-300">{isAr ? 'باركود الصنف' : 'Barcode'}</th>
                <th className="p-3 whitespace-nowrap ltr:border-r rtl:border-l border-gray-300 min-w-[200px]">{isAr ? 'اسم الصنف' : 'Item Name'}</th>
                <th className="p-3 whitespace-nowrap ltr:border-r rtl:border-l border-gray-300 text-center leading-tight">
                  {isAr ? <><span className="block">سعر شراء</span><span className="block">قديم</span></> : <><span className="block">Old</span><span className="block">Purchase</span></>}
                </th>
                <th className="p-3 whitespace-nowrap ltr:border-r rtl:border-l border-gray-300 text-center leading-tight">
                  {isAr ? <><span className="block">رصيد</span><span className="block">عام</span></> : <><span className="block">Stock</span></>}
                </th>
                <th className="p-0 whitespace-nowrap ltr:border-r rtl:border-l border-gray-300" colSpan={2}>
                  <div className="border-b border-gray-300 p-1.5 text-center">{isAr ? 'الخـــــصومـات' : 'Discounts'}</div>
                  <div className="flex">
                    <div className="w-12 p-2 ltr:border-r rtl:border-l border-gray-300 text-center shrink-0">{isAr ? 'نوع' : 'Type'}</div>
                    <div className="min-w-[80px] p-2 text-center shrink-0">{isAr ? 'قيمه' : 'Value'}</div>
                  </div>
                </th>
                <th className="p-3 whitespace-nowrap ltr:border-r rtl:border-l border-gray-300 text-center leading-tight">
                  {isAr ? <><span className="block">سعر شراء</span><span className="block">جديد</span></> : <><span className="block">New</span><span className="block">Purchase</span></>}
                </th>
                <th className="p-3 whitespace-nowrap ltr:border-r rtl:border-l border-gray-300 text-center leading-tight">
                  {isAr ? <><span className="block">نسبه</span><span className="block">الربح</span></> : <><span className="block">Profit</span><span className="block">Margin</span></>}
                </th>
                <th className="p-3 whitespace-nowrap ltr:border-r rtl:border-l border-gray-300 text-center leading-tight">
                  {isAr ? <><span className="block">سعر بيع</span><span className="block">قديم</span></> : <><span className="block">Old Sell</span><span className="block">Price</span></>}
                </th>
                <th className="p-3 whitespace-nowrap ltr:border-r rtl:border-l border-gray-300 text-center leading-tight">
                  {isAr ? <><span className="block">سعر بيع</span><span className="block">مقترح</span></> : <><span className="block">Sug. Sell</span><span className="block">Price</span></>}
                </th>
                <th className="p-3 whitespace-nowrap ltr:border-r rtl:border-l border-gray-300 text-center leading-tight">
                  {isAr ? <><span className="block">سعر</span><span className="block">العرض</span></> : <><span className="block">Offer</span><span className="block">Price</span></>}
                </th>
                <th className="p-3 whitespace-nowrap ltr:border-r rtl:border-l border-gray-300 text-center leading-tight">
                  {isAr ? <><span className="block">اجمالى</span><span className="block">الخصم</span></> : <><span className="block">Total</span><span className="block">Disc</span></>}
                </th>
                <th className="p-3 whitespace-nowrap text-center w-[44px]">
                  <Settings size={14} className="mx-auto text-slate-500" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {filteredItems.map((item, i) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-2 font-mono text-slate-500 ltr:border-r rtl:border-l border-gray-300">{item.barcode}</td>
                  <td className="p-2 font-black text-slate-800 ltr:border-r rtl:border-l border-gray-300">{isAr ? item.nameAr : item.nameEn}</td>
                  <td className="p-2 text-center font-mono ltr:border-r rtl:border-l border-gray-300">{item.oldPurchasePrice}</td>
                  <td className="p-2 text-center font-mono ltr:border-r rtl:border-l border-gray-300">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleItemUpdate(item.id, { stock: Math.max(0, item.stock - 1) })} className="w-5 h-5 flex items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-100">-</button>
                      <input 
                        type="number" 
                        value={item.stock} 
                        onChange={(e) => handleItemUpdate(item.id, { stock: parseFloat(e.target.value) || 0 })}
                        className="w-12 text-center text-xs font-bold border-none bg-transparent outline-none appearance-none"
                      />
                      <button onClick={() => handleItemUpdate(item.id, { stock: item.stock + 1 })} className="w-5 h-5 flex items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-100">+</button>
                    </div>
                  </td>
                  <td className="p-1 ltr:border-r rtl:border-l border-gray-300 text-center bg-slate-50/50">
                    <select 
                      value={item.calcMethod}
                      onChange={(e) => handleItemUpdate(item.id, { calcMethod: e.target.value as 'value' | 'percentage' })}
                      className="w-[79px] bg-white border border-gray-200 rounded px-1 py-0.5 text-[10px] font-bold outline-none focus:ring-1 focus:ring-orange-200 cursor-pointer"
                    >
                      <option value="percentage">{isAr ? "نسبة %" : "Percentage %"}</option>
                      <option value="value">{isAr ? "مبلغ" : "Amount"}</option>
                    </select>
                  </td>
                  <td className="p-1 ltr:border-r rtl:border-l border-gray-300 text-center bg-slate-50/50">
                    <div className="flex items-center justify-center">
                      <input 
                        type="number" 
                        value={item.modValue} 
                        onChange={(e) => handleItemUpdate(item.id, { modValue: parseFloat(e.target.value) || 0 })}
                        className="w-16 text-center text-xs font-bold border border-gray-200 bg-white rounded py-1 outline-none focus:ring-1 focus:ring-orange-200"
                      />
                    </div>
                  </td>
                  <td className="p-2 ltr:border-r rtl:border-l border-gray-300 text-center font-mono">{item.newPurchasePrice}</td>
                  <td className="p-2 ltr:border-r rtl:border-l border-gray-300 text-center font-mono text-emerald-600">
                    <div className="flex items-center justify-center gap-0.5">
                      <input 
                        type="number" 
                        value={item.profitMargin} 
                        onChange={(e) => handleItemUpdate(item.id, { profitMargin: parseFloat(e.target.value) || 0 })}
                        className="w-9 text-center text-xs font-bold border-none bg-transparent outline-none text-emerald-600"
                      />
                      <span>%</span>
                    </div>
                  </td>
                  <td className="p-2 ltr:border-r rtl:border-l border-gray-300 text-center font-mono">{item.oldPrice}</td>
                  <td className="p-2 ltr:border-r rtl:border-l border-gray-300 text-center font-mono">{item.suggestedSellPrice}</td>
                  <td className="p-2 ltr:border-r rtl:border-l border-gray-300 text-center">
                    <input 
                      type="number" 
                      value={item.newPrice} 
                      onChange={(e) => handleItemUpdate(item.id, { newPrice: parseFloat(e.target.value) || 0 })}
                      className="w-20 text-center text-xs font-black border border-orange-100 bg-white rounded outline-none"
                    />
                  </td>
                  <td className="p-2 ltr:border-r rtl:border-l border-gray-300 text-center">
                    <span className={cn("px-2 py-1 rounded-md text-sm font-black inline-flex min-w-[60px] justify-center", item.modType === 'increase' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                      {item.modType === 'increase' ? '+' : '-'}{item.modAmount.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleClearItemData(item.id)} className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors cursor-pointer" title={isAr ? "تفريغ السطر" : "Clear Row"}><RotateCcw size={14} /></button>
                      <button onClick={() => handleDeleteItem(item.id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors cursor-pointer" title={isAr ? "حذف" : "Delete"}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={12} className="p-12 text-center text-slate-400 text-sm">
                    {isAr ? 'لم يتم إضافة أصناف بعد. ابحث بالأعلى لإضافة أصناف.' : 'No items added yet. Search above to add items.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Layout */}
        <div className="md:hidden flex flex-col gap-3">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white border border-gray-300 rounded-xl p-3 shadow-sm flex flex-col gap-3 text-xs font-bold text-slate-700">
              
              {/* Header: Name and Delete */}
              <div className="flex justify-between items-start border-b border-gray-300 pb-2">
                <div className="font-black text-slate-800 text-sm">{isAr ? item.nameAr : item.nameEn}</div>
                <button onClick={() => handleDeleteItem(item.id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors cursor-pointer shrink-0"><Trash2 size={14} /></button>
              </div>
              
              {/* Details: Barcode, Stock */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <span className="text-slate-400 text-[10px]">{isAr ? 'الباركود' : 'Barcode'}</span>
                  <span className="font-mono text-slate-500">{item.barcode}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-400 text-[10px]">{isAr ? 'الرصيد' : 'Stock'}</span>
                  <span className="font-mono">{item.stock}</span>
                </div>
              </div>
              
              {/* Price Changes */}
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-gray-300">
                 <div className="flex flex-col">
                   <span className="text-slate-400 text-[10px]">{isAr ? 'السعر القديم' : 'Old Price'}</span>
                   <span className="line-through text-slate-400">{item.oldPrice}</span>
                 </div>
                 <div className="text-slate-300">
                   {isAr ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
                 </div>
                 <div className="flex flex-col items-end">
                   <span className="text-slate-400 text-[10px]">{isAr ? 'السعر الجديد' : 'New Price'}</span>
                   <span className="font-black text-slate-800 text-sm">{item.newPrice.toFixed(2)}</span>
                 </div>
              </div>
              
              {/* Modification Inputs */}
              <div className="flex gap-2 items-center justify-between bg-slate-50 p-2 rounded-lg border border-gray-300 mt-[-4px]">
                <div className="flex gap-4">
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[10px] mb-1">{isAr ? 'النوع' : 'Type'}</span>
                    <span className="font-bold text-slate-600 text-sm">{item.calcMethod === 'value' ? '$' : '%'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[10px] mb-1">{isAr ? 'قيمه الخصم' : 'Value'}</span>
                    <span className="font-bold text-slate-800 text-sm">{item.modValue}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-end">
                   <span className="text-slate-400 text-[10px] mb-1">{isAr ? 'اجمالى الخصم' : 'Total Disc'}</span>
                   <span className={cn("px-2 py-1.5 rounded-md text-sm font-black flex items-center justify-center", item.modType === 'increase' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")} style={{ minWidth: 60 }}>
                      {item.modType === 'increase' ? '+' : '-'}{item.modAmount.toFixed(2)}
                   </span>
                </div>
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm bg-white border border-gray-300 rounded-xl">
              {isAr ? 'لم يتم إضافة أصناف بعد. ابحث بالأعلى لإضافة أصناف.' : 'No items added yet. Search above to add items.'}
            </div>
          )}
        </div>
      </div>
      
      {/* Fixed Footer */}
      <div className="bg-white border-t border-black px-3 py-1 shadow-sm mt-auto shrink-0 z-20 h-auto md:h-[46px] flex items-center">
        <div className="flex flex-col md:flex-row items-center gap-3 max-w-6xl mx-auto w-full justify-center">
          {/* Totals Row */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between bg-transparent md:bg-slate-50 border-0 md:border border-gray-300 rounded-lg md:px-4 font-bold gap-2 md:gap-0 w-full md:w-[680px]" style={{ height: 'auto', minHeight: '36px' }}>
             <div className="flex items-center justify-between md:justify-start gap-3 bg-white md:bg-transparent border border-gray-300 md:border-0 p-3 md:p-0 rounded-lg shadow-sm md:shadow-none" style={{ height: '36px' }}>
                <span className={cn("text-[12px] leading-4", totalSignedModAmount > 0 ? "text-emerald-600" : totalSignedModAmount < 0 ? "text-red-600" : "text-[#0d0d0e]")}>{isAr ? "اجمالى قيمه الخصومات" : "Total Discount Value"}:</span>
                <span className={cn("text-sm", totalSignedModAmount > 0 ? "text-emerald-600" : totalSignedModAmount < 0 ? "text-red-600" : "text-slate-600")}>
                  {totalSignedModAmount > 0 ? '+' : ''}{totalSignedModAmount.toFixed(2)} $
                </span>
             </div>
             <div className="flex items-center justify-between md:justify-start gap-3 md:border-l rtl:md:border-l-0 rtl:md:border-r border-gray-300 md:pl-4 rtl:md:pl-0 rtl:md:pr-4 bg-white md:bg-transparent border border-gray-300 md:border-0 p-3 md:p-0 rounded-lg shadow-sm md:shadow-none" style={{ height: '36px' }}>
                <span className="text-[#151617] text-[12px] leading-4">{isAr ? "عدد القطع" : "Pieces Count"}:</span>
                <span className="text-sm text-[#0a1945]">{totalPieces}</span>
             </div>
             <div className="hidden md:block text-sm border-l rtl:border-l-0 rtl:border-r border-gray-300 pl-4 rtl:pl-0 rtl:pr-4 text-[#1c1a1a]">
               {isAr ? "اجماليات" : "Totals"}
             </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 justify-center w-full md:w-auto" style={{ height: 36 }}>
            <button 
              onClick={() => onSaveAndPrint(items)}
              disabled={items.length === 0}
              className="px-6 bg-indigo-600 disabled:opacity-50 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs h-[36px]"
            >
              <Barcode size={14} />
              <span>{isAr ? "حفظ وطباعه باركود" : "Save & Print Barcode"}</span>
            </button>
            <button 
              onClick={() => onSave(items)}
              disabled={items.length === 0}
              className="px-10 bg-orange-500 disabled:opacity-50 hover:bg-orange-600 text-white font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs h-[36px]"
            >
              <span>{isAr ? "حفظ" : "Save"}</span>
            </button>
          </div>
        </div>
      </div>
      
      {showCloseWarning && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-300 flex flex-col" style={{ width: '369px', height: '177px' }}>
            {/* Header */}
            <div className="bg-[#FF6900] flex items-center px-4 gap-2 flex-shrink-0" style={{ height: '40px' }}>
              <div className="w-5 h-5 rounded bg-black text-white flex items-center justify-center font-black text-xs shadow-sm">
                M
              </div>
              <span className="text-white font-black text-[14px] tracking-tight">
                Ma7alyErp
              </span>
            </div>
            
            {/* Body */}
            <div className="p-8 flex items-start gap-8 bg-white" style={{ height: '0px' }}>
              {/* Big Triangle */}
              <div className="flex-shrink-0 pt-2 hidden sm:block">
                <AlertTriangle className="text-red-500 drop-shadow-md" strokeWidth={1.5} fill="#ef4444" color="white" style={{ height: '58px', width: '64px', marginRight: '-30px', marginTop: '-38px' }} />
              </div>
              
              {/* Content */}
              <div className="flex flex-col flex-1 pt-1" style={{ marginRight: '-31px', marginTop: '-20px', height: '6px' }}>
                <h2 className="text-[17px] leading-[22px] font-black text-slate-800 uppercase tracking-wider" style={{ marginBottom: '4px' }}>
                  {isAr ? "تحذير !!!" : "WARNING !!!"}
                </h2>
                <p className="text-slate-600 text-[10px] font-bold leading-relaxed mb-3">
                  {isAr ? "اذا اغلقت الشاشه الان ستفقد البيانات التى قمت بادخالها" : "If you close the screen now, you will lose the data you have entered."}
                </p>
                <p className="text-slate-800 text-[11px] font-black" style={{ marginBottom: '18px' }}>
                  {isAr ? "هل تريد الاستمرار ؟" : "Do you want to continue?"}
                </p>
                
                <div className="flex items-center justify-end gap-3 mt-auto" style={{ width: '296px' }}>
                  <button
                    onClick={() => {
                      setShowCloseWarning(false);
                      onClose();
                    }}
                    className="px-8 bg-red-500/10 text-red-600 border border-red-500/30 hover:bg-red-500/20 rounded-lg font-bold transition-colors shadow-sm text-[12px]"
                    style={{ height: '28px', paddingTop: '4px' }}
                  >
                    {isAr ? "نعم" : "Yes"}
                  </button>
                  <button
                    onClick={() => setShowCloseWarning(false)}
                    className="px-8 bg-green-500/10 text-green-700 border border-green-500/40 hover:bg-green-500/20 rounded-lg font-bold transition-colors shadow-sm text-[12px]"
                    style={{ height: '28px', paddingTop: '4px' }}
                  >
                    {isAr ? "لا" : "No"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default SaleDiscountNoteCanvas;
