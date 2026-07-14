from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/budgets", tags=["budgets"])


def _enrich_budget(budget: models.Budget, db: Session) -> dict:
    # Calculate actual spent for this budget's category/month
    spent = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.category_id == budget.category_id,
        models.Transaction.type == "expense",
        models.Transaction.date.cast(str).like(f"{budget.month}%"),
    ).scalar() or 0.0

    return {
        "id": budget.id,
        "category_id": budget.category_id,
        "category_name": budget.category.name if budget.category else None,
        "category_color": budget.category.color if budget.category else None,
        "category_icon": budget.category.icon if budget.category else None,
        "month": budget.month,
        "limit_amount": float(budget.limit_amount),
        "spent_amount": float(spent),
    }


@router.get("", response_model=List[schemas.Budget])
def list_budgets(
    month: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(models.Budget).options(joinedload(models.Budget.category))
    if month:
        q = q.filter(models.Budget.month == month)
    budgets = q.all()
    return [_enrich_budget(b, db) for b in budgets]


@router.post("", response_model=schemas.Budget, status_code=201)
def create_budget(data: schemas.BudgetInput, db: Session = Depends(get_db)):
    budget = models.Budget(**data.model_dump())
    db.add(budget)
    db.commit()
    db.refresh(budget)
    db.expire(budget)
    budget = db.query(models.Budget).options(joinedload(models.Budget.category)).filter(models.Budget.id == budget.id).first()
    return _enrich_budget(budget, db)


@router.patch("/{id}", response_model=schemas.Budget)
def update_budget(id: int, data: schemas.BudgetUpdate, db: Session = Depends(get_db)):
    budget = db.query(models.Budget).filter(models.Budget.id == id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(budget, field, value)
    db.commit()
    db.expire(budget)
    budget = db.query(models.Budget).options(joinedload(models.Budget.category)).filter(models.Budget.id == id).first()
    return _enrich_budget(budget, db)


@router.delete("/{id}", status_code=204)
def delete_budget(id: int, db: Session = Depends(get_db)):
    budget = db.query(models.Budget).filter(models.Budget.id == id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    db.delete(budget)
    db.commit()
