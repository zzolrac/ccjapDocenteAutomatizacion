import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import HistorialConversacion from '../components/HistorialConversacion';
import { ChevronDown, ChevronUp } from 'lucide-react';

const MensajesWhatsAppPage = () => {
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({
    tipo: '',
    procesado: '',
    fechaInicio: '',
    fechaFin: '',
    telefono: '',
    busqueda: ''
  });
  const [respuestaModal, setRespuestaModal] = useState(null);
  const [historialVisible, setHistorialVisible] = useState({});
  const { token } = useAuth();

  useEffect(() => {
    fetchMensajes();
  }, [token]);

  const fetchMensajes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/webhook/mensajes', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error al cargar mensajes: ${response.status}`);
      }

      const data = await response.json();
      setMensajes(data);
      setLoading(false);
    } catch (err) {
      console.error('Error al cargar mensajes:', err);
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

  const filtrarMensajes = (mensajes) => {
    return mensajes.filter(mensaje => {
      const matchesBusqueda = !filtros.busqueda || 
        mensaje.mensaje.toLowerCase().includes(filtros.busqueda) ||
        mensaje.telefono.includes(filtros.busqueda);
      
      const matchesTipo = !filtros.tipo || 
        mensaje.tipo_mensaje === filtros.tipo;
      
      const matchesProcesado = !filtros.procesado ||
        String(mensaje.procesado) === filtros.procesado;
      
      const matchesFecha = !filtros.fechaInicio || !filtros.fechaFin ||
        new Date(mensaje.fecha) >= new Date(filtros.fechaInicio) &&
        new Date(mensaje.fecha) <= new Date(filtros.fechaFin);
      
      return matchesBusqueda && matchesTipo && matchesProcesado && matchesFecha;
    });
  };

  const mensajesFiltrados = filtrarMensajes(mensajes);

  const aplicarFiltros = () => {
    // Implementar lógica de filtrado
    console.log('Filtros aplicados:', filtros);
  };

  const abrirModalRespuesta = (mensaje) => {
    setRespuestaModal(mensaje);
  };

  const cerrarModalRespuesta = () => {
    setRespuestaModal(null);
  };

  const responderMensaje = async (telefono, mensajeOriginal) => {
    const respuesta = document.getElementById('respuesta-textarea').value;
    if (respuesta) {
      try {
        const response = await fetch('/api/webhook/responder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            telefono,
            mensaje: respuesta,
            mensajeOriginalId: mensajeOriginal.id
          })
        });

        if (!response.ok) {
          throw new Error(`Error al enviar respuesta: ${response.status}`);
        }

        const data = await response.json();
        alert('Mensaje enviado con éxito');
        cerrarModalRespuesta();
        fetchMensajes();
      } catch (err) {
        console.error('Error al responder mensaje:', err);
        alert(`Error al enviar mensaje: ${err.message}`);
      }
    }
  };

  const formatearFecha = (fechaStr) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleString();
  };

  const marcarComoProcesado = async (mensajeId) => {
    try {
      const response = await fetch(`/api/webhook/mensajes/${mensajeId}/procesado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error al marcar como procesado: ${response.status}`);
      }

      fetchMensajes();
    } catch (err) {
      console.error('Error al marcar como procesado:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const ModalRespuesta = ({ mensaje, onClose, onResponder }) => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Responder mensaje</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>
          
          <div className="mb-4">
            <p className="font-medium">De: {mensaje.telefono}</p>
            <p className="text-gray-600">{mensaje.mensaje}</p>
          </div>

          <div className="mb-4">
            <textarea
              id="respuesta-textarea"
              placeholder="Escribe tu respuesta..."
              className="w-full p-2 border rounded focus:outline-none focus:border-indigo-500"
              rows="4"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancelar
            </button>
            <button
              onClick={() => onResponder(mensaje.telefono, mensaje)}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-10">Cargando mensajes...</div>;
  }

  if (error) {
    return <div className="bg-red-100 text-red-700 p-4 rounded">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Mensajes de WhatsApp</h1>
      
      {/* Sección de filtros y búsqueda */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Búsqueda y Filtros</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar en mensajes..."
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-indigo-500"
              onChange={(e) => setFiltros(prev => ({
                ...prev,
                busqueda: e.target.value.toLowerCase()
              }))}
            />
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-4">Filtros adicionales</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo</label>
            <select
              name="tipo"
              value={filtros.tipo}
              onChange={handleFiltroChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Todos</option>
              <option value="ausencia">Ausencia</option>
              <option value="consulta">Consulta</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Procesado</label>
            <select
              name="procesado"
              value={filtros.procesado}
              onChange={handleFiltroChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Todos</option>
              <option value="true">Procesado</option>
              <option value="false">No procesado</option>
            </select>
          </div>
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
            <label className="block text-sm font-medium text-gray-700">Teléfono</label>
            <input
              type="text"
              name="telefono"
              value={filtros.telefono}
              onChange={handleFiltroChange}
              placeholder="Número de teléfono"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
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

      {/* Lista de mensajes */}
      <div className="space-y-4">
        {mensajes.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No hay mensajes de WhatsApp registrados
          </div>
        ) : (
          <div className="space-y-4">
            {mensajes.map((mensaje) => (
              <div key={mensaje.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white ${
                      mensaje.tipo_mensaje === 'ausencia' ? 'bg-red-500' :
                      mensaje.tipo_mensaje === 'consulta' ? 'bg-blue-500' : 'bg-gray-500'
                    }`}>
                      {mensaje.tipo_mensaje === 'ausencia' ? 'A' : 
                       mensaje.tipo_mensaje === 'consulta' ? 'C' : '?'}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{mensaje.telefono}</p>
                        <p className="text-xs text-gray-500">{formatearFecha(mensaje.fecha)}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => abrirModalRespuesta(mensaje)}
                          className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          Responder
                        </button>
                        <button
                          onClick={() => marcarComoProcesado(mensaje.id)}
                          className="px-3 py-1 text-sm text-green-600 hover:text-green-700"
                        >
                          Procesado
                        </button>
                        <button
                          onClick={() => 
                            setHistorialVisible(prev => ({
                              ...prev,
                              [mensaje.telefono]: !prev[mensaje.telefono]
                            }))
                          }
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                          <span className="inline-flex items-center">
                            Historial
                            {historialVisible[mensaje.telefono] ? (
                              <ChevronUp className="ml-1 w-4 h-4" />
                            ) : (
                              <ChevronDown className="ml-1 w-4 h-4" />
                            )}
                          </span>
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-gray-700">{mensaje.mensaje}</p>
                    {historialVisible[mensaje.telefono] && (
                      <div className="mt-4">
                        <HistorialConversacion telefono={mensaje.telefono} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Estadísticas */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900">Total mensajes</h3>
          <p className="mt-2 text-3xl font-bold text-indigo-600">{mensajes.length}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900">Procesados</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {mensajes.filter(m => m.procesado).length}
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900">Sin procesar</h3>
          <p className="mt-2 text-3xl font-bold text-yellow-600">
            {mensajes.filter(m => !m.procesado).length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MensajesWhatsAppPage;