#!/bin/bash
set -e
cd /var/www/office-inventory
git pull origin main
if [ ! -f dist/index.js ]; then
  echo "Error: dist/index.js not found. Make sure the build was committed."
  exit 1
fi
pm2 restart office-inventory
echo "Deployed!"
