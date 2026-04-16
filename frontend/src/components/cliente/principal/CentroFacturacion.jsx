import React, { useState, useEffect } from 'react';
import { FileText, Download, Loader, AlertCircle } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { getSales, getCurrentUser } from '../../../firebase';

function CentroFacturacion({ ventasIniciales = [] }) {
  const [ventas, setVentas] = useState(ventasIniciales);
  const [loading, setLoading] = useState(!ventasIniciales?.length);
  const [generating, setGenerating] = useState({});
  const [error, setError] = useState('');
  const [filterMes, setFilterMes] = useState('all');
  const [filterAnio, setFilterAnio] = useState('all');

  const currentUser = getCurrentUser();

  const refreshVentas = async () => {
    const result = await getSales();
    if (result.success) {
      setVentas(result.data || []);
      return result.data || [];
    }
    return [];
  };

  useEffect(() => {
    if (ventasIniciales?.length) {
      setVentas(ventasIniciales);
      setLoading(false);
      return;
    }

    const loadVentas = async () => {
      setLoading(true);
      try {
        const result = await getSales();
        if (result.success) {
          setVentas(result.data);
        }
      } catch (err) {
        setError('Error cargando historial de compras');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      loadVentas();
    }
  }, [currentUser, ventasIniciales]);

  const handleGenerarFactura = async (ventaId) => {
    setGenerating(prev => ({ ...prev, [ventaId]: true }));
    setError('');

    try {
      if (!currentUser?.uid) {
        throw new Error('No hay sesión activa para solicitar factura');
      }

      await addDoc(collection(db, 'facturaRequests'), {
        ventaId: String(ventaId),
        requesterUid: String(currentUser.uid),
        requesterEmail: String(currentUser.email || '').toLowerCase(),
        status: 'pending',
        createdAt: serverTimestamp(),
        requestedFrom: 'client-store'
      });

      let generated = false;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        // Espera breve mientras la Cloud Function procesa la solicitud
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 1800));
        // eslint-disable-next-line no-await-in-loop
        const updatedSales = await refreshVentas();
        const target = updatedSales.find((sale) => String(sale.id) === String(ventaId));
        if (target?.factura_estado === 'generada' && target?.factura_url) {
          generated = true;
          break;
        }
      }

      if (!generated) {
        console.log('Solicitud de factura enviada; sigue en proceso en servidor.');
      }
    } catch (err) {
      console.error('Error generando factura:', err);
      setError(`Error generando factura: ${err.message}`);
    } finally {
      setGenerating(prev => ({ ...prev, [ventaId]: false }));
    }
  };

  const handleDescargarFactura = (factura_url) => {
    window.open(factura_url, '_blank');
  };

  const ventasFiltradas = ventas.filter(venta => {
    const fecha = venta.fecha?.toDate?.() || new Date(venta.fecha);
    const mes = fecha.getMonth() + 1;
    const anio = fecha.getFullYear();

    const mesOK = filterMes === 'all' || mes === Number(filterMes);
    const anioOK = filterAnio === 'all' || anio === Number(filterAnio);

    return mesOK && anioOK;
  });

  return (
    <div className="w-full space-y-6">
      {/* Encabezado */}
      <div>
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <FileText size={32} className="text-cyan-400" />
          Centro de Facturación
        </h2>
        <p className="text-slate-400 mt-2">Descarga y gestiona tus facturas</p>
      </div>

      {/* Filtros */}
      <div className="bg-blue-900/30 border border-blue-800 rounded-xl p-5 space-y-4 overflow-visible max-w-full">
        <div className="space-y-3">
          <div className="space-y-2 min-w-0">
            <label className="block text-sm font-medium text-slate-300">Mes</label>
            <select
              value={filterMes}
              onChange={(e) => setFilterMes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-cyan-400 outline-none"
            >
              <option value="all">Todos los meses</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleDateString('es-MX', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 min-w-0">
            <label className="block text-sm font-medium text-slate-300">Año</label>
            <select
              value={filterAnio}
              onChange={(e) => setFilterAnio(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-cyan-400 outline-none"
            >
              <option value="all">Todos los años</option>
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4 text-sm text-slate-400 min-w-0 whitespace-normal break-all">
          <p className="mb-2">Si no ves facturas, prueba a seleccionar "Todos los meses" o cambiar el año.</p>
          <p>El botón de <span className="text-cyan-300">Generar</span> aparece cuando tienes compras sin factura, y <span className="text-emerald-300">Descargar</span> cuando la factura ya está disponible.</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-400 shrink-0 mt-1" size={20} />
          <div>
            <h3 className="font-semibold text-red-400">Error</h3>
            <p className="text-red-200 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Listado de ventas */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin text-cyan-400" size={32} />
        </div>
      ) : ventasFiltradas.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
          <FileText className="mx-auto text-slate-600 mb-3" size={48} />
          <p className="text-slate-400 text-lg">No hay compras en este período</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ventasFiltradas.map((venta) => (
            <div key={venta.id} className="bg-blue-900/40 border border-blue-800 rounded-3xl p-5 hover:bg-blue-900/60 transition-colors">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 min-w-0">
                  <p className="text-xs text-slate-400">Factura</p>
                  <p className="text-white font-semibold wrap-break-word">
                    {venta.factura_numero || 'Pendiente'}
                  </p>
                </div>

                <div className="space-y-2 min-w-0">
                  <p className="text-xs text-slate-400">Fecha</p>
                  <p className="text-white font-semibold wrap-break-word">
                    {new Date(venta.fecha?.toDate?.() || venta.fecha).toLocaleDateString('es-MX')}
                  </p>
                </div>

                <div className="space-y-2 min-w-0 sm:col-span-2">
                  <p className="text-xs text-slate-400">Descripción</p>
                  <div className="text-white font-semibold wrap-break-word">
                    {venta.membership_name ? (
                      <div>{venta.membership_name}</div>
                    ) : venta.producto ? (
                      <div>{venta.producto}</div>
                    ) : venta.detalle_productos ? (
                      <div className="space-y-1">
                        {(() => {
                          try {
                            const parsed = JSON.parse(String(venta.detalle_productos || '[]').replace(/'/g, '"'));
                            if (Array.isArray(parsed)) {
                              return parsed.map((item, idx) => (
                                <div key={idx}>
                                  {item.nombre || 'Producto'} x{item.cantidad || 1} - ${((item.cantidad || 1) * (item.precio || 0)).toFixed(2)}
                                </div>
                              ));
                            }
                          } catch { }
                          return <div>Compra</div>;
                        })()}
                      </div>
                    ) : (
                      <div>Compra</div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 min-w-0">
                  <p className="text-xs text-slate-400">Monto</p>
                  <p className="text-cyan-400 font-bold text-lg wrap-break-word">
                    ${venta.total?.toFixed(2) ?? '0.00'}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-blue-700 flex justify-start">
                {venta.factura_estado === 'generada' && venta.factura_url ? (
                  <button
                    onClick={() => handleDescargarFactura(venta.factura_url)}
                    className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl font-semibold transition-all whitespace-nowrap"
                  >
                    <Download size={16} />
                    Descargar
                  </button>
                ) : (
                  <button
                    onClick={() => handleGenerarFactura(venta.id)}
                    disabled={generating[venta.id]}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-semibold transition-all whitespace-nowrap"
                  >
                    {generating[venta.id] ? (
                      <>
                        <Loader className="animate-spin" size={16} />
                        Generando...
                      </>
                    ) : (
                      <>
                        <FileText size={16} />
                        Generar
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CentroFacturacion;
