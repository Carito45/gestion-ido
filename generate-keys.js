#!/usr/bin/env node

/**
 * 🔑 GENERADOR DE CLAVES SEGURAS
 * Genera todas las claves necesarias para la aplicación
 * 
 * Uso: node generate-keys.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('\n🔐 ===================================');
console.log('   GENERADOR DE CLAVES SEGURAS');
console.log('   ===================================\n');

/**
 * Genera una clave segura
 */
function generateKey(length = 32, format = 'hex') {
  return crypto.randomBytes(length).toString(format);
}

/**
 * Verifica si existe un archivo .env
 */
function checkEnvExists() {
  const envPath = path.join(process.cwd(), '.env');
  return fs.existsSync(envPath);
}

/**
 * Crea el archivo .env con las claves generadas
 */
function createEnvFile(keys) {
  const envPath = path.join(process.cwd(), '.env');
  
  const envContent = `# ========================================
# 🔐 CLAVES DE SEGURIDAD
# ========================================
# ⚠️  IMPORTANTE: NO COMPARTAS ESTAS CLAVES
# ⚠️  AGREGAR .env AL .gitignore
# ========================================

# JWT Secret (para tokens de autenticación)
JWT_SECRET=${keys.jwt}

# Session Secret (para sesiones de Express)
SESSION_SECRET=${keys.session}

# Database Encryption Key (para cifrado AES-256)
DB_ENCRYPTION_KEY=${keys.dbEncryption}

# ========================================
# 🌍 CONFIGURACIÓN DEL SERVIDOR
# ========================================

# Entorno: development | production | test
NODE_ENV=development

# Puerto del servidor
PORT=3000

# Orígenes permitidos para CORS (separados por coma)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# ========================================
# 📊 LOGGING
# ========================================

# Nivel de logs: error | warn | info | debug
LOG_LEVEL=info

# ========================================
# ⚠️  BACKUP DE CLAVES
# ========================================
# Guarda una copia de estas claves en un lugar seguro.
# Si las pierdes, NO podrás:
# - Descifrar datos existentes en la base de datos
# - Validar tokens JWT existentes
# - Mantener sesiones activas
# ========================================
`;

  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✅ Archivo .env creado correctamente\n');
}

/**
 * Crea un archivo .env.example (sin valores reales)
 */
function createEnvExample() {
  const examplePath = path.join(process.cwd(), '.env.example');
  
  const exampleContent = `# ========================================
# 🔐 VARIABLES DE ENTORNO (EJEMPLO)
# ========================================
# Copia este archivo a .env y genera tus propias claves
# con: node generate-keys.js
# ========================================

JWT_SECRET=tu_clave_jwt_aqui
SESSION_SECRET=tu_clave_session_aqui
DB_ENCRYPTION_KEY=tu_clave_db_aqui

NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000

LOG_LEVEL=info
`;

  fs.writeFileSync(examplePath, exampleContent, 'utf8');
  console.log('✅ Archivo .env.example creado\n');
}

/**
 * Actualiza el .gitignore
 */
function updateGitignore() {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  
  let gitignoreContent = '';
  
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  }
  
  // Verificar si .env ya está en .gitignore
  if (!gitignoreContent.includes('.env')) {
    const envSection = `
# Variables de entorno
.env
.env.local
.env.production
`;
    gitignoreContent += envSection;
    fs.writeFileSync(gitignorePath, gitignoreContent, 'utf8');
    console.log('✅ .gitignore actualizado\n');
  }
}

/**
 * Main
 */
function main() {
  // Generar claves
  const keys = {
    jwt: generateKey(32, 'hex'),
    session: generateKey(32, 'hex'),
    dbEncryption: generateKey(32, 'hex')
  };

  console.log('🔑 Claves generadas:\n');
  console.log(`JWT_SECRET=${keys.jwt}`);
  console.log(`SESSION_SECRET=${keys.session}`);
  console.log(`DB_ENCRYPTION_KEY=${keys.dbEncryption}`);
  console.log('\n');

  // Verificar si .env ya existe
  if (checkEnvExists()) {
    console.log('⚠️  El archivo .env ya existe.\n');
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('¿Deseas sobrescribirlo? (s/N): ', (answer) => {
      if (answer.toLowerCase() === 's' || answer.toLowerCase() === 'si') {
        createEnvFile(keys);
        createEnvExample();
        updateGitignore();
        console.log('✅ Configuración completada.\n');
        console.log('📝 Próximos pasos:');
        console.log('   1. Revisa el archivo .env');
        console.log('   2. Ajusta las variables según tu entorno');
        console.log('   3. Inicia el servidor: npm start\n');
      } else {
        console.log('❌ Operación cancelada. El archivo .env no fue modificado.\n');
      }
      readline.close();
    });
  } else {
    createEnvFile(keys);
    createEnvExample();
    updateGitignore();
    
    console.log('✅ Configuración completada.\n');
    console.log('📝 Próximos pasos:');
    console.log('   1. Revisa el archivo .env');
    console.log('   2. Ajusta las variables según tu entorno');
    console.log('   3. Crea el primer admin: node create-admin.js');
    console.log('   4. Inicia el servidor: npm start\n');
  }
}

// Ejecutar
main();
