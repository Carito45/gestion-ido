const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const logger = require('../config/logger');
const { verificarToken, verificarRol } = require('../middleware/auth');
const { validar, afiliadoSchema } = require('../middleware/validations');
const { encryptFields, decryptFields } = require('../config/encryption');

// Campos sensibles que serán cifrados
const CAMPOS_SENSIBLES = [
  'diagnostico',
  'observaciones', 
  'telefono',
  'email',
  'direccion'
];

// Aplicar autenticación a todas las rutas
router.use(verificarToken);

// GET /afiliados - Listar afiliados
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const { estado, obra_social, buscar, limit = 100, offset = 0 } = req.query;
    
    // Validar parámetros de paginación
    const limitNum = Math.min(parseInt(limit) || 100, 500); // Max 500
    const offsetNum = Math.max(parseInt(offset) || 0, 0);

    let query = 'SELECT * FROM afiliados WHERE 1=1';
    const params = [];

    if (estado) {
      query += ' AND estado = ?';
      params.push(estado);
    }

    if (obra_social) {
      query += ' AND obra_social = ?';
      params.push(obra_social);
    }

    if (buscar) {
      // Sanitizar búsqueda
      const searchTerm = buscar.trim().substring(0, 100);
      query += ' AND (nombre_completo LIKE ? OR dni LIKE ? OR numero_afiliado LIKE ?)';
      params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
    }

    query += ` ORDER BY fecha_registro DESC LIMIT ? OFFSET ?`;
    params.push(limitNum, offsetNum);

    const afiliados = await db.all(query, params);

    // Descifrar solo si el usuario tiene permisos
    const afiliadosDescifrados = afiliados.map(afiliado => 
      decryptFields(afiliado, CAMPOS_SENSIBLES)
    );

    logger.info('Lista de afiliados consultada', { 
      total: afiliadosDescifrados.length,
      userId: req.usuario.id
    });

    res.json({
      success: true,
      count: afiliadosDescifrados.length,
      limit: limitNum,
      offset: offsetNum,
      data: afiliadosDescifrados
    });

  } catch (error) {
    logger.error('Error listando afiliados', { 
      error: error.message,
      userId: req.usuario.id
    });
    res.status(500).json({
      success: false,
      message: 'Error al obtener afiliados'
    });
  }
});

// GET /afiliados/:id - Obtener un afiliado
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validar ID
    if (isNaN(id) || parseInt(id) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      });
    }

    const db = getDB();
    const afiliado = await db.get(
      'SELECT * FROM afiliados WHERE id = ?',
      [id]
    );

    if (!afiliado) {
      return res.status(404).json({
        success: false,
        message: 'Afiliado no encontrado'
      });
    }

    // Descifrar datos sensibles
    const afiliadoDescifrado = decryptFields(afiliado, CAMPOS_SENSIBLES);

    logger.info('Afiliado consultado', { 
      afiliadoId: id,
      userId: req.usuario.id
    });

    res.json({
      success: true,
      data: afiliadoDescifrado
    });

  } catch (error) {
    logger.error('Error obteniendo afiliado', { 
      afiliadoId: req.params.id,
      error: error.message,
      userId: req.usuario.id
    });
    res.status(500).json({
      success: false,
      message: 'Error al obtener afiliado'
    });
  }
});

