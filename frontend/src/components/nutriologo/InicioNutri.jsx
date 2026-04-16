import React from 'react';

function InicioNutri() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-6 text-gray-100 animate-fade-in">
      
      {/* Logo y Bienvenida */}
      <div className="mb-10 mt-4">
        <img 
          src="/fitdata-logo.png" 
          alt="FitData Nutrition Logo" 
          className="mx-auto h-24 md:h-32 mb-6 drop-shadow-lg" 
        />
        <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 tracking-tight leading-tight mb-2">
          Portal del Nutriólogo
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 mt-3 tracking-wide uppercase font-medium">
          Transforma vidas a través de la nutrición
        </p>
      </div>

      {/* Tarjetas de Misión y Visión */}
      <div className="grid md:grid-cols-2 gap-10 max-w-5xl w-full">
        {/* Tarjeta Misión */}
        <div className="bg-slate-800 p-8 rounded-xl shadow-xl border border-emerald-800/40 hover:shadow-2xl hover:shadow-emerald-900/20 transition-all duration-300 transform hover:-translate-y-1">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-300 font-bold mb-2">Misión</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Nuestro Propósito</h2>
          <p className="text-gray-300 leading-relaxed text-lg">
            Guiar a cada paciente hacia sus objetivos de bienestar mediante planes de alimentación personalizados, basados en evidencia científica y adaptados a su estilo de vida.
          </p>
        </div>

        {/* Tarjeta Visión */}
        <div className="bg-slate-800 p-8 rounded-xl shadow-xl border border-teal-800/40 hover:shadow-2xl hover:shadow-teal-900/20 transition-all duration-300 transform hover:-translate-y-1">
          <p className="text-sm uppercase tracking-[0.2em] text-teal-300 font-bold mb-2">Visión</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Nuestra Meta</h2>
          <p className="text-gray-300 leading-relaxed text-lg">
            Ser el laboratorio de nutrición referente en FitData GYM, destacando por la educación nutricional, el seguimiento preciso y la salud integral a largo plazo.
          </p>
        </div>
      </div>
      
    </div>
  );
}

export default InicioNutri;