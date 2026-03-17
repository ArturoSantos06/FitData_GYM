import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { checkInMember, checkOutMember, getAttendances } from '../firebase';

const CheckInOut = () => {
  const [scanning, setScanning] = useState(false);
  const [asistencias, setAsistencias] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const html5QrcodeRef = useRef(null);

  // Cargar asistencias recientes con filtros
  const cargarAsistencias = async () => {
    try {
      const filters = {};
      if (dateFilter) filters.fecha = dateFilter;
      if (searchTerm) filters.search = searchTerm;
      
      const result = await getAttendances(filters);
      if (result.success) {
        setAsistencias(result.data);
      }
    } catch (err) {
      console.error('Error cargando asistencias:', err);
    }
  };

  useEffect(() => {
    setTimeout(() => cargarAsistencias(), 0);
    const interval = setInterval(cargarAsistencias, 10000);
    return () => clearInterval(interval);
  }, [dateFilter, searchTerm]);

  const procesarQR = async (qrCode) => {
    if (!qrCode) return;

    setScanning(false);
    setError('');
    setMensaje('');

    try {
      // Primero intentar check-in
      let result = await checkInMember(qrCode);

      // Si ya tiene check-in activo, intentar check-out automáticamente
      if (!result.success && result.hasActiveCheckIn) {
        result = await checkOutMember(qrCode);
      }

      if (result.success) {
        setMensaje(result.message);
        if (result.tiempo_en_gym) {
          setMensaje(`${result.message} - Tiempo en gym: ${result.tiempo_en_gym}`);
        }
        cargarAsistencias();
        setManualCode('');
      } else {
        // Mostrar mensaje especial para membresía vencida
        if (result.error?.includes('vencida') || result.error?.includes('inexistente')) {
          setError(`🚫 ${result.error} ${result.miembro ? '- ' + result.miembro : ''}`);
        } else {
          setError(result.error || 'Error procesando solicitud');
        }
      }
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.');
      console.error(err);
    }
  };

  // Inicializar escáner cuando se activa
  const stopScanner = async () => {
    if (html5QrcodeRef.current?.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current = null;
      } catch (err) {
        console.error("Error deteniendo escáner:", err);
      }
    }
    setScanning(false);
  };

  useEffect(() => {
    const startScanner = async () => {
      if (scanning && !html5QrcodeRef.current) {
        try {
          html5QrcodeRef.current = new Html5Qrcode("qr-reader");
          
          const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          };

          await html5QrcodeRef.current.start(
            { facingMode: "environment" }, // Cámara trasera
            config,
            (decodedText) => {
              console.log("QR detectado:", decodedText);
              procesarQR(decodedText);
              stopScanner();
            },
            () => { /* ignorar errores de no se encontró código */ }
          );
        } catch (err) {
          console.error("Error iniciando escáner:", err);
          setError("No se pudo acceder a la cámara. Verifica los permisos.");
          setScanning(false);
        }
      }
    };

    startScanner();

    return () => {
      if (html5QrcodeRef.current?.isScanning) {
        html5QrcodeRef.current.stop().catch(console.error);
      }
    };
  }, [scanning]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      procesarQR(manualCode.trim());
    }
  };

  return (
    <div className="min-h-screen py-6 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel de Escaneo */}
          <div className="lg:col-span-1 bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30 shadow-xl shadow-blue-500/10">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📷</span> Scanner QR
            </h2>

            {/* Info de detección automática */}
            <div className="mb-4 bg-blue-500/20 border border-blue-400/40 rounded-lg p-3">
              <p className="text-blue-200 text-xs text-center leading-relaxed">
                <strong>🤖 Detección Automática</strong><br/>
              </p>
            </div>

            {/* Botón de escaneo */}
            {!scanning ? (
              <button
                onClick={() => setScanning(true)}
                className="w-full bg-linear-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-xl font-bold text-base shadow-lg hover:shadow-blue-500/50 transition-all hover:scale-105"
              >
                📷 Iniciar Escáner
              </button>
            ) : (
              <div className="mb-4">
                <div id="qr-reader" className="rounded-xl overflow-hidden border-2 border-blue-500"></div>
                <button
                  onClick={stopScanner}
                  className="w-full mt-3 bg-red-600 text-white py-2.5 rounded-xl font-bold hover:bg-red-700 transition-all"
                >
                  ❌ Cerrar Escáner
                </button>
              </div>
            )}

            {/* Entrada manual */}
            <div className="mt-4">
              <h3 className="text-white font-semibold mb-2 text-sm">Código manual:</h3>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="FD-XXXXXXXXXXXX"
                  className="flex-1 bg-slate-700/50 text-white px-3 py-2.5 rounded-lg border border-slate-600 focus:border-blue-400 focus:outline-none text-sm"
                />
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-all text-sm"
                >
                  ✓
                </button>
              </form>
            </div>

            {/* Mensajes */}
            {mensaje && (
              <div className="mt-4 bg-green-500/20 border border-green-400 text-green-200 p-3 rounded-lg text-sm">
                ✅ {mensaje}
              </div>
            )}
            {error && (
              <div className="mt-4 bg-red-500/20 border border-red-400 text-red-200 p-3 rounded-lg text-sm">
                ⚠️ {error}
              </div>
            )}
          </div>

          {/* Panel de Asistencias Recientes */}
          <div className="lg:col-span-2 bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30 shadow-xl shadow-blue-500/10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">📋</span> Asistencias Recientes
                <span className="bg-blue-600 px-3 py-1 rounded-full text-sm">{asistencias.length}</span>
              </h2>
              
              {/* Filtros */}
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Buscador */}
                <input
                  type="text"
                  placeholder="🔍 Buscar por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-700/50 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-400 focus:outline-none text-sm min-w-[200px]"
                />
                
                {/* Filtro de fecha */}
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-slate-700/50 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-400 focus:outline-none text-sm"
                />
                
                {/* Botón limpiar filtros */}
                {(searchTerm || dateFilter) && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setDateFilter('');
                    }}
                    className="bg-red-600/80 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
              {asistencias.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-3">📭</div>
                  <p className="text-slate-400">
                    {searchTerm || dateFilter ? 'No se encontraron asistencias con estos filtros' : 'No hay asistencias registradas'}
                  </p>
                </div>
              ) : (
                asistencias.map((asistencia) => (
                  <div
                    key={asistencia.id}
                    className="bg-slate-700/40 hover:bg-slate-700/60 p-3 rounded-lg border border-slate-600/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar inicial con color persistido */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 border border-slate-700"
                        style={{ backgroundColor: asistencia.miembro_avatar_color || '#1D4ED8' }}
                      >
                        {(asistencia.miembro_nombre || 'U').charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-sm truncate">
                          {asistencia.miembro_nombre || 'N/A'}
                        </h3>
                        <div className="text-xs text-slate-400 space-y-0.5 mt-1">
                          <div className="flex items-center gap-2">
                            {asistencia.fecha_hora_entrada ? (
                              <span>🕐 {new Date(asistencia.fecha_hora_entrada).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                            ) : (
                              <span className="text-slate-400">🕐 Sin hora</span>
                            )}
                            {asistencia.fecha_hora_salida ? (
                              <span>→ 🚪 {new Date(asistencia.fecha_hora_salida).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                            ) : (
                              <span className="text-green-400 font-medium">● En el gym</span>
                            )}
                          </div>
                          <p className="text-blue-400 font-semibold text-xs">
                            ⏱ {asistencia.tiempo_en_gym || 'En curso'}
                          </p>
                        </div>
                      </div>

                      {/* Estado */}
                      <div className="shrink-0">
                        {asistencia.acceso_permitido ? (
                          <span className="inline-block bg-green-500/30 text-green-300 px-2 py-1 rounded-md text-xs font-bold border border-green-500/50">
                            ✓
                          </span>
                        ) : (
                          <span className="inline-block bg-red-500/30 text-red-300 px-2 py-1 rounded-md text-xs font-bold border border-red-500/50">
                            ✗
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckInOut;
