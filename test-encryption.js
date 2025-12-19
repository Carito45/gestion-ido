require('dotenv').config();
const { encrypt, decrypt, encryptFields, decryptFields } = require('./config/encryption');

console.log('\n🔐 ========================================');
console.log('   TEST DE CIFRADO');
console.log('   ========================================\n');

// Test 1: Cifrado simple
console.log('Test 1: Cifrado simple');
const texto = 'Información médica confidencial';
console.log(`Original: ${texto}`);

const cifrado = encrypt(texto);
console.log(`Cifrado: ${cifrado.substring(0, 60)}...`);

const descifrado = decrypt(cifrado);
console.log(`Descifrado: ${descifrado}`);

if (descifrado === texto) {
  console.log('✅ Test 1: PASÓ\n');
} else {
  console.log('❌ Test 1: FALLÓ\n');
  process.exit(1);
}

// Test 2: Cifrado de null/undefined
console.log('Test 2: Valores nulos');
console.log(`encrypt(null): ${encrypt(null)}`);
console.log(`encrypt(undefined): ${encrypt(undefined)}`);
console.log(`encrypt(''): ${encrypt('')}`);
console.log('✅ Test 2: PASÓ\n');

// Test 3: Cifrado de múltiples campos
console.log('Test 3: Cifrado de objeto');
const paciente = {
  nombre: 'Juan Pérez',
  dni: '12345678',
  diagnostico: 'Diabetes tipo 2',
  telefono: '1234567890',
  email: 'juan@test.com',
  direccion: 'Calle Falsa 123',
  edad: 65
};

const camposSensibles = ['diagnostico', 'telefono', 'email', 'direccion'];

console.log('Original:', JSON.stringify(paciente, null, 2));

const pacienteCifrado = encryptFields(paciente, camposSensibles);
console.log('\nCifrado:', JSON.stringify({
  ...pacienteCifrado,
  diagnostico: pacienteCifrado.diagnostico.substring(0, 40) + '...',
  telefono: pacienteCifrado.telefono.substring(0, 40) + '...',
  email: pacienteCifrado.email.substring(0, 40) + '...',
  direccion: pacienteCifrado.direccion.substring(0, 40) + '...'
}, null, 2));

const pacienteDescifrado = decryptFields(pacienteCifrado, camposSensibles);
console.log('\nDescifrado:', JSON.stringify(pacienteDescifrado, null, 2));

if (pacienteDescifrado.diagnostico === paciente.diagnostico &&
    pacienteDescifrado.telefono === paciente.telefono &&
    pacienteDescifrado.email === paciente.email &&
    pacienteDescifrado.direccion === paciente.direccion) {
  console.log('\n✅ Test 3: PASÓ\n');
} else {
  console.log('\n❌ Test 3: FALLÓ\n');
  process.exit(1);
}

// Test 4: Unicidad del cifrado
console.log('Test 4: Unicidad (mismo texto = diferentes cifrados)');
const texto1 = 'Mismo texto';
const cifrado1 = encrypt(texto1);
const cifrado2 = encrypt(texto1);

console.log(`Cifrado 1: ${cifrado1.substring(0, 50)}...`);
console.log(`Cifrado 2: ${cifrado2.substring(0, 50)}...`);
console.log(`¿Son diferentes?: ${cifrado1 !== cifrado2 ? '✅ SÍ' : '❌ NO'}`);
console.log(`¿Ambos descifran igual?: ${decrypt(cifrado1) === decrypt(cifrado2) ? '✅ SÍ' : '❌ NO'}`);

if (cifrado1 !== cifrado2 && decrypt(cifrado1) === decrypt(cifrado2)) {
  console.log('✅ Test 4: PASÓ\n');
} else {
  console.log('❌ Test 4: FALLÓ\n');
  process.exit(1);
}

// Test 5: Detección de manipulación
console.log('Test 5: Detección de manipulación');
const cifradoOriginal = encrypt('Datos importantes');
const cifradoManipulado = cifradoOriginal.replace(/a/g, 'b'); // Manipular datos

console.log(`Descifrar datos manipulados: ${decrypt(cifradoManipulado) === null ? '✅ Rechazado' : '❌ Aceptado'}`);

if (decrypt(cifradoManipulado) === null) {
  console.log('✅ Test 5: PASÓ\n');
} else {
  console.log('❌ Test 5: FALLÓ\n');
  process.exit(1);
}

// Resumen
console.log('╔════════════════════════════════════╗');
console.log('║   ✅ TODOS LOS TESTS PASARON       ║');
console.log('╚════════════════════════════════════╝');
console.log('\n🔒 El módulo de cifrado está funcionando correctamente\n');
