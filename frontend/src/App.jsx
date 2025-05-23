import React, { useState, useEffect, useContext } from 'react'; // Añadir useContext
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'; // Añadir useLocation
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext'; // Importar AuthProvider y useAuth
import MainLayout from './components/layout/MainLayout';
import DashboardPage from './pages/DashboardPage';
import UsuariosPage from './pages/UsuariosPage';
import RegisterUserForm from './components/RegisterUserForm';
import AusenciasPage from './pages/AusenciasPage';
import ConfiguracionPage from './pages/ConfiguracionPage';
import LoginForm from './components/LoginForm';
import SetupPage from './pages/SetupPage';
import EditUserForm from './components/EditUserForm';
import AlumnosPage from './pages/AlumnosPage';
import RegisterAlumnoForm from './components/RegisterAlumnoForm';
import EditAlumnoForm from './components/EditAlumnoForm';
import WaApiConfigForm from './components/WaApiConfigForm';
import MensajesWhatsAppPage from './pages/MensajesWhatsAppPage';
import ProfilePage from './pages/ProfilePage';

const LogoutPage = () => {
  const { logout } = useAuth();
  useEffect(() => {
    logout(); // Llamar a logout al montar el componente
    // La redirección se maneja en AppRoutes basado en isAuthenticated
  }, [logout]);

  // No es necesario retornar <Navigate /> aquí si AppRoutes maneja la redirección
  // basado en el estado de autenticación actualizado por logout().
  // Sin embargo, para asegurar una redirección inmediata si el componente se renderiza brevemente:
  return <Navigate to="/login" replace />; 
};

function App() {
  const [isSetupComplete, setIsSetupComplete] = useState(null); // null: cargando, true: completo, false: no completo
  const [isLoadingSetupStatus, setIsLoadingSetupStatus] = useState(true);
  
  // La variable isAuthenticated local ya no es necesaria aquí, se usará la del contexto en AppRoutes.
  // const isAuthenticated = !!localStorage.getItem('authToken'); 

  useEffect(() => {
    const checkSetupStatus = async () => {
      setIsLoadingSetupStatus(true);
      try {
        const response = await fetch('/api/setup/status');
        if (!response.ok) {
          console.error('Error fetching setup status:', response.status, await response.text());
          // Para desarrollo, asumimos que el setup está completo para evitar problemas
          setIsSetupComplete(true); 
        } else {
          const data = await response.json();
          setIsSetupComplete(data.isSetupComplete || true); // Forzamos a true para desarrollo
        }
      } catch (error) {
        console.error('Failed to fetch setup status (network error or backend down):', error);
        // Para desarrollo, asumimos que el setup está completo para evitar problemas
        setIsSetupComplete(true); 
      } finally {
        setIsLoadingSetupStatus(false);
      }
    };
    checkSetupStatus();
  }, []); // El array vacío asegura que se ejecute solo una vez al montar App

  // El useEffect anterior que dependía de [isAuthenticated] y hacía window.location.reload()
  // ha sido eliminado para evitar posibles bucles de recarga y simplificar.
  // LoginForm y LogoutPage manejan la redirección necesaria por ahora.

  // isLoading y isAuthenticated ahora vendrán de useAuth() después de que AuthProvider esté activo.
  // Por ahora, mantenemos la lógica de setup aquí, pero el estado de auth se leerá del contexto.

  if (isLoadingSetupStatus) {
    return <div className="flex items-center justify-center min-h-screen text-xl">Cargando configuración del sistema...</div>;
  }

  // Componente interno para acceder al contexto de autenticación
  const AppRoutes = () => {
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const location = useLocation(); // Para la lógica de redirección en logout

    console.log('Auth state:', { isAuthenticated, isAuthLoading, isSetupComplete, path: location.pathname });

    if (isAuthLoading) { // Esperar a que el contexto de autenticación cargue el estado inicial del token
      return <div className="flex items-center justify-center min-h-screen text-xl">Verificando autenticación...</div>;
    }

    // Si el setup no está completo, redirigir a /setup, excepto si ya estamos en /setup
    if (!isSetupComplete && location.pathname !== '/setup') {
      return <Navigate to="/setup" replace />;
    }
    if (!isSetupComplete && location.pathname === '/setup') {
      return <SetupPage />; // Renderizar SetupPage directamente si estamos en /setup y no está completo
    }
    
    // Si el setup está completo, proceder con la lógica de autenticación y rutas normales
    return (
      <Routes>
        <Route 
          path="/" 
          element={isAuthenticated ? <MainLayout><DashboardPage /></MainLayout> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/login" 
          element={!isAuthenticated ? <LoginForm /> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/logout" 
          element={<LogoutPage />} 
        />
         <Route 
          path="/setup" // Si el setup está completo, /setup no debería ser accesible directamente
          element={isSetupComplete ? <Navigate to="/" replace /> : <SetupPage />}
        />
        <Route 
          path="/usuarios" 
          element={isAuthenticated ? <MainLayout><UsuariosPage /></MainLayout> : <Navigate to="/login" replace />}
        >
          <Route path="nuevo" element={isAuthenticated ? <RegisterUserForm /> : <Navigate to="/login" replace />} />
          <Route path="editar/:userId" element={isAuthenticated ? <EditUserForm /> : <Navigate to="/login" replace />} />
        </Route>
        <Route 
          path="/ausencias" 
          element={isAuthenticated ? <MainLayout><AusenciasPage /></MainLayout> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/configuracion"
          element={isAuthenticated ? <MainLayout><ConfiguracionPage /></MainLayout> : <Navigate to="/login" replace />}
        />
        <Route
          path="/waapi-config"
          element={isAuthenticated ? (
            <MainLayout>
              {React.createElement(WaApiConfigForm)}
            </MainLayout>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/alumnos"
          element={isAuthenticated ? <MainLayout><AlumnosPage /></MainLayout> : <Navigate to="/login" replace />}
        >
          <Route path="nuevo" element={isAuthenticated ? <RegisterAlumnoForm /> : <Navigate to="/login" replace />} />
          <Route path="editar/:alumnoId" element={isAuthenticated ? <EditAlumnoForm /> : <Navigate to="/login" replace />} />
        </Route>
        <Route
          path="/mensajes-whatsapp"
          element={isAuthenticated ? <MainLayout><MensajesWhatsAppPage /></MainLayout> : <Navigate to="/login" replace />}
        />
        <Route
          path="/perfil"
          element={isAuthenticated ? <MainLayout><ProfilePage /></MainLayout> : <Navigate to="/login" replace />}
        />
        <Route 
          path="*" 
          element={isAuthenticated ? <MainLayout><div>Página no encontrada (404)</div></MainLayout> : <Navigate to="/login" replace />} 
        />
      </Routes>
    );
  };

  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;

