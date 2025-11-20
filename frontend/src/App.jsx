import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Componentes existentes
import Login from './components/Login';
import Navbar from './components/Navbar';
import Home from './components/Home'; 
import RegisterUser from './components/RegisterUser';
import AssignMembership from './components/AssignMembership';
import UserMembershipList from './components/UserMembershipList';
import MembershipAdmin from './components/MembershipAdmin';
import PuntoDeVenta from './components/PuntoDeVenta';

// Nuevos Componentes Públicos
import LandingPage from './components/LandingPage';
import ClientPortal from './components/ClientPortal';

// --- 1. COMPONENTE DE ÁREA DE ADMIN (Privado) ---
function AdminArea() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  // Si SÍ es Admin autenticado, mostramos el Dashboard
  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen flex flex-col">
      <Navbar onLogout={handleLogout} />
      <main className="grow container mx-auto p-6 md:p-8">
        <Routes>
          {/* Rutas Hijas del Admin (Sin la barra '/' al inicio) */}
          <Route path="/" element={<Home />} />
          <Route path="registrar" element={<RegisterUser />} />
          <Route path="asignar" element={<div className="space-y-6"><AssignMembership /><UserMembershipList /></div>} />
          <Route path="configuracion" element={<MembershipAdmin />} />
          <Route path="ventas" element={<PuntoDeVenta />} /> 
          
          {/* Si escriben una ruta admin rara, volver al home del admin */}
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

        {/* Ruta Pública: Portal Cliente */}
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