const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const logger = require('../config/logger');
const { verificarToken, verificarRol } = require('../middleware/auth');
const { validar, profesionalSchema } = require('../middleware/validations');

// Aplicar autenticación a todas las rutas
router.use(verificarToken);

/**
 * GET /api/profesionales
 * Listar todos los profesionales con filtros
 */
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const { tipo_profesional, empresa_id, activo, modalidad } = req.query;
    
    let query = `
      SELECT p.*, 
             e.nombre as empresa_nombre,
             u.nombre_completo as creador_nombre
      FROM profesionales p
      LEFT JOIN empresas_prestadoras e ON p.empresa_id = e.id
      LEFT JOIN usuarios u ON p.usuario_creador_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (tipo_profesional) {
      query += ' AND p.tipo_profesional = ?';
      params.push(tipo_profesional);
    }
    
    if (empresa_id) {
      if (empresa_id === 'independiente') {
        query += ' AND p.empresa_id IS NULL';
      } else {
        query += ' AND p.empresa_id = ?';
        params.push(empresa_id);
      }
    }
    
    if (activo !== undefined) {
      query += ' AND p.activo = ?';
      params.push(activo === 'true' ? 1 : 0);
    }
    
    if (modalidad) {
      query += ' AND p.modalidad = ?';
      params.push(modalidad);
    }
    
    query += ' ORDER BY p.nombre_completo';
    
    const profesionales = await db.all(query, params);
    
    logger.info('Profesionales listados', {
      cantidad: profesionales.length,
      filtros: { tipo_profesional, empresa_id, activo, modalidad },
      usuario: req.usuario.email
    });
    
    res.json({
      profesionales,
      total: profesionales.length
    });
    
  } catch (error) {
    logger.error('Error listando profesionales', { error: error.message });
    res.status(500).json({ error: 'Error al obtener profesionales' });
  }
});

/**
 * GET /api/profesionales/:id
 * Obtener un profesional específico
 */
router.get('/:id', async (req, res) => {
  try {
     const db = getDB();
     const { id } = req.params;
    
    const profesional = await db.get(
      `SELECT p.*, 
              e.nombre as empresa_nombre,
              e.telefono as empresa_telefono,
              u.nombre_completo as creador_nombre
       FROM profesionales p
       LEFT JOIN empresas_prestadoras e ON p.empresa_id = e.id
       LEFT JOIN usuarios u ON p.usuario_creador_id = u.id
       WHERE p.id = ?`,
      [id]
    );
    
    if (!profesional) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }
    
    res.json({ profesional });
    
  } catch (error) {
    logger.error('Error obteniendo profesional', { error: error.message });
    res.status(500).json({ error: 'Error al obtener profesional' });
  }
});

/**
 * POST /api/profesionales
 * Crear nuevo profesional
 */
router.post(
  '/',
  verificarRol('admin', 'licenciado'),
  validar(profesionalSchema),
  async (req, res) => {
    try {
      const db = getDB();
      const datos = req.body;
      
      // Verificar que la empresa existe si se proporciona
      if (datos.empresa_id) {
        const empresa = await db.get(
          'SELECT id FROM empresas_prestadoras WHERE id = ?',
          [datos.empresa_id]
        );
        
        if (!empresa) {
          return res.status(404).json({ error: 'Empresa no encontrada' });
        }
      }
      
      const result = await db.run(
        `INSERT INTO profesionales (
          empresa_id, nombre_completo, tipo_profesional, matricula,
          especialidad, telefono, email, direccion, modalidad,
          honorarios_por_sesion, observaciones, usuario_creador_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          datos.empresa_id || null,
          datos.nombre_completo,
          datos.tipo_profesional,
          datos.matricula || null,
          datos.especialidad || null,
          datos.telefono || null,
          datos.email || null,
          datos.direccion || null,
          datos.modalidad || null,
          datos.honorarios_por_sesion || null,
          datos.observaciones || null,
          req.usuario.userId
        ]
      );
      
      await db.registrarAuditoria(
        'profesionales',
        result.lastID,
        'crear',
        req.usuario.userId,
        null,
        datos,
        req.ip
      );
      
      logger.info('Profesional creado', {
        profesionalId: result.lastID,
        nombre: datos.nombre_completo,
        tipo: datos.tipo_profesional,
        creadoPor: req.usuario.email
      });
      
      res.status(201).json({
        mensaje: 'Profesional creado exitosamente',
        id: result.lastID
      });
      
    } catch (error) {
      logger.error('Error creando profesional', { error: error.message });
      res.status(500).json({ error: 'Error al crear profesional' });
    }
  }
);

/**
 * PUT /api/profesionales/:id
 * Actualizar profesional
 */
