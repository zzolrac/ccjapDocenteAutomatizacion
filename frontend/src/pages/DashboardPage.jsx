import React, { useState, useEffect } from 'react';
import AusenciasChart from '../components/AusenciasChart';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const StatCard = ({ title, value, change, icon, changeColorClass = 'text-green-500' }) => (
  <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex items-center space-x-4">
    <div className="p-3 bg-indigo-100 dark:bg-indigo-700 rounded-lg">
      {/* Reemplazar con el componente de icono real */}
      <span className="text-2xl text-indigo-600 dark:text-indigo-300">{icon || '[ICON]'}</span>
    </div>
    <div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">{value}</p>
      {change && <p className={`text-xs ${changeColorClass}`}>{change}</p>}
    </div>
  </div>
);

const RecentMessageItem = ({ senderType, message, tag, tagColor, time, status, statusColor }) => (
  <div className="flex items-start space-x-3 py-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-md mt-1">
      {/* Icono de mensaje */}
      <span className="text-slate-500 dark:text-slate-400 text-sm">✉️</span>
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-center mb-1">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{senderType}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">{time}</p>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">{message}</p>
      <div className="flex justify-between items-center">
        {tag && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tagColor}`}>{tag}</span>}
        {status && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>{status}</span>}
      </div>
    </div>
  </div>
);

const PendingActionItem = ({ icon, title, subtitle, time, priority, priorityColor }) => (
  <div className="flex items-start space-x-3 py-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-md mt-1">
      {/* Icono de acción */}
      <span className="text-slate-500 dark:text-slate-400 text-lg">{icon || '⚠️'}</span>
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-center mb-1">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
        {priority && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${priorityColor}`}>{priority}</span>}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{time}</p>
    </div>
    <button className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap">Completar</button>
  </div>
);


const DashboardPage = () => {
  const [stats, setStats] = useState({
    estudiantes: 0,
    mensajesNuevos: 0,
    ausenciasHoy: 0,
    tareasAsignadas: 0
  });
  const [ausenciasPorMes, setAusenciasPorMes] = useState([]);
  const [totalAusencias, setTotalAusencias] = useState(0);
  const { token } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get('/api/dashboard', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        setStats({
          estudiantes: response.data.estudiantes,
          mensajesNuevos: response.data.mensajesNuevos,
          ausenciasHoy: response.data.ausenciasHoy,
          tareasAsignadas: response.data.tareasAsignadas
        });
        setAusenciasPorMes(response.data.ausenciasPorMes);
        setTotalAusencias(response.data.totalAusencias);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchDashboardData();
  }, [token]);

  const recentMessages = [
    { senderType: 'Padre de familia', message: 'Buenos días, mi hijo Carlos García no asistirá a clases hoy debido a una cita médica.', tag: 'AUSENCIA', tagColor: 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100', time: 'Ayer, 11:13 PM', status: 'Respondido', statusColor: 'bg-purple-100 text-purple-700 dark:bg-purple-700 dark:text-purple-100' },
    { senderType: 'Padre de familia', message: '¿Podría decirme si hay alguna tarea pendiente para María Pérez de 4to grado?', tag: 'TAREA', tagColor: 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100', time: 'Ayer, 8:13 PM', status: 'Leído', statusColor: 'bg-sky-100 text-sky-700 dark:bg-sky-700 dark:text-sky-100' },
    { senderType: 'Docente', message: 'He registrado las calificaciones del examen de matemáticas para 6to grado.', tag: 'CALIFICACIONES', tagColor: 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100', time: 'Ayer, 1:13 AM', status: 'Entregado', statusColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-700 dark:text-indigo-100' },
  ];

  const pendingActions = [
    { icon: '⚠️' /* AlertTriangle */, title: 'Responder mensaje de ausencia', subtitle: 'Padre de Carlos García reportó ausencia por cita médica', time: 'Para: Hoy, 3:00 PM', priority: 'Alta', priorityColor: 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100' },
    { icon: '🕒' /* Clock */, title: 'Confirmar tarea de María Pérez', subtitle: 'Consultar con maestra de 4to grado sobre tareas pendientes', time: 'Para: Hoy, 5:00 PM', priority: 'Media', priorityColor: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-yellow-100' },
    { icon: '✔️' /* CheckCircle */, title: 'Revisar calificaciones de 6to grado', subtitle: 'Aprobar calificaciones registradas por el profesor de matemáticas', time: 'Para: Mañana, 12:00 PM', priority: 'Baja', priorityColor: 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' },
  ];

  return (
    <div className="p-4 md:p-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Panel de Control</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Bienvenido de nuevo, Juan. Aquí está el resumen de hoy.</p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Estudiantes" 
          value={stats.estudiantes} 
          change="+5% desde el mes pasado" 
          icon="👨‍🎓" 
        />
        <StatCard 
          title="Mensajes Nuevos" 
          value={stats.mensajesNuevos} 
          change="+12 hoy" 
          icon="✉️" 
        />
        <StatCard 
          title="Ausencias Hoy" 
          value={stats.ausenciasHoy} 
          change="-2 desde ayer" 
          icon="🏠" 
          changeColorClass="text-red-500"
        />
        <StatCard 
          title="Tareas Asignadas" 
          value={stats.tareasAsignadas} 
          change="+3 esta semana" 
          icon="📚" 
        />
      </div>

      {/* Ausencias por Mes */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Ausencias por Mes</h2>
          <div className="flex items-center space-x-2">
            <button className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">&lt;</button>
            <select className="text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded p-1 border border-slate-300 dark:border-slate-600">
              <option>2025</option>
              <option>2024</option>
            </select>
            <button className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">&gt;</button>
          </div>
        </div>
        <AusenciasChart ausenciasPorMes={ausenciasPorMes} totalAusencias={totalAusencias} />
        <div className="mt-4 flex justify-between items-center text-sm">
          <p className="text-slate-600 dark:text-slate-400">🗓️ Total este año: 145 ausencias</p>
          <a href="#" className="text-indigo-600 dark:text-indigo-400 hover:underline">Ver reporte completo ↗</a>
        </div>
      </div>

      {/* Mensajes Recientes y Acciones Pendientes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Mensajes Recientes</h2>
            <a href="#" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Ver todos ↗</a>
          </div>
          <div>
            {recentMessages.map((msg, index) => (
              <RecentMessageItem key={index} {...msg} />
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">Acciones Pendientes</h2>
          <div>
            {pendingActions.map((action, index) => (
              <PendingActionItem key={index} {...action} />
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default DashboardPage;
