import {
  getUsers,
  updateSelfProfile,
  updateUser,
} from './firebase';
import {
  dividirNombre,
  normalizarCorreo,
  normalizarTipoContrato,
  obtenerConfiguracionServicios,
  obtenerValorFecha,
  resolverEntrenadorDesdeSesion,
} from './perfilEntrenadorUtilidades';

const construirPayloadPerfil = ({ actualizado }) => {
  const telefono = String(actualizado.telefono || '').replace(/\D/g, '').slice(0, 10);
  const email = String(actualizado.email || '').trim().toLowerCase();
  const username = String(actualizado.username || '').trim();
  const firstName = String(actualizado.firstName || '').trim();
  const lastName = String(actualizado.lastName || '').trim();
  const selectedSpecialty = String(
    actualizado.trainer_specialty ||
    actualizado.specialty ||
    actualizado.especialidad ||
    actualizado.especialidadPrincipal ||
    actualizado.trainerSpecialty ||
    ''
  ).trim();
  const specialtyOther = String(actualizado.trainer_specialty_other || '').trim();
  const specialty = String(
    selectedSpecialty === 'Otro' ? specialtyOther : selectedSpecialty
  ).trim();
  const contractType = normalizarTipoContrato(actualizado.contractType || actualizado.tipoContrato || actualizado.contract_type || actualizado.tipo_contrato || '');
  const personal = Number(String(actualizado.personalServicePrice || actualizado.trainerServicePrice || '').replace(',', '.'));
  const grupal = Number(String(actualizado.groupServicePrice || actualizado.trainerServicePrice || '').replace(',', '.'));
  const offersPersonal = Boolean(actualizado.offersPersonalService);
  const offersGroup = Boolean(actualizado.offersGroupService);
  const rfc = String(actualizado.rfc || actualizado.RFC || '').trim().toUpperCase();
  const clabe = String(actualizado.clabe || actualizado.CLABE || '').replace(/\D/g, '').slice(0, 18);
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || username;

  if (!username) return { success: false, error: 'El nombre de usuario no puede estar vacío' };
  if (!selectedSpecialty) return { success: false, error: 'Selecciona una especialidad del entrenador' };
  if (selectedSpecialty === 'Otro' && !specialtyOther) return { success: false, error: 'Especifica la especialidad del entrenador' };
  if (!offersPersonal && !offersGroup) return { success: false, error: 'Debes habilitar al menos un tipo de servicio' };
  if (offersPersonal && (!Number.isFinite(personal) || personal <= 0)) return { success: false, error: 'Define un costo válido para el servicio personal' };
  if (offersGroup && (!Number.isFinite(grupal) || grupal <= 0)) return { success: false, error: 'Define un costo válido para el servicio grupal' };

  return {
    success: true,
    data: {
      email, username, displayName, firstName, lastName, phone: telefono, telefono,
      specialty,
      trainer_specialty: selectedSpecialty,
      trainer_specialty_other: selectedSpecialty === 'Otro' ? specialtyOther : '',
      trainerSpecialty: specialty,
      especialidad: specialty,
      especialidadPrincipal: specialty,
      contractType, tipoContrato: contractType, contract_type: contractType,
      offersPersonalService: offersPersonal, offersGroupService: offersGroup,
      serviceOptions: { personal: offersPersonal, group: offersGroup, PERSONAL: offersPersonal, GRUPAL: offersGroup },
      trainerServicePrice: offersPersonal ? personal : grupal, servicePrice: offersPersonal ? personal : grupal,
      personalServicePrice: personal, personal_service_price: personal, groupServicePrice: grupal, group_service_price: grupal,
      costoServicio: offersPersonal ? personal : grupal, costo_servicio: offersPersonal ? personal : grupal,
      rfc, RFC: rfc, clabe, CLABE: clabe, cuentaBancaria: clabe, numeroCuenta: clabe, accountNumber: clabe,
    },
  };
};

