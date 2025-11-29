import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import UserProfile from './UserProfile';
import ClientMembership from './ClientMembership';
import ClientStore from './ClientStore';
import ClientNavbar from './ClientNavbar';

function ClientPortal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('inicio');

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/cliente/login';
  };

  // Redirigir automáticamente al login si no hay sesión activa
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/cliente/login');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-8">
      <ClientNavbar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      {/* Separador para evitar que el contenido quede debajo del navbar fijo */}
      <div className="h-20 md:h-24" />

      {/* Contenido Principal: Tabs del cliente */}
      <div className="max-w-7xl mx-auto pt-2 md:pt-4">
        {activeTab === 'inicio' && (
          <ClientMembership />
        )}
        {activeTab === 'catalogo' && (
          <ClientStore />
        )}
        {activeTab === 'perfil' && (
          <UserProfile />
        )}
      </div>
    </div>
  );
}

export default ClientPortal;