const bcrypt = require('bcryptjs');
const readline = require('readline');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// Crear interfaz para input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Función auxiliar para hacer preguntas
const pregunta = (query) => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

// Conectar a la base de datos directamente
const dbPath = path.join(__dirname, process.env.DB_NAME || 'gestion_ido.db');
const db = new sqlite3.Database(dbPath);

// Función para verificar si ya existe un admin
const verificarAdmin = () => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT COUNT(*) as count FROM usuarios WHERE rol = 'admin'",
      (err, row) => {
        if (err) reject(err);
        else resolve(row.count > 0);
      }
    );
  });
};

// Función para crear admin
const crearAdmin = async () => {
  try {
    console.log('\n🔐 ===================================');
    console.log('   CREAR USUARIO ADMINISTRADOR');
    console.log('   ===================================\n');

    // Verificar si ya existe un admin
    const existeAdmin = await verificarAdmin();
    
    if (existeAdmin) {
      const confirmar = await pregunta(
        '⚠️  Ya existe un usuario administrador. ¿Deseas crear otro? (s/n): '
      );
      
      if (confirmar.toLowerCase() !== 's') {
        console.log('\n❌ Operación cancelada.\n');
        rl.close();
        db.close();
        return;
      }
    }

    // Solicitar datos
    const nombre = await pregunta('Nombre completo: ');
    const email = await pregunta('Email: ');
    const password = await pregunta('Contraseña (mínimo 6 caracteres): ');
    const passwordConfirm = await pregunta('Confirmar contraseña: ');

    // Validaciones
    if (!nombre || nombre.length < 3) {
      throw new Error('El nombre debe tener al menos 3 caracteres');
    }

    if (!email || !email.includes('@')) {
      throw new Error('Email inválido');
    }

    if (!password || password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    if (password !== passwordConfirm) {
      throw new Error('Las contraseñas no coinciden');
    }

    // Verificar si el email ya existe
    const emailExiste = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM usuarios WHERE email = ?',
        [email],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });

    if (emailExiste) {
      throw new Error('El email ya está registrado');
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Insertar usuario
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO usuarios (nombre_completo, email, password, rol, activo)
         VALUES (?, ?, ?, 'admin', 1)`,
        [nombre, email, passwordHash],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    console.log('\n✅ ===================================');
    console.log('   ADMINISTRADOR CREADO EXITOSAMENTE');
    console.log('   ===================================');
    console.log(`   👤 Nombre: ${nombre}`);
    console.log(`   📧 Email: ${email}`);
    console.log(`   🔑 Rol: admin`);
    console.log('   ===================================\n');
    console.log('   Ahora puedes iniciar sesión con estas credenciales.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message, '\n');
  } finally {
    rl.close();
    db.close();
  }
};

// Ejecutar
crearAdmin();