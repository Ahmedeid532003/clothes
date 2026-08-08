/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  Coins,
  Package,
  ArrowRightLeft,
  AlertTriangle,
  Tag,
  Percent,
  ArrowUpRight,
  Plus,
  Sparkles,
} from 'lucide-react';
import { fetchMgmtDashboard, type MgmtDashboardDto } from '@/lib/api/inventory';
import { cacheKey, peekCached } from '@/lib/api/request-cache';

interface DashboardInsightsProps {
  onNavigateToTab: (tabId: string) => void;
}

function num(value: string | number | undefined) {
  const n = typeof value === 'number' ? value : parseFloat(value ?? '0');
  return Number.isFinite(n) ? n : 0;
}

function permitStatusLabel(status: string) {
  if (status === 'approved') return 'معتمد ومرحل';
  if (status === 'draft') return 'مسودة معلقة';
  if (status === 'pending') return 'بانتظار موافقة المدير';
  return status;
}

function permitTypeLabel(type: MgmtDashboardDto['recent_permits'][0]['type']) {
  if (type === 'disbursement') return 'إذن صرف';
  if (type === 'addition') return 'إذن إضافة';
  if (type === 'scrap') return 'إذن هالك';
  return 'إذن تحويل';
}

function permitTypeColor(type: MgmtDashboardDto['recent_permits'][0]['type']) {
  if (type === 'disbursement') return 'text-red-700 bg-red-50 border-red-200';
  if (type === 'addition') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (type === 'scrap') return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-blue-700 bg-blue-50 border-blue-200';
}

