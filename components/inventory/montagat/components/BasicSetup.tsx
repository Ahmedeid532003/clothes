/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  ChevronDown,
  Layers,
  Maximize2,
  Minimize2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { ErpAddButton } from '@/components/erp/ErpAddButton';
import { Season, Department, Brand, Classification, Size, Color } from '../types';

type SetupSectionId = 'season' | 'department' | 'classification' | 'brand' | 'size' | 'color';

interface BasicSetupProps {
  seasons: Season[];
  departments: Department[];
  brands: Brand[];
  classifications: Classification[];
  sizes: Size[];
  colors: Color[];

  onAddSeason: (season: Season) => void;
  onDeleteSeason: (code: string) => void;

  onAddDepartment: (dep: Department) => void;
  onDeleteDepartment: (code: string) => void;

  onAddBrand: (brand: Brand) => void;
  onDeleteBrand: (code: string) => void;

  onAddClassification: (cls: Classification) => void;
  onDeleteClassification: (code: string) => void;

  onAddSize: (sz: Size) => void;
  onDeleteSize: (code: string) => void;

  onAddColor: (color: Color) => void;
  onDeleteColor: (code: string) => void;
}

function SetupCircleBtn({
  isActive = false,
  onClick,
  ariaLabel,
  title,
  children,
}: {
  isActive?: boolean;
  onClick: () => void;
  ariaLabel: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`hr-structure-circle-btn ${isActive ? 'is-active' : ''}`}
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
    >
      <span className="hr-structure-expand-btn-glow" aria-hidden />
      <span className="hr-structure-expand-btn-ring" aria-hidden />
      <span className="hr-structure-expand-btn-core">{children}</span>
    </button>
  );
}

function SetupSectionCard({
  sectionId,
  title,
  count,
  description,
  addLabel,
  onAdd,
  isFocused,
  isHidden,
  onToggleFocus,
  children,
}: {
  sectionId: SetupSectionId;
  title: string;
  count: number;
  description?: string;
  addLabel: string;
  onAdd: () => void;
  isFocused: boolean;
  isHidden: boolean;
  onToggleFocus: (id: SetupSectionId) => void;
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const cardRef = React.useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isFocused || !cardRef.current) return;
    cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [isFocused]);

  if (isHidden) return null;

  return (
    <article
      ref={cardRef}
      data-section={sectionId}
      className={`hr-structure-card ${isFocused ? 'is-focused' : ''} ${isCollapsed ? 'is-collapsed' : ''}`}
    >
      <header className="hr-structure-card-header">
        <div className="hr-structure-card-title-wrap">
          <SetupCircleBtn
            isActive={!isCollapsed}
            onClick={() => setIsCollapsed((v) => !v)}
            ariaLabel={isCollapsed ? 'إظهار البيانات' : 'إخفاء البيانات'}
            title={isCollapsed ? 'إظهار البيانات' : 'إخفاء البيانات'}
          >
            <ChevronDown className="hr-structure-expand-icon" strokeWidth={2.75} />
          </SetupCircleBtn>
          <h3>{title}</h3>
          <span className="hr-structure-count">{count}</span>
          {isFocused ? <span className="hr-structure-focused-badge">وضع التركيز</span> : null}
        </div>
        <div className="hr-structure-card-actions">
          <SetupCircleBtn
            isActive={isFocused}
            onClick={() => onToggleFocus(sectionId)}
            ariaLabel={isFocused ? 'إلغاء التكبير' : 'تكبير القسم'}
            title={isFocused ? 'إلغاء التكبير' : 'تكبير القسم'}
          >
            {isFocused ? (
              <Minimize2 className="hr-structure-focus-icon" strokeWidth={2.5} />
            ) : (
              <Maximize2 className="hr-structure-focus-icon" strokeWidth={2.5} />
            )}
          </SetupCircleBtn>
          <ErpAddButton onClick={onAdd}>{addLabel}</ErpAddButton>
        </div>
      </header>
      <div className="hr-structure-card-panel">
        <div className="hr-structure-card-panel-inner">
          {description ? <p className="hr-structure-card-desc">{description}</p> : null}
          <div className="hr-structure-card-body">{children}</div>
        </div>
      </div>
    </article>
  );
}

