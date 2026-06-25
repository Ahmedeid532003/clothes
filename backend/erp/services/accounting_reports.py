"""تقارير مالية — ميزان مراجعة، ميزانية عمومية، دخل، دفتر أستاذ."""

from __future__ import annotations

from decimal import Decimal

from django.db.models import Q, Sum
from django.db.models.functions import Coalesce

from erp.accounting_models import GlAccount, JournalEntry, JournalLine
from erp.services.accounting_chart import ensure_default_chart

_USING = "tenant"
_QUANT = Decimal("0.01")

_DEBIT_NORMAL = frozenset(
    {GlAccount.AccountType.ASSET, GlAccount.AccountType.EXPENSE}
)


def _posted_lines_qs(*, as_of=None, from_date=None, to_date=None, branch_id=None):
    qs = JournalLine.objects.using(_USING).filter(
        journal__status=JournalEntry.Status.POSTED
    )
    if as_of:
        qs = qs.filter(journal__entry_date__lte=as_of)
    if from_date:
        qs = qs.filter(journal__entry_date__gte=from_date)
    if to_date:
        qs = qs.filter(journal__entry_date__lte=to_date)
    if branch_id:
        qs = qs.filter(
            Q(journal__branch_id=branch_id) | Q(journal__branch__isnull=True)
        )
    return qs


def _account_sums(account_id, *, as_of=None, from_date=None, to_date=None, branch_id=None):
    qs = _posted_lines_qs(
        as_of=as_of, from_date=from_date, to_date=to_date, branch_id=branch_id
    ).filter(gl_account_id=account_id)
    agg = qs.aggregate(
        deb=Coalesce(Sum("debit"), Decimal("0")),
        cred=Coalesce(Sum("credit"), Decimal("0")),
    )
    return agg["deb"], agg["cred"]


def _signed_balance(account: GlAccount, debit: Decimal, credit: Decimal) -> Decimal:
    if account.account_type in _DEBIT_NORMAL:
        return (debit - credit).quantize(_QUANT)
    return (credit - debit).quantize(_QUANT)


def trial_balance(*, as_of=None, from_date=None, to_date=None, branch_id=None) -> dict:
    ensure_default_chart()
    accounts = GlAccount.objects.using(_USING).filter(is_active=True).order_by("code")
    rows = []
    total_d = Decimal("0")
    total_c = Decimal("0")
    for acc in accounts:
        if from_date or to_date or as_of:
            deb, cred = _account_sums(
                acc.pk,
                as_of=as_of if not (from_date or to_date) else None,
                from_date=from_date,
                to_date=to_date or as_of,
                branch_id=branch_id,
            )
        else:
            deb, cred = _account_sums(acc.pk, branch_id=branch_id)
        if deb == 0 and cred == 0:
            continue
        balance = _signed_balance(acc, deb, cred)
        rows.append(
            {
                "account_id": str(acc.pk),
                "code": acc.code,
                "name_ar": acc.name_ar,
                "account_type": acc.account_type,
                "debit": str(deb),
                "credit": str(cred),
                "balance": str(balance),
            }
        )
        total_d += deb
        total_c += cred

    return {
        "as_of": as_of.isoformat() if as_of else None,
        "from_date": from_date.isoformat() if from_date else None,
        "to_date": to_date.isoformat() if to_date else None,
        "rows": rows,
        "total_debit": str(total_d),
        "total_credit": str(total_c),
        "is_balanced": total_d.quantize(_QUANT) == total_c.quantize(_QUANT),
        "difference": str((total_d - total_c).quantize(_QUANT)),
    }


def _section_total(account_type: str, *, as_of, branch_id=None) -> Decimal:
    total = Decimal("0")
    for acc in GlAccount.objects.using(_USING).filter(is_active=True, account_type=account_type):
        deb, cred = _account_sums(acc.pk, as_of=as_of, branch_id=branch_id)
        total += _signed_balance(acc, deb, cred)
    return total.quantize(_QUANT)


def balance_sheet(*, as_of, branch_id=None) -> dict:
    ensure_default_chart()
    assets = []
    liabilities = []
    equity = []
    for acc in GlAccount.objects.using(_USING).filter(is_active=True).order_by("tree_path", "code"):
        if acc.account_type not in (
            GlAccount.AccountType.ASSET,
            GlAccount.AccountType.LIABILITY,
            GlAccount.AccountType.EQUITY,
        ):
            continue
        deb, cred = _account_sums(acc.pk, as_of=as_of, branch_id=branch_id)
        bal = _signed_balance(acc, deb, cred)
        if bal == 0:
            continue
        row = {
            "code": acc.code,
            "name_ar": acc.name_ar,
            "balance": str(bal),
            "level": acc.level,
        }
        if acc.account_type == GlAccount.AccountType.ASSET:
            assets.append(row)
        elif acc.account_type == GlAccount.AccountType.LIABILITY:
            liabilities.append(row)
        else:
            equity.append(row)

    total_assets = sum(Decimal(r["balance"]) for r in assets)
    total_liab = sum(Decimal(r["balance"]) for r in liabilities)
    total_equity = sum(Decimal(r["balance"]) for r in equity)
    return {
        "as_of": as_of.isoformat(),
        "assets": assets,
        "liabilities": liabilities,
        "equity": equity,
        "total_assets": str(total_assets.quantize(_QUANT)),
        "total_liabilities": str(total_liab.quantize(_QUANT)),
        "total_equity": str(total_equity.quantize(_QUANT)),
        "total_liabilities_equity": str((total_liab + total_equity).quantize(_QUANT)),
        "equation_balanced": total_assets.quantize(_QUANT)
        == (total_liab + total_equity).quantize(_QUANT),
        "equation": "الأصول = الالتزامات + حقوق الملكية",
    }


