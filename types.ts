
export type Permission = 'admin' | 'sales' | 'inventory' | 'manager';

export interface QuickAction {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: string;
  color: string;
  link: string;
  requiredPermission: Permission[];
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  lastSold: string;
  status: 'reorder' | 'stagnant' | 'normal';
}

export interface UserPreferences {
  favoriteActions: string[];
}
