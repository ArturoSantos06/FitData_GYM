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
import BitacoraEntrenador from './components/BitacoraEntrenador';
import GestionEntrenadores from './components/entrenador/GestionEntrenadores';
import CitasTrainer from './components/CitasTrainer';
import FeedbackClie from './components/FeedbackClie';
// Nuevos Componentes Públicos
import LandingPage from './components/LandingPage';
import ClientPortal from './components/ClientPortal';
import ClientLogin from './components/ClientLogin';
import AboutTeam from './components/AboutTeam';
import RutinaEntrenador from './components/entrenador/RutinaEntrenador';
import EntrenadorLogin from './components/entrenador/EntrenadorLogin';
import NutriologoLogin from './components/NutriologoLogin';
import NutriologoPortal from './components/nutriologo/NutriologoPortal';
import ReportesFacturacion from './components/ReportesFacturacion';
import { logoutUser, getCurrentUser, onAuthChanged, getUserByAuthUid, getUserByEmail } from './firebase';
import { AssistantProvider } from './components/asistente/ContextoAsistente';
import AssistantAdminConfig from './components/asistente/ConfiguracionAsistenteAdmin';

function RequireTrainerAuth({ children }) {
  const isTrainerAuthenticated = Boolean(localStorage.getItem('trainer_token'));
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [hasFirebaseSession, setHasFirebaseSession] = useState(() => Boolean(getCurrentUser()));
  const [hasTrainerRole, setHasTrainerRole] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChanged(async (user) => {
      if (!user) {
        setHasFirebaseSession(false);
        setHasTrainerRole(false);
        setIsAuthReady(true);
        return;
      }

      setHasFirebaseSession(true);

      try {
        let role = '';

        const byAuthUid = await getUserByAuthUid(user.uid);
        if (byAuthUid.success) {
          role = String(byAuthUid.data?.role || '').toLowerCase();
        }

        if (!role) {
          const byEmail = await getUserByEmail(user.email || '');
          if (byEmail.success) {
            role = String(byEmail.data?.role || '').toLowerCase();
          }
        }

        const isTrainer = role === 'trainer' || role === 'entrenador';
        setHasTrainerRole(isTrainer);

        if (!isTrainer) {
          localStorage.removeItem('trainer_token');
          localStorage.removeItem('trainer_username');
        }
      } catch {
        setHasTrainerRole(false);
        localStorage.removeItem('trainer_token');
        localStorage.removeItem('trainer_username');
      } finally {
        setIsAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  if (!isTrainerAuthenticated) {
    return <Navigate to="/entrenador/login" replace />;
  }

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center">
        Cargando sesión...
      </div>
    );
  }

  if (!hasFirebaseSession) {
    return <Navigate to="/entrenador/login" replace />;
  }

  if (!hasTrainerRole) {
    return <Navigate to="/entrenador/login" replace />;
  }

  return children;
}

function RequireNutritionistAuth({ children }) {
  const isNutritionistAuthenticated = Boolean(localStorage.getItem('nutritionist_token'));
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [hasFirebaseSession, setHasFirebaseSession] = useState(() => Boolean(getCurrentUser()));
  const [hasNutritionistRole, setHasNutritionistRole] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChanged(async (user) => {
      if (!user) {
        setHasFirebaseSession(false);
        setHasNutritionistRole(false);
        setIsAuthReady(true);
        return;
      }

      setHasFirebaseSession(true);

      try {
        let role = '';

        const byAuthUid = await getUserByAuthUid(user.uid);
        if (byAuthUid.success) {
          role = String(byAuthUid.data?.role || '').toLowerCase();
        }

        if (!role) {
          const byEmail = await getUserByEmail(user.email || '');
          if (byEmail.success) {
            role = String(byEmail.data?.role || '').toLowerCase();
          }
        }

        const nutritionistRoles = [
          'nutritionist',
          'nutriologo',
          'nutriologa',
          'nutriologo/a',
          'nutricionista',
          'nutri'
        ];
        const isNutritionist = nutritionistRoles.includes(role);

        setHasNutritionistRole(isNutritionist);

        if (!isNutritionist) {
          localStorage.removeItem('nutritionist_token');
          localStorage.removeItem('nutritionist_username');
        }
      } catch {
        setHasNutritionistRole(false);
        localStorage.removeItem('nutritionist_token');
        localStorage.removeItem('nutritionist_username');
      } finally {
        setIsAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  if (!isNutritionistAuthenticated) {
    return <Navigate to="/nutriologo/login" replace />;
  }

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center">
        Cargando sesion...
      </div>
    );
  }

  if (!hasFirebaseSession) {
    return <Navigate to="/nutriologo/login" replace />;
  }

  if (!hasNutritionistRole) {
    return <Navigate to="/nutriologo/login" replace />;
  }

  return children;
}

//Componete para el entrenador//
import TrainerPortal from './components/TrainerPortal';

// --- 2. COMPONENTE DE ÁREA DE NUTRIÓLOGO (Privado) ---
function NutriologoArea() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const firebaseUser = localStorage.getItem('firebaseUser');
    if (firebaseUser) setIsAuthenticated(true);
    setIsLoading(false);
  }, []);

  const handleLogin = () => setIsAuthenticated(true);

  const handleLogout = () => {
    localStorage.removeItem('firebaseUser');
    setIsAuthenticated(false);
    window.location.href = "/";
  };

  if (isLoading) {
    return (
      <div className="text-white bg-gray-900 h-screen flex items-center justify-center">
        Cargando...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <NutriologoLogin onLogin={handleLogin} />;
  }

  return <NutriologoPortal onLogout={handleLogout} />;
}

