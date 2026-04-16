import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Componentes existentes (Admin)
import Login from './components/admistrador/Login';
import Navbar from './components/admistrador/Navbar';
import Home from './components/admistrador/Home'; // El Dashboard del Admin
import RegisterUser from './components/admistrador/RegisterUser';
import AssignMembership from './components/admistrador/AssignMembership';
import UserMembershipList from './components/admistrador/UserMembershipList';
import MembershipAdmin from './components/admistrador/MembershipAdmin';
import PuntoDeVenta from './components/admistrador/PuntoDeVenta';
import Inventario from './components/admistrador/Inventario';
import CheckInOut from './components/CheckInOut';
import HealthProfilesAdmin from './components/HealthProfilesAdmin';
import BitacoraEntrenador from './components/entrenador/BitacoraEntrenador';
import GestionEntrenadores from './components/admistrador/GestionEntrenadores';
import GestionNutriologos from './components/admistrador/GestionNutriologos';
import CitasTrainer from './components/CitasTrainer';
// Nuevos Componentes Públicos
import LandingPage from './components/LandingPage';
import ClientePortal from './components/ClientePortal';
import ClienteSesion from './components/ClienteSesion';
import AboutTeam from './components/AboutTeam';
import RutinaEntrenador from './components/entrenador/RutinaEntrenador';
import EntrenadorLogin from './components/entrenador/EntrenadorLogin';
import NutriologoLogin from './components/NutriologoLogin';
import NutriPortal from './components/NutriPortal';
import ReportesFacturacion from './components/ReportesFacturacion';
import PortalMantenimiento from './components/mantenimiento/PortalMantenimiento';
import { logoutUser, getCurrentUser, onAuthChanged, getUserByAuthUid, getUserByEmail } from './firebase';
import { AssistantProvider } from './components/asistente/ContextoAsistente';
import AssistantAdminConfig from './components/asistente/ConfiguracionAsistenteAdmin';

//Componete para el entrenador//
import TrainerPortal from './components/TrainerPortal';

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
      <div className="text-white bg-gray-900 min-h-screen flex items-center justify-center">
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
          <Route path="gestion-nutriologos" element={<GestionNutriologos />} />
          <Route path="reportes-facturas" element={<ReportesFacturacion />} />

          {/* 10. Mantenimiento de maquinas */}
          <Route path="mantenimiento" element={<PortalMantenimiento modoSoloAdmin vistaInicial="admin" />} />
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
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    if (hasCoarsePointer) return;

    const interactiveSelector = [
      'input',
      'textarea',
      'select',
      'button',
      'a',
      'label',
      '[role="button"]',
      '[contenteditable="true"]',
      '[data-no-drag-scroll="true"]'
    ].join(',');

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startScrollX = 0;
    let startScrollY = 0;

    const shouldIgnoreTarget = (target) => {
      if (!(target instanceof Element)) return false;
      return Boolean(target.closest(interactiveSelector));
    };

    const onMouseDown = (event) => {
      if (event.button !== 0) return;
      if (shouldIgnoreTarget(event.target)) return;

      isDragging = true;
      startX = event.clientX;
      startY = event.clientY;
      startScrollX = window.scrollX;
      startScrollY = window.scrollY;
      document.body.classList.add('drag-scroll-active');
    };

    const onMouseMove = (event) => {
      if (!isDragging) return;

      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      window.scrollTo({
        left: startScrollX - deltaX,
        top: startScrollY - deltaY,
        behavior: 'auto'
      });
    };

    const endDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.classList.remove('drag-scroll-active');
    };

    window.addEventListener('mousedown', onMouseDown, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('blur', endDrag);

    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', endDrag);
      window.removeEventListener('blur', endDrag);
      document.body.classList.remove('drag-scroll-active');
    };
  }, []);

  return (
    <BrowserRouter>
      <AssistantProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          <Route path="/equipo" element={<AboutTeam />} />

          <Route path="/cliente/login" element={<ClienteSesion />} />
          <Route path="/cliente" element={<ClientePortal />} />
          <Route path="/nutriologo/login" element={<NutriologoLogin />} />

          {/* Ruta protegida del Nutriólogo */}
          <Route
            path="/nutriologo/*"
            element={
              <RequireNutritionistAuth>
                <NutriPortal />
              </RequireNutritionistAuth>
            }
          />

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


          <Route path="/mantenimiento" element={<PortalMantenimiento vistaInicial="usuario" />} />

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