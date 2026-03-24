import React, { useState, useEffect } from 'react';
import ErrorModal from './ErrorModal';
import SuccessModal from './SuccessModal';
import AdminHealthForm from './AdminHealthForm'; 
import { 
  registerClientByAdmin, 
  registerNutriologoByAdmin, 
  getProducts, getMemberByEmail, createHealthProfile, createMembershipSale, getSaleByFolio 
} from '../firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config'; 

function RegisterUser({ onUserRegistered }) {
  // Estado para controlar la pestaña activa
  const [activeTab, setActiveTab] = useState('cliente'); // 'cliente' | 'nutriologo'

  // --- ESTADOS PARA CLIENTE ---
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', first_name: '', last_name: '', 
    membership_id: '', payment_method: 'EFECTIVO'
  });
  const [memberships, setMemberships] = useState([]);
  const [montoRecibido, setMontoRecibido] = useState('');
  const [cambio, setCambio] = useState(0);

  // --- ESTADOS PARA NUTRIÓLOGO ---
  const [nutriData, setNutriData] = useState({
    email: '', password: '', first_name: '', last_name: '', especialidad: 'Nutrición Deportiva'
  });

  // Estados de UI compartidos
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTitle, setErrorTitle] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successSubMessage, setSuccessSubMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Estados específicos de post-registro de cliente
  const [showHealthForm, setShowHealthForm] = useState(false);
  const [recentEmail, setRecentEmail] = useState('');

  useEffect(() => {
    const fetchMemberships = async () => {
      try {
        const q = query(collection(db, 'membershipTypes'));
        const querySnapshot = await getDocs(q);
        const types = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMemberships(types);
      } catch (err) {
        console.error('Error cargando membresías:', err);
      }
    };
    fetchMemberships();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleNutriChange = (e) => setNutriData({ ...nutriData, [e.target.name]: e.target.value });

  const selectedPrice = memberships.find(m => m.id.toString() === formData.membership_id)?.price || 0;

  useEffect(() => {
    const recibido = parseFloat(montoRecibido) || 0;
    const precio = parseFloat(selectedPrice) || 0;
    setCambio(recibido - precio);
  }, [montoRecibido, selectedPrice]);

  // --- SUBMIT DE CLIENTE 
  const handleClientSubmit = async (e) => {
    e.preventDefault();
    if (!formData.membership_id) {
        setErrorTitle('Faltan Datos');
        setErrorMessage('Por favor selecciona una membresía.');
        setShowErrorModal(true);
        return;
    }
    if (formData.payment_method === 'EFECTIVO' && (parseFloat(montoRecibido) < parseFloat(selectedPrice))) {
        setErrorTitle('Pago Insuficiente');
        setErrorMessage('El monto recibido es menor al costo de la membresía.');
        setShowErrorModal(true);
        return;
    }

    setIsLoading(true);
    try {
      const registerResult = await registerClientByAdmin({
        username: formData.username, email: formData.email, password: formData.password,
        firstName: formData.first_name, lastName: formData.last_name,
        membershipTypeId: formData.membership_id, paymentMethod: formData.payment_method,
        montoRecibido: formData.payment_method === 'EFECTIVO' ? parseFloat(montoRecibido) : selectedPrice,
      });

      if (!registerResult.success) {
        throw new Error(registerResult.error || 'Error al crear usuario');
      }

      // Lógica de ventas (se mantiene la tuya)...
      const selectedMembership = memberships.find(m => m.id.toString() === formData.membership_id);
      await createMembershipSale({
          cliente_id: String(registerResult.data.id),
          metodo_pago: formData.payment_method,
          total: Number(selectedPrice),
          membership_name: selectedMembership?.name || 'Membresía',
          monto_recibido: formData.payment_method === 'EFECTIVO' ? parseFloat(montoRecibido) : Number(selectedPrice),
          tipo_venta: 'ALTA_MEMBRESIA'
      });

      setSuccessMessage('¡Cliente Registrado Exitosamente!');
      setSuccessSubMessage(`✅ Cuenta creada y membresía asignada ${formData.payment_method === 'EFECTIVO' ? `• 💰 Cambio: $${cambio.toFixed(2)}` : ''}`);
      setShowSuccessModal(true);
      setRecentEmail(formData.email);
      setShowHealthForm(true);

      setFormData({ username: '', email: '', password: '', first_name: '', last_name: '', membership_id: '', payment_method: 'EFECTIVO' });
      setMontoRecibido('');
      if (onUserRegistered) onUserRegistered();

    } catch (err) {
      setErrorTitle('Error de Registro');
      setErrorMessage(err.message);
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  // --- SUBMIT DE NUTRIÓLOGO ---
  const handleNutriSubmit = async (e) => {
    e.preventDefault();
    console.log('🔄 Iniciando registro de nutriólogo con datos:', nutriData);
    setIsLoading(true);

    try {
      const result = await registerNutriologoByAdmin(nutriData);
      console.log('✅ Resultado del registro:', result);

      if (!result.success) {
        throw new Error(result.error);
      }

      setSuccessMessage('¡Nutriólogo Registrado Exitosamente!');
      setSuccessSubMessage('✅ El especialista ya aparecerá en la lista de los clientes.');
      setShowSuccessModal(true);
      setShowHealthForm(false); 

      setNutriData({ email: '', password: '', first_name: '', last_name: '', especialidad: 'Nutrición Deportiva' });

    } catch (err) {
      console.error('❌ Error en registro de nutriólogo:', err);
      let mensaje = err.message;
      if (mensaje.includes('email-already-in-use')) mensaje = 'Este correo ya está registrado';
      if (mensaje.includes('weak-password')) mensaje = 'La contraseña debe tener al menos 6 caracteres';
      
      setErrorTitle('Error de Registro');
      setErrorMessage(mensaje);
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-xl mb-6 border-t-4 border-purple-500 text-gray-100 relative">
      <ErrorModal isOpen={showErrorModal} onClose={() => setShowErrorModal(false)} title={errorTitle} message={errorMessage} />

      <SuccessModal 
        isOpen={showSuccessModal}
        onClose={() => { setShowSuccessModal(false); setShowHealthForm(false); }}
        title="¡Registro Exitoso!"
        message={successMessage}
        subMessage={successSubMessage}
      >
        {showHealthForm && activeTab === 'cliente' && (
          <div className="mt-2">
            <p className="text-xs text-slate-400 mb-2">Completa ahora la ficha médica inicial del cliente antes de su primer acceso.</p>
            <AdminHealthForm 
              miembroEmail={recentEmail} 
              onClose={() => { setShowHealthForm(false); setShowSuccessModal(false); }} 
              onSaved={() => { if (onUserRegistered) onUserRegistered(); }}
            />
          </div>
        )}
      </SuccessModal>

      {/* PESTAÑAS (TABS) */}
      <div className="flex border-b border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab('cliente')}
          className={`pb-3 px-4 text-lg font-bold transition-colors ${activeTab === 'cliente' ? 'text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-blue-400 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Registrar Cliente
        </button>
        <button
          onClick={() => setActiveTab('nutriologo')}
          className={`pb-3 px-4 text-lg font-bold transition-colors ${activeTab === 'nutriologo' ? 'text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-400 border-b-2 border-cyan-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Registrar Nutriólogo
        </button>
      </div>
      
      {/* FORMULARIO DE CLIENTE */}
      {activeTab === 'cliente' && (
        <form onSubmit={handleClientSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          
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

          <div className="md:col-span-2 mt-4">
            <button type="submit" disabled={isLoading} className={`w-full bg-linear-to-r from-purple-600 to-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all uppercase tracking-wide flex justify-center items-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
              {isLoading ? "Procesando..." : "Registrar y Asignar"}
            </button>
          </div>
        </form>
      )}

      {/* FORMULARIO DE NUTRIÓLOGO */}
      {activeTab === 'nutriologo' && (
        <form onSubmit={handleNutriSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Correo Electrónico</label>
            <input type="email" name="email" value={nutriData.email} onChange={handleNutriChange} className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-cyan-500 outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Especialidad</label>
            <input type="text" name="especialidad" value={nutriData.especialidad} onChange={handleNutriChange} placeholder="Ej. Nutrición Deportiva" className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-cyan-500 outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nombre(s)</label>
            <input type="text" name="first_name" value={nutriData.first_name} onChange={handleNutriChange} className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-cyan-500 outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Apellidos</label>
            <input type="text" name="last_name" value={nutriData.last_name} onChange={handleNutriChange} className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-cyan-500 outline-none" required />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">Contraseña Temporal</label>
            <input type="password" name="password" value={nutriData.password} onChange={handleNutriChange} className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-cyan-500 outline-none" required />
          </div>

          <div className="md:col-span-2 mt-4">
            <button type="submit" disabled={isLoading} className={`w-full bg-linear-to-r from-cyan-600 to-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg transform active:scale-95 uppercase tracking-wide flex justify-center items-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
              {isLoading ? "Procesando..." : "Registrar Nutriólogo"}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}

export default RegisterUser;