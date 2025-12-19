const jwt = require('jsonwebtoken');
const logger = require('../config/logger'); // ← SIN llaves

// 🔒 Verifica token JWT
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!process.env.JWT_SECRET) {
    console.error('❌ Falta JWT_SECRET en las variables de entorno');
    return res.status(500).json({ error: 'Error interno del servidor' });
  }

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado: token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded; // ← req.usuario (no req.user)
    logger.info(`Token verificado: ${decoded.email}`); // ← logger.info (no logAccess)
    next();
  } catch (error) {
    console.error('❌ Error verificando token:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expirado, inicia sesión nuevamente.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Token inválido o manipulado.' });
    }
    return res.status(403).json({ error: 'Token inválido' });
  }
}

// 👥 Verifica rol
function verificarRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      logger.info(`Acceso denegado: ${req.usuario.email} intentó acceder sin permisos`);
      return res.status(403).json({
        error: 'No tienes permisos para realizar esta acción',
        rolRequerido: rolesPermitidos,
        tuRol: req.usuario.rol,
      });
    }
    next();
  };
}

// 🟢 Token opcional (para rutas públicas)
function verificarTokenOpcional(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return next();

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.warn('⚠️ Token inválido opcional:', error.message);
  }
  next();
}

module.exports = { verificarToken, verificarRol, verificarTokenOpcional };
