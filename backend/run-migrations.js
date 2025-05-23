const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Leer archivos de migración
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ordenar alfabéticamente para ejecutar en orden
    
    console.log(`Encontradas ${migrationFiles.length} migraciones`);
    
    // Crear tabla de control de migraciones si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Obtener migraciones ya ejecutadas
    const executedMigrations = await client.query('SELECT name FROM migrations');
    const executedMigrationNames = executedMigrations.rows.map(row => row.name);
    
    // Ejecutar migraciones pendientes
    for (const file of migrationFiles) {
      if (!executedMigrationNames.includes(file)) {
        console.log(`Ejecutando migración: ${file}`);
        const migrationSql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await client.query(migrationSql);
        
        // Registrar migración ejecutada
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        console.log(`Migración ${file} completada`);
      } else {
        console.log(`Migración ${file} ya ejecutada, omitiendo`);
      }
    }
    
    await client.query('COMMIT');
    console.log('Todas las migraciones se han ejecutado correctamente');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error ejecutando migraciones:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
