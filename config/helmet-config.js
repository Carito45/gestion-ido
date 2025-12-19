/**
 * 🛡️ CONFIGURACIÓN DE SEGURIDAD CON HELMET
 * Content Security Policy optimizada para producción
 */

const crypto = require('crypto');

/**
 * Genera un nonce único por request para scripts inline
 */
function generateNonce() {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Middleware para generar nonce y agregarlo a req y res.locals
 */
function nonceMiddleware(req, res, next) {
  res.locals.nonce = generateNonce();
  next();
}

/**
 * Configuración de Helmet según el entorno
 */
function getHelmetConfig(isDevelopment = false) {
  
  // Configuración ESTRICTA para producción
  const productionConfig = {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          // Usar nonces en lugar de unsafe-inline
          (req, res) => `'nonce-${res.locals.nonce}'`
        ],
        styleSrc: [
          "'self'",
          // Solo permitir inline styles con hash específico si es necesario
          "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='" // empty string hash
        ],
        imgSrc: ["'self'", "data:", "blob:"],
        fontSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    hsts: {
      maxAge: 31536000, // 1 año
      includeSubDomains: true,
      preload: true
    },
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true,
    frameguard: {
      action: 'deny'
    }
  };

  // Configuración más PERMISIVA para desarrollo
  const developmentConfig = {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        fontSrc: ["'self'", "data:"],
        connectSrc: ["'self'", "http://localhost:*"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"]
      }
    },
    hsts: false, // No HSTS en desarrollo
    referrerPolicy: {
      policy: 'no-referrer-when-downgrade'
    },
    noSniff: true,
    hidePoweredBy: true,
    frameguard: {
      action: 'deny'
    }
  };

  return isDevelopment ? developmentConfig : productionConfig;
}

/**
 * Configuración adicional de seguridad
 */
const securityHeaders = (req, res, next) => {
  // Prevenir clickjacking adicional
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevenir MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Habilitar protección XSS del navegador
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Política de permisos (Feature Policy / Permissions Policy)
  res.setHeader('Permissions-Policy', 
    'geolocation=(), microphone=(), camera=(), payment=()'
  );
  
  // Prevenir información del servidor
  res.removeHeader('X-Powered-By');
  
  next();
};

/**
 * Headers específicos para archivos estáticos
 */
const staticFilesHeaders = (req, res, next) => {
  // Cache largo para archivos estáticos con hash
  if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  next();
};

module.exports = {
  getHelmetConfig,
  nonceMiddleware,
  securityHeaders,
  staticFilesHeaders,
  generateNonce
};
