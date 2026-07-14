from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional, List
from datetime import datetime, date
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/summary", tags=["summary"])


def current_month() -> str:
    return datetime.now().strftime("%Y-%m")


@router.get("/overview", response_model=schemas.OverviewSummary)
def get_summary_overview(
    month: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    m = month or current_month()
    year, mon = m.split("-")

    monthly_income = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.type == "income",
        extract("year", models.Transaction.date) == int(year),
        extract("month", models.Transaction.date) == int(mon),
    ).scalar() or 0.0

    monthly_expenses = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.type == "expense",
        extract("year", models.Transaction.date) == int(year),
        extract("month", models.Transaction.date) == int(mon),
    ).scalar() or 0.0

    transaction_count = db.query(func.count(models.Transaction.id)).filter(
        extract("year", models.Transaction.date) == int(year),
        extract("month", models.Transaction.date) == int(mon),
    ).scalar() or 0

    total_balance = db.query(func.sum(models.Account.balance)).scalar() or 0.0

    return {
        "total_balance": float(total_balance),
        "monthly_income": float(monthly_income),
        "monthly_expenses": float(monthly_expenses),
        "net_savings": float(monthly_income) - float(monthly_expenses),
        "transaction_count": int(transaction_count),
        "month": m,
    }


@router.get("/spending-by-category", response_model=List[schemas.CategorySpending])
def get_spending_by_category(
    month: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    m = month or current_month()
    year, mon = m.split("-")

    rows = db.query(
        models.Category.id,
        models.Category.name,
        models.Category.color,
        models.Category.icon,
        func.sum(models.Transaction.amount).label("amount"),
    ).join(models.Transaction, models.Transaction.category_id == models.Category.id).filter(
        models.Transaction.type == "expense",
        extract("year", models.Transaction.date) == int(year),
        extract("month", models.Transaction.date) == int(mon),
    ).group_by(
        models.Category.id, models.Category.name, models.Category.color, models.Category.icon
    ).all()

    total = sum(float(r.amount) for r in rows)
    result = []
    for r in rows:
        amt = float(r.amount)
        result.append({
            "category_id": r.id,
            "category_name": r.name,
            "category_color": r.color,
            "category_icon": r.icon,
            "amount": amt,
            "percentage": round((amt / total * 100) if total > 0 else 0, 1),
        })
    return sorted(result, key=lambda x: x["amount"], reverse=True)


@router.get("/monthly-trend", response_model=List[schemas.MonthlyTrend])
def get_monthly_trend(db: Session = Depends(get_db)):
    from datetime import timedelta
    import calendar

    now = datetime.now()
    results = []

    for i in range(5, -1, -1):
        # Go back i months
        month_date = now.replace(day=1)
        for _ in range(i):
            month_date = (month_date - timedelta(days=1)).replace(day=1)

        year = month_date.year
        mon = month_date.month
        label = month_date.strftime("%Y-%m")

        income = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.type == "income",
            extract("year", models.Transaction.date) == year,
            extract("month", models.Transaction.date) == mon,
        ).scalar() or 0.0

        expenses = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.type == "expense",
            extract("year", models.Transaction.date) == year,
            extract("month", models.Transaction.date) == mon,
        ).scalar() or 0.0

        results.append({
            "month": label,
            "income": float(income),
            "expenses": float(expenses),
            "net": float(income) - float(expenses),
        })

    return results


@router.get("/budget-vs-actual", response_model=List[schemas.BudgetVsActual])
def get_budget_vs_actual(
    month: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    m = month or current_month()
    year, mon = m.split("-")

    budgets = db.query(models.Budget).filter(models.Budget.month == m).all()

    result = []
    for b in budgets:
        cat = db.query(models.Category).filter(models.Category.id == b.category_id).first()
        spent = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.category_id == b.category_id,
            models.Transaction.type == "expense",
            extract("year", models.Transaction.date) == int(year),
            extract("month", models.Transaction.date) == int(mon),
        ).scalar() or 0.0

        limit = float(b.limit_amount)
        actual = float(spent)
        remaining = limit - actual
        pct = round((actual / limit * 100) if limit > 0 else 0, 1)

        result.append({
            "category_id": b.category_id,
            "category_name": cat.name if cat else "",
            "category_color": cat.color if cat else "#6366f1",
            "category_icon": cat.icon if cat else "circle",
            "budget_limit": limit,
            "actual_spent": actual,
            "remaining": remaining,
            "percentage_used": pct,
        })

    return result
