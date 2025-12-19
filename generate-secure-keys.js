const crypto = require('crypto');

console.log('\n🔐 ========================================');
console.log('   GENERADOR DE CLAVES SEGURAS');
console.log('   ========================================\n');

// Generar claves aleatorias
const jwtSecret = crypto.randomBytes(64).toString('hex');
const sessionSecret = crypto.randomBytes(64).toString('hex');
const dbEncryptionKey = crypto.randomBytes(32).toString('hex');

console.log('✅ Claves generadas con éxito\n');
console.log('📋 Copia y pega estas claves en tu archivo .env:\n');
console.log('─'.repeat(80));
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`SESSION_SECRET=${sessionSecret}`);
console.log(`DB_ENCRYPTION_KEY=${dbEncryptionKey}`);
console.log('─'.repeat(80));

console.log('\n📊 Información de las claves:\n');
console.log(`   JWT_SECRET:         128 caracteres (512 bits)`);
console.log(`   SESSION_SECRET:     128 caracteres (512 bits)`);
console.log(`   DB_ENCRYPTION_KEY:  64 caracteres (256 bits) - AES-256\n`);

console.log('⚠️  IMPORTANTE:');
console.log('   • Guarda estas claves en un lugar seguro');
console.log('   • NO las compartas con nadie');
console.log('   • NO las subas a Git');
console.log('   • Si pierdes DB_ENCRYPTION_KEY, perderás los datos cifrados\n');

console.log('💡 Pasos siguientes:');
console.log('   1. Haz backup del .env actual: cp .env .env.backup');
console.log('   2. Actualiza .env con las nuevas claves');
console.log('   3. Si tienes datos cifrados, debes migrarlos');
console.log('   4. Reinicia el servidor: npm run dev\n');
