import React, { useEffect, useState, useRef } from 'react';
import { AlertTriangle, Download } from 'lucide-react';
import QRCode from "react-qr-code";

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const resolveImageUrl = (url) => {
  try {
    if (!url) return null;
    if (typeof url !== 'string') return null;
    if (url.startsWith('http')) return url;
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${API_URL}${path}`;
  } catch {
    return url;
  }
};

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
  const [miembro, setMiembro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardRatio, setCardRatio] = useState(1.58);
  const [tick, setTick] = useState(0);
  const qrRef = useRef(null);
  const cardBackRef = useRef(null);

  const downloadQR = async () => {
    try {
      console.log('Generando tarjeta de membresía...');
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = 800;
      canvas.height = 1200;
      
      // Fondo blanco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Borde negro
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
      
      // QR Code en el centro superior
      const qrSvg = qrRef.current?.querySelector('svg');
      if (qrSvg) {
        const svgData = new XMLSerializer().serializeToString(qrSvg);
        const img = new Image();
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        await new Promise((resolve) => {
          img.onload = () => {
            const qrSize = 500;
            const qrX = (canvas.width - qrSize) / 2;
            const qrY = 80;
            ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
            URL.revokeObjectURL(url);
            resolve();
          };
          img.src = url;
        });
      }
      
      // Línea separadora con gradiente de colores FitData (cyan a púrpura)
      const lineY = 650;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(50, lineY);
      ctx.lineTo(canvas.width - 50, lineY);
      ctx.stroke();
      
      // Sección inferior con fondo degradado suave
      const bgGradient = ctx.createLinearGradient(0, lineY + 20, 0, canvas.height - 50);
      bgGradient.addColorStop(0, '#f0f9ff'); // cyan muy claro
      bgGradient.addColorStop(1, '#faf5ff'); // púrpura muy claro
      ctx.fillStyle = bgGradient;
      ctx.fillRect(50, lineY + 20, canvas.width - 100, canvas.height - lineY - 70);
      
      // Título "ACCESO FITDATA GYM"
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 48px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ACCESO', canvas.width / 2, lineY + 100);
      
      // Gradiente de texto para "FITDATA GYM"
      const textGradient = ctx.createLinearGradient(200, 0, canvas.width - 200, 0);
      textGradient.addColorStop(0, '#06b6d4'); // cyan
      textGradient.addColorStop(0.5, '#3b82f6'); // blue
      textGradient.addColorStop(1, '#a855f7'); // purple
      ctx.fillStyle = textGradient;
      ctx.font = 'bold 56px Arial, sans-serif';
      ctx.fillText('FITDATA GYM', canvas.width / 2, lineY + 170);
      
      // Nombre del usuario
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 52px Arial, sans-serif';
      ctx.fillText(userName, canvas.width / 2, lineY + 280);
      
      // Separador pequeño
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 100, lineY + 310);
      ctx.lineTo(canvas.width / 2 + 100, lineY + 310);
      ctx.stroke();
      
      // Información adicional en texto más pequeño
      ctx.fillStyle = '#64748b';
      ctx.font = '28px Arial, sans-serif';
      ctx.fillText(`Plan: ${membershipType}`, canvas.width / 2, lineY + 370);
      ctx.fillText(`Vence: ${formatDate(membership.end_date)}`, canvas.width / 2, lineY + 410);
      ctx.fillText(`ID: ${userId}`, canvas.width / 2, lineY + 450);
      
      console.log('Generando descarga...');
      
      // Descargar
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Acceso-FitData-${userName.replace(/\s+/g, '-')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log('✅ Descarga completada');
      }, 'image/png');
    } catch (error) {
      console.error('❌ Error al descargar:', error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }

    let currentUser = null;
    fetch(`${API_URL}/api/users/me/`, { headers: { Authorization: `Token ${token}` } })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(userData => {
        currentUser = userData;
        setUser(userData);
        // Buscar el miembro asociado al usuario
        return fetch(`${API_URL}/api/miembros/`, { headers: { Authorization: `Token ${token}` } });
      })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(miembrosData => {
        const miembroUser = miembrosData.find(m => m.user === currentUser?.id);
        if (miembroUser) setMiembro(miembroUser);
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

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
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

  const parseLocalDate = (dateStr, h = 0, m = 0, s = 0, ms = 0) => {
    try {
      const [y, mo, d] = dateStr.split('-').map(Number);
      return new Date(y, (mo || 1) - 1, d, h, m, s, ms);
    } catch {
      return new Date(dateStr);
    }
  };

  let vigente = true;
  if (membership.end_date) {
    const endLocal = parseLocalDate(membership.end_date);
    const now = new Date();
    const endCutoff = parseLocalDate(membership.end_date, 22, 0, 0, 0);
    if (now < parseLocalDate(membership.end_date, 0, 0, 0, 0)) {
      vigente = true;
    } else if (
      now.getFullYear() === endLocal.getFullYear() &&
      now.getMonth() === endLocal.getMonth() &&
      now.getDate() === endLocal.getDate()
    ) {
      vigente = now <= endCutoff;
    } else {
      vigente = false;
    }
  }
  const userName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.nombre || user?.username || 'Miembro');
  const userId = user?.id || membership.user || 'FIT-0000';
  const membershipType = membership.tipo?.name || membership.membership_name || 'Full Data Anual';
  const qrCode = miembro?.qr_code || `FD-USER${userId}`;


  // Función de cálculo de porcentaje restante
  const computeProgress = () => {
    if (!membership?.end_date) return 0;
    const now = new Date();
    const endLocal = parseLocalDate(membership.end_date);
    const isDayPass = (membership?.tipo?.duration_days === 1) || (membershipType.toLowerCase().includes('day'));
    if (isDayPass) {
      const startVirtual = parseLocalDate(membership.end_date, 6, 0, 0, 0);
      const endVirtual = parseLocalDate(membership.end_date, 22, 0, 0, 0);
      const total = endVirtual - startVirtual;
      if (total <= 0) return 0;
      let remaining = endVirtual - now;
      if (now < startVirtual) remaining = total;
      if (now > endVirtual) remaining = 0;
      remaining = Math.max(0, Math.min(remaining, total));
      let pct = (remaining / total) * 100;
      if (pct > 0 && pct < 5) pct = 5;
      return pct;
    } else {
      if (!membership.start_date) return 0;
      const startLocal = parseLocalDate(membership.start_date, 6, 0, 0, 0); 
      const endCutoff = parseLocalDate(membership.end_date, 22, 0, 0, 0);  
      const total = endCutoff - startLocal;
      if (total <= 0) return 0;
      const remaining = Math.max(0, endCutoff - now);
      let pct = (remaining / total) * 100;
      if (pct > 0 && pct < 5) pct = 5;
      return pct;
    }
  };

  let progressPct = computeProgress();
  const timeRemainingText = membership.time_remaining || '';
  const isExpired = timeRemainingText.toLowerCase().includes('vencid');
  if (progressPct === 0 && !isExpired) {
    progressPct = 5; 
  }

  // Barra fija con gradiente 
  const barClasses = 'h-full bg-linear-to-r from-purple-500 to-blue-500 transition-all duration-700';

  return (
    <div className="w-full flex flex-col items-center gap-6">
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
                    src={resolveImageUrl(membership.tipo.image)} 
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
            ref={cardBackRef}
            data-card-back="true"
            className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl border"
            style={{ 
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              backgroundColor: '#1e293b',
              borderColor: 'rgba(168, 85, 247, 0.4)'
            }}
          >
            <div className="absolute inset-0 p-8 flex flex-col justify-between" style={{
              background: 'linear-gradient(to bottom right, #0f172a, #1e293b)'
            }}>
              
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

              <div className="flex items-end justify-between mt-4 gap-3">
                <div className="space-y-2 flex-shrink min-w-0">
                  <div>
                    <p className="text-[11px] text-slate-400 uppercase tracking-wide">Plan</p>
                    <p className="text-base sm:text-lg text-blue-300 font-semibold truncate">{membershipType}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 uppercase tracking-wide">Vencimiento</p>
                    <p className="text-base sm:text-lg text-white font-semibold">{formatDate(membership.end_date)}</p>
                  </div>
                </div>
                
                <div ref={qrRef} className="bg-white p-2 rounded-xl shadow-lg flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0">
                  <QRCode
                    size={256}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    value={qrCode}
                    viewBox="0 0 256 256"
                    fgColor="#000000"
                    bgColor="#ffffff"
                  />
                </div>
              </div>
              
              <div className="mt-3 text-center">
                <p className="text-xs text-slate-400 mb-1">Código manual:</p>
                <p className="text-lg font-bold text-purple-400 tracking-wider font-mono">{qrCode}</p>
                <p className="text-[10px] text-slate-600 mt-1">Este código es personal e intransferible.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sección de vigencia */}
      <div className="w-full max-w-2xl bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-slate-300 text-base font-semibold tracking-wide">Tu Vigencia</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm uppercase">Tiempo restante</span>
            <span className="text-3xl font-extrabold text-blue-400 drop-shadow-[0_2px_6px_rgba(56,189,248,0.35)]">
              {membership.time_remaining || 'Cargando...'}
            </span>
          </div>
        </div>
        <div className="mt-5 h-4 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={barClasses}
            style={{ width: `${progressPct}%` }}
          ></div>
        </div>
      </div>

      {/* Botón de Descarga */}
      <div className="w-full max-w-2xl flex justify-center">
        <button
          onClick={downloadQR}
          className="group relative inline-flex items-center gap-3 px-8 py-4 bg-linear-to-r from-blue-500 to-purple-600 hover:from-cyan-400 hover:via-blue-400 hover:to-purple-500 text-white rounded-2xl font-bold text-lg transition-all duration-300 shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:shadow-[0_0_40px_rgba(6,182,212,0.7)] hover:scale-105 transform"
        >
          <Download size={24} className="group-hover:animate-bounce" />
          <span className="tracking-wide">Descargar Membresía con QR</span>
          <div className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
        </button>
      </div>
    </div>
  );
}

export default ClientMembership;
