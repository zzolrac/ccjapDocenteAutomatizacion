import React from 'react';

const DashboardPage = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-700 dark:text-dark-text mb-6">Dashboard Principal</h1>
      <p className="text-slate-600 dark:text-gray-300 mb-4">Bienvenido al panel de administración.</p>
      {/* Aquí irán los widgets y estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {/* Placeholder cards */}
        <div className="bg-white dark:bg-dark-card-bg p-6 rounded-lg shadow-lg border border-transparent dark:border-dark-border">
          <h2 className="text-xl font-semibold text-slate-700 dark:text-dark-text mb-2">Estadística 1</h2>
          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">1,234</p>
        </div>
        <div className="bg-white dark:bg-dark-card-bg p-6 rounded-lg shadow-lg border border-transparent dark:border-dark-border">
          <h2 className="text-xl font-semibold text-slate-700 dark:text-dark-text mb-2">Estadística 2</h2>
          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">56%</p>
        </div>
        <div className="bg-white dark:bg-dark-card-bg p-6 rounded-lg shadow-lg border border-transparent dark:border-dark-border">
          <h2 className="text-xl font-semibold text-slate-700 dark:text-dark-text mb-2">Alerta Importante</h2>
          <p className="text-slate-600 dark:text-gray-300">Hay 3 tareas pendientes.</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
