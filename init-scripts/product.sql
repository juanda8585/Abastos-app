CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    unit VARCHAR(10) NOT NULL CHECK (unit IN ('lb', 'kg')),
    selling_price DECIMAL(10,2) NOT NULL
);