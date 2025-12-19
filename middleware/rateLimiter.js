const rateLimit = require('express-rate-limit');

// Límite específico para login (más estricto)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos
  message: { error: 'Demasiados intentos de login. Intenta en 15 minutos.' }
});

// Límite general para API
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // máximo 100 solicitudes
  message: { error: 'Demasiadas peticiones. Intenta en un minuto.' }
});

module.exports = {
  loginLimiter,
  apiLimiter
};
