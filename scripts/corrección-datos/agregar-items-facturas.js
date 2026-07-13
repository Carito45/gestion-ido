const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'gestion_ido.db');
const db = new sqlite3.Database(dbPath);

console.log('💰 COMPLETANDO FACTURAS...\n');

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function completarFacturas() {
  try {
    console.log('Agregando items a Factura 001-00001...');
    
    // Items para factura ID 4 (la que se creó)
    await runQuery(`INSERT INTO factura_items (factura_id, profesional_id, descripcion, tipo_prestacion,
                    cantidad, precio_unitario, subtotal)
      VALUES 
      (4, 1, 'Consulta médica domiciliaria', 'atencion_medica', 4, 8000, 32000),
      (4, 2, 'Sesión de kinesiología', 'kinesiologia_ktm', 3, 4333, 13000)`);
    
    console.log('✅ Items agregados a Factura 001-00001\n');

    console.log('Creando Factura 001-00002...');
    
    // Factura 2 completa
    await runQuery(`INSERT INTO facturas (numero_factura, afiliado_id, obra_social, periodo_mes, periodo_anio,
                    fecha_emision, fecha_vencimiento, subtotal, total, estado, monto_pagado, usuario_creador_id)
      VALUES ('001-00002', 2, 'Swiss Medical', 11, 2025, date('now', '-10 days'), date('now', '+20 days'),
              32500, 32500, 'parcial', 15000, 1)`);
    
    // Obtener ID de la factura recién creada
    const row = await new Promise((resolve, reject) => {
      db.get('SELECT last_insert_rowid() as id', (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    const fid = row.id;
    
    await runQuery(`INSERT INTO factura_items (factura_id, profesional_id, descripcion, tipo_prestacion,
                    cantidad, precio_unitario, subtotal)
      VALUES (${fid}, 2, 'Sesión de kinesiología domiciliaria', 'kinesiologia_ktm', 5, 6500, 32500)`);
    
    await runQuery(`INSERT INTO factura_pagos (factura_id, monto, fecha_pago, medio_pago, numero_comprobante, usuario_registro_id)
      VALUES (${fid}, 15000, date('now', '-5 days'), 'transferencia', 'TRANSF-001234', 1)`);
    
    console.log('✅ Factura 001-00002 creada con pago parcial\n');

    console.log('✅✅✅ BASE DE DATOS DEMO COMPLETA ✅✅✅\n');
    console.log('📊 RESUMEN FINAL:');
    console.log('==================');
    console.log('👥 4 Usuarios');
    console.log('🏢 2 Empresas (OSDE, Swiss Medical)');
    console.log('👨‍⚕️ 3 Profesionales');
    console.log('👤 3 Afiliados');
    console.log('🏥 3 Atenciones médicas');
    console.log('💰 2 Facturas con items\n');
    
    console.log('🔑 CREDENCIALES:');
    console.log('=================');
    console.log('👑 Admin:      karitopperez43@gmail.com / [tu contraseña]');
    console.log('👨‍💼 Licenciado: gustavo.perez@demo.com / Demo2025!');
    console.log('👨‍⚕️ Médico:     medico@demo.com / Medico2025!');
    console.log('🔍 Auditor:    auditor@demo.com / Auditor2025!\n');
    
    console.log('🎯 LISTO PARA MOSTRAR A GUSTAVO 🎯\n');

    db.close();
  } catch (error) {
    console.error('❌ Error:', error);
    db.close();
  }
}

completarFacturas();
