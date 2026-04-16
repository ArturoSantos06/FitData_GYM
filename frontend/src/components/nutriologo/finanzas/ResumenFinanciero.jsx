import React from 'react';
import { DollarSign, CalendarDays, ClipboardList } from 'lucide-react';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2
  }).format(Number(value || 0));
};

function Card({ icon, title, value, subtitle, tone }) {
  return (
    <article className={`rounded-2xl border p-5 shadow-lg ${tone}`}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-300">{title}</p>
        {icon}
      </div>
      <p className="text-2xl font-extrabold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
    </article>
  );
}

export default function ResumenFinanciero({
  consultationsTotal,
  plansTotal,
  grandTotal,
  consultationsCount,
  plansCount
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card
        title="Ingresos Totales"
        value={formatCurrency(grandTotal)}
        subtitle={`${consultationsCount + plansCount} operaciones registradas`}
        tone="border-emerald-500/40 bg-emerald-500/10"
        icon={<DollarSign className="text-emerald-300" size={18} />}
      />

      <Card
        title="Cobros"
        value={formatCurrency(plansTotal)}
        subtitle={`${plansCount} cobros registrados`}
        tone="border-cyan-500/40 bg-cyan-500/10"
        icon={<CalendarDays className="text-cyan-300" size={18} />}
      />

      <Card
        title="Planes Vendidos"
        value={formatCurrency(plansTotal)}
        subtitle={`${plansCount} ventas con etiqueta de plan`}
        tone="border-indigo-500/40 bg-indigo-500/10"
        icon={<ClipboardList className="text-indigo-300" size={18} />}
      />
    </div>
  );
}