export default function DashboardInsights({ onNavigateToTab }: DashboardInsightsProps) {
  const [dash, setDash] = useState<MgmtDashboardDto | null>(
    () => peekCached<MgmtDashboardDto>(cacheKey('/inventory/mgmt-dashboard/')),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    void fetchMgmtDashboard()
      .then((data) => {
        if (!cancelled) setDash(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'تعذر تحميل لوحة المؤشرات');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = dash?.summary;
  const totalStockQuantity = num(summary?.total_stock_quantity);
  const totalValueBuyPrice = num(summary?.total_purchase_value);
  const totalValueSellPrice = num(summary?.total_sale_value);
  const estimatedProfitMargin = num(summary?.profit_margin_percent);

  const categoryDistribution = useMemo(
    () =>
      (dash?.stock_by_classification ?? []).map((row) => ({
        code: row.classification_code,
        name: row.classification_name,
        qty: num(row.quantity),
        value: num(row.sale_value),
      })),
    [dash],
  );

  const stockValueByWarehouse = useMemo(
    () =>
      (dash?.stock_by_warehouse ?? []).map((row) => ({
        name: row.warehouse_name || row.warehouse_code,
        qty: num(row.quantity),
        value: num(row.sale_value),
      })),
    [dash],
  );

  const lowStockAlerts = dash?.low_stock_alerts ?? [];
  const compositeProducts = dash?.composite_products ?? [];
  const recentPermits = dash?.recent_permits ?? [];

  return (
    <div dir="rtl" className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-radial from-blue-900/10 to-transparent p-6 rounded-2xl border border-blue-500/10">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
            نظرة عامة على لوحة إدارة المنتجات والمخزون
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            بيانات حية من قاعدة البيانات — أرصدة، تقييم، تنبيهات حد الطلب، وآخر الحركات.
            {summary ? (
              <span className="ms-2 text-blue-600 font-semibold">
                ({summary.products_count} صنف · {summary.composite_products_count} طقم مركب)
              </span>
            ) : null}
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <button
            type="button"
            onClick={() => onNavigateToTab('setup')}
            className="px-4 py-2 text-xs font-semibold bg-white border border-gray-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-all flex items-center gap-1 shadow-sm"
          >
            <Tag size={14} />
            تهيئة مواصفات الملابس
          </button>
          <button
            type="button"
            onClick={() => onNavigateToTab('permits')}
            className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1 shadow-md shadow-blue-500/20"
          >
            <Plus size={14} />
            إصدار إذن مخزني جديد
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-8 -mt-8" />
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-400">إجمالي كمية البضائع</span>
              <h3 className="text-3xl font-extrabold text-blue-900 tracking-tight">
                {totalStockQuantity.toLocaleString('ar-EG')}{' '}
                <span className="text-sm font-medium text-blue-500">قطعة</span>
              </h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <Package size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 py-1 px-2.5 rounded-lg w-max font-medium">
            <TrendingUp size={12} />
            <span>متوفر في المستودعات</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-8 -mt-8" />
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-400">القيمة الإجمالية بالشراء</span>
              <h3 className="text-3xl font-extrabold text-gray-800 tracking-tight">
                {totalValueBuyPrice.toLocaleString('ar-EG', { minimumFractionDigits: 1 })}{' '}
                <span className="text-sm font-medium text-gray-500">ج.م</span>
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <Coins size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 py-1 px-2.5 rounded-lg w-max font-medium">
            <span>رأس مال المخزون الحالي</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl -mr-8 -mt-8" />
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-400">القيمة الإجمالية بالبيع</span>
              <h3 className="text-3xl font-extrabold text-indigo-900 tracking-tight">
                {totalValueSellPrice.toLocaleString('ar-EG', { minimumFractionDigits: 1 })}{' '}
                <span className="text-sm font-medium text-indigo-500">ج.م</span>
              </h3>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
              <TrendingUp size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 py-1 px-2.5 rounded-lg w-max font-medium">
            <span>القيمة السوقية للمعروض</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -mr-8 -mt-8" />
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-400">معدل الربحية المتوقع</span>
              <h3 className="text-3xl font-extrabold text-amber-900 tracking-tight">
                {estimatedProfitMargin.toFixed(1)}
                <span className="text-xl font-medium text-amber-500">%</span>
              </h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
              <Percent size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 py-1 px-2.5 rounded-lg w-max font-medium">
            <span>متوسط الفرق بين البيع والشراء</span>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-50">
            <h4 className="text-sm font-bold text-gray-800">توزيع المخزون حسب التصنيفات</h4>
            <span className="text-xs text-gray-400 font-medium">حسب القيمة البيعية</span>
          </div>
          <div className="space-y-4 pt-2">
            {categoryDistribution.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-6">لا توجد أرصدة مصنّفة حالياً.</p>
            ) : (
              categoryDistribution.map((item, index) => {
                const maxVal = Math.max(...categoryDistribution.map((c) => c.value)) || 1;
                const ratio = (item.value / maxVal) * 100;
                const percentageOfTotal = totalValueSellPrice
                  ? (item.value / totalValueSellPrice) * 100
                  : 0;
                const barColors = [
                  'bg-blue-600',
                  'bg-emerald-500',
                  'bg-purple-500',
                  'bg-amber-500',
                  'bg-teal-500',
                ];
                return (
                  <div key={item.code} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-gray-700">{item.name}</span>
                      <span className="text-gray-500 font-mono">
                        {item.value.toLocaleString('ar-EG')} ج.م ({percentageOfTotal.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-gray-50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${ratio}%` }}
                        transition={{ duration: 0.6, delay: index * 0.1 }}
                        className={`h-full rounded-full ${barColors[index % barColors.length]}`}
                      />
                    </div>
                    <div className="text-[10px] text-gray-400">الكمية: {item.qty.toLocaleString('ar-EG')} قطعة</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-50">
            <h4 className="text-sm font-bold text-gray-800">أرصدة وتقييم المستودعات والمنافذ</h4>
            <span className="text-xs text-gray-400 font-medium">عدد قطع البضائع</span>
          </div>
          <div className="space-y-4 pt-2">
            {stockValueByWarehouse.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-6">لا توجد أرصدة في المستودعات.</p>
            ) : (
              stockValueByWarehouse.map((w) => {
                const maxQty = Math.max(...stockValueByWarehouse.map((item) => item.qty)) || 1;
                const barRatio = (w.qty / maxQty) * 100;
                return (
                  <div
                    key={w.name}
                    className="p-3 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/10 transition-all"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        {w.name}
                      </span>
                      <span className="text-xs font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                        {w.qty.toLocaleString('ar-EG')} قطعة
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-1">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barRatio}%` }}
                        transition={{ duration: 0.5 }}
                        className="bg-blue-500 h-full rounded-full"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 font-medium mt-1">
                      <span>قيمة مخزون البيع: {w.value.toLocaleString('ar-EG')} ج.م</span>
                      <button
                        type="button"
                        className="text-blue-600 hover:underline cursor-pointer"
                        onClick={() => onNavigateToTab('inventory')}
                      >
                        عرض الأرصدة ←
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-50">
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 text-amber-600">
              <AlertTriangle size={16} />
              تنبيهات حد الطلب (الموسم الحالي)
            </h4>
            <span className="text-xs text-amber-500 bg-amber-50 px-2 py-0.5 rounded font-mono">
              {lowStockAlerts.length} أصناف
            </span>
          </div>
          {dash?.reorder_warning ? (
            <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{dash.reorder_warning}</p>
          ) : null}
          <div className="space-y-3 overflow-y-auto max-h-[260px] pr-1">
            {lowStockAlerts.map((prod) => (
              <div
                key={prod.product_code}
                className="flex items-center justify-between p-2.5 bg-amber-50/40 rounded-xl border border-amber-100/50 text-xs hover:bg-amber-50 transition-all"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-8 bg-amber-400 rounded-full" />
                  <div>
                    <h5 className="font-bold text-gray-800 truncate max-w-[120px]">{prod.product_name}</h5>
                    <p className="text-[10px] text-gray-500 font-mono">الكود: {prod.product_code}</p>
                  </div>
                </div>
                <div className="text-left">
                  <span className="font-mono font-bold text-amber-700 block">
                    {num(prod.remaining_qty).toLocaleString('ar-EG')} قطعة
                  </span>
                  <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                    حد {num(prod.threshold_qty).toLocaleString('ar-EG')} ({prod.reorder_percent}%)
                  </span>
                </div>
              </div>
            ))}
            {lowStockAlerts.length === 0 && !dash?.reorder_warning ? (
              <div className="text-center py-8 text-gray-400 text-xs">
                لا توجد تنبيهات حد طلب حالياً — مستويات البضاعة ضمن الحدود.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-50">
          <div>
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500 animate-pulse shrink-0" />
              الأطقم والأصناف المركبة
            </h4>
            <p className="text-[11px] text-gray-400 mt-0.5">من سجل الأصناف المركبة في قاعدة البيانات.</p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-xl font-bold">
              {compositeProducts.length} أطقم
            </span>
            <button
              type="button"
              onClick={() => onNavigateToTab('style-builder')}
              className="px-3.5 py-1.5 bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-1 cursor-pointer"
            >
              <Plus size={14} />
              تصميم طقم جديد ✨
            </button>
          </div>
        </div>

        {compositeProducts.length === 0 ? (
          <div className="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-150 space-y-3">
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto text-xl">
              ✨
            </div>
            <h5 className="text-xs font-bold text-gray-700">لا توجد أصناف مركبة مسجّلة</h5>
            <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
              أنشئ أطقم مبيعات من شاشة «منسق ومصمم الأطقم» لتظهر هنا تلقائياً.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {compositeProducts.map((p) => (
              <div
                key={p.code}
                className="bg-white p-4 rounded-xl border border-gray-100 hover:border-blue-150 hover:shadow-md transition-all group flex flex-col justify-between relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-blue-50/5 to-transparent pointer-events-none" />
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs">
                        📦
                      </div>
                      <div>
                        <h5 className="font-extrabold text-xs text-gray-800 group-hover:text-blue-900 transition-colors">
                          {p.name}
                        </h5>
                        <span className="font-mono text-[9px] text-gray-400 block font-semibold">الكود: {p.code}</span>
                      </div>
                    </div>
                  </div>
                  {p.description ? (
                    <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed mb-4">{p.description}</p>
                  ) : null}
                </div>
                <div className="pt-3 border-t border-gray-50 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block">سعر البيع</span>
                    <span className="font-mono font-bold text-blue-600 text-sm">
                      {num(p.sell_price).toFixed(1)} ج.م
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('catalog')}
                    className="px-2.5 py-1 bg-gray-50 hover:bg-blue-50 text-blue-600 border border-gray-150 hover:border-blue-200 rounded-lg text-[10px] font-bold transition-all flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>عرض بالدليل</span>
                    <ArrowUpRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center pb-4 border-b border-gray-50 mb-4">
          <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
            <ArrowRightLeft size={16} className="text-blue-600" />
            آخر حركة البضائع والأذونات المخزنية
          </h4>
          <button
            type="button"
            onClick={() => onNavigateToTab('permits')}
            className="text-xs text-blue-600 hover:underline cursor-pointer font-semibold"
          >
            إدارة كافة الأذونات ←
          </button>
        </div>

        {recentPermits.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-6">لا توجد أذونات مسجّلة بعد.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentPermits.map((permit) => {
              const isApproved = permit.status === 'approved';
              const isDraft = permit.status === 'draft';
              return (
                <div
                  key={`${permit.type}-${permit.code}`}
                  className="p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 shadow-xs relative flex flex-col justify-between hover:scale-[1.01] transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-gray-500 font-mono">#{permit.code}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${permitTypeColor(permit.type)}`}
                      >
                        {permitTypeLabel(permit.type)}
                      </span>
                    </div>
                    <div className="space-y-1 my-3 text-xs">
                      <p className="text-gray-700 font-semibold">{permit.purpose || '—'}</p>
                      <p className="text-gray-400 text-[11px]">التاريخ: {permit.date}</p>
                      <div className="pt-2 border-t border-dashed border-gray-100 mt-2 space-y-1 text-gray-600 text-[11px]">
                        {permit.from_warehouse_name ? (
                          <p>
                            <span className="font-bold text-gray-400">من:</span> {permit.from_warehouse_name}
                          </p>
                        ) : null}
                        {permit.to_warehouse_name ? (
                          <p>
                            <span className="font-bold text-gray-400">إلى:</span> {permit.to_warehouse_name}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-50 text-[10px]">
                    <span className="text-gray-500">
                      {num(permit.items_qty).toLocaleString('ar-EG')} قطع مأذونة
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        isApproved
                          ? 'bg-emerald-50 text-emerald-700'
                          : isDraft
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {permitStatusLabel(permit.status)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
