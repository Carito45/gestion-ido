require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./data/gestion_ido.db');

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

async function debugProfundo() {
  console.log('🔍 DEBUG PROFUNDO - INSPECCIÓN COMPLETA\n');
  console.log('='.repeat(80));
  
  try {
    // 1. Ver TODOS los campos de cada usuario
    console.log('\n📊 TODOS LOS CAMPOS de los usuarios problemáticos:\n');
    const usuarios = await getAll(
      "SELECT * FROM usuarios WHERE id IN (8, 9, 10)"
    );
    
    for (const u of usuarios) {
      console.log(`\n🔹 Usuario ID ${u.id}:`);
      console.log('─'.repeat(80));
      for (const [campo, valor] of Object.entries(u)) {
        if (campo === 'password') {
          console.log(`   ${campo.padEnd(20)}: ${valor.substring(0, 30)}... (${valor.length} chars)`);
        } else if (campo === 'email') {
          const bytes = Buffer.from(valor);
          console.log(`   ${campo.padEnd(20)}: "${valor}"`);
          console.log(`   ${'email_length'.padEnd(20)}: ${valor.length} caracteres`);
          console.log(`   ${'email_bytes'.padEnd(20)}: ${JSON.stringify(bytes)}`);
          console.log(`   ${'email_trim'.padEnd(20)}: "${valor.trim()}"`);
          console.log(`   ${'email_lowercase'.padEnd(20)}: "${valor.toLowerCase()}"`);
        } else {
          console.log(`   ${campo.padEnd(20)}: ${valor}`);
        }
      }
    }
    
    // 2. Probar diferentes variaciones del query
    console.log('\n\n🧪 PROBANDO DIFERENTES QUERIES:\n');
    console.log('='.repeat(80));
    
    const emails = ['gustavo.perez@demo.com', 'medico@demo.com', 'auditor@demo.com'];
    
    for (const email of emails) {
      console.log(`\n📧 Probando: ${email}`);
      
      // Query 1: Sin WHERE activo
      const q1 = await getOne('SELECT id, email, activo FROM usuarios WHERE email = ?', [email]);
      console.log(`   Query 1 (sin activo):              ${q1 ? `✅ Encontrado (ID ${q1.id}, activo=${q1.activo})` : '❌ No encontrado'}`);
      
      // Query 2: Con WHERE activo = 1
      const q2 = await getOne('SELECT id, email, activo FROM usuarios WHERE email = ? AND activo = 1', [email]);
      console.log(`   Query 2 (con activo = 1):          ${q2 ? `✅ Encontrado (ID ${q2.id})` : '❌ No encontrado'}`);
      
      // Query 3: Con trim y lowercase
      const q3 = await getOne('SELECT id, email, activo FROM usuarios WHERE email = ? AND activo = 1', [email.toLowerCase().trim()]);
      console.log(`   Query 3 (trim + lowercase):        ${q3 ? `✅ Encontrado (ID ${q3.id})` : '❌ No encontrado'}`);
      
      // Query 4: LIKE en vez de =
      const q4 = await getOne('SELECT id, email, activo FROM usuarios WHERE email LIKE ? AND activo = 1', [email]);
      console.log(`   Query 4 (LIKE):                    ${q4 ? `✅ Encontrado (ID ${q4.id})` : '❌ No encontrado'}`);
      
      // Query 5: Sin WHERE, buscando manualmente
      const todos = await getAll('SELECT id, email, activo FROM usuarios WHERE activo = 1');
      const encontrado = todos.find(u => u.email === email || u.email.trim() === email || u.email.toLowerCase() === email);
      console.log(`   Query 5 (búsqueda manual):         ${encontrado ? `✅ Encontrado (ID ${encontrado.id})` : '❌ No encontrado'}`);
    }
    
    // 3. Ver TODOS los usuarios activos
    console.log('\n\n📋 TODOS LOS USUARIOS ACTIVOS EN LA BD:\n');
    console.log('='.repeat(80));
    const todosActivos = await getAll('SELECT id, email, activo FROM usuarios WHERE activo = 1 ORDER BY id');
    todosActivos.forEach(u => {
      console.log(`   ID ${u.id}: "${u.email}" (activo=${u.activo})`);
    });
    
    // 4. Verificar el esquema de la tabla
    console.log('\n\n🗂️  ESTRUCTURA DE LA TABLA usuarios:\n');
    console.log('='.repeat(80));
    const schema = await getAll("PRAGMA table_info(usuarios)");
    schema.forEach(col => {
      console.log(`   ${col.name.padEnd(20)} | ${col.type.padEnd(15)} | NOT NULL: ${col.notnull} | DEFAULT: ${col.dflt_value}`);
    });
    
    // 5. Probar login REAL con el hash que está en la BD
    console.log('\n\n🔐 PRUEBA FINAL DE LOGIN:\n');
    console.log('='.repeat(80));
    
    for (const email of emails) {
      console.log(`\n👤 ${email}:`);
      
      // Obtener el usuario SIN filtro de activo
      const usuario = await getOne('SELECT * FROM usuarios WHERE email = ?', [email]);
      
      if (!usuario) {
        console.log('   ❌ Usuario NO EXISTE en la BD');
        continue;
      }
      
      console.log(`   ✅ Usuario existe (ID ${usuario.id})`);
      console.log(`   📌 Activo: ${usuario.activo} (tipo: ${typeof usuario.activo})`);
      console.log(`   📌 Activo === 1: ${usuario.activo === 1}`);
      console.log(`   📌 Activo == 1: ${usuario.activo == 1}`);
      console.log(`   📌 Activo === '1': ${usuario.activo === '1'}`);
      
      // Probar las contraseñas
      const passwords = {
        'Demo2025!': 'gustavo.perez@demo.com',
        'Medico2025!': 'medico@demo.com',
        'Auditor2025!': 'auditor@demo.com'
      };
      
      const passwordCorrecta = Object.keys(passwords).find(p => passwords[p] === email);
      if (passwordCorrecta) {
        const coincide = await bcrypt.compare(passwordCorrecta, usuario.password);
        console.log(`   🔑 Contraseña "${passwordCorrecta}": ${coincide ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    db.close(() => {
      console.log('\n🔒 Base de datos cerrada\n');
    });
  }
}

debugProfundo();
