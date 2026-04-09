import React from 'react';
import { Calendar, Search, AlertCircle } from 'lucide-react';

function ClientesConServicioEntrenador({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  sortBy,
  setSortBy,
  filteredServices,
  getStatusBadge,
}) {
  return (
    <>
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
                filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <p className="text-white font-semibold">{service.clientName}</p>
                        <p className="text-gray-400 text-xs">{service.clientEmail}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-purple-300 font-medium text-sm">{service.trainerName}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-blue-300 font-medium text-sm">{service.serviceType}</span>
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
                    <td className="py-4 px-6">{getStatusBadge(service)}</td>
                    <td className="py-4 px-6 text-green-400 font-bold">${service.price.toLocaleString()} MXN</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default ClientesConServicioEntrenador;
