import React, { useState, useMemo, useEffect } from 'react';
import { X, Trash2, Barcode, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';

export default function BulkPriceModificationCanvas({ 
  onClose, 
  lang, 
  products, 
  settings,
  onSave, 
  onSaveAndPrint 
}: { 
  onClose: () => void; 
  lang: 'en' | 'ar'; 
  products: any[]; 
  settings: any;
  onSave: (items: any[]) => void; 
  onSaveAndPrint: (items: any[]) => void; 
}) {
  const isAr = lang === 'ar';
  
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    // Filter products based on settings.filters
    let filtered = products;
    if (settings.filters) {
      const f = settings.filters;
      if (f.suppliers?.length > 0) filtered = filtered.filter(p => f.suppliers.includes(p.supplier));
      if (f.departments?.length > 0) filtered = filtered.filter(p => f.departments.includes(p.department));
      if (f.seasons?.length > 0) filtered = filtered.filter(p => f.seasons.includes(p.season));
      if (f.brands?.length > 0) filtered = filtered.filter(p => f.brands.includes(p.brand));
      if (f.categories?.length > 0) filtered = filtered.filter(p => f.categories.includes(p.category));
      if (f.subcategories?.length > 0) filtered = filtered.filter(p => f.subcategories.includes(p.subcategory));
      if (f.locations?.length > 0) filtered = filtered.filter(p => f.locations.includes(p.location));
    }

    // Map to items with calculated new prices
    const newItems = filtered.map(product => {
      let modAmount = 0;
      const oldPrice = product.price || 0;
      
      if (settings.calcMethod === 'percentage') {
        modAmount = oldPrice * (settings.modValue / 100);
      } else {
        modAmount = settings.modValue;
      }
      
      const newPrice = settings.modType === 'increase' ? oldPrice + modAmount : oldPrice - modAmount;
      
      return {
        id: product.id || product.code || Math.random().toString(),
        nameAr: product.nameAr,
        nameEn: product.nameEn,
        barcode: product.barcode,
        stock: product.stock || 0,
        oldPrice: oldPrice,
        modType: settings.modType,
        calcMethod: settings.calcMethod,
        modValue: settings.modValue,
        modAmount: modAmount,
        newPrice: Math.max(0, newPrice)
      };
    });

    setItems(newItems);
  }, [products, settings]);

  const handleDeleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const totalSignedModAmount = items.reduce((sum, item) => sum + (item.modType === 'increase' ? item.modAmount : -item.modAmount), 0);
  const totalPieces = items.reduce((sum, item) => sum + (item.stock || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-orange-500 border-b border-orange-600 p-4 flex items-center justify-between shrink-0 shadow-sm z-20 relative">
        <h2 className="text-lg font-black text-white">
          {isAr ? 'استعراض تعديل أسعار مجمع' : 'Review Bulk Price Modification'}
        </h2>
        <button 
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-white/30 text-white bg-white/20 hover:bg-white/30 rounded-lg text-[13px] font-bold transition cursor-pointer shadow-sm"
        >
          <span>{isAr ? "الغاء ورجوع" : "Cancel & Return"}</span>
          {isAr ? <ArrowLeft size={14} className="opacity-70" /> : <ArrowRight size={14} className="opacity-70" />}
        </button>
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
                <th colSpan={3} className="p-3 whitespace-nowrap ltr:border-r rtl:border-l border-slate-200 text-center">
                  {isAr ? 'التعديل' : 'Modification'}
                </th>
                <th className="p-3 whitespace-nowrap ltr:border-r rtl:border-l border-slate-200 text-center leading-tight">
                  {isAr ? <><span className="block">اجمالى</span><span className="block">التعديل</span></> : <><span className="block">Total</span><span className="block">Mod</span></>}
                </th>
                <th className="p-3 whitespace-nowrap ltr:border-r rtl:border-l border-slate-200 text-center leading-tight">
                  {isAr ? <><span className="block">السعر</span><span className="block">الجديد</span></> : <><span className="block">New</span><span className="block">Price</span></>}
                </th>
                <th className="p-3 whitespace-nowrap text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <tr key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/30"}>
                  <td className="p-2 ltr:border-r rtl:border-l border-slate-200 text-sm font-black text-slate-800 truncate max-w-[200px]">
                    {isAr ? item.nameAr : item.nameEn}
                  </td>
                  <td className="p-2 ltr:border-r rtl:border-l border-slate-200 font-mono text-slate-500">
                    {item.barcode}
                  </td>
                  <td className="p-2 ltr:border-r rtl:border-l border-slate-200 text-center font-mono">
                    {item.stock}
                  </td>
                  <td className="p-2 ltr:border-r rtl:border-l border-slate-200 text-center text-slate-400 font-mono line-through">
                    {item.oldPrice}
                  </td>
                  <td className="p-2 border-r rtl:border-r-0 rtl:border-l border-slate-200 text-center text-slate-400 font-mono bg-slate-50/50">
                    {item.modValue}
                  </td>
                  <td className="p-2 border-r rtl:border-r-0 rtl:border-l border-slate-200 text-center text-slate-400 font-bold bg-slate-50/50">
                    {item.calcMethod === 'value' ? '$' : '%'}
                  </td>
                  <td className="p-2 ltr:border-r rtl:border-l border-slate-200 text-center bg-slate-50/50">
                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-black", item.modType === 'increase' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                      {item.modType === 'increase' ? (isAr ? 'زيادة' : 'Increase') : (isAr ? 'تخفيض' : 'Decrease')}
                    </span>
                  </td>
                  <td className="p-2 ltr:border-r rtl:border-l border-slate-200 text-center bg-slate-50/50 font-black">
                    <span className={item.modType === 'increase' ? "text-emerald-600" : "text-red-600"}>
                      {item.modType === 'increase' ? '+' : '-'}{item.modAmount.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-2 ltr:border-r rtl:border-l border-slate-200 text-center text-sm font-black text-[#0a1945] bg-orange-50/30">
                    <span className="bg-white border border-slate-200 px-2 py-1 rounded-md shadow-xs">{item.newPrice.toFixed(2)}</span>
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
                  <td colSpan={10} className="p-12 text-center text-slate-400 text-sm">
                    {isAr ? 'لا توجد أصناف تطابق الفلاتر المحددة.' : 'No items match the selected filters.'}
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
              {isAr ? 'لا توجد أصناف تطابق الفلاتر المحددة.' : 'No items match the selected filters.'}
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
