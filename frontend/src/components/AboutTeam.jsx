import React from 'react';
import { useNavigate } from 'react-router-dom';

function AboutTeam() {
  const navigate = useNavigate();

  const teamMembers = [
    { name: 'Arturo Santos', role: 'Full Stack Developer', avatar: 'AS', image: 'ArturoSantos.png' },
    { name: 'Leonardo Castillo', role: 'Full Stack Developer', avatar: 'LC', image: 'Leonardo.jpeg' },
    { name: 'Joely Balam', role: 'Full Stack Developer', avatar: 'JB', image: 'JoelyBalam.jpg' },
    { name: 'Agustín Hernández', role: 'Full Stack Developer', avatar: 'AH', image: 'Agustin1.jpeg' }
  ];
  
  const technologies = {
    frontend: {
      title: 'Frontend',
      icon: '💻',
      items: [
        { name: 'JavaScript', description: 'Lenguaje de programación principal del frontend' },
        { name: 'React', description: 'Biblioteca principal para construir interfaces de usuario' },
        { name: 'React Router', description: 'Navegación entre páginas (useNavigate, Routes, Route)' },
        { name: 'Vite', description: 'Build tool y dev server de alta velocidad' },
        { name: 'Tailwind CSS', description: 'Framework de CSS utility-first para diseño responsivo' }
      ],
      concepts: [
        'Manejo de estado local (useState Hook)',
        'Efectos secundarios y ciclo de vida (useEffect Hook)',
        'Navegación programática (useNavigate Hook)',
        'Componentes funcionales (Functional Components)',
        'Props y composición de componentes (Props & Component Composition)',
        'Manejo de eventos - onClick, onChange, onSubmit (Event Handling)',
        'Formularios controlados (Controlled Forms)',
        'Renderizado condicional (Conditional Rendering)',
        'Renderizado de listas con .map() (List Rendering with .map())',
        'Propiedades clave para listas (Key Props)',
        'Desestructuración de props y estado (Destructuring)',
        'Plantillas literales con backticks (Template Literals)',
        'Funciones flecha (Arrow Functions)',
        'Async/Await para peticiones API (Async/Await)',
        'Importar/Exportar módulos (Import/Export Modules)',
        'Operadores ternarios (Ternary Operators)',
        'Almacenamiento local para persistencia (Local Storage)',
      ]
    },
    backend: {
      title: 'Backend',
      icon: '🛠️',
      items: [
        { name: 'Python', description: 'Lenguaje de programación principal del backend paraprocesamiento de datos.' },
        { name: 'Django', description: 'Framework web de alto nivel para desarrollo rápido y seguro de aplicaciones web.' },
        { name: 'Django REST Framework', description: 'Toolkit para construir APIs RESTful que permiten la comunicación entre frontend y backend.' },
        { name: 'Django CORS Headers', description: 'Permite peticiones desde el frontend React hacia el backend Django (Cross-Origin Resource Sharing).' }
      ],
      concepts: [
        'MVT (Model-View-Template)',
        'ORM de Django',
        'Serializers',
        'ViewSets y APIViews',
        'Autenticación y autorización',
        'Middleware personalizado',
        'Gestión de archivos estáticos',
        'Sistema de migraciones'
      ]
    },
    database: {
      title: 'Base de Datos',
      icon: '💾',
      local: [
        { name: 'SQL Server Management Studio 21', description: 'Base de datos local para desarrollo' }
      ],
      cloud: [
        { name: 'Render PostgreSQL', description: 'Servicio de base de datos en la nube' }
      ],
      concepts: [
        'Modelos relacionales',
        'Migraciones automáticas',
        'Queries optimizadas',
        'Índices y claves foráneas',
        'Respaldos y restauración'
      ]
    },
    libraries: {
      title: 'Bibliotecas y Dependencias',
      icon: '📦',
      items: [
        { name: 'Axios', description: 'Cliente HTTP usado para hacer peticiones del frontend React al backend Django (login, registro, membresías).' },
        { name: 'Pillow', description: 'Procesamiento de imágenes de productos, avatares de miembros y fotos de perfil en el sistema.' },
        { name: 'python-decouple', description: 'Manejo seguro de variables de entorno como credenciales de base de datos y claves secretas.' },
        { name: 'whitenoise', description: 'Servir archivos estáticos CSS, JavaScript e imágenes en producción sin necesidad de servidor adicional.' },
        { name: 'gunicorn', description: 'Servidor WSGI de producción para ejecutar la aplicación Django en Render.' },
        { name: 'qrcode', description: 'Generación de códigos QR únicos para cada miembro, usados para check-in/check-out en el gimnasio.' },
      ]
    },
    apis: {
      title: 'APIs y Servicios Externos',
      icon: '🔌',
      items: [
        { name: 'FormSubmit.co', description: 'Servicio de formularios de contacto sin backend' },
        { name: 'Google Maps Embed', description: 'Integración de mapas interactivos' },
        { name: 'Gmail API', description: 'Envío de correos electrónicos transaccionales' }
      ]
    },
    security: {
      title: 'Autenticación y Seguridad',
      icon: '🔐',
      items: [
        { name: 'JWT Tokens', description: 'Generados al hacer login en /admin o /cliente, se envían en cada petición al backend para verificar identidad' },
        { name: 'LocalStorage', description: 'Almacena el token después del login exitoso y se verifica al cargar las páginas protegidas del admin y cliente' },
        { name: 'Protected Routes', description: 'AdminArea y ClientePortal verifican el token antes de mostrar contenido, redirigen a login si no hay autenticación' },
        { name: 'Django Authentication', description: 'Login de adminitrador y cliente login envían credenciales al backend Django que valida usuario/contraseña' },
        { name: 'Password Hashing', description: 'Las contraseñas de administradores y clientes se encriptan automáticamente al registrarse en el sistema' },
        { name: 'CORS Configuration', description: 'Django permite peticiones del frontend React desplegado en Vercel hacia backend en Render' },
        { name: 'Middleware de Autenticación', description: 'cors_middleware.py intercepta todas las peticiones para verificar origen y validar tokens JWT' }
      ],
      concepts: [
        'Autenticación basada en tokens (Token-based Authentication)',
        'Gestión de sesiones (Session Management)',
        'Control de acceso basado en roles (Role-based Access Control)',
        'Validación de tokens en cada petición (Token Validation)',
        'Redirección automática en rutas protegidas (Protected Route Redirects)',
        'Cierre de sesión y limpieza de tokens (Logout & Token Cleanup)',
        'Separación de permisos: Admin vs Cliente (Permission Separation)'
      ]
    },
    deployment: {
      title: 'Despliegue y DevOps',
      icon: '🚀',
      items: [
        { name: 'Render', description: 'Plataforma de despliegue para backend Django' },
        { name: 'Vercel', description: 'Hosting para frontend React' },
        { name: 'Git & GitHub', description: 'Control de versiones y colaboración' },
        { name: 'Environment Variables', description: 'Configuración segura de credenciales' }
      ]
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      
      {/* Header con botón de regreso */}
      <header className="bg-gray-900 border-b border-gray-800 py-6 sticky top-0 z-50 backdrop-blur-lg">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-3 text-cyan-400 hover:text-cyan-300 transition-colors group"
          >
            <svg className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            <span className="font-bold text-lg">Volver al Inicio</span>
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Equipo <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-600">FitData</span>
          </h1>
        </div>
      </header>

      <div className="container mx-auto px-6 py-16">
        
        {/* Sección del Equipo */}
        <section className="mb-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Nuestro <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-600">Equipo</span>
            </h2>
            <div className="w-20 h-1 bg-cyan-500 mx-auto rounded-full shadow-[0_0_10px_#22d3ee]"></div>
            <p className="text-gray-400 mt-6 max-w-2xl mx-auto">
              Estudiantes apasionados por la tecnología, dedicados a crear soluciones innovadoras.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => (
              <div key={index} className="group">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] transition-all duration-300">
                  <div className="w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.4)] group-hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] transition-all border-4 border-cyan-500">
                    <img 
                      src={member.image} 
                      alt={member.name}
                      className="w-full h-full object-cover scale-110"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `<div class="w-full h-full bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-3xl font-bold text-white">${member.avatar}</div>`;
                      }}
                    />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                    {member.name}
                  </h3>
                  <p className="text-gray-400 text-sm">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Stack Tecnológico */}
        <section className="mb-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Stack <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-600">Tecnológico</span>
            </h2>
            <div className="w-20 h-1 bg-cyan-500 mx-auto rounded-full shadow-[0_0_10px_#22d3ee]"></div>
          </div>

          {/* Frontend */}
          <div className="mb-16">
            <div className="flex items-center gap-4 mb-8">
              <span className="text-5xl">{technologies.frontend.icon}</span>
              <h3 className="text-3xl font-bold text-cyan-400">{technologies.frontend.title}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {technologies.frontend.items.map((tech, index) => (
                <div key={index} className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-cyan-500/50 transition-all">
                  <h4 className="text-xl font-bold text-white mb-2">{tech.name}</h4>
                  <p className="text-gray-400 text-sm">{tech.description}</p>
                </div>
              ))}
            </div>

            <div className="bg-gray-900/50 border border-cyan-500/30 rounded-lg p-8">
              <h4 className="text-xl font-bold text-cyan-400 mb-6">Conceptos y Hooks de React</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {technologies.frontend.concepts.map((concept, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">▹</span>
                    <span className="text-gray-300 text-sm">{concept}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Backend */}
          <div className="mb-16">
            <div className="flex items-center gap-4 mb-8">
              <span className="text-5xl">{technologies.backend.icon}</span>
              <h3 className="text-3xl font-bold text-cyan-400">{technologies.backend.title}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {technologies.backend.items.map((tech, index) => (
                <div key={index} className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-cyan-500/50 transition-all">
                  <h4 className="text-xl font-bold text-white mb-2">{tech.name}</h4>
                  <p className="text-gray-400 text-sm">{tech.description}</p>
                </div>
              ))}
            </div>

            <div className="bg-gray-900/50 border border-cyan-500/30 rounded-lg p-8">
              <h4 className="text-xl font-bold text-cyan-400 mb-6">Conceptos de Django</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {technologies.backend.concepts.map((concept, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">▹</span>
                    <span className="text-gray-300 text-sm">{concept}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Base de Datos */}
          <div className="mb-16">
            <div className="flex items-center gap-4 mb-8">
              <span className="text-5xl">{technologies.database.icon}</span>
              <h3 className="text-3xl font-bold text-cyan-400">{technologies.database.title}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h4 className="text-lg font-bold text-white mb-4">Base de Datos Local</h4>
                {technologies.database.local.map((tech, index) => (
                  <div key={index} className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-cyan-500/50 transition-all">
                    <h5 className="text-xl font-bold text-white mb-2">{tech.name}</h5>
                    <p className="text-gray-400 text-sm">{tech.description}</p>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="text-lg font-bold text-white mb-4">Base de Datos en la Nube</h4>
                <div className="space-y-4">
                  {technologies.database.cloud.map((tech, index) => (
                    <div key={index} className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-cyan-500/50 transition-all">
                      <h5 className="text-xl font-bold text-white mb-2">{tech.name}</h5>
                      <p className="text-gray-400 text-sm">{tech.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gray-900/50 border border-cyan-500/30 rounded-lg p-8">
              <h4 className="text-xl font-bold text-cyan-400 mb-6">Conceptos de Base de Datos</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {technologies.database.concepts.map((concept, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">▹</span>
                    <span className="text-gray-300 text-sm">{concept}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bibliotecas */}
          <div className="mb-16">
            <div className="flex items-center gap-4 mb-8">
              <span className="text-5xl">{technologies.libraries.icon}</span>
              <h3 className="text-3xl font-bold text-cyan-400">{technologies.libraries.title}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {technologies.libraries.items.map((tech, index) => (
                <div key={index} className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-cyan-500/50 transition-all">
                  <h4 className="text-lg font-bold text-white mb-2">{tech.name}</h4>
                  <p className="text-gray-400 text-sm">{tech.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* APIs */}
          <div className="mb-16">
            <div className="flex items-center gap-4 mb-8">
              <span className="text-5xl">{technologies.apis.icon}</span>
              <h3 className="text-3xl font-bold text-cyan-400">{technologies.apis.title}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {technologies.apis.items.map((tech, index) => (
                <div key={index} className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-cyan-500/50 transition-all">
                  <h4 className="text-lg font-bold text-white mb-2">{tech.name}</h4>
                  <p className="text-gray-400 text-sm">{tech.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Autenticación y Seguridad */}
          <div className="mb-16">
            <div className="flex items-center gap-4 mb-8">
              <span className="text-5xl">{technologies.security.icon}</span>
              <h3 className="text-3xl font-bold text-cyan-400">{technologies.security.title}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {technologies.security.items.map((tech, index) => (
                <div key={index} className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-cyan-500/50 transition-all">
                  <h4 className="text-lg font-bold text-white mb-2">{tech.name}</h4>
                  <p className="text-gray-400 text-sm">{tech.description}</p>
                </div>
              ))}
            </div>

            <div className="bg-gray-900/50 border border-cyan-500/30 rounded-lg p-8">
              <h4 className="text-xl font-bold text-cyan-400 mb-6">Conceptos de Seguridad Implementados</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {technologies.security.concepts.map((concept, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">▹</span>
                    <span className="text-gray-300 text-sm">{concept}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Despliegue */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <span className="text-5xl">{technologies.deployment.icon}</span>
              <h3 className="text-3xl font-bold text-cyan-400">{technologies.deployment.title}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {technologies.deployment.items.map((tech, index) => (
                <div key={index} className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-cyan-500/50 transition-all">
                  <h4 className="text-lg font-bold text-white mb-2">{tech.name}</h4>
                  <p className="text-gray-400 text-sm">{tech.description}</p>
                </div>
              ))}
            </div>
          </div>

        </section>

        {/* Footer de la página */}
        <div className="text-center border-t border-gray-800 pt-12">
          <p className="text-gray-500 text-sm mb-4">
            Proyecto desarrollado como parte del programa académico
          </p>
          <p className="text-cyan-400 font-bold text-lg">
            FitData GYM © 2025
          </p>
        </div>

      </div>
    </div>
  );
}

export default AboutTeam;
