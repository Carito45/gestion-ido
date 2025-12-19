const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const logger = require('../config/logger');
const { verificarToken, verificarRol } = require('../middleware/auth');

// Aplicar autenticación a todas las rutas
router.use(verificarToken);

/**
 * GET /api/nomenclador
 * Listar todas las prestaciones del nomenclador
 */
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const { tipo_prestacion, obra_social, vigente } = req.query;
    
    let query = `
      SELECT 
        n.*,
        u.nombre_completo as creador_nombre
      FROM nomenclador n
      LEFT JOIN usuarios u ON n.usuario_creador_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (tipo_prestacion) {
      query += ' AND n.tipo_prestacion = ?';
      params.push(tipo_prestacion);
    }
    
    if (obra_social) {
      query += ' AND (n.obra_social IS NULL OR n.obra_social = ?)';
      params.push(obra_social);
    }
    
    if (vigente !== undefined) {
      query += ' AND n.vigente = ?';
      params.push(vigente === 'true' || vigente === '1' ? 1 : 0);
    }
    
    query += ' ORDER BY n.tipo_prestacion, n.codigo';
    
    const prestaciones = await db.all(query, params);
    
    logger.info('Nomenclador listado', {
      cantidad: prestaciones.length,
      filtros: req.query,
      usuario: req.usuario.email
    });
    
    res.json({ 
      total: prestaciones.length,
      prestaciones 
    });
    
  } catch (error) {
    logger.error('Error listando nomenclador', { error: error.message });
    res.status(500).json({ 
      error: 'Error al listar nomenclador',
      detalles: error.message 
    });
  }
});

/**
 * GET /api/nomenclador/:id
 * Obtener una prestación específica
 */
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    
    const prestacion = await db.get(
      `SELECT 
        n.*,
        u.nombre_completo as creador_nombre
      FROM nomenclador n
      LEFT JOIN usuarios u ON n.usuario_creador_id = u.id
      WHERE n.id = ?`,
      [id]
    );
    
    if (!prestacion) {
      return res.status(404).json({ error: 'Prestación no encontrada' });
    }
    
    res.json(prestacion);
    
  } catch (error) {
    logger.error('Error obteniendo prestación', { error: error.message });
    res.status(500).json({ 
      error: 'Error al obtener prestación',
      detalles: error.message 
    });
  }
});

/**
 * POST /api/nomenclador
 * Crear nueva prestación (solo admin)
 */
router.post('/', verificarRol(['admin']), async (req, res) => {
  try {
    const db = getDB();
    const {
      codigo,
      descripcion,
      tipo_prestacion,
      precio_unitario,
      unidad,
      obra_social,
      observaciones,
      fecha_desde,
      fecha_hasta
    } = req.body;
    
    // Validaciones
    if (!codigo || !descripcion || !tipo_prestacion || !precio_unitario) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: codigo, descripcion, tipo_prestacion, precio_unitario' 
      });
    }
    
    // Verificar que el código no exista
    const existe = await db.get(
      'SELECT id FROM nomenclador WHERE codigo = ?',
      [codigo]
    );
    
    if (existe) {
      return res.status(400).json({ 
        error: 'Ya existe una prestación con ese código' 
      });
    }
    
    const result = await db.run(
      `INSERT INTO nomenclador (
        codigo, descripcion, tipo_prestacion, precio_unitario,
        unidad, obra_social, observaciones, fecha_desde, fecha_hasta,
        usuario_creador_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo.toUpperCase(),
        descripcion,
        tipo_prestacion,
        parseFloat(precio_unitario),
        unidad || 'unidad',
        obra_social || null,
        observaciones || null,
        fecha_desde || new Date().toISOString().split('T')[0],
        fecha_hasta || null,
        req.usuario.userId
      ]
    );
    
    await db.registrarAuditoria(
      'nomenclador',
      result.lastID,
      'crear',
      req.usuario.userId,
      null,
      { codigo, descripcion, precio_unitario },
      req.ip
    );
    
    logger.info('Prestación creada', {
      id: result.lastID,
      codigo,
      descripcion,
      usuario: req.usuario.email
    });
    
    res.status(201).json({
      mensaje: 'Prestación creada exitosamente',
      id: result.lastID
    });
    
  } catch (error) {
    logger.error('Error creando prestación', { error: error.message });
    res.status(500).json({ 
      error: 'Error al crear prestación',
      detalles: error.message 
    });
  }
});

/**
 * PUT /api/nomenclador/:id
 * Actualizar prestación (solo admin)
 */
