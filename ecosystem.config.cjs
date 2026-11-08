module.exports = {
  apps: [
    {
      name: 'mssn-ict-quiz',
      script: 'server/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '350M',
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
