const express = require('express');
const router = express.Router();
const db = require('../config/db');
const axios = require('axios'); // Asegúrate de instalar axios: npm install axios
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

// Endpoint para recibir webhooks de WhatsApp (Sin autenticación porque será llamado por el servicio de WhatsApp)
router.post('/whatsapp', async (req, res) => {
  try {
    console.log('Webhook WhatsApp recibido:', req.body);
    
    // Estructura para WaAPI
    // {
    //   "event": "message",
    //   "data": {
    //     "id": "mensaje-id",
    //     "from": "telefono",
    //     "to": "tu-numero",
    //     "body": "mensaje",
    //     "fromMe": false,
    //     "timestamp": "timestamp-unix"
    //   }
    // }
    
    // Verificar si es el formato de WaAPI
    if (req.body.event === 'message' && req.body.data) {
      const { from, body, timestamp } = req.body.data;
      
      if (!from || !body) {
        return res.status(400).json({ error: 'Formato de webhook WaAPI inválido. Se requieren los campos from y body.' });
      }
      
      // Procesar el mensaje de WaAPI
      await procesarMensajeWebhook(from, body, timestamp ? new Date(timestamp * 1000) : new Date());
      
      // Responder inmediatamente a WaAPI
      return res.status(200).json({ success: true });
    }
    
    // Formato alternativo (para compatibilidad o pruebas)
    const { from, text, timestamp } = req.body;
    
    if (!from || !text) {
      return res.status(400).json({ error: 'Formato de webhook inválido. Se requieren los campos from y text.' });
    }
    
    // Procesar el mensaje usando el formato alternativo
    await procesarMensajeWebhook(from, text, timestamp ? new Date(timestamp) : new Date());
    
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error procesando webhook de WhatsApp:', err.stack);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// Función para procesar mensajes de webhook independientemente del formato
async function procesarMensajeWebhook(from, texto, timestamp) {
  try {
    // Normalizar número de teléfono (eliminar espacios, "+", etc.)
    const telefonoNormalizado = from.replace(/\D/g, '');
    
    // Guardar el mensaje recibido
    const insertMsgQuery = `
      INSERT INTO mensajes_whatsapp (telefono_remitente, texto_mensaje, fecha_recepcion)
      VALUES ($1, $2, $3)
      RETURNING id;
    `;
    const msgResult = await db.query(insertMsgQuery, [telefonoNormalizado, texto, timestamp || new Date()]);
    const mensajeId = msgResult.rows[0].id;
    
    // Procesar el mensaje
    const resultado = await procesarMensaje(telefonoNormalizado, texto, mensajeId);
    
    return {
      success: true,
      mensajeId: mensajeId,
      resultado: resultado
    };
  } catch (err) {
    console.error('Error procesando webhook de WhatsApp:', err.stack);
    throw err; // Re-lanzamos el error para manejarlo en la ruta
  }
}

// Función para procesar el contenido del mensaje
async function procesarMensaje(telefono, texto, mensajeId) {
  try {
    // Determinar tipo de mensaje usando palabras clave
    let tipoMensaje = 'otro';
    let resultadoProcesamiento = { procesado: false };
    
    const textoLowerCase = texto.toLowerCase();
    
    // Detectar si es un mensaje de ausencia
    if (textoLowerCase.includes('no podrá ir') || 
        textoLowerCase.includes('no podra ir') || 
        textoLowerCase.includes('no asistirá') || 
        textoLowerCase.includes('no asistira') ||
        textoLowerCase.includes('ausencia') || 
        textoLowerCase.includes('falta') || 
        textoLowerCase.includes('faltar') || 
        textoLowerCase.includes('enfermo') ||
        textoLowerCase.includes('enferma')) {
      
      tipoMensaje = 'ausencia';
      resultadoProcesamiento = await procesarAusencia(telefono, texto, mensajeId);
      
    } 
    // Detectar si es una consulta sobre tareas
    else if (textoLowerCase.includes('tarea') || 
             textoLowerCase.includes('deberes') || 
             textoLowerCase.includes('asignación') || 
             textoLowerCase.includes('asignacion')) {
      
      tipoMensaje = 'consulta';
      resultadoProcesamiento = await procesarConsulta(telefono, texto, mensajeId);
    }
    
    // Actualizar el tipo de mensaje en la base de datos
    await db.query(
      'UPDATE mensajes_whatsapp SET tipo_mensaje = $1, procesado = $2 WHERE id = $3', 
      [tipoMensaje, resultadoProcesamiento.procesado, mensajeId]
    );
    
    return {
      tipo: tipoMensaje,
      ...resultadoProcesamiento
    };
    
  } catch (error) {
    console.error('Error procesando mensaje:', error);
    return { 
      procesado: false, 
      error: error.message 
    };
  }
}

// Procesar un mensaje de ausencia
async function procesarAusencia(telefono, texto, mensajeId) {
  try {
    // 1. Encontrar al alumno basado en el número de teléfono del responsable
    const alumnoQuery = `
      SELECT a.id, a.nombre_completo, a.maestro_id, u.email AS maestro_email, u.nombre AS maestro_nombre
      FROM alumnos a
      LEFT JOIN usuarios u ON a.maestro_id = u.id
      WHERE a.telefono_responsable_principal = $1 AND a.estado = 'Activo'
      LIMIT 1;
    `;
    
    const alumnoResult = await db.query(alumnoQuery, [telefono]);
    
    if (alumnoResult.rows.length === 0) {
      return {
        procesado: false,
        mensaje: "No se encontró alumno asociado a este número de teléfono"
      };
    }
    
    const alumno = alumnoResult.rows[0];
    
    // 2. Registrar la ausencia en la base de datos
    const insertAusenciaQuery = `
      INSERT INTO ausencias (alumno_id, motivo, mensaje_id)
      VALUES ($1, $2, $3)
      RETURNING id;
    `;
    
    const ausenciaResult = await db.query(insertAusenciaQuery, [
      alumno.id,
      texto,
      mensajeId
    ]);
    
    const ausenciaId = ausenciaResult.rows[0].id;
    
    // 3. Notificar al maestro correspondiente
    let notificacionMaestro = false;
    if (alumno.maestro_id) {
      notificacionMaestro = await notificarMaestro(
        alumno.maestro_email, 
        alumno.maestro_nombre,
        alumno.nombre_completo, 
        texto, 
        ausenciaId
      );
    }
    
    // 4. Enviar confirmación al padre/responsable
    const confirmacionPadre = await enviarMensajeWhatsApp(
      telefono,
      `✅ Se ha registrado la ausencia de ${alumno.nombre_completo}. ${notificacionMaestro ? 'El docente ha sido notificado.' : 'No se pudo notificar al docente, pero el registro de ausencia fue creado.'}`
    );
    
    // 5. Actualizar el estado de la ausencia
    await db.query(
      'UPDATE ausencias SET notificado_docente = $1 WHERE id = $2', 
      [notificacionMaestro, ausenciaId]
    );
    
    return {
      procesado: true,
      ausenciaId,
      alumnoId: alumno.id,
      nombreAlumno: alumno.nombre_completo,
      maestroNotificado: notificacionMaestro,
      confirmacionEnviada: confirmacionPadre
    };
    
  } catch (error) {
    console.error('Error procesando ausencia:', error);
    return { 
      procesado: false, 
      error: error.message 
    };
  }
}

// Procesar una consulta sobre tareas
async function procesarConsulta(telefono, texto, mensajeId) {
  try {
    // 1. Encontrar al alumno basado en el número de teléfono del responsable
    const alumnoQuery = `
      SELECT a.id, a.nombre_completo, a.maestro_id, u.email AS maestro_email, u.nombre AS maestro_nombre
      FROM alumnos a
      LEFT JOIN usuarios u ON a.maestro_id = u.id
      WHERE a.telefono_responsable_principal = $1 AND a.estado = 'Activo'
      LIMIT 1;
    `;
    
    const alumnoResult = await db.query(alumnoQuery, [telefono]);
    
    if (alumnoResult.rows.length === 0) {
      return {
        procesado: false,
        mensaje: "No se encontró alumno asociado a este número de teléfono"
      };
    }
    
    const alumno = alumnoResult.rows[0];
    
    // 2. Notificar al maestro correspondiente
    let notificacionMaestro = false;
    if (alumno.maestro_id) {
      notificacionMaestro = await notificarMaestro(
        alumno.maestro_email, 
        alumno.maestro_nombre,
        alumno.nombre_completo, 
        texto, 
        null,
        'consulta'
      );
    }
    
    // 3. Enviar confirmación al padre/responsable
    const confirmacionPadre = await enviarMensajeWhatsApp(
      telefono,
      `✅ Su consulta sobre ${alumno.nombre_completo} ha sido recibida. ${notificacionMaestro ? 'El docente ha sido notificado y responderá a la brevedad.' : 'No se pudo notificar al docente, pero su consulta fue registrada.'}`
    );
    
    return {
      procesado: true,
      alumnoId: alumno.id,
      nombreAlumno: alumno.nombre_completo,
      maestroNotificado: notificacionMaestro,
      confirmacionEnviada: confirmacionPadre
    };
    
  } catch (error) {
    console.error('Error procesando consulta:', error);
    return { 
      procesado: false, 
      error: error.message 
    };
  }
}

// Función para notificar al maestro
async function notificarMaestro(email, nombreMaestro, nombreAlumno, mensaje, ausenciaId, tipo = 'ausencia') {
  try {
    // Log para depuración
    console.log(`Notificación para ${nombreMaestro} (${email}) sobre ${tipo} de ${nombreAlumno}: ${mensaje}`);
    
    // Integración real con n8n para enviar notificaciones
    try {
      const response = await axios.post('http://ccjap_n8n:5678/webhook/notificar-maestro', {
        email,
        nombreMaestro,
        nombreAlumno,
        mensaje,
        ausenciaId,
        tipo
      });
      
      console.log('Respuesta de n8n (notificar-maestro):', response.data);
      return response.status === 200;
    } catch (n8nError) {
      console.error('Error al llamar al webhook de n8n (notificar-maestro):', n8nError.message);
      // En desarrollo, simulamos éxito para seguir probando
      return process.env.NODE_ENV !== 'production';
    }
  } catch (error) {
    console.error('Error notificando al maestro:', error);
    return false;
  }
}

// Función para enviar mensajes de WhatsApp usando n8n y WaAPI
async function enviarMensajeWhatsApp(telefono, mensaje) {
  try {
    const apiKey = 'pIAOM8UufGmEcPHDqhLSfPfkbyahOWb8aB6wdNJ84b38f280'; // Token de WaAPI proporcionado
    
    console.log(`Enviando mensaje WhatsApp a ${telefono}: ${mensaje}`);

    // Formatear el número para formato internacional
    let numeroFormateado = telefono;
    if (!numeroFormateado.startsWith('+')) {
      if (numeroFormateado.startsWith('503')) {
        numeroFormateado = '+' + numeroFormateado;
      } else {
        numeroFormateado = '+503' + numeroFormateado; // Asumiendo número de El Salvador
      }
    }

    // Intentar primero enviar a través de n8n
    try {
      const response = await axios.post('http://ccjap_n8n:5678/webhook/enviar-whatsapp', {
        telefono: numeroFormateado,
        mensaje: mensaje
      });
      
      console.log('Respuesta de n8n (enviar-whatsapp):', response.data);
      return response.status === 200;
    } catch (n8nError) {
      console.error('Error al llamar al webhook de n8n (enviar-whatsapp):', n8nError.message);
      
      // Si falla n8n, intenta directamente con la API de WaAPI como respaldo
      try {
        const response = await axios.post('https://api.waapi.net/api/send/text', {
          id: numeroFormateado,
          message: mensaje
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        });

        console.log('Respuesta directa de WaAPI:', response.data);
        return response.data.success === true;
      } catch (apiError) {
        console.error('Error en la llamada directa a WaAPI:', apiError.response?.data || apiError.message);
        // En modo desarrollo, simulamos éxito para poder seguir probando
        return process.env.NODE_ENV !== 'production';
      }
    }
  } catch (error) {
    console.error('Error enviando mensaje WhatsApp:', error);
    return false;
  }
}

// Rutas para administración de ausencias (protegidas con autenticación)

// GET /api/webhook/ausencias - Obtener todas las ausencias (con filtro por institución)
router.get('/ausencias', authMiddleware, authorizeRoles('Director', 'Docente', 'Secretaria'), async (req, res) => {
  try {
    const userRol = req.user.rol;
    const userInstitucionId = req.user.institucion_id;
    const userId = req.user.id;
    
    let query = `
      SELECT a.*, al.nombre_completo as alumno_nombre, u.nombre as docente_nombre
      FROM ausencias a
      JOIN alumnos al ON a.alumno_id = al.id
      LEFT JOIN usuarios u ON al.maestro_id = u.id
    `;
    
    const values = [];
    
    // Filtrar por institución si no es superadmin
    if (userRol !== 'Superadministrador') {
      query += ' WHERE al.institucion_id = $1';
      values.push(userInstitucionId);
      
      // Si es Docente, mostrar solo las ausencias de sus alumnos
      if (userRol === 'Docente') {
        query += ' AND al.maestro_id = $2';
        values.push(userId);
      }
    }
    
    query += ' ORDER BY a.fecha_ausencia DESC';
    
    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener ausencias:', err.stack);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// POST /api/webhook/responder - Enviar una respuesta a un mensaje de WhatsApp
router.post('/responder', authMiddleware, authorizeRoles('Director', 'Docente', 'Secretaria', 'Superadministrador'), async (req, res) => {
  try {
    const { telefono, mensaje, mensajeOriginalId } = req.body;
    
    if (!telefono || !mensaje) {
      return res.status(400).json({ error: 'Teléfono y mensaje son requeridos.' });
    }
    
    // Enviar el mensaje de WhatsApp
    const mensajeEnviado = await enviarMensajeWhatsApp(telefono, mensaje);
    
    if (!mensajeEnviado) {
      throw new Error('Error al enviar el mensaje de WhatsApp');
    }
    
    // Registrar la respuesta en la base de datos
    const insertRespuestaQuery = `
      INSERT INTO mensajes_whatsapp (
        telefono_remitente, texto_mensaje, fecha_recepcion, procesado, tipo_mensaje, institucion_id
      )
      VALUES ($1, $2, CURRENT_TIMESTAMP, true, 'respuesta', $3)
      RETURNING id;
    `;
    
    const respuestaResult = await db.query(insertRespuestaQuery, [
      telefono,
      mensaje,
      req.user.institucion_id
    ]);
    
    res.json({
      success: true,
      mensaje: 'Respuesta enviada correctamente',
      id: respuestaResult.rows[0].id
    });
    
  } catch (err) {
    console.error('Error al responder mensaje:', err.stack);
    res.status(500).json({ error: 'Error interno del servidor al responder mensaje', details: err.message });
  }
});

// GET /api/webhook/mensajes - Obtener todos los mensajes recibidos (con filtro por institución)
router.get('/mensajes', authMiddleware, authorizeRoles('Director', 'Superadministrador'), async (req, res) => {
  try {
    const userRol = req.user.rol;
    const userInstitucionId = req.user.institucion_id;
    
    let query = 'SELECT * FROM mensajes_whatsapp';
    const values = [];
    
    // Filtrar por institución si no es superadmin
    if (userRol !== 'Superadministrador') {
      query += ' WHERE institucion_id = $1';
      values.push(userInstitucionId);
    }
    
    query += ' ORDER BY fecha_recepcion DESC';
    
    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener mensajes de WhatsApp:', err.stack);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

module.exports = router;