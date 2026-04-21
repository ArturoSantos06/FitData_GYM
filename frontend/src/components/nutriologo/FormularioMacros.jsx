import React, { useMemo, useState } from 'react';
import TarjetaResultadosMacros from './TarjetaResultadosMacros';
import { calculateMacroTargets, nutritionFormulaInfo } from '../../utils/nutritionCalculations';

const defaultForm = {
  sex: 'hombre',
  age: '',
  weightKg: '',
  heightCm: '',
  activityLevel: 'moderado',
  goal: 'mantener'
};

function FormularioMacros() {
  const [form, setForm] = useState(defaultForm);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const activityOptions = useMemo(
    () => [
      { value: 'sedentario', label: 'Sedentario' },
      { value: 'ligero', label: 'Ligero (1-3 dias/semana)' },
      { value: 'moderado', label: 'Moderado (3-5 dias/semana)' },
      { value: 'intenso', label: 'Intenso (6-7 dias/semana)' },
      { value: 'atleta', label: 'Atleta / doble sesion' }
    ],
    []
  );

  const goalOptions = useMemo(
    () => [
      { value: 'perder_grasa', label: 'Perder grasa' },
      { value: 'mantener', label: 'Mantener peso' },
      { value: 'ganar_musculo', label: 'Ganar musculo' }
    ],
    []
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');

    try {
      const calculatedResult = calculateMacroTargets(form);
      setResult(calculatedResult);
    } catch (submitError) {
      setResult(null);
      setError(submitError.message || 'No se pudo ejecutar el calculo');
    }
  };

  return (
    <div className="mx-auto mt-4 max-w-7xl overflow-hidden rounded-2xl border border-slate-700 bg-gray-800 shadow-2xl relative">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-blue-500 via-cyan-400 to-teal-400 z-10" />

      <div className="relative z-10 p-4 md:p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl"
          >
            <h2 className="text-xl font-bold text-white">Datos del paciente</h2>
            <p className="mt-1 text-sm text-slate-400">{nutritionFormulaInfo.formula}</p>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm text-slate-300">
                Sexo
                <select
                  name="sex"
                  value={form.sex}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
                >
                  <option value="hombre">Hombre</option>
                  <option value="mujer">Mujer</option>
                </select>
              </label>

              <label className="text-sm text-slate-300">
                Edad
                <input
                  name="age"
                  value={form.age}
                  onChange={handleChange}
                  type="number"
                  min="10"
                  max="100"
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
                  placeholder="Ej. 32"
                  required
                />
              </label>

              <label className="text-sm text-slate-300">
                Peso (kg)
                <input
                  name="weightKg"
                  value={form.weightKg}
                  onChange={handleChange}
                  type="number"
                  min="30"
                  max="250"
                  step="0.1"
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
                  placeholder="Ej. 78.5"
                  required
                />
              </label>

              <label className="text-sm text-slate-300">
                Altura (cm)
                <input
                  name="heightCm"
                  value={form.heightCm}
                  onChange={handleChange}
                  type="number"
                  min="120"
                  max="240"
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
                  placeholder="Ej. 175"
                  required
                />
              </label>

              <label className="text-sm text-slate-300 sm:col-span-2">
                Nivel de actividad
                <select
                  name="activityLevel"
                  value={form.activityLevel}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
                >
                  {activityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-300 sm:col-span-2">
                Objetivo nutricional
                <select
                  name="goal"
                  value={form.goal}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
                >
                  {goalOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-500 bg-red-900/20 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="mt-6 w-full rounded-xl bg-cyan-600 py-3 font-bold text-white transition-colors hover:bg-cyan-500"
            >
              Ejecutar algoritmo de macronutrientes
            </button>
          </form>

          <TarjetaResultadosMacros result={result} />
        </div>
      </div>
    </div>
  );
}

export default FormularioMacros;
