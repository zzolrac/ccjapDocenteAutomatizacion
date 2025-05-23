# System Patterns

## Patterns Introduced
- **Configuration Management:** Use a centralized configuration file to manage institution name, WhatsApp settings, and other related configurations.
- **Database Table for Configurations:**
  - **Table Name:** `configurations`
  - **Columns:**
    - `id` (Primary Key, Integer, Auto Increment)
    - `institution_name` (String, Max Length: 255)
    - `whatsapp_api_key` (String, Max Length: 255)
    - `whatsapp_api_secret` (String, Max Length: 255)
    - `whatsapp_phone_number` (String, Max Length: 20)
    - `created_at` (Timestamp, Default: Current Timestamp)
    - `updated_at` (Timestamp, Default: Current Timestamp)

## Patterns Modified
- None