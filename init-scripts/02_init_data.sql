-- Insert products (no price column)
INSERT INTO products (sku, name, description, unit) VALUES
('MANGO', 'Pulpa de Mango', 'Pulpa natural de mango criollo, sin conservantes.', 'lb'),
('GUAYABA', 'Pulpa de Guayaba', 'Pulpa de guayaba fresca, ideal para jugos y postres.', 'lb'),
('MARACUYA', 'Pulpa de Maracuyá', 'Pulpa ácida y aromática de maracuyá, perfecta para bebidas.', 'lb'),
('LULO', 'Pulpa de Lulo', 'Pulpa de lulo andino, sabor cítrico y refrescante.', 'lb'),
('MORA', 'Pulpa de Mora', 'Pulpa de mora de Castilla, rica en antioxidantes.', 'lb'),
('FRESA', 'Pulpa de Fresa', 'Pulpa de fresa dulce, sin azúcar añadida.', 'lb'),
('GUANABANA', 'Pulpa de Guanábana', 'Pulpa cremosa de guanábana, ideal para smoothies.', 'lb'),
('BANANO', 'Pulpa de Banano', 'Pulpa de banano dominico, espesa y natural.', 'lb'),
('CURUBA', 'Pulpa de Curuba', 'Pulpa tropical de curuba (banano de monte), agridulce.', 'lb'),
('NARANJA', 'Pulpa de Naranja', 'Pulpa concentrada de naranja valenciana.', 'lb'),
('TOMATEARBOL', 'Pulpa de Tomate de Árbol', 'Pulpa concentrada de tomate de árbol.', 'lb'),
('FREIJOA', 'Pulpa de Freijoa', 'Pulpa de Freijoa', 'lb'),
('PINA', 'Pulpa de Piña', 'Pulpa de piña golden, dulce y refrescante.', 'lb');

INSERT INTO customers (company_name, contact_name, phone, email, delivery_address, is_active)
VALUES
    ('Apex Logistics Solutions', 'Sarah Jenkins', '+1 (555) 019-2834', 's.jenkins@apexlogistics.com', '1048 Industrial Pkwy, Suite 200, Austin, TX 78758', TRUE),
    ('GreenValley Organics', 'Carlos Mendez', '+1 (555) 014-9821', 'cmendez@greenvalley.org', '452 Farmstead Rd, Building B, Fresno, CA 93706', TRUE),
    ('BlueWave Tech Labs', 'Elena Rostova', '+1 (555) 018-4412', 'elena@bluewavetech.io', '720 Market St, Floor 8, San Francisco, CA 94102', TRUE),
    ('Summit Retail Group', 'Marcus Vance', '+1 (555) 012-3390', 'm.vance@summitretail.com', '3100 Commerce Blvd, Dock 4, Chicago, IL 60607', FALSE),
    ('Horizon Medical Supplies', 'Dr. Aris Thorne', '+1 (555) 017-8854', 'athorne@horizonmed.com', '881 Healthcare Way, Receiving Bay 1, Atlanta, GA 30309', TRUE);