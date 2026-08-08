import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Search, Package, Bell, Plus, Trash2, Send, Save, X, Phone, ChevronDown, Settings } from 'lucide-react';
import { PurchaseOrder } from './PurchaseOrdersTab';

interface PurchaseAlertsTabProps {
  lang: 'ar' | 'en';
  products: any[];
  purchaseOrders?: PurchaseOrder[];
  setPurchaseOrders?: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
}

export const PurchaseAlertsTab: React.FC<PurchaseAlertsTabProps> = ({ lang, products, purchaseOrders, setPurchaseOrders }) => {
  const isAr = lang === 'ar';
  const [salesPercent, setSalesPercent] = useState<string>('65');
  const [remainingBalance, setRemainingBalance] = useState<string>('2');
  
  const [filterType, setFilterType] = useState<'sales' | 'balance'>('sales');
  const [sortBySupplier, setSortBySupplier] = useState(true);
  const [isQueried, setIsQueried] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [seasonSearch, setSeasonSearch] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('current');
  const [isSeasonOpen, setIsSeasonOpen] = useState(false);

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  
  // Dummy data representing alerted items per supplier
  const [alertData, setAlertData] = useState([
    {
      supplierId: 'sup-1',
      supplierName: isAr ? 'مكتب الروان للملابس' : 'Al Rawan Clothes',
      supplierPhone: '201000000000',
      totalItems: 10,
      soldQuantity: 80,
      totalQuantity: 120,
      salesPercentage: 66,
      items: [
        { id: '1', barcode: '23252252', model: '300', desc: isAr ? 'قميص كاروه مقلم' : 'Striped Shirt', brand: isAr ? 'زارا' : 'Zara', inQty: 20, returnQty: 0, netIn: 20, netSold: 13, balance: 7, orderQty: 1 },
        { id: '2', barcode: '23252253', model: '301', desc: isAr ? 'بنطلون جينز' : 'Jeans', brand: isAr ? 'زارا' : 'Zara', inQty: 15, returnQty: 2, netIn: 13, netSold: 10, balance: 3, orderQty: 2 },
      ]
    },
    {
      supplierId: 'sup-2',
      supplierName: isAr ? 'مصنع النور' : 'Al Noor Factory',
      supplierPhone: '201111111111',
      totalItems: 5,
      soldQuantity: 40,
      totalQuantity: 50,
      salesPercentage: 80,
      items: [
        { id: '3', barcode: '88776655', model: '400', desc: isAr ? 'تيشرت قطن' : 'Cotton T-Shirt', brand: isAr ? 'بولو' : 'Polo', inQty: 30, returnQty: 0, netIn: 30, netSold: 25, balance: 5, orderQty: 5 },
      ]
    }
  ]);

  const handleQuery = () => {
    // In a real app, this would fetch or filter data based on the selected criteria
    setIsQueried(true);
    setIsDirty(false);
  };

  const handleRemoveItem = (supplierId: string, itemId: string) => {
    setAlertData(prev => prev.map(sup => {
      if (sup.supplierId === supplierId) {
        return {
          ...sup,
          items: sup.items.filter(item => item.id !== itemId)
        };
      }
      return sup;
    }));
  };

  const handleOpenOrder = (supplier: any) => {
    setSelectedSupplier(supplier);
    setOrderModalOpen(true);
  };

  const createOrder = (withWhatsapp: boolean) => {
    if (setPurchaseOrders && purchaseOrders && selectedSupplier) {
      const newOrder: PurchaseOrder = {
        id: "PO-" + Date.now(),
        code: "PO-" + Math.floor(Math.random() * 10000),
        barcode: new Date().toISOString().split('T')[0],
        name: selectedSupplier.supplierName,
        costPrice: 0, 
        sellPrice: 0,
        groupId: 'not_supplied',
        components: selectedSupplier.items.map((i: any) => ({
          productId: i.id,
          qty: i.orderQty
        }))
      };
      setPurchaseOrders([newOrder, ...purchaseOrders]);
      
      if (withWhatsapp && selectedSupplier.supplierPhone) {
        const text = isAr 
          ? `مرحبا، نود طلب طلبية جديدة:\n${selectedSupplier.items.map((i: any) => `- ${i.desc} (كمية: ${i.orderQty})`).join('\n')}`
          : `Hello, we would like to place a new order:\n${selectedSupplier.items.map((i: any) => `- ${i.desc} (Qty: ${i.orderQty})`).join('\n')}`;
        window.open(`https://wa.me/${selectedSupplier.supplierPhone}?text=${encodeURIComponent(text)}`, '_blank');
      }
      
      setOrderModalOpen(false);
      
      // Remove the supplier from alerts after creating order
      setAlertData(prev => prev.filter(sup => sup.supplierId !== selectedSupplier.supplierId));
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4" dir={isAr ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="bg-white shadow-sm border border-gray-300 rounded-[12px] h-[76px] pt-[9px] pb-[9px] px-[10px] my-0 -mx-[8px]">
        <div className="flex items-center justify-between h-full gap-4">
          <div className="space-y-0.5 overflow-hidden">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2 truncate">
              <Bell className="w-5 h-5 text-orange-500 shrink-0" />
              <span className="truncate">{isAr ? "التنبيهات لشراء المنتجات" : "Products Purchase Alerts"}</span>
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 truncate">
              {isAr ? "تنبيهات لسرعة تكرار شراء الأصناف التي تحقق أعلى معدلات للمبيعات" : "Alerts for fast re-purchasing of high-selling items"}
            </p>
          </div>

          <button
            onClick={handleQuery}
            disabled={!isDirty}
            className={cn(
              "h-[36px] pr-4 pl-2 font-black rounded-lg shadow-sm transition-colors text-xs flex items-center gap-2 w-[134px] justify-center",
              isDirty ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"
            )}
          >
            <Search size={16} />
            {isAr ? "إعادة التحميل" : "Reload"}
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mt-4 mb-4 -mx-[8px] text-[12px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="flex flex-col gap-3">
            <label className={cn("flex items-center gap-3 border rounded-lg p-2 bg-slate-50 text-[16px] h-[42px] transition-colors cursor-pointer", filterType === 'sales' ? "border-orange-500" : "border-gray-300")}>
              <input 
                type="checkbox" 
                checked={filterType === 'sales'} 
                onChange={() => { setFilterType('sales'); setIsDirty(true); }}
                className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 accent-orange-500 cursor-pointer"
              />
              <span className="font-bold text-[11px] text-slate-700 flex-1">{isAr ? "مبيعات تساوي أو أعلى من :" : "Sales >= :"}</span>
              <div className="flex items-center gap-2 bg-white border border-gray-300 rounded px-2" onClick={(e) => e.stopPropagation()}>
                <span className="text-slate-500 font-bold text-[11px]">%</span>
                <input 
                  type="number" 
                  value={salesPercent}
                  onChange={(e) => { setSalesPercent(e.target.value); setIsDirty(true); }}
                  disabled={filterType !== 'sales'}
                  className="w-16 h-8 outline-none text-left font-bold text-[14px] text-slate-700 disabled:bg-slate-100"
                />
              </div>
            </label>
            <label className={cn("flex items-center gap-2 border rounded-lg p-2 bg-slate-50 h-[42px] transition-colors cursor-pointer", sortBySupplier ? "border-orange-500" : "border-gray-300")}>
              <input 
                type="checkbox" 
                checked={sortBySupplier} 
                onChange={(e) => { setSortBySupplier(e.target.checked); setIsDirty(true); }}
                className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 accent-orange-500 cursor-pointer"
              />
              <span className="font-bold text-[11px] text-slate-700">{isAr ? "ترتيب حسب المورد" : "Sort by Supplier"}</span>
            </label>
          </div>
          
          <div className="flex flex-col gap-3">
            <label className={cn("flex items-center gap-3 border rounded-lg p-2 bg-slate-50 h-[42px] transition-colors cursor-pointer", filterType === 'balance' ? "border-orange-500" : "border-gray-300")}>
              <input 
                type="checkbox" 
                checked={filterType === 'balance'} 
                onChange={() => { setFilterType('balance'); setIsDirty(true); }}
                className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 accent-orange-500 cursor-pointer"
              />
              <span className="font-bold text-[11px] text-slate-700 flex-1">{isAr ? "الرصيد الحالي يساوي أو أقل من :" : "Current balance <= :"}</span>
              <div className="flex items-center gap-2 bg-white border border-gray-300 rounded px-2" onClick={(e) => e.stopPropagation()}>
                <span className="text-slate-500 font-bold text-[11px]">{isAr ? "قطعة" : "Pcs"}</span>
                <input 
                  type="number" 
                  value={remainingBalance}
                  onChange={(e) => { setRemainingBalance(e.target.value); setIsDirty(true); }}
                  disabled={filterType !== 'balance'}
                  className="w-16 h-8 outline-none text-left font-bold text-[14px] text-slate-700 disabled:bg-slate-100"
                />
              </div>
            </label>
            
            <div className="relative border border-gray-300 rounded-lg bg-slate-50 h-[42px] flex items-center">
              <button
                type="button"
                onClick={() => setIsSeasonOpen(!isSeasonOpen)}
                className="w-full h-full px-3 flex items-center justify-between text-[13px] font-bold text-slate-700 outline-none"
              >
                <span>
                  {selectedSeason === 'current' && (isAr ? "الموسم الحالي" : "Current Season")}
                  {selectedSeason === 'summer' && (isAr ? "صيفي" : "Summer")}
                  {selectedSeason === 'winter' && (isAr ? "شتوي" : "Winter")}
                  {selectedSeason === 'autumn' && (isAr ? "خريفي" : "Autumn")}
                  {selectedSeason === 'spring' && (isAr ? "ربيعي" : "Spring")}
                </span>
                <ChevronDown size={16} className={cn("text-slate-500 transition-transform", isSeasonOpen ? "rotate-180" : "")} />
              </button>

              <AnimatePresence>
                {isSeasonOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50"
                  >
                    <div className="p-2 border-b border-gray-100">
                      <div className="relative">
                        <input
                          type="text"
                          value={seasonSearch}
                          onChange={(e) => setSeasonSearch(e.target.value)}
                          placeholder={isAr ? "بحث عن موسم..." : "Search season..."}
                          className="w-full text-[12px] p-2 pl-8 pr-2 rtl:pr-8 rtl:pl-2 bg-slate-50 border border-gray-200 rounded-md outline-none focus:border-orange-400 focus:bg-white transition-colors"
                        />
                        <Search size={14} className="absolute left-2.5 rtl:right-2.5 rtl:left-auto top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {[
                        { value: 'current', label: isAr ? 'الموسم الحالي' : 'Current Season' },
                        { value: 'summer', label: isAr ? 'صيفي' : 'Summer' },
                        { value: 'winter', label: isAr ? 'شتوي' : 'Winter' },
                        { value: 'autumn', label: isAr ? 'خريفي' : 'Autumn' },
                        { value: 'spring', label: isAr ? 'ربيعي' : 'Spring' },
                      ].filter(opt => opt.label.toLowerCase().includes(seasonSearch.toLowerCase()))
                        .map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setSelectedSeason(opt.value);
                            setIsDirty(true);
                            setIsSeasonOpen(false);
                            setSeasonSearch('');
                          }}
                          className={cn(
                            "w-full text-start px-3 py-2 text-[12px] transition-colors",
                            selectedSeason === opt.value ? "bg-orange-50 text-orange-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                      {[
                        { value: 'current', label: isAr ? 'الموسم الحالي' : 'Current Season' },
                        { value: 'summer', label: isAr ? 'صيفي' : 'Summer' },
                        { value: 'winter', label: isAr ? 'شتوي' : 'Winter' },
                        { value: 'autumn', label: isAr ? 'خريفي' : 'Autumn' },
                        { value: 'spring', label: isAr ? 'ربيعي' : 'Spring' },
                      ].filter(opt => opt.label.toLowerCase().includes(seasonSearch.toLowerCase())).length === 0 && (
                        <div className="px-3 py-4 text-center text-[12px] text-slate-500">
                          {isAr ? "لا توجد نتائج" : "No results found"}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-20">
        {isQueried && alertData.map((supplier) => (
          <div key={supplier.supplierId} className="bg-white rounded-xl border-2 border-orange-200 overflow-hidden shadow-sm mb-4">
            {/* Supplier Header */}
            <div className="bg-slate-50 p-3 sm:px-4 sm:pt-[6px] sm:h-[46px] border-b border-orange-200 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-stretch sm:items-center justify-between text-[11px]">
              <h3 className="text-[14px] sm:text-[12px] font-black text-slate-800 leading-[18.5px] sm:h-[34px] sm:w-[114px] sm:-mr-[13px] text-center sm:text-right flex items-center justify-center sm:justify-start w-full sm:w-auto">{supplier.supplierName}</h3>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 text-[11px] font-bold w-full sm:w-auto">
                <div className="bg-white px-4 py-2 sm:py-1 border border-gray-300 rounded-lg text-slate-700 sm:h-[34px] sm:pt-[7px] sm:pb-0 w-full sm:w-auto text-center">
                  {isAr ? "عدد الأصناف" : "Items Count"}: <span className="text-orange-600 ml-1">{supplier.totalItems}</span>
                </div>
                <div className="bg-white px-4 py-2 sm:py-1 border border-gray-300 rounded-lg text-slate-700 sm:h-[34px] sm:pt-[7px] sm:pb-0 sm:-mr-[2px] sm:-ml-[11px] w-full sm:w-auto text-center">
                  {isAr ? "مبيعاتهم" : "Sales"}: <span className="text-orange-600 ml-1">{isAr ? `عدد ${supplier.soldQuantity} من أصل ${supplier.totalQuantity}` : `${supplier.soldQuantity} out of ${supplier.totalQuantity}`}</span>
                </div>
                <div className="bg-white px-4 py-2 sm:py-1 border border-gray-300 rounded-lg text-slate-700 sm:h-[34px] sm:pt-[7px] sm:pb-0 sm:-ml-[10px] sm:-mr-[1px] w-full sm:w-auto text-center">
                  {isAr ? "نسبة مبيعاتهم" : "Sales Ratio"}: <span className="text-orange-600 ml-1">{supplier.salesPercentage}%</span>
                </div>
                
                <button 
                  onClick={() => handleOpenOrder(supplier)}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 sm:py-1 rounded-lg font-black transition-colors text-[14px] sm:text-[12px] sm:h-[34px] sm:-ml-[9px] w-full sm:w-auto mt-2 sm:mt-0"
                >
                  {isAr ? "اصنع أمر شراء" : "Create Order"}
                </button>
              </div>
            </div>

            {/* Supplier Items - Desktop Table & Mobile Cards */}
            <div className="w-full">
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left rtl:text-right border-collapse text-xs font-bold text-slate-700">
                  <thead className="sticky top-0 z-30 bg-orange-500 text-white select-none">
                    <tr className="bg-orange-500 text-white font-extrabold border-b border-white/30">
                      <th className="p-1.5 text-center w-auto whitespace-nowrap">{isAr ? "باركود" : "Barcode"}</th>
                      <th className="p-1.5 text-center w-auto whitespace-nowrap">{isAr ? "موديل" : "Model"}</th>
                      <th className="p-1.5 text-center w-auto min-w-[120px] whitespace-normal break-words">{isAr ? "اسم الصنف" : "Item Name"}</th>
                      <th className="p-1.5 text-center w-auto whitespace-nowrap">{isAr ? "وارد" : "In"}</th>
                      <th className="p-1.5 text-center w-auto whitespace-nowrap">{isAr ? "مرتد" : "Return"}</th>
                      <th className="p-1.5 text-center w-auto whitespace-nowrap">{isAr ? "صافي مباع" : "Net Sold"}</th>
                      <th className="p-1.5 text-center w-auto whitespace-nowrap">{isAr ? "رصيد بكل الفروع" : "Total Balance"}</th>
                      <th className="p-1.5 text-center w-auto whitespace-nowrap">{isAr ? "اوردر" : "Order"}</th>
                      <th className="p-1.5 text-center w-auto whitespace-nowrap"><Settings className="w-4 h-4 mx-auto text-white" /></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300 text-[#040466]">
                    {supplier.items.map((item: any, idx: number) => (
                      <tr key={item.id} className={cn("transition-colors hover:bg-orange-50/70 border-b border-gray-200", idx % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                        <td className="p-1.5 whitespace-nowrap text-center font-black">{item.barcode}</td>
                        <td className="p-1.5 whitespace-nowrap text-center">{item.model}</td>
                        <td className="p-1.5 text-right text-[#040466] whitespace-normal break-words min-w-[120px]">
                          {item.brand} {item.desc}
                        </td>
                        <td className="p-1.5 text-center whitespace-nowrap">{item.inQty}</td>
                        <td className="p-1.5 text-center whitespace-nowrap">{item.returnQty > 0 ? item.returnQty : ''}</td>
                        <td className="p-1.5 text-center whitespace-nowrap font-black text-orange-600">{item.netSold}</td>
                        <td className="p-1.5 text-center whitespace-nowrap font-black">{item.balance}</td>
                        <td className="p-1.5 text-center whitespace-nowrap">
                          <input 
                            type="number" 
                            value={item.orderQty}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setAlertData(prev => prev.map(s => s.supplierId === supplier.supplierId ? {
                                ...s,
                                items: s.items.map(i => i.id === item.id ? { ...i, orderQty: val } : i)
                              } : s));
                            }}
                            className="w-full max-w-[64px] h-8 text-center border border-gray-300 rounded focus:border-orange-500 outline-none font-bold text-slate-700 bg-white"
                          />
                        </td>
                        <td className="p-1.5 text-center whitespace-nowrap">
                          <button 
                            onClick={() => handleRemoveItem(supplier.supplierId, item.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors mx-auto"
                            title={isAr ? "إزالة من التنبيهات" : "Remove from alerts"}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {supplier.items.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-6 text-slate-400 text-center font-bold">
                          {isAr ? "لا توجد أصناف" : "No items"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden flex flex-col gap-3 p-3 bg-slate-50">
                {supplier.items.map((item: any) => (
                  <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex flex-col gap-3 relative">
                    <button 
                      onClick={() => handleRemoveItem(supplier.supplierId, item.id)}
                      className="absolute top-3 left-3 rtl:right-auto rtl:left-3 ltr:right-3 ltr:left-auto p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      title={isAr ? "إزالة من التنبيهات" : "Remove from alerts"}
                    >
                      <Trash2 size={16} />
                    </button>
                    
                    <div className="flex flex-col pr-8 rtl:pr-0 rtl:pl-8">
                      <span className="text-xs text-slate-500 mb-1 font-bold" dir="ltr">{item.barcode} • {item.model}</span>
                      <h4 className="text-[13px] font-bold text-slate-800 leading-tight">{item.brand} {item.desc}</h4>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 text-center text-xs bg-slate-50 p-2 rounded-lg border border-gray-100">
                      <div className="flex flex-col">
                        <span className="text-slate-500 mb-0.5">{isAr ? "وارد" : "In"}</span>
                        <span className="font-bold text-slate-700">{item.inQty}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-500 mb-0.5">{isAr ? "مرتد" : "Return"}</span>
                        <span className="font-bold text-slate-700">{item.returnQty > 0 ? item.returnQty : '-'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-500 mb-0.5">{isAr ? "مباع" : "Sold"}</span>
                        <span className="font-black text-orange-600">{item.netSold}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-500 mb-0.5">{isAr ? "رصيد" : "Bal"}</span>
                        <span className="font-black text-slate-700">{item.balance}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-1">
                      <span className="font-bold text-slate-700 text-[13px]">{isAr ? "تكرار (اوردر)" : "Order Qty"}</span>
                      <input 
                        type="number" 
                        value={item.orderQty}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setAlertData(prev => prev.map(s => s.supplierId === supplier.supplierId ? {
                            ...s,
                            items: s.items.map(i => i.id === item.id ? { ...i, orderQty: val } : i)
                          } : s));
                        }}
                        className="w-20 h-9 text-center border border-gray-300 rounded focus:border-orange-500 outline-none font-bold text-slate-700 bg-white"
                      />
                    </div>
                  </div>
                ))}
                {supplier.items.length === 0 && (
                  <div className="p-6 text-slate-400 text-center font-bold bg-white border border-gray-200 rounded-xl">
                    {isAr ? "لا توجد أصناف" : "No items"}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isQueried && alertData.length === 0 && (
          <div className="text-center p-12 bg-white rounded-xl border border-gray-200">
            <Package size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-lg font-bold text-slate-500">{isAr ? "لا توجد تنبيهات تطابق المعايير المحددة" : "No alerts matching the selected criteria"}</p>
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      <AnimatePresence>
        {orderModalOpen && selectedSupplier && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setOrderModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-orange-500 p-4 flex items-center justify-between text-white">
                <h3 className="text-lg font-black flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  {isAr ? "إنشاء أمر شراء" : "Create Purchase Order"}
                </h3>
                <button 
                  onClick={() => setOrderModalOpen(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="text-center">
                  <p className="text-slate-500 text-sm font-bold mb-1">{isAr ? "المورد" : "Supplier"}</p>
                  <p className="text-xl font-black text-slate-800">{selectedSupplier.supplierName}</p>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-gray-200">
                  <p className="text-center font-bold text-slate-700 mb-2">
                    {isAr ? `سيتم إنشاء أمر شراء لعدد ${selectedSupplier.items.length} صنف` : `Order will be created for ${selectedSupplier.items.length} items`}
                  </p>
                </div>
                
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => createOrder(false)}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <Save size={18} />
                    {isAr ? "حفظ فقط" : "Save Only"}
                  </button>
                  <button
                    onClick={() => createOrder(true)}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <Phone size={18} />
                    {isAr ? "حفظ وإرسال على واتساب" : "Save & Send via WhatsApp"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
