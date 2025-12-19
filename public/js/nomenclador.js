// nomenclador.js - Gestión del Nomenclador
const API_URL = '/api/nomenclador';

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  verificarAutenticacion();
  cargarNomenclador();
});

function verificarAutenticacion() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/pages/login.html';
  }
}

/**
 * Cargar nomenclador con filtros
 */
async function cargarNomenclador() {
  try {
    const tipo = document.getElementById('filtroTipo').value;
    const vigente = document.getElementById('filtroVigente').value;
    
    const params = new URLSearchParams();
    if (tipo) params.append('tipo_prestacion', tipo);
    if (vigente) params.append('vigente', vigente);
    
    const response = await fetch(`${API_URL}?${params}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (!response.ok) throw new Error('Error al cargar nomenclador');
    
    const data = await response.json();
    renderizarTabla(data.prestaciones);
    
  } catch (error) {
    console.error('Error:', error);
    mostrarError('Error al cargar nomenclador');
  }
}

/**
 * Renderizar tabla
 */
function renderizarTabla(prestaciones) {
  const tbody = document.getElementById('nomencladorBody');
  
  if (prestaciones.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: #95a5a6;">
          No hay prestaciones para mostrar
        </td>
      </tr>
    `;
    return;
  }
  
  const tiposNombres = {
    'atencion_medica': 'Atención Médica',
    'enfermeria': 'Enfermería',
    'kinesiologia_ktm': 'Kinesiología KTM',
    'kinesiologia_ktr': 'Kinesiología KTR',
    'cuidados_domiciliarios': 'Cuidados Domiciliarios',
    'especialidad_medica': 'Especialidad Médica',
    'terapia_ocupacional': 'Terapia Ocupacional',
    'fonoaudiologia': 'Fonoaudiología',
    'psicologia': 'Psicología',
    'nutricion': 'Nutrición',
    'otro': 'Otro'
  };
  
  tbody.innerHTML = prestaciones.map(p => `
    <tr>
      <td><strong>${p.codigo}</strong></td>
      <td>${p.descripcion}</td>
      <td>${tiposNombres[p.tipo_prestacion] || p.tipo_prestacion}</td>
      <td class="precio-grande">$${formatearNumero(p.precio_unitario)}</td>
      <td>${p.unidad}</td>
      <td>
        <span class="badge badge-${p.vigente ? 'vigente' : 'no-vigente'}">
          ${p.vigente ? 'Vigente' : 'No vigente'}
        </span>
      </td>
      <td style="display: flex; gap: 5px;">
        <button class="btn btn-primary btn-sm" onclick="editarPrestacion(${p.id})" title="Editar">
          ✏️
        </button>
        <button class="btn btn-secondary btn-sm" onclick="toggleVigencia(${p.id}, ${p.vigente})" title="${p.vigente ? 'Desactivar' : 'Activar'}">
          ${p.vigente ? '🔴' : '🟢'}
        </button>
        <button class="btn btn-secondary btn-sm" onclick="eliminarPrestacion(${p.id})" title="Eliminar">
          🗑️
        </button>
      </td>
    </tr>
  `).join('');
}

/**
 * Abrir modal para nueva prestación
 */
function abrirModalNuevo() {
  document.getElementById('modalTitle').textContent = 'Nueva Prestación';
  document.getElementById('formPrestacion').reset();
  document.getElementById('prestacionId').value = '';
  document.getElementById('modalPrestacion').classList.add('active');
}

/**
 * Editar prestación
 */
async function editarPrestacion(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (!response.ok) throw new Error('Error al cargar prestación');
    
    const prestacion = await response.json();
    
    document.getElementById('modalTitle').textContent = 'Editar Prestación';
    document.getElementById('prestacionId').value = prestacion.id;
    document.getElementById('codigo').value = prestacion.codigo;
    document.getElementById('descripcion').value = prestacion.descripcion;
    document.getElementById('tipoPrestacion').value = prestacion.tipo_prestacion;
    document.getElementById('precioUnitario').value = prestacion.precio_unitario;
    document.getElementById('unidad').value = prestacion.unidad;
    document.getElementById('obraSocial').value = prestacion.obra_social || '';
    document.getElementById('observaciones').value = prestacion.observaciones || '';
    
    document.getElementById('modalPrestacion').classList.add('active');
    
  } catch (error) {
    console.error('Error:', error);
    mostrarError('Error al cargar prestación');
  }
}

/**
 * Guardar prestación (crear o actualizar)
 */
async function guardarPrestacion(event) {
  event.preventDefault();
  
  const id = document.getElementById('prestacionId').value;
  const datos = {
    codigo: document.getElementById('codigo').value.toUpperCase(),
    descripcion: document.getElementById('descripcion').value,
    tipo_prestacion: document.getElementById('tipoPrestacion').value,
    precio_unitario: parseFloat(document.getElementById('precioUnitario').value),
    unidad: document.getElementById('unidad').value,
    obra_social: document.getElementById('obraSocial').value || null,
    observaciones: document.getElementById('observaciones').value || null
  };
  
  try {
    const url = id ? `${API_URL}/${id}` : API_URL;
    const method = id ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(datos)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Error al guardar prestación');
    }
    
    mostrarExito(id ? 'Prestación actualizada exitosamente' : 'Prestación creada exitosamente');
    cerrarModal();
    cargarNomenclador();
    
  } catch (error) {
    console.error('Error:', error);
    mostrarError(error.message);
  }
}

/**
 * Toggle vigencia
 */
async function toggleVigencia(id, vigenciaActual) {
  try {
    const response = await fetch(`${API_URL}/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Error al cambiar estado');
    }
    
    mostrarExito(vigenciaActual ? 'Prestación desactivada' : 'Prestación activada');
    cargarNomenclador();
    
  } catch (error) {
    console.error('Error:', error);
    mostrarError(error.message);
  }
}

/**
 * Eliminar prestación
 */
async function eliminarPrestacion(id) {
  if (!confirm('¿Está seguro de eliminar esta prestación? Esta acción no se puede deshacer.')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Error al eliminar prestación');
    }
    
    mostrarExito('Prestación eliminada exitosamente');
    cargarNomenclador();
    
  } catch (error) {
    console.error('Error:', error);
    mostrarError(error.message);
  }
}

/**
 * Limpiar filtros
 */
function limpiarFiltros() {
  document.getElementById('filtroTipo').value = '';
  document.getElementById('filtroVigente').value = 'true';
  cargarNomenclador();
}

/**
 * Cerrar modal
 */
function cerrarModal() {
  document.getElementById('modalPrestacion').classList.remove('active');
  document.getElementById('formPrestacion').reset();
}

// ========== Utilidades ==========

function formatearNumero(numero) {
  if (!numero) return '0.00';
  return parseFloat(numero).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function mostrarExito(mensaje) {
  alert('✅ ' + mensaje);
}

function mostrarError(mensaje) {
  alert('❌ ' + mensaje);
}