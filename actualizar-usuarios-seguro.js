require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./data/gestion_ido.db');

async function actualizarUsuarios() {
  console.log('🔐 Configurando usuarios para el demo...\n');
  
  // Hashear contraseñas
  const hashGustavo = await bcrypt.hash('Demo2025!', 10);
  const hashMedico = await bcrypt.hash('Medico2025!', 10);
  const hashAuditor = await bcrypt.hash('Auditor2025!', 10);
  
  db.serialize(() => {
    
    // 1. Eliminar duplicados y usuarios innecesarios
    console.log('🗑️  Limpiando usuarios duplicados...');
    
    // Eliminar el admin@demo.com (ID 11)
    db.run("DELETE FROM usuarios WHERE id = 11", (err) => {
      if (err) console.error('Error:', err);
      else console.log('✅ admin@demo.com eliminado');
    });
    
    // Eliminar uno de los médicos duplicados (ID 12, el más nuevo)
    db.run("DELETE FROM usuarios WHERE id = 12", (err) => {
      if (err) console.error('Error:', err);
      else console.log('✅ Médico duplicado eliminado');
    });
    
    setTimeout(() => {
      console.log('\n👤 Actualizando usuarios finales...');
      
      // 2. Tu usuario (ID 1) - solo actualizar nombre si quieres
      db.run(
        "UPDATE usuarios SET nombre_completo = ?, nombre = ? WHERE id = 1",
        ['Carolina Pérez - Admin', 'Admin'],
        (err) => {
          if (err) console.error('Error:', err);
          else console.log('✅ ID 1: karitopperez43@gmail.com → Admin (contraseña SIN cambios)');
        }
      );
      
      // 3. Gustavo (ID 8) - actualizar contraseña
      db.run(
        "UPDATE usuarios SET nombre_completo = ?, password = ?, nombre = ? WHERE id = 8",
        ['Lic. Gustavo Pérez', hashGustavo, 'Gustavo Pérez'],
        (err) => {
          if (err) console.error('Error:', err);
          else console.log('✅ ID 8: gustavo.perez@demo.com → Nueva contraseña: Demo2025!');
        }
      );
      
      // 4. Médico (ID 9) - actualizar contraseña y nombre
      db.run(
        "UPDATE usuarios SET nombre_completo = ?, password = ?, nombre = ? WHERE id = 9",
        ['Dr. Juan Médico', hashMedico, 'Dr. Médico'],
        (err) => {
          if (err) console.error('Error:', err);
          else console.log('✅ ID 9: medico@demo.com → Nueva contraseña: Medico2025!');
        }
      );
      
      // 5. Auditor (ID 10) - actualizar contraseña y nombre
      db.run(
        "UPDATE usuarios SET nombre_completo = ?, password = ?, nombre = ? WHERE id = 10",
        ['Lic. Pedro Auditor', hashAuditor, 'Auditor'],
        (err) => {
          if (err) console.error('Error:', err);
          else console.log('✅ ID 10: auditor@demo.com → Nueva contraseña: Auditor2025!');
        }
      );
      
      setTimeout(() => {
        console.log('\n📋 Usuarios finales configurados:\n');
        db.all("SELECT id, nombre_completo, email, rol, activo FROM usuarios ORDER BY id", (err, rows) => {
          if (err) {
            console.error('Error:', err);
          } else {
            rows.forEach(u => {
              console.log(`  ${u.id}. ${u.email.padEnd(30)} | ${u.rol.padEnd(12)} | ${u.nombre_completo}`);
            });
          }
          
          console.log('\n✅ ¡Usuarios configurados correctamente!\n');
          console.log('🔑 Credenciales para el demo:');
          console.log('   1. karitopperez43@gmail.com  | admin      | [TU CONTRASEÑA ACTUAL - SIN CAMBIOS]');
          console.log('   2. gustavo.perez@demo.com    | licenciado | Demo2025!');
          console.log('   3. medico@demo.com           | medico     | Medico2025!');
          console.log('   4. auditor@demo.com          | auditor    | Auditor2025!\n');
          
          db.close();
        });
      }, 1000);
      
    }, 500);
    
  });
}

actualizarUsuarios();
