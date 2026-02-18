#!/bin/bash
set -e

APP_NAME="office-inventory"
APP_PORT=5004
DOMAIN="app.cleanexinc.com"
DB_NAME="office_inventory"
DB_PASSWORD="change_me"

echo "========================================="
echo "  Deploying: $APP_NAME"
echo "  Domain:    $DOMAIN"
echo "  Port:      $APP_PORT"
echo "========================================="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

mkdir -p /var/www/$APP_NAME

rm -rf /var/www/$APP_NAME/dist
cp -r "$SCRIPT_DIR/dist" /var/www/$APP_NAME/
cp "$SCRIPT_DIR/ecosystem.config.cjs" /var/www/$APP_NAME/
cp "$SCRIPT_DIR/nginx-site.conf" /var/www/$APP_NAME/
cp "$SCRIPT_DIR/migration-export.sql" /var/www/$APP_NAME/

if [ ! -f /var/www/$APP_NAME/.env ]; then
  cp "$SCRIPT_DIR/.env.example" /var/www/$APP_NAME/.env
  sed -i "s|change_me|$DB_PASSWORD|g" /var/www/$APP_NAME/.env
  echo ">>> .env created. Edit /var/www/$APP_NAME/.env if needed."
fi

sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database already exists."
sudo -u postgres psql -c "ALTER USER postgres PASSWORD '$DB_PASSWORD';"

sudo -u postgres psql -d $DB_NAME -f /var/www/$APP_NAME/migration-export.sql

cp /var/www/$APP_NAME/nginx-site.conf /etc/nginx/sites-available/$APP_NAME
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/

echo "Testing Nginx configuration..."
nginx -t && systemctl reload nginx

pm2 stop $APP_NAME 2>/dev/null || true
pm2 delete $APP_NAME 2>/dev/null || true

cd /var/www/$APP_NAME
pm2 start ecosystem.config.cjs
pm2 save

echo ""
echo "========================================="
echo "  Deployment complete!"
echo "========================================="
echo ""
echo "  App running at: http://$DOMAIN"
echo ""
echo "  Next steps:"
echo "  1. Edit DB_PASSWORD in this script (and re-run) or edit /var/www/$APP_NAME/.env"
echo "  2. Setup SSL: certbot --nginx -d $DOMAIN"
echo ""
echo "  Useful commands:"
echo "  - pm2 logs $APP_NAME"
echo "  - pm2 restart $APP_NAME"
echo "  - pm2 status"
echo ""
