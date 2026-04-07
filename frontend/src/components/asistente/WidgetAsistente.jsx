import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import AssistantChatPanel from './PanelChatAsistente';

export default function AssistantWidget({ context = 'public' }) {
  const [open, setOpen] = useState(false);

  const title =
    context === 'cliente'
      ? 'Soporte FitData (Cliente)'
      : 'Asistente FitData GYM';

  return (
    <>
      {open && <AssistantChatPanel title={title} onClose={() => setOpen(false)} />}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-4 right-4 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500 text-slate-950 shadow-[0_10px_30px_rgba(6,182,212,0.45)] hover:scale-105"
        aria-label="Abrir asistente"
      >
        <MessageCircle size={24} />
      </button>
    </>
  );
}
