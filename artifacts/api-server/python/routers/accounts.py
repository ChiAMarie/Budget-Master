from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/accounts", tags=["accounts"])


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    institution: Optional[str] = None
    last4: Optional[str] = None


@router.get("", response_model=List[schemas.Account])
def list_accounts(db: Session = Depends(get_db)):
    return db.query(models.Account).filter(models.Account.active == True).order_by(models.Account.id).all()


@router.get("/{id}", response_model=schemas.Account)
def get_account(id: int, db: Session = Depends(get_db)):
    account = db.query(models.Account).filter(models.Account.id == id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.patch("/{id}", response_model=schemas.Account)
def update_account(id: int, data: AccountUpdate, db: Session = Depends(get_db)):
    account = db.query(models.Account).filter(models.Account.id == id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    if data.name is not None:
        account.name = data.name
    if data.institution is not None:
        account.institution = data.institution
    if data.last4 is not None:
        account.last4 = data.last4
    db.commit()
    db.refresh(account)
    return account
