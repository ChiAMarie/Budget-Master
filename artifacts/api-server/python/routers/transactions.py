from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _enrich(tx: models.Transaction) -> dict:
    tc = tx.transaction_category
    return {
        "id": tx.id,
        "account_id": tx.account_id,
        "account_name": tx.account.name if tx.account else None,
        "txn_date": tx.txn_date,
        "posted_date": tx.posted_date,
        "description": tx.description,
        "amount": float(tx.amount),
        "flow_type": tx.flow_type,
        "is_pending": tx.is_pending,
        "dedup_hash": tx.dedup_hash,
        "source_file": tx.source_file,
        "imported_at": tx.imported_at,
        "category_id": tc.category_id if tc else None,
        "category_name": tc.category.name if tc and tc.category else None,
        "category_source": tc.source if tc else None,
    }


@router.get("", response_model=List[schemas.Transaction])
def list_transactions(
    account_id: Optional[int] = Query(None),
    flow_type: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(models.Transaction).options(
        joinedload(models.Transaction.account),
        joinedload(models.Transaction.transaction_category).joinedload(
            models.TransactionCategory.category
        ),
    )
    if account_id is not None:
        q = q.filter(models.Transaction.account_id == account_id)
    if flow_type is not None:
        q = q.filter(models.Transaction.flow_type == flow_type)
    if month is not None:
        from sqlalchemy import cast, String
        q = q.filter(cast(models.Transaction.txn_date, String).like(f"{month}%"))
    txs = q.order_by(models.Transaction.txn_date.desc(), models.Transaction.imported_at.desc()).all()
    return [_enrich(tx) for tx in txs]


@router.get("/{id}", response_model=schemas.Transaction)
def get_transaction(id: int, db: Session = Depends(get_db)):
    tx = db.query(models.Transaction).options(
        joinedload(models.Transaction.account),
        joinedload(models.Transaction.transaction_category).joinedload(
            models.TransactionCategory.category
        ),
    ).filter(models.Transaction.id == id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return _enrich(tx)
