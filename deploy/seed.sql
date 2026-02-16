CREATE TABLE IF NOT EXISTS inventory_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  max_stock INTEGER NOT NULL DEFAULT 10,
  visible BOOLEAN NOT NULL DEFAULT true,
  cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
  item_type TEXT NOT NULL DEFAULT 'consumable'
);

INSERT INTO inventory_items (name, description, category, stock, max_stock, visible, cost, item_type) VALUES
  ('All-Purpose Cleaner', 'Multi-surface cleaning spray for counters, sinks, and appliances', 'Sprays', 8, 10, true, 3.99, 'consumable'),
  ('Glass Cleaner', 'Streak-free window and mirror cleaning solution', 'Sprays', 6, 10, true, 4.49, 'consumable'),
  ('Disinfectant Spray', 'Hospital-grade disinfectant for bathrooms and high-touch areas', 'Sprays', 5, 10, true, 5.99, 'consumable'),
  ('Microfiber Cloths', 'Reusable lint-free cloths for dusting and polishing', 'Cloths & Wipes', 12, 20, true, 1.50, 'cleaning'),
  ('Sponges', 'Heavy-duty scrub sponges for kitchen and bathroom cleaning', 'Cloths & Wipes', 10, 15, true, 0.99, 'consumable'),
  ('Trash Bags', 'Large 13-gallon drawstring trash bags', 'Supplies', 20, 30, true, 0.25, 'consumable'),
  ('Toilet Bowl Cleaner', 'Deep cleaning gel for toilet bowls and rims', 'Bathroom', 4, 10, true, 3.49, 'consumable'),
  ('Floor Cleaner', 'Concentrated multi-floor mopping solution', 'Floors', 3, 8, true, 6.99, 'consumable'),
  ('Dusting Spray', 'Furniture polish and dusting spray', 'Sprays', 7, 10, true, 4.29, 'consumable'),
  ('Rubber Gloves', 'Disposable nitrile gloves for hygiene protection', 'Supplies', 15, 25, true, 0.50, 'cleaning'),
  ('Mop Heads', 'Replacement mop heads for wet mopping', 'Floors', 2, 6, true, 8.99, 'cleaning'),
  ('Vacuum Bags', 'Replacement bags for commercial vacuum cleaners', 'Supplies', 5, 10, true, 2.99, 'cleaning')
ON CONFLICT DO NOTHING;
