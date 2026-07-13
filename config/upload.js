const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');
const { validarCategoria } = require('../helpers/security-utils');
// Crear directorio de uploads si no existe
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Organizar por categoría si existe
    const categoria = validarCategoria(req.body.categoria);
    const dir = path.join(uploadsDir, categoria);
    
    // Crear subdirectorio si no existe
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Nombre único: timestamp-random-nombre_original
    const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uniqueSuffix}${ext}`;
    
    logger.info('Guardando archivo', { 
      originalName: file.originalname,
      savedAs: filename,
      size: file.size 
    });
    
    cb(null, filename);
  }
});

// Tipos de archivo permitidos
const ALLOWED_FILE_TYPES = {
  // Imágenes
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  
  // Documentos
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  
  // Otros
  'text/plain': ['.txt'],
  'text/csv': ['.csv']
};

// Filtro de archivos
const fileFilter = (req, file, cb) => {
  const mimetype = file.mimetype;
  const extname = path.extname(file.originalname).toLowerCase();
  
  // Verificar si el tipo MIME está permitido
  if (!ALLOWED_FILE_TYPES[mimetype]) {
    logger.warn('Tipo de archivo rechazado', {
      filename: file.originalname,
      mimetype,
      user: req.usuario?.email
    });
    return cb(new Error(`Tipo de archivo no permitido: ${mimetype}`), false);
  }
  
  // Verificar si la extensión coincide con el tipo MIME
  const allowedExtensions = ALLOWED_FILE_TYPES[mimetype];
  if (!allowedExtensions.includes(extname)) {
    logger.warn('Extensión de archivo no coincide con tipo MIME', {
      filename: file.originalname,
      mimetype,
      extname
    });
    return cb(new Error('La extensión del archivo no coincide con su tipo'), false);
  }
  
  cb(null, true);
};

// Configuración de límites
const limits = {
  fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB por defecto
  files: 5 // Máximo 5 archivos por request
};

// Crear instancia de multer
const upload = multer({
  storage,
  fileFilter,
  limits
});

// Middleware de manejo de errores de multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    logger.error('Error de Multer', { 
      code: err.code, 
      message: err.message,
      field: err.field 
    });
    
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({ 
          error: `Archivo demasiado grande. Máximo ${limits.fileSize / 1024 / 1024}MB` 
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({ 
          error: `Demasiados archivos. Máximo ${limits.files} archivos` 
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({ 
          error: 'Campo de archivo inesperado' 
        });
      default:
        return res.status(400).json({ 
          error: err.message 
        });
    }
  }
  
  if (err) {
    logger.error('Error subiendo archivo', { error: err.message });
    return res.status(400).json({ 
      error: err.message 
    });
  }
  
  next();
};

// Función auxiliar para eliminar archivo
const deleteFile = (filepath) => {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      logger.info('Archivo eliminado', { filepath });
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Error eliminando archivo', { 
      filepath, 
      error: error.message 
    });
    return false;
  }
};

module.exports = {
  upload,
  handleMulterError,
  deleteFile,
  ALLOWED_FILE_TYPES
};
