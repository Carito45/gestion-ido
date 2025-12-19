
const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const logger = require('../config/logger');
const { verificarToken, verificarRol } = require('../middleware/auth');
const { validar, facturaSchema, pagoFacturaSchema } = require('../middleware/validations');
const { validarMonto } = require('../security-utils');
// Aplicar autenticación a todas las rutas
router.use(verificarToken);

/**
 * Generar número de factura único
 */
async function generarNumeroFactura() {
  const db = getDB();  // ← NUEVA LÍNEA
  const anio = new Date().getFullYear();
  const ultimaFactura = await db.get(
    "SELECT numero_factura FROM facturas WHERE numero_factura LIKE ? ORDER BY id DESC LIMIT 1",
    `${anio}-%` // ← CORREGIDO
  );
  
  if (ultimaFactura) {
    const numero = parseInt(ultimaFactura.numero_factura.split('-')[1]) + 1;
    return `${anio}-${numero.toString().padStart(6, '0')}`;
  }
  
  return `${anio}-000001`;
}

/**
 * GET /api/facturacion
 * Listar todas las facturas con filtros avanzados
 */
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const { estado, mes, anio, afiliado_id, obra_social } = req.query;
    
    let query = `
      SELECT 
        f.*,
        a.nombre_completo as afiliado_nombre,
        a.numero_afiliado,
        a.obra_social as afiliado_obra_social,
        u.nombre_completo as creador_nombre
      FROM facturas f
      INNER JOIN afiliados a ON f.afiliado_id = a.id
      LEFT JOIN usuarios u ON f.usuario_creador_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (estado) {
      query += ' AND f.estado = ?';
      params.push(estado);
    }
    
    if (mes) {
      query += ' AND f.periodo_mes = ?';
      params.push(parseInt(mes));
    }
    
    if (anio) {
      query += ' AND f.periodo_anio = ?';
      params.push(parseInt(anio));
    }
    
    if (afiliado_id) {
      query += ' AND f.afiliado_id = ?';
      params.push(parseInt(afiliado_id));
    }
    
    if (obra_social) {
      query += ' AND f.obra_social LIKE ?';
      params.push(`%${obra_social}%`);
    }
    
    query += ' ORDER BY f.fecha_emision DESC, f.id DESC';
    
    const facturas = await db.all(query, params);
    
    logger.info('Facturas listadas', {
      cantidad: facturas.length,
      filtros: req.query,
      usuario: req.usuario.email
    });
    
    res.json(facturas);
    
  } catch (error) {
    logger.error('Error listando facturas', { error: error.message });
    res.status(500).json({ 
      error: 'Error al listar facturas',
      detalles: error.message 
    });
  }
});

/**
 * GET /api/facturacion/:id
 * Obtener factura con items y pagos
 */
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    
    // Obtener factura
    const factura = await db.get(
      `SELECT 
        f.*,
        a.nombre_completo as afiliado_nombre,
        a.dni as afiliado_dni,
        a.numero_afiliado,
        a.direccion as afiliado_direccion,
        a.telefono as afiliado_telefono,
        a.obra_social as afiliado_obra_social,
        a.plan as afiliado_plan,
        u.nombre_completo as creador_nombre
      FROM facturas f
      INNER JOIN afiliados a ON f.afiliado_id = a.id
      LEFT JOIN usuarios u ON f.usuario_creador_id = u.id
      WHERE f.id = ?`,
      [id]
    );
    
    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }
    
    // Obtener items
    const items = await db.all(
      `SELECT 
        fi.*,
        p.nombre_completo as profesional_nombre,
        p.tipo_profesional,
        p.matricula
      FROM factura_items fi
      LEFT JOIN profesionales p ON fi.profesional_id = p.id
      WHERE fi.factura_id = ?
      ORDER BY fi.id`,
      [id]
    );
    
    // Obtener pagos
    const pagos = await db.all(
      `SELECT 
        fp.*,
        u.nombre_completo as usuario_nombre
      FROM factura_pagos fp
      LEFT JOIN usuarios u ON fp.usuario_registro_id = u.id
      WHERE fp.factura_id = ?
      ORDER BY fp.fecha_pago DESC`,
      [id]
    );
    
    factura.items = items;
    factura.pagos = pagos;
    
    res.json(factura);
    
  } catch (error) {
    logger.error('Error obteniendo factura', { error: error.message });
    res.status(500).json({ 
      error: 'Error al obtener factura',
      detalles: error.message 
    });
  }
});

/**
 * POST /api/facturacion/generar
 * Generar factura desde atenciones médicas
 */
router.post('/generar', async (req, res) => {
  try {
    const db = getDB();
    const { afiliado_id, periodo_mes, periodo_anio, observaciones } = req.body;
    
    // Validaciones
    if (!afiliado_id || !periodo_mes || !periodo_anio) {
      return res.status(400).json({ 
        error: 'Faltan datos requeridos: afiliado_id, periodo_mes, periodo_anio' 
      });
    }
    
    // Verificar si ya existe factura para ese período
    const facturaExistente = await db.get(
      `SELECT id, numero_factura FROM facturas 
       WHERE afiliado_id = ? AND periodo_mes = ? AND periodo_anio = ?`,
      [afiliado_id, periodo_mes, periodo_anio]
    );
    
    if (facturaExistente) {
      return res.status(400).json({ 
        error: 'Ya existe una factura para este afiliado y período',
        factura_numero: facturaExistente.numero_factura
      });
    }
    
    // Obtener datos del afiliado
    const afiliado = await db.get(
      'SELECT * FROM afiliados WHERE id = ?',
      [afiliado_id]
    );
    
    if (!afiliado) {
      return res.status(404).json({ error: 'Afiliado no encontrado' });
    }
    
    // Obtener atenciones médicas del período
    const atencion = await db.get(
      `SELECT * FROM atencion_medica 
       WHERE afiliado_id = ? AND mes = ? AND anio = ?`,
      [afiliado_id, periodo_mes, periodo_anio]
    );
    
    if (!atencion) {
      return res.status(404).json({ 
        error: 'No hay atenciones médicas registradas para este período' 
      });
    }
    
    // Generar número de factura
    const numeroFactura = await generarNumeroFactura();
    
    // Crear factura
    const fechaEmision = new Date().toISOString().split('T')[0];
    const fechaVencimiento = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]; // 30 días
    
    const resultFactura = await db.run(
      `INSERT INTO facturas (
        numero_factura, afiliado_id, obra_social, 
        periodo_mes, periodo_anio, 
        fecha_emision, fecha_vencimiento,
        subtotal, total, estado, observaciones,
        usuario_creador_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 'pendiente', ?, ?)`,
      [
        numeroFactura,
        afiliado_id,
        afiliado.obra_social,
        periodo_mes,
        periodo_anio,
        fechaEmision,
        fechaVencimiento,
        observaciones,
        req.usuario.userId
      ]
    );
    
    const facturaId = resultFactura.lastID;
    
    // Crear items automáticamente desde atención médica
    const items = [];
    let subtotal = 0;
    
    // Obtener profesionales (tomamos el primero disponible como ejemplo)
    // En producción, deberías tener una relación más específica
    const profesionales = await db.all(
      'SELECT * FROM profesionales WHERE activo = 1 LIMIT 5'
    );
    
    // Obtener precios del nomenclador (en lugar de hardcodear)
    const getPrecioNomenclador = async (tipo) => {
      const prestacion = await db.get(
        'SELECT precio_unitario, descripcion FROM nomenclador WHERE tipo_prestacion = ? AND vigente = 1 LIMIT 1',
        [tipo]
      );
      return prestacion || { precio_unitario: 0, descripcion: 'Sin nomenclador' };
    };
    
    // Atención médica mensual
    if (atencion.atencion_medica_mensual > 0) {
      const nomenclador = await getPrecioNomenclador('atencion_medica');
      const precioUnitario = nomenclador.precio_unitario;
      const itemSubtotal = atencion.atencion_medica_mensual * precioUnitario;
      
      await db.run(
        `INSERT INTO factura_items (
          factura_id, profesional_id, descripcion, tipo_prestacion,
          cantidad, precio_unitario, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          facturaId,
          profesionales[0]?.id || null,
          `Atención Médica - ${getNombreMes(periodo_mes)} ${periodo_anio}`,
          'atencion_medica',
          atencion.atencion_medica_mensual,
          precioUnitario,
          itemSubtotal
        ]
      );
      
      subtotal += itemSubtotal;
      items.push({ tipo: 'Atención Médica', cantidad: atencion.atencion_medica_mensual, monto: itemSubtotal });
    }
    
    // Enfermería (horas semanales * 4 semanas)
    if (atencion.hs_enfermeria_semanal > 0) {
      const horasTotales = atencion.hs_enfermeria_semanal * 4;
      const precioUnitario = 1500;
      const itemSubtotal = horasTotales * precioUnitario;
      
      await db.run(
        `INSERT INTO factura_items (
          factura_id, profesional_id, descripcion, tipo_prestacion,
          cantidad, precio_unitario, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          facturaId,
          profesionales[1]?.id || null,
          `Enfermería - ${horasTotales}hs mensuales`,
          'enfermeria',
          horasTotales,
          precioUnitario,
          itemSubtotal
        ]
      );
      
      subtotal += itemSubtotal;
      items.push({ tipo: 'Enfermería', cantidad: horasTotales, monto: itemSubtotal });
    }
    
    // Kinesiología KTM (sesiones semanales * 4)
    if (atencion.ktm_sesiones_semanal > 0) {
      const sesionesTotales = atencion.ktm_sesiones_semanal * 4;
      const precioUnitario = 2000;
      const itemSubtotal = sesionesTotales * precioUnitario;
      
      await db.run(
        `INSERT INTO factura_items (
          factura_id, profesional_id, descripcion, tipo_prestacion,
          cantidad, precio_unitario, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          facturaId,
          profesionales[2]?.id || null,
          `Kinesiología KTM - ${sesionesTotales} sesiones`,
          'kinesiologia_ktm',
          sesionesTotales,
          precioUnitario,
          itemSubtotal
        ]
      );
      
      subtotal += itemSubtotal;
      items.push({ tipo: 'Kinesiología KTM', cantidad: sesionesTotales, monto: itemSubtotal });
    }
    
    // Kinesiología KTR
    if (atencion.ktr_sesiones_semanal > 0) {
      const sesionesTotales = atencion.ktr_sesiones_semanal * 4;
      const precioUnitario = 2200;
      const itemSubtotal = sesionesTotales * precioUnitario;
      
      await db.run(
        `INSERT INTO factura_items (
          factura_id, profesional_id, descripcion, tipo_prestacion,
          cantidad, precio_unitario, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          facturaId,
          profesionales[3]?.id || null,
          `Kinesiología KTR - ${sesionesTotales} sesiones`,
          'kinesiologia_ktr',
          sesionesTotales,
          precioUnitario,
          itemSubtotal
        ]
      );
      
      subtotal += itemSubtotal;
      items.push({ tipo: 'Kinesiología KTR', cantidad: sesionesTotales, monto: itemSubtotal });
    }
    
    // Cuidados domiciliarios
    if (atencion.cuidados_domiciliarios_hs_mensual > 0) {
      const precioUnitario = 1200;
      const itemSubtotal = atencion.cuidados_domiciliarios_hs_mensual * precioUnitario;
      
      await db.run(
        `INSERT INTO factura_items (
          factura_id, profesional_id, descripcion, tipo_prestacion,
          cantidad, precio_unitario, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          facturaId,
          profesionales[4]?.id || null,
          `Cuidados Domiciliarios - ${atencion.cuidados_domiciliarios_hs_mensual}hs`,
          'cuidados_domiciliarios',
          atencion.cuidados_domiciliarios_hs_mensual,
          precioUnitario,
          itemSubtotal
        ]
      );
      
      subtotal += itemSubtotal;
      items.push({ tipo: 'Cuidados Domiciliarios', cantidad: atencion.cuidados_domiciliarios_hs_mensual, monto: itemSubtotal });
    }
    
    // Especialidades médicas
    if (atencion.especialidades_medicas_mensual > 0) {
      const precioUnitario = 8000;
      const itemSubtotal = atencion.especialidades_medicas_mensual * precioUnitario;
      
      await db.run(
        `INSERT INTO factura_items (
          factura_id, profesional_id, descripcion, tipo_prestacion,
          cantidad, precio_unitario, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          facturaId,
          profesionales[0]?.id || null,
          `Especialidades Médicas - ${atencion.especialidades_medicas_mensual} consultas`,
          'especialidad_medica',
          atencion.especialidades_medicas_mensual,
          precioUnitario,
          itemSubtotal
        ]
      );
      
      subtotal += itemSubtotal;
      items.push({ tipo: 'Especialidades Médicas', cantidad: atencion.especialidades_medicas_mensual, monto: itemSubtotal });
    }
    
    // Actualizar totales de la factura
    await db.run(
      `UPDATE facturas SET subtotal = ?, total = ? WHERE id = ?`,
      [subtotal, subtotal, facturaId]
    );
    
    // Registrar auditoría
    await db.registrarAuditoria(
      'facturas',
      facturaId,
      'crear',
      req.usuario.userId,
      null,
      { numeroFactura, afiliado_id, periodo_mes, periodo_anio, total: subtotal },
      req.ip
    );
    
    logger.info('Factura generada', {
      facturaId,
      numeroFactura,
      afiliado: afiliado.nombre_completo,
      total: subtotal,
      items: items.length,
      usuario: req.usuario.email
    });
    
    res.status(201).json({
      mensaje: 'Factura generada exitosamente',
      factura: {
        id: facturaId,
        numero_factura: numeroFactura,
        afiliado: afiliado.nombre_completo,
        periodo: `${getNombreMes(periodo_mes)} ${periodo_anio}`,
        subtotal,
        total: subtotal,
        items
      }
    });
    
  } catch (error) {
    logger.error('Error generando factura', { error: error.message });
    res.status(500).json({ 
      error: 'Error al generar factura',
      detalles: error.message 
    });
  }
});

/**
 * POST /api/facturacion/:id/pagos
 * Registrar pago (total o parcial)
 */
router.post('/:id/pagos', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { monto, fecha_pago, medio_pago, numero_comprobante, observaciones } = req.body;
    
    // Validar monto
    const validacion = validarMonto(monto);
    if (!validacion.valido) {
      return res.status(400).json({ error: validacion.error });
    }
    
    // Obtener factura
    const factura = await db.get(
      'SELECT * FROM facturas WHERE id = ?',
      [id]
    );
    
    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }
    
    if (factura.estado === 'anulada') {
      return res.status(400).json({ error: 'No se puede pagar una factura anulada' });
    }
    
    // Validar que el monto no exceda el saldo pendiente
    const saldoPendiente = factura.total - factura.monto_pagado;
    if (monto > saldoPendiente) {
      return res.status(400).json({ 
        error: `El monto (${monto}) excede el saldo pendiente (${saldoPendiente})` 
      });
    }
    
    // Registrar pago
    const resultPago = await db.run(
      `INSERT INTO factura_pagos (
        factura_id, monto, fecha_pago, medio_pago,
        numero_comprobante, observaciones, usuario_registro_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, monto, fecha_pago, medio_pago, numero_comprobante, observaciones, req.usuario.userId]
    );
    
    // Actualizar monto pagado y estado de la factura
    const nuevoMontoPagado = factura.monto_pagado + parseFloat(monto);
    let nuevoEstado = 'parcial';
    
    if (nuevoMontoPagado >= factura.total) {
      nuevoEstado = 'pagada';
    }
    
    await db.run(
      `UPDATE facturas 
       SET monto_pagado = ?, estado = ?, fecha_pago = ?
       WHERE id = ?`,
      [nuevoMontoPagado, nuevoEstado, nuevoEstado === 'pagada' ? fecha_pago : null, id]
    );
    
    // Auditoría
    await db.registrarAuditoria(
      'factura_pagos',
      resultPago.lastID,
      'crear',
      req.usuario.userId,
      null,
      { facturaId: id, monto, medio_pago },
      req.ip
    );
    
    logger.info('Pago registrado', {
      facturaId: id,
      pagoId: resultPago.lastID,
      monto,
      nuevoEstado,
      usuario: req.usuario.email
    });
    
    res.status(201).json({
      mensaje: 'Pago registrado exitosamente',
      pago: {
        id: resultPago.lastID,
        monto,
        monto_pagado_total: nuevoMontoPagado,
        saldo_pendiente: factura.total - nuevoMontoPagado,
        estado: nuevoEstado
      }
    });
    
  } catch (error) {
    logger.error('Error registrando pago', { error: error.message });
    res.status(500).json({ 
  error: process.env.NODE_ENV === 'production' 
    ? 'Error al procesar la solicitud' 
    : error.message
});
  }
});

