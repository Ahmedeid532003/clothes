"""تحقق الرقم القومي المصري."""

from __future__ import annotations

import datetime


def _checksum_digit(nid: str) -> int:
    weights = [2, 7, 6, 5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
    total = sum(int(nid[i]) * weights[i] for i in range(12))
    rem = total % 11
    check = 11 - rem
    if check == 11:
        return 0
    if check == 10:
        return 9
    return check


def validate_egyptian_national_id(raw: str, *, strict_checksum: bool = False) -> dict:
    """
    strict_checksum=False (افتراضي للحفظ): يقبل 14 رقمًا بتاريخ ميلاد صالح حتى لو رقم التحقق مختلف.
    strict_checksum=True: يرفض عند خطأ في رقم التحقق (للتدقيق الاختياري).
    """
    nid = "".join(c for c in (raw or "") if c.isdigit())
    if len(nid) != 14:
        return {"valid": False, "error": "الرقم القومي يجب أن يكون 14 رقمًا"}
    century = int(nid[0])
    if century not in (2, 3):
        return {"valid": False, "error": "رقم القرن غير صالح"}
    yy = int(nid[1:3])
    mm = int(nid[3:5])
    dd = int(nid[5:7])
    year = (1900 if century == 2 else 2000) + yy
    try:
        datetime.date(year, mm, dd)
    except ValueError:
        return {"valid": False, "error": "تاريخ ميلاد غير صالح في الرقم"}

    expected = _checksum_digit(nid)
    checksum_ok = int(nid[13]) == expected
    if strict_checksum and not checksum_ok:
        return {"valid": False, "error": "رقم التحقق غير صحيح"}

    gender = "female" if int(nid[12]) % 2 == 0 else "male"
    result = {
        "valid": True,
        "birth_date": f"{year:04d}-{mm:02d}-{dd:02d}",
        "gender": gender,
        "checksum_ok": checksum_ok,
    }
    if not checksum_ok:
        result["warning"] = "رقم التحقق لا يطابق الحساب — تم الحفظ بعد التحقق من الطول والتاريخ فقط"
    return result
