// ===============================================
// 🏥 SISTEMA DE GESTIÓN IDO - SERVIDOR PRINCIPAL
// ===============================================

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

// ⚠️ VALIDAR VARIABLES DE ENTORNO PRIMERO
require('./config/env-validator');
require('dotenv').config();

const logger = require('./config/logger');
const { apiLimiter } = require('./middleware/rateLimiter');
const { handleMulterError } = require('./config/upload');
const { initDB } = require('./config/database');
const { 
  getHelmetConfig, 
  nonceMiddleware, 
  securityHeaders,
  staticFilesHeaders 
} = require('./config/helmet-config');

// ===============================================
// 🔌 INICIALIZAR BASE DE DATOS
// ===============================================
let dbInitialized = false;

(async () => {
  try {
    console.log('⏳ Inicializando base de datos...');
    await initDB();
    dbInitialized = true;
    console.log('✅ Base de datos lista.');
  } catch (error) {
    console.error('🚫 No se pudo conectar a la base de datos:', error.message);
    logger.error('Error al iniciar base de datos', { error });
    process.exit(1);
  }
})();

// ===============================================
// ⚙️ CONFIGURACIÓN PRINCIPAL
// ===============================================
const app = express();
const PORT = process.env.PORT || 3000;
const isDevelopment = process.env.NODE_ENV !== 'production';

// ===============================================
// 🛡️ SEGURIDAD
// ===============================================

// Helmet con configuración optimizada
app.use(helmet(getHelmetConfig(isDevelopment)));

// Middleware de nonce para CSP
app.use(nonceMiddleware);

// Headers de seguridad adicionales
app.use(securityHeaders);

// Cookie parser
app.use(cookieParser());

// ===============================================
// 🌐 CORS SEGURO
// ===============================================
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (apps móviles, Postman, curl)
    if (!origin) return callback(null, true);
    
    // En desarrollo, permitir localhost en cualquier puerto
    if (isDevelopment && origin.startsWith('http://localhost')) {
      return callback(null, true);
    }
    
    // En producción, verificar lista blanca
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('Origen CORS bloqueado', { origin, ip: origin });
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // Cache preflight por 24h
}));

// ===============================================
// 🧩 MIDDLEWARES
// ===============================================
app.use(express.json({ 
  limit: '10mb',
  // Prevenir prototype pollution
  reviver: (key, value) => {
    if (key === '__proto__' || key === 'constructor') {
      return undefined;
    }
    return value;
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Logging de cada request (sin datos sensibles)
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // No loguear datos sensibles como passwords, tokens, etc.
    const sanitizedUrl = req.url.replace(/password=[^&]*/gi, 'password=***');
    
    logger.info('HTTP Request', {
      method: req.method,
      url: sanitizedUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      // Solo loguear user agent en desarrollo
      ...(isDevelopment && { userAgent: req.get('user-agent') })
    });
  });
  
  next();
});

// ===============================================
// 🔑 SESIONES
// ===============================================
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: !isDevelopment, // HTTPS en producción
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: isDevelopment ? 'lax' : 'strict'
  },
  name: 'sessionId' // Cambiar nombre por defecto
}));

// ===============================================
// 📂 ARCHIVOS ESTÁTICOS
// ===============================================
app.use(staticFilesHeaders);
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: isDevelopment ? 0 : '1d',
  etag: true
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  etag: true
}));

// ===============================================
// 🚦 RATE LIMITING
// ===============================================
app.use('/api', apiLimiter);

// ===============================================
// 🏥 HEALTH CHECK (antes de las rutas)
// ===============================================
app.get('/health', (req, res) => {
  res.json({
    status: dbInitialized ? 'ok' : 'initializing',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: dbInitialized ? 'connected' : 'connecting'
  });
});

// ===============================================
// 🚏 RUTAS DE API
// ===============================================
const authRoutes = require('./routes/auth');
const afiliadosRoutes = require('./routes/afiliados');
const empresasRoutes = require('./routes/empresas');
const documentosRoutes = require('./routes/documentos');
const atencionMedicaRoutes = require('./routes/atencionMedica');
const reportesRoutes = require('./routes/reportes');
const profesionalesRoutes = require('./routes/profesionales');
const facturacionRoutes = require('./routes/facturacion');
const nomencladorRoutes = require('./routes/nomenclador');

