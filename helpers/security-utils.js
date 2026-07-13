const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados intentos de login. Intenta en 15 minutos.' }
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas peticiones. Intenta en un minuto.' }
});

const CATEGORIAS_VALIDAS = [
  'historia_clinica', 
  'ordenes_medicas', 
  'informes', 
  'facturacion', 
  'consentimientos',
  'otros'
];

function validarCategoria(categoria) {
  if (!categoria || typeof categoria !== 'string') {
    return 'otros';
  }
  return CATEGORIAS_VALIDAS.includes(categoria.toLowerCase()) 
    ? categoria.toLowerCase() 
    : 'otros';
}

function validarMonto(monto) {
  const montoNum = parseFloat(monto);
  if (isNaN(montoNum) || montoNum < 0) {
    return { valido: false, error: 'Monto inválido' };
  }
  return { valido: true, monto: montoNum };
}

module.exports = {
  loginLimiter,
  apiLimiter,
  CATEGORIAS_VALIDAS,
  validarCategoria,
  validarMonto
};
