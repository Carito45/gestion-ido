// facturacion.js - Gestión de facturación
const API_URL = '/api/facturacion';
let facturaActual = null;

// Inicializar página
document.addEventListener('DOMContentLoaded', () => {
  inicializarFechas();
  cargarAfiliados();
  cargarFacturas();
  cargarResumen();
});

/**
 * Inicializar selectores de fecha
 */
function inicializarFechas() {
  const anioActual = new Date().getFullYear();
  const mesActual = new Date().getMonth() + 1;
  
  // Selector de años (filtro)
  const filtroAnio = document.getElementById('filtroAnio');
  for (let i = anioActual; i >= anioActual - 5; i--) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    filtroAnio.appendChild(option);
  }
  
  // Selector de años (generar factura)
  const periodoAnio = document.getElementById('periodoAnio');
  for (let i = anioActual; i >= anioActual - 2; i--) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    periodoAnio.appendChild(option);
  }
  periodoAnio.value = anioActual;
  
  // Pre-seleccionar mes anterior
  document.getElementById('periodoMes').value = mesActual === 1 ? 12 : mesActual - 1;
  
  // Fecha de pago por defecto
  document.getElementById('pagoFecha').valueAsDate = new Date();
}

/**
 * Cargar afiliados activos
 */
/**
 * Cargar afiliados activos
 */
