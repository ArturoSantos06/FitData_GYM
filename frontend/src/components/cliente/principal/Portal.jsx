import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthChanged } from '../../../firebase';
import Perfil from './Perfil';
import Membresia from './Membresia';
import Tienda from './Tienda';
import Navbar from './Navbar';
import VistaPlan from './VistaPlan';
import SoporteWhatsApp from '../../chat/SoporteWhatsApp';
import AssistantWidget from '../../asistente/WidgetAsistente';

function Portal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('inicio');
  const [authReady, setAuthReady] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('firebaseUser');
    window.location.href = '/cliente/login';
  };

  useEffect(() => {
    const unsubscribe = onAuthChanged((user) => {
      setAuthReady(true);
      if (!user) {
        localStorage.removeItem('firebaseUser');
        navigate('/cliente/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  if (!authReady) {
    return (
      <div className="text-white bg-gray-900 h-screen flex items-center justify-center">
        <p>Cargando sesión...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-8 pb-24 md:pb-8">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />

      {/* Separador para el Navbar de escritorio y el Header de móvil */}
      <div className="h-16 md:h-24" />

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto pt-2 md:pt-4">

        {activeTab === 'inicio' && (
          <div className="animate-fade-in">
            <Membresia />
          </div>
        )}

        {/* MI PLAN: El nuevo menú dividido por áreas */}
        {activeTab === 'plan' && (
          <div className="animate-fade-in">
            <VistaPlan />
          </div>
        )}

        {/* TIENDA: Agrupa catálogo y futuros servicios de pago */}
        {activeTab === 'tienda' && (
          <div className="animate-fade-in">
            <Tienda />
          </div>
        )}

        {/* MENSAJES: Centro de conversaciones y IA de rutinas */}
        {activeTab === 'mensajes' && (
          <SoporteWhatsApp />
        )}

        {activeTab === 'perfil' && (
          <div className="animate-fade-in">
            <Perfil />
          </div>
        )}

      </div>

      <AssistantWidget context="cliente" />
    </div>
  );
}

export default Portal;