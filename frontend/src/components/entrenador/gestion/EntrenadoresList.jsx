import React from 'react';
import { CheckCircle, Dumbbell } from 'lucide-react';
import ConfirmModal from '../../ConfirmModal';
import SuccessModal from '../../SuccessModal';
import ErrorModal from '../../ErrorModal';
import ModalPagoServicioEntrenador from '../../ModalPagoServicioEntrenador';
import TarjetaEntrenadorServicio from './TarjetaEntrenadorServicio';
import { useServicioEntrenadores } from '../../../backend/useServicioEntrenadores';
import { ETIQUETAS_TIPO_SERVICIO } from '../../../backend/utilidadesServicioEntrenador';

function EstadoErrorEntrenadores({ error }) {
  return (
    <div className="p-6 text-center">
      <div className="bg-red-900/20 border border-red-500 rounded-xl p-4 text-red-400">
        <p className="font-semibold">Error al cargar entrenadores</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    </div>
  );
}

function EstadoCargaEntrenadores() {
  return (
    <div className="p-6 text-center">
      <div className="animate-pulse">
        <div className="bg-slate-800 rounded-xl p-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <div className="h-4 bg-slate-700 rounded w-3/4 mx-auto mb-2"></div>
          <div className="h-3 bg-slate-700 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    </div>
  );
}

export default function EntrenadoresList() {
  const estado = useServicioEntrenadores();

  if (estado.error) return <EstadoErrorEntrenadores error={estado.error} />;
  if (estado.loading) return <EstadoCargaEntrenadores />;

  return (
    <div className="space-y-6">
      {estado.assignedTrainerId && (
        <div className="bg-green-900/20 border border-green-500 rounded-xl p-4 text-green-400">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <p className="font-semibold">Ya tienes un entrenador asignado</p>
          </div>
          <p className="text-sm mt-1">Si deseas cambiar de especialista, contacta a recepción del gimnasio.</p>
        </div>
      )}

      {estado.entrenadores.length > 0 ? (
        <div className="grid gap-6 justify-center" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 260px))' }}>
          {estado.entrenadores.map((entrenador) => (
            <TarjetaEntrenadorServicio
              key={entrenador.id}
              entrenador={entrenador}
              entrenadorSeleccionado={estado.selectedEntrenador}
              entrenadorAsignadoId={estado.assignedTrainerId}
              clienteActualId={estado.currentClientId}
              resenas={estado.reviews}
              estrellasHover={estado.hoveredStars}
              asignando={estado.assigning}
              onHoverEstrella={(id, estrella) => estado.setHoveredStars((prev) => ({ ...prev, [id]: estrella }))}
              onSalirEstrella={(id) => estado.setHoveredStars((prev) => ({ ...prev, [id]: 0 }))}
              onCalificar={estado.solicitarCalificacion}
              onSeleccionar={estado.seleccionarEntrenador}
              calcularPromedio={estado.calcularPromedio}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Dumbbell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">No se encontraron entrenadores disponibles</p>
          <p className="text-slate-500 text-sm mt-2">Estamos trabajando para expandir nuestro equipo de entrenadores.</p>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(estado.pendingTrainerSelection)}
        onClose={() => { if (!estado.assigning) estado.setPendingTrainerSelection(null); }}
        onConfirm={estado.confirmarSeleccionEntrenador}
        title="Confirmar entrenador"
        message={estado.pendingTrainerSelection
          ? `¿Estas seguro de seleccionar a ${estado.pendingTrainerSelection.displayName || `${estado.pendingTrainerSelection.firstName || ''} ${estado.pendingTrainerSelection.lastName || ''}`.trim() || estado.pendingTrainerSelection.nombre || 'este entrenador'} como tu entrenador?\n\nEsto iniciara tu plan de entrenamiento personalizado.`
          : ''}
        confirmLabel={estado.assigning ? 'Asignando...' : 'Si, Seleccionar'}
        variant="info"
      />

      <ModalPagoServicioEntrenador
        isOpen={Boolean(estado.pendingPaymentTrainer)}
        title="Confirmar pago del servicio"
        subtitle={estado.pendingPaymentTrainer ? 'Para continuar con tu servicio de entrenamiento, elige el tipo de servicio y confirma el pago.' : ''}
        serviceType={estado.selectedServiceType}
        serviceTypeOptions={(estado.pendingPaymentTrainer?.serviceTypeOptions || []).map((type) => ({ value: type, label: ETIQUETAS_TIPO_SERVICIO[type] || type }))}
        serviceTypeReadOnly={(estado.pendingPaymentTrainer?.serviceTypeOptions || []).length <= 1}
        onServiceTypeChange={estado.cambiarTipoServicio}
        value={estado.paymentAmount}
        amountReadOnly={true}
        amountHelperText="El monto se ajusta automáticamente según el tipo de servicio seleccionado."
        paymentMethod={estado.paymentMethod}
        onChange={estado.setPaymentAmount}
        onPaymentMethodChange={estado.setPaymentMethod}
        onConfirm={estado.confirmarPagoYAsignacion}
        confirmLabel={estado.assigning ? 'Procesando...' : 'Pagar y asignar'}
        onClose={() => {
          estado.setPendingPaymentTrainer(null);
          estado.setSelectedServiceType('PERSONAL');
          estado.setPaymentAmount('');
        }}
      />

      <ConfirmModal
        isOpen={Boolean(estado.pendingRating)}
        onClose={() => estado.setPendingRating(null)}
        onConfirm={estado.confirmarCalificacion}
        title="Confirmar calificación"
        message={estado.pendingRating ? `¿Calificar a este entrenador con ${estado.pendingRating.rating} estrella(s)?` : ''}
        confirmLabel="Sí, Calificar"
        variant="info"
      />

      <SuccessModal
        isOpen={estado.successModal.isOpen}
        onClose={() => estado.setSuccessModal({ isOpen: false, title: '', message: '' })}
        title={estado.successModal.title}
        message={estado.successModal.message}
      />

      <ErrorModal
        isOpen={estado.errorModal.isOpen}
        onClose={() => estado.setErrorModal({ isOpen: false, title: '', message: '' })}
        title={estado.errorModal.title}
        message={estado.errorModal.message}
      />
    </div>
  );
}
