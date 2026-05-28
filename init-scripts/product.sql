CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    unit VARCHAR(10) NOT NULL CHECK (unit IN ('lb', 'kg')),
    selling_price DECIMAL(10,2) NOT NULL
);
-- The employee at the end of the day creates a batch production, where they add what the made 
CREATE TABLE production_batches (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity_produced DECIMAL(10,2) NOT NULL CHECK (quantity_produced > 0),
    expiration_date DATE NOT NULL,
    production_date DATE NOT NULL DEFAULT CURRENT_DATE,
    employee_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity_sold DECIMAL(10,2) NOT NULL CHECK (quantity_sold > 0),
    employee_name VARCHAR(100) NOT NULL,
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);