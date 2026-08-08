/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, Scan, ShoppingBag, Trash2, ArrowLeftRight, Users, 
  Settings, CreditCard, ChevronDown, CheckCircle2, QrCode, 
  Printer, DollarSign, RefreshCw, Tag, UserCheck, ChevronRight,
  Filter, Sparkles, Check, ShoppingCart, Info, RotateCcw,
  FileText, CheckSquare, Plus, X, Maximize2, Minimize2, Award,
  Phone, Trash, MessageSquare, Shield, Eye, Calculator, ArrowLeft
} from 'lucide-react';
import { Product, CartItem, Customer, Transaction, Installment, PosLoadDocument } from '../types';
import ProductCard from './ProductCard';
import ScannerModal from './ScannerModal';
import InvoiceModal from './InvoiceModal';
import type { StudioSalesAgent } from '../adapters';
import { findProductForLoad } from '../adapters';
import confetti from 'canvas-confetti';

interface SellerDashboardProps {
  products: Product[];
  onUpdateProductsStock: (updatedProducts: Product[]) => void;
  customers: Customer[];
  onUpdateCustomerList: (updatedCustomers: Customer[]) => void;
  onAddTransaction: (transaction: Transaction) => void;
  onClose?: () => void;
  salesAgents: StudioSalesAgent[];
  expectedBalance: number;
  pastTransactions: Transaction[];
  pendingOrders: PosLoadDocument[];
  priceQuotes: PosLoadDocument[];
  preBookings: PosLoadDocument[];
  onCompleteSale: (
    cart: CartItem[],
    customerCode: string,
    notes: string,
    sellerId?: string,
  ) => Promise<Transaction>;
  onCompleteExchange: (
    returned: CartItem[],
    exchanged: CartItem[],
    customerCode: string,
    discount: number,
    sellerId?: string,
  ) => Promise<Transaction>;
  onSaveCustomerProfile: (
    customerCode: string,
    notes: string,
    group: string,
    spouse: string,
    guarantors: string,
  ) => Promise<void>;
  onReload: () => Promise<void>;
  onLookupBarcode: (code: string) => Promise<Product | null>;
  onLoadPendingOrder: (docId: string) => Promise<PosLoadDocument | null>;
  onLoadQuote: (code: string) => Promise<PosLoadDocument | null>;
  onLoadReservation: (code: string) => Promise<PosLoadDocument | null>;
  onRefreshCustomerInstallments: (customerId: string) => Promise<void>;
  onCreateCustomer: (name: string, phone: string) => Promise<string>;
}

