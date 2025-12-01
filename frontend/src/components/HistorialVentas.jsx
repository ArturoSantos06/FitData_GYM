import React, { useState, useEffect } from 'react';

const HistorialVentas = ({ reloadTrigger }) => {
    const [ventas, setVentas] = useState([]);
    const [filtro, setFiltro] = useState('');
    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    useEffect(() => {
        const fetchVentas = async () => {
            const token = localStorage.getItem('token');
            try {
                const response = await fetch(`${API_URL}/api/ventas/`, {
                    headers: { 'Authorization': `Token ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setVentas(data.results || data);
                }
            } catch (error) {
                console.error("Error cargando historial:", error);
            }
        };
        fetchVentas();
    }, [reloadTrigger]);

    const filasProcesadas = ventas.flatMap(venta => {
        try {
            const productos = JSON.parse(venta.detalle_productos.replace(/'/g, '"'));
            
            return productos.map(prod => ({
                id_unico: `${venta.id}-${prod.id}`,
                
                folio: venta.folio || 'PENDIENTE',
                nombre_completo: venta.cliente_nombre_completo,
                
                fecha: new Date(venta.fecha).toLocaleDateString() + ' ' + new Date(venta.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                producto_nombre: prod.nombre || 'Producto eliminado',
                cantidad: prod.cantidad,
                precio_unitario: prod.precio,
                total_linea: prod.cantidad * prod.precio,
                metodo: venta.metodo_pago
            }));
        } catch (e) {
            return [];
        }
    });

    const filasFiltradas = filasProcesadas.filter(fila => 
        fila.nombre_completo.toLowerCase().includes(filtro.toLowerCase()) ||
        fila.producto_nombre.toLowerCase().includes(filtro.toLowerCase()) ||
        fila.folio.toLowerCase().includes(filtro.toLowerCase())
    );

    return (
        <div className="mt-10 bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-cyan-400">
                    Historial de Ventas
                </h2>
                
                <div className="relative w-full md:w-1/3">
                    <input 
                        type="text" 
                        placeholder="Buscar por folio, nombre o producto..." 
                        className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg py-2 px-4 pl-10 focus:outline-none focus:border-cyan-500 transition-colors"
                        value={filtro}
                        onChange={(e) => setFiltro(e.target.value)}
                    />
                    <span className="absolute left-3 top-2.5 text-slate-500">🔍</span>
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900 text-slate-100 uppercase font-bold">
                        <tr>
                            <th className="px-6 py-3 text-cyan-400">Folio</th> 
                            <th className="px-6 py-3">Fecha</th>
                            <th className="px-6 py-3">Cliente</th> 
                            <th className="px-6 py-3">Producto</th>
                            <th className="px-6 py-3 text-center">Cant.</th>
                            <th className="px-6 py-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {filasFiltradas.length > 0 ? (
                            filasFiltradas.map((fila) => (
                                <tr key={fila.id_unico} className="hover:bg-slate-700/50 transition-colors">
                                    {/* Folio */}
                                    <td className="px-6 py-4 font-mono text-xs text-cyan-300 font-bold">
                                        {fila.folio}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-xs">
                                        {fila.fecha}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-white capitalize">
                                        {fila.nombre_completo}
                                    </td>
                                    <td className="px-6 py-4 text-slate-200">
                                        {fila.producto_nombre}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-slate-600 text-white py-1 px-2 rounded text-xs">
                                            x{fila.cantidad}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-green-400">
                                        ${fila.total_linea.toFixed(2)}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                                    No se encontraron ventas.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default HistorialVentas;