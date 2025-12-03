import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// --- MODAL DE SELECCIÓN ---
function UserSelectionModal({ onClose }) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl relative transform transition-all scale-100">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl transition-colors">
          ✕
        </button>
        
        <h3 className="text-2xl font-bold text-white mb-2">Bienvenido a FitData</h3>
        <p className="text-gray-400 mb-8">Selecciona tu perfil:</p>

        <div className="space-y-4">
          <button 
            onClick={() => {
              localStorage.removeItem('token'); 
              navigate('/admin');
            }}
            className="w-full group flex items-center justify-between p-5 bg-gray-800 border border-gray-600 rounded-xl hover:border-purple-500 hover:bg-gray-700 transition-all duration-300"
          >
            <div className="text-left">
              <h4 className="font-bold text-white group-hover:text-purple-400 transition-colors">Administrador</h4>
              <p className="text-xs text-gray-500">Gestión del sistema</p>
            </div>
            <span className="text-2xl grayscale group-hover:grayscale-0 transition-all">🛡️</span>
          </button>

          <button 
            onClick={() => navigate('/cliente')}
            className="w-full group flex items-center justify-between p-5 bg-gray-800 border border-gray-600 rounded-xl hover:border-cyan-500 hover:bg-gray-700 transition-all duration-300"
          >
            <div className="text-left">
              <h4 className="font-bold text-white group-hover:text-cyan-400 transition-colors">Cliente</h4>
              <p className="text-xs text-gray-500">Mi cuenta</p>
            </div>
            <span className="text-2xl grayscale group-hover:grayscale-0 transition-all">💪</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <div className="absolute top-0 left-0 w-full z-30 pt-4 pb-2">
      <div className="container mx-auto flex justify-center items-center">
        <p className="text-xs md:text-sm text-gray-300 tracking-wide drop-shadow-md flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
          <span>📍</span>
          Dirección: Av. Resurgimiento 611, Bosques de Campeche, 24030 San Francisco de Campeche, Camp.
        </p>
      </div>
    </div>
  );
}

