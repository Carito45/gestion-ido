const bcrypt = require('bcryptjs');

async function crearAdminInicial(db) {
  const email = process.env.ADMIN_EMAIL.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const nombre = 'Admin IDO';

  if (!email || !password) {
    console.log('⚠️ ADMIN_EMAIL o ADMIN_PASSWORD no definidas, omitiendo creación de admin.');
    return;
  }

  const existe = await db.get('SELECT id FROM usuarios WHERE email = ?', [email]);
  if (existe) {
    console.log('✅ Admin ya existe, omitiendo creación.');
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  await db.run(
    `INSERT INTO usuarios (nombre_completo, email, password, rol, activo)
     VALUES (?, ?, ?, 'admin', 1)`,
    [nombre, email, hash]
  );
  console.log('✅ Admin inicial creado:', email);
}

module.exports = crearAdminInicial;
