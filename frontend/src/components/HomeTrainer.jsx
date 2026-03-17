import React from 'react';

function HomeTrainer() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-6 md:p-8 border border-slate-800 rounded-xl bg-slate-900/60 text-slate-300">
        <h2 className="text-2xl font-bold text-white mb-2">Portal del Entrenador</h2>
        <p className="text-slate-400">Bienvenido al panel de trabajo FitData GYM. Desde aquí puedes gestionar tus alumnos y su progreso.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-cyan-800/40 bg-linear-to-br from-slate-900 to-[#10253b] p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300 font-bold mb-3">Misión</p>
          <p className="text-slate-200 leading-relaxed">
            Acompañar a cada alumno con planes de entrenamiento personalizados, seguimiento constante y una atención profesional que impulse resultados reales de forma segura.
          </p>
        </div>

        <div className="rounded-xl border border-blue-800/40 bg-linear-to-br from-slate-900 to-[#1a2340] p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-300 font-bold mb-3">Visión</p>
          <p className="text-slate-200 leading-relaxed">
            Ser el equipo de entrenamiento referente en FitData GYM, destacando por disciplina, innovación y transformación integral de nuestros alumnos.
          </p>
        </div>
      </div>
    </div>
  );
}

export default HomeTrainer;