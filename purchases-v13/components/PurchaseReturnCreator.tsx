import React, { useState, useRef, useEffect } from 'react';
import { Search, Trash2, Edit, X, Plus, History, ChevronDown, ArrowLeft, ArrowRight , Eye, Upload } from 'lucide-react';
import { cn } from '../lib/utils';
import { ErrorBoundary } from "./ErrorBoundary";
import { motion, AnimatePresence } from 'motion/react';
import { ProductViewModal } from "./ProductViewModal";

// Custom Searchable Select Component
function CustomSelect({ value, onChange, options, placeholder, isAr }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt: any) => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedLabel = options.find((opt: any) => opt.value === value)?.label || placeholder;

  return (
    <div ref={wrapperRef} className="relative w-full h-full">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-gray-300 rounded-[8px] px-2 h-full min-h-[34px] bg-white flex justify-between items-center cursor-pointer hover:border-[#FF6900] transition-colors"
      >
        <span className={cn("text-[11px] truncate font-bold", !value && "text-gray-400")}>{selectedLabel}</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-[8px] shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-gray-100 bg-gray-50">
              <input 
                type="text" 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={isAr ? "بحث..." : "Search..."}
                className="w-full border border-gray-300 rounded px-1.5 h-[34px] text-[11px] outline-none focus:border-[#FF6900]"
                onClick={e => e.stopPropagation()}
              />
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt: any) => (
                  <div 
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "px-2 py-1.5 text-[11px] cursor-pointer hover:bg-orange-50 transition-colors",
                      value === opt.value ? "bg-orange-100 text-[#FF6900] font-bold" : "text-gray-700 font-bold"
                    )}
                  >
                    {opt.label}
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-sm text-gray-500 font-bold">
                  {isAr ? "لا توجد نتائج" : "No results"}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export interface PurchaseReturnCreatorProps {
  lang: 'ar' | 'en';
  returnData: any;
  onCancel: () => void;
  onSave: (data: any) => void;
  products: any[];
}

