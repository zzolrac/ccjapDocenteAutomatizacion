import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function SetupPage() {
  const [formData, setFormData] = useState({
    nombre_institucion: '',
    logo_url: '',
    admin_nombre: '',
    admin_email: '',
    admin_password: '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!formData.nombre_institucion || !formData.admin_nombre || !formData.admin_email || !formData.admin_password) {
      setError('Por favor, complete todos los campos requeridos para la institución y el administrador.');
      return;
    }

    try {
      const response = await fetch('/api/setup/complete-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}`);
      }

      setMessage('¡Configuración inicial completada con éxito! Redirigiendo a la página de login...');
      setTimeout(() => {
        navigate('/login');
        window.location.reload(); // Para que App.jsx re-evalúe el estado de setup/auth
      }, 3000);

    } catch (err) {
      setError(err.message);
      console.error('Error durante el setup:', err);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-dark-bg text-slate-800 dark:text-dark-text p-4">
      <div className="p-8 bg-white dark:bg-dark-card-bg shadow-xl rounded-lg max-w-lg w-full border border-transparent dark:border-dark-border">
        <h2 className="text-3xl font-bold text-center text-slate-700 dark:text-dark-text mb-8">Configuración Inicial del Sistema</h2>
        
        <form onSubmit={handleSubmit}>
          <fieldset className="mb-6 border border-slate-300 dark:border-dark-border p-4 rounded-md">
            <legend className="text-xl font-semibold text-slate-600 dark:text-gray-300 px-2">Datos de la Institución</legend>
            <div className="mt-4 mb-4">
              <label htmlFor="nombre_institucion" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Nombre de la Institución:</label>
              <input type="text" name="nombre_institucion" id="nombre_institucion" value={formData.nombre_institucion} onChange={handleChange} required className="w-full input-class" />
            </div>
            <div className="mb-4">
              <label htmlFor="logo_url" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">URL del Logo (Opcional):</label>
              <input type="url" name="logo_url" id="logo_url" value={formData.logo_url} onChange={handleChange} className="w-full input-class" />
            </div>
          </fieldset>

          <fieldset className="mb-6 border border-slate-300 dark:border-dark-border p-4 rounded-md">
            <legend className="text-xl font-semibold text-slate-600 dark:text-gray-300 px-2">Cuenta del Superadministrador</legend>
            <div className="mt-4 mb-4">
              <label htmlFor="admin_nombre" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Nombre Completo:</label>
              <input type="text" name="admin_nombre" id="admin_nombre" value={formData.admin_nombre} onChange={handleChange} required className="w-full input-class" />
            </div>
            <div className="mb-4">
              <label htmlFor="admin_email" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Email:</label>
              <input type="email" name="admin_email" id="admin_email" value={formData.admin_email} onChange={handleChange} required className="w-full input-class" />
            </div>
            <div className="mb-4">
              <label htmlFor="admin_password" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Contraseña:</label>
              <input type="password" name="admin_password" id="admin_password" value={formData.admin_password} onChange={handleChange} required className="w-full input-class" />
            </div>
          </fieldset>
          
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-lg">
            Completar Configuración
          </button>
        </form>
        {message && <p className="mt-4 text-sm text-green-600 bg-green-100 p-3 rounded-md">{message}</p>}
        {error && <p className="mt-4 text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
      </div>
      <style jsx>{`
        .input-class {
          /* Estos estilos ahora son manejados por @apply en index.css o clases directas de Tailwind */
          /* Si se quieren overrides específicos para esta página, se pueden poner aquí */
          /* Por ahora, confiamos en los estilos globales y las clases de Tailwind en los inputs */
          /* Ejemplo de override si fuera necesario: */
          /* background-color: #f0f0f0 !important; */
        }
      `}</style>
    </div>
  );
}

export default SetupPage;
