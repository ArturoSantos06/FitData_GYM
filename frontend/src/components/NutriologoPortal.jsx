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
      navigate('/cliente/login'); // O a un login específico para nutriólogos
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
    <div className="bg-gray-900 text-gray-100 min-h-screen">
      <header className="bg-slate-800 p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-400">
          Portal Nutriólogo - FitData GYM
        </h1>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
        >
          Cerrar Sesión
        </button>
      </header>

      <main className="container mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Aquí agregar tarjetas o secciones para funcionalidades del nutriólogo */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h3 className="text-lg font-semibold text-cyan-400 mb-2">Mis Clientes</h3>
            <p className="text-slate-400">Ver y gestionar perfiles de clientes asignados.</p>
            <button className="mt-4 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded">
              Ver Clientes
            </button>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h3 className="text-lg font-semibold text-cyan-400 mb-2">Fichas Médicas</h3>
            <p className="text-slate-400">Revisar y actualizar perfiles de salud.</p>
            <button className="mt-4 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded">
              Gestionar Fichas
            </button>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h3 className="text-lg font-semibold text-cyan-400 mb-2">Consultas</h3>
            <p className="text-slate-400">Agendar y gestionar consultas nutricionales.</p>
            <button className="mt-4 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded">
              Ver Consultas
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default NutriologoPortal;