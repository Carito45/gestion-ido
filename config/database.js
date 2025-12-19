const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const logger = require('./logger');

// ========================================
// CONFIGURACIÓN DE RUTA Y CARPETA
// ========================================
const dataDir = path.join(__dirname, '..', 'data');

// Crear carpeta si no existe
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`📁 Carpeta de base de datos creada: ${dataDir}`);
}

// Ruta completa al archivo .db
const dbPath = path.join(dataDir, 'gestion_ido.db');

// ========================================
// CONEXIÓN Y CONFIGURACIÓN DE SQLITE
// ========================================
let db = null;

async function initDB() {
  try {
    // Abrir o crear base
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Optimización y seguridad
    await db.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA temp_store = MEMORY;
      PRAGMA cache_size = 10000;
    `);

    // Agregar método registrarAuditoria al objeto db
    db.registrarAuditoria = registrarAuditoria;

    console.log(`✅ Base de datos inicializada correctamente: ${dbPath}`);
    logger.info(`Base de datos conectada en: ${dbPath}`);

    return db;
  } catch (err) {
    console.error('❌ Error inicializando la base de datos:', err.message);
    logger.error('Error al iniciar base de datos', { error: err });
    throw new Error('Fallo al iniciar la base de datos. Verifica configuración y permisos.');
  }
}

// ========================================
// FUNCIÓN DE AUDITORÍA
// ========================================
async function registrarAuditoria(tabla, registroId, accion, usuarioId, datosAnteriores = null, datosNuevos = null, ip = null) {
  if (!db) {
    console.warn('⚠️ Base de datos no inicializada para auditoría');
    return;
  }

  try {
    await db.run(
      `INSERT INTO auditoria (
        tabla, 
        registro_id, 
        accion, 
        usuario_id, 
        datos_anteriores, 
        datos_nuevos, 
        ip, 
        fecha
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        tabla,
        registroId,
        accion,
        usuarioId,
        datosAnteriores ? JSON.stringify(datosAnteriores) : null,
        datosNuevos ? JSON.stringify(datosNuevos) : null,
        ip
      ]
    );

    logger.info('Auditoría registrada', { 
      tabla, 
      accion, 
      registroId, 
      usuarioId 
    });

  } catch (error) {
    // No lanzar error para que no interrumpa la operación principal
    console.error('❌ Error al registrar auditoría:', error.message);
    logger.error('Error en auditoría', { 
      error: error.message, 
      tabla, 
      accion 
    });
  }
}

// ========================================
// GETTER DE BASE DE DATOS
// ========================================
function getDB() {
  if (!db) {
    throw new Error('❌ Base de datos no inicializada. Asegúrate de llamar a initDB() primero.');
  }
  return db;
}

// ========================================
// EXPORTACIÓN
// ========================================
module.exports = { 
  getDB, 
  initDB,
  registrarAuditoria, // Exportar también como función independiente
  get database() { return db; }
};