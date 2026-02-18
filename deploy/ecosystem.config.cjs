const fs = require('fs');
const path = require('path');

const envFile = path.resolve(__dirname, '.env');
const env = {};
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...rest] = line.split('=');
      env[key.trim()] = rest.join('=').trim();
    }
  });
}

module.exports = {
  apps: [
    {
      name: "office-inventory",
      script: "dist/index.cjs",
      cwd: "/var/www/office-inventory",
      env: {
        NODE_ENV: "production",
        PORT: env.PORT || "5004",
        DATABASE_URL: env.DATABASE_URL,
        SESSION_SECRET: env.SESSION_SECRET,
      },
      watch: false,
      instances: 1,
      autorestart: true,
      max_memory_restart: "256M",
    },
  ],
};
