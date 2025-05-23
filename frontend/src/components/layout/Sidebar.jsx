import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, FileText, Settings, LogOut, Sun, Moon, MessageCircle, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
  const location = useLocation(); // Para resaltar el item activo
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };
  
  const { currentUser } = useAuth();
  
  // Función para obtener la primera letra del nombre
  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Función para obtener el color de fondo basado en el rol
  const getRoleColor = (role) => {
    const colors = {
      'superadmin': 'bg-purple-500',
      'director': 'bg-blue-500',
      'docente': 'bg-green-500',
      'secretaria': 'bg-pink-500',
    };
    return colors[role?.toLowerCase()] || 'bg-gray-500';
  };

  const menuItems = [
    { name: 'Dashboard', icon: <Home size={20} />, path: '/' },
    { name: 'Usuarios', icon: <Users size={20} />, path: '/usuarios' },
    { name: 'Alumnos', icon: <Users size={20} />, path: '/alumnos' },
    { name: 'Ausencias', icon: <FileText size={20} />, path: '/ausencias' },
    { name: 'Mensajes WhatsApp', icon: <MessageCircle size={20} />, path: '/mensajes-whatsapp' },
    { name: 'Configuración', icon: <Settings size={20} />, path: '/configuracion' },
    { name: 'WaApi Config', icon: <Settings size={20} />, path: '/waapi-config' },
  ];

  return (
    <div className="w-64 h-screen bg-slate-50 dark:bg-dark-bg text-slate-700 dark:text-dark-text p-5 flex flex-col border-r border-slate-200 dark:border-dark-border">
      <div className="mb-6">
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">CCJAP</span>
          <span className="text-2xl font-semibold text-slate-700 dark:text-dark-text">Gestión</span>
        </Link>
      </div>
      
      {/* Sección de información del usuario */}
      <div className="mb-6 p-3 bg-slate-100 dark:bg-dark-card-bg rounded-lg">
        <Link to="/perfil" className="flex items-center space-x-3 group">
          <div className={`relative w-10 h-10 rounded-full ${getRoleColor(currentUser?.rol)} flex items-center justify-center text-white font-medium text-sm`}>
            {currentUser?.foto_perfil_url ? (
              <img 
                src={currentUser.foto_perfil_url} 
                alt={currentUser.nombre} 
                className="w-full h-full rounded-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '';
                  e.target.parentNode.textContent = getInitials(currentUser?.nombre || 'U');
                }}
              />
            ) : (
              getInitials(currentUser?.nombre || 'U')
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-800 dark:text-white truncate">{currentUser?.nombre || 'Usuario'}</p>
            <p className="text-xs text-slate-500 dark:text-gray-400 capitalize">{currentUser?.rol?.toLowerCase() || 'Rol no definido'}</p>
          </div>
          <button className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <User size={16} />
          </button>
        </Link>
      </div>
      <nav className="flex-grow">
        <ul>
          {menuItems.map((item) => (
            <li key={item.name} className="mb-2">
              <Link
                to={item.path}
                className={`flex items-center space-x-3 p-2 rounded-md transition-colors duration-200 ${
                  location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
                    ? 'bg-indigo-100 dark:bg-indigo-600 text-indigo-700 dark:text-white font-medium' // Estilo activo
                    : 'text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-dark-card-bg hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {React.cloneElement(item.icon, { className: `w-5 h-5 ${location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path)) ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-500 dark:text-gray-500'}` })}
                <span>{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto pt-4 border-t border-slate-200 dark:border-dark-border">
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center space-x-3 p-2 rounded-md text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-dark-card-bg hover:text-slate-800 dark:hover:text-white transition-colors duration-200 mb-2"
          title={isDarkMode ? "Activar Modo Claro" : "Activar Modo Oscuro"}
        >
          {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-500 dark:text-gray-500" />}
          <span>{isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
        </button>
        <Link
          to="/logout"
          className="flex items-center space-x-3 p-2 rounded-md text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-dark-card-bg hover:text-slate-800 dark:hover:text-white transition-colors duration-200"
        >
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </Link>
      </div>
      
      {/* User Profile Section */}
      <div className="mt-auto pt-4 border-t border-slate-200 dark:border-dark-border">
        <Link to="/perfil" className="block p-2 -mx-2 rounded-md hover:bg-slate-100 dark:hover:bg-dark-card-bg transition-colors duration-200">
          <div className="flex items-center space-x-3">
            {currentUser?.foto_perfil_url ? (
              <img 
                src={currentUser.foto_perfil_url} 
                alt={currentUser.nombre} 
                className="w-10 h-10 rounded-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '';
                  e.target.parentNode.innerHTML = `
                    <div class="w-10 h-10 rounded-full flex items-center justify-center text-white ${getRoleColor(currentUser?.rol)}">
                      ${getInitials(currentUser?.nombre || 'U')}
                    </div>
                  `;
                }}
              />
            ) : (
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${getRoleColor(currentUser?.rol)}`}>
                {getInitials(currentUser?.nombre || 'U')}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                {currentUser?.nombre || 'Usuario'}
              </p>
              <p className="text-xs text-slate-500 dark:text-gray-400 capitalize">
                {currentUser?.rol?.toLowerCase() || 'Rol no definido'}
              </p>
            </div>
            <div className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white transition-colors">
              <User size={16} />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
