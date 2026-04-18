import { useEffect, useState } from 'react';
import { cargarPerfilEntrenador, guardarPerfilEntrenador } from './perfilEntrenadorServicio';

export function usePerfilEntrenador() {
  const [usuario, setUsuario] = useState(null);
  const [codigoEntrenador, setCodigoEntrenador] = useState('');
  const [vistaActual, setVistaActual] = useState('menu');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true);
        setError('');
        const resultado = await cargarPerfilEntrenador();
        if (!resultado.success) throw new Error(resultado.error || 'No se pudieron cargar tus datos');

        setUsuario(resultado.data);
        setCodigoEntrenador(resultado.trainerCode || '---');
      } catch (err) {
        setError(err.message || 'No se pudo cargar el perfil');
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, []);

  const guardar = async (actualizado) => {
    const resultado = await guardarPerfilEntrenador(usuario, actualizado);
    if (!resultado.success) throw new Error(resultado.error || 'No se pudo actualizar el perfil');

    setUsuario(resultado.data);
    setSuccessMessage('¡Datos actualizados correctamente!');
    setShowSuccessModal(true);
    setVistaActual('menu');
  };

  return {
    usuario,
    codigoEntrenador,
    vistaActual,
    cargando,
    error,
    showSuccessModal,
    successMessage,
    setVistaActual,
    setShowSuccessModal,
    guardar,
  };
}