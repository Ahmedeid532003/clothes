/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Layers, 
  Tag, 
  Eye, 
  AlertCircle, 
  BookOpen, 
  Grid, 
  List, 
  Check, 
  X,
  Sparkles,
  Info
} from 'lucide-react';
import { Product, Season, Department, Brand, Classification, Size, Color } from '../types';

interface ProductCatalogProps {
  products: Product[];
  seasons: Season[];
  departments: Department[];
  brands: Brand[];
  classifications: Classification[];
  sizes: Size[];
  colors: Color[];
  
  onAddProduct: (prod: Product) => void;
  onDeleteProduct: (code: string) => void;
  initialTab?: 'all' | 'standard' | 'composite';
  newlyAddedCode?: string | null;
  clearNewlyAddedCode?: () => void;
}

export default function ProductCatalog({
  products,
  seasons,
  departments,
  brands,
  classifications,
  sizes,
  colors,
  onAddProduct,
  onDeleteProduct,
  initialTab,
  newlyAddedCode,
  clearNewlyAddedCode,
}: ProductCatalogProps) {
  
  // State variables
  const [activeTab, setActiveTab] = useState<'all' | 'standard' | 'composite'>('all');

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProductDetails, setSelectedProductDetails] = useState<Product | null>(null);

  // New product form state
  const [newProd, setNewProd] = useState({
    code: '',
    name: '',
    description: '',
    buyPrice: 0,
    sellPrice: 0,
    barcode: '',
    brandCode: '',
    classificationCode: '',
    departmentCode: '',
    seasonCode: '',
    isComposite: false,
  });

  // Selected components for composite product
  const [compositeItems, setCompositeItems] = useState<Array<{ productCode: string; quantity: number }>>([]);
  const [selectedComponentToAdd, setSelectedComponentToAdd] = useState('');
  const [componentQty, setComponentQty] = useState(1);

  // Selected size and color tags for standard variants
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

  const [formError, setFormError] = useState('');

  // Setup defaults when opening add modal
  const openAddModal = () => {
    setFormError('');
    setNewProd({
      code: `PRD-${Date.now().toString().slice(-4)}`,
      name: '',
      description: '',
      buyPrice: 100,
      sellPrice: 150,
      barcode: `622${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      brandCode: brands[0]?.code || '',
      classificationCode: classifications[0]?.code || '',
      departmentCode: departments[0]?.code || '',
      seasonCode: seasons.find(s => s.isCurrent)?.code || seasons[0]?.code || '',
      isComposite: false,
    });
    setCompositeItems([]);
    setSelectedSizes(sizes[0] ? [sizes[0].code] : []);
    setSelectedColors(colors[0] ? [colors[0].code] : []);
    setIsAddModalOpen(true);
  };

  // Add component to composite list
  const handleAddComponent = () => {
    if (!selectedComponentToAdd) return;
    if (compositeItems.some(i => i.productCode === selectedComponentToAdd)) {
      alert('هذا الصنف مضاف بالفعل!');
      return;
    }
    setCompositeItems([...compositeItems, { productCode: selectedComponentToAdd, quantity: componentQty }]);
    setSelectedComponentToAdd('');
    setComponentQty(1);
  };

  // Remove component from composite list
  const handleRemoveComponent = (productCode: string) => {
    setCompositeItems(compositeItems.filter(i => i.productCode !== productCode));
  };

  // Handle standard variant checkbox toggles
  const handleSizeToggle = (sizeCode: string) => {
    if (selectedSizes.includes(sizeCode)) {
      setSelectedSizes(selectedSizes.filter(s => s !== sizeCode));
    } else {
      setSelectedSizes([...selectedSizes, sizeCode]);
    }
  };

  const handleColorToggle = (colorCode: string) => {
    if (selectedColors.includes(colorCode)) {
      setSelectedColors(selectedColors.filter(c => c !== colorCode));
    } else {
      setSelectedColors([...selectedColors, colorCode]);
    }
  };

  // Submit product creation
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newProd.code || !newProd.name) {
      setFormError('الرجاء تعبئة الحقول الأساسية: الكود والاسم مطلوبان.');
      return;
    }

    if (products.some(p => p.code === newProd.code)) {
      setFormError('كود هذا الصنف مستخدم بالفعل! الرجاء اختيار كود فريد.');
      return;
    }

    // Build variants
    const generatedVariants: any[] = [];
    if (newProd.isComposite) {
      if (compositeItems.length === 0) {
        setFormError('الرجاء إضافة صنف واحد على الأقل لمكونات الصنف المركب.');
        return;
      }
    } else {
      if (selectedSizes.length === 0 || selectedColors.length === 0) {
        setFormError('الرجاء اختيار مقاس واحد ولون واحد على الأقل لإنشاء التشكيلة (Variants).');
        return;
      }

      // Generate variant combination
      selectedSizes.forEach(sCode => {
        selectedColors.forEach(cCode => {
          const sku = `${newProd.code}-${sCode}-${cCode}`;
          generatedVariants.push({
            sizeCode: sCode,
            colorCode: cCode,
            barcode: `${newProd.barcode || 'BC'}${sCode}${cCode}`,
            sku
          });
        });
      });
    }

    const finalProduct: Product = {
      ...newProd,
      isComposite: newProd.isComposite,
      composition: newProd.isComposite ? compositeItems : undefined,
      variants: generatedVariants,
      imageColor: newProd.isComposite 
        ? 'bg-gradient-to-r from-blue-600 to-indigo-600' 
        : ['bg-rose-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-blue-600', 'bg-purple-500'][Math.floor(Math.random() * 6)]
    };

    onAddProduct(finalProduct);
    setIsAddModalOpen(false);
  };

  // Filter products based on search and filters
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Type Tab filter
      if (activeTab === 'standard' && p.isComposite) return false;
      if (activeTab === 'composite' && !p.isComposite) return false;

      // Dropdown filters
      if (selectedSeason && p.seasonCode !== selectedSeason) return false;
      if (selectedDept && p.departmentCode !== selectedDept) return false;
      if (selectedBrand && p.brandCode !== selectedBrand) return false;

      // Text search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesCode = p.code.toLowerCase().includes(query);
        const matchesBarcode = p.barcode.toLowerCase().includes(query);
        return matchesName || matchesCode || matchesBarcode;
      }

      return true;
    });
  }, [products, activeTab, searchQuery, selectedSeason, selectedDept, selectedBrand]);

  return (
    <div dir="rtl" className="space-y-6">
      
      {/* Title block */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-blue-900 tracking-tight flex items-center gap-2">
            <BookOpen className="text-blue-600" />
            دليل الأصناف والمنتجات (Apparel Catalog)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            إدارة كافة قطع الملابس الجاهزة (الأصناف الفردية) والأطقم الكاملة المجمعة (الأصناف المركبة).
          </p>
        </div>
        <button 
          onClick={openAddModal}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/10"
        >
          <Plus size={16} />
          إضافة صنف جديد
        </button>
      </div>

      {/* Alert banner for newly created styling outfits or standard items */}
      {newlyAddedCode && (
        (() => {
          const addedProduct = products.find(p => p.code === newlyAddedCode);
          if (!addedProduct) return null;
          return (
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm"
              id="newly-added-success-alert"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center text-2xl animate-bounce shrink-0 shadow-md shadow-amber-500/20">
                  ✨
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-amber-900 flex items-center gap-2">
                    تم توليف وإضافة الصنف الجديد بنجاح!
                  </h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    تم تسجيل <strong className="text-amber-950">"{addedProduct.name}"</strong> (الكود: <code className="bg-white/80 px-1 rounded font-mono text-xs text-amber-800 font-bold">{addedProduct.code}</code>) بنجاح في النظام كصنف {addedProduct.isComposite ? 'مركب (طقم متناسق)' : 'قياسي مفرّد'} وهو متاح الآن وجاهز للاستعراض.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  onClick={() => {
                    const element = document.getElementById(`product-row-${newlyAddedCode}`);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      // highlight effect flash
                      element.classList.add('ring-4', 'ring-amber-500');
                      setTimeout(() => {
                        element.classList.remove('ring-4', 'ring-amber-500');
                      }, 2000);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-xl transition-all shadow-md shadow-amber-600/10 cursor-pointer"
                >
                  الذهاب للصنف ورؤيته 🔍
                </button>
                {clearNewlyAddedCode && (
                  <button
                    onClick={clearNewlyAddedCode}
                    className="px-3.5 py-1.5 bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                  >
                    إغلاق التنبيه ✕
                  </button>
                )}
              </div>
            </motion.div>
          );
        })()
      )}

      {/* Filter panel */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        
        {/* Row 1: Search & Tabs */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          
          {/* Search bar */}
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="البحث باسم الصنف، الباركود، الكود الرئيسي..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs p-3 pr-10 border border-gray-100 rounded-xl bg-gray-50/50 focus:bg-white focus:border-blue-500 focus:outline-none transition-all font-medium"
            />
            <Search size={16} className="absolute right-3.5 top-3.5 text-gray-400" />
          </div>

          {/* Tab Filter buttons */}
          <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 self-start md:self-auto shrink-0">
            <button 
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'all' ? 'bg-white text-blue-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              كافة الأصناف ({products.length})
            </button>
            <button 
              onClick={() => setActiveTab('standard')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'standard' ? 'bg-white text-blue-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              أصناف قياسية ({products.filter(p => !p.isComposite).length})
            </button>
            <button 
              onClick={() => setActiveTab('composite')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'composite' ? 'bg-white text-blue-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              أصناف مركبة ({products.filter(p => p.isComposite).length})
            </button>
          </div>

        </div>

        {/* Row 2: Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-50 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-gray-400 mb-1">تصفية حسب الموسم</label>
            <select 
              value={selectedSeason} 
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="w-full p-2 bg-white border border-gray-150 rounded-xl focus:outline-none focus:border-blue-500"
            >
              <option value="">جميع المواسم</option>
              {seasons.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </div>
          
          <div>
            <label className="block text-[11px] font-bold text-gray-400 mb-1">تصفية حسب قسم المعرض</label>
            <select 
              value={selectedDept} 
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full p-2 bg-white border border-gray-150 rounded-xl focus:outline-none focus:border-blue-500"
            >
              <option value="">جميع الأقسام</option>
              {departments.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-400 mb-1">تصفية حسب الماركة والبراند</label>
            <select 
              value={selectedBrand} 
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full p-2 bg-white border border-gray-150 rounded-xl focus:outline-none focus:border-blue-500"
            >
              <option value="">جميع الماركات</option>
              {brands.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
            </select>
          </div>
        </div>

      </div>

      {/* Product List Table / Grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        
        {/* Table header count */}
        <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center text-xs">
          <span className="font-bold text-gray-700">تم العثور على: {filteredProducts.length} صنف متاح</span>
          <span className="text-gray-400">محلات ملابس ERP</span>
        </div>

        {/* Real Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold">
                <th className="p-4">كود الصنف</th>
                <th className="p-4">النوع</th>
                <th className="p-4">اسم الصنف ومعاينته</th>
                <th className="p-4">سعر الشراء</th>
                <th className="p-4">سعر البيع</th>
                <th className="p-4">الماركة والبراند</th>
                <th className="p-4">الباركود الرئيسي</th>
                <th className="p-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const brandObj = brands.find(b => b.code === p.brandCode);
                const classObj = classifications.find(c => c.code === p.classificationCode);
                const isNew = newlyAddedCode && p.code === newlyAddedCode;
                
                return (
                  <tr 
                    key={p.code} 
                    id={`product-row-${p.code}`}
                    className={`border-b transition-all group ${
                      isNew 
                        ? 'bg-amber-50/75 hover:bg-amber-100/80 border-amber-200 ring-2 ring-amber-400 ring-offset-1 font-bold' 
                        : 'border-gray-50 hover:bg-blue-50/10'
                    }`}
                  >
                    {/* Code */}
                    <td className="p-4 font-mono font-bold text-gray-500">
                      {p.code}
                    </td>

                    {/* Type badge */}
                    <td className="p-4">
                      {p.isComposite ? (
                        <span className="bg-purple-100 text-purple-800 border border-purple-250 px-2 py-0.5 rounded-full font-bold text-[10px] shadow-2xs">
                          طقم مركب
                        </span>
                      ) : (
                        <span className="bg-blue-50 text-blue-700 border border-blue-150 px-2 py-0.5 rounded-full font-bold text-[10px]">
                          قياسي مفرّد
                        </span>
                      )}
                    </td>

                    {/* Name with elegant dress color placeholder avatar */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${p.imageColor || 'bg-blue-500'} flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-xs ${isNew ? 'animate-bounce' : ''}`}>
                          {p.isComposite ? '📦' : '👕'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-800">{p.name}</h4>
                            {isNew && (
                              <span className="bg-amber-500 text-white font-extrabold px-1.5 py-0.5 rounded text-[8px] animate-pulse">
                                تم توليفه بنجاح ✨
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400 font-medium">
                            {classObj ? classObj.name : 'ملابس عامة'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Buy Price */}
                    <td className="p-4 font-mono text-gray-600">
                      {p.buyPrice.toFixed(2)} ج.م
                    </td>

                    {/* Sell Price */}
                    <td className="p-4 font-mono font-bold text-blue-900">
                      {p.sellPrice.toFixed(2)} ج.م
                    </td>

                    {/* Brand */}
                    <td className="p-4 text-gray-600 font-semibold">
                      {brandObj ? brandObj.name : '—'}
                    </td>

                    {/* Barcode */}
                    <td className="p-4 font-mono text-gray-500">
                      {p.barcode || '—'}
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      <div className="flex justify-center gap-1">
                        <button 
                          onClick={() => setSelectedProductDetails(p)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="عرض التفاصيل والتوليفة"
                        >
                          <Eye size={14} />
                        </button>
                        <button 
                          onClick={() => onDeleteProduct(p.code)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="حذف الصنف"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    لا توجد أصناف مطابقة للبحث أو الفلتر المختار. قم بإضافة صنف جديد للبدء!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Modal 1: Create Product */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-blue-900 text-white">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <Plus size={16} />
                  تعريف وإضافة صنف ملابس جديد للمخزن
                </h4>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleCreateProduct} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                {formError && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 border border-red-100 font-semibold">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Switcher: Standard vs Composite */}
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-150 flex justify-between items-center gap-3">
                  <span className="font-bold text-gray-700">نوع الصنف (Product Type):</span>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setNewProd({ ...newProd, isComposite: false })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        !newProd.isComposite ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      👕 صنف مفرّد قياسي
                    </button>
                    <button 
                      type="button"
                      onClick={() => setNewProd({ ...newProd, isComposite: true })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        newProd.isComposite ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      📦 طقم مركب (مدمج)
                    </button>
                  </div>
                </div>

                {/* Row 1: Code & Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">كود الصنف الرئيسي (SKU / Code) *</label>
                    <input 
                      type="text" 
                      required
                      value={newProd.code}
                      onChange={(e) => setNewProd({ ...newProd, code: e.target.value })}
                      placeholder="مثال: TSH-POL-01"
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">اسم ومسمى صنف الملابس *</label>
                    <input 
                      type="text" 
                      required
                      value={newProd.name}
                      onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                      placeholder="مثال: تيشيرت صيفي كحلي مريح"
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 2: Buy & Sell Prices */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">سعر الشراء الفعلي للقطعة (ج.م)</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      step="0.01"
                      value={newProd.buyPrice || ''}
                      onChange={(e) => setNewProd({ ...newProd, buyPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">سعر البيع للمستهلك (ج.م) *</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      step="0.01"
                      value={newProd.sellPrice || ''}
                      onChange={(e) => setNewProd({ ...newProd, sellPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-gray-700 font-bold mb-1">وصف صنف الملبس وتفاصيل القماش</label>
                  <textarea 
                    value={newProd.description}
                    onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
                    placeholder="اكتب مواصفات الملابس كالقطن والكتان وتعليمات الغسيل..."
                    rows={2}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Row 3: Brands, Category, Seasons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">الماركة / البراند</label>
                    <select 
                      value={newProd.brandCode}
                      onChange={(e) => setNewProd({ ...newProd, brandCode: e.target.value })}
                      className="w-full p-2 bg-white border border-gray-200 rounded-xl focus:outline-none"
                    >
                      {brands.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">التصنيف</label>
                    <select 
                      value={newProd.classificationCode}
                      onChange={(e) => setNewProd({ ...newProd, classificationCode: e.target.value })}
                      className="w-full p-2 bg-white border border-gray-200 rounded-xl focus:outline-none"
                    >
                      {classifications.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">القسم</label>
                    <select 
                      value={newProd.departmentCode}
                      onChange={(e) => setNewProd({ ...newProd, departmentCode: e.target.value })}
                      className="w-full p-2 bg-white border border-gray-200 rounded-xl focus:outline-none"
                    >
                      {departments.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">الموسم</label>
                    <select 
                      value={newProd.seasonCode}
                      onChange={(e) => setNewProd({ ...newProd, seasonCode: e.target.value })}
                      className="w-full p-2 bg-white border border-gray-200 rounded-xl focus:outline-none"
                    >
                      {seasons.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Conditional Fields based on isComposite */}
                {!newProd.isComposite ? (
                  /* STANDARD PRODUCT: SIZES & COLORS SELECTION */
                  <div className="p-4 bg-blue-50/30 border border-blue-100 rounded-xl space-y-4">
                    <div className="flex justify-between items-center">
                      <h5 className="font-bold text-blue-900 flex items-center gap-1">
                        <Sparkles size={14} />
                        توليد الألوان والمقاسات (Apparel Matrix Grid)
                      </h5>
                      <span className="text-[10px] text-gray-400">سيقوم النظام بتوليد SKU تلقائي لكل مزيج</span>
                    </div>

                    {/* Sizes Selection */}
                    <div className="space-y-1.5">
                      <span className="block font-bold text-gray-700">المقاسات المتوفرة لهذه الثياب (Sizes):</span>
                      <div className="flex flex-wrap gap-2">
                        {sizes.map(sz => {
                          const active = selectedSizes.includes(sz.code);
                          return (
                            <button 
                              type="button"
                              key={sz.code}
                              onClick={() => handleSizeToggle(sz.code)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1 ${
                                active ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-white text-gray-600 border-gray-200'
                              }`}
                            >
                              {active && <Check size={12} />}
                              {sz.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Colors Selection */}
                    <div className="space-y-1.5">
                      <span className="block font-bold text-gray-700">الألوان المتوفرة لهذه الثياب (Colors):</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {colors.map(col => {
                          const active = selectedColors.includes(col.code);
                          return (
                            <button 
                              type="button"
                              key={col.code}
                              onClick={() => handleColorToggle(col.code)}
                              className={`p-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-2 text-right ${
                                active ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs' : 'bg-white text-gray-600 border-gray-200'
                              }`}
                            >
                              <div 
                                className="w-4 h-4 rounded-full border border-gray-200 shadow-inner" 
                                style={{ backgroundColor: col.hex }}
                              />
                              <span className="truncate flex-1">{col.name}</span>
                              {active && <Check size={12} className="text-blue-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* COMPOSITE PRODUCT: SPECIFY ITEMS IN THE BUNDLE */
                  <div className="p-4 bg-purple-50/30 border border-purple-100 rounded-xl space-y-3">
                    <h5 className="font-bold text-purple-900">مكونات ومحتويات الطقم المركب (Composition items)</h5>
                    <p className="text-[10px] text-gray-500">اختر الأصناف الفردية التي تؤلف هذا الطقم.</p>

                    {/* Add row */}
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-[10px] text-gray-400 mb-1">اختر الصنف الفردي</label>
                        <select 
                          value={selectedComponentToAdd}
                          onChange={(e) => setSelectedComponentToAdd(e.target.value)}
                          className="w-full p-2 bg-white border border-gray-200 rounded-xl"
                        >
                          <option value="">-- اختر صنف للمجموعة --</option>
                          {products.filter(p => !p.isComposite).map(p => (
                            <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-20">
                        <label className="block text-[10px] text-gray-400 mb-1">الكمية</label>
                        <input 
                          type="number" 
                          min="1" 
                          value={componentQty} 
                          onChange={(e) => setComponentQty(parseInt(e.target.value) || 1)}
                          className="w-full p-2 border border-gray-200 rounded-xl text-center"
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={handleAddComponent}
                        className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold"
                      >
                        إضافة
                      </button>
                    </div>

                    {/* Component list */}
                    <div className="space-y-1 pt-2">
                      {compositeItems.map(item => {
                        const targetProd = products.find(p => p.code === item.productCode);
                        return (
                          <div 
                            key={item.productCode} 
                            className="p-2 bg-white border border-gray-100 rounded-lg flex justify-between items-center text-xs"
                          >
                            <span>
                              <span className="font-bold text-gray-800">{targetProd?.name || item.productCode}</span>
                              <span className="text-[10px] text-gray-400 block">كود: {item.productCode}</span>
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="bg-purple-100 text-purple-800 font-mono font-bold px-2 py-0.5 rounded text-[11px]">
                                {item.quantity} قطع
                              </span>
                              <button 
                                type="button" 
                                onClick={() => handleRemoveComponent(item.productCode)}
                                className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {compositeItems.length === 0 && (
                        <div className="text-center py-4 text-gray-400 text-[11px]">
                          لم يتم تحديد أي مكونات بعد.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Footer buttons inside the form */}
                <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                  <button 
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-100 transition-all"
                  >
                    إلغاء
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/10"
                  >
                    تأكيد وحفظ الصنف
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Product Detail Matrix PopUp */}
      <AnimatePresence>
        {selectedProductDetails && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-blue-950 text-white">
                <div>
                  <h4 className="text-sm font-bold flex items-center gap-1.5">
                    <span>👕</span>
                    بطاقة تفاصيل الصنف الملبسي
                  </h4>
                  <p className="text-[10px] text-blue-200 mt-0.5">تفاصيل المقاسات والألوان والأسعار للأصناف</p>
                </div>
                <button 
                  onClick={() => setSelectedProductDetails(null)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                {/* Product Name & Code */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className={`w-10 h-10 rounded-xl ${selectedProductDetails.imageColor || 'bg-blue-600'} flex items-center justify-center text-white text-xl shrink-0`}>
                    {selectedProductDetails.isComposite ? '📦' : '👕'}
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-800 text-sm">{selectedProductDetails.name}</h5>
                    <p className="text-[10px] text-gray-400 font-mono font-bold">كود المنتج: {selectedProductDetails.code}</p>
                    {selectedProductDetails.description && (
                      <p className="text-[10px] text-gray-500 mt-1">{selectedProductDetails.description}</p>
                    )}
                  </div>
                </div>

                {/* Prices & Profit info */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="block text-[10px] text-gray-400">سعر الشراء</span>
                    <span className="font-mono font-bold text-gray-700 text-xs">{selectedProductDetails.buyPrice.toFixed(2)} ج.م</span>
                  </div>
                  <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                    <span className="block text-[10px] text-blue-500">سعر البيع</span>
                    <span className="font-mono font-extrabold text-blue-900 text-xs">{selectedProductDetails.sellPrice.toFixed(2)} ج.م</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="block text-[10px] text-emerald-500">الربح المتوقع</span>
                    <span className="font-mono font-bold text-emerald-800 text-xs">
                      {(selectedProductDetails.sellPrice - selectedProductDetails.buyPrice).toFixed(2)} ج.م
                    </span>
                  </div>
                </div>

                {/* Conditional composition or matrix variants */}
                {selectedProductDetails.isComposite ? (
                  /* COMPOSITE */
                  <div className="space-y-2">
                    <span className="font-bold text-gray-700 block">مكونات هذا الطقم المركب:</span>
                    <div className="space-y-1 max-h-[160px] overflow-y-auto">
                      {selectedProductDetails.composition?.map(item => {
                        const subProd = products.find(p => p.code === item.productCode);
                        return (
                          <div key={item.productCode} className="p-2 bg-purple-50/40 border border-purple-100 rounded-lg flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-700">{subProd?.name || item.productCode}</span>
                            <span className="font-mono bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold">
                              {item.quantity} قطع
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* STANDARD VARIANTS */
                  <div className="space-y-2">
                    <span className="font-bold text-gray-700 block">توليفة المقاسات والباركودات المولدة:</span>
                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                      {selectedProductDetails.variants.map((variant, idx) => {
                        const sObj = sizes.find(s => s.code === variant.sizeCode);
                        const cObj = colors.find(c => c.code === variant.colorCode);
                        return (
                          <div 
                            key={idx} 
                            className="p-2 bg-white border border-gray-100 rounded-lg flex justify-between items-center"
                          >
                            <div className="flex items-center gap-2">
                              {cObj && (
                                <div 
                                  className="w-3.5 h-3.5 rounded-full border border-gray-200 shadow-inner" 
                                  style={{ backgroundColor: cObj.hex }}
                                  title={cObj.name}
                                />
                              )}
                              <span className="font-bold text-gray-700">
                                {sObj?.name || variant.sizeCode}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                ({variant.sku})
                              </span>
                            </div>
                            <span className="font-mono text-[10px] text-gray-500 font-bold">
                              {variant.barcode}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={() => setSelectedProductDetails(null)}
                  className="px-4 py-1.5 bg-blue-900 text-white text-xs font-bold rounded-xl hover:bg-blue-950 transition-all"
                >
                  حسناً، إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
