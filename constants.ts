
import { QuickAction } from './types';

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'pos',
    titleKey: 'quickActions.pos.title',
    descriptionKey: 'quickActions.pos.description',
    icon: 'ShoppingCart',
    color: 'bg-blue-500',
    link: '/pos',
    requiredPermission: ['sales', 'admin']
  },
  {
    id: 'item-transfer',
    titleKey: 'quickActions.itemTransfer.title',
    descriptionKey: 'quickActions.itemTransfer.description',
    icon: 'ArrowLeftRight',
    color: 'bg-purple-500',
    link: '/inventory/transfer',
    requiredPermission: ['inventory', 'admin']
  },
  {
    id: 'purchase-invoice',
    titleKey: 'quickActions.purchaseInvoice.title',
    descriptionKey: 'quickActions.purchaseInvoice.description',
    icon: 'FilePlus',
    color: 'bg-green-500',
    link: '/purchases/invoice',
    requiredPermission: ['inventory', 'manager', 'admin']
  },
  {
    id: 'purchase-return',
    titleKey: 'quickActions.purchaseReturn.title',
    descriptionKey: 'quickActions.purchaseReturn.description',
    icon: 'Undo2',
    color: 'bg-red-500',
    link: '/purchases/return',
    requiredPermission: ['inventory', 'manager', 'admin']
  },
  {
    id: 'customer-coding',
    titleKey: 'quickActions.customerCoding.title',
    descriptionKey: 'quickActions.customerCoding.description',
    icon: 'UserPlus',
    color: 'bg-amber-500',
    link: '/crm/customers',
    requiredPermission: ['sales', 'manager', 'admin']
  },
  {
    id: 'supplier-coding',
    titleKey: 'quickActions.supplierCoding.title',
    descriptionKey: 'quickActions.supplierCoding.description',
    icon: 'Truck',
    color: 'bg-cyan-500',
    link: '/suppliers/data',
    requiredPermission: ['inventory', 'manager', 'admin']
  }
];

export const MOCK_INVENTORY = [
  { id: '1', code: 'ITM-001', name: 'Premium Coffee Beans', category: 'Raw Material', stock: 12, minStock: 50, lastSold: '2024-04-20', status: 'reorder' as const },
  { id: '2', code: 'ITM-002', name: 'Standard Filters', category: 'Consumables', stock: 450, minStock: 100, lastSold: '2023-12-15', status: 'stagnant' as const },
  { id: '3', code: 'ITM-003', name: 'Espresso Machine XL', category: 'Equipment', stock: 2, minStock: 5, lastSold: '2024-04-28', status: 'reorder' as const },
  { id: '4', code: 'ITM-004', name: 'Disposable Cups 12oz', category: 'Packaging', stock: 5000, minStock: 1000, lastSold: '2024-04-29', status: 'normal' as const },
  { id: '5', code: 'ITM-005', name: 'Old Syrup Batch', category: 'Syrups', stock: 15, minStock: 5, lastSold: '2023-11-01', status: 'stagnant' as const },
];
