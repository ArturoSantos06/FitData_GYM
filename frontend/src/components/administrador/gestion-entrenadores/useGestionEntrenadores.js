import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  db,
  getUsers,
  getAllTrainerRoutines,
  getAllTrainerNotes,
  getAllClientTrainerAssignments,
  getTrainerServiceSales,
  completeTrainerServicePayment,
  removeTrainerFromClient,
  deactivateTrainerByAdmin,
  reactivateTrainerByAdmin,
  createTrainerPayment,
  getTrainerPayments,
} from '../../../firebase';

export function useGestionEntrenadores() {
  // Estados principales
  const [serviciosEntrenamiento, setServiciosEntrenamiento] = useState([]);
  const [ventasServiciosEntrenador, setVentasServiciosEntrenador] = useState([]);
  const [entrenadores, setEntrenadores] = useState([]);
  const [entrenadoresInactivos, setEntrenadoresInactivos] = useState([]);
  const [pagosEntrenadores, setPagosEntrenadores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [pestanaActiva, setPestanaActiva] = useState('clientes');
  
  // Estados de control y acción
  const [idEntrenadorDesactivando, setIdEntrenadorDesactivando] = useState('');
  const [idEntrenadorReactivando, setIdEntrenadorReactivando] = useState('');
  const [idVentaServicioCompletando, setIdVentaServicioCompletando] = useState('');
  const [idClienteDesvinculando, setIdClienteDesvinculando] = useState('');
  const [servicioPendienteDesvincular, setServicioPendienteDesvincular] = useState(null);
  const [accionPendiente, setAccionPendiente] = useState(null);
  
  // Modales
  const [modalError, setModalError] = useState({ isOpen: false, title: '', message: '' });
  const [modalExito, setModalExito] = useState({ isOpen: false, title: '', message: '', subMessage: '' });
  const [modalPago, setModalPago] = useState({
    isOpen: false,
    trainerId: '',
    trainerName: '',
    trainerEmail: '',
    contractType: '',
    paymentMethod: 'DEPOSITO A CUENTA',
    amount: '',
    mes: 0,
    anio: 0,
  });
  
  // Filtros
  const [filtroMesPagos, setFiltroMesPagos] = useState(new Date().getMonth() + 1);
  const [filtroAnioPagos, setFiltroAnioPagos] = useState(new Date().getFullYear());
  const [filtroMesEntrenadores, setFiltroMesEntrenadores] = useState(new Date().getMonth() + 1);
  const [filtroAnioEntrenadores, setFiltroAnioEntrenadores] = useState(new Date().getFullYear());

  // ================== UTILIDADES ==================
  const aMs = (value) => {
    if (!value) return 0;
    if (typeof value?.toDate === 'function') return value.toDate().getTime();
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const normalizarClaveBusqueda = (value) => String(value || '').trim().toLowerCase();

  const esValorUtil = (value) => {
    const texto = String(value || '').trim();
    if (!texto) return false;
    const normalizado = texto.toLowerCase();
    return !['n/d', 'nd', 'n.a.', 'n/a', 'na', 'null', 'undefined'].includes(normalizado);
  };

  const elegirPrimerValorUtil = (...valores) => {
    for (const valor of valores) {
      if (esValorUtil(valor)) {
        return String(valor).trim();
      }
    }
    return '';
  };

  const buscarValorEnObjeto = (objeto, claves, nivelMaximo = 2) => {
    if (!objeto || typeof objeto !== 'object' || nivelMaximo < 0) {
      return '';
    }

    for (const clave of claves) {
      if (Object.prototype.hasOwnProperty.call(objeto, clave) && esValorUtil(objeto[clave])) {
        return String(objeto[clave]).trim();
      }
    }

    for (const valor of Object.values(objeto)) {
      if (!valor || typeof valor !== 'object') continue;
      const encontrado = buscarValorEnObjeto(valor, claves, nivelMaximo - 1);
      if (encontrado) {
        return encontrado;
      }
    }

    return '';
  };

  const normalizarEtiquetaTipoServicio = (value, fallback = 'Personal') => {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return fallback;
    if (raw.includes('grupal') || raw.includes('group') || raw.includes('grupo')) {
      return 'Grupal';
    }
    if (raw.includes('personal') || raw.includes('individual') || raw.includes('uno a uno') || raw.includes('1 a 1')) {
      return 'Personal';
    }
    return fallback;
  };

  const obtenerNombreVisualizacion = (user = {}, fallback = 'Cliente') => {
    const fullName = `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim();
    return (
      user.displayName ||
      fullName ||
      user.username ||
      user.nombre ||
      user.email ||
      fallback
    );
  };

  const obtenerNombreEntrenador = (user = {}, fallback = 'Entrenador') => {
    const fullName = `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim();
    const nombreDirecto = String(user.nombre || user.fullName || user.full_name || '').trim();

    return (
      user.displayName ||
      nombreDirecto ||
      fullName ||
      user.username ||
      fallback
    );
  };

  const obtenerEspecialidadEntrenador = (user = {}) => {
    const especialidad = elegirPrimerValorUtil(
      user.trainer_specialty,
      user.specialty,
      user.especialidad,
      user.especialidadPrincipal,
      user.trainerSpecialty,
      user.trainerSpecialtyName,
      user.area,
      user.focus,
      user.profile?.specialty,
      user.profile?.especialidad,
      user.trainerData?.specialty,
      user.trainerData?.especialidad,
      user.data?.specialty,
      user.data?.especialidad,
      user.specialty_name,
      user.especialidad_name,
      user.trainerSpecialtyOther,
      user.trainer_specialty_other,
    );

    const especialidadAnidada = buscarValorEnObjeto(user, [
      'trainer_specialty',
      'specialty',
      'especialidad',
      'especialidadPrincipal',
      'trainerSpecialty',
      'trainerSpecialtyName',
      'specialty_name',
      'especialidad_name',
    ]);

    if (!especialidad && !especialidadAnidada) {
      return 'N/D';
    }

    const valorBase = especialidad || especialidadAnidada;

    if (valorBase.toLowerCase() === 'otro') {
      const otro = elegirPrimerValorUtil(
        user.trainer_specialty_other,
        user.specialty_other,
        user.especialidad_otro,
        buscarValorEnObjeto(user, ['trainer_specialty_other', 'specialty_other', 'especialidad_otro'])
      );
      return otro || valorBase;
    }

    return valorBase;
  };

  const obtenerTipoContratoEntrenador = (user = {}, fallback = 'N/D') => {
    const contractType = elegirPrimerValorUtil(
      user.contractType,
      user.tipoContrato,
      user.contract_type,
      user.contractTypeName,
      user.tipo_contrato,
      fallback
    );

    return contractType || fallback;
  };

  const obtenerClavesEntrenador = (entrenador = {}) => {
    const nombreCompleto = `${entrenador.firstName || entrenador.first_name || ''} ${entrenador.lastName || entrenador.last_name || ''}`.trim();
    const nombreDirecto = `${entrenador.nombre || ''}`.trim();

    return [
      entrenador.authUid,
      entrenador.uid,
      entrenador.email,
      entrenador.trainerEmail,
      entrenador.trainer_email,
      entrenador.username,
      entrenador.displayName,
      nombreDirecto,
      nombreCompleto,
      entrenador.id,
      entrenador.legacyId,
    ]
      .map(normalizarClaveBusqueda)
      .filter(Boolean);
  };

  const fusionarEntrenadores = (base = {}, nuevo = {}) => {
    const resultado = { ...base };
    const camposDirectos = [
      'id',
      'legacyId',
      'authUid',
      'uid',
      'email',
      'trainerEmail',
      'trainer_email',
      'username',
      'displayName',
      'nombre',
      'firstName',
      'first_name',
      'lastName',
      'last_name',
      'specialty',
      'especialidad',
      'especialidadPrincipal',
      'trainer_specialty',
      'trainer_specialty_other',
      'trainerSpecialty',
      'area',
      'focus',
      'profile',
      'trainerData',
      'data',
      'contractType',
      'tipoContrato',
      'contract_type',
      'contractTypeName',
      'tipo_contrato',
      'isActive',
      'trainerStatus',
      'contractStatus',
      'role',
      'user_type',
      'trainerActive',
    ];

    camposDirectos.forEach((campo) => {
      const valorNuevo = nuevo?.[campo];
      const valorActual = resultado?.[campo];
      const estaVacio = !esValorUtil(valorActual);
      if (estaVacio && esValorUtil(valorNuevo)) {
        resultado[campo] = valorNuevo;
      }
    });

    Object.keys(nuevo || {}).forEach((campo) => {
      const valorNuevo = nuevo[campo];
      const valorActual = resultado[campo];
      const estaVacio = !esValorUtil(valorActual);
      if (estaVacio && esValorUtil(valorNuevo)) {
        resultado[campo] = valorNuevo;
      }
    });

    return resultado;
  };

  const deduplicarEntrenadores = (lista = []) => {
    const entrenadoresUnicos = [];
    const indicesPorClave = new Map();

    lista.forEach((entrenador) => {
      const claves = obtenerClavesEntrenador(entrenador);
      const claveExistente = claves.find((clave) => indicesPorClave.has(clave));

      if (claveExistente) {
        const posicion = indicesPorClave.get(claveExistente);
        entrenadoresUnicos[posicion] = fusionarEntrenadores(entrenadoresUnicos[posicion], entrenador);
        claves.forEach((clave) => indicesPorClave.set(clave, posicion));
        return;
      }

      const posicionNueva = entrenadoresUnicos.length;
      entrenadoresUnicos.push({ ...entrenador });
      claves.forEach((clave) => indicesPorClave.set(clave, posicionNueva));
    });

    return entrenadoresUnicos;
  };

  const registrarClavesBusqueda = (map, keys, value) => {
    keys.forEach((key) => {
      const normalizedKey = normalizarClaveBusqueda(key);
      if (normalizedKey) {
        map.set(normalizedKey, value);
      }
    });
  };

  const obtenerProductosVenta = (venta = {}) => {
    const rawDetail = venta.detalle_productos || venta.detalleProductos || venta.detalle_producto || venta.productos || venta.items || null;
    if (!rawDetail) return [];

    if (Array.isArray(rawDetail)) {
      return rawDetail;
    }

    if (typeof rawDetail === 'string') {
      try {
        const parsed = JSON.parse(rawDetail);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        try {
          const parsed = JSON.parse(String(rawDetail).replace(/'/g, '"'));
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
    }

    return [];
  };

  const obtenerMetodoPagoVenta = (venta = {}) => {
    const metodo = String(
      venta.metodo_pago ||
      venta.metodoPago ||
      venta.paymentMethod ||
      venta.payment_method ||
      venta.forma_pago ||
      venta.paymentType ||
      venta.metodo ||
      ''
    ).trim();

    return metodo ? metodo.toUpperCase() : 'N/D';
  };

  const obtenerMontoVenta = (venta = {}) => {
    const totalDirecto = Number(
      venta.total ||
      venta.amount ||
      venta.monto ||
      venta.monto_recibido ||
      venta.montoTotal ||
      venta.monto_total ||
      venta.trainerServicePrice ||
      venta.trainer_service_price ||
      0
    );

    if (Number.isFinite(totalDirecto) && totalDirecto > 0) {
      return totalDirecto;
    }

    const productos = obtenerProductosVenta(venta);
    if (productos.length === 0) return 0;

    return productos.reduce((sum, item) => {
      const cantidad = Number(item?.cantidad || item?.qty || 1) || 1;
      const precio = Number(item?.precio || item?.price || item?.monto || 0) || 0;
      return sum + (cantidad * precio);
    }, 0);
  };

  const obtenerEstadoVenta = (venta = {}) => {
    const estado = String(
      venta.payment_status ||
      venta.paymentStatus ||
      venta.estado ||
      venta.status ||
      venta.estado_pago ||
      ''
    ).trim().toLowerCase();

    if (!estado) return 'pending';
    if (estado === 'completed' || estado === 'completado' || estado === 'pagado') return 'completed';
    if (estado === 'pending' || estado === 'pendiente') return 'pending';
    return estado;
  };

  const normalizarClaveEntrenador = (routine = {}) => {
    const uid = String(routine.createdBy || '').trim();
    const email = String(routine.trainerEmail || '').trim().toLowerCase();
    return uid || email || 'unknown-trainer';
  };

  const esUsuarioEntrenador = (user = {}) => {
    const role = String(user.role || user.user_type || '').toLowerCase();
    return Boolean(
      user.isActive !== false &&
      user.trainerStatus !== 'inactive' &&
      (
        role === 'trainer' ||
        role === 'entrenador' ||
        role === 'coach' ||
        user.isTrainer === true ||
        user.is_trainer === true
      )
    );
  };

  const esEntrenadorInactivo = (user = {}) => {
    const role = String(user.role || user.user_type || '').toLowerCase();
    const looksTrainer =
      role === 'inactive_trainer' ||
      role === 'trainer' ||
      role === 'entrenador' ||
      role === 'coach' ||
      user.trainer === true ||
      user.contractType ||
      user.tipoContrato;

    const isInactive =
      user.isActive === false ||
      user.trainerActive === false ||
      String(user.trainerStatus || '').toLowerCase() === 'inactive' ||
      String(user.contractStatus || '').toLowerCase() === 'inactive' ||
      role === 'inactive_trainer';

    return Boolean(looksTrainer && isInactive);
  };

  // ================== CARGA DE DATOS ==================
  useEffect(() => {
    setCargando(true);
    const promesas = Promise.all([
      getUsers(),
      getAllTrainerRoutines(),
      getAllClientTrainerAssignments(),
      getTrainerServiceSales(),
      getTrainerPayments(),
    ]).then(([usuariosResp, rutinasResp, asignacionesResp, ventasResp, pagosResp]) => {
      const usuarios = Array.isArray(usuariosResp) ? usuariosResp : (usuariosResp?.data || []);
      const rutinas = Array.isArray(rutinasResp) ? rutinasResp : (rutinasResp?.data || []);
      const asignaciones = Array.isArray(asignacionesResp) ? asignacionesResp : (asignacionesResp?.data || []);
      const ventas = Array.isArray(ventasResp) ? ventasResp : (ventasResp?.data || []);
      const pagos = Array.isArray(pagosResp) ? pagosResp : (pagosResp?.data || []);
      const entrenadoresActivos = deduplicarEntrenadores(usuarios.filter(esUsuarioEntrenador));
      const entrenadoresInactList = deduplicarEntrenadores(usuarios.filter(esEntrenadorInactivo));

      const usuariosPorClave = new Map();
      const ventasPorClave = new Map();

      const registrarUsuario = (usuario) => {
        const nombreCompleto = `${usuario.firstName || usuario.first_name || ''} ${usuario.lastName || usuario.last_name || ''}`.trim();
        [
          usuario.id,
          usuario.legacyId,
          usuario.authUid,
          usuario.email,
          usuario.username,
          usuario.displayName,
          usuario.nombre,
          nombreCompleto,
        ].forEach((valor) => {
          const clave = normalizarClaveBusqueda(valor);
          if (clave) usuariosPorClave.set(clave, usuario);
        });
      };

      const registrarVenta = (venta) => {
        [
          venta.id,
          venta.saleId,
          venta.folio,
          venta.clientId,
          venta.cliente_id,
          venta.cliente,
          venta.cliente_auth_uid,
          venta.clientEmail,
          venta.clienteEmail,
          venta.trainerId,
          venta.trainer_id,
          venta.trainerEmail,
          venta.trainer_email,
        ].forEach((valor) => {
          const clave = normalizarClaveBusqueda(valor);
          if (clave) ventasPorClave.set(clave, venta);
        });
      };

      usuarios.forEach(registrarUsuario);
      ventas.forEach(registrarVenta);

      const resolverUsuario = (valor) => usuariosPorClave.get(normalizarClaveBusqueda(valor)) || null;
      const resolverVenta = (valor) => ventasPorClave.get(normalizarClaveBusqueda(valor)) || null;

      const obtenerNombreDesdeUsuario = (usuario, fallback) => {
        if (!usuario) return fallback;
        const nombreCompleto = `${usuario.firstName || usuario.first_name || ''} ${usuario.lastName || usuario.last_name || ''}`.trim();
        return usuario.displayName || nombreCompleto || usuario.username || usuario.nombre || fallback;
      };

      const obtenerFechaAsignacion = (asignacion, ventaRelacionada) => (
        asignacion.assignedAt || asignacion.createdAt || asignacion.updatedAt || ventaRelacionada?.createdAt || ventaRelacionada?.fecha || null
      );

      const obtenerEstadoAsignacion = (asignacion) => String(asignacion.status || asignacion.estado || 'active').toLowerCase() || 'active';

      const asignacionesEnriquecidas = asignaciones.map((asignacion) => {
        const ventaRelacionada = resolverVenta(
          asignacion.saleId ||
          asignacion.sale_id ||
          asignacion.folio ||
          asignacion.clientId ||
          asignacion.memberId
        );

        const cliente = resolverUsuario(
          asignacion.clientId ||
          asignacion.memberId ||
          asignacion.client ||
          asignacion.cliente ||
          asignacion.cliente_id ||
          asignacion.cliente_auth_uid ||
          ventaRelacionada?.clientId ||
          ventaRelacionada?.cliente_id ||
          ventaRelacionada?.cliente ||
          ventaRelacionada?.cliente_auth_uid ||
          ventaRelacionada?.clientEmail ||
          ventaRelacionada?.clienteEmail
        );

        const entrenador = resolverUsuario(
          asignacion.trainerId ||
          asignacion.trainer_id ||
          asignacion.trainer ||
          asignacion.entrenador ||
          ventaRelacionada?.trainerId ||
          ventaRelacionada?.trainer_id ||
          ventaRelacionada?.trainerEmail ||
          ventaRelacionada?.trainer_email
        );

        return {
          ...asignacion,
          clientId: asignacion.clientId || asignacion.memberId || asignacion.client || asignacion.cliente || ventaRelacionada?.clientId || ventaRelacionada?.cliente_id || ventaRelacionada?.cliente || '',
          trainerId: asignacion.trainerId || asignacion.trainer_id || ventaRelacionada?.trainerId || ventaRelacionada?.trainer_id || '',
          clientName: obtenerNombreDesdeUsuario(
            cliente,
            asignacion.clientName || asignacion.clienteNombre || ventaRelacionada?.clienteNombre || 'Cliente desconocido'
          ),
          clientEmail: asignacion.clientEmail || asignacion.clienteEmail || cliente?.email || ventaRelacionada?.clientEmail || ventaRelacionada?.clienteEmail || '',
          trainerName: obtenerNombreDesdeUsuario(
            entrenador,
            asignacion.trainerName || asignacion.trainer_name || ventaRelacionada?.trainerName || ventaRelacionada?.trainer_name || 'Entrenador desconocido'
          ),
          trainerEmail: asignacion.trainerEmail || asignacion.trainer_email || entrenador?.email || ventaRelacionada?.trainerEmail || ventaRelacionada?.trainer_email || '',
          serviceType: asignacion.serviceType || asignacion.service_type || ventaRelacionada?.serviceType || ventaRelacionada?.service_type || 'PERSONAL',
          serviceLabel: asignacion.serviceLabel || asignacion.service_label || ventaRelacionada?.serviceLabel || ventaRelacionada?.service_label || 'Personal',
          price: Number(asignacion.servicePrice || asignacion.service_price || ventaRelacionada?.servicePrice || ventaRelacionada?.trainerServicePrice || ventaRelacionada?.trainer_service_price || ventaRelacionada?.total || 0),
          assignedAt: obtenerFechaAsignacion(asignacion, ventaRelacionada),
          status: obtenerEstadoAsignacion(asignacion),
        };
      });

      const ventasEnriquecidas = ventas.map((venta) => {
        const cliente = resolverUsuario(
          venta.clientId ||
          venta.cliente_id ||
          venta.cliente ||
          venta.cliente_auth_uid ||
          venta.clientEmail ||
          venta.clienteEmail
        );

        const entrenador = resolverUsuario(
          venta.trainerId ||
          venta.trainer_id ||
          venta.trainer ||
          venta.trainerEmail ||
          venta.trainer_email
        );

        const metodoPago = obtenerMetodoPagoVenta(venta);
        const total = obtenerMontoVenta(venta);
        const estadoVenta = obtenerEstadoVenta(venta);

        const fecha = venta.createdAt || venta.fecha || venta.assignedAt || null;

        const clientName = obtenerNombreDesdeUsuario(
          cliente,
          venta.clienteNombre || venta.clientName || venta.cliente_nombre_override || 'Cliente'
        );

        const trainerName = obtenerNombreDesdeUsuario(
          entrenador,
          venta.trainerName || venta.trainer_name || 'Entrenador'
        );

        return {
          ...venta,
          clientId: venta.clientId || venta.cliente_id || venta.cliente || venta.cliente_auth_uid || '',
          clientName,
          clientEmail: venta.clientEmail || venta.clienteEmail || cliente?.email || '',
          trainerId: venta.trainerId || venta.trainer_id || '',
          trainerName,
          trainer_name: trainerName,
          trainerEmail: venta.trainerEmail || venta.trainer_email || entrenador?.email || '',
          metodo_pago: metodoPago,
          payment_method: metodoPago,
          paymentMethod: metodoPago,
          metodo: metodoPago,
          total,
          amount: total,
          monto: total,
          monto_recibido: Number(venta.monto_recibido || total || 0),
          createdAt: fecha,
          fecha,
          payment_status: estadoVenta,
          paymentStatus: estadoVenta,
          status: estadoVenta,
          estado: estadoVenta === 'completed' ? 'completado' : 'pendiente',
        };
      });

      const pagosEnriquecidos = pagos.map((pago) => {
        const total = Number(
          pago.total ||
          pago.amount ||
          pago.monto ||
          pago.monto_recibido ||
          0
        );

        return {
          ...pago,
          trainerId: pago.trainerId || pago.trainer_id || '',
          trainerEmail: pago.trainerEmail || pago.trainer_email || '',
          trainerName: pago.trainerName || pago.trainer_nombre || pago.trainer_name || 'Entrenador',
          contractType: pago.contractType || pago.contract_type || pago.tipoContrato || '',
          metodo_pago: String(pago.metodo_pago || pago.paymentMethod || pago.payment_method || 'N/D').trim().toUpperCase() || 'N/D',
          paymentMethod: String(pago.paymentMethod || pago.metodo_pago || pago.payment_method || 'N/D').trim().toUpperCase() || 'N/D',
          total,
          amount: total,
          monto: total,
          monto_recibido: Number(pago.monto_recibido || total || 0),
          createdAt: pago.createdAt || pago.fecha || null,
          fecha: pago.fecha || pago.createdAt || null,
        };
      });

      const coincideEntrenador = (item = {}, claves = []) => {
        const clavesItem = [
          item.trainerId,
          item.trainer_id,
          item.trainerEmail,
          item.trainer_email,
          item.trainerName,
          item.trainer_name,
          item.trainer_nombre,
        ]
          .map(normalizarClaveBusqueda)
          .filter(Boolean);

        return clavesItem.some((claveItem) => claves.includes(claveItem));
      };

      const entrenadoresConResumen = entrenadoresActivos.map((entrenador) => {
        const clavesEntrenador = obtenerClavesEntrenador(entrenador);
        const asignacionesDelEntrenador = asignacionesEnriquecidas.filter((asignacion) => coincideEntrenador(asignacion, clavesEntrenador));
        const pagosDelEntrenador = pagosEnriquecidos.filter((pago) => coincideEntrenador(pago, clavesEntrenador));

        const clientesUnicos = new Set();
        asignacionesDelEntrenador.forEach((asignacion) => {
          const clientKey = normalizarClaveBusqueda(
            asignacion.clientId ||
            asignacion.clientEmail ||
            asignacion.clientName ||
            asignacion.clienteNombre
          );
          if (clientKey) {
            clientesUnicos.add(clientKey);
          }
        });

        const contratosActivos = asignacionesDelEntrenador.filter((asignacion) => {
          const assignmentStatus = String(asignacion.status || asignacion.estado || 'active').trim().toLowerCase();
          return assignmentStatus === 'active' || assignmentStatus === 'activo';
        }).length;

        const nombreCompleto = `${entrenador.firstName || entrenador.first_name || ''} ${entrenador.lastName || entrenador.last_name || ''}`.trim();
        const specialty = obtenerEspecialidadEntrenador(entrenador);
        const contractType = obtenerTipoContratoEntrenador(entrenador, pagosDelEntrenador[0]?.contractType || 'N/D');

        return {
          ...entrenador,
          name: obtenerNombreEntrenador(entrenador, nombreCompleto || 'Entrenador'),
          email: entrenador.email || entrenador.trainerEmail || entrenador.trainer_email || '',
          specialty,
          clientsCount: clientesUnicos.size,
          activeContracts: contratosActivos,
          contractType,
          trainerId: entrenador.id || entrenador.authUid || entrenador.legacyId || '',
          payments: pagosDelEntrenador,
        };
      });

      const entrenadoresInactivosConResumen = entrenadoresInactList.map((entrenador) => {
        const clavesEntrenador = obtenerClavesEntrenador(entrenador);
        const asignacionesDelEntrenador = asignacionesEnriquecidas.filter((asignacion) => coincideEntrenador(asignacion, clavesEntrenador));
        const pagosDelEntrenador = pagosEnriquecidos.filter((pago) => coincideEntrenador(pago, clavesEntrenador));

        const clientesUnicos = new Set();
        asignacionesDelEntrenador.forEach((asignacion) => {
          const clientKey = normalizarClaveBusqueda(
            asignacion.clientId ||
            asignacion.clientEmail ||
            asignacion.clientName ||
            asignacion.clienteNombre
          );
          if (clientKey) {
            clientesUnicos.add(clientKey);
          }
        });

        const nombreCompleto = `${entrenador.firstName || entrenador.first_name || ''} ${entrenador.lastName || entrenador.last_name || ''}`.trim();

        return {
          ...entrenador,
          name: obtenerNombreEntrenador(entrenador, nombreCompleto || 'Entrenador'),
          email: entrenador.email || entrenador.trainerEmail || entrenador.trainer_email || '',
          specialty: obtenerEspecialidadEntrenador(entrenador),
          clientsCount: clientesUnicos.size,
          activeContracts: asignacionesDelEntrenador.filter((asignacion) => String(asignacion.status || asignacion.estado || '').trim().toLowerCase() === 'active').length,
          contractType: obtenerTipoContratoEntrenador(entrenador, pagosDelEntrenador[0]?.contractType || 'N/D'),
          trainerId: entrenador.id || entrenador.authUid || entrenador.legacyId || '',
          payments: pagosDelEntrenador,
        };
      });

      setEntrenadores(entrenadoresConResumen);
      setEntrenadoresInactivos(entrenadoresInactivosConResumen);
      setServiciosEntrenamiento(asignacionesEnriquecidas);
      setVentasServiciosEntrenador(ventasEnriquecidas);
      setPagosEntrenadores(pagosEnriquecidos);
      setCargando(false);
    }).catch((error) => {
      console.error('Error cargando datos de entrenadores:', error);
      setCargando(false);
    });

    return () => {
      promesas?.abort?.();
    };
  }, []);

  // ================== HANDLERS DE ACCIONES ==================
  const manejarDesactivarEntrenador = useCallback((entrenador) => {
    setAccionPendiente({ tipo: 'desactivar', entrenador });
  }, []);

  const ejecutarDesactivarEntrenador = useCallback(async () => {
    if (!accionPendiente?.entrenador?.id) {
      setModalError({ isOpen: true, title: 'Error', message: 'No se especificó entrenador' });
      return;
    }

    setIdEntrenadorDesactivando(accionPendiente.entrenador.id);

    try {
      const entrenador = accionPendiente.entrenador;
      const response = await deactivateTrainerByAdmin({
        trainerUid: entrenador.authUid || entrenador.id || entrenador.email || '',
        trainerId: entrenador.id || '',
        authUid: entrenador.authUid || '',
        trainerEmail: entrenador.email || entrenador.trainerEmail || entrenador.trainer_email || '',
      });

      if (!response?.success) {
        throw new Error(response?.error || 'No se pudo desvincular al entrenador');
      }

      setEntrenadores((prev) => prev.filter((e) => e.id !== accionPendiente.entrenador.id));
      setEntrenadoresInactivos((prev) => [...prev, accionPendiente.entrenador]);
      setModalExito({
        isOpen: true,
        title: 'Éxito',
        message: 'Entrenador desvinculado',
        subMessage: `${obtenerNombreVisualizacion(accionPendiente.entrenador)} ha sido desvinculado.`,
      });
    } catch (error) {
      setModalError({ isOpen: true, title: 'Error', message: error.message || 'No se pudo desactivar' });
    } finally {
      setIdEntrenadorDesactivando('');
      setAccionPendiente(null);
    }
  }, [accionPendiente]);

  const manejarReactivarEntrenador = useCallback((entrenador) => {
    setAccionPendiente({ tipo: 'reactivar', entrenador });
  }, []);

  const ejecutarReactivarEntrenador = useCallback(async () => {
    if (!accionPendiente?.entrenador?.id) {
      setModalError({ isOpen: true, title: 'Error', message: 'No se especificó entrenador' });
      return;
    }

    setIdEntrenadorReactivando(accionPendiente.entrenador.id);

    try {
      const entrenador = accionPendiente.entrenador;
      const response = await reactivateTrainerByAdmin({
        trainerUid: entrenador.authUid || entrenador.id || entrenador.email || '',
        trainerId: entrenador.id || '',
        authUid: entrenador.authUid || '',
        trainerEmail: entrenador.email || entrenador.trainerEmail || entrenador.trainer_email || '',
      });

      if (!response?.success) {
        throw new Error(response?.error || 'No se pudo reactivar al entrenador');
      }

      setEntrenadoresInactivos((prev) => prev.filter((e) => e.id !== accionPendiente.entrenador.id));
      setEntrenadores((prev) => [...prev, accionPendiente.entrenador]);
      setModalExito({
        isOpen: true,
        title: 'Éxito',
        message: 'Entrenador reactivado',
        subMessage: `${obtenerNombreVisualizacion(accionPendiente.entrenador)} ha sido reactivado.`,
      });
    } catch (error) {
      setModalError({ isOpen: true, title: 'Error', message: error.message || 'No se pudo reactivar' });
    } finally {
      setIdEntrenadorReactivando('');
      setAccionPendiente(null);
    }
  }, [accionPendiente]);

  const manejarDesvincularCliente = useCallback((servicio) => {
    setServicioPendienteDesvincular(servicio);
  }, []);

  const ejecutarDesvincularCliente = useCallback(async () => {
    if (!servicioPendienteDesvincular?.id) {
      setModalError({ isOpen: true, title: 'Error', message: 'No se especificó servicio' });
      return;
    }

    setIdClienteDesvinculando(
      servicioPendienteDesvincular.clientId ||
      servicioPendienteDesvincular.id
    );

    try {
      await removeTrainerFromClient(
        servicioPendienteDesvincular.clientId,
        servicioPendienteDesvincular.trainerId
      );
      setServiciosEntrenamiento((prev) =>
        prev.filter((s) => s.id !== servicioPendienteDesvincular.id)
      );
      setModalExito({
        isOpen: true,
        title: 'Éxito',
        message: 'Cliente desvinculado del entrenador',
        subMessage: 'La asignación ha sido removida.',
      });
    } catch (error) {
      setModalError({ isOpen: true, title: 'Error', message: error.message || 'No se pudo desvincular' });
    } finally {
      setIdClienteDesvinculando('');
      setServicioPendienteDesvincular(null);
    }
  }, [servicioPendienteDesvincular]);

  const manejarCompletarVentaServicio = useCallback((venta) => {
    setAccionPendiente({ tipo: 'completarVenta', venta });
  }, []);

  const ejecutarCompletarVentaServicio = useCallback(async () => {
    if (!accionPendiente?.venta?.id) {
      setModalError({ isOpen: true, title: 'Error', message: 'No se especificó venta' });
      return;
    }

    setIdVentaServicioCompletando(accionPendiente.venta.id);

    try {
      const resultado = await completeTrainerServicePayment(accionPendiente.venta.id);
      if (!resultado?.success) {
        throw new Error(resultado?.error || 'No se pudo completar el pago.');
      }

      setVentasServiciosEntrenador((prev) =>
        prev.map((v) =>
          v.id === accionPendiente.venta.id
            ? {
                ...v,
                status: 'completed',
                estado: 'completado',
                payment_status: 'completed',
                paymentStatus: 'completed',
                completedAt: new Date().toISOString(),
              }
            : v
        )
      );

      setServiciosEntrenamiento((prev) =>
        {
          const venta = accionPendiente.venta || {};
          const clientIdVenta = String(venta.clientId || venta.cliente_id || venta.cliente || venta.cliente_auth_uid || '').trim();
          const clientEmailVenta = String(venta.clientEmail || venta.clienteEmail || venta.cliente_email || '').trim().toLowerCase();
          const trainerIdVenta = String(venta.trainerId || venta.trainer_id || '').trim();
          const trainerEmailVenta = String(venta.trainerEmail || venta.trainer_email || '').trim();
          const trainerNameVenta = String(venta.trainerName || venta.trainer_name || 'Entrenador').trim();

          const serviceTypeRaw = String(venta.serviceType || venta.service_type || 'PERSONAL').trim().toUpperCase();
          const serviceType = serviceTypeRaw === 'GRUPAL' ? 'GRUPAL' : 'PERSONAL';
          const serviceLabel = String(venta.serviceLabel || venta.service_label || (serviceType === 'GRUPAL' ? 'Grupal' : 'Personal')).trim();

          const servicePrice = Number(
            venta.total ||
            venta.amount ||
            venta.monto ||
            venta.trainerServicePrice ||
            venta.trainer_service_price ||
            0
          ) || 0;

          const assignmentDate = venta.completedAt || venta.createdAt || venta.fecha || new Date().toISOString();

          const indiceExistente = prev.findIndex((servicio) => {
            const clientIdServicio = String(servicio.clientId || '').trim();
            const clientEmailServicio = String(servicio.clientEmail || '').trim().toLowerCase();

            if (clientIdVenta && clientIdServicio && clientIdVenta === clientIdServicio) return true;
            if (clientEmailVenta && clientEmailServicio && clientEmailVenta === clientEmailServicio) return true;
            return false;
          });

          const baseActualizada = {
            id: venta.assignmentId || venta.saleId || venta.id || `${clientIdVenta || clientEmailVenta || Date.now()}`,
            clientId: clientIdVenta,
            clientEmail: clientEmailVenta,
            clientName: venta.clientName || venta.clienteNombre || venta.cliente_username || 'Cliente',
            trainerId: trainerIdVenta,
            trainerName: trainerNameVenta,
            trainerEmail: trainerEmailVenta,
            serviceType,
            serviceLabel,
            price: servicePrice,
            assignedAt: assignmentDate,
            status: 'active',
            estado: 'active',
            saleId: venta.id || venta.saleId || null,
          };

          if (indiceExistente >= 0) {
            const copia = [...prev];
            copia[indiceExistente] = {
              ...copia[indiceExistente],
              ...baseActualizada,
              id: copia[indiceExistente].id || baseActualizada.id,
            };
            return copia;
          }

          return [baseActualizada, ...prev];
        }
      );

      setModalExito({
        isOpen: true,
        title: 'Éxito',
        message: 'Pago en efectivo confirmado',
        subMessage: 'El cliente ya puede ver a su entrenador asignado y el entrenador ya puede ver a su cliente.',
      });
    } catch (error) {
      setModalError({ isOpen: true, title: 'Error', message: error.message || 'No se pudo completar' });
    } finally {
      setIdVentaServicioCompletando('');
      setAccionPendiente(null);
    }
  }, [accionPendiente]);

  // ================== UTILIDADES DE CÁLCULO ==================
  const obtenerIngresoMensualFiltrado = useCallback((trainer = null, mes = filtroMesPagos, anio = filtroAnioPagos) => {
    const clavesEntrenador = trainer
      ? [
          trainer.id,
          trainer.legacyId,
          trainer.authUid,
          trainer.email,
          trainer.username,
          trainer.displayName,
          trainer.nombre,
          trainer.trainerId,
          trainer.trainerEmail,
          trainer.trainerName,
          trainer.trainer_nombre,
        ]
          .map(normalizarClaveBusqueda)
          .filter(Boolean)
      : [];

    return ventasServiciosEntrenador
      .filter((venta) => {
        const fecha = new Date(aMs(venta.createdAt || venta.fecha));
        if (fecha.getMonth() + 1 !== Number(mes) || fecha.getFullYear() !== Number(anio)) {
          return false;
        }

        if (!trainer) return true;

        const clavesVenta = [
          venta.trainerId,
          venta.trainer_id,
          venta.trainerEmail,
          venta.trainer_email,
          venta.trainerName,
          venta.trainer_name,
          venta.trainer_nombre,
        ]
          .map(normalizarClaveBusqueda)
          .filter(Boolean);

        return clavesVenta.some((clave) => clavesEntrenador.includes(clave));
      })
      .reduce((sum, venta) => sum + (Number(venta.total || venta.amount || venta.monto || venta.monto_recibido || 0) || 0), 0);
  }, [ventasServiciosEntrenador, filtroMesPagos, filtroAnioPagos]);

  // Filtrar servicios según búsqueda y estado
  const serviciosFiltrados = serviciosEntrenamiento.filter((servicio) => {
    const busqueda = normalizarClaveBusqueda(terminoBusqueda);

    if (busqueda) {
      const tipoRaw = String(servicio.serviceType || servicio.service_type || '').trim().toLowerCase();
      const etiquetaRaw = String(servicio.serviceLabel || servicio.service_label || '').trim().toLowerCase();
      const tipoNormalizado = tipoRaw.includes('grup') || etiquetaRaw.includes('grup') ? 'grupal' : 'personal';

      const textoBusqueda = [
        servicio.clientName,
        servicio.clientEmail,
        servicio.trainerName,
        servicio.trainerEmail,
        servicio.serviceType,
        servicio.service_type,
        servicio.serviceLabel,
        servicio.service_label,
        tipoNormalizado,
      ]
        .map(normalizarClaveBusqueda)
        .filter(Boolean)
        .join(' ');

      if (!textoBusqueda.includes(busqueda)) return false;
    }
    
    if (filtroEstado === 'activo' && servicio.status !== 'active') return false;
    if (filtroEstado === 'vencido' && servicio.status !== 'expired') return false;
    
    return true;
  });

  // Funciones necesarias que faltan
  const manejarConfirmarAccionPendiente = useCallback(() => {
    if (!accionPendiente) return;
    
    if (accionPendiente.tipo === 'desactivar') {
      ejecutarDesactivarEntrenador();
    } else if (accionPendiente.tipo === 'reactivar') {
      ejecutarReactivarEntrenador();
    } else if (accionPendiente.tipo === 'completarVenta') {
      ejecutarCompletarVentaServicio();
    }
  }, [accionPendiente, ejecutarDesactivarEntrenador, ejecutarReactivarEntrenador, ejecutarCompletarVentaServicio]);

  const manejarPagoEntrenador = useCallback((entrenador) => {
    const mesActual = new Date().getMonth() + 1;
    const anioActual = new Date().getFullYear();
    const clavesEntrenador = obtenerClavesEntrenador(entrenador);
    const yaFuePagadoEsteMes = pagosEntrenadores.some((pago) => {
      const fechaPago = new Date(aMs(pago.createdAt || pago.fecha));
      if (fechaPago.getMonth() + 1 !== mesActual || fechaPago.getFullYear() !== anioActual) {
        return false;
      }

      const clavesPago = [
        pago.trainerId,
        pago.trainer_id,
        pago.trainerEmail,
        pago.trainer_email,
        pago.trainerName,
        pago.trainer_name,
        pago.trainer_nombre,
      ]
        .map(normalizarClaveBusqueda)
        .filter(Boolean);

      return clavesPago.some((clave) => clavesEntrenador.includes(clave));
    });

    if (yaFuePagadoEsteMes) {
      setModalError({
        isOpen: true,
        title: 'Pago ya registrado',
        message: 'Este entrenador ya fue pagado en este mes. No puedes volver a registrarlo.',
      });
      return;
    }

    const ingresoMensual = obtenerIngresoMensualFiltrado(entrenador, mesActual, anioActual);
    
    setModalPago({
      isOpen: true,
      trainerId: entrenador.id,
      trainerName: obtenerNombreVisualizacion(entrenador),
      trainerEmail: entrenador.email || '',
      contractType: entrenador.contractType || '',
      paymentMethod: 'DEPOSITO A CUENTA',
      amount: String(ingresoMensual),
      mes: mesActual,
      anio: anioActual,
    });
  }, [aMs, normalizarClaveBusqueda, obtenerClavesEntrenador, pagosEntrenadores, obtenerNombreVisualizacion, obtenerIngresoMensualFiltrado, setModalError]);

  const manejarConfirmarPagoModal = useCallback(async () => {
    if (!modalPago.trainerId || !modalPago.amount) {
      setModalError({ isOpen: true, title: 'Error', message: 'Ingresa todos los datos requeridos' });
      return;
    }

    try {
      const monto = Number(modalPago.amount);
      if (monto <= 0) {
        setModalError({ isOpen: true, title: 'Error', message: 'El monto debe ser mayor a 0' });
        return;
      }

      const resultadoPago = await createTrainerPayment({
        trainerId: modalPago.trainerId,
        trainerEmail: modalPago.trainerEmail,
        trainerName: modalPago.trainerName,
        contractType: modalPago.contractType || 'N/D',
        paymentMethod: modalPago.paymentMethod,
        amount: monto,
      });

      if (!resultadoPago?.success) {
        setModalError({
          isOpen: true,
          title: 'Error al registrar pago',
          message: resultadoPago?.error || 'No se pudo registrar el pago.',
        });
        return;
      }

      const fechaPago = new Date();
      const folioPago = resultadoPago?.folio || `PT-${Date.now()}`;
      const pagoRegistrado = {
        id: folioPago,
        folio: folioPago,
        categoria: 'EGRESO',
        trainer_id: modalPago.trainerId,
        trainerId: modalPago.trainerId,
        trainer_email: modalPago.trainerEmail,
        trainerEmail: modalPago.trainerEmail,
        trainer_nombre: modalPago.trainerName,
        trainerName: modalPago.trainerName,
        contract_type: modalPago.contractType || null,
        contractType: modalPago.contractType || '',
        metodo_pago: modalPago.paymentMethod,
        paymentMethod: modalPago.paymentMethod,
        total: monto,
        amount: monto,
        monto: monto,
        monto_recibido: monto,
        createdAt: fechaPago,
        fecha: fechaPago.toISOString(),
        status: 'completed',
        paymentStatus: 'completed',
        payment_status: 'completed',
      };

      setPagosEntrenadores((prev) => [pagoRegistrado, ...prev]);

      setModalExito({
        isOpen: true,
        title: 'Pago registrado',
        message: `Pago de $${monto.toLocaleString()} MXN registrado para ${modalPago.trainerName}`,
      });

      setModalPago({
        isOpen: false,
        trainerId: '',
        trainerName: '',
        trainerEmail: '',
        contractType: '',
        paymentMethod: 'DEPOSITO A CUENTA',
        amount: '',
        mes: 0,
        anio: 0,
      });
    } catch (error) {
      setModalError({ isOpen: true, title: 'Error', message: error.message || 'No se pudo registrar el pago' });
    }
  }, [modalPago, setModalError, setModalExito, setModalPago, setPagosEntrenadores, createTrainerPayment]);

  const estadisticas = {
    totalEntrenadores: entrenadores.length,
    entrenadoresInactivos: entrenadoresInactivos.length,
    clientesAsignados: serviciosEntrenamiento.length,
    totalClients: serviciosEntrenamiento.length,
    activeServices: serviciosEntrenamiento.filter((s) => s.status === 'active').length,
    totalTrainers: entrenadores.length,
    ingresoMensual: obtenerIngresoMensualFiltrado(),
  };

  // ================== RETURN ==================
  return {
    // Estados
    serviciosEntrenamiento,
    ventasServiciosEntrenador,
    entrenadores,
    entrenadoresInactivos,
    pagosEntrenadores,
    cargando,
    terminoBusqueda,
    filtroEstado,
    pestanaActiva,
    idEntrenadorDesactivando,
    idEntrenadorReactivando,
    idVentaServicioCompletando,
    idClienteDesvinculando,
    servicioPendienteDesvincular,
    accionPendiente,
    modalError,
    modalExito,
    modalPago,
    filtroMesPagos,
    filtroAnioPagos,
    filtroMesEntrenadores,
    filtroAnioEntrenadores,

    // Setters
    setServiciosEntrenamiento,
    setVentasServiciosEntrenador,
    setEntrenadores,
    setEntrenadoresInactivos,
    setPagosEntrenadores,
    setCargando,
    setTerminoBusqueda,
    setFiltroEstado,
    setPestanaActiva,
    setIdEntrenadorDesactivando,
    setIdEntrenadorReactivando,
    setIdVentaServicioCompletando,
    setIdClienteDesvinculando,
    setServicioPendienteDesvincular,
    setAccionPendiente,
    setModalError,
    setModalExito,
    setModalPago,
    setFiltroMesPagos,
    setFiltroAnioPagos,
    setFiltroMesEntrenadores,
    setFiltroAnioEntrenadores,

    // Handlers
    manejarDesactivarEntrenador,
    ejecutarDesactivarEntrenador,
    manejarReactivarEntrenador,
    ejecutarReactivarEntrenador,
    manejarDesvincularCliente,
    ejecutarDesvincularCliente,
    manejarCompletarVentaServicio,
    ejecutarCompletarVentaServicio,

    // Utilidades
    obtenerNombreVisualizacion,
    normalizarClaveBusqueda,
    normalizarEtiquetaTipoServicio,
    registrarClavesBusqueda,
    normalizarClaveEntrenador,
    esUsuarioEntrenador,
    esEntrenadorInactivo,
    aMs,

    // Estadísticas
    estadisticas,
    obtenerIngresoMensualFiltrado,
    serviciosFiltrados,
    
    // Handlers adicionales
    manejarConfirmarAccionPendiente,
    manejarPagoEntrenador,
    manejarConfirmarPagoModal,
  };
}
