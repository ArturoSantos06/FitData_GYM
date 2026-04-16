import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import BitacoraEntrenador from '../seguimiento/BitacoraEntrenador';
import HealthProfilesCoach from '../../HealthProfilesCoach';
import MenuGestionEntrenador from './MenuGestionEntrenador';
import PanelGestionRutinas from './PanelGestionRutinas';
import DesvinculacionClientesEntrenador from './DesvinculacionClientesEntrenador';

function VistaSecundariaGestion({ vistaActual, onVolver }) {
  return (
    <div className="w-full animate-fade-in">
      <button onClick={onVolver} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
        <ArrowLeft size={20} />
        <span className="font-bold">Volver a Gestión</span>
      </button>

      {vistaActual === 'historial' && <HealthProfilesCoach />}
      {vistaActual === 'bitacora' && <BitacoraEntrenador embedded />}
      {vistaActual === 'rutinas' && <PanelGestionRutinas />}
      {vistaActual === 'desvinculacion' && <DesvinculacionClientesEntrenador />}
    </div>
  );
}

function GestionEntrenador() {
  const [vistaActual, setVistaActual] = useState('menu');

  if (vistaActual !== 'menu') {
    return <VistaSecundariaGestion vistaActual={vistaActual} onVolver={() => setVistaActual('menu')} />;
  }

  return <MenuGestionEntrenador onCambiarVista={setVistaActual} />;
}

export default GestionEntrenador;
