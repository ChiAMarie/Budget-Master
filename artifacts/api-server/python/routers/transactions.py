from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _enrich(tx: models.Transaction) -> dict:
    return {
        "id": tx.id,
        "account_id": tx.account_id,
        "category_id": tx.category_id,
        "account_name": tx.account.name if tx.account else None,
        "category_name": tx.category.name if tx.category else None,
        "category_color": tx.category.color if tx.category else None,
        "category_icon": tx.category.icon if tx.category else None,
        "amount": float(tx.amount),
        "type": tx.type,
        "description": tx.description,
        "notes": tx.notes,
        "date": tx.date,
        "created_at": tx.created_at,
    }


@router.get("", response_model=List[schemas.Transaction])
def list_transactions(
    account_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    type: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(models.Transaction).options(
        joinedload(models.Transaction.account),
        joinedload(models.Transaction.category),
    )
    if account_id is not None:
        q = q.filter(models.Transaction.account_id == account_id)
    if category_id is not None:
        q = q.filter(models.Transaction.category_id == category_id)
    if type is not None:
        q = q.filter(models.Transaction.type == type)
    if month is not None:
        # month is YYYY-MM, e.g. "2026-07"
        from sqlalchemy import cast, String
        q = q.filter(cast(models.Transaction.date, String).like(f"{month}%"))
    txs = q.order_by(models.Transaction.date.desc(), models.Transaction.created_at.desc()).all()
    return [_enrich(tx) for tx in txs]


@router.post("", response_model=schemas.Transaction, status_code=201)
def create_transaction(data: schemas.TransactionInput, db: Session = Depends(get_db)):
    tx = models.Transaction(**data.model_dump())
    db.add(tx)
    db.commit()
    db.refresh(tx)
    db.expire(tx)
    tx = db.query(models.Transaction).options(
        joinedload(models.Transaction.account),
        joinedload(models.Transaction.category),
    ).filter(models.Transaction.id == tx.id).first()
    return _enrich(tx)


@router.get("/{id}", response_model=schemas.Transaction)
def get_transaction(id: int, db: Session = Depends(get_db)):
    tx = db.query(models.Transaction).options(
        joinedload(models.Transaction.account),
        joinedload(models.Transaction.category),
    ).filter(models.Transaction.id == id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return _enrich(tx)


@router.patch("/{id}", response_model=schemas.Transaction)
def update_transaction(id: int, data: schemas.TransactionUpdate, db: Session = Depends(get_db)):
    tx = db.query(models.Transaction).filter(models.Transaction.id == id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(tx, field, value)
    db.commit()
    db.expire(tx)
    tx = db.query(models.Transaction).options(
        joinedload(models.Transaction.account),
        joinedload(models.Transaction.category),
    ).filter(models.Transaction.id == id).first()
    return _enrich(tx)


@router.delete("/{id}", status_code=204)
def delete_transaction(id: int, db: Session = Depends(get_db)):
    tx = db.query(models.Transaction).filter(models.Transaction.id == id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(tx)
    db.commit()
