const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const logger = require('./logger');
const crearAdminInicial = require('../scripts/init-admin-render');
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

await db.exec(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_completo TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        rol TEXT NOT NULL CHECK(rol IN ('admin', 'medico', 'licenciado', 'auditor')),
        activo INTEGER DEFAULT 1,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        ultimo_acceso DATETIME,
        nombre TEXT,
        estado TEXT DEFAULT 'activo',
        created_at DATETIME
      );
      CREATE TABLE IF NOT EXISTS empresas_prestadoras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        cuit TEXT UNIQUE,
        telefono TEXT,
        email TEXT,
        direccion TEXT,
        servicios_ofrecidos TEXT,
        estado TEXT DEFAULT 'activa' CHECK(estado IN ('activa', 'inactiva')),
        observaciones TEXT,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS profesionales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empresa_id INTEGER,
        nombre_completo TEXT NOT NULL,
        tipo_profesional TEXT NOT NULL CHECK(tipo_profesional IN ('medico','enfermero','kinesiologo','terapeuta_ocupacional','fonoaudiologo','psicologo','nutricionista','otro')),
        matricula TEXT,
        especialidad TEXT,
        telefono TEXT,
        email TEXT,
        direccion TEXT,
        modalidad TEXT CHECK(modalidad IN ('presencial', 'domiciliaria', 'ambas')),
        honorarios_por_sesion REAL,
        observaciones TEXT,
        activo INTEGER DEFAULT 1,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
        usuario_creador_id INTEGER,
        FOREIGN KEY (empresa_id) REFERENCES empresas_prestadoras(id) ON DELETE SET NULL,
        FOREIGN KEY (usuario_creador_id) REFERENCES usuarios(id)
      );
      CREATE TABLE IF NOT EXISTS afiliados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_completo TEXT NOT NULL,
        dni TEXT NOT NULL UNIQUE,
        fecha_nacimiento DATE,
        edad INTEGER NOT NULL,
        sexo TEXT NOT NULL CHECK(sexo IN ('Masculino', 'Femenino', 'Otro')),
        telefono TEXT,
        email TEXT,
        direccion TEXT NOT NULL,
        numero_afiliado TEXT NOT NULL UNIQUE,
        obra_social TEXT,
        plan TEXT,
        prestador_id INTEGER,
        diagnostico TEXT,
        fecha_ingreso DATE NOT NULL,
        fecha_egreso DATE,
        medico_tratante TEXT,
        observaciones TEXT,
        estado TEXT DEFAULT 'activo' CHECK(estado IN ('activo', 'egresado')),
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
        usuario_creador_id INTEGER,
        FOREIGN KEY (prestador_id) REFERENCES empresas_prestadoras(id),
        FOREIGN KEY (usuario_creador_id) REFERENCES usuarios(id)
      );
      CREATE TABLE IF NOT EXISTS atencion_medica (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        afiliado_id INTEGER NOT NULL,
        mes INTEGER NOT NULL CHECK(mes BETWEEN 1 AND 12),
        anio INTEGER NOT NULL,
        atencion_medica_mensual INTEGER DEFAULT 0,
        hs_enfermeria_semanal REAL DEFAULT 0,
        ktm_sesiones_semanal INTEGER DEFAULT 0,
        ktr_sesiones_semanal INTEGER DEFAULT 0,
        cuidados_domiciliarios_hs_mensual REAL DEFAULT 0,
        especialidades_medicas_mensual INTEGER DEFAULT 0,
        observaciones TEXT,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
        usuario_registro_id INTEGER,
        FOREIGN KEY (afiliado_id) REFERENCES afiliados(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_registro_id) REFERENCES usuarios(id),
        UNIQUE(afiliado_id, mes, anio)
      );
      CREATE TABLE IF NOT EXISTS documentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        afiliado_id INTEGER NOT NULL,
        categoria TEXT NOT NULL CHECK(categoria IN ('historia_clinica','ordenes_medicas','informes','facturacion','consentimientos','otros')),
        nombre_archivo TEXT NOT NULL,
        ruta_archivo TEXT NOT NULL,
        tamanio_bytes INTEGER,
        tipo_mime TEXT,
        descripcion TEXT,
        fecha_carga DATETIME DEFAULT CURRENT_TIMESTAMP,
        usuario_carga_id INTEGER,
        FOREIGN KEY (afiliado_id) REFERENCES afiliados(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_carga_id) REFERENCES usuarios(id)
      );
      CREATE TABLE IF NOT EXISTS facturas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        numero_factura TEXT NOT NULL UNIQUE,
        afiliado_id INTEGER NOT NULL,
        obra_social TEXT NOT NULL,
        periodo_mes INTEGER NOT NULL CHECK(periodo_mes BETWEEN 1 AND 12),
        periodo_anio INTEGER NOT NULL,
        fecha_emision DATE NOT NULL,
        fecha_vencimiento DATE,
        subtotal REAL DEFAULT 0,
        descuento_porcentaje REAL DEFAULT 0,
        descuento_monto REAL DEFAULT 0,
        total REAL DEFAULT 0,
        monto_pagado REAL DEFAULT 0,
        estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente','pagada','parcial','vencida','anulada')),
        observaciones TEXT,
        fecha_pago DATE,
        medio_pago TEXT,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
        usuario_creador_id INTEGER,
        FOREIGN KEY (afiliado_id) REFERENCES afiliados(id),
        FOREIGN KEY (usuario_creador_id) REFERENCES usuarios(id)
      );
      CREATE TABLE IF NOT EXISTS factura_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        factura_id INTEGER NOT NULL,
        profesional_id INTEGER,
        descripcion TEXT NOT NULL,
        tipo_prestacion TEXT CHECK(tipo_prestacion IN ('atencion_medica','enfermeria','kinesiologia_ktm','kinesiologia_ktr','cuidados_domiciliarios','especialidad_medica','terapia_ocupacional','fonoaudiologia','psicologia','nutricion','otro')),
        cantidad INTEGER DEFAULT 1,
        precio_unitario REAL NOT NULL,
        subtotal REAL NOT NULL,
        observaciones TEXT,
        FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
        FOREIGN KEY (profesional_id) REFERENCES profesionales(id)
      );
      CREATE TABLE IF NOT EXISTS factura_pagos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        factura_id INTEGER NOT NULL,
        monto REAL NOT NULL,
        fecha_pago DATE NOT NULL,
        medio_pago TEXT CHECK(medio_pago IN ('efectivo','transferencia','cheque','tarjeta','otro')),
        numero_comprobante TEXT,
        observaciones TEXT,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
        usuario_registro_id INTEGER,
        FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_registro_id) REFERENCES usuarios(id)
      );
      CREATE TABLE IF NOT EXISTS nomenclador (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT NOT NULL UNIQUE,
        descripcion TEXT NOT NULL,
        tipo_prestacion TEXT NOT NULL CHECK(tipo_prestacion IN ('atencion_medica','enfermeria','kinesiologia_ktm','kinesiologia_ktr','cuidados_domiciliarios','especialidad_medica','terapia_ocupacional','fonoaudiologia','psicologia','nutricion','otro')),
        precio_unitario REAL NOT NULL,
        unidad TEXT DEFAULT 'unidad' CHECK(unidad IN ('unidad', 'hora', 'sesion', 'consulta')),
        obra_social TEXT,
        vigente INTEGER DEFAULT 1,
        observaciones TEXT,
        fecha_desde DATE DEFAULT CURRENT_DATE,
        fecha_hasta DATE,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
        usuario_creador_id INTEGER,
        FOREIGN KEY (usuario_creador_id) REFERENCES usuarios(id)
      );
      CREATE TABLE IF NOT EXISTS contactos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        email TEXT NOT NULL,
        mensaje TEXT NOT NULL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        leido INTEGER DEFAULT 0,
        respondido INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS auditoria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tabla TEXT NOT NULL,
        registro_id INTEGER NOT NULL,
        accion TEXT NOT NULL CHECK(accion IN ('crear', 'actualizar', 'eliminar')),
        usuario_id INTEGER,
        datos_anteriores TEXT,
        datos_nuevos TEXT,
        ip_address TEXT,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip TEXT,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      );
    `);
    // Agregar método registrarAuditoria al objeto db
    db.registrarAuditoria = registrarAuditoria;

    console.log(`✅ Base de datos inicializada correctamente: ${dbPath}`);
    logger.info(`Base de datos conectada en: ${dbPath}`);
await crearAdminInicial(db);
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
