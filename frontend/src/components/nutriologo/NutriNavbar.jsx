import React, { useEffect, useState } from 'react';
import { Home, Activity, Calculator, Stethoscope, BookOpen, LogOut, MessageCircle, UserCircle2 } from 'lucide-react';
import { getCurrentUser, getUserByAuthUid, getUser, getUserByEmail } from '../../firebase';

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

const NutriNavbar = ({ activeTab, setActiveTab, onLogOut}) => {
    const [userData, setUserData] = useState(null);

    useEffect(() => {
      const fetchUser = async () => {
        try {
          const currentUser = getCurrentUser();
          if (!currentUser) return;

          let uId = currentUser.uid;
          let finalData = {
            nombre: currentUser.displayName || currentUser.email || 'Nutriologo',
            photoURL: currentUser.photoURL || null,
            bgColor: '#1D4ED8',
          };

          const result = await resolveUserFromAuth(currentUser);
          if (result.success && result.data) {
            const u = result.data;
            uId = u.id || uId;
            finalData.nombre = u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username || finalData.nombre;
            finalData.photoURL = u.photoURL || finalData.photoURL;
          }

          finalData.bgColor = localStorage.getItem(`avatar_bg_color_${uId}`) || '#1D4ED8';
          setUserData(finalData);
        } catch (error) {
          console.error('Error al cargar datos del nutriologo para navbar:', error);
        }
      };

      fetchUser();
    }, []);

    const getInitial = () => {
      if (userData?.nombre) return userData.nombre.charAt(0).toUpperCase();
      return 'N';
    };

    const tabs = [
        { id: 'inicio', label: 'Inicio', icon: Home },      
        { id: 'citas', label: 'Citas', icon: Stethoscope },
        { id: 'calculadora', label: 'Calculadora', icon: Calculator },
        { id: 'dietas', label: 'Dietas', icon: BookOpen },
        { id: 'financiero', label: 'Finanzas', icon: Activity },

        // ==========================================
        // NUEVA INTEGRACIÓN: MÓDULO DE MENSAJES (ESTRATEGIA CONTEXT API)
        // ==========================================
        { id: 'mensajes', label: 'Mensajes', icon: MessageCircle },
        { id: 'perfil', label: 'Perfil', icon: UserCircle2 },
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
                        className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                            isActive
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

            <div className="pl-8 flex items-center gap-6">
              <button
                onClick={onLogOut}
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
                  <div className="hidden lg:flex lg:flex-col lg:items-end">
                    <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors max-w-[170px] truncate text-right">
                      {userData.nombre}
                    </span>
                  </div>

                  {userData.photoURL ? (
                    <img
                      src={userData.photoURL}
                      alt="Perfil"
                      className="w-10 h-10 rounded-full object-cover border-2 border-slate-700 shadow-md group-hover:border-blue-400 transition-colors shrink-0"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white border-2 border-slate-600 shadow-md group-hover:border-blue-400 group-hover:shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all shrink-0"
                      style={{ backgroundColor: userData.bgColor }}
                    >
                      {getInitial()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </header>

          <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 pb-safe z-50 h-16">
          <div
            className="grid h-full"
            style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}
          >
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                    <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-col items-center justify-center gap-1 w-full ${
                    isActive ? 'text-cyan-400' : 'text-slate-500'
                }`}
            >
                <div className={`w-6 h-6 transition-all ${
                    isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : ''
                }`}>
                  <Icon size={24} />
                </div>
                <span className="text-[9px] font-medium truncate w-full px-1 text-center">
                  {tab.label}
                </span>
              </button>
                );
            })}
            <button
              onClick={onLogOut}
              className="flex flex-col items-center justify-center gap-1 w-full text-red-400"
              >
                <div className="w-6 h-6">
                    <LogOut size ={24} />
                </div>
                <span className="text-[10px] font-medium">
                  Salir
                </span>
              </button>
          </div>
          </nav>  
        </>
    );
};

export default NutriNavbar;