const sqlite3 = require('sqlite3').verbose();
const { decryptFields } = require('./config/encryption');

const db = new sqlite3.Database('./gestion_ido.db');

const CAMPOS_SENSIBLES = [
  'diagnostico',
  'observaciones', 
  'telefono',
  'email',
  'direccion'
];

db.all('SELECT * FROM afiliados ORDER BY id DESC LIMIT 2', [], (err, afiliados) => {
  if (err) {
    console.error('Error:', err);
    return;
  }

  console.log('=== AFILIADOS EN BD (CIFRADOS) ===\n');
  afiliados.forEach(a => {
    console.log(`ID: ${a.id}`);
    console.log(`Nombre: ${a.nombre_completo}`);
    console.log(`Estado: ${a.estado}`);
    console.log(`Teléfono (cifrado): ${a.telefono?.substring(0, 40)}...`);
    console.log(`Email (cifrado): ${a.email?.substring(0, 40)}...`);
    console.log('---');
  });

  console.log('\n=== INTENTANDO DESCIFRAR ===\n');
  
  afiliados.forEach(afiliado => {
    try {
      const descifrado = decryptFields(afiliado, CAMPOS_SENSIBLES);
      console.log(`✅ Afiliado ID ${descifrado.id} DESCIFRADO:`);
      console.log(`   Nombre: ${descifrado.nombre_completo}`);
      console.log(`   Teléfono: ${descifrado.telefono}`);
      console.log(`   Email: ${descifrado.email}`);
      console.log(`   Dirección: ${descifrado.direccion}`);
      console.log(`   Estado: ${descifrado.estado}`);
      console.log('---');
    } catch (error) {
      console.error(`❌ Error descifrando afiliado ID ${afiliado.id}:`, error.message);
    }
  });

  db.close();
});