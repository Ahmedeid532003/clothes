import { apiFetch } from '@/lib/api/client';

export type ShiftDaySchedule = {
  day: string;
  is_off: boolean;
  start_time: string;
  end_time: string;
  morning_start_time?: string;
  morning_end_time?: string;
  evening_enabled?: boolean;
  evening_start_time?: string;
  evening_end_time?: string;
  third_enabled?: boolean;
  third_start_time?: string;
  third_end_time?: string;
};

export type WorkShiftDto = {
  id: string;
  code: string;
  name: string;
  name_en: string;
  description: string;
  period_count: number;
  employee_count: number;
  weekly_schedule: ShiftDaySchedule[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export const SHIFT_WEEKDAYS = [
  'saturday',
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
] as const;

export function defaultDaySchedule(day: string, periodCount = 1): ShiftDaySchedule {
  const isOff = false;
  return {
    day,
    is_off: isOff,
    start_time: isOff ? '' : '09:00',
    end_time: isOff ? '' : '17:00',
    morning_start_time: isOff ? '' : '09:00',
    morning_end_time: isOff ? '' : '17:00',
    evening_enabled: !isOff && periodCount >= 2,
    evening_start_time: isOff ? '' : '17:00',
    evening_end_time: isOff ? '' : '21:00',
    third_enabled: !isOff && periodCount >= 3,
    third_start_time: isOff ? '' : '21:00',
    third_end_time: isOff ? '' : '23:00',
  };
}

export function defaultWeeklySchedule(periodCount = 1): ShiftDaySchedule[] {
  return SHIFT_WEEKDAYS.map((day) => defaultDaySchedule(day, periodCount));
}

export function fetchWorkShifts() {
  return apiFetch<WorkShiftDto[]>('/hr/work-shifts/');
}

export function fetchWorkShift(id: string) {
  return apiFetch<WorkShiftDto>(`/hr/work-shifts/${id}/`);
}

export function createWorkShift(body: {
  name: string;
  name_en?: string;
  code?: string;
  description?: string;
  period_count?: number;
  weekly_schedule?: ShiftDaySchedule[];
}) {
  return apiFetch<WorkShiftDto>('/hr/work-shifts/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateWorkShift(
  id: string,
  body: Partial<{
    name: string;
    name_en: string;
    description: string;
    period_count: number;
    weekly_schedule: ShiftDaySchedule[];
  }>,
) {
  return apiFetch<WorkShiftDto>(`/hr/work-shifts/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteWorkShift(id: string) {
  return apiFetch<void>(`/hr/work-shifts/${id}/`, { method: 'DELETE' });
}

export function periodLabelKey(count: number): 'workShifts.periodOne' | 'workShifts.periodTwo' | 'workShifts.periodThree' {
  if (count >= 3) return 'workShifts.periodThree';
  if (count === 2) return 'workShifts.periodTwo';
  return 'workShifts.periodOne';
}

export function dayCircleLetter(day: string) {
  const map: Record<string, string> = {
    saturday: 'S',
    sunday: 'S',
    monday: 'M',
    tuesday: 'T',
    wednesday: 'W',
    thursday: 'T',
    friday: 'F',
  };
  return map[day] || day.charAt(0).toUpperCase();
}

export function formatDayTimes(day: ShiftDaySchedule, periodCount: number) {
  return formatDayTimeLines(day, periodCount).join(' · ');
}

export function formatDayTimeLines(day: ShiftDaySchedule, periodCount: number): string[] {
  if (day.is_off) return [];
  const p1 = `${day.morning_start_time || day.start_time || '09:00'} - ${day.morning_end_time || day.end_time || '17:00'}`;
  if (periodCount <= 1) return [p1];
  const parts = [p1];
  if (periodCount >= 2 && day.evening_enabled) {
    parts.push(`${day.evening_start_time || '17:00'} - ${day.evening_end_time || '21:00'}`);
  }
  if (periodCount >= 3 && day.third_enabled) {
    parts.push(`${day.third_start_time || '21:00'} - ${day.third_end_time || '23:00'}`);
  }
  return parts;
}
