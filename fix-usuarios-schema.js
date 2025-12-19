const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/gestion_ido.db');

console.log('🔧 Arreglando esquema de usuarios...');

db.serialize(() => {
  // Agregar columnas compatibles
  const commands = [
    `ALTER TABLE usuarios ADD COLUMN nombre TEXT`,
    `ALTER TABLE usuarios ADD COLUMN estado TEXT DEFAULT 'activo'`,
    `ALTER TABLE usuarios ADD COLUMN created_at DATETIME`
  ];
  
  let completed = 0;
  commands.forEach((cmd, i) => {
    db.run(cmd, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error(`❌ Error en comando ${i+1}:`, err.message);
      } else if (!err) {
        console.log(`✅ Comando ${i+1} ejecutado`);
      }
      completed++;
      
      if (completed === commands.length) {
        // Migrar datos
        db.run(`UPDATE usuarios SET 
          nombre = COALESCE(nombre, nombre_completo),
          estado = CASE 
            WHEN activo = 1 THEN 'activo' 
            ELSE 'inactivo' 
          END,
          created_at = COALESCE(created_at, fecha_creacion)
        `, (err) => {
          if (err) {
            console.error('❌ Error migrando datos:', err.message);
          } else {
            console.log('✅ Datos migrados');
          }
          
          // Mostrar resultado
          db.all('SELECT id, nombre, nombre_completo, email, estado, activo FROM usuarios', (err, rows) => {
            if (!err) {
              console.log('\n📊 Usuarios:');
              rows.forEach(r => {
                console.log(`  ${r.id}: ${r.nombre} (${r.email}) - Estado: ${r.estado}`);
              });
            }
            db.close();
          });
        });
      }
    });
  });
});
