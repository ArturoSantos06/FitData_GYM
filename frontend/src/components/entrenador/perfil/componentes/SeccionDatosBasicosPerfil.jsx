import React from 'react';
import { Building2, DollarSign, Hash, Mail, Phone, User } from 'lucide-react';
import { OPCIONES_CONTRATO } from '../../../../backend/perfilEntrenadorUtilidades';

function SeccionDatosBasicosPerfil({ form, trainerCode, inputClass, labelClass, onChange }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <label className={labelClass}>Código de Entrenador</label>
        <div className="relative"><Hash className="absolute left-3 top-3.5 text-slate-500" size={18} /><input type="text" value={`#${trainerCode || '---'}`} disabled className={inputClass} /></div>
      </div>
      <div>
        <label className={`${labelClass} text-cyan-400 font-semibold`}>Correo Electrónico</label>
        <div className="relative"><Mail className="absolute left-3 top-3.5 text-cyan-400" size={18} /><input type="email" name="email" value={form.email || ''} onChange={onChange} className={`${inputClass} border-cyan-500/30 focus:border-cyan-500 text-white bg-cyan-900/10`} /></div>
      </div>
      <div>
        <label className={`${labelClass} text-indigo-400 font-semibold`}>Usuario</label>
        <div className="relative"><User className="absolute left-3 top-3.5 text-indigo-400" size={18} /><input type="text" name="username" value={form.username || ''} onChange={onChange} className={`${inputClass} border-indigo-500/30 focus:border-indigo-500 text-white bg-indigo-900/10`} /></div>
      </div>
      <div>
        <label className={`${labelClass} text-blue-400 font-semibold`}>Teléfono</label>
        <div className="relative"><Phone className="absolute left-3 top-3.5 text-blue-400" size={18} /><input type="tel" name="telefono" value={form.telefono || ''} onChange={onChange} className={`${inputClass} border-blue-500/30 focus:border-blue-500 text-white bg-blue-900/10`} placeholder="10 dígitos" /></div>
      </div>
      <div>
        <label className={`${labelClass} text-slate-300 font-semibold`}>Nombre(s)</label>
        <div className="relative"><User className="absolute left-3 top-3.5 text-slate-500" size={18} /><input type="text" name="firstName" value={form.firstName || ''} onChange={onChange} className={inputClass} placeholder="Nombre(s)" /></div>
      </div>
      <div>
        <label className={`${labelClass} text-slate-300 font-semibold`}>Apellidos</label>
        <div className="relative"><User className="absolute left-3 top-3.5 text-slate-500" size={18} /><input type="text" name="lastName" value={form.lastName || ''} onChange={onChange} className={inputClass} placeholder="Apellidos" /></div>
      </div>
      <div>
        <label className={`${labelClass} text-amber-300 font-semibold`}>Tipo de Contrato</label>
        <div className="relative">
          <Building2 className="absolute left-3 top-3.5 text-amber-400" size={18} />
          <select name="contractType" value={form.contractType || ''} onChange={onChange} className={`${inputClass} border-amber-500/30 focus:border-amber-500 text-white bg-amber-900/10`}>
            {OPCIONES_CONTRATO.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={`${labelClass} text-cyan-300 font-semibold`}>Costo del Servicio Personal (MXN)</label>
        <div className="relative"><DollarSign className="absolute left-3 top-3.5 text-cyan-400" size={18} /><input type="number" min="0" step="0.01" name="personalServicePrice" value={form.personalServicePrice || ''} onChange={onChange} disabled={!form.offersPersonalService} className={`${inputClass} border-cyan-500/30 focus:border-cyan-500 text-white bg-cyan-900/10`} placeholder="Ej: 499" /></div>
      </div>
      <div>
        <label className={`${labelClass} text-emerald-300 font-semibold`}>Costo del Servicio Grupal (MXN)</label>
        <div className="relative"><DollarSign className="absolute left-3 top-3.5 text-emerald-400" size={18} /><input type="number" min="0" step="0.01" name="groupServicePrice" value={form.groupServicePrice || ''} onChange={onChange} disabled={!form.offersGroupService} className={`${inputClass} border-emerald-500/30 focus:border-emerald-500 text-white bg-emerald-900/10`} placeholder="Ej: 299" /></div>
      </div>
    </div>
  );
}

export default SeccionDatosBasicosPerfil;
