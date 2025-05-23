const jwt = require('jsonwebtoken');
// TODO: Mover a variable de entorno, debe ser la misma que en auth.js
const JWT_SECRET = 'tu_super_secreto_jwt_aqui_cambiar_en_produccion'; 

const authMiddleware = (req, res, next) => {
  // Obtener token del header (formato común: Bearer TOKEN)
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    return res.status(401).json({ error: 'No token, autorización denegada.' });
  }

  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Formato de token inválido. Use Bearer token.' });
  }
  
  const token = tokenParts[1];

  if (!token) {
    return res.status(401).json({ error: 'No token, autorización denegada.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded.user; // Añadir payload del usuario (id, rol, etc.) al objeto request
    next();
  } catch (err) {
    console.error('Error de token:', err.message);
    res.status(401).json({ error: 'Token no es válido.' });
  }
};

// Middleware para verificar roles específicos
const authorizeRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user || !req.user.rol) {
      return res.status(403).json({ error: 'Acceso denegado. Rol de usuario no encontrado en token.' });
    }
    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ error: `Acceso denegado. Rol '${req.user.rol}' no tiene permiso para este recurso.` });
    }
    next();
  };
};

module.exports = { authMiddleware, authorizeRoles };
