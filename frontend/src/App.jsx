import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Componentes
import Login from './components/Login';
import Navbar from './components/Navbar';
import Home from './components/Home'; // El Dashboard del Admin
import RegisterUser from './components/RegisterUser';
import AssignMembership from './components/AssignMembership';
import UserMembershipList from './components/UserMembershipList';
import MembershipAdmin from './components/MembershipAdmin';
import LandingPage from './components/LandingPage';
import ClientPortal from './components/ClientPortal';

// --- COMPONENTE ENCAPSULADO DEL ÁREA DE ADMIN ---
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
    // Opcional: Redirigir al Landing al salir
    window.location.href = "/"; 
  };

  if (isLoading) return <div className="text-white bg-gray-900 h-screen">Cargando...</div>;

  // Si no está autenticado, mostramos el Login del Admin
  if (!isAuthenticated) {
    return (
      <div className="bg-gray-900 min-h-screen flex items-center justify-center">
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  // Si es Admin autenticado, mostramos el Dashboard
  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen flex flex-col">
      <Navbar onLogout={handleLogout} />
      <main className="grow container mx-auto p-6 md:p-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/registrar" element={<RegisterUser />} />
          <Route path="/asignar" element={<div className="space-y-6"><AssignMembership /><UserMembershipList /></div>} />
          <Route path="/configuracion" element={<MembershipAdmin />} />
          <Route path="*" element={<Navigate to="/admin" />} />
        </Routes>
      </main>
    </div>
  );
}

// --- APP PRINCIPAL (RUTAS GLOBALES) ---
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta Pública: Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Ruta Pública: Portal Cliente */}
        <Route path="/cliente" element={<ClientPortal />} />

        {/* Ruta Privada: Área de Admin (Contiene sus propias sub-rutas) */}
        <Route path="/admin/*" element={<AdminArea />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;