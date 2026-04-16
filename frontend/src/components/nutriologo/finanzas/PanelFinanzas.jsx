import React from 'react';
import { AlertTriangle } from 'lucide-react';
import ResumenFinanciero from './ResumenFinanciero';
import GraficaMensual from './GraficaMensual';
import TablaOperaciones from './TablaOperaciones';
import PanelCobros from './PanelCobros';
import { useDatosFinancierosNutri } from '../../../backend/useDatosFinancierosNutri';

export default function NutriFinancialDashboard() {
  const {
    loading,
    error,
    consultationsTotal,
    plansTotal,
    grandTotal,
    consultationsCount,
    plansCount,
    monthlyData,
    appointments,
    planSales,
    reloadData
  } = useDatosFinancierosNutri();

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
        Cargando panel financiero...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/35 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      <ResumenFinanciero
        consultationsTotal={consultationsTotal}
        plansTotal={plansTotal}
        grandTotal={grandTotal}
        consultationsCount={consultationsCount}
        plansCount={plansCount}
      />

      <PanelCobros onChargeCreated={reloadData} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <GraficaMensual monthlyData={monthlyData} />
        <TablaOperaciones appointments={appointments} planSales={planSales} />
      </div>
    </div>
  );
}
