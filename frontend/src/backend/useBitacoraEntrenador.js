import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  actualizarNotaBitacora,
  crearNotaBitacora,
  eliminarNotaBitacora,
  obtenerEntrenadorActual,
  obtenerMiembrosAsignadosEntrenador,
  obtenerNotasPorMiembro,
  obtenerConteoNotasBitacora,
  suscribirseCambiosVisibilidadBitacora,
} from './servicioBitacoraEntrenador';
import { CLAVE_HIDDEN_CLIENTES } from './visibilidadClientes';

export function useBitacoraEntrenador() {
  const [miembros, setMiembros] = useState([]);
  const [miembroSeleccionado, setMiembroSeleccionado] = useState(null);
  const [notas, setNotas] = useState([]);
  const [textoNota, setTextoNota] = useState('');
  const [notaEditando, setNotaEditando] = useState(null);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ type: '', text: '' });
  const [entrenadorActual, setEntrenadorActual] = useState(null);
  const [conteoNotas, setConteoNotas] = useState({});

  const mostrarMensaje = useCallback((type, text) => {
    setMensaje({ type, text });
    setTimeout(() => setMensaje({ type: '', text: '' }), 3000);
  }, []);

  const cargarEntrenadorActual = useCallback(() => {
    const usuario = obtenerEntrenadorActual();
    if (usuario) {
      setEntrenadorActual({ uid: usuario.uid, email: usuario.email });
    }
  }, []);

  const cargarMiembros = useCallback(async () => {
    const resultado = await obtenerMiembrosAsignadosEntrenador();
    if (!resultado.success) {
      mostrarMensaje('error', resultado.error || 'Error al cargar miembros');
      setMiembros([]);
      return;
    }
    setMiembros(resultado.data || []);
  }, [mostrarMensaje]);

  const cargarConteoNotas = useCallback(async () => {
    const resultado = await obtenerConteoNotasBitacora();
    if (!resultado.success) {
      mostrarMensaje('error', resultado.error || 'Error al cargar el conteo de notas');
      return;
    }

    setConteoNotas(resultado.data || {});
  }, [mostrarMensaje]);

  const cargarNotas = useCallback(async (memberId) => {
    setCargando(true);
    const resultado = await obtenerNotasPorMiembro(memberId);
    if (resultado.success) {
      setNotas(resultado.data);
    } else {
      mostrarMensaje('error', 'Error al cargar notas');
    }
    setCargando(false);
  }, [mostrarMensaje]);

  useEffect(() => {
    setTimeout(() => {
      cargarMiembros();
      cargarConteoNotas();
      cargarEntrenadorActual();
    }, 0);
  }, [cargarConteoNotas, cargarEntrenadorActual, cargarMiembros]);

  useEffect(() => {
    const unsubscribe = suscribirseCambiosVisibilidadBitacora(() => {
      cargarMiembros();
      cargarConteoNotas();
    });
    const onStorage = (event) => {
      if (event.key === CLAVE_HIDDEN_CLIENTES) {
        cargarMiembros();
        cargarConteoNotas();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      unsubscribe();
      window.removeEventListener('storage', onStorage);
    };
  }, [cargarConteoNotas, cargarMiembros]);

  useEffect(() => {
    if (!miembroSeleccionado) return;
    const sigueAsignado = miembros.some((miembro) => String(miembro.id) === String(miembroSeleccionado.id));
    if (!sigueAsignado) {
      setMiembroSeleccionado(null);
      setNotas([]);
      setTextoNota('');
      setNotaEditando(null);
    }
  }, [miembros, miembroSeleccionado]);

  const miembrosFiltrados = useMemo(() => {
    return miembros.filter((m) => m.nombre?.toLowerCase().includes(terminoBusqueda.toLowerCase()) || m.email?.toLowerCase().includes(terminoBusqueda.toLowerCase()));
  }, [miembros, terminoBusqueda]);

  const seleccionarMiembro = (miembro) => {
    setMiembroSeleccionado(miembro);
    setTextoNota('');
    setNotaEditando(null);
    cargarNotas(miembro.id);
  };

  const guardarNota = async (event) => {
    event.preventDefault();
    if (!textoNota.trim() || !miembroSeleccionado) {
      mostrarMensaje('error', 'La nota no puede estar vacía');
      return;
    }

    const payload = {
      memberId: miembroSeleccionado.id,
      memberName: miembroSeleccionado.nombre,
      note: textoNota,
      createdBy: entrenadorActual?.uid || 'unknown',
      trainerEmail: entrenadorActual?.email || 'unknown',
    };

    const resultado = notaEditando
      ? await actualizarNotaBitacora(notaEditando.id, textoNota)
      : await crearNotaBitacora(payload);

    if (!resultado.success) {
      mostrarMensaje('error', 'Error al guardar la nota');
      return;
    }

    mostrarMensaje('success', notaEditando ? '✅ Nota actualizada correctamente' : '✅ Nota guardada correctamente');
    setTextoNota('');
    setNotaEditando(null);
    await cargarNotas(miembroSeleccionado.id);
    await cargarConteoNotas();
  };

  const editarNota = (nota) => {
    setNotaEditando(nota);
    setTextoNota(nota.note);
  };

  const eliminarNota = async (noteId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta nota?')) return;
    const resultado = await eliminarNotaBitacora(noteId);
    if (!resultado.success || !miembroSeleccionado) {
      mostrarMensaje('error', 'Error al eliminar la nota');
      return;
    }

    mostrarMensaje('success', '🗑️ Nota eliminada');
    await cargarNotas(miembroSeleccionado.id);
    await cargarConteoNotas();
  };

  const cancelarEdicion = () => {
    setNotaEditando(null);
    setTextoNota('');
  };

  return {
    mensaje,
    miembrosFiltrados,
    miembroSeleccionado,
    notas,
    textoNota,
    notaEditando,
    terminoBusqueda,
    cargando,
    conteoNotas,
    setTextoNota,
    setTerminoBusqueda,
    seleccionarMiembro,
    guardarNota,
    editarNota,
    eliminarNota,
    cancelarEdicion,
  };
}