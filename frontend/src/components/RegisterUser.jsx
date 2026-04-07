import React, { useState, useEffect } from 'react';
import ErrorModal from './ErrorModal';
import SuccessModal from './SuccessModal';
import AdminHealthForm from './AdminHealthForm';
import { registerClientByAdmin, registerTrainerByAdmin, registerNutriologoByAdmin, getMemberByEmail, createHealthProfile, createMembershipSale, getSaleByFolio, getUserByEmail, updateUser } from '../firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config'; 

function RegisterUser({ onUserRegistered }) {
  // --- ESTADO DEL FORMULARIO ---
  const [formData, setFormData] = useState({
    user_type: 'CLIENTE',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    sexo: '',
    contract_type: '',
    membership_id: '',
    payment_method: 'EFECTIVO',
    especialidad: 'Nutrición Deportiva'
  });
  const [memberships, setMemberships] = useState([]);
  const [montoRecibido, setMontoRecibido] = useState('');
  const [cambio, setCambio] = useState(0);

  // Estados de UI compartidos
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTitle, setErrorTitle] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successSubMessage, setSuccessSubMessage] = useState('');
  const [, setRegistrationCompleted] = useState(false);

  // Estado de carga
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onlyLettersRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ]+$/;
  const lettersWithSpacesRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
  const validEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateNutriologo = () => {
    const firstName = formData.first_name.trim();
    const lastName = formData.last_name.trim();
    const email = formData.email.trim();

    if (!lettersWithSpacesRegex.test(firstName)) {
      return 'El nombre debe contener solo letras y/o espacios.';
    }
    if (!lettersWithSpacesRegex.test(lastName)) {
      return 'El apellido debe contener solo letras y/o espacios.';
    }
    if (/\s/.test(email) || /\.\s|\s\./.test(email)) {
      return 'El correo no debe tener espacios en blanco.';
    }
    if (!validEmailRegex.test(email)) {
      return 'Ingresa un correo electrónico válido.';
    }
    if (!formData.password) {
      return 'Ingresa una contraseña.';
    }
    if (formData.password.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres.';
    }
    if (!formData.especialidad.trim()) {
      return 'Ingresa la especialidad.';
    }
    return null;
  };

  const validateTrainerRegistration = () => {
    const username = formData.username.trim();
    const firstName = formData.first_name.trim();
    const lastName = formData.last_name.trim();
    const email = formData.email.trim();

    if (!onlyLettersRegex.test(username)) {
      return 'El nombre de usuario debe contener solo letras y sin espacios.';
    }
    if (!lettersWithSpacesRegex.test(firstName)) {
      return 'El nombre debe contener solo letras y/o espacios.';
    }
    if (!lettersWithSpacesRegex.test(lastName)) {
      return 'El apellido debe contener solo letras y/o espacios.';
    }
    if (/\s/.test(email) || /\.\s|\s\./.test(email)) {
      return 'El correo no debe tener espacios en blanco.';
    }
    if (!validEmailRegex.test(email)) {
      return 'Ingresa un correo electrónico válido.';
    }
    if (!formData.confirm_password) {
      return 'Confirma la contraseña.';
    }
    if (formData.password !== formData.confirm_password) {
      return 'La contraseña y su confirmación no coinciden.';
    }
    if (!formData.contract_type) {
      return 'Selecciona el tipo de contrato del entrenador.';
    }
    return null;
  };

  const toSafeNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const selectedPrice = memberships.find(m => m.id.toString() === formData.membership_id)?.price || 0;
  const selectedPriceNumber = toSafeNumber(selectedPrice, 0);

  useEffect(() => {
    const recibido = toSafeNumber(montoRecibido, 0);
    const precio = selectedPriceNumber;
    setCambio(recibido - precio);
  }, [montoRecibido, selectedPriceNumber]);

  // --- SUBMIT GENERAL ---
  const handleClientSubmit = async (e) => {
    e.preventDefault();

    // Validaciones por tipo de usuario
    if (formData.user_type === 'ENTRENADOR') {
      const trainerValidationError = validateTrainerRegistration();
      if (trainerValidationError) {
        setErrorTitle('Validación de Registro');
        setErrorMessage(trainerValidationError);
        setShowErrorModal(true);
        return;
      }
    }

    if (formData.user_type === 'NUTRIOLOGO') {
      const nutriValidationError = validateNutriologo();
      if (nutriValidationError) {
        setErrorTitle('Validación de Registro');
        setErrorMessage(nutriValidationError);
        setShowErrorModal(true);
        return;
      }
    }

    if (formData.user_type === 'CLIENTE' && !formData.membership_id) {
        setErrorTitle('Faltan Datos');
        setErrorMessage('Por favor selecciona una membresía.');
        setShowErrorModal(true);
        return;
    }

    if (formData.user_type === 'CLIENTE') {
      const normalizedPhone = String(formData.phone || '').replace(/\D/g, '').slice(0, 10);
      if (!/^\d{10}$/.test(normalizedPhone)) {
        setErrorTitle('Faltan Datos');
        setErrorMessage('Ingresa un número de teléfono válido de 10 dígitos.');
        setShowErrorModal(true);
        return;
      }
    }

    // Validación de Efectivo
    const montoRecibidoNumber = toSafeNumber(montoRecibido, 0);

    if (
      formData.user_type === 'CLIENTE' &&
      formData.payment_method === 'EFECTIVO' &&
      (montoRecibidoNumber < selectedPriceNumber)
    ) {
        setErrorTitle('Pago Insuficiente');
        setErrorMessage('El monto recibido es menor al costo de la membresía.');
        setShowErrorModal(true);
        return;
    }

    setIsLoading(true);
    try {
      let registerResult;

      if (formData.user_type === 'NUTRIOLOGO') {
        registerResult = await registerNutriologoByAdmin({
          email: formData.email,
          password: formData.password,
          firstName: formData.first_name,
          lastName: formData.last_name,
          especialidad: formData.especialidad,
        });
      } else if (formData.user_type === 'ENTRENADOR') {
        registerResult = await registerTrainerByAdmin({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          firstName: formData.first_name,
          lastName: formData.last_name,
          contractType: formData.contract_type,
        });
      } else {
        registerResult = await registerClientByAdmin({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          firstName: formData.first_name,
          lastName: formData.last_name,
          phone: String(formData.phone || '').replace(/\D/g, '').slice(0, 10),
          sexo: formData.sexo,
          membershipTypeId: formData.membership_id,
          paymentMethod: formData.payment_method,
          montoRecibido: formData.payment_method === 'EFECTIVO' ? parseFloat(montoRecibido) : selectedPrice,
        });
      }


      if (!registerResult.success) {
        let mensaje = registerResult.error || 'Error al crear usuario';
        const normalizedMessage = String(mensaje).toLowerCase();

        if (
          normalizedMessage.includes('email-already-in-use') ||
          normalizedMessage.includes('auth/email-already-in-use') ||
          normalizedMessage.includes('email address is already in use') ||
          normalizedMessage.includes('already in use by another account')
        ) {
          mensaje = 'Este correo ya está registrado';
        } else if (normalizedMessage.includes('weak-password')) {
          mensaje = 'La contraseña debe tener al menos 6 caracteres';
        } else if (normalizedMessage.includes('invalid-email')) {
          mensaje = 'El correo electrónico no es válido';
        }

        setErrorTitle('Error de Registro');
        setErrorMessage(mensaje);
        setShowErrorModal(true);
        return;
      }

      const registeredUserId = registerResult?.data?.id || null;
      const saleFolio = registerResult?.data?.saleFolio || null;
      const selectedMembership = memberships.find(m => m.id.toString() === formData.membership_id);
      const shouldValidateSale = formData.user_type === 'CLIENTE' && selectedPriceNumber > 0;

      if (formData.user_type === 'ENTRENADOR' && formData.contract_type) {
        const trainerId = registeredUserId || registerResult?.data?.userId || null;

        if (trainerId) {
          await updateUser(String(trainerId), {
            contractType: formData.contract_type,
            tipoContrato: formData.contract_type,
          });
        } else {
          const trainerUser = await getUserByEmail(formData.email);
          if (trainerUser.success && trainerUser.data?.id) {
            await updateUser(String(trainerUser.data.id), {
              contractType: formData.contract_type,
              tipoContrato: formData.contract_type,
            });
          }
        }
      }

      if (shouldValidateSale && saleFolio) {
        const saleCheck = await getSaleByFolio(saleFolio);
        if (!saleCheck.success || !saleCheck.exists) {
          const fallbackSaleByFolio = await createMembershipSale({
            cliente_id: String(registeredUserId || ''),
            metodo_pago: formData.payment_method,
            total: selectedPriceNumber,
            membership_name: selectedMembership?.name || 'Membresía',
            monto_recibido: formData.payment_method === 'EFECTIVO' ? montoRecibidoNumber : selectedPriceNumber,
            tipo_venta: 'ALTA_MEMBRESIA'
          });

          if (!fallbackSaleByFolio.success) {
            throw new Error('Cliente creado, pero la venta no se guardó en base de datos. Intenta nuevamente.');
          }
        }
      }

      if (shouldValidateSale && !saleFolio && registeredUserId) {
        const fallbackSale = await createMembershipSale({
          cliente_id: String(registeredUserId),
          metodo_pago: formData.payment_method,
          total: selectedPriceNumber,
          membership_name: selectedMembership?.name || 'Membresía',
          monto_recibido: formData.payment_method === 'EFECTIVO' ? montoRecibidoNumber : selectedPriceNumber,
          tipo_venta: 'ALTA_MEMBRESIA'
      });

        if (!fallbackSale.success) {
          throw new Error('Cliente creado, pero la venta no se guardó en base de datos. Intenta nuevamente.');
        }
      }

      // --- ÉXITO ---
      if (formData.user_type === 'ENTRENADOR') {
        setSuccessMessage('¡Entrenador Registrado Exitosamente!');
        setSuccessSubMessage('Usuario y contraseña creados correctamente.');
      } else if (formData.user_type === 'NUTRIOLOGO') {
        setSuccessMessage('¡Nutriólogo Registrado Exitosamente!');
        setSuccessSubMessage('✅ El especialista ya aparecerá en la lista de los clientes.');
      } else {
        setSuccessMessage('¡Cliente Registrado Exitosamente!');
        const ticketInfo = '📧 Comprobante enviado al correo';
        const cambioInfo = formData.payment_method === 'EFECTIVO'
          ? ` • 💰 Cambio: $${cambio.toFixed(2)}`
          : '';
        setSuccessSubMessage(`${ticketInfo}${cambioInfo}`);
      }
      setShowSuccessModal(true);
      setRegistrationCompleted(true);

        // Guardar email para ficha y mostrar formulario salud solo para cliente
        if (formData.user_type === 'CLIENTE') {
          setRecentEmail(formData.email);
          setShowHealthForm(true);
        } else {
          setRecentEmail('');
          setShowHealthForm(false);
        }

      // Limpieza
      setFormData({ 
          user_type: 'CLIENTE',
          username: '', email: '', phone: '', password: '', confirm_password: '', first_name: '', last_name: '', sexo: '', contract_type: '', 
          membership_id: '', payment_method: 'EFECTIVO', especialidad: 'Nutrición Deportiva'
      });
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

  const handleSubmit = async (e) => {
    return handleClientSubmit(e);
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

      <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-blue-400">
        Registro
      </h2>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Registro</label>
          <select
            name="user_type"
            value={formData.user_type}
            onChange={handleChange}
            className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-blue-500 outline-none"
          >
            <option value="CLIENTE">Cliente</option>
            <option value="ENTRENADOR">Entrenador</option>
            <option value="NUTRIOLOGO">Nutriólogo</option>
          </select>
        </div>
        
        {/* DATOS PERSONALES */}
        {formData.user_type !== 'NUTRIOLOGO' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nombre de Usuario</label>
            <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-blue-500 outline-none" required />
          </div>
        )}
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
        {formData.user_type === 'CLIENTE' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Teléfono (10 dígitos)</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-blue-500 outline-none"
                placeholder="5512345678"
                pattern="[0-9]{10}"
                maxLength={10}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Sexo</label>
              <select name="sexo" value={formData.sexo} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-blue-500 outline-none" required>
                <option value="">-- Selecciona --</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
          </>
        )}
        {formData.user_type === 'ENTRENADOR' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Contrato</label>
            <select
              name="contract_type"
              value={formData.contract_type}
              onChange={handleChange}
              className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-blue-500 outline-none"
              required
            >
              <option value="">-- Selecciona --</option>
              <option value="Asimilados a Salarios">Asimilados a Salarios</option>
              <option value="Honorarios (Persona Fisica)">Honorarios (Persona Fisica)</option>
              <option value="Comisiones">Comisiones</option>
            </select>
          </div>
        )}
        {formData.user_type === 'NUTRIOLOGO' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Especialidad</label>
            <input 
              type="text" 
              name="especialidad" 
              value={formData.especialidad} 
              onChange={handleChange} 
              className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-blue-500 outline-none" 
              placeholder="Ej: Nutrición Deportiva"
              required 
            />
          </div>
        )}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">Contraseña {formData.user_type === 'CLIENTE' ? 'Temporal' : ''}</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-blue-500 outline-none" required />
        </div>
        {formData.user_type !== 'NUTRIOLOGO' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Confirmar Contraseña</label>
            <input type="password" name="confirm_password" value={formData.confirm_password} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-blue-500 outline-none" required />
          </div>
        )}

        {/* SECCIÓN DE PAGO Y MEMBRESÍA */}
        {formData.user_type === 'CLIENTE' && (
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
          )}

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
              formData.user_type === 'ENTRENADOR' ? 'Registrar Entrenador' : formData.user_type === 'NUTRIOLOGO' ? 'Registrar Nutriólogo' : 'Registrar y Asignar'
            )}
          </button>
        </div>

      </form>
    </div>
  );
}

export default RegisterUser;