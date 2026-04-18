export const normalizarTextoLlave = (valor) => String(valor || '').trim().toLowerCase();

export const fechaDesdeFirebase = (valor) => {
  if (!valor) return null;
  if (typeof valor?.toDate === 'function') return valor.toDate();
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};