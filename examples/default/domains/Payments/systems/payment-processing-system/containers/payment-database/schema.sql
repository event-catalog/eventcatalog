-- Payment Database — system of record for payments and refunds

CREATE TABLE payments (
    payment_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     UUID NOT NULL,
    customer_id  UUID,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    currency     CHAR(3) NOT NULL DEFAULT 'USD',
    status       TEXT NOT NULL DEFAULT 'REQUESTED'
                   CHECK (status IN ('REQUESTED', 'SUCCEEDED', 'FAILED')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refunds (
    refund_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id   UUID NOT NULL REFERENCES payments (payment_id),
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    status       TEXT NOT NULL DEFAULT 'REQUESTED'
                   CHECK (status IN ('REQUESTED', 'PROCESSED', 'FAILED')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_order  ON payments (order_id);
CREATE INDEX idx_payments_status ON payments (status);
