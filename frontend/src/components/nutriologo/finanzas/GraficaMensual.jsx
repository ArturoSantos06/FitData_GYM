import React from 'react';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
};

export default function GraficaMensual({ monthlyData = [] }) {
  if (!monthlyData.length) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-400">
        Aun no hay suficientes movimientos para graficar ingresos mensuales.
      </div>
    );
  }

  const maxTotal = Math.max(...monthlyData.map((row) => row.total), 1);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-300">
        Ingresos por Mes
      </h3>

      <div className="space-y-3">
        {monthlyData.map((row) => {
          const widthPct = Math.max((row.total / maxTotal) * 100, 4);

          return (
            <div key={row.month}>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                <span className="uppercase tracking-wide">{row.label}</span>
                <span className="font-semibold text-slate-200">{formatCurrency(row.total)}</span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-linear-to-r from-cyan-500 via-emerald-400 to-indigo-500 transition-all"
                  style={{ width: `${widthPct}%` }}
                />
              </div>

              <div className="mt-1 text-[11px] text-slate-400">
                <span>Cobros de planes: {formatCurrency(row.planes)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
