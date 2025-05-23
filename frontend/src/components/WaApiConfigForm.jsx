import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Save, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

const WaApiConfigForm = () => {
  const [formData, setFormData] = useState({
    apiKey: '',
    phoneNumber: '',
    webhookUrl: '',
    n8nUrl: '',
    n8nApiKey: '',
    autoReply: true,
    notifyAbsences: true,
    notifyGrades: false,
    notifyEvents: false
  });
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [testStatus, setTestStatus] = useState(null); // null, loading, success, error
  const { token } = useAuth();

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setStatus('loading');
        const response = await fetch('/api/waapi/config', {
          headers: {
            Authorization: "Bearer " + token,
          },
        });
        if (!response.ok) {
          throw new Error("Error fetching config: " + response.status);
        }
        const data = await response.json();
        setFormData({
          apiKey: data.api_key || "",
          phoneNumber: data.phone_number || "",
          webhookUrl: data.webhook_url || "",
          n8nUrl: data.n8n_url || "",
          n8nApiKey: data.n8n_api_key || "",
          autoReply: data.auto_reply !== false,
          notifyAbsences: data.notify_absences !== false,
          notifyGrades: data.notify_grades === true,
          notifyEvents: data.notify_events === true
        });
        setStatus('idle');
      } catch (error) {
        setMessage("Error al cargar la configuración: " + error.message);
        setStatus('error');
      }
    };

    fetchConfig();
  }, [token]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setStatus('loading');
      const response = await fetch('/api/waapi/config', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          api_key: formData.apiKey,
          phone_number: formData.phoneNumber,
          webhook_url: formData.webhookUrl,
          n8n_url: formData.n8nUrl,
          n8n_api_key: formData.n8nApiKey,
          auto_reply: formData.autoReply,
          notify_absences: formData.notifyAbsences,
          notify_grades: formData.notifyGrades,
          notify_events: formData.notifyEvents
        }),
      });
      if (!response.ok) {
        throw new Error("Error al guardar la configuración: " + response.status);
      }
      setMessage("Configuración guardada con éxito!");
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      setMessage("Error al guardar la configuración: " + error.message);
      setStatus('error');
    }
  };
  
  const testConnection = async () => {
    try {
      setTestStatus('loading');
      const response = await fetch('/api/waapi/test-connection', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          api_key: formData.apiKey,
          phone_number: formData.phoneNumber,
          n8n_url: formData.n8nUrl,
          n8n_api_key: formData.n8nApiKey
        }),
      });
      if (!response.ok) {
        throw new Error("Error al probar la conexión: " + response.status);
      }
      setTestStatus('success');
      setTimeout(() => setTestStatus(null), 3000);
    } catch (error) {
      setMessage("Error al probar la conexión: " + error.message);
      setTestStatus('error');
      setTimeout(() => setTestStatus(null), 3000);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Configuración de WhatsApp</h2>
      
      {message && (
        <div className={`p-4 mb-6 rounded-md ${status === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {status === 'error' ? <AlertTriangle className="inline-block mr-2 h-5 w-5" /> : <CheckCircle className="inline-block mr-2 h-5 w-5" />}
          {message}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-md">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-white mb-4">Configuración de API de WhatsApp</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                API Key de WhatsApp:
              </label>
              <input
                type="text"
                id="apiKey"
                name="apiKey"
                value={formData.apiKey}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Ingrese su API Key de WhatsApp"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Obtenga su API Key de Meta Business o de su proveedor de servicios de WhatsApp.</p>
            </div>
            
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                Número de Teléfono:
              </label>
              <input
                type="text"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="+50370000000"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Ingrese el número con código de país (ej. +503).</p>
            </div>
          </div>
          
          <div className="mb-4">
            <label htmlFor="webhookUrl" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              URL de Webhook:
            </label>
            <input
              type="text"
              id="webhookUrl"
              name="webhookUrl"
              value={formData.webhookUrl}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="https://su-dominio.com/api/webhook"
            />
            <p className="mt-1 text-xs text-gray-500">URL que recibirá las notificaciones de WhatsApp.</p>
          </div>
        </div>
        
        <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-md">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-white mb-4">Configuración de n8n</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="n8nUrl" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                URL de n8n:
              </label>
              <input
                type="text"
                id="n8nUrl"
                name="n8nUrl"
                value={formData.n8nUrl}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="http://localhost:5678"
              />
              <p className="mt-1 text-xs text-gray-500">URL donde está alojado su servidor n8n.</p>
            </div>
            
            <div>
              <label htmlFor="n8nApiKey" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                API Key de n8n:
              </label>
              <input
                type="text"
                id="n8nApiKey"
                name="n8nApiKey"
                value={formData.n8nApiKey}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="n8n_api_..."
              />
              <p className="mt-1 text-xs text-gray-500">API Key para autenticar con n8n.</p>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button 
              type="button" 
              onClick={testConnection}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
              disabled={testStatus === 'loading'}
            >
              {testStatus === 'loading' ? (
                <RefreshCw className="animate-spin h-5 w-5 mr-2" />
              ) : testStatus === 'success' ? (
                <CheckCircle className="h-5 w-5 mr-2" />
              ) : testStatus === 'error' ? (
                <AlertTriangle className="h-5 w-5 mr-2" />
              ) : null}
              Probar Conexión
            </button>
          </div>
        </div>
        
        <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-md">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-white mb-4">Configuración de Notificaciones</h3>
          
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoReply"
                name="autoReply"
                checked={formData.autoReply}
                onChange={handleChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="autoReply" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Habilitar respuestas automáticas
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="notifyAbsences"
                name="notifyAbsences"
                checked={formData.notifyAbsences}
                onChange={handleChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="notifyAbsences" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Notificar ausencias
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="notifyGrades"
                name="notifyGrades"
                checked={formData.notifyGrades}
                onChange={handleChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="notifyGrades" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Notificar calificaciones
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="notifyEvents"
                name="notifyEvents"
                checked={formData.notifyEvents}
                onChange={handleChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="notifyEvents" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Notificar eventos escolares
              </label>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? <RefreshCw className="animate-spin h-5 w-5 mr-2" /> : <Save className="h-5 w-5 mr-2" />}
            Guardar Configuración
          </button>
        </div>
      </form>
    </div>
  );
};

export default WaApiConfigForm;