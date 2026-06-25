import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  Table as TableIcon, 
  Settings, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  List,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  ShoppingBag,
  Undo2,
  Truck,
  Calendar,
  User,
  Hash,
  Info,
  Layers,
  Tag,
  Maximize2,
  Minimize2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Invoice {
  id: string;
  number: string;
  supplier: string;
  season: string;
  date: string;
  total: number;
  status: 'Draft' | 'Sent' | 'Paid' | 'Cancelled';
  createdBy: string;
  createdAt: string;
}

interface Product {
  id: string;
  model: string;
  description: string;
  brand: string;
  supplier: string;
  season: string;
  purchasePrice: number;
  salePrice: number;
  displayPrice: number;
  lastPurchasePrice: number;
  stockCount: number;
  purchaseHistoryCount: number;
}

interface InvoiceItem {
  id: string;
  productId: string;
  model: string;
  description: string;
  brand: string;
  quantity: number;
  purchasePrice: number;
  discountType: 'percentage' | 'amount';
  discountValue: number;
  totalValue: number;
  netPrice: number;
  profitMargin: number;
  salePrice: number;
  stockInBranches: number;
  lastPurchasePrice: number;
  purchaseHistoryCount: number;
  season: string;
  offerPrice: number;
  showCard?: boolean;
}

interface SizeColorGridProps {
  onClose: () => void;
  onApply: (data: any) => void;
  productName: string;
}

