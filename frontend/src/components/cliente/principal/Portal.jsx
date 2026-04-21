import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser, onAuthChanged } from '../../../firebase';
import Perfil from './Perfil';
import Membresia from './Membresia';
import Tienda from './Tienda';
import Navbar from './Navbar';
import VistaPlan from './VistaPlan';
import SoporteWhatsApp from '../../chat/SoporteWhatsApp';
import AssistantWidget from '../../asistente/WidgetAsistente';

const CLIENT_PORTAL_TAB_KEY = 'client_portal_active_tab';
const CLIENT_ALLOWED_TABS = new Set(['inicio', 'plan', 'tienda', 'mensajes', 'perfil']);

function Portal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = String(localStorage.getItem(CLIENT_PORTAL_TAB_KEY) || '').trim().toLowerCase();
    return CLIENT_ALLOWED_TABS.has(savedTab) ? savedTab : 'inicio';
  });
  const [authReady, setAuthReady] = useState(false);

  const handleLogout = async () => {
    await logoutUser();
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

  useEffect(() => {
    if (!CLIENT_ALLOWED_TABS.has(activeTab)) return;
    localStorage.setItem(CLIENT_PORTAL_TAB_KEY, activeTab);
  }, [activeTab]);

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