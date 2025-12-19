const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 64 || !/^[0-9a-fA-F]+$/.test(ENCRYPTION_KEY)) {
  throw new Error('DB_ENCRYPTION_KEY inválida: debe ser un string hexadecimal de 64 caracteres (32 bytes)');
}

const key = Buffer.from(ENCRYPTION_KEY, 'hex');

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(data) {
  if (!data) return null;
  
  // Verificar si el dato está en formato cifrado (tiene los dos ':')
  if (typeof data !== 'string' || !data.includes(':')) {
    // Si no está cifrado, retornarlo tal cual (datos antiguos)
    return data;
  }
  
  try {
    const parts = data.split(':');
    
    // Verificar formato correcto (iv:tag:encrypted = 3 partes)
    if (parts.length !== 3) {
      // No es formato cifrado válido, retornar original
      return data;
    }
    
    const [ivHex, tagHex, encryptedHex] = parts;
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')), 
      decipher.final()
    ]);
    return decrypted.toString('utf8');
  } catch (error) {
    // Si falla el descifrado, retornar el dato original
    // (puede ser un dato antiguo no cifrado)
    console.warn('No se pudo descifrar el dato, retornando original:', error.message);
    return data;
  }
}

function encryptFields(obj, fields) {
  const copy = { ...obj };
  for (const field of fields) {
    if (copy[field]) copy[field] = encrypt(copy[field]);
  }
  return copy;
}

function decryptFields(obj, fields) {
  const copy = { ...obj };
  for (const field of fields) {
    if (copy[field]) {
      try {
        copy[field] = decrypt(copy[field]);
      } catch (error) {
        console.warn(`Error descifrando campo ${field}:`, error.message);
        // Mantener el valor original si falla
      }
    }
  }
  return copy;
}

module.exports = { encrypt, decrypt, encryptFields, decryptFields };
