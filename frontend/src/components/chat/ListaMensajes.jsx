import React, { useEffect, useRef, useState } from 'react';
import { Check, CheckCheck, FileText, Download, Trash2, AlertTriangle } from 'lucide-react';

/* ─── Modal de confirmación ─────────────────────────────────── */
function ModalEliminarMensaje({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-xs rounded-2xl border border-slate-700/80 bg-[#1a2733] shadow-2xl shadow-black/60 animate-fade-in">
        {/* Barra de acento superior */}
        <div className="h-1 w-full rounded-t-2xl bg-gradient-to-r from-red-500 via-rose-400 to-red-500" />

        <div className="px-6 pt-5 pb-6 text-center">
          {/* Ícono */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={26} className="text-red-400" />
          </div>

          <h3 className="mb-1 text-base font-bold text-slate-100">
            Eliminar mensaje
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            ¿Seguro que deseas eliminar este mensaje?<br />
            <span className="text-slate-500 text-xs">Esta acción no se puede deshacer.</span>
          </p>

          {/* Botones */}
          <div className="mt-5 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 rounded-xl border border-slate-600 bg-slate-800/60 py-2.5 text-sm font-semibold text-slate-300 transition-all hover:bg-slate-700 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-500 hover:shadow-red-500/40 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Lista de mensajes ──────────────────────────────────────── */
function ListaMensajes({ messages, currentUserId, onDeleteMessage }) {
  const containerRef = useRef(null);
  const [pendingDelete, setPendingDelete] = useState(null); // msg a confirmar

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate?.() || new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  const handleConfirmDelete = () => {
    if (pendingDelete) onDeleteMessage(pendingDelete);
    setPendingDelete(null);
  };

  const renderContent = (msg) => {
    if (msg.fileUrl) {
      switch (msg.fileType) {
        case 'photo':
          return (
            <div className="mt-1 flex flex-col items-center">
              {msg.text && <p className="mb-2 w-full text-left">{msg.text}</p>}
              <a href={msg.fileUrl} target="_blank" rel="noreferrer">
                <img
                  src={msg.fileUrl}
                  alt="Archivo adjunto"
                  className="max-w-full max-h-[250px] rounded-md object-contain border border-slate-700/50"
                />
              </a>
            </div>
          );
        case 'audio':
          return (
            <div className="mt-1">
              {msg.text && <p className="mb-2">{msg.text}</p>}
              <audio src={msg.fileUrl} controls className="max-w-full h-10 w-60 grayscale" />
            </div>
          );
        case 'doc':
        default:
          return (
            <div className="mt-1 flex flex-col gap-2">
              {msg.text && <p>{msg.text}</p>}
              <a
                href={msg.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-lg hover:bg-slate-900/80 transition shadow-inner"
              >
                <FileText size={20} className="text-cyan-400" />
                <span className="text-sm font-medium text-slate-200">Ver Documento</span>
                <Download size={14} className="ml-auto text-slate-400" />
              </a>
            </div>
          );
      }
    }
    return <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{msg.text}</p>;
  };

  return (
    <>
      {/* Modal de confirmación de borrado */}
      {pendingDelete && (
        <ModalEliminarMensaje
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-5 min-h-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-slate-800/10 via-[#0b141a] to-[#0b141a] scroll-smooth"
      >
        {messages.length === 0 && (
          <div className="mx-auto mt-12 max-w-sm rounded-2xl border border-dashed border-slate-600/60 bg-slate-800/30 px-6 py-8 text-center shadow-lg backdrop-blur-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
              </svg>
            </div>
            <h3 className="mb-1 text-base font-semibold text-slate-200">Chat Iniciado</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Este es el inicio de tu conversación privada.</p>
          </div>
        )}

        {messages.map((msg, index) => {
          const isSelf = msg.senderId === currentUserId;
          const isSameSenderAsPrev = index > 0 && messages[index - 1].senderId === msg.senderId;

          return (
            <div
              key={msg.id}
              className={`flex ${isSelf ? 'justify-end' : 'justify-start'} ${isSameSenderAsPrev ? '-mt-3' : ''}`}
            >
              <div
                className={`group relative max-w-[85%] md:max-w-[70%] px-3.5 py-2 z-10 transition-all ${isSelf
                  ? `bg-blue-700/80 text-blue-50 shadow-[0_2px_10px_-4px_rgba(59,130,246,0.3)] border border-blue-600/40 ${isSameSenderAsPrev ? 'rounded-xl rounded-tr-sm' : 'rounded-2xl rounded-br-sm'}`
                  : `bg-[#1f2c33] text-slate-200 shadow-sm border border-slate-700/60 ${isSameSenderAsPrev ? 'rounded-xl rounded-tl-sm' : 'rounded-2xl rounded-bl-sm'}`
                  }`}
              >
                {renderContent(msg)}

                <div className={`mt-1.5 flex items-center justify-end gap-1.5 text-[10px] font-medium tracking-wide ${isSelf ? 'text-blue-100/70' : 'text-slate-400/80'}`}>
                  {/* Botón eliminar — solo en propios */}
                  {isSelf && onDeleteMessage && (
                    <button
                      onClick={() => setPendingDelete(msg)}
                      className="opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-red-300 transition-all mr-0.5"
                      aria-label="Eliminar mensaje"
                      title="Eliminar mensaje"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <span>{formatTime(msg.timestamp)}</span>
                  {isSelf && (
                    msg.read
                      ? <CheckCheck size={14} className="text-cyan-400" />
                      : <Check size={14} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default ListaMensajes;
