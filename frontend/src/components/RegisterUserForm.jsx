import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext'; // Importar useAuth

function RegisterUserForm() {
  const { token, currentUser } = useAuth(); // Obtener token y currentUser del contexto
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('Docente'); // Default rol
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      // const token = localStorage.getItem('authToken'); // Ya no se lee directamente de localStorage
      if (!token || !currentUser) {
        setError('No autenticado o datos de usuario no disponibles. Por favor, inicie sesión de nuevo.');
        return;
      }

      const response = await fetch('/api/users', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, 
        },
        // El backend espera institucion_id en el cuerpo si es relevante para la creación del usuario
        // El rol del usuario que crea (currentUser.rol) determinará si puede crear para otras instituciones o solo la suya
        body: JSON.stringify({ 
          nombre, 
          email, 
          password, 
          rol, 
          institucion_id: currentUser.institucion_id // Usar institucion_id del usuario autenticado
        }), 
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Error parsing JSON from create user response:", responseText);
        throw new Error(`Respuesta inesperada del servidor: ${response.status} - ${responseText || 'Sin contenido'}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}`);
      }

      setMessage(`Usuario "${data.nombre}" creado con éxito con ID: ${data.id}`);
      // Clear form
      setNombre('');
      setEmail('');
      setPassword('');
      setRol('Docente');
    } catch (err) {
      setError(err.message);
      console.error('Failed to create user:', err);
    }
  };

  return (
    // Asumimos que este componente se renderiza dentro de MainLayout, que ya tiene dark:bg-dark-card-bg
    // Si se usa fuera, necesitaría su propio fondo oscuro.
    // Por ahora, ajustamos el texto y los elementos internos.
    <div className="p-8 bg-white dark:bg-dark-card-bg shadow-xl rounded-lg max-w-md mx-auto mt-4 border border-transparent dark:border-dark-border"> 
      <h2 className="text-2xl font-bold text-center text-gray-700 dark:text-dark-text mb-6">Registrar Nuevo Usuario</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre:</label>
          <input
            type="text"
            id="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="w-full input-class" // Usará estilos de index.css
          />
        </div>
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full input-class" // Usará estilos de index.css
          />
        </div>
        <div className="mb-4">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contraseña:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full input-class" // Usará estilos de index.css
          />
        </div>
        <div className="mb-6">
          <label htmlFor="rol" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol:</label>
          <select
            id="rol"
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            required
            className="w-full input-class" // Usará estilos de index.css, bg-white se aplica por defecto
          >
            <option value="Docente">Docente</option>
            <option value="Director">Director</option>
            <option value="Secretaria">Secretaría</option>
            <option value="Superadministrador">Superadministrador</option>
          </select>
        </div>
        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Registrar Usuario
        </button>
      </form>
      {message && <p className="mt-4 text-sm text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900 p-3 rounded-md border border-green-300 dark:border-green-700">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900 p-3 rounded-md border border-red-300 dark:border-red-700">{error}</p>}
    </div>
  );
}

export default RegisterUserForm;
