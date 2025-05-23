const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// Función para eliminar la imagen anterior si existe
const deleteOldImage = (imagePath) => {
  try {
    if (imagePath && !imagePath.startsWith('http')) {
      const fullPath = path.join(__dirname, '..', imagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`Imagen eliminada: ${fullPath}`);
      }
    }
  } catch (err) {
    console.error('Error al eliminar la imagen anterior:', err);
  }
};

// POST /api/users - Crear un nuevo usuario
// Protegida por authMiddleware y solo accesible por Director o Superadministrador
router.post('/', authMiddleware, authorizeRoles('Director', 'Superadministrador'), async (req, res) => {
  console.log('POST /api/users - Request body:', req.body); 
  console.log('Usuario autenticado que realiza la acción:', req.user); 
  const { nombre, email, password, rol, institucion_id } = req.body;

  if (!nombre || !email || !password || !rol) {
    return res.status(400).json({ error: 'Nombre, email, password y rol son requeridos.' });
  }

  const rolesPermitidos = ['Director', 'Docente', 'Secretaria', 'Superadministrador'];
  if (!rolesPermitidos.includes(rol)) {
    return res.status(400).json({ error: `Rol inválido. Roles permitidos: ${rolesPermitidos.join(', ')}` });
  }

  try {
    const userExists = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ error: 'El email ya está registrado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUserQuery = `
      INSERT INTO usuarios (nombre, email, password_hash, rol, institucion_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, nombre, email, rol, institucion_id, fecha_creacion;
    `;
    const values = [nombre, email, password_hash, rol, institucion_id || null];
    
    const result = await db.query(newUserQuery, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear usuario:', err.stack);
    res.status(500).json({ error: 'Error interno del servidor al crear usuario', details: err.message });
  }
});

// GET /api/users - Obtener todos los usuarios 
// Protegida por authMiddleware, accesible por cualquier rol autenticado (ajustar si es necesario)
router.get('/', authMiddleware, async (req, res) => {
  try {
    console.log('GET /api/users - Solicitado por:', req.user);
    const result = await db.query('SELECT id, nombre, email, rol, institucion_id, fecha_creacion FROM usuarios ORDER BY fecha_creacion DESC;');
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener usuarios:', err.stack);
    res.status(500).json({ error: 'Error interno del servidor al obtener usuarios', details: err.message });
  }
});

// GET /api/users/me - Obtener información del usuario actual
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json(req.user);
  } catch (err) {
    console.error('Error al obtener información del usuario:', err.stack);
    res.status(500).json({ error: 'Error al obtener información del usuario' });
  }
});

// PUT /api/users/me - Actualizar perfil del usuario actual
router.put('/me', authMiddleware, upload.single('foto_perfil'), async (req, res) => {
  const { nombre, email, removeImage } = req.body;
  const userId = req.user.id;
  
  try {
    // Verificar si el email ya está en uso por otro usuario
    if (email) {
      const emailCheck = await db.query(
        'SELECT id FROM usuarios WHERE email = $1 AND id != $2', 
        [email, userId]
      );
      
      if (emailCheck.rows.length > 0) {
        // Si hay un archivo subido, eliminarlo ya que hubo un error
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ error: 'El correo electrónico ya está en uso' });
      }
    }

    // Preparar los campos a actualizar
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (nombre) {
      updates.push(`nombre = $${paramIndex++}`);
      values.push(nombre.trim());
    }
    
    if (email) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email.trim().toLowerCase());
    }

    // Manejar la imagen de perfil
    if (req.file) {
      // Eliminar la imagen anterior si existe
      if (req.user.foto_perfil_url) {
        deleteOldImage(req.user.foto_perfil_url);
      }
      
      // Guardar la ruta de la nueva imagen
      const fotoPerfilUrl = `/uploads/${req.file.filename}`;
      updates.push(`foto_perfil_url = $${paramIndex++}`);
      values.push(fotoPerfilUrl);
    } else if (removeImage === 'true' && req.user.foto_perfil_url) {
      // Si se solicitó eliminar la imagen y existe una actual
      deleteOldImage(req.user.foto_perfil_url);
      updates.push(`foto_perfil_url = $${paramIndex++}`);
      values.push(null);
    }

    // Si no hay nada que actualizar, devolver error
    if (updates.length === 0) {
      // Si se subió un archivo pero no hay otros cambios, eliminarlo
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'No se proporcionaron datos para actualizar' });
    }

    // Agregar ID del usuario al final de los valores
    values.push(userId);
    
    // Construir y ejecutar la consulta
    const query = `
      UPDATE usuarios 
      SET ${updates.join(', ')}, fecha_actualizacion = CURRENT_TIMESTAMP 
      WHERE id = $${paramIndex}
      RETURNING id, nombre, email, rol, foto_perfil_url, institucion_id, fecha_creacion, fecha_actualizacion;
    `;
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      // Si se subió un archivo pero el usuario no existe, eliminarlo
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Obtener la información completa del usuario actualizada
    const userResult = await db.query(
      'SELECT id, nombre, email, rol, foto_perfil_url, institucion_id, fecha_creacion FROM usuarios WHERE id = $1', 
      [userId]
    );
    
    res.json(userResult.rows[0]);
  } catch (err) {
    console.error('Error al actualizar perfil:', err.stack);
    
    // Si hay un error y se subió un archivo, eliminarlo
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        console.error('Error al eliminar archivo temporal:', unlinkErr);
      }
    }
    
    let errorMessage = 'Error al actualizar el perfil';
    let statusCode = 500;
    
    // Manejar errores específicos
    if (err.code === '23505') { // Violación de restricción única
      errorMessage = 'El correo electrónico ya está en uso';
      statusCode = 400;
    } else if (err.message.includes('invalid input syntax for type uuid')) {
      errorMessage = 'ID de usuario no válido';
      statusCode = 400;
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      // Solo incluir detalles del error en desarrollo
      details: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
});

// GET /api/users/:id - Obtener un usuario específico
router.get('/:id', authMiddleware, async (req, res) => { // Protegida, accesible por usuarios autenticados
  const { id } = req.params;
  try {
    const result = await db.query('SELECT id, nombre, email, rol, institucion_id, fecha_creacion, fecha_actualizacion FROM usuarios WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error al obtener usuario ${id}:`, err.stack);
    res.status(500).json({ error: 'Error interno del servidor al obtener usuario', details: err.message });
  }
});

