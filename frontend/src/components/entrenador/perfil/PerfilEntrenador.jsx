import React from 'react';
import ModalExito from '../../modales/ModalExito';
import FormularioCambioContrasenaEntrenador from './FormularioCambioContrasenaEntrenador';
import FormularioDatosPerfilEntrenador from './FormularioDatosPerfilEntrenador';
import FormularioContratoFiscalEntrenador from './FormularioContratoFiscalEntrenador';
import MenuPerfilEntrenador from './MenuPerfilEntrenador';
import { usePerfilEntrenador } from '../../../backend/usePerfilEntrenador';

function EstadoCargaPerfil() {
  return (
    <div className="w-full flex justify-center items-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4" />
        <p className="text-slate-400">Cargando perfil...</p>
      </div>
    </div>
  );
}

function EstadoErrorPerfil({ error }) {
  return (
    <div className="w-full flex justify-center items-center min-h-[400px]">
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center max-w-md">
        <p className="text-red-400 mb-4">{error}</p>
        <a href="/entrenador/login" className="inline-block bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg font-medium transition-all">
          Iniciar sesión como entrenador
        </a>
      </div>
    </div>
  );
}

export default function PerfilEntrenador() {
  const {
    usuario,
    codigoEntrenador,
    vistaActual,
    cargando,
    error,
    showSuccessModal,
    successMessage,
    setVistaActual,
    setShowSuccessModal,
    guardar,
  } = usePerfilEntrenador();

  if (cargando) return <EstadoCargaPerfil />;
  if (error) return <EstadoErrorPerfil error={error} />;
  if (!usuario) return null;

  return (
    <div className="w-full flex justify-center">
      <ModalExito isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} title="Éxito" message={successMessage} />

      {vistaActual === 'menu' && <MenuPerfilEntrenador usuario={usuario} onNavigate={setVistaActual} />}

      {vistaActual === 'edit-personal' && (
        <FormularioDatosPerfilEntrenador
          usuario={usuario}
          codigoEntrenador={codigoEntrenador}
          onGuardar={guardar}
          onVolver={() => setVistaActual('menu')}
        />
      )}

      {vistaActual === 'edit-contrato' && (
        <FormularioContratoFiscalEntrenador
          usuario={usuario}
          onGuardar={guardar}
          onVolver={() => setVistaActual('menu')}
        />
      )}

      {vistaActual === 'change-password' && (
        <FormularioCambioContrasenaEntrenador onBack={() => setVistaActual('menu')} />
      )}
    </div>
  );
}
