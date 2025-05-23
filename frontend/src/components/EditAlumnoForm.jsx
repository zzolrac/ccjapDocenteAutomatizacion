import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function EditAlumnoForm() {
  const { alumnoId } = useParams();
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
    fecha_ingreso: '',
    estado: 'Activo',
    institucion_id: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchAlumnoData = async () => {
      if (!token) {
        setError('No autenticado.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await fetch(`/api/alumnos/${alumnoId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `Error ${response.status} al obtener datos del alumno`);
        }
        const alumnoData = await response.json();
        setFormData({
          nombre_completo: alumnoData.nombre_completo || '',
          fecha_nacimiento: alumnoData.fecha_nacimiento || '',
          genero: alumnoData.genero || '',
          direccion: alumnoData.direccion || '',
          nombre_responsable_principal: alumnoData.nombre_responsable_principal || '',
          telefono_responsable_principal: alumnoData.telefono_responsable_principal || '',
          email_responsable_principal: alumnoData.email_responsable_principal || '',
          grado_actual: alumnoData.grado_actual || '',
          seccion: alumnoData.seccion || '',
          fecha_ingreso: alumnoData.fecha_ingreso || '',
          estado: alumnoData.estado || 'Activo',
          institucion_id: alumnoData.institucion_id || currentUser?.institucion_id || ''
        });
        setError('');
      } catch (err) {
        setError(err.message);
        console.error("Error fetching alumno data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlumnoData();
  }, [alumnoId, token, currentUser]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!formData.nombre_completo || !formData.grado_actual || !formData.seccion) {
      setError('Nombre completo, grado y sección son requeridos.');
      return;
    }

    try {
      const response = await fetch(`/api/alumnos/${alumnoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            ...formData,
            institucion_id: formData.institucion_id // Asegurarse que se envíe
        }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Error parsing JSON from update alumno response:", responseText);
        throw new Error(`Respuesta inesperada del servidor: ${response.status} - ${responseText || 'Sin contenido'}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}`);
      }
      setMessage(`Alumno "${data.nombre_completo}" actualizado con éxito.`);
      setTimeout(() => {
        navigate('/alumnos'); // Redirigir a la lista de alumnos
      }, 2000);
    } catch (err) {
      setError(err.message);
      console.error('Failed to update alumno:', err);
    }
  };

  if (loading) return <p className="dark:text-gray-300">Cargando datos del alumno...</p>;

  return (
    <div className="p-8 bg-white dark:bg-dark-card-bg shadow-xl rounded-lg max-w-2xl mx-auto mt-4 border border-transparent dark:border-dark-border">
      <h2 className="text-2xl font-bold text-center text-slate-700 dark:text-dark-text mb-6">Editar Alumno</h2>
      
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
                className="w-full input-class"
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
            Actualizar Alumno
          </button>
        </div>
      </form>
      
      {message && <p className="mt-4 text-sm text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900 p-3 rounded-md border border-green-300 dark:border-green-700">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900 p-3 rounded-md border border-red-300 dark:border-red-700">{error}</p>}
    </div>
  );
}

export default EditAlumnoForm;
