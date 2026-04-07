import React, { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';

const MAX_CAPACITY = Math.max(1, Number(import.meta.env.VITE_GYM_MAX_CAPACITY || 80));

const getEntryDate = (data) => {
  const raw = data.fecha_hora_entrada || data.checkInTime?.toDate?.() || data.createdAt?.toDate?.();
  if (!raw) return null;
  const parsed = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isSameDay = (a, b) => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

function ClientGymOccupancy() {
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'asistencias'), limit(600));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const today = new Date();
        const activeMembers = new Set();

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const hasCheckout = Boolean(data.fecha_hora_salida || data.checkOutTime);
          if (hasCheckout) return;

          const checkIn = getEntryDate(data);
          if (!checkIn || !isSameDay(checkIn, today)) return;

          const uniqueKey = data.memberId || data.userId || docSnap.id;
          activeMembers.add(String(uniqueKey));
        });

        setActiveCount(activeMembers.size);
        setError('');
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError?.message || 'No se pudo cargar el aforo en tiempo real.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const occupancyPercent = useMemo(() => {
    return Math.min(100, Math.round((activeCount / MAX_CAPACITY) * 100));
  }, [activeCount]);

  const barClass = useMemo(() => {
    if (occupancyPercent >= 85) return 'from-rose-500 to-amber-400';
    if (occupancyPercent >= 60) return 'from-amber-400 to-lime-400';
    return 'from-purple-500 to-blue-500';
  }, [occupancyPercent]);

  return (
    <div className="w-full max-w-2xl bg-slate-900/70 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
      <div className="absolute -top-10 -right-8 w-28 h-28 rounded-full bg-cyan-400/10 blur-2xl"></div>
      <div className="relative flex items-center justify-between gap-3">
        <span className="text-slate-300 text-sm font-semibold tracking-wide">Aforo en tiempo real</span>
        <span className="text-2xl font-extrabold text-cyan-300">
          {loading ? '...' : error ? '--' : `${occupancyPercent}%`}
        </span>
      </div>
      <div className="mt-3 h-3 bg-slate-800/90 rounded-full overflow-hidden border border-slate-700/70">
        <div
          className={`h-full bg-linear-to-r ${barClass} transition-all duration-700`}
          style={{ width: `${loading || error ? 0 : occupancyPercent}%` }}
        ></div>
      </div>
      {error && (
        <p className="mt-2 text-xs text-rose-300">No se pudo cargar el aforo.</p>
      )}
      {!error && !loading && (
        <p className="mt-2 text-[11px] text-slate-400">{activeCount} de {MAX_CAPACITY} lugares estimados</p>
      )}
    </div>
  );
}

export default ClientGymOccupancy;