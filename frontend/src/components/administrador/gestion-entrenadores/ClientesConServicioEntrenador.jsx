import React from 'react';
import { Calendar, Search, AlertCircle, Unlink, ReceiptText } from 'lucide-react';

function ClientesConServicioEntrenador({
  terminoBusqueda,
  setTerminoBusqueda,
  filtroEstado,
  setFiltroEstado,
  serviciosFiltrados,
  ventasServiciosEntrenador,
  obtenerEtiquetaEstado,
  onDesvincularCliente,
  idClienteDesvinculando,
  onCompletarVentaServicio,
  idVentaServicioCompletando,
}) {
  const [terminoBusquedaPagos, setTerminoBusquedaPagos] = React.useState('');

  const normalizarClaveBusqueda = (value) => String(value || '').trim().toLowerCase();

  const toJsDate = (value) => {
    if (!value) return null;
    if (typeof value?.toDate === 'function') return value.toDate();
    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const parsearDetalleProductos = (rawDetail) => {
    if (!rawDetail) return [];
    if (Array.isArray(rawDetail)) return rawDetail;
    if (typeof rawDetail !== 'string') return [];

    try {
      const parsed = JSON.parse(rawDetail);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      try {
        const parsed = JSON.parse(String(rawDetail).replace(/'/g, '"'));
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
  };

  const formatearTipoServicio = (value) => {
    const normalizado = String(value || '').trim().toLowerCase();
    if (normalizado.includes('grupal') || normalizado.includes('group') || normalizado === 'grupal') return 'Grupal';
    if (normalizado.includes('personal') || normalizado.includes('individual') || normalizado === 'personal') return 'Personal';
    return value || 'N/D';
  };

  const formatearEstadoVenta = (status) => {
    const normalizado = String(status || '').trim().toLowerCase();
    return normalizado === 'completed' ? 'Completado' : 'Pendiente';
  };

  const esVentaPendiente = (status) => {
    const normalizado = String(status || '').trim().toLowerCase();
    return normalizado === 'pending' || normalizado === 'pendiente';
  };

  const obtenerEstadoVenta = (sale = {}) => String(
    sale.payment_status ||
    sale.paymentStatus ||
    sale.estado ||
    sale.status ||
    sale.estado_pago ||
    'pending'
  ).trim().toLowerCase();

  const obtenerMetodoPagoVenta = (sale = {}) => String(
    sale.metodo_pago ||
    sale.metodoPago ||
    sale.paymentMethod ||
    sale.payment_method ||
    sale.forma_pago ||
    sale.paymentType ||
    sale.metodo ||
    ''
  ).trim().toUpperCase() || 'N/D';

  const obtenerMontoVenta = (sale = {}) => {
    const totalDirecto = Number(
      sale.total ||
      sale.amount ||
      sale.monto ||
      sale.monto_recibido ||
      sale.montoTotal ||
      sale.monto_total ||
      sale.trainerServicePrice ||
      sale.trainer_service_price ||
      0
    );

    if (Number.isFinite(totalDirecto) && totalDirecto > 0) return totalDirecto;

    const productos = parsearDetalleProductos(sale.detalle_productos || sale.detalleProductos || sale.detalle_producto || sale.productos || sale.items);
    if (productos.length === 0) return 0;

    return productos.reduce((sum, item) => {
      const cantidad = Number(item?.cantidad || item?.qty || 1) || 1;
      const precio = Number(item?.precio || item?.price || item?.monto || 0) || 0;
      return sum + (cantidad * precio);
    }, 0);
  };

  const resolverInfoClienteVenta = (sale) => {
    const idClienteVenta = normalizarClaveBusqueda(sale?.clientId || sale?.cliente_id || sale?.cliente || sale?.cliente_auth_uid);
    const correoClienteVenta = normalizarClaveBusqueda(sale?.clientEmail || sale?.cliente_email || sale?.clienteEmail || sale?.cliente_email_override);

    const servicioCoincidente = (serviciosFiltrados || []).find((service) => {
      const idClienteServicio = normalizarClaveBusqueda(service?.clientId);
      const correoClienteServicio = normalizarClaveBusqueda(service?.clientEmail);

      if (idClienteVenta && idClienteServicio && idClienteVenta === idClienteServicio) {
        return true;
      }

      if (correoClienteVenta && correoClienteServicio && correoClienteVenta === correoClienteServicio) {
        return true;
      }

      return false;
    });

    const nombreDesdeCorreo = String(sale?.cliente_email || sale?.clienteEmail || '').split('@')[0] || 'Cliente';

    return {
      name:
        sale?.clientName ||
        sale?.clienteNombre ||
        sale?.cliente_nombre_override ||
        sale?.cliente_username ||
        servicioCoincidente?.clientName ||
        nombreDesdeCorreo ||
        'Cliente',
      email:
        sale?.clientEmail ||
        sale?.cliente_email ||
        sale?.clienteEmail ||
        sale?.cliente_email_override ||
        servicioCoincidente?.clientEmail ||
        '',
    };
  };

  const ventasServiciosFiltradas = (ventasServiciosEntrenador || []).filter((sale) => {
    const busqueda = normalizarClaveBusqueda(terminoBusquedaPagos);
    if (!busqueda) return true;

    const metodoPago = obtenerMetodoPagoVenta(sale);
    const textoBusqueda = [
      sale?.clientName,
      sale?.clienteNombre,
      sale?.cliente_username,
      sale?.clientEmail,
      sale?.clienteEmail,
      sale?.cliente_email,
      sale?.trainerName,
      sale?.trainer_name,
      sale?.trainer_nombre,
      sale?.trainerEmail,
      sale?.trainer_email,
      metodoPago,
    ]
      .map(normalizarClaveBusqueda)
      .filter(Boolean)
      .join(' ');

    return textoBusqueda.includes(busqueda);
  });

  return (
    <>
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar size={24} className="text-blue-400" />
            Servicios de Entrenamiento Contratados ({serviciosFiltrados.length})
          </h2>

          <div className="mt-4 flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por cliente, entrenador o tipo de servicio..."
                  value={terminoBusqueda}
                  onChange={(e) => setTerminoBusqueda(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="bg-gray-900 border border-gray-600 text-white rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos los estados</option>
              <option value="activo">✅ Activos</option>
              <option value="vencido">❌ Vencidos</option>
            </select>

          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/80">
              <tr>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Cliente</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Entrenador</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Tipo de Servicio</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Asignado</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Estado</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Monto</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {serviciosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <AlertCircle size={48} />
                      <p className="text-lg font-semibold">No hay servicios de entrenamiento registrados</p>
                    </div>
                  </td>
                </tr>
              ) : (
                serviciosFiltrados.map((service) => (
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
                      <span className="text-blue-300 font-medium text-sm">{formatearTipoServicio(service.serviceType)}</span>
                    </td>
                    <td className="py-4 px-6 text-gray-300 text-sm font-mono">
                      {(() => {
                        const assignedDate = toJsDate(service.assignedAt || service.createdAt || service.updatedAt);
                        return assignedDate ? assignedDate.toLocaleDateString('es-MX') : 'N/A';
                      })()}
                    </td>
                    <td className="py-4 px-6">{obtenerEtiquetaEstado(service)}</td>
                    <td className="py-4 px-6 text-green-400 font-bold">${Number(service.price || service.monto || service.amount || 0).toLocaleString()} MXN</td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => onDesvincularCliente?.(service)}
                        disabled={!service.clientId || idClienteDesvinculando === service.clientId}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Unlink size={16} />
                        {idClienteDesvinculando === service.clientId ? 'Desvinculando...' : 'Desvincular'}
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
            Historial de Pagos de Clientes ({ventasServiciosFiltradas.length})
          </h2>

          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar pago por cliente, entrenador o método..."
                value={terminoBusquedaPagos}
                onChange={(e) => setTerminoBusquedaPagos(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
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
              {ventasServiciosFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-400">
                    {terminoBusquedaPagos
                      ? 'No se encontraron pagos con esos criterios.'
                      : 'No hay pagos de servicios de entrenamiento registrados.'}
                  </td>
                </tr>
              ) : (
                ventasServiciosFiltradas.map((sale) => {
                  const status = obtenerEstadoVenta(sale);
                  const saleDate = toJsDate(sale.createdAt || sale.fecha || sale.assignedAt);
                  const saleClientInfo = resolverInfoClienteVenta(sale);
                  return (
                    <tr key={sale.id} className="hover:bg-gray-700/20 transition-colors">
                      <td className="py-4 px-6 text-gray-300 text-sm">
                        {saleDate ? saleDate.toLocaleDateString('es-MX') : 'Sin fecha'}
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-white font-semibold">{saleClientInfo.name}</p>
                        <p className="text-gray-400 text-xs">{saleClientInfo.email}</p>
                      </td>
                      <td className="py-4 px-6 text-purple-300 text-sm font-medium">{sale.trainer_name || sale.trainerName || 'Entrenador'}</td>
                      <td className="py-4 px-6 text-gray-300 text-sm">{obtenerMetodoPagoVenta(sale)}</td>
                      <td className="py-4 px-6 text-emerald-400 font-bold">${Number(obtenerMontoVenta(sale)).toLocaleString()} MXN</td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          status === 'completed'
                            ? 'bg-green-900/50 text-green-300 border border-green-600'
                            : 'bg-yellow-900/50 text-yellow-300 border border-yellow-600'
                        }`}>
                          {formatearEstadoVenta(status)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {esVentaPendiente(status) ? (
                          <button
                            onClick={() => onCompletarVentaServicio?.(sale)}
                            disabled={idVentaServicioCompletando === sale.id}
                            className="px-4 py-2 rounded-lg font-semibold text-sm transition-all bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {idVentaServicioCompletando === sale.id ? 'Completando...' : 'Marcar completado'}
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
