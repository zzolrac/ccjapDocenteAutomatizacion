const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Asegurarse de que el directorio de subidas exista
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generar un nombre de archivo único
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'profile-' + uniqueSuffix + ext);
  }
});

// Filtrar solo imágenes
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Solo se permiten archivos de imagen (jpeg, jpg, png, gif)'));
};

// Configurar multer
const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // Límite de 2MB
  fileFilter: fileFilter
}).single('foto_perfil');

// Middleware para manejar la subida de archivos
const uploadMiddleware = (req, res, next) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // Un error de Multer al cargar
      return res.status(400).json({ 
        success: false, 
        error: err.message || 'Error al cargar el archivo' 
      });
    } else if (err) {
      // Un error desconocido
      return res.status(400).json({ 
        success: false, 
        error: err.message || 'Error al procesar el archivo' 
      });
    }
    
    // Si se cargó un archivo, actualizar la URL en el cuerpo de la solicitud
    if (req.file) {
      // Construir la URL completa del archivo subido
      const fileUrl = `/uploads/${req.file.filename}`;
      req.body.foto_perfil_url = fileUrl;
    }
    
    next();
  });
};

module.exports = uploadMiddleware;
