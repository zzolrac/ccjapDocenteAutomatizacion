import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Camera, User, X } from 'lucide-react';

function RegisterAlumnoForm() {
  const navigate = useNavigate();
  const { token, currentUser } = useAuth();
  
  const [formData, setFormData] = useState({
    nombre_completo: '',
    fecha_nacimiento: '',
    genero: '',
    direccion: '',
    nombre_responsable_principal: '',
    telefono_responsable_principal: '',
    email_responsable_principal: '',
    grado_actual: '',
    seccion: '',
    fecha_ingreso: new Date().toISOString().split('T')[0], // Fecha actual en formato YYYY-MM-DD
    estado: 'Activo',
    foto_perfil_url: '',
    // La institución se asignará automáticamente del usuario actual
    institucion_id: currentUser?.institucion_id || ''
  });
  
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);
  
  // Función para manejar la selección de imagen
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.match('image.*')) {
        setError('Por favor, selecciona un archivo de imagen válido.');
        return;
      }
      
      // Validar tamaño (máx 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('La imagen no debe pesar más de 2MB.');
        return;
      }
      
      // Crear vista previa
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
        setFormData({
          ...formData,
          foto_perfil_url: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Función para eliminar la imagen seleccionada
  const handleRemoveImage = () => {
    setPreviewImage(null);
    setFormData({
      ...formData,
      foto_perfil_url: ''
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    // Validaciones básicas
    if (!formData.nombre_completo || !formData.grado_actual || !formData.seccion) {
      setError('Nombre completo, grado y sección son campos requeridos.');
      return;
    }
    
    // Validar tamaño de la imagen si existe
    if (formData.foto_perfil_url && formData.foto_perfil_url.length > 2 * 1024 * 1024) {
      setError('La imagen es demasiado grande. El tamaño máximo permitido es de 2MB.');
      return;
    }

    try {
      if (!token || !currentUser) {
        setError('No autenticado o datos de usuario no disponibles. Por favor, inicie sesión de nuevo.');
        return;
      }
      
      // Asegurarse de que la institución del usuario actual se use
      if (!formData.institucion_id && currentUser.institucion_id) {
        setFormData(prev => ({
          ...prev,
          institucion_id: currentUser.institucion_id
        }));
      }

      const response = await fetch('/api/alumnos', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, 
        },
        body: JSON.stringify(formData), 
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Error parsing JSON from create alumno response:", responseText);
        throw new Error(`Respuesta inesperada del servidor: ${response.status} - ${responseText || 'Sin contenido'}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}`);
      }

      setMessage(`Alumno "${data.nombre_completo}" registrado con éxito.`);
      
      // Redireccionar a la lista de alumnos después de 2 segundos
      setTimeout(() => {
        navigate('/alumnos');
      }, 2000);
      
    } catch (err) {
      setError(err.message);
      console.error('Failed to create alumno:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md dark:bg-slate-800">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Registrar Nuevo Alumno</h1>
      
      {/* Sección de foto de perfil */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
          Foto de Perfil
        </label>
        <div className="flex items-center space-x-4">
          <div className="relative">
            {previewImage ? (
              <div className="relative group">
                <img 
                  src={previewImage} 
                  alt="Vista previa" 
                  className="w-24 h-24 rounded-full object-cover border-2 border-slate-200 dark:border-slate-600"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  title="Eliminar imagen"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <User size={32} className="text-slate-400" />
              </div>
            )}
          </div>
          <div>
            <input
              type="file"
              id="foto_perfil"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <label
              htmlFor="foto_perfil"
              className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Camera className="h-4 w-4 mr-2" />
              {previewImage ? 'Cambiar imagen' : 'Subir imagen'}
            </label>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Formatos: JPG, PNG. Tamaño máximo: 2MB
            </p>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información básica del alumno */}
        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-md">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-dark-text mb-4">Información del Alumno</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nombre_completo" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                Nombre Completo: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="nombre_completo"
                name="nombre_completo"
                value={formData.nombre_completo}
                onChange={handleChange}
                required
                className="w-full input-class"
                placeholder="Nombre completo del alumno"
              />
            </div>
            
            <div>
              <label htmlFor="fecha_nacimiento" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                Fecha de Nacimiento:
              </label>
              <input
                type="date"
                id="fecha_nacimiento"
                name="fecha_nacimiento"
                value={formData.fecha_nacimiento}
                onChange={handleChange}
                className="w-full input-class bg-white"
              />
            </div>
            
            <div>
              <label htmlFor="genero" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                Género:
              </label>
              <select
                id="genero"
                name="genero"
                value={formData.genero}
                onChange={handleChange}
                className="w-full input-class"
              >
                <option value="">Seleccionar</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="direccion" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                Dirección:
              </label>
              <input
                type="text"
                id="direccion"
                name="direccion"
                value={formData.direccion}
                onChange={handleChange}
                className="w-full input-class"
                placeholder="Dirección del alumno"
              />
            </div>
          </div>
        </div>
        
        {/* Información del responsable */}
        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-md">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-dark-text mb-4">Información del Responsable</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nombre_responsable_principal" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                Nombre del Responsable:
              </label>
              <input
                type="text"
                id="nombre_responsable_principal"
                name="nombre_responsable_principal"
                value={formData.nombre_responsable_principal}
                onChange={handleChange}
                className="w-full input-class"
                placeholder="Nombre del padre/madre/tutor"
              />
            </div>
            
            <div>
              <label htmlFor="telefono_responsable_principal" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                Teléfono del Responsable:
              </label>
              <input
                type="tel"
                id="telefono_responsable_principal"
                name="telefono_responsable_principal"
                value={formData.telefono_responsable_principal}
                onChange={handleChange}
                className="w-full input-class"
                placeholder="Número de teléfono"
              />
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="email_responsable_principal" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                Email del Responsable:
              </label>
              <input
                type="email"
                id="email_responsable_principal"
                name="email_responsable_principal"
                value={formData.email_responsable_principal}
                onChange={handleChange}
                className="w-full input-class"
                placeholder="correo@ejemplo.com"
              />
            </div>
          </div>
        </div>
        
        {/* Información académica */}
        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-md">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-dark-text mb-4">Información Académica</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="grado_actual" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                Grado Actual: <span className="text-red-500">*</span>
              </label>
              <select
                id="grado_actual"
                name="grado_actual"
                value={formData.grado_actual}
                onChange={handleChange}
                required
                className="w-full input-class"
              >
                <option value="">Seleccionar Grado</option>
                <option value="Parvularia 4">Parvularia 4</option>
                <option value="Parvularia 5">Parvularia 5</option>
                <option value="Parvularia 6">Parvularia 6</option>
                <option value="1° Grado">1° Grado</option>
                <option value="2° Grado">2° Grado</option>
                <option value="3° Grado">3° Grado</option>
                <option value="4° Grado">4° Grado</option>
                <option value="5° Grado">5° Grado</option>
                <option value="6° Grado">6° Grado</option>
                <option value="7° Grado">7° Grado</option>
                <option value="8° Grado">8° Grado</option>
                <option value="9° Grado">9° Grado</option>
                <option value="1° Bachillerato">1° Bachillerato</option>
                <option value="2° Bachillerato">2° Bachillerato</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="seccion" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                Sección: <span className="text-red-500">*</span>
              </label>
              <select
                id="seccion"
                name="seccion"
                value={formData.seccion}
                onChange={handleChange}
                required
                className="w-full input-class"
              >
                <option value="">Seleccionar Sección</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="Única">Única</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="fecha_ingreso" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                Fecha de Ingreso:
              </label>
              <input
                type="date"
                id="fecha_ingreso"
                name="fecha_ingreso"
                value={formData.fecha_ingreso}
                onChange={handleChange}
                className="w-full input-class"
              />
            </div>
            
            <div>
              <label htmlFor="estado" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                Estado:
              </label>
              <select
                id="estado"
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                className="w-full input-class"
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
                <option value="Retirado">Retirado</option>
                <option value="Graduado">Graduado</option>
              </select>
            </div>
          </div>
        </div>
        
{/* El campo de institución se ha eliminado ya que se asigna automáticamente */}
{currentUser?.rol === 'Superadministrador' && (
  <div className="mb-4 bg-blue-50 p-3 rounded-md border border-blue-200">
    <p className="text-sm text-blue-700">
      <strong>Nota:</strong> El alumno será registrado automáticamente en la institución asociada a tu cuenta ({currentUser?.institucion_id || 'No disponible'}).
    </p>
  </div>
)}
<div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/alumnos')}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            Registrar Alumno
          </button>
        </div>
      </form>
      
      {message && <p className="mt-4 text-sm text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900 p-3 rounded-md border border-green-300 dark:border-green-700">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900 p-3 rounded-md border border-red-300 dark:border-red-700">{error}</p>}
    </div>
  );
}

export default RegisterAlumnoForm;
