/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRightLeft, 
  Search, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  PlusCircle, 
  X,
  Info,
  Calendar,
  Check
} from 'lucide-react';
import { Product, MovementPermit, InventoryBalance, Warehouse, Size, Color } from '../types';

const DISBURSEMENT_PURPOSES = [
  { key: 'sale', label: 'بيع' },
  { key: 'sample', label: 'عينة' },
  { key: 'internal_use', label: 'استخدام داخلي' },
  { key: 'other', label: 'أخرى' },
] as const;

const SCRAP_REASONS = [
  { key: 'damage', label: 'تلف' },
  { key: 'expired', label: 'انتهاء صلاحية' },
  { key: 'other', label: 'أخرى' },
] as const;

const ADDITION_PURPOSES = [
  { key: 'supplier_purchase', label: 'شراء من المورد' },
  { key: 'customer_return', label: 'مرتجع من العميل' },
  { key: 'other', label: 'أخرى' },
] as const;

type SkuPick = {
  key: string;
  productCode: string;
  sizeCode: string;
  colorCode: string;
  variantId?: string;
  label: string;
  stock: number | null;
};

function skuRowKey(productCode: string, sizeCode: string, colorCode: string) {
  return `${productCode}|${sizeCode}|${colorCode}`;
}

interface MovementPermitsProps {
  products: Product[];
  permits: MovementPermit[];
  balances: InventoryBalance[];
  warehouses: Warehouse[];
  sizes: Size[];
  colors: Color[];
  /** فلتر القائمة عند فتح الصفحة */
  initialFilterType?: 'all' | 'transfer' | 'disbursement' | 'addition' | 'scrap';
  /** نوع الإذن الافتراضي في نموذج الإنشاء */
  defaultPermitType?: 'transfer' | 'disbursement' | 'addition' | 'scrap';

  onAddPermit: (permit: MovementPermit) => void | Promise<void>;
  onApprovePermit?: (permit: MovementPermit) => void | Promise<void>;
}

