require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración de la base de datos
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Función para ejecutar consultas SQL
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

// Función para obtener las migraciones ya ejecutadas
const getExecutedMigrations = async () => {
  try {
    const result = await query('SELECT name FROM migrations');
    return new Set(result.rows.map(row => row.name));
  } catch (error) {
    // Si la tabla de migraciones no existe, la creamos
    if (error.code === '42P01') { // undefined_table
      await query(`
        CREATE TABLE migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      return new Set();
    }
    throw error;
  }
};

// Función para registrar una migración como ejecutada
const markMigrationAsExecuted = async (migrationName) => {
  await query('INSERT INTO migrations (name) VALUES ($1)', [migrationName]);
};

// Función para ejecutar las migraciones
const runMigrations = async () => {
  try {
    // Verificar la conexión a la base de datos
    await query('SELECT NOW()');
    console.log('Conexión a la base de datos exitosa');
    
    // Obtener migraciones ya ejecutadas
    const executedMigrations = await getExecutedMigrations();
    console.log(`Migraciones ejecutadas: ${executedMigrations.size}`);
    
    // Leer archivos de migración
    const migrationsDir = path.join(__dirname, '../migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('No se encontró el directorio de migraciones');
      return;
    }
    
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ordenar alfabéticamente para ejecutar en orden
    
    console.log(`Encontradas ${migrationFiles.length} migraciones pendientes`);
    
    let executedCount = 0;
    
    // Ejecutar cada migración pendiente
    for (const file of migrationFiles) {
      if (!executedMigrations.has(file)) {
        console.log(`\nEjecutando migración: ${file}`);
        
        const migrationPath = path.join(migrationsDir, file);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Iniciar transacción
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          
          // Ejecutar el script SQL
          await client.query(migrationSQL);
          
          // Registrar la migración como ejecutada
          await client.query(
            'INSERT INTO migrations (name) VALUES ($1)',
            [file]
          );
          
          await client.query('COMMIT');
          console.log(`✓ Migración completada: ${file}`);
          executedCount++;
        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`✗ Error en la migración ${file}:`, error.message);
          throw error;
        } finally {
          client.release();
        }
      } else {
        console.log(`- Migración ya ejecutada: ${file}`);
      }
    }
    
    if (executedCount === 0) {
      console.log('\nNo hay migraciones pendientes por ejecutar');
    } else {
      console.log(`\nSe ejecutaron ${executedCount} migraciones exitosamente`);
    }
    
  } catch (error) {
    console.error('Error al ejecutar migraciones:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

// Ejecutar migraciones
runMigrations();
