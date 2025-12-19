const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../config/database');
const { verificarToken, verificarRol } = require('../middleware/auth');
const logger = require('../config/logger');
const { loginLimiter } = require('../middleware/rateLimiter');
const { validar, usuarioLoginSchema, usuarioCrearSchema } = require('../middleware/validations');

const router = express.Router();

function generarToken(usuario) {
  return jwt.sign(
    { 
      id: usuario.id, 
      email: usuario.email, 
      rol: usuario.rol
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: '8h',
      issuer: 'gestion-ido',
      audience: 'gestion-ido-users'
    }
  );
}

// 🔐 Login (CON VALIDACIÓN)
router.post('/login', loginLimiter, validar(usuarioLoginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const db = getDB();
    const usuario = await db.get(
      'SELECT * FROM usuarios WHERE email = ? AND activo = 1', 
      [email.toLowerCase().trim()]
    );

    if (!usuario) {
      // Log sin exponer si el usuario existe o no
      logger.warn('Intento de login fallido', { 
        email: email.substring(0, 3) + '***',
        ip: req.ip 
      });
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const coincide = await bcrypt.compare(password, usuario.password);
    
    if (!coincide) {
      logger.warn('Contraseña incorrecta', { 
        userId: usuario.id,
        ip: req.ip 
      });
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Actualizar último acceso
    await db.run(
      'UPDATE usuarios SET ultimo_acceso = datetime("now", "localtime") WHERE id = ?', 
      [usuario.id]
    );

    const token = generarToken(usuario);

    // Log exitoso (sin datos sensibles)
    logger.info('Login exitoso', { 
      userId: usuario.id, 
      rol: usuario.rol,
      ip: req.ip
    });

    res.json({ 
      token, 
      usuario: { 
        id: usuario.id, 
        nombre: usuario.nombre_completo, 
        email: usuario.email,
        rol: usuario.rol 
      } 
    });

  } catch (error) {
    logger.error('Error en login', { 
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

// 👥 Registro (CON VALIDACIÓN FUERTE)
router.post(
  '/register', 
  verificarToken, 
  verificarRol('admin'),
  validar(usuarioCrearSchema),
  async (req, res) => {
    try {
      const { nombre_completo, email, password, rol } = req.body;

      const db = getDB();

      // Verificar email único
      const usuarioExistente = await db.get(
        'SELECT id FROM usuarios WHERE email = ?', 
        [email.toLowerCase().trim()]
      );

      if (usuarioExistente) {
        return res.status(409).json({ 
          error: 'El email ya está registrado' 
        });
      }

      // Hash con bcrypt (costo 12 para más seguridad)
      const hashed = await bcrypt.hash(password, 12);

      const result = await db.run(
        `INSERT INTO usuarios (nombre_completo, email, password, rol) 
         VALUES (?, ?, ?, ?)`,
        [nombre_completo, email.toLowerCase().trim(), hashed, rol]
      );

      // Auditoría
      await db.registrarAuditoria(
        'usuarios',
        result.lastID,
        'crear',
        req.usuario.id,
        null,
        { nombre_completo, email, rol },
        req.ip
      );

      logger.info('Usuario registrado', { 
        nuevoUsuarioId: result.lastID,
        rol,
        createdBy: req.usuario.id
      });

      res.status(201).json({ 
        mensaje: 'Usuario registrado correctamente',
        id: result.lastID
      });

    } catch (error) {
      logger.error('Error en registro', { 
        error: error.message,
        createdBy: req.usuario?.id
      });
      res.status(500).json({ error: 'Error al registrar usuario' });
    }
  }
);

// 🗑 Eliminar usuario (solo admin)
router.delete(
  '/usuarios/:id', 
  verificarToken, 
  verificarRol('admin'), 
  async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDB();

      // Validar que sea un número
      if (isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({ error: 'ID inválido' });
      }

      // No permitir eliminar el propio usuario
      if (parseInt(id) === req.usuario.id) {
        return res.status(403).json({ 
          error: 'No puedes eliminar tu propio usuario' 
        });
      }

      // Obtener datos antes de eliminar
      const usuarioAEliminar = await db.get(
        'SELECT id, nombre_completo, email, rol FROM usuarios WHERE id = ?',
        [id]
      );

      if (!usuarioAEliminar) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Prevenir eliminación del último admin
      if (usuarioAEliminar.rol === 'admin') {
        const adminCount = await db.get(
          'SELECT COUNT(*) as total FROM usuarios WHERE rol = "admin" AND activo = 1'
        );

        if (adminCount.total <= 1) {
          return res.status(403).json({ 
            error: 'No se puede eliminar el último administrador' 
          });
        }
      }

      // Soft delete (mejor que hard delete)
      const result = await db.run(
        'UPDATE usuarios SET activo = 0 WHERE id = ?',
        [id]
      );

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Auditoría
      await db.registrarAuditoria(
        'usuarios',
        id,
        'eliminar',
        req.usuario.id,
        usuarioAEliminar,
        null,
        req.ip
      );

      logger.info('Usuario desactivado', { 
        usuarioId: id,
        eliminadoPor: req.usuario.id
      });

      res.json({ mensaje: 'Usuario desactivado correctamente' });

    } catch (error) {
      logger.error('Error al eliminar usuario', { 
        error: error.message,
        eliminadoPor: req.usuario?.id
      });
      res.status(500).json({ error: 'Error al eliminar usuario' });
    }
  }
);
// 🔄 Reactivar usuario (solo admin)
router.patch('/usuarios/:id/reactivar', verificarToken, verificarRol('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();

    if (isNaN(id) || parseInt(id) <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    if (parseInt(id) === req.usuario.id) {
      return res.status(403).json({ 
        error: 'No puedes cambiar el estado de tu propia cuenta' 
      });
    }

    const result = await db.run(
      'UPDATE usuarios SET activo = 1 WHERE id = ?',
      [id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await db.registrarAuditoria(
      'usuarios',
      id,
      'reactivar',
      req.usuario.id,
      null,
      { reactivado: true }
    );

    logger.info('Usuario reactivado', { 
      usuarioId: id,
      reactivadoPor: req.usuario.id
    });
    
    res.json({ mensaje: 'Usuario reactivado correctamente' });

  } catch (error) {
    logger.error('Error al reactivar usuario', { error: error.message });
    res.status(500).json({ error: 'Error al reactivar usuario' });
  }
});

// 🔍 Verificar token
router.get('/verify', verificarToken, (req, res) => {
  res.json({ 
    valido: true,
    usuario: { 
      id: req.usuario.id, 
      email: req.usuario.email, 
      rol: req.usuario.rol 
    } 
  });
});

// 🚪 Logout
router.post('/logout', verificarToken, (req, res) => {
  logger.info('Logout', { userId: req.usuario.id });
  res.json({ mensaje: 'Sesión cerrada correctamente' });
});

// 👤 Obtener datos del usuario actual
router.get('/me', verificarToken, async (req, res) => {
  try {
    const db = getDB();
    const usuario = await db.get(
      `SELECT id, nombre_completo as nombre, email, rol, ultimo_acceso 
       FROM usuarios WHERE id = ? AND activo = 1`,
      [req.usuario.id]
    );

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ usuario });

  } catch (error) {
    logger.error('Error en /me', { 
      error: error.message,
      userId: req.usuario.id
    });
    res.status(500).json({ error: 'Error al obtener datos del usuario' });
  }
});
// 👥 Listar usuarios (solo admin)
router.get('/usuarios', verificarToken, verificarRol('admin'), async (req, res) => {
  try {
    const db = getDB();
    const { estado } = req.query; // activo, inactivo, todos
    
    let query = `SELECT id, nombre_completo as nombre, email, rol, activo, ultimo_acceso 
                 FROM usuarios`;
    let params = [];
    
    // Filtrar por estado
    if (estado === 'activo') {
      query += ' WHERE activo = 1';
    } else if (estado === 'inactivo') {
      query += ' WHERE activo = 0';
    }
    // Si estado === 'todos' o no se especifica, mostrar todos
    
    query += ' ORDER BY activo DESC, id DESC';
    
    const usuarios = await db.all(query, params);

    res.json({ 
      success: true,
      count: usuarios.length,
      usuarios 
    });

  } catch (error) {
    logger.error('Error al obtener usuarios', { 
      error: error.message,
      requestBy: req.usuario.id
    });
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

module.exports = router;