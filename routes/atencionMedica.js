const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const logger = require('../config/logger');
const { verificarToken, verificarRol } = require('../middleware/auth');
const { validar, atencionMedicaSchema } = require('../middleware/validations');

// Aplicar autenticación a todas las rutas
router.use(verificarToken);

/**
 * GET /api/atencion-medica/afiliado/:afiliadoId
 * Obtener histórico de atención médica de un afiliado
 */
router.get('/afiliado/:afiliadoId', async (req, res) => {
  try {
    const db = getDB();
    const { afiliadoId } = req.params;
    const { anio } = req.query;
    
    // Verificar que el afiliado existe
    const afiliado = await db.get(
      'SELECT id, nombre_completo FROM afiliados WHERE id = ?',
      [afiliadoId]
    );
    
    if (!afiliado) {
      return res.status(404).json({ error: 'Afiliado no encontrado' });
    }
    
    let query = `
      SELECT a.*, u.nombre_completo as usuario_nombre
      FROM atencion_medica a
      LEFT JOIN usuarios u ON a.usuario_registro_id = u.id
      WHERE a.afiliado_id = ?
    `;
    const params = [afiliadoId];
    
    // Filtro por año
    if (anio) {
      query += ' AND a.anio = ?';
      params.push(anio);
    }
    
    query += ' ORDER BY a.anio DESC, a.mes DESC';
    
    const registros = await db.all(query, params);
    
    logger.info('Atención médica consultada', {
      afiliadoId,
      cantidad: registros.length,
      anio,
      usuario: req.usuario.email
    });
    
    res.json({ 
      registros,
      afiliado: afiliado.nombre_completo,
      total: registros.length
    });
    
  } catch (error) {
    logger.error('Error obteniendo atención médica', { error: error.message });
    res.status(500).json({ error: 'Error al obtener registros' });
  }
});

/**
 * GET /api/atencion-medica/:id
 * Obtener un registro específico
 */
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    
    const registro = await db.get(
      `SELECT a.*, af.nombre_completo as afiliado_nombre, u.nombre_completo as usuario_nombre
       FROM atencion_medica a
       LEFT JOIN afiliados af ON a.afiliado_id = af.id
       LEFT JOIN usuarios u ON a.usuario_registro_id = u.id
       WHERE a.id = ?`,
      [id]
    );
    
    if (!registro) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    
    res.json({ registro });
    
  } catch (error) {
    logger.error('Error obteniendo registro', { error: error.message });
    res.status(500).json({ error: 'Error al obtener registro' });
  }
});

/**
 * POST /api/atencion-medica
 * Crear nuevo registro de atención médica
 */