export default function SellerDashboard({
  products,
  onUpdateProductsStock,
  customers,
  onUpdateCustomerList,
  onAddTransaction,
  onClose,
  salesAgents,
  expectedBalance,
  pastTransactions,
  pendingOrders,
  priceQuotes,
  preBookings,
  onCompleteSale,
  onCompleteExchange,
  onSaveCustomerProfile,
  onReload,
  onLookupBarcode,
  onLoadPendingOrder,
  onLoadQuote,
  onLoadReservation,
  onRefreshCustomerInstallments,
  onCreateCustomer,
}: SellerDashboardProps) {
  
  // Three Main Tabs as shown in screenshots: 'sales' (شاشة البيع) | 'exchange' (تبديل واسترجاع) | 'customers' (تحصيل ومراجعة)
  // And 'labels' (طباعة ملصقات الباركود للملابس) as a smart utility tab
  const [activeTab, setActiveTab] = useState<'sales' | 'exchange' | 'customers' | 'labels'>('sales');

  // Scanner Modal states
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerPurpose, setScannerPurpose] = useState<'sales-add' | 'exchange-add' | 'labels-add'>('sales-add');

  // Beep Sound Simulator for clothes scanning
  const [scannedAlert, setScannedAlert] = useState<string | null>(null);

  // -------------------------------------------------------------
  // STATE 1: SALES MODE (شاشة البيع)
  // -------------------------------------------------------------
  const [salesCart, setSalesCart] = useState<CartItem[]>([]);
  const [salesBarcodeSearch, setSalesBarcodeSearch] = useState('');
  const [employeeCode, setEmployeeCode] = useState('EMP');
  const [salesNotes, setSalesNotes] = useState('');
  const [salesCustomerCode, setSalesCustomerCode] = useState('');
  const [salesPhoneDropdown, setSalesPhoneDropdown] = useState('01000000000');
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [completedTx, setCompletedTx] = useState<Transaction | null>(null);

  // -------------------------------------------------------------
  // STATE 2: EXCHANGE MODE (شاشة التبديل والاسترجاع)
  // -------------------------------------------------------------
  const [returnedCart, setReturnedCart] = useState<CartItem[]>([]);
  const [exchangeCart, setExchangeCart] = useState<CartItem[]>([]);
  const [exchangeBarcodeSearch, setExchangeBarcodeSearch] = useState('');
  const [exchangeCustomerCode, setExchangeCustomerCode] = useState('');
  const [exchangeDiscount, setExchangeDiscount] = useState(0);
  const [isSelectingReturnInvoice, setIsSelectingReturnInvoice] = useState(false);

  // -------------------------------------------------------------
  // STATE 3: CUSTOMERS & INSTALLMENTS (تحصيل أو مراجعة)
  // -------------------------------------------------------------
  const [selectedCustomerCode, setSelectedCustomerCode] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  
  // Sub-action modal or overlay state for Customers Tab
  const [activeCustomerAction, setActiveCustomerAction] = useState<'statement' | 'collect' | 'restructure' | 'edit-notes' | 'view-items' | 'view-data' | null>(null);
  
  // Restructuring input states
  const [restructuredAmount, setRestructuredAmount] = useState(1600);
  const [restructuredCount, setRestructuredCount] = useState(2);

  // State variables for Smart Installment Calculator Widget
  const [calcTotalPurchase, setCalcTotalPurchase] = useState(5000);
  const [calcDownPayment, setCalcDownPayment] = useState(1000);
  const [calcMonthsCount, setCalcMonthsCount] = useState(6);
  const [calcInterestRate, setCalcInterestRate] = useState(1);

  // -------------------------------------------------------------
  // STATE 4: LABELS & STICKERS GENERATOR (طباعة ملصق الملابس)
  // -------------------------------------------------------------
  const [selectedProductForTag, setSelectedProductForTag] = useState<Product | null>(products[0] || null);

  useEffect(() => {
    if (products.length > 0 && !selectedProductForTag) {
      setSelectedProductForTag(products[0]);
    }
  }, [products, selectedProductForTag]);
  const [tagCustomStore, setTagCustomStore] = useState('بوتيك الملابس');
  const [tagPrintQty, setTagPrintQty] = useState(10);
  const [tagCustomSize, setTagCustomSize] = useState('');
  const [tagCustomColor, setTagCustomColor] = useState('');
  const [tagCustomPrice, setTagCustomPrice] = useState<number | ''>('');
  const [isPrintingAnim, setIsPrintingAnim] = useState(false);

  // -------------------------------------------------------------
  // DYNAMIC LOADING SYSTEMS STATE (تحميل معلق، عرض سعر، حجز مسبق)
  // -------------------------------------------------------------
  const [activePOSModal, setActivePOSModal] = useState<'pending-orders' | 'price-quotes' | 'pre-bookings' | null>(null);

  // Default customer / seller when API data loads
  useEffect(() => {
    if (customers.length > 0 && !salesCustomerCode) {
      setSalesCustomerCode(customers[0].code);
      setExchangeCustomerCode(customers[0].code);
      setSelectedCustomerCode(customers[0].code);
    }
    if (salesAgents.length > 0 && employeeCode === 'EMP') {
      setEmployeeCode(salesAgents[0].code);
    }
  }, [customers, salesAgents, salesCustomerCode, employeeCode]);

  useEffect(() => {
    const c = customers.find((row) => row.code === selectedCustomerCode);
    if (c?.id) void onRefreshCustomerInstallments(c.id);
  }, [selectedCustomerCode, customers, onRefreshCustomerInstallments]);

  const activeAgent =
    salesAgents.find((agent) => agent.code === employeeCode) ||
    salesAgents[0] ||
    { id: '', name: '—', code: 'EMP' };

  // Sound Synthesizer for clothes tags
  const playBarcodeBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1400, audioCtx.currentTime); // high pitched clean clothing tag beep
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.11);
    } catch (e) {
      console.log('Audio feedback not yet allowed by browser gesture');
    }
  };

  // Play a premium drawer open cash register chime on payment/exchange
  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Tone 1
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      gain1.gain.setValueAtTime(0.05, audioCtx.currentTime);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.15);

      // Tone 2 (higher, after delay)
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
        gain2.gain.setValueAtTime(0.05, audioCtx.currentTime);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.25);
      }, 100);
    } catch (e) {
      console.log('Chime audio blocked');
    }
  };

  const handleLoadPOSItemToCart = async (doc: PosLoadDocument, loader?: () => Promise<PosLoadDocument | null>) => {
    const full = loader ? (await loader()) || doc : doc;
    const newCartItems: CartItem[] = [];
    let hasStockIssue = false;
    const sellerName = activeAgent.name;

    for (const item of full.items) {
      const prod = findProductForLoad(products, item.productId);
      if (prod) {
        if (prod.stock < item.qty) {
          hasStockIssue = true;
        }
        newCartItems.push({
          product: prod,
          quantity: Math.min(item.qty, prod.stock > 0 ? prod.stock : item.qty),
          discount: 0,
          sellerName,
          itemBalance: prod.stock,
        });
      }
    }

    if (newCartItems.length === 0) {
      alert('لم يُعثر على أصناف هذا المستند في مخزون الفرع الحالي.');
      return;
    }

    setSalesCart(newCartItems);
    playBarcodeBeep();
    setActivePOSModal(null);

    if (hasStockIssue) {
      alert('⚠️ تم تحميل المستند، ولكن تم تعديل بعض الكميات لعدم توفر مخزون كافٍ.');
    } else {
      setScannedAlert('🎉 تم استدعاء وتحميل المستند بالكامل إلى سلة المبيعات!');
      setTimeout(() => setScannedAlert(null), 3000);
    }
  };

  // -------------------------------------------------------------
  // CORE LOGIC: SALES CART
  // -------------------------------------------------------------
  const addProductToSalesCart = (product: Product, quantity = 1) => {
    if (product.stock <= 0) {
      alert(`عذراً، قطعة الملابس هذه نَفَدَت من المخزن! (المتاح: 0)`);
      return;
    }

    const existingIndex = salesCart.findIndex(item => item.product.id === product.id);
    if (existingIndex > -1) {
      const updated = [...salesCart];
      if (updated[existingIndex].quantity + quantity > product.stock) {
        alert(`عذراً، الكمية المطلوبة تتجاوز المتاح في المخزن! (المتاح: ${product.stock} قطع)`);
        return;
      }
      updated[existingIndex].quantity += quantity;
      setSalesCart(updated);
    } else {
      const newItem: CartItem = {
        product,
        quantity: quantity,
        discount: 0,
        sellerName: activeAgent.name,
        itemBalance: product.stock
      };
      setSalesCart([...salesCart, newItem]);
    }

    playBarcodeBeep();
    setScannedAlert(`تم مسح قطعة ملابس: ${product.name}`);
    setTimeout(() => setScannedAlert(null), 2500);
  };

  const updateSalesCartItemQty = (productId: string, qty: number) => {
    if (qty < 1) return;
    const item = salesCart.find(i => i.product.id === productId);
    if (item && qty > item.product.stock) {
      alert(`الكمية تتجاوز المتاح في المخزن! (المتاح: ${item.product.stock})`);
      return;
    }
    setSalesCart(salesCart.map(item => item.product.id === productId ? { ...item, quantity: qty } : item));
  };

  const updateSalesCartItemDiscount = (productId: string, discount: number) => {
    if (discount < 0) return;
    setSalesCart(salesCart.map(item => item.product.id === productId ? { ...item, discount } : item));
  };

  const removeSalesCartItem = (productId: string) => {
    setSalesCart(salesCart.filter(item => item.product.id !== productId));
  };

  const handleBarcodeSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!salesBarcodeSearch.trim()) return;

    const trimmed = salesBarcodeSearch.trim();
    let foundProduct = products.find(
      (p) => p.barcode === trimmed || p.code.toLowerCase() === trimmed.toLowerCase(),
    );

    if (!foundProduct) {
      foundProduct = (await onLookupBarcode(trimmed)) || undefined;
    }

    if (foundProduct) {
      addProductToSalesCart(foundProduct);
      setSalesBarcodeSearch('');
    } else {
      alert(`لم نجد أي قطعة ملابس تطابق كود الباركود المدخل: ${trimmed}`);
    }
  };

  const handleProcessSale = async () => {
    if (salesCart.length === 0) {
      alert('سلة مبيعات الفاتورة فارغة!');
      return;
    }

    try {
      const newTx = await onCompleteSale(
        salesCart,
        salesCustomerCode,
        salesNotes || 'بيع ملابس مباشر',
        activeAgent.id || undefined,
      );

      onAddTransaction(newTx);
      setCompletedTx(newTx);
      setIsInvoiceOpen(true);
      setSalesCart([]);
      setSalesNotes('');
      playChime();
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'تعذر حفظ الفاتورة');
    }
  };

  // -------------------------------------------------------------
  // CORE LOGIC: EXCHANGE (تبديل)
  // -------------------------------------------------------------
  const addProductToExchangeCart = (product: Product, quantity = 1) => {
    if (product.stock <= 0) {
      alert(`هذه القطعة غير متوفرة في المخزن حالياً!`);
      return;
    }
    const existingIndex = exchangeCart.findIndex(item => item.product.id === product.id);
    if (existingIndex > -1) {
      const updated = [...exchangeCart];
      if (updated[existingIndex].quantity + quantity > product.stock) {
        alert(`الكمية تتجاوز المتاح في المخزن! (${product.stock})`);
        return;
      }
      updated[existingIndex].quantity += quantity;
      setExchangeCart(updated);
    } else {
      const newItem: CartItem = {
        product,
        quantity,
        discount: 0,
        sellerName: activeAgent.name,
        itemBalance: product.stock
      };
      setExchangeCart([...exchangeCart, newItem]);
    }
    playBarcodeBeep();
  };

  const handleExchangeBarcodeSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!exchangeBarcodeSearch.trim()) return;

    const trimmed = exchangeBarcodeSearch.trim();
    let foundProduct = products.find(
      (p) => p.barcode === trimmed || p.code.toLowerCase() === trimmed.toLowerCase(),
    );

    if (!foundProduct) {
      foundProduct = (await onLookupBarcode(trimmed)) || undefined;
    }

    if (foundProduct) {
      addProductToExchangeCart(foundProduct);
      setExchangeBarcodeSearch('');
    } else {
      alert(`لم نجد أي قطعة ملابس بالباركود: ${trimmed}`);
    }
  };

  // Quick select items from a past invoice to return
  const handleSelectReturnFromPastInvoice = (invoice: Transaction) => {
    const itemsToReturn: CartItem[] = invoice.items.map(item => ({
      ...item,
      quantity: item.quantity // assume they return full quantity
    }));
    setReturnedCart(itemsToReturn);
    setExchangeCustomerCode(invoice.customerCode || customers[0]?.code || '');
    setIsSelectingReturnInvoice(false);
    playBarcodeBeep();
  };

  const handleConfirmExchange = async () => {
    if (returnedCart.length === 0 && exchangeCart.length === 0) {
      alert('الرجاء إضافة أصناف مرتجعة أو أصناف جديدة لإتمام عملية التبديل!');
      return;
    }

    try {
      const exchangeTx = await onCompleteExchange(
        returnedCart,
        exchangeCart,
        exchangeCustomerCode,
        exchangeDiscount,
        activeAgent.id || undefined,
      );

      onAddTransaction(exchangeTx);
      setCompletedTx(exchangeTx);
      setIsInvoiceOpen(true);
      setReturnedCart([]);
      setExchangeCart([]);
      setExchangeDiscount(0);
      playChime();
      confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 } });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'تعذر حفظ عملية التبديل');
    }
  };

  // -------------------------------------------------------------
  // CUSTOMER UTILITIES (العملاء والأقساط)
  // -------------------------------------------------------------
  const activeCustomer = customers.find(c => c.code === selectedCustomerCode) || customers[0];

  const filteredCustomersList = customers.filter(c => {
    const query = customerSearchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      c.name.toLowerCase().includes(query) ||
      c.code.toLowerCase().includes(query) ||
      c.phone.includes(query) ||
      (c.spouseName && c.spouseName.toLowerCase().includes(query)) ||
      (c.guarantors && c.guarantors.some(g => g.toLowerCase().includes(query)))
    );
  });

  // Handle paying a specific installment
  const handlePayInstallment = (installmentId: string) => {
    const updatedCustomers = customers.map(c => {
      if (c.code === selectedCustomerCode) {
        const updatedInsts = c.installments.map(inst => {
          if (inst.id === installmentId && inst.status !== 'paid') {
            return {
              ...inst,
              status: 'paid' as const,
              paidDate: new Date().toISOString().slice(0, 10)
            };
          }
          return inst;
        });

        // Calculate paid amount to reduce customer balance
        const paidInst = c.installments.find(inst => inst.id === installmentId);
        const amountToReduce = (paidInst && paidInst.status !== 'paid') ? paidInst.amount : 0;
        
        return {
          ...c,
          balance: Math.max(0, c.balance - amountToReduce),
          installments: updatedInsts
        };
      }
      return c;
    });

    onUpdateCustomerList(updatedCustomers);
    playChime();
    
    // Register payment transaction
    const paidInst = activeCustomer.installments.find(i => i.id === installmentId);
    if (paidInst) {
      const payTx: Transaction = {
        id: `PAY-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString(),
        type: 'sale', // standard payment flow
        customerName: activeCustomer.name,
        customerCode: activeCustomer.code,
        items: [],
        subtotal: 0,
        discount: 0,
        total: paidInst.amount,
        paymentMethod: 'cash',
        notes: `سداد قسط قطعة الملابس المستحق بتاريخ ${paidInst.dueDate}`
      };
      onAddTransaction(payTx);
    }

    confetti({
      particleCount: 50,
      spread: 40,
      origin: { y: 0.8 }
    });
    alert(`تم تحصيل القسط بنجاح! تم تخفيض مديونية العميل بقيمة ${paidInst?.amount || 0} ج.م.`);
  };

  // Restructuring of installments
  const handleRestructureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (restructuredAmount <= 0 || restructuredCount <= 0) return;

    const amountPerInstallment = Math.round(restructuredAmount / restructuredCount);
    const newInstallments: Installment[] = [];
    
    const today = new Date();
    for (let i = 1; i <= restructuredCount; i++) {
      const dueDate = new Date(today.getFullYear(), today.getMonth() + i, 15);
      newInstallments.push({
        id: `inst-restruct-${Date.now()}-${i}`,
        dueDate: dueDate.toISOString().slice(0, 10),
        amount: amountPerInstallment,
        status: 'unpaid'
      });
    }

    const updatedCustomers = customers.map(c => {
      if (c.code === selectedCustomerCode) {
        return {
          ...c,
          balance: restructuredAmount,
          installments: newInstallments,
          notes: `${c.notes} • تم إعادة جدولة الأقساط إلى عدد ${restructuredCount} أقساط.`
        };
      }
      return c;
    });

    onUpdateCustomerList(updatedCustomers);
    setActiveCustomerAction(null);
    playChime();
    alert(`تم إعادة هيكلة الأقساط لـ ${activeCustomer.name} بنجاح! مديونية جديدة: ${restructuredAmount} ج.م على ${restructuredCount} شهر.`);
  };

  // Apply Calculated Installment Plan to Customer
  const handleApplyCalculatedPlan = (totalInstallmentAmount: number, monthlyAmount: number, months: number) => {
    const newInstallments: Installment[] = [];
    const today = new Date();
    for (let i = 1; i <= months; i++) {
      const dueDate = new Date(today.getFullYear(), today.getMonth() + i, 15);
      newInstallments.push({
        id: `inst-calc-${Date.now()}-${i}`,
        dueDate: dueDate.toISOString().slice(0, 10),
        amount: Math.round(monthlyAmount),
        status: 'unpaid'
      });
    }

    const updatedCustomers = customers.map(c => {
      if (c.code === selectedCustomerCode) {
        return {
          ...c,
          balance: Math.round(totalInstallmentAmount),
          installments: newInstallments,
          notes: `${c.notes} • تم احتساب واعتماد خطة أقساط ذكية بقيمة ${totalInstallmentAmount.toLocaleString()} ج.م على ${months} شهر.`
        };
      }
      return c;
    });

    onUpdateCustomerList(updatedCustomers);
    playChime();
    
    if (typeof window !== 'undefined' && (window as any).confetti) {
      (window as any).confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 }
      });
    }

    alert(`تم اعتماد خطة الأقساط الذكية لـ ${activeCustomer.name} بنجاح!\nالمجموع المجدول: ${totalInstallmentAmount.toLocaleString()} ج.م\nالقسط الشهري: ${monthlyAmount.toLocaleString()} ج.م على ${months} أشهر.`);
  };

  // Edit notes, group, rating
  const handleUpdateNotesAndGroup = async (notes: string, group: string, spouse: string, guarantorsStr: string) => {
    try {
      await onSaveCustomerProfile(selectedCustomerCode, notes, group, spouse, guarantorsStr);
      setActiveCustomerAction(null);
      alert('تم حفظ البيانات والتقييمات الجديدة للعميل بنجاح!');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'تعذر حفظ بيانات العميل');
    }
  };

  // -------------------------------------------------------------
  // CORE LOGIC: LABELS
  // -------------------------------------------------------------
  const finalStickerSize = tagCustomSize || (selectedProductForTag?.specifications?.['المقاس'] || 'Free Size');
  const finalStickerColor = tagCustomColor || (selectedProductForTag?.specifications?.['اللون'] || 'محدد');
  const finalStickerPrice = tagCustomPrice !== '' ? tagCustomPrice : (selectedProductForTag?.price || 0);

  const triggerStickersPrint = () => {
    if (!selectedProductForTag) return;
    setIsPrintingAnim(true);
    setTimeout(() => {
      setIsPrintingAnim(false);
      alert(`تم إرسال عدد ${tagPrintQty} ملصق لقطعة الملابس [${selectedProductForTag.name}] بنجاح إلى طابعة الملصقات الحرارية المتصلة!`);
    }, 1500);
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans flex flex-col" dir="rtl">
      
      {/* 1. ULTRA-PREMIUM METALLIC UPPER STATUS BAR */}
      <div className="bg-slate-900 text-slate-100 border-b border-slate-800 px-4 sm:px-6 py-2.5 flex justify-between items-center text-xs font-medium shadow-sm">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          <span>الوردية النشطة الآن</span>
          <span className="text-slate-700 hidden sm:inline">|</span>
          <span className="text-slate-400 hidden sm:inline">البائع النشط: <span className="text-slate-200 font-bold">{activeAgent.name}</span></span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 hidden sm:inline">الرصيد الفعلي المتوقع بالدرج:</span>
          <span className="font-mono text-xs font-bold bg-blue-950/80 text-blue-300 px-3 py-1 rounded-full border border-blue-800/60 shadow-inner">
            {expectedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
          </span>
        </div>
      </div>

      {/* 2. MAIN HEADER */}
      <header className="bg-white border-b border-slate-150 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-4">
          
          {/* Brand Info */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-slate-900 to-slate-800 text-white p-3 rounded-xl shadow-md shadow-slate-900/10">
              <ShoppingBag size={20} className="text-blue-400" />
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-slate-900">الكاشير الذكي</h1>
                <span className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-blue-100">منفذ الملابس بالباركود</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">منفذ البيع المتطور لقطع الملابس</p>
            </div>
          </div>

          {/* Segmented Controller (iOS-style pills) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/50 w-full lg:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('sales')}
              className={`flex-1 lg:flex-none px-4.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'sales'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/20'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🛒 شاشة البيع الفوري
            </button>
            <button
              onClick={() => setActiveTab('exchange')}
              className={`flex-1 lg:flex-none px-4.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'exchange'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/20'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🔄 التبديل والاسترجاع
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`flex-1 lg:flex-none px-4.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'customers'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/20'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              👥 الحسابات والأقساط
            </button>
            <button
              onClick={() => setActiveTab('labels')}
              className={`flex-1 lg:flex-none px-4.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'labels'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/20'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🏷️ ملصقات الملابس
            </button>
          </div>

          {/* Screen utilities */}
          <div className="flex items-center gap-2 shrink-0">
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                title="العودة"
              >
                <ArrowLeft size={13} className="text-slate-400" />
                <span>رجوع</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  document.documentElement.requestFullscreen();
                }
              }}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Maximize2 size={13} className="text-slate-400" />
              <span>ملء الشاشة</span>
            </button>
          </div>

        </div>
      </header>

      {/* 3. CORE SUB-VIEWS CONTAINER */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* Dynamic laser scan feedback alert banner */}
        {scannedAlert && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-800 text-xs font-bold flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <span className="text-base">⚡</span>
              <span>{scannedAlert}</span>
            </div>
            <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-mono">CODE SCANNED</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: SALES POS (شاشة البيع) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'sales' && (
          <div className="space-y-6">
            
            {/* 1A. Search and scanned code parameters bar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              
              {/* Main barcode input field (Now full width for a cleaner, ultra-professional look) */}
              <div className="lg:col-span-12 flex gap-2">
                <form onSubmit={handleBarcodeSearchSubmit} className="flex-1 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      value={salesBarcodeSearch}
                      onChange={(e) => setSalesBarcodeSearch(e.target.value)}
                      placeholder="بحث / اسم قطعة الملابس / كود الصنف / مسح باركود ورقة الملابس..."
                      className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-3 py-2.5 text-xs text-right focus:outline-none focus:border-blue-600 font-bold placeholder-slate-400"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    بحث
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScannerPurpose('sales-add');
                      setIsScannerOpen(true);
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-1 font-bold text-xs shadow-xs cursor-pointer"
                  >
                    <Scan size={14} />
                    <span>الكاميرا</span>
                  </button>
                </form>
              </div>

            </div>

            {/* 1B. Quick order load actions subbar */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-150 pb-4">
              <button
                onClick={() => setActivePOSModal('pending-orders')}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer hover:border-blue-300 hover:text-blue-700"
              >
                <ShoppingBag size={13} className="text-blue-500" />
                <span>📥 تحميل من أوردر معلق</span>
                <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded-full font-bold">{pendingOrders.length} معلق</span>
              </button>
              <button
                onClick={() => setActivePOSModal('price-quotes')}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer hover:border-blue-300 hover:text-blue-700"
              >
                <FileText size={13} className="text-indigo-500" />
                <span>📄 سحب عرض سعر</span>
                <span className="bg-indigo-50 text-indigo-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold">{priceQuotes.length} عروض</span>
              </button>
              <button
                onClick={() => setActivePOSModal('pre-bookings')}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer hover:border-blue-300 hover:text-blue-700"
              >
                <Award size={13} className="text-emerald-500" />
                <span>🎗️ تحميل حجز مسبق</span>
                <span className="bg-emerald-50 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold">{preBookings.length} حجوزات</span>
              </button>
              <div className="flex-grow"></div>
              <button
                onClick={() => setActiveTab('labels')}
                className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Settings size={13} className="text-blue-500" />
                <span>لوحة طباعة الباركود للملابس 🏷️</span>
              </button>
            </div>

            {/* 1C. Dual Panel Layout (Cart Table & Sidebar) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* CART TABLE (Left Column) */}
              <div className="lg:col-span-8 space-y-4">
                
                <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs min-h-[350px] flex flex-col justify-between">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-50/70 text-slate-500 border-b border-slate-200/60 font-bold">
                          <th className="py-3.5 px-4">#</th>
                          <th className="py-3.5 px-4">كود الملبس</th>
                          <th className="py-3.5 px-4">اسم قطعة الملابس</th>
                          <th className="py-3.5 px-4 text-center">الكمية</th>
                          <th className="py-3.5 px-4 text-left">سعر القطعة</th>
                          <th className="py-3.5 px-4 text-center">خصم مخصص</th>
                          <th className="py-3.5 px-4 text-left">إجمالي</th>
                          <th className="py-3.5 px-4">البائع</th>
                          <th className="py-3.5 px-4 text-center">المخزن</th>
                          <th className="py-3.5 px-4 text-center">إجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {salesCart.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="py-20 text-center text-slate-400 font-bold text-xs">
                              <div className="max-w-md mx-auto space-y-3.5">
                                <div className="text-4xl">🛍️</div>
                                <h4 className="text-slate-800 text-sm font-extrabold">سلة المشتريات فارغة حالياً</h4>
                                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                                  بإمكانك إضافة الملابس عبر مسح باركود الملصق المرفق، كتابة الكود في حقل البحث، أو النقر مباشرة على أي صنف من لوحة البيع السريع بالأسفل لملء الفاتورة فوراً.
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          salesCart.map((item, idx) => {
                            const sub = item.product.price * item.quantity;
                            const total = sub - item.discount;
                            return (
                              <tr key={item.product.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                                <td className="py-3.5 px-4 font-mono font-bold text-slate-700">{item.product.code}</td>
                                <td className="py-3.5 px-4 font-bold text-slate-900">
                                  <div>
                                    <span>{item.product.name}</span>
                                    <div className="flex gap-1.5 mt-1">
                                      <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-bold">مقاس: {item.product.specifications?.['المقاس'] || 'M'}</span>
                                      <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-bold">لون: {item.product.specifications?.['اللون'] || 'محدد'}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <div className="inline-flex items-center bg-slate-100/85 rounded-xl p-0.5 border border-slate-200/30">
                                    <button
                                      type="button"
                                      onClick={() => updateSalesCartItemQty(item.product.id, item.quantity - 1)}
                                      className="w-6 h-6 flex items-center justify-center font-bold text-slate-500 hover:text-slate-950 transition-colors cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <span className="w-8 text-center font-mono font-bold text-slate-900 text-xs">{item.quantity}</span>
                                    <button
                                      type="button"
                                      onClick={() => updateSalesCartItemQty(item.product.id, item.quantity + 1)}
                                      className="w-6 h-6 flex items-center justify-center font-bold text-slate-500 hover:text-slate-950 transition-colors cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-left font-mono font-bold text-slate-700">{item.product.price.toLocaleString()} ج.م</td>
                                <td className="py-3.5 px-4 text-center">
                                  <div className="relative inline-block">
                                    <input
                                      type="number"
                                      value={item.discount || ''}
                                      placeholder="0"
                                      onChange={(e) => updateSalesCartItemDiscount(item.product.id, Number(e.target.value))}
                                      className="w-20 bg-slate-50 border border-slate-200/80 rounded-lg px-2 py-1 text-center font-mono font-bold text-red-500 focus:outline-none focus:border-red-400 focus:bg-white text-xs"
                                    />
                                    <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] text-red-400 font-bold font-mono"></span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-left font-mono font-bold text-blue-600">{total.toLocaleString()} ج.م</td>
                                <td className="py-3.5 px-4 text-slate-500 font-medium">{item.sellerName}</td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                                    item.product.stock > 10 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                                  }`}>
                                    {item.product.stock} قطع
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeSalesCartItem(item.product.id)}
                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                    title="حذف من الفاتورة"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary row */}
                  {salesCart.length > 0 && (
                    <div className="bg-slate-50/80 p-4 border-t border-slate-200/60 flex justify-between items-center text-xs font-bold text-slate-700">
                      <span>إجمالي عدد القطع المحددة: <span className="font-mono text-slate-900 bg-slate-200 px-2 py-0.5 rounded">{salesCart.reduce((sum, i) => sum + i.quantity, 0)} قطع</span></span>
                      <div className="flex gap-4">
                        <span>قبل الخصم: {salesCart.reduce((sum, i) => sum + (i.product.price * i.quantity), 0).toLocaleString()} ج.م</span>
                        {salesCart.reduce((sum, i) => sum + i.discount, 0) > 0 && (
                          <span className="text-red-600">إجمالي الخصومات: -{salesCart.reduce((sum, i) => sum + i.discount, 0).toLocaleString()} ج.م</span>
                        )}
                        <span className="text-blue-700 text-sm">الصافي النهائي: <span className="font-mono text-blue-600 text-base">{(salesCart.reduce((sum, i) => sum + (i.product.price * i.quantity), 0) - salesCart.reduce((sum, i) => sum + i.discount, 0)).toLocaleString()} ج.م</span></span>
                      </div>
                    </div>
                  )}
                </div>

                {/* QUICK SALE HOTKEYS PANEL (لوحة البيع السريع لقطع الملابس) */}
                <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={14} className="text-blue-600" />
                      <h4 className="font-bold text-[11px] text-slate-700">الوصول السريع للملابس (اضغط للإضافة مباشرة للسلة)</h4>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold">المخزون متوفر ⚡</span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {products.map(prod => {
                      const isOutOfStock = prod.stock <= 0;
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => addProductToSalesCart(prod)}
                          disabled={isOutOfStock}
                          className={`p-2.5 border border-slate-150 rounded-xl text-right space-y-1 bg-slate-50/50 hover:bg-white hover:border-blue-500 hover:shadow-xs transition-all flex flex-col justify-between group h-[72px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <div className="w-full flex justify-between items-start gap-1">
                            <span className="font-bold text-[10.5px] text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
                              {prod.name}
                            </span>
                            <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${
                              prod.stock > 15 ? 'bg-emerald-500' : prod.stock > 0 ? 'bg-amber-400' : 'bg-red-500'
                            }`} title={`الكمية المتاحة: ${prod.stock}`} />
                          </div>
                          
                          <div className="w-full flex items-center justify-between mt-auto">
                            <span className="text-[9px] bg-slate-200/60 text-slate-600 px-1.5 rounded-md font-mono">
                              {prod.specifications?.['المقاس'] || 'M'} • {prod.code}
                            </span>
                            <span className="text-[11px] font-bold font-mono text-blue-600">
                              {prod.price.toLocaleString()} ج.م
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* CHECKOUT SIDEBAR (Right Column) */}
              <div className="lg:col-span-4 space-y-4">
                
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4 text-right">
                  
                  {/* Premium Checkout Banner */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-850 text-white rounded-xl p-4 text-right space-y-1 shadow-md shadow-slate-900/10">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">صافي إجمالي الحساب المطلوب</span>
                    <div className="font-mono text-2xl sm:text-3xl font-extrabold text-blue-400">
                      {(salesCart.reduce((sum, i) => sum + (i.product.price * i.quantity), 0) - salesCart.reduce((sum, i) => sum + i.discount, 0)).toLocaleString()} ج.م
                    </div>
                    <div className="text-[10px] text-slate-300 font-medium pt-1.5 border-t border-slate-800 flex justify-between">
                      <span>إجمالي القطع: {salesCart.reduce((sum, i) => sum + i.quantity, 0)} قطع</span>
                      {salesCart.reduce((sum, i) => sum + i.discount, 0) > 0 && (
                        <span className="text-red-400 font-bold">مجموع الخصم: {salesCart.reduce((sum, i) => sum + i.discount, 0).toLocaleString()} ج.م</span>
                      )}
                    </div>
                  </div>

                  {/* Customer Information Section */}
                  <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/50">
                    <div className="flex justify-between items-center">
                      <span className="text-[10.5px] font-bold text-slate-600 block">👤 بيانات العميل الائتمانية</span>
                      <span className="text-[9.5px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-full font-mono">
                        {salesCustomerCode}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {/* Customer select box */}
                      <div className="flex gap-2">
                        <select
                          value={salesCustomerCode}
                          onChange={(e) => {
                            setSalesCustomerCode(e.target.value);
                            const matched = customers.find(c => c.code === e.target.value);
                            if (matched && matched.phone) setSalesPhoneDropdown(matched.phone);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold text-slate-700 focus:outline-none"
                        >
                          {customers.map(c => (
                            <option key={c.code} value={c.code}>
                              {c.name} ({c.code})
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            void (async () => {
                              const name = prompt('أدخل اسم العميل الجديد:');
                              if (!name) return;
                              const phone = prompt('أدخل رقم هاتف العميل الجديد:') || '';
                              try {
                                const code = await onCreateCustomer(name, phone);
                                setSalesCustomerCode(code);
                                setSalesPhoneDropdown(phone);
                              } catch (e) {
                                alert(e instanceof Error ? e.message : 'تعذر إنشاء العميل');
                              }
                            })();
                          }}
                          className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 shrink-0 transition-colors cursor-pointer"
                          title="إضافة عميل جديد"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {/* Phone Selector */}
                      <div className="flex gap-2">
                        <select
                          value={salesPhoneDropdown}
                          onChange={(e) => setSalesPhoneDropdown(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs text-slate-700 focus:outline-none"
                        >
                          <option value="01000000000">01000000000 (عميل نقدي مجهول)</option>
                          {customers.filter(c => c.phone).map(c => (
                            <option key={c.code} value={c.phone}>{c.phone} — {c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Notes input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block">✍️ ملاحظات الفاتورة (اختياري)</label>
                    <input
                      type="text"
                      placeholder="اكتب أي ملاحظات للبيع هنا..."
                      value={salesNotes}
                      onChange={(e) => setSalesNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* SPEED PAYMENTS WIDGET */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">طرق السداد والدفع السريع ⚡</span>
                    
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSalesNotes('بيع مباشر نقدي (كاش) سريع');
                          handleProcessSale();
                        }}
                        disabled={salesCart.length === 0}
                        className="py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 rounded-xl text-[10px] font-bold flex flex-col items-center gap-1 border border-blue-200/50 transition-all disabled:opacity-40 cursor-pointer"
                      >
                        <span className="text-base">💵</span>
                        <span>كاش فوري</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setSalesNotes('دفع سريع عبر محفظة إلكترونية (فودافون كاش)');
                          handleProcessSale();
                        }}
                        disabled={salesCart.length === 0}
                        className="py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-800 rounded-xl text-[10px] font-bold flex flex-col items-center gap-1 border border-purple-200/50 transition-all disabled:opacity-40 cursor-pointer"
                      >
                        <span className="text-base">📱</span>
                        <span>فودافون كاش</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setSalesNotes('دفع سريع ببطاقة الدفع (فيزا)');
                          handleProcessSale();
                        }}
                        disabled={salesCart.length === 0}
                        className="py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 rounded-xl text-[10px] font-bold flex flex-col items-center gap-1 border border-amber-200/50 transition-all disabled:opacity-40 cursor-pointer"
                      >
                        <span className="text-base">💳</span>
                        <span>فيزا / كارت</span>
                      </button>
                    </div>
                  </div>

                  {/* Large PAY Button & Cancel Button */}
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    <button
                      onClick={handleProcessSale}
                      disabled={salesCart.length === 0}
                      className="col-span-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 rounded-xl text-xs shadow-md shadow-blue-600/10 transition-all flex items-center justify-center gap-1.5 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none cursor-pointer"
                    >
                      <CheckSquare size={14} />
                      <span>تسجيل الفاتورة ⏎</span>
                    </button>

                    <button
                      onClick={() => setSalesCart([])}
                      disabled={salesCart.length === 0}
                      className="col-span-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 font-bold py-3 rounded-xl text-xs transition-all text-center cursor-pointer disabled:opacity-40"
                      title="تفريغ السلة"
                    >
                      <Trash2 size={14} className="mx-auto" />
                    </button>
                  </div>

                </div>

                {/* Bottom Bento Cards (under Checkout Panel) */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-start gap-3 text-right">
                    <div className="bg-blue-50 text-blue-700 p-2.5 rounded-xl">
                      <QrCode size={18} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 text-xs">حجز بضاعة</h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        تحويل الفاتورة لحجز بمقدم - يُستدعى لاحقاً لإتمام الحجز. بيانات العميل في الملاحظات ويمكن الحجز نقداً.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-start gap-3 text-right">
                    <div className="bg-slate-100 text-slate-700 p-2.5 rounded-xl">
                      <FileText size={18} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 text-xs">عرض سعر</h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        تحويل الفاتورة لعرض سعر دون إتمام البيع.
                      </p>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 2: EXCHANGE MODE (شاشة التبديل والاسترجاع) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'exchange' && (
          <div className="space-y-6" dir="rtl">
            
            {/* Unified Math Comparison Top Banner */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Return Total Value Card */}
              <div className="bg-red-50 border border-red-200/80 p-5 rounded-2xl shadow-xs text-right space-y-1">
                <span className="text-[10px] text-red-600 font-extrabold block">💰 إجمالي قيمة المرتجعات (🔴)</span>
                <div className="font-mono text-2xl font-black text-red-700">
                  {returnedCart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0).toLocaleString()} ج.م
                </div>
                <span className="text-[9px] text-red-400 font-bold block">القيمة التي سيتم خصمها للعميل</span>
              </div>

              {/* New Purchases Total Value Card */}
              <div className="bg-blue-50 border border-blue-200/80 p-5 rounded-2xl shadow-xs text-right space-y-1">
                <span className="text-[10px] text-blue-600 font-extrabold block">💰 إجمالي المشتريات الجديدة (🔵)</span>
                <div className="font-mono text-2xl font-black text-blue-700">
                  {exchangeCart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0).toLocaleString()} ج.m
                </div>
                <span className="text-[9px] text-blue-400 font-bold block">قيمة الملابس البديلة المختارة</span>
              </div>

              {/* Net Difference Slate Card */}
              {(() => {
                const ret = returnedCart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
                const nxt = exchangeCart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
                const diff = nxt - ret - exchangeDiscount;
                return (
                  <div className="bg-slate-900 text-white border border-slate-800 p-5 rounded-2xl shadow-xs text-right space-y-1 md:col-span-2">
                    <span className="text-[10px] text-slate-300 font-bold block">صافي الفرق المطلوب معالجته</span>
                    <div className="flex items-baseline gap-2">
                      <div className="font-mono text-3xl font-black text-white">
                        {Math.abs(diff).toLocaleString()} ج.م
                      </div>
                      <span className="text-xs font-bold text-slate-400">
                        {diff === 0 ? 'فرق صفري' : diff > 0 ? 'يدفعه العميل (عجز لصالح المحل)' : 'يسترده العميل (باقي للعميل)'}
                      </span>
                    </div>
                    <span className="text-[10px] text-blue-400 font-extrabold block mt-1">
                      {diff === 0 && '✨ تبديل متوازن تماماً وبدون فروق نقدية'}
                      {diff > 0 && '⚡ يجب تحصيل هذا المبلغ من العميل نقداً أو فيزا لإتمام التبديل'}
                      {diff < 0 && '💵 يجب رد هذا المبلغ للعميل من الخزينة نقداً لإتمام التبديل'}
                    </span>
                  </div>
                );
              })()}

            </div>

            {/* Quick Actions Panel */}
            <div className="bg-white border border-slate-150 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="bg-blue-100 text-blue-800 p-2 rounded-xl text-xs font-black">خطوة 1</span>
                <p className="text-xs text-slate-600 font-bold">لإجراء تبديل سريع، يمكنك البدء بسحب أصناف فاتورة المبيعات الأصلية من هنا:</p>
              </div>
              
              <button 
                onClick={() => setIsSelectingReturnInvoice(true)}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-red-600/10 cursor-pointer flex items-center gap-2"
              >
                <span>🔍 استيراد أصناف من فاتورة سابقة</span>
              </button>
            </div>

            {/* Main Interactive Dual Workspaces */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Right Column: RETURNS WORKSPACE (🔴 المرتجعات) */}
              <div className="bg-white border border-red-100 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-red-50">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse"></span>
                    <h3 className="font-extrabold text-sm text-slate-900">أولاً: أصناف مرتجعة من العميل (🔴)</h3>
                  </div>
                  <span className="bg-red-50 text-red-800 px-2.5 py-0.5 rounded-full font-bold text-[10px]">{returnedCart.length} أصناف</span>
                </div>

                {/* Returns Table */}
                {returnedCart.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 font-bold text-xs space-y-3">
                    <div className="text-3xl">📥</div>
                    <p>لا يوجد مرتجعات مضافة حالياً.</p>
                    <p className="text-[10px] text-slate-400">استخدم زر "استيراد أصناف من فاتورة سابقة" بالأعلى، أو قم بمسح باركود القطعة المرتجعة.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-100 font-bold">
                          <th className="py-2">اسم قطعة الملابس</th>
                          <th className="py-2 text-center">الكمية</th>
                          <th className="py-2 text-left">سعر القطعة</th>
                          <th className="py-2 text-left">الإجمالي</th>
                          <th className="py-2 text-center">حذف</th>
                        </tr>
                      </thead>
                      <tbody>
                        {returnedCart.map(item => (
                          <tr key={item.product.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                            <td className="py-3 font-bold text-slate-800">{item.product.name}</td>
                            <td className="py-3 text-center">
                              <div className="inline-flex items-center gap-2 bg-slate-100 px-2.5 py-0.5 rounded font-mono font-black">
                                <button 
                                  onClick={() => {
                                    if (item.quantity > 1) {
                                      setReturnedCart(returnedCart.map(i => i.product.id === item.product.id ? { ...i, quantity: i.quantity - 1 } : i));
                                    }
                                  }} 
                                  className="font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                                >
                                  -
                                </button>
                                <span>{item.quantity}</span>
                                <button 
                                  onClick={() => setReturnedCart(returnedCart.map(i => i.product.id === item.product.id ? { ...i, quantity: i.quantity + 1 } : i))} 
                                  className="font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="py-3 text-left font-mono text-slate-500">{item.product.price.toLocaleString()}</td>
                            <td className="py-3 text-left font-mono font-bold text-red-600">{(item.product.price * item.quantity).toLocaleString()} ج.م</td>
                            <td className="py-3 text-center">
                              <button 
                                onClick={() => setReturnedCart(returnedCart.filter(i => i.product.id !== item.product.id))} 
                                className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-full cursor-pointer transition-all"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Left Column: NEW PURCHASES WORKSPACE (🔵 البديل والمشتريات الجديدة) */}
              <div className="bg-white border border-blue-100 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-blue-50">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-600 animate-pulse"></span>
                    <h3 className="font-extrabold text-sm text-slate-900">ثانياً: المشتريات البديلة الجديدة (🔵)</h3>
                  </div>
                  <span className="bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-full font-bold text-[10px]">{exchangeCart.length} أصناف</span>
                </div>

                {/* Search & Scan to Add to Exchange Cart */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <form onSubmit={handleExchangeBarcodeSubmit} className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input
                        type="text"
                        value={exchangeBarcodeSearch}
                        onChange={(e) => setExchangeBarcodeSearch(e.target.value)}
                        placeholder="مسح أو إدخال باركود قطعة الملابس الجديدة..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-bold placeholder-slate-400"
                      />
                    </div>
                    <button type="submit" className="px-4 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer transition-all">إدخال</button>
                  </form>

                  {/* Customer Linkage */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                    <span className="text-[10px] font-black text-slate-500 whitespace-nowrap">العميل المستفيد:</span>
                    <select
                      value={exchangeCustomerCode}
                      onChange={(e) => setExchangeCustomerCode(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      {customers.map(c => (
                        <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Exchange Cart Table */}
                {exchangeCart.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 font-bold text-xs space-y-3">
                    <div className="text-3xl">👕</div>
                    <p>سلة البديل فارغة.</p>
                    <p className="text-[10px] text-slate-400">انقر على قطعة ملابس أدناه، أو قم بمسح الباركود الخاص بها لإضافتها فوراً.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-100 font-bold">
                          <th className="py-2">اسم قطعة الملابس</th>
                          <th className="py-2 text-center">الكمية</th>
                          <th className="py-2 text-left">سعر القطعة</th>
                          <th className="py-2 text-left">الإجمالي</th>
                          <th className="py-2 text-center">حذف</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exchangeCart.map(item => (
                          <tr key={item.product.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                            <td className="py-3 font-bold text-slate-800">{item.product.name}</td>
                            <td className="py-3 text-center">
                              <div className="inline-flex items-center gap-2 bg-slate-100 px-2.5 py-0.5 rounded font-mono font-black">
                                <button onClick={() => addProductToExchangeCart(item.product, -1)} className="font-bold text-slate-500 hover:text-slate-800 cursor-pointer">-</button>
                                <span>{item.quantity}</span>
                                <button onClick={() => addProductToExchangeCart(item.product, 1)} className="font-bold text-slate-500 hover:text-slate-800 cursor-pointer">+</button>
                              </div>
                            </td>
                            <td className="py-3 text-left font-mono text-slate-500">{item.product.price.toLocaleString()}</td>
                            <td className="py-3 text-left font-mono font-bold text-blue-600">{(item.product.price * item.quantity).toLocaleString()} ج.م</td>
                            <td className="py-3 text-center">
                              <button 
                                onClick={() => setExchangeCart(exchangeCart.filter(i => i.product.id !== item.product.id))} 
                                className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-full cursor-pointer transition-all"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Quick Catalog Selection */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 block">إضافة سريعة من المخزن:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {products.slice(0, 3).map(prod => (
                      <button
                        key={prod.id}
                        onClick={() => addProductToExchangeCart(prod)}
                        className="p-2 border border-slate-200 rounded-xl hover:border-blue-500 text-right bg-white hover:shadow-xs transition-all cursor-pointer"
                      >
                        <span className="text-[9px] font-bold text-slate-400 block">{prod.code}</span>
                        <span className="text-[10px] font-black text-slate-800 block truncate">{prod.name}</span>
                        <span className="text-[11px] font-mono font-black text-blue-600 block">{prod.price.toLocaleString()} ج.م</span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>

            </div>

            {/* Final Checkouts, Discount and Action Buttons */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-center gap-6">
              
              {/* Discount Selector */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-slate-700">خصم استثنائي لعملية التبديل (ج.م):</span>
                <div className="relative">
                  <input
                    type="number"
                    value={exchangeDiscount || ''}
                    placeholder="0"
                    onChange={(e) => setExchangeDiscount(Number(e.target.value))}
                    className="w-24 bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-center font-mono font-bold text-red-600 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Subtotal Summary */}
              <div className="text-xs font-bold text-slate-500 text-center md:text-right">
                إجمالي قطع التبديل: <span className="text-slate-900 font-extrabold font-mono">{(exchangeCart.reduce((s, i) => s + i.quantity, 0) + returnedCart.reduce((s, i) => s + i.quantity, 0))}</span> قطعة •
                المدفوع الجديد: <span className="text-blue-600 font-black font-mono">{(exchangeCart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)).toLocaleString()} ج.م</span> •
                المرتجع المخصوم: <span className="text-red-500 font-black font-mono">{(returnedCart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)).toLocaleString()} ج.م</span>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  onClick={handleConfirmExchange}
                  className="flex-1 md:flex-none px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md shadow-blue-600/10 transition-all text-xs cursor-pointer"
                >
                  إتمام وحفظ التبديل ✓
                </button>
                <button
                  onClick={() => {
                    setReturnedCart([]);
                    setExchangeCart([]);
                    setExchangeDiscount(0);
                  }}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  إعادة ضبط
                </button>
              </div>

            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 3: CUSTOMERS & INSTALLMENTS (تحصيل أو مراجعة) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'customers' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" dir="rtl">
            
            {/* Left Column: Customers management (8 cols) */}
            <div className="lg:col-span-8 space-y-6 text-right">
              
              {/* 3A. Large Filter Input (matching Image 3) */}
              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  placeholder="بحث /// فلتر باسم العميل أو رقم الهاتف أو اسم الزوج أو اسم الضامن..."
                  className="w-full bg-white border border-slate-200 rounded-2xl pr-12 pl-12 py-3.5 text-xs text-right focus:outline-none focus:border-blue-600 font-bold placeholder-slate-400 shadow-xs"
                />
                <button 
                  onClick={() => setCustomerSearchQuery('')}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <RefreshCw size={16} />
                </button>
              </div>

              {/* 3B. Toolbar Action Buttons (matching Image 3) */}
              <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200/80 p-2 rounded-xl shadow-xs text-xs font-bold text-slate-700">
                <button
                  onClick={() => setActiveCustomerAction('view-items')}
                  className={`px-4 py-2 rounded-lg border transition-all ${activeCustomerAction === 'view-items' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                >
                  عرض الأصناف
                </button>
                <button
                  onClick={() => setActiveCustomerAction('view-data')}
                  className={`px-4 py-2 rounded-lg border transition-all ${activeCustomerAction === 'view-data' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                >
                  عرض البيانات
                </button>
                <button
                  onClick={() => setActiveCustomerAction('statement')}
                  className={`px-4 py-2 rounded-lg border transition-all ${activeCustomerAction === 'statement' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                >
                  كشف حساب
                </button>
                <button
                  onClick={() => setActiveCustomerAction('collect')}
                  className={`px-4 py-2 rounded-lg border transition-all ${activeCustomerAction === 'collect' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                >
                  تحصيل قسط
                </button>
                <button
                  onClick={() => setActiveCustomerAction('restructure')}
                  className={`px-4 py-2 rounded-lg border transition-all ${activeCustomerAction === 'restructure' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                >
                  إعادة هيكلة الأقساط
                </button>
                <button
                  onClick={() => setActiveCustomerAction('edit-notes')}
                  className={`px-4 py-2 rounded-lg border transition-all ${activeCustomerAction === 'edit-notes' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                >
                  تعديل الملاحظات والتقييم
                </button>
              </div>

              {/* Selected active action overlay/block if selected */}
              {activeCustomerAction && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 shadow-sm space-y-4 text-right animate-fadeIn">
                  
                  {/* Action Header */}
                  <div className="flex justify-between items-center border-b border-blue-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <UserCheck className="text-blue-700" size={16} />
                      <span className="font-extrabold text-xs text-blue-900">
                        {activeCustomerAction === 'statement' && `كشف حساب العميل: ${activeCustomer.name}`}
                        {activeCustomerAction === 'collect' && `أقساط العميل المستحقة: ${activeCustomer.name}`}
                        {activeCustomerAction === 'restructure' && `إعادة هيكلة أقساط: ${activeCustomer.name}`}
                        {activeCustomerAction === 'edit-notes' && `تعديل ملف العميل: ${activeCustomer.name}`}
                        {activeCustomerAction === 'view-items' && `سجل مبيعات ملابس العميل: ${activeCustomer.name}`}
                        {activeCustomerAction === 'view-data' && `ملف البيانات الشامل للعميل: ${activeCustomer.name}`}
                      </span>
                    </div>
                    <button onClick={() => setActiveCustomerAction(null)} className="text-blue-700 hover:text-blue-900 bg-white p-1 rounded-full border border-blue-200">
                      <X size={14} />
                    </button>
                  </div>

                  {/* Action Body 1: STATEMENT */}
                  {activeCustomerAction === 'statement' && (
                    <div className="space-y-3 bg-white p-4 rounded-xl border border-blue-100 text-xs">
                      <div className="grid grid-cols-3 gap-4 border-b border-slate-100 pb-2 text-slate-500 font-bold font-sans">
                        <span>البيان / الفاتورة</span>
                        <span className="text-center">التاريخ والوقت</span>
                        <span className="text-left">القيمة</span>
                      </div>
                      {pastTransactions.filter(tx => tx.customerCode === activeCustomer.code).length === 0 ? (
                        <p className="text-center py-4 text-slate-400">لا يوجد حركات حساب سابقة لهذا العميل.</p>
                      ) : (
                        <div className="divide-y divide-slate-100 max-h-[160px] overflow-y-auto">
                          {pastTransactions.filter(tx => tx.customerCode === activeCustomer.code).map(tx => (
                            <div key={tx.id} className="grid grid-cols-3 gap-4 py-2 text-slate-600 font-mono font-bold font-sans">
                              <span className="text-slate-800">{tx.type === 'sale' ? 'فاتورة بيع ملابس' : 'تبديل ملابس'} - {tx.id}</span>
                              <span className="text-center text-[11px] text-slate-400">{new Date(tx.date).toLocaleDateString('ar-EG')}</span>
                              <span className="text-left text-blue-600">{tx.total.toLocaleString()} ج.م</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="pt-2 border-t border-slate-200 flex justify-between font-extrabold text-slate-900 text-xs font-sans">
                        <span>إجمالي رصيد مديونية الأقساط الحالي:</span>
                        <span className="text-red-600 font-mono text-sm">{activeCustomer.balance.toLocaleString()} ج.م</span>
                      </div>
                    </div>
                  )}

                  {/* Action Body 2: COLLECT INSTALLMENT */}
                  {activeCustomerAction === 'collect' && (
                    <div className="space-y-3">
                      {activeCustomer.installments.length === 0 ? (
                        <div className="bg-white p-6 rounded-xl border border-blue-100 text-center text-slate-400 text-xs">
                          لا يوجد أقساط مسجلة على العميل حالياً.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {activeCustomer.installments.map((inst, idx) => (
                            <div key={inst.id} className="bg-white p-4 rounded-xl border border-blue-100 flex justify-between items-center text-xs">
                              <div className="space-y-1">
                                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[10px] font-bold font-sans">القسط {idx + 1}</span>
                                <div className="font-mono text-slate-800 font-bold mt-1">تاريخ الاستحقاق: {inst.dueDate}</div>
                                <div className="font-mono text-blue-600 font-extrabold">القيمة: {inst.amount.toLocaleString()} ج.م</div>
                              </div>
                              <div>
                                {inst.status === 'paid' ? (
                                  <span className="bg-slate-100 text-slate-500 border border-slate-200 px-3 py-1 rounded-lg font-bold font-sans">تم السداد ✓</span>
                                ) : (
                                  <button
                                    onClick={() => handlePayInstallment(inst.id)}
                                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all shadow-xs font-sans cursor-pointer"
                                  >
                                    تحصيل الآن
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Body 3: RESTRUCTURE */}
                  {activeCustomerAction === 'restructure' && (
                    <form onSubmit={handleRestructureSubmit} className="bg-white p-5 rounded-xl border border-blue-100 space-y-4">
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                        إعادة هيكلة مديونية العميل إلى أقساط جديدة على فترات متباعدة لتسهيل السداد:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600 block">إجمالي مبلغ المديونية الجديد (ج.م):</label>
                          <input
                            type="number"
                            value={restructuredAmount}
                            onChange={(e) => setRestructuredAmount(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600 block">عدد الأشهر (الأقساط):</label>
                          <input
                            type="number"
                            value={restructuredCount}
                            onChange={(e) => setRestructuredCount(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                            required
                          />
                        </div>
                      </div>
                      <button type="submit" className="px-5 py-2 bg-slate-900 text-white rounded-lg font-bold text-xs font-sans cursor-pointer">حفظ وإعادة جدولة الأقساط</button>
                    </form>
                  )}

                  {/* Action Body 4: EDIT FILE */}
                  {activeCustomerAction === 'edit-notes' && (
                    <div className="bg-white p-5 rounded-xl border border-blue-100 space-y-4 font-sans">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600 block">مجموعة العميل (المستوى):</label>
                          <select
                            id="edit-customer-group"
                            defaultValue={activeCustomer.group}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700"
                          >
                            <option value="عادي A">عادي A</option>
                            <option value="عادي B">عادي B</option>
                            <option value="مميز VIP">مميز VIP</option>
                            <option value="عام">عام</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600 block">اسم الزوج / الزوجة:</label>
                          <input
                            type="text"
                            id="edit-customer-spouse"
                            defaultValue={activeCustomer.spouseName || ''}
                            placeholder="مريم السيد"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block">الضامنون (افصل بينهم بفاصلة ,):</label>
                        <input
                          type="text"
                          id="edit-customer-guarantors"
                          defaultValue={activeCustomer.guarantors?.join(', ') || ''}
                          placeholder="أحمد علي مصطفى، محمود جابر"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block">الملاحظات والتقييم الائتماني للعميل:</label>
                        <textarea
                          id="edit-customer-notes"
                          defaultValue={activeCustomer.notes}
                          rows={3}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                        />
                      </div>

                      <button
                        onClick={() => {
                          const notes = (document.getElementById('edit-customer-notes') as HTMLTextAreaElement).value;
                          const group = (document.getElementById('edit-customer-group') as HTMLSelectElement).value;
                          const spouse = (document.getElementById('edit-customer-spouse') as HTMLInputElement).value;
                          const guarantors = (document.getElementById('edit-customer-guarantors') as HTMLInputElement).value;
                          handleUpdateNotesAndGroup(notes, group, spouse, guarantors);
                        }}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs cursor-pointer"
                      >
                        حفظ التعديلات والتقييم
                      </button>
                    </div>
                  )}

                  {/* Action Body 5: VIEW ITEMS */}
                  {activeCustomerAction === 'view-items' && (
                    <div className="bg-white p-5 rounded-xl border border-blue-100 space-y-3 text-xs font-sans">
                      <p className="text-[11px] text-slate-500 font-bold">مشتريات الملابس السابقة للعميل:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {products.slice(0, 2).map(p => (
                          <div key={p.id} className="p-3 border border-slate-100 rounded-xl flex gap-3 items-center bg-white">
                            <img src={p.image} className="w-12 h-12 rounded-lg object-cover" referrerPolicy="no-referrer" />
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-900 block">{p.name}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">الكود: {p.code} • مقاس: {p.specifications?.['المقاس']}</span>
                              <span className="text-xs text-blue-600 font-bold block">{p.price.toLocaleString()} ج.م</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Body 6: VIEW COMPREHENSIVE DATA CARD */}
                  {activeCustomerAction === 'view-data' && (
                    <div className="bg-white p-5 rounded-xl border border-blue-100 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-right font-sans">
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">البيانات الشخصية</span>
                        <div>اسم العميل: <span className="font-bold text-slate-800">{activeCustomer.name}</span></div>
                        <div>الكود الفريد: <span className="font-mono text-slate-800">{activeCustomer.code}</span></div>
                        <div>رقم الموبايل: <span className="font-mono text-slate-800">{activeCustomer.phone || '—'}</span></div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">العائلة والضامنون</span>
                        <div>اسم الزوج/الزوجة: <span className="font-bold text-slate-800">{activeCustomer.spouseName || 'غير مسجل'}</span></div>
                        <div>الضامنون والمعارف: <span className="font-bold text-slate-800">{activeCustomer.guarantors?.join(', ') || 'لا يوجد ضامنين'}</span></div>
                        <div>تصنيف العميل: <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">{activeCustomer.group}</span></div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">الحالة والائتمان</span>
                        <div>المديونية المتبقية: <span className="text-red-600 font-extrabold text-sm font-mono">{activeCustomer.balance.toLocaleString()} ج.م</span></div>
                        <div>حالة الحساب: <span className={`font-bold ${activeCustomer.status === 'Active' ? 'text-blue-600' : 'text-red-500'}`}>{activeCustomer.status === 'Active' ? 'نشط ومصرح بالبيع له' : 'مقيد لوجود تأخير'}</span></div>
                        <div>ملاحظات: <span className="text-slate-500 block leading-relaxed mt-1">{activeCustomer.notes}</span></div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* 3C. HIGH FIDELITY CUSTOMERS TABLE (matching Image 3) */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs font-sans">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                        <th className="py-3 px-4 text-center w-12">#</th>
                        <th className="py-3 px-4">الكود</th>
                        <th className="py-3 px-4">اسم العميل</th>
                        <th className="py-3 px-4 text-left">رصيد العميل</th>
                        <th className="py-3 px-4">ملاحظات</th>
                        <th className="py-3 px-4 text-center">مجموعة العميل</th>
                        <th className="py-3 px-4">اسم الزوج</th>
                        <th className="py-3 px-4">الضامنون</th>
                        <th className="py-3 px-4 text-center">الهاتف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCustomersList.map((c) => (
                        <tr
                          key={c.code}
                          onClick={() => setSelectedCustomerCode(c.code)}
                          className={`hover:bg-slate-50/70 cursor-pointer transition-colors ${selectedCustomerCode === c.code ? 'bg-blue-50/40 font-bold' : ''}`}
                        >
                          <td className="py-4 px-4 text-center">
                            <input
                              type="radio"
                              name="selected-customer-table"
                              checked={selectedCustomerCode === c.code}
                              onChange={() => setSelectedCustomerCode(c.code)}
                              className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                            />
                          </td>
                          <td className="py-4 px-4 font-mono text-slate-500">{c.code}</td>
                          <td className="py-4 px-4 text-slate-900">{c.name}</td>
                          <td className="py-4 px-4 text-left font-mono text-red-500 font-bold">
                            {c.balance.toLocaleString()} ج.م
                          </td>
                          <td className="py-4 px-4 text-slate-400 max-w-[200px] truncate" title={c.notes}>{c.notes}</td>
                          <td className="py-4 px-4 text-center">
                            <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                              {c.group}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-slate-500">{c.spouseName || '—'}</td>
                          <td className="py-4 px-4 text-slate-500 max-w-[150px] truncate" title={c.guarantors?.join(', ')}>
                            {c.guarantors && c.guarantors.length > 0 ? c.guarantors.join(', ') : '—'}
                          </td>
                          <td className="py-4 px-4 text-center font-mono text-slate-500">{c.phone || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Right Column: Smart Accounts & Installment Planner Widget (4 cols) */}
            <div className="lg:col-span-4 space-y-6 text-right">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5 font-sans">
                
                {/* Widget Header */}
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <span className="bg-emerald-50 text-emerald-700 p-2 rounded-xl">
                    <Calculator size={18} />
                  </span>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">حاسبة الأقساط وجدولة الدفع الذكية</h4>
                    <p className="text-[10px] text-slate-400">احسب الأقساط الائتمانية واعتمدها بلمسة واحدة</p>
                  </div>
                </div>

                {/* Calculator Inputs */}
                <div className="space-y-4 text-xs font-bold text-slate-700">
                  
                  {/* Total Purchase */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label>إجمالي قيمة الفاتورة المجدولة:</label>
                      <span className="font-mono text-emerald-600 font-extrabold text-xs">{calcTotalPurchase.toLocaleString()} ج.م</span>
                    </div>
                    <input 
                      type="range" 
                      min="500" 
                      max="50000" 
                      step="100"
                      value={calcTotalPurchase} 
                      onChange={(e) => setCalcTotalPurchase(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                      <span>500 ج.م</span>
                      <span>50,000 ج.م</span>
                    </div>
                  </div>

                  {/* Down Payment */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label>المقدم المدفوع كاش فوري:</label>
                      <span className="font-mono text-blue-600 font-extrabold text-xs">{calcDownPayment.toLocaleString()} ج.م</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max={calcTotalPurchase} 
                      step="50"
                      value={calcDownPayment} 
                      onChange={(e) => setCalcDownPayment(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                      <span>0 ج.م</span>
                      <span>{calcTotalPurchase.toLocaleString()} ج.م</span>
                    </div>
                  </div>

                  {/* Months Period */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label>فترة التقسيط المطلوبة:</label>
                      <span className="font-mono text-indigo-600 font-extrabold text-xs">{calcMonthsCount} أشهر</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="24" 
                      step="1"
                      value={calcMonthsCount} 
                      onChange={(e) => setCalcMonthsCount(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                      <span>شهر واحد</span>
                      <span>24 شهر</span>
                    </div>
                  </div>

                  {/* Interest Rate */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label>نسبة الفائدة الشهرية الإضافية:</label>
                      <span className="font-mono text-red-500 font-extrabold text-xs">{calcInterestRate}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="10" 
                      step="0.5"
                      value={calcInterestRate} 
                      onChange={(e) => setCalcInterestRate(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-red-500"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                      <span>0% (بدون فوائد)</span>
                      <span>10% شهرياً</span>
                    </div>
                  </div>

                </div>

                {/* Calculations Math Output Card */}
                {(() => {
                  const principal = Math.max(0, calcTotalPurchase - calcDownPayment);
                  const totalInterest = principal * (calcInterestRate / 100) * calcMonthsCount;
                  const finalTotalWithInterest = principal + totalInterest;
                  const monthlyInstallment = calcMonthsCount > 0 ? Math.round(finalTotalWithInterest / calcMonthsCount) : 0;

                  return (
                    <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-2.5 text-xs font-sans">
                      <div className="flex justify-between font-bold text-slate-600">
                        <span>المتبقي المراد جدولته:</span>
                        <span className="font-mono text-slate-800">{principal.toLocaleString()} ج.م</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-600">
                        <span>إجمالي الفوائد المضافة ({calcMonthsCount} شهر):</span>
                        <span className="font-mono text-red-500">+{totalInterest.toLocaleString()} ج.م</span>
                      </div>
                      <div className="h-px bg-slate-200"></div>
                      <div className="flex justify-between font-extrabold text-slate-800">
                        <span>إجمالي مبلغ الدين بالفوائد:</span>
                        <span className="font-mono text-slate-950 text-sm">{finalTotalWithInterest.toLocaleString()} ج.م</span>
                      </div>
                      
                      {/* Highlights Box */}
                      <div className="bg-emerald-600 text-white rounded-lg p-2.5 text-center space-y-0.5">
                        <span className="text-[9px] font-black opacity-85 block">قيمة القسط الشهري الثابت</span>
                        <div className="font-mono text-base font-black">{monthlyInstallment.toLocaleString()} ج.م / شهر</div>
                        <span className="text-[8px] opacity-75 block">لمدة {calcMonthsCount} أشهر متتالية</span>
                      </div>

                      {/* Action apply to selected customer */}
                      <button
                        onClick={() => handleApplyCalculatedPlan(finalTotalWithInterest, monthlyInstallment, calcMonthsCount)}
                        className="w-full mt-2 py-2 bg-slate-900 hover:bg-slate-850 text-white font-extrabold text-[10px] rounded-lg transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>✓ اعتماد خطة الأقساط هذه لـ {activeCustomer.name}</span>
                      </button>
                    </div>
                  );
                })()}

                {/* Prediction Schedule Preview */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-black text-slate-400 block uppercase">معاينة تواريخ وتفاصيل الأقساط:</span>
                  <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                    {(() => {
                      const principal = Math.max(0, calcTotalPurchase - calcDownPayment);
                      const totalInterest = principal * (calcInterestRate / 100) * calcMonthsCount;
                      const finalTotalWithInterest = principal + totalInterest;
                      const monthlyInstallment = calcMonthsCount > 0 ? Math.round(finalTotalWithInterest / calcMonthsCount) : 0;

                      const schedule = [];
                      const today = new Date();
                      for (let i = 1; i <= calcMonthsCount; i++) {
                        const nextDate = new Date(today.getFullYear(), today.getMonth() + i, 15);
                        schedule.push({
                          id: i,
                          dateStr: nextDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'numeric', day: 'numeric' }),
                          amount: monthlyInstallment
                        });
                      }

                      return schedule.map((item) => (
                        <div key={item.id} className="border border-slate-100 rounded-lg p-2 flex justify-between items-center text-[10px] bg-slate-50/40">
                          <span className="font-bold text-slate-500 font-sans">القسط {item.id} من {calcMonthsCount}</span>
                          <span className="font-mono font-bold text-slate-600">🗓 {item.dateStr}</span>
                          <span className="font-mono font-black text-emerald-700">{item.amount.toLocaleString()} ج.م</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 4: LABELS & STICKERS GENERATOR (طباعة ملصق الملابس) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'labels' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-right space-y-6">
            
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">مولد ومصمم ملصقات الملابس الحرارية</h3>
              <p className="text-xs text-slate-400 mt-1">صمم كارت التسعير الورقي الملتصق بالملابس واطبعه فوراً لمسحه يدوياً.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Configuration Form */}
              <div className="lg:col-span-7 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">اختر قطعة الملابس من المخزن:</label>
                  <select
                    value={selectedProductForTag?.id || ''}
                    onChange={(e) => {
                      const found = products.find(p => p.id === e.target.value);
                      if (found) {
                        setSelectedProductForTag(found);
                        setTagCustomSize('');
                        setTagCustomColor('');
                        setTagCustomPrice('');
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-bold"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">اسم المحل / العلامة التجارية على الملصق:</label>
                  <input
                    type="text"
                    value={tagCustomStore}
                    onChange={(e) => setTagCustomStore(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">المقاس (اختياري):</label>
                    <input
                      type="text"
                      value={tagCustomSize}
                      onChange={(e) => setTagCustomSize(e.target.value)}
                      placeholder={selectedProductForTag?.specifications?.['المقاس'] || 'مثال: L / XL'}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">اللون (اختياري):</label>
                    <input
                      type="text"
                      value={tagCustomColor}
                      onChange={(e) => setTagCustomColor(e.target.value)}
                      placeholder={selectedProductForTag?.specifications?.['اللون'] || 'مثال: أزرق'}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">سعر مخصص للطباعة:</label>
                    <input
                      type="number"
                      value={tagCustomPrice}
                      onChange={(e) => setTagCustomPrice(e.target.value !== '' ? Number(e.target.value) : '')}
                      placeholder={selectedProductForTag?.price?.toString()}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">عدد الكروت المطبوعة:</label>
                    <input
                      type="number"
                      value={tagPrintQty}
                      onChange={(e) => setTagPrintQty(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <button
                  onClick={triggerStickersPrint}
                  disabled={isPrintingAnim || !selectedProductForTag}
                  className="w-full bg-slate-900 hover:bg-slate-850 disabled:bg-slate-100 text-white font-extrabold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Printer size={15} />
                  <span>{isPrintingAnim ? 'جاري إرسال أوامر الطباعة الحرارية...' : 'طباعة ملصقات الباركود والأسعار الآن'}</span>
                </button>
              </div>

              {/* Physical Preview tag card representation */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-50 p-6 rounded-2xl border border-slate-200 min-h-[300px]">
                <span className="text-[10px] text-slate-400 font-bold block mb-4">كارت تسعير الملابس (Sticker Preview)</span>
                
                {selectedProductForTag ? (
                  <div className="space-y-4 flex flex-col items-center">
                    
                    {/* The Sticker itself */}
                    <div className="bg-white border-2 border-slate-900 rounded-xl p-4 w-[220px] text-center shadow-md font-sans text-slate-900 relative">
                      <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-slate-100 border border-slate-250"></div> {/* hole */}
                      
                      <div className="text-[10px] font-extrabold tracking-wide text-slate-500 uppercase">{tagCustomStore}</div>
                      <div className="h-px bg-slate-300 my-1.5"></div>
                      
                      <div className="text-xs font-extrabold text-slate-900 leading-snug">{selectedProductForTag.name}</div>
                      
                      <div className="grid grid-cols-2 gap-1 my-2 text-[10px] text-slate-600 font-mono font-bold bg-slate-50 p-1.5 rounded">
                        <div className="border-l border-slate-200">
                          <span>المقاس: </span>
                          <span className="text-slate-950 font-extrabold">{finalStickerSize}</span>
                        </div>
                        <div>
                          <span>اللون: </span>
                          <span className="text-slate-950 font-extrabold">{finalStickerColor}</span>
                        </div>
                      </div>

                      <div className="text-center my-2">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${selectedProductForTag.barcode}`}
                          alt="Barcode QR"
                          className="w-20 h-20 mx-auto border border-slate-100 p-0.5 rounded bg-white"
                          referrerPolicy="no-referrer"
                        />
                        <span className="font-mono text-[9px] text-slate-400 font-bold block mt-1">{selectedProductForTag.barcode}</span>
                      </div>

                      <div className="h-px bg-slate-300 my-1.5"></div>
                      
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[9px] text-slate-400">سعر البيع:</span>
                        <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {finalStickerPrice.toLocaleString()} ج.م
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (activeTab === 'sales') {
                          addProductToSalesCart(selectedProductForTag);
                        } else if (activeTab === 'exchange') {
                          addProductToExchangeCart(selectedProductForTag);
                        } else {
                          setActiveTab('sales');
                          addProductToSalesCart(selectedProductForTag);
                        }
                      }}
                      className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                    >
                      <span>⚡ اضغط هنا لمحاكاة مسح الملصق بالليزر</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">الرجاء تحديد صنف للمعاينة</p>
                )}
              </div>

            </div>

          </div>
        )}

      </main>

      {/* 4. MODALS & POPUPS */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        simulationProducts={products}
        onScanSuccess={(scanned) => {
          if (scannerPurpose === 'sales-add') {
            const found = products.find(p => p.barcode === scanned);
            if (found) {
              addProductToSalesCart(found);
            } else {
              alert(`تم مسح الباركود بنجاح: ${scanned} ولكن لم نعثر على قطعة ملابس مطابقة في السيستم.`);
            }
          } else if (scannerPurpose === 'exchange-add') {
            const found = products.find(p => p.barcode === scanned);
            if (found) {
              addProductToExchangeCart(found);
            } else {
              alert(`تم مسح الباركود بنجاح: ${scanned} ولكن لم نعثر على صنف مطابق في السيستم.`);
            }
          }
        }}
        title="ماسح الكاشير بالـ QR والباركود"
        description="وجه الكاميرا نحو الكود اللاصق بقطعة الملابس لمسحها فوراً."
      />

      {/* Dynamic MODALS for POS loading actions */}
      {activePOSModal === 'pending-orders' && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="bg-amber-600 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} />
                <h3 className="font-extrabold text-sm">الأوردرات المعلقة في المنفذ ({pendingOrders.length})</h3>
              </div>
              <button 
                onClick={() => setActivePOSModal(null)}
                className="text-white/80 hover:text-white bg-black/10 hover:bg-black/20 p-1.5 rounded-full transition-all cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[400px] overflow-y-auto">
              <p className="text-xs text-slate-400">انقر على أي أوردر معلق لاستدعاء وحقن جميع الأصناف المحفوظة فوراً في سلة الكاشير:</p>
              {pendingOrders.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">لا توجد أوردرات معلقة حالياً في النظام.</p>
              ) : (
              <div className="space-y-3">
                {pendingOrders.map((ord) => (
                  <div key={ord.id} className="border border-slate-150 rounded-xl p-4 hover:border-amber-400 hover:bg-amber-50/20 transition-all space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono bg-amber-100 text-amber-900 px-2.5 py-1 rounded-md font-extrabold">{ord.id}</span>
                      <span className="text-slate-400 font-bold">{ord.date}</span>
                    </div>
                    <div className="space-y-1.5 text-right">
                      <div className="text-xs font-bold text-slate-800">العميل: <span className="text-slate-900 font-extrabold">{ord.customerName}</span></div>
                      <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg leading-relaxed">
                        <span className="font-bold block text-slate-600 mb-1">قطع الملابس المحفوظة:</span>
                        {ord.items.map((it, idx) => {
                          const p = findProductForLoad(products, it.productId);
                          return (
                            <div key={idx} className="flex justify-between font-bold text-slate-700">
                              <span>• {p?.name || `صنف ${it.productId}`}</span>
                              <span className="font-mono text-blue-700">الكمية: {it.qty}</span>
                            </div>
                          );
                        })}
                      </div>
                      {ord.notes ? <div className="text-xs text-slate-400 italic">📝 {ord.notes}</div> : null}
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <span className="text-xs font-bold text-slate-500">القيمة الإجمالية: <span className="font-mono font-extrabold text-slate-900 text-sm">{ord.total.toLocaleString()} ج.م</span></span>
                      <button
                        type="button"
                        onClick={() => void handleLoadPOSItemToCart(ord, () => onLoadPendingOrder(ord.id))}
                        className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        ⚡ تحميل للسلة
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activePOSModal === 'price-quotes' && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="bg-indigo-600 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText size={18} />
                <h3 className="font-extrabold text-sm">عروض الأسعار النشطة ({priceQuotes.length})</h3>
              </div>
              <button 
                onClick={() => setActivePOSModal(null)}
                className="text-white/80 hover:text-white bg-black/10 hover:bg-black/20 p-1.5 rounded-full transition-all cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[400px] overflow-y-auto">
              <p className="text-xs text-slate-400">انقر لسحب وتحميل تفاصيل عرض السعر مباشرة في سلة المبيعات لإصدار فاتورة بيع نهائية:</p>
              {priceQuotes.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">لا توجد عروض أسعار نشطة في النظام.</p>
              ) : (
              <div className="space-y-3">
                {priceQuotes.map((quote) => (
                  <div key={quote.id} className="border border-slate-150 rounded-xl p-4 hover:border-indigo-400 hover:bg-indigo-50/20 transition-all space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono bg-indigo-100 text-indigo-900 px-2.5 py-1 rounded-md font-extrabold">{quote.id}</span>
                      <span className="text-slate-400 font-bold">{quote.date}</span>
                    </div>
                    <div className="space-y-1.5 text-right">
                      <div className="text-xs font-bold text-slate-800">جهة العرض: <span className="text-slate-900 font-extrabold">{quote.customerName}</span></div>
                      <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg leading-relaxed">
                        <span className="font-bold block text-slate-600 mb-1">تفاصيل بنود عرض السعر:</span>
                        {quote.items.map((it, idx) => {
                          const p = findProductForLoad(products, it.productId);
                          return (
                            <div key={idx} className="flex justify-between font-bold text-slate-700">
                              <span>• {p?.name || `صنف ${it.productId}`}</span>
                              <span className="font-mono text-blue-700">الكمية: {it.qty}</span>
                            </div>
                          );
                        })}
                      </div>
                      {quote.notes ? <div className="text-xs text-slate-400 italic">📝 {quote.notes}</div> : null}
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <span className="text-xs font-bold text-slate-500">القيمة الإجمالية: <span className="font-mono font-extrabold text-slate-900 text-sm">{quote.total.toLocaleString()} ج.م</span></span>
                      <button
                        type="button"
                        onClick={() => void handleLoadPOSItemToCart(quote, () => onLoadQuote(quote.id))}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        ⚡ استدعاء الفاتورة
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activePOSModal === 'pre-bookings' && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="bg-emerald-600 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Award size={18} />
                <h3 className="font-extrabold text-sm">طلبات الحجوزات المسبقة ومقدمات الدفع ({preBookings.length})</h3>
              </div>
              <button 
                onClick={() => setActivePOSModal(null)}
                className="text-white/80 hover:text-white bg-black/10 hover:bg-black/20 p-1.5 rounded-full transition-all cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[400px] overflow-y-auto">
              <p className="text-xs text-slate-400">انقر لاستدعاء قطعة الملابس المحجوزة لتسجيل فاتورة الاستلام والتحصيل المتبقي:</p>
              {preBookings.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">لا توجد حجوزات مسبقة نشطة في النظام.</p>
              ) : (
              <div className="space-y-3">
                {preBookings.map((bkg) => (
                  <div key={bkg.id} className="border border-slate-150 rounded-xl p-4 hover:border-emerald-400 hover:bg-emerald-50/20 transition-all space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-md font-extrabold">{bkg.id}</span>
                      <span className="text-slate-400 font-bold">{bkg.date}</span>
                    </div>
                    <div className="space-y-1.5 text-right">
                      <div className="text-xs font-bold text-slate-800">الحاجز: <span className="text-slate-900 font-extrabold">{bkg.customerName}</span></div>
                      <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg leading-relaxed">
                        <span className="font-bold block text-slate-600 mb-1">قطعة الملابس المحجوزة:</span>
                        {bkg.items.map((it, idx) => {
                          const p = findProductForLoad(products, it.productId);
                          return (
                            <div key={idx} className="flex justify-between font-bold text-slate-700">
                              <span>• {p?.name || `صنف ${it.productId}`}</span>
                              <span className="font-mono text-blue-700">الكمية: {it.qty}</span>
                            </div>
                          );
                        })}
                      </div>
                      {(bkg.deposit != null || bkg.remaining != null) ? (
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg text-[10px] text-slate-500 font-bold">
                          <div>المقدم المدفوع: <span className="text-emerald-600 font-mono font-extrabold">{bkg.deposit ?? 0} ج.م</span></div>
                          <div>المتبقي المطلوب: <span className="text-red-500 font-mono font-extrabold">{bkg.remaining ?? 0} ج.م</span></div>
                        </div>
                      ) : null}
                      {bkg.notes ? <div className="text-xs text-slate-400 italic">📝 {bkg.notes}</div> : null}
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <span className="text-xs font-bold text-slate-500">القيمة الكلية: <span className="font-mono font-extrabold text-slate-900 text-sm">{bkg.total.toLocaleString()} ج.م</span></span>
                      <button
                        type="button"
                        onClick={() => void handleLoadPOSItemToCart(bkg, () => onLoadReservation(bkg.id))}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        ⚡ تحميل للتسليم
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Past Invoice Selection Modal for Returns */}
      {isSelectingReturnInvoice && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="bg-red-600 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Search size={18} />
                <h3 className="font-extrabold text-sm">استيراد أصناف من فاتورة مبيعات سابقة</h3>
              </div>
              <button 
                onClick={() => setIsSelectingReturnInvoice(false)}
                className="text-white/80 hover:text-white bg-black/10 hover:bg-black/20 p-1.5 rounded-full transition-all cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto">
              <p className="text-xs text-slate-400">اختر فاتورة من الفواتير السابقة الفعالة لسحب القطع المشتراة وتجهيزها للإرجاع أو التبديل الفوري:</p>

              {pastTransactions.filter((t) => t.type === 'sale' && t.items.length > 0).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">لا توجد فواتير مبيعات سابقة في النظام.</p>
              ) : (
                <div className="space-y-3">
                  {pastTransactions
                    .filter((t) => t.type === 'sale' && t.items.length > 0)
                    .map((tx) => (
                      <div key={tx.id} className="border border-slate-150 rounded-xl p-4 hover:border-red-400 hover:bg-red-50/10 transition-all space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-mono bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md font-extrabold">{tx.id}</span>
                          <span className="text-slate-400 font-bold">{new Date(tx.date).toLocaleDateString('ar-EG')}</span>
                        </div>
                        <div className="space-y-1.5 text-right">
                          <div className="text-xs font-bold text-slate-800">العميل المشتري: <span className="text-slate-900 font-extrabold">{tx.customerName}</span></div>
                          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg">
                            <span className="font-bold block text-slate-600 mb-1">الأصناف المشتراة في الفاتورة:</span>
                            {tx.items.map((it, idx) => (
                              <div key={idx} className="flex justify-between font-bold text-slate-700 font-sans">
                                <span>• {it.product.name}</span>
                                <span className="font-mono text-slate-500">الكمية: {it.quantity} × {it.product.price.toLocaleString()} ج.م</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                          <span className="text-xs font-bold text-slate-500 font-sans">القيمة الإجمالية: <span className="font-mono font-extrabold text-slate-900 text-sm">{tx.total.toLocaleString()} ج.م</span></span>
                          <button
                            type="button"
                            onClick={() => handleSelectReturnFromPastInvoice(tx)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1 font-sans"
                          >
                            <span>📥 استدعاء للإرجاع</span>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <InvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        transaction={completedTx}
      />

    </div>
  );
}
