const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// TODO: Mover a variable de entorno
const JWT_SECRET = 'tu_super_secreto_jwt_aqui_cambiar_en_produccion'; 

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
  }

  try {
    const userResult = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas.' }); // Usuario no encontrado
    }

    const user = userResult.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas.' }); // Contraseña incorrecta
    }

    // Usuario autenticado, generar JWT
    const payload = {
      user: {
        id: user.id,
        email: user.email,
        rol: user.rol,
        nombre: user.nombre
      }
    };

    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: '1h' }, // Token expira en 1 hora (ajustar según necesidad)
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token,
          user: payload.user // Devolver también información del usuario
        });
      }
    );

  } catch (err) {
    console.error('Error en login:', err.stack);
    res.status(500).json({ error: 'Error interno del servidor durante el login' });
  }
});

module.exports = router;
