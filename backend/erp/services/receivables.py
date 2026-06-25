"""ذمم العملاء — تأخيرات، Aging، لوحة CRM، تذكيرات، أقساط."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Count, F, Max, Q, Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from erp.customer_models import Customer
from erp.receivable_models import (
    CustomerFollowUp,
    CustomerReminder,
    InstallmentContract,
    InstallmentLine,
    InstallmentPlanTemplate,
    ReceivableInvoice,
    ReceivablePayment,
)
from erp.services import catalog as catalog_service
from erp.services.customers import log_customer_activity

_USING = "tenant"
_QUANT = Decimal("0.01")
_AGING_BUCKETS = (30, 60, 90, 120)


def _today() -> date:
    return timezone.localdate()


def _days_overdue(due: date, ref: date | None = None) -> int:
    ref = ref or _today()
    if due >= ref:
        return 0
    return (ref - due).days


def _effective_due_date(ln: InstallmentLine) -> date:
    return ln.deferred_to or ln.due_date


def _aging_bucket(days: int) -> str:
    if days <= 0:
        return "current"
    if days <= 30:
        return "1_30"
    if days <= 60:
        return "31_60"
    if days <= 90:
        return "61_90"
    if days <= 120:
        return "91_120"
    return "120_plus"


def _risk_level(days: int, balance: Decimal, compliance: Decimal) -> str:
    if balance <= 0:
        return "low"
    if days >= 90 or compliance < 40:
        return "critical"
    if days >= 60 or compliance < 60:
        return "high"
    if days >= 30 or compliance < 75:
        return "medium"
    return "low"


def _churn_probability(days: int, balance: Decimal, compliance: Decimal, inactive_days: int) -> int:
    """منطق تنبؤ مبسّط (قابل للاستبدال بنموذج AI لاحقاً)."""
    score = 10
    if days >= 120:
        score += 45
    elif days >= 90:
        score += 35
    elif days >= 60:
        score += 25
    elif days >= 30:
        score += 15
    if balance > Decimal("100000"):
        score += 15
    elif balance > Decimal("50000"):
        score += 8
    if compliance < 50:
        score += 20
    elif compliance < 70:
        score += 10
    if inactive_days > 90:
        score += 20
    elif inactive_days > 60:
        score += 10
    return min(99, score)


def refresh_receivable_statuses():
    """تحديث حالة المتأخرات وإيقاف البيع التلقائي."""
    today = _today()
    qs = ReceivableInvoice.objects.using(_USING).exclude(
        status=ReceivableInvoice.Status.PAID
    ).exclude(status=ReceivableInvoice.Status.WRITTEN_OFF)
    for inv in qs:
        bal = inv.balance
        if bal <= 0:
            inv.status = ReceivableInvoice.Status.PAID
            inv.block_new_sales = False
        elif inv.amount_paid > 0:
            inv.status = (
                ReceivableInvoice.Status.OVERDUE
                if inv.due_date < today
                else ReceivableInvoice.Status.PARTIAL
            )
        elif inv.due_date < today:
            inv.status = ReceivableInvoice.Status.OVERDUE
        else:
            inv.status = ReceivableInvoice.Status.OPEN
        if _days_overdue(inv.due_date) >= 60:
            inv.block_new_sales = True
            cust = Customer.objects.using(_USING).get(pk=inv.customer_id)
            if not cust.is_stopped:
                cust.is_stopped = True
                cust.stop_reason = "إيقاف تلقائي — تأخير سداد 60+ يوم"
                cust.save(using=_USING, update_fields=["is_stopped", "stop_reason"])
        inv.save(using=_USING, update_fields=["status", "block_new_sales", "updated_at"])


def _customer_compliance(customer_id) -> Decimal:
    invs = ReceivableInvoice.objects.using(_USING).filter(customer_id=customer_id)
    total = Decimal("0")
    paid = Decimal("0")
    for inv in invs:
        total += inv.amount_total
        paid += inv.amount_paid
    if total <= 0:
        return Decimal("100")
    return ((paid / total) * 100).quantize(_QUANT)


def _serialize_invoice(inv: ReceivableInvoice) -> dict:
    days = _days_overdue(inv.due_date)
    bal = inv.balance
    compliance = _customer_compliance(inv.customer_id)
    sp = inv.salesperson
    return {
        "id": str(inv.pk),
        "code": inv.code,
        "customer_id": str(inv.customer_id),
        "customer_code": inv.customer.code,
        "customer_name": inv.customer.name_ar,
        "issue_date": inv.issue_date.isoformat(),
        "due_date": inv.due_date.isoformat(),
        "amount_total": str(inv.amount_total),
        "amount_paid": str(inv.amount_paid),
        "balance": str(bal),
        "status": inv.status,
        "days_overdue": days,
        "aging_bucket": _aging_bucket(days),
        "compliance_percent": str(compliance),
        "salesperson_id": str(inv.salesperson_id) if inv.salesperson_id else None,
        "salesperson_name": (
            (sp.full_name or sp.username)
            if sp
            else (
                (inv.customer.assigned_salesperson.full_name or inv.customer.assigned_salesperson.username)
                if getattr(inv.customer, "assigned_salesperson", None)
                else None
            )
        ),
        "risk_level": _risk_level(days, bal, compliance),
        "block_new_sales": inv.block_new_sales,
        "last_payment": _last_payment_date(inv.customer_id),
    }


def _last_payment_date(customer_id) -> str | None:
    p = (
        ReceivablePayment.objects.using(_USING)
        .filter(customer_id=customer_id)
        .order_by("-payment_date")
        .first()
    )
    return p.payment_date.isoformat() if p else None


def _customer_ar_summary(customer: Customer) -> dict:
    invs = ReceivableInvoice.objects.using(_USING).filter(customer_id=customer.pk).exclude(
        status=ReceivableInvoice.Status.PAID
    )
    overdue_count = 0
    overdue_total = Decimal("0")
    max_days = 0
    for inv in invs:
        d = _days_overdue(inv.due_date)
        if d > 0:
            overdue_count += 1
            overdue_total += inv.balance
            max_days = max(max_days, d)
    compliance = _customer_compliance(customer.pk)
    inactive_days = 0
    if customer.last_activity_at:
        inactive_days = (_today() - customer.last_activity_at.date()).days
    churn = _churn_probability(max_days, overdue_total, compliance, inactive_days)
    return {
        "overdue_invoices": overdue_count,
        "overdue_total": str(overdue_total.quantize(_QUANT)),
        "max_days_overdue": max_days,
        "compliance_percent": str(compliance),
        "churn_probability": churn,
        "risk_level": _risk_level(max_days, overdue_total, compliance),
    }


def arrears_report(*, salesperson_id=None, bucket=None) -> dict:
    refresh_receivable_statuses()
    qs = (
        ReceivableInvoice.objects.using(_USING)
        .select_related("customer", "salesperson", "customer__assigned_salesperson")
        .exclude(status=ReceivableInvoice.Status.PAID)
        .filter(amount_total__gt=F("amount_paid"))
    )
    if salesperson_id:
        qs = qs.filter(
            Q(salesperson_id=salesperson_id)
            | Q(customer__assigned_salesperson_id=salesperson_id)
        )
    rows = []
    bucket_totals = {b: Decimal("0") for b in ["current", "1_30", "31_60", "61_90", "91_120", "120_plus"]}
    by_customer: dict[str, dict] = {}

    for inv in qs.order_by("-due_date"):
        ser = _serialize_invoice(inv)
        if bucket and ser["aging_bucket"] != bucket:
            continue
        rows.append(ser)
        bucket_totals[ser["aging_bucket"]] += Decimal(ser["balance"])
        cid = ser["customer_id"]
        if cid not in by_customer:
            by_customer[cid] = {
                "customer_id": cid,
                "customer_code": ser["customer_code"],
                "customer_name": ser["customer_name"],
                "overdue_invoices": 0,
                "overdue_total": Decimal("0"),
                "max_days_overdue": 0,
                "last_payment": ser["last_payment"],
                "compliance_percent": ser["compliance_percent"],
                "salesperson_name": ser["salesperson_name"],
                "risk_level": ser["risk_level"],
                "aging_bucket": ser["aging_bucket"],
                "block_new_sales": False,
                "churn_probability": 0,
            }
        agg = by_customer[cid]
        agg["overdue_invoices"] += 1
        agg["overdue_total"] += Decimal(ser["balance"])
        agg["max_days_overdue"] = max(agg["max_days_overdue"], ser["days_overdue"])
        agg["risk_level"] = _risk_level(
            agg["max_days_overdue"],
            agg["overdue_total"],
            Decimal(agg["compliance_percent"]),
        )
        agg["churn_probability"] = _churn_probability(
            agg["max_days_overdue"],
            agg["overdue_total"],
            Decimal(agg["compliance_percent"]),
            0,
        )
        if ser["block_new_sales"]:
            agg["block_new_sales"] = True
        if _aging_bucket(agg["max_days_overdue"]) > agg.get("worst_bucket", "current"):
            agg["worst_bucket"] = _aging_bucket(agg["max_days_overdue"])
            agg["aging_bucket"] = agg["worst_bucket"]

    customer_rows = []
    for agg in by_customer.values():
        agg["overdue_total"] = str(agg["overdue_total"].quantize(_QUANT))
        customer_rows.append(agg)
    customer_rows.sort(key=lambda x: -x["max_days_overdue"])

    total_debt = sum(bucket_totals.values())
    collected = ReceivablePayment.objects.using(_USING).aggregate(s=Sum("amount"))["s"] or Decimal("0")
    invoiced = ReceivableInvoice.objects.using(_USING).aggregate(s=Sum("amount_total"))["s"] or Decimal("0")
    collection_rate = Decimal("0")
    if invoiced > 0:
        collection_rate = (collected / invoiced * 100).quantize(_QUANT)

    return {
        "invoices": rows,
        "customers": customer_rows,
        "aging": {k: str(v.quantize(_QUANT)) for k, v in bucket_totals.items()},
        "dashboard": {
            "total_debt": str(total_debt.quantize(_QUANT)),
            "collection_rate_percent": str(collection_rate),
            "risky_customers_count": sum(
                1 for c in customer_rows if c["risk_level"] in ("high", "critical")
            ),
            "avg_collection_days": _avg_collection_days(),
        },
    }


def _avg_collection_days() -> int:
    pays = ReceivablePayment.objects.using(_USING).order_by("-payment_date")[:200]
    if not pays:
        return 0
    total_days = 0
    count = 0
    for p in pays:
        inv = (
            ReceivableInvoice.objects.using(_USING)
            .filter(customer_id=p.customer_id)
            .order_by("issue_date")
            .first()
        )
        if inv:
            total_days += (p.payment_date - inv.issue_date).days
            count += 1
    return int(total_days / count) if count else 0


def crm_dashboard() -> dict:
    refresh_receivable_statuses()
    today = _today()
    since_30 = timezone.now() - timedelta(days=30)
    since_60 = timezone.now() - timedelta(days=60)

    customers = Customer.objects.using(_USING).filter(is_active=True).select_related(
        "assigned_salesperson", "customer_group"
    )

    inactive = []
    top_buyers = []
    overdue_list = []
    at_risk = []
    need_followup = []

    for c in customers:
        ar = _customer_ar_summary(c)
        row = {
            "id": str(c.pk),
            "code": c.code,
            "name_ar": c.name_ar,
            "phone": c.phone,
            "whatsapp": c.whatsapp,
            "total_sales": str(c.total_sales),
            "balance_due": str(c.balance_due),
            "last_activity_at": c.last_activity_at.isoformat() if c.last_activity_at else None,
            "salesperson_name": (
                (c.assigned_salesperson.full_name or c.assigned_salesperson.username)
                if c.assigned_salesperson_id
                else None
            ),
            **ar,
        }
        if not c.last_activity_at or c.last_activity_at < since_60:
            inactive.append(row)
        if c.purchase_count > 0 or c.total_sales > 0:
            top_buyers.append(row)
        if Decimal(ar["overdue_total"]) > 0:
            overdue_list.append(row)
        if ar["churn_probability"] >= 55:
            at_risk.append(row)
        pending_fu = c.follow_ups.filter(status=CustomerFollowUp.Status.PENDING).count()
        if pending_fu > 0 or (Decimal(ar["overdue_total"]) > 0 and ar["max_days_overdue"] >= 15):
            need_followup.append({**row, "pending_followups": pending_fu})

    top_buyers.sort(key=lambda x: -Decimal(x["total_sales"]))
    overdue_list.sort(key=lambda x: -x["max_days_overdue"])
    at_risk.sort(key=lambda x: -x["churn_probability"])

    salesperson_kpi = _salesperson_kpis()
    notifications = _build_crm_notifications()
    reminders_queued = CustomerReminder.objects.using(_USING).filter(
        status=CustomerReminder.Status.QUEUED,
        scheduled_at__lte=timezone.now(),
    ).count()

    ar_dash = arrears_report()["dashboard"]

    return {
        "kpis": {
            **ar_dash,
            "inactive_count": len(inactive),
            "overdue_count": len(overdue_list),
            "at_risk_count": len(at_risk),
            "followup_count": len(need_followup),
            "reminders_pending": reminders_queued,
        },
        "inactive_customers": inactive[:20],
        "top_buyers": top_buyers[:15],
        "overdue_customers": overdue_list[:20],
        "at_risk_customers": at_risk[:20],
        "need_followup": need_followup[:20],
        "salesperson_kpis": salesperson_kpi,
        "notifications": notifications,
        "aging": arrears_report()["aging"],
    }


def _salesperson_kpis() -> list[dict]:
    from erp.models import User

    sp_ids = (
        Customer.objects.using(_USING)
        .filter(is_active=True, assigned_salesperson_id__isnull=False)
        .values_list("assigned_salesperson_id", flat=True)
        .distinct()
    )
    users = (
        User.objects.using(_USING)
        .filter(is_active=True)
        .filter(Q(pk__in=sp_ids) | Q(is_owner=True))
        .distinct()
    )
    rows = []
    for u in users[:30]:
        custs = Customer.objects.using(_USING).filter(assigned_salesperson_id=u.pk, is_active=True)
        sales = custs.aggregate(s=Sum("total_sales"), d=Sum("balance_due"), n=Count("id"))
        overdue = 0
        for c in custs:
            ar = _customer_ar_summary(c)
            if Decimal(ar["overdue_total"]) > 0:
                overdue += 1
        rows.append(
            {
                "user_id": str(u.pk),
                "name": u.full_name or u.username,
                "customers_count": sales["n"] or 0,
                "total_sales": str((sales["s"] or Decimal("0")).quantize(_QUANT)),
                "balance_due": str((sales["d"] or Decimal("0")).quantize(_QUANT)),
                "overdue_customers": overdue,
            }
        )
    rows.sort(key=lambda x: -Decimal(x["total_sales"]))
    return rows


def _build_crm_notifications() -> list[dict]:
    notes = []
    ar = arrears_report()
    risky = ar["dashboard"]["risky_customers_count"]
    if risky:
        notes.append(
            {
                "level": "error",
                "message_ar": f"{risky} عميلاً في مستوى خطورة مرتفع",
                "message_en": f"{risky} customers at high risk",
                "action": "customer-arrears",
            }
        )
    queued = CustomerReminder.objects.using(_USING).filter(
        status=CustomerReminder.Status.QUEUED
    ).count()
    if queued:
        notes.append(
            {
                "level": "warning",
                "message_ar": f"{queued} تذكير مجدول للإرسال",
                "message_en": f"{queued} scheduled reminders",
                "action": "customer-arrears",
            }
        )
    pending = CustomerFollowUp.objects.using(_USING).filter(
        status=CustomerFollowUp.Status.PENDING,
        scheduled_at__lte=timezone.now() + timedelta(days=1),
    ).count()
    if pending:
        notes.append(
            {
                "level": "info",
                "message_ar": f"{pending} متابعة مستحقة خلال 24 ساعة",
                "message_en": f"{pending} follow-ups due within 24h",
                "action": "customer-dashboard",
            }
        )
    return notes


def schedule_follow_up(data: dict, user) -> dict:
    fu = CustomerFollowUp.objects.using(_USING).create(
        customer_id=data["customer"],
        assigned_to_id=data.get("assigned_to") or user.pk,
        scheduled_at=data["scheduled_at"],
        channel=data.get("channel", CustomerFollowUp.Channel.CALL),
        notes=data.get("notes", ""),
    )
    log_customer_activity(
        fu.customer_id, "follow_up_scheduled", f"متابعة مجدولة {fu.scheduled_at}", user
    )
    return _serialize_follow_up(fu)


def _serialize_follow_up(fu: CustomerFollowUp) -> dict:
    return {
        "id": str(fu.pk),
        "customer_id": str(fu.customer_id),
        "customer_name": fu.customer.name_ar,
        "assigned_to": str(fu.assigned_to_id) if fu.assigned_to_id else None,
        "scheduled_at": fu.scheduled_at.isoformat(),
        "channel": fu.channel,
        "notes": fu.notes,
        "status": fu.status,
    }


def queue_reminder(data: dict, user) -> dict:
    """إنشاء تذكير — التكامل الفعلي مع WhatsApp/SMS/Email لاحقاً."""
    ch = data.get("channel", CustomerReminder.Channel.WHATSAPP)
    msg = data.get("message") or _default_reminder_message(data["customer"])
    rem = CustomerReminder.objects.using(_USING).create(
        customer_id=data["customer"],
        channel=ch,
        subject=data.get("subject", "تذكير سداد"),
        message=msg,
        scheduled_at=data.get("scheduled_at") or timezone.now(),
        trigger=data.get("trigger", CustomerReminder.Trigger.MANUAL),
        status=CustomerReminder.Status.QUEUED,
    )
    integration = _integration_stub(rem)
    log_customer_activity(rem.customer_id, "reminder_queued", f"تذكير {ch}", user)
    return {**_serialize_reminder(rem), "integration": integration}


def _default_reminder_message(customer_id) -> str:
    c = Customer.objects.using(_USING).get(pk=customer_id)
    ar = _customer_ar_summary(c)
    return (
        f"عزيزي العميل {c.name_ar}، نذكّركم بمستحقات بقيمة {ar['overdue_total']} جنيه. "
        f"يرجى التواصل لتسوية المديونية."
    )


def _integration_stub(rem: CustomerReminder) -> dict:
    c = rem.customer
    phone = "".join(x for x in (c.whatsapp or c.phone or "") if x.isdigit())
    out = {"channel": rem.channel, "status": "queued", "preview_only": True}
    if rem.channel == CustomerReminder.Channel.WHATSAPP and phone:
        out["whatsapp_url"] = f"https://wa.me/{phone}?text={rem.message[:200]}"
    elif rem.channel == CustomerReminder.Channel.SMS:
        out["sms_preview"] = f"SMS to {phone}: {rem.message[:120]}"
    elif rem.channel == CustomerReminder.Channel.EMAIL and c.email:
        out["email_preview"] = f"mailto:{c.email}?subject={rem.subject}&body={rem.message[:200]}"
    return out


def _serialize_reminder(rem: CustomerReminder) -> dict:
    return {
        "id": str(rem.pk),
        "customer_id": str(rem.customer_id),
        "channel": rem.channel,
        "subject": rem.subject,
        "message": rem.message,
        "scheduled_at": rem.scheduled_at.isoformat(),
        "sent_at": rem.sent_at.isoformat() if rem.sent_at else None,
        "status": rem.status,
        "trigger": rem.trigger,
    }


def run_auto_reminder_engine():
    """محرك تذكير تلقائي للمتأخرين."""
    refresh_receivable_statuses()
    created = 0
    report = arrears_report()
    for row in report["customers"]:
        if row["max_days_overdue"] < 7:
            continue
        exists = CustomerReminder.objects.using(_USING).filter(
            customer_id=row["customer_id"],
            trigger=CustomerReminder.Trigger.AUTO_OVERDUE,
            status=CustomerReminder.Status.QUEUED,
            scheduled_at__gte=timezone.now() - timedelta(days=3),
        ).exists()
        if exists:
            continue
        CustomerReminder.objects.using(_USING).create(
            customer_id=row["customer_id"],
            channel=CustomerReminder.Channel.WHATSAPP,
            subject="تأخير سداد",
            message=f"تذكير آلي: متأخرات {row['overdue_total']} — {row['max_days_overdue']} يوم",
            scheduled_at=timezone.now(),
            trigger=CustomerReminder.Trigger.AUTO_OVERDUE,
        )
        created += 1
    return {"reminders_created": created}


# ——— Installment plans ———

def _serialize_plan(p: InstallmentPlanTemplate) -> dict:
    return {
        "id": str(p.pk),
        "code": p.code,
        "name_ar": p.name_ar,
        "name_en": p.name_en,
        "frequency": p.frequency,
        "period_unit": p.period_unit,
        "interval_days": p.interval_days,
        "default_num_installments": p.default_num_installments,
        "down_payment_percent": str(p.down_payment_percent),
        "interest_base": p.interest_base,
        "interest_type": p.interest_type,
        "interest_rate_percent": str(p.interest_rate_percent),
        "interest_fixed_amount": str(p.interest_fixed_amount),
        "auto_add_interest": p.auto_add_interest,
        "penalty_rate_percent": str(p.penalty_rate_percent),
        "penalty_fixed_amount": str(p.penalty_fixed_amount),
        "penalty_day_of_month": p.penalty_day_of_month,
        "grace_days": p.grace_days,
        "first_due_after_days": p.first_due_after_days,
        "early_settlement_discount_percent": str(p.early_settlement_discount_percent),
        "show_interest_on_receipt": p.show_interest_on_receipt,
        "show_penalty_on_receipt": p.show_penalty_on_receipt,
        "is_active": p.is_active,
    }


def list_installment_plans(*, active_only: bool = False) -> list[dict]:
    qs = InstallmentPlanTemplate.objects.using(_USING).order_by("code")
    if active_only:
        qs = qs.filter(is_active=True)
    return [_serialize_plan(p) for p in qs]


def get_installment_plan(pk) -> dict:
    p = InstallmentPlanTemplate.objects.using(_USING).get(pk=pk)
    return _serialize_plan(p)


def _plan_frequency_from_data(data: dict, existing: InstallmentPlanTemplate | None = None):
    period_unit = data.get("period_unit") or (
        existing.period_unit if existing else InstallmentPlanTemplate.PeriodUnit.MONTHS
    )
    if period_unit == InstallmentPlanTemplate.PeriodUnit.DAYS:
        return InstallmentPlanTemplate.Frequency.WEEKLY
    return data.get("frequency") or (
        existing.frequency if existing else InstallmentPlanTemplate.Frequency.MONTHLY
    )


def create_installment_plan(data: dict) -> dict:
    period_unit = data.get("period_unit") or InstallmentPlanTemplate.PeriodUnit.MONTHS
    plan = InstallmentPlanTemplate.objects.using(_USING).create(
        code=(data.get("code") or catalog_service._next_code("PLN", InstallmentPlanTemplate)).strip(),
        name_ar=(data.get("name_ar") or "").strip(),
        name_en=(data.get("name_en") or "").strip(),
        frequency=_plan_frequency_from_data(data),
        period_unit=period_unit,
        interval_days=int(data.get("interval_days") or 30),
        default_num_installments=int(data.get("default_num_installments") or 6),
        down_payment_percent=Decimal(str(data.get("down_payment_percent") or 0)),
        interest_base=data.get("interest_base") or InstallmentPlanTemplate.InterestBase.AFTER_DOWN_PAYMENT,
        interest_type=data.get("interest_type") or InstallmentPlanTemplate.InterestType.PERCENT,
        interest_rate_percent=Decimal(str(data.get("interest_rate_percent") or 0)),
        interest_fixed_amount=Decimal(str(data.get("interest_fixed_amount") or 0)),
        auto_add_interest=data.get("auto_add_interest", True) not in (False, "false", "0", 0),
        penalty_rate_percent=Decimal(str(data.get("penalty_rate_percent") or 0)),
        penalty_fixed_amount=Decimal(str(data.get("penalty_fixed_amount") or 0)),
        penalty_day_of_month=int(data.get("penalty_day_of_month") or 15),
        grace_days=int(data.get("grace_days") or 0),
        first_due_after_days=int(data.get("first_due_after_days") or 30),
        early_settlement_discount_percent=Decimal(
            str(data.get("early_settlement_discount_percent") or 0)
        ),
        show_interest_on_receipt=data.get("show_interest_on_receipt", True)
        not in (False, "false", "0", 0),
        show_penalty_on_receipt=data.get("show_penalty_on_receipt", True)
        not in (False, "false", "0", 0),
        is_active=data.get("is_active", True) not in (False, "false", "0", 0),
    )
    return get_installment_plan(plan.pk)


def update_installment_plan(pk, data: dict) -> dict:
    plan = InstallmentPlanTemplate.objects.using(_USING).get(pk=pk)
    if "name_ar" in data:
        plan.name_ar = (data.get("name_ar") or "").strip()
    if "name_en" in data:
        plan.name_en = (data.get("name_en") or "").strip()
    if "period_unit" in data:
        plan.period_unit = data["period_unit"]
    if "interval_days" in data:
        plan.interval_days = int(data["interval_days"] or 30)
    if "frequency" in data or "period_unit" in data:
        plan.frequency = _plan_frequency_from_data(data, plan)
    if "default_num_installments" in data:
        plan.default_num_installments = int(data["default_num_installments"] or 6)
    if "down_payment_percent" in data:
        plan.down_payment_percent = Decimal(str(data["down_payment_percent"] or 0))
    if "interest_base" in data:
        plan.interest_base = data["interest_base"]
    if "interest_type" in data:
        plan.interest_type = data["interest_type"]
    if "interest_rate_percent" in data:
        plan.interest_rate_percent = Decimal(str(data["interest_rate_percent"] or 0))
    if "interest_fixed_amount" in data:
        plan.interest_fixed_amount = Decimal(str(data["interest_fixed_amount"] or 0))
    if "auto_add_interest" in data:
        plan.auto_add_interest = data["auto_add_interest"] not in (False, "false", "0", 0)
    if "penalty_rate_percent" in data:
        plan.penalty_rate_percent = Decimal(str(data["penalty_rate_percent"] or 0))
    if "penalty_fixed_amount" in data:
        plan.penalty_fixed_amount = Decimal(str(data["penalty_fixed_amount"] or 0))
    if "penalty_day_of_month" in data:
        plan.penalty_day_of_month = int(data["penalty_day_of_month"] or 15)
    if "grace_days" in data:
        plan.grace_days = int(data["grace_days"] or 0)
    if "first_due_after_days" in data:
        plan.first_due_after_days = int(data["first_due_after_days"] or 30)
    if "show_interest_on_receipt" in data:
        plan.show_interest_on_receipt = data["show_interest_on_receipt"] not in (
            False,
            "false",
            "0",
            0,
        )
    if "show_penalty_on_receipt" in data:
        plan.show_penalty_on_receipt = data["show_penalty_on_receipt"] not in (
            False,
            "false",
            "0",
            0,
        )
    if "is_active" in data:
        plan.is_active = data["is_active"] not in (False, "false", "0", 0)
    plan.save(using=_USING)
    return get_installment_plan(plan.pk)


def preview_installment_plan(
    *,
    plan_id,
    principal: Decimal,
    down_payment_amount: Decimal | None = None,
    num_installments: int | None = None,
) -> dict:
    plan = InstallmentPlanTemplate.objects.using(_USING).get(pk=plan_id)
    n = int(num_installments or plan.default_num_installments)
    calc_data: dict = {}
    if down_payment_amount is not None:
        calc_data["down_payment_amount"] = str(down_payment_amount)
    calc = _installment_calculation(principal=principal, plan=plan, data=calc_data)
    inst_amount = (calc["installments_total"] / max(n, 1)).quantize(_QUANT)
    start = _today() + timedelta(days=max(calc["first_due_after_days"], 0))
    dates = _line_due_dates(
        start,
        n,
        plan.frequency,
        period_unit=plan.period_unit,
        interval_days=plan.interval_days,
    )
    schedule = []
    remaining = calc["installments_total"]
    for i, due in enumerate(dates, start=1):
        amount = inst_amount if i < n else remaining.quantize(_QUANT)
        schedule.append(
            {
                "sequence": i,
                "due_date": due.isoformat(),
                "due_month_label": due.strftime("%b-%y"),
                "amount": str(amount),
                "penalty_amount": str(plan.penalty_fixed_amount),
            }
        )
        remaining -= amount
    return {
        "plan": _serialize_plan(plan),
        "principal_amount": str(principal.quantize(_QUANT)),
        "down_payment_amount": str(calc["down_payment_amount"]),
        "down_payment_percent": str(plan.down_payment_percent),
        "interest_amount": str(calc["interest_amount"]),
        "financed_amount": str(calc["financed_amount"]),
        "total_with_interest": str(calc["total_contract_amount"]),
        "installments_total": str(calc["installments_total"]),
        "num_installments": n,
        "installment_amount": str(inst_amount),
        "schedule": schedule,
    }


def _add_months(d: date, months: int) -> date:
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, [31, 29 if year % 4 == 0 else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
    return date(year, month, day)


def _line_due_dates(
    start: date,
    n: int,
    frequency: str,
    *,
    period_unit: str = "months",
    interval_days: int = 30,
) -> list[date]:
    dates = []
    for i in range(0, n):
        if period_unit == InstallmentPlanTemplate.PeriodUnit.DAYS:
            dates.append(start + timedelta(days=interval_days * i))
        elif frequency == InstallmentPlanTemplate.Frequency.WEEKLY:
            dates.append(start + timedelta(weeks=i))
        elif frequency == InstallmentPlanTemplate.Frequency.BIWEEKLY:
            dates.append(start + timedelta(weeks=2 * i))
        else:
            dates.append(_add_months(start, i))
    return dates


def _month_key(d: date) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def _installment_calculation(*, principal: Decimal, plan, data: dict) -> dict:
    down_percent = Decimal(
        str(data.get("down_payment_percent") if data.get("down_payment_percent") is not None else (plan.down_payment_percent if plan else 0))
    )
    down_amount = Decimal(
        str(data.get("down_payment_amount") if data.get("down_payment_amount") is not None else 0)
    )
    if down_amount <= 0 and down_percent > 0:
        down_amount = (principal * down_percent / 100).quantize(_QUANT)
    interest_base = data.get("interest_base") or (
        plan.interest_base if plan else InstallmentPlanTemplate.InterestBase.AFTER_DOWN_PAYMENT
    )
    interest_type = data.get("interest_type") or (
        plan.interest_type if plan else InstallmentPlanTemplate.InterestType.PERCENT
    )
    interest_rate = Decimal(
        str(data.get("interest_rate_percent") if data.get("interest_rate_percent") is not None else (plan.interest_rate_percent if plan else 0))
    )
    interest_fixed = Decimal(
        str(data.get("interest_fixed_amount") if data.get("interest_fixed_amount") is not None else (plan.interest_fixed_amount if plan else 0))
    )
    base_amount = principal if interest_base == InstallmentPlanTemplate.InterestBase.BEFORE_DOWN_PAYMENT else max(principal - down_amount, Decimal("0"))
    interest_amount = (
        (base_amount * interest_rate / 100).quantize(_QUANT)
        if interest_type == InstallmentPlanTemplate.InterestType.PERCENT
        else interest_fixed.quantize(_QUANT)
    )
    auto_add = data.get("auto_add_interest", plan.auto_add_interest if plan else True)
    auto_add = auto_add not in (False, "false", "0", 0)
    financed = max(principal - down_amount, Decimal("0"))
    total_installments = (financed + interest_amount).quantize(_QUANT) if auto_add else financed.quantize(_QUANT)
    return {
        "down_payment_amount": down_amount.quantize(_QUANT),
        "interest_amount": interest_amount,
        "financed_amount": financed.quantize(_QUANT),
        "total_contract_amount": (down_amount + total_installments).quantize(_QUANT),
        "installments_total": total_installments,
        "interest_rate_percent": interest_rate,
        "penalty_rate_percent": Decimal(str(data.get("penalty_rate_percent") if data.get("penalty_rate_percent") is not None else (plan.penalty_rate_percent if plan else 0))),
        "penalty_fixed_amount": Decimal(str(data.get("penalty_fixed_amount") if data.get("penalty_fixed_amount") is not None else (plan.penalty_fixed_amount if plan else 0))),
        "grace_days": int(data.get("grace_days") if data.get("grace_days") is not None else (plan.grace_days if plan else 0)),
        "frequency": plan.frequency if plan else InstallmentPlanTemplate.Frequency.MONTHLY,
        "first_due_after_days": int(data.get("first_due_after_days") if data.get("first_due_after_days") is not None else (plan.first_due_after_days if plan else 30)),
    }


def create_installment_contract(data: dict, user) -> dict:
    customer = Customer.objects.using(_USING).get(pk=data["customer"])
    plan = None
    if data.get("plan"):
        plan = InstallmentPlanTemplate.objects.using(_USING).get(pk=data["plan"])
    principal = Decimal(str(data.get("principal_amount") or customer.balance_due or 0))
    if principal <= 0:
        raise ValidationError("مبلغ الأقساط مطلوب")
    n = int(data.get("num_installments") or (plan.default_num_installments if plan else 6))
    freq = plan.frequency if plan else InstallmentPlanTemplate.Frequency.MONTHLY
    calc = _installment_calculation(principal=principal, plan=plan, data=data)
    inst_amount = (calc["installments_total"] / n).quantize(_QUANT)
    code = catalog_service._next_code("INS", InstallmentContract)
    contract = InstallmentContract.objects.using(_USING).create(
        code=code,
        customer=customer,
        plan=plan,
        receivable_id=data.get("receivable") or None,
        principal_amount=principal,
        down_payment_amount=calc["down_payment_amount"],
        interest_amount=calc["interest_amount"],
        financed_amount=calc["financed_amount"],
        total_contract_amount=calc["total_contract_amount"],
        num_installments=n,
        installment_amount=inst_amount,
        interest_rate_percent=calc["interest_rate_percent"],
        penalty_rate_percent=calc["penalty_rate_percent"],
        penalty_fixed_amount=calc["penalty_fixed_amount"],
        grace_days=calc["grace_days"],
        status=InstallmentContract.Status.DRAFT,
        created_by=user,
        notes=data.get("notes", ""),
    )
    _generate_schedule_lines(
        contract,
        freq,
        first_due_after_days=calc["first_due_after_days"],
        plan=plan,
    )
    return get_installment_contract(contract.pk)


def _generate_schedule_lines(
    contract: InstallmentContract,
    frequency: str,
    *,
    first_due_after_days: int = 30,
    plan: InstallmentPlanTemplate | None = None,
    merge_customer_monthly: bool = True,
):
    InstallmentLine.objects.using(_USING).filter(contract=contract).delete()
    plan = plan or contract.plan
    period_unit = plan.period_unit if plan else InstallmentPlanTemplate.PeriodUnit.MONTHS
    interval_days = plan.interval_days if plan else 30
    start = _today() + timedelta(days=max(first_due_after_days, 0))
    dates = _line_due_dates(
        start,
        contract.num_installments,
        frequency,
        period_unit=period_unit,
        interval_days=interval_days,
    )
    remaining = contract.financed_amount + (
        contract.interest_amount if (plan and plan.auto_add_interest) else Decimal("0")
    )
    if remaining <= 0:
        remaining = contract.financed_amount
    new_lines: list[InstallmentLine] = []
    for i, due in enumerate(dates, start=1):
        amount = (
            contract.installment_amount
            if i < contract.num_installments
            else remaining.quantize(_QUANT)
        )
        ln = InstallmentLine.objects.using(_USING).create(
            contract=contract,
            sequence=i,
            due_date=due,
            amount_due=amount,
            status=InstallmentLine.Status.SCHEDULED,
        )
        new_lines.append(ln)
        remaining -= amount
    if merge_customer_monthly and contract.customer_id:
        _merge_customer_monthly_installments(contract.customer_id, new_lines)


def _merge_customer_monthly_installments(customer_id, new_lines: list[InstallmentLine]):
    """دمج أقساط نفس الشهر للعميل — تظهر مديونية شهرية موحّدة في التحصيل."""
    open_statuses = [
        InstallmentLine.Status.SCHEDULED,
        InstallmentLine.Status.DUE,
        InstallmentLine.Status.LATE,
        InstallmentLine.Status.DEFERRED,
    ]
    for ln in new_lines:
        if ln.status == InstallmentLine.Status.CANCELLED:
            continue
        existing = (
            InstallmentLine.objects.using(_USING)
            .select_related("contract")
            .filter(
                contract__customer_id=customer_id,
                due_date__year=ln.due_date.year,
                due_date__month=ln.due_date.month,
                status__in=open_statuses,
            )
            .exclude(pk=ln.pk)
            .exclude(contract_id=ln.contract_id)
            .order_by("due_date", "sequence")
            .first()
        )
        if not existing:
            continue
        existing.amount_due = (existing.amount_due + ln.amount_due).quantize(_QUANT)
        existing.save(using=_USING, update_fields=["amount_due"])
        ln.status = InstallmentLine.Status.CANCELLED
        ln.notes = f"مدمج في قسط {existing.sequence} — {existing.contract.code}"
        ln.save(using=_USING, update_fields=["status", "notes"])


def get_installment_contract(pk) -> dict:
    c = (
        InstallmentContract.objects.using(_USING)
        .select_related("customer", "plan")
        .prefetch_related("lines")
        .get(pk=pk)
    )
    lines = [_serialize_line(ln) for ln in c.lines.all()]
    return {
        "id": str(c.pk),
        "code": c.code,
        "customer_id": str(c.customer_id),
        "customer_name": c.customer.name_ar,
        "plan_id": str(c.plan_id) if c.plan_id else None,
        "principal_amount": str(c.principal_amount),
        "down_payment_amount": str(c.down_payment_amount),
        "interest_amount": str(c.interest_amount),
        "financed_amount": str(c.financed_amount),
        "total_contract_amount": str(c.total_contract_amount),
        "num_installments": c.num_installments,
        "installment_amount": str(c.installment_amount),
        "interest_rate_percent": str(c.interest_rate_percent),
        "penalty_rate_percent": str(c.penalty_rate_percent),
        "penalty_fixed_amount": str(c.penalty_fixed_amount),
        "grace_days": c.grace_days,
        "status": c.status,
        "lines": lines,
        "totals": _contract_totals(c),
    }


def _serialize_line(ln: InstallmentLine) -> dict:
    effective_due = _effective_due_date(ln)
    days = _days_overdue(effective_due)
    total = (ln.amount_due + ln.penalty_amount).quantize(Decimal("0.01"))
    return {
        "id": str(ln.pk),
        "sequence": ln.sequence,
        "due_date": ln.due_date.isoformat(),
        "effective_due_date": effective_due.isoformat(),
        "amount_due": str(ln.amount_due),
        "amount_paid": str(ln.amount_paid),
        "penalty_amount": str(ln.penalty_amount),
        "total_amount": str(total),
        "balance": str(ln.balance),
        "status": ln.status,
        "days_overdue": days,
        "deferred_to": ln.deferred_to.isoformat() if ln.deferred_to else None,
        "paid_at": ln.paid_at.isoformat() if ln.paid_at else None,
        "notes": ln.notes or "",
    }


def installment_collection_overview(*, customer_id=None, include_paid=False) -> dict:
    qs = InstallmentLine.objects.using(_USING).select_related("contract__customer")
    if include_paid:
        qs = qs.exclude(status=InstallmentLine.Status.CANCELLED)
    else:
        qs = qs.exclude(
            status__in=[InstallmentLine.Status.PAID, InstallmentLine.Status.CANCELLED]
        )
    if customer_id:
        qs = qs.filter(contract__customer_id=customer_id)
    rows = []
    monthly: dict[str, dict] = {}
    for ln in qs.order_by("due_date", "sequence")[:500]:
        row = _serialize_line(ln)
        row["contract_id"] = str(ln.contract_id)
        row["contract_code"] = ln.contract.code
        row["customer_id"] = str(ln.contract.customer_id)
        row["customer_name"] = ln.contract.customer.name_ar
        row["due_month_label"] = ln.due_date.strftime("%b-%y")
        rows.append(row)
        mk = f"{row['customer_id']}:{_month_key(ln.due_date)}"
        if mk not in monthly:
            monthly[mk] = {
                "month_key": mk,
                "due_month_label": ln.due_date.strftime("%b-%y"),
                "due_date": ln.due_date.isoformat(),
                "customer_id": row["customer_id"],
                "customer_name": row["customer_name"],
                "amount_due": Decimal("0"),
                "amount_paid": Decimal("0"),
                "balance": Decimal("0"),
                "penalty_amount": Decimal("0"),
                "line_count": 0,
            }
        agg = monthly[mk]
        agg["amount_due"] += Decimal(row["amount_due"])
        agg["amount_paid"] += Decimal(row["amount_paid"])
        agg["balance"] += Decimal(row["balance"])
        agg["penalty_amount"] += Decimal(row["penalty_amount"])
        agg["line_count"] += 1
    monthly_rows = []
    for mk in sorted(monthly.keys()):
        agg = monthly[mk]
        monthly_rows.append(
            {
                **agg,
                "amount_due": str(agg["amount_due"].quantize(_QUANT)),
                "amount_paid": str(agg["amount_paid"].quantize(_QUANT)),
                "balance": str(agg["balance"].quantize(_QUANT)),
                "penalty_amount": str(agg["penalty_amount"].quantize(_QUANT)),
            }
        )
    return {
        "lines": rows,
        "monthly_dues": monthly_rows,
        "total_balance": str(sum((Decimal(r["balance"]) for r in rows), Decimal("0")).quantize(_QUANT)),
    }


def _post_installment_cash_receipt(*, amount: Decimal, user, customer_name: str) -> None:
    if amount <= 0:
        return
    from erp.accounting_models import Treasury, TreasuryMovement
    from erp.services.accounting_vouchers import ensure_default_treasuries
    from erp.services import accounting_treasury as treasury_service

    ensure_default_treasuries()
    treasury = (
        Treasury.objects.using(_USING)
        .filter(kind=Treasury.TreasuryKind.CASH, is_active=True)
        .order_by("code")
        .first()
    )
    if not treasury:
        return
    movement = treasury_service.create_treasury_movement(
        data={
            "movement_date": _today(),
            "movement_type": TreasuryMovement.MovementType.RECEIPT,
            "treasury": str(treasury.pk),
            "amount": str(amount),
            "notes": f"تحصيل أقساط — {customer_name}",
        },
        user=user,
    )
    treasury_service.post_treasury_movement(movement.pk, user)


@transaction.atomic(using=_USING)
def collect_installment_payment(*, customer_id, amount, method="cash", reference="", user) -> dict:
    customer = Customer.objects.using(_USING).get(pk=customer_id)
    remaining = Decimal(str(amount)).quantize(_QUANT)
    if remaining <= 0:
        raise ValidationError("المبلغ المدفوع يجب أن يكون أكبر من صفر.")
    lines = list(
        InstallmentLine.objects.using(_USING)
        .select_related("contract")
        .filter(contract__customer=customer)
        .exclude(status__in=[InstallmentLine.Status.PAID, InstallmentLine.Status.CANCELLED])
        .order_by("due_date", "sequence")
    )
    allocations = []
    for ln in lines:
        if remaining <= 0:
            break
        bal = ln.balance
        if bal <= 0:
            continue
        paid = min(remaining, bal).quantize(_QUANT)
        ln.amount_paid = (ln.amount_paid + paid).quantize(_QUANT)
        if ln.balance <= 0:
            ln.status = InstallmentLine.Status.PAID
            ln.paid_at = timezone.now()
        else:
            ln.status = InstallmentLine.Status.DUE if ln.due_date <= _today() else InstallmentLine.Status.SCHEDULED
        ln.save(using=_USING, update_fields=["amount_paid", "status", "paid_at"])
        allocations.append(
            {
                "installment_line_id": str(ln.pk),
                "contract_id": str(ln.contract_id),
                "sequence": ln.sequence,
                "amount": str(paid),
            }
        )
        remaining -= paid

    if not allocations:
        raise ValidationError("لا توجد أقساط مفتوحة لهذا العميل.")

    payment = ReceivablePayment.objects.using(_USING).create(
        code=catalog_service._next_code("ARP", ReceivablePayment),
        customer=customer,
        payment_date=_today(),
        amount=Decimal(str(amount)).quantize(_QUANT),
        method=method,
        reference=reference,
        allocations=allocations,
        created_by=user,
    )
    for contract in InstallmentContract.objects.using(_USING).filter(customer=customer):
        if not contract.lines.exclude(status=InstallmentLine.Status.PAID).exclude(status=InstallmentLine.Status.CANCELLED).exists():
            contract.status = InstallmentContract.Status.COMPLETED
            contract.save(using=_USING, update_fields=["status", "updated_at"])
    if method == ReceivablePayment.Method.CASH:
        collected = payment.amount
        _post_installment_cash_receipt(
            amount=collected,
            user=user,
            customer_name=customer.name_ar,
        )
        from erp.accounting_models import ShiftMovement
        from erp.services.accounting_vouchers import record_shift_movement_for_user

        record_shift_movement_for_user(
            user,
            ShiftMovement.MovementType.COLLECTION,
            collected,
            reference=payment.code,
        )
    log_customer_activity(customer.pk, "installment_payment", f"تحصيل أقساط {payment.amount}", user)
    return {
        "payment_id": str(payment.pk),
        "code": payment.code,
        "amount": str(payment.amount),
        "unallocated": str(max(remaining, Decimal("0")).quantize(_QUANT)),
        "allocations": allocations,
        "overview": installment_collection_overview(customer_id=customer.pk),
    }


def _contract_totals(contract: InstallmentContract) -> dict:
    lines = contract.lines.all()
    due = sum(ln.balance for ln in lines if ln.status != InstallmentLine.Status.PAID)
    paid = sum(ln.amount_paid for ln in lines)
    late = sum(1 for ln in lines if ln.status == InstallmentLine.Status.LATE)
    return {
        "balance_due": str(due.quantize(_QUANT)),
        "total_paid": str(paid.quantize(_QUANT)),
        "late_count": late,
    }


def list_installment_contracts(*, customer_id=None) -> list[dict]:
    qs = InstallmentContract.objects.using(_USING).select_related("customer").order_by("-created_at")
    if customer_id:
        qs = qs.filter(customer_id=customer_id)
    return [
        {
            "id": str(c.pk),
            "code": c.code,
            "customer_name": c.customer.name_ar,
            "principal_amount": str(c.principal_amount),
            "status": c.status,
            "num_installments": c.num_installments,
        }
        for c in qs[:100]
    ]


def installment_reports() -> dict:
    today = _today()
    lines = InstallmentLine.objects.using(_USING).select_related("contract__customer").exclude(
        status=InstallmentLine.Status.CANCELLED
    )
    due_soon = []
    overdue = []
    cashflow = []
    for ln in lines:
        ser = _serialize_line(ln)
        ser["customer_name"] = ln.contract.customer.name_ar
        ser["contract_code"] = ln.contract.code
        if ln.status == InstallmentLine.Status.PAID:
            continue
        effective_due = _effective_due_date(ln)
        if effective_due <= today:
            overdue.append(ser)
        elif effective_due <= today + timedelta(days=30):
            due_soon.append(ser)
        month_key = effective_due.strftime("%Y-%m")
        cashflow.append({"month": month_key, "amount": str(ln.balance)})
    return {
        "due_installments": due_soon[:50],
        "overdue_installments": overdue[:50],
        "expected_cashflow": _aggregate_cashflow(cashflow),
        "expected_collection": str(
            sum(
                (Decimal(x["balance"]) for x in overdue + due_soon),
                Decimal("0"),
            ).quantize(_QUANT)
        ),
    }


def _aggregate_cashflow(rows: list[dict]) -> list[dict]:
    by_month: dict[str, Decimal] = {}
    for r in rows:
        by_month[r["month"]] = by_month.get(r["month"], Decimal("0")) + Decimal(r["amount"])
    return [{"month": k, "amount": str(v.quantize(_QUANT))} for k, v in sorted(by_month.items())]


def submit_contract_for_approval(pk, user) -> dict:
    c = InstallmentContract.objects.using(_USING).get(pk=pk)
    if c.status != InstallmentContract.Status.DRAFT:
        raise ValidationError("الحالة لا تسمح بالإرسال للموافقة")
    c.status = InstallmentContract.Status.PENDING_APPROVAL
    c.save(using=_USING, update_fields=["status", "updated_at"])
    log_customer_activity(c.customer_id, "installment_pending", f"عقد {c.code} بانتظار الموافقة", user)
    return get_installment_contract(pk)


def approve_contract(pk, user) -> dict:
    c = InstallmentContract.objects.using(_USING).get(pk=pk)
    c.status = InstallmentContract.Status.ACTIVE
    c.approved_by = user
    c.approved_at = timezone.now()
    c.save(using=_USING, update_fields=["status", "approved_by", "approved_at", "updated_at"])
    _refresh_line_statuses(c)
    log_customer_activity(c.customer_id, "installment_approved", f"اعتماد عقد {c.code}", user)
    return get_installment_contract(pk)


def _refresh_line_statuses(contract: InstallmentContract):
    today = _today()
    grace = contract.grace_days
    for ln in contract.lines.all():
        if ln.status == InstallmentLine.Status.PAID:
            continue
        effective_due = ln.deferred_to or ln.due_date
        if ln.amount_paid >= ln.amount_due + ln.penalty_amount:
            ln.status = InstallmentLine.Status.PAID
        elif effective_due + timedelta(days=grace) < today:
            ln.status = InstallmentLine.Status.LATE
            if contract.penalty_rate_percent > 0 and ln.penalty_amount == 0:
                ln.penalty_amount = (
                    ln.amount_due * contract.penalty_rate_percent / 100
                ).quantize(_QUANT)
            if contract.penalty_fixed_amount > 0 and ln.penalty_amount == 0:
                ln.penalty_amount = contract.penalty_fixed_amount.quantize(_QUANT)
        elif effective_due <= today:
            ln.status = InstallmentLine.Status.DUE
        else:
            ln.status = InstallmentLine.Status.SCHEDULED
        ln.save(using=_USING)


def recalculate_contract(pk) -> dict:
    c = InstallmentContract.objects.using(_USING).get(pk=pk)
    unpaid = c.lines.exclude(status=InstallmentLine.Status.PAID)
    remaining = sum(ln.balance for ln in unpaid) or c.principal_amount
    n = unpaid.count() or c.num_installments
    c.installment_amount = (remaining / max(n, 1)).quantize(_QUANT)
    c.financed_amount = sum((ln.balance for ln in unpaid), Decimal("0")).quantize(_QUANT)
    c.total_contract_amount = (c.down_payment_amount + c.interest_amount + c.financed_amount).quantize(_QUANT)
    c.save(
        using=_USING,
        update_fields=["installment_amount", "financed_amount", "total_contract_amount", "updated_at"],
    )
    idx = 0
    for ln in unpaid.order_by("sequence"):
        ln.amount_due = c.installment_amount
        ln.save(using=_USING, update_fields=["amount_due"])
        idx += 1
    _refresh_line_statuses(c)
    return get_installment_contract(pk)


def defer_installment_line(line_id, new_date: date, user) -> dict:
    ln = InstallmentLine.objects.using(_USING).select_related("contract").get(pk=line_id)
    ln.deferred_to = new_date
    ln.save(using=_USING, update_fields=["deferred_to"])
    contract = InstallmentContract.objects.using(_USING).prefetch_related("lines").get(pk=ln.contract_id)
    _refresh_line_statuses(contract)
    log_customer_activity(
        ln.contract.customer_id,
        "installment_deferred",
        f"تأجيل قسط {ln.sequence} إلى {new_date}",
        user,
    )
    return get_installment_contract(ln.contract_id)


def modify_installment_amount(line_id, amount: Decimal, user) -> dict:
    ln = InstallmentLine.objects.using(_USING).select_related("contract").get(pk=line_id)
    ln.amount_due = amount.quantize(_QUANT)
    ln.save(using=_USING, update_fields=["amount_due"])
    recalculate_contract(ln.contract_id)
    log_customer_activity(ln.contract.customer_id, "installment_modified", f"تعديل قسط {ln.sequence}", user)
    return get_installment_contract(ln.contract_id)


def merge_installment_lines(line_ids: list, user) -> dict:
    lines = list(
        InstallmentLine.objects.using(_USING)
        .filter(pk__in=line_ids)
        .select_related("contract")
        .order_by("sequence")
    )
    if len(lines) < 2:
        raise ValidationError("يجب اختيار قسطين على الأقل")
    contract = lines[0].contract
    total = sum(ln.balance for ln in lines)
    first = lines[0]
    first.amount_due = total.quantize(_QUANT)
    first.status = InstallmentLine.Status.SCHEDULED
    first.save(using=_USING)
    for ln in lines[1:]:
        ln.status = InstallmentLine.Status.CANCELLED
        ln.notes = f"مدمج في قسط {first.sequence}"
        ln.save(using=_USING, update_fields=["status", "notes"])
    recalculate_contract(contract.pk)
    log_customer_activity(contract.customer_id, "installment_merged", "دمج أقساط", user)
    return get_installment_contract(contract.pk)


def split_installment_line(line_id, parts: int, user) -> dict:
    if parts < 2:
        raise ValidationError("التقسيم يتطلب جزئين على الأقل")
    ln = InstallmentLine.objects.using(_USING).select_related("contract").get(pk=line_id)
    contract = ln.contract
    part_amt = (ln.amount_due / parts).quantize(_QUANT)
    ln.amount_due = part_amt
    ln.save(using=_USING, update_fields=["amount_due"])
    max_seq = contract.lines.aggregate(m=Max("sequence"))["m"] or ln.sequence
    for i in range(1, parts):
        InstallmentLine.objects.using(_USING).create(
            contract=contract,
            sequence=max_seq + i,
            due_date=ln.due_date + timedelta(days=15 * i),
            amount_due=part_amt,
            parent_line=ln,
            status=InstallmentLine.Status.SCHEDULED,
        )
    recalculate_contract(contract.pk)
    log_customer_activity(contract.customer_id, "installment_split", f"تقسيم قسط {ln.sequence}", user)
    return get_installment_contract(contract.pk)


@transaction.atomic(using=_USING)
def restructure_installment_contract(pk, lines: list, expected_total, user) -> dict:
    """إعادة هيكلة الأقساط — تعديل التواريخ والمبالغ مع الحفاظ على إجمالي المتبقي."""
    c = InstallmentContract.objects.using(_USING).prefetch_related("lines").get(pk=pk)
    open_statuses = [
        InstallmentLine.Status.SCHEDULED,
        InstallmentLine.Status.DUE,
        InstallmentLine.Status.LATE,
        InstallmentLine.Status.DEFERRED,
    ]
    open_lines = {
        str(ln.pk): ln for ln in c.lines.filter(status__in=open_statuses)
    }
    locked_total = sum(ln.balance for ln in open_lines.values()).quantize(_QUANT)

    if expected_total is not None:
        exp = Decimal(str(expected_total)).quantize(_QUANT)
        if exp != locked_total:
            raise ValidationError("إجمالي الأقساط المتبقية لا يطابق العقد.")

    if not lines:
        raise ValidationError("يجب إدخال أقساط.")

    parsed = []
    incoming_total = Decimal("0")
    for item in lines:
        bal = Decimal(str(item.get("balance", "0"))).quantize(_QUANT)
        incoming_total += bal
        d_raw = item.get("due_date")
        if not d_raw:
            raise ValidationError("تاريخ الاستحقاق مطلوب لكل قسط.")
        parsed.append(
            {
                "id": str(item["id"]) if item.get("id") else None,
                "due_date": date.fromisoformat(d_raw),
                "balance": bal,
            }
        )

    incoming_total = incoming_total.quantize(_QUANT)
    if incoming_total != locked_total:
        raise ValidationError("لن يتم الحفظ — يجب أن يتساوى إجمالي الأقساط مع المتبقي.")

    sent_ids: set[str] = set()
    max_seq = c.lines.aggregate(m=Max("sequence"))["m"] or 0
    next_seq = max_seq

    for item in parsed:
        lid = item["id"]
        bal = item["balance"]
        due = item["due_date"]

        if lid and lid in open_lines:
            ln = open_lines[lid]
            sent_ids.add(lid)
            new_amount_due = (bal + ln.amount_paid - ln.penalty_amount).quantize(_QUANT)
            if new_amount_due < ln.amount_paid:
                raise ValidationError(f"مبلغ القسط {ln.sequence} أقل من المدفوع.")
            ln.due_date = due
            ln.deferred_to = None
            ln.amount_due = new_amount_due
            ln.status = InstallmentLine.Status.SCHEDULED
            ln.save(using=_USING, update_fields=["due_date", "deferred_to", "amount_due", "status"])
        elif not lid:
            next_seq += 1
            InstallmentLine.objects.using(_USING).create(
                contract=c,
                sequence=next_seq,
                due_date=due,
                amount_due=bal,
                amount_paid=Decimal("0"),
                penalty_amount=Decimal("0"),
                status=InstallmentLine.Status.SCHEDULED,
            )
        else:
            raise ValidationError("قسط غير موجود أو غير قابل للتعديل.")

    for lid, ln in open_lines.items():
        if lid not in sent_ids:
            ln.status = InstallmentLine.Status.CANCELLED
            ln.notes = (ln.notes + " | " if ln.notes else "") + "ألغي بإعادة الهيكلة"
            ln.save(using=_USING, update_fields=["status", "notes"])

    active_count = c.lines.exclude(status=InstallmentLine.Status.CANCELLED).count()
    unpaid = c.lines.exclude(
        status__in=[InstallmentLine.Status.PAID, InstallmentLine.Status.CANCELLED]
    )
    remaining = sum(ln.balance for ln in unpaid)
    c.num_installments = active_count
    if unpaid.exists():
        c.installment_amount = (remaining / unpaid.count()).quantize(_QUANT)
    c.financed_amount = remaining.quantize(_QUANT)
    c.total_contract_amount = (
        c.down_payment_amount + c.interest_amount + c.financed_amount
    ).quantize(_QUANT)
    c.save(
        using=_USING,
        update_fields=[
            "num_installments",
            "installment_amount",
            "financed_amount",
            "total_contract_amount",
            "updated_at",
        ],
    )

    _refresh_line_statuses(c)
    log_customer_activity(
        c.customer_id, "installment_restructured", f"إعادة هيكلة عقد {c.code}", user
    )
    return get_installment_contract(pk)


def reschedule_contract(pk, start_date: date, user) -> dict:
    c = InstallmentContract.objects.using(_USING).get(pk=pk)
    plan = c.plan
    freq = plan.frequency if plan else InstallmentPlanTemplate.Frequency.MONTHLY
    unpaid = list(c.lines.exclude(status=InstallmentLine.Status.PAID).order_by("sequence"))
    dates = _line_due_dates(
        start_date,
        len(unpaid),
        freq,
        period_unit=plan.period_unit if plan else InstallmentPlanTemplate.PeriodUnit.MONTHS,
        interval_days=plan.interval_days if plan else 30,
    )
    remaining = sum((ln.balance for ln in unpaid), Decimal("0")).quantize(_QUANT)
    per_line = (remaining / max(len(unpaid), 1)).quantize(_QUANT)
    for idx, (ln, d) in enumerate(zip(unpaid, dates), start=1):
        ln.due_date = d
        ln.deferred_to = None
        ln.amount_due = per_line if idx < len(unpaid) else remaining
        ln.status = InstallmentLine.Status.SCHEDULED
        ln.save(using=_USING, update_fields=["due_date", "deferred_to", "amount_due", "status"])
        remaining -= ln.amount_due
    c.installment_amount = per_line
    c.save(using=_USING, update_fields=["installment_amount", "updated_at"])
    log_customer_activity(c.customer_id, "installment_rescheduled", f"إعادة جدولة {c.code}", user)
    return get_installment_contract(pk)


@transaction.atomic(using=_USING)
def create_pos_installment_from_sale(*, sale, user, data: dict) -> dict:
    """إنشاء عقد تقسيط من فاتورة POS — مقدم + جدول أقساط + دمج شهري."""
    from erp.customer_models import Customer

    if not sale.customer_id:
        raise ValidationError("يجب اختيار عميل للتقسيط.")
    plan_id = data.get("installment_plan")
    if not plan_id:
        raise ValidationError("يجب اختيار نظام التقسيط.")
    plan = InstallmentPlanTemplate.objects.using(_USING).get(pk=plan_id, is_active=True)
    customer = Customer.objects.using(_USING).get(pk=sale.customer_id)
    principal = sale.total
    down_raw = data.get("down_payment_amount")
    calc_data: dict = {}
    if down_raw is not None:
        calc_data["down_payment_amount"] = str(down_raw)
    n = int(data.get("num_installments") or plan.default_num_installments)
    calc = _installment_calculation(principal=principal, plan=plan, data=calc_data)
    down_payment = calc["down_payment_amount"]
    inst_amount = (calc["installments_total"] / max(n, 1)).quantize(_QUANT)

    prev_balance = (customer.balance_due or Decimal("0")).quantize(_QUANT)
    code = catalog_service._next_code("INS", InstallmentContract)
    contract = InstallmentContract.objects.using(_USING).create(
        code=code,
        customer=customer,
        plan=plan,
        sale=sale,
        principal_amount=principal,
        down_payment_amount=down_payment,
        interest_amount=calc["interest_amount"],
        financed_amount=calc["financed_amount"],
        total_contract_amount=calc["total_contract_amount"],
        num_installments=n,
        installment_amount=inst_amount,
        interest_rate_percent=calc["interest_rate_percent"],
        penalty_rate_percent=calc["penalty_rate_percent"],
        penalty_fixed_amount=calc["penalty_fixed_amount"],
        grace_days=calc["grace_days"],
        status=InstallmentContract.Status.ACTIVE,
        created_by=user,
        approved_by=user,
        approved_at=timezone.now(),
        notes=f"فاتورة POS {sale.code}",
    )
    _generate_schedule_lines(
        contract,
        plan.frequency,
        first_due_after_days=calc["first_due_after_days"],
        plan=plan,
        merge_customer_monthly=True,
    )
    _refresh_line_statuses(contract)

    remaining_debt = calc["installments_total"]
    customer.balance_due = (prev_balance + remaining_debt).quantize(_QUANT)
    customer.total_sales = (customer.total_sales or Decimal("0")) + principal
    customer.purchase_count = (customer.purchase_count or 0) + 1
    customer.last_activity_at = timezone.now()
    customer.save(
        using=_USING,
        update_fields=[
            "balance_due",
            "total_sales",
            "purchase_count",
            "last_activity_at",
        ],
    )
    log_customer_activity(
        customer.pk,
        "pos_installment_sale",
        f"بيع تقسيط {sale.code} — عقد {contract.code}",
        user,
    )
    return build_installment_receipt(
        sale=sale,
        contract=contract,
        customer=customer,
        previous_balance=prev_balance,
        down_payment_collected=down_payment,
    )


def _customer_open_installment_schedule(customer_id, *, show_penalty: bool = True) -> tuple[list, int, Decimal]:
    """جدول أقساط العميل المفتوحة — مجمّعة بالشهر (كما في شاشة التحصيل)."""
    open_statuses = [
        InstallmentLine.Status.SCHEDULED,
        InstallmentLine.Status.DUE,
        InstallmentLine.Status.LATE,
        InstallmentLine.Status.DEFERRED,
    ]
    qs = (
        InstallmentLine.objects.using(_USING)
        .select_related("contract")
        .filter(contract__customer_id=customer_id, status__in=open_statuses)
        .order_by("due_date", "sequence")
    )
    monthly: dict[str, dict] = {}
    total_remaining = Decimal("0")
    for ln in qs:
        mk = _month_key(ln.due_date)
        if mk not in monthly:
            monthly[mk] = {
                "due_date": ln.due_date.isoformat(),
                "due_month_label": ln.due_date.strftime("%b-%y"),
                "amount_due": Decimal("0"),
                "penalty_amount": Decimal("0"),
                "total_amount": Decimal("0"),
            }
        agg = monthly[mk]
        agg["amount_due"] += ln.balance
        agg["penalty_amount"] += ln.penalty_amount
        total_remaining += ln.balance
    schedule = []
    for mk in sorted(monthly.keys()):
        agg = monthly[mk]
        bal = agg["amount_due"].quantize(_QUANT)
        row = {
            "due_date": agg["due_date"],
            "due_month_label": agg["due_month_label"],
            "amount_due": str(bal),
            "total_amount": str(bal),
        }
        if show_penalty:
            row["penalty_amount"] = str(agg["penalty_amount"].quantize(_QUANT))
        schedule.append(row)
    return schedule, len(schedule), total_remaining.quantize(_QUANT)


def build_installment_receipt(
    *,
    sale,
    contract: InstallmentContract,
    customer: Customer,
    previous_balance: Decimal,
    down_payment_collected: Decimal,
) -> dict:
    plan = contract.plan
    show_interest = plan.show_interest_on_receipt if plan else True
    show_penalty = plan.show_penalty_on_receipt if plan else True
    schedule, schedule_count, remaining_total = _customer_open_installment_schedule(
        customer.pk,
        show_penalty=show_penalty,
    )
    current_balance = (customer.balance_due or Decimal("0")).quantize(_QUANT)
    credit_from_invoice = (contract.financed_amount + contract.interest_amount).quantize(_QUANT)
    return {
        "sale_code": sale.code,
        "contract_code": contract.code,
        "customer_name": customer.name_ar,
        "items": [
            {
                "product_name": (
                    sl.composite_product.name_ar
                    if sl.composite_product_id
                    else (sl.variant.product.name_ar if sl.variant_id else "")
                ),
                "product_code": (
                    sl.composite_product.code
                    if sl.composite_product_id
                    else (sl.variant.product.code if sl.variant_id else "")
                ),
                "quantity": str(sl.quantity),
                "line_total": str(sl.line_total),
            }
            for sl in sale.lines.select_related(
                "variant__product", "composite_product"
            ).all()
        ],
        "subtotal": str(sale.subtotal),
        "discount_amount": str(sale.discount_amount),
        "interest_amount": str(contract.interest_amount),
        "show_interest_on_receipt": show_interest,
        "show_penalty_on_receipt": show_penalty,
        "grand_total_label": (
            "اجمالى نقدي+قيمه الفوائد" if not show_interest else "الإجمالي العام"
        ),
        "grand_total": str(contract.total_contract_amount),
        "credit_from_invoice": str(credit_from_invoice),
        "previous_balance": str(previous_balance),
        "down_payment_collected": str(down_payment_collected.quantize(_QUANT)),
        "current_balance": str(current_balance),
        "schedule": schedule,
        "total_installments_count": schedule_count,
        "remaining_installments_total": str(remaining_total),
    }


def seed_receivables_demo():
    """بيانات تجريبية من أرصدة العملاء."""
    if ReceivableInvoice.objects.using(_USING).exists():
        return {"seeded": 0}
    count = 0
    today = _today()
    for c in Customer.objects.using(_USING).filter(is_active=True)[:40]:
        bal = c.balance_due or Decimal("0")
        if bal <= 0:
            bal = (c.total_sales or Decimal("0")) * Decimal("0.15")
        if bal <= 0:
            continue
        due = today - timedelta(days=(count % 5) * 25 + 5)
        code = catalog_service._next_code("AR", ReceivableInvoice)
        ReceivableInvoice.objects.using(_USING).create(
            code=code,
            customer=c,
            issue_date=due - timedelta(days=30),
            due_date=due,
            amount_total=bal.quantize(_QUANT),
            amount_paid=(bal * Decimal("0.2")).quantize(_QUANT) if count % 3 else Decimal("0"),
            salesperson_id=c.assigned_salesperson_id,
            status=ReceivableInvoice.Status.OVERDUE if due < today else ReceivableInvoice.Status.OPEN,
        )
        count += 1
    if not InstallmentPlanTemplate.objects.using(_USING).exists():
        InstallmentPlanTemplate.objects.using(_USING).create(
            code="PLN-STD",
            name_ar="تقسيط شهري قياسي",
            name_en="Standard monthly",
            frequency=InstallmentPlanTemplate.Frequency.MONTHLY,
            default_num_installments=6,
            interest_rate_percent=Decimal("5"),
            penalty_rate_percent=Decimal("2"),
            grace_days=5,
        )
    refresh_receivable_statuses()
    return {"seeded": count}
