// ========================================
// SISTEMA DE MODALES
// ========================================

function createModal(title, content, footer) {
    const existingModal = document.getElementById('dynamic-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'dynamic-modal';
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                <button class="modal-close" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                ${footer}
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    });
}

function closeModal() {
    const modal = document.getElementById('dynamic-modal');
    if (modal) {
        modal.remove();
    }
}

// ========================================
// MODAL AFILIADO
// ========================================

async function modalNuevoAfiliado() {
    console.log('🆕 Abriendo modal nuevo afiliado');
    
    // 🔥 FIX: Cargar empresas SIN filtro específico
    let empresasOptions = '<option value="">Sin empresa asignada</option>';
    try {
        console.log('📥 Cargando empresas...');
        const empresasData = await fetchAPI('/api/empresas');
        const empresas = empresasData.data || empresasData.empresas || [];
        console.log('✅ Empresas cargadas:', empresas.length);
        
        empresasOptions += empresas
            .filter(e => e.estado === 'activa')
            .map(e => `<option value="${e.id}">${e.nombre}</option>`)
            .join('');
    } catch (error) {
        console.error('❌ Error cargando empresas:', error);
    }

    const content = `
        <form id="form-afiliado">
            <div class="form-row">
                <div class="form-group">
                    <label for="nombre_completo">Nombre Completo *</label>
                    <input type="text" id="nombre_completo" name="nombre_completo" required>
                </div>
                <div class="form-group">
                    <label for="dni">DNI *</label>
                    <input type="text" id="dni" name="dni" pattern="[0-9]{7,8}" maxlength="8" required>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="fecha_nacimiento">Fecha de Nacimiento</label>
                    <input type="date" id="fecha_nacimiento" name="fecha_nacimiento">
                </div>
                <div class="form-group">
                    <label for="edad">Edad *</label>
                    <input type="number" id="edad" name="edad" min="0" max="120" required>
                </div>
                <div class="form-group">
                    <label for="sexo">Sexo *</label>
                    <select id="sexo" name="sexo" required>
                        <option value="">Seleccionar...</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Femenino">Femenino</option>
                        <option value="Otro">Otro</option>
                    </select>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="telefono">Teléfono</label>
                    <input type="tel" id="telefono" name="telefono">
                </div>
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email">
                </div>
            </div>

            <div class="form-group">
                <label for="direccion">Dirección *</label>
                <input type="text" id="direccion" name="direccion" required>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="numero_afiliado">Número de Afiliado *</label>
                    <input type="text" id="numero_afiliado" name="numero_afiliado" required>
                </div>
                <div class="form-group">
                    <label for="obra_social">Obra Social</label>
                    <input type="text" id="obra_social" name="obra_social" placeholder="Ej: PAMI, OSDE">
                </div>
                <div class="form-group">
                    <label for="plan">Plan</label>
                    <input type="text" id="plan" name="plan">
                </div>
            </div>

            <div class="form-group">
                <label for="prestador_id">Empresa Prestadora</label>
                <select id="prestador_id" name="prestador_id">
                    ${empresasOptions}
                </select>
            </div>

            <div class="form-group">
                <label for="diagnostico">Diagnóstico</label>
                <textarea id="diagnostico" name="diagnostico" rows="3"></textarea>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="fecha_ingreso">Fecha de Ingreso *</label>
                    <input type="date" id="fecha_ingreso" name="fecha_ingreso" required value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label for="medico_tratante">Médico Tratante</label>
                    <input type="text" id="medico_tratante" name="medico_tratante">
                </div>
            </div>

            <div class="form-group">
                <label for="observaciones">Observaciones</label>
                <textarea id="observaciones" name="observaciones" rows="3"></textarea>
            </div>

            <div id="error-container"></div>
        </form>
    `;

    const footer = `
        <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarAfiliado()">Guardar Afiliado</button>
    `;

    createModal('Nuevo Afiliado', content, footer);
}

async function guardarAfiliado(afiliadoId = null) {
    const form = document.getElementById('form-afiliado');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Validación DNI duplicado solo al crear
    if (!afiliadoId) {
        try {
            const afiliadosData = await fetchAPI('/api/afiliados');
            const afiliados = afiliadosData.data || afiliadosData.afiliados || [];
            const dniExiste = afiliados.some(a => a.dni === data.dni);
            
            if (dniExiste) {
                const errorContainer = document.getElementById('error-container');
                errorContainer.innerHTML = '<div class="alert alert-error">⚠️ Ya existe un afiliado con ese DNI</div>';
                return;
            }
        } catch (error) {
            console.error('Error verificando DNI:', error);
        }
    }

    // Convertir valores vacíos a null
    Object.keys(data).forEach(key => {
        if (data[key] === '') {
            data[key] = null;
        }
    });

    // Convertir números
    if (data.edad) data.edad = parseInt(data.edad);
    if (data.prestador_id) data.prestador_id = parseInt(data.prestador_id);

    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = '';

    try {
        const method = afiliadoId ? 'PUT' : 'POST';
        const endpoint = afiliadoId ? `/api/afiliados/${afiliadoId}` : '/api/afiliados';

        const result = await fetchAPI(endpoint, {
            method,
            body: JSON.stringify(data)
        });

        showAlert(result.mensaje || 'Afiliado guardado exitosamente', 'success');
        closeModal();
        loadAfiliados();
        loadDashboardStats();
    } catch (error) {
        if (error.message.includes('detalles')) {
            try {
                const errorData = JSON.parse(error.message.split('detalles":')[1]);
                const errorsHtml = errorData.map(e => 
                    `<div class="alert alert-error">${e.campo}: ${e.mensaje}</div>`
                ).join('');
                errorContainer.innerHTML = errorsHtml;
            } catch {
                errorContainer.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
            }
        } else {
            errorContainer.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
        }
    }
}

