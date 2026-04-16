export const CLAVE_HIDDEN_CLIENTES = 'fitdata:hidden-clientes';
export const EVENTO_VISIBILIDAD_CLIENTES = 'fitdata:clientes-ocultos-changed';

const leerJsonSeguro = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

export const obtenerClientesOcultos = () => {
  const ids = leerJsonSeguro(localStorage.getItem(CLAVE_HIDDEN_CLIENTES), []);
  return new Set(Array.isArray(ids) ? ids.map((id) => String(id || '').trim()).filter(Boolean) : []);
};

const normalizarToken = (value) => String(value || '').trim().toLowerCase();

const extraerTokensCliente = (cliente = {}) => {
  if (!cliente || typeof cliente !== 'object') {
    const token = normalizarToken(cliente);
    return token ? [token] : [];
  }

  const nombreCompleto = String(
    cliente.nombreCompleto ||
    cliente.memberName ||
    cliente.miembro_nombre ||
    cliente.cliente_nombre_completo ||
    cliente.nombre ||
    ''
  ).trim();
  const nombre = String(cliente.nombre || cliente.first_name || cliente.firstName || '').trim();
  const apellido = String(cliente.apellido || cliente.last_name || cliente.lastName || '').trim();
  const correo = String(cliente.email || cliente.correo || cliente.clienteEmail || cliente.cliente_email || '').trim();

  return [
    cliente.id,
    cliente.memberId,
    cliente.miembro,
    cliente.miembro_id,
    cliente.clientId,
    cliente.cliente_id,
    correo,
    nombreCompleto,
    `${nombre} ${apellido}`,
    nombre,
    apellido,
  ].map(normalizarToken).filter(Boolean);
};

export const ocultarClienteLocalmente = (memberOrCliente) => {
  const tokens = extraerTokensCliente(memberOrCliente);
  if (tokens.length === 0) return;
  const hidden = obtenerClientesOcultos();
  tokens.forEach((token) => hidden.add(token));
  localStorage.setItem(CLAVE_HIDDEN_CLIENTES, JSON.stringify(Array.from(hidden)));
  window.dispatchEvent(new CustomEvent(EVENTO_VISIBILIDAD_CLIENTES, { detail: { tokens, hidden: true } }));
};

export const mostrarClienteLocalmente = (memberOrCliente) => {
  const tokens = extraerTokensCliente(memberOrCliente);
  if (tokens.length === 0) return;
  const hidden = obtenerClientesOcultos();
  tokens.forEach((token) => hidden.delete(token));
  localStorage.setItem(CLAVE_HIDDEN_CLIENTES, JSON.stringify(Array.from(hidden)));
  window.dispatchEvent(new CustomEvent(EVENTO_VISIBILIDAD_CLIENTES, { detail: { tokens, hidden: false } }));
};

const obtenerCandidatosCliente = (cliente = {}) => extraerTokensCliente(cliente);

export const filtrarClientesOcultos = (clientes = []) => {
  const hidden = obtenerClientesOcultos();
  return (Array.isArray(clientes) ? clientes : []).filter((cliente) => !obtenerCandidatosCliente(cliente).some((token) => hidden.has(token)));
};
