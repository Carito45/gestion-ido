const Joi = require('joi');
const logger = require('../config/logger');

/**
 * Middleware genérico para validar datos con Joi
 */
const validar = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Mostrar todos los errores
      stripUnknown: true // Eliminar campos no definidos en el schema
    });

    if (error) {
      const errores = error.details.map(detail => ({
        campo: detail.path.join('.'),
        mensaje: detail.message
      }));

      logger.warn('Error de validación', {
        path: req.path,
        errores
      });

      return res.status(400).json({
        error: 'Error de validación',
        detalles: errores
      });
    }

    // Reemplazar req[property] con el valor validado y limpio
    req[property] = value;
    next();
  };
};

// ========== SCHEMAS DE VALIDACIÓN ==========

/**
 * Validación para registro/login de usuario
 */
const usuarioLoginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Debe ser un email válido',
      'any.required': 'El email es obligatorio'
    }),
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'La contraseña debe tener al menos 6 caracteres',
      'any.required': 'La contraseña es obligatoria'
    })
});

/**
 * Validación para crear usuario
 */
const usuarioCrearSchema = Joi.object({
  nombre_completo: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.min': 'El nombre debe tener al menos 3 caracteres',
      'any.required': 'El nombre completo es obligatorio'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Debe ser un email válido',
      'any.required': 'El email es obligatorio'
    }),
  password: Joi.string()
    .min(6)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'La contraseña debe tener al menos 6 caracteres',
      'string.pattern.base': 'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
      'any.required': 'La contraseña es obligatoria'
    }),
  rol: Joi.string()
    .valid('admin', 'medico', 'licenciado', 'auditor')
    .required()
    .messages({
      'any.only': 'El rol debe ser: admin, medico, licenciado o auditor',
      'any.required': 'El rol es obligatorio'
    })
});

/**
 * Validación para crear/actualizar afiliado
 */
const afiliadoSchema = Joi.object({
  nombre_completo: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'any.required': 'El nombre completo es obligatorio'
    }),
  dni: Joi.string()
    .pattern(/^\d{7,8}$/)
    .required()
    .messages({
      'string.pattern.base': 'El DNI debe tener 7 u 8 dígitos',
      'any.required': 'El DNI es obligatorio'
    }),
  fecha_nacimiento: Joi.date()
    .max('now')
    .optional()
    .allow(null, ''),
  edad: Joi.number()
    .integer()
    .min(0)
    .max(120)
    .required()
    .messages({
      'number.min': 'La edad debe ser mayor a 0',
      'number.max': 'La edad debe ser menor a 120',
      'any.required': 'La edad es obligatoria'
    }),
  sexo: Joi.string()
    .valid('Masculino', 'Femenino', 'Otro')
    .required()
    .messages({
      'any.only': 'El sexo debe ser: Masculino, Femenino u Otro',
      'any.required': 'El sexo es obligatorio'
    }),
  telefono: Joi.string()
    .pattern(/^[0-9\s\-\+\(\)]+$/)
    .optional()
    .allow(null, '')
    .messages({
      'string.pattern.base': 'El teléfono debe contener solo números y símbolos válidos'
    }),
  email: Joi.string()
    .email()
    .optional()
    .allow(null, ''),
  direccion: Joi.string()
    .required()
    .messages({
      'any.required': 'La dirección es obligatoria'
    }),
  numero_afiliado: Joi.string()
    .required()
    .messages({
      'any.required': 'El número de afiliado es obligatorio'
    }),
  obra_social: Joi.string()
    .optional()
    .allow(null, ''),
  plan: Joi.string()
    .optional()
    .allow(null, ''),
  prestador_id: Joi.number()
    .integer()
    .optional()
    .allow(null),
  diagnostico: Joi.string()
    .optional()
    .allow(null, ''),
  fecha_ingreso: Joi.date()
    .required()
    .messages({
      'any.required': 'La fecha de ingreso es obligatoria'
    }),
  fecha_egreso: Joi.date()
    .optional()
    .allow(null, ''),
  medico_tratante: Joi.string()
    .optional()
    .allow(null, ''),
  observaciones: Joi.string()
    .optional()
    .allow(null, ''),
  estado: Joi.string()
    .valid('activo', 'egresado')
    .optional()
});

/**
 * Validación para empresas prestadoras
 */
const empresaSchema = Joi.object({
  nombre: Joi.string()
    .min(3)
    .max(200)
    .required()
    .messages({
      'any.required': 'El nombre de la empresa es obligatorio'
    }),
  cuit: Joi.string()
    .pattern(/^\d{2}-\d{8}-\d{1}$/)
    .optional()
    .allow(null, '')
    .messages({
      'string.pattern.base': 'El CUIT debe tener formato XX-XXXXXXXX-X'
    }),
  telefono: Joi.string()
    .pattern(/^[0-9\s\-\+\(\)]+$/)
    .optional()
    .allow(null, ''),
  email: Joi.string()
    .email()
    .optional()
    .allow(null, ''),
  direccion: Joi.string()
    .optional()
    .allow(null, ''),
  servicios_ofrecidos: Joi.string()
    .optional()
    .allow(null, ''),
  estado: Joi.string()
    .valid('activa', 'inactiva')
    .optional(),
  observaciones: Joi.string()
    .optional()
    .allow(null, '')
});

/**
 * Validación para atención médica
 */
