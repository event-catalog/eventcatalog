-- Inventory Database — system of record for stock levels and reservations

CREATE TABLE stock (
    product_id  UUID PRIMARY KEY,
    available   INTEGER NOT NULL DEFAULT 0 CHECK (available >= 0),
    reserved    INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reservations (
    reservation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id       UUID,
    cart_id        UUID,
    status         TEXT NOT NULL DEFAULT 'HELD'
                     CHECK (status IN ('HELD', 'RELEASED', 'CONSUMED')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reservation_items (
    reservation_id UUID NOT NULL REFERENCES reservations (reservation_id) ON DELETE CASCADE,
    product_id     UUID NOT NULL,
    quantity       INTEGER NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (reservation_id, product_id)
);

CREATE INDEX idx_reservations_order ON reservations (order_id);