router.put(
  '/:id',
  verificarRol('admin', 'licenciado'),
  validar(profesionalSchema),
  async (req, res) => {
    try {
      const db = getDB();
      const { id } = req.params;
      const datos = req.body;
      
      const datosAnteriores = await db.get(
        'SELECT * FROM profesionales WHERE id = ?',
        [id]
      );
      
      if (!datosAnteriores) {
        return res.status(404).json({ error: 'Profesional no encontrado' });
      }
      
      if (datos.empresa_id) {
        const empresa = await db.get(
          'SELECT id FROM empresas_prestadoras WHERE id = ?',
          [datos.empresa_id]
        );
        
        if (!empresa) {
          return res.status(404).json({ error: 'Empresa no encontrada' });
        }
      }
      
      await db.run(
        `UPDATE profesionales SET
          empresa_id = ?, nombre_completo = ?, tipo_profesional = ?, matricula = ?,
          especialidad = ?, telefono = ?, email = ?, direccion = ?, modalidad = ?,
          honorarios_por_sesion = ?, observaciones = ?
         WHERE id = ?`,
        [
          datos.empresa_id || null,
          datos.nombre_completo,
          datos.tipo_profesional,
          datos.matricula || null,
          datos.especialidad || null,
          datos.telefono || null,
          datos.email || null,
          datos.direccion || null,
          datos.modalidad || null,
          datos.honorarios_por_sesion || null,
          datos.observaciones || null,
          id
        ]
      );
      
      await db.registrarAuditoria(
        'profesionales',
        id,
        'actualizar',
        req.usuario.userId,
        datosAnteriores,
        datos,
        req.ip
      );
      
      logger.info('Profesional actualizado', {
        profesionalId: id,
        actualizadoPor: req.usuario.email
      });
      
      res.json({ mensaje: 'Profesional actualizado exitosamente' });
      
    } catch (error) {
      logger.error('Error actualizando profesional', { error: error.message });
      res.status(500).json({ error: 'Error al actualizar profesional' });
    }
  }
);

/**
 * PATCH /api/profesionales/:id/toggle
 * Activar/desactivar profesional
 */
router.patch(
  '/:id/toggle',
  verificarRol('admin', 'licenciado'),
  async (req, res) => {
    try {
      const db = getDB();
      const { id } = req.params;
      
      const profesional = await db.get(
        'SELECT activo FROM profesionales WHERE id = ?',
        [id]
      );
      
      if (!profesional) {
        return res.status(404).json({ error: 'Profesional no encontrado' });
      }
      
      const nuevoEstado = profesional.activo === 1 ? 0 : 1;
      
      await db.run(
        'UPDATE profesionales SET activo = ? WHERE id = ?',
        [nuevoEstado, id]
      );
      
      await db.registrarAuditoria(
        'profesionales',
        id,
        'actualizar',
        req.usuario.userId,
        { activo: profesional.activo },
        { activo: nuevoEstado },
        req.ip
      );
      
      logger.info('Estado de profesional cambiado', {
        profesionalId: id,
        nuevoEstado: nuevoEstado === 1 ? 'activo' : 'inactivo',
        cambiadoPor: req.usuario.email
      });
      
      res.json({
        mensaje: `Profesional ${nuevoEstado === 1 ? 'activado' : 'desactivado'} exitosamente`,
        activo: nuevoEstado
      });
      
    } catch (error) {
      logger.error('Error cambiando estado', { error: error.message });
      res.status(500).json({ error: 'Error al cambiar estado' });
    }
  }
);

/**
 * DELETE /api/profesionales/:id
 * Eliminar profesional (solo admin)
 */
router.delete(
  '/:id',
  verificarRol('admin'),
  async (req, res) => {
    try {
      const db = getDB();
      const { id } = req.params;
      
      const datosAnteriores = await db.get(
        'SELECT * FROM profesionales WHERE id = ?',
        [id]
      );
      
      if (!datosAnteriores) {
        return res.status(404).json({ error: 'Profesional no encontrado' });
      }
      
      await db.run('DELETE FROM profesionales WHERE id = ?', [id]);
      
      await db.registrarAuditoria(
        'profesionales',
        id,
        'eliminar',
        req.usuario.userId,
        datosAnteriores,
        null,
        req.ip
      );
      
      logger.warn('Profesional eliminado', {
        profesionalId: id,
        eliminadoPor: req.usuario.email
      });
      
      res.json({ mensaje: 'Profesional eliminado exitosamente' });
      
    } catch (error) {
      logger.error('Error eliminando profesional', { error: error.message });
      res.status(500).json({ error: 'Error al eliminar profesional' });
    }
  }
);

/**
 * GET /api/profesionales/tipos/lista
 * Obtener lista de tipos de profesionales
 */
router.get('/tipos/lista', (req, res) => {
  const tipos = [
    { valor: 'medico', nombre: 'Médico' },
    { valor: 'enfermero', nombre: 'Enfermero/a' },
    { valor: 'kinesiologo', nombre: 'Kinesiólogo/a' },
    { valor: 'terapeuta_ocupacional', nombre: 'Terapeuta Ocupacional' },
    { valor: 'fonoaudiologo', nombre: 'Fonoaudiólogo/a' },
    { valor: 'psicologo', nombre: 'Psicólogo/a' },
    { valor: 'nutricionista', nombre: 'Nutricionista' },
    { valor: 'otro', nombre: 'Otro' }
  ];
  
  res.json({ tipos });
});

module.exports = router;
