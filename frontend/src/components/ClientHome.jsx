import React, { useEffect, useState } from 'react';
import { Activity, ChevronRight, User } from 'lucide-react';
import { getCurrentUser, getUser } from '../firebase';

function ClientHome({ onNavigateToProfile }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      const result = await getUser(currentUser.uid);
      if (result.success) {
        setUser({ ...result.data, username: result.data.username || result.data.email });
      }
      setLoading(false);
    };
    
    loadUser();
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
        <div className="h-32 bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 relative">
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

          {/* --- INICIO CÓDIGO NUEVO GYM-POINTS --- */}
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-2 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-yellow-400 font-bold text-lg">{user.gymPoints || 0}</span>
              <span className="text-yellow-500/70 font-medium tracking-wide">GYM-Points</span>
          </div>
          {/* --- FIN CÓDIGO NUEVO GYM-POINTS --- */}

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