// --- 1. COMPONENTE DE ÁREA DE ADMIN (Privado) ---
function AdminArea() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem('firebaseUser')));
  
  const [refreshList, setRefreshList] = useState(0);
  const [refreshHealthProfiles, setRefreshHealthProfiles] = useState(0);
  
  const handleUserRegistered = () => {
    setRefreshHealthProfiles(prev => prev + 1);
    setRefreshList(prev => prev + 1);
  };
  
  useEffect(() => {
    console.log('🔔 refreshHealthProfiles cambió a:', refreshHealthProfiles);
  }, [refreshHealthProfiles]);

  const handleLogin = () => setIsAuthenticated(true);
  
  const handleLogout = async () => {
    await logoutUser();
    localStorage.removeItem('firebaseUser');
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    // Al salir, redirigir a la Landing Page
    window.location.href = "/"; 
  };

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
          <Route path="registrar" element={<RegisterUser onUserRegistered={handleUserRegistered} />} />
          
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

          
          {/* 8. Gestión de Entrenadores (RF-018) */}
          <Route path="gestion-entrenadores" element={<GestionEntrenadores />} />
          <Route path="reportes-facturas" element={<ReportesFacturacion />} />

          {/* 9. Feedback y comunicación */}
          <Route path="feedback" element={<FeedbackClie />} />

          {/* 12. Configuración Chatbot NLP */}
          <Route path="chatbot" element={<AssistantAdminConfig />} />

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
      <AssistantProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />

        <Route path="/equipo" element={<AboutTeam />} />

        <Route path="/cliente/login" element={<ClientLogin />} />
        <Route path="/cliente" element={<ClientPortal />} />
        <Route path="/nutriologo/login" element={<NutriologoLogin />} />
        <Route path="/nutriologo" element={<NutriologoArea />} />
        <Route path="/entrenador/login" element={<EntrenadorLogin />} />
        <Route
          path="/entrenador"
          element={
            <RequireTrainerAuth>
              <TrainerPortal />
            </RequireTrainerAuth>
          }
        />
        <Route
          path="/entrenador/rutina/:memberId"
          element={
            <RequireTrainerAuth>
              <RutinaEntrenador />
            </RequireTrainerAuth>
          }
        />
        <Route
          path="/entrenador/citas"
          element={
            <RequireTrainerAuth>
              <CitasTrainer />
            </RequireTrainerAuth>
          }
        />
        <Route
          path="/entrenador/bitacora"
          element={
            <RequireTrainerAuth>
              <BitacoraEntrenador />
            </RequireTrainerAuth>
          }
        />

        <Route path="/admin/*" element={<AdminArea />} />

        <Route path="/portal" element={<Navigate to="/entrenador" replace />} />

        {/* Comodín: Cualquier otra cosa redirige al inicio */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AssistantProvider>
    </BrowserRouter>
  );
}

export default App;