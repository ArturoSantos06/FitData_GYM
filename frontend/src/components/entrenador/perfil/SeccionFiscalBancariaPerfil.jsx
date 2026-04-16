import React from 'react';
import { CreditCard, Hash } from 'lucide-react';

function SeccionFiscalBancariaPerfil({ form, inputClass, labelClass, onChange }) {
  return (
    <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/30">
      <h3 className="text-sm md:text-base font-semibold text-cyan-300 mb-4">Datos fiscales y bancarios</h3>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className={`${labelClass} text-emerald-300 font-semibold`}>RFC</label>
          <div className="relative">
            <Hash className="absolute left-3 top-3.5 text-emerald-400" size={18} />
            <input type="text" name="rfc" value={form.rfc || ''} onChange={onChange} className={`${inputClass} border-emerald-500/30 focus:border-emerald-500 text-white bg-emerald-900/10 uppercase`} placeholder="Ej: XAXX010101000" maxLength={13} />
          </div>
        </div>

        <div>
          <label className={`${labelClass} text-fuchsia-300 font-semibold`}>CLABE</label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-3.5 text-fuchsia-400" size={18} />
            <input type="text" name="clabe" value={form.clabe || ''} onChange={onChange} className={`${inputClass} border-fuchsia-500/30 focus:border-fuchsia-500 text-white bg-fuchsia-900/10`} placeholder="18 dígitos" inputMode="numeric" maxLength={18} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default SeccionFiscalBancariaPerfil;
