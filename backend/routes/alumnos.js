const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

// POST /api/alumnos - Crear un nuevo alumno
// Accesible por Director, Secretaria, Superadministrador
router.post('/', authMiddleware, authorizeRoles('Director', 'Secretaria', 'Superadministrador'), async (req, res) => {
  console.log('POST /api/alumnos - Request body:', req.body);
  console.log('Usuario autenticado que realiza la acción:', req.user);
  const {
    nombre_completo,
    fecha_nacimiento,
    genero,
    direccion,
    nombre_responsable_principal,
    telefono_responsable_principal,
    email_responsable_principal,
    grado_actual,
    seccion,
    fecha_ingreso, // Opcional, por defecto CURRENT_DATE en BD
    estado, // Opcional, por defecto 'Activo' en BD
    institucion_id // Debe venir del usuario autenticado o ser manejado por el backend
  } = req.body;

  // Validaciones básicas
  if (!nombre_completo || !grado_actual || !seccion || !institucion_id) {
     return res.status(400).json({ error: 'Nombre completo, grado, sección e ID de institución son requeridos.' });
  }
  // Validar que el usuario que crea tenga permiso para crear en esta institucion_id
  if (req.user.rol !== 'Superadministrador' && req.user.institucion_id !== institucion_id) {
      return res.status(403).json({ error: 'No tiene permiso para crear alumnos en esta institución.' });
  }


  try {
    const newAlumnoQuery = `
      INSERT INTO alumnos (
        nombre_completo, fecha_nacimiento, genero, direccion,
        nombre_responsable_principal, telefono_responsable_principal, email_responsable_principal,
        grado_actual, seccion, fecha_ingreso, estado, institucion_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;
    const values = [
      nombre_completo,
      fecha_nacimiento || null,
      genero || null,
      direccion || null,
      nombre_responsable_principal || null,
      telefono_responsable_principal || null,
      email_responsable_principal || null,
      grado_actual,
      seccion,
      fecha_ingreso || null,
      estado || 'Activo',
      institucion_id
    ];

    const result = await db.query(newAlumnoQuery, values);
    console.log('Nuevo alumno creado:', result.rows[0]);
    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error('Error al crear alumno:', err.stack);
    res.status(500).json({ error: 'Error interno del servidor al crear alumno', details: err.message });
  }
});

// GET /api/alumnos - Obtener todos los alumnos (filtrado por institución si no es Superadmin)
// Accesible por Director, Docente, Secretaria, Superadministrador
router.get('/', authMiddleware, authorizeRoles('Director', 'Docente', 'Secretaria', 'Superadministrador'), async (req, res) => {
  console.log('GET /api/alumnos - Solicitado por:', req.user);
  const userRol = req.user.rol;
  const userInstitucionId = req.user.institucion_id;

  let query = 'SELECT * FROM alumnos';
  const values = [];

  // Si no es Superadministrador, filtrar por su institución
  if (userRol !== 'Superadministrador') {
    query += ' WHERE institucion_id = $1';
    values.push(userInstitucionId);
  }

  query += ' ORDER BY nombre_completo ASC;';

  try {
    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener alumnos:', err.stack);
    res.status(500).json({ error: 'Error interno del servidor al obtener alumnos', details: err.message });
  }
});

// GET /api/alumnos/:id - Obtener un alumno específico
// Accesible por Director, Docente, Secretaria, Superadministrador (con filtro de institución si no es Superadmin)
router.get('/:id', authMiddleware, authorizeRoles('Director', 'Docente', 'Secretaria', 'Superadministrador'), async (req, res) => {
  const { id } = req.params;
  const userRol = req.user.rol;
  const userInstitucionId = req.user.institucion_id;

  let query = 'SELECT * FROM alumnos WHERE id = $1';
  const values = [id];

  // Si no es Superadministrador, añadir filtro por su institución
  if (userRol !== 'Superadministrador') {
    query += ' AND institucion_id = $2';
    values.push(userInstitucionId);
  }

  try {
    const result = await db.query(query, values);
    if (result.rows.length === 0) {
      // Si no se encuentra, puede ser 404 (no existe) o 403 (no tiene permiso para verlo)
      // Por seguridad, devolvemos 404 para no revelar la existencia de IDs fuera de su institución
      return res.status(404).json({ error: 'Alumno no encontrado.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error al obtener alumno ${id}:`, err.stack);
    res.status(500).json({ error: 'Error interno del servidor al obtener alumno', details: err.message });
  }
});

