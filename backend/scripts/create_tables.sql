-- Tabla para almacenar los mensajes recibidos por WhatsApp
CREATE TABLE IF NOT EXISTS mensajes_whatsapp (
  id SERIAL PRIMARY KEY,
  telefono_remitente VARCHAR(25) NOT NULL,
  texto_mensaje TEXT NOT NULL,
  fecha_recepcion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  procesado BOOLEAN DEFAULT FALSE,
  tipo_mensaje VARCHAR(50), -- 'ausencia', 'consulta', 'otro'
  institucion_id INTEGER REFERENCES instituciones(id) ON DELETE CASCADE
);

-- Tabla para almacenar las ausencias de alumnos
CREATE TABLE IF NOT EXISTS ausencias (
  id SERIAL PRIMARY KEY,
  alumno_id INTEGER REFERENCES alumnos(id) ON DELETE CASCADE,
  fecha_ausencia DATE NOT NULL DEFAULT CURRENT_DATE,
  motivo TEXT,
  justificado BOOLEAN DEFAULT FALSE,
  notificado_docente BOOLEAN DEFAULT FALSE,
  confirmado_recibido BOOLEAN DEFAULT FALSE,
  mensaje_id INTEGER REFERENCES mensajes_whatsapp(id) ON DELETE SET NULL,
  fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Añadir campo maestro_id a la tabla alumnos si no existe
ALTER TABLE alumnos 
ADD COLUMN IF NOT EXISTS maestro_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;