import {
    addDoc,
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { subirImagen } from './almacenamiento';

const COLECCION_MAQUINAS = 'catalogo_maquinas';
const COLECCION_REPORTES = 'reportes_mantenimiento';

const normalizarTexto = (value) => String(value || '').trim();

const normalizarErrorMantenimiento = (error) => {
    const raw = String(error?.message || error || '').toLowerCase();
    const code = String(error?.code || '').toLowerCase();

    if (raw.includes('permission') || raw.includes('insufficient') || code.includes('permission-denied')) {
        return 'No tienes permisos suficientes para esta accion de mantenimiento.';
    }

    if (raw.includes('unauthenticated') || code.includes('unauthenticated')) {
        return 'Tu sesion expiro. Inicia sesion nuevamente.';
    }

    return String(error?.message || 'No se pudo completar la operacion de mantenimiento.');
};

export async function subirFotoMaquina(file) {
    const safeName = `${Date.now()}_${normalizarTexto(file?.name || 'maquina.jpg')}`;
    return subirImagen(file, `mantenimiento/maquinas/${safeName}`);
}

export async function subirFotoReporte(file) {
    const safeName = `${Date.now()}_${normalizarTexto(file?.name || 'reporte.jpg')}`;
    return subirImagen(file, `mantenimiento/reportes/${safeName}`);
}

export async function crearMaquinaCatalogo({ nombre, fotoUrl }) {
    const nombreLimpio = normalizarTexto(nombre);
    if (!nombreLimpio) {
        throw new Error('Debes indicar el nombre de la maquina.');
    }

    if (!normalizarTexto(fotoUrl)) {
        throw new Error('Debes subir una foto de la maquina.');
    }

    try {
        await addDoc(collection(db, COLECCION_MAQUINAS), {
            nombre: nombreLimpio,
            fotoUrl: String(fotoUrl || ''),
            activo: true,
            creadoPorUid: String(auth.currentUser?.uid || ''),
            creadoEn: serverTimestamp(),
            actualizadoEn: serverTimestamp(),
        });
    } catch (error) {
        throw new Error(normalizarErrorMantenimiento(error));
    }
}

export function suscribirCatalogoMaquinas(onData, onError) {
    const q = query(collection(db, COLECCION_MAQUINAS), orderBy('creadoEn', 'desc'));
    return onSnapshot(
        q,
        (snapshot) => {
            const maquinas = snapshot.docs
                .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
                .filter((item) => item.activo !== false);
            onData(maquinas);
        },
        (error) => {
            if (typeof onError === 'function') onError(new Error(normalizarErrorMantenimiento(error)));
        }
    );
}

export async function crearReporteMantenimiento({ maquinaId, maquinaNombre, maquinaFotoUrl, descripcion, fotoUsuarioUrl = '' }) {
    const nombre = normalizarTexto(maquinaNombre);
    const detalle = normalizarTexto(descripcion);

    if (!normalizarTexto(maquinaId) || !nombre) {
        throw new Error('Selecciona una maquina del catalogo.');
    }

    if (!detalle) {
        throw new Error('Describe el problema de la maquina.');
    }

    try {
        await addDoc(collection(db, COLECCION_REPORTES), {
            maquinaId: String(maquinaId),
            maquinaNombre: nombre,
            maquinaFotoUrl: String(maquinaFotoUrl || ''),
            descripcion: detalle,
            fotoUsuarioUrl: String(fotoUsuarioUrl || ''),
            estado: 'pendiente',
            creadoPorUid: String(auth.currentUser?.uid || ''),
            creadoEn: serverTimestamp(),
            actualizadoEn: serverTimestamp(),
            resueltoEn: null,
            resueltoPorUid: '',
        });
    } catch (error) {
        throw new Error(normalizarErrorMantenimiento(error));
    }
}

export function suscribirReportesMantenimiento(onData, onError) {
    const q = query(collection(db, COLECCION_REPORTES), orderBy('creadoEn', 'desc'));
    return onSnapshot(
        q,
        (snapshot) => {
            const reportes = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
            onData(reportes);
        },
        (error) => {
            if (typeof onError === 'function') onError(new Error(normalizarErrorMantenimiento(error)));
        }
    );
}

export async function marcarReporteResuelto(reporteId) {
    const id = normalizarTexto(reporteId);
    if (!id) {
        throw new Error('No se encontro el reporte a actualizar.');
    }

    try {
        await updateDoc(doc(db, COLECCION_REPORTES, id), {
            estado: 'resuelto',
            actualizadoEn: serverTimestamp(),
            resueltoEn: serverTimestamp(),
            resueltoPorUid: String(auth.currentUser?.uid || ''),
        });
    } catch (error) {
        throw new Error(normalizarErrorMantenimiento(error));
    }
}
