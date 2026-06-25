import React from 'react';
import { MasterDataPage } from '@/components/inventory/MasterDataPage';
import { banksApi } from '@/lib/api/banking';

export function BanksPage() {
  return (
    <MasterDataPage
      titleKey="nav.banks"
      api={{
        list: banksApi.list,
        create: banksApi.create,
        update: banksApi.update,
        remove: banksApi.remove,
      }}
    />
  );
}
