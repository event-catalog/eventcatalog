-- Customer Database — system of record for customer profiles
-- Note: credentials/authentication are owned by the Identity Provider, not stored here.

CREATE TABLE customers (
    customer_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email        TEXT NOT NULL UNIQUE,
    name         TEXT,
    status       TEXT NOT NULL DEFAULT 'ACTIVE'
                   CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CLOSED')),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_status ON customers (status);
