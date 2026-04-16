import React, { useEffect, useState } from 'react';
import ProductCardClient from '../ProductCardClient';
import CentroFacturacion from '../CentroFacturacion';
import {
  getProducts,
  getUser,
  getUserByAuthUid,
  getUserByEmail,
  getSales,
  getCurrentUser,
} from '../../firebase';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const resolveUserFromAuth = async (firebaseUser) => {
  if (!firebaseUser) return null;

  const byAuthUid = await getUserByAuthUid(firebaseUser.uid);
  if (byAuthUid?.success && byAuthUid.data) return byAuthUid.data;

  const byDocId = await getUser(firebaseUser.uid);
  if (byDocId?.success && byDocId.data) return byDocId.data;

  const email = normalizeEmail(firebaseUser.email);
  if (email) {
    const byEmail = await getUserByEmail(email);
    if (byEmail?.success && byEmail.data) return byEmail.data;
  }

  return null;
};

const buildDate = (value) => value?.toDate?.() || new Date(value || 0);

function ClientStore() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [activeSection, setActiveSection] = useState('productos');

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
        
        const currentUser = getCurrentUser();
        if (currentUser) {
          const userData = await resolveUserFromAuth(currentUser);

          const idCandidates = Array.from(
            new Set([
              String(currentUser.uid || '').trim(),
              String(userData?.id || '').trim(),
            ].filter(Boolean))
          );

          const emailCandidates = Array.from(
            new Set([
              String(currentUser.email || '').trim(),
              normalizeEmail(currentUser.email),
              String(userData?.email || '').trim(),
              normalizeEmail(userData?.email),
            ].filter(Boolean))
          );

          const usernameCandidates = Array.from(
            new Set([
              String(userData?.username || '').trim(),
            ].filter(Boolean))
          );

          const salesRequests = [];
          idCandidates.forEach((id) => {
            salesRequests.push(getSales({ userId: id }));
          });
          emailCandidates.forEach((email) => {
            salesRequests.push(getSales({ userEmail: email }));
          });
          usernameCandidates.forEach((username) => {
            salesRequests.push(getSales({ username }));
          });

          const salesResults = await Promise.allSettled(salesRequests);
          const mergedById = new Map();

          salesResults.forEach((result) => {
            if (result.status !== 'fulfilled') return;
            if (!result.value?.success || !Array.isArray(result.value.data)) return;
            result.value.data.forEach((sale) => {
              if (sale?.id) mergedById.set(sale.id, sale);
            });
          });

          const sorted = Array.from(mergedById.values()).sort((a, b) => {
            const dateA = buildDate(a.createdAt);
            const dateB = buildDate(b.createdAt);
            return dateB - dateA;
          });

          setSales(sorted);
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

  const sectionTabs = [
    { id: 'productos', label: 'Catálogo' },
    { id: 'historial', label: 'Historial' },
    { id: 'facturacion', label: 'Centro Facturación' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2 rounded-full bg-slate-900/80 border border-slate-700 p-1">
        {sectionTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSection(tab.id)}
            className={`rounded-full text-sm font-semibold py-2 transition-colors ${
              activeSection === tab.id
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
        {activeSection === 'productos' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {products.map((prod, idx) => (
              <ProductCardClient key={idx} {...prod} />
            ))}
            {products.length === 0 && (
              <div className="col-span-full text-slate-400">No hay productos disponibles.</div>
            )}
          </div>
        )}

        {activeSection === 'historial' && (
          <div className="space-y-4">
            <div className="pb-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-emerald-400">Historial de Compras</h3>
              <span className="text-slate-500 text-sm">{sales.length} ventas</span>
            </div>
            <div className="max-h-[520px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 divide-y divide-slate-800">
              {sales.length === 0 && (
                <div className="py-6 text-slate-400">Sin compras registradas.</div>
              )}
              {sales.flatMap((s, i) => {
                let items = [];
                try {
                  const parsed = JSON.parse(String(s.detalle_productos || '[]').replace(/'/g, '"'));
                  if (Array.isArray(parsed)) items = parsed;
                } catch { }
                const fechaObj = s.createdAt?.toDate?.() || new Date(s.createdAt || 0);
                const fechaStr = fechaObj.toLocaleDateString('es-MX');
                const horaStr = fechaObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return items.map((it, idx) => (
                  <div key={`${i}-${idx}`} className="py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-mono bg-slate-800 text-cyan-400 px-2 py-0.5 rounded border border-slate-700">{s.folio || 'FOLIO'}</span>
                        <span className="text-slate-200 font-medium">{it.nombre || 'Producto'}</span>
                      </div>
                      <span className="text-slate-500 text-[11px]">{fechaStr} • {horaStr}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 justify-end">
                      <span className="text-xs bg-slate-700 text-white px-2 py-1 rounded">x{it.cantidad || 1}</span>
                      <span className="text-emerald-400 font-semibold">${((it.cantidad || 1) * (it.precio || 0)).toFixed(2)}</span>
                    </div>
                  </div>
                ));
              })}
            </div>
          </div>
        )}

        {activeSection === 'facturacion' && (
          <CentroFacturacion ventasIniciales={sales} />
        )}
      </div>
    </div>
  );
}

export default ClientStore;
