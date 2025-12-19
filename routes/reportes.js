const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { getDB } = require('../config/database');
const logger = require('../config/logger');
const { verificarToken, verificarRol } = require('../middleware/auth');

// Aplicar autenticación a todas las rutas
router.use(verificarToken);

/**
 * GET /api/reportes/afiliados/excel
 * Exportar lista de afiliados a Excel
 */
router.get('/afiliados/excel', async (req, res) => {
  try {
    const db = getDB();
    const { estado } = req.query;
    
    let query = `
      SELECT a.*, 
             e.nombre as prestador_nombre,
             u.nombre_completo as creador_nombre
      FROM afiliados a
      LEFT JOIN empresas_prestadoras e ON a.prestador_id = e.id
      LEFT JOIN usuarios u ON a.usuario_creador_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (estado) {
      query += ' AND a.estado = ?';
      params.push(estado);
    }
    
    query += ' ORDER BY a.nombre_completo';
    
    const afiliados = await db.all(query, params);
    
    // Crear libro Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Afiliados');
    
    // Configurar columnas
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nombre Completo', key: 'nombre_completo', width: 30 },
      { header: 'DNI', key: 'dni', width: 12 },
      { header: 'Edad', key: 'edad', width: 10 },
      { header: 'Sexo', key: 'sexo', width: 12 },
      { header: 'Teléfono', key: 'telefono', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Dirección', key: 'direccion', width: 30 },
      { header: 'N° Afiliado', key: 'numero_afiliado', width: 15 },
      { header: 'Obra Social', key: 'obra_social', width: 20 },
      { header: 'Plan', key: 'plan', width: 15 },
      { header: 'Prestador', key: 'prestador_nombre', width: 25 },
      { header: 'Diagnóstico', key: 'diagnostico', width: 30 },
      { header: 'Fecha Ingreso', key: 'fecha_ingreso', width: 15 },
      { header: 'Médico Tratante', key: 'medico_tratante', width: 25 },
      { header: 'Estado', key: 'estado', width: 12 }
    ];
    
    // Estilo del header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    // Agregar datos
    afiliados.forEach(afiliado => {
      worksheet.addRow(afiliado);
    });
    
    // Autoajustar filas
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      row.alignment = { vertical: 'middle', wrapText: true };
    });
    
    logger.info('Reporte de afiliados Excel generado', {
      cantidad: afiliados.length,
      usuario: req.usuario.email
    });
    
    // Enviar archivo
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=afiliados_${Date.now()}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error) {
    logger.error('Error generando reporte Excel', { error: error.message });
    res.status(500).json({ error: 'Error al generar reporte' });
  }
});

/**
 * GET /api/reportes/afiliados/pdf
 * Exportar lista de afiliados a PDF
 */
router.get('/afiliados/pdf', async (req, res) => {
  try {
    const db = getDB();
    const { estado } = req.query;
    
    let query = `
      SELECT a.nombre_completo, a.dni, a.edad, a.numero_afiliado, 
             a.obra_social, a.estado, e.nombre as prestador_nombre
      FROM afiliados a
      LEFT JOIN empresas_prestadoras e ON a.prestador_id = e.id
      WHERE 1=1
    `;
    const params = [];
    
    if (estado) {
      query += ' AND a.estado = ?';
      params.push(estado);
    }
    
    query += ' ORDER BY a.nombre_completo';
    
    const afiliados = await db.all(query, params);
    
    // Crear PDF
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=afiliados_${Date.now()}.pdf`);
    
    doc.pipe(res);
    
    // Título
    doc.fontSize(20).text('Reporte de Afiliados', { align: 'center' });
    doc.fontSize(10).text(`Generado: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Total de registros: ${afiliados.length}`, { align: 'center' });
    doc.moveDown(2);
    
    // Tabla
    const tableTop = doc.y;
    const rowHeight = 25;
    
    // Headers
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Nombre', 50, tableTop, { width: 120, continued: true });
    doc.text('DNI', 170, tableTop, { width: 60, continued: true });
    doc.text('Edad', 230, tableTop, { width: 40, continued: true });
    doc.text('N° Afiliado', 270, tableTop, { width: 80, continued: true });
    doc.text('Obra Social', 350, tableTop, { width: 100, continued: true });
    doc.text('Estado', 450, tableTop, { width: 60 });
    
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    
    // Datos
    doc.font('Helvetica');
    let currentY = tableTop + 20;
    
    afiliados.forEach((afiliado, index) => {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }
      
      doc.fontSize(9);
      doc.text(afiliado.nombre_completo.substring(0, 25), 50, currentY, { width: 120 });
      doc.text(afiliado.dni, 170, currentY, { width: 60 });
      doc.text(afiliado.edad.toString(), 230, currentY, { width: 40 });
      doc.text(afiliado.numero_afiliado, 270, currentY, { width: 80 });
      doc.text(afiliado.obra_social || '-', 350, currentY, { width: 100 });
      doc.text(afiliado.estado, 450, currentY, { width: 60 });
      
      currentY += rowHeight;
      
      if (index < afiliados.length - 1) {
        doc.moveTo(50, currentY - 5).lineTo(550, currentY - 5).stroke();
      }
    });
    
    // Footer
    doc.fontSize(8).text(
      `Generado por: ${req.usuario.nombre_completo}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    );
    
    doc.end();
    
    logger.info('Reporte de afiliados PDF generado', {
      cantidad: afiliados.length,
      usuario: req.usuario.email
    });
    
  } catch (error) {
    logger.error('Error generando reporte PDF', { error: error.message });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al generar reporte' });
    }
  }
});

/**
 * GET /api/reportes/atencion-medica/afiliado/:afiliadoId/excel
 * Exportar atención médica de un afiliado a Excel
 */
router.get('/atencion-medica/afiliado/:afiliadoId/excel', async (req, res) => {
  try {
    const db = getDB();
    const { afiliadoId } = req.params;
    const { anio } = req.query;
    
    const afiliado = await db.get(
      'SELECT nombre_completo FROM afiliados WHERE id = ?',
      [afiliadoId]
    );
    
    if (!afiliado) {
      return res.status(404).json({ error: 'Afiliado no encontrado' });
    }
    
    let query = `
      SELECT * FROM atencion_medica
      WHERE afiliado_id = ?
    `;
    const params = [afiliadoId];
    
    if (anio) {
      query += ' AND anio = ?';
      params.push(anio);
    }
    
    query += ' ORDER BY anio DESC, mes DESC';
    
    const registros = await db.all(query, params);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Atención Médica');
    
    // Título
    worksheet.mergeCells('A1:G1');
    worksheet.getCell('A1').value = `Atención Médica - ${afiliado.nombre_completo}`;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    
    worksheet.addRow([]);
    
    // Columnas
    worksheet.columns = [
      { header: 'Mes', key: 'mes', width: 12 },
      { header: 'Año', key: 'anio', width: 10 },
      { header: 'At. Médica', key: 'atencion_medica_mensual', width: 12 },
      { header: 'Hs Enfermería', key: 'hs_enfermeria_semanal', width: 15 },
      { header: 'KTM Sesiones', key: 'ktm_sesiones_semanal', width: 15 },
      { header: 'KTR Sesiones', key: 'ktr_sesiones_semanal', width: 15 },
      { header: 'Cuidados Dom.', key: 'cuidados_domiciliarios_hs_mensual', width: 15 },
      { header: 'Especialidades', key: 'especialidades_medicas_mensual', width: 15 },
      { header: 'Observaciones', key: 'observaciones', width: 30 }
    ];
    
    // Estilo header
    worksheet.getRow(3).font = { bold: true };
    worksheet.getRow(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF10B981' }
    };
    worksheet.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    // Datos con meses en texto
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    registros.forEach(registro => {
      worksheet.addRow({
        ...registro,
        mes: meses[registro.mes - 1]
      });
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=atencion_medica_${afiliadoId}_${Date.now()}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
    
    logger.info('Reporte de atención médica Excel generado', {
      afiliadoId,
      registros: registros.length,
      usuario: req.usuario.email
    });
    
  } catch (error) {
    logger.error('Error generando reporte atención médica', { error: error.message });
    res.status(500).json({ error: 'Error al generar reporte' });
  }
});

/**
 * GET /api/reportes/empresas/excel
 * Exportar lista de empresas a Excel
 */
router.get('/empresas/excel', async (req, res) => {
  try {
    const db = getDB();
    const empresas = await db.all(
      'SELECT * FROM empresas_prestadoras ORDER BY nombre'
    );
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Empresas');
    
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'CUIT', key: 'cuit', width: 15 },
      { header: 'Teléfono', key: 'telefono', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Dirección', key: 'direccion', width: 30 },
      { header: 'Servicios', key: 'servicios_ofrecidos', width: 40 },
      { header: 'Estado', key: 'estado', width: 12 }
    ];
    
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF59E0B' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    empresas.forEach(empresa => {
      worksheet.addRow(empresa);
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=empresas_${Date.now()}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
    
    logger.info('Reporte de empresas Excel generado', {
      cantidad: empresas.length,
      usuario: req.usuario.email
    });
    
  } catch (error) {
    logger.error('Error generando reporte empresas', { error: error.message });
    res.status(500).json({ error: 'Error al generar reporte' });
  }
});

/**
 * GET /api/reportes/resumen/dashboard
 * Resumen general del sistema
 */
router.get('/resumen/dashboard', async (req, res) => {
  try {
    const db = getDB();
    const totalAfiliados = await db.get(
      'SELECT COUNT(*) as total FROM afiliados'
    );
    
    const afiliadosActivos = await db.get(
      "SELECT COUNT(*) as total FROM afiliados WHERE estado = 'activo'"
    );
    
    const totalEmpresas = await db.get(
      'SELECT COUNT(*) as total FROM empresas_prestadoras'
    );
    
    const empresasActivas = await db.get(
      "SELECT COUNT(*) as total FROM empresas_prestadoras WHERE estado = 'activa'"
    );
    
    const afiliadosPorObraSocial = await db.all(
      `SELECT obra_social, COUNT(*) as cantidad
       FROM afiliados
       GROUP BY obra_social
       ORDER BY cantidad DESC
       LIMIT 10`
    );
    
    const registrosMesActual = await db.get(
      `SELECT COUNT(*) as total FROM atencion_medica
       WHERE mes = ? AND anio = ?`,
      [new Date().getMonth() + 1, new Date().getFullYear()]
    );
    
    res.json({
      afiliados: {
        total: totalAfiliados.total,
        activos: afiliadosActivos.total,
        egresados: totalAfiliados.total - afiliadosActivos.total
      },
      empresas: {
        total: totalEmpresas.total,
        activas: empresasActivas.total,
        inactivas: totalEmpresas.total - empresasActivas.total
      },
      atencionMedica: {
        registrosMesActual: registrosMesActual.total
      },
      topObrasSociales: afiliadosPorObraSocial
    });
    
  } catch (error) {
    logger.error('Error obteniendo resumen', { error: error.message });
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
});

module.exports = router;
