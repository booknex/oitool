-- Migration export for office-inventory
-- Run with: sudo -u postgres psql -d office_inventory -f migration-export.sql

CREATE TABLE IF NOT EXISTS inventory_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  max_stock INTEGER NOT NULL DEFAULT 10,
  visible BOOLEAN NOT NULL DEFAULT true,
  cost NUMERIC(10,2) NOT NULL DEFAULT '0',
  item_type TEXT NOT NULL DEFAULT 'consumable'
);

INSERT INTO inventory_items (id, name, description, category, stock, max_stock, visible, cost, item_type) VALUES
(1, 'All-Purpose Cleaner', 'Multi-surface cleaning spray for counters, sinks, and appliances', 'Sprays', 10, 10, true, 7.50, 'consumable'),
(2, 'Glass Cleaner', 'Streak-free window and mirror cleaning solution', 'Sprays', 10, 10, true, 4.49, 'consumable'),
(3, 'Disinfectant Spray', 'Hospital-grade disinfectant for bathrooms and high-touch areas', 'Sprays', 10, 10, true, 5.99, 'consumable'),
(4, 'Microfiber Cloths', 'Reusable lint-free cloths for dusting and polishing', 'Cloths & Wipes', 20, 20, true, 1.50, 'cleaning'),
(5, 'Sponges', 'Heavy-duty scrub sponges for kitchen and bathroom cleaning', 'Cloths & Wipes', 15, 15, true, 0.99, 'consumable'),
(6, 'Trash Bags', 'Large 13-gallon drawstring trash bags', 'Supplies', 30, 30, true, 0.25, 'consumable'),
(7, 'Toilet Bowl Cleaner', 'Deep cleaning gel for toilet bowls and rims', 'Bathroom', 10, 10, true, 3.49, 'consumable'),
(8, 'Floor Cleaner', 'Concentrated multi-floor mopping solution', 'Floors', 8, 8, true, 6.99, 'consumable'),
(9, 'Dusting Spray', 'Furniture polish and dusting spray', 'Sprays', 10, 10, true, 4.29, 'consumable'),
(10, 'Rubber Gloves', 'Disposable nitrile gloves for hygiene protection', 'Supplies', 25, 25, true, 0.50, 'cleaning'),
(11, 'Mop Heads', 'Replacement mop heads for wet mopping', 'Floors', 6, 6, true, 8.99, 'cleaning'),
(12, 'Vacuum Bags', 'Replacement bags for commercial vacuum cleaners', 'Supplies', 10, 10, true, 2.99, 'cleaning'),
(13, 'Water Bottles', 'Bottled water for cleaning staff', 'Supplies', 10, 10, true, 0.50, 'consumable'),
(14, 'Wash Cloths', 'Reusable wash cloths for cleaning', 'Cloths & Wipes', 10, 10, true, 1.00, 'cleaning'),
(15, 'Paper Towels', 'Disposable paper towels', 'Supplies', 10, 10, true, 2.00, 'consumable'),
(16, 'Salt', 'Salt shaker refill', 'Supplies', 10, 10, true, 1.00, 'consumable'),
(17, 'Pepper', 'Pepper shaker refill', 'Supplies', 10, 10, true, 1.00, 'consumable'),
(18, 'Diffuser Oil', 'Essential oil for diffusers', 'Supplies', 10, 10, true, 5.00, 'consumable'),
(19, 'Bleach', 'Bleach cleaning solution', 'Bathroom', 10, 10, true, 3.00, 'consumable'),
(20, 'Dish Soap Re-fill', 'Large refill bottle for dish soap', 'Supplies', 10, 10, true, 4.00, 'consumable'),
(21, 'Mini Dish Soap', 'Small travel-size dish soap', 'Supplies', 10, 10, true, 1.50, 'consumable'),
(22, 'Broom', 'Standard cleaning broom', 'Floors', 5, 5, true, 8.00, 'cleaning'),
(23, 'Mop', 'Floor mop for cleaning', 'Floors', 5, 5, true, 10.00, 'cleaning'),
(24, 'Dust Pan', 'Dust pan for sweeping', 'Floors', 5, 5, true, 3.00, 'cleaning'),
(25, 'Mop Bucket', 'Bucket for mopping', 'Floors', 3, 3, true, 12.00, 'cleaning'),
(26, 'Glass Cook Top', 'Glass cooktop cleaner', 'Sprays', 10, 10, true, 5.00, 'consumable'),
(27, 'Scorch Pad', 'Scouring pad for tough stains', 'Cloths & Wipes', 10, 10, true, 1.50, 'consumable'),
(28, 'Hand Soap Refill', 'Large refill bottle for hand soap', 'Bathroom', 10, 10, true, 3.50, 'consumable'),
(29, 'Coffee Packs', 'Single serve coffee packs', 'Supplies', 10, 10, true, 6.00, 'consumable'),
(30, 'Bathroom Trash Bags', 'Small trash bags for bathroom bins', 'Supplies', 10, 10, true, 2.00, 'consumable'),
(31, 'Scrub Brushes', 'Cleaning scrub brushes', 'Cloths & Wipes', 10, 10, true, 2.50, 'cleaning'),
(32, 'Masks', 'Disposable face masks', 'Supplies', 20, 20, true, 0.50, 'consumable'),
(33, 'Spray Bottle', 'Empty spray bottle with trigger', 'Supplies', 10, 10, true, 2.00, 'cleaning'),
(34, 'Shampoo', 'Shampoo for guest bathrooms', 'Bathroom', 10, 10, true, 4.00, 'consumable'),
(35, 'Body Soap', 'Liquid body wash', 'Bathroom', 10, 10, true, 4.00, 'consumable'),
(36, 'Body Bar Soap', 'Bar soap for bathrooms', 'Bathroom', 10, 10, true, 1.50, 'consumable'),
(37, 'Lotion', 'Body lotion for guest amenities', 'Bathroom', 10, 10, true, 3.50, 'consumable'),
(38, 'Conditioner', 'Hair conditioner for guest bathrooms', 'Bathroom', 10, 10, true, 4.00, 'consumable'),
(39, 'Laundry Soap', 'Liquid laundry detergent', 'Supplies', 10, 10, true, 8.00, 'consumable')
ON CONFLICT (name) DO NOTHING;

DO $$
BEGIN
  PERFORM setval('inventory_items_id_seq', COALESCE((SELECT MAX(id) FROM inventory_items), 1));
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;
