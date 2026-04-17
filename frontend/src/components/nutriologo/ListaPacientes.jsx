import React from 'react';

const maxSearchLength = 80;

export default function ListaPacientes({
  loading,
  filteredMembers,
  memberFilter,
  setMemberFilter,
  selectedMemberId,
  handleSelectMember,
  files,
}) {
  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Seleccionar Paciente</h2>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{filteredMembers.length} resultados</span>
        </div>
      </div>
      <input
        type="text"
        value={memberFilter}
        maxLength={maxSearchLength}
        onChange={(event) => setMemberFilter(event.target.value.slice(0, maxSearchLength))}
        placeholder="Buscar por nombre, correo o ID..."
        className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
      />

      <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {loading && (
          <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-6 text-center text-sm text-slate-400">
            Cargando pacientes asignados...
          </p>
        )}

        {!loading && filteredMembers.map((member) => {
          const isSelected = String(selectedMemberId) === String(member.id);
          const memberFileCount = files.filter((file) => String(file.memberId) === String(member.id)).length;

          return (
            <button
              key={member.id}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleSelectMember(member.id);
              }}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                isSelected
                  ? 'border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-950/30'
                  : 'border-slate-700 bg-slate-800/70 hover:border-slate-500 hover:bg-slate-800'
              } focus:outline-none focus:ring-0`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{member.fullName}</p>
                  <p className="mt-1 text-xs text-slate-400">{member.email || 'Sin correo registrado'}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-500">Expediente #{member.id}</p>
                </div>
                <span className="rounded-full bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-200">{memberFileCount}</span>
              </div>
            </button>
          );
        })}

        {!loading && filteredMembers.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-6 text-center text-sm text-slate-400">
            No hay pacientes que coincidan con la búsqueda.
          </p>
        )}
      </div>
    </div>
  );
}