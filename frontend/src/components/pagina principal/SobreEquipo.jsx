import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function AboutTeam() {
  const navigate = useNavigate();
  const [stackVersion, setStackVersion] = useState('actual');

  const teamMembers = [
    { name: 'Arturo Santos', role: 'Full Stack Developer', avatar: 'AS', image: 'ArturoSantos.png' },
    { name: 'Leonardo Castillo', role: 'Full Stack Developer', avatar: 'LC', image: 'Leonardo.jpeg' },
    { name: 'Joely Balam', role: 'Full Stack Developer', avatar: 'JB', image: 'JoelyBalam.jpg' },
    { name: 'Agustín Hernández', role: 'Full Stack Developer', avatar: 'AH', image: 'Agustin1.jpeg' }
  ];
  
  const legacyTechnologies = {
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
        { name: 'Protected Routes', description: 'AdminArea y Portal verifican el token antes de mostrar contenido, redirigen a login si no hay autenticación' },
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

  const currentTechnologies = {
    frontend: {
      title: 'Frontend',
      icon: '💻',
      items: [
        { name: 'JavaScript', description: 'Lenguaje base para la capa de interfaz y lógica de cliente.' },
        { name: 'React', description: 'Construcción de interfaces modulares para cliente, entrenador y nutriólogo.' },
        { name: 'React Router', description: 'Navegación por rutas y control de vistas protegidas por rol.' },
        { name: 'Vite', description: 'Entorno de desarrollo rápido y build optimizado para producción.' },
        { name: 'Tailwind CSS', description: 'Sistema de estilos utilitario para interfaces responsivas.' }
      ],
      concepts: [
        'Estado local y global por módulo',
        'Componentes reutilizables por dominio (cliente, entrenador, nutriólogo)',
        'Renderizado condicional por permisos',
        'Persistencia de contexto con LocalStorage',
        'Eventos y formularios controlados',
        'Consumo asíncrono de servicios Firebase',
        'UX responsive para escritorio y móvil'
      ]
    },
    backend: {
      title: 'Backend y Servicios',
      icon: '🛠️',
      items: [
        { name: 'Firebase Authentication', description: 'Autenticación principal para usuarios con control por sesión.' },
        { name: 'Cloud Firestore', description: 'Base de datos principal en tiempo real para perfiles, citas, notas y operaciones.' },
        { name: 'Firebase Storage', description: 'Almacenamiento de archivos como imágenes de perfil y recursos multimedia.' },
        { name: 'Firebase Cloud Functions (Node.js)', description: 'Lógica serverless para automatizaciones y procesos de backend.' }
      ],
      concepts: [
        'Arquitectura híbrida (Firebase + legado)',
        'Serverless para tareas desacopladas',
        'Sincronización de datos por colecciones',
        'Reglas de acceso por documento',
        'Migración progresiva por módulos'
      ]
    },
    database: {
      title: 'Base de Datos',
      icon: '💾',
      local: [
        { name: 'Firebase Emulator Suite', description: 'Pruebas locales de Auth, Firestore y Functions durante desarrollo.' }
      ],
      cloud: [
        { name: 'Cloud Firestore', description: 'Base NoSQL administrada para datos operativos del sistema.' },
        { name: 'Firebase Storage', description: 'Almacenamiento en la nube para assets y archivos de usuarios.' }
      ],
      concepts: [
        'Colecciones y documentos',
        'Consultas indexadas en Firestore',
        'Estructura por dominios de negocio',
        'Consistencia eventual y lectura en tiempo real',
        'Reglas de seguridad por rol y recurso'
      ]
    },
    libraries: {
      title: 'Bibliotecas y Dependencias',
      icon: '📦',
      items: [
        { name: 'Firebase SDK', description: 'Integración de Authentication, Firestore, Storage y utilidades en frontend.' },
        { name: 'Lucide React', description: 'Iconografía consistente en paneles y navegación.' },
        { name: 'ESLint', description: 'Validación de calidad y estandarización de código.' },
        { name: 'FormSubmit', description: 'Procesamiento del formulario de contacto público.' },
        { name: 'Node.js (Functions)', description: 'Runtime para funciones serverless en Firebase.' }
      ]
    },
    apis: {
      title: 'APIs y Servicios Externos',
      icon: '🔌',
      items: [
        { name: 'Firebase Auth API', description: 'Registro, login y validación de identidad.' },
        { name: 'Firestore API', description: 'Lectura y escritura de datos de la aplicación.' },
        { name: 'Firebase Storage API', description: 'Gestión de archivos y recursos multimedia.' },
        { name: 'Google Maps Embed', description: 'Ubicación pública del gimnasio en la landing page.' }
      ]
    },
    security: {
      title: 'Autenticación y Seguridad',
      icon: '🔐',
      items: [
        { name: 'Firebase Auth Session Control', description: 'Control de sesión del usuario autenticado en cada portal.' },
        { name: 'Firestore Security Rules', description: 'Restricciones de lectura y escritura por rol y propiedad de datos.' },
        { name: 'Storage Security Rules', description: 'Protección de archivos según autenticación y permisos.' },
        { name: 'Role-based UI Guard', description: 'Validación de vistas por perfil: admin, cliente, entrenador y nutriólogo.' },
        { name: 'LocalStorage Sanitization', description: 'Limpieza de datos de sesión al cerrar sesión o expirar contexto.' }
      ],
      concepts: [
        'Autenticación centralizada',
        'Autorización declarativa en reglas',
        'Control de acceso por rol',
        'Rutas protegidas en frontend',
        'Manejo seguro de sesiones'
      ]
    },
    deployment: {
      title: 'Despliegue y DevOps',
      icon: '🚀',
      items: [
        { name: 'Firebase Hosting', description: 'Publicación de frontend y configuración de rutas.' },
        { name: 'Firebase Functions Deploy', description: 'Despliegue de lógica serverless para procesos backend.' },
        { name: 'Firebase Console (App)', description: 'Administración centralizada de la app, entornos y servicios en producción.' },
        { name: 'Git & GitHub', description: 'Versionado, colaboración y trazabilidad de cambios.' }
      ]
    }
  };

  const technologies = stackVersion === 'actual' ? currentTechnologies : legacyTechnologies;

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
            <div className="mt-8 inline-flex items-center bg-gray-900 border border-gray-800 rounded-xl p-1 gap-1">
              <button
                onClick={() => setStackVersion('actual')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  stackVersion === 'actual'
                    ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.35)]'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                Stack Actual (Firebase)
              </button>
              <button
                onClick={() => setStackVersion('anterior')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  stackVersion === 'anterior'
                    ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.35)]'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                Stack Anterior
              </button>
            </div>
            <p className="text-gray-400 text-sm mt-4 max-w-3xl mx-auto">
              Consulta la arquitectura vigente basada en Firebase o revisa la versión histórica utilizada en etapas anteriores del proyecto.
            </p>
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
              <h4 className="text-xl font-bold text-cyan-400 mb-6">{stackVersion === 'actual' ? 'Conceptos de Arquitectura Actual' : 'Conceptos de Django'}</h4>
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
            FitData GYM © 2026
          </p>
        </div>

      </div>
    </div>
  );
}

export default AboutTeam;
