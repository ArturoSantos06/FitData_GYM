import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../firebase';
import NutriNavbar from './NutriNavbar';

function NutriPortal() {
    const [activeTab, setActiveTab] = useState('inicio');
    const navigate = useNavigate();

   // const handleLogOut = async () => {
     //   try {
       //     await logoutUser();
        //} catch {
        //}
       // navigate('/entrenador/login');
   // };

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-8">
            <TrainerNavbar activeTab={activeTab} setActiveTab={setActiveTab} onLogOut={handleLogOut}/>
            
            <div className="h-20 md:h-24"/>
           
            <div className="max-w-7xl mx-auto pt-2 md:pt-4 pb-20 md:pb-0">
               {activeTab === 'inicio' &&(
                <div className="p-8 text-center border border-slate-800 rounded-xl bg-slate-900/50 text-slate-400">
                    inicio
                </div>
               )}
               {activeTab === 'agenda' &&(
                <div className="p-8 text-center border border-slate-800 rounded-xl bg-slate-900/50 text-slate-400">
                    agenda
                </div>
               )}
               {activeTab === 'gestion' && (
                <div className="p-8 text-center border border-slate-800 rounded-xl bg-slate-900/50 text-slate-400">
                    gestión
                </div>
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

export default NutriPortal;