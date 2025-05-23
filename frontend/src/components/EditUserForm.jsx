import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function EditUserForm() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { token, currentUser } = useAuth();

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    rol: '',
    institucion_id: '', 
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      if (!token) {
        setError('No autenticado.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await fetch(`/api/users/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `Error ${response.status} al obtener datos del usuario`);
        }
        const userData = await response.json();
        setFormData({
          nombre: userData.nombre || '',
          email: userData.email || '',
          rol: userData.rol || '',
          institucion_id: userData.institucion_id || currentUser?.institucion_id || '',
        });
        setError('');
      } catch (err) {
        setError(err.message);
        console.error("Error fetching user data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [userId, token, currentUser]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!formData.nombre || !formData.email || !formData.rol) {
      setError('Nombre, email y rol son requeridos.');
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            nombre: formData.nombre,
            email: formData.email,
            rol: formData.rol,
            institucion_id: formData.institucion_id // Asegurarse que se envíe
        }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Error parsing JSON from update user response:", responseText);
        throw new Error(`Respuesta inesperada del servidor: ${response.status} - ${responseText || 'Sin contenido'}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}`);
      }
      setMessage(`Usuario "${data.nombre}" actualizado con éxito.`);
      setTimeout(() => {
        navigate('/usuarios'); // Redirigir a la lista de usuarios
      }, 2000);
    } catch (err) {
      setError(err.message);
      console.error('Failed to update user:', err);
    }
  };

  if (loading) return <p className="dark:text-gray-300">Cargando datos del usuario...</p>;

  return (
    <div className="p-8 bg-white dark:bg-dark-card-bg shadow-xl rounded-lg max-w-md mx-auto mt-4 border border-transparent dark:border-dark-border">
      <h2 className="text-2xl font-bold text-center text-slate-700 dark:text-dark-text mb-6">Editar Usuario</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="nombre" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Nombre:</label>
          <input type="text" name="nombre" id="nombre" value={formData.nombre} onChange={handleChange} required className="w-full input-class" />
        </div>
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Email:</label>
          <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="w-full input-class" />
        </div>
        <div className="mb-6">
          <label htmlFor="rol" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Rol:</label>
          <select name="rol" id="rol" value={formData.rol} onChange={handleChange} required className="w-full input-class"> {/* input-class ya tiene dark:bg-slate-700 */}
            <option value="Docente">Docente</option>
            <option value="Director">Director</option>
            <option value="Secretaria">Secretaría</option>
            {/* Solo un Superadministrador puede asignar/ver el rol Superadministrador */}
            {currentUser && currentUser.rol === 'Superadministrador' && (
              <option value="Superadministrador">Superadministrador</option>
            )}
          </select>
        </div>
        <input type="hidden" name="institucion_id" value={formData.institucion_id} />

        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md">
          Actualizar Usuario
        </button>
      </form>
      {message && <p className="mt-4 text-sm text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900 p-3 rounded-md border border-green-300 dark:border-green-700">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900 p-3 rounded-md border border-red-300 dark:border-red-700">{error}</p>}
       <style jsx>{`
        .input-class {
          /* Ya no es necesario aquí, se toma de index.css */
          /* padding: 0.5rem 0.75rem; */
          border: 1px solid #cbd5e1; /* slate-300 */
          border-radius: 0.375rem; /* rounded-md */
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
          background-color: #ffffff; 
          color: #1e293b; 
        }
        .input-class:focus {
          outline: 2px solid transparent;
          outline-offset: 2px;
          border-color: #6366f1; /* indigo-500 */
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.5);
        }
      `}</style>
    </div>
  );
}

export default EditUserForm;
