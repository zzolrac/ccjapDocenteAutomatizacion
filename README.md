# Sistema de Gestión de Ausencias Escolares

Aplicación web para la gestión de ausencias escolares con notificaciones por WhatsApp.

## 🚀 Características

- 🔐 Autenticación de usuarios con diferentes roles (Superadministrador, Director, Docente, Secretaria)
- 👥 Gestión de alumnos y sus datos personales
- 📝 Registro y seguimiento de ausencias
- 📱 Notificaciones automáticas a padres de familia vía WhatsApp
- 📊 Panel de administración con estadísticas
- 📸 Perfiles de usuario con foto
- 🌓 Interfaz responsiva con modo claro/oscuro
- 🔄 Sincronización en tiempo real
- 📂 Gestión de archivos e imágenes

## 🛠️ Requisitos previos

- Node.js (v16 o superior)
- PostgreSQL (v12 o superior)
- npm (v8 o superior) o yarn (v1.22 o superior)
- Cuenta de WhatsApp Business con API configurada (para notificaciones)
- Espacio en disco para almacenamiento de archivos (recomendado 1GB mínimo)

## 🚀 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/ccjapDocenteAutomatizacion.git
   cd ccjapDocenteAutomatizacion
   ```

2. **Instalar dependencias del backend**
   ```bash
   cd backend
   npm install
   ```

3. **Instalar dependencias del frontend**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Configuración del entorno**
   - Copiar el archivo de ejemplo de variables de entorno:
     ```bash
     cp backend/.env.example backend/.env
     ```
   - Editar el archivo `.env` con tus configuraciones:
     ```env
     # Configuración del servidor
     PORT=5000
     NODE_ENV=development
     
     # Base de datos
     DB_HOST=localhost
     DB_PORT=5432
     DB_NAME=ccjap_db
     DB_USER=tu_usuario
     DB_PASSWORD=tu_contraseña
     
     # Autenticación
     JWT_SECRET=tu_clave_secreta_jwt
     JWT_EXPIRES_IN=30d
     
     # Configuración de archivos
     UPLOAD_DIR=./uploads
     MAX_FILE_SIZE=5MB
     
     # Configuración de WhatsApp (opcional)
     WHATSAPP_API_KEY=tu_api_key
     WHATSAPP_PHONE_NUMBER=tu_numero
     ```

## 🗄️ Configuración de la base de datos

1. **Crear la base de datos PostgreSQL**
   ```sql
   CREATE DATABASE ccjap_db;
   CREATE USER tu_usuario WITH PASSWORD 'tu_contraseña';
   GRANT ALL PRIVILEGES ON DATABASE ccjap_db TO tu_usuario;
   ```

2. **Inicializar la base de datos**
   ```bash
   # Navegar al directorio del backend
   cd backend
   
   # Inicializar la base de datos (crea tablas y usuario administrador)
   npm run db:init
   ```

3. **Ejecutar migraciones**
   ```bash
   # Ejecutar migraciones pendientes
   npm run db:migrate
   ```

4. **Reiniciar la base de datos (opcional, en desarrollo)**
   ```bash
   # Elimina y recrea la base de datos (¡CUIDADO! Esto borrará todos los datos)
   npm run db:reset
   ```

## 🚀 Iniciar la aplicación

1. **Iniciar el servidor de desarrollo**
   ```bash
   # En el directorio backend
   npm run dev
   ```

   O para un inicio completo con reinicio de base de datos (solo desarrollo):
   ```bash
   npm run dev:full
   ```

2. **Iniciar el frontend**
   ```bash
   # En el directorio frontend
   npm start
   ```

3. **Acceder a la aplicación**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Usuario administrador por defecto:
     - Email: admin@ccjap.edu.mx
     - Contraseña: admin123

## 🔄 Comandos útiles

```bash
# Inicializar solo la base de datos
npm run db:init

# Ejecutar migraciones pendientes
npm run db:migrate

# Reiniciar la base de datos (desarrollo)
npm run db:reset

# Iniciar servidor en modo desarrollo
npm run dev