// PUT /api/users/:id - Actualizar un usuario
router.put('/:id', authMiddleware, authorizeRoles('Director', 'Superadministrador'), async (req, res) => {
  const { id } = req.params;
  const { nombre, email, rol, institucion_id } = req.body; // No permitir actualizar password aquí directamente por simplicidad, requeriría un endpoint separado o manejo especial

  if (!nombre || !email || !rol) {
    return res.status(400).json({ error: 'Nombre, email y rol son requeridos.' });
  }
  const rolesPermitidos = ['Director', 'Docente', 'Secretaria', 'Superadministrador'];
  if (!rolesPermitidos.includes(rol)) {
    return res.status(400).json({ error: `Rol inválido. Roles permitidos: ${rolesPermitidos.join(', ')}` });
  }

  try {
    const emailExists = await db.query('SELECT id FROM usuarios WHERE email = $1 AND id != $2', [email, id]);
    if (emailExists.rows.length > 0) {
      return res.status(409).json({ error: 'El nuevo email ya está registrado por otro usuario.' });
    }

    const updateUserQuery = `
      UPDATE usuarios 
      SET nombre = $1, email = $2, rol = $3, institucion_id = $4, fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING id, nombre, email, rol, institucion_id, fecha_creacion, fecha_actualizacion;
    `;
    const currentUserInstitucionId = req.user.institucion_id; 
    let determinedInstitucionId = institucion_id !== undefined ? institucion_id : currentUserInstitucionId;

    if (determinedInstitucionId === '' || determinedInstitucionId === undefined || determinedInstitucionId === null) {
      determinedInstitucionId = null; 
    } else {
      const parsedId = parseInt(determinedInstitucionId, 10);
      if (isNaN(parsedId)) {
        // Si después de parsear no es un número (ej. era una cadena no numérica), o si el original era 0 y se quiere tratar como null.
        // Si se espera que 0 sea un ID válido, esta lógica podría necesitar ajuste.
        // Por ahora, si no es un entero válido, se setea a null.
        determinedInstitucionId = null; 
      } else {
        determinedInstitucionId = parsedId;
      }
    }

    const values = [nombre, email, rol, determinedInstitucionId, id];
    const result = await db.query(updateUserQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado para actualizar.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error al actualizar usuario ${id}:`, err.stack);
    res.status(500).json({ error: 'Error interno del servidor al actualizar usuario', details: err.message });
  }
});

// DELETE /api/users/:id - Eliminar un usuario
router.delete('/:id', authMiddleware, authorizeRoles('Superadministrador'), async (req, res) => { 
  const { id } = req.params;

  if (req.user.id === parseInt(id) && req.user.rol === 'Superadministrador') {
    const superAdminCountResult = await db.query("SELECT COUNT(*) FROM usuarios WHERE rol = 'Superadministrador'");
    if (parseInt(superAdminCountResult.rows[0].count) <= 1) {
      return res.status(403).json({ error: 'No se puede eliminar al único Superadministrador.' });
    }
  }
  
  try {
    const deleteUserQuery = 'DELETE FROM usuarios WHERE id = $1 RETURNING id, nombre;';
    const result = await db.query(deleteUserQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado para eliminar.' });
    }
    res.json({ message: `Usuario '${result.rows[0].nombre}' (ID: ${result.rows[0].id}) eliminado con éxito.` });
  } catch (err) {
    console.error(`Error al eliminar usuario ${id}:`, err.stack);
    res.status(500).json({ error: 'Error interno del servidor al eliminar usuario', details: err.message });
  }
});

module.exports = router;
