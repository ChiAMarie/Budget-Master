# Ledger — Personal Budget Tracker

A personal budgeting web app for tracking income, expenses, accounts, and budget goals.

## Run & Operate

- Frontend: `pnpm --filter @workspace/budget-app run dev` (port from workflow)
- API: `cd artifacts/api-server && uvicorn python.main:app --host 0.0.0.0 --port 8080 --reload`
- Codegen: `pnpm --filter @workspace/api-spec run codegen`
- Full typecheck: `pnpm run typecheck`

## Stack

- Frontend: React + Vite + Tailwind + shadcn/ui + Recharts + wouter + TanStack Query
- Backend: Python FastAPI + SQLAlchemy + psycopg2 (PostgreSQL)
- DB: PostgreSQL (Replit managed)
- API contract: OpenAPI spec → Orval codegen (React Query hooks + Zod schemas)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `artifacts/budget-app/src/` — React frontend
- `artifacts/api-server/python/` — Python FastAPI backend
- `artifacts/api-server/python/main.py` — FastAPI app entrypoint
- `artifacts/api-server/python/models.py` — SQLAlchemy models
- `artifacts/api-server/python/routers/` — Route handlers (accounts, categories, transactions, budgets, summary)
- `lib/api-client-react/src/generated/` — Generated React Query hooks
- `lib/api-zod/src/generated/` — Generated Zod validation schemas

## Architecture decisions

- Python FastAPI backend replaces the default Node.js/Express server for the budget app routes. The artifact.toml for api-server runs uvicorn via a shell command.
- SQLAlchemy ORM with PostgreSQL. Tables auto-created at startup via `Base.metadata.create_all`.
- OpenAPI spec is still the source of truth — codegen produces typed hooks for the frontend. Backend uses its own Pydantic schemas (manually kept in sync with the spec).
- FastAPI runs at `/api/*` via the shared proxy. Frontend at `/`.

## Product

- Dashboard with balance overview, spending by category (pie chart), 6-month income/expense trend, budget vs actual, recent transactions
- Transactions: list, filter by month/account/category/type, CRUD
- Accounts: checking/savings/credit/cash/investment accounts with balances
- Budgets: monthly category budgets with progress tracking
- Categories: custom income/expense categories with color and icon

## Gotchas

- Google Fonts `@import url()` must be the very first line in `index.css` — before all other imports
- When filtering `Date` columns in SQLAlchemy, use `cast(Column, String)` not `.cast(str)` (Python type vs SQLAlchemy type)
- Backend uses `uvicorn` with `--reload` in dev; Python path must be set from `artifacts/api-server/` dir
- After any OpenAPI spec change, run `pnpm --filter @workspace/api-spec run codegen` before frontend dev
