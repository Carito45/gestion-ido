const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'gestion_ido.db');
const db = new sqlite3.Database(dbPath);

async function resetPassword() {
  const newPassword = 'Demo2025!';
  const hash = await bcrypt.hash(newPassword, 10);
  
  db.run(
    'UPDATE usuarios SET password = ?, activo = 1 WHERE email = ?',
    [hash, 'gustavo.perez@demo.com'],
    function(err) {
      if (err) {
        console.error('❌ Error:', err);
      } else {
        console.log('✅ Contraseña actualizada para gustavo.perez@demo.com');
        console.log('   Email: gustavo.perez@demo.com');
        console.log('   Contraseña: Demo2025!');
        console.log('   Estado: Activo');
      }
      db.close();
    }
  );
}

resetPassword();
