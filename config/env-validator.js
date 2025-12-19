/**
 * 🔒 VALIDADOR DE VARIABLES DE ENTORNO
 * Versión compatible con .env existente
 */

// ⚠️ CARGAR DOTENV PRIMERO
require('dotenv').config();

const crypto = require('crypto');

class EnvValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Valida todas las variables de entorno requeridas
   */
  validate() {
    console.log('🔍 Validando configuración de entorno...\n');

    // Variables OBLIGATORIAS
    this.checkRequired('JWT_SECRET', 32);
    this.checkRequired('SESSION_SECRET', 32);
    this.checkRequired('DB_ENCRYPTION_KEY', 32);
    
    // NODE_ENV opcional (default: development)
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'development';
      this.warnings.push('NODE_ENV no definido, usando "development"');
    }

    // Validar encriptación solo si parece ser hex
    if (process.env.DB_ENCRYPTION_KEY && /^[0-9a-fA-F]+$/.test(process.env.DB_ENCRYPTION_KEY)) {
      this.validateEncryption();
    } else if (process.env.DB_ENCRYPTION_KEY) {
      console.log('⚠️  DB_ENCRYPTION_KEY: formato no-hex detectado (compatible)');
    }

    // Validar que JWT y SESSION sean diferentes
    this.checkUniqueness();

    // Variables OPCIONALES (warnings si faltan en producción)
    if (process.env.NODE_ENV === 'production') {
      this.checkRecommended('ALLOWED_ORIGINS');
      this.checkRecommended('PORT');
    }

    // Mostrar resultados
    this.showResults();

    // Si hay errores críticos, detener la aplicación
    if (this.errors.length > 0) {
      console.error('\n❌ La aplicación NO puede iniciarse con estos errores.\n');
      console.error('💡 Para arreglar:');
      console.error('   1. Verifica tu archivo .env');
      console.error('   2. Asegúrate de tener todas las variables requeridas');
      console.error('   3. Si necesitas generar claves nuevas: node generate-keys.js');
      console.error('   ⚠️  ADVERTENCIA: NO regeneres DB_ENCRYPTION_KEY si tienes datos cifrados\n');
      process.exit(1);
    }

    console.log('✅ Todas las validaciones de entorno pasaron correctamente.\n');
  }

  /**
   * Verifica variable requerida (más flexible)
   */
  checkRequired(varName, minLength = 0) {
    const value = process.env[varName];

    if (!value) {
      this.errors.push(`${varName} no está definida`);
      return;
    }

    // Validar longitud mínima
    if (minLength > 0 && value.length < minLength) {
      this.errors.push(
        `${varName} debe tener al menos ${minLength} caracteres (actual: ${value.length})`
      );
      return;
    }

    console.log(`✅ ${varName}: OK (${value.length} caracteres)`);
  }

  /**
   * Verifica variable recomendada (warning si no existe)
   */
  checkRecommended(varName) {
    if (!process.env[varName]) {
      this.warnings.push(`${varName} no está definida (recomendada en producción)`);
    } else {
      console.log(`✅ ${varName}: OK`);
    }
  }

  /**
   * Valida que las claves sean únicas
   */
  checkUniqueness() {
    const jwt = process.env.JWT_SECRET;
    const session = process.env.SESSION_SECRET;
    const dbKey = process.env.DB_ENCRYPTION_KEY;

    if (jwt && session && jwt === session) {
      this.warnings.push('JWT_SECRET y SESSION_SECRET son iguales (no recomendado)');
    }

    if (jwt && dbKey && jwt === dbKey) {
      this.errors.push('JWT_SECRET y DB_ENCRYPTION_KEY NO pueden ser iguales');
    }

    if (session && dbKey && session === dbKey) {
      this.warnings.push('SESSION_SECRET y DB_ENCRYPTION_KEY son iguales (no recomendado)');
    }
  }

  /**
   * Valida configuración de encriptación (solo si es hex)
   */
  validateEncryption() {
    const key = process.env.DB_ENCRYPTION_KEY;
    
    if (!key) return;

    try {
      const buffer = Buffer.from(key, 'hex');
      
      if (buffer.length !== 32) {
        this.warnings.push(
          `DB_ENCRYPTION_KEY: se esperaban 32 bytes pero se detectaron ${buffer.length} bytes (puede funcionar pero no es óptimo)`
        );
      }

      // Verificar que no sea una clave débil conocida
      const weakKeys = [
        '0'.repeat(64),
        'a'.repeat(64),
        '1234567890abcdef'.repeat(4)
      ];

      if (weakKeys.includes(key.toLowerCase())) {
        this.errors.push('DB_ENCRYPTION_KEY es demasiado débil o predecible');
      }

    } catch (error) {
      console.log(`⚠️  DB_ENCRYPTION_KEY: formato personalizado (${error.message})`);
    }
  }

  /**
   * Muestra resultados de validación
   */
  showResults() {
    if (this.warnings.length > 0) {
      console.log('\n⚠️  ADVERTENCIAS:');
      this.warnings.forEach(w => console.log(`   - ${w}`));
    }

    if (this.errors.length > 0) {
      console.error('\n🚨 ERRORES CRÍTICOS:');
      this.errors.forEach(e => console.error(`   - ${e}`));
    }
  }

  /**
   * Genera claves seguras (helper para desarrollo)
   */
  static generateSecureKeys() {
    console.log('🔑 Generando claves seguras...\n');
    console.log('# Copia estas líneas en tu archivo .env:\n');
    console.log(`JWT_SECRET=${crypto.randomBytes(32).toString('hex')}`);
    console.log(`SESSION_SECRET=${crypto.randomBytes(32).toString('hex')}`);
    console.log(`DB_ENCRYPTION_KEY=${crypto.randomBytes(32).toString('hex')}`);
    console.log('\n⚠️  IMPORTANTE: Guarda estas claves en un lugar seguro.');
    console.log('   Si pierdes DB_ENCRYPTION_KEY, NO podrás descifrar datos existentes.\n');
  }
}

// Ejecutar validación al importar el módulo
const validator = new EnvValidator();

// Solo validar si no estamos generando claves
if (!process.argv.includes('--generate-keys')) {
  validator.validate();
}

module.exports = { EnvValidator };
