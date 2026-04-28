#!/bin/bash
set -e

VPS_HOST="root@187.77.21.175"
VPS_PASS="Booknex1213##"
VPS_DIR="/var/www/office-inventory"

echo "Building frontend..."
npm run build

echo "Building server bundle (no vite bundled)..."
npx esbuild server/index.ts \
  --platform=node \
  --bundle \
  --format=esm \
  --outfile=dist/index.vps.js \
  --external:vite \
  --external:"../vite.config" \
  --external:"@vitejs/plugin-react" \
  --external:lightningcss \
  --external:fsevents \
  --external:"@babel/preset-typescript" \
  --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);"

echo "Deploying server bundle..."
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no dist/index.vps.js $VPS_HOST:$VPS_DIR/dist/index.js

echo "Deploying frontend assets..."
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no $VPS_HOST "rm -rf $VPS_DIR/dist/public && mkdir -p $VPS_DIR/dist/public"
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -r dist/public/. $VPS_HOST:$VPS_DIR/dist/public/

echo "Restarting pm2..."
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no $VPS_HOST "pm2 restart office-inventory"

echo "Waiting for server to start..."
sleep 8

echo "Verifying..."
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no $VPS_HOST \
  "curl -s http://localhost:5004/api/dashboard-apps | python3 -c \"import sys,json; d=json.load(sys.stdin); print('OK -', len(d), 'apps running')\""

echo "Deploy complete!"
