-- ============================================================
-- seed_100_batches_rollback.sql
--
-- Removes exactly what seed_100_batches.sql created (the 100
-- batches tagged with created_at in 2026-07-01 .. 2026-10-01)
-- and rebuilds stock_levels from the remaining ledger.
-- Batches created through the API are untouched.
--
--   Get-Content -Raw scripts-validation\seed_100_batches_rollback.sql |
--     docker exec -i my_postgres_container psql -U myuser -d mydatabase -v ON_ERROR_STOP=1
-- ============================================================

BEGIN;

WITH seeded AS (
    SELECT id
    FROM production_batches
    WHERE created_at >= '2026-07-01' AND created_at < '2026-10-01'
),
purged_movements AS (
    DELETE FROM inventory_movements im
    USING seeded s
    WHERE im.reference_id = s.id
      AND im.type = 'production'
    RETURNING im.id
)
DELETE FROM production_batches b
USING seeded s
WHERE b.id = s.id;

INSERT INTO stock_levels (product_id, current_stock, updated_at)
SELECT p.id, COALESCE(l.total, 0), CURRENT_TIMESTAMP
FROM products p
LEFT JOIN (
    SELECT product_id, SUM(quantity) AS total
    FROM inventory_movements
    GROUP BY product_id
) l ON l.product_id = p.id
ON CONFLICT (product_id) DO UPDATE
SET current_stock = EXCLUDED.current_stock,
    updated_at = CURRENT_TIMESTAMP;

COMMIT;

SELECT (SELECT count(*) FROM production_batches)     AS batches,
       (SELECT count(*) FROM production_batch_items) AS batch_items,
       (SELECT count(*) FROM inventory_movements)    AS movements;
