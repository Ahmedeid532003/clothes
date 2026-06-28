import React from 'react';
import { AttendanceHubPage } from '@/components/hr/attendance/AttendanceHubPage';

export function AttendancePage({ defaultImportOpen = false }: { defaultImportOpen?: boolean }) {
  return <AttendanceHubPage defaultImportOpen={defaultImportOpen} />;
}
