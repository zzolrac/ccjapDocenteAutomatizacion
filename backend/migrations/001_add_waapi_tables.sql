-- Add new columns to waapi_config table
ALTER TABLE waapi_config
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS n8n_url TEXT,
ADD COLUMN IF NOT EXISTS n8n_api_key TEXT,
ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_reply_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_on_absence BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_on_grade BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_on_event BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_connection_test TIMESTAMP,
ADD COLUMN IF NOT EXISTS connection_status BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id SERIAL PRIMARY KEY,
    message_id TEXT UNIQUE NOT NULL,
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    message_body TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    status TEXT DEFAULT 'sent',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_from ON whatsapp_messages(from_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_to ON whatsapp_messages(to_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created ON whatsapp_messages(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update timestamps
DROP TRIGGER IF EXISTS update_waapi_config_modtime ON waapi_config;
CREATE TRIGGER update_waapi_config_modtime
BEFORE UPDATE ON waapi_config
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_whatsapp_messages_modtime ON whatsapp_messages;
CREATE TRIGGER update_whatsapp_messages_modtime
BEFORE UPDATE ON whatsapp_messages
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