/**
 * PATCH /api/facturacion/:id/estado
 * Cambiar estado de factura
 */
router.patch('/:id/estado', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { estado } = req.body;
    
    const estadosValidos = ['pendiente', 'pagada', 'parcial', 'vencida', 'anulada'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ 
        error: `Estado inválido. Valores permitidos: ${estadosValidos.join(', ')}` 
      });
    }
    
    const facturaAnterior = await db.get(
      'SELECT * FROM facturas WHERE id = ?',
      [id]
    );
    
    if (!facturaAnterior) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }
    
    await db.run(
      'UPDATE facturas SET estado = ? WHERE id = ?',
      [estado, id]
    );
    
    await db.registrarAuditoria(
      'facturas',
      id,
      'actualizar',
      req.usuario.userId,
      { estado: facturaAnterior.estado },
      { estado },
      req.ip
    );
    
    logger.info('Estado de factura actualizado', {
      facturaId: id,
      estadoAnterior: facturaAnterior.estado,
      estadoNuevo: estado,
      usuario: req.usuario.email
    });
    
    res.json({ mensaje: 'Estado actualizado', estado });
    
  } catch (error) {
    logger.error('Error actualizando estado', { error: error.message });
    res.status(500).json({ 
  error: process.env.NODE_ENV === 'production' 
    ? 'Error al procesar la solicitud' 
    : error.message
});
  }
});

