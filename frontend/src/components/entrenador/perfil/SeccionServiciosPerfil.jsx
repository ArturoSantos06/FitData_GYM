import React from 'react';

function SeccionServiciosPerfil({ form, onChange }) {
  return (
    <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/30">
      <h3 className="text-sm md:text-base font-semibold text-fuchsia-300 mb-4">Tipos de servicio ofrecidos</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <label className="flex items-start gap-3 bg-slate-900/70 border border-slate-700 rounded-xl p-4 cursor-pointer">
          <input type="checkbox" name="offersPersonalService" checked={Boolean(form.offersPersonalService)} onChange={onChange} className="mt-1 h-4 w-4 rounded border-slate-500 text-cyan-500 focus:ring-cyan-500" />
          <div><p className="text-white font-semibold">Servicio personal</p><p className="text-slate-400 text-sm">Entrenamiento uno a uno con precio propio.</p></div>
        </label>

        <label className="flex items-start gap-3 bg-slate-900/70 border border-slate-700 rounded-xl p-4 cursor-pointer">
          <input type="checkbox" name="offersGroupService" checked={Boolean(form.offersGroupService)} onChange={onChange} className="mt-1 h-4 w-4 rounded border-slate-500 text-emerald-500 focus:ring-emerald-500" />
          <div><p className="text-white font-semibold">Servicio grupal</p><p className="text-slate-400 text-sm">Clases o sesiones en grupo con precio propio.</p></div>
        </label>
      </div>
    </div>
  );
}

export default SeccionServiciosPerfil;
