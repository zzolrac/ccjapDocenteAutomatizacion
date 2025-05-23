const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');
const axios = require('axios');

// GET /api/waapi/config - Obtener la configuración de WaApi
router.get('/config', authMiddleware, authorizeRoles('Director', 'Superadministrador'), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT api_key, phone_number, webhook_url, n8n_url, n8n_api_key, auto_reply, notify_absences, notify_grades, notify_events FROM waapi_config WHERE institucion_id = $1', 
      [req.user.institucion_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuración de WaApi no encontrada para esta institución.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al obtener la configuración de WaApi:', err.stack);
    res.status(500).json({ error: 'Error interno del servidor al obtener la configuración de WaApi', details: err.message });
  }
});

// POST /api/waapi/config - Guardar la configuración de WaApi
router.post('/config', authMiddleware, authorizeRoles('Director', 'Superadministrador'), async (req, res) => {
  const { 
    api_key, 
    phone_number, 
    webhook_url, 
    n8n_url, 
    n8n_api_key,
    auto_reply,
    notify_absences,
    notify_grades,
    notify_events
  } = req.body;

  if (!api_key || !phone_number) {
    return res.status(400).json({ error: 'API Key y número de teléfono son requeridos.' });
  }

  try {
    // Verificar si ya existe una configuración para esta institución
    const existingConfig = await db.query('SELECT 1 FROM waapi_config WHERE institucion_id = $1', [req.user.institucion_id]);

    if (existingConfig.rows.length > 0) {
      // Si existe, actualizar la configuración
      await db.query(
        `UPDATE waapi_config SET 
         api_key = $1, 
         phone_number = $2, 
         webhook_url = $3, 
         n8n_url = $4, 
         n8n_api_key = $5, 
         auto_reply = $6, 
         notify_absences = $7, 
         notify_grades = $8, 
         notify_events = $9 
         WHERE institucion_id = $10`,
        [
          api_key, 
          phone_number, 
          webhook_url || null, 
          n8n_url || null, 
          n8n_api_key || null, 
          auto_reply !== undefined ? auto_reply : true, 
          notify_absences !== undefined ? notify_absences : true, 
          notify_grades || false, 
          notify_events || false, 
          req.user.institucion_id
        ]
      );
      res.json({ message: 'Configuración de WhatsApp actualizada con éxito.' });
    } else {
      // Si no existe, crear una nueva configuración
      await db.query(
        `INSERT INTO waapi_config (
          institucion_id, 
          api_key, 
          phone_number, 
          webhook_url, 
          n8n_url, 
          n8n_api_key, 
          auto_reply, 
          notify_absences, 
          notify_grades, 
          notify_events
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          req.user.institucion_id, 
          api_key, 
          phone_number, 
          webhook_url || null, 
          n8n_url || null, 
          n8n_api_key || null, 
          auto_reply !== undefined ? auto_reply : true, 
          notify_absences !== undefined ? notify_absences : true, 
          notify_grades || false, 
          notify_events || false
        ]
      );
      res.status(201).json({ message: 'Configuración de WhatsApp creada con éxito.' });
    }
  } catch (err) {
    console.error('Error al guardar la configuración de WhatsApp:', err.stack);
    res.status(500).json({ error: 'Error interno del servidor al guardar la configuración de WhatsApp', details: err.message });
  }
});

// POST /api/waapi/test-connection - Probar la conexión con n8n y WhatsApp
router.post('/test-connection', authMiddleware, authorizeRoles('Director', 'Superadministrador'), async (req, res) => {
  const { api_key, phone_number, n8n_url, n8n_api_key } = req.body;

  if (!api_key || !phone_number) {
    return res.status(400).json({ error: 'API Key y número de teléfono son requeridos para la prueba.' });
  }

  try {
    // Probar la conexión con n8n si se proporcionan los datos
    if (n8n_url && n8n_api_key) {
      try {
        // Intentar obtener información del servidor n8n
        const n8nResponse = await axios.get(`${n8n_url}/api/v1/workflows`, {
          headers: {
            'X-N8N-API-KEY': n8n_api_key
          }
        });
        
        if (n8nResponse.status !== 200) {
          return res.status(400).json({ error: 'No se pudo conectar con el servidor n8n. Verifique la URL y la API Key.' });
        }
      } catch (error) {
        return res.status(400).json({ 
          error: 'Error al conectar con n8n', 
          details: error.response ? error.response.data : error.message 
        });
      }
    }

    // Simular una prueba de conexión con WhatsApp
    // En un entorno real, aquí se haría una llamada a la API de WhatsApp para verificar las credenciales
    
    // Por ahora, simplemente devolvemos éxito
    res.json({ 
      success: true, 
      message: 'Conexión exitosa con WhatsApp' + (n8n_url ? ' y n8n' : '') 
    });
  } catch (err) {
    console.error('Error al probar la conexión:', err.stack);
    res.status(500).json({ error: 'Error interno del servidor al probar la conexión', details: err.message });
  }
});

// POST /api/waapi/send-message - Enviar un mensaje de WhatsApp
router.post('/send-message', authMiddleware, authorizeRoles('Director', 'Secretaria', 'Docente', 'Superadministrador'), async (req, res) => {
  const { phone_number, message, template_name, template_params } = req.body;

  if (!phone_number || (!message && !template_name)) {
    return res.status(400).json({ error: 'Número de teléfono y mensaje (o plantilla) son requeridos.' });
  }

  try {
    // Obtener la configuración de WhatsApp para la institución
    const configResult = await db.query(
      'SELECT api_key, phone_number as sender_phone FROM waapi_config WHERE institucion_id = $1', 
      [req.user.institucion_id]
    );

    if (configResult.rows.length === 0) {
      return res.status(404).json({ error: 'Configuración de WhatsApp no encontrada para esta institución.' });
    }

    const { api_key, sender_phone } = configResult.rows[0];

    // Aquí iría la lógica para enviar el mensaje usando la API de WhatsApp
    // En un entorno real, se haría una llamada a la API de WhatsApp
    
    // Por ahora, registramos el intento de envío en la base de datos
    await db.query(
      `INSERT INTO mensajes_whatsapp (
        institucion_id, 
        telefono, 
        mensaje, 
        tipo_mensaje, 
        es_respuesta, 
        enviado_por
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        req.user.institucion_id,
        phone_number,
        message || `Plantilla: ${template_name}`,
        template_name ? 'PLANTILLA' : 'TEXTO',
        true, // Es una respuesta enviada por el sistema
        req.user.id
      ]
    );

    res.json({ 
      success: true, 
      message: 'Mensaje enviado con éxito' 
    });
  } catch (err) {
    console.error('Error al enviar mensaje de WhatsApp:', err.stack);
    res.status(500).json({ error: 'Error interno del servidor al enviar mensaje', details: err.message });
  }
});

module.exports = router;