def income_statement(*, from_date, to_date, branch_id=None) -> dict:
    ensure_default_chart()
    revenues = []
    expenses = []
    for acc in GlAccount.objects.using(_USING).filter(is_active=True).order_by("code"):
        if acc.account_type == GlAccount.AccountType.REVENUE:
            deb, cred = _account_sums(
                acc.pk, from_date=from_date, to_date=to_date, branch_id=branch_id
            )
            amount = _signed_balance(acc, deb, cred)
            if amount != 0:
                revenues.append(
                    {"code": acc.code, "name_ar": acc.name_ar, "amount": str(amount)}
                )
        elif acc.account_type == GlAccount.AccountType.EXPENSE:
            deb, cred = _account_sums(
                acc.pk, from_date=from_date, to_date=to_date, branch_id=branch_id
            )
            amount = _signed_balance(acc, deb, cred)
            if amount != 0:
                expenses.append(
                    {"code": acc.code, "name_ar": acc.name_ar, "amount": str(amount)}
                )

    total_rev = sum(Decimal(r["amount"]) for r in revenues)
    total_exp = sum(Decimal(r["amount"]) for r in expenses)
    net = (total_rev - total_exp).quantize(_QUANT)
    return {
        "from_date": from_date.isoformat(),
        "to_date": to_date.isoformat(),
        "revenues": revenues,
        "expenses": expenses,
        "total_revenue": str(total_rev.quantize(_QUANT)),
        "total_expenses": str(total_exp.quantize(_QUANT)),
        "net_profit": str(net),
        "equation": "صافي الربح = الإيرادات − المصروفات",
    }


def general_ledger(*, account_id, from_date, to_date, branch_id=None) -> dict:
    acc = GlAccount.objects.using(_USING).get(pk=account_id, is_active=True)
    from datetime import timedelta

    if from_date:
        opening_deb, opening_cred = _account_sums(
            acc.pk,
            to_date=from_date - timedelta(days=1),
            branch_id=branch_id,
        )
    else:
        opening_deb, opening_cred = Decimal("0"), Decimal("0")
    opening_balance = _signed_balance(acc, opening_deb, opening_cred)

    lines_qs = (
        _posted_lines_qs(from_date=from_date, to_date=to_date, branch_id=branch_id)
        .filter(gl_account_id=account_id)
        .select_related("journal", "journal__branch")
        .order_by("journal__entry_date", "line_order")
    )

    movements = []
    running = opening_balance
    period_deb = Decimal("0")
    period_cred = Decimal("0")
    for ln in lines_qs:
        period_deb += ln.debit
        period_cred += ln.credit
        if acc.account_type in _DEBIT_NORMAL:
            running += ln.debit - ln.credit
        else:
            running += ln.credit - ln.debit
        movements.append(
            {
                "date": ln.journal.entry_date.isoformat(),
                "journal_code": ln.journal.code,
                "description": ln.journal.description,
                "debit": str(ln.debit),
                "credit": str(ln.credit),
                "balance": str(running.quantize(_QUANT)),
                "memo": ln.memo,
            }
        )

    closing = _signed_balance(
        acc,
        opening_deb + period_deb,
        opening_cred + period_cred,
    )
    return {
        "account": {
            "id": str(acc.pk),
            "code": acc.code,
            "name_ar": acc.name_ar,
            "account_type": acc.account_type,
        },
        "from_date": from_date.isoformat(),
        "to_date": to_date.isoformat(),
        "opening_balance": str(opening_balance),
        "closing_balance": str(closing),
        "period_debit": str(period_deb.quantize(_QUANT)),
        "period_credit": str(period_cred.quantize(_QUANT)),
        "movements": movements,
    }


def export_report_csv(report_type: str, params: dict) -> str:
    """تصدير CSV نصي بسيط."""
    import csv
    import io

    buf = io.StringIO()
    w = csv.writer(buf)

    if report_type == "trial_balance":
        data = trial_balance(**params)
        w.writerow(["كود", "حساب", "مدين", "دائن", "رصيد"])
        for r in data["rows"]:
            w.writerow([r["code"], r["name_ar"], r["debit"], r["credit"], r["balance"]])
    elif report_type == "income_statement":
        data = income_statement(**params)
        w.writerow(["الإيرادات"])
        for r in data["revenues"]:
            w.writerow([r["code"], r["name_ar"], r["amount"]])
        w.writerow(["المصروفات"])
        for r in data["expenses"]:
            w.writerow([r["code"], r["name_ar"], r["amount"]])
        w.writerow(["صافي الربح", data["net_profit"]])
    elif report_type == "general_ledger":
        data = general_ledger(**params)
        w.writerow(["تاريخ", "قيد", "وصف", "مدين", "دائن", "رصيد"])
        for m in data["movements"]:
            w.writerow(
                [
                    m["date"],
                    m["journal_code"],
                    m["description"],
                    m["debit"],
                    m["credit"],
                    m["balance"],
                ]
            )
    return buf.getvalue()
