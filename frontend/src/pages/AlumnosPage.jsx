import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Edit3, Trash2, PlusCircle, Search, UserPlus } from 'lucide-react';

const AlumnosPage = () => {
  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { token, currentUser } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const fetchAlumnos = async () => {
      if (!token) {
        setError('No autenticado.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await fetch('/api/alumnos', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `Error ${response.status} al obtener alumnos`);
        }
        const data = await response.json();
        setAlumnos(data);
        setError('');
      } catch (err) {
        setError(err.message);
        console.error("Error fetching alumnos:", err);
      } finally {
        setLoading(false);
      }
    };

    // Solo cargar alumnos si estamos en la ruta base /alumnos, no en /alumnos/nuevo o /alumnos/editar/:id
    if (location.pathname === '/alumnos') {
      fetchAlumnos();
    }
  }, [token, location.pathname]);

  const handleDeleteAlumno = async (alumnoId, alumnoNombre) => {
    if (!window.confirm(`¿Está seguro de que desea eliminar al alumno "${alumnoNombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      const response = await fetch(`/api/alumnos/${alumnoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status} al eliminar alumno`);
      }
      setAlumnos(alumnos.filter(alumno => alumno.id !== alumnoId));
      alert(data.message || 'Alumno eliminado con éxito.');
    } catch (err) {
      setError(err.message);
      alert(`Error al eliminar alumno: ${err.message}`);
      console.error("Error deleting alumno:", err);
    }
  };
  
  // Determinar si el usuario actual puede crear/editar/eliminar alumnos
  const canManageAlumnos = currentUser && ['Superadministrador', 'Director', 'Secretaria'].includes(currentUser.rol);
  const canDeleteAlumnos = currentUser && ['Superadministrador', 'Director'].includes(currentUser.rol);

  // Filtrar alumnos por término de búsqueda
  const filteredAlumnos = alumnos.filter(alumno => 
    alumno.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alumno.grado_actual.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alumno.seccion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Si estamos en una sub-ruta (ej. /alumnos/nuevo), solo renderizar el Outlet
  if (location.pathname !== '/alumnos') {
    return <Outlet />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-700 dark:text-dark-text">Gestión de Alumnos</h1>
        {canManageAlumnos && (
          <Link
            to="/alumnos/nuevo"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md flex items-center transition-colors"
          >
            <UserPlus size={20} className="mr-2" />
            Registrar Nuevo Alumno
          </Link>
        )}
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre, grado o sección..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-gray-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading && <p className="text-slate-600 dark:text-gray-300">Cargando alumnos...</p>}
      {error && <p className="text-red-500 bg-red-100 dark:bg-red-900 dark:text-red-200 p-3 rounded-md">Error: {error}</p>}
      
      {!loading && !error && filteredAlumnos.length === 0 && (
        <p className="text-slate-600 dark:text-gray-300">
          {searchTerm ? 'No se encontraron alumnos que coincidan con la búsqueda.' : 'No hay alumnos registrados.'}
        </p>
      )}

      {!loading && !error && filteredAlumnos.length > 0 && (
        <div className="bg-white dark:bg-dark-card-bg shadow-xl rounded-lg overflow-hidden border border-transparent dark:border-dark-border">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-dark-border">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Nombre</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Grado</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Sección</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Responsable</th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-card-bg divide-y divide-slate-200 dark:divide-dark-border">
              {filteredAlumnos.map((alumno) => (
                <tr key={alumno.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-dark-text">{alumno.nombre_completo}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-gray-300">{alumno.grado_actual}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-gray-300">{alumno.seccion}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-gray-300">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${alumno.estado === 'Activo' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                        alumno.estado === 'Inactivo' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                        alumno.estado === 'Retirado' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 
                        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}`}>
                      {alumno.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-gray-300">
                    {alumno.nombre_responsable_principal || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {canManageAlumnos && (
                      <Link to={`/alumnos/editar/${alumno.id}`} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-3">
                        <Edit3 size={18} className="inline" />
                      </Link>
                    )}
                    {canDeleteAlumnos && (
                      <button 
                        onClick={() => handleDeleteAlumno(alumno.id, alumno.nombre_completo)} 
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                        title="Eliminar Alumno"
                      >
                        <Trash2 size={18} className="inline" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AlumnosPage;
