import React from 'react';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2
  }).format(Number(value || 0));
};

const toDateLabel = (value) => {
  if (!value) return 'Sin fecha';
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export default function TablaOperaciones({ appointments = [], planSales = [] }) {
  const saleRows = planSales.map((item) => ({
    id: `venta-${item.id}`,
    type: 'Cobro',
    concept: item.tipo_venta || 'Plan nutricional',
    amount: Number(item.total || 0),
    date: item.createdAt || item.fecha || item.fechaRegistro
  }));

  const rows = [...saleRows]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 20);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-300">
        Movimientos Recientes
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] text-left">
          <thead>
            <tr className="border-b border-slate-800 text-xs uppercase tracking-[0.14em] text-slate-400">
              <th className="pb-2">Tipo</th>
              <th className="pb-2">Concepto</th>
              <th className="pb-2">Fecha</th>
              <th className="pb-2 text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan="4" className="py-6 text-center text-sm text-slate-500">
                  No hay movimientos para mostrar.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-800/60 text-sm text-slate-200">
                <td className="py-3">
                  <span
                    className="rounded-full bg-indigo-500/20 px-2 py-1 text-[11px] font-bold text-indigo-300"
                  >
                    {row.type}
                  </span>
                </td>
                <td className="py-3">{row.concept}</td>
                <td className="py-3 text-slate-400">{toDateLabel(row.date)}</td>
                <td className="py-3 text-right font-semibold text-emerald-300">{formatCurrency(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