router.post(
  '/',
  verificarRol('admin', 'medico', 'licenciado'),
  validar(atencionMedicaSchema),
  async (req, res) => {
    try {
     const db = getDB();
     const datos = req.body;
      
      // Verificar que el afiliado existe
      const afiliado = await db.get(
        'SELECT id FROM afiliados WHERE id = ?',
        [datos.afiliado_id]
      );
      
      if (!afiliado) {
        return res.status(404).json({ error: 'Afiliado no encontrado' });
      }
      
      // Verificar si ya existe registro para ese mes/año
      const registroExistente = await db.get(
        'SELECT id FROM atencion_medica WHERE afiliado_id = ? AND mes = ? AND anio = ?',
        [datos.afiliado_id, datos.mes, datos.anio]
      );
      
      if (registroExistente) {
        return res.status(400).json({ 
          error: 'Ya existe un registro para este afiliado en el mes/año indicado' 
        });
      }
      
      const result = await db.run(
        `INSERT INTO atencion_medica (
          afiliado_id, mes, anio, atencion_medica_mensual,
          hs_enfermeria_semanal, ktm_sesiones_semanal, ktr_sesiones_semanal,
          cuidados_domiciliarios_hs_mensual, especialidades_medicas_mensual,
          observaciones, usuario_registro_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          datos.afiliado_id,
          datos.mes,
          datos.anio,
          datos.atencion_medica_mensual || 0,
          datos.hs_enfermeria_semanal || 0,
          datos.ktm_sesiones_semanal || 0,
          datos.ktr_sesiones_semanal || 0,
          datos.cuidados_domiciliarios_hs_mensual || 0,
          datos.especialidades_medicas_mensual || 0,
          datos.observaciones || null,
          req.usuario.userId
        ]
      );
      
      await db.registrarAuditoria(
        'atencion_medica',
        result.lastID,
        'crear',
        req.usuario.userId,
        null,
        datos,
        req.ip
      );
      
      logger.info('Registro de atención médica creado', {
        registroId: result.lastID,
        afiliadoId: datos.afiliado_id,
        mes: datos.mes,
        anio: datos.anio,
        usuario: req.usuario.email
      });
      
      res.status(201).json({
        mensaje: 'Registro creado exitosamente',
        id: result.lastID
      });
      
    } catch (error) {
      logger.error('Error creando registro', { error: error.message });
      res.status(500).json({ error: 'Error al crear registro' });
    }
  }
);

/**
 * PUT /api/atencion-medica/:id
 * Actualizar registro de atención médica
 */
router.put(
  '/:id',
  verificarRol('admin', 'medico', 'licenciado'),
  validar(atencionMedicaSchema),
  async (req, res) => {
    try {
      const db = getDB();
      const { id } = req.params;
      const datos = req.body;
      
      const datosAnteriores = await db.get(
        'SELECT * FROM atencion_medica WHERE id = ?',
        [id]
      );
      
      if (!datosAnteriores) {
        return res.status(404).json({ error: 'Registro no encontrado' });
      }
      
      // Verificar si hay conflicto con otro registro
      const conflicto = await db.get(
        'SELECT id FROM atencion_medica WHERE afiliado_id = ? AND mes = ? AND anio = ? AND id != ?',
        [datos.afiliado_id, datos.mes, datos.anio, id]
      );
      
      if (conflicto) {
        return res.status(400).json({ 
          error: 'Ya existe otro registro para este mes/año' 
        });
      }
      
      await db.run(
        `UPDATE atencion_medica SET
          afiliado_id = ?, mes = ?, anio = ?, atencion_medica_mensual = ?,
          hs_enfermeria_semanal = ?, ktm_sesiones_semanal = ?, ktr_sesiones_semanal = ?,
          cuidados_domiciliarios_hs_mensual = ?, especialidades_medicas_mensual = ?,
          observaciones = ?
         WHERE id = ?`,
        [
          datos.afiliado_id,
          datos.mes,
          datos.anio,
          datos.atencion_medica_mensual || 0,
          datos.hs_enfermeria_semanal || 0,
          datos.ktm_sesiones_semanal || 0,
          datos.ktr_sesiones_semanal || 0,
          datos.cuidados_domiciliarios_hs_mensual || 0,
          datos.especialidades_medicas_mensual || 0,
          datos.observaciones || null,
          id
        ]
      );
      
      await db.registrarAuditoria(
        'atencion_medica',
        id,
        'actualizar',
        req.usuario.userId,
        datosAnteriores,
        datos,
        req.ip
      );
      
      logger.info('Registro de atención médica actualizado', {
        registroId: id,
        usuario: req.usuario.email
      });
      
      res.json({ mensaje: 'Registro actualizado exitosamente' });
      
    } catch (error) {
      logger.error('Error actualizando registro', { error: error.message });
      res.status(500).json({ error: 'Error al actualizar registro' });
    }
  }
);

/**
 * DELETE /api/atencion-medica/:id
 * Eliminar registro (solo admin)
 */
router.delete(
  '/:id',
  verificarRol('admin'),
  async (req, res) => {
    try {
      const db = getDB();
      const { id } = req.params;
      
      const datosAnteriores = await db.get(
        'SELECT * FROM atencion_medica WHERE id = ?',
        [id]
      );
      
      if (!datosAnteriores) {
        return res.status(404).json({ error: 'Registro no encontrado' });
      }
      
      await db.run('DELETE FROM atencion_medica WHERE id = ?', [id]);
      
      await db.registrarAuditoria(
        'atencion_medica',
        id,
        'eliminar',
        req.usuario.userId,
        datosAnteriores,
        null,
        req.ip
      );
      
      logger.warn('Registro de atención médica eliminado', {
        registroId: id,
        eliminadoPor: req.usuario.email
      });
      
      res.json({ mensaje: 'Registro eliminado exitosamente' });
      
    } catch (error) {
      logger.error('Error eliminando registro', { error: error.message });
      res.status(500).json({ error: 'Error al eliminar registro' });
    }
  }
);

/**
 * GET /api/atencion-medica/resumen/afiliado/:afiliadoId
 * Obtener resumen anual de atención médica
 */
router.get('/resumen/afiliado/:afiliadoId', async (req, res) => {
  try {
     const db = getDB();
    const { afiliadoId } = req.params;
    const { anio } = req.query;
    
    const anioActual = anio || new Date().getFullYear();
    
    const resumen = await db.all(
      `SELECT 
        mes,
        SUM(atencion_medica_mensual) as total_atencion,
        AVG(hs_enfermeria_semanal) as promedio_enfermeria,
        SUM(ktm_sesiones_semanal) as total_ktm,
        SUM(ktr_sesiones_semanal) as total_ktr,
        SUM(cuidados_domiciliarios_hs_mensual) as total_cuidados,
        SUM(especialidades_medicas_mensual) as total_especialidades
       FROM atencion_medica
       WHERE afiliado_id = ? AND anio = ?
       GROUP BY mes
       ORDER BY mes`,
      [afiliadoId, anioActual]
    );
    
    res.json({ 
      resumen,
      anio: anioActual,
      totalMeses: resumen.length
    });
    
  } catch (error) {
    logger.error('Error obteniendo resumen', { error: error.message });
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
});

module.exports = router;
