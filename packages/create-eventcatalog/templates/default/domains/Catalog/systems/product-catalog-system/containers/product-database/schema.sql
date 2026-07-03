-- Product Database — system of record for the product catalog

CREATE TABLE products (
    product_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku          TEXT NOT NULL UNIQUE,
    name         TEXT NOT NULL,
    description  TEXT,
    price_cents  INTEGER NOT NULL CHECK (price_cents >= 0),
    currency     CHAR(3) NOT NULL,
    category     TEXT,
    status       TEXT NOT NULL DEFAULT 'DRAFT'
                   CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON products (category);
CREATE INDEX idx_products_status   ON products (status);

-- Transactional outbox — change events are written here in the same
-- transaction as the product change, then drained by the Product Search Publisher.
CREATE TABLE outbox (
    id            BIGSERIAL PRIMARY KEY,
    product_id    UUID NOT NULL REFERENCES products (product_id),
    event_type    TEXT NOT NULL
                    CHECK (event_type IN ('ProductCreated', 'ProductUpdated', 'ProductDeleted')),
    payload       JSONB NOT NULL,
    occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at  TIMESTAMPTZ
);

-- Index used by the publisher to find unpublished changes in order.
CREATE INDEX idx_outbox_unpublished ON outbox (id) WHERE published_at IS NULL;
