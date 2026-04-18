import React from 'react';
import { Users, Unlink } from 'lucide-react';

function ClientesConServicioNutricionista({
  serviciosNutricion,
  idClienteDesvinculando,
  onDesvincularCliente,
}) {
  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Users size={22} className="text-cyan-300" />
          Clientes con Servicio de Nutriólogo ({serviciosNutricion.length})
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900/80">
            <tr>
              <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Cliente</th>
              <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Nutriólogo</th>
              <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Estado</th>
              <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Fecha de asignación</th>
              <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {serviciosNutricion.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-8 text-gray-400">No hay clientes con servicio de nutriólogo.</td>
              </tr>
            ) : (
              serviciosNutricion.map((service) => {
                const assignedDate = service.assignedAt?.toDate?.() || new Date(service.assignedAt || 0);
                const status = String(service.status || '').toLowerCase();
                return (
                  <tr key={service.id} className="hover:bg-gray-700/20 transition-colors">
                    <td className="py-4 px-6">
                      <p className="text-white font-semibold">{service.clientName}</p>
                      <p className="text-gray-400 text-xs">{service.clientEmail}</p>
                    </td>
                    <td className="py-4 px-6 text-cyan-300 font-medium text-sm">{service.nutritionistName}</td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        status === 'active'
                          ? 'bg-green-900/50 text-green-300 border border-green-600'
                          : 'bg-gray-700 text-gray-300 border border-gray-600'
                      }`}>
                        {status === 'active' ? 'Activo' : (service.status || 'N/D')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-300 text-sm">
                      {Number.isNaN(assignedDate.getTime()) ? 'Sin fecha' : assignedDate.toLocaleDateString('es-MX')}
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => onDesvincularCliente(service)}
                        disabled={!service.clientId || idClienteDesvinculando === service.clientId}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Unlink size={16} />
                        {idClienteDesvinculando === service.clientId ? 'Desvinculando...' : 'Desvincular'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ClientesConServicioNutricionista;
