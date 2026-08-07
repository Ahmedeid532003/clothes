
import React, { useState, useMemo } from 'react';
import { Search, X, Trash2, Barcode, Check, ArrowRight, ArrowLeft, Settings } from 'lucide-react';
import { cn } from '../lib/utils';


function PriceModificationCreateCanvas({ 
  onClose, 
  lang, 
  products, 
  onSave, 
  onSaveAndPrint 
}: { 
  onClose: () => void; 
  lang: 'en' | 'ar'; 
  products: any[]; 
  onSave: (items: any[]) => void; 
  onSaveAndPrint: (items: any[]) => void; 
}) {
  const isAr = lang === 'ar';
  
  const [modType, setModType] = useState<'increase' | 'decrease'>('increase');
  const [calcMethod, setCalcMethod] = useState<'value' | 'percentage'>('value');
  const [searchQuery, setSearchQuery] = useState("");
  const [modValue, setModValue] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  const [items, setItems] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const valueInputRef = React.useRef<HTMLInputElement>(null);

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
    
    // Move focus to value input immediately
    setTimeout(() => {
      if (valueInputRef.current) {
        valueInputRef.current.focus();
        valueInputRef.current.select();
      }
    }, 50);
  };

  const handleValueKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (!selectedProduct) return;
      const val = parseFloat(modValue);
      if (isNaN(val)) return;
      
      const oldPrice = selectedProduct.sellPrice || 0;
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
        stock: selectedProduct.currentStock || 0,
        oldPrice: oldPrice,
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
      
      // Move focus back to search
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
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

  const totalPieces = items.length;
  const totalSignedModAmount = items.reduce((sum, item) => sum + (item.modType === 'increase' ? item.modAmount : -item.modAmount), 0);
  
  return (
    <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col w-full h-[100dvh] animate-in fade-in zoom-in-95 duration-200">
      {/* Fixed Header */}
      <div className="bg-white border-b border-slate-200 px-4 pt-3 pb-2 shadow-sm flex flex-col gap-2.5 sticky top-0 z-20 shrink-0" >
        
        {/* Main Header Row */}
        <div className="flex flex-col md:flex-row justify-between items-start w-full gap-4 md:gap-0">
          
          {/* Mobile Cancel Button (Shows on small screens at top) */}
          <div className="w-full flex justify-end md:hidden mb-[-5px]">
            <button 
              onClick={onClose}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-red-100 text-red-500 bg-red-50/50 hover:bg-red-50 rounded text-[11px] font-bold transition cursor-pointer shrink-0 shadow-sm"
            >
              <span>{isAr ? "الغاء ورجوع" : "Cancel & Return"}</span>
              {isAr ? <ArrowLeft size={12} className="opacity-70" /> : <ArrowRight size={12} className="opacity-70" />}
            </button>
          </div>

          {/* RTL aligns right side naturally first in flex */}
          <div className="flex flex-col md:flex-row items-stretch md:items-start gap-4 flex-1 w-full">
            <div className="flex flex-col md:flex-row items-stretch md:items-start gap-4 w-full md:w-auto">
              <div className="flex flex-col border border-[#e5ebf2] rounded-lg p-2 bg-white relative pt-3.5 w-full md:w-auto flex-none md:-me-2 md:pe-2" style={{ height: 92, minWidth: isAr ? 161 : 140, marginTop: -5 }}>
                <span className="absolute -top-2.5 rtl:right-2 rtl:left-auto ltr:left-2 bg-white px-1.5 text-[13px] font-bold text-slate-700 whitespace-nowrap">{isAr ? "نوع التعديل" : "Modification Type"}</span>
                <div className="flex flex-col gap-1.5 mt-1">
                  <label onClick={() => setModType('increase')} className={cn("flex items-center justify-between gap-2 py-1 px-2 border rounded cursor-pointer transition w-full", modType === 'increase' ? "border-orange-500 bg-orange-50/50" : "border-slate-200 bg-white hover:border-slate-300")} style={{ minWidth: isAr ? 143 : 122 }}>
                    <span className={cn("text-[12px] leading-4 font-bold", modType === 'increase' ? "text-slate-800" : "text-slate-600")}>{isAr ? "زياده قيمه الاسعار" : "Increase Price"}</span>
                    <div className={cn("w-3.5 h-3.5 rounded-sm flex items-center justify-center border transition-colors shrink-0", modType === 'increase' ? "bg-orange-500 border-orange-500 text-white" : "border-slate-300 bg-white")}>
                      {modType === 'increase' && <Check size={10} strokeWidth={4} />}
                    </div>
                  </label>
                  <label onClick={() => setModType('decrease')} className={cn("flex items-center justify-between gap-2 py-1 px-2 border rounded cursor-pointer transition w-full", modType === 'decrease' ? "border-orange-500 bg-orange-50/50" : "border-slate-200 bg-white hover:border-slate-300")} style={{ minWidth: isAr ? 143 : 122 }}>
                    <span className={cn("text-[12px] leading-4 font-bold", modType === 'decrease' ? "text-slate-800" : "text-slate-600")}>{isAr ? "خفض قيمه الاسعار" : "Decrease Price"}</span>
                    <div className={cn("w-3.5 h-3.5 rounded-sm flex items-center justify-center border transition-colors shrink-0", modType === 'decrease' ? "bg-orange-500 border-orange-500 text-white" : "border-slate-300 bg-white")}>
                      {modType === 'decrease' && <Check size={10} strokeWidth={4} />}
                    </div>
                  </label>
                </div>
              </div>
              
              <div className="flex flex-col border border-[#e5ebf2] rounded-lg p-2 bg-white relative pt-3.5 w-full md:w-auto flex-none" style={{ height: 92, minWidth: isAr ? 146 : 137, marginTop: -6 }}>
                <span className="absolute -top-2.5 rtl:right-2 rtl:left-auto ltr:left-2 bg-white px-1.5 text-[13px] font-bold text-slate-700 whitespace-nowrap">{isAr ? "طريقه حساب التعديل" : "Calculation Method"}</span>
                <div className="flex flex-col gap-1.5 mt-1">
                  <label onClick={() => setCalcMethod('value')} className={cn("flex items-center justify-between gap-2 py-1 px-2 border rounded cursor-pointer transition w-full", calcMethod === 'value' ? "border-orange-500 bg-orange-50/50" : "border-slate-200 bg-white hover:border-slate-300")} style={{ minWidth: isAr ? 124 : 111 }}>
                    <span className={cn("text-[12px] leading-4 font-bold", calcMethod === 'value' ? "text-slate-800" : "text-slate-600")}>{isAr ? "قيمه $" : "Value $"}</span>
                    <div className={cn("w-3.5 h-3.5 rounded-sm flex items-center justify-center border transition-colors shrink-0", calcMethod === 'value' ? "bg-orange-500 border-orange-500 text-white" : "border-slate-300 bg-white")}>
                      {calcMethod === 'value' && <Check size={10} strokeWidth={4} />}
                    </div>
                  </label>
                  <label onClick={() => setCalcMethod('percentage')} className={cn("flex items-center justify-between gap-2 py-1 px-2 border rounded cursor-pointer transition w-full", calcMethod === 'percentage' ? "border-orange-500 bg-orange-50/50" : "border-slate-200 bg-white hover:border-slate-300")} style={{ minWidth: isAr ? 124 : 114 }}>
                    <span className={cn("text-[12px] leading-4 font-bold", calcMethod === 'percentage' ? "text-slate-800" : "text-slate-600")}>{isAr ? "نسبه %" : "Percentage %"}</span>
                    <div className={cn("w-3.5 h-3.5 rounded-sm flex items-center justify-center border transition-colors shrink-0", calcMethod === 'percentage' ? "bg-orange-500 border-orange-500 text-white" : "border-slate-300 bg-white")}>
                      {calcMethod === 'percentage' && <Check size={10} strokeWidth={4} />}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="relative flex flex-col gap-1 w-full md:flex-1 md:max-w-xl md:mt-[37px]" style={{ marginTop: -12 }}>
              <label className="text-[12px] font-bold text-[#141415]">{isAr ? "اختر الصنف المراد تعديل سعره" : "Select item to modify"}</label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 rtl:right-2.5 rtl:left-auto top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                    if (selectedProduct) setSelectedProduct(null);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder={isAr ? "البحث بالكود، اسم الصنف، أو الباركود..." : "Search by code, name, or barcode..."}
                  className="w-full text-xs font-bold px-8 py-0 bg-white border border-slate-200 rounded outline-none focus:border-orange-500 transition"
                  style={{ height: 30 }}
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(""); setSelectedProduct(null); searchInputRef.current?.focus(); }} className="absolute right-2.5 rtl:left-2.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500">
                    <X size={14} />
                  </button>
                )}
              </div>
              
              {/* Search Dropdown */}
              {showDropdown && filteredProducts.length > 0 && (
                <div className="absolute top-[100%] mt-1 left-0 right-0 bg-white border border-slate-200 shadow-xl rounded-xl z-50 overflow-hidden">
                  {filteredProducts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleProductSelect(p)}
                      className="w-full text-left rtl:text-right p-3 hover:bg-orange-50 border-b border-slate-100 last:border-0 flex items-center justify-between cursor-pointer transition"
                    >
                      <div>
                        <div className="font-extrabold text-sm text-slate-800">{isAr ? p.nameAr : p.nameEn}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{p.barcode || p.code}</div>
                      </div>
                      <div className="text-sm font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                        {p.salePrice} $
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-1 w-full md:w-[99px] shrink-0 md:mt-[37px]">
              <label className="text-[12px] font-bold text-[#191a1b]" style={{ marginTop: -9 }}>{isAr ? "قيمه التعديل" : "Modification Value"}</label>
              <input
                ref={valueInputRef}
                type="number"
                value={modValue}
                onChange={e => setModValue(e.target.value)}
                onKeyDown={handleValueKeyDown}
                placeholder="0"
                className="w-full text-xs font-bold p-1 text-center bg-white border border-slate-300 rounded outline-none focus:ring-2 focus:ring-orange-100 transition shadow-sm"
                style={{ height: 30 }}
              />
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 border border-red-100 text-red-500 bg-red-50/50 hover:bg-red-50 rounded text-[11px] font-bold transition cursor-pointer shrink-0 shadow-sm mt-1"
            style={{ marginTop: -6, marginInlineEnd: -9 }}
          >
            <span>{isAr ? "الغاء ورجوع" : "Cancel & Return"}</span>
            {isAr ? <ArrowLeft size={12} className="opacity-70" /> : <ArrowRight size={12} className="opacity-70" />}
          </button>
        </div>
      </div>
      {/* Table Area */}
      <div className="flex-1 overflow-auto p-4 bg-slate-50 min-h-0">
        
        {/* Desktop Table Layout */}
        <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left rtl:text-right border-collapse text-xs font-bold text-slate-700">
            <thead className="sticky top-0 z-10 bg-slate-100 text-slate-800 select-none">
              <tr className="border-b border-slate-200">
                <th className="p-3 whitespace-nowrap ltr:border-r rtl:border-l border-slate-200 w-full">{isAr ? 'اسم الصنف' : 'Item Name'}</th>
                <th className="p-3 whitespace-nowrap ltr:border-r rtl:border-l border-slate-200">{isAr ? 'باركود الصنف' : 'Barcode'}</th>
                <th className="p-3 whitespace-nowrap ltr:border-r rtl:border-l border-slate-200 text-center leading-tight">
                  {isAr ? <><span className="block">رصيد</span><span className="block">عام</span></> : <><span className="block">Stock</span></>}
                </th>
                <th className="p-3 whitespace-nowrap ltr:border-r rtl:border-l border-slate-200 text-center leading-tight">
                  {isAr ? <><span className="block">سعر</span><span className="block">بيع</span></> : <><span className="block">Sell</span><span className="block">Price</span></>}
                </th>
                <th className="p-0 whitespace-nowrap ltr:border-r rtl:border-l border-slate-200" colSpan={2}>
                  <div className="border-b border-slate-200 p-1.5 text-center">{isAr ? 'التعـــــديلات' : 'Modification'}</div>
                  <div className="flex">
                    <div className="w-10 p-2 ltr:border-r rtl:border-l border-slate-200 text-center shrink-0">{isAr ? 'نوع' : 'Type'}</div>
                    <div className="min-w-[80px] p-2 text-center shrink-0">{isAr ? 'قيمه' : 'Value'}</div>
                  </div>
                </th>
                <th className="p-3 whitespace-nowrap ltr:border-r rtl:border-l border-slate-200 text-center leading-tight">
                  {isAr ? <><span className="block">اجمالى</span><span className="block">التعديل</span></> : <><span className="block">Total</span><span className="block">Mod</span></>}
                </th>
                <th className="p-3 whitespace-nowrap ltr:border-r rtl:border-l border-slate-200 text-center leading-tight">
                  {isAr ? <><span className="block">السعر</span><span className="block">الجديد</span></> : <><span className="block">New</span><span className="block">Price</span></>}
                </th>
                <th className="p-3 whitespace-nowrap text-center w-[44px]">
                  <Settings size={14} className="mx-auto text-slate-500" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, i) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-2 font-black text-slate-800 ltr:border-r rtl:border-l border-slate-100">{isAr ? item.nameAr : item.nameEn}</td>
                  <td className="p-2 font-mono text-slate-500 ltr:border-r rtl:border-l border-slate-100">{item.barcode}</td>
                  <td className="p-2 text-center font-mono ltr:border-r rtl:border-l border-slate-100">{item.stock}</td>
                  <td className="p-2 ltr:border-r rtl:border-l border-slate-100 text-center">
                    <span className="text-slate-600">{item.oldPrice}</span>
                  </td>
                  <td className="p-1 ltr:border-r rtl:border-l border-slate-100 text-center bg-slate-50/50 w-10">
                    <span className="font-bold text-slate-600">
                      {item.calcMethod === 'value' ? '$' : '%'}
                    </span>
                  </td>
                  <td className="p-1 ltr:border-r rtl:border-l border-slate-100 text-center bg-slate-50/50 min-w-[80px]">
                    <span className="font-bold text-slate-800">
                      {item.modValue}
                    </span>
                  </td>
                  <td className="p-2 ltr:border-r rtl:border-l border-slate-100 text-center">
                    <span className={cn("px-2 py-1 rounded-md text-sm font-black inline-flex min-w-[60px] justify-center", item.modType === 'increase' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                      {item.modType === 'increase' ? '+' : '-'}{item.modAmount.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-2 ltr:border-r rtl:border-l border-slate-100 text-center">
                    <span className="font-black text-slate-800 text-sm">{item.newPrice.toFixed(2)}</span>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleDeleteItem(item.id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors cursor-pointer" title={isAr ? "حذف" : "Delete"}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400 text-sm">
                    {isAr ? 'لم يتم إضافة أصناف بعد. ابحث بالأعلى لإضافة أصناف.' : 'No items added yet. Search above to add items.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Layout */}
        <div className="md:hidden flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col gap-3 text-xs font-bold text-slate-700">
              
              {/* Header: Name and Delete */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-2">
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
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
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
              <div className="flex gap-2 items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100 mt-[-4px]">
                <div className="flex gap-4">
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[10px] mb-1">{isAr ? 'النوع' : 'Type'}</span>
                    <span className="font-bold text-slate-600 text-sm">{item.calcMethod === 'value' ? '$' : '%'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[10px] mb-1">{isAr ? 'قيمه التعديل' : 'Value'}</span>
                    <span className="font-bold text-slate-800 text-sm">{item.modValue}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-end">
                   <span className="text-slate-400 text-[10px] mb-1">{isAr ? 'اجمالى التعديل' : 'Total Mod'}</span>
                   <span className={cn("px-2 py-1.5 rounded-md text-sm font-black flex items-center justify-center", item.modType === 'increase' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")} style={{ minWidth: 60 }}>
                      {item.modType === 'increase' ? '+' : '-'}{item.modAmount.toFixed(2)}
                   </span>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm bg-white border border-slate-200 rounded-xl">
              {isAr ? 'لم يتم إضافة أصناف بعد. ابحث بالأعلى لإضافة أصناف.' : 'No items added yet. Search above to add items.'}
            </div>
          )}
        </div>
      </div>
      
      {/* Fixed Footer */}
      <div className="bg-white border-t border-slate-200 p-3 shadow-sm mt-auto shrink-0 z-20" style={{ height: 147 }}>
        <div className="flex flex-col gap-3 max-w-4xl mx-auto w-full">
          {/* Totals */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between bg-transparent md:bg-slate-50 border-0 md:border border-slate-200 rounded-lg md:p-2.5 md:px-6 font-bold gap-2 md:gap-0">
             <div className="flex items-center justify-between md:justify-start gap-3 bg-white md:bg-transparent border border-slate-200 md:border-0 p-3 md:p-0 rounded-lg shadow-sm md:shadow-none" style={{ height: 38 }}>
                <span className={cn("text-[12px] leading-4", totalSignedModAmount > 0 ? "text-emerald-600" : totalSignedModAmount < 0 ? "text-red-600" : "text-[#0d0d0e]")}>{isAr ? "اجمالى قيمه التعديلات" : "Total Mod Value"}:</span>
                <span className={cn("text-sm", totalSignedModAmount > 0 ? "text-emerald-600" : totalSignedModAmount < 0 ? "text-red-600" : "text-slate-600")}>
                  {totalSignedModAmount > 0 ? '+' : ''}{totalSignedModAmount.toFixed(2)} $
                </span>
             </div>
             <div className="flex items-center justify-between md:justify-start gap-3 md:border-l rtl:md:border-l-0 rtl:md:border-r border-slate-300 md:pl-4 rtl:md:pl-0 rtl:md:pr-4 bg-white md:bg-transparent border border-slate-200 md:border-0 p-3 md:p-0 rounded-lg shadow-sm md:shadow-none" style={{ height: 38 }}>
                <span className="text-[#151617] text-[12px] leading-4">{isAr ? "عدد القطع" : "Pieces Count"}:</span>
                <span className="text-sm text-[#0a1945]">{totalPieces}</span>
             </div>
             <div className="hidden md:block text-sm border-l rtl:border-l-0 rtl:border-r border-slate-300 pl-4 rtl:pl-0 rtl:pr-4 text-[#1c1a1a]">
               {isAr ? "اجماليات" : "Totals"}
             </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 justify-center sm:justify-start rtl:sm:justify-end" style={{ marginTop: -5, height: 34 }}>
            <button 
              onClick={() => onSaveAndPrint(items)}
              disabled={items.length === 0}
              className="py-2 px-6 bg-indigo-600 disabled:opacity-50 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs"
            >
              <Barcode size={14} />
              <span>{isAr ? "حفظ وطباعه باركود" : "Save & Print Barcode"}</span>
            </button>
            <button 
              onClick={() => onSave(items)}
              disabled={items.length === 0}
              className="py-2 px-10 bg-orange-500 disabled:opacity-50 hover:bg-orange-600 text-white font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs"
            >
              <span>{isAr ? "حفظ" : "Save"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


export default PriceModificationCreateCanvas;
