import React, { useState, useEffect, useCallback } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Edit3, Trash2, PlusCircle, Search, UserPlus, Filter, X, AlertCircle } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

const AlumnosPage = () => {
  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    grado: '',
    seccion: '',
    estado: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [alumnoToDelete, setAlumnoToDelete] = useState(null);
  const { token, currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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

  const handleDeleteClick = (alumno) => {
    setAlumnoToDelete(alumno);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteAlumno = async () => {
    if (!alumnoToDelete) return;
    
    try {
      const response = await fetch(`/api/alumnos/${alumnoToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status} al eliminar alumno`);
      }
      
      setAlumnos(alumnos.filter(a => a.id !== alumnoToDelete.id));
      setIsDeleteModalOpen(false);
      setAlumnoToDelete(null);
      
      // Mostrar notificación de éxito
      alert(data.message || 'Alumno eliminado con éxito.');
    } catch (err) {
      setError(err.message);
      console.error("Error deleting alumno:", err);
      alert(`Error al eliminar alumno: ${err.message}`);
    }
  };
  
  // Determinar si el usuario actual puede crear/editar/eliminar alumnos
  const canManageAlumnos = currentUser && ['Superadministrador', 'Director', 'Secretaria', 'Docente', 'Colegiatura'].includes(currentUser.rol);
  const canDeleteAlumnos = currentUser && ['Superadministrador', 'Director'].includes(currentUser.rol);

  // Obtener valores únicos para los filtros
  const grados = [...new Set(alumnos.map(a => a.grado_actual).filter(Boolean))].sort();
  const secciones = [...new Set(alumnos.map(a => a.seccion).filter(Boolean))].sort();
  const estados = ['Activo', 'Inactivo', 'Retirado'];

  // Función para filtrar alumnos
  const filteredAlumnos = useCallback(() => {
    return alumnos.filter(alumno => {
      // Búsqueda por término
      const matchesSearch = 
        !searchTerm || 
        alumno.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alumno.grado_actual?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alumno.seccion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alumno.nombre_responsable_principal?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtros
      const matchesGrado = !filters.grado || alumno.grado_actual === filters.grado;
      const matchesSeccion = !filters.seccion || alumno.seccion === filters.seccion;
      const matchesEstado = !filters.estado || alumno.estado === filters.estado;
      
      return matchesSearch && matchesGrado && matchesSeccion && matchesEstado;
    });
  }, [alumnos, searchTerm, filters]);

  // Limpiar todos los filtros
  const clearFilters = () => {
    setFilters({
      grado: '',
      seccion: '',
      estado: ''
    });
    setSearchTerm('');
  };

  // Verificar si hay filtros activos
  const hasActiveFilters = filters.grado || filters.seccion || filters.estado || searchTerm;

  // Si estamos en una sub-ruta (ej. /alumnos/nuevo), solo renderizar el Outlet
  if (location.pathname !== '/alumnos') {
    return (
      <div className="container mx-auto px-4 py-8">
        <button 
          onClick={() => navigate('/alumnos')}
          className="mb-4 flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Volver a la lista de alumnos
        </button>
        <Outlet />
      </div>
    );
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

      {/* Barra de búsqueda y filtros */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre, grado, sección o responsable..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-gray-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              hasActiveFilters 
                ? 'bg-indigo-100 text-indigo-700 border-indigo-300 hover:bg-indigo-200 dark:bg-indigo-900 dark:border-indigo-700 dark:text-indigo-200 dark:hover:bg-indigo-800' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-slate-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            <Filter size={16} className="mr-2" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-indigo-600 text-xs font-medium text-white dark:bg-indigo-500">
                {Object.values(filters).filter(Boolean).length + (searchTerm ? 1 : 0)}
              </span>
            )}
          </button>
          
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800"
            >
              <X size={16} className="mr-1" />
              Limpiar filtros
            </button>
          )}
        </div>
        
        {/* Filtros desplegables */}
        {showFilters && (
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="grado-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Grado
                </label>
                <select
                  id="grado-filter"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-slate-700 dark:border-gray-600 dark:text-white"
                  value={filters.grado}
                  onChange={(e) => setFilters({...filters, grado: e.target.value})}
                >
                  <option value="">Todos los grados</option>
                  {grados.map((grado) => (
                    <option key={grado} value={grado}>
                      {grado}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="seccion-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sección
                </label>
                <select
                  id="seccion-filter"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-slate-700 dark:border-gray-600 dark:text-white"
                  value={filters.seccion}
                  onChange={(e) => setFilters({...filters, seccion: e.target.value})}
                >
                  <option value="">Todas las secciones</option>
                  {secciones.map((seccion) => (
                    <option key={seccion} value={seccion}>
                      {seccion}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="estado-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estado
                </label>
                <select
                  id="estado-filter"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-slate-700 dark:border-gray-600 dark:text-white"
                  value={filters.estado}
                  onChange={(e) => setFilters({...filters, estado: e.target.value})}
                >
                  <option value="">Todos los estados</option>
                  {estados.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading && <p className="text-slate-600 dark:text-gray-300">Cargando alumnos...</p>}
      {error && <p className="text-red-500 bg-red-100 dark:bg-red-900 dark:text-red-200 p-3 rounded-md">Error: {error}</p>}
      
      {!loading && !error && filteredAlumnos().length === 0 && (
        <p className="text-slate-600 dark:text-gray-300">
          {searchTerm ? 'No se encontraron alumnos que coincidan con la búsqueda.' : 'No hay alumnos registrados.'}
        </p>
      )}

      {!loading && !error && filteredAlumnos().length > 0 && (
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
              {filteredAlumnos().map((alumno) => (
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
                        onClick={() => handleDeleteClick(alumno)}
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

      {/* Modal de confirmación de eliminación */}
      <Transition appear show={isDeleteModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsDeleteModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
                    </div>
                    <div className="ml-4">
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                      >
                        ¿Eliminar alumno?
                      </Dialog.Title>
                      <div className="mt-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          ¿Está seguro de que desea eliminar a <span className="font-semibold">{alumnoToDelete?.nombre_completo}</span>? 
                          Esta acción no se puede deshacer.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      onClick={() => {
                        setIsDeleteModalOpen(false);
                        setAlumnoToDelete(null);
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      onClick={handleDeleteAlumno}
                    >
                      Sí, eliminar
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default AlumnosPage;
