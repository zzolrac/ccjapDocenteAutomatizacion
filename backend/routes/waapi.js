const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

// GET /api/waapi/config - Obtener la configuración de WaApi
router.get('/config', authMiddleware, authorizeRoles('Director', 'Superadministrador'), async (req, res) => {
  try {
    const result = await db.query('SELECT api_key, phone_number FROM waapi_config WHERE institucion_id = $1', [req.user.institucion_id]);
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
  const { api_key, phone_number } = req.body;

  if (!api_key || !phone_number) {
    return res.status(400).json({ error: 'API Key y número de teléfono son requeridos.' });
  }

  try {
    // Verificar si ya existe una configuración para esta institución
    const existingConfig = await db.query('SELECT 1 FROM waapi_config WHERE institucion_id = $1', [req.user.institucion_id]);

    if (existingConfig.rows.length > 0) {
      // Si existe, actualizar la configuración
      await db.query(
        'UPDATE waapi_config SET api_key = $1, phone_number = $2 WHERE institucion_id = $3',
        [api_key, phone_number, req.user.institucion_id]
      );
      res.json({ message: 'Configuración de WaApi actualizada con éxito.' });
    } else {
      // Si no existe, crear una nueva configuración
      await db.query(
        'INSERT INTO waapi_config (institucion_id, api_key, phone_number) VALUES ($1, $2, $3)',
        [req.user.institucion_id, api_key, phone_number]
      );
      res.status(201).json({ message: 'Configuración de WaApi creada con éxito.' });
    }
  } catch (err) {
    console.error('Error al guardar la configuración de WaApi:', err.stack);
    res.status(500).json({ error: 'Error interno del servidor al guardar la configuración de WaApi', details: err.message });
  }
});

module.exports = router;