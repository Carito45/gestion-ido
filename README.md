# 🏥 Sistema de Gestión IDO
Sistema de Gestión para Internación Domiciliaria

## 📋 Características

- ✅ Gestión de afiliados/pacientes
- ✅ Historia clínica digital
- ✅ Registro de atenciones médicas
- ✅ Gestión de profesionales
- ✅ Facturación automatizada
- ✅ Nomenclador de prestaciones
- ✅ Reportes y estadísticas
- ✅ Sistema de roles y permisos
- ✅ Auditoría completa

## 🚀 Instalación

### Requisitos
- Node.js 16 o superior
- npm 7 o superior

### Pasos

1. **Clonar/descargar el proyecto**
```bash
cd ~/gestion-ido
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
nano .env
```

Editar `.env` con tus configuraciones:
```env
JWT_SECRET=<generar_secreto_seguro>
SESSION_SECRET=<generar_secreto_seguro>
NODE_ENV=development
```

Generar secretos seguros:
```bash
openssl rand -base64 32
```

4. **Crear usuario administrador**
```bash
npm run create-admin
```

5. **Iniciar servidor**
```bash
npm start
```

El servidor estará disponible en: http://localhost:3000

## 🔧 Scripts Disponibles
```bash
npm start          # Iniciar servidor
npm run dev        # Modo desarrollo (con nodemon)
npm run create-admin  # Crear usuario administrador
npm run db:reset   # Resetear base de datos
npm run logs:clean # Limpiar logs
```

## 📁 Estructura del Proyecto
```
gestion-ido/
├── config/          # Configuraciones (BD, logs, uploads, PDF)
├── middleware/      # Middlewares (auth, validaciones)
├── routes/          # Rutas de la API
├── public/          # Frontend (HTML, CSS, JS)
├── uploads/         # Archivos subidos
├── logs/            # Logs del sistema
├── server.js        # Servidor principal
├── security-utils.js # Utilidades de seguridad
└── .env             # Variables de entorno (NO subir a Git)
```

## 👥 Roles de Usuario

| Rol | Permisos |
|-----|----------|
| **admin** | Acceso total, gestión de usuarios |
| **medico** | Gestión de afiliados y atenciones |
| **licenciado** | Gestión de afiliados y atenciones |
| **auditor** | Solo lectura y reportes |

## 🔒 Seguridad

Ver [SEGURIDAD.md](./SEGURIDAD.md) para detalles completos.

### Características de seguridad:
- Rate limiting en endpoints críticos
- Autenticación JWT
- Validación de inputs
- Headers de seguridad (Helmet)
- Auditoría completa
- Logs detallados

## 📊 API Endpoints

### Autenticación
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Usuario actual
- `POST /api/auth/register` - Crear usuario (solo admin)

### Afiliados
- `GET /api/afiliados` - Listar
- `GET /api/afiliados/:id` - Ver detalle
- `POST /api/afiliados` - Crear
- `PUT /api/afiliados/:id` - Actualizar
- `DELETE /api/afiliados/:id` - Eliminar (solo admin)

### Facturación
- `GET /api/facturacion` - Listar facturas
- `GET /api/facturacion/:id` - Ver factura
- `POST /api/facturacion/generar` - Generar factura
- `POST /api/facturacion/:id/pagos` - Registrar pago
- `GET /api/facturacion/:id/pdf` - Descargar PDF

### Profesionales
- `GET /api/profesionales` - Listar
- `POST /api/profesionales` - Crear
- `PUT /api/profesionales/:id` - Actualizar

### Nomenclador
- `GET /api/nomenclador` - Listar prestaciones
- `POST /api/nomenclador` - Crear prestación
- `PUT /api/nomenclador/:id` - Actualizar

## 🗄️ Base de Datos

SQLite 3 con las siguientes tablas:
- usuarios
- afiliados
- empresas_prestadoras
- profesionales
- atencion_medica
- facturas
- factura_items
- factura_pagos
- nomenclador
- documentos
- auditoria

## 📝 Logs

Los logs se guardan en:
- `logs/combined.log` - Todos los logs
- `logs/error.log` - Solo errores

Ver logs en tiempo real:
```bash
tail -f logs/combined.log
```

## 🐛 Solución de Problemas

### El servidor no inicia
```bash
# Verificar que el puerto 3000 esté libre
lsof -i :3000

# Matar proceso si está ocupado
kill -9 <PID>
```

### Error de permisos en uploads/
```bash
chmod 755 uploads/
chmod 755 uploads/*
```

### Error de base de datos
```bash
# Verificar permisos
chmod 644 gestion_ido.db

# Resetear BD (¡CUIDADO! Borra todo)
npm run db:reset
```

## 📞 Soporte

Para reportar bugs o solicitar características, contactar al administrador del sistema.

## 📄 Licencia

Uso interno - Propiedad privada

## 🔄 Actualizaciones

### Última versión: 1.0.0
- Sistema base implementado
- Medidas de seguridad aplicadas
- Documentación completa

---

**Desarrollado para gestión de Internación Domiciliaria**
