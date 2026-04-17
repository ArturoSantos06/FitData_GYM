import React from 'react';

const maxSearchLength = 80;

const isNutritionistRole = (roleValue) => {
    const role = String(roleValue || '').toLowerCase().trim();
    return ['nutritionist', 'nutriologo', 'nutriologa', 'nutriologo/a', 'nutricionista', 'nutri'].includes(role);
};

export default function ListaArchivosDieta({
  loading,
  sessionRole,
  showAllRecent,
  setShowAllRecent,
  fileFilter,
  setFileFilter,
  selectedMemberId,
  filteredFiles,
  handleDownload,
  requestDelete,
  saving,
}) {
  return (
    <div className="self-start rounded-3xl border border-slate-700 bg-slate-900/80 p-5 shadow-xl">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Archivos Registrados</h2>
          <p className="text-sm text-slate-400">
            {showAllRecent
              ? (isNutritionistRole(sessionRole)
                ? 'Archivos más recientes de tus pacientes asignados.'
                : 'Archivos más recientes de todos los pacientes.')
              : 'Consulta y descarga los archivos del expediente digital.'}
          </p>
        </div>
        <div className="flex gap-2 lg:items-center">
          <button
            type="button"
            onClick={() => setShowAllRecent(!showAllRecent)}
            className={`whitespace-nowrap rounded-lg px-4 py-3 text-sm font-semibold transition ${
              showAllRecent
                ? 'border border-cyan-500 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30'
                : 'border border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-600'
            }`}
          >
            {showAllRecent ? '← Volver' : 'Ver recientes'}
          </button>
          <input
            type="text"
            value={fileFilter}
            maxLength={maxSearchLength}
            onChange={(event) => setFileFilter(event.target.value.slice(0, maxSearchLength))}
            placeholder="Buscar archivo o paciente..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500 lg:w-auto lg:min-w-xs"
          />
        </div>
      </div>

      {loading ? (
        <p className="py-4 text-center text-slate-400">Cargando repositorio...</p>
      ) : !showAllRecent && !selectedMemberId && !fileFilter.trim() ? (
        <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-4 text-center text-sm text-slate-400">
          Selecciona un paciente para ver sus archivos.
        </p>
      ) : filteredFiles.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-4 text-center text-sm text-slate-400">
          No hay archivos registrados {showAllRecent ? 'recientemente' : 'con los filtros actuales'}.
        </p>
      ) : (
        <div className="space-y-3">
          {filteredFiles.map((fileItem) => {
            const date = fileItem.createdAt?.toDate?.() || fileItem.updatedAt?.toDate?.() || null;

            return (
              <div key={fileItem.id} className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-all text-base font-semibold text-white">{fileItem.title || fileItem.originalFileName}</h3>
                      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] uppercase tracking-wide text-cyan-300">
                        {fileItem.contentType === 'application/pdf' ? 'PDF' : 'Imagen'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-300">Paciente: {fileItem.resolvedMemberName || 'Sin nombre'}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{fileItem.originalFileName}</p>
                    {fileItem.notes && <p className="mt-3 wrap-break-word text-sm text-slate-400">{fileItem.notes}</p>}
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                      <span>Subido por: {fileItem.uploadedBy || 'admin'}</span>
                      <span>{date ? date.toLocaleString('es-MX') : 'Sin fecha'}</span>
                      <span>{fileItem.size ? `${(fileItem.size / 1024 / 1024).toFixed(2)} MB` : 'Tamaño no disponible'}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <a
                      href={fileItem.downloadURL}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
                    >
                      Abrir
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDownload(fileItem)}
                      className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
                    >
                      Descargar
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDelete(fileItem)}
                      disabled={saving}
                      className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}