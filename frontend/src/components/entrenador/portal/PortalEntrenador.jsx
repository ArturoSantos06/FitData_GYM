import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../../../firebase';
import CitasTrainer from '../../CitasTrainer';
import BandejaProfesionales from '../../chat/BandejaProfesionales';
import PerfilEntrenador from '../perfil/PerfilEntrenador';
import GestionEntrenador from '../gestion/GestionEntrenador';
import BarraNavegacionEntrenador from './BarraNavegacionEntrenador';
import InicioEntrenador from './InicioEntrenador';

function PortalEntrenador() {
  const [pestañaActiva, setPestañaActiva] = useState('inicio');
  const navigate = useNavigate();

  const cerrarSesion = async () => {
    try {
      await logoutUser();
    } catch {
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
        {pestañaActiva === 'agenda' && <CitasTrainer embedded />}
        {pestañaActiva === 'gestion' && <GestionEntrenador />}
        {pestañaActiva === 'mensajes' && <BandejaProfesionales role="trainer" />}
        {pestañaActiva === 'perfil' && <PerfilEntrenador />}
      </div>
    </div>
  );
}

export default PortalEntrenador;
