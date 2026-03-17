import React, { useEffect, useState } from 'react';
import ProductCardClient from './ProductCardClient';
import { getProducts, getUser, getSales, getCurrentUser } from '../firebase';

function ClientStore() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const productsResult = await getProducts();
        if (productsResult.success) {
          const mapped = productsResult.data.map(p => ({
            title: p.nombre || 'Producto',
            price: parseFloat(p.precio || 0),
            stock: parseInt(p.stock || 0),
            image: p.imagen || null, 
          }));
          setProducts(mapped);
        }
        
        // Cargar usuario y ventas para historial
        const currentUser = getCurrentUser();
        if (currentUser) {
          const userResult = await getUser(currentUser.uid);
          if (userResult.success) {
            // Cargar ventas del usuario
            const salesResult = await getSales({
              userId: currentUser.uid,
              userEmail: userResult.data?.email || currentUser.email || null,
              username: userResult.data?.username || null
            });
            if (salesResult.success) {
              const sorted = salesResult.data.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
                const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
                return dateB - dateA;
              });
              setSales(sorted);
            }
          }
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
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
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl mb-20">
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
            } catch { /* ignorar parse error */ }
            const fechaObj = s.createdAt?.toDate?.() || new Date(s.createdAt || 0);
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