const atencionMedicaSchema = Joi.object({
  afiliado_id: Joi.number()
    .integer()
    .required(),
  mes: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .required()
    .messages({
      'number.min': 'El mes debe estar entre 1 y 12',
      'number.max': 'El mes debe estar entre 1 y 12'
    }),
  anio: Joi.number()
    .integer()
    .min(2000)
    .max(2100)
    .required(),
  atencion_medica_mensual: Joi.number()
    .integer()
    .min(0)
    .optional()
    .default(0),
  hs_enfermeria_semanal: Joi.number()
    .min(0)
    .optional()
    .default(0),
  ktm_sesiones_semanal: Joi.number()
    .integer()
    .min(0)
    .optional()
    .default(0),
  ktr_sesiones_semanal: Joi.number()
    .integer()
    .min(0)
    .optional()
    .default(0),
  cuidados_domiciliarios_hs_mensual: Joi.number()
    .min(0)
    .optional()
    .default(0),
  especialidades_medicas_mensual: Joi.number()
    .integer()
    .min(0)
    .optional()
    .default(0),
  observaciones: Joi.string()
    .optional()
    .allow(null, '')
});

/**
 * Validación para profesionales
 */
const profesionalSchema = Joi.object({
  empresa_id: Joi.number()
    .integer()
    .optional()
    .allow(null)
    .messages({
      'number.base': 'La empresa debe ser un número válido'
    }),
  nombre_completo: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.min': 'El nombre debe tener al menos 3 caracteres',
      'any.required': 'El nombre completo es obligatorio'
    }),
  tipo_profesional: Joi.string()
    .valid(
      'medico',
      'enfermero', 
      'kinesiologo',
      'terapeuta_ocupacional',
      'fonoaudiologo',
      'psicologo',
      'nutricionista',
      'otro'
    )
    .required()
    .messages({
      'any.only': 'Tipo de profesional inválido',
      'any.required': 'El tipo de profesional es obligatorio'
    }),
  matricula: Joi.string()
    .optional()
    .allow(null, ''),
  especialidad: Joi.string()
    .optional()
    .allow(null, ''),
  telefono: Joi.string()
    .pattern(/^[0-9\s\-\+\(\)]+$/)
    .optional()
    .allow(null, '')
    .messages({
      'string.pattern.base': 'El teléfono debe contener solo números y símbolos válidos'
    }),
  email: Joi.string()
    .email()
    .optional()
    .allow(null, ''),
  direccion: Joi.string()
    .optional()
    .allow(null, ''),
  modalidad: Joi.string()
    .valid('presencial', 'domiciliaria', 'ambas')
    .optional()
    .allow(null, ''),
  honorarios_por_sesion: Joi.number()
    .min(0)
    .optional()
    .allow(null),
  observaciones: Joi.string()
    .optional()
    .allow(null, '')
});

/**
 * Validación para facturas
 */
const facturaSchema = Joi.object({
  afiliado_id: Joi.number()
    .integer()
    .required()
    .messages({
      'any.required': 'El afiliado es obligatorio'
    }),
  obra_social: Joi.string()
    .required()
    .messages({
      'any.required': 'La obra social es obligatoria'
    }),
  periodo_mes: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .required()
    .messages({
      'any.required': 'El mes del período es obligatorio',
      'number.min': 'El mes debe estar entre 1 y 12',
      'number.max': 'El mes debe estar entre 1 y 12'
    }),
  periodo_anio: Joi.number()
    .integer()
    .min(2020)
    .max(2100)
    .required()
    .messages({
      'any.required': 'El año del período es obligatorio'
    }),
  fecha_emision: Joi.date()
    .required()
    .messages({
      'any.required': 'La fecha de emisión es obligatoria'
    }),
  fecha_vencimiento: Joi.date()
    .optional()
    .allow(null, ''),
  descuento_porcentaje: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .default(0),
  observaciones: Joi.string()
    .optional()
    .allow(null, ''),
  items: Joi.array()
    .items(
      Joi.object({
        profesional_id: Joi.number().integer().optional().allow(null),
        descripcion: Joi.string().required(),
        tipo_prestacion: Joi.string().optional().allow(null, ''),
        cantidad: Joi.number().integer().min(1).default(1),
        precio_unitario: Joi.number().min(0).required()
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'Debe haber al menos un ítem en la factura'
    })
});

/**
 * Validación para pagos de factura
 */
const pagoFacturaSchema = Joi.object({
  factura_id: Joi.number()
    .integer()
    .required(),
  monto: Joi.number()
    .min(0.01)
    .required()
    .messages({
      'number.min': 'El monto debe ser mayor a 0',
      'any.required': 'El monto es obligatorio'
    }),
  fecha_pago: Joi.date()
    .required()
    .messages({
      'any.required': 'La fecha de pago es obligatoria'
    }),
  medio_pago: Joi.string()
    .valid('efectivo', 'transferencia', 'cheque', 'tarjeta', 'otro')
    .required()
    .messages({
      'any.required': 'El medio de pago es obligatorio'
    }),
  numero_comprobante: Joi.string()
    .optional()
    .allow(null, ''),
  observaciones: Joi.string()
    .optional()
    .allow(null, '')
});

module.exports = {
  validar,
  usuarioLoginSchema,
  usuarioCrearSchema,
  afiliadoSchema,
  empresaSchema,
  atencionMedicaSchema,
  profesionalSchema,
  facturaSchema,
  pagoFacturaSchema
};