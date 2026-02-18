module.exports = {
  apps: [
    {
      name: "office-inventory",
      script: "dist/index.js",
      cwd: "/var/www/office-inventory",
      env: {
        NODE_ENV: "production",
        PORT: "5004",
      },
      watch: false,
      instances: 1,
      autorestart: true,
      max_memory_restart: "256M",
    },
  ],
};
