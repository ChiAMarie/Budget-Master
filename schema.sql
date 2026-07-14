-- =====================================================================
-- Real-Time Adaptive Budget App  |  Phase 1 Data Layer
-- Database schema (PostgreSQL 16, Replit-native)
-- Written as plain, portable Postgres: moving to Supabase or self-hosted
-- later is a connection-string change, not a rewrite.
-- Run this once in Replit's SQL runner to create the six tables.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. accounts
-- Your source accounts, so every transaction knows where it came from.
-- ---------------------------------------------------------------------
create table if not exists accounts (
    id            serial primary key,
    name          text        not null,              -- 'AmEx', 'Venture X', 'Quicksilver', 'Checking'
    type          text        not null,              -- 'credit_card' | 'checking'
    institution   text,                              -- 'American Express', 'Capital One'
    last4         text,                              -- last 4 digits, optional
    active        boolean     not null default true,
    created_at    timestamptz not null default now(),
    unique (name)
);

-- ---------------------------------------------------------------------
-- 2. categories
-- Your Phase 0 taxonomy. Each category knows its tier and whether it
-- counts toward your spending run-rate (one-offs and transfers do not).
-- ---------------------------------------------------------------------
create table if not exists categories (
    id                     serial primary key,
    name                   text        not null unique,  -- 'Rent', 'Eating Out', ...
    tier                   int         not null,         -- 1-4, or 0 for excluded / non-spend
    type                   text        not null,         -- 'fixed' | 'variable' | 'sinking_fund' | 'excluded'
    counts_toward_runrate  boolean     not null default true,
    sort_order             int,
    created_at             timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. category_rules
-- The auto-categorizer's memory: merchant patterns -> category.
-- First match wins (lowest priority number checked first).
-- ---------------------------------------------------------------------
create table if not exists category_rules (
    id           serial primary key,
    pattern      text        not null,                 -- substring or regex found in the description
    match_type   text        not null default 'contains', -- 'contains' | 'regex'
    category_id  int         not null references categories(id),
    priority     int         not null default 100,     -- lower = checked first
    origin       text        not null default 'seed',  -- 'seed' | 'user'
    active       boolean     not null default true,
    created_at   timestamptz not null default now(),
    unique (pattern, category_id)
);

-- ---------------------------------------------------------------------
-- 4. transactions  (THE IMMUTABLE CORE)
-- One row per bank line item, never edited after import. Amount is
-- always signed so negative = money leaving you, normalized across all
-- four banks even though they format it differently. The dedup_hash
-- makes re-importing the same CSV harmless. raw_data keeps the original
-- row untouched so source history is never lost.
-- ---------------------------------------------------------------------
create table if not exists transactions (
    id            serial primary key,
    account_id    int           not null references accounts(id),
    txn_date      date          not null,              -- when the transaction occurred
    posted_date   date,                                -- when it posted (cards have both)
    description   text          not null,              -- raw bank description
    amount        numeric(12,2) not null,              -- signed: negative = money out
    flow_type     text          not null default 'spend',
        -- 'spend' | 'card_payment' | 'transfer' | 'income' | 'investment' | 'savings' | 'fee'
    is_pending    boolean       not null default false,
    dedup_hash    text          not null unique,       -- prevents duplicate imports
    source_file   text,                                -- which CSV it came from (audit trail)
    raw_data      jsonb,                               -- the original row, exactly as imported
    imported_at   timestamptz   not null default now()
);

create index if not exists idx_txn_account on transactions(account_id);
create index if not exists idx_txn_date    on transactions(txn_date);
create index if not exists idx_txn_flow    on transactions(flow_type);

-- ---------------------------------------------------------------------
-- 5. transaction_category  (THE MUTABLE LAYER, kept separate on purpose)
-- This is what lets you one-tap recategorize forever without ever
-- touching the immutable transaction record above. One row per
-- transaction = its single current category. 'manual' choices win and
-- are never overwritten when the auto-rules run again.
-- ---------------------------------------------------------------------
create table if not exists transaction_category (
    transaction_id  int         primary key references transactions(id),
    category_id     int         not null references categories(id),
    source          text        not null default 'auto',  -- 'auto' (a rule set it) | 'manual' (you tapped it)
    rule_id         int         references category_rules(id),  -- which rule, if auto
    updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. budget_targets
-- Your Month 1 and Stretch numbers per category, so the app can show
-- actual against plan. effective_date lets targets change over time
-- without losing history (the dynamic-budget hook for later phases).
-- ---------------------------------------------------------------------
create table if not exists budget_targets (
    id              serial primary key,
    category_id     int           not null references categories(id),
    scenario        text          not null,            -- 'month1' | 'stretch'
    amount          numeric(12,2) not null,            -- monthly target
    effective_date  date          not null default current_date,
    unique (category_id, scenario, effective_date)
);
