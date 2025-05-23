import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Clock, CheckCircle } from 'lucide-react';

const HistorialConversacion = ({ telefono }) => {
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    fetchHistorial();
  }, [telefono, token]);

  const fetchHistorial = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/webhook/historial/${telefono}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error al cargar historial: ${response.status}`);
      }

      const data = await response.json();
      setMensajes(data);
      setLoading(false);
    } catch (err) {
      console.error('Error al cargar historial:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const formatearFecha = (fechaStr) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleString();
  };

  if (loading) {
    return <div className="text-center py-4">Cargando historial...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (mensajes.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        No hay mensajes en el historial
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {mensajes.map((mensaje) => (
        <div
          key={mensaje.id}
          className={`flex ${
            mensaje.es_respuesta ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`max-w-md rounded-lg p-3 ${
              mensaje.es_respuesta
                ? 'bg-indigo-100 text-indigo-900'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              {mensaje.es_respuesta ? (
                <CheckCircle className="w-4 h-4 text-indigo-500" />
              ) : (
                <MessageSquare className="w-4 h-4 text-gray-500" />
              )}
              <p className="text-sm">{mensaje.mensaje}</p>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formatearFecha(mensaje.fecha)}
              {mensaje.leido && (
                <span className="ml-2">
                  <Clock className="w-3 h-3 inline-block" />
                  Leído
                </span>
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HistorialConversacion;