// --- HERO SECTION ---
function HeroSection({ onOpenModal }) {
  const navItems = [
    { name: 'INICIO', href: '#home' },
    { name: 'NOSOTROS', href: '#about' },
    { name: 'SERVICIOS', href: '#services' },
    { name: 'NOTICIAS', href: '#news' },
    { name: 'CONTACTO', href: '#contact' },

  ];

  return (
    <header id="home" className="relative w-full h-screen overflow-hidden flex flex-col justify-center items-center">
      
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transform scale-105"
        style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070)' }}
      >
        <div className="absolute inset-0 bg-linear-to-b from-black/80 via-black/40 to-black/90"></div>
      </div>

      <TopBar />

      <div className="relative z-10 text-center px-4 flex flex-col items-center animate-fade-in-up">
        {/* Logo */}
        <div className="mb-6">
             <img src="/fitdata-logo.png" alt="FitData Logo" className="h-32 md:h-40 mx-auto mb-4 drop-shadow-[0_0_25px_rgba(6,182,212,0.6)]" />
        </div>

        <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-2 drop-shadow-lg">
          FitData <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-purple-400">GYM</span>
        </h1>
        
        <div className="w-24 h-1 bg-cyan-400 my-6 rounded-full shadow-[0_0_15px_#22d3ee]"></div>

        <p className="text-gray-200 text-sm md:text-lg tracking-[0.2em] uppercase mb-10 font-light drop-shadow-md">
          PROCESANDO TU TRANSFORMACIÓN
        </p>

        <button 
          onClick={onOpenModal}
          className="bg-white text-black hover:bg-cyan-400 hover:text-black font-bold py-4 px-12 rounded-full text-sm md:text-base uppercase tracking-widest transition-all duration-300 transform hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
        >
          Empezar Ahora
        </button>
      </div>

      {/* 4. NAVBAR INFERIOR */}
      <div className="absolute bottom-0 left-0 w-full z-20 border-t border-white/5 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto">
          <ul className="flex flex-wrap justify-center items-center gap-10 md:gap-20 py-6">
            {navItems.map((item, index) => (
              <li key={index}>
                <a 
                  href={item.href} 
                  className="text-xs md:text-sm font-bold text-gray-400 hover:text-cyan-400 hover:shadow-[0_2px_0_#22d3ee] transition-all duration-300 tracking-widest uppercase pb-1"
                >
                  {item.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

    </header>
  );
}
// --- SECCIÓN SOBRE NOSOTROS ---
function AboutSection() {
  return (
    <section id="about" className="py-16 md:py-24 bg-gray-900 relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        
        {/* Título */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-wide uppercase">
            Sobre <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-600">Nosotros</span>
          </h2>
          <div className="w-20 h-1 bg-cyan-500 mx-auto mt-4 rounded-full"></div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
          
          <div className="w-full md:w-1/2">
              <div className="relative group">
              <div className="absolute -inset-1 bg-linear-to-r from-cyan-400 to-blue-600 rounded-xl blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
              
              <img 
                src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070" 
                alt="Zona de pesas y equipamiento" 
                className="relative rounded-xl shadow-2xl w-full h-64 md:h-[500px] object-cover transition-all duration-500"
              />
            </div>
          </div>

          {/* 2. TEXTO E ICONOS */}
          <div className="w-full md:w-1/2 space-y-8 md:space-y-10">
            
            <div className="flex gap-4 md:gap-6 items-start group">
              <div className="shrink-0">
                <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700 group-hover:border-cyan-400 transition-colors">
                  <svg className="w-6 h-6 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 8h3v8H3zM18 8h3v8h-3z" />
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M7 12h10" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">Equipamiento de Última Generación</h3>
                <p className="text-gray-400 leading-relaxed text-sm md:text-base">
               Contamos con una amplia zona de peso libre, máquinas biomecánicas y equipos de cardio con monitoreo de rendimiento para potenciar tu entrenamiento.
                </p>
              </div>
            </div>

            {/* Item 2 */}
            <div className="flex gap-4 md:gap-6 items-start group">
              <div className="shrink-0">
                <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700 group-hover:border-purple-400 transition-colors">
                  {/* Escudo / seguridad */}
                  <svg className="w-6 h-6 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v5c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V7l7-4z" />
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">Tu Seguridad y Confort</h3>
                <p className="text-gray-400 leading-relaxed text-sm md:text-base">
                  Entrena con tranquilidad gracias a nuestro sistema de cámaras y guardia 24/7, además de duchas privadas con agua caliente siempre disponibles.
                </p>
              </div>
            </div>

            {/* Item 3 */}
            <div className="flex gap-4 md:gap-6 items-start group">
              <div className="shrink-0">
                <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700 group-hover:border-blue-400 transition-colors">
                  {/* Tarjeta / membresía */}
                  <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="5" width="18" height="14" rx="2" ry="2" strokeWidth="2" />
                    <line x1="3" y1="9" x2="21" y2="9" strokeWidth="2" />
                    <rect x="6" y="12" width="6" height="4" strokeWidth="2" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">Membresías a tu Medida</h3>
                <p className="text-gray-400 leading-relaxed text-sm md:text-base">
                  Elige cómo entrenar con planes flexibles como FitData Flex, pases de día o el descuento especial para estudiantes FitData Study.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
// --- SECCIÓN SERVICES (SERVICIOS) ---
function ServicesSection() {
  const [flippedCards, setFlippedCards] = useState([]);

  const services = [
    { 
      title: 'Musculación', 
      icon: 'M3 8h3v8H3zM18 8h3v8h-3zM7 12h10', 
      color: 'group-hover:text-cyan-400',
      description: 'Zona completa de peso libre con mancuernas, barras y discos. Máquinas de última generación para trabajar todos los grupos musculares de forma efectiva y segura.'
    },
    { 
      title: 'Cardio', 
      icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', 
      color: 'group-hover:text-purple-400',
      description: 'Equipos cardiovasculares de alta tecnología: caminadoras, bicicletas estáticas, elípticas y remos. Monitorea tu ritmo cardíaco y quema calorías eficientemente.'
    },
    { 
      title: 'Seguridad', 
      icon: 'M12 3l7 4v5c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V7l7-4zM9 12l2 2 4-4', 
      color: 'group-hover:text-blue-400',
      description: 'Contamos con cámaras de vigilancia 24/7 y guardia de seguridad en el establecimiento para garantizar un entorno seguro mientras te concentras en tu entrenamiento.'
    },
    { 
      title: 'Membresías', 
      icon: 'M3 5h18v14H3V5zM3 9h18M6 12h6v4H6v-4z', 
      color: 'group-hover:text-cyan-400',
      description: (
        <div className="text-left">
          <ul className="space-y-1 list-disc list-inside">
            <li><strong>FullData:</strong> Acceso los 365 días del año.</li>
            <li><strong>FitData Flex:</strong> Acceso por 30 días.</li>
            <li><strong>FitData Study:</strong> Acceso por 30 días para estudiantes.</li>
            <li><strong>FitData Day Pass:</strong> Acceso todo el día.</li>
          </ul>
        </div>
      )
    },
    { 
      title: 'Duchas', 
      icon: 'M12 3v2M12 8v1M8 12h8M9 16l.5 1.5M15 16l-.5 1.5M10 10v2M14 10v2M12 6c-2 0-3 1-3 2h6c0-1-1-2-3-2z', 
      color: 'group-hover:text-purple-400',
      description: 'Regaderas privadas completamente equipadas con agua caliente. Incluye área de vestidores amplios y seguros para tu comodidad después del entrenamiento.'
    },
    { 
      title: 'Wifi Gratis', 
      icon: 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0', 
      color: 'group-hover:text-blue-400',
      description: 'Internet de alta velocidad gratuito en todas nuestras instalaciones. Mantente conectado, escucha tu música favorita o sigue tus rutinas en línea mientras entrenas.'
    },
    { 
      title: 'Lockers', 
      icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', 
      color: 'group-hover:text-cyan-400',
      description: 'Casilleros de seguridad para guardar tus pertenencias mientras entrenas. Sistema de candado personal para tu tranquilidad y la protección de tus objetos de valor.'
    },
    { 
      title: 'Horario', 
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', 
      color: 'group-hover:text-purple-400',
      description: 'Entrena de Lunes a Viernes de 6:00 AM a 10:00 PM y Sábados de 6:00 AM a 2:00 PM. Domingos nos tomamos un descanso para recargar energías.'
    },
  ];

  const toggleFlip = (index) => {
    setFlippedCards(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    
    <section id="services" className="py-24 bg-gray-800 relative">
      <div className="container mx-auto px-6">
        
        {/* Título */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-wide uppercase">
            Nuestros <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-600">Servicios</span>
          </h2>
          <div className="w-20 h-1 bg-cyan-500 mx-auto mt-4 rounded-full shadow-[0_0_10px_#22d3ee]"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <div 
              key={index} 
              onClick={() => toggleFlip(index)}
              className="group relative h-64 cursor-pointer"
              style={{ perspective: '1000px' }}
            >
              <div 
                className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${
                  flippedCards.includes(index) ? 'rotate-y-180' : ''
                }`}
                style={{ 
                  transformStyle: 'preserve-3d',
                  transform: flippedCards.includes(index) ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}
              >
                {/* FRENTE DE LA TARJETA */}
                <div 
                  className="absolute w-full h-full bg-gray-900 border border-gray-700 p-8 rounded-xl hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all duration-300 flex flex-col items-center justify-center text-center backface-hidden"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  {/* Icono */}
                  <div className={`mb-4 transition-colors duration-300 ${service.color} text-gray-400 group-hover:scale-110 transform`}>
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={service.icon}></path>
                    </svg>
                  </div>
                  
                  {/* Título */}
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-3 group-hover:text-white transition-colors">
                    {service.title}
                  </h3>
                  
                  <div className="w-8 h-0.5 bg-gray-600 group-hover:bg-cyan-400 transition-all duration-300 group-hover:w-12"></div>
                  
                  {/* Indicador de click */}
                  <p className="text-xs text-gray-500 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click para más info
                  </p>
                </div>

                {/* REVERSO DE LA TARJETA */}
                <div 
                  className="absolute w-full h-full bg-linear-to-br from-cyan-900/80 to-gray-900 border border-cyan-500/50 p-6 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.2)] flex flex-col items-center justify-center text-center backface-hidden"
                  style={{ 
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)'
                  }}
                >
                  <h3 className="text-lg font-bold text-cyan-400 uppercase tracking-wider mb-4">
                    {service.title}
                  </h3>
                  <p className="text-gray-200 text-sm leading-relaxed">
                    {service.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-4">
                    Click para regresar
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
// --- SECCIÓN NOTICIAS Y EVENTOS ---
function NewsSection() {
  return (
    <section id="news" className="py-24 bg-gray-900 text-white relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        
        {/* Título Principal */}
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold tracking-wide uppercase">
            Noticias y <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-600">Eventos</span>
          </h2>
          <div className="w-20 h-1 bg-cyan-500 mx-auto mt-4 rounded-full shadow-[0_0_10px_#22d3ee]"></div>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* COLUMNA IZQUIERDA:  Avisos */}
          <div className="w-full lg:w-1/3">
            <h3 className="text-2xl font-bold mb-6 text-white">Avisos importantes</h3>
            <div className="bg-linear-to-b from-cyan-900/40 to-blue-900/20 border border-cyan-500/30 p-8 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.1)] h-full">
              <ul className="space-y-6">
                {[
                  "Sorteo navideño por gran apertura: 18 de Diciembre, 2025.",
                  "Participa para ganar 3 membresías FitData Flex en nuestras redes.",
                  "Próximamente: Entrenadores personales en Abril de 2026.",
                  "Nuevo descuento del 50% para estudiantes (FitData Study).",
                  "Seguridad garantizada: Cámaras y guardia 24/7.",
                  "Aviso de horario: Lunes a Sábado (Domingos cerrado).",
                ].map((item, index) => (
                  <li key={index} className="flex items-start group cursor-default">
                    <span className="mr-3 mt-1 text-cyan-400 group-hover:text-white transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </span>
                    <span className="text-gray-300 text-sm font-medium group-hover:text-cyan-200 transition-colors border-b border-transparent group-hover:border-cyan-500/50 pb-1">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* COLUMNA DERECHA: Eventos  */}
          <div className="w-full lg:w-2/3 space-y-12">
            {/* Evento 1 */}
            <div className="flex flex-col md:flex-row items-center gap-8 group">
              <div className="w-40 h-40 shrink-0 relative">
                <div className="absolute inset-0 bg-cyan-500 rounded-full blur opacity-20 group-hover:opacity-50 transition duration-500"></div>
                <img 
                  src="https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=1000" 
                  alt="Inauguración" 
                  className="w-full h-full object-cover rounded-full border-4 border-gray-800 group-hover:border-cyan-400 transition-all duration-500 relative z-10"
                />
              </div>
              <div className="text-center md:text-left">
                <h4 className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">Gran Inauguración FitData</h4>
                <p className="text-cyan-400 font-bold text-sm mb-3 mt-1 uppercase tracking-wider">Jueves 4 de Diciembre, 2025</p>
                <p className="text-gray-400 leading-relaxed text-sm">
                  ¡El día ha llegado! Acompáñanos en el corte de listón oficial. Tendremos DJ en vivo, bocadillos saludables, retos flash con premios y acceso gratuito a todas las instalaciones durante el evento. ¡No faltes!
                </p>
              </div>
            </div>

            {/* Evento 2 */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-8 group">
              <div className="w-40 h-40 shrink-0 relative">
                 <div className="absolute inset-0 bg-purple-400 rounded-full blur opacity-20 group-hover:opacity-50 transition duration-500"></div>
                <img 
                  src="https://images.unsplash.com/photo-1512909006721-3d6018887383?q=80&w=1000" 
                  alt="Sorteo Navideño" 
                  className="w-full h-full object-cover rounded-full border-4 border-gray-800 group-hover:border-purple-400 transition-all duration-500 relative z-10"
                />
              </div>
              <div className="text-center md:text-right">
                <h4 className="text-2xl font-bold text-white group-hover:text-purple-400 transition-colors">Sorteo navideño por apertura</h4>
                <p className="text-purple-400 font-bold text-sm mb-3 mt-1 uppercase tracking-wider">Jueves 18 de diciembre, 2025</p>
                <p className="text-gray-400 leading-relaxed text-sm">
                  Por gran apertura, FitData GYM sorteará 3 membresías FitData Flex, siguiéndonos en nuestras redes sociales y compartiendo la publicación de gran inauguración.
                </p>
              </div>
            </div>

            {/* Evento 3 */}
            <div className="flex flex-col md:flex-row items-center gap-8 group">
              <div className="w-40 h-40 shrink-0 relative">
                <div className="absolute inset-0 bg-blue-500 rounded-full blur opacity-20 group-hover:opacity-50 transition duration-500"></div>
                <img 
                  src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1000" 
                  alt="Entrenador Personal" 
                  className="w-full h-full object-cover rounded-full border-4 border-gray-800 group-hover:border-blue-400 transition-all duration-500 relative z-10"
                />
              </div>
              <div className="text-center md:text-left">
                <h4 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">Próximamente entrenadores personales</h4>
                <p className="text-blue-400 font-bold text-sm mb-3 mt-1 uppercase tracking-wider">28 de Febrero, 2026</p>
                <p className="text-gray-400 leading-relaxed text-sm">
                  En Abril del 2026 implementaremos entrenadores certificados para sesiones personalizadas o grupales. ¡Prepárate para llevar tu entrenamiento al siguiente nivel con la guía experta de nuestros profesionales!
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}

// --- SECCIÓN CONTACTO ---
function ContactSection() {
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    telefono: '',
    email: '',
    mensaje: ''
  });
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre || !formData.email || !formData.mensaje) {
      setMessage('Por favor completa los campos obligatorios: Nombre, Email y Mensaje');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSending(true);
    setMessage('');

    try {
      const response = await fetch('https://formsubmit.co/ajax/fitdatagym@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          apellidos: formData.apellidos,
          telefono: formData.telefono,
          email: formData.email,
          mensaje: formData.mensaje,
          _subject: `Nuevo mensaje de contacto de ${formData.nombre}`,
          _template: 'table'
        })
      });

      if (response.ok) {
        setMessage('¡Mensaje enviado exitosamente! Nos pondremos en contacto contigo pronto.');
        setFormData({
          nombre: '',
          apellidos: '',
          telefono: '',
          email: '',
          mensaje: ''
        });
      } else {
        setMessage('Hubo un error al enviar el mensaje. Por favor intenta de nuevo.');
      }
    } catch (error) {
      setMessage('Error de conexión. Por favor intenta más tarde.');
    } finally {
      setSending(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  return (
    <section id="contact" className="py-24 bg-gray-800 relative">
      <div className="container mx-auto px-6">
        
        {/* Título */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-wide uppercase">
            Contáctanos
          </h2>
          <div className="w-20 h-1 bg-cyan-500 mx-auto mt-4 rounded-full shadow-[0_0_10px_#22d3ee]"></div>
        </div>

        {/* Mapa (Google Maps Embed) */}
        <div className="w-full h-80 bg-gray-800 rounded-xl overflow-hidden shadow-2xl mb-12 border border-gray-700 hover:grayscale-0 transition-all duration-500">
          <iframe 
            width="100%" 
            height="100%" 
            style={{ border: 0 }} 
            loading="lazy" 
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            title="Ubicación FitData GYM"
            src="https://maps.google.com/maps?q=Av.+Resurgimiento+611,+Bosques+de+Campeche,+San+Francisco+de+Campeche&t=&z=15&ie=UTF8&iwloc=&output=embed"
          ></iframe>
        </div>

        {/* Mensaje de estado */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg text-center font-bold ${
            message.includes('exitosamente') 
              ? 'bg-green-500/20 border border-green-500 text-green-400' 
              : 'bg-red-500/20 border border-red-500 text-red-400'
          }`}>
            {message}
          </div>
        )}

        {/* Formulario  */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Izquierda: Mensaje  */}
          <div className="lg:col-span-1">
            <textarea 
              name="mensaje"
              value={formData.mensaje}
              onChange={handleChange}
              placeholder="Tu Mensaje *" 
              required
              className="w-full h-full min-h-[200px] bg-gray-800 border border-white rounded-lg p-4 text-white placeholder-white  focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none"
            ></textarea>
          </div>

          {/* Columna Derecha: Inputs y Botón) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input 
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Nombre(s) *" 
                required
                className="w-full bg-gray-800 border border-white rounded-lg p-4 text-white placeholder-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              />
              <input 
                type="text"
                name="apellidos"
                value={formData.apellidos}
                onChange={handleChange}
                placeholder="Apellidos" 
                className="w-full bg-gray-800 border border-white rounded-lg p-4 text-white placeholder-white  focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input 
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="Teléfono Móvil" 
                className="w-full bg-gray-800 border border-white rounded-lg p-4 text-white placeholder-white  focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              />
              <input 
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Correo Electrónico *" 
                required
                className="w-full bg-gray-800 border border-white rounded-lg p-4 text-white placeholder-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              />
            </div>

            <button 
              type="submit"
              disabled={sending}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black tracking-widest uppercase py-4 rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'ENVIANDO...' : 'ENVIAR MENSAJE'}
            </button>
          </div>

        </form>

      </div>
    </section>
  );
}
// --- FOOTER ---
function FooterSection() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 pt-16 pb-8">
      <div className="container mx-auto px-6">
        
        {/* Contenido Principal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          
          {/* Columna 1: ABOUT US */}
          <div>
            <h3 className="text-xl font-bold text-cyan-400 mb-6 tracking-wide uppercase">Sobre Nosotros</h3>
            <p className="text-gray-400 leading-relaxed text-sm mb-4">
            Somos FitData GYM, tu aliado en el camino hacia una vida más saludable y activa.
            </p>
            <p className="text-gray-400 leading-relaxed text-sm">
            Nos apasiona ayudarte a alcanzar tus objetivos de fitness con instalaciones de primera clase y  un ambiente motivador. ¡Únete a nuestra comunidad y transforma tu vida hoy mismo!
            </p>
          </div>

          {/* Columna 2: CONTACT INFO */}
          <div>
            <h3 className="text-xl font-bold text-cyan-400 mb-6 tracking-wide uppercase">Información de Contacto</h3>
            <ul className="space-y-4">
              <li className="flex items-start text-gray-400 text-sm">
                <span className="text-cyan-400 mr-3 mt-1">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path></svg>
                </span>
                <span>
                  Av. Resurgimiento 611, Bosques de Campeche,<br/>
                  24030 San Francisco de Campeche, Camp.
                </span>
              </li>
              <li className="flex items-center text-gray-400 text-sm">
                <span className="text-cyan-400 mr-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path></svg>
                </span>
                <span>fitdatagym@gmail.com</span>
              </li>
              <li className="flex items-center text-gray-400 text-sm">
                <span className="text-cyan-400 mr-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path></svg>
                </span>
                <span>+52 (981) 185-2169</span>
              </li>
            </ul>
          </div>

          {/* Columna 3: NAVIGATION */}
          <div>
            <h3 className="text-xl font-bold text-cyan-400 mb-6 tracking-wide uppercase">Navegación</h3>
            <ul className="space-y-3 text-sm">
              {['Inicio', 'Nosotros', 'Servicios', 'Noticias', 'Clases', 'Contacto'].map((item, index) => (
                <li key={index}>
                  <a 
                    href={`#${item === 'Inicio' ? 'home' : item === 'Nosotros' ? 'about' : item === 'Servicios' ? 'services' : item === 'Noticias' ? 'news' : item === 'Clases' ? 'classes' : 'contact'}`} 
                    className="text-gray-400 hover:text-white hover:pl-2 transition-all duration-300 flex items-center group"
                  >
                    <span className="text-cyan-500 mr-2 text-xs group-hover:mr-3 transition-all">❯</span> 
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

        </div>

        <div className="border-t border-gray-800 pt-8 text-center">
          <p className="text-gray-500 text-xs">
            &copy; 2025 <span className="text-white font-bold">FitData GYM</span>. Todos los derechos reservados. 
            <span className="mx-2">|</span> 
            <a 
              href="/equipo" 
              className="text-cyan-600 hover:text-cyan-400 transition-colors cursor-pointer underline decoration-transparent hover:decoration-cyan-400"
            >
              Designed by FitData Team
            </a>
          </p>
        </div>

      </div>
    </footer>
  );
}
// --- COMPONENTE PRINCIPAL ---
function LandingPage() {
  const [showModal, setShowModal] = useState(false);

  // NUEVA LÓGICA DE SEGURIDAD
  useEffect(() => {
    localStorage.removeItem('token');
  }, []);

  return (
    <div className="bg-black text-gray-100 font-sans scroll-smooth">
      
      <HeroSection onOpenModal={() => setShowModal(true)} />
      <AboutSection />
      <ServicesSection />
      <NewsSection />
      <ContactSection />
      <FooterSection />
      
      {showModal && <UserSelectionModal onClose={() => setShowModal(false)} />}

    </div>
  );
}

export default LandingPage;