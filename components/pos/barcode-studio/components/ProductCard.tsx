/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Tag, ShoppingCart, Info, Check } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  key?: string | number;
  product: Product;
  onAddToCart: (product: Product) => void;
  onSelectProductForLabel: (product: Product) => void;
  isInCart?: boolean;
}

export default function ProductCard({
  product,
  onAddToCart,
  onSelectProductForLabel,
  isInCart = false,
}: ProductCardProps) {
  const [showSpecs, setShowSpecs] = useState(false);

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col group" dir="rtl">
      {/* Product Image Panel */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-102 transition-all duration-300"
          referrerPolicy="no-referrer"
        />
        {/* Category Badge */}
        <span className="absolute top-2.5 right-2.5 bg-white/95 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm border border-slate-100">
          {product.category}
        </span>
        
        {/* Out of Stock Overlay */}
        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center">
            <span className="bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-full text-xs font-bold">
              نفذت الكمية
            </span>
          </div>
        )}
      </div>

      {/* Product Info Panel */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          {/* Product Code & Stock */}
          <div className="flex justify-between items-center text-[10px]">
            <span className="font-mono text-slate-400 font-semibold">{product.code}</span>
            <span className={`px-1.5 py-0.5 rounded-md ${product.stock > 5 ? 'text-slate-500 bg-slate-100' : 'text-amber-600 bg-amber-50 font-bold'}`}>
              المتاح: {product.stock} قطع
            </span>
          </div>

          {/* Product Name */}
          <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-xs leading-snug line-clamp-1">
            {product.name}
          </h4>

          {/* Size and Color tags directly in the card */}
          <div className="flex flex-wrap gap-1 pt-1">
            {product.specifications?.['المقاس'] && (
              <span className="bg-slate-100 text-slate-700 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                مقاس: {product.specifications['المقاس']}
              </span>
            )}
            {product.specifications?.['اللون'] && (
              <span className="bg-slate-100 text-slate-700 text-[9px] px-1.5 py-0.5 rounded font-medium">
                اللون: {product.specifications['اللون']}
              </span>
            )}
          </div>
        </div>

        {/* Pricing & Actions */}
        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">سعر القطعة</span>
            <span className="font-bold font-mono text-blue-600 text-sm">{product.price.toLocaleString()} ج.م</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Tag preview click */}
            <button
              onClick={() => onSelectProductForLabel(product)}
              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-slate-200"
              title="عرض وطباعة ورقة الملابس اللاصقة"
            >
              <Tag size={13} />
            </button>

            {/* Quick add to cart */}
            <button
              onClick={() => onAddToCart(product)}
              disabled={product.stock <= 0}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                isInCart 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
              }`}
            >
              {isInCart ? <Check size={12} /> : <ShoppingCart size={11} />}
              <span>{isInCart ? 'أُضيف' : 'إضافة'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
