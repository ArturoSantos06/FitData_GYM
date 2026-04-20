import React, { useState, useEffect } from 'react';
import { QrCode, ShoppingBag, Dumbbell, User, LogOut, MessageSquare } from 'lucide-react';
import { getCurrentUser, getUserByAuthUid, getUser, getUserByEmail } from '../../../firebase';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const resolveUserFromAuth = async (firebaseUser) => {
  if (!firebaseUser) return { success: false };
  const userByAuthUid = await getUserByAuthUid(firebaseUser.uid);
  if (userByAuthUid?.success && userByAuthUid.data) return { success: true, data: userByAuthUid.data };
  const userByDocId = await getUser(firebaseUser.uid);
  if (userByDocId?.success && userByDocId.data) return { success: true, data: userByDocId.data };
  const email = normalizeEmail(firebaseUser.email);
  if (email) {
    const userByEmail = await getUserByEmail(email);
    if (userByEmail?.success && userByEmail.data) return { success: true, data: userByEmail.data };
  }
  return { success: false };
};

const Navbar = ({ activeTab, setActiveTab, onLogout }) => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        let uId = currentUser.uid;
        let finalData = {
          nombre: currentUser.displayName || currentUser.email || 'Usuario',
          photoURL: currentUser.photoURL || null,
          bgColor: '#1D4ED8',
          gymPoints: 0
        };

        const result = await resolveUserFromAuth(currentUser);
        if (result.success && result.data) {
          const u = result.data;
          uId = u.id || uId;
          finalData.nombre = u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username || finalData.nombre;
          finalData.photoURL = u.photoURL || finalData.photoURL;
          finalData.gymPoints = u.gymPoints || 0;
        }

        finalData.bgColor = localStorage.getItem(`avatar_bg_color_${uId}`) || '#1D4ED8';
        setUserData(finalData);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUser();
  }, []);

  const getInitial = () => {
    if (userData && userData.nombre) {
      return userData.nombre.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Solo las 5 pestañas principales para un UX perfecto en móvil
  const tabs = [
    { id: 'inicio', label: 'Inicio', icon: QrCode },
    { id: 'plan', label: 'Mi Plan', icon: Dumbbell }, // <-- Agrupa Rutina, Entrenador y Nutriólogo
    { id: 'mensajes', label: 'Mensajes', icon: MessageSquare },
    { id: 'tienda', label: 'Tienda', icon: ShoppingBag }, // <-- Agrupa Catálogo y Servicios
    { id: 'perfil', label: 'Perfil', icon: User },
  ];

  return (
    <>
      <header className="hidden md:flex fixed top-0 left-0 right-0 bg-slate-900 border-b border-slate-800 z-50 h-20 items-center px-8 justify-center shadow-2xl">
        <div className="flex items-center gap-5">
          <span className="text-xl font-black text-transparent bg-clip-text bg-linear-to-r from-blue-500 to-cyan-400 mr-4 cursor-pointer">
            FitData <span className="text-white">GYM</span>
          </span>

          <nav className="flex items-center gap-5">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${isActive
                    ? 'bg-slate-800 text-white border-b-2 border-cyan-400 shadow-[0_4px_12px_-2px_rgba(34,211,238,0.3)] -translate-y-px'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-b-2 border-transparent'
                    }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pl-8 border-l border-slate-800/50 flex items-center gap-6">
          <button
            onClick={onLogout}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2 rounded-md shadow-lg shadow-red-600/20 transition-transform active:scale-95 text-sm"
          >
            Salir
          </button>

          {userData && (
            <div
              className="flex items-center gap-3 cursor-pointer group pl-6 border-l border-slate-800/50"
              onClick={() => setActiveTab('perfil')}
              title="Ir a perfil"
            >
              <div className="flex flex-col items-end hidden lg:flex">
                <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors max-w-[150px] truncate text-right">
                  {userData.nombre}
                </span>
                <span className="text-[11px] font-bold text-yellow-400 mt-[1px] flex items-center justify-end gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {userData.gymPoints} pts
                </span>
              </div>
              {userData.photoURL ? (
                <img src={userData.photoURL} alt="Perfil" className="w-10 h-10 rounded-full object-cover border-2 border-slate-700 shadow-md group-hover:border-blue-400 transition-colors shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white border-2 border-slate-600 shadow-md group-hover:border-blue-400 group-hover:shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all shrink-0" style={{ backgroundColor: userData.bgColor }}>
                  {getInitial()}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 pb-safe z-50 h-16">
        <div className="grid grid-cols-6 h-full">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-1 ${isActive ? 'text-blue-400' : 'text-slate-500'
                  }`}
              >
                <div className={`w-6 h-6 transition-all ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : ''
                  }`}>
                  <Icon size={24} />
                </div>
                <span className="text-[9px] font-medium truncate w-full px-1 text-center">{tab.label}</span>
              </button>
            );
          })}

          <button
            onClick={onLogout}
            className="flex flex-col items-center justify-center gap-1 text-red-400"
          >
            <div className="w-6 h-6">
              <LogOut size={24} />
            </div>
            <span className="text-[10px] font-medium">Salir</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default Navbar;