// PUT /api/alumnos/:id - Actualizar un alumno
// Accesible por Director, Secretaria, Superadministrador (con filtro de institución si no es Superadmin)
router.put('/:id', authMiddleware, authorizeRoles('Director', 'Secretaria', 'Superadministrador'), async (req, res) => {
  const { id } = req.params;
  const {
    nombre_completo,
    fecha_nacimiento,
    genero,
    direccion,
    nombre_responsable_principal,
    telefono_responsable_principal,
    email_responsable_principal,
    grado_actual,
    seccion,
    fecha_ingreso,
    estado,
    institucion_id // Permitir cambiar solo si es Superadmin o si es la misma institución
  } = req.body;

  // Validaciones básicas
  if (!nombre_completo || !grado_actual || !seccion) {
     return res.status(400).json({ error: 'Nombre completo, grado y sección son requeridos.' });
  }
  const estadosPermitidos = ['Activo', 'Inactivo', 'Retirado', 'Graduado'];
  if (estado && !estadosPermitidos.includes(estado)) {
      return res.status(400).json({ error: `Estado inválido. Estados permitidos: ${estadosPermitidos.join(', ')}` });
  }

  const userRol = req.user.rol;
  const userInstitucionId = req.user.institucion_id;

  // Verificar si el usuario tiene permiso para actualizar este alumno (de su institución o es Superadmin)
  // Primero, obtener el alumno para verificar su institucion_id
  try {
      const alumnoResult = await db.query('SELECT institucion_id FROM alumnos WHERE id = $1', [id]);
      if (alumnoResult.rows.length === 0) {
          return res.status(404).json({ error: 'Alumno no encontrado para actualizar.' });
      }
      const alumnoInstitucionId = alumnoResult.rows[0].institucion_id;

      if (userRol !== 'Superadministrador' && userInstitucionId !== alumnoInstitucionId) {
          return res.status(403).json({ error: 'No tiene permiso para actualizar este alumno.' });
      }

      // Determinar el institucion_id a guardar
      let targetInstitucionId = alumnoInstitucionId; // Por defecto, mantener el del alumno
      if (userRol === 'Superadministrador' && institucion_id !== undefined) {
          // Si es Superadmin, puede cambiar la institución si se provee un nuevo institucion_id
          targetInstitucionId = institucion_id === '' || institucion_id === null ? null : parseInt(institucion_id, 10);
          if (isNaN(targetInstitucionId) && institucion_id !== null && institucion_id !== '') {
               return res.status(400).json({ error: 'ID de institución proporcionado no es válido.' });
          }
      } else if (userRol !== 'Superadministrador' && institucion_id !== undefined && institucion_id !== alumnoInstitucionId) {
          // Si no es Superadmin, no puede cambiar la institución a una diferente a la del alumno
           return res.status(403).json({ error: 'No tiene permiso para cambiar la institución de este alumno.' });
      }


      const updateAlumnoQuery = `
        UPDATE alumnos
        SET
          nombre_completo = $1,
          fecha_nacimiento = $2,
          genero = $3,
          direccion = $4,
          nombre_responsable_principal = $5,
          telefono_responsable_principal = $6,
          email_responsable_principal = $7,
          grado_actual = $8,
          seccion = $9,
          fecha_ingreso = $10,
          estado = $11,
          institucion_id = $12,
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id = $13
        RETURNING *;
      `;
      const values = [
        nombre_completo,
        fecha_nacimiento || null,
        genero || null,
        direccion || null,
        nombre_responsable_principal || null,
        telefono_responsable_principal || null,
        email_responsable_principal || null,
        grado_actual,
        seccion,
        fecha_ingreso || null,
        estado || 'Activo',
        targetInstitucionId, // Usar el ID determinado
        id
      ];

      const result = await db.query(updateAlumnoQuery, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Alumno no encontrado para actualizar (después de verificación de permisos).' });
      }
      res.json(result.rows[0]);

  } catch (err) {
    console.error(`Error al actualizar alumno ${id}:`, err.stack);
    res.status(500).json({ error: 'Error interno del servidor al actualizar alumno', details: err.message });
  }
});

// DELETE /api/alumnos/:id - Eliminar un alumno
// Accesible por Director, Secretaria, Superadministrador (con filtro de institución si no es Superadmin)
router.delete('/:id', authMiddleware, authorizeRoles('Director', 'Secretaria', 'Superadministrador'), async (req, res) => {
  const { id } = req.params;
  const userRol = req.user.rol;
  const userInstitucionId = req.user.institucion_id;

  // Verificar si el usuario tiene permiso para eliminar este alumno (de su institución o es Superadmin)
  try {
      const alumnoResult = await db.query('SELECT institucion_id FROM alumnos WHERE id = $1', [id]);
      if (alumnoResult.rows.length === 0) {
          return res.status(404).json({ error: 'Alumno no encontrado para eliminar.' });
      }
      const alumnoInstitucionId = alumnoResult.rows[0].institucion_id;

      if (userRol !== 'Superadministrador' && userInstitucionId !== alumnoInstitucionId) {
          return res.status(403).json({ error: 'No tiene permiso para eliminar este alumno.' });
      }

      const deleteAlumnoQuery = 'DELETE FROM alumnos WHERE id = $1 RETURNING id, nombre_completo;';
      const result = await db.query(deleteAlumnoQuery, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Alumno no encontrado para eliminar (después de verificación de permisos).' });
      }
      res.json({ message: `Alumno '${result.rows[0].nombre_completo}' (ID: ${result.rows[0].id}) eliminado con éxito.` });

  } catch (err) {
    console.error(`Error al eliminar alumno ${id}:`, err.stack);
    res.status(500).json({ error: 'Error interno del servidor al eliminar alumno', details: err.message });
  }
});


module.exports = router;
