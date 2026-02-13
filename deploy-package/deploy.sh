#!/bin/bash
set -e

APP_NAME="office-inventory"
APP_PORT=5004
DOMAIN="app.cleanexinc.com"

echo "========================================="
echo "  Deploying: $APP_NAME"
echo "  Domain:    $DOMAIN"
echo "  Port:      $APP_PORT"
echo "========================================="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Create directory
mkdir -p /var/www/$APP_NAME

# Copy files to app directory
cp -r "$SCRIPT_DIR/dist" /var/www/$APP_NAME/
cp "$SCRIPT_DIR/ecosystem.config.cjs" /var/www/$APP_NAME/
cp "$SCRIPT_DIR/nginx-site.conf" /var/www/$APP_NAME/

# Create .env if it doesn't exist
if [ ! -f /var/www/$APP_NAME/.env ]; then
    cp "$SCRIPT_DIR/.env.example" /var/www/$APP_NAME/.env
    echo ""
    echo ">>> .env file created from .env.example"
    echo ">>> IMPORTANT: Edit /var/www/$APP_NAME/.env and set your SESSION_SECRET"
    echo ""
fi

# Create package.json for ESM support and install dependencies
cd /var/www/$APP_NAME
cat > package.json << 'EOF'
{
  "name": "office-inventory",
  "version": "1.0.0",
  "type": "module",
  "private": true
}
EOF

echo "Installing dependencies..."
npm install express@4 nanoid zod 2>&1 | tail -1

# Setup Nginx
cp /var/www/$APP_NAME/nginx-site.conf /etc/nginx/sites-available/$APP_NAME
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/

echo "Testing Nginx configuration..."
nginx -t
if [ $? -eq 0 ]; then
    systemctl reload nginx
    echo "Nginx reloaded successfully."
else
    echo "Nginx config test failed! Please check the configuration."
    exit 1
fi

# Stop existing PM2 process if running
pm2 stop $APP_NAME 2>/dev/null || true
pm2 delete $APP_NAME 2>/dev/null || true

# Start with PM2
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
echo "  1. Edit /var/www/$APP_NAME/.env (set SESSION_SECRET)"
echo "  2. Run: pm2 restart $APP_NAME"
echo "  3. Setup SSL: certbot --nginx -d $DOMAIN"
echo ""
echo "  Useful commands:"
echo "  - pm2 logs $APP_NAME     (view logs)"
echo "  - pm2 restart $APP_NAME  (restart app)"
echo "  - pm2 status             (check status)"
echo ""
