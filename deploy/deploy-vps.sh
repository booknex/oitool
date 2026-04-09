#!/bin/bash
set -e

APP_DIR="/var/www/office-inventory"
REPO_DIR="$APP_DIR/repo"

echo "========================================"
echo "  Office Inventory - VPS Deploy Script"
echo "========================================"

if [ ! -f "$APP_DIR/.env" ]; then
  echo "ERROR: $APP_DIR/.env not found!"
  echo "Create it first with your production database credentials."
  exit 1
fi

source "$APP_DIR/.env"

echo ""
echo "[1/5] Installing dependencies..."
cd "$REPO_DIR"
npm install --production=false 2>&1 | tail -3

echo ""
echo "[2/5] Building frontend (Vite)..."
npx vite build 2>&1 | tail -3

echo ""
echo "[3/5] Building server bundle (esbuild)..."
npx esbuild server/prod.ts \
  --platform=node \
  --bundle \
  --format=cjs \
  --outfile="$APP_DIR/dist/index.cjs" \
  --external:pg-native \
  --define:process.env.NODE_ENV=\"production\" \
  --define:import.meta.dirname=__dirname 2>&1 | tail -3

echo ""
echo "[4/5] Copying frontend to dist/public..."
rm -rf "$APP_DIR/dist/public"
cp -r "$REPO_DIR/dist/public" "$APP_DIR/dist/public"

echo ""
echo "[5/5] Running database migrations..."
psql "$DATABASE_URL" -c "
DO \$\$
BEGIN
    -- Create inventory_items table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'inventory_items'
    ) THEN
        CREATE TABLE inventory_items (
            id          SERIAL PRIMARY KEY,
            name        TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            category    TEXT NOT NULL DEFAULT '',
            stock       INTEGER NOT NULL DEFAULT 0,
            max_stock   INTEGER NOT NULL DEFAULT 0,
            visible     BOOLEAN NOT NULL DEFAULT true,
            cost        NUMERIC(10,2) NOT NULL DEFAULT 0
        );
    END IF;

    -- Add low_stock_threshold to inventory_items if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'inventory_items' AND column_name = 'low_stock_threshold'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN low_stock_threshold integer;
    END IF;

    -- Add cost column to inventory_items if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'inventory_items' AND column_name = 'cost'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN cost NUMERIC(10,2) NOT NULL DEFAULT 0;
    END IF;

    -- Create dashboard_apps table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'dashboard_apps'
    ) THEN
        CREATE TABLE dashboard_apps (
            id          SERIAL PRIMARY KEY,
            name        TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            icon        TEXT NOT NULL DEFAULT 'Package',
            color       TEXT NOT NULL DEFAULT '#E8F4FD',
            icon_color  TEXT NOT NULL DEFAULT '#2196F3',
            route       TEXT NOT NULL,
            available   BOOLEAN NOT NULL DEFAULT false,
            sort_order  INTEGER NOT NULL DEFAULT 0
        );
    END IF;

    -- Create properties table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'properties'
    ) THEN
        CREATE TABLE properties (
            id          SERIAL PRIMARY KEY,
            name        TEXT NOT NULL,
            address     TEXT NOT NULL DEFAULT '',
            airbnb_url  TEXT NOT NULL DEFAULT '',
            color       TEXT NOT NULL DEFAULT '#E8F4FD',
            sort_order  INTEGER NOT NULL DEFAULT 0
        );
    END IF;

    -- Add image_url to properties if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'properties' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE properties ADD COLUMN image_url TEXT NOT NULL DEFAULT '';
    END IF;

    -- Add ical_url to properties if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'properties' AND column_name = 'ical_url'
    ) THEN
        ALTER TABLE properties ADD COLUMN ical_url TEXT NOT NULL DEFAULT '';
    END IF;

    -- Add last_synced to properties if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'properties' AND column_name = 'last_synced'
    ) THEN
        ALTER TABLE properties ADD COLUMN last_synced TIMESTAMPTZ;
    END IF;

    -- Create bookings table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'bookings'
    ) THEN
        CREATE TABLE bookings (
            id          SERIAL PRIMARY KEY,
            property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
            uid         TEXT NOT NULL,
            start_date  TIMESTAMPTZ NOT NULL,
            end_date    TIMESTAMPTZ NOT NULL,
            summary     TEXT NOT NULL DEFAULT '',
            synced_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT bookings_property_uid_uniq UNIQUE (property_id, uid)
        );
    END IF;

    -- Add unique constraint to existing bookings table if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'bookings' AND constraint_name = 'bookings_property_uid_uniq'
    ) THEN
        ALTER TABLE bookings ADD CONSTRAINT bookings_property_uid_uniq UNIQUE (property_id, uid);
    END IF;

    -- Create checkout_logs table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'checkout_logs'
    ) THEN
        CREATE TABLE checkout_logs (
            id          SERIAL PRIMARY KEY,
            item_id     INTEGER NOT NULL,
            item_name   TEXT NOT NULL,
            category    TEXT NOT NULL DEFAULT '',
            quantity    INTEGER NOT NULL,
            unit_cost   NUMERIC(10,2) NOT NULL DEFAULT 0,
            total_cost  NUMERIC(10,2) NOT NULL DEFAULT 0,
            checked_out_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    END IF;
END \$\$;
" 2>&1 | tail -3

echo ""
echo "Restarting PM2..."
pm2 delete office-inventory 2>/dev/null || true
cd "$APP_DIR" && pm2 start ecosystem.config.cjs
pm2 save --force

echo ""
echo "========================================"
echo "  Deploy complete!"
echo "  Check: pm2 logs office-inventory --lines 10"
echo "  Visit: https://app.cleanexinc.com"
echo "========================================"
