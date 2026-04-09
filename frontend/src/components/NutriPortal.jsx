import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../firebase';
import NutriNavbar from './NutriNavbar';

import HomeNutri from './nutriologo/HomeNutri';
import MacroCalculatorForm from './MacroCalculatorForm';
import NutriFinancialDashboard from './nutriologo/NutriFinancialDashboard';
import CitasNutri from './nutriologo/CitasNutri';
import DietaRepositorio from './DietaRepositorio';


function NutriPortal() {
    const [activeTab, setActiveTab] = useState('inicio');    const navigate = useNavigate();

    const handleLogOut = async () => {
        try {
            await logoutUser();
            localStorage.removeItem('nutritionist_token');
            localStorage.removeItem('nutritionist_username');
        } catch (error) {
            console.error("Error al cerrar sesión", error);
        }
        navigate('/nutriologo/login');
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-8">
            <NutriNavbar activeTab={activeTab} setActiveTab={setActiveTab} onLogOut={handleLogOut} />            
            
            {/* Espaciador para que el navbar no tape el contenido */}
            <div className="h-20 md:h-24"/>
            
            <div className="max-w-7xl mx-auto pt-2 md:pt-4 pb-20 md:pb-0 animate-fade-in">
                {/* Renderizado de las vistas según el clic */}
                {activeTab === 'inicio' && <HomeNutri />}
                {activeTab === 'citas' && <CitasNutri />}
                {activeTab === 'calculadora' && <MacroCalculatorForm />}
                {activeTab === 'dietas' && <DietaRepositorio />}
                {activeTab === 'financiero' && <NutriFinancialDashboard />}
            </div>
        </div>
    );
};

export default NutriPortal;