export function PurchaseReturnCreator({ lang, returnData, onCancel, onSave, products }: PurchaseReturnCreatorProps) {
  const isAr = lang === 'ar';
  
  // Sidebar states
  const [returnDate, setInvoiceDate] = useState(returnData?.returnDate || new Date().toISOString().split('T')[0]);
  const [waybillNumber, setWaybillNumber] = useState("");
  const [waybillImage, setWaybillImage] = useState<string | null>(null);
  const [shippingCompany, setShippingCompany] = useState("");

  const shippingCompanyOptions = [
    { value: "urgent", label: isAr ? "ايرجنت" : "Urgent" },
    { value: "mirage", label: isAr ? "ميراج" : "Mirage" },
    { value: "rapido", label: isAr ? "رابيدو" : "Rapido" },
    { value: "barq_star", label: isAr ? "برق ستار" : "Barq Star" }
  ];
  const [supplierName, setSupplierName] = useState(returnData?.supplierName || "");
  const [season, setSeason] = useState(returnData?.season || "");
  
  // New Header Fields
  const [branchStore, setBranchStore] = useState("");
  const [returnType, setReturnType] = useState("اجل");
  const [checkNumber, setCheckNumber] = useState("");
  const [viewingProduct, setViewingProduct] = useState<any | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState("");

  const paidAmountInputRef = useRef<HTMLInputElement>(null);

const [totalDiscountType, setTotalDiscountType] = useState<"%" | "val">("val");
  const [totalDiscountValue, setTotalDiscountValue] = useState<number | "">("");
  
  // Top bar states
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [qtyInput, setQtyInput] = useState<number | "">("");
  const [searchBySeasonOnly, setSearchBySeasonOnly] = useState<boolean>(false);
  
  // Items state
  const [items, setItems] = useState<any[]>([]);
  
  // Refs for focus
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  
  // Edit item modal state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editQty, setEditQty] = useState<number | "">("");
  const [editBuyPrice, setEditBuyPrice] = useState<number | "">("");
  const [editDiscountType, setEditDiscountType] = useState<"%" | "val">("val");
  const [editDiscountValue, setEditDiscountValue] = useState<number | "">("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [validationError, setValidationError] = useState("");
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsSearchOpen(true);
  };
  
  const filteredProducts = (products || []).filter(p => 
    (p.nameAr?.includes(searchQuery) || p.nameEn?.includes(searchQuery) || p.name?.includes(searchQuery) || p.code?.includes(searchQuery) || p.barcode?.includes(searchQuery))
  );
  
  const handleSelectProduct = (product: any) => {
    setSelectedProduct(product);
    setSearchQuery(product.nameAr || product.name || product.nameEn);
    setIsSearchOpen(false);
    setTimeout(() => {
      qtyInputRef.current?.focus();
    }, 100);
  };
  
  const handleQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && selectedProduct && qtyInput) {
      if (!supplierName || !branchStore || !season) {
        setValidationError(isAr ? "برجاء اختيار المورد، الفرع، الموسم، أولاً" : "Please select Supplier, Branch, Season, first");
        return;
      }
      setValidationError("");
      const buyPrice = selectedProduct.costPrice || 0;
      const prevSellPrice = selectedProduct.sellPrice || 0;
      const newItem = {
        productId: selectedProduct.id,
        barcode: selectedProduct.barcode || selectedProduct.code,
        model: selectedProduct.model || "",
        description: selectedProduct.nameAr || selectedProduct.name,
                qty: Number(qtyInput),
        buyPrice: buyPrice,
        discountType: "val" as "%" | "val",
        discountValue: 0,
        total: buyPrice * Number(qtyInput),
        profitPercent: 40,
        sellPrice: buyPrice * (1 + 40 / 100),
        repeat: 1,
        prevSellPrice: prevSellPrice
      };
      
      setItems([newItem, ...items]);
      
      // Reset
      setSelectedProduct(null);
      setSearchQuery("");
      setQtyInput("");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };
  
  const handleEditItem = (index: number) => {
    setEditingIndex(index);
    setEditQty(items[index].qty);
    setEditBuyPrice(items[index].buyPrice);
    setEditDiscountType(items[index].discountType);
    setEditDiscountValue(items[index].discountValue);
    setIsEditModalOpen(true);
  };
  
  const saveEditedItem = () => {
    if (editingIndex !== null) {
      const newItems = [...items];
      const item = newItems[editingIndex];
      item.qty = Number(editQty);
      item.buyPrice = Number(editBuyPrice);
      item.discountType = editDiscountType;
      item.discountValue = Number(editDiscountValue);
      
      // Recalculate total for item
      const discountAmt = item.discountType === '%' 
        ? (item.buyPrice * item.qty * item.discountValue / 100)
        : item.discountValue;
        
      item.total = (item.buyPrice * item.qty) - discountAmt;
      
      setItems(newItems);
      setIsEditModalOpen(false);
      setEditingIndex(null);
    }
  };
  
  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };
  
  // Calculations
  const invoiceTotalBeforeDiscount = items.reduce((sum, item) => sum + (item.buyPrice * item.qty), 0);
  const itemsDiscountTotal = items.reduce((sum, item) => {
    const discountAmt = item.discountType === '%' 
        ? (item.buyPrice * item.qty * item.discountValue / 100)
        : item.discountValue;
    return sum + discountAmt;
  }, 0);
  
  const discountValNum = Number(totalDiscountValue) || 0;
  const invoiceDiscountTotal = totalDiscountType === '%' 
    ? (invoiceTotalBeforeDiscount - itemsDiscountTotal) * (discountValNum / 100)
    : discountValNum;
    
  const totalDiscounts = itemsDiscountTotal + invoiceDiscountTotal;
  const netInvoiceValue = invoiceTotalBeforeDiscount - totalDiscounts;

  // Options for Dropdowns
  const supplierOptions = [
    { value: "مورد 1", label: "مورد 1" },
    { value: "مورد 2", label: "مورد 2" },
  ];
  const seasonOptions = [
    { value: "صيفي", label: "صيفي" },
    { value: "شتوي", label: "شتوي" },
  ];
  const brandOptions = [
    { value: "براند 1", label: "براند 1" },
    { value: "براند 2", label: "براند 2" },
  ];
  const categoryOptions = [
    { value: "cat1", label: isAr ? "قسم الرجالي" : "Men's Category" },
    { value: "cat2", label: isAr ? "قسم الحريمي" : "Women's Category" }
  ];
  const branchOptions = [
    { value: "branch1", label: isAr ? "الفرع الرئيسي" : "Main Branch" },
    { value: "branch2", label: isAr ? "مخزن 1" : "Store 1" }
  ];
  const returnTypeOptions = [
    { value: "اجل", label: isAr ? "اجل" : "Credit" },
    { value: "نقدى", label: isAr ? "نقدى" : "Cash" }
  ];
  
  const checkOptions = [
    { value: "1001", label: "1001" },
    { value: "1002", label: "1002" },
    { value: "1003", label: "1003" },
  ];
  const groupOptions = [
    { value: "مجموعة 1", label: "مجموعة 1" },
    { value: "مجموعة 2", label: "مجموعة 2" },
  ];

  return (
    <div className={cn("fixed inset-0 z-[200] w-full h-full flex flex-col bg-slate-50 lg:bg-gray-100 overflow-hidden", isAr ? "rtl font-[Cairo]" : "ltr")}>
      
      {/* Mobile Layout */}
      <div className="flex lg:hidden flex-col h-full bg-slate-50 relative pb-[60px]">
         {/* Mobile Header */}
         <div className="bg-[#FF6900] text-white px-4 py-2 shrink-0 flex items-center justify-between shadow-md h-[43px]">
            <span className="font-bold text-[14px]">{isAr ? "انشاء فاتوره مرتد مشتريات" : "Create Purchase Return"}</span>
            <button onClick={onCancel} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
         </div>
         
         <div className="flex-1 overflow-y-auto p-2 space-y-3">
            <div className="bg-white p-3 rounded-[12px] shadow-sm border border-gray-200 flex flex-col gap-3">
               <div className="space-y-2">
                 <input type="date" value={returnDate} onChange={e => setInvoiceDate(e.target.value)} className="w-full border border-gray-300 rounded-[8px] px-2 h-[34px] outline-none focus:border-[#FF6900] text-[11px] font-bold text-gray-700 bg-white" />
                 <div className="w-full h-[34px]">
                    <CustomSelect value={shippingCompany} onChange={setShippingCompany} options={shippingCompanyOptions} placeholder={isAr ? "شركة الشحن" : "Shipping Co."} isAr={isAr} />
                 </div>
                 <label 
                  className="w-full h-[34px] bg-slate-50 text-gray-500 rounded-[8px] flex items-center justify-center gap-1 font-bold text-[11px] hover:bg-slate-100 transition-colors border border-[#FF6900]/30 cursor-pointer overflow-hidden relative"
                 >
                  {waybillImage ? (
                    <img src={waybillImage} alt="waybill" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>{isAr ? "صورة البوليصة" : "Waybill Img"}</span>
                    </>
                  )}
                  <input type="file" className="hidden" accept="image/*" onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      const reader = new FileReader();
                      reader.onload = (e) => setWaybillImage(e.target?.result as string);
                      reader.readAsDataURL(e.target.files[0]);
                    }
                  }} />
                 </label>
                 <input 
                   type="text" 
                   value={waybillNumber} 
                   onChange={e => setWaybillNumber(e.target.value)}
                   placeholder={isAr ? "رقم البوليصة" : "Waybill Number"}
                   className="w-full h-[34px] px-2 font-bold text-[11px] text-gray-700 bg-gray-50 rounded-[8px] border border-gray-300 outline-none focus:border-[#FF6900] text-right"
                 />
                 <div className="w-full h-[34px]"><CustomSelect value={supplierName} onChange={setSupplierName} options={supplierOptions} placeholder={isAr ? "المورد" : "Supplier"} isAr={isAr} /></div>
                 <div className="w-full h-[34px]"><CustomSelect value={season} onChange={setSeason} options={seasonOptions} placeholder={isAr ? "الموسم" : "Season"} isAr={isAr} /></div>
                 <div className="w-full h-[34px]"><CustomSelect value={branchStore} onChange={setBranchStore} options={branchOptions} placeholder={isAr ? "الفرع/المخزن" : "Branch/Store"} isAr={isAr} /></div>
                 <button 
                   onClick={() => setIsOrderModalOpen(true)}
                   className="w-full h-[34px] bg-[#FF6900] text-white rounded-[8px] flex items-center justify-center gap-1 font-bold text-[11px] hover:bg-[#e65c00] transition-colors"
                 >
                   <Plus size={14} />
                   {isAr ? "من فاتورة شراء" : "From Purchase Invoice"}
                 </button>
                                                 </div>
               <div className="space-y-2 border-t border-gray-100 pt-3">
                  <div className="w-full h-[34px]">
                    <CustomSelect value={returnType} onChange={setReturnType} options={returnTypeOptions} placeholder={isAr ? "نوع المرتجع" : "Return Type"} isAr={isAr} />
                  </div>


               </div>
            </div>
            
            <div className="bg-white p-3 rounded-[12px] shadow-sm border border-gray-200 flex flex-col items-stretch gap-3 shrink-0 relative z-20">
              <div className="flex gap-2">
                 
              </div>
              <div className="flex gap-2 mb-2">
                 <div className="flex-1 flex items-center h-[34px] border border-gray-300 rounded-[8px] overflow-hidden bg-white hover:border-[#FF6900] transition-colors focus-within:border-[#FF6900] shrink-0">
                    <div className="bg-gray-100 px-2 h-full flex flex-1 items-center justify-center font-bold text-[10px] font-[Cairo] border-l border-gray-300 shrink-0 text-gray-700">
                       {isAr ? "منتجات الموسم فقط" : "Season only"}
                    </div>
                    <div className="w-[30px] h-full flex items-center justify-center">
                       <input 
                           type="checkbox" 
                           checked={searchBySeasonOnly}
                          onChange={e => setSearchBySeasonOnly(e.target.checked)}
                          className="w-3.5 h-3.5 cursor-pointer accent-[#FF6900]"
                       />
                    </div>
                 </div>
              </div>
              <div className="flex-1 relative h-[32px] border rounded-[8px] bg-gray-50 flex items-center">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  ref={searchInputRef}
                  type="text" 
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => setIsSearchOpen(true)}
                  placeholder={isAr ? "بحث عن صنف..." : "Search..."}
                  className="w-full h-full outline-none text-center font-bold text-sm bg-transparent pr-10 rounded-[8px]"
                />
                <AnimatePresence>
                  {isSearchOpen && searchQuery && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-[45px] left-0 right-0 bg-white border border-gray-300 shadow-2xl max-h-[300px] overflow-y-auto z-50 rounded-b-lg"
                    >
                       <div className="flex flex-col">
                        <div className="overflow-x-auto w-full">
                          <table className="w-full text-[11px] font-bold text-center">
                            <thead className="bg-gray-100 sticky top-0 border-b border-gray-300 shadow-sm">
                              <tr>
                                <th className="p-2 border-l border-gray-300">{isAr ? "باركود" : "Barcode"}</th>
                                <th className="p-2 border-l border-gray-300">{isAr ? "موديل" : "Model"}</th>
                                <th className="p-2 border-l border-gray-300 text-right pr-4 min-w-[120px]">{isAr ? "اسم الصنف" : "Item Name"}</th>
                                                                <th className="p-2 border-l border-gray-300 w-[70px]">{isAr ? "سعر الشراء" : "Buy Price"}</th>
                                <th className="p-2 border-l border-gray-300">{isAr ? "الموسم" : "Season"}</th>
                                <th className="p-2 border-l border-gray-300">{isAr ? "اسم المورد" : "Supplier"}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredProducts.map((p, idx) => (
                                <tr 
                                  key={p.id} 
                                  onClick={() => handleSelectProduct(p)}
                                  className="border-b border-gray-200 hover:bg-orange-50 cursor-pointer transition-colors whitespace-nowrap"
                                >
                                  <td className="p-2 border-l border-gray-200">{p.barcode || p.code}</td>
                                  <td className="p-2 border-l border-gray-200">{p.model || "-"}</td>
                                  <td className="p-2 border-l border-gray-200 text-right pr-4">{isAr ? p.nameAr || p.name : p.nameEn || p.name}</td>
                                                                    <td className="p-2 border-l border-gray-200 text-[#FF6900]">{p.costPrice || 0}</td>
                                  <td className="p-2 border-l border-gray-200">{p.season || "-"}</td>
                                  <td className="p-2 border-l border-gray-200">{p.supplierName || "-"}</td>
                                </tr>
                              ))}
                              {filteredProducts.length === 0 && (
                                <tr><td colSpan={7} className="p-3 text-gray-500 text-center">{isAr ? "لا يوجد" : "No results"}</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        <div 
                           className="bg-[#FF6900] text-white text-center py-2 font-bold text-[12px] cursor-pointer hover:bg-[#e65c00] transition-colors sticky bottom-0 z-10"
                           onClick={() => {
                             // Will tell what happens later
                             
                           }}
                         >
                           {isAr ? "اضافه صنف جديد" : "Add new item"}
                         </div>
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
               <div className="w-full flex items-center h-[45px] border border-gray-300 rounded-[8px] overflow-hidden bg-white focus-within:border-[#FF6900] transition-colors shrink-0">
                  <div className="bg-gray-100 px-3 h-full flex items-center justify-center font-bold text-sm border-l border-gray-300 shrink-0 text-gray-700">
                    {isAr ? "الكميه" : "Qty"}
                  </div>
                  <input 
                     ref={qtyInputRef}
                     type="number" 
                     value={qtyInput} 
                     onChange={e => setQtyInput(e.target.value === "" ? "" : Number(e.target.value))}
                     onKeyDown={handleQtyKeyDown}
                     placeholder="0"
                     className="w-full h-full outline-none text-center bg-yellow-50 focus:bg-yellow-100 transition-colors text-lg font-bold" 
                  />
               </div>
            </div>
            
            <div className="space-y-3 pb-4">
              {items.map((item, idx) => (
                <div key={idx} className="bg-white p-3 rounded-[12px] shadow-sm border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-sm text-gray-800">{item.description}</div>
                      <div className="text-xs text-gray-500">{item.barcode}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditItem(idx)} className="p-1.5 text-blue-500 bg-blue-50 rounded-full"><Edit size={14} /></button>
                      <button onClick={() => setViewingProduct((products || []).find(p => p.id === item.productId) || { ...item, costPrice: item.buyPrice, nameAr: item.description, nameEn: item.description })} className="p-1.5 text-emerald-500 bg-emerald-50 rounded-full"><Eye size={14} /></button>
                      <button onClick={() => handleRemoveItem(idx)} className="p-1.5 text-red-500 bg-red-50 rounded-full"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                    <div className="bg-gray-50 p-2 rounded-lg">
                      <div className="text-gray-500 mb-1">{isAr ? "الكمية" : "Qty"}</div>
                      <div className="font-bold">{item.qty}</div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg">
                      <div className="text-gray-500 mb-1">{isAr ? "الاجمالي" : "Total"}</div>
                      <div className="font-bold text-[#FF6900]">{item.total.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-center p-6 text-gray-400 font-bold text-sm">
                  {isAr ? "لا يوجد اصناف" : "No items"}
                </div>
              )}
            </div>
         </div>
         
         <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-3 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.1)] z-40">
            <div className="flex items-center justify-between font-bold text-[14px]">
               <span>{isAr ? "الصافي:" : "Net:"}</span>
               <span className="text-[#FF6900] text-[18px]">{netInvoiceValue.toLocaleString()}</span>
            </div>
            <div className="flex gap-2 mt-2">
              <button className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold text-[12px]">{isAr ? "كمسودة" : "Draft"}</button>
              <button className="flex-1 py-2 bg-[#FF6900] text-white rounded-lg font-bold text-[12px]">{isAr ? "حفظ" : "Save"}</button>
            </div>
         </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex flex-col flex-1 overflow-hidden bg-white">
        
        {/* Header */}
        <div className="bg-[#FF6900] text-white px-4 shrink-0 flex items-center justify-between shadow-md h-[43px] z-30">
          <div className="font-bold text-[14px]">{isAr ? "انشاء فاتوره مرتد مشتريات" : "Create Purchase Return"}</div>
          <button 
            onClick={onCancel}
            className="flex items-center gap-1.5 px-4 h-[30px] bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-[8px] text-[12px] font-bold transition-colors cursor-pointer shadow-sm"
          >
            <span>{isAr ? "الغاء ورجوع" : "Cancel & Return"}</span>
            {isAr ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
          </button>
        </div>

                {/* Filters Bar */}
        <div className="bg-white px-4 py-2 border-b border-gray-300 shrink-0 z-20 flex justify-between">
          <div className="flex gap-2">
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 h-[34px]">
                <div className="w-[194px] h-full"><CustomSelect value={supplierName} onChange={setSupplierName} options={supplierOptions} placeholder={isAr ? "المورد" : "Supplier"} isAr={isAr} /></div>
                <div className="w-[140px] h-full"><CustomSelect value={season} onChange={setSeason} options={seasonOptions} placeholder={isAr ? "الموسم" : "Season"} isAr={isAr} /></div>
              </div>
              <div className="flex gap-2 h-[34px]">
                <div className="w-[194px] h-full"><CustomSelect value={branchStore} onChange={setBranchStore} options={branchOptions} placeholder={isAr ? "الفرع/المخزن" : "Branch/Store"} isAr={isAr} /></div>
                <button 
                  onClick={() => setIsOrderModalOpen(true)}
                  className="w-[140px] h-full bg-[#FF6900] text-white rounded-[8px] flex items-center justify-center gap-1 font-bold text-[11px] hover:bg-[#e65c00] transition-colors whitespace-nowrap"
                >
                  <Plus size={14} />
                  {isAr ? "من فاتورة شراء" : "From Purchase Invoice"}
                </button>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 h-[34px]">
                <span className="font-bold text-[11px] text-gray-700 whitespace-nowrap">{isAr ? "نوع المرتجع" : "Return Type"}</span>
                <div className="w-[180px] h-full">
                  <CustomSelect value={returnType} onChange={setReturnType} options={returnTypeOptions} placeholder={isAr ? "نوع المرتجع" : "Return Type"} isAr={isAr} />
                </div>
              </div>
              <button 
                onClick={() => {}}
                className="w-full h-[34px] bg-white text-[#FF6900] border border-gray-200 hover:border-[#FF6900] rounded-[8px] flex items-center justify-center gap-1 font-bold text-[11px] transition-colors whitespace-nowrap shadow-sm"
              >
                <Plus size={14} />
                {isAr ? "تحويل اصناف من الفروع الاخرى" : "Transfer items from other branches"}
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 lg:gap-4">
            <div className="flex flex-col gap-2 w-[225px]">
              <div className="flex justify-between h-[34px]">
                <div className="w-[101px] h-full">
                  <CustomSelect value={shippingCompany} onChange={setShippingCompany} options={shippingCompanyOptions} placeholder={isAr ? "شركة الشحن" : "Shipping Co."} isAr={isAr} />
                </div>
                <label 
                  className="w-[116px] -ml-[8px] rtl:-mr-[8px] rtl:-ml-0 h-full bg-slate-50 text-gray-500 rounded-[8px] flex items-center justify-center gap-1 hover:bg-slate-100 transition-colors font-bold text-[11px] border border-[#FF6900]/30 cursor-pointer overflow-hidden relative"
                >
                  {waybillImage ? (
                    <img src={waybillImage} alt="waybill" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>{isAr ? "صورة البوليصة" : "Waybill Img"}</span>
                    </>
                  )}
                  <input type="file" className="hidden" accept="image/*" onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      const reader = new FileReader();
                      reader.onload = (e) => setWaybillImage(e.target?.result as string);
                      reader.readAsDataURL(e.target.files[0]);
                    }
                  }} />
                </label>
              </div>
              <input 
                 type="text" 
                 value={waybillNumber} 
                 onChange={e => setWaybillNumber(e.target.value)}
                 placeholder={isAr ? "رقم البوليصة" : "Waybill Number"}
                 className="w-full h-[34px] px-2 font-bold text-[11px] text-gray-700 bg-gray-50 rounded-[8px] border border-gray-300 outline-none focus:border-[#FF6900] text-right"
              />
            </div>
            
            <div className="flex flex-col gap-2 w-[205px]">
              <div className="flex justify-between h-[34px]">
                <input type="date" value={returnDate} onChange={e => setInvoiceDate(e.target.value)} className="w-[110px] h-full border border-gray-300 rounded-[8px] px-2 outline-none focus:border-[#FF6900] text-[11px] font-bold text-gray-700 bg-white" />
                <button 
                  onClick={() => setIsOrderModalOpen(true)}
                  className="w-[85px] h-full bg-[#FF6900] text-white rounded-[8px] flex items-center justify-center gap-1 hover:bg-[#e65c00] transition-colors font-bold text-[11px]"
                >
                  <Plus size={14} />
                  <span>{isAr ? "من اوردر" : "From Order"}</span>
                </button>
              </div>
              <div className="w-full h-[34px] flex items-center justify-start px-2 font-bold text-[11px] text-gray-600 bg-gray-50 rounded-[8px] border border-gray-200">
                {isAr ? "المستخدم هاني كاشير" : "User Hany Cashier"}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden relative z-10">
          {validationError && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-bold shadow-md border border-red-300">
              {validationError}
            </div>
          )}
          <div className="p-3 shrink-0 flex gap-3 h-[50px] items-center border-b border-gray-300 bg-white">
             


             {/* Search by Season */}
             <div className="flex items-center h-[34px] border border-gray-300 rounded-[8px] overflow-hidden bg-white hover:border-[#FF6900] transition-colors focus-within:border-[#FF6900] shrink-0">
                <div className="bg-gray-100 px-2 h-full flex items-center justify-center font-bold text-[10px] font-[Cairo] border-l border-gray-300 shrink-0 text-gray-700">
                   {isAr ? "بحث بمنتجات الموسم فقط" : "Search by season only"}
                </div>
                <div className="w-[30px] h-full flex items-center justify-center">
                   <input 
                      type="checkbox" 
                      checked={searchBySeasonOnly}
                      onChange={e => setSearchBySeasonOnly(e.target.checked)}
                      className="w-3.5 h-3.5 cursor-pointer accent-[#FF6900]"
                   />
                </div>
             </div>

             

             {/* Search */}
             <div className="flex-1 relative h-[32px] border border-gray-300 rounded-[8px] bg-white hover:border-[#FF6900] transition-colors focus-within:border-[#FF6900]">
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                   <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input 
                   ref={searchInputRef}
                   type="text" 
                   value={searchQuery}
                   onChange={handleSearchChange}
                   onFocus={() => setIsSearchOpen(true)}
                   placeholder={isAr ? "بحث عن صنف (باركود، موديل، اسم)..." : "Search for item..."}
                   className="w-full h-full outline-none text-center font-bold text-[11px] bg-transparent pr-8"
                />
                
                <AnimatePresence>
                   {isSearchOpen && searchQuery && (
                     <motion.div 
                       initial={{ opacity: 0, y: -5 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -5 }}
                       className="absolute top-[35px] left-0 right-0 bg-white border border-gray-300 shadow-2xl max-h-[300px] overflow-y-auto z-50 rounded-b-lg"
                     >
                        <div className="flex flex-col">
                         <table className="w-full text-[11px] font-bold text-center">
                           <thead className="bg-gray-100 sticky top-0 border-b border-gray-300 shadow-sm">
                             <tr>
                               <th className="p-2 border-l border-gray-300">{isAr ? "باركود" : "Barcode"}</th>
                               <th className="p-2 border-l border-gray-300">{isAr ? "موديل" : "Model"}</th>
                               <th className="p-2 border-l border-gray-300">{isAr ? "اسم الصنف" : "Item Name"}</th>
                                                              <th className="p-2 border-l border-gray-300 w-[70px]">{isAr ? "سعر الشراء" : "Buy Price"}</th>
                               <th className="p-2 border-l border-gray-300">{isAr ? "الموسم" : "Season"}</th>
                               <th className="p-2 border-l border-gray-300">{isAr ? "اسم المورد" : "Supplier"}</th>
                             </tr>
                           </thead>
                           <tbody>
                             {filteredProducts.map((p, idx) => (
                               <tr 
                                 key={p.id} 
                                 onClick={() => handleSelectProduct(p)}
                                 className="border-b border-gray-200 hover:bg-orange-50 cursor-pointer transition-colors"
                               >
                                 <td className="p-2 border-l border-gray-200">{p.barcode || p.code}</td>
                                 <td className="p-2 border-l border-gray-200">{p.model || "-"}</td>
                                 <td className="p-2 border-l border-gray-200">{isAr ? p.nameAr || p.name : p.nameEn || p.name}</td>
                                                                  <td className="p-2 border-l border-gray-200 text-[#FF6900]">{p.costPrice || 0}</td>
                                 <td className="p-2 border-l border-gray-200">{p.season || "-"}</td>
                                 <td className="p-2 border-l border-gray-200">{p.supplierName || "-"}</td>
                               </tr>
                             ))}
                             {filteredProducts.length === 0 && (
                               <tr><td colSpan={7} className="p-3 text-gray-500">{isAr ? "لا يوجد" : "No results"}</td></tr>
                             )}
                           </tbody>
                         </table>
                         <div 
                           className="bg-[#FF6900] text-white text-center py-2 font-bold text-[12px] cursor-pointer hover:bg-[#e65c00] transition-colors sticky bottom-0 z-10"
                           onClick={() => {
                             // Will tell what happens later
                             
                           }}
                         >
                           {isAr ? "اضافه صنف جديد" : "Add new item"}
                         </div>
                       </div>
                     </motion.div>
                   )}
                </AnimatePresence>
             </div>
             
             {/* Qty */}
             <div className="w-[120px] flex items-center h-[34px] border border-gray-300 rounded-[8px] overflow-hidden bg-white hover:border-[#FF6900] focus-within:border-[#FF6900] transition-colors shrink-0">
                <div className="bg-gray-100 px-2 h-full flex items-center justify-center font-bold text-[11px] border-l border-gray-300 shrink-0 text-gray-700">
                  {isAr ? "الكميه" : "Qty"}
                </div>
                <input 
                   ref={qtyInputRef}
                   type="number" 
                   value={qtyInput} 
                   onChange={e => setQtyInput(e.target.value === "" ? "" : Number(e.target.value))}
                   onKeyDown={handleQtyKeyDown}
                   placeholder="0"
                   className="w-full h-full outline-none text-center bg-yellow-50 focus:bg-yellow-100 transition-colors text-[11px] font-bold" 
                />
             </div>
             
             
          </div>
          
          <div className="flex-1 overflow-auto bg-gray-100 p-2">
            <table className="w-full text-center text-[11px] font-bold bg-white border border-gray-300 shadow-sm rounded-lg overflow-hidden">
               <thead className="bg-[#f8f9fa] border-b border-gray-300 text-gray-700">
                  <tr>
                     <th className="p-2 border-l border-gray-300 w-[16px]">#</th>
                     <th className="p-2 border-l border-gray-300 w-[100px]">{isAr ? "باركود" : "Barcode"}</th>
                     <th className="p-2 border-l border-gray-300 w-[60px]">{isAr ? "موديل" : "Model"}</th>
                     <th className="p-2 border-l border-gray-300">{isAr ? "اسم الصنف" : "Item Name"}</th>
                                          <th className="p-2 border-l border-gray-300 w-[51px]">{isAr ? "الكمية" : "Qty"}</th>
                     <th className="p-2 border-l border-gray-300 w-[70px]">{isAr ? "سعر الشراء" : "Buy Price"}</th>
                     <th className="p-2 border-l border-gray-300 w-[60px]">{isAr ? "الخصم" : "Discount"}</th>
                     <th className="p-2 border-l border-gray-300 w-[100px]">{isAr ? "الاجمالي" : "Total"}</th>
                     <th className="p-2 border-l border-gray-300 w-[70px]">{isAr ? "الرصيد بالفرع الحالى" : "Current Branch Bal."}</th>
                     <th className="p-2 border-l border-gray-300 w-[55px]">{isAr ? "الرصيد بكل الفروع" : "All Branches Bal."}</th>
                     <th className="p-2 border-l border-gray-300 w-[90px]"></th>
                  </tr>
               </thead>
               <tbody>
                  {items.map((item, idx) => (
                     <tr key={idx} className="border-b border-gray-200 hover:bg-orange-50 transition-colors">
                        <td className="p-2 border-l border-gray-200">{idx + 1}</td>
                        <td className="p-2 border-l border-gray-200">{item.barcode}</td>
                        <td className="p-2 border-l border-gray-200">{item.model || "-"}</td>
                        <td className="p-2 border-l border-gray-200 text-right pr-2">{item.description}</td>
                                                <td className="p-2 border-l border-gray-200 text-[#FF6900]">{item.qty}</td>
                        <td className="p-2 border-l border-gray-200">{item.buyPrice}</td>
                        <td className="p-2 border-l border-gray-200">
                          {item.discountValue > 0 ? (item.discountType === '%' ? `${item.discountValue}%` : item.discountValue) : "-"}
                        </td>
                        <td className="p-2 border-l border-gray-200 text-rose-600">{item.total.toLocaleString()}</td>
                        <td className="p-2 border-l border-gray-200 text-gray-500">{item.prevSellPrice?.toLocaleString() || "-"}</td>
                        <td className="p-2 border-l border-gray-200 font-bold text-[#FF6900]">{0}</td>
                        <td className="p-1">
                           <div className="flex flex-row gap-1 items-center justify-center">
                              <button onClick={() => handleEditItem(idx)} className="p-1 text-blue-500 hover:bg-blue-50 rounded" title={isAr ? "تعديل" : "Edit"}><Edit size={14} /></button>
                              <button onClick={() => setViewingProduct((products || []).find(p => p.id === item.productId) || { ...item, costPrice: item.buyPrice, nameAr: item.description, nameEn: item.description })} className="p-1 text-emerald-500 hover:bg-emerald-50 rounded" title={isAr ? "عرض" : "View"}><Eye size={14} /></button>
                              <button onClick={() => handleRemoveItem(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded" title={isAr ? "حذف" : "Delete"}><Trash2 size={14} /></button>
                           </div>
                        </td>
                     </tr>
                  ))}
                  {items.length === 0 && (
                     <tr>
                        <td colSpan={15} className="p-8 text-gray-400 text-sm">{isAr ? "لا توجد اصناف مضافة" : "No items added"}</td>
                     </tr>
                  )}
               </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-300 p-2 shrink-0 z-20 flex justify-center">
          <div className="flex gap-4 w-full h-[75px] items-center">
            {/* Save Buttons */}
            <div className="flex flex-col justify-between h-[75px] w-[120px]">
               <button className="h-[34px] w-full bg-white border border-gray-300 rounded-[8px] font-bold text-[11px] text-gray-700 hover:bg-gray-50 flex items-center justify-center shadow-sm">{isAr ? "حفظ كمسوده" : "Save Draft"}</button>
               <button className="h-[34px] w-full bg-[#FF6900] text-white rounded-[8px] font-bold text-[11px] hover:bg-[#e65c00] flex items-center justify-center shadow-sm">{isAr ? "الحفظ" : "Save"}</button>
            </div>

            {/* Item and Total Discounts */}
            <div className="flex flex-col justify-between flex-1 max-w-[340px] border border-gray-300 rounded-[8px] overflow-hidden text-[11px] h-[70px] my-auto">
               <div className="flex items-center justify-between px-2 h-[34px] border-b border-gray-300 bg-gray-50">
                  <span className="font-bold text-gray-700">{isAr ? "خصومات على مستوى الصنف" : "Items Discount"}</span>
                  <span className="font-black text-[13px] text-rose-600">{itemsDiscountTotal.toLocaleString()}</span>
               </div>
               <div className="flex items-center justify-between px-2 h-[34px] bg-white">
                  <span className="font-bold text-gray-700">{isAr ? "خصم نسبه / مبلغ على اجمالى الفاتوره" : "Total Invoice Discount"}</span>
                  <div className="flex items-center gap-1" style={{ direction: 'ltr' }}>
                     <select 
                       value={totalDiscountType} 
                       onChange={e => setTotalDiscountType(e.target.value as "%" | "val")}
                       className="h-[28px] border border-gray-300 rounded-[4px] text-[10px] w-[45px] outline-none focus:border-[#FF6900] font-bold text-center bg-white"
                     >
                        <option value="%">%</option>
                        <option value="val">Val</option>
                     </select>
                     <input 
                       type="number"
                       value={totalDiscountValue} 
                       onChange={e => setTotalDiscountValue(e.target.value === "" ? "" : Number(e.target.value))}
                       placeholder="0"
                       className="h-[28px] border border-gray-300 rounded-[4px] text-[11px] w-[70px] outline-none focus:border-[#FF6900] font-bold text-center" 
                     />
                  </div>
               </div>
            </div>

            {/* Totals */}
            <div className="flex flex-col justify-between flex-1 max-w-[250px] border border-gray-300 rounded-[8px] overflow-hidden text-[11px] h-[70px] my-auto">
               <div className="flex items-center justify-between px-3 h-[34px] border-b border-gray-300 bg-gray-50">
                  <span className="font-bold text-gray-700">{isAr ? "اجمالى الفاتوره" : "Total Before Discounts"}</span>
                  <span className="font-black text-[13px]">{invoiceTotalBeforeDiscount.toLocaleString()}</span>
               </div>
               <div className="flex items-center justify-between px-3 h-[34px] bg-white">
                  <span className="font-bold text-gray-700">{isAr ? "اجمالى الخصومات" : "Total Discounts"}</span>
                  <span className="font-black text-[13px] text-rose-600">{totalDiscounts.toLocaleString()}</span>
               </div>
            </div>

            {/* Net Invoice */}
            <div className="h-[66px] my-auto w-[214px] bg-[#FF6900] text-white flex items-center justify-between rounded-[8px] mr-auto px-4 shadow-inner">
               <div className="text-[20px] font-black tracking-tight">{netInvoiceValue.toLocaleString()}</div>
               <div className="text-[18px] font-bold leading-[1.2] text-center whitespace-pre-wrap">{isAr ? "صافى\nالفاتوره" : "Net\nInvoice"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Item Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[12px] shadow-2xl overflow-hidden border border-gray-200"
              style={{ width: '300px' }}
            >
              <div 
                className="bg-[#FF6900] flex justify-between items-center text-white px-4"
                style={{ height: '37px' }}
              >
                <h3 className="font-bold text-[14px]">{isAr ? "تعديل الصنف" : "Edit Item"}</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors">
                  <X size={18} />
                </button>
              </div>
              
              <div 
                className="space-y-4 px-6 pb-6"
                style={{ height: '210px', paddingTop: '4px' }}
              >
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="font-bold text-[12px] text-gray-700">{isAr ? "الكمية" : "Quantity"}</label>
                    <input 
                      type="number" 
                      value={editQty} 
                      onChange={e => setEditQty(Number(e.target.value))}
                      className="w-full border-2 border-gray-300 rounded-[8px] h-[34px] outline-none focus:border-[#FF6900] font-bold text-center text-[12px]"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="font-bold text-[12px] text-gray-700">{isAr ? "سعر الشراء" : "Buy Price"}</label>
                    <input 
                      type="number" 
                      value={editBuyPrice} 
                      onChange={e => setEditBuyPrice(Number(e.target.value))}
                      className="w-full border-2 border-gray-300 rounded-[8px] h-[34px] outline-none focus:border-[#FF6900] font-bold text-center text-[12px]"
                    />
                  </div>
                </div>
                
                <div className="flex gap-4 -mt-[7px] mb-[9px]">
                  <div className="flex-1 space-y-2">
                    <label className="font-bold text-[12px] text-gray-700">{isAr ? "نوع الخصم" : "Discount Type"}</label>
                    <select 
                      value={editDiscountType} 
                      onChange={e => setEditDiscountType(e.target.value as "%" | "val")}
                      className="w-full border-2 border-gray-300 rounded-[8px] h-[34px] outline-none focus:border-[#FF6900] font-bold text-[12px]"
                    >
                      <option value="%">{isAr ? "نسبة مئوية (%)" : "Percentage (%)"}</option>
                      <option value="val">{isAr ? "مبلغ" : "Value"}</option>
                    </select>
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="font-bold text-[12px] text-gray-700">{isAr ? "قيمة الخصم" : "Discount Value"}</label>
                    <input 
                      type="number" 
                      value={editDiscountValue} 
                      onChange={e => setEditDiscountValue(Number(e.target.value))}
                      className="w-full border-2 border-gray-300 rounded-[8px] h-[34px] outline-none focus:border-[#FF6900] font-bold text-center text-rose-600 text-[12px]"
                    />
                  </div>
                </div>

              </div>
              
              <div 
                className="px-4 bg-gray-50 border-t border-gray-200 flex gap-3"
                style={{ height: '49px', paddingTop: '6px' }}
              >
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 h-[34px] bg-white border border-gray-300 text-gray-700 rounded-[8px] font-bold text-[12px] hover:bg-gray-100 transition-colors"
                >
                  {isAr ? "الغاء" : "Cancel"}
                </button>
                <button 
                  onClick={saveEditedItem}
                  className="flex-1 h-[34px] bg-[#FF6900] text-white rounded-[8px] font-bold text-[12px] hover:bg-[#e65c00] shadow-md transition-colors"
                >
                  {isAr ? "حفظ التعديل" : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOrderModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[12px] w-full max-w-3xl overflow-hidden shadow-xl flex flex-col max-h-[90vh]"
              style={{ direction: isAr ? 'rtl' : 'ltr' }}
            >
              <div className="bg-[#FF6900] px-4 flex justify-between items-center text-white h-[56px] rounded-t-[12px] shrink-0">
                <h3 className="font-bold text-[15px]">{isAr ? "اختيار رقم فاتورة المشتريات" : "Select Purchase Invoice Number"}</h3>
                <button onClick={() => setIsOrderModalOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-4 flex flex-col gap-4 flex-1 overflow-hidden">
                <div className="relative shrink-0">
                  <Search className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-3' : 'left-3'} text-gray-400`} size={18} />
                  <input 
                    type="text" 
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    placeholder={isAr ? "بحث برقم الفاتورة..." : "Search invoice number..."}
                    className={`w-full h-[40px] border border-gray-300 rounded-[8px] outline-none focus:border-[#FF6900] ${isAr ? 'pr-10 pl-3' : 'pl-10 pr-3'} text-[13px] font-bold bg-gray-50`}
                  />
                </div>
                
                <div className="border border-gray-200 rounded-[8px] overflow-auto flex-1 bg-white">
                  <table className="w-full text-sm text-right">
                    <thead className="bg-gray-50 border-b border-gray-200 text-[12px] text-gray-600 sticky top-0">
                      <tr>
                        <th className="px-3 py-2.5 font-bold">{isAr ? "رقم الفاتورة" : "Invoice No."}</th>
                        <th className="px-3 py-2.5 font-bold">{isAr ? "قيمة الفاتورة" : "Invoice Value"}</th>
                        <th className="px-3 py-2.5 font-bold">{isAr ? "المورد" : "Supplier"}</th>
                        <th className="px-3 py-2.5 font-bold">{isAr ? "تاريخ الفاتورة" : "Invoice Date"}</th>
                        <th className="px-3 py-2.5 font-bold">{isAr ? "الفرع" : "Branch"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { id: "INV-20260716-01", value: 15400, supplier: "محمد أحمد", date: "2026-07-16", branch: "الفرع الرئيسي", items: [{ productId: "PROD-1", barcode: "12345", description: "تيشيرت صيفي", qty: 10, buyPrice: 1500 }] },
                        { id: "INV-20260715-02", value: 8500, supplier: "مصنع النور", date: "2026-07-15", branch: "مخزن 1", items: [{ productId: "PROD-2", barcode: "67890", description: "بنطلون جينز", qty: 5, buyPrice: 1700 }] },
                        { id: "INV-20260714-03", value: 3200, supplier: "الشركة الدولية", date: "2026-07-14", branch: "الفرع الرئيسي", items: [{ productId: "PROD-3", barcode: "11122", description: "قميص كلاسيك", qty: 4, buyPrice: 800 }] },
                      ].filter(o => o.id.toLowerCase().includes(orderSearchQuery.toLowerCase())).map((order) => (
                        <tr 
                          key={order.id} 
                          onClick={() => {
                             // Load order logic
                             const newItems = order.items.map(item => ({
                               productId: item.productId,
                               barcode: item.barcode,
                               model: item.barcode,
                               description: item.description,
                               brand: "Brand",
                               qty: item.qty,
                               buyPrice: item.buyPrice,
                               discountType: "val",
                               discountValue: 0,
                               total: item.buyPrice * item.qty,
                               profitPercent: 40,
                               sellPrice: item.buyPrice * (1 + 40 / 100),
                               repeat: 1,
                               prevSellPrice: item.buyPrice
                             }));
                             setItems([...newItems, ...items]);
                             setIsOrderModalOpen(false);
                          }}
                          className="border-b border-gray-100 hover:bg-orange-50 cursor-pointer transition-colors"
                        >
                          <td className="px-3 py-3 font-bold text-[#FF6900]">{order.id}</td>
                          <td className="px-3 py-3 font-bold text-gray-700">{order.value} {isAr ? "ج.م" : "EGP"}</td>
                          <td className="px-3 py-3 font-bold text-gray-700">{order.supplier}</td>
                          <td className="px-3 py-3 font-bold text-gray-500">{order.date}</td>
                          <td className="px-3 py-3 font-bold text-gray-700">{order.branch}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ErrorBoundary fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-white p-6 rounded-xl"><h2 className="text-red-500 font-bold mb-4">Error loading product view</h2><button onClick={() => setViewingProduct(null)} className="px-4 py-2 bg-gray-200 rounded">Close</button></div></div>}>
        <ProductViewModal 
          product={viewingProduct} 
          lang={lang} 
          onClose={() => setViewingProduct(null)} 
        />
      </ErrorBoundary>
    </div>
  );
}
