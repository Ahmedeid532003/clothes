/** التحقق من الرقم القومي المصري واستخراج البيانات */

export type NationalIdParse = {
  valid: boolean;
  error?: string;
  warning?: string;
  checksumOk?: boolean;
  birthDate?: string;
  gender?: 'male' | 'female';
  governorateCode?: string;
};

function checksumDigit(digits: string): number {
  const weights = [2, 7, 6, 5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(digits[i]) * weights[i];
  }
  const rem = sum % 11;
  const check = 11 - rem;
  if (check === 11) return 0;
  if (check === 10) return 9;
  return check;
}

function isRealDate(year: number, mm: number, dd: number): boolean {
  const d = new Date(year, mm - 1, dd);
  return d.getFullYear() === year && d.getMonth() === mm - 1 && d.getDate() === dd;
}

export function validateEgyptianNationalId(
  raw: string,
  options?: { strictChecksum?: boolean },
): NationalIdParse {
  const id = raw.replace(/\D/g, '');
  if (id.length !== 14) {
    return { valid: false, error: 'الرقم القومي يجب أن يكون 14 رقمًا' };
  }
  const century = Number(id[0]);
  if (century !== 2 && century !== 3) {
    return { valid: false, error: 'رقم القرن غير صالح' };
  }
  const yy = Number(id.slice(1, 3));
  const mm = Number(id.slice(3, 5));
  const dd = Number(id.slice(5, 7));
  const year = (century === 2 ? 1900 : 2000) + yy;
  if (!isRealDate(year, mm, dd)) {
    return { valid: false, error: 'تاريخ ميلاد غير صالح في الرقم' };
  }

  const expected = checksumDigit(id);
  const checksumOk = Number(id[13]) === expected;
  if (options?.strictChecksum && !checksumOk) {
    return { valid: false, error: 'رقم التحقق غير صحيح' };
  }

  const birthDate = `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  const genderDigit = Number(id[12]);
  const gender: 'male' | 'female' = genderDigit % 2 === 0 ? 'female' : 'male';
  return {
    valid: true,
    checksumOk,
    warning: checksumOk
      ? undefined
      : 'رقم التحقق لا يطابق الحساب — راجع الرقم أو احفظ إن كان صحيحاً من البطاقة',
    birthDate,
    gender,
    governorateCode: id.slice(7, 9),
  };
}
