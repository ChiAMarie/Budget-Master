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


@router.get("/overview")
def get_summary_overview(
    month: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    m = month or current_month()
    year, mon = m.split("-")

    spend_total = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.flow_type == "spend",
        extract("year", models.Transaction.txn_date) == int(year),
        extract("month", models.Transaction.txn_date) == int(mon),
    ).scalar() or 0.0

    income_total = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.flow_type == "income",
        extract("year", models.Transaction.txn_date) == int(year),
        extract("month", models.Transaction.txn_date) == int(mon),
    ).scalar() or 0.0

    transaction_count = db.query(func.count(models.Transaction.id)).filter(
        extract("year", models.Transaction.txn_date) == int(year),
        extract("month", models.Transaction.txn_date) == int(mon),
    ).scalar() or 0

    return {
        "monthly_spend": float(spend_total),
        "monthly_income": float(income_total),
        "net": float(income_total) - float(abs(spend_total)),
        "transaction_count": int(transaction_count),
        "month": m,
    }
