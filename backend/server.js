const express = require('express');
const path = require('path');
const db = require('./config/db'); // Importar la configuración de la BD
const app = express();
const port = process.env.PORT || 3001;

// Crear directorio de uploads si no existe
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Servir archivos estáticos desde la carpeta uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware to parse JSON and urlencoded bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Basic route
app.get('/', (req, res) => {
  res.send('CCJAP Backend API is running!');
});

// Test DB connection route
app.get('/db-test', async (req, res) => {
  try {
    const client = await db.pool.connect();
    const result = await client.query('SELECT NOW()');
    res.json({ message: 'Database connection successful!', time: result.rows[0].now });
    client.release();
  } catch (err) {
    console.error('Error connecting to database or querying', err.stack);
    res.status(500).json({ error: 'Database connection failed', details: err.message });
  }
});

// Route to initialize database (create users table)
app.get('/init-db', async (req, res) => {
  const dropTablesQuery = `
    DROP TABLE IF EXISTS ausencias CASCADE;
    DROP TABLE IF EXISTS mensajes_whatsapp CASCADE;
    DROP TABLE IF EXISTS alumnos CASCADE;
    DROP TABLE IF EXISTS usuarios CASCADE;
    DROP TABLE IF EXISTS instituciones CASCADE;
    DROP TABLE IF EXISTS waapi_config CASCADE;
  `;
  const createUserTableQuery = `
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      rol VARCHAR(50) NOT NULL CHECK (rol IN ('Director', 'Docente', 'Secretaria', 'Superadministrador')),
      institucion_id INTEGER REFERENCES instituciones(id) ON DELETE SET NULL,
      fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  const createInstitucionesTableQuery = `
    CREATE TABLE IF NOT EXISTS instituciones (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      logo_url VARCHAR(2048),
      fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  const createAlumnosTableQuery = `
    CREATE TABLE IF NOT EXISTS alumnos (
      id SERIAL PRIMARY KEY,
      nombre_completo VARCHAR(255) NOT NULL,
      fecha_nacimiento DATE,
      genero VARCHAR(50),
      direccion TEXT,
      nombre_responsable_principal VARCHAR(255),
      telefono_responsable_principal VARCHAR(25),
      email_responsable_principal VARCHAR(100),
      grado_actual VARCHAR(100), -- Considerar normalizar a tabla grados
      seccion VARCHAR(50),
      fecha_ingreso DATE DEFAULT CURRENT_DATE,
      estado VARCHAR(50) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo', 'Retirado', 'Graduado')),
      institucion_id INTEGER NOT NULL,
      fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_institucion_alumno FOREIGN KEY (institucion_id) REFERENCES instituciones(id) ON DELETE CASCADE
    );
  `;
  const createWaApiConfigTableQuery = `
    CREATE TABLE IF NOT EXISTS waapi_config (
      institucion_id INTEGER PRIMARY KEY REFERENCES instituciones(id) ON DELETE CASCADE,
      api_key VARCHAR(255) NOT NULL,
      phone_number VARCHAR(255) NOT NULL
    );
  `;
  const createMensajesWhatsappTableQuery = `
    CREATE TABLE IF NOT EXISTS mensajes_whatsapp (
      id SERIAL PRIMARY KEY,
      telefono_remitente VARCHAR(25) NOT NULL,
      texto_mensaje TEXT NOT NULL,
      fecha_recepcion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      procesado BOOLEAN DEFAULT FALSE,
      tipo_mensaje VARCHAR(50), -- 'ausencia', 'consulta', 'otro'
      institucion_id INTEGER REFERENCES instituciones(id) ON DELETE CASCADE
    );
  `;
  const createAusenciasTableQuery = `
    CREATE TABLE IF NOT EXISTS ausencias (
      id SERIAL PRIMARY KEY,
      alumno_id INTEGER REFERENCES alumnos(id) ON DELETE CASCADE,
      fecha_ausencia DATE NOT NULL DEFAULT CURRENT_DATE,
      motivo TEXT,
      justificado BOOLEAN DEFAULT FALSE,
      notificado_docente BOOLEAN DEFAULT FALSE,
      confirmado_recibido BOOLEAN DEFAULT FALSE,
      mensaje_id INTEGER REFERENCES mensajes_whatsapp(id) ON DELETE SET NULL,
      fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    console.log('Ejecutando DROP TABLES...');
    await db.query(dropTablesQuery);
    console.log('Comandos DROP ejecutados.');

    console.log('Creando tabla instituciones...');
    await db.query(createInstitucionesTableQuery);
    console.log('Tabla instituciones creada.');

    console.log('Creando tabla usuarios...');
    await db.query(createUserTableQuery); 
    console.log('Tabla usuarios creada (con FK a instituciones).');

    console.log('Creando tabla alumnos...');
    await db.query(createAlumnosTableQuery);
    console.log('Tabla alumnos creada.');

    console.log('Creando tabla waapi_config...');
    await db.query(createWaApiConfigTableQuery);
    console.log('Tabla waapi_config creada.');

    // Añadir la columna maestro_id a la tabla alumnos si no existe
    console.log('Añadiendo campo maestro_id a la tabla alumnos...');
    await db.query('ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS maestro_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL');
    console.log('Campo maestro_id añadido a tabla alumnos.');

    console.log('Creando tabla mensajes_whatsapp...');
    await db.query(createMensajesWhatsappTableQuery);
    console.log('Tabla mensajes_whatsapp creada.');

    console.log('Creando tabla ausencias...');
    await db.query(createAusenciasTableQuery);
    console.log('Tabla ausencias creada.');

    res.json({ message: 'Base de datos reinicializada con éxito (tablas instituciones, usuarios, waapi_config, mensajes_whatsapp y ausencias creadas).' });
  } catch (err) {
    console.error('Error detallado inicializando base de datos:', err); // Log completo del error
    res.status(500).json({ error: 'Database initialization failed', details: err.message });
  }
});

// Rutas de API
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const setupRoutes = require('./routes/setup');
app.use('/api/setup', setupRoutes);

const alumnosRoutes = require('./routes/alumnos');
app.use('/api/alumnos', alumnosRoutes);

const waapiRoutes = require('./routes/waapi');
app.use('/api/waapi', waapiRoutes);

const webhookRoutes = require('./routes/webhook');
app.use('/api/webhook', webhookRoutes);

// TODO: Add more routes for different entities

// Start the server

// Crear un super administrador por defecto si no existe
const createDefaultSuperAdmin = async () => {
  try {
    // Asegurarse que bcrypt está disponible
    const bcrypt = require('bcryptjs');
    const superAdminResult = await db.query("SELECT 1 FROM usuarios WHERE rol = 'Superadministrador' LIMIT 1;");
    if (superAdminResult.rows.length === 0) {
      console.log('No se encontró un super administrador. Creando uno por defecto...');
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash('password', salt); // Considera usar una contraseña más segura o desde env vars
      const insertQuery = `
        INSERT INTO usuarios (nombre, email, password_hash, rol)
        VALUES ($1, $2, $3, $4)
      `;
      const values = ['Super Admin', 'superadmin@example.com', password_hash, 'Superadministrador'];
      await db.query(insertQuery, values);
      console.log('Super administrador por defecto creado con éxito.');
    } else {
      console.log('Super administrador ya existe. No es necesario crear uno nuevo.');
    }
  } catch (error) {
    console.error('Error al crear el super administrador por defecto:', error);
  }
};

// IIFE para llamar a la función asíncrona de creación del super admin
(async () => {
  await createDefaultSuperAdmin();
})();

app.listen(port, async () => {
  console.log(`Backend server listening on port ${port}`);
  // Probar la conexión a la base de datos al iniciar el servidor
  try {
    const client = await db.pool.connect();
    console.log('Successfully connected to the database on server startup.');
    const result = await client.query('SELECT NOW()');
    console.log('DB Test Query Result:', result.rows[0]);
    client.release();
  } catch (err) {
    console.error('Failed to connect to the database on server startup:', err.stack);
  }
  // La llamada a createDefaultSuperAdmin ya se hizo antes de app.listen
});