router.put('/:id', verificarRol(['admin']), async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const {
      codigo,
      descripcion,
      tipo_prestacion,
      precio_unitario,
      unidad,
      obra_social,
      vigente,
      observaciones,
      fecha_desde,
      fecha_hasta
    } = req.body;
    
    const prestacionAnterior = await db.get(
      'SELECT * FROM nomenclador WHERE id = ?',
      [id]
    );
    
    if (!prestacionAnterior) {
      return res.status(404).json({ error: 'Prestación no encontrada' });
    }
    
    // Verificar código duplicado (excepto el mismo registro)
    if (codigo && codigo !== prestacionAnterior.codigo) {
      const existe = await db.get(
        'SELECT id FROM nomenclador WHERE codigo = ? AND id != ?',
        [codigo, id]
      );
      
      if (existe) {
        return res.status(400).json({ 
          error: 'Ya existe otra prestación con ese código' 
        });
      }
    }
    
    await db.run(
      `UPDATE nomenclador SET
        codigo = ?,
        descripcion = ?,
        tipo_prestacion = ?,
        precio_unitario = ?,
        unidad = ?,
        obra_social = ?,
        vigente = ?,
        observaciones = ?,
        fecha_desde = ?,
        fecha_hasta = ?
      WHERE id = ?`,
      [
        codigo ? codigo.toUpperCase() : prestacionAnterior.codigo,
        descripcion || prestacionAnterior.descripcion,
        tipo_prestacion || prestacionAnterior.tipo_prestacion,
        precio_unitario ? parseFloat(precio_unitario) : prestacionAnterior.precio_unitario,
        unidad || prestacionAnterior.unidad,
        obra_social !== undefined ? obra_social : prestacionAnterior.obra_social,
        vigente !== undefined ? (vigente ? 1 : 0) : prestacionAnterior.vigente,
        observaciones !== undefined ? observaciones : prestacionAnterior.observaciones,
        fecha_desde || prestacionAnterior.fecha_desde,
        fecha_hasta !== undefined ? fecha_hasta : prestacionAnterior.fecha_hasta,
        id
      ]
    );
    
    await db.registrarAuditoria(
      'nomenclador',
      id,
      'actualizar',
      req.usuario.userId,
      prestacionAnterior,
      req.body,
      req.ip
    );
    
    logger.info('Prestación actualizada', {
      id,
      codigo: codigo || prestacionAnterior.codigo,
      usuario: req.usuario.email
    });
    
    res.json({ mensaje: 'Prestación actualizada exitosamente' });
    
  } catch (error) {
    logger.error('Error actualizando prestación', { error: error.message });
    res.status(500).json({ 
      error: 'Error al actualizar prestación',
      detalles: error.message 
    });
  }
});

/**
 * DELETE /api/nomenclador/:id
 * Eliminar prestación (solo admin)
 */
router.delete('/:id', verificarRol(['admin']), async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    
    const prestacion = await db.get(
      'SELECT * FROM nomenclador WHERE id = ?',
      [id]
    );
    
    if (!prestacion) {
      return res.status(404).json({ error: 'Prestación no encontrada' });
    }
    
    // Verificar si está siendo usada en facturas
    const enUso = await db.get(
      `SELECT COUNT(*) as count FROM factura_items 
       WHERE descripcion LIKE ?`,
      [`%${prestacion.descripcion}%`]
    );
    
    if (enUso.count > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar. La prestación está siendo usada en facturas.',
        facturas_afectadas: enUso.count
      });
    }
    
    await db.run('DELETE FROM nomenclador WHERE id = ?', [id]);
    
    await db.registrarAuditoria(
      'nomenclador',
      id,
      'eliminar',
      req.usuario.userId,
      prestacion,
      null,
      req.ip
    );
    
    logger.info('Prestación eliminada', {
      id,
      codigo: prestacion.codigo,
      usuario: req.usuario.email
    });
    
    res.json({ mensaje: 'Prestación eliminada exitosamente' });
    
  } catch (error) {
    logger.error('Error eliminando prestación', { error: error.message });
    res.status(500).json({ 
      error: 'Error al eliminar prestación',
      detalles: error.message 
    });
  }
});

/**
 * PATCH /api/nomenclador/:id/toggle
 * Activar/desactivar prestación (solo admin)
 */
router.patch('/:id/toggle', verificarRol(['admin']), async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    
    const prestacion = await db.get(
      'SELECT * FROM nomenclador WHERE id = ?',
      [id]
    );
    
    if (!prestacion) {
      return res.status(404).json({ error: 'Prestación no encontrada' });
    }
    
    const nuevoEstado = prestacion.vigente ? 0 : 1;
    
    await db.run(
      'UPDATE nomenclador SET vigente = ? WHERE id = ?',
      [nuevoEstado, id]
    );
    
    await db.registrarAuditoria(
      'nomenclador',
      id,
      'actualizar',
      req.usuario.userId,
      { vigente: prestacion.vigente },
      { vigente: nuevoEstado },
      req.ip
    );
    
    logger.info('Estado de prestación actualizado', {
      id,
      codigo: prestacion.codigo,
      vigente: nuevoEstado,
      usuario: req.usuario.email
    });
    
    res.json({ 
      mensaje: `Prestación ${nuevoEstado ? 'activada' : 'desactivada'} exitosamente`,
      vigente: nuevoEstado
    });
    
  } catch (error) {
    logger.error('Error cambiando estado', { error: error.message });
    res.status(500).json({ 
      error: 'Error al cambiar estado',
      detalles: error.message 
    });
  }
});

/**
 * GET /api/nomenclador/por-tipo/:tipo
 * Obtener prestaciones por tipo (para usar en generación de facturas)
 */
router.get('/por-tipo/:tipo', async (req, res) => {
  try {
    const db = getDB();
    const { tipo } = req.params;
    
    const prestaciones = await db.all(
      `SELECT * FROM nomenclador 
       WHERE tipo_prestacion = ? AND vigente = 1
       ORDER BY codigo`,
      [tipo]
    );
    
    res.json(prestaciones);
    
  } catch (error) {
    logger.error('Error obteniendo prestaciones por tipo', { error: error.message });
    res.status(500).json({ 
      error: 'Error al obtener prestaciones',
      detalles: error.message 
    });
  }
});

module.exports = router;
