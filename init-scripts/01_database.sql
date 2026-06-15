CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    unit VARCHAR(10) NOT NULL CHECK (unit IN ('lb', 'kg'))
);
--Header-Detail pattern (or Parent-Child) or Composition (Object-Oriented Programming / UML)
CREATE TABLE production_batches (
    id SERIAL PRIMARY KEY,
    employee_name VARCHAR(100) NOT NULL,
    production_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE production_batch_items (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity_produced DECIMAL(10,2) NOT NULL CHECK (quantity_produced > 0),
    expiration_date DATE NOT NULL
);
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(150) NOT NULL,
    contact_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    delivery_address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TYPE sale_status AS ENUM ('created','pending', 'paid', 'cancelled', 'refunded');
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    employee_name VARCHAR(100) NOT NULL,
    status sale_status NOT NULL DEFAULT 'created',
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity_sold DECIMAL(10,2) NOT NULL CHECK (quantity_sold > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0)
);
CREATE TYPE movement_type AS ENUM ('production', 'sale', 'adjustment', 'spoilage');
CREATE TABLE inventory_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity DECIMAL(10,2) NOT NULL, -- Positive for adding stock, Negative for removing stock
    type movement_type NOT NULL,
    reference_id INTEGER, -- Links back to the sale_id or production_session_id
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE stock_levels (
    product_id INTEGER PRIMARY KEY REFERENCES products(id),
    current_stock DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
