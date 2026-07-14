from sqlalchemy import Column, Integer, String, Numeric, Text, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from .database import Base


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)
    balance = Column(Numeric(14, 2), nullable=False, default=0)
    currency = Column(String(10), nullable=False, default="USD")
    color = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    transactions = relationship("Transaction", back_populates="account")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(20), nullable=False)
    color = Column(String(20), nullable=False, default="#6366f1")
    icon = Column(String(50), nullable=False, default="circle")

    transactions = relationship("Transaction", back_populates="category")
    budgets = relationship("Budget", back_populates="category")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    type = Column(String(20), nullable=False)
    description = Column(String(500), nullable=False)
    notes = Column(Text, nullable=True)
    date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    account = relationship("Account", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    month = Column(String(7), nullable=False)
    limit_amount = Column(Numeric(14, 2), nullable=False)

    category = relationship("Category", back_populates="budgets")
