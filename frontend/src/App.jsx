import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Componentes existentes (Admin)
import Login from './components/Login';
import Navbar from './components/Navbar';
import Home from './components/Home'; // El Dashboard del Admin
import RegisterUser from './components/RegisterUser';
import AssignMembership from './components/AssignMembership';
import UserMembershipList from './components/UserMembershipList';
import MembershipAdmin from './components/MembershipAdmin';
import PuntoDeVenta from './components/PuntoDeVenta';
import Inventario from './components/Inventario';
import CheckInOut from './components/CheckInOut';
import HealthProfilesAdmin from './components/HealthProfilesAdmin';
// Nuevos Componentes Públicos
import LandingPage from './components/LandingPage';
import ClientPortal from './components/ClientPortal';
import ClientLogin from './components/ClientLogin';

// --- 1. COMPONENTE DE ÁREA DE ADMIN (Privado) ---
function AdminArea() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [refreshList, setRefreshList] = useState(0);
  const [refreshHealthProfiles, setRefreshHealthProfiles] = useState(0);
  
  useEffect(() => {
    console.log('🔔 refreshHealthProfiles cambió a:', refreshHealthProfiles);
  }, [refreshHealthProfiles]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setIsAuthenticated(true);
    setIsLoading(false);
  }, []);

  const handleLogin = () => setIsAuthenticated(true);
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    // Al salir, redirigir a la Landing Page
    window.location.href = "/"; 
  };

  if (isLoading) return <div className="text-white bg-gray-900 h-screen flex items-center justify-center">Cargando...</div>;

  // Si NO está autenticado, mostramos el Login del Admin
  if (!isAuthenticated) {
    return (
      <div className="bg-gray-900 min-h-screen flex items-center justify-center">
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen flex flex-col">
      <Navbar onLogout={handleLogout} />
      <main className="grow container mx-auto p-6 md:p-8">
        <Routes>
          
          {/* 1. Dashboard Principal */}
          <Route path="/" element={<Home />} />
          
          {/* 2. Registrar Clientes Nuevos */}
          <Route path="registrar" element={<RegisterUser onUserRegistered={() => setRefreshHealthProfiles(prev => prev + 1)} />} />
          
          {/* 3. Asignar/Renovar Membresías */}
          <Route path="asignar" element={
            <div className="space-y-8">
               <AssignMembership onSuccess={() => setRefreshList(prev => prev + 1)} />
               
               <UserMembershipList refreshTrigger={refreshList} />
            </div>
          } />
          
          {/* 4. Configuración de Tipos de Membresía */}
          <Route path="configuracion" element={<MembershipAdmin />} />
          
          {/* 5. Punto de Venta */}
          <Route path="ventas" element={<PuntoDeVenta />} /> 
          <Route path="inventario" element={<Inventario />} />
          
          {/* 6. Check In/Out con QR */}
          <Route path="check-in-out" element={<CheckInOut />} />

          {/* 7. Fichas Médicas (Health Profiles) */}
          <Route path="fichas-medicas" element={<HealthProfilesAdmin refreshTrigger={refreshHealthProfiles} />} />
          
          <Route path="*" element={<Navigate to="/admin" />} />
        </Routes>
      </main>
    </div>
  );
}

// --- 2. APP PRINCIPAL (Rutas Globales) ---
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta Pública: Landing Page (Inicio) */}
        <Route path="/" element={<LandingPage />} />

        {/* Rutas de Cliente */}
        <Route path="/cliente/login" element={<ClientLogin />} />
        <Route path="/cliente" element={<ClientPortal />} />

        {/* Ruta Privada: Área de Admin (Todo lo que empiece con /admin) */}
        <Route path="/admin/*" element={<AdminArea />} />

        {/* Comodín: Cualquier otra cosa redirige al inicio */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;