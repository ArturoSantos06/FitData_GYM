import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Users, Calendar, TrendingUp, DollarSign, Clock, Search, AlertCircle, CheckCircle, Dumbbell } from 'lucide-react';

function GestionEntrenadores() {
  const [trainingServices, setTrainingServices] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); 
  const [sortBy, setSortBy] = useState('daysRemaining');
  const [activeTab, setActiveTab] = useState('clients'); 

  useEffect(() => {
    loadTrainingData();
  }, []);

  const loadTrainingData = async () => {
    try {
      setLoading(true);
      
      
      setTrainingServices([]);
      setTrainers([]);
      
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar y ordenar servicios de entrenamiento
  const filteredServices = trainingServices
    .filter(service => {
      const matchesSearch = 
        service.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.clientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.trainerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.serviceType?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter = 
        filterStatus === 'all' ||
        service.status === filterStatus;

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'daysRemaining') {
        return b.daysRemaining - a.daysRemaining;
      } else if (sortBy === 'name') {
        return (a.clientName || '').localeCompare(b.clientName || '');
      } else if (sortBy === 'trainer') {
        return (a.trainerName || '').localeCompare(b.trainerName || '');
      }
      return 0;
    });

  // Estadísticas
  const stats = {
    totalClients: trainingServices.length,
    activeServices: trainingServices.filter(s => s.status === 'active').length,
    expiringServices: trainingServices.filter(s => s.daysRemaining > 0 && s.daysRemaining <= 7).length,
    expiredServices: trainingServices.filter(s => s.status === 'expired').length,
    totalTrainers: trainers.length,
    totalRevenue: trainers.reduce((sum, t) => sum + t.monthlyRevenue, 0)
  };

  const getStatusBadge = (service) => {
    const { status, daysRemaining, sessionsTotal, sessionsUsed } = service;
    const sessionsPending = sessionsTotal - sessionsUsed;
    
    if (status === 'active' && daysRemaining > 7) {
      return (
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1 px-3 py-1 bg-green-900/50 text-green-300 rounded-full text-xs font-semibold border border-green-600">
            <CheckCircle size={14} />
            {daysRemaining} días
          </span>
          <span className="text-xs text-gray-400">{sessionsPending} sesiones restantes</span>
        </div>
      );
    } else if (status === 'active' && daysRemaining <= 7 && daysRemaining > 0) {
      return (
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1 px-3 py-1 bg-yellow-900/50 text-yellow-300 rounded-full text-xs font-semibold border border-yellow-600">
            <Clock size={14} />
            {daysRemaining} días
          </span>
          <span className="text-xs text-gray-400">{sessionsPending} sesiones restantes</span>
        </div>
      );
    } else {
      return (
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1 px-3 py-1 bg-red-900/50 text-red-300 rounded-full text-xs font-semibold border border-red-600">
            <AlertCircle size={14} />
            Vencido
          </span>
          <span className="text-xs text-gray-400">{sessionsUsed}/{sessionsTotal} sesiones</span>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 p-8 flex items-center justify-center">
        <div className="text-white text-xl">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Dumbbell className="text-purple-400" />
              Gestión de Servicios de Entrenamiento
            </h1>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 p-6 rounded-xl border border-blue-700/50 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-300 text-sm font-medium mb-1">Clientes con Servicio</p>
                <p className="text-3xl font-bold text-white">{stats.totalClients}</p>
              </div>
              <Users className="text-blue-400" size={40} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 p-6 rounded-xl border border-green-700/50 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-300 text-sm font-medium mb-1">Servicios Activos</p>
                <p className="text-3xl font-bold text-white">{stats.activeServices}</p>
              </div>
              <CheckCircle className="text-green-400" size={40} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 p-6 rounded-xl border border-purple-700/50 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-300 text-sm font-medium mb-1">Total Entrenadores</p>
                <p className="text-3xl font-bold text-white">{stats.totalTrainers}</p>
              </div>
              <Dumbbell className="text-purple-400" size={40} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('clients')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'clients'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            👥 Clientes con Servicio
          </button>
          <button
            onClick={() => setActiveTab('trainers')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'trainers'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            💪 Entrenadores y Pagos
          </button>
        </div>

        {/* Vista de Clientes */}
        {activeTab === 'clients' && (
          <>
            {/* Filtros y Búsqueda */}
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 shadow-xl">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Buscar por cliente, entrenador o tipo de servicio..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-gray-900 border border-gray-600 text-white rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">✅ Activos</option>
                  <option value="expired">❌ Vencidos</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-gray-900 border border-gray-600 text-white rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="daysRemaining">Días restantes</option>
                  <option value="name">Nombre del cliente</option>
                  <option value="trainer">Entrenador</option>
                </select>
              </div>
            </div>

            {/* Tabla de Servicios */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Calendar size={24} className="text-blue-400" />
                  Servicios de Entrenamiento Contratados ({filteredServices.length})
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/80">
                    <tr>
                      <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Cliente</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Entrenador</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Tipo de Servicio</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Sesiones</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Vencimiento</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Estado</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredServices.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-12">
                          <div className="flex flex-col items-center gap-3 text-gray-400">
                            <AlertCircle size={48} />
                            <p className="text-lg font-semibold">No hay servicios de entrenamiento registrados</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredServices.map(service => (
                        <tr key={service.id} className="hover:bg-gray-700/30 transition-colors">
                          <td className="py-4 px-6">
                            <div>
                              <p className="text-white font-semibold">{service.clientName}</p>
                              <p className="text-gray-400 text-xs">{service.clientEmail}</p>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-purple-300 font-medium text-sm">
                              {service.trainerName}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-blue-300 font-medium text-sm">
                              {service.serviceType}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-gray-300 text-sm">
                            <div className="flex flex-col">
                              <span className="font-semibold">{service.sessionsUsed} / {service.sessionsTotal}</span>
                              <span className="text-xs text-gray-500">sesiones</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-gray-300 text-sm font-mono">
                            {new Date(service.endDate).toLocaleDateString('es-MX')}
                          </td>
                          <td className="py-4 px-6">
                            {getStatusBadge(service)}
                          </td>
                          <td className="py-4 px-6 text-green-400 font-bold">
                            ${service.price.toLocaleString()} MXN
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Vista de Entrenadores */}
        {activeTab === 'trainers' && (
          <>
            {/* Lista de Entrenadores */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users size={24} className="text-purple-400" />
                  Entrenadores Contratados ({trainers.length})
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/80">
                    <tr>
                      <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Entrenador</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Especialidad</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Clientes Asignados</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Contratos Activos</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Tipo de Contrato</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Ingresos Mensuales</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {trainers.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-12">
                          <div className="flex flex-col items-center gap-3 text-gray-400">
                            <Users size={48} />
                            <p className="text-lg font-semibold">No hay entrenadores registrados</p>
                            <p className="text-sm text-gray-500">El registro de entrenadores se realizará en una sección separada</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      trainers.map(trainer => (
                        <tr key={trainer.id} className="hover:bg-gray-700/30 transition-colors">
                          <td className="py-4 px-6">
                            <div>
                              <p className="text-white font-semibold">{trainer.name}</p>
                              <p className="text-gray-400 text-xs">{trainer.email}</p>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-purple-300 text-sm">{trainer.specialty}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-2xl font-bold text-blue-400">{trainer.clientsCount}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              trainer.activeContracts > 0
                                ? 'bg-green-900/50 text-green-300 border border-green-600'
                                : 'bg-gray-700 text-gray-400'
                            }`}>
                              {trainer.activeContracts} activos
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-yellow-300 text-sm font-medium">{trainer.contractType}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-green-400 font-bold text-lg">
                              ${trainer.monthlyRevenue.toLocaleString()} MXN
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <button
                              onClick={() => alert(`Pago a ${trainer.name} - Función en desarrollo`)}
                              disabled={trainer.activeContracts === 0}
                              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                                trainer.activeContracts > 0
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              💵 Pagar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default GestionEntrenadores;
