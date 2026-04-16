import React from 'react';
import { Clock, AlertCircle, CheckCircle, Dumbbell } from 'lucide-react';
import { useGestionEntrenadores } from './useGestionEntrenadores';
import ModalConfirmacion from '../../modales/ModalConfirmacion';
import ErrorModal from '../../modales/ErrorModal';
import ModalExito from '../../modales/ModalExito';
import ClientesConServicioEntrenador from './ClientesConServicioEntrenador';
import EntrenadoresYPagos from './EntrenadoresYPagos';
import ModalEntradaPago from './ModalEntradaPago';

function GestionEntrenadores() {
  const gestion = useGestionEntrenadores();
    const toJsDate = (value) => {
      if (!value) return null;
      if (typeof value?.toDate === 'function') return value.toDate();
      const parsed = value instanceof Date ? value : new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

  const obtenerEtiquetaEstado = (servicio) => {
      const status = String(servicio?.status || servicio?.estado || '').trim().toLowerCase();
    const label =
      status === 'active' || status === 'activo' ? 'Activo' :
      status === 'pending' || status === 'pendiente' ? 'Pendiente' :
      status === 'completed' || status === 'completado' || status === 'pagado' ? 'Completado' :
      status === 'inactive' || status === 'inactivo' || status === 'expired' || status === 'vencido' ? 'Vencido' :
      'Activo';

    const classes =
      label === 'Activo' ? 'bg-green-900/50 text-green-300 border border-green-600' :
      label === 'Pendiente' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-600' :
      label === 'Completado' ? 'bg-blue-900/50 text-blue-300 border border-blue-600' :
      'bg-red-900/50 text-red-300 border border-red-600';

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${classes}`}>
        <AlertCircle size={14} />
        {label}
      </span>
    );
  };

  if (gestion.cargando) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-gray-900 to-slate-900 p-8 flex items-center justify-center">
        <div className="text-white text-xl">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-gray-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Dumbbell className="text-purple-400" />
            Gestión de Servicios de Entrenamiento
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-linear-to-br from-blue-900/50 to-blue-800/30 p-6 rounded-xl border border-blue-700/50 shadow-xl">
            <p className="text-blue-300 text-sm font-medium mb-1">Clientes con Servicio</p>
            <p className="text-3xl font-bold text-white">{gestion.estadisticas.totalClients}</p>
          </div>
          <div className="bg-linear-to-br from-green-900/50 to-green-800/30 p-6 rounded-xl border border-green-700/50 shadow-xl">
            <p className="text-green-300 text-sm font-medium mb-1">Servicios Activos</p>
            <p className="text-3xl font-bold text-white">{gestion.estadisticas.activeServices}</p>
          </div>
          <div className="bg-linear-to-br from-purple-900/50 to-purple-800/30 p-6 rounded-xl border border-purple-700/50 shadow-xl">
            <p className="text-purple-300 text-sm font-medium mb-1">Total Entrenadores</p>
            <p className="text-3xl font-bold text-white">{gestion.estadisticas.totalTrainers}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-700">
          <button
            onClick={() => gestion.setPestanaActiva('clientes')}
            className={`px-6 py-3 font-semibold transition-all ${
              gestion.pestanaActiva === 'clientes'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            👥 Clientes con Servicio
          </button>
          <button
            onClick={() => gestion.setPestanaActiva('entrenadores')}
            className={`px-6 py-3 font-semibold transition-all ${
              gestion.pestanaActiva === 'entrenadores'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            💪 Entrenadores y Pagos
          </button>
        </div>

        {/* Tab Content: Clientes */}
        {gestion.pestanaActiva === 'clientes' && (
          <ClientesConServicioEntrenador
            terminoBusqueda={gestion.terminoBusqueda}
            setTerminoBusqueda={gestion.setTerminoBusqueda}
            filtroEstado={gestion.filtroEstado}
            setFiltroEstado={gestion.setFiltroEstado}
            ordenarPor={gestion.ordenarPor}
            setOrdenarPor={gestion.setOrdenarPor}
            serviciosFiltrados={gestion.serviciosFiltrados}
            ventasServiciosEntrenador={gestion.ventasServiciosEntrenador}
            obtenerEtiquetaEstado={obtenerEtiquetaEstado}
            onDesvincularCliente={gestion.manejarDesvincularCliente}
            idClienteDesvinculando={gestion.idClienteDesvinculando}
            onCompletarVentaServicio={gestion.manejarCompletarVentaServicio}
            idVentaServicioCompletando={gestion.idVentaServicioCompletando}
          />
        )}

        {/* Tab Content: Entrenadores */}
        {gestion.pestanaActiva === 'entrenadores' && (
          <EntrenadoresYPagos
            entrenadores={gestion.entrenadores}
            entrenadoresInactivos={gestion.entrenadoresInactivos}
            pagosEntrenadores={gestion.pagosEntrenadores}
            filtroMesEntrenadores={gestion.filtroMesEntrenadores}
            setFiltroMesEntrenadores={gestion.setFiltroMesEntrenadores}
            filtroAnioEntrenadores={gestion.filtroAnioEntrenadores}
            setFiltroAnioEntrenadores={gestion.setFiltroAnioEntrenadores}
            filtroMesPagos={gestion.filtroMesPagos}
            setFiltroMesPagos={gestion.setFiltroMesPagos}
            filtroAnioPagos={gestion.filtroAnioPagos}
            setFiltroAnioPagos={gestion.setFiltroAnioPagos}
            obtenerIngresoMensualFiltrado={gestion.obtenerIngresoMensualFiltrado}
            onPagarEntrenador={gestion.manejarPagoEntrenador}
            onDesactivarEntrenador={gestion.manejarDesactivarEntrenador}
            onReactivarEntrenador={gestion.manejarReactivarEntrenador}
            idEntrenadorDesactivando={gestion.idEntrenadorDesactivando}
            idEntrenadorReactivando={gestion.idEntrenadorReactivando}
          />
        )}
      </div>

      {/* Modales */}
      <ModalConfirmacion
        isOpen={Boolean(gestion.accionPendiente)}
        onClose={() => {
          if (!gestion.idEntrenadorDesactivando && !gestion.idEntrenadorReactivando) {
            gestion.setAccionPendiente(null);
          }
        }}
        onConfirm={gestion.manejarConfirmarAccionPendiente}
        title={gestion.accionPendiente?.type === 'deactivate' ? 'Confirmar descontratación' : 'Confirmar recontratación'}
        message={gestion.accionPendiente?.trainer
          ? `${gestion.accionPendiente.type === 'deactivate' ? 'Se desactivará' : 'Se reactivará'} a ${gestion.accionPendiente.trainer.name}.`
          : ''}
        confirmLabel={gestion.accionPendiente?.type === 'deactivate' ? 'Sí, Descontratar' : 'Sí, Recontratar'}
      />

      <ModalConfirmacion
        isOpen={Boolean(gestion.servicioPendienteDesvincular)}
        onClose={() => {
          if (!gestion.idClienteDesvinculando) {
            gestion.setServicioPendienteDesvincular(null);
          }
        }}
        onConfirm={() => gestion.ejecutarDesvincularCliente(gestion.servicioPendienteDesvincular)}
        title="Confirmar desvinculación"
        message={gestion.servicioPendienteDesvincular
          ? `Se desvinculará a ${gestion.servicioPendienteDesvincular.clientName || 'este cliente'} de ${gestion.servicioPendienteDesvincular.trainerName || 'su entrenador'}.`
          : ''}
        confirmLabel={gestion.idClienteDesvinculando ? 'Desvinculando...' : 'Sí, Desvincular'}
      />

      <ErrorModal
        isOpen={gestion.modalError.isOpen}
        onClose={() => gestion.setModalError({ isOpen: false, title: '', message: '' })}
        title={gestion.modalError.title}
        message={gestion.modalError.message}
      />

      <ModalExito
        isOpen={gestion.modalExito.isOpen}
        onClose={() => gestion.setModalExito({ isOpen: false, title: '', message: '', subMessage: '' })}
        title={gestion.modalExito.title}
        message={gestion.modalExito.message}
        subMessage={gestion.modalExito.subMessage}
      />

      <ModalEntradaPago
        isOpen={gestion.modalPago.isOpen}
        title="Registrar pago a entrenador"
        subtitle={`${gestion.modalPago.trainerName || 'Entrenador'} (${gestion.modalPago.mes ? new Date(2000, gestion.modalPago.mes - 1).toLocaleDateString('es-MX', { month: 'long' }) : ''} ${gestion.modalPago.anio || ''})`}
        value={gestion.modalPago.amount}
        onChange={(value) => gestion.setModalPago((prev) => ({ ...prev, amount: value }))}
        onClose={() => gestion.setModalPago({
          isOpen: false,
          trainerId: '',
          trainerName: '',
          trainerEmail: '',
          contractType: '',
          paymentMethod: 'DEPOSITO A CUENTA',
          amount: '',
          mes: 0,
          anio: 0,
        })}
        onConfirm={gestion.manejarConfirmarPagoModal}
        confirmLabel="Registrar pago"
      />
    </div>
  );
}

export default GestionEntrenadores;
