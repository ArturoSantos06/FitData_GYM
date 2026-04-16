import React, { useState } from 'react';
import ErrorModal from '../../ErrorModal';
import SuccessModal from '../../SuccessModal';
import { registerTrainerByAdmin, updateUser, getUserByEmail } from '../../../firebase';

function RegistrarEntrenador({ onUserRegistered, tipoRegistro = 'entrenador', onTipoRegistroChange = null }) {
  const trainerSpecialtyOptions = [
    'Entrenamiento Funcional',
    'Fuerza e Hipertrofia',
    'Pérdida de Grasa',
    'Rehabilitación y Movilidad',
    'Alto Rendimiento',
    'Preparación Física General',
    'Otro',
  ];

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    contract_type: '',
    trainer_specialty: '',
    trainer_specialty_other: '',
  });

  const [mostrarModalError, setMostrarModalError] = useState(false);
  const [mensajeError, setMensajeError] = useState('');
  const [tituloError, setTituloError] = useState('');
  const [mostrarModalExito, setMostrarModalExito] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const [mensajeSubExito, setMensajeSubExito] = useState('');
  const [cargando, setCargando] = useState(false);

  const manejarCambio = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const soloLetrasRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ]+$/;
  const letrasConEspaciosRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
  const emailValidoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validarRegistroEntrenador = () => {
    const username = formData.username.trim();
    const firstName = formData.first_name.trim();
    const lastName = formData.last_name.trim();
    const email = formData.email.trim();

    if (!soloLetrasRegex.test(username)) {
      return 'El nombre de usuario debe contener solo letras y sin espacios.';
    }
    if (!letrasConEspaciosRegex.test(firstName)) {
      return 'El nombre debe contener solo letras y/o espacios.';
    }
    if (!letrasConEspaciosRegex.test(lastName)) {
      return 'El apellido debe contener solo letras y/o espacios.';
    }
    if (/\s/.test(email) || /\.\s|\s\./.test(email)) {
      return 'El correo no debe tener espacios en blanco.';
    }
    if (!emailValidoRegex.test(email)) {
      return 'Ingresa un correo electrónico válido.';
    }
    if (!formData.password) {
      return 'Ingresa una contraseña.';
    }
    if (formData.password.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres.';
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

  const manejarEnvio = async (e) => {
    e.preventDefault();

    const validationError = validarRegistroEntrenador();
    if (validationError) {
      setTituloError('Validación de Registro');
      setMensajeError(validationError);
      setMostrarModalError(true);
      return;
    }

    setCargando(true);
    try {
      const especialidadResuelta = formData.trainer_specialty === 'Otro'
        ? formData.trainer_specialty_other.trim()
        : formData.trainer_specialty;

      const registerResult = await registerTrainerByAdmin({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        firstName: formData.first_name,
        lastName: formData.last_name,
        contractType: formData.contract_type,
        specialty: especialidadResuelta,
      });

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

        setTituloError('Error de Registro');
        setMensajeError(mensaje);
        setMostrarModalError(true);
        return;
      }

      const idEntrenador = registerResult?.data?.id || registerResult?.data?.userId || null;

      if (idEntrenador) {
        await updateUser(String(idEntrenador), {
          contractType: formData.contract_type,
          tipoContrato: formData.contract_type,
          specialty: especialidadResuelta,
          especialidad: especialidadResuelta,
        });
      } else {
        const usuarioEntrenador = await getUserByEmail(formData.email);
        if (usuarioEntrenador.success && usuarioEntrenador.data?.id) {
          await updateUser(String(usuarioEntrenador.data.id), {
            contractType: formData.contract_type,
            tipoContrato: formData.contract_type,
            specialty: especialidadResuelta,
            especialidad: especialidadResuelta,
          });
        }
      }

      setMensajeExito('¡Entrenador Registrado Exitosamente!');
      setMensajeSubExito('Usuario y contraseña creados correctamente.');
      setMostrarModalExito(true);

      setFormData({
        username: '',
        email: '',
        password: '',
        confirm_password: '',
        first_name: '',
        last_name: '',
        contract_type: '',
        trainer_specialty: '',
        trainer_specialty_other: '',
      });

      if (onUserRegistered) onUserRegistered();
    } catch (err) {
      setTituloError('Error de Registro');
      setMensajeError(err.message);
      setMostrarModalError(true);
    } finally {
      setCargando(false);
    }
  };

  const fieldClass = 'w-full bg-slate-950/70 border border-slate-600/80 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 focus:border-cyan-400/50 transition-all';
  const labelClass = 'block text-xs tracking-wide uppercase font-semibold text-slate-300 mb-1.5';
  const cardClass = 'rounded-xl bg-slate-900/30 p-4 md:p-5 border-b border-slate-700/40';

  return (
    <div className="relative mb-6">
      <div className="absolute -top-10 left-12 h-36 w-36 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 right-16 h-36 w-36 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl bg-linear-to-br from-slate-800/90 via-slate-900/90 to-slate-950/90 p-5 md:p-7 text-gray-100 rounded-2xl">
        <ErrorModal isOpen={mostrarModalError} onClose={() => setMostrarModalError(false)} title={tituloError} message={mensajeError} />

        <SuccessModal
          isOpen={mostrarModalExito}
          onClose={() => setMostrarModalExito(false)}
          title="¡Registro Exitoso!"
          message={mensajeExito}
          subMessage={mensajeSubExito}
        />

        <div className="mb-8 relative">
          <div className="absolute -top-8 left-0 w-96 h-24 bg-linear-to-r from-blue-500/20 via-cyan-500/20 to-blue-500/20 blur-3xl rounded-full" />
          <div className="relative">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-wide text-blue-400">
              Registro
            </h2>
          </div>
          <p className="text-slate-400 text-sm mt-3 tracking-wide">Crea una nueva cuenta de entrenador en FitData GYM</p>
        </div>

        {onTipoRegistroChange ? (
          <section className={`${cardClass} mb-4`}>
            <label className={labelClass}>Tipo de registro</label>
            <select
              value={tipoRegistro}
              onChange={(e) => onTipoRegistroChange(e.target.value)}
              className={fieldClass}
            >
              <option value="cliente">Cliente</option>
              <option value="entrenador">Entrenador</option>
              <option value="nutriologo">Nutriólogo</option>
            </select>
          </section>
        ) : null}

        <form onSubmit={manejarEnvio} className="grid grid-cols-12 gap-4 md:gap-5">
          <section className={`${cardClass} col-span-12`}>
            <h3 className="text-sm font-bold text-slate-200 mb-3">Datos personales</h3>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-6">
                <label className={labelClass}>Nombre de Usuario</label>
                <input type="text" name="username" value={formData.username} onChange={manejarCambio} className={fieldClass} required />
              </div>

              <div className="col-span-12 md:col-span-6">
                <label className={labelClass}>Correo Electrónico</label>
                <input type="email" name="email" value={formData.email} onChange={manejarCambio} className={fieldClass} required />
              </div>

              <div className="col-span-12 md:col-span-6">
                <label className={labelClass}>Nombre(s)</label>
                <input type="text" name="first_name" value={formData.first_name} onChange={manejarCambio} className={fieldClass} required />
              </div>

              <div className="col-span-12 md:col-span-6">
                <label className={labelClass}>Apellidos</label>
                <input type="text" name="last_name" value={formData.last_name} onChange={manejarCambio} className={fieldClass} required />
              </div>

              <div className="col-span-12 md:col-span-6">
                <label className={labelClass}>Tipo de Contrato</label>
                <select
                  name="contract_type"
                  value={formData.contract_type}
                  onChange={manejarCambio}
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
                  onChange={manejarCambio}
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
                    onChange={manejarCambio}
                    className={fieldClass}
                    placeholder="Ej: Entrenamiento prenatal"
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
                <label className={labelClass}>Contraseña</label>
                <input type="password" name="password" value={formData.password} onChange={manejarCambio} className={fieldClass} required />
              </div>
              <div className="col-span-12 md:col-span-6">
                <label className={labelClass}>Confirmar Contraseña</label>
                <input type="password" name="confirm_password" value={formData.confirm_password} onChange={manejarCambio} className={fieldClass} required />
              </div>
            </div>
          </section>

          <div className="col-span-12 mt-1">
            <button
              type="submit"
              disabled={cargando}
              className={`w-full rounded-lg bg-linear-to-r from-fuchsia-600 via-violet-600 to-cyan-600 px-5 py-3.5 text-white font-black tracking-wide shadow-xl transition-all hover:brightness-110 active:scale-[0.99] flex justify-center items-center gap-2 ${cargando ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {cargando ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Procesando...</span>
                </>
              ) : (
                'Registrar Entrenador'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegistrarEntrenador;
