import React from 'react';
import { Building2, CreditCard, DollarSign, Dumbbell, Hash } from 'lucide-react';
import { OPCIONES_CONTRATO } from '../../../backend/perfilEntrenadorUtilidades';

const trainerSpecialtyOptions = [
  'Entrenamiento Funcional',
  'Fuerza e Hipertrofia',
  'Pérdida de Grasa',
  'Rehabilitación y Movilidad',
  'Alto Rendimiento',
  'Preparación Física General',
  'Otro',
];

function SeccionContratoFiscalPerfil({ form, inputClass, labelClass, onChange }) {
  return (
    <div className="space-y-6">
      <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/30">
        <h3 className="text-sm md:text-base font-semibold text-amber-300 mb-4">Tipo de contrato y servicios</h3>
        <div className="grid md:grid-cols-2 gap-6">
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
            <label className={`${labelClass} text-purple-300 font-semibold`}>Especialidad</label>
            <div className="relative">
              <Dumbbell className="absolute left-3 top-3.5 text-purple-400" size={18} />
              <select
                name="trainer_specialty"
                value={form.trainer_specialty || ''}
                onChange={onChange}
                className={`${inputClass} border-purple-500/30 focus:border-purple-500 text-white bg-purple-900/10`}
              >
                <option value="">-- Selecciona --</option>
                {trainerSpecialtyOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {form.trainer_specialty === 'Otro' && (
            <div>
              <label className={`${labelClass} text-purple-300 font-semibold`}>Especifica la Especialidad</label>
              <div className="relative">
                <Dumbbell className="absolute left-3 top-3.5 text-purple-400" size={18} />
                <input
                  type="text"
                  name="trainer_specialty_other"
                  value={form.trainer_specialty_other || ''}
                  onChange={onChange}
                  className={`${inputClass} border-purple-500/30 focus:border-purple-500 text-white bg-purple-900/10`}
                  placeholder="Ej: Entrenamiento prenatal"
                />
              </div>
            </div>
          )}

          <div>
            <label className={`${labelClass} text-cyan-300 font-semibold`}>Costo del Servicio Personal (MXN)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3.5 text-cyan-400" size={18} />
              <input type="number" min="0" step="0.01" name="personalServicePrice" value={form.personalServicePrice || ''} onChange={onChange} disabled={!form.offersPersonalService} className={`${inputClass} border-cyan-500/30 focus:border-cyan-500 text-white bg-cyan-900/10`} placeholder="Ej: 499" />
            </div>
          </div>

          <div>
            <label className={`${labelClass} text-emerald-300 font-semibold`}>Costo del Servicio Grupal (MXN)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3.5 text-emerald-400" size={18} />
              <input type="number" min="0" step="0.01" name="groupServicePrice" value={form.groupServicePrice || ''} onChange={onChange} disabled={!form.offersGroupService} className={`${inputClass} border-emerald-500/30 focus:border-emerald-500 text-white bg-emerald-900/10`} placeholder="Ej: 299" />
            </div>
          </div>
        </div>
      </div>

      <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/30">
        <h3 className="text-sm md:text-base font-semibold text-fuchsia-300 mb-4">Tipos de servicio ofrecidos</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex items-start gap-3 bg-slate-900/70 border border-slate-700 rounded-xl p-4 cursor-pointer">
            <input type="checkbox" name="offersPersonalService" checked={Boolean(form.offersPersonalService)} onChange={onChange} className="mt-1 h-4 w-4 rounded border-slate-500 text-cyan-500 focus:ring-cyan-500" />
            <div>
              <p className="text-white font-semibold">Servicio personal</p>
              <p className="text-slate-400 text-sm">Entrenamiento uno a uno con precio propio.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 bg-slate-900/70 border border-slate-700 rounded-xl p-4 cursor-pointer">
            <input type="checkbox" name="offersGroupService" checked={Boolean(form.offersGroupService)} onChange={onChange} className="mt-1 h-4 w-4 rounded border-slate-500 text-emerald-500 focus:ring-emerald-500" />
            <div>
              <p className="text-white font-semibold">Servicio grupal</p>
              <p className="text-slate-400 text-sm">Clases o sesiones en grupo con precio propio.</p>
            </div>
          </label>
        </div>
      </div>

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
    </div>
  );
}

export default SeccionContratoFiscalPerfil;
