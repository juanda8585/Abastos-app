-- Employee roster shown when opening a production batch
INSERT INTO employees (name) VALUES
('Jaqueline'),
('Yanira'),
('Marta'),
('Juan David'),
('Bibiana');

-- Insert products (list_price = default POS price per unit, in COP)
INSERT INTO products (sku, name, description, unit, list_price) VALUES
('GUAYABA', 'Guayaba', 'Pulpa de guayaba fresca, ideal para jugos y postres.', 'unit', 5500),
('MARACUYA', 'Maracuyá', 'Pulpa ácida y aromática de maracuyá, perfecta para bebidas.', 'unit', 7500),
('LULO', 'Lulo', 'Pulpa de lulo andino, sabor cítrico y refrescante.', 'unit', 6000),
('MORA', 'Mora', 'Pulpa de mora de Castilla, rica en antioxidantes.', 'unit', 6500),
('FRESA', 'Fresa', 'Pulpa de fresa dulce, sin azúcar añadida.', 'unit', 8000),
('GUANABANA', 'Guanábana', 'Pulpa cremosa de guanábana, ideal para smoothies.', 'unit', 7000),
('CURUBA', 'Curuba', 'Pulpa tropical de curuba (banano de monte), agridulce.', 'unit', 6500),
('TOMATEARBOL', 'Tomate de Árbol', 'Pulpa concentrada de tomate de árbol.', 'unit', 7000),
('FREIJOA', 'Freijoa', 'Pulpa de Freijoa', 'unit', 8500),
('PINA', 'Piña', 'Pulpa de piña golden, dulce y refrescante.', 'unit', 6000);

INSERT INTO customers (company_name, contact_name, phone, email, delivery_address, is_active)
VALUES
    ('Apex Logistics Solutions', 'Sarah Jenkins', '+1 (555) 019-2834', 's.jenkins@apexlogistics.com', '1048 Industrial Pkwy, Suite 200, Austin, TX 78758', TRUE),
    ('GreenValley Organics', 'Carlos Mendez', '+1 (555) 014-9821', 'cmendez@greenvalley.org', '452 Farmstead Rd, Building B, Fresno, CA 93706', TRUE),
    ('BlueWave Tech Labs', 'Elena Rostova', '+1 (555) 018-4412', 'elena@bluewavetech.io', '720 Market St, Floor 8, San Francisco, CA 94102', TRUE),
    ('Summit Retail Group', 'Marcus Vance', '+1 (555) 012-3390', 'm.vance@summitretail.com', '3100 Commerce Blvd, Dock 4, Chicago, IL 60607', FALSE),
    ('Horizon Medical Supplies', 'Dr. Aris Thorne', '+1 (555) 017-8854', 'athorne@horizonmed.com', '881 Healthcare Way, Receiving Bay 1, Atlanta, GA 30309', TRUE);