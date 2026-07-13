require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('../data/gestion_ido.db');

// Helper para queries con promesas
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

async function arreglarUsuarios() {
  console.log('🔧 ARREGLANDO USUARIOS DEL SISTEMA\n');
  console.log('='.repeat(80));
  
  try {
    // 1. Mostrar estado inicial
    console.log('\n📋 Estado INICIAL de usuarios:');
    const usuariosInicial = await getAll(
      "SELECT id, nombre_completo, email, rol, activo FROM usuarios WHERE id IN (1, 8, 9, 10) ORDER BY id"
    );
    usuariosInicial.forEach(u => {
      const estado = u.activo ? '✓' : '✗';
      console.log(`   ${estado} ID ${u.id}: ${u.email.padEnd(30)} | ${u.rol.padEnd(12)} | ${u.nombre_completo}`);
    });
    
    // 2. Generar nuevos hashes con bcrypt (costo 10, igual que tu script original)
    console.log('\n🔐 Generando nuevos hashes de contraseñas...');
    const hashGustavo = await bcrypt.hash('Demo2025!', 10);
    const hashMedico = await bcrypt.hash('Medico2025!', 10);
    const hashAuditor = await bcrypt.hash('Auditor2025!', 10);
    console.log('✅ Hashes generados correctamente');
    
    // 3. Verificar que los hashes funcionan ANTES de guardarlos
    console.log('\n🧪 Verificando hashes generados...');
    const pruebaGustavo = await bcrypt.compare('Demo2025!', hashGustavo);
    const pruebaMedico = await bcrypt.compare('Medico2025!', hashMedico);
    const pruebaAuditor = await bcrypt.compare('Auditor2025!', hashAuditor);
    
    console.log(`   Gustavo:  ${pruebaGustavo ? '✅' : '❌'} Hash válido`);
    console.log(`   Médico:   ${pruebaMedico ? '✅' : '❌'} Hash válido`);
    console.log(`   Auditor:  ${pruebaAuditor ? '✅' : '❌'} Hash válido`);
    
    if (!pruebaGustavo || !pruebaMedico || !pruebaAuditor) {
      throw new Error('❌ Los hashes generados no son válidos. Abortando.');
    }
    
    // 4. Actualizar base de datos
    console.log('\n💾 Actualizando base de datos...');
    
    // Actualizar ID 1 (solo nombre, sin tocar contraseña)
    await runQuery(
      "UPDATE usuarios SET nombre_completo = ?, nombre = ? WHERE id = 1",
      ['Carolina Pérez - Admin', 'Admin']
    );
    console.log('✅ ID 1: karitopperez43@gmail.com → Nombre actualizado');
    
    // Actualizar ID 8 (Gustavo)
    await runQuery(
      "UPDATE usuarios SET nombre_completo = ?, password = ?, nombre = ?, activo = 1 WHERE id = 8",
      ['Lic. Gustavo Pérez', hashGustavo, 'Gustavo Pérez']
    );
    console.log('✅ ID 8: gustavo.perez@demo.com → Contraseña: Demo2025!');
    
    // Actualizar ID 9 (Médico)
    await runQuery(
      "UPDATE usuarios SET nombre_completo = ?, password = ?, nombre = ?, activo = 1 WHERE id = 9",
      ['Dr. Juan Médico', hashMedico, 'Dr. Médico']
    );
    console.log('✅ ID 9: medico@demo.com → Contraseña: Medico2025!');
    
    // Actualizar ID 10 (Auditor)
    await runQuery(
      "UPDATE usuarios SET nombre_completo = ?, password = ?, nombre = ?, activo = 1 WHERE id = 10",
      ['Lic. Pedro Auditor', hashAuditor, 'Auditor']
    );
    console.log('✅ ID 10: auditor@demo.com → Contraseña: Auditor2025!');
    
    // 5. Verificar que se guardaron correctamente
    console.log('\n🔍 Verificando que los hashes se guardaron en la BD...');
    const usuariosActualizados = await getAll(
      "SELECT id, email, password, activo FROM usuarios WHERE id IN (8, 9, 10)"
    );
    
    let todosOk = true;
    for (const usuario of usuariosActualizados) {
      const hashValido = usuario.password.startsWith('$2') && usuario.password.length === 60;
      const estadoIcon = hashValido && usuario.activo ? '✅' : '❌';
      console.log(`   ${estadoIcon} ${usuario.email}: Hash ${hashValido ? 'OK' : 'INVÁLIDO'} | Activo: ${usuario.activo ? 'SÍ' : 'NO'}`);
      if (!hashValido || !usuario.activo) todosOk = false;
    }
    
    if (!todosOk) {
      throw new Error('❌ Algunos hashes no se guardaron correctamente');
    }
    
    // 6. PRUEBA REAL DE LOGIN (simulando tu endpoint)
    console.log('\n🔐 SIMULANDO LOGIN REAL (como lo hace tu endpoint)...');
    console.log('='.repeat(80));
    
    const pruebas = [
      { email: 'gustavo.perez@demo.com', password: 'Demo2025!' },
      { email: 'medico@demo.com', password: 'Medico2025!' },
      { email: 'auditor@demo.com', password: 'Auditor2025!' }
    ];
    
    for (const prueba of pruebas) {
      console.log(`\n👤 Intentando login: ${prueba.email}`);
      
      // Simular exactamente lo que hace tu endpoint
      const usuario = await getOne(
        'SELECT * FROM usuarios WHERE email = ? AND activo = 1',
        [prueba.email.toLowerCase().trim()]
      );
      
      if (!usuario) {
        console.log('   ❌ Usuario no encontrado o inactivo');
        continue;
      }
      
      const coincide = await bcrypt.compare(prueba.password, usuario.password);
      
      if (coincide) {
        console.log(`   ✅ LOGIN EXITOSO`);
        console.log(`      - Usuario encontrado: ${usuario.nombre_completo}`);
        console.log(`      - Rol: ${usuario.rol}`);
        console.log(`      - Contraseña validada correctamente`);
      } else {
        console.log(`   ❌ LOGIN FALLIDO: Contraseña incorrecta`);
        console.log(`      - Hash en BD: ${usuario.password.substring(0, 30)}...`);
        console.log(`      - Longitud: ${usuario.password.length} caracteres`);
      }
    }
    
    // 7. Resumen final
    console.log('\n\n📊 RESUMEN FINAL:');
    console.log('='.repeat(80));
    const usuariosFinal = await getAll(
      "SELECT id, nombre_completo, email, rol, activo FROM usuarios WHERE id IN (1, 8, 9, 10) ORDER BY id"
    );
    
    usuariosFinal.forEach(u => {
      const estado = u.activo ? '✓' : '✗';
      console.log(`   ${estado} ID ${u.id}: ${u.email.padEnd(30)} | ${u.rol.padEnd(12)} | ${u.nombre_completo}`);
    });
    
    console.log('\n✅ CONFIGURACIÓN COMPLETA!\n');
    console.log('🔑 Credenciales para el sistema:');
    console.log('   ┌─────────────────────────────────────────────────────────────────┐');
    console.log('   │ 1. karitopperez43@gmail.com  | admin      | [TU CONTRASEÑA]    │');
    console.log('   │ 2. gustavo.perez@demo.com    | licenciado | Demo2025!          │');
    console.log('   │ 3. medico@demo.com           | medico     | Medico2025!        │');
    console.log('   │ 4. auditor@demo.com          | auditor    | Auditor2025!       │');
    console.log('   └─────────────────────────────────────────────────────────────────┘\n');
    
  } catch (error) {
    console.error('\n❌ ERROR CRÍTICO:', error.message);
    console.error('\n🔧 Pasos de debugging:');
    console.error('   1. Verifica que la BD existe en ./data/gestion_ido.db');
    console.error('   2. Verifica que bcrypt está instalado: npm ls bcryptjs');
    console.error('   3. Comparte la salida completa de este script\n');
  } finally {
    db.close(() => {
      console.log('🔒 Base de datos cerrada\n');
    });
  }
}

arreglarUsuarios();
