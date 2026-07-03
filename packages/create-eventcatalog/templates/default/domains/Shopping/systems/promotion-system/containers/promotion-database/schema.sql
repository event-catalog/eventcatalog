-- Promotion Database — system of record for promotion and discount rules

CREATE TABLE promotions (
    promotion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code         TEXT NOT NULL UNIQUE,
    description  TEXT,
    type         TEXT NOT NULL CHECK (type IN ('PERCENTAGE', 'FIXED_AMOUNT')),
    value        INTEGER NOT NULL CHECK (value >= 0),
    starts_at    TIMESTAMPTZ NOT NULL,
    ends_at      TIMESTAMPTZ,
    active       BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE eligibility_rules (
    promotion_id     UUID NOT NULL REFERENCES promotions (promotion_id) ON DELETE CASCADE,
    min_spend_cents  INTEGER CHECK (min_spend_cents >= 0),
    customer_segment TEXT,
    PRIMARY KEY (promotion_id)
);

CREATE INDEX idx_promotions_active ON promotions (active) WHERE active = true;
