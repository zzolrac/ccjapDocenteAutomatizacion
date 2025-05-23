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

// Crear el directorio de subidas si no existe
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Directorio de subidas creado en: ${uploadsDir}`);
}

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

// Crear tablas si no existen
const createTables = async () => {
  console.log('Creando tablas...');
  
  // Tabla de instituciones
  await query(`
    CREATE TABLE IF NOT EXISTS instituciones (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      nombre VARCHAR(255) NOT NULL,
      direccion TEXT,
      telefono VARCHAR(20),
      email VARCHAR(255),
      logo_url VARCHAR(512),
      fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Tabla de usuarios
  await query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      nombre VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      rol VARCHAR(50) NOT NULL CHECK (rol IN ('Superadministrador', 'Director', 'Docente', 'Secretaria')),
      foto_perfil_url VARCHAR(512),
      institucion_id UUID REFERENCES instituciones(id) ON DELETE SET NULL,
      fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Tabla de alumnos
  await query(`
    CREATE TABLE IF NOT EXISTS alumnos (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      nombre VARCHAR(255) NOT NULL,
      apellido_paterno VARCHAR(255) NOT NULL,
      apellido_materno VARCHAR(255),
      fecha_nacimiento DATE,
      genero VARCHAR(20),
      curp VARCHAR(18) UNIQUE,
      matricula VARCHAR(50) UNIQUE,
      grado VARCHAR(50),
      grupo VARCHAR(10),
      nombre_tutor VARCHAR(255),
      telefono_tutor VARCHAR(20),
      email_tutor VARCHAR(255),
      direccion TEXT,
      foto_url VARCHAR(512),
      institucion_id UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
      creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
      fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Tabla de asignaciones de docentes a alumnos
  await query(`
    CREATE TABLE IF NOT EXISTS asignaciones_docentes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      docente_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      alumno_id UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
      asignatura VARCHAR(100),
      fecha_asignacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(docente_id, alumno_id, asignatura)
    );
  `);

  // Tabla de asistencias
  await query(`
    CREATE TABLE IF NOT EXISTS asistencias (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      alumno_id UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
      fecha DATE NOT NULL,
      estado VARCHAR(20) NOT NULL CHECK (estado IN ('presente', 'ausente', 'justificado', 'tardanza')),
      justificacion TEXT,
      registrado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
      fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(alumno_id, fecha)
    );
  `);

  // Tabla de notificaciones
  await query(`
    CREATE TABLE IF NOT EXISTS notificaciones (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tipo VARCHAR(50) NOT NULL,
      titulo VARCHAR(255) NOT NULL,
      mensaje TEXT NOT NULL,
      usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
      leida BOOLEAN DEFAULT FALSE,
      fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      fecha_lectura TIMESTAMP WITH TIME ZONE
    );
  `);

  // Tabla de migraciones
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Tablas creadas exitosamente');
};

// Crear usuario administrador inicial
const createAdminUser = async () => {
  try {
    // Verificar si ya existe un administrador
    const result = await query('SELECT id FROM usuarios WHERE email = $1', ['admin@ccjap.edu.mx']);
    
    if (result.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await query(
        'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ($1, $2, $3, $4)',
        ['Administrador', 'admin@ccjap.edu.mx', hashedPassword, 'Superadministrador']
      );
      
      console.log('Usuario administrador creado exitosamente');
      console.log('Email: admin@ccjap.edu.mx');
      console.log('Contraseña: admin123');
      console.log('\n¡IMPORTANTE! Cambia la contraseña después del primer inicio de sesión.');
    } else {
      console.log('El usuario administrador ya existe');
    }
  } catch (error) {
    console.error('Error al crear el usuario administrador:', error);
  }
};

// Función principal
const initDatabase = async () => {
  try {
    // Verificar la conexión a la base de datos
    await query('SELECT NOW()');
    console.log('Conexión a la base de datos exitosa');
    
    // Habilitar la extensión uuid-ossp si no está habilitada
    await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    // Crear tablas
    await createTables();
    
    // Crear usuario administrador
    await createAdminUser();
    
    console.log('\nBase de datos inicializada exitosamente');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
};

// Ejecutar la inicialización
initDatabase();
