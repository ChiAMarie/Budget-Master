from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional, List
from datetime import datetime
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/summary", tags=["summary"])


def current_month() -> str:
    return datetime.now().strftime("%Y-%m")


def parse_month(month: Optional[str]):
    m = month or current_month()
    year, mon = m.split("-")
    return m, int(year), int(mon)


@router.get("/overview", response_model=schemas.OverviewSummary)
def get_summary_overview(
    month: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    m, year, mon = parse_month(month)

    spend_raw = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.flow_type == "spend",
        extract("year", models.Transaction.txn_date) == year,
        extract("month", models.Transaction.txn_date) == mon,
    ).scalar() or 0.0

    income_raw = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.flow_type == "income",
        extract("year", models.Transaction.txn_date) == year,
        extract("month", models.Transaction.txn_date) == mon,
    ).scalar() or 0.0

    txn_count = db.query(func.count(models.Transaction.id)).filter(
        extract("year", models.Transaction.txn_date) == year,
        extract("month", models.Transaction.txn_date) == mon,
    ).scalar() or 0

    monthly_spend = abs(float(spend_raw))
    monthly_income = float(income_raw)

    return {
        "monthly_spend": monthly_spend,
        "monthly_income": monthly_income,
        "net": monthly_income - monthly_spend,
        "transaction_count": int(txn_count),
        "month": m,
    }


@router.get("/spending-by-category", response_model=List[schemas.CategorySpending])
def get_spending_by_category(
    month: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    m, year, mon = parse_month(month)

    rows = (
        db.query(
            models.Category.id,
            models.Category.name,
            func.sum(models.Transaction.amount).label("amount"),
        )
        .join(
            models.TransactionCategory,
            models.TransactionCategory.category_id == models.Category.id,
        )
        .join(
            models.Transaction,
            models.Transaction.id == models.TransactionCategory.transaction_id,
        )
        .filter(
            models.Transaction.flow_type == "spend",
            extract("year", models.Transaction.txn_date) == year,
            extract("month", models.Transaction.txn_date) == mon,
        )
        .group_by(models.Category.id, models.Category.name)
        .all()
    )

    total = sum(abs(float(r.amount)) for r in rows)
    result = []
    for r in rows:
        amt = abs(float(r.amount))
        result.append({
            "category_id": r.id,
            "category_name": r.name,
            "amount": amt,
            "percentage": round((amt / total * 100) if total > 0 else 0, 1),
        })
    return sorted(result, key=lambda x: x["amount"], reverse=True)


@router.get("/monthly-trend", response_model=List[schemas.MonthlyTrend])
def get_monthly_trend(db: Session = Depends(get_db)):
    from datetime import timedelta

    now = datetime.now()
    results = []

    for i in range(5, -1, -1):
        month_date = now.replace(day=1)
        for _ in range(i):
            month_date = (month_date - timedelta(days=1)).replace(day=1)

        year = month_date.year
        mon = month_date.month
        label = month_date.strftime("%Y-%m")

        income_raw = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.flow_type == "income",
            extract("year", models.Transaction.txn_date) == year,
            extract("month", models.Transaction.txn_date) == mon,
        ).scalar() or 0.0

        spend_raw = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.flow_type == "spend",
            extract("year", models.Transaction.txn_date) == year,
            extract("month", models.Transaction.txn_date) == mon,
        ).scalar() or 0.0

        income = float(income_raw)
        spend = abs(float(spend_raw))

        results.append({
            "month": label,
            "income": income,
            "spend": spend,
            "net": income - spend,
        })

    return results


@router.get("/budget-vs-actual", response_model=List[schemas.BudgetVsActual])
def get_budget_vs_actual(
    scenario: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    m, year, mon = parse_month(month)
    sc = scenario or "month1"

    targets = (
        db.query(models.BudgetTarget)
        .join(models.Category, models.Category.id == models.BudgetTarget.category_id)
        .filter(models.BudgetTarget.scenario == sc)
        .order_by(models.Category.tier, models.Category.sort_order)
        .all()
    )

    result = []
    for bt in targets:
        cat = bt.category
        actual_raw = (
            db.query(func.sum(models.Transaction.amount))
            .join(
                models.TransactionCategory,
                models.TransactionCategory.transaction_id == models.Transaction.id,
            )
            .filter(
                models.TransactionCategory.category_id == bt.category_id,
                models.Transaction.flow_type == "spend",
                extract("year", models.Transaction.txn_date) == year,
                extract("month", models.Transaction.txn_date) == mon,
            )
            .scalar()
        )
        actual = abs(float(actual_raw)) if actual_raw else 0.0
        limit = float(bt.amount)
        remaining = limit - actual
        pct = round((actual / limit * 100) if limit > 0 else 0.0, 1)

        result.append({
            "category_id": bt.category_id,
            "category_name": cat.name if cat else "",
            "tier": cat.tier if cat else 0,
            "scenario": bt.scenario,
            "budget_limit": limit,
            "actual_spent": actual,
            "remaining": remaining,
            "percentage_used": pct,
        })

    return result
