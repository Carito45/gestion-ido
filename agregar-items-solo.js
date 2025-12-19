const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'gestion_ido.db');
const db = new sqlite3.Database(dbPath);

console.log('💰 AGREGANDO ITEMS A FACTURAS EXISTENTES');
console.log('=========================================\n');

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function agregarItems() {
  try {
    console.log('📝 Factura ID 4 (FC-2024-11-001 - OSDE - $82,400)');
    await runQuery(`
      INSERT INTO factura_items (factura_id, profesional_id, descripcion, tipo_prestacion, cantidad, precio_unitario, subtotal)
      VALUES 
      (4, 1, 'Consulta médica domiciliaria', 'atencion_medica', 4, 8000, 32000),
      (4, 2, 'Horas de enfermería', 'enfermeria', 12, 4200, 50400)
    `);
    console.log('   ✅ 2 items agregados\n');

    console.log('📝 Factura ID 5 (FC-2024-11-002 - Swiss Medical - $115,000)');
    await runQuery(`
      INSERT INTO factura_items (factura_id, profesional_id, descripcion, tipo_prestacion, cantidad, precio_unitario, subtotal)
      VALUES 
      (5, 2, 'Sesión de kinesiología', 'kinesiologia_ktm', 5, 6500, 32500),
      (5, 3, 'Horas de enfermería', 'enfermeria', 20, 4125, 82500)
    `);
    console.log('   ✅ 2 items agregados\n');

    console.log('📝 Factura ID 6 (FC-2024-10-003 - IOMA - $156,000)');
    await runQuery(`
      INSERT INTO factura_items (factura_id, profesional_id, descripcion, tipo_prestacion, cantidad, precio_unitario, subtotal)
      VALUES 
      (6, 1, 'Consulta médica domiciliaria', 'atencion_medica', 6, 9000, 54000),
      (6, 3, 'Cuidados domiciliarios', 'cuidados_domiciliarios', 24, 4250, 102000)
    `);
    console.log('   ✅ 2 items agregados\n');

    console.log('✅ ITEMS AGREGADOS EXITOSAMENTE\n');
    
    // Verificar
    const items = await new Promise((resolve, reject) => {
      db.all(`
        SELECT fi.factura_id, f.numero_factura, fi.descripcion, fi.cantidad, fi.precio_unitario, fi.subtotal
        FROM factura_items fi
        JOIN facturas f ON f.id = fi.factura_id
        ORDER BY fi.factura_id
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('📊 VERIFICACIÓN:');
    console.log('================');
    items.forEach(item => {
      console.log(`${item.numero_factura}: ${item.descripcion} (${item.cantidad} × $${item.precio_unitario} = $${item.subtotal})`);
    });

    db.close();
    console.log('\n✅ Operación completada sin errores\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    db.close();
    process.exit(1);
  }
}

agregarItems();
