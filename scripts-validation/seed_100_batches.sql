-- ============================================================
-- seed_100_batches.sql
--
-- Bulk-loads 100 production batches together with their roster
-- links, batch items, inventory movements and stock balances,
-- so the UI can be exercised with a realistic amount of data.
--
-- Everything this script creates is tagged with
-- production_batches.created_at inside 2026-07-01 .. 2026-10-01.
-- Batches created through the API always get CURRENT_TIMESTAMP,
-- so they never fall in that window and are never touched.
-- That makes the script safe to re-run: a second run replaces
-- the 100 seeded batches instead of doubling them.
--
-- Apply with (PowerShell, from the repo root):
--   Get-Content -Raw scripts-validation\seed_100_batches.sql |
--     docker exec -i my_postgres_container psql -U myuser -d mydatabase -v ON_ERROR_STOP=1
--
-- Roll back with scripts-validation/seed_100_batches_rollback.sql
-- ============================================================

BEGIN;

-- 1. Clear any previous run of this seed.
--    production_batch_items / production_batch_employees disappear
--    through ON DELETE CASCADE; the ledger rows have no FK, so they
--    are purged explicitly.
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

-- 2. The batch headers themselves: one per day over a 90-day span,
--    spread across working hours.
INSERT INTO production_batches (production_date, created_at)
SELECT
    DATE '2026-07-01' + ((g - 1) % 90),
    (DATE '2026-07-01' + ((g - 1) % 90))
        + TIME '06:30'
        + ((g % 6) * INTERVAL '55 minutes')
FROM generate_series(1, 100) AS g;

-- 3. Staff every batch with one roster member; every third batch
--    gets a second one so the employee column is not uniform.
WITH seeded AS (
    SELECT id,
           (row_number() OVER (ORDER BY id)) - 1 AS idx
    FROM production_batches
    WHERE created_at >= '2026-07-01' AND created_at < '2026-10-01'
),
roster AS (
    SELECT id,
           (row_number() OVER (ORDER BY id)) - 1 AS rn,
           count(*) OVER () AS cnt
    FROM employees
)
INSERT INTO production_batch_employees (batch_id, employee_id)
SELECT s.id, r.id
FROM seeded s
CROSS JOIN roster r
WHERE r.rn = (s.idx % r.cnt)
   OR (r.cnt > 1
       AND s.idx % 3 = 0
       AND r.rn = ((s.idx % r.cnt) + 1) % r.cnt);

-- 4. Three products per batch, rotating through the catalogue so the
--    same three products are not always first. Quantities are a
--    deterministic 10..99 pseudo-random spread; expiry is 30..75
--    days after the production date.
WITH seeded AS (
    SELECT id,
           production_date,
           (row_number() OVER (ORDER BY id)) - 1 AS idx
    FROM production_batches
    WHERE created_at >= '2026-07-01' AND created_at < '2026-10-01'
),
catalog AS (
    SELECT id,
           (row_number() OVER (ORDER BY id)) - 1 AS rn,
           count(*) OVER () AS cnt
    FROM products
)
INSERT INTO production_batch_items (batch_id, product_id, quantity_produced, expiration_date)
SELECT s.id,
       c.id,
       10 + ((s.idx * 7 + c.rn * 13) % 90),
       s.production_date + (30 + ((s.idx + c.rn) % 4) * 15)::int
FROM seeded s
CROSS JOIN catalog c
WHERE c.cnt >= 3
  AND ((s.idx + c.rn) % c.cnt) < 3;

-- 5. Mirror every seeded item into the ledger, exactly the way
--    ProductionService.createBatchDetails does it.
INSERT INTO inventory_movements (product_id, quantity, type, reference_id)
SELECT i.product_id, i.quantity_produced, 'production', i.batch_id
FROM production_batch_items i
JOIN production_batches b ON b.id = i.batch_id
WHERE b.created_at >= '2026-07-01' AND b.created_at < '2026-10-01';

-- 6. stock_levels is a projection of the ledger, so rebuild it from
--    inventory_movements rather than incrementing blindly. This keeps
--    the script idempotent and keeps the stock dashboard consistent
--    with the movement log.
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

-- Report
SELECT (SELECT count(*) FROM production_batches)                                     AS batches,
       (SELECT count(*) FROM production_batch_employees)                             AS roster_links,
       (SELECT count(*) FROM production_batch_items)                                 AS batch_items,
       (SELECT count(*) FROM inventory_movements)                                    AS movements,
       (SELECT count(*) FROM stock_levels)                                           AS stock_rows;
