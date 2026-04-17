import React from 'react';

const allowedTypesLabel = 'PDF, JPG o PNG';
const maxTitleLength = 120;
const maxNotesLength = 500;

export default function FormularioSubirDieta({
  handleSubmit,
  title,
  setTitle,
  notes,
  setNotes,
  selectedFile,
  handleFileChange,
  saving,
  loading,
}) {
  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5 shadow-xl">
      <h2 className="text-lg font-semibold text-white">Subir Archivo al Expediente</h2>
      <p className="mt-1 text-sm text-slate-400">Formatos permitidos: {allowedTypesLabel}. Tamaño máximo: 10MB.</p>

      <div className="mt-4 space-y-4">
        <input
          type="text"
          value={title}
          maxLength={maxTitleLength}
          onChange={(event) => setTitle(event.target.value.slice(0, maxTitleLength))}
          placeholder="Título del archivo o plan alimenticio"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
        />

        <textarea
          value={notes}
          maxLength={maxNotesLength}
          onChange={(event) => setNotes(event.target.value.slice(0, maxNotesLength))}
          placeholder="Notas opcionales para el expediente"
          rows={4}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
        />

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-600 bg-slate-950/80 px-4 py-6 text-center transition hover:border-cyan-500 hover:bg-slate-950">
          <span className="text-sm font-medium text-white">Seleccionar archivo</span>
          <span className="mt-1 text-xs text-slate-400">{selectedFile ? `${selectedFile.name} • ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Haz clic para elegir PDF, JPG o PNG'}</span>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={saving || loading}
        className="mt-5 w-full rounded-2xl bg-linear-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:from-cyan-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? 'Guardando archivo...' : 'Guardar en expediente'}
      </button>
    </form>
  );
}