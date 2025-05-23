const express = require('express');
const router = express.Router();
const db = require('../config/db');
const path = require('path');
const fs = require('fs');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// POST /api/alumnos - Crear un nuevo alumno
// Accesible por Director, Secretaria, Superadministrador
router.post('/', authMiddleware, authorizeRoles('Director', 'Secretaria', 'Colegiatura', 'Docente', 'Superadministrador'), upload, async (req, res) => {
  // Verificar si el usuario tiene los permisos necesarios
  if (req.user.rol !== 'Superadministrador' && !req.user.institucion_id) {
    // Si hay un archivo subido pero hubo un error de permisos, eliminarlo
    if (req.file) {
      fs.unlink(path.join(__dirname, '..', 'uploads', req.file.filename), (err) => {
        if (err) console.error('Error al eliminar archivo temporal:', err);
      });
    }
    return res.status(403).json({ error: 'No tiene permiso para crear alumnos en esta institución' });
  }

  try {
    // Validar datos de entrada
    const { nombre_completo, grado_actual, seccion } = req.body;
    
    if (!nombre_completo || !grado_actual || !seccion) {
      // Si hay un archivo subido pero falla la validación, eliminarlo
      if (req.file) {
        fs.unlink(path.join(__dirname, '..', 'uploads', req.file.filename), (err) => {
          if (err) console.error('Error al eliminar archivo temporal:', err);
        });
      }
      return res.status(400).json({ error: 'Nombre completo, grado actual y sección son campos requeridos' });
    }

    // Crear el alumno en la base de datos
    const query = `
      INSERT INTO alumnos (
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
        institucion_id,
        foto_perfil_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
      RETURNING *
    `;

    const values = [
      req.body.nombre_completo,
      req.body.fecha_nacimiento || null,
      req.body.genero || null,
      req.body.direccion || null,
      req.body.nombre_responsable_principal || null,
      req.body.telefono_responsable_principal || null,
      req.body.email_responsable_principal || null,
      req.body.grado_actual,
      req.body.seccion,
      req.body.fecha_ingreso || new Date().toISOString().split('T')[0],
      req.body.estado || 'Activo',
      req.user.institucion_id || req.body.institucion_id || null,
      req.body.foto_perfil_url || null
    ];

    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      // Si hay un archivo subido pero falla la creación, eliminarlo
      if (req.file) {
        fs.unlink(path.join(__dirname, '..', 'uploads', req.file.filename), (err) => {
          if (err) console.error('Error al eliminar archivo temporal:', err);
        });
      }
      throw new Error('No se pudo crear el alumno');
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear alumno:', error);
    // Si hay un archivo subido pero ocurre un error, eliminarlo
    if (req.file) {
      fs.unlink(path.join(__dirname, '..', 'uploads', req.file.filename), (err) => {
        if (err) console.error('Error al eliminar archivo temporal:', err);
      });
    }
    res.status(500).json({ error: 'Error interno del servidor al crear el alumno' });
  }
});

// GET /api/alumnos - Obtener todos los alumnos (filtrado por institución y rol de usuario)
// Accesible por Director, Docente, Secretaria, Superadministrador
router.get('/', authMiddleware, authorizeRoles('Director', 'Docente', 'Secretaria', 'Superadministrador'), async (req, res) => {
  console.log('GET /api/alumnos - Solicitado por:', req.user);
  const userRol = req.user.rol;
  const userId = req.user.id;
  const userInstitucionId = req.user.institucion_id;

  try {
    let query = '';
    let values = [];
    let result;

    if (userRol === 'Superadministrador') {
      // Superadmin ve todos los alumnos
      query = 'SELECT * FROM alumnos ORDER BY nombre_completo ASC';
      result = await db.query(query);
    } else if (userRol === 'Docente') {
      // Docente solo ve los alumnos que tiene asignados
      query = `
        SELECT DISTINCT a.* 
        FROM alumnos a
        INNER JOIN asignaciones_docentes ad ON a.id = ad.alumno_id
        WHERE ad.docente_id = $1
        ORDER BY a.nombre_completo ASC
      `;
      values = [userId];
      result = await db.query(query, values);
    } else if (['Director', 'Secretaria'].includes(userRol)) {
      // Director y Secretaria ven todos los alumnos de su institución
      query = 'SELECT * FROM alumnos WHERE institucion_id = $1 ORDER BY nombre_completo ASC';
      values = [userInstitucionId];
      result = await db.query(query, values);
    }

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
    institucion_id, // Permitir cambiar solo si es Superadmin o si es la misma institución
    maestro_id // Nuevo: ID del maestro asignado
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

      // Validar maestro_id si se proporciona
      if (maestro_id !== undefined && maestro_id !== null && maestro_id !== '') {
          const parsedMaestroId = parseInt(maestro_id, 10);
          if (isNaN(parsedMaestroId)) {
              return res.status(400).json({ error: 'ID de maestro proporcionado no es válido.' });
          }
          const maestroResult = await db.query('SELECT rol, institucion_id FROM usuarios WHERE id = $1', [parsedMaestroId]);
          if (maestroResult.rows.length === 0) {
              return res.status(400).json({ error: 'El ID de maestro proporcionado no existe.' });
          }
          const maestro = maestroResult.rows[0];
          if (maestro.rol !== 'Maestro') {
              return res.status(400).json({ error: 'El usuario con el ID proporcionado no tiene el rol de Maestro.' });
          }
           // Si no es Superadmin, el maestro debe ser de la misma institución
          if (req.user.rol !== 'Superadministrador' && maestro.institucion_id !== institucion_id) { // Comparar con la institución del alumno
               return res.status(403).json({ error: 'No tiene permiso para asignar un maestro de otra institución a este alumno.' });
          }
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
          maestro_id = $13, -- Incluir maestro_id
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id = $14
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
        maestro_id || null, // Incluir maestro_id
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

  // Eliminar un alumno
  try {
    // Verificar si el alumno existe y pertenece a la misma institución que el usuario
    const checkQuery = 'SELECT * FROM alumnos WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }
    
    const alumno = checkResult.rows[0];
    
    // Verificar permisos (solo Superadmin puede eliminar entre instituciones)
    if (req.user.rol !== 'Superadministrador' && 
        alumno.institucion_id !== req.user.institucion_id) {
      return res.status(403).json({ error: 'No tiene permiso para eliminar este alumno' });
    }

    // Eliminar la imagen de perfil si existe
    if (alumno.foto_perfil_url) {
      const imagePath = path.join(__dirname, '..', alumno.foto_perfil_url);
      fs.unlink(imagePath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error('Error al eliminar la imagen de perfil:', err);
        }
      });
    }

    // Eliminar el alumno
    const deleteQuery = 'DELETE FROM alumnos WHERE id = $1 RETURNING *';
    const result = await db.query(deleteQuery, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('No se pudo eliminar el alumno');
    }

    res.json({ message: 'Alumno eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar alumno:', error);
    
    // Verificar si es un error de restricción de clave foránea
    if (error.code === '23503') { // Código para violación de restricción de clave foránea
      return res.status(400).json({ 
        error: 'No se puede eliminar el alumno porque tiene registros asociados (asignaciones, calificaciones, etc.)' 
      });
    }
    
    res.status(500).json({ error: 'Error interno del servidor al eliminar el alumno' });
  }
});

module.exports = router;
