const { Pool } = require('pg');
// require('dotenv').config(); // In case we want to use .env locally outside Docker later

const isProduction = process.env.NODE_ENV === 'production';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set.');
  // process.exit(1); // Optionally exit if DB URL is critical and not set
}

const pool = new Pool({
  connectionString: connectionString,
  // SSL configuration for production (if needed, e.g., connecting to an external DB)
  // ssl: isProduction ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => {
  console.log('Connected to the PostgreSQL database!');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool, // Exporting the pool itself if direct access is needed
};
