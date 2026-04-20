import {
    addDoc,
    collection,
    deleteDoc,
    getDocs,
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

const CATALOGO_BASE_MAQUINAS = [
    'Caminadora',
    'Bicicleta estática',
    'Elíptica',
    'Leg Press',
    'Polea alta',
    'Polea baja',
    'Press de pecho',
    'Remo sentado',
    'Extensión de piernas',
    'Curl femoral',
    'Sentadilla Smith',
    'Pec Deck',
];

const normalizarTexto = (value) => String(value || '').trim();

const resolverCampoTexto = (...values) => {
    for (const value of values) {
        const texto = normalizarTexto(value);
        if (texto) return texto;
    }
    return '';
};

const normalizarMaquinaCatalogo = (docSnap) => {
    const data = docSnap.data() || {};
    const fotoObjeto = data?.foto;
    const imagenObjeto = data?.imagen;

    return {
        id: docSnap.id,
        ...data,
        nombre: resolverCampoTexto(data?.nombre, data?.name),
        fotoUrl: resolverCampoTexto(
            data?.fotoUrl,
            data?.fotoURL,
            data?.imagenUrl,
            data?.imageUrl,
            data?.urlFoto,
            data?.urlImagen,
            data?.foto,
            data?.imagen,
            fotoObjeto?.url,
            imagenObjeto?.url
        ),
    };
};

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

export async function sembrarCatalogoBaseMaquinas() {
    try {
        const snapshot = await getDocs(collection(db, COLECCION_MAQUINAS));
        const existentes = new Set(
            snapshot.docs
                .map((docSnap) => normalizarMaquinaCatalogo(docSnap))
                .filter((item) => item.activo !== false)
                .map((item) => normalizarTexto(item.nombre).toLowerCase())
        );

        const faltantes = CATALOGO_BASE_MAQUINAS.filter((nombre) => !existentes.has(nombre.toLowerCase()));
        let creadas = 0;

        for (const nombre of faltantes) {
            await addDoc(collection(db, COLECCION_MAQUINAS), {
                nombre,
                fotoUrl: '',
                activo: true,
                creadoPorUid: String(auth.currentUser?.uid || ''),
                creadoEn: serverTimestamp(),
                actualizadoEn: serverTimestamp(),
            });
            creadas += 1;
        }

        return { success: true, created: creadas, skipped: CATALOGO_BASE_MAQUINAS.length - creadas };
    } catch (error) {
        throw new Error(normalizarErrorMantenimiento(error));
    }
}

export async function eliminarMaquinaCatalogo(maquinaId) {
    const id = normalizarTexto(maquinaId);
    if (!id) {
        throw new Error('No se encontro la maquina a eliminar.');
    }

    try {
        await updateDoc(doc(db, COLECCION_MAQUINAS, id), {
            activo: false,
            actualizadoEn: serverTimestamp(),
        });
    } catch (error) {
        throw new Error(normalizarErrorMantenimiento(error));
    }
}

export async function actualizarMaquinaCatalogo(maquinaId, cambios) {
    const id = normalizarTexto(maquinaId);
    if (!id) {
        throw new Error('No se encontro la maquina a editar.');
    }

    const nombreLimpio = normalizarTexto(cambios?.nombre);
    const fotoUrlLimpia = normalizarTexto(cambios?.fotoUrl);

    if (!nombreLimpio) {
        throw new Error('Escribe el nombre de la maquina.');
    }

    try {
        await updateDoc(doc(db, COLECCION_MAQUINAS, id), {
            nombre: nombreLimpio,
            ...(fotoUrlLimpia ? { fotoUrl: fotoUrlLimpia } : {}),
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
                .map((docSnap) => normalizarMaquinaCatalogo(docSnap))
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
    const idMaquina = normalizarTexto(maquinaId);
    const detalle = normalizarTexto(descripcion);
    const fotoUsuario = normalizarTexto(fotoUsuarioUrl);

    if (!idMaquina || !nombre) {
        throw new Error('Selecciona una maquina del catalogo.');
    }

    if (!detalle) {
        throw new Error('Describe el problema de la maquina.');
    }

    try {
        await addDoc(collection(db, COLECCION_REPORTES), {
            maquinaId: String(idMaquina),
            maquinaNombre: nombre || 'Sin maquina seleccionada',
            maquinaFotoUrl: String(maquinaFotoUrl || ''),
            descripcion: detalle,
            fotoUsuarioUrl: String(fotoUsuario || ''),
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

export async function eliminarReporteMantenimiento(reporteId) {
    const id = normalizarTexto(reporteId);
    if (!id) {
        throw new Error('No se encontro el reporte a eliminar.');
    }

    try {
        await deleteDoc(doc(db, COLECCION_REPORTES, id));
    } catch (error) {
        throw new Error(normalizarErrorMantenimiento(error));
    }
}
