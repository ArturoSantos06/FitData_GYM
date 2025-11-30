import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import QRCode from "react-qr-code";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function formatDate(dateStr) {
  try {
    if (!dateStr) return 'N/A';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

function ClientMembership() {
  const [membership, setMembership] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardRatio, setCardRatio] = useState(1.58);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }

    let currentUser = null;
    fetch(`${API_URL}/api/users/me/`, { headers: { Authorization: `Token ${token}` } })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(userData => {
        currentUser = userData;
        setUser(userData);
        return fetch(`${API_URL}/api/user-memberships/`, { headers: { Authorization: `Token ${token}` } });
      })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => {
        const userMemberships = Array.isArray(data) ? data.filter(m => m.user === currentUser?.id) : [];
        const sorted = userMemberships.sort((a,b) => new Date(b.start_date || b.created_at || 0) - new Date(a.start_date || a.created_at || 0));
        setMembership(sorted[0] || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-400 text-center">Cargando membresía...</div>;
  if (!membership) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 rounded-xl p-6 max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle size={18} />
          <span className="font-bold">No tienes membresía activa</span>
        </div>
        <p className="text-slate-300">Visita la tienda o recepción para adquirir una.</p>
      </div>
    );
  }

  const vigente = membership.end_date ? (new Date(membership.end_date) >= new Date()) : true;
  const userName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.nombre || user?.username || 'Miembro');
  const userId = user?.id || membership.user || 'FIT-0000';
  const membershipType = membership.tipo?.name || membership.membership_name || 'Full Data Anual';

  return (
    <div className="w-full flex flex-col items-center gap-10">
      {/* Tarjeta de Membresía con Flip */}
      <div 
        className="relative w-full max-w-2xl mx-auto cursor-pointer group" 
        style={{ perspective: '1000px', aspectRatio: cardRatio }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div 
          className={`relative w-full h-full transition-transform duration-700`}
          style={{ 
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
        >
          {/* FRENTE */}
          <div 
            className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl border border-slate-700"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="absolute inset-0 bg-slate-900">
              {membership.tipo?.image ? (
                <>
                  <img 
                    src={membership.tipo.image} 
                    alt={membershipType}
                    className="absolute inset-0 w-full h-full object-contain"
                    onLoad={(e) => {
                      const w = e.currentTarget.naturalWidth || 1;
                      const h = e.currentTarget.naturalHeight || 1;
                      const ratio = w / h;
                      if (ratio > 0) setCardRatio(ratio);
                    }}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-slate-950/70 via-slate-950/10 to-transparent"></div>
                </>
              ) : (
                <div className="absolute inset-0 bg-linear-to-br from-slate-900 via-purple-900/20 to-blue-900/20"></div>
              )}
              
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center z-10 pb-6">
                <div className="px-4 py-1.5 rounded-full border border-slate-600/50 bg-slate-800/80 backdrop-blur-md shadow-lg">
                  <p className="text-[10px] text-slate-200 font-bold tracking-widest uppercase">
                    Toca para ver QR
                  </p>
                </div>
              </div>

              <div className="absolute top-0 bottom-0 left-0 w-2 bg-linear-to-b from-purple-500 to-blue-500"></div>
            </div>
          </div>

          {/* REVERSO */}
          <div 
            className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl bg-slate-800 border border-purple-500/40"
            style={{ 
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <div className="absolute inset-0 bg-linear-to-br from-slate-900 to-slate-800 p-8 flex flex-col justify-between">
              
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Miembro</p>
                  <h3 className="text-xl font-bold text-white mb-1">{userName}</h3>
                  <p className="text-xs text-purple-400 font-mono">ID: {userId}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${vigente ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                  {vigente ? 'ACTIVA' : 'VENCIDA'}
                </div>
              </div>

              <div className="flex items-end justify-between mt-4">
                <div className="space-y-2">
                  <div>
                    <p className="text-[11px] text-slate-400 uppercase tracking-wide">Plan</p>
                    <p className="text-lg text-blue-300 font-semibold">{membershipType}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 uppercase tracking-wide">Vencimiento</p>
                    <p className="text-lg text-white font-semibold">{formatDate(membership.end_date)}</p>
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded-xl shadow-lg flex items-center justify-center w-32 h-32">
                  <QRCode
                    size={256}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    value={String(userId)}
                    viewBox="0 0 256 256"
                    fgColor="#000000"
                    bgColor="#ffffff"
                  />
                </div>
              </div>
              
              <p className="text-[10px] text-center text-slate-600 mt-2">Este código es personal e intransferible.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sección de vigencia */}
      <div className="w-full max-w-2xl bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-slate-300 text-base font-semibold tracking-wide">Tu Vigencia</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm uppercase">Días restantes</span>
            <span className="text-3xl font-extrabold text-blue-400 drop-shadow-[0_2px_6px_rgba(56,189,248,0.35)]">
              {membership.end_date ? Math.max(0, Math.ceil((new Date(membership.end_date) - new Date()) / (1000 * 60 * 60 * 24))) : '∞'}
            </span>
          </div>
        </div>
        <div className="mt-5 h-4 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-linear-to-r from-purple-500 to-blue-500" 
            style={{ 
              width: membership.end_date 
                ? `${Math.max(0, Math.min(100, ((new Date(membership.end_date) - new Date()) / (365 * 24 * 60 * 60 * 1000)) * 100))}%` 
                : '100%'
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}

export default ClientMembership;
