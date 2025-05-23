import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [isLoading, setIsLoading] = useState(true); // Para el chequeo inicial del token
  const navigate = useNavigate(); // Mover useNavigate aquí si es necesario para el provider

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUserData = localStorage.getItem('userData');
    if (storedToken && storedUserData) {
      setToken(storedToken);
      try {
        setCurrentUser(JSON.parse(storedUserData));
      } catch (e) {
        console.error("Error parsing stored user data", e);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        setToken(null);
        setCurrentUser(null);
      }
    } else {
      // Para desarrollo, creamos un usuario de prueba si no hay token
      const devToken = 'dev-token-12345';
      const devUser = {
        id: 1,
        nombre: 'Usuario de Desarrollo',
        email: 'dev@example.com',
        rol: 'admin'
      };
      localStorage.setItem('authToken', devToken);
      localStorage.setItem('userData', JSON.stringify(devUser));
      setToken(devToken);
      setCurrentUser(devUser);
      console.log('Modo desarrollo: Usuario creado automáticamente');
    }
    setIsLoading(false);
  }, []);

  const login = (newToken, userData) => {
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('userData', JSON.stringify(userData));
    setToken(newToken);
    setCurrentUser(userData);
    // La redirección se manejará en el componente LoginForm o en App.jsx
    // navigate('/'); // No es ideal que el provider navegue directamente sin contexto de dónde está
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setToken(null);
    setCurrentUser(null);
    // La redirección se manejará en el componente LogoutPage o en App.jsx
    // navigate('/login');
  };

  const updateUser = (userData) => {
    localStorage.setItem('userData', JSON.stringify(userData));
    setCurrentUser(userData);
    return Promise.resolve(userData);
  };

  const value = {
    currentUser,
    token,
    isAuthenticated: !!token,
    isLoading, // Para que App.jsx pueda esperar a que se cargue el estado inicial del token
    login,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