async function modalEditarAfiliado(id) {
    console.log('✏️ Abriendo modal editar afiliado ID:', id);
    
    try {
        // 🔥 FIX CRÍTICO: Cargar datos del afiliado PRIMERO
        console.log('📥 Cargando datos del afiliado...');
        const response = await fetchAPI(`/api/afiliados/${id}`);
        const afiliado = response.data || response.afiliado || response;
        console.log('✅ Afiliado cargado:', afiliado.nombre_completo);

        // 🔥 FIX: Cargar empresas SIN filtro estado
        console.log('📥 Cargando empresas...');
        let empresasOptions = '<option value="">Sin empresa asignada</option>';
        const empresasData = await fetchAPI('/api/empresas');
        const empresas = empresasData.data || empresasData.empresas || [];
        console.log('✅ Empresas cargadas:', empresas.length);
        
        empresasOptions += empresas
            .filter(e => e.estado === 'activa')
            .map(e => `<option value="${e.id}" ${e.id === afiliado.prestador_id ? 'selected' : ''}>${e.nombre}</option>`)
            .join('');

        const content = `
            <form id="form-afiliado">
                <div class="form-row">
                    <div class="form-group">
                        <label for="nombre_completo">Nombre Completo *</label>
                        <input type="text" id="nombre_completo" name="nombre_completo" value="${afiliado.nombre_completo}" required>
                    </div>
                    <div class="form-group">
                        <label for="dni">DNI *</label>
                        <input type="text" id="dni" name="dni" pattern="[0-9]{7,8}" value="${afiliado.dni}" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="fecha_nacimiento">Fecha de Nacimiento</label>
                        <input type="date" id="fecha_nacimiento" name="fecha_nacimiento" value="${afiliado.fecha_nacimiento || ''}">
                    </div>
                    <div class="form-group">
                        <label for="edad">Edad *</label>
                        <input type="number" id="edad" name="edad" min="0" max="120" value="${afiliado.edad}" required>
                    </div>
                    <div class="form-group">
                        <label for="sexo">Sexo *</label>
                        <select id="sexo" name="sexo" required>
                            <option value="Masculino" ${afiliado.sexo === 'Masculino' ? 'selected' : ''}>Masculino</option>
                            <option value="Femenino" ${afiliado.sexo === 'Femenino' ? 'selected' : ''}>Femenino</option>
                            <option value="Otro" ${afiliado.sexo === 'Otro' ? 'selected' : ''}>Otro</option>
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="telefono">Teléfono</label>
                        <input type="tel" id="telefono" name="telefono" value="${afiliado.telefono || ''}">
                    </div>
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email" value="${afiliado.email || ''}">
                    </div>
                </div>

                <div class="form-group">
                    <label for="direccion">Dirección *</label>
                    <input type="text" id="direccion" name="direccion" value="${afiliado.direccion}" required>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="numero_afiliado">Número de Afiliado *</label>
                        <input type="text" id="numero_afiliado" name="numero_afiliado" value="${afiliado.numero_afiliado}" required>
                    </div>
                    <div class="form-group">
                        <label for="obra_social">Obra Social</label>
                        <input type="text" id="obra_social" name="obra_social" value="${afiliado.obra_social || ''}">
                    </div>
                    <div class="form-group">
                        <label for="plan">Plan</label>
                        <input type="text" id="plan" name="plan" value="${afiliado.plan || ''}">
                    </div>
                </div>

                <div class="form-group">
                    <label for="prestador_id">Empresa Prestadora</label>
                    <select id="prestador_id" name="prestador_id">
                        ${empresasOptions}
                    </select>
                </div>

                <div class="form-group">
                    <label for="diagnostico">Diagnóstico</label>
                    <textarea id="diagnostico" name="diagnostico" rows="3">${afiliado.diagnostico || ''}</textarea>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="fecha_ingreso">Fecha de Ingreso *</label>
                        <input type="date" id="fecha_ingreso" name="fecha_ingreso" value="${afiliado.fecha_ingreso}" required>
                    </div>
                    <div class="form-group">
                        <label for="fecha_egreso">Fecha de Egreso</label>
                        <input type="date" id="fecha_egreso" name="fecha_egreso" value="${afiliado.fecha_egreso || ''}">
                    </div>
                    <div class="form-group">
                        <label for="medico_tratante">Médico Tratante</label>
                        <input type="text" id="medico_tratante" name="medico_tratante" value="${afiliado.medico_tratante || ''}">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="estado">Estado</label>
                        <select id="estado" name="estado">
                            <option value="activo" ${afiliado.estado === 'activo' ? 'selected' : ''}>Activo</option>
                            <option value="egresado" ${afiliado.estado === 'egresado' ? 'selected' : ''}>Egresado</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label for="observaciones">Observaciones</label>
                    <textarea id="observaciones" name="observaciones" rows="3">${afiliado.observaciones || ''}</textarea>
                </div>

                <div id="error-container"></div>
            </form>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="guardarAfiliado(${id})">Actualizar Afiliado</button>
        `;

        createModal('Editar Afiliado', content, footer);
        console.log('✅ Modal de edición creado');
        
    } catch (error) {
        console.error('❌ Error en modalEditarAfiliado:', error);
        showAlert('Error cargando datos del afiliado: ' + error.message, 'error');
    }
}

// ========================================
// MODAL EMPRESA
// ========================================

function modalNuevaEmpresa() {
    const content = `
        <form id="form-empresa">
            <div class="form-group">
                <label for="nombre">Nombre de la Empresa *</label>
                <input type="text" id="nombre" name="nombre" required>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="cuit">CUIT</label>
                    <input type="text" id="cuit" name="cuit" pattern="[0-9]{2}-[0-9]{8}-[0-9]{1}" placeholder="XX-XXXXXXXX-X">
                    <small>Formato: 30-12345678-9</small>
                </div>
                <div class="form-group">
                    <label for="telefono">Teléfono</label>
                    <input type="tel" id="telefono" name="telefono">
                </div>
            </div>

            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email">
            </div>

            <div class="form-group">
                <label for="direccion">Dirección</label>
                <input type="text" id="direccion" name="direccion">
            </div>

            <div class="form-group">
                <label for="servicios_ofrecidos">Servicios Ofrecidos</label>
                <textarea id="servicios_ofrecidos" name="servicios_ofrecidos" rows="3" placeholder="Ej: Atención domiciliaria, kinesiología, enfermería..."></textarea>
            </div>

            <div class="form-group">
                <label for="observaciones">Observaciones</label>
                <textarea id="observaciones" name="observaciones" rows="3"></textarea>
            </div>

            <div id="error-container"></div>
        </form>
    `;

    const footer = `
        <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarEmpresa()">Guardar Empresa</button>
    `;

    createModal('Nueva Empresa Prestadora', content, footer);
}

async function guardarEmpresa(empresaId = null) {
    const form = document.getElementById('form-empresa');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    Object.keys(data).forEach(key => {
        if (data[key] === '') {
            data[key] = null;
        }
    });

    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = '';

    try {
        const method = empresaId ? 'PUT' : 'POST';
        const endpoint = empresaId ? `/api/empresas/${empresaId}` : '/api/empresas';

        const result = await fetchAPI(endpoint, {
            method,
            body: JSON.stringify(data)
        });

        showAlert(result.mensaje || 'Empresa guardada exitosamente', 'success');
        closeModal();
        loadEmpresas();
        loadDashboardStats();
    } catch (error) {
        errorContainer.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
    }
}

