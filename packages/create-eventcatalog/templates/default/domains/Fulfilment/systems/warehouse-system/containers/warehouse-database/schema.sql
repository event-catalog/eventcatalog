-- Warehouse Database — picking and packing jobs

CREATE TABLE picking_jobs (
    job_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL,
    status      TEXT NOT NULL DEFAULT 'CREATED'
                  CHECK (status IN ('CREATED', 'PICKING', 'PACKED')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE picking_job_items (
    job_id      UUID NOT NULL REFERENCES picking_jobs (job_id) ON DELETE CASCADE,
    product_id  UUID NOT NULL,
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    picked      BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (job_id, product_id)
);

CREATE INDEX idx_picking_jobs_order  ON picking_jobs (order_id);
CREATE INDEX idx_picking_jobs_status ON picking_jobs (status);
