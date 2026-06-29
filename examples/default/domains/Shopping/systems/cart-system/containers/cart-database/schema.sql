-- Cart Database — system of record for shopping carts

CREATE TABLE carts (
    cart_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id  UUID,
    status       TEXT NOT NULL DEFAULT 'OPEN'
                   CHECK (status IN ('OPEN', 'CHECKED_OUT', 'ABANDONED')),
    currency     CHAR(3) NOT NULL DEFAULT 'USD',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cart_items (
    cart_id          UUID NOT NULL REFERENCES carts (cart_id) ON DELETE CASCADE,
    product_id       UUID NOT NULL,
    quantity         INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
    PRIMARY KEY (cart_id, product_id)
);

CREATE INDEX idx_carts_customer ON carts (customer_id);
CREATE INDEX idx_carts_status   ON carts (status);