# Iniciar con reinicio automático (frontend)
cd frontend && npm start
```

## 📁 Estructura del proyecto

```
ccjapDocenteAutomatizacion/
├── backend/                 # API del servidor
│   ├── config/             # Configuraciones
│   ├── controllers/        # Controladores
│   ├── middleware/         # Middlewares
│   ├── migrations/         # Migraciones de base de datos
│   ├── models/            # Modelos de datos
│   ├── routes/            # Rutas de la API
│   ├── scripts/           # Scripts de utilidad
│   ├── uploads/           # Archivos subidos
│   ├── .env               # Variables de entorno
│   └── server.js          # Punto de entrada
│
├── frontend/             # Aplicación React
│   ├── public/           # Archivos estáticos
│   └── src/              # Código fuente
│       ├── components/   # Componentes React
│       ├── pages/        # Páginas
│       ├── context/      # Contextos de React
│       └── App.js        # Componente principal
│
├── .gitignore
└── README.md
```

## 🔒 Seguridad

- Todas las contraseñas se almacenan con hash bcrypt
- Autenticación basada en JWT con expiración
- Validación de entrada en todos los endpoints
- Protección contra inyección SQL con consultas parametrizadas
- CORS configurado para el dominio del frontend
- Variables sensibles en archivo .env (no versionado)

## 📝 Notas de implementación

- El sistema está diseñado para ser escalable y mantenible
- El código sigue las mejores prácticas de React y Node.js
- Se incluyen pruebas unitarias y de integración
- La documentación de la API está disponible en `/api-docs` (cuando se implemente Swagger)

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

---

Desarrollado con ❤️ por [Tu Nombre] - [Año Actual]

## Configuración de la base de datos

1. Crear una base de datos PostgreSQL
2. Configurar las credenciales en el archivo `.env`
3. Ejecutar las migraciones:
   ```bash
   cd backend
   node run-migrations.js
   ```

## Iniciar la aplicación

1. Iniciar el servidor backend:
   ```bash
   cd backend
   npm run dev
   ```

2. Iniciar la aplicación frontend (en otra terminal):
   ```bash
   cd frontend
   npm run dev
   ```

3. Abrir el navegador en `http://localhost:3000`

## Estructura del proyecto

- `/backend`: API REST en Node.js/Express
  - `/controllers`: Controladores de la API
  - `/middleware`: Middleware de autenticación y validación
  - `/migrations`: Scripts de migración de la base de datos
  - `/models`: Modelos de datos
  - `/routes`: Rutas de la API
  - `/uploads`: Directorio para archivos subidos (fotos de perfil)

- `/frontend`: Aplicación React
  - `/public`: Archivos estáticos
  - `/src`: Código fuente
    - `/components`: Componentes reutilizables
    - `/context`: Contextos de React (autenticación, tema, etc.)
    - `/pages`: Componentes de página
    - `/services`: Servicios para consumir la API
    - `/styles`: Estilos globales

## Variables de entorno

### Backend (`.env`)

```
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ccjap_ausencias
DB_USER=postgres
DB_PASSWORD=tu_contraseña
JWT_SECRET=tu_clave_secreta_jwt
JWT_EXPIRES_IN=24h
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5
```

## Uso

1. Iniciar sesión con las credenciales del superadministrador
2. Crear instituciones, usuarios y configurar los parámetros del sistema
3. Importar o registrar alumnos
4. Registrar ausencias y enviar notificaciones

## Despliegue

### Requisitos para producción

- Servidor con Node.js y PostgreSQL
- Servidor web (Nginx, Apache) para servir el frontend y hacer proxy al backend
- Certificado SSL (recomendado)
- Servidor de correo SMTP para notificaciones

### Pasos para el despliegue

1. Construir el frontend para producción:
   ```bash
   cd frontend
   npm run build
   ```

2. Configurar el servidor web para servir los archivos estáticos del frontend
3. Configurar el proxy inverso para las peticiones a la API
4. Configurar variables de entorno en producción
5. Iniciar el servidor de producción:
   ```bash
   cd backend
   npm start
   ```

## Contribución

1. Hacer fork del proyecto
2. Crear una rama para la nueva característica (`git checkout -b feature/nueva-caracteristica`)
3. Hacer commit de los cambios (`git commit -am 'Añadir nueva característica'`)
4. Hacer push a la rama (`git push origin feature/nueva-caracteristica`)
5. Crear un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.
