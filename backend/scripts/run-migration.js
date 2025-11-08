require('dotenv/config');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'appointy',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, '..', 'prisma', 'migrations', 'add_summary_columns.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration...');
    await client.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('Created/Updated:');
    console.log('  - content_items table (added summary and meta_tags columns)');
    console.log('');
    console.log('Note: Embeddings are stored in Qdrant, not PostgreSQL');

    client.release();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
