import React from 'react';

function NutrientRow({ label, grams, percent, colorClass }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-black ${colorClass}`}>{grams} g</p>
      <p className="text-xs text-slate-500">{percent}% del total calorico</p>
    </div>
  );
}

function TarjetaResultadosMacros({ result }) {
  if (!result) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6">
        <h3 className="text-lg font-bold text-white">Resultados del paciente</h3>
        <p className="mt-2 text-sm text-slate-400">
          Completa los datos y ejecuta el calculo para obtener los requerimientos exactos de carbohidratos, proteina y grasas.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/70 p-6 shadow-xl shadow-cyan-950/20">
      <h3 className="text-lg font-bold text-white">Objetivo diario calculado</h3>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <NutrientRow
          label="Carbohidratos"
          grams={result.carbGrams}
          percent={result.split.carbsPercent}
          colorClass="text-amber-300"
        />
        <NutrientRow
          label="Proteina"
          grams={result.proteinGrams}
          percent={result.split.proteinPercent}
          colorClass="text-emerald-300"
        />
        <NutrientRow
          label="Grasas"
          grams={result.fatGrams}
          percent={result.split.fatPercent}
          colorClass="text-fuchsia-300"
        />
      </div>

      <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-300">
        <p>
          Calorias objetivo: <span className="font-bold text-white">{result.kcal} kcal</span>
        </p>
        <p>
          Tasa metabolica basal (BMR): <span className="font-bold text-white">{result.bmr} kcal</span>
        </p>
        <p>
          Calorias de mantenimiento: <span className="font-bold text-white">{result.maintenanceKcal} kcal</span>
        </p>
      </div>
    </div>
  );
}

export default TarjetaResultadosMacros;
