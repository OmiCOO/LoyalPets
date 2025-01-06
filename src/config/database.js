const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Remove SSL configuration for local development
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;
