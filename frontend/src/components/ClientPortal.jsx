import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserProfile from './UserProfile';
import ClientMembership from './ClientMembership';
import ClientStore from './ClientStore';
import ClientNavbar from './ClientNavbar';
import ClientPlanView from './ClientPlanView'; 

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
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in bg-slate-900/50 rounded-xl border border-slate-800">
            <h2 className="text-2xl font-bold text-white mb-2">Mensajería</h2>
            <p className="text-slate-400">Próximamente podrás chatear con tu entrenador y nutriólogo aquí.</p>
          </div>
        )}
        
        {activeTab === 'perfil' && (
          <div className="animate-fade-in">
            <UserProfile />
          </div>
        )}

      </div>
    </div>
  );
}

export default ClientPortal;