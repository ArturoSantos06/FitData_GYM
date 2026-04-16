import React from 'react';
import ListaClientesBitacora from './ListaClientesBitacora';
import PanelNotasBitacora from './PanelNotasBitacora';
import { useBitacoraEntrenador } from '../../../backend/useBitacoraEntrenador';

function BitacoraEntrenador({ embedded = false }) {
  const {
    mensaje,
    miembrosFiltrados,
    miembroSeleccionado,
    notas,
    textoNota,
    notaEditando,
    terminoBusqueda,
    cargando,
    conteoNotas,
    setTextoNota,
    setTerminoBusqueda,
    seleccionarMiembro,
    guardarNota,
    editarNota,
    eliminarNota,
    cancelarEdicion,
  } = useBitacoraEntrenador();

  return (
    <div className={embedded ? "w-full" : "min-h-screen bg-slate-950 p-4 md:p-8"}>
      
      {/* CAJA PRINCIPAL UNIFICADA  */}
      <div className={`bg-gray-800 p-6 rounded-xl shadow-xl border-t-4 border-purple-500 text-gray-100 font-sans max-w-[1400px] mx-auto ${!embedded && 'mt-6'}`}>
        
        <header className="mb-8 border-b border-gray-700 pb-5">
          <div>
            <h1 className="text-3xl font-bold bg-linear-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent pb-1.5 flex items-center gap-3">
              📝 Bitácora de Notas
            </h1>
            <p className="text-slate-400 font-medium mt-1.5">Sistema de seguimiento técnico - Uso exclusivo de entrenadores</p>
          </div>
        </header>

        {mensaje.text && (
          <div className={`mb-6 p-4 rounded-lg border font-bold ${
            mensaje.type === 'success' 
              ? 'bg-green-900/20 border-green-500 text-green-400' 
              : 'bg-red-900/20 border-red-500 text-red-400'
          }`}>
            {mensaje.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ListaClientesBitacora
            miembros={miembrosFiltrados}
            miembroSeleccionado={miembroSeleccionado}
            terminoBusqueda={terminoBusqueda}
            conteoNotas={conteoNotas}
            onBuscar={setTerminoBusqueda}
            onSeleccionar={seleccionarMiembro}
          />

          <PanelNotasBitacora
            miembroSeleccionado={miembroSeleccionado}
            notas={notas}
            cargando={cargando}
            textoNota={textoNota}
            notaEditando={notaEditando}
            onCambiarTexto={setTextoNota}
            onGuardar={guardarNota}
            onCancelarEdicion={cancelarEdicion}
            onEditar={editarNota}
            onEliminar={eliminarNota}
          />
        </div>
      </div>
    </div>
  );
}

export default BitacoraEntrenador;