// POST /afiliados - Crear nuevo afiliado (CON VALIDACIÓN)
router.post('/', validar(afiliadoSchema), async (req, res) => {
  try {
    const db = getDB();
    const {
      nombre_completo, dni, fecha_nacimiento, edad, sexo,
      telefono, email, direccion, numero_afiliado,
      obra_social, plan, prestador_id, diagnostico,
      fecha_ingreso, medico_tratante, observaciones
    } = req.body;

    // Verificar DNI único
    const dniExistente = await db.get(
      'SELECT id FROM afiliados WHERE dni = ?',
      [dni]
    );

    if (dniExistente) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un afiliado con ese DNI'
      });
    }

    // Verificar número de afiliado único
    const numeroExistente = await db.get(
      'SELECT id FROM afiliados WHERE numero_afiliado = ?',
      [numero_afiliado]
    );

    if (numeroExistente) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un afiliado con ese número'
      });
    }

    // Cifrar datos sensibles
    const datosCifrados = encryptFields({
      diagnostico,
      observaciones,
      telefono,
      email,
      direccion
    }, CAMPOS_SENSIBLES);

    logger.info('Creando afiliado con datos cifrados', {
      userId: req.usuario.id,
      campos_cifrados: CAMPOS_SENSIBLES
    });

    // Insertar con datos cifrados
    const result = await db.run(
      `INSERT INTO afiliados (
        nombre_completo, dni, fecha_nacimiento, edad, sexo,
        telefono, email, direccion, numero_afiliado,
        obra_social, plan, prestador_id, diagnostico,
        fecha_ingreso, medico_tratante, observaciones,
        usuario_creador_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre_completo, 
        dni, 
        fecha_nacimiento, 
        edad, 
        sexo,
        datosCifrados.telefono,
        datosCifrados.email,
        datosCifrados.direccion,
        numero_afiliado,
        obra_social, 
        plan, 
        prestador_id,
        datosCifrados.diagnostico,
        fecha_ingreso, 
        medico_tratante,
        datosCifrados.observaciones,
        req.usuario.id
      ]
    );

    // Auditoría (solo datos no sensibles)
    await db.registrarAuditoria(
      'afiliados',
      result.lastID,
      'crear',
      req.usuario.id,
      null,
      { nombre_completo, dni, numero_afiliado, obra_social },
      req.ip
    );

    logger.info('Afiliado creado', { 
      afiliadoId: result.lastID,
      userId: req.usuario.id
    });

    res.status(201).json({
      success: true,
      message: 'Afiliado creado exitosamente',
      id: result.lastID
    });

  } catch (error) {
    logger.error('Error creando afiliado', { 
      error: error.message,
      userId: req.usuario.id
    });
    
    // NO exponer detalles del error en producción
    res.status(500).json({
      success: false,
      message: 'Error al crear afiliado'
    });
  }
});

// PUT /afiliados/:id - Actualizar afiliado (CON VALIDACIÓN)
router.put('/:id', validar(afiliadoSchema), async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;

    // Validar ID
    if (isNaN(id) || parseInt(id) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      });
    }

    // Obtener datos anteriores
    const afiliadoAnterior = await db.get(
      'SELECT * FROM afiliados WHERE id = ?',
      [id]
    );

    if (!afiliadoAnterior) {
      return res.status(404).json({
        success: false,
        message: 'Afiliado no encontrado'
      });
    }

    // Cifrar campos sensibles del body
    const datosCifrados = encryptFields(req.body, CAMPOS_SENSIBLES);

    // Construir query de actualización
    const campos = Object.keys(datosCifrados);
    const valores = Object.values(datosCifrados);
    
    if (campos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay datos para actualizar'
      });
    }

    const query = `UPDATE afiliados SET ${campos.map(c => `${c} = ?`).join(', ')} WHERE id = ?`;
    
    await db.run(query, [...valores, id]);

    // Auditoría (sin datos sensibles)
    await db.registrarAuditoria(
      'afiliados',
      id,
      'actualizar',
      req.usuario.id,
      { id: afiliadoAnterior.id, nombre: afiliadoAnterior.nombre_completo },
      { id, campos_actualizados: campos.filter(c => !CAMPOS_SENSIBLES.includes(c)) },
      req.ip
    );

    logger.info('Afiliado actualizado', { 
      afiliadoId: id,
      userId: req.usuario.id
    });

    res.json({
      success: true,
      message: 'Afiliado actualizado exitosamente'
    });

  } catch (error) {
    logger.error('Error actualizando afiliado', { 
      afiliadoId: req.params.id,
      error: error.message,
      userId: req.usuario.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Error al actualizar afiliado'
    });
  }
});

// DELETE /afiliados/:id (solo admin)
router.delete(
  '/:id',
  verificarRol('admin'),
  async (req, res) => {
    try {
      const db = getDB();
      const { id } = req.params;

      // Validar ID
      if (isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }

      const datosAnteriores = await db.get(
        'SELECT id, nombre_completo, dni FROM afiliados WHERE id = ?',
        [id]
      );

      if (!datosAnteriores) {
        return res.status(404).json({ 
          success: false,
          message: 'Afiliado no encontrado' 
        });
      }

      // Soft delete en lugar de hard delete
      await db.run(
        'UPDATE afiliados SET estado = "egresado", fecha_egreso = datetime("now") WHERE id = ?',
        [id]
      );

      await db.registrarAuditoria(
        'afiliados',
        id,
        'eliminar',
        req.usuario.id,
        datosAnteriores,
        null,
        req.ip
      );

      logger.warn('Afiliado eliminado', {
        afiliadoId: id,
        eliminadoPor: req.usuario.id,
        datos: datosAnteriores
      });

      res.json({ 
        success: true,
        message: 'Afiliado eliminado exitosamente' 
      });

    } catch (error) {
      logger.error('Error eliminando afiliado', { 
        afiliadoId: req.params.id,
        error: error.message,
        userId: req.usuario.id
      });
      
      res.status(500).json({ 
        success: false,
        message: 'Error al eliminar afiliado' 
      });
    }
  }
);

module.exports = router;