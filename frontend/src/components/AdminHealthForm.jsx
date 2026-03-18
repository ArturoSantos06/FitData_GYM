import React, { useEffect, useState } from 'react';
import { createHealthProfile, getHealthProfileByMemberId, getMemberByEmail } from '../firebase';

export default function AdminHealthForm({ miembroEmail, onClose, onSaved }) {
  const [memberId, setMemberId] = useState(null);
  const [memberName, setMemberName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('form');

  const [formData, setFormData] = useState({
    edad: '',
    condicionCorazon: false,
    presionAlta: false,
    lesionesRecientes: false,
    medicamentos: false,
    comentarios: ''
  });

  useEffect(() => {
    if (!miembroEmail) return;

    const loadMember = async () => {
      setError('');
      setLoading(true);

      try {
        const memberResult = await getMemberByEmail(miembroEmail);
        if (!memberResult.success) {
          throw new Error(memberResult.error || 'Miembro no encontrado');
        }

        setMemberId(memberResult.data.id);
        setMemberName(memberResult.data.nombre || memberResult.data.firstName || miembroEmail);

        const profileResult = await getHealthProfileByMemberId(memberResult.data.id);
        if (profileResult.success && profileResult.data) {
          const hp = profileResult.data;
          setFormData({
            edad: hp.age || '',
            condicionCorazon: hp.heart_condition || false,
            presionAlta: hp.high_blood_pressure || false,
            lesionesRecientes: hp.recent_injuries || false,
            medicamentos: hp.medications || false,
            comentarios: hp.additional_info || ''
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadMember();
  }, [miembroEmail]);

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    const finalValue = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!memberId) {
      setError('No se pudo determinar el ID del miembro.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const result = await createHealthProfile({
        memberId,
        memberName: memberName || miembroEmail,
        userIdDisplay: memberId,
        age: formData.edad ? parseInt(formData.edad, 10) : null,
        heart_condition: formData.condicionCorazon,
        high_blood_pressure: formData.presionAlta,
        recent_injuries: formData.lesionesRecientes,
        medications: formData.medicamentos,
        additional_info: formData.comentarios
      });

      if (!result.success) {
        throw new Error(result.error || 'Error guardando ficha médica');
      }

      setStatus('success');
      if (onSaved) onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-500';
  const labelClass = 'block text-sm font-medium text-slate-300 mb-2';

  return (
    <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">Ficha Médica - {memberName || miembroEmail}</h3>
          <p className="text-xs text-slate-400">Completa los datos iniciales de salud del cliente.</p>
          {memberId && <p className="text-xs text-slate-500 mt-1">ID de Miembro: {memberId}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white text-sm font-semibold"
        >Cerrar</button>
      </div>

      {loading && <p className="text-sm text-slate-400 mt-4">Cargando datos del miembro...</p>}
      {error && <p className="text-sm text-red-400 mt-4">{error}</p>}

      {!loading && !error && status === 'form' && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Edad</label>
              <input
                type="number"
                name="edad"
                value={formData.edad}
                onChange={handleChange}
                className={inputClass}
                min="0"
                placeholder="Ej. 28"
              />
            </div>
            <div>
              <label className={labelClass}>Condición del corazón</label>
              <div className="flex items-center gap-4 mt-1">
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input type="radio" name="condicionCorazon" value="true" checked={formData.condicionCorazon === true} onChange={() => setFormData(prev => ({ ...prev, condicionCorazon: true }))} /> Sí
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input type="radio" name="condicionCorazon" value="false" checked={formData.condicionCorazon === false} onChange={() => setFormData(prev => ({ ...prev, condicionCorazon: false }))} /> No
                </label>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" name="presionAlta" checked={formData.presionAlta} onChange={handleChange} className="w-4 h-4" />
              <label className="text-sm text-slate-200">Presión arterial alta</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" name="lesionesRecientes" checked={formData.lesionesRecientes} onChange={handleChange} className="w-4 h-4" />
              <label className="text-sm text-slate-200">Lesiones recientes</label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" name="medicamentos" checked={formData.medicamentos} onChange={handleChange} className="w-4 h-4" />
            <label className="text-sm text-slate-200">Toma medicamentos</label>
          </div>

          <div>
            <label className={labelClass}>Comentarios adicionales</label>
            <textarea
              name="comentarios"
              value={formData.comentarios}
              onChange={handleChange}
              className={`${inputClass} h-24 resize-none`}
              placeholder="Ej. alergias, medicamentos, etc."
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
            >Cancelar</button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar ficha'}
            </button>
          </div>
        </form>
      )}

      {status === 'success' && (
        <div className="mt-4 p-4 bg-emerald-900/40 border border-emerald-500 rounded-lg">
          <p className="text-sm text-emerald-100">Ficha médica guardada con éxito.</p>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold"
            >Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
