import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, FileText, Settings, LogOut, Sun, Moon } from 'lucide-react'; 

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

  const menuItems = [
    { name: 'Dashboard', icon: <Home size={20} />, path: '/' },
    { name: 'Usuarios', icon: <Users size={20} />, path: '/usuarios' },
    { name: 'Ausencias', icon: <FileText size={20} />, path: '/ausencias' },
    { name: 'Configuración', icon: <Settings size={20} />, path: '/configuracion' },
    { name: 'WaApi Config', icon: <Settings size={20} />, path: '/waapi-config' },
    { name: 'Alumnos', icon: <Users size={20} />, path: '/alumnos' },
  ];

  return (
    <div className="w-64 h-screen bg-slate-50 dark:bg-dark-bg text-slate-700 dark:text-dark-text p-5 flex flex-col border-r border-slate-200 dark:border-dark-border">
      <div className="mb-10">
        <Link to="/" className="flex items-center space-x-2">
          {/* Considerar un logo SVG que pueda cambiar de color con fill="currentColor" o clases de texto */}
          <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">CCJAP</span>
          <span className="text-2xl font-semibold text-slate-700 dark:text-dark-text">Gestión</span>
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
    </div>
  );
};

export default Sidebar;
