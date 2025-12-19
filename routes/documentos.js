const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const logger = require('../config/logger');
const { verificarToken, verificarRol } = require('../middleware/auth');
const { upload, handleMulterError, deleteFile } = require('../config/upload');

// Aplicar autenticación a todas las rutas
router.use(verificarToken);

/**
 * GET /api/documentos/afiliado/:afiliadoId
 * Obtener todos los documentos de un afiliado
 */
router.get('/afiliado/:afiliadoId', async (req, res) => {
  try {
    const db = getDB();
    const { afiliadoId } = req.params;
    
    // Verificar que el afiliado existe
    const afiliado = await db.get(
      'SELECT id, nombre_completo FROM afiliados WHERE id = ?',
      [afiliadoId]
    );
    
    if (!afiliado) {
      return res.status(404).json({ error: 'Afiliado no encontrado' });
    }
    
    const documentos = await db.all(
      `SELECT d.*, u.nombre_completo as usuario_nombre
       FROM documentos d
       LEFT JOIN usuarios u ON d.usuario_carga_id = u.id
       WHERE d.afiliado_id = ?
       ORDER BY d.fecha_carga DESC`,
      [afiliadoId]
    );
    
    logger.info('Documentos listados', {
      afiliadoId,
      cantidad: documentos.length,
      usuario: req.usuario.email
    });
    
    res.json({ 
      documentos,
      afiliado: afiliado.nombre_completo,
      total: documentos.length
    });
    
  } catch (error) {
    logger.error('Error listando documentos', { error: error.message });
    res.status(500).json({ error: 'Error al obtener documentos' });
  }
});

/**
 * POST /api/documentos/afiliado/:afiliadoId
 * Subir documento para un afiliado
 */
router.post(
  '/afiliado/:afiliadoId',
  verificarRol('admin', 'medico', 'licenciado'),
  upload.single('archivo'),
  handleMulterError,
  async (req, res) => {
    try {
      const db = getDB();
      const { afiliadoId } = req.params;
      const { categoria, descripcion } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
      }
      
      // Verificar que el afiliado existe
      const afiliado = await db.get(
        'SELECT id FROM afiliados WHERE id = ?',
        [afiliadoId]
      );
      
      if (!afiliado) {
        // Eliminar archivo subido si el afiliado no existe
        deleteFile(req.file.path);
        return res.status(404).json({ error: 'Afiliado no encontrado' });
      }
      
      // Validar categoría
      const categoriasValidas = [
        'historia_clinica', 
        'ordenes_medicas', 
        'informes', 
        'facturacion', 
        'consentimientos',
        'otros'
      ];
      
      if (!categoria || !categoriasValidas.includes(categoria)) {
        deleteFile(req.file.path);
        return res.status(400).json({ 
          error: 'Categoría inválida',
          categoriasValidas
        });
      }
      
      // Guardar documento en la base de datos
      const result = await db.run(
        `INSERT INTO documentos (
          afiliado_id, categoria, nombre_archivo, ruta_archivo,
          tamanio_bytes, tipo_mime, descripcion, usuario_carga_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          afiliadoId,
          categoria,
          req.file.originalname,
          req.file.path,
          req.file.size,
          req.file.mimetype,
          descripcion || null,
          req.usuario.userId
        ]
      );
      
      await db.registrarAuditoria(
        'documentos',
        result.lastID,
        'crear',
        req.usuario.userId,
        null,
        {
          afiliado_id: afiliadoId,
          categoria,
          nombre_archivo: req.file.originalname
        },
        req.ip
      );
      
      logger.info('Documento subido', {
        documentoId: result.lastID,
        afiliadoId,
        categoria,
        nombreArchivo: req.file.originalname,
        tamanio: req.file.size,
        usuario: req.usuario.email
      });
      
      res.status(201).json({
        mensaje: 'Documento subido exitosamente',
        documento: {
          id: result.lastID,
          nombre_archivo: req.file.originalname,
          categoria,
          tamanio_bytes: req.file.size
        }
      });
      
    } catch (error) {
      // Si hay error, intentar eliminar el archivo
      if (req.file) {
        deleteFile(req.file.path);
      }
      logger.error('Error subiendo documento', { error: error.message });
      res.status(500).json({ error: 'Error al subir documento' });
    }
  }
);

/**
 * GET /api/documentos/:id/descargar
 * Descargar un documento específico
 */
router.get('/:id/descargar', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    
    const documento = await db.get(
      'SELECT * FROM documentos WHERE id = ?',
      [id]
    );
    
    if (!documento) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    
    logger.info('Documento descargado', {
      documentoId: id,
      nombreArchivo: documento.nombre_archivo,
      usuario: req.usuario.email
    });
    
    // Enviar archivo
    res.download(documento.ruta_archivo, documento.nombre_archivo, (err) => {
      if (err) {
        logger.error('Error descargando archivo', {
          documentoId: id,
          error: err.message
        });
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error al descargar archivo' });
        }
      }
    });
    
  } catch (error) {
    logger.error('Error obteniendo documento', { error: error.message });
    res.status(500).json({ error: 'Error al obtener documento' });
  }
});

/**
 * DELETE /api/documentos/:id
 * Eliminar un documento
 */
router.delete(
  '/:id',
  verificarRol('admin', 'medico', 'licenciado'),
  async (req, res) => {
    try {
      const db = getDB();
      const { id } = req.params;
      
      const documento = await db.get(
        'SELECT * FROM documentos WHERE id = ?',
        [id]
      );
      
      if (!documento) {
        return res.status(404).json({ error: 'Documento no encontrado' });
      }
      
      // Eliminar archivo del sistema
      deleteFile(documento.ruta_archivo);
      
      // Eliminar registro de la base de datos
      await db.run('DELETE FROM documentos WHERE id = ?', [id]);
      
      await db.registrarAuditoria(
        'documentos',
        id,
        'eliminar',
        req.usuario.id,
        documento,
        null,
        req.ip
      );
      
      logger.warn('Documento eliminado', {
        documentoId: id,
        nombreArchivo: documento.nombre_archivo,
        eliminadoPor: req.usuario.email
      });
      
      res.json({ mensaje: 'Documento eliminado exitosamente' });
      
    } catch (error) {
      logger.error('Error eliminando documento', { error: error.message });
      res.status(500).json({ error: 'Error al eliminar documento' });
    }
  }
);

/**
 * GET /api/documentos/categorias
 * Obtener listado de categorías válidas
 */
router.get('/categorias', (req, res) => {
  const categorias = [
    { valor: 'historia_clinica', nombre: 'Historia Clínica' },
    { valor: 'ordenes_medicas', nombre: 'Órdenes Médicas' },
    { valor: 'informes', nombre: 'Informes' },
    { valor: 'facturacion', nombre: 'Facturación' },
    { valor: 'consentimientos', nombre: 'Consentimientos' },
    { valor: 'otros', nombre: 'Otros' }
  ];
  
  res.json({ categorias });
});

module.exports = router;
