import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, User, ChevronRight, Activity, Hash, Mail, Phone, Edit2, Heart, CheckCircle, Calendar, Send, Lock
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function HealthForm() {
    const [formData, setFormData] = useState({
        nombre: '',
        edad: '',
        telefono: '',
        condicionCorazon: false,
        presionAlta: false,
        lesionesRecientes: false,
        medicamentos: false,
        comentarios: '',
        aceptaWaiver: false
    });

    const [status, setStatus] = useState('idle');
        // Cargar datos de usuario y miembro para auto-rellenar nombre y teléfono y bloquear edición
        useEffect(() => {
                const token = localStorage.getItem('token');
                if (!token) return;
                let currentUser = null;
                fetch(`${API_URL}/api/users/me/`, { headers: { Authorization: `Token ${token}` } })
                    .then(res => res.ok ? res.json() : Promise.reject())
                    .then(userData => {
                        currentUser = userData;
                        const nombreCompleto = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username;
                        setFormData(prev => ({ ...prev, nombre: nombreCompleto }));
                        return fetch(`${API_URL}/api/miembros/`, { headers: { Authorization: `Token ${token}` } });
                    })
                    .then(res => res.ok ? res.json() : Promise.reject())
                    .then(miembros => {
                        const m = miembros.find(x => x.user === currentUser.id);
                        if (m && m.telefono) {
                            setFormData(prev => ({ ...prev, telefono: m.telefono }));
                        }
                    })
                    .catch(() => {});
        }, []);
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name === 'telefono') return; // bloqueado
        if (type === 'radio') {
            const boolVal = value === 'si';
            setFormData(prev => ({ ...prev, [name]: boolVal }));
            return;
        }
        const finalValue = type === 'checkbox' ? checked : value;
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.nombre || !formData.telefono || !formData.edad) {
            alert("Por favor, complete Nombre, Edad y Teléfono.");
            return;
        }
        if (!formData.aceptaWaiver) {
            alert("Debe leer y aceptar el descargo de responsabilidad.");
            return;
        }

        setStatus('loading');
                // Guardar vía API (upsert HealthProfile)
                const token = localStorage.getItem('token');
                if (!token) { alert('Sesión expirada'); return; }
                const payload = {
                    edad: formData.edad ? parseInt(formData.edad,10) : null,
                    condicion_corazon: formData.condicionCorazon,
                    presion_alta: formData.presionAlta,
                    lesiones_recientes: formData.lesionesRecientes,
                    medicamentos: formData.medicamentos,
                    comentarios: formData.comentarios
                };
                fetch(`${API_URL}/api/health-profiles/`, {
                    method: 'POST',
                    headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(r => r.json().then(data => ({ ok: r.ok, data })))
                .then(res => {
                    if (!res.ok) throw new Error(res.data.error || 'Error guardando ficha');
                    setStatus('success');
                })
                .catch(err => {
                    alert(err.message);
                    setStatus('idle');
                });
    };
        // Prefetch perfil existente
        useEffect(() => {
            const token = localStorage.getItem('token');
            if (!token) return;
            fetch(`${API_URL}/api/health-profiles/`, { headers: { Authorization: `Token ${token}` } })
                .then(r => r.ok ? r.json() : [])
                .then(data => {
                    if (Array.isArray(data) && data.length > 0) {
                        const hp = data[0];
                        setFormData(prev => ({
                            ...prev,
                            edad: hp.edad || '',
                            condicionCorazon: hp.condicion_corazon,
                            presionAlta: hp.presion_alta,
                            lesionesRecientes: hp.lesiones_recientes,
                            medicamentos: hp.medicamentos,
                            comentarios: hp.comentarios || ''
                        }));
                    }
                })
                .catch(()=>{});
        }, []);

    const inputClass = "w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-500";
    const labelClass = "block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2";

        if (status === 'success') {
            return (
                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                            <CheckCircle size={28} className="text-green-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Ficha Médica Guardada</h2>
                            <p className="text-slate-400 text-sm">Puedes revisar tus respuestas o editar si algo cambió.</p>
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
                            <p className="text-xs text-slate-400">Edad</p>
                            <p className="text-white font-semibold">{formData.edad || '—'}</p>
                        </div>
                        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
                            <p className="text-xs text-slate-400">Condición del corazón</p>
                            <p className="text-white font-semibold">{formData.condicionCorazon ? 'Sí' : 'No'}</p>
                        </div>
                        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
                            <p className="text-xs text-slate-400">Presión arterial alta</p>
                            <p className="text-white font-semibold">{formData.presionAlta ? 'Sí' : 'No'}</p>
                        </div>
                        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
                            <p className="text-xs text-slate-400">Lesiones recientes</p>
                            <p className="text-white font-semibold">{formData.lesionesRecientes ? 'Sí' : 'No'}</p>
                        </div>
                        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
                            <p className="text-xs text-slate-400">Medicamentos</p>
                            <p className="text-white font-semibold">{formData.medicamentos ? 'Sí' : 'No'}</p>
                        </div>
                        <div className="md:col-span-2 bg-purple-900/30 border border-purple-700/40 rounded-lg p-4">
                            <p className="text-xs text-purple-300">Comentarios</p>
                            <p className="text-purple-100 text-sm whitespace-pre-wrap">{formData.comentarios || '—'}</p>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={() => setStatus('idle')} className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold">Editar Ficha</button>
                    </div>
                </div>
            );
        }

    return (
        <div className="w-full">
            <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-center rounded-t-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-black/10"></div>
                <h2 className="text-2xl font-bold text-white relative z-10 flex justify-center items-center gap-2">
                    <Activity className="text-blue-200" /> Cuestionario de Salud
                </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 bg-slate-800/50 backdrop-blur-sm rounded-b-2xl border border-slate-700 border-t-0 space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className={labelClass}>Nombre Completo (Automático)</label>
                        <input type="text" name="nombre" value={formData.nombre} disabled readOnly className={`${inputClass} opacity-60 cursor-not-allowed`} placeholder="Nombre y Apellido" />
                    </div>
                    <div>
                        <label className={labelClass}><Calendar size={16}/> Edad</label>
                        <input type="number" name="edad" value={formData.edad} onChange={handleChange} className={inputClass} placeholder="25" />
                    </div>
                    <div>
                        <label className={labelClass}><Phone size={16}/> Teléfono (Registrado)</label>
                        <input type="tel" name="telefono" value={formData.telefono} disabled readOnly className={`${inputClass} opacity-60 cursor-not-allowed`} placeholder="10 dígitos" maxLength={10} />
                    </div>
                </div>

                <div>
                    <h3 className="text-md font-semibold text-purple-400 border-b border-slate-700 pb-2 mb-4 flex items-center gap-2">
                        <Heart size={18} /> Historial Médico
                    </h3>
                    <div className="space-y-4">
                                                <div className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center border border-slate-700/50">
                                                    <span className="text-slate-300 text-sm">¿Padece condición del corazón?</span>
                                                    <div className="flex gap-4">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input type="radio" name="condicionCorazon" value="si" checked={formData.condicionCorazon===true} onChange={handleChange} className="accent-blue-500 w-4 h-4"/>
                                                            <span className="text-slate-400 text-sm">Sí</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input type="radio" name="condicionCorazon" value="no" checked={formData.condicionCorazon===false} onChange={handleChange} className="accent-blue-500 w-4 h-4"/>
                                                            <span className="text-slate-400 text-sm">No</span>
                                                        </label>
                                                    </div>
                                                </div>
                                                <div className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center border border-slate-700/50">
                                                    <span className="text-slate-300 text-sm">¿Sufre presión arterial alta?</span>
                                                    <div className="flex gap-4">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input type="radio" name="presionAlta" value="si" checked={formData.presionAlta===true} onChange={handleChange} className="accent-blue-500 w-4 h-4"/>
                                                            <span className="text-slate-400 text-sm">Sí</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input type="radio" name="presionAlta" value="no" checked={formData.presionAlta===false} onChange={handleChange} className="accent-blue-500 w-4 h-4"/>
                                                            <span className="text-slate-400 text-sm">No</span>
                                                        </label>
                                                    </div>
                                                </div>
                                                <div className="space-y-4 pt-4">
                                                    <div className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center border border-slate-700/50">
                                                        <span className="text-slate-300 text-sm">¿Ha tenido lesiones recientes?</span>
                                                        <div className="flex gap-4">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input type="radio" name="lesionesRecientes" value="si" checked={formData.lesionesRecientes===true} onChange={handleChange} className="accent-blue-500 w-4 h-4"/>
                                                                <span className="text-slate-400 text-sm">Sí</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input type="radio" name="lesionesRecientes" value="no" checked={formData.lesionesRecientes===false} onChange={handleChange} className="accent-blue-500 w-4 h-4"/>
                                                                <span className="text-slate-400 text-sm">No</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center border border-slate-700/50">
                                                        <span className="text-slate-300 text-sm">¿Toma medicamentos actualmente?</span>
                                                        <div className="flex gap-4">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input type="radio" name="medicamentos" value="si" checked={formData.medicamentos===true} onChange={handleChange} className="accent-blue-500 w-4 h-4"/>
                                                                <span className="text-slate-400 text-sm">Sí</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input type="radio" name="medicamentos" value="no" checked={formData.medicamentos===false} onChange={handleChange} className="accent-blue-500 w-4 h-4"/>
                                                                <span className="text-slate-400 text-sm">No</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-purple-300 text-sm mb-1 block">Comentarios (internos)</label>
                                                         <textarea name="comentarios" value={formData.comentarios} onChange={handleChange} placeholder="Notas adicionales, observaciones..." className="w-full bg-slate-900 border border-purple-700/50 focus:border-purple-500 rounded-lg p-3 text-white text-sm min-h-20 resize-y"></textarea>
                                                    </div>
                                                </div>
                    </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" name="aceptaWaiver" checked={formData.aceptaWaiver} onChange={handleChange} className="mt-1 accent-yellow-500 w-5 h-5" />
                        <span className="text-slate-300 text-sm leading-tight">
                            Declaro que la información es verdadera y libero al gimnasio de responsabilidad por lesiones.
                        </span>
                    </label>
                </div>

                <button type="submit" disabled={status === 'loading'} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                    {status === 'loading' ? 'Enviando...' : <><Send size={18} /> ENVIAR DATOS</>}
                </button>
            </form>
        </div>
    );
}

