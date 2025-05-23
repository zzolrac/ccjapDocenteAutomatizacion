import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const WaApiConfigForm = () => {
  const [apiKey, setApiKey] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/waapi/config', {
          headers: {
            Authorization: "Bearer " + token,
          },
        });
        if (!response.ok) {
          throw new Error("Error fetching config: " + response.status);
        }
        const data = await response.json();
        setApiKey(data.api_key || "");
        setPhoneNumber(data.phone_number || "");
      } catch (error) {
        setMessage("Error fetching config: " + error.message);
      }
    };

    fetchConfig();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/waapi/config', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ apiKey: apiKey, phoneNumber: phoneNumber }),
      });
      if (!response.ok) {
        throw new Error("Error saving config: " + response.status);
      }
      setMessage("Configuración guardada con éxito!");
    } catch (error) {
      setMessage("Error saving config: " + error.message);
    }
  };

  return (
    <>
      <h2>Configuración de WaApi</h2>
      {message && (<p>{message}</p>)}
      <form onSubmit={handleSubmit}>
        
          <label htmlFor="apiKey">API Key:</label>
          <input
            type="text"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
          />
        
        
          <label htmlFor="phoneNumber">Número de Teléfono:</label>
          <input
            type="text"
            id="phoneNumber"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
          />
        
        <button type="submit">Guardar Configuración</button>
      </form>
    </>
  );
};

export default WaApiConfigForm;