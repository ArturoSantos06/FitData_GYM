import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { dividirNombre, normalizarTipoContrato } from '../../../backend/perfilEntrenadorUtilidades';
import SeccionContratoFiscalPerfil from './SeccionContratoFiscalPerfil';

const trainerSpecialtyOptions = [
  'Entrenamiento Funcional',
  'Fuerza e Hipertrofia',
  'Pérdida de Grasa',
  'Rehabilitación y Movilidad',
  'Alto Rendimiento',
  'Preparación Física General',
  'Otro',
];

function FormularioContratoFiscalEntrenador({ usuario, onGuardar, onVolver }) {
  const nombres = dividirNombre(usuario);
  const specialtyActual = String(
    usuario.specialty ||
    usuario.trainer_specialty ||
    usuario.especialidad ||
    usuario.especialidadPrincipal ||
    usuario.trainerSpecialty ||
    ''
  ).trim();
  const specialtyEsCatalogo = trainerSpecialtyOptions.includes(specialtyActual) && specialtyActual !== 'Otro';

  const [form, setForm] = useState({
    ...usuario,
    firstName: usuario.firstName || nombres.firstName,
    lastName: usuario.lastName || nombres.lastName,
    trainer_specialty: specialtyActual
      ? (specialtyEsCatalogo ? specialtyActual : 'Otro')
      : '',
    trainer_specialty_other: specialtyActual && !specialtyEsCatalogo ? specialtyActual : '',
    telefono: usuario.telefono || usuario.phone || '',
    email: usuario.email || '',
    username: usuario.username || '',
    contractType: normalizarTipoContrato(usuario.contractType || usuario.tipoContrato || usuario.contract_type || usuario.tipo_contrato || ''),
    personalServicePrice: String(usuario.personalServicePrice ?? usuario.personal_service_price ?? usuario.trainerServicePrice ?? usuario.servicePrice ?? usuario.costoServicio ?? usuario.costo_servicio ?? ''),
    groupServicePrice: String(usuario.groupServicePrice ?? usuario.group_service_price ?? usuario.trainerServicePrice ?? usuario.servicePrice ?? usuario.costoServicio ?? usuario.costo_servicio ?? ''),
    offersPersonalService: Boolean(usuario.offersPersonalService ?? usuario.personalServiceEnabled ?? true),
    offersGroupService: Boolean(usuario.offersGroupService ?? usuario.groupServiceEnabled ?? true),
    rfc: usuario.rfc || usuario.RFC || '',
    clabe: usuario.clabe || usuario.CLABE || usuario.cuentaBancaria || usuario.numeroCuenta || usuario.accountNumber || '',
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') return setForm((prev) => ({ ...prev, [name]: checked }));
    if (name === 'trainer_specialty') {
      return setForm((prev) => ({
        ...prev,
        trainer_specialty: value,
        trainer_specialty_other: value === 'Otro' ? prev.trainer_specialty_other : '',
      }));
    }
    if (name === 'telefono') return setForm((prev) => ({ ...prev, [name]: value.replace(/\D/g, '').slice(0, 10) }));
    if (name === 'clabe') return setForm((prev) => ({ ...prev, [name]: value.replace(/\D/g, '').slice(0, 18) }));
    if (name === 'rfc') return setForm((prev) => ({ ...prev, [name]: value.toUpperCase().replace(/[^A-Z0-9&Ñ]/g, '').slice(0, 13) }));
    if (name === 'trainerServicePrice' || name === 'personalServicePrice' || name === 'groupServicePrice') {
      return setForm((prev) => ({ ...prev, [name]: value.replace(/[^0-9.]/g, '') }));
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSaving(true);

    try {
      const rfc = String(form.rfc || '').trim().toUpperCase();
      const clabe = String(form.clabe || '').replace(/\D/g, '').slice(0, 18);
      const personal = Number(String(form.personalServicePrice || '').replace(',', '.'));
      const grupal = Number(String(form.groupServicePrice || '').replace(',', '.'));
      const specialty = String(form.trainer_specialty || '').trim();
      const specialtyOther = String(form.trainer_specialty_other || '').trim();

      if (rfc && rfc.length !== 12 && rfc.length !== 13) throw new Error('El RFC debe tener 12 o 13 caracteres');
      if (clabe && clabe.length !== 18) throw new Error('La CLABE debe tener 18 dígitos');
      if (!specialty) throw new Error('Selecciona una especialidad del entrenador');
      if (specialty === 'Otro' && !specialtyOther) throw new Error('Especifica la especialidad del entrenador');
      if (!form.offersPersonalService && !form.offersGroupService) throw new Error('Debes habilitar al menos un tipo de servicio');
      if (form.offersPersonalService && (!Number.isFinite(personal) || personal <= 0)) throw new Error('Define un precio válido para el servicio personal');
      if (form.offersGroupService && (!Number.isFinite(grupal) || grupal <= 0)) throw new Error('Define un precio válido para el servicio grupal');

      await onGuardar(form);
      setSuccessMsg('Datos actualizados');
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full bg-slate-950 border border-slate-700 rounded-lg p-3 pl-10 text-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const labelClass = 'block text-sm font-medium text-slate-400 mb-1 ml-1';

  return (
    <div className="w-full max-w-2xl bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-4">
        <button onClick={onVolver} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" type="button"><ArrowLeft size={24} /></button>
        <div><h2 className="text-2xl font-bold text-white">Contrato, servicios y datos fiscales</h2><p className="text-slate-400 text-sm">Actualiza tu contrato, tarifas, RFC y CLABE</p></div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <SeccionContratoFiscalPerfil form={form} inputClass={inputClass} labelClass={labelClass} onChange={onChange} />

        {errorMsg && <div className="text-sm text-red-400 bg-red-900/20 border border-red-700 rounded-lg p-3">{errorMsg}</div>}
        {successMsg && <div className="text-sm text-green-400 bg-green-900/20 border border-green-700 rounded-lg p-3">{successMsg}</div>}

        <div className="pt-2 flex gap-3">
          <button type="button" onClick={onVolver} className="w-1/3 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl transition-all">Cancelar</button>
          <button disabled={saving} type="submit" className="w-2/3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-cyan-600/20 transition-all active:scale-95">{saving ? 'Guardando...' : 'Guardar cambios'}</button>
        </div>
      </form>
    </div>
  );
}

export default FormularioContratoFiscalEntrenador;
