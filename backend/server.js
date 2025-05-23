const express = require('express');
const db = require('./config/db'); // Importar la configuración de la BD
const app = express();
const port = process.env.PORT || 3001;

// Middleware to parse JSON bodies
app.use(express.json());

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
    DROP TABLE IF EXISTS alumnos CASCADE;
    DROP TABLE IF EXISTS usuarios CASCADE;
    DROP TABLE IF EXISTS instituciones CASCADE;
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

    res.json({ message: 'Base de datos reinicializada con éxito (tablas instituciones, usuarios, y waapi_config creadas).' });
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

// TODO: Add more routes for different entities (ausencias, etc.)

// Start the server

// Llamar a la función para crear el super administrador por defecto al iniciar el servidor
await createDefaultSuperAdmin();

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

  // Crear un super administrador por defecto si no existe
  const createDefaultSuperAdmin = async () => {
    try {
      const superAdminResult = await db.query("SELECT 1 FROM usuarios WHERE rol = 'Superadministrador' LIMIT 1;");
      if (superAdminResult.rows.length === 0) {
        console.log('No se encontró un super administrador. Creando uno por defecto...');
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash('password', salt);
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
  await createDefaultSuperAdmin();
});
