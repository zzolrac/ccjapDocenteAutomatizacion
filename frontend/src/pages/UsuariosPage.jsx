import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Corregir ruta de importación
import { Edit3, Trash2, PlusCircle } from 'lucide-react';

const UsuariosPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token, currentUser } = useAuth();
  const location = useLocation();
  console.log('UsuariosPage location.pathname:', location.pathname); // Log para depurar

  useEffect(() => {
    const fetchUsers = async () => {
      if (!token) {
        setError('No autenticado.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await fetch('/api/users', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `Error ${response.status} al obtener usuarios`);
        }
        const data = await response.json();
        setUsers(data);
        setError('');
      } catch (err) {
        setError(err.message);
        console.error("Error fetching users:", err);
      } finally {
        setLoading(false);
      }
    };

    // Solo cargar usuarios si estamos en la ruta base /usuarios, no en /usuarios/nuevo
    if (location.pathname === '/usuarios') {
      fetchUsers();
    }
  }, [token, location.pathname]);

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`¿Está seguro de que desea eliminar al usuario "${userName}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status} al eliminar usuario`);
      }
      setUsers(users.filter(user => user.id !== userId));
      alert(data.message || 'Usuario eliminado con éxito.');
    } catch (err) {
      setError(err.message);
      alert(`Error al eliminar usuario: ${err.message}`);
      console.error("Error deleting user:", err);
    }
  };
  
  // Determinar si el usuario actual puede crear/editar/eliminar
  const canManageUsers = currentUser && (currentUser.rol === 'Superadministrador' || currentUser.rol === 'Director');
  const canDeleteUsers = currentUser && currentUser.rol === 'Superadministrador';


  // Si estamos en una sub-ruta (ej. /usuarios/nuevo), solo renderizar el Outlet
  if (location.pathname !== '/usuarios') {
    return <Outlet />;
  }

  return (
    <div className="container mx-auto px-4 py-8"> {/* El texto general aquí hereda de MainLayout */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-700 dark:text-dark-text">Gestión de Usuarios</h1>
        {canManageUsers && (
          <Link
            to="/usuarios/nuevo"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md flex items-center transition-colors"
          >
            <PlusCircle size={20} className="mr-2" />
            Registrar Nuevo Usuario
          </Link>
        )}
      </div>

      {loading && <p className="text-slate-600 dark:text-gray-300">Cargando usuarios...</p>}
      {error && <p className="text-red-500 bg-red-100 dark:bg-red-900 dark:text-red-200 p-3 rounded-md">Error: {error}</p>}
      
      {!loading && !error && users.length === 0 && (
        <p className="text-slate-600 dark:text-gray-300">No hay usuarios registrados.</p>
      )}

      {!loading && !error && users.length > 0 && (
        <div className="bg-white dark:bg-dark-card-bg shadow-xl rounded-lg overflow-hidden border border-transparent dark:border-dark-border">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-dark-border">
            <thead className="bg-slate-50 dark:bg-slate-700"> {/* Un gris un poco más oscuro para el header de la tabla en modo oscuro */}
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Nombre</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Rol</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Fecha Creación</th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-card-bg divide-y divide-slate-200 dark:divide-dark-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-dark-text">{user.nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-gray-300">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-gray-300">{user.rol}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-gray-300">
                    {new Date(user.fecha_creacion).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {canManageUsers && (
                      <Link to={`/usuarios/editar/${user.id}`} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-3">
                        <Edit3 size={18} className="inline" />
                      </Link>
                    )}
                    {canDeleteUsers && user.id !== currentUser.id && ( 
                      <button 
                        onClick={() => handleDeleteUser(user.id, user.nombre)} 
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                        title="Eliminar Usuario"
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

export default UsuariosPage;
