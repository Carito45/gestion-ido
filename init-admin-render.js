const bcrypt = require('bcryptjs');
const { initDB } = require('./config/database');
require('dotenv').config();

async function crearAdmin() {
  const db = await initDB();
  const hash = await bcrypt.hash('Demo2026!', 10);
  await db.run(
    `INSERT INTO usuarios (nombre_completo, email, password, rol, activo)
     VALUES (?, ?, ?, 'admin', 1)`,
    ['Admin IDO', 'adminIdo@demo.com', hash]
  );
  console.log('✅ Admin creado OK');
}

module.exports = crearAdmin;
