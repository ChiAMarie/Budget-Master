from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, extract
from typing import List, Optional
from datetime import datetime
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/budgets", tags=["budgets"])


def current_month_parts():
    now = datetime.now()
    return now.year, now.month


@router.get("", response_model=List[schemas.BudgetRow])
def list_budgets(
    scenario: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    sc = scenario or "month1"
    year, mon = current_month_parts()

    targets = (
        db.query(models.BudgetTarget)
        .options(joinedload(models.BudgetTarget.category))
        .filter(models.BudgetTarget.scenario == sc)
        .order_by(models.BudgetTarget.category_id)
        .all()
    )

    result = []
    for bt in targets:
        # Compute actual spend for this category in current calendar month
        # via transaction_category join (only flow_type='spend', amounts are negative)
        actual = (
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
        actual_spend = abs(float(actual)) if actual else 0.0

        result.append({
            "id": bt.id,
            "category_id": bt.category_id,
            "category_name": bt.category.name if bt.category else "",
            "tier": bt.category.tier if bt.category else 0,
            "scenario": bt.scenario,
            "amount": float(bt.amount),
            "actual_spent": actual_spend,
        })

    return result