// Paleta de colores disponibles para el fondo del avatar inicial
const AVATAR_COLORS = [
  { id: 'azul', value: '#1D4ED8' },
  { id: 'morado', value: '#6D28D9' },
  { id: 'verde', value: '#059669' },
  { id: 'amarillo', value: '#D97706' },
  { id: 'rojo', value: '#DC2626' },
  { id: 'rosa', value: '#DB2777' },
];

const ProfileHeader = ({ user, onNavigate }) => {
  const initial = (user.nombre || user.username || 'U').charAt(0).toUpperCase();
  const [showColors, setShowColors] = useState(false);
  const [bgColor, setBgColor] = useState(localStorage.getItem(`avatar_bg_color_${user.id}`) || '#1D4ED8');

  const handleColor = (val) => {
    setBgColor(val);
    localStorage.setItem(`avatar_bg_color_${user.id}`, val);
    setTimeout(() => setShowColors(false), 150);
        // Enviar al backend
        const token = localStorage.getItem('token');
        if (token) {
            fetch(`${API_URL}/api/miembros/set_color/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${token}`
                },
                body: JSON.stringify({ color: val })
            }).catch(()=>{});
        }
  };

  return (
    <div className="w-full max-w-2xl bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
      <div className="h-32 bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 relative">
        <div className="absolute inset-0 bg-black/20"></div>
      </div>
      <div className="px-8 pb-8 text-center relative">
        <div className="relative -mt-16 mb-4 inline-block">
          <div className="w-32 h-32 rounded-full border-4 border-slate-900 flex items-center justify-center overflow-hidden shadow-lg relative" style={{ backgroundColor: bgColor }}>
            <span className="text-white text-5xl font-bold select-none">
              {initial}
            </span>
            <button
              onClick={() => setShowColors(!showColors)}
              className="absolute bottom-1 right-1 p-2 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors shadow"
              title="Cambiar color"
              type="button"
            >
              <Edit2 size={16} />
            </button>
          </div>
          {showColors && (
            <div className="absolute left-1/2 -translate-x-1/2 mt-4 w-[18rem] z-20 bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl animate-in fade-in zoom-in">
              <p className="text-xs text-slate-400 mb-3">Color de fondo:</p>
              <div className="grid grid-cols-6 gap-3">
                {AVATAR_COLORS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleColor(c.value)}
                    type="button"
                    className={`w-10 h-10 rounded-full border ${bgColor === c.value ? 'border-white shadow-[0_0_6px_rgba(255,255,255,0.5)]' : 'border-slate-600 hover:border-slate-400'} transition-all`}
                    style={{ backgroundColor: c.value }}
                    title={c.id}
                  ></button>
                ))}
              </div>
              <button
                onClick={() => setShowColors(false)}
                type="button"
                className="mt-4 w-full text-xs font-semibold text-slate-300 hover:text-white py-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-500 transition-colors"
              >Cerrar</button>
            </div>
          )}
        </div>
        <h2 className="text-3xl font-bold text-white mb-1">{user.nombre}</h2>
        <p className="text-blue-400 font-medium mb-4">{user.email}</p>

                <div className="mt-8 space-y-3 text-left">
                    <button 
                        onClick={() => onNavigate('edit-personal')}
                        className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between group transition-all duration-200"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:text-blue-300">
                                <User size={20} />
                            </div>
                            <span className="text-slate-200 font-medium group-hover:text-white">Editar Datos Personales</span>
                        </div>
                        <ChevronRight className="text-slate-500 group-hover:text-blue-400 transition-transform group-hover:translate-x-1" size={20}/>
                    </button>

                    <button 
                        onClick={() => onNavigate('health-form')}
                        className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between group transition-all duration-200"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 group-hover:text-purple-300">
                                <Activity size={20} />
                            </div>
                            <span className="text-slate-200 font-medium group-hover:text-white">Actualizar Ficha Médica</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <ChevronRight className="text-slate-500 group-hover:text-purple-400 transition-transform group-hover:translate-x-1" size={20}/>
                        </div>
                    </button>

                    <button 
                        onClick={() => onNavigate('change-password')}
                        className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between group transition-all duration-200"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:text-emerald-300">
                                <Lock size={20} />
                            </div>
                            <span className="text-slate-200 font-medium group-hover:text-white">Cambiar Contraseña</span>
                        </div>
                        <ChevronRight className="text-slate-500 group-hover:text-emerald-400 transition-transform group-hover:translate-x-1" size={20}/>
                    </button>
                </div>
            </div>
        </div>
    );
};