const SizeColorGrid: React.FC<SizeColorGridProps> = ({ onClose, onApply, productName }) => {
  const sizes = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
  const colors = ['Black', 'Navy', 'Grey', 'White', 'Blue', 'Red', 'Green'];
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const handleQtyChange = (color: string, size: string, qty: number) => {
    setQuantities(prev => ({
      ...prev,
      [`${color}-${size}`]: qty
    }));
  };

  const total = Object.values(quantities).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 bg-[#4169E1] text-white flex items-center justify-between">
           <div>
             <h3 className="text-xl font-black uppercase tracking-tight">Size & Color Matrix</h3>
             <p className="text-blue-100 text-xs font-medium">{productName}</p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
             <X size={24} />
           </button>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-slate-50">
          <table className="w-full border-separate border-spacing-2">
            <thead>
              <tr>
                <th className="p-2"></th>
                {sizes.map(size => (
                  <th key={size} className="p-2 text-xs font-black text-slate-400 bg-white rounded-xl border border-slate-200 uppercase">{size}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {colors.map(color => (
                <tr key={color}>
                  <td className="p-2 text-xs font-black text-slate-700 bg-white rounded-xl border border-slate-200 uppercase whitespace-nowrap min-w-[80px]">{color}</td>
                  {sizes.map(size => (
                    <td key={size} className="p-2">
                      <input 
                        type="number"
                        min="0"
                        placeholder="0"
                        value={quantities[`${color}-${size}`] || ''}
                        onChange={(e) => handleQtyChange(color, size, Number(e.target.value))}
                        className="w-full h-10 bg-white border border-slate-200 rounded-xl text-center font-bold text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-200"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-white border-t border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="bg-slate-100 px-4 py-2 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-black text-slate-400 uppercase block leading-none mb-1">Total Matrix Qty</span>
                <span className="text-xl font-black text-slate-900">{total} <span className="text-xs text-slate-400">PCS</span></span>
              </div>
           </div>
           <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="h-12 px-8 rounded-xl font-bold text-slate-600">Cancel</Button>
              <Button onClick={() => onApply(quantities)} className="h-12 px-8 rounded-xl font-black bg-[#4169E1] hover:bg-blue-700 shadow-lg shadow-blue-100 uppercase tracking-widest text-xs">
                Apply Selection
              </Button>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

const PurchaseInvoiceForm: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  type: 'invoice' | 'return';
  mode: 'add' | 'edit' | 'view';
}> = ({ isOpen, onClose, type, mode }) => {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [supplier, setSupplier] = useState('');
  const [season, setSeason] = useState('Summer 2025');
  const [brand, setBrand] = useState('');
  const [section, setSection] = useState('');
  const [group, setGroup] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [profitMargin, setProfitMargin] = useState(30);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSizeGrid, setShowSizeGrid] = useState(false);
  const [activeProductName, setActiveProductName] = useState('');

  // Focus management
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const quantityInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

  // Dummy products for search
  const products: Product[] = [
    { id: '1', model: '356', description: 'Blazer Meshgar', brand: 'Al-Nurmod', supplier: 'Al-Amal Co.', season: 'Summer 2025', purchasePrice: 500, salePrice: 610, displayPrice: 530, lastPurchasePrice: 610, stockCount: 20, purchaseHistoryCount: 2 },
    { id: '2', model: '800', description: 'Jacket', brand: 'Al-Nurmod', supplier: 'Al-Amal Co.', season: 'Winter 2025', purchasePrice: 500, salePrice: 700, displayPrice: 1200, lastPurchasePrice: 700, stockCount: 15, purchaseHistoryCount: 1 },
    { id: '3', model: '800', description: 'Jacket', brand: 'Al-Nurmod', supplier: 'Global Tech', season: 'Summer 2025', purchasePrice: 900, salePrice: 1500, displayPrice: 1500, lastPurchasePrice: 1500, stockCount: 5, purchaseHistoryCount: 3 },
    { id: '4', model: '800', description: 'Jacket', brand: 'Al-Nurmod', supplier: 'Al-Amal Co.', season: 'Winter 2024', purchasePrice: 750, salePrice: 1000, displayPrice: 1000, lastPurchasePrice: 1000, stockCount: 0, purchaseHistoryCount: 0 },
  ];

  const filteredProducts = products.filter(p => {
    const queryParts = searchQuery.toLowerCase().split(/\s+/).filter(q => q);
    if (queryParts.length === 0) return false;
    return queryParts.every(part => 
      p.model.toLowerCase().includes(part) || 
      p.description.toLowerCase().includes(part) || 
      p.brand.toLowerCase().includes(part) ||
      p.supplier.toLowerCase().includes(part)
    );
  });

  const handleProductSelect = (product: Product) => {
    // Validation
    if (product.supplier !== supplier && supplier !== '') {
      if (!confirm(`This item belongs to ${product.supplier}, but the invoice is for ${supplier}. Do you want to add it anyway?`)) {
        return;
      }
    }
    if (product.season !== season && season !== '') {
      if (!confirm(`This item belongs to season ${product.season}, but the invoice is for ${season}. Do you want to add it anyway?`)) {
        return;
      }
    }

    const newItem: InvoiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      productId: product.id,
      model: product.model,
      description: product.description,
      brand: product.brand,
      quantity: 1,
      purchasePrice: product.purchasePrice,
      discountType: 'amount',
      discountValue: 0,
      totalValue: product.purchasePrice,
      netPrice: product.purchasePrice,
      profitMargin: profitMargin,
      salePrice: product.salePrice,
      offerPrice: product.salePrice,
      stockInBranches: product.stockCount,
      lastPurchasePrice: product.lastPurchasePrice,
      purchaseHistoryCount: product.purchaseHistoryCount,
      season: product.season,
    };

    setItems([...items, newItem]);
    setSearchQuery('');
    setShowSearchResults(false);
    
    // Trigger Size Grid for the new item
    setActiveProductName(`${product.model} - ${product.description}`);
    setShowSizeGrid(true);

    // Auto-focus quantity field of the new item
    setTimeout(() => {
      quantityInputRefs.current[newItem.id]?.focus();
      quantityInputRefs.current[newItem.id]?.select();
    }, 100);
  };

  const calculateTotals = () => {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = items.reduce((sum, item) => sum + (item.purchasePrice * item.quantity), 0);
    const totalDiscounts = items.reduce((sum, item) => sum + item.discountValue, 0);
    const netTotal = totalValue - totalDiscounts;
    return { totalItems, totalValue, totalDiscounts, netTotal };
  };

  const totals = calculateTotals();

  useEffect(() => {
    if (isOpen) {
      setIsFullscreen(true);
    } else {
      setIsFullscreen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, [isFullscreen]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-screen max-w-full sm:max-w-none p-0 flex flex-col bg-[#F8FAFC] overflow-hidden border-none text-slate-900 !w-screen !max-w-none transition-none">
        
        {showSizeGrid && (
          <SizeColorGrid 
            productName={activeProductName}
            onClose={() => setShowSizeGrid(false)}
            onApply={(qtys) => {
              const totalSelected = Object.values(qtys).reduce((a: any, b: any) => a + (b || 0), 0) as number;
              if (totalSelected > 0) {
                 const updatedItems = [...items];
                 if (updatedItems.length > 0) {
                    updatedItems[updatedItems.length - 1].quantity = totalSelected;
                    updatedItems[updatedItems.length - 1].totalValue = totalSelected * updatedItems[updatedItems.length - 1].netPrice;
                    setItems(updatedItems);
                 }
              }
              setShowSizeGrid(false);
            }}
          />
        )}

        <div className="flex-1 flex w-full overflow-hidden flex-col">
          {/* Unified Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#F1F5F9]">
            <div className="bg-white border-b border-slate-200 p-2 sticky top-0 z-30 shadow-sm flex flex-col gap-2">
              {/* Row 1: Header / Title & Metadata */}
              <div className="flex items-center justify-between mb-1 px-1">
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-lg shadow-sm", type === 'return' ? "bg-orange-500 text-white" : "bg-blue-600 text-white")}>
                    {type === 'return' ? <Undo2 size={16} /> : <ShoppingBag size={16} />}
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                      {mode === 'add' ? `New ${type === 'invoice' ? 'Purchase' : 'Return'}` : 'Edit Invoice'}
                    </h2>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-[30px] w-[110px] bg-slate-50 border border-slate-200 px-2 rounded-lg flex items-center justify-between shadow-inner shrink-0 overflow-hidden text-[16px] leading-[30px] font-bold">
                    <User size={10} className="text-purple-500" />
                    <span className="text-[10px] font-black text-slate-700 uppercase truncate h-[25px] w-[76.7px] text-center">Hany Helmy</span>
                  </div>
                  <div className="h-[28px] w-[100px] bg-slate-50 border border-slate-200 px-2 rounded-lg flex items-center justify-between shadow-inner shrink-0 leading-none">
                    <Calendar size={10} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-slate-800">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Controls Grid */}
              <div className="flex items-start gap-4">
                {/* Column 1: Supplier & Season */}
                <div className="flex flex-col gap-1 w-[170px]">
                  <div className="flex gap-1 w-full">
                     <select 
                       value={supplier} 
                       onChange={(e) => setSupplier(e.target.value)}
                       className="w-[134px] h-[32px] bg-slate-50 border border-slate-200 rounded-lg px-2 text-[12px] font-black uppercase tracking-tight outline-none focus:border-blue-500 transition-all"
                     >
                       <option value="">Supplier</option>
                       <option value="Al-Amal Co.">Al-Amal Co.</option>
                       <option value="Global Tech">Global Tech</option>
                     </select>
                     <Button variant="outline" size="icon" className="h-[32px] w-[32px] rounded-lg border border-slate-200 shrink-0"><Plus size={12} /></Button>
                  </div>
                  <div className="flex gap-1 w-full relative">
                     <select 
                       value={season} 
                       onChange={(e) => setSeason(e.target.value)}
                       className="w-[170px] h-[32px] bg-slate-50 border border-slate-200 rounded-lg px-2 text-[12px] font-black outline-none focus:border-blue-500 transition-all uppercase"
                     >
                       <option value="Summer 2025">Summer 25</option>
                       <option value="Winter 2024">Winter 24</option>
                     </select>
                  </div>
                </div>

                {/* Column 3: Brand over Section + Search */}
                <div className="flex flex-col gap-1 w-[460px]">
                  <div className="flex gap-1 w-full">
                    <select 
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="w-[128px] h-[32px] bg-slate-50 border border-slate-200 rounded-lg px-2 text-[14px] font-black outline-none focus:border-blue-500 transition-all uppercase"
                    >
                      <option value="">Brand</option>
                      <option value="Al-Nurmod">Al-Nurmod</option>
                    </select>
                    <div className="relative group flex-1">
                      <input 
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Notes..."
                        className="w-full h-[32px] px-3 bg-slate-50 border border-slate-200 rounded-lg text-[14px] font-bold outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
                         <FileText size={14} />
                      </div>
                    </div>
                    <Button variant="outline" size="icon" className="h-[32px] w-[32px] rounded-lg border border-slate-200 shrink-0"><Plus size={12} /></Button>
                  </div>
                  <div className="flex gap-1 w-full">
                    <select 
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      className="w-[128px] h-[32px] bg-slate-50 border border-slate-200 rounded-lg px-2 text-[11px] font-black outline-none focus:border-blue-500 transition-all uppercase"
                    >
                      <option value="">Section</option>
                      <option value="Men">Men</option>
                      <option value="Women">Women</option>
                      <option value="Kids">Kids</option>
                    </select>
                    <div className="relative flex-1 group">
                       <input 
                         ref={searchInputRef}
                         type="text"
                         value={searchQuery}
                         onChange={(e) => {
                           setSearchQuery(e.target.value);
                           setShowSearchResults(e.target.value.length > 0);
                         }}
                         placeholder="Search Products..."
                         className="w-full h-[32px] pl-8 pr-9 bg-slate-50 border border-slate-200 rounded-lg text-[16px] leading-[24px] font-bold outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                       />
                       <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
                          <Search size={14} strokeWidth={2.5} />
                       </div>
                       <AnimatePresence>
                         {showSearchResults && (
                           <motion.div 
                             initial={{ opacity: 0, y: 10 }}
                             animate={{ opacity: 1, y: 0 }}
                             exit={{ opacity: 0, y: 10 }}
                             className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-blue-100 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[100] max-h-[400px] overflow-hidden"
                           >
                             <div className="overflow-x-auto min-w-[600px]">
                               <table className="w-full text-left border-collapse">
                                 <thead className="bg-[#4169E1] text-white sticky top-0">
                                   <tr>
                                     <th className="p-3 text-[10px] font-black uppercase border-r border-white/20">Model</th>
                                     <th className="p-3 text-[10px] font-black uppercase border-r border-white/20">Description</th>
                                     <th className="p-3 text-[10px] font-black uppercase border-r border-white/20">Brand</th>
                                     <th className="p-3 text-[10px] font-black uppercase border-r border-white/20 text-center text-orange-200">Season</th>
                                     <th className="p-3 text-[10px] font-black uppercase border-r border-white/20 text-center">Price</th>
                                     <th className="p-3 text-[10px] font-black uppercase text-center">Sale</th>
                                   </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                   {filteredProducts.length > 0 ? filteredProducts.map(p => (
                                     <tr 
                                       key={p.id} 
                                       onClick={() => handleProductSelect(p)}
                                       className="hover:bg-blue-50 cursor-pointer transition-colors group"
                                     >
                                       <td className="p-3 text-xs font-black text-blue-600 border-r border-slate-100">{p.model}</td>
                                       <td className="p-3 text-xs font-bold text-slate-700 border-r border-slate-100 uppercase">{p.description}</td>
                                       <td className="p-3 text-xs font-bold text-slate-500 border-r border-slate-100 uppercase">{p.brand}</td>
                                       <td className="p-3 text-[10px] font-black text-orange-600 border-r border-slate-100 text-center italic uppercase">{p.season}</td>
                                       <td className="p-3 text-xs font-black text-slate-900 text-center border-r border-slate-100">${p.purchasePrice}</td>
                                       <td className="p-3 text-xs font-black text-emerald-600 text-center">${p.salePrice}</td>
                                     </tr>
                                   )) : (
                                     <tr>
                                       <td colSpan={5} className="p-8 text-center text-slate-400 italic text-sm font-bold">No results found.</td>
                                     </tr>
                                   )}
                                 </tbody>
                               </table>
                              </div>
                              {/* Add Product Button in Search Results */}
                              <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-center">
                                <Button 
                                  className="h-8 px-4 rounded-lg font-black bg-[#4169E1] hover:bg-blue-700 text-white shadow-sm flex items-center gap-2 uppercase tracking-widest text-[9px] border-none transition-all active:scale-95"
                                >
                                  <Plus size={14} />
                                  Add New Product
                                </Button>
                              </div>
                            </motion.div>
                         )}
                       </AnimatePresence>
                    </div>
                    <Button variant="outline" size="icon" className="h-[32px] w-[32px] rounded-lg border border-slate-200 shrink-0"><Plus size={12} /></Button>
                  </div>
                </div>

                {/* Column Last: Margin */}
                <div className="flex flex-col gap-1 w-[100px]">
                  <div className="relative group w-full">
                    <input 
                      type="number"
                      value={profitMargin}
                      onChange={(e) => setProfitMargin(Number(e.target.value))}
                      className="w-full h-[32px] pl-3 bg-slate-50 border border-slate-200 rounded-lg px-2 text-[14px] font-bold outline-none text-[#22252c] focus:border-blue-500 transition-all shadow-inner"
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[7px] font-black text-slate-300 uppercase pointer-events-none">Margin</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-2">
               <div className="w-full border-t-[3px] border-[#000000] border-b-[3px] border-[#000000] shadow-2xl relative overflow-x-auto">
                 <table className="w-full border-collapse bg-white min-w-[1350px]">
                   <thead className="sticky top-0 z-20 shadow-sm">
                     <tr className="bg-[#E2E8F0]">
                       <th className="w-[60px] p-2 border border-slate-300 text-[10px] font-black text-slate-700 uppercase leading-3 text-center">Action</th>
                       <th className="p-2 border border-slate-300 text-[10px] font-black text-slate-700 uppercase w-[80px] text-center">Model</th>
                       <th className="p-2 border border-slate-300 text-[10px] font-black text-slate-700 uppercase w-[180px]">Item Name</th>
                       <th className="p-2 border border-slate-300 text-[10px] font-black text-slate-700 uppercase w-[80px] text-center">Brand</th>
                       <th className="p-2 border border-slate-300 text-[10px] font-black text-slate-700 uppercase w-[80px] text-center text-orange-700">Season</th>
                       <th className="p-2 border border-slate-300 text-[10px] font-black text-slate-700 uppercase w-[60px] text-center">Qty</th>
                       <th className="p-2 border border-slate-300 text-[10px] font-black text-slate-700 uppercase w-[80px] text-center">Price</th>
                       <th className="p-2 border border-slate-300 text-[10px] font-black text-slate-700 uppercase w-[70px] text-center">Disc.%</th>
                       <th className="p-2 border border-slate-300 text-[10px] font-black text-slate-700 uppercase w-[70px] text-center">Disc.$</th>
                       <th className="p-2 border border-slate-300 text-[10px] font-black text-slate-700 uppercase w-[90px] text-center">NET TOTAL</th>
                       <th className="p-2 border border-slate-300 text-[10px] font-black text-slate-700 uppercase w-[60px] text-center">Mgn %</th>
                       <th className="p-2 border border-slate-300 text-[10px] font-black text-slate-700 uppercase w-[90px] text-center text-emerald-700">Sug. Sale</th>
                       <th className="p-2 border border-slate-300 text-[10px] font-black text-slate-700 uppercase w-[90px] text-center text-rose-700">OFFER PRICE</th>
                       <th className="p-2 border border-slate-300 text-[10px] font-black text-slate-700 uppercase w-[60px] text-center">Stock</th>
                       <th className="p-2 border border-slate-300 text-[10px] font-black text-slate-700 uppercase w-[70px] text-center">Last $</th>
                       <th className="p-2 border border-slate-300 text-[10px] font-black text-slate-700 uppercase w-[60px] text-center">Purch</th>
                       <th className="p-2 border border-slate-300 text-[10px] font-black text-slate-700 uppercase w-[50px] text-center">Card</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {items.length > 0 ? items.map((item, index) => (
                         <tr key={item.id} className="hover:bg-blue-50/50 group transition-colors h-10">
                           <td className="border border-slate-200 p-1">
                              <div className="flex items-center justify-center gap-1">
                                <button className="p-1 text-rose-500 hover:bg-rose-100 rounded transition-colors shadow-sm"><Trash2 size={14} /></button>
                                <button className="p-1 text-blue-500 hover:bg-blue-100 rounded transition-colors shadow-sm"><Edit size={14} /></button>
                              </div>
                           </td>
                           <td className="border border-slate-200 px-2 text-[12px] font-black text-slate-800 text-center">{item.model}</td>
                           <td className="border border-slate-200 px-3 text-[12px] font-bold text-slate-700 uppercase truncate max-w-[180px]">{item.description}</td>
                           <td className="border border-slate-200 px-2 text-[11px] font-bold text-slate-500 text-center">{item.brand}</td>
                           <td className="border border-slate-200 p-1">
                              <select 
                                value={item.season}
                                onChange={(e) => {
                                  const updatedItems = [...items];
                                  updatedItems[index] = { ...item, season: e.target.value };
                                  setItems(updatedItems);
                                }}
                                className="w-full h-8 bg-slate-50 border border-slate-100 rounded-lg px-1 text-[10px] font-black uppercase outline-none focus:border-blue-500 transition-all text-orange-600"
                              >
                                <option value="Summer 2025">Summer 25</option>
                                <option value="Winter 2024">Winter 24</option>
                                <option value="Summer 2024">Summer 24</option>
                                <option value="Winter 2025">Winter 25</option>
                              </select>
                           </td>
                           <td className="border border-slate-200 p-1">
                              <input 
                                ref={el => { quantityInputRefs.current[item.id] = el; }}
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  const updatedItems = [...items];
                                  updatedItems[index] = { ...item, quantity: val, totalValue: val * item.netPrice };
                                  setItems(updatedItems);
                                }}
                                className="w-full text-center font-black text-sm outline-none bg-blue-50 border-2 border-blue-100 rounded-xl h-8 focus:bg-white transition-all shadow-inner px-1"
                              />
                           </td>
                           <td className="border border-slate-200 p-1">
                              <input type="number" defaultValue={item.purchasePrice} className="w-full text-center text-[11px] font-bold outline-none bg-white rounded-lg h-8 focus:border-blue-500 transition-all px-1" />
                           </td>
                           <td className="border border-slate-200 p-1">
                              <input type="number" defaultValue={0} className="w-full text-center text-[10px] font-bold outline-none bg-slate-50 rounded-lg h-8 border border-slate-100 px-1" />
                           </td>
                           <td className="border border-slate-200 p-1 text-center">
                              <span className="text-[10px] font-bold text-slate-400">$0</span>
                           </td>
                           <td className="border border-slate-200 px-1 text-center text-[11px] font-black text-slate-900 bg-slate-50/80">${item.totalValue.toLocaleString()}</td>
                           <td className="border border-slate-200 px-1 text-center text-[10px] font-bold text-slate-600">{item.profitMargin}%</td>
                           <td className="border border-slate-200 px-1 text-center text-[11px] font-black text-emerald-600 shadow-inner bg-emerald-50/30 font-mono tracking-tighter">${item.salePrice.toLocaleString()}</td>
                           <td className="border border-slate-200 p-1">
                              <input 
                                type="number"
                                value={item.offerPrice}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  const updatedItems = [...items];
                                  updatedItems[index] = { ...item, offerPrice: val };
                                  setItems(updatedItems);
                                }}
                                className="w-full text-center text-[11px] font-black text-rose-600 outline-none bg-rose-50 border-2 border-rose-100 rounded-xl h-8 focus:bg-white transition-all shadow-inner px-1"
                              />
                           </td>
                           <td className="border border-slate-200 px-1 text-center text-[10px] font-black text-slate-400">{item.stockInBranches}</td>
                           <td className="border border-slate-200 px-1 text-center text-[10px] font-bold text-slate-400 italic">${item.lastPurchasePrice}</td>
                           <td className="border border-slate-200 px-1 text-center text-[10px] font-bold text-slate-400">{item.purchaseHistoryCount}</td>
                           <td className="border border-slate-200 p-1">
                              <div className="flex justify-center">
                                <button className="bg-[#4169E1] text-white p-1.5 rounded-xl hover:bg-blue-700 shadow-sm"><Eye size={12} /></button>
                              </div>
                           </td>
                         </tr>
                     )) : (
                       Array.from({ length: 30 }).map((_, i) => (
                        <tr key={`empty-${i}`} className="h-10 border-b border-slate-100">
                          {Array.from({ length: 17 }).map((__, j) => (
                            <td key={`cell-${j}`} className="border-r border-slate-50"></td>
                          ))}
                        </tr>
                       ))
                     )}
                   </tbody>
                 </table>
               </div>

               {/* Add Product Button */}
               <div className="mt-3 flex px-2 pb-1">
                 <Button 
                   onClick={() => {
                     searchInputRef.current?.focus();
                   }}
                   className="h-9 px-6 rounded-xl font-black bg-[#4169E1] hover:bg-blue-700 text-white shadow-lg shadow-blue-100 flex items-center gap-2 uppercase tracking-widest text-[10px] border-none transition-all active:scale-95"
                 >
                   <Plus size={18} />
                   Add New Product
                 </Button>
               </div>
            </div>
          </div>
        </div>

        {/* Full Width Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between h-[130px] shadow-[0_-10px_30px_-5px_rgba(0,0,0,0.05)] z-50">
           {/* Left & Middle: Invoice Totals */}
           <div className="flex items-center gap-3 h-full">
              {/* Net Payable - Far Left */}
              <div className="w-[180px] h-full bg-slate-900 rounded-xl px-4 flex flex-col justify-center shadow-lg relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-blue-600/20 transition-colors" />
                 <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest relative z-10">Net Payable</span>
                 <span className="text-xl font-black text-white leading-none relative z-10">
                   ${totals.netTotal.toLocaleString()}
                 </span>
              </div>

              {/* Column 2: Total Value & Discount - Side by Side */}
              <div className="flex items-center gap-1.5 h-full">
                 <div className="h-[100px] w-[80px] bg-slate-50 border border-slate-200 rounded-lg px-2 flex flex-col justify-center shadow-inner">
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter line-clamp-1 h-4">Total Value</span>
                    <span className="text-[13px] font-black text-slate-900 leading-[41px] text-center w-full h-[31px]">${totals.totalValue.toLocaleString()}</span>
                 </div>
                 <div className="h-[100px] w-[80px] bg-rose-50 border border-rose-100 rounded-lg px-1.5 flex flex-col justify-center shadow-inner overflow-hidden">
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-tighter line-clamp-1 h-[13px] leading-[12px]">Discount</span>
                    <div className="flex flex-col gap-1 mt-1">
                      <select className="w-full h-6 bg-white border border-rose-200 rounded px-0.5 text-[13px] text-center font-black outline-none"><option>$</option><option>%</option></select>
                      <input 
                        type="number" 
                        defaultValue={0} 
                        className="w-[62px] mx-auto bg-white border border-rose-200 rounded px-1 font-black text-[11px] text-center outline-none text-rose-600 h-8 leading-[21.8px]" 
                      />
                    </div>
                 </div>
              </div>

              {/* Column 3: Qty over Items - Stacked Vertical */}
              <div className="flex flex-col gap-1.5 h-full justify-center">
                <div className="h-[35px] w-[90px] bg-orange-50 border border-orange-100 rounded-lg px-3 flex flex-col justify-center shadow-inner">
                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-tighter text-center h-[14px] w-[76px] leading-[13px]">Total Qty</span>
                  <span className="text-[11px] font-black text-slate-900 leading-[16px] text-center w-full">{totals.totalItems}</span>
                </div>
                <div className="h-[35px] w-[90px] bg-blue-50 border border-blue-100 rounded-lg px-3 flex flex-col justify-center shadow-inner">
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-tighter text-center w-[75px] h-[28px] leading-[13px]">Total Items</span>
                  <span className="text-[11px] font-black text-slate-900 leading-[17.4px] text-center w-full">{items.length}</span>
                </div>
              </div>
           </div>

           {/* Actions - Save & Cancel stacked vertically on Right */}
           <div className="flex flex-col gap-1 shrink-0">
             <Button 
               className="w-[130px] h-[32px] rounded-xl font-black bg-[#34C759] hover:bg-[#28a745] text-white shadow-lg shadow-emerald-100 transition-all active:scale-95 text-[10px] uppercase tracking-widest border-none"
             >
               Save Invoice
             </Button>
             <Button 
               variant="outline" 
               onClick={onClose} 
               className="w-[130px] h-[32px] rounded-xl font-black border-2 border-slate-100 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-95 text-[10px] uppercase tracking-widest"
             >
               Cancel
             </Button>
           </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

interface PurchasesPageProps {
  type: 'invoice' | 'return';
}

export const PurchasesPage: React.FC<PurchasesPageProps> = ({ type }) => {
  const { t } = useLanguage();
  const isReturn = type === 'return';
  const title = isReturn ? t('purchases.purchaseReturnInvoices') : t('purchases.purchaseInvoices');
  const icon = isReturn ? <Undo2 size={24} className="text-orange-500" /> : <FileText size={24} className="text-blue-500" />;

  const dummyData: Invoice[] = Array.from({ length: 50 }, (_, i) => ({
    id: `INV-${(i + 1).toString().padStart(3, '0')}`,
    number: `PUR-${2024000 + i}`,
    supplier: ['Al-Amal Co.', 'Global Tech', 'Food Solutions', 'Mega Corp'][i % 4],
    season: ['Summer 2025', 'Winter 2024', 'Summer 2024'][i % 3],
    date: `2024-05-${((i % 28) + 1).toString().padStart(2, '0')}`,
    total: Math.floor(Math.random() * 10000) + 500,
    status: ['Draft', 'Sent', 'Paid', 'Cancelled'][i % 4] as any,
    createdBy: 'Hany Helmy',
    createdAt: `2024-05-${((i % 28) + 1).toString().padStart(2, '0')} 10:00`
  }));

  const [data, setData] = useState<Invoice[]>(dummyData);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [activeRowMenu, setActiveRowMenu] = useState<string | null>(null);

  const handleEdit = (invoice: Invoice) => {
    setDrawerMode('edit');
    setSelectedInvoice(invoice);
    setIsDrawerOpen(true);
    setActiveRowMenu(null);
  };

  const handleView = (invoice: Invoice) => {
    setDrawerMode('view');
    setSelectedInvoice(invoice);
    setIsDrawerOpen(true);
    setActiveRowMenu(null);
  };

  const handleDelete = (id: string) => {
    setData(prev => prev.filter(item => item.id !== id));
    setActiveRowMenu(null);
  };

  const filteredData = data.filter(item => 
    item.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.supplier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    const aValue = (a as any)[key]?.toString().toLowerCase() || '';
    const bValue = (b as any)[key]?.toString().toLowerCase() || '';
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig?.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="w-full pb-6 px-4 md:px-8 text-slate-900">
      <div className="sticky top-[56px] z-50 -mx-4 md:-mx-8 bg-white/95 backdrop-blur-sm transition-all border-b border-slate-100">
        <div className="w-full px-4 md:px-8 pt-2 pb-2 transition-all">
          <div className="mb-1 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                {icon}
                <h1 className="text-2xl font-bold text-slate-900 leading-[34px]">{title}</h1>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 leading-5">
                <span>{t('purchases.breadcrumbPurchases')}</span>
                <ChevronRight size={12} />
                <span className="text-blue-500 font-medium">{title}</span>
              </div>
            </div>
            <button 
              onClick={() => { setDrawerMode('add'); setIsDrawerOpen(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all text-sm font-semibold active:scale-95"
            >
              <Plus size={18} />
              <span>{isReturn ? t('purchases.newReturn') : t('purchases.newInvoice')}</span>
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4">
            <div className="flex items-center gap-2 flex-1 max-w-2xl">
              <div className="relative group">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder={t('purchases.searchInvoices', { title })}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '300.312px' }}
                  className="h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <button className="h-11 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all flex items-center justify-center">
                  <Filter size={18} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200">
                <button 
                  onClick={() => setViewMode('table')}
                  className={cn(
                    "p-1.5 rounded-lg transition-all",
                    viewMode === 'table' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <List size={20} />
                </button>
                <button 
                  onClick={() => setViewMode('card')}
                  className={cn(
                    "p-1.5 rounded-lg transition-all",
                    viewMode === 'card' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <LayoutGrid size={20} />
                </button>
              </div>
              <button className="h-11 px-4 bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 rounded-xl transition-all flex items-center gap-2 text-sm font-semibold">
                <Download size={18} />
                {t('purchases.export')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 -mx-4 md:-mx-8 px-4 md:px-8">
        {viewMode === 'table' ? (
          <div className="bg-white rounded-none shadow-sm overflow-hidden border border-slate-100">
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="w-[44px] p-0 border-r border-b border-slate-100">
                      <div className="flex items-center justify-center w-full h-full">
                        <Settings style={{ width: '24px', height: '19px' }} className="text-slate-400" />
                      </div>
                    </th>
                    {[
                      { key: 'number', label: 'Number', width: 'w-[130px]' },
                      { key: 'supplier', label: 'Supplier', width: 'w-[180px]' },
                      { key: 'season', label: 'Season', width: 'w-[130px]' },
                      { key: 'date', label: 'Date', width: 'w-[120px]' },
                      { key: 'total', label: 'Total', width: 'w-[110px]' },
                      { key: 'status', label: 'Status', width: 'w-[110px]' },
                      { key: 'createdAt', label: 'Created At', width: 'w-[160px]' },
                    ].map(col => (
                      <th 
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className={cn(
                          "py-3 px-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider border-r border-b border-slate-100 last:border-r-0 cursor-pointer hover:bg-blue-50/50 transition-colors group",
                          col.width
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span>{col.label}</span>
                          <ArrowUpDown size={12} className={cn("text-slate-300 group-hover:text-blue-500 transition-colors", sortConfig?.key === col.key && "text-blue-500")} />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item) => (
                    <tr key={item.id} className="hover:bg-blue-50/20 group transition-colors border-b border-slate-100 last:border-b-0">
                      <td className="p-0 border-r border-slate-100 relative bg-white group-hover:bg-blue-50/20">
                        <button 
                          onClick={() => setActiveRowMenu(activeRowMenu === item.id ? null : item.id)}
                          className={cn(
                            "flex items-center justify-center w-full h-11 transition-colors",
                            activeRowMenu === item.id ? "text-blue-600" : "text-slate-400 hover:text-blue-600"
                          )}
                        >
                          <MoreVertical size={16} />
                        </button>

                        <AnimatePresence>
                          {activeRowMenu === item.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setActiveRowMenu(null)} />
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95, x: 10 }}
                                animate={{ opacity: 1, scale: 1, x: 20 }}
                                exit={{ opacity: 0, scale: 0.95, x: 10 }}
                                className="absolute left-10 top-1 w-36 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1 overflow-hidden"
                              >
                                <button 
                                  onClick={() => handleView(item)}
                                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors text-left"
                                >
                                  <Eye size={16} className="text-blue-500" />
                                  {t('purchases.view')}
                                </button>
                                <button 
                                  onClick={() => handleEdit(item)}
                                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors text-left"
                                >
                                  <Edit size={16} className="text-amber-500" />
                                  {t('purchases.edit')}
                                </button>
                                <button 
                                  onClick={() => handleDelete(item.id)}
                                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-rose-50 text-sm text-rose-600 font-medium transition-colors text-left"
                                >
                                  <Trash2 size={16} />
                                  {t('purchases.delete')}
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 border-r border-slate-100">{item.number}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 border-r border-slate-100">{item.supplier}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-orange-600 uppercase border-r border-slate-100 italic">{item.season}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 border-r border-slate-100">{item.date}</td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-900 border-r border-slate-100">${item.total.toLocaleString()}</td>
                      <td className="px-4 py-3 border-r border-slate-100">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          item.status === 'Paid' ? "bg-emerald-50 text-emerald-600" :
                          item.status === 'Sent' ? "bg-blue-50 text-blue-600" :
                          item.status === 'Draft' ? "bg-slate-100 text-slate-600" :
                          "bg-rose-50 text-rose-600"
                        )}>
                          {t(`purchases.status.${item.status.toLowerCase()}` as 'purchases.status.draft')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-500">{item.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedData.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-200 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-3">
                  <div className="font-bold text-slate-900">{item.number}</div>
                  <div className="relative">
                    <button 
                      onClick={() => setActiveRowMenu(activeRowMenu === item.id ? null : item.id)}
                      className={cn(
                        "transition-colors",
                        activeRowMenu === item.id ? "text-blue-600" : "text-slate-400 hover:text-blue-600"
                      )}
                    >
                      <MoreVertical size={16} />
                    </button>

                    <AnimatePresence>
                      {activeRowMenu === item.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setActiveRowMenu(null)} />
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1"
                          >
                            <button 
                              onClick={() => handleView(item)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-xs font-bold text-slate-700 text-left"
                            >
                              <Eye size={14} className="text-blue-500" /> View
                            </button>
                            <button 
                              onClick={() => handleEdit(item)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-xs font-bold text-slate-700 text-left"
                            >
                              <Edit size={14} className="text-amber-500" /> Edit
                            </button>
                            <button 
                              onClick={() => handleDelete(item.id)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-rose-50 text-xs font-bold text-rose-600 text-left"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span>Supplier:</span>
                    <span className="font-medium">{item.supplier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{item.date}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                    <span className="text-lg font-bold text-slate-900">${item.total.toLocaleString()}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      item.status === 'Paid' ? "bg-emerald-50 text-emerald-600" :
                      item.status === 'Sent' ? "bg-blue-50 text-blue-600" :
                      item.status === 'Draft' ? "bg-slate-100 text-slate-600" :
                      "bg-rose-50 text-rose-600"
                    )}>
                      {t(`purchases.status.${item.status.toLowerCase()}` as 'purchases.status.draft')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-6">
        <div className="text-sm text-slate-500">
          Showing <span className="font-bold text-slate-900">{Math.min(filteredData.length, rowsPerPage)}</span> of <span className="font-bold text-slate-900">{filteredData.length}</span> {title}
        </div>
        <div className="flex items-center gap-2">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button 
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  "w-9 h-9 rounded-lg text-sm font-bold transition-all",
                  currentPage === page ? "bg-blue-600 text-white shadow-sm" : "hover:bg-slate-50 text-slate-600"
                )}
              >
                {page}
              </button>
            ))}
          </div>
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <PurchaseInvoiceForm 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        type={type}
        mode={drawerMode}
      />
    </div>
  );
};
