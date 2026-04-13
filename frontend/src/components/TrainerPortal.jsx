import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../firebase';
import TrainerNavbar from './TrainerNavbar';
import TrainerManagement from './TrainerManagement';
import HomeTrainer from './entrenador/HomeTrainer';
import CitasTrainer from './CitasTrainer';
import PerfilEntrenador from './entrenador/PerfilEntrenador';

function TrainerPortal() {
    const [activeTab, setActiveTab] = useState('inicio');
    const navigate = useNavigate();

    const handleLogOut = async () => {
        try {
            await logoutUser();
        } catch {
            // ignorar errores de cierre de sesión
        }
        localStorage.removeItem('trainer_token');
        localStorage.removeItem('trainer_username');
        navigate('/entrenador/login');
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-8">
            <TrainerNavbar activeTab={activeTab} setActiveTab={setActiveTab} onLogOut={handleLogOut}/>
            
            <div className="h-20 md:h-24"/>
           
            <div className="max-w-7xl mx-auto pt-2 md:pt-4 pb-20 md:pb-0">
               {activeTab === 'inicio' &&(
                <HomeTrainer />
               )}
               {activeTab === 'agenda' &&(
                <CitasTrainer embedded />
               )}
               {activeTab === 'gestion' && (
                <TrainerManagement />
               )}
               {activeTab === 'perfil' && (
                <PerfilEntrenador />
               )}

            </div>
        </div>

    );

};

export default TrainerPortal;