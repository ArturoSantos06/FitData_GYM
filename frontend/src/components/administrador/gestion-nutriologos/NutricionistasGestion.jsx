import React from 'react';
import { Stethoscope } from 'lucide-react';

function NutricionistasGestion({
  nutriologos,
  nutriologosInactivos,
  idNutriologoDesactivando,
  idNutriologoReactivando,
  onDesactivarNutriologodescrip,
  onReactivarNutriologodescrip,
}) {
  return (
    <>
      {/* Tabla de Nutriólogos Activos */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Stethoscope size={22} className="text-blue-300" />
            Nutriólogos Contratados ({nutriologos.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/80">
              <tr>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Nutriólogo</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Especialidad</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Clientes Asignados</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {nutriologos.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-gray-400">No hay nutriólogos contratados.</td>
                </tr>
              ) : (
                nutriologos.map((nutritionist) => (
                  <tr key={nutritionist.id} className="hover:bg-gray-700/20 transition-colors">
                    <td className="py-4 px-6">
                      <p className="text-white font-semibold">{nutritionist.name}</p>
                      <p className="text-gray-400 text-xs">{nutritionist.email}</p>
                    </td>
                    <td className="py-4 px-6 text-blue-300 text-sm">{nutritionist.specialty || 'Nutrición general'}</td>
                    <td className="py-4 px-6 text-cyan-300 font-bold text-lg">{nutritionist.clientsCount || 0}</td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => onDesactivarNutriologodescrip(nutritionist)}
                        disabled={idNutriologoDesactivando === nutritionist.id}
                        className="px-4 py-2 rounded-lg font-semibold text-sm transition-all bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {idNutriologoDesactivando === nutritionist.id ? 'Descontratando...' : 'Descontratar'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla de Nutriólogos Inactivos */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 shadow-xl overflow-hidden mt-6">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Stethoscope size={22} className="text-yellow-300" />
            Nutriólogos Inactivos ({nutriologosInactivos.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/80">
              <tr>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Nutriólogo</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Especialidad</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {nutriologosInactivos.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center py-8 text-gray-400">No hay nutriólogos inactivos.</td>
                </tr>
              ) : (
                nutriologosInactivos.map((nutritionist) => (
                  <tr key={`inactive_${nutritionist.id}`} className="hover:bg-gray-700/20 transition-colors">
                    <td className="py-4 px-6">
                      <p className="text-white font-semibold">{nutritionist.name}</p>
                      <p className="text-gray-400 text-xs">{nutritionist.email}</p>
                    </td>
                    <td className="py-4 px-6 text-blue-300 text-sm">{nutritionist.specialty || 'Nutrición general'}</td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => onReactivarNutriologodescrip(nutritionist)}
                        disabled={idNutriologoReactivando === nutritionist.id}
                        className="px-4 py-2 rounded-lg font-semibold text-sm transition-all bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {idNutriologoReactivando === nutritionist.id ? 'Recontratando...' : 'Recontratar'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default NutricionistasGestion;