export default function MovementPermits({
  products,
  permits,
  balances,
  warehouses,
  sizes,
  colors,
  initialFilterType = 'all',
  defaultPermitType = 'transfer',
  onAddPermit,
  onApprovePermit,
}: MovementPermitsProps) {
  
  // State variables
  const [filterType, setFilterType] = useState<'all' | 'transfer' | 'disbursement' | 'addition' | 'scrap'>(
    initialFilterType,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPermitDetails, setSelectedPermitDetails] = useState<MovementPermit | null>(null);

  // Form states for creating a new permit
  const [permitError, setPermitError] = useState('');
  const [permitSaving, setPermitSaving] = useState(false);
  const [approvingCode, setApprovingCode] = useState<string | null>(null);

  const [newPermit, setNewPermit] = useState({
    code: '',
    type: 'transfer' as 'transfer' | 'disbursement' | 'addition' | 'scrap',
    fromWarehouseCode: '',
    toWarehouseCode: '',
    purposeKey: 'sale',
    scrapReason: 'damage',
    notes: '',
    date: new Date().toISOString().split('T')[0],
    requiresManagerApproval: false,
  });

  const [draftItems, setDraftItems] = useState<
    Array<{
      productCode: string;
      sizeCode: string;
      colorCode: string;
      quantity: number;
      variantId?: string;
    }>
  >([]);

  const [selectedSkuKey, setSelectedSkuKey] = useState('');
  const [itemQty, setItemQty] = useState(1);

  const openAddModal = () => {
    setPermitError('');
    const defaultFrom = warehouses[0]?.code || '';
    const defaultTo = warehouses[1]?.code || warehouses[0]?.code || '';
    const type = defaultPermitType;
    setNewPermit({
      code: `PER-${Math.floor(10000 + Math.random() * 90000)}`,
      type,
      fromWarehouseCode: defaultFrom,
      toWarehouseCode: defaultTo,
      purposeKey:
        type === 'disbursement' ? 'sale' : type === 'addition' ? 'supplier_purchase' : 'sale',
      scrapReason: 'damage',
      notes: '',
      date: new Date().toISOString().split('T')[0],
      requiresManagerApproval: false,
    });
    setDraftItems([]);
    setItemQty(1);
    setSelectedSkuKey('');
    setIsAddModalOpen(true);
  };

  const clothingSkuOptions = useMemo((): SkuPick[] => {
    const outflow = ['transfer', 'disbursement', 'scrap'].includes(newPermit.type);
    if (outflow) {
      const wh = newPermit.fromWarehouseCode;
      if (!wh) return [];
      return balances
        .filter((b) => b.warehouseCode === wh && b.quantity > 0)
        .map((b) => {
          const pname = products.find((p) => p.code === b.productCode)?.name || b.productCode;
          const sizeLabel = sizes.find((s) => s.code === b.sizeCode)?.name || b.sizeCode;
          const colorLabel = colors.find((c) => c.code === b.colorCode)?.name || b.colorCode;
          return {
            key: skuRowKey(b.productCode, b.sizeCode, b.colorCode),
            productCode: b.productCode,
            sizeCode: b.sizeCode,
            colorCode: b.colorCode,
            variantId: b.variantId,
            label: `${pname} — ${sizeLabel} / ${colorLabel} (متاح: ${b.quantity})`,
            stock: b.quantity,
          };
        });
    }
    const opts: SkuPick[] = [];
    for (const p of products) {
      if (p.isComposite || !p.variants.length) continue;
      for (const v of p.variants) {
        const sizeLabel = sizes.find((s) => s.code === v.sizeCode)?.name || v.sizeCode;
        const colorLabel = colors.find((c) => c.code === v.colorCode)?.name || v.colorCode;
        opts.push({
          key: skuRowKey(p.code, v.sizeCode, v.colorCode),
          productCode: p.code,
          sizeCode: v.sizeCode,
          colorCode: v.colorCode,
          label: `${p.name} — ${sizeLabel} / ${colorLabel}`,
          stock: null,
        });
      }
    }
    return opts;
  }, [
    newPermit.type,
    newPermit.fromWarehouseCode,
    balances,
    products,
    sizes,
    colors,
  ]);

  const selectedSku = useMemo(
    () => clothingSkuOptions.find((o) => o.key === selectedSkuKey) ?? clothingSkuOptions[0] ?? null,
    [clothingSkuOptions, selectedSkuKey],
  );

  useEffect(() => {
    if (!isAddModalOpen) return;
    if (clothingSkuOptions.length === 0) {
      setSelectedSkuKey('');
      return;
    }
    const stillValid = clothingSkuOptions.some((o) => o.key === selectedSkuKey);
    if (!stillValid) setSelectedSkuKey(clothingSkuOptions[0].key);
  }, [isAddModalOpen, clothingSkuOptions, selectedSkuKey]);

  const purposeLabel = (type: typeof newPermit.type, key: string) => {
    if (type === 'disbursement') {
      return DISBURSEMENT_PURPOSES.find((p) => p.key === key)?.label || key;
    }
    if (type === 'addition') {
      return ADDITION_PURPOSES.find((p) => p.key === key)?.label || key;
    }
    return '';
  };

  const handlePermitTypeChange = (type: typeof newPermit.type) => {
    setNewPermit({
      ...newPermit,
      type,
      purposeKey:
        type === 'disbursement' ? 'sale' : type === 'addition' ? 'supplier_purchase' : 'sale',
      requiresManagerApproval: type === 'transfer' ? newPermit.requiresManagerApproval : false,
    });
  };

  const handleAddDraftItem = () => {
    if (!selectedSku || itemQty <= 0) {
      setPermitError('اختر قطعة ملابس والكمية.');
      return;
    }

    if (
      selectedSku.stock !== null &&
      itemQty > selectedSku.stock
    ) {
      setPermitError(`الكمية (${itemQty}) أكبر من المتاح (${selectedSku.stock}).`);
      return;
    }

    const isDuplicate = draftItems.some((item) => skuRowKey(item.productCode, item.sizeCode, item.colorCode) === selectedSku.key);
    if (isDuplicate) {
      setPermitError('هذه القطعة مضافة مسبقاً في الإذن.');
      return;
    }

    setDraftItems([
      ...draftItems,
      {
        productCode: selectedSku.productCode,
        sizeCode: selectedSku.sizeCode,
        colorCode: selectedSku.colorCode,
        quantity: itemQty,
        variantId: selectedSku.variantId,
      },
    ]);
    setPermitError('');
  };

  const handleRemoveDraftItem = (index: number) => {
    setDraftItems(draftItems.filter((_, i) => i !== index));
  };

  const handleCreatePermit = async () => {
    setPermitError('');

    if (draftItems.length === 0) {
      setPermitError('الرجاء إضافة SKU واحد على الأقل لإصدار الإذن.');
      return;
    }

    if (newPermit.type === 'transfer') {
      if (newPermit.fromWarehouseCode === newPermit.toWarehouseCode) {
        setPermitError('لا يمكن التحويل من وإلى نفس المستودع!');
        return;
      }
    }

    const finalPermit: MovementPermit = {
      code: newPermit.code,
      type: newPermit.type,
      status:
        newPermit.type === 'transfer' && newPermit.requiresManagerApproval
          ? 'pending_approval'
          : 'approved',
      date: newPermit.date,
      fromWarehouseCode: ['transfer', 'disbursement', 'scrap'].includes(newPermit.type)
        ? newPermit.fromWarehouseCode
        : undefined,
      toWarehouseCode: ['transfer', 'addition'].includes(newPermit.type)
        ? newPermit.toWarehouseCode
        : undefined,
      purposeKey: ['disbursement', 'addition'].includes(newPermit.type)
        ? newPermit.purposeKey
        : undefined,
      purpose: purposeLabel(newPermit.type, newPermit.purposeKey),
      reason: newPermit.type === 'scrap' ? newPermit.scrapReason : undefined,
      notes: newPermit.notes,
      requiresManagerApproval:
        newPermit.type === 'transfer' ? newPermit.requiresManagerApproval : false,
      items: draftItems,
    };

    setPermitSaving(true);
    try {
      await onAddPermit(finalPermit);
      setIsAddModalOpen(false);
    } catch (e) {
      setPermitError(e instanceof Error ? e.message : 'تعذر حفظ الإذن');
    } finally {
      setPermitSaving(false);
    }
  };

  const handleApproveClick = async (permit: MovementPermit) => {
    if (!onApprovePermit) return;
    setApprovingCode(permit.code);
    try {
      await onApprovePermit(permit);
    } catch {
      /* error shown via parent */
    } finally {
      setApprovingCode(null);
    }
  };

  const filteredPermits = useMemo(() => {
    return permits.filter(p => {
      if (filterType !== 'all' && p.type !== filterType) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesCode = p.code.toLowerCase().includes(query);
        const matchesPurpose = p.purpose?.toLowerCase().includes(query) || false;
        return matchesCode || matchesPurpose;
      }

      return true;
    });
  }, [permits, filterType, searchQuery]);

  return (
    <div dir="rtl" className="space-y-6">
      
      {/* Title */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-blue-900 tracking-tight flex items-center gap-2">
            <ArrowRightLeft className="text-blue-600" />
            الأذونات والمستندات المخزنية (Inventory Transaction Permits)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            إصدار أذونات التحويل بين الفروع، أذونات الهالك، الصرف، والإضافة مع تعديل الأرصدة والتقييمات فورياً.
          </p>
        </div>
        <button 
          onClick={openAddModal}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/10"
        >
          <PlusCircle size={16} />
          إصدار إذن مخزني جديد
        </button>
      </div>

      {/* Filter panel */}
      {initialFilterType === 'all' ? (
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 shrink-0 text-xs w-full sm:w-auto overflow-x-auto">
          <button 
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
              filterType === 'all' ? 'bg-white text-blue-900 shadow-xs' : 'text-gray-500'
            }`}
          >
            كافة المستندات ({permits.length})
          </button>
          <button 
            onClick={() => setFilterType('transfer')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
              filterType === 'transfer' ? 'bg-white text-blue-900 shadow-xs' : 'text-gray-500'
            }`}
          >
            🔄 أذون التحويل ({permits.filter(p => p.type === 'transfer').length})
          </button>
          <button 
            onClick={() => setFilterType('addition')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
              filterType === 'addition' ? 'bg-white text-blue-900 shadow-xs' : 'text-gray-500'
            }`}
          >
            📥 أذون الإضافة ({permits.filter(p => p.type === 'addition').length})
          </button>
          <button 
            onClick={() => setFilterType('disbursement')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
              filterType === 'disbursement' ? 'bg-white text-blue-900 shadow-xs' : 'text-gray-500'
            }`}
          >
            📤 أذون الصرف ({permits.filter(p => p.type === 'disbursement').length})
          </button>
          <button 
            onClick={() => setFilterType('scrap')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
              filterType === 'scrap' ? 'bg-white text-blue-900 shadow-xs' : 'text-gray-500'
            }`}
          >
            🗑️ أذون الهالك ({permits.filter(p => p.type === 'scrap').length})
          </button>
        </div>

        {/* Text Search */}
        <div className="relative w-full sm:w-80">
          <input 
            type="text" 
            placeholder="البحث برقم الإذن أو الغرض..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs p-2.5 pr-9 border border-gray-100 rounded-xl bg-gray-50/50 focus:bg-white focus:outline-none"
          />
          <Search size={14} className="absolute right-3 top-3.5 text-gray-400" />
        </div>
      </div>
      ) : (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="البحث برقم الإذن أو الغرض..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs p-2.5 pr-9 border border-gray-100 rounded-xl bg-gray-50/50 focus:bg-white focus:outline-none"
            />
            <Search size={14} className="absolute right-3 top-3.5 text-gray-400" />
          </div>
        </div>
      )}

      {/* Permit Listing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPermits.map((p) => {
          const isApproved = p.status === 'approved';
          const isDraft = p.status === 'draft';
          const isPending = p.status === 'pending_approval';
          
          let typeLabel = 'إذن تحويل بضائع';
          let typeColor = 'text-blue-700 bg-blue-50 border-blue-200';
          if (p.type === 'disbursement') {
            typeLabel = 'إذن صرف بضائع';
            typeColor = 'text-red-700 bg-red-50 border-red-200';
          } else if (p.type === 'addition') {
            typeLabel = 'إذن إضافة بضائع';
            typeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
          } else if (p.type === 'scrap') {
            typeLabel = 'إذن هالك بضائع';
            typeColor = 'text-amber-700 bg-amber-50 border-amber-200';
          }

          const fromWh = warehouses.find(w => w.code === p.fromWarehouseCode)?.name || p.fromWarehouseCode || '—';
          const toWh = warehouses.find(w => w.code === p.toWarehouseCode)?.name || p.toWarehouseCode || '—';

          return (
            <div 
              key={p.code}
              className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs flex flex-col justify-between hover:border-blue-200 transition-all"
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-gray-400 font-mono">#{p.code}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeColor}`}>
                    {typeLabel}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-gray-800 leading-snug line-clamp-2 my-2 min-h-[32px]">
                  {p.type === 'transfer'
                    ? p.requiresManagerApproval
                      ? 'تحويل مخزني — بانتظار موافقة المدير'
                      : 'تحويل مخزني بين المستودعات'
                    : p.purpose || 'مستند مخزني'}
                </h4>

                <p className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Calendar size={12} />
                  تاريخ القيد: {p.date}
                </p>

                {/* Logistics route */}
                <div className="my-3 p-3 bg-gray-50 rounded-xl space-y-1.5 text-xs text-gray-600">
                  {p.fromWarehouseCode && (
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[10px] text-gray-400 font-bold">من عهدة:</span>
                      <span className="truncate font-semibold text-gray-700 max-w-[150px]">{fromWh}</span>
                    </div>
                  )}
                  {p.toWarehouseCode && (
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[10px] text-gray-400 font-bold">إلى عهدة:</span>
                      <span className="truncate font-semibold text-gray-700 max-w-[150px]">{toWh}</span>
                    </div>
                  )}
                </div>

                {p.notes && (
                  <p className="text-[10px] text-gray-400 bg-amber-50/40 p-2 rounded-lg border border-amber-100/30">
                    <span className="font-bold">ملاحظات:</span> {p.notes}
                  </p>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 flex justify-between items-center text-xs gap-2">
                <button 
                  onClick={() => setSelectedPermitDetails(p)}
                  className="text-xs text-blue-600 hover:underline hover:text-blue-800 font-bold flex items-center gap-1"
                >
                  <FileText size={12} />
                  معاينة الأصناف ({p.items.reduce((s, i) => s + i.quantity, 0)} قطعة)
                </button>

                <div className="flex items-center gap-2">
                  {isPending && onApprovePermit && p.id ? (
                    <button
                      type="button"
                      disabled={approvingCode === p.code}
                      onClick={() => void handleApproveClick(p)}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {approvingCode === p.code ? 'جاري الاعتماد…' : 'اعتماد المدير'}
                    </button>
                  ) : null}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    isApproved ? 'bg-emerald-50 text-emerald-700' :
                    isDraft ? 'bg-gray-100 text-gray-600' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {isApproved ? '● معتمد ومرحل' : isDraft ? '● مسودة' : '● بانتظار موافقة المدير'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredPermits.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400 text-xs">
            لا توجد أذونات مطابقة للبحث حالياً.
          </div>
        )}
      </div>

      {/* Modal 1: Create Permit Form (Step-By-Step) */}
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
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-blue-900 text-white">
                <div>
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <PlusCircle size={16} />
                    إصدار إذن مخزني جديد
                  </h4>
                  <p className="text-[10px] text-blue-200 mt-0.5">اختر نوع الإذن، المستودع، القطع والكميات</p>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
                {permitError && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 border border-red-100 font-bold">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{permitError}</span>
                  </div>
                )}

                <div className="space-y-4">
                    
                    {/* Permit Type */}
                    <div>
                      <label className="block text-gray-700 font-bold mb-1.5">نوع الإذن المخزني المراد إنشاؤه *</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <button 
                          type="button"
                          onClick={() => handlePermitTypeChange('transfer')}
                          className={`p-2 rounded-xl text-center font-bold border transition-all ${
                            newPermit.type === 'transfer' ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs' : 'bg-white text-gray-500'
                          }`}
                        >
                          🔄 إذن تحويل
                        </button>
                        <button 
                          type="button"
                          onClick={() => handlePermitTypeChange('addition')}
                          className={`p-2 rounded-xl text-center font-bold border transition-all ${
                            newPermit.type === 'addition' ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs' : 'bg-white text-gray-500'
                          }`}
                        >
                          📥 إذن إضافة
                        </button>
                        <button 
                          type="button"
                          onClick={() => handlePermitTypeChange('disbursement')}
                          className={`p-2 rounded-xl text-center font-bold border transition-all ${
                            newPermit.type === 'disbursement' ? 'bg-red-50 border-red-500 text-red-900 shadow-xs' : 'bg-white text-gray-500'
                          }`}
                        >
                          📤 إذن صرف
                        </button>
                        <button 
                          type="button"
                          onClick={() => handlePermitTypeChange('scrap')}
                          className={`p-2 rounded-xl text-center font-bold border transition-all ${
                            newPermit.type === 'scrap' ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs' : 'bg-white text-gray-500'
                          }`}
                        >
                          🗑️ إذن هالك
                        </button>
                      </div>
                    </div>

                    {/* Code & Date */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-700 font-bold mb-1">رقم/كود الإذن التلقائي *</label>
                        <input 
                          type="text" 
                          required
                          value={newPermit.code}
                          onChange={(e) => setNewPermit({ ...newPermit, code: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 rounded-xl font-mono text-center font-bold bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-bold mb-1">تاريخ القيد والتسجيل *</label>
                        <input 
                          type="date" 
                          required
                          value={newPermit.date}
                          onChange={(e) => setNewPermit({ ...newPermit, date: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 rounded-xl text-center font-bold"
                        />
                      </div>
                    </div>

                    {/* Warehouses depends on Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {['transfer', 'disbursement', 'scrap'].includes(newPermit.type) && (
                        <div>
                          <label className="block text-gray-700 font-bold mb-1">من مستودع عهدة (المصدر) *</label>
                          <select 
                            value={newPermit.fromWarehouseCode}
                            onChange={(e) => setNewPermit({ ...newPermit, fromWarehouseCode: e.target.value })}
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl"
                          >
                            {warehouses.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                          </select>
                        </div>
                      )}

                      {['transfer', 'addition'].includes(newPermit.type) && (
                        <div>
                          <label className="block text-gray-700 font-bold mb-1">إلى مستودع عهدة (الوجهة) *</label>
                          <select 
                            value={newPermit.toWarehouseCode}
                            onChange={(e) => setNewPermit({ ...newPermit, toWarehouseCode: e.target.value })}
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl"
                          >
                            {warehouses.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Purpose — حسب نوع الإذن */}
                    {newPermit.type === 'disbursement' && (
                      <div>
                        <label className="block text-gray-700 font-bold mb-1">غرض الصرف *</label>
                        <select
                          value={newPermit.purposeKey}
                          onChange={(e) =>
                            setNewPermit({ ...newPermit, purposeKey: e.target.value })
                          }
                          className="w-full p-2.5 bg-white border border-gray-200 rounded-xl"
                        >
                          {DISBURSEMENT_PURPOSES.map((p) => (
                            <option key={p.key} value={p.key}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {newPermit.type === 'addition' && (
                      <div>
                        <label className="block text-gray-700 font-bold mb-1">غرض الإضافة *</label>
                        <select
                          value={newPermit.purposeKey}
                          onChange={(e) =>
                            setNewPermit({ ...newPermit, purposeKey: e.target.value })
                          }
                          className="w-full p-2.5 bg-white border border-gray-200 rounded-xl"
                        >
                          {ADDITION_PURPOSES.map((p) => (
                            <option key={p.key} value={p.key}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {newPermit.type === 'scrap' && (
                      <div>
                        <label className="block text-gray-700 font-bold mb-1">سبب الهالك *</label>
                        <select
                          value={newPermit.scrapReason}
                          onChange={(e) =>
                            setNewPermit({ ...newPermit, scrapReason: e.target.value })
                          }
                          className="w-full p-2.5 bg-white border border-gray-200 rounded-xl"
                        >
                          {SCRAP_REASONS.map((r) => (
                            <option key={r.key} value={r.key}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Notes */}
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">ملاحظات تكميلية</label>
                      <textarea 
                        value={newPermit.notes}
                        onChange={(e) => setNewPermit({ ...newPermit, notes: e.target.value })}
                        placeholder="ملاحظات تفصيلية..."
                        rows={2}
                        className="w-full p-2.5 border border-gray-200 rounded-xl"
                      />
                    </div>

                    {newPermit.type === 'transfer' && (
                      <div className="flex items-start gap-3 bg-amber-50 p-3 rounded-xl border border-amber-100">
                        <input
                          type="checkbox"
                          id="reqManager"
                          checked={newPermit.requiresManagerApproval}
                          onChange={(e) =>
                            setNewPermit({
                              ...newPermit,
                              requiresManagerApproval: e.target.checked,
                            })
                          }
                          className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="reqManager" className="text-xs font-bold text-gray-700 cursor-pointer leading-relaxed">
                          يحتاج موافقة المدير قبل تنفيذ التحويل
                          <span className="block text-[10px] font-normal text-amber-800 mt-1">
                            عند التفعيل يُرسل تنبيه للمدير في أعلى الشاشة لاعتماد الإذن قبل خصم المخزون.
                          </span>
                        </label>
                      </div>
                    )}

                    <div className="border-t border-gray-100 pt-4 space-y-3">
                      <h5 className="font-bold text-gray-800 flex items-center gap-2">
                        <Info size={14} className="text-blue-600" />
                        اختيار الملابس والكمية *
                      </h5>

                      {['transfer', 'disbursement', 'scrap'].includes(newPermit.type) &&
                      !newPermit.fromWarehouseCode ? (
                        <p className="text-amber-700 bg-amber-50 p-3 rounded-xl text-xs font-bold">
                          اختر المستودع المصدر أولاً لعرض الملابس المتاحة.
                        </p>
                      ) : clothingSkuOptions.length === 0 ? (
                        <p className="text-amber-700 bg-amber-50 p-3 rounded-xl text-xs font-bold">
                          {newPermit.type === 'addition'
                            ? 'لا توجد أصناف في الكتالوج — أضف منتجات ومقاسات وألوان أولاً.'
                            : 'لا يوجد رصيد في هذا المستودع — أضف بضاعة عبر شراء أو إذن إضافة أولاً.'}
                        </p>
                      ) : (
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-1 font-bold">
                                القطعة (صنف / مقاس / لون)
                              </label>
                              <select
                                value={selectedSku?.key ?? ''}
                                onChange={(e) => setSelectedSkuKey(e.target.value)}
                                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs"
                              >
                                {clothingSkuOptions.map((o) => (
                                  <option key={o.key} value={o.key}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-1 font-bold">الكمية</label>
                              <input
                                type="number"
                                min="1"
                                max={selectedSku?.stock ?? undefined}
                                value={itemQty}
                                onChange={(e) => setItemQty(parseInt(e.target.value, 10) || 1)}
                                className="w-full p-2.5 border border-gray-200 rounded-xl font-bold font-mono text-center"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddDraftItem}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs"
                          >
                            + إضافة للإذن
                          </button>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <span className="font-bold text-gray-700 block text-xs">
                          القطع المضافة ({draftItems.length})
                        </span>
                        {draftItems.map((item, idx) => {
                          const targetP = products.find((p) => p.code === item.productCode);
                          const sObj = sizes.find((s) => s.code === item.sizeCode);
                          const cObj = colors.find((c) => c.code === item.colorCode);
                          return (
                            <div
                              key={idx}
                              className="p-3 bg-white border border-gray-150 rounded-xl flex justify-between items-center text-xs"
                            >
                              <div>
                                <span className="font-bold text-gray-800">
                                  {targetP?.name || item.productCode}
                                </span>
                                <div className="flex gap-2 text-[10px] text-gray-400 mt-1">
                                  <span>مقاس: {sObj?.name || item.sizeCode}</span>
                                  <span>•</span>
                                  <span>لون: {cObj?.name || item.colorCode}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold bg-blue-50 text-blue-900 px-2 py-0.5 rounded">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDraftItem(idx)}
                                  className="text-red-400 hover:text-red-600 p-1"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {draftItems.length === 0 && (
                          <p className="text-center py-4 text-gray-400 text-xs">
                            لم تُضف قطع بعد — اختر الملابس والكمية ثم «إضافة للإذن».
                          </p>
                        )}
                      </div>
                    </div>

                  </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                  <button 
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-100 transition-all"
                  >
                    إلغاء
                  </button>
                  <button 
                    onClick={() => void handleCreatePermit()}
                    disabled={permitSaving || draftItems.length === 0}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1"
                  >
                    <Check size={14} />
                    {permitSaving
                      ? 'جاري الحفظ…'
                      : newPermit.type === 'transfer' && newPermit.requiresManagerApproval
                        ? 'إرسال للمدير'
                        : 'حفظ الإذن'}
                  </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Permit Details Viewer */}
      <AnimatePresence>
        {selectedPermitDetails && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-blue-950 text-white">
                <div>
                  <h4 className="text-sm font-bold flex items-center gap-1.5">
                    <span>📃</span>
                    تفاصيل مستند الأذون البضاعي
                  </h4>
                  <p className="text-[10px] text-blue-200 mt-0.5">مراجعة الأصناف وحالتها المخزنية المعتمدة</p>
                </div>
                <button 
                  onClick={() => setSelectedPermitDetails(null)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                
                <div className="space-y-1 bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <p className="font-bold text-gray-800 text-xs">رقم المستند: {selectedPermitDetails.code}</p>
                  <p className="text-gray-600 text-[11px]"><span className="font-bold text-gray-400">الغرض:</span> {selectedPermitDetails.purpose || '—'}</p>
                  <p className="text-[10px] text-gray-400">تاريخ القيد: {selectedPermitDetails.date}</p>
                </div>

                <div className="space-y-1.5">
                  <span className="font-bold text-gray-700 block mb-1">الأصناف والكميات المأذون بحركتها:</span>
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                    {selectedPermitDetails.items.map((item, idx) => {
                      const targetP = products.find(p => p.code === item.productCode);
                      const sObj = sizes.find(s => s.code === item.sizeCode);
                      const cObj = colors.find(c => c.code === item.colorCode);

                      return (
                        <div key={idx} className="p-2.5 bg-white border border-gray-100 rounded-lg flex justify-between items-center">
                          <div>
                            <span className="font-bold text-gray-800">{targetP?.name || item.productCode}</span>
                            <div className="flex gap-2 text-[10px] text-gray-400 mt-0.5">
                              <span>مقاس: {sObj ? sObj.name : item.sizeCode}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full border border-gray-200" style={{ backgroundColor: cObj?.hex }} />
                                <span>{cObj ? cObj.name : item.colorCode}</span>
                              </span>
                            </div>
                          </div>
                          <span className="font-mono font-bold bg-blue-50 text-blue-900 px-2 py-0.5 rounded">
                            {item.quantity} قطعة
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={() => setSelectedPermitDetails(null)}
                  className="px-4 py-1.5 bg-blue-900 text-white text-xs font-bold rounded-xl hover:bg-blue-950 transition-all"
                >
                  حسناً، إغلاق المعاينة
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
