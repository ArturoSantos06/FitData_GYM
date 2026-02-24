import React, { useState, useEffect } from 'react';
import ErrorModal from './ErrorModal';
import SuccessModal from './SuccessModal';
import { registerUser, createUser, createMember, createMembership, getProducts, getMemberByEmail, createHealthProfile } from '../firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config'; 

// Formulario rápido para ficha médica inicial administrada
function AdminHealthForm({ miembroEmail, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [miembroId, setMiembroId] = useState(null);
  const [data, setData] = useState({
    edad: '',
    condicion_corazon: false,
    presion_alta: false,
    lesiones_recientes: false,
    medicamentos: false,
    comentarios: ''
  });

  useEffect(() => {
    if (!miembroEmail) return;
    
    const fetchMember = async () => {
      const result = await getMemberByEmail(miembroEmail);
      if (result.success) {
        setMiembroId(result.data.id);
      }
    };
    
    fetchMember();
  }, [miembroEmail]);

  const handleChange = (e) => {
    const { name, type, value } = e.target;
    if (type === 'radio') {
      setData(prev => ({ ...prev, [name]: value === 'si' }));
    } else {
      setData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!miembroId) {
      setError('No se encontró el miembro para asociar la ficha.');
      return;
    }
    if (!data.edad) {
      setError('Edad requerida');
      return;
    }
    setLoading(true);
    
    const healthData = {
      memberId: miembroId,
      edad: parseInt(data.edad, 10),
      condicion_corazon: data.condicion_corazon,
      presion_alta: data.presion_alta,
      lesiones_recientes: data.lesiones_recientes,
      medicamentos: data.medicamentos,
      comentarios: data.comentarios
    };
    
    const result = await createHealthProfile(healthData);
    
    if (result.success) {
      console.log('✅ Ficha médica guardada exitosamente');
      setSaved(true);
      if (typeof onSaved === 'function') {
        console.log('🔄 [LOG] AdminHealthForm: Llamando onSaved para refrescar Fichas Médicas');
        onSaved();
      } else {
        console.log('⚠️ [LOG] AdminHealthForm: onSaved no es función');
      }
    } else {
      setError(result.error || 'Error guardando ficha');
    }
    
    setLoading(false);
  };

  if (saved) {
    return (
      <div className="mt-6 bg-emerald-900/20 border border-emerald-600 p-4 rounded-lg">
        <p className="text-emerald-400 font-semibold mb-2">Ficha médica inicial guardada.</p>
        <button onClick={onClose} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-white text-sm font-bold">Cerrar</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4 bg-slate-800/60 p-4 rounded-lg border border-slate-700">
      <h3 className="text-lg font-bold text-purple-300">Ficha Médica Inicial</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Edad</label>
          <input type="number" name="edad" value={data.edad} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" />
        </div>
        <div className="bg-slate-900 border border-slate-700 rounded p-2">
          <p className="text-xs text-slate-400 mb-1">¿Padece alguna condición del corazón?</p>
          <div className="flex gap-3 text-xs">
            <label className="flex items-center gap-1"><input type="radio" name="condicion_corazon" value="si" checked={data.condicion_corazon===true} onChange={handleChange} /> Sí</label>
            <label className="flex items-center gap-1"><input type="radio" name="condicion_corazon" value="no" checked={data.condicion_corazon===false} onChange={handleChange} /> No</label>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-700 rounded p-2">
          <p className="text-xs text-slate-400 mb-1">Presión arterial alta</p>
          <div className="flex gap-3 text-xs">
            <label className="flex items-center gap-1"><input type="radio" name="presion_alta" value="si" checked={data.presion_alta===true} onChange={handleChange} /> Sí</label>
            <label className="flex items-center gap-1"><input type="radio" name="presion_alta" value="no" checked={data.presion_alta===false} onChange={handleChange} /> No</label>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-700 rounded p-2">
          <p className="text-xs text-slate-400 mb-1">¿Ha tenido lesiones físicas recientes?</p>
          <div className="flex gap-3 text-xs">
            <label className="flex items-center gap-1"><input type="radio" name="lesiones_recientes" value="si" checked={data.lesiones_recientes===true} onChange={handleChange} /> Sí</label>
            <label className="flex items-center gap-1"><input type="radio" name="lesiones_recientes" value="no" checked={data.lesiones_recientes===false} onChange={handleChange} /> No</label>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-700 rounded p-2">
          <p className="text-xs text-slate-400 mb-1">¿Toma medicamentos regularmente?</p>
          <div className="flex gap-3 text-xs">
            <label className="flex items-center gap-1"><input type="radio" name="medicamentos" value="si" checked={data.medicamentos===true} onChange={handleChange} /> Sí</label>
            <label className="flex items-center gap-1"><input type="radio" name="medicamentos" value="no" checked={data.medicamentos===false} onChange={handleChange} /> No</label>
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs text-purple-300 mb-1">Información adicional</label>
        <textarea name="comentarios" value={data.comentarios} onChange={handleChange} className="w-full bg-slate-900 border border-purple-700/40 rounded p-2 text-white text-sm min-h-20"></textarea>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-3 py-2 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-200">Omitir</button>
        <button type="submit" disabled={loading || !miembroId} className="px-4 py-2 text-xs rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold disabled:opacity-50">
          {loading ? 'Guardando...' : 'Guardar Ficha'}
        </button>
      </div>
    </form>
  );
}

function RegisterUser({ onUserRegistered }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    membership_id: '',
    payment_method: 'EFECTIVO'
  });
  
  // Estados de UI
  const [memberships, setMemberships] = useState([]);
  
  // Estados de Pago (Cambio)
  const [montoRecibido, setMontoRecibido] = useState('');
  const [cambio, setCambio] = useState(0);

  // Estados de Modales
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTitle, setErrorTitle] = useState('');
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showHealthForm, setShowHealthForm] = useState(false);
  const [recentEmail, setRecentEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [successSubMessage, setSuccessSubMessage] = useState('');

  // Estado de carga
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchMemberships = async () => {
      try {
        // Obtener tipos de membresía de Firestore
        const q = query(collection(db, 'membershipTypes'));
        const querySnapshot = await getDocs(q);
        const types = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMemberships(types);
      } catch (err) {
        console.error('Error cargando membresías:', err);
      }
    };
    fetchMemberships();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Calcular precio seleccionado
  const selectedPrice = memberships.find(m => m.id.toString() === formData.membership_id)?.price || 0;

  // Efecto para calcular cambio
  useEffect(() => {
    const recibido = parseFloat(montoRecibido) || 0;
    const precio = parseFloat(selectedPrice) || 0;
    setCambio(recibido - precio);
  }, [montoRecibido, selectedPrice]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.membership_id) {
        setErrorTitle('Faltan Datos');
        setErrorMessage('Por favor selecciona una membresía.');
        setShowErrorModal(true);
        return;
    }

    // Validación de Efectivo
    if (formData.payment_method === 'EFECTIVO' && (parseFloat(montoRecibido) < parseFloat(selectedPrice))) {
        setErrorTitle('Pago Insuficiente');
        setErrorMessage('El monto recibido es menor al costo de la membresía.');
        setShowErrorModal(true);
        return;
    }

    setIsLoading(true);

    try {
      // 1. Registrar usuario en Firebase Auth
      const displayName = `${formData.first_name} ${formData.last_name}`.trim();
      const authResult = await registerUser(formData.email, formData.password, displayName);
      
      if (!authResult.success) {
        let mensaje = 'Error al crear usuario';
        if (authResult.error.includes('email-already-in-use')) {
          mensaje = 'Este correo ya está registrado';
        } else if (authResult.error.includes('weak-password')) {
          mensaje = 'La contraseña debe tener al menos 6 caracteres';
        } else if (authResult.error.includes('invalid-email')) {
          mensaje = 'El correo electrónico no es válido';
        }
        
        setErrorTitle('Error de Registro');
        setErrorMessage(mensaje);
        setShowErrorModal(true);
        return;
      }

      const { user } = authResult;

      // 2. Guardar datos del usuario en Firestore
      await createUser(user.uid, {
        email: formData.email,
        username: formData.username,
        firstName: formData.first_name,
        lastName: formData.last_name,
        role: 'client',
        isStaff: false,
        isSuperuser: false,
        isActive: true
      });

      // 3. Crear perfil de miembro
      const memberResult = await createMember({
        userId: user.uid,
        nombre: formData.first_name,
        apellido: formData.last_name,
        email: formData.email,
        telefono: '',
        qrCode: `FD-${user.uid.substring(0, 12).toUpperCase()}`,
        avatarColor: '#6366f1',
        active: true
      });

      // 4. Obtener datos de la membresía seleccionada
      const selectedMembership = memberships.find(m => m.id === formData.membership_id);
      
      // Calcular fechas
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (selectedMembership.durationDays || 30));

      // 5. Crear membresía del usuario
      await createMembership({
        userId: user.uid,
        membershipTypeId: formData.membership_id,
        membershipName: selectedMembership.name,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        price: selectedMembership.price,
        active: true,
        paymentMethod: formData.payment_method,
        montoRecibido: formData.payment_method === 'EFECTIVO' ? parseFloat(montoRecibido) : selectedMembership.price,
        cambio: formData.payment_method === 'EFECTIVO' ? cambio : 0
      });

      // --- ÉXITO ---
      setSuccessMessage('¡Cliente Registrado Exitosamente!');
      
      const ticketInfo = '📧 Usuario creado en Firebase';
      const cambioInfo = formData.payment_method === 'EFECTIVO'
        ? ` • 💰 Cambio: $${cambio.toFixed(2)}`
        : '';
      setSuccessSubMessage(`${ticketInfo}${cambioInfo}`);
      setShowSuccessModal(true);

      // Guardar email para ficha y mostrar formulario salud
      setRecentEmail(formData.email);
      setShowHealthForm(true);

      // Limpieza
      setFormData({ 
          username: '', email: '', password: '', first_name: '', last_name: '', 
          membership_id: '', payment_method: 'EFECTIVO' 
      });
      setMontoRecibido('');
      
      // Notificar al componente padre si existe
      if (onUserRegistered) {
        onUserRegistered();
      }

    } catch (err) {
      console.error('Error en registro:', err);
      setErrorTitle('Error de Registro');
      setErrorMessage(err.message || 'No se pudo completar el registro.');
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-xl mb-6 border-t-4 border-purple-500 text-gray-100 relative">
      
      <ErrorModal 
        isOpen={showErrorModal} 
        onClose={() => setShowErrorModal(false)} 
        title={errorTitle} 
        message={errorMessage} 
      />

      <SuccessModal 
        isOpen={showSuccessModal}
        onClose={() => { setShowSuccessModal(false); setShowHealthForm(false); }}
        title="¡Registro Exitoso!"
        message={successMessage}
        subMessage={successSubMessage}
      >
        {showHealthForm && (
          <div className="mt-2">
            <p className="text-xs text-slate-400 mb-2">Completa ahora la ficha médica inicial del cliente antes de su primer acceso.</p>
            <AdminHealthForm 
              miembroEmail={recentEmail} 
              onClose={() => { setShowHealthForm(false); setShowSuccessModal(false); }} 
              onSaved={() => { 
                console.log('🎯 [LOG] RegisterUser: Ficha guardada, callback existe?', !!onUserRegistered);
                if (onUserRegistered) {
                  console.log('🚀 [LOG] RegisterUser: Ejecutando onUserRegistered para refrescar Fichas Médicas');
                  onUserRegistered();
                } else {
                  console.log('⚠️ [LOG] RegisterUser: onUserRegistered no existe');
                }
              }}
            />
          </div>
        )}
      </SuccessModal>

      <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-blue-400">
        Registrar Nuevo Cliente
      </h2>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* DATOS PERSONALES */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Nombre de Usuario</label>
          <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-blue-500 outline-none" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Correo Electrónico</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-blue-500 outline-none" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Nombre(s)</label>
          <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-blue-500 outline-none" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Apellidos</label>
          <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-blue-500 outline-none" required />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">Contraseña Temporal</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-blue-500 outline-none" required />
        </div>

        {/* SECCIÓN DE PAGO Y MEMBRESÍA */}
        <div className="md:col-span-2 border-t border-gray-700 pt-4 mt-2">
            <h3 className="text-lg font-bold text-cyan-400 mb-4">Asignación Inicial</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Membresía</label>
                    <select 
                        name="membership_id" 
                        value={formData.membership_id} 
                        onChange={handleChange} 
                        className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-cyan-500 outline-none"
                        required
                    >
                        <option value="">-- Selecciona --</option>
                        {memberships.map(m => (
                            <option key={m.id} value={m.id}>{m.name} - ${m.price}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Método de Pago</label>
                    <select 
                        name="payment_method" 
                        value={formData.payment_method} 
                        onChange={handleChange} 
                        className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-cyan-500 outline-none"
                    >
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="TARJETA">Tarjeta</option>
                        <option value="TRANSFERENCIA">Transferencia</option>
                    </select>
                </div>
            </div>
            
            {/* INFORMACIÓN DE PAGO */}
            {formData.membership_id && (
                <div className="mt-4 bg-slate-900 p-4 rounded-lg border border-slate-600">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-400 text-sm uppercase font-bold">Total a Cobrar</span>
                        <span className="text-2xl font-extrabold text-green-400">${selectedPrice}</span>
                        <span className="text-xs text-slate-500 ml-2">(IVA Incluido)</span>
                    </div>

                    {/* Input de Efectivo */}
                    {formData.payment_method === 'EFECTIVO' && (
                        <div className="border-t border-slate-600 pt-3 animate-fade-in">
                            <div className="flex items-center gap-4 mb-2">
                                <label className="text-sm text-gray-300 font-bold">Dinero Recibido:</label>
                                <input 
                                    type="number" 
                                    value={montoRecibido} 
                                    onChange={(e) => setMontoRecibido(e.target.value)} 
                                    className="flex-1 p-2 bg-slate-800 border border-slate-500 rounded text-white text-right font-mono text-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="flex justify-between items-center bg-black/20 p-2 rounded">
                                <span className="text-sm font-bold text-gray-400">Cambio:</span>
                                <span className={`text-xl font-bold font-mono ${cambio < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                                    ${cambio.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>

        <div className="md:col-span-2 mt-4">
          <button 
            type="submit" 
            disabled={isLoading}
            className={`w-full bg-linear-to-r from-purple-600 to-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg transform active:scale-95 uppercase tracking-wide flex justify-center items-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Procesando...</span>
              </>
            ) : (
              "Registrar y Asignar"
            )}
          </button>
        </div>

      </form>
    </div>
  );
}

export default RegisterUser;