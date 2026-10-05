-- The employee marta add the production
INSERT INTO production_batches (production_date) VALUES (CURRENT_DATE); -- batch id 1

INSERT INTO production_batch_employees (batch_id, employee_id)
SELECT 1, id FROM employees WHERE name = 'Marta';

INSERT INTO production_batch_items (batch_id, product_id, quantity_produced, expiration_date) 
VALUES 
(1, 1, 50, '2027-06-08'), 
(1, 2, 50, '2027-06-08'), 
(1, 3, 50, '2027-06-08'), 
(1, 4, 30, '2027-06-08');
-- So we update the stock
INSERT INTO inventory_movements (product_id, quantity, type, reference_id)
VALUES (1, 50, 'production', 1),
(2, 50, 'production', 1),
(3, 50, 'production', 1),
(4, 30, 'production', 1);

-- Another employee works and add procution
INSERT INTO production_batches (production_date) VALUES (CURRENT_DATE); -- batch id 2

INSERT INTO production_batch_employees (batch_id, employee_id)
SELECT 2, id FROM employees WHERE name = 'Yanira';

INSERT INTO production_batch_items (batch_id, product_id, quantity_produced, expiration_date) 
VALUES 
(2, 1, 50, '2027-06-08'), 
(2, 5, 50, '2027-06-08'), 
(2, 6, 50, '2027-06-08'), 
(2, 7, 60, '2027-06-08');

-- So we update the stock 
INSERT INTO inventory_movements (product_id, quantity, type, reference_id)
VALUES (1, 50, 'production', 2),
(5, 50, 'production', 2),
(6, 50, 'production', 2),
(7, 60, 'production', 2);

INSERT INTO customers (company_name, contact_name, phone, email, delivery_address, is_active) VALUES
('Puesto Abastos', 'Carlos Rodríguez', '3112233445', 'carlos@abastos.com', 'Calle 70 # 12-34, Bogotá', TRUE),
('Tienda de la esquina', 'María Fernanda López', '3224455667', 'maria@frutasdelvalle.com', 'Carrera 45 # 23-12, Cali', TRUE);

INSERT INTO sales (customer_id, employee_name, status) 
VALUES ((SELECT id FROM customers WHERE company_name = 'Puesto Abastos'), 'Yanira', 'pending');


--Now someone sell 50 lb of product 1
INSERT INTO inventory_movements (product_id, quantity, type, reference_id)
VALUES (1, -50, 'sale', 1);

-- We found 10 lb broken that cannot be sale
INSERT INTO inventory_movements (product_id, quantity, type, reference_id)
VALUES (1, -10, 'spoilage', null);

-- Seed stock_levels to match the ledger movements above; the POS and the
-- stock dashboard read stock_levels, not the movement log.
INSERT INTO stock_levels (product_id, current_stock) VALUES
(1, 40),  -- 50 + 50 - 50 (sale) - 10 (spoilage)
(2, 50),
(3, 50),
(4, 30),
(5, 50),
(6, 50),
(7, 60)
ON CONFLICT (product_id) DO NOTHING;