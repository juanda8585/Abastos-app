-- =============================================================================
-- Migration: add products.list_price
-- =============================================================================
-- Fresh installs get this column from 01_database.sql. Databases created from
-- an older 01_database.sql (i.e. any database that already has data in its
-- postgres_data volume) do NOT re-run the init scripts, so they need this
-- migration applied manually:
--
--   docker exec -i my_postgres_container psql -U myuser -d mydatabase \
--     < init-scripts/migrations/2026-10-05_add_products_list_price.sql
--
-- Files in this subdirectory are NOT executed by docker-entrypoint-initdb.d
-- (it only picks up *.sql directly inside /docker-entrypoint-initdb.d).
-- =============================================================================

BEGIN;

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS list_price DECIMAL(12,2) NOT NULL DEFAULT 0.00
    CONSTRAINT products_list_price_check CHECK (list_price >= 0);

-- Backfill the same default POS prices used by 02_init_data.sql so existing
-- environments behave like a fresh one. Sku-based, so it is safe to re-run and
-- never overwrites a price an operator has already edited.
UPDATE products SET list_price = v.price
FROM (VALUES
    ('MANGO',        6500::numeric),
    ('GUAYABA',      5500::numeric),
    ('MARACUYA',     7500::numeric),
    ('LULO',         6000::numeric),
    ('MORA',         6500::numeric),
    ('FRESA',        8000::numeric),
    ('GUANABANA',    7000::numeric),
    ('BANANO',       5000::numeric),
    ('CURUBA',       6500::numeric),
    ('NARANJA',      5500::numeric),
    ('TOMATEARBOL',  7000::numeric),
    ('FREIJOA',      8500::numeric),
    ('PINA',         6000::numeric)
) AS v(sku, price)
WHERE products.sku = v.sku
  AND products.list_price = 0;

COMMIT;
