export const ETIQUETAS_TIPO_SERVICIO = {
  PERSONAL: 'Personal',
  GRUPAL: 'Grupal',
};

export const normalizarTipoServicio = (valor) => {
  const raw = String(valor || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw.includes('grupal') || raw.includes('group') || raw.includes('grupo')) return 'GRUPAL';
  if (raw.includes('personal') || raw.includes('individual') || raw.includes('uno a uno') || raw.includes('1 a 1')) return 'PERSONAL';
  if (raw === 'grupal') return 'GRUPAL';
  if (raw === 'personal') return 'PERSONAL';
  return '';
};

export const formatearMoneda = (valor) => Number(valor || 0).toLocaleString();

export const normalizarLlaveEntrenador = (entrenador = {}) => {
  const authUid = String(entrenador.authUid || entrenador.uid || entrenador.id || '').trim().toLowerCase();
  const email = String(entrenador.email || '').trim().toLowerCase();
  const nombre = String(entrenador.displayName || '').trim().toLowerCase();
  return authUid || email || nombre;
};

const obtenerPrecioBase = (entrenador = {}) => {
  const value = Number(
    entrenador.trainerServicePrice ?? entrenador.personalServicePrice ?? entrenador.groupServicePrice ??
    entrenador.servicePrice ?? entrenador.costoServicio ?? entrenador.costo_servicio ?? entrenador.price ?? 0
  );
  return Number.isFinite(value) && value > 0 ? value : 0;
};

export const obtenerConfiguracionServicio = (entrenador = {}) => {
  const precioBase = obtenerPrecioBase(entrenador);
  const opciones = entrenador.serviceOptions || entrenador.service_options || entrenador.serviceTypes || entrenador.service_types || {};
  const precioPersonal = Number(entrenador.personalServicePrice ?? entrenador.personal_service_price ?? opciones.personalPrice ?? opciones.personal_price ?? precioBase);
  const precioGrupal = Number(entrenador.groupServicePrice ?? entrenador.group_service_price ?? opciones.groupPrice ?? opciones.group_price ?? precioBase);
  const ofrecePersonal = entrenador.offersPersonalService ?? entrenador.personalServiceEnabled ?? opciones.personal ?? opciones.PERSONAL;
  const ofreceGrupal = entrenador.offersGroupService ?? entrenador.groupServiceEnabled ?? opciones.group ?? opciones.GRUPAL;

  return {
    offersPersonal: ofrecePersonal === undefined ? precioBase > 0 : Boolean(ofrecePersonal),
    offersGroup: ofreceGrupal === undefined ? precioBase > 0 : Boolean(ofreceGrupal),
    personalPrice: Number.isFinite(precioPersonal) && precioPersonal > 0 ? precioPersonal : precioBase,
    groupPrice: Number.isFinite(precioGrupal) && precioGrupal > 0 ? precioGrupal : precioBase,
  };
};

export const obtenerPrecioPorTipoServicio = (entrenador = {}, tipoServicio = 'PERSONAL') => {
  const config = obtenerConfiguracionServicio(entrenador);
  const tipo = normalizarTipoServicio(tipoServicio) || 'PERSONAL';
  return tipo === 'GRUPAL' ? config.groupPrice : config.personalPrice;
};