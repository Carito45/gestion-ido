require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./data/gestion_ido.db');

const runQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const getAll = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const getOne = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

async function arreglarEmails() {
  console.log('🔧 ARREGLANDO EMAILS - QUITANDO COMILLAS\n');
  console.log('='.repeat(80));
  
  try {
    // 1. Ver emails actuales
    console.log('\n📋 Emails ANTES de arreglar:');
    const usuariosAntes = await getAll('SELECT id, email FROM usuarios WHERE id IN (8, 9, 10)');
    usuariosAntes.forEach(u => {
      console.log(`   ID ${u.id}: "${u.email}" (${u.email.length} caracteres)`);
    });
    
    // 2. Quitar comillas de los emails
    console.log('\n🔧 Limpiando emails...');
    
    const emails = [
      { id: 8, emailLimpio: 'gustavo.perez@demo.com' },
      { id: 9, emailLimpio: 'medico@demo.com' },
      { id: 10, emailLimpio: 'auditor@demo.com' }
    ];
    
    for (const { id, emailLimpio } of emails) {
      await runQuery(
        'UPDATE usuarios SET email = ? WHERE id = ?',
        [emailLimpio, id]
      );
      console.log(`   ✅ ID ${id}: Email actualizado a "${emailLimpio}"`);
    }
    
    // 3. Verificar que se limpiaron
    console.log('\n📋 Emails DESPUÉS de arreglar:');
    const usuariosDespues = await getAll('SELECT id, email FROM usuarios WHERE id IN (8, 9, 10)');
    usuariosDespues.forEach(u => {
      console.log(`   ID ${u.id}: ${u.email} (${u.email.length} caracteres)`);
    });
    
    // 4. Probar login ahora
    console.log('\n🔐 PROBANDO LOGIN AHORA:\n');
    console.log('='.repeat(80));
    
    const pruebas = [
      { email: 'gustavo.perez@demo.com', password: 'Demo2025!' },
      { email: 'medico@demo.com', password: 'Medico2025!' },
      { email: 'auditor@demo.com', password: 'Auditor2025!' }
    ];
    
    for (const prueba of pruebas) {
      console.log(`\n👤 ${prueba.email}:`);
      
      // Query EXACTAMENTE como tu endpoint
      const usuario = await getOne(
        'SELECT * FROM usuarios WHERE email = ? AND activo = 1',
        [prueba.email.toLowerCase().trim()]
      );
      
      if (!usuario) {
        console.log('   ❌ Usuario no encontrado');
        continue;
      }
      
      console.log(`   ✅ Usuario encontrado (ID ${usuario.id})`);
      
      const coincide = await bcrypt.compare(prueba.password, usuario.password);
      
      if (coincide) {
        console.log(`   ✅ CONTRASEÑA VÁLIDA - LOGIN EXITOSO`);
        console.log(`      Rol: ${usuario.rol}`);
        console.log(`      Nombre: ${usuario.nombre_completo}`);
      } else {
        console.log(`   ❌ Contraseña incorrecta`);
      }
    }
    
    console.log('\n\n✅ ¡EMAILS ARREGLADOS!\n');
    console.log('🔑 Ahora puedes hacer login con:');
    console.log('   • gustavo.perez@demo.com  →  Demo2025!');
    console.log('   • medico@demo.com         →  Medico2025!');
    console.log('   • auditor@demo.com        →  Auditor2025!\n');
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    db.close(() => {
      console.log('🔒 Base de datos cerrada\n');
    });
  }
}

arreglarEmails();
