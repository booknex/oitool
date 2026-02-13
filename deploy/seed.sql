CREATE TABLE IF NOT EXISTS inventory_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  max_stock INTEGER NOT NULL DEFAULT 10,
  visible BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO inventory_items (name, description, category, stock, max_stock, visible) VALUES
  ('All-Purpose Cleaner', 'Multi-surface cleaning spray for counters, sinks, and appliances', 'Sprays', 8, 10, true),
  ('Glass Cleaner', 'Streak-free window and mirror cleaning solution', 'Sprays', 6, 10, true),
  ('Disinfectant Spray', 'Hospital-grade disinfectant for bathrooms and high-touch areas', 'Sprays', 5, 10, true),
  ('Microfiber Cloths', 'Reusable lint-free cloths for dusting and polishing', 'Cloths & Wipes', 12, 20, true),
  ('Sponges', 'Heavy-duty scrub sponges for kitchen and bathroom cleaning', 'Cloths & Wipes', 10, 15, true),
  ('Trash Bags', 'Large 13-gallon drawstring trash bags', 'Supplies', 20, 30, true),
  ('Toilet Bowl Cleaner', 'Deep cleaning gel for toilet bowls and rims', 'Bathroom', 4, 10, true),
  ('Floor Cleaner', 'Concentrated multi-floor mopping solution', 'Floors', 3, 8, true),
  ('Dusting Spray', 'Furniture polish and dusting spray', 'Sprays', 7, 10, true),
  ('Rubber Gloves', 'Disposable nitrile gloves for hygiene protection', 'Supplies', 15, 25, true),
  ('Mop Heads', 'Replacement mop heads for wet mopping', 'Floors', 2, 6, true),
  ('Vacuum Bags', 'Replacement bags for commercial vacuum cleaners', 'Supplies', 5, 10, true)
ON CONFLICT DO NOTHING;