const PersonalData = ({ user, onSave, onBack }) => {
        const [editForm, setEditForm] = useState({ ...user });
        const [saving, setSaving] = useState(false);
        const [errorMsg, setErrorMsg] = useState('');
        const [successMsg, setSuccessMsg] = useState('');
        const [miembroId, setMiembroId] = useState(null);

        useEffect(() => {
                // Obtener miembro para actualizar teléfono si existe
                const token = localStorage.getItem('token');
                if (!token) return;
                fetch(`${API_URL}/api/miembros/`, { headers: { Authorization: `Token ${token}` } })
                    .then(r => r.ok ? r.json() : [])
                    .then(data => {
                        const m = data.find(x => x.email === editForm.email);
                        if (m) setMiembroId(m.id);
                    })
                    .catch(()=>{});
        }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'telefono') {
            const numericValue = value.replace(/\D/g, '').slice(0, 10);
            setEditForm({ ...editForm, [name]: numericValue });
        } else {
            setEditForm({ ...editForm, [name]: value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg(''); setSuccessMsg('');
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Sesión expirada');
            // PATCH usuario (email y username)
            const userRes = await fetch(`${API_URL}/api/users/${editForm.id}/`, {
                method: 'PATCH',
                headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: editForm.email, username: editForm.username })
            });
            const userData = await userRes.json();
            if (!userRes.ok) {
                // Mostrar errores específicos
                if (userData.email_error) throw new Error(userData.email_error[0]);
                if (userData.username) throw new Error(userData.username[0]);
                throw new Error(userData.detail || 'Error actualizando usuario');
            }
            // PATCH miembro (teléfono) si existe
            if (miembroId) {
                const miembroRes = await fetch(`${API_URL}/api/miembros/${miembroId}/`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ telefono: editForm.telefono })
                });
                if (!miembroRes.ok) {
                    throw new Error('Error actualizando teléfono');
                }
            }
            onSave(editForm); // Actualiza estado superior (solo teléfono local ya se maneja ahí)
            setSuccessMsg('Datos actualizados');
        } catch (err) {
            setErrorMsg(err.message);
        } finally {
            setSaving(false);
        }
    };

    const inputClass = "w-full bg-slate-950 border border-slate-700 rounded-lg p-3 pl-10 text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed";
    const labelClass = "block text-sm font-medium text-slate-400 mb-1 ml-1";

    return (
        <div className="w-full max-w-2xl bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h2 className="text-2xl font-bold text-white">Datos Personales</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className={labelClass}>ID de Usuario</label>
                        <div className="relative">
                            <Hash className="absolute left-3 top-3.5 text-slate-500" size={18} />
                            <input type="text" value={editForm.id} disabled className={inputClass} />
                        </div>
                    </div>

                    <div>
                        <label className={`${labelClass} text-blue-400 font-semibold`}>Correo Electrónico (Editable)</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3.5 text-blue-400" size={18} />
                            <input type="email" name="email" value={editForm.email} onChange={handleChange} className={`${inputClass} border-blue-500/30 focus:border-blue-500 text-white bg-blue-900/10`} />
                        </div>
                    </div>

                    <div>
                        <label className={`${labelClass} text-indigo-400 font-semibold`}>Usuario (Editable)</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3.5 text-indigo-400" size={18} />
                            <input type="text" name="username" value={editForm.username} onChange={handleChange} className={`${inputClass} border-indigo-500/30 focus:border-indigo-500 text-white bg-indigo-900/10`} />
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className={labelClass}>Nombre Completo (No editable)</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3.5 text-slate-500" size={18} />
                            <input type="text" value={editForm.nombre} disabled readOnly className={inputClass} />
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className={`${labelClass} text-blue-400 font-semibold`}>Teléfono (Editable)</label>
                        <div className="relative"><Phone className="absolute left-3 top-3.5 text-blue-400" size={18} />
                            <input 
                                type="tel" 
                                name="telefono"
                                value={editForm.telefono} 
                                onChange={handleChange}
                                className={`${inputClass} border-blue-500/30 focus:border-blue-500 text-white bg-blue-900/10`} 
                                placeholder="Actualiza tu número"
                            />
                            <div className="absolute right-3 top-3.5 pointer-events-none">
                                <Edit2 size={16} className="text-blue-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {errorMsg && <div className="text-sm text-red-400 bg-red-900/20 border border-red-700 rounded-lg p-3">{errorMsg}</div>}
                {successMsg && <div className="text-sm text-green-400 bg-green-900/20 border border-green-700 rounded-lg p-3">{successMsg}</div>}
                <div className="pt-2">
                    <button disabled={saving} type="submit" className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95">
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const HealthSection = ({ onBack }) => {
    return (
        <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-900 border border-slate-800 rounded-t-2xl p-4 flex items-center gap-4">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-medium px-2 py-1 hover:bg-slate-800 rounded-lg">
                    <ArrowLeft size={20} />
                    Volver al Perfil
                </button>
                <span className="text-slate-500">|</span>
                <span className="text-slate-300 font-medium">Actualización de Ficha</span>
            </div>
            
            <div className="bg-slate-950 border-x border-b border-slate-800 rounded-b-2xl overflow-hidden">
                <HealthForm />
            </div>
        </div>
    );
};

function UserProfile() {
    const [currentView, setCurrentView] = useState('menu');
    const [user, setUser] = useState(null);
    const [miembro, setMiembro] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Cargar datos del usuario autenticado
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('No hay sesión activa');
                    setLoading(false);
                    return;
                }

                // Obtener datos del usuario autenticado
                const userResponse = await fetch(`${API_URL}/api/users/me/`, {
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!userResponse.ok) {
                    throw new Error('Error al cargar datos del usuario');
                }

                const userData = await userResponse.json();
                setUser({
                    id: userData.id,
                    nombre: `${userData.first_name} ${userData.last_name}`.trim() || userData.username,
                    email: userData.email,
                    telefono: userData.phone || '',
                    username: userData.username
                });

                // Intentar obtener el perfil de miembro asociado
                try {
                    const miembrosResponse = await fetch(`${API_URL}/api/miembros/`, {
                        headers: {
                            'Authorization': `Token ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (miembrosResponse.ok) {
                        const miembrosData = await miembrosResponse.json();
                        // Buscar el miembro asociado al email del usuario
                        const miembroEncontrado = miembrosData.find(m => m.email === userData.email);
                        if (miembroEncontrado) {
                            setMiembro(miembroEncontrado);
                            setUser(prev => ({
                                ...prev,
                                telefono: miembroEncontrado.telefono || prev.telefono
                            }));
                        }
                    }
                } catch (err) {
                    console.log('No se encontró perfil de miembro:', err);
                }

                setLoading(false);
            } catch (err) {
                console.error('Error cargando datos:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const handleUpdateUser = async (updatedData) => {
        try {
            const token = localStorage.getItem('token');
            
            // Si existe un perfil de miembro, actualizar el teléfono allí
            if (miembro) {
                const response = await fetch(`${API_URL}/api/miembros/${miembro.id}/`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        telefono: updatedData.telefono
                    })
                });

                if (!response.ok) {
                    throw new Error('Error al actualizar datos');
                }

                const updatedMiembro = await response.json();
                setMiembro(updatedMiembro);
            }

            setUser(updatedData);
            alert("¡Datos actualizados correctamente!");
            setCurrentView('menu');
        } catch (err) {
            console.error('Error actualizando datos:', err);
            alert('Error al actualizar los datos. Intenta de nuevo.');
        }
    };

    if (loading) {
        return (
            <div className="w-full flex justify-center items-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-slate-400">Cargando perfil...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full flex justify-center items-center min-h-[400px]">
                <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center max-w-md">
                    <p className="text-red-400 mb-4">{error}</p>
                    <a href="/cliente/login" className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-all">
                        Iniciar sesión como cliente
                    </a>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="w-full flex justify-center">
            
            {currentView === 'menu' && (
                <ProfileHeader 
                    user={user} 
                    onNavigate={setCurrentView} 
                />
            )}
            {currentView === 'edit-personal' && (
                <PersonalData 
                    user={user} 
                    onSave={handleUpdateUser} 
                    onBack={() => setCurrentView('menu')} 
                />
            )}
            {currentView === 'health-form' && (
                <HealthSection 
                    onBack={() => setCurrentView('menu')} 
                />
            )}
            {currentView === 'change-password' && (
                <ChangePassword onBack={() => setCurrentView('menu')} />
            )}
            {/* Eliminado flujo separado de avatar; ahora se edita inline */}
        </div>
    );
}

export default UserProfile;

// --- Cambio de Contraseña ---
function ChangePassword({ onBack }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        if (!currentPassword || !newPassword) {
            setError('Completa los campos requeridos');
            return;
        }
        if (newPassword.length < 6) {
            setError('La nueva contraseña debe tener al menos 6 caracteres');
            return;
        }
        if (newPassword !== confirm) {
            setError('La confirmación no coincide');
            return;
        }
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/change-password/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'No se pudo actualizar');
            }
            if (data?.token) {
                localStorage.setItem('token', data.token);
            }
            setSuccess('Contraseña actualizada correctamente');
            setCurrentPassword(''); setNewPassword(''); setConfirm('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:border-emerald-500 outline-none";

    return (
        <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft size={22} />
                </button>
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><Lock size={18} className="text-emerald-400"/> Cambiar Contraseña</h2>
            </div>

            {error && <div className="mb-4 text-sm text-red-400 bg-red-900/20 border border-red-700 rounded-lg p-3">{error}</div>}
            {success && <div className="mb-4 text-sm text-emerald-400 bg-emerald-900/20 border border-emerald-700 rounded-lg p-3">{success}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-sm text-slate-400 mb-1 block">Contraseña actual</label>
                    <input type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} className={inputCls} />
                </div>
                <div>
                    <label className="text-sm text-slate-400 mb-1 block">Nueva contraseña</label>
                    <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className={inputCls} />
                </div>
                <div>
                    <label className="text-sm text-slate-400 mb-1 block">Confirmar nueva contraseña</label>
                    <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} className={inputCls} />
                </div>
                <button disabled={loading} type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all">
                    {loading ? 'Actualizando...' : 'Guardar contraseña'}
                </button>
            </form>
        </div>
    );
}

