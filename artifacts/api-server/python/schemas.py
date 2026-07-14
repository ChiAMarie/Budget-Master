from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from decimal import Decimal


class HealthStatus(BaseModel):
    status: str


# Account schemas
class AccountBase(BaseModel):
    name: str = Field(min_length=1)
    type: str
    balance: float
    currency: str = "USD"
    color: Optional[str] = None


class AccountInput(AccountBase):
    pass


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    balance: Optional[float] = None
    color: Optional[str] = None


class Account(AccountBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Category schemas
class CategoryInput(BaseModel):
    name: str = Field(min_length=1)
    type: str
    color: str = "#6366f1"
    icon: str = "circle"


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class Category(BaseModel):
    id: int
    name: str
    type: str
    color: str
    icon: str

    class Config:
        from_attributes = True


# Transaction schemas
class TransactionInput(BaseModel):
    account_id: int
    category_id: int
    amount: float = Field(gt=0)
    type: str
    description: str = Field(min_length=1)
    notes: Optional[str] = None
    date: date


class TransactionUpdate(BaseModel):
    account_id: Optional[int] = None
    category_id: Optional[int] = None
    amount: Optional[float] = None
    type: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    date: Optional[date] = None


class Transaction(BaseModel):
    id: int
    account_id: int
    category_id: int
    account_name: Optional[str] = None
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    category_icon: Optional[str] = None
    amount: float
    type: str
    description: str
    notes: Optional[str] = None
    date: date
    created_at: datetime

    class Config:
        from_attributes = True


# Budget schemas
class BudgetInput(BaseModel):
    category_id: int
    month: str
    limit_amount: float = Field(gt=0)


class BudgetUpdate(BaseModel):
    limit_amount: Optional[float] = None


class Budget(BaseModel):
    id: int
    category_id: int
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    category_icon: Optional[str] = None
    month: str
    limit_amount: float
    spent_amount: float = 0.0

    class Config:
        from_attributes = True


# Summary schemas
class OverviewSummary(BaseModel):
    total_balance: float
    monthly_income: float
    monthly_expenses: float
    net_savings: float
    transaction_count: int
    month: str


class CategorySpending(BaseModel):
    category_id: int
    category_name: str
    category_color: str
    category_icon: str
    amount: float
    percentage: float


class MonthlyTrend(BaseModel):
    month: str
    income: float
    expenses: float
    net: float


class BudgetVsActual(BaseModel):
    category_id: int
    category_name: str
    category_color: str
    category_icon: str
    budget_limit: float
    actual_spent: float
    remaining: float
    percentage_used: float
