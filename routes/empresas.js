const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const logger = require('../config/logger');
const { verificarToken, verificarRol } = require('../middleware/auth');
const { validar, empresaSchema } = require('../middleware/validations');

// Aplicar autenticación a todas las rutas
router.use(verificarToken);

/**
 * GET /api/empresas
 * Listar todas las empresas prestadoras con filtros
 */
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const { estado, buscar } = req.query;
    
    let query = 'SELECT * FROM empresas_prestadoras WHERE 1=1';
    const params = [];
    
    // Filtro por estado
    if (estado) {
      query += ' AND estado = ?';
      params.push(estado);
    }
    
    // Búsqueda general
    if (buscar) {
      query += ' AND (nombre LIKE ? OR cuit LIKE ? OR email LIKE ?)';
      const searchTerm = `%${buscar}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ' ORDER BY nombre';
    
    const empresas = await db.all(query, params);
    
    logger.info('Empresas listadas', { 
      cantidad: empresas.length,
      filtros: { estado, buscar },
      usuario: req.usuario.email
    });
    
    res.json({ 
      empresas,
      total: empresas.length
    });
    
  } catch (error) {
    logger.error('Error listando empresas', { error: error.message });
    res.status(500).json({ error: 'Error al obtener empresas' });
  }
});

/**
 * GET /api/empresas/:id
 * Obtener una empresa específica con sus afiliados
 */
router.get('/:id', async (req, res) => {
  try {
     const db = getDB();
     const { id } = req.params;
    
    const empresa = await db.get(
      'SELECT * FROM empresas_prestadoras WHERE id = ?',
      [id]
    );
    
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }
    
    // Obtener afiliados asociados
    const afiliados = await db.all(
      `SELECT id, nombre_completo, dni, numero_afiliado, estado, fecha_ingreso
       FROM afiliados
       WHERE prestador_id = ?
       ORDER BY fecha_registro DESC`,
      [id]
    );
    
    logger.info('Empresa consultada', { 
      empresaId: id,
      usuario: req.usuario.email
    });
    
    res.json({ 
      empresa,
      afiliados,
      totalAfiliados: afiliados.length,
      afiliadosActivos: afiliados.filter(a => a.estado === 'activo').length
    });
    
  } catch (error) {
    logger.error('Error obteniendo empresa', { 
      error: error.message,
      id: req.params.id
    });
    res.status(500).json({ error: 'Error al obtener empresa' });
  }
});

/**
 * POST /api/empresas
 * Crear nueva empresa (solo admin y licenciado)
 */
router.post(
  '/',
  verificarRol('admin', 'licenciado'),
  validar(empresaSchema),
  async (req, res) => {
    try {
      const db = getDB();
      const datos = req.body;
      
      const result = await db.run(
        `INSERT INTO empresas_prestadoras (
          nombre, cuit, telefono, email, direccion,
          servicios_ofrecidos, estado, observaciones
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          datos.nombre, datos.cuit, datos.telefono,
          datos.email, datos.direccion, datos.servicios_ofrecidos,
          datos.estado || 'activa', datos.observaciones
        ]
      );
      
      await db.registrarAuditoria(
        'empresas_prestadoras',
        result.lastID,
        'crear',
        req.usuario.userId,
        null,
        datos,
        req.ip
      );
      
      logger.info('Empresa creada', {
        empresaId: result.lastID,
        nombre: datos.nombre,
        creadoPor: req.usuario.email
      });
      
      res.status(201).json({
        mensaje: 'Empresa creada exitosamente',
        id: result.lastID
      });
      
    } catch (error) {
      if (error.message.includes('UNIQUE constraint')) {
        return res.status(400).json({
          error: 'Ya existe una empresa con ese CUIT'
        });
      }
      logger.error('Error creando empresa', { error: error.message });
      res.status(500).json({ error: 'Error al crear empresa' });
    }
  }
);

/**
 * PUT /api/empresas/:id
 * Actualizar empresa (solo admin y licenciado)
 */
router.put(
  '/:id',
  verificarRol('admin', 'licenciado'),
  validar(empresaSchema),
  async (req, res) => {
    try {
      const db = getDB();
      const { id } = req.params;
      const datos = req.body;
      
      // Obtener datos anteriores para auditoría
      const datosAnteriores = await db.get(
        'SELECT * FROM empresas_prestadoras WHERE id = ?',
        [id]
      );
      
      if (!datosAnteriores) {
        return res.status(404).json({ error: 'Empresa no encontrada' });
      }
      
      const result = await db.run(
        `UPDATE empresas_prestadoras SET
          nombre = ?, cuit = ?, telefono = ?, email = ?, direccion = ?,
          servicios_ofrecidos = ?, estado = ?, observaciones = ?
         WHERE id = ?`,
        [
          datos.nombre, datos.cuit, datos.telefono,
          datos.email, datos.direccion, datos.servicios_ofrecidos,
          datos.estado || 'activa', datos.observaciones, id
        ]
      );
      
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Empresa no encontrada' });
      }
      
      await db.registrarAuditoria(
        'empresas_prestadoras',
        id,
        'actualizar',
        req.usuario.userId,
        datosAnteriores,
        datos,
        req.ip
      );
      
      logger.info('Empresa actualizada', {
        empresaId: id,
        actualizadoPor: req.usuario.email
      });
      
      res.json({ mensaje: 'Empresa actualizada exitosamente' });
      
    } catch (error) {
      if (error.message.includes('UNIQUE constraint')) {
        return res.status(400).json({
          error: 'Ya existe una empresa con ese CUIT'
        });
      }
      logger.error('Error actualizando empresa', { 
        error: error.message,
        id: req.params.id
      });
      res.status(500).json({ error: 'Error al actualizar empresa' });
    }
  }
);

/**
 * DELETE /api/empresas/:id
 * Eliminar empresa (solo admin)
 */
router.delete(
  '/:id',
  verificarRol('admin'),
  async (req, res) => {
    try {
      const db = getDB();
      const { id } = req.params;
      
      // Verificar si tiene afiliados asociados
      const afiliadosAsociados = await db.get(
        'SELECT COUNT(*) as count FROM afiliados WHERE prestador_id = ?',
        [id]
      );
      
      if (afiliadosAsociados.count > 0) {
        return res.status(400).json({
          error: `No se puede eliminar la empresa porque tiene ${afiliadosAsociados.count} afiliado(s) asociado(s)`,
          afiliadosCount: afiliadosAsociados.count
        });
      }
      
      const datosAnteriores = await db.get(
        'SELECT * FROM empresas_prestadoras WHERE id = ?',
        [id]
      );
      
      if (!datosAnteriores) {
        return res.status(404).json({ error: 'Empresa no encontrada' });
      }
      
      await db.run('DELETE FROM empresas_prestadoras WHERE id = ?', [id]);
      
      await db.registrarAuditoria(
        'empresas_prestadoras',
        id,
        'eliminar',
        req.usuario.id,
        datosAnteriores,
        null,
        req.ip
      );
      
      logger.warn('Empresa eliminada', {
        empresaId: id,
        eliminadoPor: req.usuario.email,
        datos: datosAnteriores
      });
      
      res.json({ mensaje: 'Empresa eliminada exitosamente' });
      
    } catch (error) {
      logger.error('Error eliminando empresa', { 
        error: error.message,
        id: req.params.id
      });
      res.status(500).json({ error: 'Error al eliminar empresa' });
    }
  }
);

module.exports = router;
