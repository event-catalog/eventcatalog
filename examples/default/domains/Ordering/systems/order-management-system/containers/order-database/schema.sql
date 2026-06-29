-- Order Database — system of record for orders

CREATE TABLE orders (
    order_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id      UUID,
    customer_id  UUID NOT NULL,
    status       TEXT NOT NULL DEFAULT 'CREATED'
                   CHECK (status IN ('CREATED', 'COMPLETED', 'CANCELLED')),
    total_cents  INTEGER NOT NULL CHECK (total_cents >= 0),
    currency     CHAR(3) NOT NULL DEFAULT 'USD',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
    order_id         UUID NOT NULL REFERENCES orders (order_id) ON DELETE CASCADE,
    product_id       UUID NOT NULL,
    quantity         INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
    PRIMARY KEY (order_id, product_id)
);

CREATE INDEX idx_orders_customer ON orders (customer_id);
CREATE INDEX idx_orders_status   ON orders (status);
