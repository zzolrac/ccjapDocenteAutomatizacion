const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');

// GET /api/setup/status - Verificar si el setup inicial está completo
router.get('/status', async (req, res) => {
  try {
    // El setup se considera completo si existe al menos una institución Y un superadministrador.
    const institucionResult = await db.query("SELECT 1 FROM instituciones LIMIT 1;");
    const superAdminResult = await db.query("SELECT 1 FROM usuarios WHERE rol = 'Superadministrador' LIMIT 1;");

    const isSetupComplete = institucionResult.rows.length > 0 && superAdminResult.rows.length > 0;
    
    res.json({ isSetupComplete });
  } catch (err) {
    console.error('Error al verificar estado del setup:', err.stack);
    res.status(500).json({ error: 'Error interno del servidor al verificar estado del setup', details: err.message });
  }
});


// POST /api/setup/complete-setup - Realizar la configuración inicial completa
router.post('/complete-setup', async (req, res) => {
  const { 
    nombre_institucion, 
    logo_url, // opcional
    admin_nombre, 
    admin_email, 
    admin_password 
  } = req.body;

  if (!nombre_institucion || !admin_nombre || !admin_email || !admin_password) {
    return res.status(400).json({ error: 'Nombre de institución, y nombre, email y contraseña del administrador son requeridos.' });
  }

  const client = await db.pool.connect(); // Usar cliente para transacciones

  try {
    await client.query('BEGIN'); // Iniciar transacción

    // Verificar si el setup ya se realizó (existencia de institución o superadmin)
    const institucionResult = await client.query("SELECT 1 FROM instituciones LIMIT 1;");
    const superAdminResult = await client.query("SELECT 1 FROM usuarios WHERE rol = 'Superadministrador' LIMIT 1;");

    if (institucionResult.rows.length > 0 || superAdminResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'El sistema ya ha sido configurado. No se puede ejecutar el setup nuevamente.' });
    }

    // Crear tablas si no existen
    console.log('Creando tablas de base de datos si no existen...');
    await client.query(`
      -- Tabla para la institución
      CREATE TABLE IF NOT EXISTS instituciones (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(255) NOT NULL,
          logo_url VARCHAR(255),
          fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabla para los usuarios (Directores, Maestros, Superadministrador)
      CREATE TABLE IF NOT EXISTS usuarios (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          rol VARCHAR(50) NOT NULL CHECK (rol IN ('Superadministrador', 'Director', 'Maestro', 'Padre')), -- Roles definidos
          institucion_id INTEGER REFERENCES instituciones(id) ON DELETE CASCADE, -- Cada usuario pertenece a una institución
          fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabla para los alumnos
      CREATE TABLE IF NOT EXISTS alumnos (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(255) NOT NULL,
          apellido VARCHAR(255) NOT NULL,
          fecha_nacimiento DATE,
          codigo_alumno VARCHAR(100) UNIQUE, -- Código interno del alumno si existe
          grado VARCHAR(50),
          seccion VARCHAR(50),
          institucion_id INTEGER REFERENCES instituciones(id) ON DELETE CASCADE,
          maestro_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, -- Maestro tutor o principal
          fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabla para registrar ausencias
      CREATE TABLE IF NOT EXISTS ausencias (
          id SERIAL PRIMARY KEY,
          alumno_id INTEGER REFERENCES alumnos(id) ON DELETE CASCADE,
          fecha DATE NOT NULL,
          motivo TEXT,
          reportado_por_usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, -- Quién reportó (Director/Maestro)
          notificado_a_usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, -- A quién se notificó (Maestro)
          fecha_reporte TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          estado VARCHAR(50) DEFAULT 'Reportada' CHECK (estado IN ('Reportada', 'Confirmada', 'Justificada')), -- Estado de la ausencia
          UNIQUE (alumno_id, fecha) -- Un alumno solo puede tener una ausencia por día
      );

      -- Tabla para registrar tareas (simplificado por ahora)
      CREATE TABLE IF NOT EXISTS tareas (
          id SERIAL PRIMARY KEY,
          titulo VARCHAR(255) NOT NULL,
          descripcion TEXT,
          fecha_asignacion DATE DEFAULT CURRENT_DATE,
          fecha_entrega DATE,
          maestro_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
          institucion_id INTEGER REFERENCES instituciones(id) ON DELETE CASCADE,
          fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabla para registrar mensajes de WhatsApp (para el flujo de automatización)
      CREATE TABLE IF NOT EXISTS mensajes_wa (
          id SERIAL PRIMARY KEY,
          wa_message_id VARCHAR(255) UNIQUE, -- ID del mensaje en WhatsApp si está disponible
          direccion VARCHAR(10) NOT NULL CHECK (direccion IN ('entrada', 'salida')), -- 'entrada' o 'salida'
          remitente VARCHAR(255) NOT NULL, -- Número de teléfono o identificador
          destinatario VARCHAR(255) NOT NULL, -- Número de teléfono o identificador
          contenido TEXT NOT NULL,
          fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          tipo_mensaje VARCHAR(50), -- e.g., 'text', 'image', 'absence_report', 'task_query'
          estado VARCHAR(50) DEFAULT 'Recibido' CHECK (estado IN ('Recibido', 'Procesando', 'Procesado', 'Error', 'Enviado', 'Entregado', 'Leido')),
          referencia_mensaje_id INTEGER REFERENCES mensajes_wa(id) ON DELETE SET NULL, -- Para enlazar respuestas o confirmaciones
          alumno_id INTEGER REFERENCES alumnos(id) ON DELETE SET NULL, -- Si el mensaje está relacionado con un alumno específico
          usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, -- Si el mensaje está relacionado con un usuario específico (maestro/director)
          institucion_id INTEGER REFERENCES instituciones(id) ON DELETE CASCADE
      );
    `);
    console.log('Tablas creadas o ya existentes.');

    // Verificar si el email del admin ya está en uso
    const emailExists = await client.query('SELECT 1 FROM usuarios WHERE email = $1', [admin_email]);
    if (emailExists.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'El email proporcionado para el administrador ya está registrado.' });
    }

    // 1. Crear la institución
    const institucionQuery = `
      INSERT INTO instituciones (nombre, logo_url) 
      VALUES ($1, $2) RETURNING id;
    `;
    const institucionValues = [nombre_institucion, logo_url || null];
    const nuevaInstitucion = await client.query(institucionQuery, institucionValues);
    const institucionId = nuevaInstitucion.rows[0].id;

    // 2. Crear el Superadministrador
    const adminRol = 'Superadministrador';
    const salt = await bcrypt.genSalt(10);
    const admin_password_hash = await bcrypt.hash(admin_password, salt);

    const adminQuery = `
      INSERT INTO usuarios (nombre, email, password_hash, rol, institucion_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, nombre, email, rol, institucion_id, fecha_creacion;
    `;
    const adminValues = [admin_nombre, admin_email, admin_password_hash, adminRol, institucionId];
    const nuevoAdmin = await client.query(adminQuery, adminValues);

    await client.query('COMMIT'); // Confirmar transacción

    console.log('Setup inicial completado. Institución creada ID:', institucionId, 'Superadministrador creado:', nuevoAdmin.rows[0]);
    res.status(201).json({
      message: 'Configuración inicial completada con éxito.',
      institucion: { id: institucionId, nombre: nombre_institucion, logo_url },
      superadmin: nuevoAdmin.rows[0]
    });

  } catch (err) {
    await client.query('ROLLBACK'); // Revertir transacción en caso de error
    console.error('Error durante el setup inicial:', err.stack);
    res.status(500).json({ error: 'Error interno del servidor durante el setup inicial', details: err.message });
  } finally {
    client.release();
  }
});


// Ruta temporal para generar hash de contraseña (mantener para debugging si es útil)
router.get('/hash-password/:password', async (req, res) => {
  try {
    const { password } = req.params;
    if (!password) {
      return res.status(400).send('Por favor, provea una contraseña en la URL.');
    }
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    res.send(`Password: ${password}<br>Hash: ${password_hash}`);
  } catch (err) {
    console.error('Error generando hash:', err);
    res.status(500).send('Error generando hash.');
  }
});

module.exports = router;
