import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logoutUser } from '../firebase';

function NutriologoPortal({ onLogout }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate('/cliente/login'); 
      return;
    }
    setUser(currentUser);
    setLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    onLogout();
  };

  if (loading) {
    return (
      <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">
        Cargando...
      </div>
    );
  }

  return (
    <div className="bg-slate-950 text-gray-100 min-h-screen">
      <header className="bg-blue-950/80 p-5 flex flex-wrap items-center justify-between gap-4 border-b border-blue-800">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Portal Nutriólogo - FitData GYM
        </h1>
        <button
          onClick={handleLogout}
          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-5 py-2 rounded-xl shadow-lg shadow-blue-500/30 transition-all"
        >
          Cerrar Sesión
        </button>
      </header>

      <main className="container mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Aquí agregar tarjetas o secciones para funcionalidades del nutriólogo */}
          <div className="bg-blue-900/80 p-6 rounded-2xl border border-blue-800 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.8)]">
            <h3 className="text-lg font-semibold text-white mb-2">Mis Clientes</h3>
            <p className="text-blue-200/80">Ver y gestionar perfiles de clientes asignados.</p>
            <button className="mt-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold px-4 py-2 rounded-lg shadow-lg transition-all">
              Ver Clientes
            </button>
          </div>

          <div className="bg-blue-900/80 p-6 rounded-2xl border border-blue-800 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.8)]">
            <h3 className="text-lg font-semibold text-white mb-2">Fichas Médicas</h3>
            <p className="text-blue-200/80">Revisar y actualizar perfiles de salud.</p>
            <button className="mt-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold px-4 py-2 rounded-lg shadow-lg transition-all">
              Gestionar Fichas
            </button>
          </div>

          <div className="bg-blue-900/80 p-6 rounded-2xl border border-blue-800 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.8)]">
            <h3 className="text-lg font-semibold text-white mb-2">Consultas</h3>
            <p className="text-blue-200/80">Agendar y gestionar consultas nutricionales.</p>
            <button className="mt-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold px-4 py-2 rounded-lg shadow-lg transition-all">
              Ver Consultas
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default NutriologoPortal;