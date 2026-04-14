import React, { useState, useEffect } from 'react';
import ErrorModal from '../ErrorModal';
import SuccessModal from '../SuccessModal';
import AdminHealthForm from '../AdminHealthForm';
import { registerClientByAdmin, registerTrainerByAdmin, registerNutriologoByAdmin, getMemberByEmail, createHealthProfile, createMembershipSale, getSaleByFolio, getUserByEmail, updateUser } from '../../firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config'; 

function RegisterUser({ onUserRegistered }) {
  const trainerSpecialtyOptions = [
    'Entrenamiento Funcional',
    'Fuerza e Hipertrofia',
    'Pérdida de Grasa',
    'Rehabilitación y Movilidad',
    'Alto Rendimiento',
    'Preparación Física General',
    'Otro',
  ];

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
    trainer_specialty: '',
    trainer_specialty_other: '',
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

    if (!formData.trainer_specialty) {
      return 'Selecciona una especialidad del entrenador.';
    }

    if (formData.trainer_specialty === 'Otro' && !formData.trainer_specialty_other.trim()) {
      return 'Especifica la especialidad del entrenador.';
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
        const resolvedTrainerSpecialty = formData.trainer_specialty === 'Otro'
          ? formData.trainer_specialty_other.trim()
          : formData.trainer_specialty;

        registerResult = await registerTrainerByAdmin({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          firstName: formData.first_name,
          lastName: formData.last_name,
          contractType: formData.contract_type,
          specialty: resolvedTrainerSpecialty,
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
        const resolvedTrainerSpecialty = formData.trainer_specialty === 'Otro'
          ? formData.trainer_specialty_other.trim()
          : formData.trainer_specialty;
        const trainerId = registeredUserId || registerResult?.data?.userId || null;

        if (trainerId) {
          await updateUser(String(trainerId), {
            contractType: formData.contract_type,
            tipoContrato: formData.contract_type,
            specialty: resolvedTrainerSpecialty,
            especialidad: resolvedTrainerSpecialty,
          });
        } else {
          const trainerUser = await getUserByEmail(formData.email);
          if (trainerUser.success && trainerUser.data?.id) {
            await updateUser(String(trainerUser.data.id), {
              contractType: formData.contract_type,
              tipoContrato: formData.contract_type,
              specialty: resolvedTrainerSpecialty,
              especialidad: resolvedTrainerSpecialty,
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
          username: '', email: '', phone: '', password: '', confirm_password: '', first_name: '', last_name: '', sexo: '', contract_type: '', trainer_specialty: '', trainer_specialty_other: '',
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

  const fieldClass = 'w-full bg-slate-950/70 border border-slate-600/80 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 focus:border-cyan-400/50 transition-all';
  const labelClass = 'block text-xs tracking-wide uppercase font-semibold text-slate-300 mb-1.5';
  const cardClass = 'rounded-xl bg-slate-900/30 p-4 md:p-5 border-b border-slate-700/40';

  return (
    <div className="relative mb-6">
      <div className="absolute -top-10 left-12 h-36 w-36 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 right-16 h-36 w-36 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl bg-linear-to-br from-slate-800/90 via-slate-900/90 to-slate-950/90 p-5 md:p-7 text-gray-100 rounded-2xl">
        <ErrorModal isOpen={showErrorModal} onClose={() => setShowErrorModal(false)} title={errorTitle} message={errorMessage} />

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
                onSaved={() => { if (onUserRegistered) onUserRegistered(); }}
              />
            </div>
          )}
        </SuccessModal>

        <div className="mb-8 relative">
          <div className="absolute -top-8 left-0 w-96 h-24 bg-linear-to-r from-blue-500/20 via-cyan-500/20 to-blue-500/20 blur-3xl rounded-full" />
          <div className="relative">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-wide text-blue-400">
              Registro
            </h2>
          </div>
          <p className="text-slate-400 text-sm mt-3 tracking-wide">Crea una nueva cuenta en FitData GYM</p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-4 md:gap-5">
          <section className={`${cardClass} col-span-12`}>
            <label className={labelClass}>Tipo de Registro</label>
            <select
              name="user_type"
              value={formData.user_type}
              onChange={handleChange}
              className={fieldClass}
            >
              <option value="CLIENTE">Cliente</option>
              <option value="ENTRENADOR">Entrenador</option>
              <option value="NUTRIOLOGO">Nutriólogo</option>
            </select>
          </section>

          <section className={`${cardClass} col-span-12`}>
            <h3 className="text-sm font-bold text-slate-200 mb-3">Datos personales</h3>
            <div className="grid grid-cols-12 gap-4">
              {formData.user_type !== 'NUTRIOLOGO' && (
                <div className="col-span-12 md:col-span-6">
                  <label className={labelClass}>Nombre de Usuario</label>
                  <input type="text" name="username" value={formData.username} onChange={handleChange} className={fieldClass} required />
                </div>
              )}

              <div className="col-span-12 md:col-span-6">
                <label className={labelClass}>Correo Electrónico</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className={fieldClass} required />
              </div>

              <div className="col-span-12 md:col-span-6">
                <label className={labelClass}>Nombre(s)</label>
                <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} className={fieldClass} required />
              </div>

              <div className="col-span-12 md:col-span-6">
                <label className={labelClass}>Apellidos</label>
                <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} className={fieldClass} required />
              </div>

              {formData.user_type === 'CLIENTE' && (
                <>
                  <div className="col-span-12 md:col-span-6">
                    <label className={labelClass}>Teléfono (10 dígitos)</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className={fieldClass}
                      pattern="[0-9]{10}"
                      maxLength={10}
                      required
                    />
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <label className={labelClass}>Sexo</label>
                    <select name="sexo" value={formData.sexo} onChange={handleChange} className={fieldClass} required>
                      <option value="">-- Selecciona --</option>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                    </select>
                  </div>
                </>
              )}

              {formData.user_type === 'ENTRENADOR' && (
                <>
                  <div className="col-span-12 md:col-span-6">
                    <label className={labelClass}>Tipo de Contrato</label>
                    <select
                      name="contract_type"
                      value={formData.contract_type}
                      onChange={handleChange}
                      className={fieldClass}
                      required
                    >
                      <option value="">-- Selecciona --</option>
                      <option value="Asimilados a Salarios">Asimilados a Salarios</option>
                      <option value="Honorarios (Persona Fisica)">Honorarios (Persona Fisica)</option>
                      <option value="Comisiones">Comisiones</option>
                    </select>
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <label className={labelClass}>Especialidad</label>
                    <select
                      name="trainer_specialty"
                      value={formData.trainer_specialty}
                      onChange={handleChange}
                      className={fieldClass}
                      required
                    >
                      <option value="">-- Selecciona --</option>
                      {trainerSpecialtyOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  {formData.trainer_specialty === 'Otro' && (
                    <div className="col-span-12">
                      <label className={labelClass}>Especifica la Especialidad</label>
                      <input
                        type="text"
                        name="trainer_specialty_other"
                        value={formData.trainer_specialty_other}
                        onChange={handleChange}
                        className={fieldClass}
                        placeholder="Ej: Entrenamiento prenatal"
                        required
                      />
                    </div>
                  )}
                </>
              )}

              {formData.user_type === 'NUTRIOLOGO' && (
                <div className="col-span-12 md:col-span-6">
                  <label className={labelClass}>Especialidad</label>
                  <input
                    type="text"
                    name="especialidad"
                    value={formData.especialidad}
                    onChange={handleChange}
                    className={fieldClass}
                    placeholder="Ej: Nutrición Deportiva"
                    required
                  />
                </div>
              )}
            </div>
          </section>

          <section className={`${cardClass} col-span-12`}>
            <h3 className="text-sm font-bold text-slate-200 mb-3">Acceso</h3>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-6">
                <label className={labelClass}>Contraseña {formData.user_type === 'CLIENTE' ? 'Temporal' : ''}</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} className={fieldClass} required />
              </div>
              <div className="col-span-12 md:col-span-6">
                <label className={labelClass}>Confirmar Contraseña</label>
                <input type="password" name="confirm_password" value={formData.confirm_password} onChange={handleChange} className={fieldClass} required />
              </div>
            </div>
          </section>

          {formData.user_type === 'CLIENTE' && (
            <section className={`${cardClass} col-span-12 border-cyan-500/30 bg-cyan-950/15`}>
              <h3 className="text-lg font-black tracking-tight text-cyan-300 mb-3">Asignación Inicial</h3>

              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-6">
                  <label className={labelClass}>Membresía</label>
                  <select
                    name="membership_id"
                    value={formData.membership_id}
                    onChange={handleChange}
                    className={fieldClass}
                    required
                  >
                    <option value="">-- Selecciona --</option>
                    {memberships.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} - ${m.price}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-12 md:col-span-6">
                  <label className={labelClass}>Método de Pago</label>
                  <select
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleChange}
                    className={fieldClass}
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TARJETA">Tarjeta</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                  </select>
                </div>
              </div>

              {formData.membership_id && (
                <div className="mt-4 rounded-lg bg-slate-950/40 p-4 border-b border-slate-600/40">
                  <div className="grid grid-cols-12 items-center gap-3 mb-3">
                    <span className="col-span-12 md:col-span-4 text-gray-400 text-xs uppercase font-bold tracking-wider">Total a Cobrar</span>
                    <span className="col-span-8 md:col-span-4 text-2xl font-black text-emerald-400">${selectedPrice}</span>
                    <span className="col-span-4 md:col-span-4 text-right text-xs text-slate-500">IVA incluido</span>
                  </div>

                  {formData.payment_method === 'EFECTIVO' && (
                    <div className="border-t border-slate-700 pt-3 animate-fade-in">
                      <div className="grid grid-cols-12 gap-3 items-center mb-2">
                        <label className="col-span-12 md:col-span-4 text-sm font-semibold text-slate-300">Dinero Recibido</label>
                        <input
                          type="number"
                          value={montoRecibido}
                          onChange={(e) => setMontoRecibido(e.target.value)}
                          className="col-span-12 md:col-span-8 bg-slate-900 border border-slate-500 rounded-lg px-4 py-2.5 text-white text-right font-mono text-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex justify-between items-center rounded-lg bg-black/25 px-3 py-2">
                        <span className="text-sm font-bold text-slate-400">Cambio</span>
                        <span className={`text-xl font-black font-mono ${cambio < 0 ? 'text-red-400' : 'text-yellow-300'}`}>
                          ${cambio.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          <div className="col-span-12 mt-1">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full rounded-lg bg-linear-to-r from-fuchsia-600 via-violet-600 to-cyan-600 px-5 py-3.5 text-white font-black tracking-wide shadow-xl transition-all hover:brightness-110 active:scale-[0.99] flex justify-center items-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
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
    </div>
  );
}

export default RegisterUser;