app.use('/api/auth', authRoutes);
app.use('/api/afiliados', afiliadosRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/documentos', documentosRoutes);
app.use('/api/atencion-medica', atencionMedicaRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/profesionales', profesionalesRoutes);
app.use('/api/facturacion', facturacionRoutes);
app.use('/api/nomenclador', nomencladorRoutes);

// ===============================================
// 🏠 RUTAS PÚBLICAS
// ===============================================
app.get('/', (req, res) => {
  if (req.session.usuario) {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'dashboard.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'login.html'));
  }
});

// ===============================================
// 🚨 MANEJO DE ERRORES
// ===============================================

// 404 - Ruta no encontrada
app.use((req, res) => {
  logger.warn('Ruta no encontrada', { 
    method: req.method, 
    url: req.url, 
    ip: req.ip 
  });
  
  res.status(404).json({ 
    error: 'Ruta no encontrada', 
    path: req.url 
  });
});

// Error de Multer (upload)
app.use(handleMulterError);

// Error handler global
app.use((err, req, res, next) => {
  // Log completo del error
  logger.error('Error no manejado', {
    error: err.message,
    stack: isDevelopment ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.usuario?.id
  });

  // Respuesta según entorno
  const errorResponse = {
    error: isDevelopment ? err.message : 'Error interno del servidor',
    ...(isDevelopment && { stack: err.stack })
  };

  res.status(err.status || 500).json(errorResponse);
});

// ===============================================
// 📴 CIERRE CONTROLADO (GRACEFUL SHUTDOWN)
// ===============================================
let isShuttingDown = false; // ← Prevenir múltiples cierres

const gracefulShutdown = async (signal) => {
  // Prevenir ejecución múltiple
  if (isShuttingDown) {
    logger.warn(`⚠️ Cierre ya en progreso. Ignorando señal: ${signal}`);
    return;
  }
  isShuttingDown = true;

  logger.info(`📴 Señal recibida: ${signal}. Iniciando cierre controlado...`);
  console.log(`\n📴 Cerrando servidor (${signal})...`);

  // ✅ TIMEOUT AHORA DENTRO DE LA FUNCIÓN
  const shutdownTimeout = setTimeout(() => {
    logger.error('⏱️ Tiempo máximo de cierre excedido. Forzando salida.');
    process.exit(1);
  }, 10000);

  shutdownTimeout.unref(); // No mantener el proceso vivo solo por este timeout

  try {
    // Cerrar servidor HTTP
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) {
          logger.error('Error cerrando servidor HTTP', { error: err });
          reject(err);
        } else {
          logger.info('✅ Servidor HTTP cerrado correctamente.');
          resolve();
        }
      });
    });

    // Cerrar conexión a base de datos
    const { database } = require('./config/database');
    if (database && typeof database.close === 'function') {
      await database.close();
      logger.info('🔒 Conexión a base de datos cerrada correctamente.');
    }

    // ✅ CANCELAR EL TIMEOUT SI TODO SALIÓ BIEN
    clearTimeout(shutdownTimeout);

    logger.info('✅ Cierre controlado completado. Saliendo...');
    process.exit(0);

  } catch (err) {
    logger.error('❌ Error durante el cierre controlado', { error: err });
    clearTimeout(shutdownTimeout); // ← También cancelar en caso de error
    process.exit(1);
  }
};

// Escuchar señales de cierre
['SIGTERM', 'SIGINT', 'SIGQUIT'].forEach(signal => {
  process.on(signal, () => gracefulShutdown(signal));
});

// ✅ BONUS: Capturar errores no manejados
process.on('uncaughtException', (err) => {
  logger.error('💥 Excepción no capturada:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Promesa rechazada sin manejar:', { reason, promise });
  gracefulShutdown('unhandledRejection');
});
// ===============================================
// 💥 ERRORES NO CAPTURADOS (FATALES)
// ===============================================
const handleFatalError = async (type, error) => {
  try {
    logger.error(`💥 ${type}`, { 
      message: error?.message || error, 
      stack: error?.stack 
    });
    console.error(`\n💥 ${type}:`, error);

    // Cerrar recursos
    const { database } = require('./config/database');
    if (database && typeof database.close === 'function') {
      await database.close();
      logger.info('🔒 Conexión a base de datos cerrada tras error fatal.');
    }

    if (server && server.close) {
      await new Promise((resolve) => {
        server.close(() => {
          logger.info('🛑 Servidor cerrado tras error fatal.');
          resolve();
        });
      });
    }

  } catch (closeError) {
    logger.error('❌ Error cerrando recursos tras fallo fatal', { 
      error: closeError 
    });
  } finally {
    process.exit(1);
  }
};

process.on('uncaughtException', (error) => {
  handleFatalError('Excepción no capturada', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('🚨 Promesa rechazada no manejada', { reason, promise });
  handleFatalError('Promesa rechazada no manejada', reason);
});

// ===============================================
// 🚀 INICIAR SERVIDOR
// ===============================================
const server = app.listen(PORT, () => {
  logger.info('🏥 ========================================');
  logger.info(`   Sistema de Gestión IDO`);
  logger.info('   ========================================');
  logger.info(`   🚀 Servidor: http://localhost:${PORT}`);
  logger.info(`   📝 Entorno: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`   🔒 CORS: ${allowedOrigins.join(', ')}`);
  logger.info(`   🛡️  CSP: ${isDevelopment ? 'Desarrollo' : 'Producción (Estricto)'}`);
  logger.info('   ========================================');
  logger.info('   💡 Para crear el primer usuario admin:');
  logger.info('      node create-admin.js');
  logger.info('   ========================================\n');
});

module.exports = app;