import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../../firebase';
import NutriNavbar from './NutriNavbar';

import InicioNutri from './InicioNutri';
import FormularioMacros from './FormularioMacros';
import PanelFinanzas from './finanzas/PanelFinanzas';
import CitasNutri from './gestion-pacientes/CitasNutri';
import DietaRepositorio from './DietaRepositorio';
import AsistenteNutricional from './AsistenteNutricional';
import BandejaProfesionales from '../chat/BandejaProfesionales';
import PerfilNutriologo from './PerfilNutriologo';

const NUTRI_PORTAL_TAB_KEY = 'nutri_portal_active_tab';
const NUTRI_ALLOWED_TABS = new Set(['inicio', 'citas', 'calculadora', 'dietas', 'financiero', 'mensajes', 'perfil']);

function NutriPortal() {
const [activeTab, setActiveTab] = useState(() => {
    const savedTab = String(localStorage.getItem(NUTRI_PORTAL_TAB_KEY) || '').trim().toLowerCase();
    return NUTRI_ALLOWED_TABS.has(savedTab) ? savedTab : 'inicio';
});
    const navigate = useNavigate();

    useEffect(() => {
        if (!NUTRI_ALLOWED_TABS.has(activeTab)) return;
        localStorage.setItem(NUTRI_PORTAL_TAB_KEY, activeTab);
    }, [activeTab]);

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
                {activeTab === 'inicio' && <InicioNutri />}
                {activeTab === 'citas' && <CitasNutri embedded />}
                {activeTab === 'calculadora' && <FormularioMacros />}
                {activeTab === 'dietas' && <DietaRepositorio />}
                {activeTab === 'financiero' && <PanelFinanzas />}
                {activeTab === 'mensajes' && <BandejaProfesionales role="nutritionist" />}
                {activeTab === 'perfil' && <PerfilNutriologo />}
            </div>

            {/* El asistente solo es visible en la pestaña de calculadora */}
            {activeTab === 'calculadora' && <AsistenteNutricional />}
        </div>
    );
};

export default NutriPortal;