import React, { useState, useEffect } from "react";
import ErrorModal from "../../modales/ErrorModal";
import ModalExito from "../../modales/ModalExito";
import FormularioSaludAdmin from "./FormularioSaludAdmin";
import RegistrarEntrenador from "./RegistrarEntrenador";
import RegistrarNutriologo from "./RegistrarNutriologo";
import { registerClientByAdmin, createMembershipSale, getSaleByFolio } from "../../../firebase";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "../../../firebase/config";

function RegistrarUsuario({ onUserRegistered }) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
    first_name: "",
    last_name: "",
    sexo: "",
    membership_id: "",
    payment_method: "EFECTIVO",
  });
  const [tipoRegistro, setTipoRegistro] = useState("cliente");

  const [membresias, setMembresias] = useState([]);
  const [montoRecibido, setMontoRecibido] = useState("");
  const [cambio, setCambio] = useState(0);

  const [mostrarModalError, setMostrarModalError] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [tituloError, setTituloError] = useState("");
  const [mostrarModalExito, setMostrarModalExito] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeSubExito, setMensajeSubExito] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarFormulaioSalud, setMostrarFormulaioSalud] = useState(false);
  const [emailReciente, setEmailReciente] = useState("");

  useEffect(() => {
    const obtenerMembresias = async () => {
      try {
        const q = query(collection(db, "membershipTypes"));
        const querySnapshot = await getDocs(q);
        const types = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setMembresias(types);
      } catch (err) {
        console.error("Error cargando membresías:", err);
      }
    };
    obtenerMembresias();
  }, []);

  const manejarCambio = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "membership_id" && formData.payment_method === "EFECTIVO") {
      const monto = parseFloat(montoRecibido) || 0;
      const membresia = membresias.find((m) => m.id === value);
      const total = membresia?.price || 0;
      setCambio(monto - total);
    }
  };

  const manejarCambioMonto = (e) => {
    const monto = parseFloat(e.target.value) || 0;
    setMontoRecibido(e.target.value);
    const membresia = membresias.find((m) => m.id === formData.membership_id);
    const total = membresia?.price || 0;
    setCambio(monto - total);
  };

  const soloLetrasRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ]+$/;
  const letrasConEspaciosRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
  const emailValidoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validarRegistro = () => {
    const username = formData.username.trim();
    const firstName = formData.first_name.trim();
    const lastName = formData.last_name.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const password = formData.password;
    const confirmPassword = formData.confirm_password;

    if (!username || username.length < 3) {
      setTituloError("Validación");
      setMensajeError("El nombre de usuario debe tener al menos 3 caracteres.");
      setMostrarModalError(true);
      return false;
    }

    if (!soloLetrasRegex.test(username)) {
      setTituloError("Validación");
      setMensajeError("El nombre de usuario solo puede contener letras.");
      setMostrarModalError(true);
      return false;
    }

    if (!firstName || !letrasConEspaciosRegex.test(firstName)) {
      setTituloError("Validación");
      setMensajeError("El nombre debe contener solo letras.");
      setMostrarModalError(true);
      return false;
    }

    if (!lastName || !letrasConEspaciosRegex.test(lastName)) {
      setTituloError("Validación");
      setMensajeError("Los apellidos deben contener solo letras.");
      setMostrarModalError(true);
      return false;
    }

    if (!email || !emailValidoRegex.test(email)) {
      setTituloError("Validación");
      setMensajeError("Por favor ingresa un correo electrónico válido.");
      setMostrarModalError(true);
      return false;
    }

    if (!phone || phone.length !== 10 || !/^\d+$/.test(phone)) {
      setTituloError("Validación");
      setMensajeError("El teléfono debe tener exactamente 10 dígitos.");
      setMostrarModalError(true);
      return false;
    }

    if (!formData.sexo) {
      setTituloError("Validación");
      setMensajeError("Por favor selecciona un género.");
      setMostrarModalError(true);
      return false;
    }

    if (password.length < 6) {
      setTituloError("Validación");
      setMensajeError("La contraseña debe tener al menos 6 caracteres.");
      setMostrarModalError(true);
      return false;
    }

    if (password !== confirmPassword) {
      setTituloError("Validación");
      setMensajeError("Las contraseñas no coinciden.");
      setMostrarModalError(true);
      return false;
    }

    if (!formData.membership_id) {
      setTituloError("Validación");
      setMensajeError("Por favor selecciona una membresía.");
      setMostrarModalError(true);
      return false;
    }

    return true;
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();

    if (!validarRegistro()) {
      return;
    }

    setCargando(true);

    try {
      const result = await registerClientByAdmin({
        email: formData.email.trim(),
        password: formData.password,
        username: formData.username.trim(),
        firstName: formData.first_name.trim(),
        lastName: formData.last_name.trim(),
        phone: formData.phone.trim(),
        membershipTypeId: formData.membership_id,
        paymentMethod: formData.payment_method,
        montoRecibido: parseFloat(montoRecibido) || 0,
        sexo: formData.sexo,
      });

      if (!result?.success) {
        throw new Error(result?.error || "No se pudo registrar el cliente.");
      }

      const registroMembresia = membresias.find((m) => m.id === formData.membership_id);
      let saleResult = null;

      // Compatibilidad: si backend nuevo ya devolvio folio, se usa; si no, se crea venta en cliente.
      if (result?.data?.saleFolio) {
        saleResult = { folio: result.data.saleFolio };
      } else {
        saleResult = await createMembershipSale({
          email: formData.email.trim(),
          membership_id: formData.membership_id,
          payment_method: formData.payment_method,
          monto_recibido: parseFloat(montoRecibido) || 0,
          cambio: cambio,
        });
      }

      if (saleResult && saleResult.folio) {
        setEmailReciente(formData.email.trim());
        setMensajeExito(`Cliente ${formData.first_name} registrado exitosamente.`);
        setMensajeSubExito(`Membresía: ${registroMembresia?.name} | Folio: ${saleResult.folio}`);
        setMostrarFormulaioSalud(true);
        setMostrarModalExito(true);
        setFormData({ username: "", email: "", phone: "", password: "", confirm_password: "", first_name: "", last_name: "", sexo: "", membership_id: "", payment_method: "EFECTIVO" });
        setMontoRecibido("");
        setCambio(0);
      } else {
        throw new Error("Cliente registrado, pero no se pudo generar folio de venta.");
      }
    } catch (err) {
      console.error("Error registrando cliente:", err);
      setTituloError("Error en Registro");
      setMensajeError(err.message || "No se pudo registrar el cliente. Intenta de nuevo.");
      setMostrarModalError(true);
    } finally {
      setCargando(false);
    }
  };

  const fieldClass = "w-full bg-slate-950/70 border border-slate-600/80 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 focus:border-cyan-400/50 transition-all";
  const labelClass = "block text-xs tracking-wide uppercase font-semibold text-slate-300 mb-1.5";
  const cardClass = "rounded-xl bg-slate-900/30 p-4 md:p-5 border-b border-slate-700/40";

  const registroMembresia = membresias.find((m) => m.id === formData.membership_id);
  const precioSeleccionado = registroMembresia?.price || 0;

  if (tipoRegistro === "entrenador") {
    return (
      <RegistrarEntrenador
        onUserRegistered={onUserRegistered}
        tipoRegistro={tipoRegistro}
        onTipoRegistroChange={setTipoRegistro}
      />
    );
  }

  if (tipoRegistro === "nutriologo") {
    return (
      <RegistrarNutriologo
        onUserRegistered={onUserRegistered}
        tipoRegistro={tipoRegistro}
        onTipoRegistroChange={setTipoRegistro}
      />
    );
  }

  return (
    <div className="relative mb-6">
      <div className="absolute -top-10 left-12 h-36 w-36 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 right-16 h-36 w-36 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl bg-linear-to-br from-slate-800/90 via-slate-900/90 to-slate-950/90 p-5 md:p-7 text-gray-100 rounded-2xl">
        <ErrorModal isOpen={mostrarModalError} onClose={() => setMostrarModalError(false)} title={tituloError} message={mensajeError} />

        <ModalExito
          isOpen={mostrarModalExito}
          onClose={() => { setMostrarModalExito(false); setMostrarFormulaioSalud(false); }}
          title="¡Registro Exitoso!"
          message={mensajeExito}
          subMessage={mensajeSubExito}
        >
          {mostrarFormulaioSalud && (
            <div className="mt-2">
              <p className="text-xs text-slate-400 mb-2">Completa ahora la ficha médica inicial del cliente antes de su primer acceso.</p>
              <FormularioSaludAdmin
                miembroEmail={emailReciente}
                onClose={() => { setMostrarFormulaioSalud(false); setMostrarModalExito(false); }}
                onSaved={() => { if (onUserRegistered) onUserRegistered(); }}
              />
            </div>
          )}
        </ModalExito>

        <div className="mb-8 relative">
          <div className="absolute -top-8 left-0 w-96 h-24 bg-linear-to-r from-blue-500/20 via-cyan-500/20 to-blue-500/20 blur-3xl rounded-full" />
          <div className="relative">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-wide text-blue-400">
              Registro
            </h2>
          </div>
          <p className="text-slate-400 text-sm mt-3 tracking-wide">Crea una nueva cuenta en FitData GYM</p>
        </div>

        <form onSubmit={manejarEnvio} className="grid grid-cols-12 gap-4 md:gap-5">
          <section className={`${cardClass} col-span-12`}>
            <label className={labelClass}>Tipo de registro</label>
            <select
              value={tipoRegistro}
              onChange={(e) => setTipoRegistro(e.target.value)}
              className={fieldClass}
            >
              <option value="cliente">Cliente</option>
              <option value="entrenador">Entrenador</option>
              <option value="nutriologo">Nutriólogo</option>
            </select>
          </section>

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
                <label className={labelClass}>Teléfono (10 dígitos)</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={manejarCambio}
                  className={fieldClass}
                  pattern="[0-9]{10}"
                  maxLength={10}
                  required
                />
              </div>

              <div className="col-span-12 md:col-span-6">
                <label className={labelClass}>Sexo</label>
                <select name="sexo" value={formData.sexo} onChange={manejarCambio} className={fieldClass} required>
                  <option value="">-- Selecciona --</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </div>
            </div>
          </section>

          <section className={`${cardClass} col-span-12`}>
            <h3 className="text-sm font-bold text-slate-200 mb-3">Acceso</h3>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-6">
                <label className={labelClass}>Contraseña Temporal</label>
                <input type="password" name="password" value={formData.password} onChange={manejarCambio} className={fieldClass} required />
              </div>
              <div className="col-span-12 md:col-span-6">
                <label className={labelClass}>Confirmar Contraseña</label>
                <input type="password" name="confirm_password" value={formData.confirm_password} onChange={manejarCambio} className={fieldClass} required />
              </div>
            </div>
          </section>

          <section className={`${cardClass} col-span-12 border-cyan-500/30 bg-cyan-950/15`}>
            <h3 className="text-lg font-black tracking-tight text-cyan-300 mb-3">Asignación Inicial</h3>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-6">
                <label className={labelClass}>Membresía</label>
                <select
                  name="membership_id"
                  value={formData.membership_id}
                  onChange={manejarCambio}
                  className={fieldClass}
                  required
                >
                  <option value="">-- Selecciona --</option>
                  {membresias.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} - ${m.price}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-12 md:col-span-6">
                <label className={labelClass}>Método de Pago</label>
                <select
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={manejarCambio}
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
                  <span className="col-span-8 md:col-span-4 text-2xl font-black text-emerald-400">${precioSeleccionado.toFixed(2)}</span>
                  <span className="col-span-4 md:col-span-4 text-right text-xs text-slate-500">IVA incluido</span>
                </div>

                {formData.payment_method === "EFECTIVO" && (
                  <div className="border-t border-slate-700 pt-3 animate-fade-in">
                    <div className="grid grid-cols-12 gap-3 items-center mb-2">
                      <label className="col-span-12 md:col-span-4 text-sm font-semibold text-slate-300">Dinero Recibido</label>
                      <input
                        type="number"
                        value={montoRecibido}
                        onChange={manejarCambioMonto}
                        className="col-span-12 md:col-span-8 bg-slate-900 border border-slate-500 rounded-lg px-4 py-2.5 text-white text-right font-mono text-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex justify-between items-center rounded-lg bg-black/25 px-3 py-2">
                      <span className="text-sm font-bold text-slate-400">Cambio</span>
                      <span className={`text-xl font-black font-mono ${cambio < 0 ? "text-red-400" : "text-yellow-300"}`}>
                        ${cambio.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <div className="col-span-12 mt-1">
            <button
              type="submit"
              disabled={cargando}
              className={`w-full rounded-lg bg-linear-to-r from-fuchsia-600 via-violet-600 to-cyan-600 px-5 py-3.5 text-white font-black tracking-wide shadow-xl transition-all hover:brightness-110 active:scale-[0.99] flex justify-center items-center gap-2 ${cargando ? "opacity-70 cursor-not-allowed" : ""}`}
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
                "Registrar y Asignar"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegistrarUsuario;
