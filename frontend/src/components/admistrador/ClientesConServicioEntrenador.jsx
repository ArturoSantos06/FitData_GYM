import React from 'react';
import { Calendar, Search, AlertCircle, Unlink, ReceiptText } from 'lucide-react';

function ClientesConServicioEntrenador({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  sortBy,
  setSortBy,
  filteredServices,
  trainerServiceSales,
  getStatusBadge,
  onUnlinkClient,
  unlinkingClientId,
  onCompleteServiceSale,
  completingServiceSaleId,
}) {
  const normalizeLookupKey = (value) => String(value || '').trim().toLowerCase();

  const formatServiceType = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('grupal') || normalized.includes('group') || normalized === 'grupal') return 'Grupal';
    if (normalized.includes('personal') || normalized.includes('individual') || normalized === 'personal') return 'Personal';
    return value || 'N/D';
  };

  const formatSaleStatus = (status) => {
    const normalized = String(status || '').trim().toLowerCase();
    return normalized === 'completed' ? 'Completado' : 'Pendiente';
  };

  const isPendingSale = (status) => String(status || '').trim().toLowerCase() === 'pending';

  const resolveSaleClientInfo = (sale) => {
    const saleClientId = normalizeLookupKey(sale?.cliente_id || sale?.cliente || sale?.cliente_auth_uid);
    const saleClientEmail = normalizeLookupKey(sale?.cliente_email || sale?.clienteEmail || sale?.cliente_email_override);

    const matchedService = (filteredServices || []).find((service) => {
      const serviceClientId = normalizeLookupKey(service?.clientId);
      const serviceClientEmail = normalizeLookupKey(service?.clientEmail);

      if (saleClientId && serviceClientId && saleClientId === serviceClientId) {
        return true;
      }

      if (saleClientEmail && serviceClientEmail && saleClientEmail === serviceClientEmail) {
        return true;
      }

      return false;
    });

    const fallbackNameFromEmail = String(sale?.cliente_email || sale?.clienteEmail || '').split('@')[0] || 'Cliente';

    return {
      name:
        sale?.clienteNombre ||
        sale?.cliente_nombre_override ||
        sale?.cliente_username ||
        matchedService?.clientName ||
        fallbackNameFromEmail ||
        'Cliente',
      email:
        sale?.cliente_email ||
        sale?.clienteEmail ||
        sale?.cliente_email_override ||
        matchedService?.clientEmail ||
        '',
    };
  };

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
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12">
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
                      <span className="text-blue-300 font-medium text-sm">{formatServiceType(service.serviceType)}</span>
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
                    <td className="py-4 px-6">
                      <button
                        onClick={() => onUnlinkClient?.(service)}
                        disabled={!service.clientId || unlinkingClientId === service.clientId}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Unlink size={16} />
                        {unlinkingClientId === service.clientId ? 'Desvinculando...' : 'Desvincular'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl border border-gray-700 shadow-xl overflow-hidden mt-6">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ReceiptText size={22} className="text-cyan-300" />
            Historial de Pagos de Clientes ({trainerServiceSales?.length || 0})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/80">
              <tr>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Fecha</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Cliente</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Entrenador</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Método</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Monto</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Estado</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {(trainerServiceSales || []).length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-400">No hay pagos de servicios de entrenamiento registrados.</td>
                </tr>
              ) : (
                (trainerServiceSales || []).map((sale) => {
                  const status = String(sale.payment_status || '').trim().toLowerCase();
                  const saleDate = sale.createdAt?.toDate?.() || new Date(sale.fecha || 0);
                  const saleClientInfo = resolveSaleClientInfo(sale);
                  return (
                    <tr key={sale.id} className="hover:bg-gray-700/20 transition-colors">
                      <td className="py-4 px-6 text-gray-300 text-sm">
                        {Number.isNaN(saleDate.getTime()) ? 'Sin fecha' : saleDate.toLocaleDateString('es-MX')}
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-white font-semibold">{saleClientInfo.name}</p>
                        <p className="text-gray-400 text-xs">{saleClientInfo.email}</p>
                      </td>
                      <td className="py-4 px-6 text-purple-300 text-sm font-medium">{sale.trainer_name || sale.trainerName || 'Entrenador'}</td>
                      <td className="py-4 px-6 text-gray-300 text-sm">{sale.metodo_pago || 'N/D'}</td>
                      <td className="py-4 px-6 text-emerald-400 font-bold">${Number(sale.total || 0).toLocaleString()} MXN</td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          status === 'completed'
                            ? 'bg-green-900/50 text-green-300 border border-green-600'
                            : 'bg-yellow-900/50 text-yellow-300 border border-yellow-600'
                        }`}>
                          {formatSaleStatus(status)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {isPendingSale(status) ? (
                          <button
                            onClick={() => onCompleteServiceSale?.(sale)}
                            disabled={completingServiceSaleId === sale.id}
                            className="px-4 py-2 rounded-lg font-semibold text-sm transition-all bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {completingServiceSaleId === sale.id ? 'Completando...' : 'Marcar completado'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">Sin acción</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default ClientesConServicioEntrenador;
