-- Hacer que institucion_id sea opcional en la tabla alumnos
ALTER TABLE alumnos ALTER COLUMN institucion_id DROP NOT NULL;

-- Actualizar los registros existentes que tengan institucion_id nulo a un valor por defecto si es necesario
-- (Opcional) Si tienes registros existentes que necesitan un valor por defecto, puedes usar:
-- UPDATE alumnos SET institucion_id = [ID_DE_LA_INSTITUCION] WHERE institucion_id IS NULL;

-- Comentario para documentar el cambio
COMMENT ON COLUMN alumnos.institucion_id IS 'ID de la institución (opcional, por defecto NULL)';
