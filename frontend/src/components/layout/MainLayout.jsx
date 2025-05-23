import React from 'react';
import Sidebar from './Sidebar';

const MainLayout = ({ children }) => {
  return (
    <div className="flex h-screen bg-white dark:bg-dark-bg text-slate-800 dark:text-dark-text">
      <Sidebar />
      {/* Usaremos dark-card-bg para el área de contenido para un ligero contraste con el fondo principal del modo oscuro */}
      <main className="flex-1 p-4 overflow-y-auto bg-white dark:bg-dark-card-bg"> 
        {/* Aquí podríamos añadir un Header si fuera necesario */}
        {/* <Header /> */}
        <div className="mt-0"> 
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
