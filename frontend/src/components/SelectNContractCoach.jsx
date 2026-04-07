import React, { useState } from 'react';

const MOCK_COACHES = [
  { id: 1, name: 'Carlos "Titán" Rodríguez', photo: 'https://i.pravatar.cc/150?u=1', clients: ['Juan Pérez', 'María García', 'Alex Smith'] },
  { id: 2, name: 'Elena Fitness', photo: 'https://i.pravatar.cc/150?u=2', clients: ['Sofía Luna', 'Roberto Carlos'] },
  { id: 3, name: 'Marcos Iron', photo: 'https://i.pravatar.cc/150?u=3', clients: [] },
];

function SelectNContractCoach() {
  const [selectedCoachClients, setSelectedCoachClients] = useState(null);

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Encabezado */}
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-linear-to-r from-purple-400 to-blue-400">
          Contratar Entrenador
        </h1>
        <p className="text-slate-400 text-sm mt-1">Explora los perfiles disponibles y vincula tu cuenta.</p>
      </header>

      {/* Tabla de Entrenadores */}
      <div className="bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden backdrop-blur-md">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/50 text-slate-300 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">Entrenador</th>
              <th className="px-6 py-4 font-semibold">Estado de Red</th>
              <th className="px-6 py-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {MOCK_COACHES.map((coach) => (
              <tr key={coach.id} className="hover:bg-slate-700/20 transition-colors group">
                {/* Perfil */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img 
                        src={coach.photo} 
                        alt={coach.name} 
                        className="w-12 h-12 rounded-full border-2 border-slate-700 group-hover:border-purple-500 transition-colors object-cover"
                      />
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                    </div>
                    <div>
                      <p className="text-white font-medium">{coach.name}</p>
                      <p className="text-xs text-slate-500">Professional Coach</p>
                    </div>
                  </div>
                </td>

                {/* Clientes Vinculados */}
                <td className="px-6 py-4">
                  <button 
                    onClick={() => setSelectedCoachClients(coach)}
                    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
                  >
                    <span className="bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      {coach.clients.length} Clientes
                    </span>
                    <span className="text-[10px]">▼</span>
                  </button>
                </td>

                {/* Botón Contratar */}
                <td className="px-6 py-4 text-right">
                  <button className="px-4 py-2 bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-purple-900/20 transform active:scale-95 transition-all">
                    Vincularse
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Visual de Clientes Vinculados */}
      {selectedCoachClients && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Clientes de {selectedCoachClients.name}</h3>
              <button 
                onClick={() => setSelectedCoachClients(null)}
                className="text-slate-400 hover:text-white"
              >✕</button>
            </div>
            
            <div className="space-y-3">
              {selectedCoachClients.clients.length > 0 ? (
                selectedCoachClients.clients.map((client, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span className="text-slate-200 text-sm">{client}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-sm italic text-center py-4">Este entrenador aún no tiene clientes vinculados.</p>
              )}
            </div>

            <button 
              onClick={() => setSelectedCoachClients(null)}
              className="w-full mt-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Cerrar Lista
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SelectNContractCoach;