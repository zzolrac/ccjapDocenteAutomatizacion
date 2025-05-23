-- Add foto_perfil_url column to usuarios table
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS foto_perfil_url VARCHAR(255);

-- Update existing users with default avatar if needed
-- UPDATE usuarios SET foto_perfil_url = '/uploads/avatars/default-avatar.png' WHERE foto_perfil_url IS NULL;
