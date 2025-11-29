import React, { useEffect, useState } from 'react';
import ProductCardClient from './ProductCardClient';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function ClientStore() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Token ${token}` } : {};
    // Cargar productos
    fetch(`${API_URL}/api/productos/`, { headers })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => {
        const arr = Array.isArray(data) ? data : (data?.results || []);
        const mapped = arr.map(p => ({
          title: p.nombre || 'Producto',
          price: parseFloat(p.precio || 0),
          stock: parseInt(p.stock || 0),
          image: p.imagen || null,
        }));
        setProducts(mapped);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Cargar usuario y ventas para historial
    const cargarHistorial = async () => {
      if (!token) return;
      try {
        const meRes = await fetch(`${API_URL}/api/users/me/`, { headers });
        if (!meRes.ok) throw new Error('me failed');
        const u = await meRes.json();
        setUser(u);

        const ventasRes = await fetch(`${API_URL}/api/ventas/`, { headers });
        if (!ventasRes.ok) throw new Error('ventas failed');
        const dataVentas = await ventasRes.json();
        const ventasArr = Array.isArray(dataVentas) ? dataVentas : (dataVentas?.results || []);

        const mySales = ventasArr.filter(s => (s.cliente === u.id) || (s.cliente_username === u.username));
        const sorted = mySales
          .sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
        setSales(sorted);
      } catch {
        // ignorar historial si falla
      }
    };

    cargarHistorial();
  }, []);

  if (loading) {
    return <div className="text-slate-400">Cargando tienda...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((prod, idx) => (
          <ProductCardClient key={idx} {...prod} />
        ))}
        {products.length === 0 && (
          <div className="col-span-full text-slate-400">No hay productos disponibles.</div>
        )}
      </div>

      {/* Historial de compras del cliente */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-emerald-400">Historial de Compras</h3>
          <span className="text-slate-500 text-sm">{sales.length} ventas</span>
        </div>
        <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 divide-y divide-slate-800">
          {sales.length === 0 && (
            <div className="px-6 py-6 text-slate-400">Sin compras registradas.</div>
          )}
          {sales.flatMap((s, i) => {
            let items = [];
            try {
              const parsed = JSON.parse(String(s.detalle_productos || '[]').replace(/'/g, '"'));
              if (Array.isArray(parsed)) items = parsed;
            } catch {}
            const fechaObj = new Date(s.fecha);
            const fechaStr = fechaObj.toLocaleDateString('es-MX');
            const horaStr = fechaObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return items.map((it, idx) => (
              <div key={`${i}-${idx}`} className="px-6 py-3 flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono bg-slate-800 text-cyan-400 px-2 py-0.5 rounded border border-slate-700">{s.folio || 'FOLIO'}</span>
                    <span className="text-slate-200 font-medium">{it.nombre || 'Producto'}</span>
                  </div>
                  <span className="text-slate-500 text-[11px] mt-1">{fechaStr} • {horaStr}</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-xs bg-slate-700 text-white px-2 py-1 rounded">x{it.cantidad || 1}</span>
                  <span className="text-emerald-400 font-semibold">${((it.cantidad || 1) * (it.precio || 0)).toFixed(2)}</span>
                </div>
              </div>
            ));
          })}
        </div>
      </div>
    </div>
  );
}

export default ClientStore;
