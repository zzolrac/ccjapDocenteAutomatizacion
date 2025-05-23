const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

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
