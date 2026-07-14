from sqlalchemy import (
    Column, Integer, String, Numeric, Text, Date, DateTime,
    Boolean, ForeignKey, UniqueConstraint, Index, func
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from .database import Base


class Account(Base):
    __tablename__ = "accounts"

    id           = Column(Integer, primary_key=True)
    name         = Column(Text, nullable=False)
    type         = Column(Text, nullable=False)
    institution  = Column(Text, nullable=True)
    last4        = Column(Text, nullable=True)
    active       = Column(Boolean, nullable=False, default=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("name"),)

    transactions = relationship("Transaction", back_populates="account")


class Category(Base):
    __tablename__ = "categories"

    id                    = Column(Integer, primary_key=True)
    name                  = Column(Text, nullable=False)
    tier                  = Column(Integer, nullable=False)
    type                  = Column(Text, nullable=False)
    counts_toward_runrate = Column(Boolean, nullable=False, default=True)
    sort_order            = Column(Integer, nullable=True)
    created_at            = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("name"),)

    rules          = relationship("CategoryRule", back_populates="category")
    budget_targets = relationship("BudgetTarget", back_populates="category")


class CategoryRule(Base):
    __tablename__ = "category_rules"

    id          = Column(Integer, primary_key=True)
    pattern     = Column(Text, nullable=False)
    match_type  = Column(Text, nullable=False, default="contains")
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    priority    = Column(Integer, nullable=False, default=100)
    origin      = Column(Text, nullable=False, default="seed")
    active      = Column(Boolean, nullable=False, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("pattern", "category_id"),)

    category = relationship("Category", back_populates="rules")


class Transaction(Base):
    __tablename__ = "transactions"

    id          = Column(Integer, primary_key=True)
    account_id  = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    txn_date    = Column(Date, nullable=False)
    posted_date = Column(Date, nullable=True)
    description = Column(Text, nullable=False)
    amount      = Column(Numeric(12, 2), nullable=False)
    flow_type   = Column(Text, nullable=False, default="spend")
    is_pending  = Column(Boolean, nullable=False, default=False)
    dedup_hash  = Column(Text, nullable=False, unique=True)
    source_file = Column(Text, nullable=True)
    raw_data    = Column(JSONB, nullable=True)
    imported_at = Column(DateTime(timezone=True), server_default=func.now())

    account              = relationship("Account", back_populates="transactions")
    transaction_category = relationship("TransactionCategory", back_populates="transaction", uselist=False)


class TransactionCategory(Base):
    __tablename__ = "transaction_category"

    transaction_id = Column(Integer, ForeignKey("transactions.id"), primary_key=True)
    category_id    = Column(Integer, ForeignKey("categories.id"), nullable=False)
    source         = Column(Text, nullable=False, default="auto")
    rule_id        = Column(Integer, ForeignKey("category_rules.id"), nullable=True)
    updated_at     = Column(DateTime(timezone=True), server_default=func.now())

    transaction = relationship("Transaction", back_populates="transaction_category")
    category    = relationship("Category")
    rule        = relationship("CategoryRule")


class BudgetTarget(Base):
    __tablename__ = "budget_targets"

    id             = Column(Integer, primary_key=True)
    category_id    = Column(Integer, ForeignKey("categories.id"), nullable=False)
    scenario       = Column(Text, nullable=False)
    amount         = Column(Numeric(12, 2), nullable=False)
    effective_date = Column(Date, nullable=False, server_default=func.current_date())

    __table_args__ = (UniqueConstraint("category_id", "scenario", "effective_date"),)

    category = relationship("Category", back_populates="budget_targets")
