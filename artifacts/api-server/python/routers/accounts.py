from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("", response_model=List[schemas.Account])
def list_accounts(db: Session = Depends(get_db)):
    return db.query(models.Account).order_by(models.Account.created_at).all()


@router.post("", response_model=schemas.Account, status_code=201)
def create_account(data: schemas.AccountInput, db: Session = Depends(get_db)):
    account = models.Account(**data.model_dump())
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.get("/{id}", response_model=schemas.Account)
def get_account(id: int, db: Session = Depends(get_db)):
    account = db.query(models.Account).filter(models.Account.id == id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.patch("/{id}", response_model=schemas.Account)
def update_account(id: int, data: schemas.AccountUpdate, db: Session = Depends(get_db)):
    account = db.query(models.Account).filter(models.Account.id == id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(account, field, value)
    db.commit()
    db.refresh(account)
    return account


@router.delete("/{id}", status_code=204)
def delete_account(id: int, db: Session = Depends(get_db)):
    account = db.query(models.Account).filter(models.Account.id == id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    db.delete(account)
    db.commit()