/**
 * GET /api/facturacion/reportes/resumen
 * Reporte resumen de facturación
 */
router.get('/reportes/resumen', async (req, res) => {
  try {
    const db = getDB();
    const { mes, anio } = req.query;
    
    let whereClause = '1=1';
    const params = [];
    
    if (mes) {
      whereClause += ' AND periodo_mes = ?';
      params.push(parseInt(mes));
    }
    
    if (anio) {
      whereClause += ' AND periodo_anio = ?';
      params.push(parseInt(anio));
    }
    
    const resumen = await db.get(
      `SELECT 
        COUNT(*) as total_facturas,
        SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado = 'pagada' THEN 1 ELSE 0 END) as pagadas,
        SUM(CASE WHEN estado = 'parcial' THEN 1 ELSE 0 END) as parciales,
        SUM(CASE WHEN estado = 'vencida' THEN 1 ELSE 0 END) as vencidas,
        SUM(CASE WHEN estado = 'anulada' THEN 1 ELSE 0 END) as anuladas,
        SUM(total) as total_facturado,
        SUM(monto_pagado) as total_cobrado,
        SUM(total - monto_pagado) as saldo_pendiente
      FROM facturas
      WHERE ${whereClause}`,
      params
    );
    
    const porObraSocial = await db.all(
      `SELECT 
        obra_social,
        COUNT(*) as cantidad,
        SUM(total) as total_facturado,
        SUM(monto_pagado) as total_cobrado
      FROM facturas
      WHERE ${whereClause}
      GROUP BY obra_social
      ORDER BY total_facturado DESC`,
      params
    );
    
    res.json({
      resumen,
      por_obra_social: porObraSocial
    });
    
  } catch (error) {
    logger.error('Error generando reporte', { error: error.message });
    res.status(500).json({ 
  error: process.env.NODE_ENV === 'production' 
    ? 'Error al procesar la solicitud' 
    : error.message
});
  }
});