async function modalEditarEmpresa(id) {
    try {
        const response = await fetchAPI(`/api/empresas/${id}`);
        const empresa = response.data || response.empresa || response;

        const content = `
            <form id="form-empresa">
                <div class="form-group">
                    <label for="nombre">Nombre de la Empresa *</label>
                    <input type="text" id="nombre" name="nombre" value="${empresa.nombre}" required>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="cuit">CUIT</label>
                        <input type="text" id="cuit" name="cuit" pattern="[0-9]{2}-[0-9]{8}-[0-9]{1}" value="${empresa.cuit || ''}" placeholder="XX-XXXXXXXX-X">
                        <small>Formato: 30-12345678-9</small>
                    </div>
                    <div class="form-group">
                        <label for="telefono">Teléfono</label>
                        <input type="tel" id="telefono" name="telefono" value="${empresa.telefono || ''}">
                    </div>
                </div>

                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" value="${empresa.email || ''}">
                </div>

                <div class="form-group">
                    <label for="direccion">Dirección</label>
                    <input type="text" id="direccion" name="direccion" value="${empresa.direccion || ''}">
                </div>

                <div class="form-group">
                    <label for="servicios_ofrecidos">Servicios Ofrecidos</label>
                    <textarea id="servicios_ofrecidos" name="servicios_ofrecidos" rows="3">${empresa.servicios_ofrecidos || ''}</textarea>
                </div>

                <div class="form-group">
                    <label for="estado">Estado</label>
                    <select id="estado" name="estado">
                        <option value="activa" ${empresa.estado === 'activa' ? 'selected' : ''}>Activa</option>
                        <option value="inactiva" ${empresa.estado === 'inactiva' ? 'selected' : ''}>Inactiva</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="observaciones">Observaciones</label>
                    <textarea id="observaciones" name="observaciones" rows="3">${empresa.observaciones || ''}</textarea>
                </div>

                <div id="error-container"></div>
            </form>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="guardarEmpresa(${id})">Actualizar Empresa</button>
        `;

        createModal('Editar Empresa', content, footer);
    } catch (error) {
        showAlert('Error cargando datos de la empresa', 'error');
    }
}

// ========================================
// MODAL USUARIO (SOLO ADMIN)
// ========================================

function modalNuevoUsuario() {
    const content = `
        <form id="form-usuario">
            <div class="form-group">
                <label for="nombre_completo">Nombre Completo *</label>
                <input type="text" id="nombre_completo" name="nombre_completo" required>
            </div>

            <div class="form-group">
                <label for="email">Email *</label>
                <input type="email" id="email" name="email" required>
            </div>

            <div class="form-group">
                <label for="password">Contraseña *</label>
                <input type="password" id="password" name="password" minlength="6" required>
                <small>Debe contener al menos una mayúscula, una minúscula y un número</small>
            </div>

            <div class="form-group">
                <label for="rol">Rol *</label>
                <select id="rol" name="rol" required>
                    <option value="">Seleccionar...</option>
                    <option value="admin">Administrador</option>
                    <option value="medico">Médico</option>
                    <option value="licenciado">Licenciado</option>
                    <option value="auditor">Auditor</option>
                </select>
            </div>

            <div id="error-container"></div>
        </form>
    `;

    const footer = `
        <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarUsuario()">Crear Usuario</button>
    `;

    createModal('Nuevo Usuario', content, footer);
}

