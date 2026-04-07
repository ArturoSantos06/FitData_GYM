import React from 'react';
import AssistantChatPanel from './PanelChatAsistente';

export default function AssistantSupportCenter() {
  return (
    <div className="animate-fade-in space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
        Centro de ayuda: escribe tus dudas en lenguaje natural sobre horarios, ubicacion y reglamento.
      </div>
      <AssistantChatPanel embedded title="Ayuda y Soporte" />
    </div>
  );
}
