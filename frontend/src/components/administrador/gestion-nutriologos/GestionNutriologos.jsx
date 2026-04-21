import React, { useState } from 'react';
import { Salad } from 'lucide-react';
import ModalConfirmacion from '../../modales/ModalConfirmacion';
import ErrorModal from '../../modales/ErrorModal';
import ModalExito from '../../modales/ModalExito';
import ClientesConServicioNutricionista from './ClientesConServicioNutricionista';
import NutricionistasGestion from './NutricionistasGestion';
import { useGestionNutriologos } from './useGestionNutriologos';

function GestionNutriologos() {
  const [pestanaActiva, setPestanaActiva] = useState('clientes');
  const {
    cargando,
    serviciosNutricion,
    nutriologos,
    nutriologosInactivos,
    idClienteDesvinculando,
    idNutriologoDesactivando,
    idNutriologoReactivando,
    desvinculacionPendiente,
    accionPendiente,
    modalError,
    modalExito,
    estadisticas,
    setModalError,
    setModalExito,
    manejarDesvincularCliente,
    ejecutarDesvincularCliente,
    manejarDesactivarNutriologodescrip,
    manejarReactivarNutriologodescrip,
    manejarConfirmarAccionPendiente,
    setAccionPendiente,
    setDesvinculacionPendiente,
  } = useGestionNutriologos();

  if (cargando) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-gray-900 to-slate-900 p-8 flex items-center justify-center">
        <div className="text-white text-xl">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-gray-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Salad className="text-cyan-400" />
            Gestión de Servicios de Nutriólogo
          </h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-linear-to-br from-cyan-900/50 to-cyan-800/30 p-6 rounded-xl border border-cyan-700/50 shadow-xl">
            <p className="text-cyan-300 text-sm font-medium mb-1">Clientes con Servicio</p>
            <p className="text-3xl font-bold text-white">{estadisticas.totalClients}</p>
          </div>
          <div className="bg-linear-to-br from-emerald-900/50 to-emerald-800/30 p-6 rounded-xl border border-emerald-700/50 shadow-xl">
            <p className="text-emerald-300 text-sm font-medium mb-1">Servicios Activos</p>
            <p className="text-3xl font-bold text-white">{estadisticas.activeServices}</p>
          </div>
          <div className="bg-linear-to-br from-blue-900/50 to-blue-800/30 p-6 rounded-xl border border-blue-700/50 shadow-xl">
            <p className="text-blue-300 text-sm font-medium mb-1">Nutriólogos Contratados</p>
            <p className="text-3xl font-bold text-white">{estadisticas.totalNutritionists}</p>
          </div>
        </div>

        <div className="flex gap-2 border-b border-gray-700">
          <button
            onClick={() => setPestanaActiva('clientes')}
            className={`px-6 py-3 font-semibold transition-all ${
              pestanaActiva === 'clientes'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            👥 Clientes con Servicio
          </button>
          <button
            onClick={() => setPestanaActiva('nutriologos')}
            className={`px-6 py-3 font-semibold transition-all ${
              pestanaActiva === 'nutriologos'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            🥗 Nutriólogos
          </button>
        </div>

        {pestanaActiva === 'clientes' && (
          <ClientesConServicioNutricionista
            serviciosNutricion={serviciosNutricion}
            idClienteDesvinculando={idClienteDesvinculando}
            onDesvincularCliente={manejarDesvincularCliente}
          />
        )}

        {pestanaActiva === 'nutriologos' && (
          <NutricionistasGestion
            nutriologos={nutriologos}
            nutriologosInactivos={nutriologosInactivos}
            idNutriologoDesactivando={idNutriologoDesactivando}
            idNutriologoReactivando={idNutriologoReactivando}
            onDesactivarNutriologodescrip={manejarDesactivarNutriologodescrip}
            onReactivarNutriologodescrip={manejarReactivarNutriologodescrip}
          />
        )}
      </div>

      <ModalConfirmacion
        isOpen={Boolean(accionPendiente)}
        onClose={() => {
          setAccionPendiente(null);
        }}
        onConfirm={manejarConfirmarAccionPendiente}
        title={accionPendiente?.type === 'deactivate' ? 'Confirmar descontratación' : 'Confirmar recontratación'}
        message={accionPendiente?.nutritionist
          ? `${accionPendiente.type === 'deactivate' ? 'Se desactivará' : 'Se reactivará'} a ${accionPendiente.nutritionist.name}.`
          : ''}
        confirmLabel={accionPendiente?.type === 'deactivate' ? 'Sí, Descontratar' : 'Sí, Recontratar'}
      />

      <ModalConfirmacion
        isOpen={Boolean(desvinculacionPendiente)}
        onClose={() => {
          if (!idClienteDesvinculando) {
            setDesvinculacionPendiente(null);
          }
        }}
        onConfirm={() => ejecutarDesvincularCliente(desvinculacionPendiente)}
        title="Confirmar desvinculación"
        message={desvinculacionPendiente
          ? `Se desvinculará a ${desvinculacionPendiente.clientName || 'este cliente'} de ${desvinculacionPendiente.nutritionistName || 'su nutriólogo'}.`
          : ''}
        confirmLabel="Sí, Desvincular"
      />

      <ErrorModal
        isOpen={modalError.isOpen}
        onClose={() => setModalError({ isOpen: false, title: '', message: '' })}
        title={modalError.title}
        message={modalError.message}
      />

      <ModalExito
        isOpen={modalExito.isOpen}
        onClose={() => setModalExito({ isOpen: false, title: '', message: '', subMessage: '' })}
        title={modalExito.title}
        message={modalExito.message}
        subMessage={modalExito.subMessage}
      />
    </div>
  );
}

export default GestionNutriologos;
