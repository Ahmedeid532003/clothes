/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, 
  Search, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  X, 
  Check, 
  ArrowUpRight, 
  TrendingDown, 
  PlusCircle, 
  RefreshCw,
  Info
} from 'lucide-react';
import { Product, InventoryAudit, InventoryBalance, Warehouse, Season, Size, Color } from '../types';

interface InventoryAuditProps {
  products: Product[];
  audits: InventoryAudit[];
  balances: InventoryBalance[];
  warehouses: Warehouse[];
  seasons: Season[];
  sizes: Size[];
  colors: Color[];
  
  onAddAudit: (audit: InventoryAudit) => void | Promise<void>;
}

export default function InventoryAuditComponent({
  products,
  audits,
  balances,
  warehouses,
  seasons,
  sizes,
  colors,
  onAddAudit,
}: InventoryAuditProps) {
  
  // State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAuditDetails, setSelectedAuditDetails] = useState<InventoryAudit | null>(null);
  const [auditError, setAuditError] = useState('');
  const [auditSaving, setAuditSaving] = useState(false);

  // New Audit fields
  const [newAudit, setNewAudit] = useState({
    code: '',
    warehouseCode: '',
    seasonCode: '',
    scope: 'جرد ربع سنوي لكافة بضائع المعرض',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Items currently being audited inside the modal
  const [auditItems, setAuditItems] = useState<Array<{
    productCode: string;
    sizeCode: string;
    colorCode: string;
    variantId?: string;
    bookQty: number;
    actualQty: number;
  }>>([]);

  const openAddModal = () => {
    setAuditError('');
    const targetWh = warehouses[0]?.code || '';
    const targetSeason = seasons.find(s => s.isCurrent)?.code || seasons[0]?.code || '';

    setNewAudit({
      code: `AUD-${Date.now().toString().slice(-4)}`,
      warehouseCode: targetWh,
      seasonCode: targetSeason,
      scope: 'جرد ربع سنوي لكافة بضائع المعرض',
      notes: '',
      date: new Date().toISOString().split('T')[0]
    });

    // Automatically load all existing book stock for this warehouse as draft audit items!
    // This is extremely convenient and luxurious for the user! Instead of typing everything,
    // we pre-populate the audit list with current book quantities, allowing the user to simply adjust actual quantities!
    const matchingBalances = balances.filter(b => b.warehouseCode === targetWh);
    const preLoadedItems = matchingBalances.map(b => ({
      productCode: b.productCode,
      sizeCode: b.sizeCode,
      colorCode: b.colorCode,
      variantId: b.variantId,
      bookQty: b.quantity,
      actualQty: b.quantity // default same as book, user can edit
    }));

    setAuditItems(preLoadedItems);
    setIsAddModalOpen(true);
  };

  // When warehouse changes during creation, reload matching book stock
  const handleWarehouseChange = (whCode: string) => {
    setNewAudit(prev => ({ ...prev, warehouseCode: whCode }));
    const matchingBalances = balances.filter(b => b.warehouseCode === whCode);
    const preLoadedItems = matchingBalances.map(b => ({
      productCode: b.productCode,
      sizeCode: b.sizeCode,
      colorCode: b.colorCode,
      variantId: b.variantId,
      bookQty: b.quantity,
      actualQty: b.quantity
    }));
    setAuditItems(preLoadedItems);
  };

  // Adjust actual quantity of an item in the audit form
  const handleActualQtyChange = (idx: number, val: number) => {
    const updated = [...auditItems];
    updated[idx].actualQty = val >= 0 ? val : 0;
    setAuditItems(updated);
  };

  // Settle and save audit
  const handleSubmitAudit = async () => {
    if (auditItems.length === 0) {
      setAuditError('لا توجد بضائع في عهدة هذا المستودع لجدولتها وجردها حالياً.');
      return;
    }

    const finalAudit: InventoryAudit = {
      code: newAudit.code,
      warehouseCode: newAudit.warehouseCode,
      seasonCode: newAudit.seasonCode,
      date: newAudit.date,
      status: 'completed',
      scope: newAudit.scope,
      notes: newAudit.notes,
      items: auditItems,
    };

    setAuditSaving(true);
    setAuditError('');
    try {
      await onAddAudit(finalAudit);
      setIsAddModalOpen(false);
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : 'تعذر حفظ محضر الجرد');
    } finally {
      setAuditSaving(false);
    }
  };

  return (
    <div dir="rtl" className="space-y-6">
      
      {/* Title */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-blue-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="text-blue-600" />
            جرد البضائع وتصحيح الفروقات (Inventory Take & Settlement Audit)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            إجراء محاضر جرد فعلية للبضائع ومطابقتها مع الأرصدة الدفترية، وإجراء تسويات العجز والزيادة تلقائياً.
          </p>
        </div>
        <button 
          onClick={openAddModal}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/10"
        >
          <PlusCircle size={16} />
          بدء محضر جرد وتسوية جديد
        </button>
      </div>

      {/* Audits Log Timeline */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center text-xs">
          <span className="font-bold text-gray-700">محاضر التسويات والجرد المسجلة ({audits.length})</span>
          <span className="text-gray-400">سجل الرقابة المالية ومطابقة المخزون</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold">
                <th className="p-4">رقم محضر الجرد</th>
                <th className="p-4">المستودع المجلي</th>
                <th className="p-4">نطاق وموضوع الجرد</th>
                <th className="p-4">تاريخ المحضر</th>
                <th className="p-4 text-center">حالة التسوية</th>
                <th className="p-4">الأصناف المشمولة</th>
                <th className="p-4">محصلة الفروقات</th>
                <th className="p-4 text-center">المعاينة</th>
              </tr>
            </thead>
            <tbody>
              {audits.map(audit => {
                const whObj = warehouses.find(w => w.code === audit.warehouseCode);
                
                // Calculate differences (total surplus/deficit count)
                let totalDiff = 0;
                audit.items.forEach(i => {
                  totalDiff += (i.actualQty - i.bookQty);
                });

                return (
                  <tr key={audit.code} className="border-b border-gray-50 hover:bg-blue-50/5 transition-all">
                    <td className="p-4 font-mono font-bold text-gray-700">
                      {audit.code}
                    </td>
                    <td className="p-4 font-bold text-gray-600">
                      {whObj ? whObj.name : audit.warehouseCode}
                    </td>
                    <td className="p-4 text-gray-800 font-semibold">
                      {audit.scope}
                    </td>
                    <td className="p-4 text-gray-400 font-mono">
                      {audit.date}
                    </td>
                    <td className="p-4 text-center">
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                        ✓ مكتمل ومسوّى مالياً
                      </span>
                    </td>
                    <td className="p-4">
                      {audit.items.length} مجموعات فرعية
                    </td>
                    <td className="p-4 font-bold font-mono">
                      {totalDiff === 0 && <span className="text-gray-500">طبيعي (متطابق)</span>}
                      {totalDiff > 0 && <span className="text-emerald-600">+{totalDiff} زيادة</span>}
                      {totalDiff < 0 && <span className="text-red-500">{totalDiff} عجز في القطع</span>}
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => setSelectedAuditDetails(audit)}
                        className="text-xs text-blue-600 hover:underline hover:text-blue-800 font-bold"
                      >
                        معاينة محضر الجرد
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Create Audit & Settlement */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-blue-900 text-white shrink-0">
                <div>
                  <h4 className="text-sm font-bold flex items-center gap-1.5">
                    <FileSpreadsheet size={16} />
                    فتح وبدء محضر جرد فعلي وتصحيح فوري للفروق
                  </h4>
                  <p className="text-[10px] text-blue-200 mt-0.5">مطابقة كميات البضاعة الفعلية مع الأرقام المسجلة بالبرنامج</p>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
                {auditError && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 border border-red-100 font-semibold">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{auditError}</span>
                  </div>
                )}

                {/* Logistics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">المخزن المراد جرده وتسويته *</label>
                    <select 
                      value={newAudit.warehouseCode}
                      onChange={(e) => handleWarehouseChange(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    >
                      {warehouses.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">نطاق ومجال الجرد (Scope)</label>
                    <input 
                      type="text" 
                      value={newAudit.scope}
                      onChange={(e) => setNewAudit({ ...newAudit, scope: e.target.value })}
                      placeholder="مثال: جرد ملابس حريمي رئيسي"
                      className="w-full p-2.5 border border-gray-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">رقم محضر الجرد</label>
                    <input 
                      type="text" 
                      value={newAudit.code}
                      onChange={(e) => setNewAudit({ ...newAudit, code: e.target.value })}
                      className="w-full p-2.5 border border-gray-200 rounded-xl font-mono text-center font-bold bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">تاريخ الجرد</label>
                    <input 
                      type="date" 
                      value={newAudit.date}
                      onChange={(e) => setNewAudit({ ...newAudit, date: e.target.value })}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-center"
                    />
                  </div>
                </div>

                {/* Audit Items entry spreadsheet */}
                <div className="space-y-2">
                  <span className="font-bold text-gray-700 block">قم بإدخال "الرصيد الفعلي" في المربعات بالأسفل:</span>
                  <p className="text-[10px] text-gray-400">تم تلقائياً سحب وإدراج بضائع المستودع للتسهيل عليك.</p>

                  <div className="border border-gray-150 rounded-xl overflow-hidden bg-white">
                    <div className="max-h-[250px] overflow-y-auto">
                      <table className="w-full text-right border-collapse text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold">
                            <th className="p-3">اسم الصنف والتوليفة</th>
                            <th className="p-3 text-center">الرصيد الدفتري الحالي</th>
                            <th className="p-3 text-center">الرصيد الفعلي المجرود</th>
                            <th className="p-3">الفارق (عجز/زيادة)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditItems.map((item, idx) => {
                            const targetP = products.find(p => p.code === item.productCode);
                            const sObj = sizes.find(s => s.code === item.sizeCode);
                            const cObj = colors.find(c => c.code === item.colorCode);
                            
                            const diff = item.actualQty - item.bookQty;

                            return (
                              <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                                <td className="p-3">
                                  <span className="font-bold text-gray-800">{targetP?.name || item.productCode}</span>
                                  <div className="flex gap-1.5 text-[10px] text-gray-400 mt-0.5">
                                    <span>مقاس: {sObj ? sObj.name : item.sizeCode}</span>
                                    <span>•</span>
                                    <span>اللون: {cObj ? cObj.name : item.colorCode}</span>
                                  </div>
                                </td>

                                <td className="p-3 font-mono text-center font-bold text-gray-600">
                                  {item.bookQty} قطعة
                                </td>

                                <td className="p-3 text-center">
                                  <input 
                                    type="number" 
                                    min="0" 
                                    value={item.actualQty} 
                                    onChange={(e) => handleActualQtyChange(idx, parseInt(e.target.value) || 0)}
                                    className="w-20 p-1 border border-blue-200 rounded-lg text-center font-bold focus:border-blue-500 focus:outline-none bg-blue-50/30"
                                  />
                                </td>

                                <td className="p-3 font-mono font-bold">
                                  {diff === 0 && <span className="text-gray-400">متطابق</span>}
                                  {diff > 0 && <span className="text-emerald-600">+{diff} زيادة</span>}
                                  {diff < 0 && <span className="text-red-500">{diff} عجز</span>}
                                </td>
                              </tr>
                            );
                          })}
                          {auditItems.length === 0 && (
                            <tr>
                              <td colSpan={4} className="p-8 text-center text-gray-400">
                                لا توجد بضائع في عهدة المستودع المختار لبدء الجرد حالياً. يرجى إضافة أرصدة مخازن أولاً!
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-gray-700 font-bold mb-1">ملاحظات وقرار محضر لجنة الجرد</label>
                  <textarea 
                    value={newAudit.notes}
                    onChange={(e) => setNewAudit({ ...newAudit, notes: e.target.value })}
                    placeholder="اكتب أسباب العجز كالتلف أو عجز شحن..."
                    rows={1.5}
                    className="w-full p-2.5 border border-gray-200 rounded-xl"
                  />
                </div>

              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2 shrink-0">
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-100 transition-all"
                >
                  إلغاء
                </button>
                <button 
                  onClick={() => void handleSubmitAudit()}
                  disabled={auditItems.length === 0 || auditSaving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Check size={14} />
                  {auditSaving ? 'جاري الحفظ...' : 'تسوية الجرد وتعديل المخازن فورياً'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Audit Detail Viewer */}
      <AnimatePresence>
        {selectedAuditDetails && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-blue-950 text-white">
                <div>
                  <h4 className="text-sm font-bold flex items-center gap-1.5">
                    <span>📃</span>
                    تفاصيل محضر الجرد وتصحيح المخازن
                  </h4>
                  <p className="text-[10px] text-blue-200 mt-0.5">مراجعة تقرير الفروقات وتوقيعات لجنة الجرد</p>
                </div>
                <button 
                  onClick={() => setSelectedAuditDetails(null)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 text-xs">
                
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-1">
                  <p className="font-bold text-gray-800">محضر رقم: {selectedAuditDetails.code}</p>
                  <p className="text-gray-600 font-medium"><span className="font-bold text-gray-400">النطاق:</span> {selectedAuditDetails.scope}</p>
                  <p className="text-gray-400 text-[10px]">تاريخ الجرد: {selectedAuditDetails.date}</p>
                  {selectedAuditDetails.notes && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-100 mt-1">
                      <span className="font-bold">ملاحظات:</span> {selectedAuditDetails.notes}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <span className="font-bold text-gray-700 block mb-1">الكميات المجرودة والفروقات المسواة:</span>
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                    {selectedAuditDetails.items.map((item, idx) => {
                      const targetP = products.find(p => p.code === item.productCode);
                      const sObj = sizes.find(s => s.code === item.sizeCode);
                      const cObj = colors.find(c => c.code === item.colorCode);
                      
                      const diff = item.actualQty - item.bookQty;

                      return (
                        <div key={idx} className="p-2.5 bg-white border border-gray-100 rounded-lg flex justify-between items-center">
                          <div>
                            <span className="font-bold text-gray-800">{targetP?.name || item.productCode}</span>
                            <div className="flex gap-2 text-[10px] text-gray-400 mt-0.5">
                              <span>مقاس: {sObj ? sObj.name : item.sizeCode}</span>
                              <span>•</span>
                              <span>اللون: {cObj ? cObj.name : item.colorCode}</span>
                            </div>
                          </div>
                          
                          <div className="text-left font-mono">
                            <span className="text-[10px] text-gray-400 block">الرصيد: دفتري {item.bookQty} / فعلي {item.actualQty}</span>
                            <span className={`text-[11px] font-bold ${diff === 0 ? 'text-gray-400' : diff > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {diff === 0 ? 'متطابق' : diff > 0 ? `+${diff} زيادة` : `${diff} عجز`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={() => setSelectedAuditDetails(null)}
                  className="px-4 py-1.5 bg-blue-900 text-white text-xs font-bold rounded-xl hover:bg-blue-950 transition-all"
                >
                  إغلاق المحضر
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
