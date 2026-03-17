import React, { useState } from 'react';
import TrainerNavbar from './TrainerNavbar';
import TrainerManagement from './TrainerManagement';
import ClientCoachView from './ClientCoachView';

function TrainerPortal() {
    const [activeTab, setActiveTab] = useState('inicio');

   /* const handleLogOut = () => {
        localStorage.removeItem('token');
        window.location.href ='';        
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('');
        }
        }, [navigate]); */

        // Función temporal para que el Navbar no marque error al hacer clic en Salir
    const handleLogoutTemporal = () => {
        console.log("Clic en cerrar sesión. Falta configurar la ruta.");
    };
    return (
        <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-8">
            <TrainerNavbar activeTab={activeTab} setActiveTab={setActiveTab} onLogOut={handleLogoutTemporal}/>
            
            <div className="h-20 md:h-24"/>
           
            <div className="max-w-7xl mx-auto pt-2 md:pt-4 pb-20 md:pb-0">
               {activeTab === 'agenda' &&(
                <div className="p-8 text-center border border-slate-800 rounded-xl bg-slate-900/50 text-slate-400">
                    Agenda
                </div>
               )}
               {activeTab === 'gestion' && (
                <TrainerManagement />
               )}
               {activeTab === 'perfil' && (
                <div className="p-8 text-center border border-slate-800 rounded-xl bg-slate-900/50 text-slate-400">
                    Perfil
                </div>
               )}

            </div>
        </div>

    );

};

export default TrainerPortal;