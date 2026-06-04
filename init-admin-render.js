const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbPath = path.join(__dirname, process.env.DB_NAME || 'gestion_ido.db');
const db = new sqlite3.Database(dbPath);

bcrypt.hash('Demo2026!', 10).then(hash => {
  db.run(
    `INSERT INTO usuarios (nombre_completo, email, password, rol, activo)
     VALUES (?, ?, ?, 'admin', 1)`,
    ['Admin IDO', 'adminIdo@demo.com', hash],
    function(err) {
      if (err) console.error('Error:', err.message);
      else console.log('Admin creado OK, id:', this.lastID);
      db.close();
    }
  );
});
