from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("", response_model=List[schemas.BudgetTarget])
def list_budget_targets(
    scenario: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(models.BudgetTarget)
    if scenario:
        q = q.filter(models.BudgetTarget.scenario == scenario)
    return q.order_by(models.BudgetTarget.category_id).all()