export async function cargarPerfilEntrenador() {
  const resultado = await resolverEntrenadorDesdeSesion();
  if (!resultado.success || !resultado.data) return resultado;

  const { data: entrenador, authUser } = resultado;
  const usersResult = await getUsers();
  const nombres = dividirNombre(entrenador);
  const tipoContrato = normalizarTipoContrato(entrenador.contractType || entrenador.tipoContrato || entrenador.contract_type || entrenador.tipo_contrato || '');
  const precioServicio = Number(entrenador.trainerServicePrice ?? entrenador.servicePrice ?? entrenador.costoServicio ?? entrenador.costo_servicio ?? 0);
  const configServicios = obtenerConfiguracionServicios(entrenador);

  const entrenadores = usersResult.success ? (usersResult.data || []).filter((item) => {
    const role = String(item.role || item.user_type || '').toLowerCase();
    return role === 'trainer' || role === 'entrenador' || role === 'coach' || item.isTrainer === true || item.is_trainer === true;
  }) : [];

  const llaveActual = normalizarCorreo(entrenador.email) || String(entrenador.authUid || entrenador.id || authUser.uid || '').trim().toLowerCase();
  const unicos = [];
  const vistas = new Set();

  entrenadores.slice().sort((a, b) => {
    const fa = obtenerValorFecha(a.createdAt || a.updatedAt);
    const fb = obtenerValorFecha(b.createdAt || b.updatedAt);
    if (fa !== fb) return fa - fb;
    return String(a.displayName || a.username || a.email || '').toLowerCase().localeCompare(String(b.displayName || b.username || b.email || '').toLowerCase());
  }).forEach((item) => {
    const llave = normalizarCorreo(item.email) || String(item.authUid || item.id || '').trim().toLowerCase();
    if (llave && !vistas.has(llave)) {
      vistas.add(llave);
      unicos.push(item);
    }
  });

  const indice = unicos.findIndex((item) => {
    const llave = normalizarCorreo(item.email) || String(item.authUid || item.id || '').trim().toLowerCase();
    return llave === llaveActual;
  });

  return {
    success: true,
    data: {
      ...entrenador,
      firstName: entrenador.firstName || nombres.firstName,
      lastName: entrenador.lastName || nombres.lastName,
      specialty: entrenador.specialty || entrenador.especialidad || entrenador.especialidadPrincipal || entrenador.trainerSpecialty || entrenador.trainer_specialty || '',
      trainer_specialty: entrenador.trainer_specialty || entrenador.specialty || entrenador.especialidad || entrenador.especialidadPrincipal || entrenador.trainerSpecialty || '',
      trainer_specialty_other: '',
      telefono: entrenador.telefono || entrenador.phone || '',
      contractType: tipoContrato,
      trainerServicePrice: Number.isFinite(precioServicio) && precioServicio > 0 ? precioServicio : 0,
      offersPersonalService: configServicios.offersPersonal,
      offersGroupService: configServicios.offersGroup,
      personalServicePrice: configServicios.personalPrice,
      groupServicePrice: configServicios.groupPrice,
      serviceOptions: { personal: configServicios.offersPersonal, group: configServicios.offersGroup, PERSONAL: configServicios.offersPersonal, GRUPAL: configServicios.offersGroup },
      rfc: entrenador.rfc || entrenador.RFC || '',
      clabe: entrenador.clabe || entrenador.CLABE || entrenador.cuentaBancaria || entrenador.numeroCuenta || entrenador.accountNumber || '',
    },
    trainerCode: indice >= 0 ? String(indice + 1).padStart(3, '0') : '---',
    authUser,
  };
}

export async function guardarPerfilEntrenador(usuarioActual, actualizado) {
  const userDocId = String(actualizado.id || usuarioActual?.id || usuarioActual?.authUser?.uid || '').trim();
  if (!userDocId) return { success: false, error: 'No se pudo identificar el usuario a actualizar' };

  const payloadResultado = construirPayloadPerfil({ actualizado });
  if (!payloadResultado.success) return payloadResultado;

  const payload = payloadResultado.data;
  const principal = await updateUser(userDocId, payload);
  if (!principal.success) {
    const fallback = await updateSelfProfile({ userId: userDocId, ...payload });
    if (!fallback.success) return { success: false, error: fallback.error || principal.error || 'No se pudo actualizar el perfil' };
  }

  return { success: true, data: { ...usuarioActual, ...actualizado, ...payload } };
}