/**
 * DELETE /api/facturacion/:id
 * Anular factura (soft delete)
 */
router.delete('/:id', verificarRol(['admin']), async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    
    const factura = await db.get(
      'SELECT * FROM facturas WHERE id = ?',
      [id]
    );
    
    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }
    
    if (factura.estado === 'pagada') {
      return res.status(400).json({ 
        error: 'No se puede anular una factura pagada' 
      });
    }
    
    await db.run(
      'UPDATE facturas SET estado = ? WHERE id = ?',
      ['anulada', id]
    );
    
    await db.registrarAuditoria(
      'facturas',
      id,
      'actualizar',
      req.usuario.userId,
      factura,
      { estado: 'anulada' },
      req.ip
    );
    
    logger.info('Factura anulada', {
      facturaId: id,
      numeroFactura: factura.numero_factura,
      usuario: req.usuario.email
    });
    
    res.json({ mensaje: 'Factura anulada exitosamente' });
    
  } catch (error) {
    logger.error('Error anulando factura', { error: error.message });
    res.status(500).json({ 
  error: process.env.NODE_ENV === 'production' 
    ? 'Error al procesar la solicitud' 
    : error.message
});
  }
});

/**
 * GET /api/facturacion/:id/pdf
 * Descargar factura en PDF
 */
router.get('/:id/pdf', async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { generarPDFFactura } = require('../config/pdfGenerator');
    
    // Verificar que existe la factura
    const factura = await db.get(
      'SELECT numero_factura FROM facturas WHERE id = ?',
      [id]
    );
    
    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }
    
    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition', 
      `attachment; filename=Factura_${factura.numero_factura}.pdf`
    );
    
    // Generar y enviar PDF
    await generarPDFFactura(id, res);
    
    logger.info('PDF generado', {
      facturaId: id,
      numeroFactura: factura.numero_factura,
      usuario: req.usuario.email
    });
    
  } catch (error) {
    logger.error('Error generando PDF', { error: error.message });
    res.status(500).json({ 
  error: process.env.NODE_ENV === 'production' 
    ? 'Error al procesar la solicitud' 
    : error.message
});
  }
});

// Función auxiliar para nombres de meses
function getNombreMes(mes) {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return meses[mes - 1] || 'Mes inválido';
}

module.exports = router;
