-- Agregar columna de foto de perfil a la tabla usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_perfil_url TEXT;

-- Agregar columna de foto de perfil a la tabla alumnos
ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS foto_perfil_url TEXT;
