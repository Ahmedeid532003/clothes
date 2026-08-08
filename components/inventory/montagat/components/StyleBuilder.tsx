/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  Info, 
  Layers, 
  CheckCircle, 
  Percent, 
  AlertCircle, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Plus, 
  Shirt, 
  Scissors, 
  RefreshCw,
  Box
} from 'lucide-react';
import { Product, InventoryBalance, Warehouse, Size, Color } from '../types';

interface StyleBuilderProps {
  products: Product[];
  balances: InventoryBalance[];
  warehouses: Warehouse[];
  sizes: Size[];
  colors: Color[];
  onAddProduct: (prod: Product) => void;
  onNavigateToTab: (tabId: string) => void;
}

export default function StyleBuilder({
  products,
  balances,
  warehouses,
  sizes,
  colors,
  onAddProduct,
  onNavigateToTab,
}: StyleBuilderProps) {
  // Available standard products (not composite)
  const standardProducts = useMemo(() => {
    return products.filter(p => !p.isComposite);
  }, [products]);

  // Selected Warehouse for Stock Matcher
  const [selectedWarehouseCode, setSelectedWarehouseCode] = useState<string>(
    warehouses[0]?.code || 'pos-main'
  );

  // Styling Selections
  const [selectedTopCode, setSelectedTopCode] = useState<string>('');
  const [topSize, setTopSize] = useState<string>(sizes[2]?.code || 'SZ-003'); // L
  const [topColor, setTopColor] = useState<string>(colors[1]?.code || 'CLR-002'); // Blue

  const [selectedBottomCode, setSelectedBottomCode] = useState<string>('');
  const [bottomSize, setBottomSize] = useState<string>(sizes[2]?.code || 'SZ-003'); // L
  const [bottomColor, setBottomColor] = useState<string>(colors[2]?.code || 'CLR-003'); // Black

  const [selectedAccessoryCode, setSelectedAccessoryCode] = useState<string>('');
  const [accessorySize, setAccessorySize] = useState<string>(sizes[2]?.code || 'SZ-003'); // L
  const [accessoryColor, setAccessoryColor] = useState<string>(colors[3]?.code || 'CLR-004'); // White

  // Sync selectors with products when list changes
  React.useEffect(() => {
    if (standardProducts.length > 0) {
      if (!selectedTopCode || !standardProducts.some(p => p.code === selectedTopCode)) {
        setSelectedTopCode(standardProducts[0]?.code || '');
      }
      if (!selectedBottomCode || !standardProducts.some(p => p.code === selectedBottomCode)) {
        setSelectedBottomCode(standardProducts[1]?.code || standardProducts[0]?.code || '');
      }
      if (!selectedAccessoryCode || (selectedAccessoryCode !== '' && !standardProducts.some(p => p.code === selectedAccessoryCode))) {
        const accessory = standardProducts.find(p => p.classificationCode === 'CLS-004');
        setSelectedAccessoryCode(accessory?.code || '');
      }
    }
  }, [standardProducts]);

  // Discount Slider for the Bundle
  const [bundleDiscount, setBundleDiscount] = useState<number>(10); // 10% default discount
  const [bundleName, setBundleName] = useState<string>('طقم كاجوال صيفي متكامل مدمج');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Find selected item details
  const topProduct = useMemo(() => standardProducts.find(p => p.code === selectedTopCode), [standardProducts, selectedTopCode]);
  const bottomProduct = useMemo(() => standardProducts.find(p => p.code === selectedBottomCode), [standardProducts, selectedBottomCode]);
  const accessoryProduct = useMemo(() => standardProducts.find(p => p.code === selectedAccessoryCode), [standardProducts, selectedAccessoryCode]);

  // Calculate live stock balances for selected components in the selected warehouse
  const stockAnalysis = useMemo(() => {
    const getStock = (productCode: string, sizeCode: string, colorCode: string) => {
      const bal = balances.find(
        b => b.warehouseCode === selectedWarehouseCode &&
             b.productCode === productCode &&
             b.sizeCode === sizeCode &&
             b.colorCode === colorCode
      );
      return bal ? bal.quantity : 0;
    };

    const topQty = topProduct ? getStock(topProduct.code, topSize, topColor) : 0;
    const bottomQty = bottomProduct ? getStock(bottomProduct.code, bottomSize, bottomColor) : 0;
    const accessoryQty = accessoryProduct ? getStock(accessoryProduct.code, accessorySize, accessoryColor) : 0;

    // Minimum of the three is the max sets that can be compiled
    const maxOutfitsCanBuild = Math.min(topQty, bottomQty, accessoryQty);

    // Identify limiting item
    let limitingItemName = '';
    let limitingQty = 0;
    
    if (topQty <= bottomQty && topQty <= accessoryQty) {
      limitingItemName = topProduct?.name || 'القطعة العلوية';
      limitingQty = topQty;
    } else if (bottomQty <= topQty && bottomQty <= accessoryQty) {
      limitingItemName = bottomProduct?.name || 'القطعة السفلية';
      limitingQty = bottomQty;
    } else {
      limitingItemName = accessoryProduct?.name || 'الإكسسوار';
      limitingQty = accessoryQty;
    }

    return {
      topQty,
      bottomQty,
      accessoryQty,
      maxOutfitsCanBuild,
      limitingItemName,
      limitingQty
    };
  }, [balances, selectedWarehouseCode, topProduct, topSize, topColor, bottomProduct, bottomSize, bottomColor, accessoryProduct, accessorySize, accessoryColor]);

  // Financial calculations
  const finances = useMemo(() => {
    const cost = (topProduct?.buyPrice || 0) + (bottomProduct?.buyPrice || 0) + (accessoryProduct?.buyPrice || 0);
    const standardRetail = (topProduct?.sellPrice || 0) + (bottomProduct?.sellPrice || 0) + (accessoryProduct?.sellPrice || 0);
    const discountAmount = standardRetail * (bundleDiscount / 100);
    const bundleRetail = Math.max(cost, standardRetail - discountAmount);
    const profit = bundleRetail - cost;
    const margin = bundleRetail > 0 ? (profit / bundleRetail) * 100 : 0;

    return {
      cost,
      standardRetail,
      bundleRetail,
      profit,
      margin
    };
  }, [topProduct, bottomProduct, accessoryProduct, bundleDiscount]);

  // Create composite product in ERP
  const handleSaveBundle = () => {
    if (!bundleName.trim()) {
      alert('الرجاء كتابة اسم جذاب للطقم!');
      return;
    }

    const compositionArray = [
      { productCode: selectedTopCode, quantity: 1 },
      { productCode: selectedBottomCode, quantity: 1 }
    ];

    if (selectedAccessoryCode) {
      compositionArray.push({ productCode: selectedAccessoryCode, quantity: 1 });
    }

    const newBundleCode = `COMP-${Date.now().toString().slice(-4)}`;
    const newCompositeProduct = {
      code: newBundleCode,
      name: bundleName,
      description: `طقم منسق ومدمج مسبقاً يحتوي على: ${topProduct?.name || ''} مع ${bottomProduct?.name || ''} وإكسسوارات متناسقة.`,
      barcode: `622${Math.floor(1000000 + Math.random() * 9000000)}`,
      buyPrice: finances.cost,
      sellPrice: finances.bundleRetail,
      brandCode: topProduct?.brandCode || 'BR-003',
      classificationCode: 'general',
      departmentCode: topProduct?.departmentCode || 'SEC-002',
      seasonCode: 'current',
      isComposite: true,
      composition: compositionArray,
      variants: [
        { sizeCode: topSize, colorCode: topColor, barcode: `622BNDL${Date.now().toString().slice(-4)}`, sku: `BNDL-${newBundleCode}` }
      ],
      imageColor: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600'
    };

    onAddProduct(newCompositeProduct);
    setSuccessMessage(`تم بنجاح حفظ الطقم وتوليفه كصنف مركب باسم "${bundleName}" وكود "${newBundleCode}"!`);
    
    setTimeout(() => {
      setSuccessMessage('');
      onNavigateToTab('catalog');
    }, 3000);
  };

  if (standardProducts.length === 0) {
    return (
      <div dir="rtl" className="p-8 text-center bg-white border border-gray-150 rounded-2xl shadow-sm space-y-4 my-6" id="stylebuilder-empty-warning">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto text-2xl">
          👕
        </div>
        <h3 className="text-lg font-extrabold text-blue-900">لا توجد أصناف قياسية مفرّدة بعد!</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          لتتمكن من استخدام منسق ومصمم الأطقم المبتكر، يجب عليك أولاً إضافة أصناف فردية قياسية (مثل القمصان، البناطيل، والفساتين) في دليل الأصناف.
        </p>
        <button
          onClick={() => onNavigateToTab('catalog')}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
        >
          الذهاب إلى دليل الأصناف والمنتجات لإضافة أول صنف ➡️
        </button>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6">
      
      {/* Title */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-blue-900 tracking-tight flex items-center gap-2">
            <Sparkles className="text-blue-600 animate-spin" style={{ animationDuration: '6s' }} />
            مصمم ومنسق الأطقم والمجموعات (Mix & Match Styling Suite)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            ابتكار مجموعات وتشكيلات ملابس مدمجة وتحديد أسعارها الترويجية مع فحص فوري ومباشر لمدى توافر القطع مخزنياً.
          </p>
        </div>
        <div className="flex bg-gray-50 p-1.5 rounded-xl border border-gray-150 items-center gap-2 text-xs font-bold text-gray-700">
          <span>المستودع النشط للمطابقة:</span>
          <select 
            value={selectedWarehouseCode}
            onChange={(e) => setSelectedWarehouseCode(e.target.value)}
            className="bg-white p-1 border border-gray-200 rounded-lg text-blue-900 focus:outline-none focus:border-blue-500"
          >
            {warehouses.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
          </select>
        </div>
      </div>

      {successMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100 flex items-center gap-2.5 font-bold text-xs"
        >
          <CheckCircle className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Mixer Selectors (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-gray-800 border-b border-gray-50 pb-3">أولاً: اختر قطع التوليفة الملبسية</h3>

            {/* 1. TOP ITEM */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <div className="md:col-span-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                  <Shirt size={20} />
                </div>
                <div>
                  <span className="text-[10px] text-rose-500 font-bold block">القطعة العلوية</span>
                  <span className="font-bold text-gray-700 text-xs">قميص / تيشيرت / فستان</span>
                </div>
              </div>

              <div className="md:col-span-4">
                <select 
                  value={selectedTopCode}
                  onChange={(e) => setSelectedTopCode(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-gray-200 rounded-xl"
                >
                  {standardProducts.map(p => (
                    <option key={p.code} value={p.code}>{p.name} ({p.sellPrice} ج.م)</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <select 
                  value={topSize}
                  onChange={(e) => setTopSize(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-gray-200 rounded-xl"
                >
                  {sizes.map(s => <option key={s.code} value={s.code}>مقاس {s.name}</option>)}
                </select>
              </div>

              <div className="md:col-span-2">
                <select 
                  value={topColor}
                  onChange={(e) => setTopColor(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-gray-200 rounded-xl"
                >
                  {colors.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* 2. BOTTOM ITEM */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <div className="md:col-span-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                  <Scissors size={20} />
                </div>
                <div>
                  <span className="text-[10px] text-blue-500 font-bold block">القطعة السفلية</span>
                  <span className="font-bold text-gray-700 text-xs">بنطلون جينز / جيب / بنطلون</span>
                </div>
              </div>

              <div className="md:col-span-4">
                <select 
                  value={selectedBottomCode}
                  onChange={(e) => setSelectedBottomCode(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-gray-200 rounded-xl"
                >
                  {standardProducts.map(p => (
                    <option key={p.code} value={p.code}>{p.name} ({p.sellPrice} ج.م)</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <select 
                  value={bottomSize}
                  onChange={(e) => setBottomSize(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-gray-200 rounded-xl"
                >
                  {sizes.map(s => <option key={s.code} value={s.code}>مقاس {s.name}</option>)}
                </select>
              </div>

              <div className="md:col-span-2">
                <select 
                  value={bottomColor}
                  onChange={(e) => setBottomColor(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-gray-200 rounded-xl"
                >
                  {colors.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* 3. ACCESSORY */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <div className="md:col-span-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <span className="text-[10px] text-emerald-500 font-bold block">إكسسوار أو طرحة مكملة</span>
                  <span className="font-bold text-gray-700 text-xs">طرحة / شال / حزام / أخرى</span>
                </div>
              </div>

              <div className="md:col-span-4">
                <select 
                  value={selectedAccessoryCode}
                  onChange={(e) => setSelectedAccessoryCode(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-gray-200 rounded-xl"
                >
                  <option value="">-- بدون إكسسوار تكميلي --</option>
                  {standardProducts.map(p => (
                    <option key={p.code} value={p.code}>{p.name} ({p.sellPrice} ج.م)</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <select 
                  disabled={!selectedAccessoryCode}
                  value={accessorySize}
                  onChange={(e) => setAccessorySize(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-gray-200 rounded-xl disabled:opacity-40"
                >
                  {sizes.map(s => <option key={s.code} value={s.code}>مقاس {s.name}</option>)}
                </select>
              </div>

              <div className="md:col-span-2">
                <select 
                  disabled={!selectedAccessoryCode}
                  value={accessoryColor}
                  onChange={(e) => setAccessoryColor(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-gray-200 rounded-xl disabled:opacity-40"
                >
                  {colors.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
            </div>

          </div>

          {/* Pricing & Business setup */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-800 border-b border-gray-50 pb-3">ثانياً: تهيئة تسعير الطقم الترويجي</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1.5">نسبة الخصم الترويجي للطقم المدمج (%)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="30" 
                      value={bundleDiscount}
                      onChange={(e) => setBundleDiscount(parseInt(e.target.value) || 0)}
                      className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <span className="font-mono font-bold bg-blue-50 text-blue-900 px-2.5 py-1 rounded border border-blue-100 text-sm shrink-0">
                      {bundleDiscount}%
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">اسم ومسمى مبيعات الطقم المتكامل *</label>
                  <input 
                    type="text" 
                    value={bundleName}
                    onChange={(e) => setBundleName(e.target.value)}
                    placeholder="مثال: طقم العيد الفاخر قطعتين"
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-bold focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100/30 space-y-3 font-semibold text-xs">
                <span className="text-blue-900 font-bold block mb-1">دراسة ومقارنة التسعير:</span>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">إجمالي السعر المفرد العادي:</span>
                  <span className="font-mono text-gray-700 line-through">{finances.standardRetail.toFixed(2)} ج.م</span>
                </div>
                
                <div className="flex justify-between text-blue-900 font-bold">
                  <span>سعر بيع الطقم بالخصم الترويجي:</span>
                  <span className="font-mono text-sm">{finances.bundleRetail.toFixed(2)} ج.م</span>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>إجمالي تكلفة الشراء:</span>
                  <span className="font-mono">{finances.cost.toFixed(2)} ج.م</span>
                </div>

                <div className="flex justify-between text-emerald-700 border-t border-dashed border-gray-150 pt-2 font-bold">
                  <span>الربح الإجمالي الصافي للطقم:</span>
                  <span className="font-mono text-sm">+{finances.profit.toFixed(2)} ج.م</span>
                </div>

                <div className="flex justify-between text-indigo-700 font-bold">
                  <span>هامش ربح الطقم (Profit Margin):</span>
                  <span className="font-mono">{finances.margin.toFixed(1)}%</span>
                </div>
              </div>

            </div>

            <div className="pt-2 flex justify-end">
              <button 
                onClick={handleSaveBundle}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5"
              >
                <Plus size={16} />
                حفظ كصنف مركب جاهز للبيع (Composite SKU)
              </button>
            </div>
          </div>

        </div>

        {/* Right Side: High Fidelity Visual Mockup (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Fashion Style Preview */}
          <div className="bg-gradient-to-b from-blue-950 to-blue-900 text-white rounded-2xl shadow-lg overflow-hidden border border-blue-800 relative">
            <div className="p-4 bg-blue-900/40 border-b border-blue-800/50 flex justify-between items-center text-xs">
              <span className="font-bold text-blue-200">معاينة تنسيق الملابس المقترح</span>
              <span className="bg-blue-500 text-white font-bold px-1.5 py-0.5 rounded text-[9px]">LIVE STYLIST</span>
            </div>

            <div className="p-6 flex flex-col items-center space-y-5 relative">
              <div className="absolute inset-0 bg-radial from-blue-500/5 to-transparent pointer-events-none" />

              {/* 1. Accessory item */}
              {accessoryProduct ? (
                <motion.div 
                  key={accessoryProduct.code}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-48 bg-white/10 p-2.5 rounded-xl border border-white/10 flex items-center gap-2 relative z-10 hover:border-white/20 transition-all cursor-default"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-sm font-bold shadow-xs">
                    🧣
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <span className="text-[9px] text-emerald-400 block font-bold">إكسسوار متناسق</span>
                    <h4 className="text-[10px] font-bold truncate">{accessoryProduct.name}</h4>
                  </div>
                  <div 
                    className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0 shadow-xs" 
                    style={{ backgroundColor: colors.find(c => c.code === accessoryColor)?.hex }}
                  />
                </motion.div>
              ) : (
                <div className="text-[10px] text-blue-400 font-bold border border-dashed border-blue-800 p-2 rounded-xl">
                  لا يوجد إكسسوار مدمج
                </div>
              )}

              {/* Connector line */}
              <div className="w-0.5 h-4 bg-dashed bg-blue-800" />

              {/* 2. Top Product */}
              {topProduct && (
                <motion.div 
                  key={topProduct.code}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-56 bg-white/10 p-3 rounded-xl border border-white/10 flex items-center gap-3 relative z-10 hover:border-white/20 transition-all cursor-default"
                >
                  <div className="w-10 h-10 rounded-lg bg-rose-500 text-white flex items-center justify-center text-xl font-bold shadow-sm shrink-0">
                    👕
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <span className="text-[9px] text-rose-400 block font-bold">القطعة العلوية ({sizes.find(s => s.code === topSize)?.name})</span>
                    <h4 className="text-xs font-bold truncate">{topProduct.name}</h4>
                    <p className="text-[10px] text-blue-200 font-mono">{topProduct.sellPrice.toFixed(0)} ج.م</p>
                  </div>
                  <div 
                    className="w-4 h-4 rounded-full border border-white/20 shrink-0 shadow-md" 
                    style={{ backgroundColor: colors.find(c => c.code === topColor)?.hex }}
                  />
                </motion.div>
              )}

              {/* Connector line */}
              <div className="w-0.5 h-4 bg-dashed bg-blue-800" />

              {/* 3. Bottom Product */}
              {bottomProduct && (
                <motion.div 
                  key={bottomProduct.code}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-56 bg-white/10 p-3 rounded-xl border border-white/10 flex items-center gap-3 relative z-10 hover:border-white/20 transition-all cursor-default"
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-xl font-bold shadow-sm shrink-0">
                    👖
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <span className="text-[9px] text-blue-400 block font-bold">القطعة السفلية ({sizes.find(s => s.code === bottomSize)?.name})</span>
                    <h4 className="text-xs font-bold truncate">{bottomProduct.name}</h4>
                    <p className="text-[10px] text-blue-200 font-mono">{bottomProduct.sellPrice.toFixed(0)} ج.م</p>
                  </div>
                  <div 
                    className="w-4 h-4 rounded-full border border-white/20 shrink-0 shadow-md" 
                    style={{ backgroundColor: colors.find(c => c.code === bottomColor)?.hex }}
                  />
                </motion.div>
              )}

            </div>

            {/* Smart stock availability checker */}
            <div className="p-4 bg-blue-950 border-t border-blue-800 text-xs space-y-3.5">
              <span className="font-bold text-blue-300 block">
                🔍 تحليل وتحليل المخزون (Inventory Matcher):
              </span>

              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="p-1.5 bg-blue-900/40 rounded-lg border border-blue-800">
                  <span className="block text-blue-400">مخزون العلوي</span>
                  <span className="font-mono font-bold text-white text-xs">{stockAnalysis.topQty} قطع</span>
                </div>
                <div className="p-1.5 bg-blue-900/40 rounded-lg border border-blue-800">
                  <span className="block text-blue-400">مخزون السفلي</span>
                  <span className="font-mono font-bold text-white text-xs">{stockAnalysis.bottomQty} قطع</span>
                </div>
                <div className="p-1.5 bg-blue-900/40 rounded-lg border border-blue-800">
                  <span className="block text-blue-400">مخزون التكميلي</span>
                  <span className="font-mono font-bold text-white text-xs">
                    {selectedAccessoryCode ? `${stockAnalysis.accessoryQty} قطع` : '—'}
                  </span>
                </div>
              </div>

              {stockAnalysis.maxOutfitsCanBuild > 0 ? (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs">
                  <p className="font-bold">✓ توافر ممتاز للطقم مخزنياً:</p>
                  <p className="text-[10px] mt-1 text-emerald-300 leading-relaxed">
                    يمكنك فوراً تغليف وعرض مبيعات بحد أقصى <span className="font-bold text-white text-sm font-mono bg-emerald-500 px-1.5 py-0.5 rounded shrink-0">{stockAnalysis.maxOutfitsCanBuild}</span> أطقم كاملة من هذا المزيج في هذا الفرع!
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-rose-500/15 border border-rose-500/20 rounded-xl text-rose-400 text-xs space-y-1">
                  <p className="font-bold">⚠️ عائق رصيد مخزني (Out of Stock Alert):</p>
                  <p className="text-[10px] text-rose-300 leading-relaxed">
                    لا يمكن تجميع أي طقم كامل حالياً لأن صنف <span className="font-bold text-white">({stockAnalysis.limitingItemName})</span> رصيده صفر في المقاس واللون المختارين بالفرع.
                  </p>
                  <p className="text-[9px] text-blue-400 hover:underline cursor-pointer" onClick={() => onNavigateToTab('permits')}>
                    قم بإصدار إذن نقل/إضافة مخزنية لتوفير الرصيد ←
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Guide Card */}
          <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-150/40 text-xs text-amber-850 leading-relaxed space-y-2">
            <h4 className="font-extrabold text-amber-900 flex items-center gap-1">
              <Info size={14} className="shrink-0" />
              ملاحظة تشغيلية مهمة:
            </h4>
            <p className="text-[11px] text-gray-600">
              حفظ الأطقم كصنف مركب يسجلها مباشرةً كصيغة مبيعات في دليل الأصناف. عند بيع الصنف المركب بنقاط البيع، سيقوم النظام تلقائياً بخصم المكونات الفردية من عهدة الفرع لإبقاء التقييمات والأرصدة دقيقة 100٪.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
