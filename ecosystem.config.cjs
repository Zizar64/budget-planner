module.exports = {
    apps: [{
        name: 'budget-planner',
        script: 'server/index.js',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'production',
            PORT: 3000,
            // DB_PATH: '/var/lib/budget-planner/budget.db' // Optional: Configure custom DB path
        }
    }]
};
