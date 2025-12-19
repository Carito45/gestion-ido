const PDFDocument = require('pdfkit');
const { getDB } = require('./database');
/**
 * Generar PDF de factura profesional
 * @param {number} facturaId - ID de la factura
 * @param {object} stream - Stream de respuesta HTTP
 */
async function generarPDFFactura(facturaId, stream) {
  try {
    const db = getDB();
    // Obtener datos de la factura con detalles
    const factura = await db.get(
      `SELECT 
        f.*,
        a.nombre_completo as afiliado_nombre,
        a.dni as afiliado_dni,
        a.numero_afiliado,
        a.direccion as afiliado_direccion,
        a.telefono as afiliado_telefono,
        a.email as afiliado_email,
        a.obra_social as afiliado_obra_social,
        a.plan as afiliado_plan,
        u.nombre_completo as creador_nombre
      FROM facturas f
      INNER JOIN afiliados a ON f.afiliado_id = a.id
      LEFT JOIN usuarios u ON f.usuario_creador_id = u.id
      WHERE f.id = ?`,
      [facturaId]
    );
    
    if (!factura) {
      throw new Error('Factura no encontrada');
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
      [facturaId]
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
      [facturaId]
    );
    
    // Crear documento PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });
    
    // Pipe del documento al stream
    doc.pipe(stream);
    
    // ========== ENCABEZADO ==========
    
    // Logo/Título empresa (puedes reemplazar con imagen real)
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('SISTEMA IDO', 50, 50)
      .fontSize(10)
      .font('Helvetica')
      .text('Instituto de Oncología', 50, 75)
      .text('CUIT: 30-12345678-9', 50, 90)
      .text('Dirección: Av. Principal 1234, CABA', 50, 105)
      .text('Tel: (011) 4444-5555 | Email: info@ido.com.ar', 50, 120);
    
    // Número de factura (derecha)
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('FACTURA', 400, 50, { align: 'right' })
      .fontSize(14)
      .text(factura.numero_factura, 400, 70, { align: 'right' });
    
    // Estado
    const estadoColor = {
      'pendiente': '#f39c12',
      'pagada': '#27ae60',
      'parcial': '#3498db',
      'vencida': '#e74c3c',
      'anulada': '#95a5a6'
    };
    
    doc
      .fontSize(10)
      .fillColor(estadoColor[factura.estado] || '#000000')
      .text(`Estado: ${factura.estado.toUpperCase()}`, 400, 90, { align: 'right' })
      .fillColor('#000000');
    
    // Línea separadora
    doc
      .moveTo(50, 145)
      .lineTo(545, 145)
      .stroke();
    
    // ========== DATOS DEL AFILIADO ==========
    
    let yPos = 165;
    
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('FACTURAR A:', 50, yPos);
    
    yPos += 20;
    
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Obra Social:', 50, yPos)
      .font('Helvetica')
      .text(factura.obra_social || 'N/A', 150, yPos);
    
    yPos += 15;
    
    doc
      .font('Helvetica-Bold')
      .text('Afiliado:', 50, yPos)
      .font('Helvetica')
      .text(factura.afiliado_nombre, 150, yPos);
    
    yPos += 15;
    
    doc
      .font('Helvetica-Bold')
      .text('DNI:', 50, yPos)
      .font('Helvetica')
      .text(factura.afiliado_dni, 150, yPos)
      .font('Helvetica-Bold')
      .text('N° Afiliado:', 300, yPos)
      .font('Helvetica')
      .text(factura.numero_afiliado, 380, yPos);
    
    yPos += 15;
    
    if (factura.afiliado_direccion) {
      doc
        .font('Helvetica-Bold')
        .text('Dirección:', 50, yPos)
        .font('Helvetica')
        .text(factura.afiliado_direccion, 150, yPos, { width: 395 });
      yPos += 15;
    }
    
    if (factura.afiliado_plan) {
      doc
        .font('Helvetica-Bold')
        .text('Plan:', 50, yPos)
        .font('Helvetica')
        .text(factura.afiliado_plan, 150, yPos);
      yPos += 15;
    }
    
    yPos += 10;
    
    // ========== INFORMACIÓN DE LA FACTURA ==========
    
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Período:', 50, yPos)
      .font('Helvetica')
      .text(`${getNombreMes(factura.periodo_mes)} ${factura.periodo_anio}`, 150, yPos)
      .font('Helvetica-Bold')
      .text('Fecha Emisión:', 300, yPos)
      .font('Helvetica')
      .text(formatearFecha(factura.fecha_emision), 400, yPos);
    
    yPos += 15;
    
    if (factura.fecha_vencimiento) {
      doc
        .font('Helvetica-Bold')
        .text('Vencimiento:', 300, yPos)
        .font('Helvetica')
        .text(formatearFecha(factura.fecha_vencimiento), 400, yPos);
      yPos += 15;
    }
    
    yPos += 15;
    
    // Línea separadora
    doc
      .moveTo(50, yPos)
      .lineTo(545, yPos)
      .stroke();
    
    yPos += 20;
    
    // ========== TABLA DE ITEMS ==========
    
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('DETALLE DE PRESTACIONES', 50, yPos);
    
    yPos += 20;
    
    // Encabezado de tabla
    const tableTop = yPos;
    const col1 = 50;
    const col2 = 280;
    const col3 = 360;
    const col4 = 420;
    const col5 = 480;
    
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Descripción', col1, tableTop)
      .text('Profesional', col2, tableTop)
      .text('Cant.', col3, tableTop)
      .text('P. Unit.', col4, tableTop)
      .text('Subtotal', col5, tableTop);
    
    yPos += 15;
    
    // Línea debajo del encabezado
    doc
      .moveTo(50, yPos)
      .lineTo(545, yPos)
      .stroke();
    
    yPos += 10;
    
    // Items
    doc.font('Helvetica').fontSize(8);
    
    items.forEach((item, index) => {
      // Verificar si necesitamos nueva página
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }
      
      // Descripción (puede ocupar 2 líneas)
      const descripcionLines = doc.heightOfString(item.descripcion, { width: 220 });
      const itemHeight = Math.max(descripcionLines, 12);
      
      doc
        .text(item.descripcion, col1, yPos, { width: 220 })
        .text(item.profesional_nombre ? item.profesional_nombre.substring(0, 20) : '-', col2, yPos, { width: 70 })
        .text(item.cantidad.toString(), col3, yPos)
        .text(`$${formatearNumero(item.precio_unitario)}`, col4, yPos)
        .text(`$${formatearNumero(item.subtotal)}`, col5, yPos);
      
      yPos += itemHeight + 5;
      
      // Línea sutil entre items
      if (index < items.length - 1) {
        doc
          .strokeColor('#E0E0E0')
          .moveTo(50, yPos)
          .lineTo(545, yPos)
          .stroke()
          .strokeColor('#000000');
        yPos += 5;
      }
    });
    
    yPos += 10;
    
    // Línea antes de totales
    doc
      .strokeColor('#000000')
      .moveTo(50, yPos)
      .lineTo(545, yPos)
      .stroke();
    
    yPos += 15;
    
    // ========== TOTALES ==========
    
    doc.fontSize(10);
    
    // Subtotal
    doc
      .font('Helvetica-Bold')
      .text('Subtotal:', 400, yPos)
      .font('Helvetica')
      .text(`$${formatearNumero(factura.subtotal)}`, 480, yPos, { align: 'right' });
    
    yPos += 15;
    
    // Descuento (si existe)
    if (factura.descuento_monto > 0) {
      doc
        .font('Helvetica-Bold')
        .text('Descuento:', 400, yPos)
        .font('Helvetica')
        .fillColor('#e74c3c')
        .text(`-$${formatearNumero(factura.descuento_monto)}`, 480, yPos, { align: 'right' })
        .fillColor('#000000');
      yPos += 15;
    }
    
    // Total
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('TOTAL:', 400, yPos)
      .fillColor('#27ae60')
      .text(`$${formatearNumero(factura.total)}`, 480, yPos, { align: 'right' })
      .fillColor('#000000');
    
    yPos += 20;
    
    // Pagado y saldo
    if (factura.monto_pagado > 0) {
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Pagado:', 400, yPos)
        .font('Helvetica')
        .fillColor('#27ae60')
        .text(`$${formatearNumero(factura.monto_pagado)}`, 480, yPos, { align: 'right' })
        .fillColor('#000000');
      
      yPos += 15;
      
      const saldo = factura.total - factura.monto_pagado;
      doc
        .font('Helvetica-Bold')
        .text('Saldo:', 400, yPos)
        .font('Helvetica')
        .fillColor(saldo > 0 ? '#e74c3c' : '#27ae60')
        .text(`$${formatearNumero(saldo)}`, 480, yPos, { align: 'right' })
        .fillColor('#000000');
      
      yPos += 20;
    }
    
    // ========== HISTORIAL DE PAGOS (si existen) ==========
    
    if (pagos.length > 0) {
      yPos += 20;
      
      // Verificar si necesitamos nueva página
      if (yPos > 650) {
        doc.addPage();
        yPos = 50;
      }
      
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('HISTORIAL DE PAGOS', 50, yPos);
      
      yPos += 20;
      
      // Encabezado
      doc
        .fontSize(9)
        .text('Fecha', 50, yPos)
        .text('Monto', 150, yPos)
        .text('Medio de Pago', 250, yPos)
        .text('Comprobante', 380, yPos);
      
      yPos += 15;
      
      doc
        .moveTo(50, yPos)
        .lineTo(545, yPos)
        .stroke();
      
      yPos += 10;
      
      doc.font('Helvetica').fontSize(8);
      
      pagos.forEach(pago => {
        doc
          .text(formatearFecha(pago.fecha_pago), 50, yPos)
          .fillColor('#27ae60')
          .text(`$${formatearNumero(pago.monto)}`, 150, yPos)
          .fillColor('#000000')
          .text(pago.medio_pago, 250, yPos)
          .text(pago.numero_comprobante || '-', 380, yPos);
        
        yPos += 12;
      });
    }
    
    // ========== OBSERVACIONES ==========
    
    if (factura.observaciones) {
      yPos += 20;
      
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }
      
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Observaciones:', 50, yPos);
      
      yPos += 15;
      
      doc
        .font('Helvetica')
        .fontSize(9)
        .text(factura.observaciones, 50, yPos, { width: 495 });
    }
    
    // ========== PIE DE PÁGINA ==========
    
    const pageCount = doc.bufferedPageRange().count;
    
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      // Línea superior del footer
      doc
        .moveTo(50, 750)
        .lineTo(545, 750)
        .stroke();
      
      // Texto del footer
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#666666')
        .text(
          'Este documento es una representación de factura electrónica generada por el Sistema IDO',
          50,
          760,
          { align: 'center', width: 495 }
        )
        .text(
          `Página ${i + 1} de ${pageCount}`,
          50,
          775,
          { align: 'center', width: 495 }
        )
        .fillColor('#000000');
    }
    
    // Finalizar PDF
    doc.end();
    
  } catch (error) {
    console.error('Error generando PDF:', error);
    throw error;
  }
}

// ========== FUNCIONES AUXILIARES ==========

function formatearNumero(numero) {
  if (!numero) return '0.00';
  return parseFloat(numero).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatearFecha(fecha) {
  if (!fecha) return '-';
  const date = new Date(fecha + 'T00:00:00');
  return date.toLocaleDateString('es-AR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

function getNombreMes(mes) {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return meses[mes - 1] || 'Mes inválido';
}

module.exports = { generarPDFFactura };