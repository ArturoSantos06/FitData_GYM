import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { logoutUser } from '../../../firebase';
import CitasEntrenador from '../gestion/CitasEntrenador';
import BandejaProfesionales from '../../chat/BandejaProfesionales';
import PerfilEntrenador from '../perfil/PerfilEntrenador';
import GestionEntrenador from '../gestion/GestionEntrenador';
import BarraNavegacionEntrenador from './BarraNavegacionEntrenador';
import InicioEntrenador from './InicioEntrenador';

const TRAINER_PORTAL_TAB_KEY = 'trainer_portal_active_tab';
const TRAINER_ALLOWED_TABS = new Set(['inicio', 'agenda', 'gestion', 'mensajes', 'perfil']);

function PortalEntrenador() {
  const location = useLocation();
  const navigate = useNavigate();
  const [pestañaActiva, setPestañaActiva] = useState(() => {
    const initialStateTab = String(location.state?.initialTab || '').trim().toLowerCase();
    if (TRAINER_ALLOWED_TABS.has(initialStateTab)) {
      return initialStateTab;
    }

    const savedTab = String(localStorage.getItem(TRAINER_PORTAL_TAB_KEY) || '').trim().toLowerCase();
    return TRAINER_ALLOWED_TABS.has(savedTab) ? savedTab : 'inicio';
  });

  useEffect(() => {
    if (!TRAINER_ALLOWED_TABS.has(pestañaActiva)) return;
    localStorage.setItem(TRAINER_PORTAL_TAB_KEY, pestañaActiva);
  }, [pestañaActiva]);

  const cerrarSesion = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
    localStorage.removeItem('trainer_token');
    localStorage.removeItem('trainer_username');
    navigate('/entrenador/login');
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-8">
      <BarraNavegacionEntrenador
        pestañaActiva={pestañaActiva}
        onCambiarPestaña={setPestañaActiva}
        onCerrarSesion={cerrarSesion}
      />

      <div className="h-20 md:h-24" />

      <div className="max-w-7xl mx-auto pt-2 md:pt-4 pb-20 md:pb-0">
        {pestañaActiva === 'inicio' && <InicioEntrenador />}
        {pestañaActiva === 'agenda' && <CitasEntrenador embedded />}
        {pestañaActiva === 'gestion' && <GestionEntrenador />}
        {pestañaActiva === 'mensajes' && <BandejaProfesionales role="trainer" />}
        {pestañaActiva === 'perfil' && <PerfilEntrenador />}
      </div>
    </div>
  );
}

export default PortalEntrenador;
