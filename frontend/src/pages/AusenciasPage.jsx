import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Outlet } from 'react-router-dom';

const AusenciasPage = () => {
  const [ausencias, setAusencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({
    fechaInicio: '',
    fechaFin: '',
    alumno: '',
    justificado: ''
  });
  
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAusencias();
  }, [token]);

  const fetchAusencias = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/webhook/ausencias', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error al cargar ausencias: ${response.status}`);
      }

      const data = await response.json();
      setAusencias(data);
      setLoading(false);
    } catch (err) {
      console.error('Error al cargar ausencias:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const aplicarFiltros = () => {
    // Implementar lógica de filtrado
    // Por ahora es un placeholder para la funcionalidad futura
    console.log('Filtros aplicados:', filtros);
  };

  const marcarJustificada = async (ausenciaId, justificado) => {
    try {
      const response = await fetch(`/api/webhook/ausencias/${ausenciaId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ justificado })
      });

      if (!response.ok) {
        throw new Error(`Error al actualizar ausencia: ${response.status}`);
      }

      // Actualizar la lista de ausencias
      fetchAusencias();
    } catch (err) {
      console.error('Error al marcar ausencia como justificada:', err);
      setError(err.message);
    }
  };

  // Si hay un componente hijo en la ruta (como un formulario de detalle)
  if (window.location.pathname !== '/ausencias') {
    return <Outlet />;
  }

  if (loading) {
    return <div className="text-center py-10">Cargando ausencias...</div>;
  }

  if (error) {
    return <div className="bg-red-100 text-red-700 p-4 rounded">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Gestión de Ausencias</h1>
      
      {/* Sección de filtros */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Fecha inicio</label>
            <input
              type="date"
              name="fechaInicio"
              value={filtros.fechaInicio}
              onChange={handleFiltroChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Fecha fin</label>
            <input
              type="date"
              name="fechaFin"
              value={filtros.fechaFin}
              onChange={handleFiltroChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Alumno</label>
            <input
              type="text"
              name="alumno"
              value={filtros.alumno}
              onChange={handleFiltroChange}
              placeholder="Nombre del alumno"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Justificado</label>
            <select
              name="justificado"
              value={filtros.justificado}
              onChange={handleFiltroChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Todos</option>
              <option value="true">Justificado</option>
              <option value="false">No justificado</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={aplicarFiltros}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Aplicar filtros
          </button>
        </div>
      </div>

      {/* Tabla de ausencias */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Alumno
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Docente
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Motivo
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {ausencias.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                  No hay ausencias registradas
                </td>
              </tr>
            ) : (
              ausencias.map((ausencia) => (
                <tr key={ausencia.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(ausencia.fecha_ausencia).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{ausencia.alumno_nombre}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{ausencia.docente_nombre || 'No asignado'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="max-w-xs overflow-hidden text-ellipsis">
                      {ausencia.motivo}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      ausencia.justificado
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {ausencia.justificado ? 'Justificado' : 'Sin justificar'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => marcarJustificada(ausencia.id, !ausencia.justificado)}
                      className={`text-indigo-600 hover:text-indigo-900 mr-3 ${
                        ausencia.justificado ? 'bg-red-100 px-2 py-1 rounded' : 'bg-green-100 px-2 py-1 rounded'
                      }`}
                    >
                      {ausencia.justificado ? 'Desmarcar justificada' : 'Marcar justificada'}
                    </button>
                    <button 
                      onClick={() => navigate(`/ausencias/${ausencia.id}`)} 
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Ver detalles
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Estadísticas */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900">Total ausencias</h3>
          <p className="mt-2 text-3xl font-bold text-indigo-600">{ausencias.length}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900">Ausencias justificadas</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {ausencias.filter(a => a.justificado).length}
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900">Pendientes por justificar</h3>
          <p className="mt-2 text-3xl font-bold text-yellow-600">
            {ausencias.filter(a => !a.justificado).length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AusenciasPage;
