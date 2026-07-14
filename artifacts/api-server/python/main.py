import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from python.database import Base, engine
from python.routers import accounts, categories, transactions, budgets, summary

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Budget Tracker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(accounts.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(budgets.router, prefix="/api")
app.include_router(summary.router, prefix="/api")


@app.get("/api/healthz")
def health_check():
    return {"status": "ok"}
