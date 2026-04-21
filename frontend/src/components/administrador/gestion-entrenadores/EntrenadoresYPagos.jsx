import React from 'react';
import { Users, DollarSign, AlertCircle } from 'lucide-react';

function EntrenadoresYPagos({
  entrenadores,
  entrenadoresInactivos,
  pagosEntrenadores,
  filtroMesEntrenadores,
  setFiltroMesEntrenadores,
  filtroAnioEntrenadores,
  setFiltroAnioEntrenadores,
  filtroMesPagos,
  setFiltroMesPagos,
  filtroAnioPagos,
  setFiltroAnioPagos,
  obtenerIngresoMensualFiltrado,
  onPagarEntrenador,
  onDesactivarEntrenador,
  onReactivarEntrenador,
  idEntrenadorDesactivando,
  idEntrenadorReactivando,
}) {
  const toJsDate = (value) => {
    if (!value) return null;
    if (typeof value?.toDate === 'function') return value.toDate();
    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const pagosFiltrados = pagosEntrenadores.filter((p) => {
    const dateValue = toJsDate(p.createdAt || p.fecha);
    if (!dateValue) return false;
    return dateValue.getFullYear() === Number(filtroAnioPagos) && dateValue.getMonth() + 1 === Number(filtroMesPagos);
  });

  return (
    <>
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users size={24} className="text-purple-400" />
            Entrenadores Contratados ({entrenadores.length})
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
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">
                  <div className="flex flex-col gap-2">
                    <span>Ingresos Mensuales</span>
                    <div className="flex gap-2">
                      <select
                        value={filtroMesEntrenadores}
                        onChange={(e) => setFiltroMesEntrenadores(Number(e.target.value))}
                        className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:ring-2 focus:ring-purple-400 outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                          <option key={m} value={m}>
                            {new Date(2000, m - 1).toLocaleDateString('es-MX', { month: 'short' })}
                          </option>
                        ))}
                      </select>
                      <select
                        value={filtroAnioEntrenadores}
                        onChange={(e) => setFiltroAnioEntrenadores(Number(e.target.value))}
                        className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:ring-2 focus:ring-purple-400 outline-none"
                      >
                        {[2024, 2025, 2026, 2027].map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {entrenadores.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-gray-400">No hay entrenadores registrados</td>
                </tr>
              ) : (
                entrenadores.map((trainer) => (
                  <tr key={trainer.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="py-4 px-6">
                        <p className="text-white font-semibold">{trainer.name || 'Entrenador'}</p>
                        {trainer.email ? <p className="text-gray-400 text-xs">{trainer.email}</p> : null}
                    </td>
                      <td className="py-4 px-6 text-purple-300 text-sm">{trainer.specialty || 'N/D'}</td>
                      <td className="py-4 px-6"><span className="text-2xl font-bold text-blue-400">{Number(trainer.clientsCount || 0)}</span></td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          Number(trainer.activeContracts || 0) > 0
                          ? 'bg-green-900/50 text-green-300 border border-green-600'
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                          {Number(trainer.activeContracts || 0)} activos
                      </span>
                    </td>
                      <td className="py-4 px-6 text-yellow-300 text-sm font-medium">{trainer.contractType || 'N/D'}</td>
                    <td className="py-4 px-6 text-green-400 font-bold text-lg">
                      ${obtenerIngresoMensualFiltrado(trainer, filtroMesEntrenadores, filtroAnioEntrenadores).toLocaleString()} MXN
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onPagarEntrenador(trainer)}
                          className="px-4 py-2 rounded-lg font-semibold text-sm transition-all bg-green-600 hover:bg-green-700 text-white"
                        >
                          💵 Pagar
                        </button>
                        <button
                          onClick={() => onDesactivarEntrenador(trainer)}
                          disabled={idEntrenadorDesactivando === trainer.id}
                          className="px-4 py-2 rounded-lg font-semibold text-sm transition-all bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {idEntrenadorDesactivando === trainer.id ? '⏳' : '⛔ Desvincular'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gray-800/40 rounded-xl border border-gray-700 shadow-xl overflow-hidden mt-6">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign size={22} className="text-emerald-400" />
            Historial de Pagos a Entrenadores ({pagosFiltrados.length})
          </h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Mes</label>
              <select
                value={filtroMesPagos}
                onChange={(e) => setFiltroMesPagos(Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1).toLocaleDateString('es-MX', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Año</label>
              <select
                value={filtroAnioPagos}
                onChange={(e) => setFiltroAnioPagos(Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/80">
              <tr>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Fecha</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Folio</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Entrenador</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Contrato</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Método</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {pagosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-400">Aún no hay pagos registrados para el período seleccionado.</td>
                </tr>
              ) : (
                pagosFiltrados.map((payment) => {
                  const dateValue = toJsDate(payment.createdAt || payment.fecha);
                  const displayDate = dateValue ? dateValue.toLocaleDateString('es-MX') : 'Sin fecha';
                  return (
                    <tr key={`trainer_payment_${payment.id}`} className="hover:bg-gray-700/20 transition-colors">
                      <td className="py-4 px-6 text-gray-300 text-sm">{displayDate}</td>
                      <td className="py-4 px-6 text-cyan-300 font-mono text-sm">{payment.folio || 'N/D'}</td>
                      <td className="py-4 px-6">
                        <p className="text-white font-semibold">{payment.trainerName || payment.trainer_nombre || payment.trainer_name || 'Entrenador'}</p>
                        <p className="text-gray-400 text-xs">{payment.trainerEmail || payment.trainer_email || ''}</p>
                      </td>
                      <td className="py-4 px-6 text-yellow-300 text-sm">{payment.contractType || payment.contract_type || payment.tipoContrato || 'N/D'}</td>
                      <td className="py-4 px-6 text-gray-300 text-sm">{payment.metodo_pago || payment.paymentMethod || payment.payment_method || 'N/D'}</td>
                      <td className="py-4 px-6 text-emerald-400 font-bold">${Number(payment.total || payment.amount || payment.monto || payment.monto_recibido || 0).toLocaleString()} MXN</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gray-800/40 rounded-xl border border-gray-700 shadow-xl overflow-hidden mt-6">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertCircle size={22} className="text-yellow-400" />
            Entrenadores Inactivos ({entrenadoresInactivos.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/80">
              <tr>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Entrenador</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Especialidad</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Tipo de Contrato</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {entrenadoresInactivos.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-gray-400">No hay entrenadores inactivos.</td>
                </tr>
              ) : (
                entrenadoresInactivos.map((trainer) => (
                  <tr key={`inactive_${trainer.id}`} className="hover:bg-gray-700/20 transition-colors">
                    <td className="py-4 px-6">
                      <p className="text-white font-semibold">{trainer.name || 'Entrenador'}</p>
                      {trainer.email ? <p className="text-gray-400 text-xs">{trainer.email}</p> : null}
                    </td>
                    <td className="py-4 px-6 text-purple-300 text-sm">{trainer.specialty}</td>
                    <td className="py-4 px-6 text-yellow-300 text-sm font-medium">{trainer.contractType}</td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => onReactivarEntrenador(trainer)}
                        disabled={idEntrenadorReactivando === trainer.id}
                        className="px-4 py-2 rounded-lg font-semibold text-sm transition-all bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {idEntrenadorReactivando === trainer.id ? '⏳' : '✅ Recontratar'}
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
  );
}

export default EntrenadoresYPagos;
