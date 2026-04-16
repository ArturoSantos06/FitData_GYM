import {
  getCurrentUser,
  getUser,
  getUserByAuthUid,
  getUserByEmail,
} from './firebase';

const TIPO_CONTRATO_POR_DEFECTO = 'Comisiones';

export const OPCIONES_CONTRATO = [
  'Comisiones',
  'Asimilados a Salarios',
  'Honorarios (Persona Fisica)',
];

export const normalizarCorreo = (correo) => String(correo || '').trim().toLowerCase();

export const obtenerValorFecha = (valor) => {
  if (!valor) return 0;
  if (typeof valor?.toDate === 'function') return valor.toDate().getTime();
  const parseado = new Date(valor).getTime();
  return Number.isNaN(parseado) ? 0 : parseado;
};

export const dividirNombre = (usuario) => {
  const nombre = String(usuario?.firstName || '').trim();
  const apellido = String(usuario?.lastName || '').trim();
  if (nombre || apellido) return { firstName: nombre, lastName: apellido };

  const completo = String(usuario?.nombre || usuario?.displayName || '').trim();
  if (!completo) return { firstName: '', lastName: '' };

  const partes = completo.split(/\s+/);
  if (partes.length === 1) return { firstName: partes[0], lastName: '' };
  return { firstName: partes[0], lastName: partes.slice(1).join(' ') };
};

export const normalizarTipoContrato = (valor) => {
  const raw = String(valor || '').trim();
  if (!raw) return TIPO_CONTRATO_POR_DEFECTO;

  const limpio = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (limpio.includes('asignacion') && limpio.includes('cliente')) return 'Comisiones';
  if (limpio.includes('asimilados') && limpio.includes('salarios')) return 'Asimilados a Salarios';
  if (limpio.includes('honorarios')) return 'Honorarios (Persona Fisica)';
  if (limpio.includes('comision')) return 'Comisiones';

  return raw;
};

export const obtenerConfiguracionServicios = (usuario = {}) => {
  const precioLegacy = Number(
    usuario.personalServicePrice ?? usuario.groupServicePrice ?? usuario.trainerServicePrice ??
    usuario.servicePrice ?? usuario.costoServicio ?? usuario.costo_servicio ?? 0
  );

  const opciones = usuario.serviceOptions || usuario.service_options || usuario.serviceTypes || usuario.service_types || {};
  const precioPersonal = Number(usuario.personalServicePrice ?? usuario.personal_service_price ?? opciones.personalPrice ?? opciones.personal_price ?? precioLegacy);
  const precioGrupal = Number(usuario.groupServicePrice ?? usuario.group_service_price ?? opciones.groupPrice ?? opciones.group_price ?? precioLegacy);
  const ofrecePersonal = usuario.offersPersonalService ?? usuario.personalServiceEnabled ?? opciones.personal ?? opciones.PERSONAL;
  const ofreceGrupal = usuario.offersGroupService ?? usuario.groupServiceEnabled ?? opciones.group ?? opciones.GRUPAL;

  return {
    offersPersonal: ofrecePersonal === undefined ? precioLegacy > 0 : Boolean(ofrecePersonal),
    offersGroup: ofreceGrupal === undefined ? precioLegacy > 0 : Boolean(ofreceGrupal),
    personalPrice: Number.isFinite(precioPersonal) && precioPersonal > 0 ? precioPersonal : 0,
    groupPrice: Number.isFinite(precioGrupal) && precioGrupal > 0 ? precioGrupal : 0,
  };
};

export const resolverEntrenadorDesdeSesion = async () => {
  const firebaseUser = getCurrentUser();
  if (!firebaseUser) return { success: false, error: 'No hay sesión activa' };

  const porAuthUid = await getUserByAuthUid(firebaseUser.uid);
  const porDocId = await getUser(firebaseUser.uid);
  const correo = normalizarCorreo(firebaseUser.email);
  const porCorreo = correo ? await getUserByEmail(correo, firebaseUser.uid) : null;

  const candidatos = [
    porAuthUid?.success ? porAuthUid.data : null,
    porDocId?.success ? porDocId.data : null,
    porCorreo?.success ? porCorreo.data : null,
  ].filter(Boolean);

  if (candidatos.length === 0) {
    return { success: false, error: 'No se pudieron cargar los datos del entrenador' };
  }

  const principal = candidatos[0];
  const combinado = candidatos.reduce((acc, item) => ({ ...item, ...acc }), { ...principal });
  return { success: true, data: combinado, authUser: firebaseUser };
};