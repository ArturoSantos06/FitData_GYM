import React from 'react';

function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-6 text-gray-100">
      
      {/* Logo */}
      <div className="mb-10 mt-4">
        <img src="/fitdata-logo.png" alt="FitData GYM Logo" className="mx-auto h-32 md:h-48 mb-6 drop-shadow-lg" />
        <h1 className="text-6xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-purple-400 via-blue-400 to-teal-400 tracking-tight leading-tight">
          FitData GYM
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 mt-3">PROCESANDO TU TRANSFORMACIÓN</p>
      </div>

      <div className="grid md:grid-cols-2 gap-10 max-w-5xl w-full">
        <div className="bg-gray-800 p-8 rounded-xl shadow-xl border border-gray-700 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <h2 className="text-3xl font-bold text-purple-400 mb-4">Nuestra Misión</h2>
          <p className="text-gray-300 leading-relaxed text-lg">
            Ser el motor que impulsa a nuestra comunidad a alcanzar sus metas de salud y bienestar, 
            ofreciendo un ambiente inspirador, equipo de vanguardia y programas personalizados.
          </p>
        </div>

        <div className="bg-gray-800 p-8 rounded-xl shadow-xl border border-gray-700 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <h2 className="text-3xl font-bold text-blue-400 mb-4">Nuestra Visión</h2>
          <p className="text-gray-300 leading-relaxed text-lg">
            Transformar la vida de las personas a través del fitness, convirtiéndonos en el gimnasio 
            líder y referente en innovación, compromiso y resultados excepcionales para cada cliente.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Home;