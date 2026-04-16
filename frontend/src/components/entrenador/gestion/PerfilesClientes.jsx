import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { getCurrentUser, getUser, getUserByAuthUid, getUserByEmail } from '../../../firebase';

const normalizarClaveConsulta = (value) => String(value || '').trim().toLowerCase();

function PerfilesClientes({ disparadorActualizacion }) {
  const [perfiles, setPerfiles] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [estaCargando, setEstaCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('');
  const [ultimoDisparador, setUltimoDisparador] = useState(disparadorActualizacion);

  const cargarPerfiles = async () => {
    console.log('📋 PerfilesClientes: Cargando perfiles...');
    setEstaCargando(true);
    setError('');
    try {
      const usuarioActual = getCurrentUser();
      if (!usuarioActual) {
        setPerfiles([]);
        setEstaCargando(false);
        return;
      }

      const [snapshotAsignaciones, snapshotConsulta, snapshotMiembros, porAuthUid, porDocId, porEmail] = await Promise.all([
        getDocs(collection(db, 'client_trainer_assignments')),
        getDocs(collection(db, 'healthProfiles')),
        getDocs(collection(db, 'miembros')),
        getUserByAuthUid(usuarioActual.uid),
        getUser(usuarioActual.uid),
        usuarioActual.email ? getUserByEmail(usuarioActual.email, usuarioActual.uid) : Promise.resolve({ success: false }),
      ]);

      const clavesEntrenador = new Set([
        usuarioActual.uid,
        usuarioActual.email,
      ].map(normalizarClaveConsulta).filter(Boolean));

      [porAuthUid, porDocId, porEmail]
        .filter((result) => result?.success && result?.data)
        .forEach((result) => {
          const data = result.data;
          [data.id, data.authUid, data.legacyId, data.email].forEach((clave) => {
            const normalized = normalizarClaveConsulta(clave);
            if (normalized) {
              clavesEntrenador.add(normalized);
            }
          });
        });

      const clavesClienteAsignado = new Set();
      const nombresClienteAsignado = new Set();
      snapshotAsignaciones.docs.forEach((docSnap) => {
        const asignacion = docSnap.data() || {};
        const estado = String(asignacion.status || asignacion.trainerStatus || 'active').toLowerCase();
        const idEntrenadorAsignacion = normalizarClaveConsulta(asignacion.trainerId || asignacion.trainer_id);
        const emailEntrenadorAsignacion = normalizarClaveConsulta(asignacion.trainerEmail || asignacion.trainer_email);
        const coincideEntrenador = clavesEntrenador.has(idEntrenadorAsignacion) || clavesEntrenador.has(emailEntrenadorAsignacion);

        if (!coincideEntrenador || estado !== 'active') {
          return;
        }

        [asignacion.clientId, asignacion.memberId, docSnap.id].forEach((clave) => {
          const normalized = normalizarClaveConsulta(clave);
          if (normalized) {
            clavesClienteAsignado.add(normalized);
          }
        });
      });

      snapshotMiembros.docs.forEach((memberDoc) => {
        const datosM = memberDoc.data() || {};
        const clavesM = [
          memberDoc.id,
          datosM.userId,
          datosM.authUid,
          datosM.email,
        ].map(normalizarClaveConsulta).filter(Boolean);

        const nombresM = [
          `${datosM.nombre || ''} ${datosM.apellido || ''}`.trim(),
          `${datosM.firstName || ''} ${datosM.lastName || ''}`.trim(),
          datosM.displayName,
          datosM.username,
        ].map(normalizarClaveConsulta).filter(Boolean);

        const coincideAsignacion = clavesM.some((clave) => clavesClienteAsignado.has(clave));
        if (coincideAsignacion) {
          nombresM.forEach((nombre) => nombresClienteAsignado.add(nombre));
        }
      });

      const mapaM = new Map();
      const mapaNombresM = new Map();
      snapshotMiembros.docs.forEach((memberDoc) => {
        const datosM = memberDoc.data() || {};
        const registroM = {
          id: memberDoc.id,
          ...datosM,
        };

        [
          memberDoc.id,
          datosM.userId,
          datosM.authUid,
          datosM.email,
        ].forEach((clave) => {
          const normalized = normalizarClaveConsulta(clave);
          if (normalized) {
            mapaM.set(normalized, registroM);
          }
        });

        const nombresM = [
          `${datosM.nombre || ''} ${datosM.apellido || ''}`.trim(),
          `${datosM.firstName || ''} ${datosM.lastName || ''}`.trim(),
          datosM.displayName,
          datosM.username,
        ];

        nombresM.forEach((valorNombre) => {
          const nombreNormalizado = normalizarClaveConsulta(valorNombre);
          if (nombreNormalizado) {
            mapaNombresM.set(nombreNormalizado, registroM);
          }
        });
      });

      const mapaPerfilesPorClaveM = new Map();
      snapshotConsulta.docs.forEach((docSnap) => {
        const perfil = {
          id: docSnap.id,
          ...docSnap.data(),
        };

        const clavesPerfil = [
          perfil.id,
          perfil.memberId,
          perfil.userId,
          perfil.userIdDisplay,
          perfil.memberAuthUid,
          perfil.memberEmail,
          perfil.userEmail,
          perfil.email,
        ].map(normalizarClaveConsulta).filter(Boolean);

        clavesPerfil.forEach((clave) => {
          if (clavesClienteAsignado.has(clave)) {
            mapaPerfilesPorClaveM.set(clave, perfil);
          }
        });
      });

      const perfilesUnicos = new Map();
      clavesClienteAsignado.forEach((clave) => {
        const perfil = mapaPerfilesPorClaveM.get(clave);
        if (perfil && !perfilesUnicos.has(perfil.id)) {
          perfilesUnicos.set(perfil.id, perfil);
        }
      });

      setPerfiles(Array.from(perfilesUnicos.values()));
      setEstaCargando(false);
    } catch (err) {
      console.error('Error al cargar perfiles:', err);
      setError('No se pudieron cargar los perfiles');
      setEstaCargando(false);
    }
  };

  useEffect(() => {
    if (disparadorActualizacion !== ultimoDisparador) {
      cargarPerfiles();
      setUltimoDisparador(disparadorActualizacion);
    }
  }, [disparadorActualizacion, ultimoDisparador]);

  useEffect(() => {
    cargarPerfiles();
  }, []);

  const perfilesFiltrados = perfiles.filter((perfil) => {
    const nombre = `${perfil.memberName || ''} ${perfil.memberLastName || ''}`.toLowerCase();
    return nombre.includes(filtro.toLowerCase());
  });

  if (estaCargando) {
    return <div className="p-6 text-slate-300">Cargando perfiles...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-400">{error}</div>;
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-white">Perfiles de Clientes</h2>

      <input
        type="text"
        placeholder="Buscar por nombre..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        className="mb-6 w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {perfilesFiltrados.map((perfil) => (
          <div
            key={perfil.id}
            className="bg-slate-800 border border-slate-700 rounded-lg p-6 cursor-pointer hover:border-cyan-500 transition-colors"
            onClick={() => setSeleccionado(perfil)}
          >
            <h3 className="font-bold text-white mb-2">{perfil.memberName}</h3>
            <p className="text-slate-400 text-sm">{perfil.memberEmail}</p>
          </div>
        ))}
      </div>

      {seleccionado && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">{seleccionado.memberName}</h3>
            <p className="text-slate-400 mb-6">{seleccionado.memberEmail}</p>
            <button
              onClick={() => setSeleccionado(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PerfilesClientes;
