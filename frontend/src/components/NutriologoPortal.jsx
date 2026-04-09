import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../../firebase'; // Verifica que la ruta a firebase sea la correcta
import { Activity } from 'lucide-react';

// Componentes
import NutriNavbar from './NutriNavbar';
import MacroCalculatorForm from '../MacroCalculatorForm';
import NutriFinancialDashboard from './NutriFinancialDashboard';
import CitasNutri from './CitasNutri';
import DietaRepositorio from '../DietaRepositorio';
import HomeNutri from './nutriologo/HomeNutri';

function NutriPortal() {
    // Iniciamos directamente en la calculadora
    const [activeTab, setActiveTab] = useState('calculadora');
    const navigate = useNavigate();

    const handleLogOut = async () => {
        try {
            await logoutUser();
            localStorage.removeItem('nutritionist_token');
            localStorage.removeItem('nutritionist_username');
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
        // Redirigimos al login correcto del nutriólogo
        navigate('/nutriologo/login');
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-white animate-fade-in pb-20 md:pb-0">
            
            {/* NAVBAR RESPONSIVE */}
            <NutriNavbar activeTab={activeTab} setActiveTab={setActiveTab} onLogOut={handleLogOut} />
            
            {/* ESPACIADOR DESKTOP (Evita que el navbar superior tape el contenido) */}
            <div className="hidden md:block h-28" />

            {/* CONTENIDO PRINCIPAL */}
            <main className="max-w-6xl mx-auto px-5 pt-6 md:pt-0">
                
                {/* Banner Informativo */}
                <div className="mb-8 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 text-sm text-cyan-100 flex items-center gap-3 shadow-inner">
                    <Activity className="text-cyan-400 shrink-0" size={20} />
                    <p>Este portal incluye gestión de citas, calculadora nutricional y una pestaña financiera para medir ingresos por consultas y planes.</p>
                </div>

                {/* Renderizado Condicional de las Vistas */}
                <div className="mt-2 animate-fade-in">
                    {activeTab === 'citas' && <CitasNutri />}
                    {activeTab === 'calculadora' && <MacroCalculatorForm />}
                    {activeTab === 'dietas' && <DietaRepositorio />}
                    {activeTab === 'financiero' && <NutriFinancialDashboard />}
                </div>

            </main>
        </div>
    );
}

export default NutriPortal;