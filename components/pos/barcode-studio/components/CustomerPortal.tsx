/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  QrCode, ShoppingCart, Smartphone, Trash2, CheckCircle2, 
  Sparkles, ShieldCheck, Camera, CreditCard, Star, Check 
} from 'lucide-react';
import { Product, CartItem, Transaction } from '../types';
import ScannerModal from './ScannerModal';
import InvoiceModal from './InvoiceModal';
import confetti from 'canvas-confetti';

interface CustomerPortalProps {
  products: Product[];
  onAddTransaction: (transaction: Transaction) => void;
  onUpdateProductsStock: (products: Product[]) => void;
}

export default function CustomerPortal({
  products,
  onAddTransaction,
  onUpdateProductsStock
}: CustomerPortalProps) {
  // Scanner trigger
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  
  // Checkout states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'wallet'>('wallet');
  
  // Completed receipt view
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Handle scanned barcode
  const handleScanSuccess = (barcode: string) => {
    const matchedProduct = products.find(p => p.barcode === barcode);
    if (matchedProduct) {
      setScannedProduct(matchedProduct);
      confetti({
        particleCount: 20,
        spread: 30,
        origin: { y: 0.8 }
      });
    } else {
      alert(`عذراً، لم يتم العثور على منتج يحمل الباركود: ${barcode}`);
    }
  };

  // Add product to customer cart
  const handleAddToCart = (product: Product, quantity = 1) => {
    if (product.stock < quantity) {
      alert('عذراً، الكمية المطلوبة غير متوفرة في المخزون حالياً!');
      return;
    }

    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    if (existingIndex > -1) {
      const updatedCart = [...cart];
      if (updatedCart[existingIndex].quantity + quantity > product.stock) {
        alert('عذراً، لا يمكنك تجاوز الكمية المتاحة بالمخزن!');
        return;
      }
      updatedCart[existingIndex].quantity += quantity;
      setCart(updatedCart);
    } else {
      const newItem: CartItem = {
        product,
        quantity,
        discount: 0,
        sellerName: 'بوابة الشراء الذاتي',
        itemBalance: product.stock
      };
      setCart([...cart, newItem]);
    }
    setScannedProduct(null); // Close scanned detail modal
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const updateCartQty = (productId: string, newQty: number) => {
    if (newQty < 1) return;
    const item = cart.find(i => i.product.id === productId);
    if (item && newQty > item.product.stock) {
      alert('الكمية المطلوبة تتجاوز المتاح في المخزن!');
      return;
    }
    setCart(cart.map(item => item.product.id === productId ? { ...item, quantity: newQty } : item));
  };

  // Process direct checkout
  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('سلة المشتريات فارغة!');
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('يرجى ملء الاسم ورقم الهاتف لإتمام عملية الشراء!');
      return;
    }

    const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    const total = subtotal;

    // Build transaction
    const newTx: Transaction = {
      id: `INV-CUS-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      type: 'sale',
      customerName: customerName.trim(),
      items: cart,
      subtotal,
      discount: 0,
      total,
      paymentMethod,
      notes: `شراء ذاتي مباشر عبر مسح الـ QR • هاتف: ${customerPhone}`
    };

    // Update global products stock
    const updatedProducts = products.map(p => {
      const cartItem = cart.find(item => item.product.id === p.id);
      if (cartItem) {
        return {
          ...p,
          stock: Math.max(0, p.stock - cartItem.quantity)
        };
      }
      return p;
    });

    onUpdateProductsStock(updatedProducts);
    onAddTransaction(newTx);
    setCompletedTransaction(newTx);
    setIsInvoiceOpen(true);
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');

    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#059669', '#2563eb', '#d97706']
    });
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans pb-12" dir="rtl">
      
      {/* Visual Hero Panel */}
      <div className="relative overflow-hidden bg-white border-b border-slate-100 py-10 px-4 sm:px-6 lg:px-8 text-center shadow-xs">
        {/* Decorative background grid and blurs */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.05),transparent_40%)]"></div>

        <div className="max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold">
            <Sparkles size={12} className="text-blue-600" />
            <span>بوابة الخدمة الذاتية الفورية لمشتري الملابس</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
            امسح ملصق الملابس واشترِ <span className="text-blue-600">بسرعة وسهولة!</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
            التقنية الذكية تسهل لك تجربة الشراء؛ افتح كاميرا المسح، ووجّهها على الورقة اللاصقة المرفقة بقطعة الملابس، وسيتم التعرف عليها تلقائياً لإكمال الدفع والدفع الذاتي.
          </p>

          <div className="pt-3 flex justify-center">
            <button
              id="start-qr-scanning-btn"
              onClick={() => setIsScannerOpen(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/10 text-xs"
            >
              <Camera size={16} />
              <span>افتح كاميرا الهاتف للمسح الفوري</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT PANEL: SHOWROOM SHELF / INVENTORY */}
        <div className="lg:col-span-7 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">ملابس المعرض المتوفرة حالياً</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">انقر على "محاكاة مسح" لتمثيل مسح ورقة الملابس أو انقر "شراء" لإضافة الملابس مباشرة</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products.map(prod => {
              const isItemInCart = cart.some(item => item.product.id === prod.id);
              return (
                <div 
                  key={prod.id} 
                  className="bg-white border border-slate-200/60 rounded-xl p-3.5 hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div className="flex gap-3">
                    <img 
                      src={prod.image} 
                      alt={prod.name} 
                      className="w-14 h-14 rounded-lg object-cover border border-slate-100 flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="text-right space-y-1">
                      <span className="text-[9px] text-blue-700 bg-blue-50 border border-blue-100/50 px-2 py-0.5 rounded-full font-bold">
                        {prod.category}
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs leading-normal line-clamp-1">{prod.name}</h4>
                      <p className="text-[9px] text-slate-400 font-mono">باركود: {prod.barcode}</p>
                      
                      {/* Specs */}
                      <div className="flex gap-1">
                        {prod.specifications?.['المقاس'] && (
                          <span className="text-[9px] text-slate-500 font-mono bg-slate-100 px-1 rounded">
                            مقاس: {prod.specifications['المقاس']}
                          </span>
                        )}
                        {prod.specifications?.['اللون'] && (
                          <span className="text-[9px] text-slate-500 bg-slate-100 px-1 rounded">
                            اللون: {prod.specifications['اللون']}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-slate-400 block">سعر الملابس:</span>
                      <span className="font-bold font-mono text-slate-800 text-xs">{prod.price.toLocaleString()} ج.م</span>
                    </div>
                    
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleScanSuccess(prod.barcode)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 border border-slate-200/50"
                        title="محاكاة مسح الكود"
                      >
                        <QrCode size={10} />
                        <span>محاكاة مسح</span>
                      </button>
                      <button
                        onClick={() => handleAddToCart(prod)}
                        disabled={prod.stock <= 0}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          isItemInCart 
                            ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isItemInCart ? 'أُضيف' : 'شراء'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL: SELF CHECKOUT BASKET */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="text-blue-600" size={18} />
                <h3 className="font-bold text-slate-900 text-xs">سلة ملابس المشتري الذكية</h3>
              </div>
              <span className="bg-slate-100 px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-600 font-mono">
                {cart.length} أصناف
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="py-10 text-center text-slate-400 space-y-2">
                <QrCode className="mx-auto text-slate-300 animate-pulse" size={40} />
                <p className="text-xs">سلتك فارغة حالياً. امسح ورقة الملابس اللاصقة للبدء.</p>
                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  افتح كاميرا الهاتف والمسح
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Cart list */}
                <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto pr-1">
                  {cart.map(item => (
                    <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-3 text-right">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <img 
                          src={item.product.image} 
                          alt={item.product.name} 
                          className="w-9 h-9 rounded-lg object-cover border border-slate-100 flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-xs truncate leading-none">{item.product.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-1">
                            مقاس: {item.product.specifications?.['المقاس'] || 'N/A'} • {item.product.price.toLocaleString()} ج.م
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 p-0.5 font-mono">
                          <button
                            onClick={() => updateCartQty(item.product.id, item.quantity - 1)}
                            className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-800 rounded transition-all text-xs"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-xs text-slate-700 font-bold">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQty(item.product.id, item.quantity + 1)}
                            className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-800 rounded transition-all text-xs"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="pt-3 border-t border-slate-100 space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>قيمة المشتريات:</span>
                    <span className="font-mono">{cartTotal.toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>الضريبة الإضافية والخدمة:</span>
                    <span className="text-blue-600 font-bold">0 ج.م (مـجـانـاً ⚡)</span>
                  </div>
                  <div className="h-px bg-slate-100 my-1"></div>
                  <div className="flex justify-between font-bold text-xs text-slate-900">
                    <span>الإجمالي المستحق:</span>
                    <span className="font-mono text-blue-600 text-sm">{cartTotal.toLocaleString()} ج.م</span>
                  </div>
                </div>

                {/* Checkout form details */}
                <form onSubmit={handleCheckout} className="pt-3 border-t border-slate-100 space-y-3.5 text-right">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block">اسم المشتري الكريم:</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="أدخل اسمك الكريم"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block">رقم الهاتف:</label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="مثال: 01012345678"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-right font-mono text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">طريقة الدفع المفضلة:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('wallet')}
                        className={`py-2 border rounded-lg flex items-center justify-center gap-1.5 transition-all text-[10px] font-bold ${
                          paymentMethod === 'wallet'
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <Smartphone size={12} />
                        المحفظة الإلكترونية
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`py-2 border rounded-lg flex items-center justify-center gap-1.5 transition-all text-[10px] font-bold ${
                          paymentMethod === 'card'
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <CreditCard size={12} />
                        فيزا / كارت بنكي
                      </button>
                    </div>
                  </div>

                  <button
                    id="submit-customer-checkout-btn"
                    type="submit"
                    className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-md shadow-blue-600/10 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck size={14} />
                    <span>تأكيد الفاتورة والدفع الفوري</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* POPUP MODAL: SCANNED PRODUCT DETAILS DETECTOR */}
      {scannedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in" dir="rtl">
          <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
            <div className="relative aspect-video">
              <img 
                src={scannedProduct.image} 
                alt={scannedProduct.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={() => setScannedProduct(null)}
                className="absolute top-3 right-3 bg-white/90 p-1 hover:bg-white rounded-full text-slate-600 shadow-sm transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-right">
              <div>
                <span className="text-[9px] text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full font-bold">
                  {scannedProduct.category}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-1 leading-normal">{scannedProduct.name}</h3>
              </div>

              <p className="text-xs text-slate-500 leading-normal">
                {scannedProduct.description}
              </p>

              {scannedProduct.specifications && (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-1 text-[10px] font-mono text-slate-600">
                  {Object.entries(scannedProduct.specifications).map(([key, val]) => (
                    <div key={key} className="flex justify-between pb-1 border-b border-slate-200/50 last:border-0 last:pb-0">
                      <span className="font-medium text-slate-400">{key}:</span>
                      <span className="text-slate-800 font-bold">{val}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <span className="text-[10px] text-slate-400">سعر الفاتورة:</span>
                <span className="text-blue-600 font-bold font-mono text-base">{scannedProduct.price.toLocaleString()} ج.م</span>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  id="add-scanned-to-cart-btn"
                  onClick={() => handleAddToCart(scannedProduct)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <ShoppingCart size={13} />
                  <span>إضافة للسلة</span>
                </button>
                <button
                  onClick={() => setScannedProduct(null)}
                  className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WEB CAMERA QR SCANNER COMPONENT */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        title="ماسح ملابس المشتري الذكي"
        description="وجه كاميرا الهاتف نحو ملصق كود قطعة الملابس لمسحه وإضافته إلى سلة الشراء فوراً."
      />

      {/* FINAL CHECKOUT RECEIPT VIEW */}
      <InvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        transaction={completedTransaction}
      />

    </div>
  );
}
