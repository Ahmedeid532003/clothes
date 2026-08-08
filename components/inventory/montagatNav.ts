import type { MontagatScreen } from './montagat/useMontagatData';

const TAB_TO_SCREEN: Record<string, MontagatScreen> = {
  'mgmt-dashboard': 'dashboard',
  'mgmt-setup': 'setup',
  'mgmt-catalog': 'catalog',
  'mgmt-inventory': 'inventory',
  'mgmt-permits': 'permits',
  'mgmt-audit': 'audit',
  'mgmt-style-builder': 'style-builder',
};

export function mgmtTabToScreen(tab: string): MontagatScreen {
  return TAB_TO_SCREEN[tab] ?? 'dashboard';
}

export const MGMT_TAB_KEYS = Object.keys(TAB_TO_SCREEN);

export function isMgmtTab(tab: string) {
  return tab in TAB_TO_SCREEN;
}

export function mgmtScreenToTab(screen: MontagatScreen): string {
  const entry = Object.entries(TAB_TO_SCREEN).find(([, value]) => value === screen);
  return entry?.[0] ?? 'mgmt-dashboard';
}
