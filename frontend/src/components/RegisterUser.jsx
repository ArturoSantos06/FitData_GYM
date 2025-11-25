import React, { useState, useEffect } from 'react';
import ErrorModal from './ErrorModal';
import SuccessModal from './SuccessModal'; 

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
  const [successMessage, setSuccessMessage] = useState('');
  const [successSubMessage, setSuccessSubMessage] = useState('');

  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchMemberships = async () => {
      try {
        const response = await fetch(`${API_URL}/api/memberships/`);
        if (response.ok) {
          const data = await response.json();
          setMemberships(data.results || data);
        }
      } catch (err) { console.error(err); }
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

    const token = localStorage.getItem('token');

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

    const payload = {
        ...formData,
        monto_recibido: formData.payment_method === 'EFECTIVO' ? parseFloat(montoRecibido) : selectedPrice
    };

    try {
      const response = await fetch(`${API_URL}/api/users/register-with-membership/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        let titulo = 'Error de Registro';
        let mensaje = 'Ocurrió un problema.';

        if (data.username) {
            titulo = 'Usuario No Disponible';
            mensaje = `El usuario "${formData.username}" ya existe.`;
        } else if (data.email_error) {
            titulo = 'Correo Duplicado';
            mensaje = data.email_error[0];
        } else if (data.fullname_error) {
            titulo = 'Cliente Ya Registrado';
            mensaje = data.fullname_error[0];
        } else if (data.detail) {
            mensaje = data.detail;
        } else if (data.error) {
            mensaje = data.error;
        }

        setErrorTitle(titulo);
        setErrorMessage(mensaje);
        setShowErrorModal(true);
        return;
      }

      // --- ÉXITO ---
      setSuccessMessage('¡Cliente Registrado Exitosamente!');
      
      if (formData.payment_method === 'EFECTIVO') {
          setSuccessSubMessage(`💰 Cambio: $${cambio.toFixed(2)}\n📧 Ticket enviado.`);
      } else {
          setSuccessSubMessage("📧 Bienvenida enviada al correo.");
      }
      setShowSuccessModal(true);

      // Limpieza
      setFormData({ 
          username: '', email: '', password: '', first_name: '', last_name: '', 
          membership_id: '', payment_method: 'EFECTIVO' 
      });
      setMontoRecibido('');
      
      if (onUserRegistered) onUserRegistered();

    } catch (err) {
      console.error(err);
      setErrorTitle('Error de Conexión');
      setErrorMessage('No se pudo conectar con el servidor.');
      setShowErrorModal(true);
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
        onClose={() => setShowSuccessModal(false)}
        title="¡Registro Exitoso!"
        message={successMessage}
        subMessage={successSubMessage}
      />

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
          <button type="submit" className="w-full bg-linear-to-r from-purple-600 to-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg transform active:scale-95 uppercase tracking-wide">
            Registrar y Asignar
          </button>
        </div>

      </form>
    </div>
  );
}

export default RegisterUser;