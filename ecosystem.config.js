module.exports = {
    apps: [{
        name: 'warung-mang-ujang',
        script: 'index.js',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'production',
            PORT: process.env.PORT || 80,
            BOT_TOKEN: process.env.BOT_TOKEN,
            ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
            SESSION_SECRET: process.env.SESSION_SECRET,
            AUTO_BACKUP_ENABLED: process.env.AUTO_BACKUP_ENABLED || 'true',
            BACKUP_INTERVAL_HOURS: process.env.BACKUP_INTERVAL_HOURS || '24',
            S3_BACKUP_BUCKET: process.env.S3_BACKUP_BUCKET
        },
        error_file: './logs/pm2-error.log',
        out_file: './logs/pm2-out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true,
        time: true
    }]
};

