import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Download, CalendarClock, FileText, RefreshCw } from 'lucide-react';
import {
  auth,
  getDietFilesByMember,
  getMemberByAuthUid,
  getMemberByUserId,
  getUser,
  getUserByAuthUid,
  descargarDocumentoDieta,
} from '../../../firebase';

const formatDate = (value) => {
  if (!value) return 'Sin fecha disponible';
  try {
    const dateValue = value?.toDate?.() || new Date(value);
    if (Number.isNaN(dateValue.getTime())) return 'Sin fecha disponible';
    return dateValue.toLocaleString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Sin fecha disponible';
  }
};

function VisorDieta() {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dietFiles, setDietFiles] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadDietFiles = async (firebaseUser) => {
      if (!isMounted) return;

      if (!firebaseUser) {
        setDietFiles([]);
        setError('Inicia sesión para consultar tu dieta vigente.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      let resolvedMember = null;

      const byAuthUid = await getMemberByAuthUid(firebaseUser.uid);
      if (byAuthUid.success) {
        resolvedMember = byAuthUid.data;
      } else {
        let internalUserId = firebaseUser.uid;

        const byDocId = await getUser(firebaseUser.uid);
        if (byDocId.success) {
          internalUserId = byDocId.data.id;
        } else {
          const byAuthUser = await getUserByAuthUid(firebaseUser.uid);
          if (byAuthUser.success) {
            internalUserId = byAuthUser.data.id;
          }
        }

        const memberByUser = await getMemberByUserId(internalUserId);
        if (memberByUser.success) {
          resolvedMember = memberByUser.data;
        }
      }

      if (!isMounted) return;

      if (!resolvedMember?.id) {
        setDietFiles([]);
        setError('No encontramos tu perfil de miembro para mostrar tu dieta.');
        setLoading(false);
        return;
      }

      const filesResult = await getDietFilesByMember(resolvedMember.id);
      if (!isMounted) return;

      if (!filesResult.success) {
        setDietFiles([]);
        setError(filesResult.error || 'No se pudo cargar tu dieta vigente.');
        setLoading(false);
        return;
      }

      setDietFiles(filesResult.data || []);
      setLoading(false);
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      setLoading(true);
      loadDietFiles(user);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [refreshKey]);

  const latestDietFile = useMemo(() => {
    if (!Array.isArray(dietFiles) || dietFiles.length === 0) return null;
    return dietFiles[0];
  }, [dietFiles]);

  const handleOpenDocument = () => {
    if (!latestDietFile?.downloadURL) {
      setError('No se encontró una URL para abrir la dieta en el visor web.');
      return;
    }

    window.open(latestDietFile.downloadURL, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadDocument = async () => {
    if (!latestDietFile) return;

    setDownloading(true);
    setError('');

    const result = await descargarDocumentoDieta(
      latestDietFile.storagePath,
      latestDietFile.originalFileName || latestDietFile.title || 'dieta_vigente',
      latestDietFile.downloadURL || ''
    );

    if (!result.success) {
      setError(result.error || 'No se pudo descargar la dieta vigente.');
    }

    setDownloading(false);
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="relative w-full rounded-2xl border border-emerald-600/30 bg-linear-to-br from-slate-900 via-slate-900 to-slate-950 p-6 shadow-2xl shadow-emerald-950/20 overflow-hidden">
        <div className="absolute top-0 left-0 h-1.5 w-full bg-linear-to-r from-emerald-500 to-cyan-400" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-emerald-200">Consulta y Descarga de Dieta</h3>
            <p className="mt-1.5 text-sm text-slate-300">
              Revisa tu plan alimenticio vigente en línea y descárgalo desde cualquier dispositivo.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setRefreshKey((current) => current + 1)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-500 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
          {loading && (
            <p className="text-sm text-slate-300">Cargando tu dieta vigente...</p>
          )}

          {!loading && error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
          )}

          {!loading && !error && !latestDietFile && (
            <p className="rounded-xl border border-dashed border-slate-600 px-4 py-5 text-sm text-slate-300">
              Aún no tienes una dieta vigente publicada por tu nutriólogo.
            </p>
          )}

          {!loading && !error && latestDietFile && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-700 bg-slate-950/80 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-emerald-200">Dieta vigente</p>
                    <h4 className="mt-1 text-lg font-bold text-white wrap-break-word">
                      {latestDietFile.title || latestDietFile.originalFileName || 'Plan alimenticio'}
                    </h4>
                    {latestDietFile.notes && (
                      <p className="mt-2 text-sm text-slate-300 wrap-break-word">{latestDietFile.notes}</p>
                    )}
                  </div>

                  <div className="shrink-0 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
                    <div className="flex items-center gap-2">
                      <CalendarClock size={14} />
                      <span>{formatDate(latestDietFile.createdAt || latestDietFile.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleOpenDocument}
                    disabled={!latestDietFile.downloadURL}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Eye size={16} />
                    Consultar dieta
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadDocument}
                    disabled={downloading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500 bg-cyan-500/10 px-4 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download size={16} />
                    {downloading ? 'Descargando...' : 'Descargar dieta'}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <FileText size={14} />
                <span>Se muestra la versión más reciente de tu expediente nutricional.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VisorDieta;
