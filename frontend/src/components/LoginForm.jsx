import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Importar useAuth

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth(); // Usar login del contexto
  const navigate = useNavigate(); // Para la redirección

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}`);
      }

      // Asumiendo que el backend devuelve { token, user: { id, email, rol, nombre } }
      if (data.token && data.user) {
        login(data.token, data.user); // Llama a la función login del AuthContext
        navigate('/'); // Redirigir al dashboard después del login
        // No es necesario window.location.reload() si el estado de App se actualiza por el contexto
      } else {
        throw new Error('Respuesta de login inválida del servidor.');
      }

    } catch (err) {
      setError(err.message);
      console.error('Failed to login:', err);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-dark-bg text-slate-800 dark:text-dark-text">
      <div className="p-8 bg-white dark:bg-dark-card-bg shadow-xl rounded-lg max-w-md w-full border border-transparent dark:border-dark-border">
        <h2 className="text-2xl font-bold text-center text-slate-700 dark:text-dark-text mb-6">Iniciar Sesión</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-dark-text"
              autoComplete="email"
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Contraseña:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-dark-text"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Ingresar
          </button>
        </form>
        {error && <p className="mt-4 text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
      </div>
    </div>
  );
}

export default LoginForm;
