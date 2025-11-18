import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Navbar from './components/Navbar';
import Home from './components/Home';
import RegisterUser from './components/RegisterUser';
import AssignMembership from './components/AssignMembership';
import UserMembershipList from './components/UserMembershipList';
import MembershipAdmin from './components/MembershipAdmin';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setIsAuthenticated(true);
  }, []);

  const handleLogin = () => setIsAuthenticated(true);
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-gray-900 min-h-screen flex items-center justify-center">
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="bg-gray-900 text-gray-100 min-h-screen flex flex-col">
        
        <Navbar onLogout={handleLogout} />

        <main className="grow container mx-auto p-6 md:p-8">
          {/* Aquí definimos qué componente se muestra según la URL */}
          <Routes>
            
            <Route path="/" element={<Home />} />

            <Route path="/registrar" element={<RegisterUser />} />

            <Route path="/asignar" element={
              <div className="space-y-6">
                <AssignMembership />
                <UserMembershipList />
              </div>
            } />

            <Route path="/configuracion" element={<MembershipAdmin />} />

            <Route path="*" element={<Navigate to="/" />} />

          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;