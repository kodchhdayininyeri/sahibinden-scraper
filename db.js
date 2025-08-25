const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection pool - supports both local and production
const pool = new Pool(
    process.env.DATABASE_URL ? {
        // Production (Render) - uses DATABASE_URL
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    } : {
        // Local development
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'sahibinden_cars',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'your_password',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    }
);

// Test database connection
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
    process.exit(-1);
});

module.exports = pool;