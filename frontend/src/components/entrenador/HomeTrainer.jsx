import React from 'react';

function HomeTrainer() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-6 text-gray-100 animate-fade-in">
      
      {/* Logo y Bienvenida */}
      <div className="mb-10 mt-4">
        <img 
          src="/fitdata-logo.png" 
          alt="FitData GYM Logo" 
          className="mx-auto h-24 md:h-32 mb-6 drop-shadow-lg" 
        />
        <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-cyan-400 via-blue-400 to-teal-400 tracking-tight leading-tight mb-2">
          Portal del Entrenador
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 mt-3">
          GESTIONA Y POTENCIA A TUS ALUMNOS
        </p>
      </div>

      {/* Tarjetas de Misión y Visión */}
      <div className="grid md:grid-cols-2 gap-10 max-w-5xl w-full">
        {/* Tarjeta Misión */}
        <div className="bg-slate-800 p-8 rounded-xl shadow-xl border border-cyan-800/40 hover:shadow-2xl hover:shadow-cyan-900/20 transition-all duration-300 transform hover:-translate-y-1">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-300 font-bold mb-2">Misión</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Nuestro Propósito</h2>
          <p className="text-gray-300 leading-relaxed text-lg">
            Acompañar a cada alumno con planes de entrenamiento personalizados, seguimiento constante y una atención profesional que impulse resultados reales de forma segura.
          </p>
        </div>

        {/* Tarjeta Visión */}
        <div className="bg-slate-800 p-8 rounded-xl shadow-xl border border-blue-800/40 hover:shadow-2xl hover:shadow-blue-900/20 transition-all duration-300 transform hover:-translate-y-1">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-300 font-bold mb-2">Visión</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Nuestra Meta</h2>
          <p className="text-gray-300 leading-relaxed text-lg">
            Ser el equipo de entrenamiento referente en FitData GYM, destacando por disciplina, innovación y transformación integral de nuestros alumnos.
          </p>
        </div>
      </div>
      
    </div>
  );
}

export default HomeTrainer;