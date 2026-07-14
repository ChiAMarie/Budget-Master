from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("", response_model=List[schemas.Account])
def list_accounts(db: Session = Depends(get_db)):
    return db.query(models.Account).filter(models.Account.active == True).order_by(models.Account.id).all()


@router.get("/{id}", response_model=schemas.Account)
def get_account(id: int, db: Session = Depends(get_db)):
    account = db.query(models.Account).filter(models.Account.id == id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account
