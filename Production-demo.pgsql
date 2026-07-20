
-- Stock actual
SELECT 
    p.name,
    SUM(quantity) AS current_stock
FROM inventory_movements iv JOIN products p on p.id = iv.product_id 
GROUP BY product_id,name
ORDER BY product_id;


--- Termina jornada laboral
INSERT INTO production_batches (employee_name) VALUES ('Juan');

select * from production_batches
select * from production_batch_items
select * from products

INSERT INTO production_batch_items (batch_id, product_id, quantity_produced, expiration_date) 
VALUES 
(34, 12, 50, '2027-06-08'), 
(34, 9, 150, '2027-06-08'), 
(34, 6, 250, '2027-06-08');

-- So we update the stock 
INSERT INTO inventory_movements (product_id, quantity, type, reference_id)
VALUES (12, 50, 'production', 34),
(9, 150, 'production', 34),
(6, 250, 'production', 34);


--perdidas

INSERT INTO inventory_movements (product_id, quantity, type, reference_id)
VALUES (12, 50, 'production', 34)

INSERT INTO inventory_movements (product_id, quantity, type, reference_id)
VALUES (6, -5, 'spoilage', null);




select * from production_batches pb join production_batch_items pbi on pb.id = pbi.batch_id