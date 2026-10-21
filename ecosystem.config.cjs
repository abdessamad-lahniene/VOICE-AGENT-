module.exports = {
  apps: [
    {
      name: 'voice-agent',
      script: 'dist/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
