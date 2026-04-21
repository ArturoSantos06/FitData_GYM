import React from 'react';

function EstadoPago({ cliente }) {
  if (cliente.estadoServicio === 'cancelado') {
    return (
      <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-gray-900/50 text-gray-400 border-gray-600">
        <span className="w-2 h-2 rounded-full mr-2 bg-gray-500"></span>
        Servicio Cancelado
      </div>
    );
  }

  const clases = cliente.pagoAlCorriente
    ? 'bg-green-900/20 text-green-400 border-green-500/50'
    : 'bg-red-900/20 text-red-400 border-red-500/50';
  const semaforo = cliente.pagoAlCorriente ? 'bg-green-500 animate-pulse' : 'bg-red-500';

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${clases}`}>
      <span className={`w-2 h-2 rounded-full mr-2 ${semaforo}`}></span>
      {cliente.pagoAlCorriente ? 'PAGO AL DÍA' : 'PAGO PENDIENTE'}
    </div>
  );
}

function TablaDesvinculacionClientes({ clientes, cargando, onArchivar, onEliminar }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse mt-2">
        <thead>
          <tr className="bg-gray-700 text-left text-gray-300 uppercase text-xs tracking-wider">
            <th className="py-3 px-6">ID</th>
            <th className="py-3 px-6">Cliente</th>
            <th className="py-3 px-6 text-center">Estado de Pago</th>
            <th className="py-3 px-6 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="text-gray-200 text-sm">
          {cargando && (
            <tr>
              <td colSpan="4" className="py-10 text-center text-gray-400 italic">Cargando clientes asignados...</td>
            </tr>
          )}

          {!cargando && clientes.map((cliente) => (
            <tr key={cliente.id} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
              <td className="py-4 px-6"><span className="font-mono text-teal-400 font-bold">#{cliente.id}</span></td>
              <td className="py-4 px-6 font-semibold">{cliente.nombre}</td>
              <td className="py-4 px-6 text-center"><EstadoPago cliente={cliente} /></td>
              <td className="py-4 px-6 text-center">
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => onArchivar(cliente.id)}
                    className="bg-slate-700 hover:bg-slate-600 text-white text-[10px] uppercase font-bold py-1.5 px-3 rounded transition-all"
                  >
                    {cliente.archivado ? 'Desarchivar' : 'Archivar'}
                  </button>
                </div>
              </td>
            </tr>
          ))}

          {!cargando && clientes.length === 0 && (
            <tr>
              <td colSpan="4" className="py-10 text-center text-gray-500 italic">No hay clientes que mostrar.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default TablaDesvinculacionClientes;