export default function BasicSetup({
  seasons,
  departments,
  brands,
  classifications,
  sizes,
  colors,
  onAddSeason,
  onDeleteSeason,
  onAddDepartment,
  onDeleteDepartment,
  onAddBrand,
  onDeleteBrand,
  onAddClassification,
  onDeleteClassification,
  onAddSize,
  onDeleteSize,
  onAddColor,
  onDeleteColor,
}: BasicSetupProps) {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [focusedSection, setFocusedSection] = useState<SetupSectionId | null>(null);
  const [seasonForm, setSeasonForm] = useState({
    name: '',
    isOpen: true,
    isCurrent: false,
    startDate: '',
    endDate: '',
  });
  const [depForm, setDepForm] = useState({ name: '' });
  const [brandForm, setBrandForm] = useState({ name: '' });
  const [clsForm, setClsForm] = useState({ name: '' });
  const [sizeForm, setSizeForm] = useState({ name: '' });
  const [colorForm, setColorForm] = useState({ name: '', hex: '#2563EB' });
  const [errorMsg, setErrorMsg] = useState('');

  const toggleSectionFocus = (id: SetupSectionId) => {
    setFocusedSection((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    if (!focusedSection) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFocusedSection(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusedSection]);

  const sectionFocusProps = (id: SetupSectionId) => ({
    sectionId: id,
    isFocused: focusedSection === id,
    isHidden: focusedSection != null && focusedSection !== id,
    onToggleFocus: toggleSectionFocus,
  });

  const validateAndSubmit = (type: string) => {
    setErrorMsg('');
    if (type === 'season') {
      if (!seasonForm.name.trim()) {
        setErrorMsg('الرجاء إدخال اسم الموسم!');
        return;
      }
      onAddSeason({ code: '', ...seasonForm, name: seasonForm.name.trim() });
      setSeasonForm({ name: '', isOpen: true, isCurrent: false, startDate: '', endDate: '' });
    } else if (type === 'department') {
      if (!depForm.name.trim()) {
        setErrorMsg('الرجاء إدخال اسم القسم!');
        return;
      }
      onAddDepartment({ code: '', name: depForm.name.trim() });
      setDepForm({ name: '' });
    } else if (type === 'brand') {
      if (!brandForm.name.trim()) {
        setErrorMsg('الرجاء إدخال اسم الماركة!');
        return;
      }
      onAddBrand({ code: '', name: brandForm.name.trim() });
      setBrandForm({ name: '' });
    } else if (type === 'classification') {
      if (!clsForm.name.trim()) {
        setErrorMsg('الرجاء إدخال اسم التصنيف!');
        return;
      }
      onAddClassification({ code: '', name: clsForm.name.trim() });
      setClsForm({ name: '' });
    } else if (type === 'size') {
      if (!sizeForm.name.trim()) {
        setErrorMsg('الرجاء إدخال مسمى المقاس!');
        return;
      }
      onAddSize({ code: '', name: sizeForm.name.trim() });
      setSizeForm({ name: '' });
    } else if (type === 'color') {
      if (!colorForm.name.trim()) {
        setErrorMsg('الرجاء إدخال اسم اللون!');
        return;
      }
      onAddColor({ code: '', name: colorForm.name.trim(), hex: colorForm.hex });
      setColorForm({ name: '', hex: '#2563EB' });
    }
    setActiveModal(null);
  };

  const openModal = (type: string) => {
    setErrorMsg('');
    setActiveModal(type);
  };

  return (
    <div dir="rtl" className={`space-y-6 hr-job-structure-page ${focusedSection ? 'is-section-focused' : ''}`}>
      {focusedSection ? (
        <button
          type="button"
          className="hr-structure-focus-backdrop"
          onClick={() => setFocusedSection(null)}
          aria-label="إلغاء التكبير"
        />
      ) : null}

      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-xl font-extrabold text-blue-900 tracking-tight flex items-center gap-2">
          <Layers className="text-blue-600" />
          تهيئة مواصفات الملابس والتصنيفات
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          إعداد وتعديل المحددات الأساسية للألبسة كالمقاسات والألوان والمواسم.
        </p>
      </div>

      <div className="hr-structure-grid grid gap-4 lg:grid-cols-2">
        <SetupSectionCard
          {...sectionFocusProps('season')}
          title="إدارة مواسم الملابس"
          count={seasons.length}
          description="تنظيم البضائع وتسهيل الجرد والتقييم السنوي للمواسم"
          addLabel="إضافة موسم"
          onAdd={() => openModal('season')}
        >
          {seasons.length === 0 ? (
            <p className="hr-structure-empty">لا توجد مواسم مسجّلة</p>
          ) : (
            seasons.map((season) => (
              <div
                key={season.code}
                className={`hr-structure-item hr-structure-item-boxed ${
                  season.isCurrent ? 'border-blue-200 bg-blue-50/40' : ''
                }`}
              >
                <div className="hr-structure-item-body">
                  <strong>{season.name}</strong>
                  {season.isCurrent ? (
                    <span className="hr-structure-badge-add">الموسم الحالي</span>
                  ) : null}
                  <span>
                    الفترة: {season.startDate || '—'} إلى {season.endDate || '—'}
                  </span>
                </div>
                <div className="hr-structure-item-actions">
                  <button
                    type="button"
                    className="hr-structure-icon-btn hr-structure-icon-delete"
                    onClick={() => onDeleteSeason(season.code)}
                    disabled={season.isCurrent}
                    title={season.isCurrent ? 'لا يمكن حذف الموسم الحالي' : 'حذف'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </SetupSectionCard>

        <SetupSectionCard
          {...sectionFocusProps('department')}
          title="أقسام المعرض الرئيسية"
          count={departments.length}
          description="تقسيم الملابس حسب الجنس أو الفئة العمرية"
          addLabel="إضافة قسم"
          onAdd={() => openModal('department')}
        >
          {departments.length === 0 ? (
            <p className="hr-structure-empty">لا توجد أقسام مسجّلة</p>
          ) : (
            departments.map((dep) => (
              <div key={dep.code} className="hr-structure-item">
                <span className="hr-structure-dot bg-indigo-500" />
                <div className="hr-structure-item-body">
                  <strong>{dep.name}</strong>
                </div>
                <div className="hr-structure-item-actions">
                  <button
                    type="button"
                    className="hr-structure-icon-btn hr-structure-icon-delete"
                    onClick={() => onDeleteDepartment(dep.code)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </SetupSectionCard>

        <SetupSectionCard
          {...sectionFocusProps('classification')}
          title="تصنيفات الملابس"
          count={classifications.length}
          description="تصنيف نوع الثياب لتسريع الفرز والجرد"
          addLabel="إضافة تصنيف"
          onAdd={() => openModal('classification')}
        >
          {classifications.length === 0 ? (
            <p className="hr-structure-empty">لا توجد تصنيفات مسجّلة</p>
          ) : (
            classifications.map((cls) => (
              <div key={cls.code} className="hr-structure-item">
                <span className="hr-structure-dot bg-emerald-500" />
                <div className="hr-structure-item-body">
                  <strong>{cls.name}</strong>
                </div>
                <div className="hr-structure-item-actions">
                  <button
                    type="button"
                    className="hr-structure-icon-btn hr-structure-icon-delete"
                    onClick={() => onDeleteClassification(cls.code)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </SetupSectionCard>

        <SetupSectionCard
          {...sectionFocusProps('brand')}
          title="براندات الملابس"
          count={brands.length}
          description="العلامات التجارية والشركات المصنّعة"
          addLabel="إضافة ماركة"
          onAdd={() => openModal('brand')}
        >
          {brands.length === 0 ? (
            <p className="hr-structure-empty">لا توجد ماركات مسجّلة</p>
          ) : (
            brands.map((brand) => (
              <div key={brand.code} className="hr-structure-item">
                <span className="hr-structure-dot bg-amber-500" />
                <div className="hr-structure-item-body">
                  <strong>{brand.name}</strong>
                </div>
                <div className="hr-structure-item-actions">
                  <button
                    type="button"
                    className="hr-structure-icon-btn hr-structure-icon-delete"
                    onClick={() => onDeleteBrand(brand.code)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </SetupSectionCard>

        <SetupSectionCard
          {...sectionFocusProps('size')}
          title="محدد المقاسات"
          count={sizes.length}
          description="إدارة دليل مقاسات الثياب (S, M, L, XL…)"
          addLabel="إضافة مقاس"
          onAdd={() => openModal('size')}
        >
          {sizes.length === 0 ? (
            <p className="hr-structure-empty">لا توجد مقاسات مسجّلة</p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {sizes.map((sz) => (
                <div
                  key={sz.code}
                  className="py-2 px-4 bg-purple-50/40 border border-purple-100 rounded-xl flex items-center gap-3"
                >
                  <span className="text-xs font-extrabold text-purple-900">{sz.name}</span>
                  <button
                    type="button"
                    onClick={() => onDeleteSize(sz.code)}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md"
                    title="حذف المقاس"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </SetupSectionCard>

        <SetupSectionCard
          {...sectionFocusProps('color')}
          title="محدد الألوان"
          count={colors.length}
          description="تكويد الألوان مع معاينة مباشرة"
          addLabel="إضافة لون"
          onAdd={() => openModal('color')}
        >
          {colors.length === 0 ? (
            <p className="hr-structure-empty">لا توجد ألوان مسجّلة</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {colors.map((color) => (
                <div
                  key={color.code}
                  className="p-2.5 bg-white border border-gray-100 rounded-xl flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 truncate">
                    <div
                      className="w-5 h-5 rounded-full border border-gray-200 shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="truncate">
                      <span className="text-xs font-bold text-gray-800 block truncate">{color.name}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteColor(color.code)}
                    className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </SetupSectionCard>
      </div>

      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-blue-900 text-white">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <Plus size={16} />
                  {activeModal === 'season' && 'إضافة موسم ملابس جديد'}
                  {activeModal === 'department' && 'إضافة قسم معرض رئيسي'}
                  {activeModal === 'brand' && 'إضافة براند ملابس جديد'}
                  {activeModal === 'classification' && 'إضافة تصنيف ملابس جديد'}
                  {activeModal === 'size' && 'إضافة مقاس جديد'}
                  {activeModal === 'color' && 'إضافة لون جديد للثياب'}
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {errorMsg ? (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-100">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                ) : null}

                {activeModal === 'season' && (
                  <div className="space-y-3.5">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">اسم ومسمى الموسم *</label>
                      <input
                        type="text"
                        value={seasonForm.name}
                        onChange={(e) => setSeasonForm({ ...seasonForm, name: e.target.value })}
                        placeholder="مثال: موسم الصيف 2026"
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1">تاريخ البدء</label>
                        <input
                          type="date"
                          value={seasonForm.startDate}
                          onChange={(e) => setSeasonForm({ ...seasonForm, startDate: e.target.value })}
                          className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1">تاريخ الانتهاء</label>
                        <input
                          type="date"
                          value={seasonForm.endDate}
                          onChange={(e) => setSeasonForm({ ...seasonForm, endDate: e.target.value })}
                          className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                      <input
                        type="checkbox"
                        id="isCurrent"
                        checked={seasonForm.isCurrent}
                        onChange={(e) => setSeasonForm({ ...seasonForm, isCurrent: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                      />
                      <label htmlFor="isCurrent" className="text-xs font-bold text-gray-700 cursor-pointer">
                        تعيين كموسم حالي فعّال
                      </label>
                    </div>
                  </div>
                )}

                {activeModal === 'department' && (
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">اسم القسم *</label>
                    <input
                      type="text"
                      value={depForm.name}
                      onChange={(e) => setDepForm({ name: e.target.value })}
                      placeholder="مثال: قسم الملابس الرياضية"
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                {activeModal === 'brand' && (
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">اسم العلامة التجارية *</label>
                    <input
                      type="text"
                      value={brandForm.name}
                      onChange={(e) => setBrandForm({ name: e.target.value })}
                      placeholder="مثال: غوتشي - Gucci"
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                {activeModal === 'classification' && (
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">اسم التصنيف *</label>
                    <input
                      type="text"
                      value={clsForm.name}
                      onChange={(e) => setClsForm({ name: e.target.value })}
                      placeholder="مثال: بناطيل جينز سليم فيت"
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                {activeModal === 'size' && (
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">مسمى المقاس *</label>
                    <input
                      type="text"
                      value={sizeForm.name}
                      onChange={(e) => setSizeForm({ name: e.target.value })}
                      placeholder="مثال: لارج - L"
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                {activeModal === 'color' && (
                  <div className="space-y-3.5">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">اسم اللون *</label>
                      <input
                        type="text"
                        value={colorForm.name}
                        onChange={(e) => setColorForm({ ...colorForm, name: e.target.value })}
                        placeholder="مثال: بنفسجي غامق"
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">درجة اللون</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={colorForm.hex}
                          onChange={(e) => setColorForm({ ...colorForm, hex: e.target.value })}
                          className="w-12 h-10 border border-gray-200 rounded-xl cursor-pointer p-0 shrink-0"
                        />
                        <input
                          type="text"
                          value={colorForm.hex}
                          onChange={(e) => setColorForm({ ...colorForm, hex: e.target.value })}
                          placeholder="#000000"
                          className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-100"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => validateAndSubmit(activeModal)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  حفظ البيانات
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
