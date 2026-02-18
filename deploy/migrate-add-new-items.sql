-- Migration: Add unique constraint and 27 new inventory items
-- Run this on your existing VPS database to add the new items
-- Safe to run multiple times - will skip items that already exist by name

-- Add unique constraint on name (safe if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_items_name_unique'
  ) THEN
    ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_name_unique UNIQUE (name);
  END IF;
END $$;

-- Add item_type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'item_type'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN item_type TEXT NOT NULL DEFAULT 'consumable';
  END IF;
END $$;

INSERT INTO inventory_items (name, description, category, stock, max_stock, visible, cost, item_type)
SELECT * FROM (VALUES
  ('Water Bottles', 'Bottled water for cleaning staff', 'Supplies', 10, 10, true, 0.50::numeric(10,2), 'consumable'),
  ('Wash Cloths', 'Reusable wash cloths for cleaning', 'Cloths & Wipes', 10, 10, true, 1.00::numeric(10,2), 'cleaning'),
  ('Paper Towels', 'Disposable paper towels', 'Supplies', 10, 10, true, 2.00::numeric(10,2), 'consumable'),
  ('Salt', 'Salt shaker refill', 'Supplies', 10, 10, true, 1.00::numeric(10,2), 'consumable'),
  ('Pepper', 'Pepper shaker refill', 'Supplies', 10, 10, true, 1.00::numeric(10,2), 'consumable'),
  ('Diffuser Oil', 'Essential oil for diffusers', 'Supplies', 10, 10, true, 5.00::numeric(10,2), 'consumable'),
  ('Bleach', 'Bleach cleaning solution', 'Bathroom', 10, 10, true, 3.00::numeric(10,2), 'consumable'),
  ('Dish Soap Re-fill', 'Large refill bottle for dish soap', 'Supplies', 10, 10, true, 4.00::numeric(10,2), 'consumable'),
  ('Mini Dish Soap', 'Small travel-size dish soap', 'Supplies', 10, 10, true, 1.50::numeric(10,2), 'consumable'),
  ('Broom', 'Standard cleaning broom', 'Floors', 5, 5, true, 8.00::numeric(10,2), 'cleaning'),
  ('Mop', 'Floor mop for cleaning', 'Floors', 5, 5, true, 10.00::numeric(10,2), 'cleaning'),
  ('Dust Pan', 'Dust pan for sweeping', 'Floors', 5, 5, true, 3.00::numeric(10,2), 'cleaning'),
  ('Mop Bucket', 'Bucket for mopping', 'Floors', 3, 3, true, 12.00::numeric(10,2), 'cleaning'),
  ('Glass Cook Top', 'Glass cooktop cleaner', 'Sprays', 10, 10, true, 5.00::numeric(10,2), 'consumable'),
  ('Scorch Pad', 'Scouring pad for tough stains', 'Cloths & Wipes', 10, 10, true, 1.50::numeric(10,2), 'consumable'),
  ('Hand Soap Refill', 'Large refill bottle for hand soap', 'Bathroom', 10, 10, true, 3.50::numeric(10,2), 'consumable'),
  ('Coffee Packs', 'Single serve coffee packs', 'Supplies', 10, 10, true, 6.00::numeric(10,2), 'consumable'),
  ('Bathroom Trash Bags', 'Small trash bags for bathroom bins', 'Supplies', 10, 10, true, 2.00::numeric(10,2), 'consumable'),
  ('Scrub Brushes', 'Cleaning scrub brushes', 'Cloths & Wipes', 10, 10, true, 2.50::numeric(10,2), 'cleaning'),
  ('Masks', 'Disposable face masks', 'Supplies', 20, 20, true, 0.50::numeric(10,2), 'consumable'),
  ('Spray Bottle', 'Empty spray bottle with trigger', 'Supplies', 10, 10, true, 2.00::numeric(10,2), 'cleaning'),
  ('Shampoo', 'Shampoo for guest bathrooms', 'Bathroom', 10, 10, true, 4.00::numeric(10,2), 'consumable'),
  ('Body Soap', 'Liquid body wash', 'Bathroom', 10, 10, true, 4.00::numeric(10,2), 'consumable'),
  ('Body Bar Soap', 'Bar soap for bathrooms', 'Bathroom', 10, 10, true, 1.50::numeric(10,2), 'consumable'),
  ('Lotion', 'Body lotion for guest amenities', 'Bathroom', 10, 10, true, 3.50::numeric(10,2), 'consumable'),
  ('Conditioner', 'Hair conditioner for guest bathrooms', 'Bathroom', 10, 10, true, 4.00::numeric(10,2), 'consumable'),
  ('Laundry Soap', 'Liquid laundry detergent', 'Supplies', 10, 10, true, 8.00::numeric(10,2), 'consumable')
) AS new_items(name, description, category, stock, max_stock, visible, cost, item_type)
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_items existing WHERE existing.name = new_items.name
);
