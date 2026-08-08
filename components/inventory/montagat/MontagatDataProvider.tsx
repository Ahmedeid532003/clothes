import React, { createContext, useContext } from 'react';
import {
  useMontagatDataInternal,
  type MontagatDataValue,
  type MontagatScreen,
} from './useMontagatData';

const MontagatDataContext = createContext<MontagatDataValue | null>(null);

type Props = {
  children: React.ReactNode;
  activeScreen: MontagatScreen;
};

export function MontagatDataProvider({ children, activeScreen }: Props) {
  const value = useMontagatDataInternal(activeScreen);
  return <MontagatDataContext.Provider value={value}>{children}</MontagatDataContext.Provider>;
}

export function useMontagatData(): MontagatDataValue {
  const ctx = useContext(MontagatDataContext);
  if (!ctx) {
    throw new Error('useMontagatData must be used within MontagatDataProvider');
  }
  return ctx;
}
