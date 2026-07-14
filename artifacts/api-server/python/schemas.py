from pydantic import BaseModel
from typing import Optional, Any
from datetime import date, datetime
from decimal import Decimal


class HealthStatus(BaseModel):
    status: str


# Account schemas
class Account(BaseModel):
    id: int
    name: str
    type: str
    institution: Optional[str] = None
    last4: Optional[str] = None
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Category schemas
class Category(BaseModel):
    id: int
    name: str
    tier: int
    type: str
    counts_toward_runrate: bool
    sort_order: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# CategoryRule schemas
class CategoryRule(BaseModel):
    id: int
    pattern: str
    match_type: str
    category_id: int
    priority: int
    origin: str
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Transaction schemas — read-only; no input/update schemas
class Transaction(BaseModel):
    id: int
    account_id: int
    account_name: Optional[str] = None
    txn_date: date
    posted_date: Optional[date] = None
    description: str
    amount: float
    flow_type: str
    is_pending: bool
    dedup_hash: str
    source_file: Optional[str] = None
    imported_at: datetime
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    category_source: Optional[str] = None

    class Config:
        from_attributes = True


# TransactionCategory schemas — the only mutable layer per transaction
class TransactionCategoryInput(BaseModel):
    category_id: int
    source: str = "manual"


class TransactionCategory(BaseModel):
    transaction_id: int
    category_id: int
    source: str
    rule_id: Optional[int] = None
    updated_at: datetime

    class Config:
        from_attributes = True


# BudgetTarget schemas
class BudgetTarget(BaseModel):
    id: int
    category_id: int
    scenario: str
    amount: float
    effective_date: date

    class Config:
        from_attributes = True


# BudgetRow — enriched budget target with actual spend
class BudgetRow(BaseModel):
    id: int
    category_id: int
    category_name: str
    tier: int
    scenario: str
    amount: float
    actual_spent: float


# Summary schemas
class OverviewSummary(BaseModel):
    monthly_spend: float
    monthly_income: float
    net: float
    transaction_count: int
    month: str


class CategorySpending(BaseModel):
    category_id: int
    category_name: str
    amount: float
    percentage: float


class MonthlyTrend(BaseModel):
    month: str
    income: float
    spend: float
    net: float


class BudgetVsActual(BaseModel):
    category_id: int
    category_name: str
    tier: int
    scenario: str
    budget_limit: float
    actual_spent: float
    remaining: float
    percentage_used: float
