module.exports = {
  apps: [{
    name: 'fiv-backend',
    script: 'dist/index.js',
    cwd: '/srv/apps/Fi.VApp-Replit',
    env: {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://fivuser:FiVApp@localhost:5432/fivapp',
      EVOLUTION_API_URL: 'http://45.143.7.93:8080',
      EVOLUTION_API_KEY: 'b0ce23f3-d380-47e9-a33b-978ce2758f4c',
      PORT: 3000
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};