async function guardarUsuario() {
    const form = document.getElementById('form-usuario');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = '';

    try {
        const result = await fetchAPI('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        showAlert(result.mensaje || 'Usuario creado exitosamente', 'success');
        closeModal();
        loadUsuarios();
        loadDashboardStats();
    } catch (error) {
        errorContainer.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
    }
}

// ========================================
// MODAL DOCUMENTOS
// ========================================

async function modalDocumentos(afiliadoId, nombreAfiliado) {
try {
const response = await fetchAPI(`/api/documentos/afiliado/${afiliadoId}`);
const documentos = response.data || response.documentos || [];
const categoriasNombres = {
'historia_clinica': 'Historia Clínica',
'ordenes_medicas': 'Órdenes Médicas',
'informes': 'Informes',
'facturacion': 'Facturación',
'consentimientos': 'Consentimientos',
'otros': 'Otros'
};
const documentosHTML = documentos.length > 0 ? `
<table style="width: 100%; margin-top: 15px;">
<thead>
<tr>
<th>Archivo</th>
<th>Categoría</th>
<th>Fecha</th>
<th>Acciones</th>
</tr>
</thead>
<tbody>
${documentos.map(doc => `
<tr>
<td>${doc.nombre_archivo}</td>
<td><span class="badge badge-info">${categoriasNombres[doc.categoria]}</span></td>
<td>${new Date(doc.fecha_carga).toLocaleString()}</td>
<td>
<button class="btn btn-sm btn-outline" onclick="descargarDocumento(${doc.id}, '${doc.nombre_archivo}')">
📥 Descargar
</button>
<button class="btn btn-sm btn-danger" onclick="eliminarDocumento(${doc.id}, ${afiliadoId})">
🗑️ Eliminar
</button>
</td>
</tr>
`).join('')}
</tbody>
</table>
` : '<p style="text-align: center; color: #64748b; margin: 20px 0;">No hay documentos cargados</p>';
const content = `
<h4 style="margin-bottom: 15px;">Afiliado: ${nombreAfiliado}</h4>
<div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
<h5 style="margin-bottom: 10px;">Subir Nuevo Documento</h5>
<form id="form-documento" enctype="multipart/form-data">
<div class="form-group">
<label for="categoria">Categoría *</label>
<select id="categoria" name="categoria" required>
<option value="">Seleccionar categoría...</option>
<option value="historia_clinica">Historia Clínica</option>
<option value="ordenes_medicas">Órdenes Médicas</option>
<option value="informes">Informes</option>
<option value="facturacion">Facturación</option>
<option value="consentimientos">Consentimientos</option>
<option value="otros">Otros</option>
</select>
</div>
<div class="form-group">
<label for="archivo">Archivo *</label>
<input type="file" id="archivo" name="archivo" required accept=".pdf,.doc,.docx,.jpg,.jpeg,.png">
<small>Formatos permitidos: PDF, Word, Imágenes. Máximo 10MB</small>
</div>
<div class="form-group">
<label for="descripcion">Descripción (opcional)</label>
<textarea id="descripcion" name="descripcion" rows="2"></textarea>
</div>
<div id="upload-progress" style="display: none; margin-top: 10px;">
<div style="background: #e2e8f0; border-radius: 4px; height: 8px; overflow: hidden;">
<div id="progress-bar" style="background: #2563eb; height: 100%; width: 0%; transition: width 0.3s;"></div>
</div>
<small id="progress-text" style="color: #64748b;">Subiendo...</small>
</div>
<button type="submit" class="btn btn-primary" style="margin-top: 10px; width: 100%;">
📤 Subir Documento
</button>
</form>
</div>
<h5 style="margin-bottom: 10px;">Documentos Cargados (${documentos.length})</h5>
${documentosHTML}
<div id="error-container"></div>
`;
const footer = `
<button class="btn btn-outline" onclick="closeModal()">Cerrar</button>
`;
createModal('Gestión de Documentos', content, footer);
document.getElementById('form-documento').addEventListener('submit', async (e) => {
e.preventDefault();
await subirDocumento(afiliadoId);
});
} catch (error) {
showAlert('Error cargando documentos', 'error');
}
}

async function subirDocumento(afiliadoId) {
const form = document.getElementById('form-documento');
const formData = new FormData(form);
const errorContainer = document.getElementById('error-container');
const uploadProgress = document.getElementById('upload-progress');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
errorContainer.innerHTML = '';
uploadProgress.style.display = 'block';
try {
const token = localStorage.getItem('token');
const xhr = new XMLHttpRequest();
xhr.upload.addEventListener('progress', (e) => {
if (e.lengthComputable) {
const percentComplete = (e.loaded / e.total) * 100;
progressBar.style.width = percentComplete + '%';
progressText.textContent = `Subiendo... ${Math.round(percentComplete)}%`;
}
});
xhr.addEventListener('load', () => {
if (xhr.status === 201) {
showAlert('Documento subido exitosamente', 'success');
const nombreAfiliado = document.querySelector('.modal-title').textContent.split(': ')[1];
setTimeout(() => {
modalDocumentos(afiliadoId, nombreAfiliado);
}, 500);
} else {
const response = JSON.parse(xhr.responseText);
errorContainer.innerHTML = `<div class="alert alert-error">${response.error || 'Error al subir documento'}</div>`;
uploadProgress.style.display = 'none';
}
});
xhr.addEventListener('error', () => {
errorContainer.innerHTML = '<div class="alert alert-error">Error de conexión al subir archivo</div>';
uploadProgress.style.display = 'none';
});
xhr.open('POST', `/api/documentos/afiliado/${afiliadoId}`);
xhr.setRequestHeader('Authorization', `Bearer ${token}`);
xhr.send(formData);
} catch (error) {
errorContainer.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
uploadProgress.style.display = 'none';
}
}

async function descargarDocumento(documentoId, nombreArchivo) {
try {
const token = localStorage.getItem('token');
const response = await fetch(`/api/documentos/${documentoId}/descargar`, {
headers: {
'Authorization': `Bearer ${token}`
}
});
if (!response.ok) {
throw new Error('Error al descargar documento');
}
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = nombreArchivo;
document.body.appendChild(a);
a.click();
window.URL.revokeObjectURL(url);
document.body.removeChild(a);
showAlert('Documento descargado', 'success');
} catch (error) {
showAlert('Error al descargar documento', 'error');
}
}

async function eliminarDocumento(documentoId, afiliadoId) {
if (!confirm('¿Estás seguro de eliminar este documento? Esta acción no se puede deshacer.')) {
return;
}
try {
await fetchAPI(`/api/documentos/${documentoId}`, { method: 'DELETE' });
showAlert('Documento eliminado exitosamente', 'success');
const nombreAfiliado = document.querySelector('.modal-title').textContent.split(': ')[1];
modalDocumentos(afiliadoId, nombreAfiliado);
} catch (error) {
showAlert('Error al eliminar documento', 'error');
}
}



// ========================================
// MODAL ATENCIÓN MÉDICA
// ========================================

async function modalAtencionMedica(afiliadoId, nombreAfiliado) {
    try {
        const anioActual = new Date().getFullYear();
        const response = await fetchAPI(`/api/atencion-medica/afiliado/${afiliadoId}?anio=${anioActual}`);
        const registros = response.data || response.registros || [];
        
        const meses = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        
        const registrosHTML = `
            <table style="width: 100%; margin-top: 15px;">
                <thead>
                    <tr>
                        <th>Mes</th>
                        <th>At. Médica</th>
                        <th>Hs Enf.</th>
                        <th>KTM</th>
                        <th>KTR</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${registros.map(reg => `
                        <tr>
                            <td>${meses[reg.mes - 1]} ${reg.anio}</td>
                            <td>${reg.atencion_medica_mensual}</td>
                            <td>${reg.hs_enfermeria_semanal}h</td>
                            <td>${reg.ktm_sesiones_semanal}</td>
                            <td>${reg.ktr_sesiones_semanal}</td>
                            <td>
                                <button class="btn btn-sm btn-outline" onclick="verRegistroAtencion(${reg.id})">Ver</button>
                                <button class="btn btn-sm btn-outline" onclick="editarRegistroAtencion(${reg.id})">Editar</button>
                            </td>
                        </tr>
                    `).join('')}
                    ${registros.length === 0 ? '<tr><td colspan="6" style="text-align: center; color: #64748b;">No hay registros para este año</td></tr>' : ''}
                </tbody>
            </table>
        `;
        
        const content = `
            <h4 style="margin-bottom: 15px;">Afiliado: ${nombreAfiliado}</h4>
            <p style="color: #64748b; margin-bottom: 20px;">Registros de atención médica del año ${anioActual}</p>
            
            ${registrosHTML}
            
            <div id="error-container" style="margin-top: 15px;"></div>
        `;
        
        const footer = `
            <button class="btn btn-outline" onclick="exportarAtencionMedica(${afiliadoId})">📊 Exportar Excel</button>
            <button class="btn btn-outline" onclick="closeModal()">Cerrar</button>
            <button class="btn btn-primary" onclick="nuevoRegistroAtencion(${afiliadoId}, '${nombreAfiliado}')">+ Nuevo Registro</button>
        `;
        
        createModal('Atención Médica', content, footer);
        
    } catch (error) {
        showAlert('Error cargando registros de atención médica', 'error');
    }
}

async function nuevoRegistroAtencion(afiliadoId, nombreAfiliado) {
    const anioActual = new Date().getFullYear();
    const mesActual = new Date().getMonth() + 1;
    
    const content = `
        <h4 style="margin-bottom: 15px;">Nuevo Registro - ${nombreAfiliado}</h4>
        
        <form id="form-atencion">
            <input type="hidden" name="afiliado_id" value="${afiliadoId}">
            
            <div class="form-row">
                <div class="form-group">
                    <label for="mes">Mes *</label>
                    <select id="mes" name="mes" required>
                        <option value="">Seleccionar...</option>
                        ${Array.from({length: 12}, (_, i) => i + 1).map(m => 
                            `<option value="${m}" ${m === mesActual ? 'selected' : ''}>
                                ${['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][m-1]}
                            </option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="anio">Año *</label>
                    <input type="number" id="anio" name="anio" value="${anioActual}" min="2020" max="2100" required>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="atencion_medica_mensual">Atención Médica Mensual</label>
                    <input type="number" id="atencion_medica_mensual" name="atencion_medica_mensual" min="0" value="0">
                </div>
                <div class="form-group">
                    <label for="hs_enfermeria_semanal">Horas Enfermería Semanal</label>
                    <input type="number" id="hs_enfermeria_semanal" name="hs_enfermeria_semanal" min="0" step="0.5" value="0">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="ktm_sesiones_semanal">Sesiones KTM Semanal</label>
                    <input type="number" id="ktm_sesiones_semanal" name="ktm_sesiones_semanal" min="0" value="0">
                </div>
                <div class="form-group">
                    <label for="ktr_sesiones_semanal">Sesiones KTR Semanal</label>
                    <input type="number" id="ktr_sesiones_semanal" name="ktr_sesiones_semanal" min="0" value="0">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="cuidados_domiciliarios_hs_mensual">Cuidados Domiciliarios (hs/mes)</label>
                    <input type="number" id="cuidados_domiciliarios_hs_mensual" name="cuidados_domiciliarios_hs_mensual" min="0" step="0.5" value="0">
                </div>
                <div class="form-group">
                    <label for="especialidades_medicas_mensual">Especialidades Médicas Mensual</label>
                    <input type="number" id="especialidades_medicas_mensual" name="especialidades_medicas_mensual" min="0" value="0">
                </div>
            </div>
            
            <div class="form-group">
                <label for="observaciones">Observaciones</label>
                <textarea id="observaciones" name="observaciones" rows="3"></textarea>
            </div>
            
            <div id="error-container"></div>
        </form>
    `;
    
    const footer = `
        <button class="btn btn-outline" onclick="modalAtencionMedica(${afiliadoId}, '${nombreAfiliado}')">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarRegistroAtencion(${afiliadoId}, '${nombreAfiliado}')">Guardar</button>
    `;
    
    createModal('Nuevo Registro de Atención', content, footer);
}

async function guardarRegistroAtencion(afiliadoId, nombreAfiliado, registroId = null) {
    const form = document.getElementById('form-atencion');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    Object.keys(data).forEach(key => {
        if (key !== 'observaciones' && key !== 'afiliado_id') {
            data[key] = parseFloat(data[key]) || 0;
        }
    });
    
    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = '';
    
    try {
        const method = registroId ? 'PUT' : 'POST';
        const endpoint = registroId ? `/api/atencion-medica/${registroId}` : '/api/atencion-medica';
        
        await fetchAPI(endpoint, {
            method,
            body: JSON.stringify(data)
        });
        
        showAlert('Registro guardado exitosamente', 'success');
        modalAtencionMedica(afiliadoId, nombreAfiliado);
        
    } catch (error) {
        errorContainer.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
    }
}

async function verRegistroAtencion(registroId) {
    try {
        const response = await fetchAPI(`/api/atencion-medica/${registroId}`);
        const reg = response.data || response.registro || response;
        
        const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        
        const content = `
            <div style="line-height: 1.8;">
                <p><strong>Período:</strong> ${meses[reg.mes - 1]} ${reg.anio}</p>
                <p><strong>Afiliado:</strong> ${reg.afiliado_nombre}</p>
                <hr>
                <p><strong>Atención Médica Mensual:</strong> ${reg.atencion_medica_mensual}</p>
                <p><strong>Horas Enfermería Semanal:</strong> ${reg.hs_enfermeria_semanal}h</p>
                <p><strong>Sesiones KTM Semanal:</strong> ${reg.ktm_sesiones_semanal}</p>
                <p><strong>Sesiones KTR Semanal:</strong> ${reg.ktr_sesiones_semanal}</p>
                <p><strong>Cuidados Domiciliarios (hs/mes):</strong> ${reg.cuidados_domiciliarios_hs_mensual}h</p>
                <p><strong>Especialidades Médicas Mensual:</strong> ${reg.especialidades_medicas_mensual}</p>
                ${reg.observaciones ? `<p><strong>Observaciones:</strong> ${reg.observaciones}</p>` : ''}
                <hr>
                <p style="font-size: 12px; color: #64748b;">Registrado por: ${reg.usuario_nombre || 'N/A'}</p>
            </div>
        `;
        
        const footer = `
            <button class="btn btn-outline" onclick="closeModal()">Cerrar</button>
        `;
        
        createModal('Detalle de Atención Médica', content, footer);
        
    } catch (error) {
        showAlert('Error cargando detalle', 'error');
    }
}

async function editarRegistroAtencion(registroId) {
    try {
        const response = await fetchAPI(`/api/atencion-medica/${registroId}`);
        const reg = response.data || response.registro || response;
        
        const content = `
            <h4 style="margin-bottom: 15px;">Editar Registro - ${reg.afiliado_nombre}</h4>
            
            <form id="form-atencion">
                <input type="hidden" name="afiliado_id" value="${reg.afiliado_id}">
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="mes">Mes *</label>
                        <select id="mes" name="mes" required>
                            ${Array.from({length: 12}, (_, i) => i + 1).map(m => 
                                `<option value="${m}" ${m === reg.mes ? 'selected' : ''}>
                                    ${['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][m-1]}
                                </option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="anio">Año *</label>
                        <input type="number" id="anio" name="anio" value="${reg.anio}" min="2020" max="2100" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="atencion_medica_mensual">Atención Médica Mensual</label>
                        <input type="number" id="atencion_medica_mensual" name="atencion_medica_mensual" min="0" value="${reg.atencion_medica_mensual}">
                    </div>
                    <div class="form-group">
                        <label for="hs_enfermeria_semanal">Horas Enfermería Semanal</label>
                        <input type="number" id="hs_enfermeria_semanal" name="hs_enfermeria_semanal" min="0" step="0.5" value="${reg.hs_enfermeria_semanal}">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="ktm_sesiones_semanal">Sesiones KTM Semanal</label>
                        <input type="number" id="ktm_sesiones_semanal" name="ktm_sesiones_semanal" min="0" value="${reg.ktm_sesiones_semanal}">
                    </div>
                    <div class="form-group">
                        <label for="ktr_sesiones_semanal">Sesiones KTR Semanal</label>
                        <input type="number" id="ktr_sesiones_semanal" name="ktr_sesiones_semanal" min="0" value="${reg.ktr_sesiones_semanal}">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="cuidados_domiciliarios_hs_mensual">Cuidados Domiciliarios (hs/mes)</label>
                        <input type="number" id="cuidados_domiciliarios_hs_mensual" name="cuidados_domiciliarios_hs_mensual" min="0" step="0.5" value="${reg.cuidados_domiciliarios_hs_mensual}">
                    </div>
                    <div class="form-group">
                        <label for="especialidades_medicas_mensual">Especialidades Médicas Mensual</label>
                        <input type="number" id="especialidades_medicas_mensual" name="especialidades_medicas_mensual" min="0" value="${reg.especialidades_medicas_mensual}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="observaciones">Observaciones</label>
                    <textarea id="observaciones" name="observaciones" rows="3">${reg.observaciones || ''}</textarea>
                </div>
                
                <div id="error-container"></div>
            </form>
        `;
        
        const footer = `
            <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="guardarRegistroAtencion(${reg.afiliado_id}, '${reg.afiliado_nombre}', ${registroId})">Actualizar</button>
        `;
        
        createModal('Editar Registro de Atención', content, footer);
        
    } catch (error) {
        showAlert('Error cargando registro', 'error');
    }
}
// ========================================
// HACER FUNCIONES GLOBALES
// ========================================

window.closeModal = closeModal;
window.modalNuevoAfiliado = modalNuevoAfiliado;
window.guardarAfiliado = guardarAfiliado;
window.modalEditarAfiliado = modalEditarAfiliado;
window.modalNuevaEmpresa = modalNuevaEmpresa;
window.guardarEmpresa = guardarEmpresa;
window.modalEditarEmpresa = modalEditarEmpresa;
window.modalNuevoUsuario = modalNuevoUsuario;
window.guardarUsuario = guardarUsuario;
window.modalDocumentos = modalDocumentos;
window.subirDocumento = subirDocumento;
window.descargarDocumento = descargarDocumento;
window.eliminarDocumento = eliminarDocumento;
window.modalAtencionMedica = modalAtencionMedica;
window.nuevoRegistroAtencion = nuevoRegistroAtencion;
window.guardarRegistroAtencion = guardarRegistroAtencion;
window.verRegistroAtencion = verRegistroAtencion;
window.editarRegistroAtencion = editarRegistroAtencion;
window.modalNuevoProfesional = modalNuevoProfesional;
window.guardarProfesional = guardarProfesional;
window.modalEditarProfesional = modalEditarProfesional;
window.createModal = createModal;
        
// ========================================
// MODAL PROFESIONALES -
// ========================================

async function modalNuevoProfesional() {
    try {
        let empresasOptions = '<option value="">Independiente (sin empresa)</option>';
        const empresasData = await fetchAPI('/api/empresas');
        const empresas = empresasData.data || empresasData.empresas || [];
        
        empresasOptions += empresas
            .filter(e => e.estado === 'activa')
            .map(e => `<option value="${e.id}">${e.nombre}</option>`)
            .join('');
        
        const content = `
            <form id="form-profesional">
                <div class="form-row">
                    <div class="form-group">
                        <label for="nombre_completo">Nombre Completo *</label>
                        <input type="text" id="nombre_completo" name="nombre_completo" required>
                    </div>
                    <div class="form-group">
                        <label for="tipo_profesional">Tipo de Profesional *</label>
                        <select id="tipo_profesional" name="tipo_profesional" required>
                            <option value="">Seleccionar...</option>
                            <option value="medico">Médico</option>
                            <option value="enfermero">Enfermero/a</option>
                            <option value="kinesiologo">Kinesiólogo/a</option>
                            <option value="terapeuta_ocupacional">Terapeuta Ocupacional</option>
                            <option value="fonoaudiologo">Fonoaudiólogo/a</option>
                            <option value="psicologo">Psicólogo/a</option>
                            <option value="nutricionista">Nutricionista</option>
                            <option value="otro">Otro</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="matricula">Matrícula</label>
                        <input type="text" id="matricula" name="matricula">
                    </div>
                    <div class="form-group">
                        <label for="especialidad">Especialidad</label>
                        <input type="text" id="especialidad" name="especialidad">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="empresa_id">Empresa Prestadora</label>
                    <select id="empresa_id" name="empresa_id">
                        ${empresasOptions}
                    </select>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="telefono">Teléfono</label>
                        <input type="tel" id="telefono" name="telefono">
                    </div>
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="direccion">Dirección</label>
                    <input type="text" id="direccion" name="direccion">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="modalidad">Modalidad de Atención</label>
                        <select id="modalidad" name="modalidad">
                            <option value="">Seleccionar...</option>
                            <option value="presencial">Presencial</option>
                            <option value="domiciliaria">Domiciliaria</option>
                            <option value="ambas">Ambas</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="honorarios_por_sesion">Honorarios por Sesión ($)</label>
                        <input type="number" id="honorarios_por_sesion" name="honorarios_por_sesion" min="0" step="0.01">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="observaciones">Observaciones</label>
                    <textarea id="observaciones" name="observaciones" rows="3"></textarea>
                </div>
                
                <div id="error-container"></div>
            </form>
        `;
        
        const footer = `
            <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="guardarProfesional()">Guardar Profesional</button>
        `;
        
        createModal('Nuevo Profesional', content, footer);
        
    } catch (error) {
        showAlert('Error cargando datos', 'error');
    }
}

async function guardarProfesional(profesionalId = null) {
    const form = document.getElementById('form-profesional');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    Object.keys(data).forEach(key => {
        if (data[key] === '') {
            data[key] = null;
        }
    });
    
    if (data.empresa_id) data.empresa_id = parseInt(data.empresa_id);
    if (data.honorarios_por_sesion) data.honorarios_por_sesion = parseFloat(data.honorarios_por_sesion);
    
    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = '';
    
    try {
        const method = profesionalId ? 'PUT' : 'POST';
        const endpoint = profesionalId ? `/api/profesionales/${profesionalId}` : '/api/profesionales';
        
        const result = await fetchAPI(endpoint, {
            method,
            body: JSON.stringify(data)
        });
        
        showAlert(result.mensaje || 'Profesional guardado exitosamente', 'success');
        closeModal();
        loadProfesionales();
        
    } catch (error) {
        errorContainer.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
    }
}

async function modalEditarProfesional(id) {
    try {
        const response = await fetchAPI(`/api/profesionales/${id}`);
        const prof = response.data || response.profesional || response;
        
        let empresasOptions = '<option value="">Independiente (sin empresa)</option>';
        const empresasData = await fetchAPI('/api/empresas');
        const empresas = empresasData.data || empresasData.empresas || [];
        
        empresasOptions += empresas
            .filter(e => e.estado === 'activa')
            .map(e => `<option value="${e.id}" ${e.id === prof.empresa_id ? 'selected' : ''}>${e.nombre}</option>`)
            .join('');
        
        const content = `
            <form id="form-profesional">
                <div class="form-row">
                    <div class="form-group">
                        <label for="nombre_completo">Nombre Completo *</label>
                        <input type="text" id="nombre_completo" name="nombre_completo" value="${prof.nombre_completo}" required>
                    </div>
                    <div class="form-group">
                        <label for="tipo_profesional">Tipo de Profesional *</label>
                        <select id="tipo_profesional" name="tipo_profesional" required>
                            <option value="medico" ${prof.tipo_profesional === 'medico' ? 'selected' : ''}>Médico</option>
                            <option value="enfermero" ${prof.tipo_profesional === 'enfermero' ? 'selected' : ''}>Enfermero/a</option>
                            <option value="kinesiologo" ${prof.tipo_profesional === 'kinesiologo' ? 'selected' : ''}>Kinesiólogo/a</option>
                            <option value="terapeuta_ocupacional" ${prof.tipo_profesional === 'terapeuta_ocupacional' ? 'selected' : ''}>Terapeuta Ocupacional</option>
                            <option value="fonoaudiologo" ${prof.tipo_profesional === 'fonoaudiologo' ? 'selected' : ''}>Fonoaudiólogo/a</option>
                            <option value="psicologo" ${prof.tipo_profesional === 'psicologo' ? 'selected' : ''}>Psicólogo/a</option>
                            <option value="nutricionista" ${prof.tipo_profesional === 'nutricionista' ? 'selected' : ''}>Nutricionista</option>
                            <option value="otro" ${prof.tipo_profesional === 'otro' ? 'selected' : ''}>Otro</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="matricula">Matrícula</label>
                        <input type="text" id="matricula" name="matricula" value="${prof.matricula || ''}">
                    </div>
                    <div class="form-group">
                        <label for="especialidad">Especialidad</label>
                        <input type="text" id="especialidad" name="especialidad" value="${prof.especialidad || ''}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="empresa_id">Empresa Prestadora</label>
                    <select id="empresa_id" name="empresa_id">
                        ${empresasOptions}
                    </select>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="telefono">Teléfono</label>
                        <input type="tel" id="telefono" name="telefono" value="${prof.telefono || ''}">
                    </div>
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email" value="${prof.email || ''}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="direccion">Dirección</label>
                    <input type="text" id="direccion" name="direccion" value="${prof.direccion || ''}">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="modalidad">Modalidad de Atención</label>
                        <select id="modalidad" name="modalidad">
                            <option value="">Seleccionar...</option>
                            <option value="presencial" ${prof.modalidad === 'presencial' ? 'selected' : ''}>Presencial</option>
                            <option value="domiciliaria" ${prof.modalidad === 'domiciliaria' ? 'selected' : ''}>Domiciliaria</option>
                            <option value="ambas" ${prof.modalidad === 'ambas' ? 'selected' : ''}>Ambas</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="honorarios_por_sesion">Honorarios por Sesión ($)</label>
                        <input type="number" id="honorarios_por_sesion" name="honorarios_por_sesion" min="0" step="0.01" value="${prof.honorarios_por_sesion || ''}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="observaciones">Observaciones</label>
                    <textarea id="observaciones" name="observaciones" rows="3">${prof.observaciones || ''}</textarea>
                </div>
                
                <div id="error-container"></div>
            </form>
        `;
        
        const footer = `
            <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="guardarProfesional(${id})">Actualizar Profesional</button>
        `;
        
        createModal('Editar Profesional', content, footer);
        
    } catch (error) {
        showAlert('Error cargando datos del profesional', 'error');
    }
}
// ========================================
// MODAL DOCUMENTOS
// ========================================

async function subirDocumento(afiliadoId, nombreAfiliado) {
    const form = document.getElementById('form-documento');
    const formData = new FormData(form);
    const errorContainer = document.getElementById('error-container');
    const uploadProgress = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    errorContainer.innerHTML = '';
    uploadProgress.style.display = 'block';
    
    try {
        const token = localStorage.getItem('token');
        const xhr = new XMLHttpRequest();
        
        // Progreso de subida
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressBar.style.width = percentComplete + '%';
                progressText.textContent = `Subiendo... ${Math.round(percentComplete)}%`;
            }
        });
        
        xhr.addEventListener('load', () => {
            if (xhr.status === 201) {
                showAlert('Documento subido exitosamente', 'success');
                setTimeout(() => {
                    modalDocumentos(afiliadoId, nombreAfiliado);
                }, 500);
            } else {
                const response = JSON.parse(xhr.responseText);
                throw new Error(response.error || 'Error al subir documento');
            }
        });
        
        xhr.addEventListener('error', () => {
            throw new Error('Error de conexión al subir archivo');
        });
        
        // 🔥 FIX CRÍTICO: URL CORRECTA (sin /subir)
        xhr.open('POST', `/api/documentos/afiliado/${afiliadoId}`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
        
    } catch (error) {
        errorContainer.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
        uploadProgress.style.display = 'none';
    }
}

async function descargarDocumento(documentoId, nombreArchivo) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/documentos/${documentoId}/descargar`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al descargar documento');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showAlert('Documento descargado', 'success');
    } catch (error) {
        showAlert('Error al descargar documento', 'error');
    }
}

async function eliminarDocumento(documentoId, afiliadoId) {
    if (!confirm('¿Estás seguro de eliminar este documento? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        await fetchAPI(`/api/documentos/${documentoId}`, { method: 'DELETE' });
        showAlert('Documento eliminado exitosamente', 'success');
        
        const nombreAfiliado = document.querySelector('.modal-title').textContent.split(': ')[1];
        modalDocumentos(afiliadoId, nombreAfiliado);
    } catch (error) {
        showAlert('Error al eliminar documento', 'error');
    }
}


// ========================================
// MODAL ATENCIÓN MÉDICA
// ========================================

async function modalAtencionMedica(afiliadoId, nombreAfiliado) {
    try {
        const anioActual = new Date().getFullYear();
        const response = await fetchAPI(`/api/atencion-medica/afiliado/${afiliadoId}?anio=${anioActual}`);
        const registros = response.data || response.registros || [];
        
        const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        
        const registrosHTML = `
            <table class="table table-striped" style="width: 100%; margin-top: 10px;">
                <thead>
                    <tr>
                        <th>Período</th>
                        <th>Atención Médica Mensual</th>
                        <th>Horas Enfermería Semanal</th>
                        <th>Sesiones KTM Semanal</th>
                        <th>Sesiones KTR Semanal</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${registros.map(reg => `
                        <tr>
                            <td>${meses[reg.mes - 1]} ${reg.anio}</td>
                            <td>${reg.atencion_medica_mensual}</td>
                            <td>${reg.hs_enfermeria_semanal}h</td>
                            <td>${reg.ktm_sesiones_semanal}</td>
                            <td>${reg.ktr_sesiones_semanal}</td>
                            <td>
                                <button class="btn btn-sm btn-outline" onclick="verRegistroAtencion(${reg.id})">Ver</button>
                                <button class="btn btn-sm btn-outline" onclick="editarRegistroAtencion(${reg.id})">Editar</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        const content = `
            <h4 style="margin-bottom: 15px;">Afiliado: ${nombreAfiliado}</h4>
            ${registrosHTML}
        `;
        
        const footer = `
            <button class="btn btn-o    utline" onclick="closeModal()">Cerrar</button>
            <button class="btn btn-primary" onclick="nuevoRegistroAtencion(${afiliadoId}, '${nombreAfiliado}')">Nuevo Registro</button>
        `;
        
        createModal('Registros de Atención Médica', content, footer);
        
    } catch (error) {
        showAlert('Error cargando registros de atención médica', 'error');
    }
}

function nuevoRegistroAtencion(afiliadoId, nombreAfiliado) {
    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth() + 1;
    const anioActual = fechaActual.getFullYear();
    
    const content = `
        <h4 style="             margin-bottom: 15px;">Nuevo Registro - ${nombreAfiliado}</h4>
        
        <form id="form-atencion">
            <input type="hidden" name="afiliado_id" value="${afiliadoId}">
            
            <div class="form-row">
                <div class="form-group">                                
                    <label for="mes">Mes *</label>
                    <select id="mes" name="mes" required>
                        ${Array.from({length: 12}, (_, i) => i + 1).map(m => 
                            `<option value="${m}" ${m === mesActual ? 'selected' : ''}>
                                ${['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][m-1]}
                            </option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="anio">Año *</label>
                    <input type="number" id="anio" name="anio" value="${anioActual}" min="2020" max="2100" required>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="atencion_medica_mensual">Atención Médica Mensual</label>
                    <input type="number" id="atencion_medica_mensual" name="atencion_medica_mensual" min="0" value="0">
                </div>
                <div class="form-group">
                    <label for="hs_enfermeria_semanal">Horas Enfermería Semanal</label>
                    <input type="number" id="hs_enfermeria_semanal" name="hs_enfermeria_semanal" min="0" step="0.5" value="0">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="ktm_sesiones_semanal">Sesiones KTM Semanal</label>
                    <input type="number" id="ktm_sesiones_semanal" name="ktm_sesiones_semanal" min="0" value="0">
                </div>
                <div class="form-group">            
                    <label for="ktr_sesiones_semanal">Sesiones KTR Semanal</label>
                    <input type="number" id="ktr_sesiones_semanal" name="ktr_sesiones_semanal" min="0" value="0">
                </div>      
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="cuidados_domiciliarios_hs_mensual">Cuidados Domiciliarios (hs/mes)</label>
                    <input type="number" id="cuidados_domiciliarios_hs_mensual" name="cuidados_domiciliarios_hs_mensual" min="0" step="0.5" value="0">
                </div>
                <div class="form-group">    
                    <label for="especialidades_medicas_mensual">Especialidades Médicas Mensual</label>      
                    <input type="number" id="especialidades_medicas_mensual" name="especialidades_medicas_mensual" min="0" value="0">
                </div>
            </div>
            
            <div class="form-group">
                <label for="observaciones">Observaciones</label>
                <textarea id="observaciones" name="observaciones" rows="3"></textarea>
            </div>
            
            <div id="error-container"></div>
        </form>
    `;          
                        
                        
    const footer = `
        <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarRegistroAtencion(${afiliadoId}, '${nombreAfiliado}')">Guardar Registro</button>
    `;
    
    createModal('Nuevo Registro de Atención', content, footer);
}

async function guardarRegistroAtencion(afiliadoId, nombreAfiliado, registroId = null) {
    const form = document.getElementById('form-atencion');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    Object.keys(data).forEach(key => {
        if (data[key] === '') {
            data[key] = null;
        } else if (['mes', 'anio', 'atencion_medica_mensual', 'hs_enfermeria_semanal', 'ktm_sesiones_semanal', 'ktr_sesiones_semanal', 'cuidados_domiciliarios_hs_mensual', 'especialidades_medicas_mensual'].includes(key)) {
            data[key] = parseFloat(data[key]);
        }
    });
    
    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = '';
    
    try {
        const method = registroId ? 'PUT' : 'POST';
        const endpoint = registroId ? `/api/atencion-medica/${registroId}` : '/api/atencion-medica';
        
        const result = await fetchAPI(endpoint, {
            method,
            body: JSON.stringify(data)
        });
        
        showAlert(result.mensaje || 'Registro guardado exitosamente', 'success');
        closeModal();
        modalAtencionMedica(afiliadoId, nombreAfiliado);
        
    } catch (error) {
        errorContainer.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
    }
}

async function verRegistroAtencion(registroId) {
    try {
        const response = await fetchAPI(`/api/atencion-medica/${registroId}`);
        const reg = response.data || response.registro || response;
        
        const content = `
            <div>
                <h4 style="margin-bottom: 15px;">Detalle de Registro - ${reg.afiliado_nombre}</h4>
                <p><strong>Período:</strong> ${['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][reg.mes - 1]} ${reg.anio}</p>
                <p><strong>Atención Médica Mensual:</strong> ${reg.atencion_medica_mensual}</p>
                <p><strong>Horas Enfermería Semanal:</strong> ${reg.hs_enfermeria_semanal}h</p>
                <p><strong>Sesiones KTM Semanal:</strong> ${reg.ktm_sesiones_semanal}</p>
                <p><strong>Sesiones KTR Semanal:</strong>               
                    ${reg.ktr_sesiones_semanal}</p>
                <p><strong>Cuidados Domiciliarios (hs/mes):</strong> ${reg.cuidados_domiciliarios_hs_mensual}</p>
                <p><strong>Especialidades Médicas Mensual:</strong> ${reg.especialidades_medicas_mensual}</p>
                <p><strong>Observaciones:</strong> ${reg.observaciones || 'Ninguna'}</p>
            </div>
        `;
        
        const footer = `
            <button class="btn btn-outline" onclick="closeModal()">Cerrar</button>
        `;
        
        createModal('Detalle de Registro de Atención', content, footer);
        
    } catch (error) {
        showAlert('Error cargando registro', 'error');
    }
}

async function editarRegistroAtencion(registroId) {
    try {
        const response = await fetchAPI(`/api/atencion-medica/${registroId}`);
        const reg = response.data || response.registro || response;         
        const content = `       
            <h4 style="margin-bottom: 15px;">Editar Registro - ${reg.afiliado_nombre}</h4>
            
            <form id="form-atencion">
                <input type="hidden" name="afiliado_id" value="${reg.afiliado_id}">
                
                <div class="form-row">
                    <div class="form-group">                                
                        <label for="mes">Mes *</label>
                        <select id="mes" name="mes" required>   

                            ${Array.from({length: 12}, (_, i) => i + 1).map(m => 
                                `<option value="${m}" ${m === reg.mes ? 'selected' : ''}>
                                    ${['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][m-1]}
                                </option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="anio">Año *</label>
                        <input type="number" id="anio" name="anio" value="${reg.anio}" min="2020" max="2100" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="atencion_medica_mensual">Atención Médica Mensual</label>
                        <input type="number" id="atencion_medica_mensual" name="atencion_medica_mensual" min="0" value="${reg.atencion_medica_mensual}">
                    </div>
                    <div class="form-group">
                        <label for="hs_enfermeria_semanal">Horas Enfermería Semanal</label>
                        <input type="number" id="hs_enfermeria_semanal" name="hs_enfermeria_semanal" min="0" step="0.5" value="${reg.hs_enfermeria_semanal}">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">        
                        <label for="ktm_sesiones_semanal">Sesiones KTM Semanal</label>
                        <input type="number" id="ktm_sesiones_semanal" name="ktm_sesiones_semanal" min="0" value="${reg.ktm_sesiones_semanal}">
                    </div>
                    <div class="form-group">    
                        <label for="ktr_sesiones_semanal">Sesiones KTR Semanal</label>
                        <input type="number" id="ktr_sesiones_semanal" name="ktr_sesiones_semanal" min="0" value="${reg.ktr_sesiones_semanal}">
                    </div>      
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                            
                        <label for="cuidados_domiciliarios_hs_mensual">Cuidados Domiciliarios (hs/mes)</label>
                        <input type="number" id="cuidados_domiciliarios_hs_mensual" name="cuidados_domiciliarios_hs_mensual" min="0" step="0.5" value="${reg.cuidados_domiciliarios_hs_mensual}">
                    </div>
                    <div class="form-group">    
                        <label for="especialidades_medicas_mensual">Especialidades Médicas Mensual</label>  
                        <input type="number" id="especialidades_medicas_mensual" name="especialidades_medicas_mensual" min="0" value="${reg.especialidades_medicas_mensual}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="observaciones">Observaciones</label>            
                    <textarea id="observaciones" name="observaciones" rows="3">${reg.observaciones || ''}</textarea>
                </div>  
                            
                            
                <div id="error-container"></div>
            </form>
        `;                      
        const footer = `                
            <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>        
            <button class="btn btn-primary" onclick="guardarRegistroAtencion(${reg.afiliado_id}, '${reg.afiliado_nombre}', ${registroId})">Actualizar Registro</button>
        `;                                                                                      
        createModal('Editar Registro de Atención', content, footer);
        
    } catch (error) {
        showAlert('Error cargando registro', 'error');
    }
}                                         