async function cargarAfiliados() {
  try {
    const response = await fetch('/api/afiliados?estado=activo', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (!response.ok) throw new Error('Error al cargar afiliados');
    
    const data = await response.json();
    
    // ✅ CORRECCIÓN: El backend devuelve { success: true, count: 0, data: [] }
    let afiliados = [];
    
    if (data.success && Array.isArray(data.data)) {
      afiliados = data.data;
    } else if (Array.isArray(data.afiliados)) {
      afiliados = data.afiliados;
    } else if (Array.isArray(data)) {
      afiliados = data;
    } else {
      console.error('Formato inesperado de respuesta:', data);
      afiliados = [];
    }
    
    const select = document.getElementById('afiliadoSelect');
    select.innerHTML = '<option value="">Seleccione un afiliado</option>';
    
    if (afiliados.length === 0) {
      console.log('ℹ️ No hay afiliados activos disponibles');
      return;
    }
    
    afiliados.forEach(afiliado => {
      const option = document.createElement('option');
      option.value = afiliado.id;
      option.textContent = `${afiliado.nombre_completo} - ${afiliado.obra_social || 'Sin OS'}`;
      select.appendChild(option);
    });
    
    console.log(`✅ ${afiliados.length} afiliados cargados`);
    
  } catch (error) {
    console.error('Error cargando afiliados:', error);
    mostrarError('Error al cargar afiliados');
  }
}

/**
 * Cargar facturas con filtros
 */
async function cargarFacturas() {
  try {
    const estado = document.getElementById('filtroEstado').value;
    const mes = document.getElementById('filtroMes').value;
    const anio = document.getElementById('filtroAnio').value;
    
    const params = new URLSearchParams();
    if (estado) params.append('estado', estado);
    if (mes) params.append('mes', mes);
    if (anio) params.append('anio', anio);
    
    const response = await fetch(`${API_URL}?${params}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (!response.ok) throw new Error('Error al cargar facturas');
    
    const facturas = await response.json();
    renderizarFacturas(facturas);
    
  } catch (error) {
    console.error('Error:', error);
    mostrarError('Error al cargar facturas');
  }
}

/**
 * Renderizar tabla de facturas
 */
function renderizarFacturas(facturas) {
  const tbody = document.getElementById('facturasBody');
  
  if (facturas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">
          <div>📄</div>
          <div>No hay facturas para mostrar</div>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = facturas.map(f => `
    <tr>
      <td><strong>${f.numero_factura}</strong></td>
      <td>
        ${f.afiliado_nombre}<br>
        <small style="color: #7f8c8d;">${f.numero_afiliado}</small>
      </td>
      <td>${f.obra_social || '-'}</td>
      <td>${getNombreMes(f.periodo_mes)} ${f.periodo_anio}</td>
      <td>${formatearFecha(f.fecha_emision)}</td>
      <td><strong>$${formatearNumero(f.total)}</strong></td>
      <td style="color: #27ae60;">$${formatearNumero(f.monto_pagado)}</td>
      <td><span class="badge badge-${f.estado}">${f.estado.toUpperCase()}</span></td>
      <td class="actions">
        <button class="btn btn-primary btn-sm" onclick="verDetalle(${f.id})" title="Ver detalle">
          👁️
        </button>
        ${f.estado !== 'pagada' && f.estado !== 'anulada' ? `
          <button class="btn btn-success btn-sm" onclick="abrirModalPago(${f.id})" title="Registrar pago">
            💰
          </button>
        ` : ''}
        ${f.estado !== 'anulada' && f.estado !== 'pagada' ? `
          <button class="btn btn-secondary btn-sm" onclick="anularFactura(${f.id})" title="Anular">
            ❌
          </button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

/**
 * Cargar resumen estadístico
 */
async function cargarResumen() {
  try {
    const mes = document.getElementById('filtroMes').value;
    const anio = document.getElementById('filtroAnio').value;
    
    const params = new URLSearchParams();
    if (mes) params.append('mes', mes);
    if (anio) params.append('anio', anio);
    
    const response = await fetch(`${API_URL}/reportes/resumen?${params}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (!response.ok) throw new Error('Error al cargar resumen');
    
    const data = await response.json();
    const r = data.resumen;
    
    document.getElementById('totalFacturas').textContent = r.total_facturas || 0;
    document.getElementById('totalPendientes').textContent = r.pendientes || 0;
    document.getElementById('totalPagadas').textContent = r.pagadas || 0;
    document.getElementById('totalFacturado').textContent = `$${formatearNumero(r.total_facturado)}`;
    document.getElementById('totalCobrado').textContent = `$${formatearNumero(r.total_cobrado)}`;
    document.getElementById('saldoPendiente').textContent = `$${formatearNumero(r.saldo_pendiente)}`;
    
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Generar nueva factura
 */
async function generarFactura(event) {
  event.preventDefault();
  
  const afiliado_id = document.getElementById('afiliadoSelect').value;
  const periodo_mes = document.getElementById('periodoMes').value;
  const periodo_anio = document.getElementById('periodoAnio').value;
  const observaciones = document.getElementById('observaciones').value;
  
  try {
    const response = await fetch(`${API_URL}/generar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ afiliado_id, periodo_mes, periodo_anio, observaciones })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Error al generar factura');
    }
    
    mostrarExito(`Factura ${data.factura.numero_factura} generada exitosamente`);
    cerrarModalGenerarFactura();
    cargarFacturas();
    cargarResumen();
    
  } catch (error) {
    console.error('Error:', error);
    mostrarError(error.message);
  }
}

/**
 * Ver detalle de factura
 */
async function verDetalle(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (!response.ok) throw new Error('Error al cargar factura');
    
    const factura = await response.json();
    facturaActual = factura;
    
    const content = document.getElementById('facturaDetalleContent');
    content.innerHTML = `
      <div class="factura-detalle">
        <div class="detalle-row">
          <div class="detalle-item">
            <strong>N° Factura:</strong>
            <div style="font-size: 18px; color: #2c3e50; font-weight: bold;">${factura.numero_factura}</div>
          </div>
          <div class="detalle-item">
            <strong>Estado:</strong>
            <span class="badge badge-${factura.estado}">${factura.estado.toUpperCase()}</span>
          </div>
        </div>
        
        <div class="detalle-row">
          <div class="detalle-item">
            <strong>Afiliado:</strong>
            <div>${factura.afiliado_nombre}</div>
            <div style="color: #7f8c8d; font-size: 14px;">DNI: ${factura.afiliado_dni}</div>
            <div style="color: #7f8c8d; font-size: 14px;">N° Afiliado: ${factura.numero_afiliado}</div>
          </div>
          <div class="detalle-item">
            <strong>Obra Social:</strong>
            <div>${factura.obra_social || '-'}</div>
            ${factura.afiliado_plan ? `<div style="color: #7f8c8d; font-size: 14px;">Plan: ${factura.afiliado_plan}</div>` : ''}
          </div>
        </div>
        
        <div class="detalle-row">
          <div class="detalle-item">
            <strong>Período:</strong>
            <div>${getNombreMes(factura.periodo_mes)} ${factura.periodo_anio}</div>
          </div>
          <div class="detalle-item">
            <strong>Fecha Emisión:</strong>
            <div>${formatearFecha(factura.fecha_emision)}</div>
          </div>
        </div>
        
        ${factura.observaciones ? `
          <div class="detalle-item" style="margin-top: 15px;">
            <strong>Observaciones:</strong>
            <div style="color: #7f8c8d;">${factura.observaciones}</div>
          </div>
        ` : ''}
      </div>
      
      <div class="items-table">
        <h3 style="margin-bottom: 15px; color: #2c3e50;">📋 Items de Factura</h3>
        <table>
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Profesional</th>
              <th style="text-align: center;">Cantidad</th>
              <th style="text-align: right;">P. Unitario</th>
              <th style="text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${factura.items.map(item => `
              <tr>
                <td>
                  <strong>${item.descripcion}</strong>
                  ${item.tipo_prestacion ? `<br><small style="color: #7f8c8d;">${item.tipo_prestacion.replace(/_/g, ' ')}</small>` : ''}
                </td>
                <td>
                  ${item.profesional_nombre || '-'}
                  ${item.matricula ? `<br><small style="color: #7f8c8d;">Mat: ${item.matricula}</small>` : ''}
                </td>
                <td style="text-align: center;">${item.cantidad}</td>
                <td style="text-align: right;">$${formatearNumero(item.precio_unitario)}</td>
                <td style="text-align: right;"><strong>$${formatearNumero(item.subtotal)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="totales">
        <div><strong>Subtotal:</strong> $${formatearNumero(factura.subtotal)}</div>
        ${factura.descuento_monto > 0 ? `<div style="color: #e74c3c;"><strong>Descuento:</strong> -$${formatearNumero(factura.descuento_monto)}</div>` : ''}
        <div class="total-final">TOTAL: $${formatearNumero(factura.total)}</div>
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ecf0f1;">
          <div style="color: #27ae60;"><strong>Pagado:</strong> $${formatearNumero(factura.monto_pagado)}</div>
          <div style="color: #e74c3c;"><strong>Saldo:</strong> $${formatearNumero(factura.total - factura.monto_pagado)}</div>
        </div>
      </div>
      
      ${factura.pagos.length > 0 ? `
        <div class="pagos-section">
          <h3 style="margin-bottom: 15px; color: #2c3e50;">💵 Historial de Pagos</h3>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Monto</th>
                <th>Medio</th>
                <th>Comprobante</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              ${factura.pagos.map(pago => `
                <tr>
                  <td>${formatearFecha(pago.fecha_pago)}</td>
                  <td><strong style="color: #27ae60;">$${formatearNumero(pago.monto)}</strong></td>
                  <td>${pago.medio_pago}</td>
                  <td>${pago.numero_comprobante || '-'}</td>
                  <td>${pago.usuario_nombre || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
      
      <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 30px;">
        ${factura.estado !== 'pagada' && factura.estado !== 'anulada' ? `
          <button class="btn btn-success" onclick="abrirModalPago(${factura.id})">
            💰 Registrar Pago
          </button>
        ` : ''}
        <button class="btn btn-primary" onclick="descargarPDF(${factura.id})">
          📄 Descargar PDF
        </button>
        <button class="btn btn-secondary" onclick="cerrarModalDetalle()">
          Cerrar
        </button>
      </div>
    `;
    
    document.getElementById('modalDetalleFactura').classList.add('active');
    
  } catch (error) {
    console.error('Error:', error);
    mostrarError('Error al cargar detalle de factura');
  }
}

/**
 * Abrir modal para registrar pago
 */
function abrirModalPago(facturaId) {
  // Si venimos desde el detalle, usar esa factura
  if (facturaActual && facturaActual.id === facturaId) {
    const saldo = facturaActual.total - facturaActual.monto_pagado;
    document.getElementById('pagoFacturaId').value = facturaId;
    document.getElementById('pagoMonto').max = saldo;
    document.getElementById('pagoMonto').value = saldo;
    document.getElementById('saldoInfo').textContent = `Saldo pendiente: $${formatearNumero(saldo)}`;
    document.getElementById('modalRegistrarPago').classList.add('active');
    cerrarModalDetalle();
  } else {
    // Cargar factura
    fetch(`${API_URL}/${facturaId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(r => r.json())
    .then(factura => {
      const saldo = factura.total - factura.monto_pagado;
      document.getElementById('pagoFacturaId').value = facturaId;
      document.getElementById('pagoMonto').max = saldo;
      document.getElementById('pagoMonto').value = saldo;
      document.getElementById('saldoInfo').textContent = `Saldo pendiente: $${formatearNumero(saldo)}`;
      document.getElementById('modalRegistrarPago').classList.add('active');
    })
    .catch(error => {
      console.error('Error:', error);
      mostrarError('Error al cargar factura');
    });
  }
}

/**
 * Registrar pago
 */
async function registrarPago(event) {
  event.preventDefault();
  
  const facturaId = document.getElementById('pagoFacturaId').value;
  const monto = document.getElementById('pagoMonto').value;
  const fecha_pago = document.getElementById('pagoFecha').value;
  const medio_pago = document.getElementById('pagoMedio').value;
  const numero_comprobante = document.getElementById('pagoComprobante').value;
  const observaciones = document.getElementById('pagoObservaciones').value;
  
  try {
    const response = await fetch(`${API_URL}/${facturaId}/pagos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ 
        monto, 
        fecha_pago, 
        medio_pago, 
        numero_comprobante, 
        observaciones 
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Error al registrar pago');
    }
    
    mostrarExito('Pago registrado exitosamente');
    cerrarModalPago();
    cargarFacturas();
    cargarResumen();
    
  } catch (error) {
    console.error('Error:', error);
    mostrarError(error.message);
  }
}

/**
 * Anular factura
 */
async function anularFactura(id) {
  if (!confirm('¿Está seguro de anular esta factura? Esta acción no se puede deshacer.')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Error al anular factura');
    }
    
    mostrarExito('Factura anulada exitosamente');
    cargarFacturas();
    cargarResumen();
    
  } catch (error) {
    console.error('Error:', error);
    mostrarError(error.message);
  }
}

/**
 * Descargar PDF
 */
async function descargarPDF(id) {
  try {
    mostrarExito('Generando PDF...');
    
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/${id}/pdf`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Error al generar PDF');
    }
    
    // Obtener el blob del PDF
    const blob = await response.blob();
    
    // Crear URL temporal y descargar
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Factura_${id}_${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    
    // Limpiar
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    mostrarExito('PDF descargado exitosamente');
    
  } catch (error) {
    console.error('Error:', error);
    mostrarError('Error al descargar PDF: ' + error.message);
  }
}

/**
 * Limpiar filtros
 */
function limpiarFiltros() {
  document.getElementById('filtroEstado').value = '';
  document.getElementById('filtroMes').value = '';
  document.getElementById('filtroAnio').value = '';
  cargarFacturas();
  cargarResumen();
}

// ========== Funciones de Modal ==========

function abrirModalGenerarFactura() {
  document.getElementById('formGenerarFactura').reset();
  inicializarFechas();
  document.getElementById('modalGenerarFactura').classList.add('active');
}

function cerrarModalGenerarFactura() {
  document.getElementById('modalGenerarFactura').classList.remove('active');
}

function cerrarModalDetalle() {
  document.getElementById('modalDetalleFactura').classList.remove('active');
  facturaActual = null;
}

function cerrarModalPago() {
  document.getElementById('modalRegistrarPago').classList.remove('active');
  document.getElementById('formRegistrarPago').reset();
}

// ========== Utilidades ==========

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

function mostrarExito(mensaje) {
  alert('✅ ' + mensaje);
}

function mostrarError(mensaje) {
  alert('❌ ' + mensaje);
}
