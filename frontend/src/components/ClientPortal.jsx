import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserProfile from './UserProfile';
import ClientMembership from './ClientMembership';
import ClientStore from './ClientStore';
import ClientNavbar from './ClientNavbar';
import ClientPlanView from './ClientPlanView'; 
import AssistantSupportCenter from './asistente/CentroSoporteAsistente';
import AssistantWidget from './asistente/WidgetAsistente';

function ClientPortal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('inicio');

  const handleLogout = () => {
    localStorage.removeItem('firebaseUser');
    window.location.href = '/cliente/login';
  };

  useEffect(() => {
    const firebaseUser = localStorage.getItem('firebaseUser');
    if (!firebaseUser) {
      navigate('/cliente/login');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-8 pb-24 md:pb-8">
      <ClientNavbar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      
      {/* Separador para el Navbar de escritorio y el Header de móvil */}
      <div className="h-16 md:h-24" />

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto pt-2 md:pt-4">
        
        {activeTab === 'inicio' && (
          <ClientMembership />
        )}
        
        {/* MI PLAN: El nuevo menú dividido por áreas */}
        {activeTab === 'plan' && (
          <div className="animate-fade-in">
            <ClientPlanView />
          </div>
        )}
        
        {/* TIENDA: Agrupa catálogo y futuros servicios de pago */}
        {activeTab === 'tienda' && (
          <div className="animate-fade-in">
            <ClientStore />
          </div>
        )}
        
        {/* MENSAJES: Sección en construcción */}
        {activeTab === 'mensajes' && (
          <AssistantSupportCenter />
        )}
        
        {activeTab === 'perfil' && (
          <div className="animate-fade-in">
            <UserProfile />
          </div>
        )}

      </div>

      <AssistantWidget context="cliente" />
    </div>
  );
}

export default ClientPortal;