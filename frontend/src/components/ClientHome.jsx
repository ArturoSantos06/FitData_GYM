import React, { useEffect, useState } from 'react';
import { Activity, ChevronRight, User } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function ClientHome({ onNavigateToProfile }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API_URL}/api/users/me/`, { headers: { Authorization: `Token ${token}` } })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => { setUser(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-slate-400">Cargando...</div>;
  }
  if (!user) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl p-6 max-w-md mx-auto text-center">
        <p className="mb-4">No hay sesión activa</p>
        <a href="/cliente/login" className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold">Iniciar sesión como cliente</a>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-2xl bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 relative">
          <div className="absolute inset-0 bg-black/20"></div>
        </div>
        <div className="px-8 pb-8 text-center relative">
          <div className="relative -mt-16 mb-4 inline-block">
            <div className="w-32 h-32 rounded-full border-4 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden shadow-lg relative z-10">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.username || 'Member')}`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-1">{user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user.nombre || user.username)}</h2>
          <p className="text-blue-400 font-medium mb-4">{user.email}</p>

          <div className="mt-8 space-y-3 text-left">
            <button onClick={onNavigateToProfile} className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between group transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:text-blue-300">
                  <User size={20} />
                </div>
                <span className="text-slate-200 font-medium group-hover:text-white">Editar Datos Personales</span>
              </div>
              <ChevronRight className="text-slate-500 group-hover:text-blue-400 transition-transform group-hover:translate-x-1" size={20}/>
            </button>

            <button className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between group transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 group-hover:text-purple-300">
                  <Activity size={20} />
                </div>
                <span className="text-slate-200 font-medium group-hover:text-white">Actualizar Ficha Médica</span>
              </div>
              <ChevronRight className="text-slate-500 group-hover:text-purple-400 transition-transform group-hover:translate-x-1" size={20}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClientHome;
