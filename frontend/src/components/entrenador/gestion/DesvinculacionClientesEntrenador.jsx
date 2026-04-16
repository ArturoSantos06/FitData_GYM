import React, { useEffect, useMemo, useState } from 'react';
import {
  archivarClienteDesvinculacion,
  eliminarClienteDesvinculacion,
  obtenerClientesDesvinculacion,
} from '../../../backend/clientesDesvinculacionServicio';
import { filtrarClientesOcultos, ocultarClienteLocalmente } from '../../../backend/visibilidadClientes';
import FiltrosDesvinculacion from './FiltrosDesvinculacion';
import TablaDesvinculacionClientes from './TablaDesvinculacionClientes';

function DesvinculacionClientesEntrenador() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [mostrandoArchivados, setMostrandoArchivados] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true);
        const clientesServidor = await obtenerClientesDesvinculacion();
        setClientes(filtrarClientesOcultos(clientesServidor));
      } catch (error) {
        console.error('Error al cargar clientes para desvinculación:', error);
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, []);

  const clientesFiltrados = useMemo(() => {
    return clientes.filter((cliente) => {
      const coincideBusqueda = String(cliente.nombre || '').toLowerCase().includes(terminoBusqueda.toLowerCase());
      const coincideEstado = mostrandoArchivados ? cliente.archivado : !cliente.archivado;
      return coincideBusqueda && coincideEstado && !cliente.eliminado;
    });
  }, [clientes, mostrandoArchivados, terminoBusqueda]);

  const actualizarVisibilidad = (idCliente, cambios) => {
    setClientes((prev) => prev.map((item) => (item.id === idCliente ? { ...item, ...cambios } : item)));
  };

  const alternarArchivado = async (idCliente) => {
    const clienteActual = clientes.find((item) => item.id === idCliente);
    const archivadoNuevo = !clienteActual?.archivado;

    actualizarVisibilidad(idCliente, { archivado: archivadoNuevo });

    try {
      const result = await archivarClienteDesvinculacion(idCliente, archivadoNuevo);
      if (!result?.success) {
        console.warn('No se pudo sincronizar archivado con backend:', result?.error || 'sin detalle');
      }
    } catch (error) {
      console.warn('Fallback local aplicado para archivar:', error);
    }
  };

  const eliminarLogico = async (idCliente) => {
    if (!window.confirm('¿Estás seguro de eliminar este cliente? Desaparecerá de tu lista')) return;

    const clienteActual = clientes.find((item) => item.id === idCliente) || { id: idCliente };

    ocultarClienteLocalmente(clienteActual);

    actualizarVisibilidad(idCliente, { eliminado: true });

    try {
      const result = await eliminarClienteDesvinculacion(idCliente);
      if (!result?.success) {
        console.warn('No se pudo sincronizar eliminación con backend:', result?.error || 'sin detalle');
      }
    } catch (error) {
      console.warn('Fallback local aplicado para eliminar:', error);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-xl mt-6 border-t-4 border-teal-500 text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-br from-teal-400 to-green-400">Desvinculación y Pagos</h2>

      <FiltrosDesvinculacion
        terminoBusqueda={terminoBusqueda}
        onCambiarBusqueda={setTerminoBusqueda}
        mostrandoArchivados={mostrandoArchivados}
        onAlternarArchivados={() => setMostrandoArchivados((prev) => !prev)}
      />

      <TablaDesvinculacionClientes
        clientes={clientesFiltrados}
        cargando={cargando}
        onArchivar={alternarArchivado}
        onEliminar={eliminarLogico}
      />
    </div>
  );
}

export default DesvinculacionClientesEntrenador;
