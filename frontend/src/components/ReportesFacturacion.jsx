import React, { useState, useEffect } from 'react';
import { BarChart3, AlertCircle, Loader } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

function ReportesFacturacion() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterMes, setFilterMes] = useState(new Date().getMonth() + 1);
  const [filterAnio, setFilterAnio] = useState(new Date().getFullYear());
  const [expandedFactura, setExpandedFactura] = useState(null);

  const cargarReporte = async () => {
    setLoading(true);
    setError('');
    try {
      const obtenerReporteFacturasFn = httpsCallable(functions, 'obtenerReporteFacturas');
      const result = await obtenerReporteFacturasFn({
        mes: parseInt(filterMes),
        anio: parseInt(filterAnio)
      });

      if (result.data.success) {
        setReportData(result.data);
      } else {
        setError(result.data.error || 'Error cargando reporte');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarReporte();
  }, [filterMes, filterAnio]);

  const formatearMoneda = (valor) => {
    return `$${valor.toFixed(2)}`;
  };

  return (
    <div className="w-full space-y-6">
      {/* Encabezado */}
      <div>
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <BarChart3 size={32} className="text-cyan-400" />
          Reportes de Facturación
        </h2>
        <p className="text-slate-400 mt-2">Análisis de ventas e ingresos por período</p>
      </div>

      {/* Filtros */}
      <div className="bg-blue-900/30 border border-blue-800 rounded-xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Mes</label>
            <select
              value={filterMes}
              onChange={(e) => setFilterMes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-400 outline-none"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleDateString('es-MX', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Año</label>
            <select
              value={filterAnio}
              onChange={(e) => setFilterAnio(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-400 outline-none"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={cargarReporte}
              disabled={loading}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  Cargando...
                </>
              ) : (
                'Cargar Reporte'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-400 flex-shrink-0 mt-1" size={20} />
          <div>
            <h3 className="font-semibold text-red-400">Error</h3>
            <p className="text-red-200 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Resumen */}
      {reportData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total de facturas */}
            <div className="bg-gradient-to-br from-blue-900 to-blue-800 border border-blue-700 rounded-lg p-6">
              <p className="text-slate-300 text-sm font-medium">Total Facturas</p>
              <p className="text-3xl font-bold text-cyan-400 mt-2">
                {reportData.totalFacturas || 0}
              </p>
            </div>

            {/* Total ingresos */}
            <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 border border-emerald-700 rounded-lg p-6">
              <p className="text-slate-300 text-sm font-medium">Total Ingresos</p>
              <p className="text-3xl font-bold text-emerald-400 mt-2">
                {formatearMoneda(reportData.totalIngresos || 0)}
              </p>
            </div>

            {/* Subtotal */}
            <div className="bg-gradient-to-br from-purple-900 to-purple-800 border border-purple-700 rounded-lg p-6">
              <p className="text-slate-300 text-sm font-medium">Subtotal</p>
              <p className="text-3xl font-bold text-purple-400 mt-2">
                {formatearMoneda(reportData.subtotal || 0)}
              </p>
            </div>

            {/* IVA */}
            <div className="bg-gradient-to-br from-orange-900 to-orange-800 border border-orange-700 rounded-lg p-6">
              <p className="text-slate-300 text-sm font-medium">IVA Cobrado</p>
              <p className="text-3xl font-bold text-orange-400 mt-2">
                {formatearMoneda(reportData.totalIVA || 0)}
              </p>
            </div>
          </div>

          {/* Tabla de facturas */}
          {reportData.facturas && reportData.facturas.length > 0 ? (
            <div className="bg-blue-900/30 border border-blue-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-blue-900/60 border-b border-blue-700">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Fecha</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Factura</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Cliente</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Descripción</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">Subtotal</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">IVA</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">Total</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-800">
                    {reportData.facturas.map((factura, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-blue-900/40 transition-colors cursor-pointer"
                        onClick={() => setExpandedFactura(expandedFactura === idx ? null : idx)}
                      >
                        <td className="px-6 py-4 text-white text-sm">
                          {new Date(factura.fecha.toDate?.() || factura.fecha).toLocaleDateString('es-MX')}
                        </td>
                        <td className="px-6 py-4 text-cyan-400 text-sm font-semibold">
                          {factura.factura_numero}
                        </td>
                        <td className="px-6 py-4 text-white text-sm">
                          {factura.cliente_nombre || 'Sin nombre'}
                        </td>
                        <td className="px-6 py-4 text-slate-300 text-sm">
                          {factura.membership_name || factura.producto || 'Producto'}
                        </td>
                        <td className="px-6 py-4 text-right text-white text-sm">
                          {formatearMoneda(factura.subtotal || 0)}
                        </td>
                        <td className="px-6 py-4 text-right text-orange-400 text-sm">
                          {formatearMoneda((factura.total || 0) * 0.16 / 1.16)}
                        </td>
                        <td className="px-6 py-4 text-right text-emerald-400 text-sm font-semibold">
                          {formatearMoneda(factura.total || 0)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-900/40 text-emerald-400 border border-emerald-700">
                            Generada
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
              <BarChart3 className="mx-auto text-slate-600 mb-3" size={48} />
              <p className="text-slate-400 text-lg">No hay datos para este período</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ReportesFacturacion;
