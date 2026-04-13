import React, { useEffect, useRef } from 'react';
import { Check, CheckCheck, FileText, Image as ImageIcon, Headphones, Download } from 'lucide-react';

function MessageList({ messages, currentUserId }) {
  const containerRef = useRef(null);

  // Auto-scroll al abrir o con nuevos mensajes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  // Función auxiliar de formateo limpio para que cada mensaje indique (ej. 14:03).
  // Se encarga de mitigar fallos en el parsing de Fechas del servidor.
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate?.() || new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  // Motor de renderizado condicional.
  // Revisa la clave "fileUrl" antes de "text" para decidir como pintarse.
  const renderContent = (msg) => {
    if (msg.fileUrl) {
       switch(msg.fileType) {
           case 'photo':
              return (
                <div className="mt-1 flex flex-col items-center">
                   {msg.text && <p className="mb-2 w-full text-left">{msg.text}</p>}
                   <a href={msg.fileUrl} target="_blank" rel="noreferrer">
                      <img src={msg.fileUrl} alt="Archivo adjunto" className="max-w-full max-h-[250px] rounded-md object-contain border border-slate-700/50" />
                   </a>
                </div>
              );
           case 'audio':
              return (
                <div className="mt-1">
                   {msg.text && <p className="mb-2">{msg.text}</p>}
                   {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                   <audio src={msg.fileUrl} controls className="max-w-full h-10 w-[240px] grayscale" />
                </div>
              );
           case 'doc':
           default:
              return (
                <div className="mt-1 flex flex-col gap-2">
                   {msg.text && <p>{msg.text}</p>}
                   <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-lg hover:bg-slate-900/80 transition shadow-inner">
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
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-5 min-h-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/10 via-[#0b141a] to-[#0b141a] scroll-smooth">
      {messages.length === 0 && (
         <div className="mx-auto mt-12 max-w-sm rounded-2xl border border-dashed border-slate-600/60 bg-slate-800/30 px-6 py-8 text-center shadow-lg backdrop-blur-sm">
             <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
             </div>
             <h3 className="mb-1 text-base font-semibold text-slate-200">Chat Iniciado</h3>
             <p className="text-xs text-slate-400 leading-relaxed">Este es el inicio de tu conversación privada. Todo está encriptado y seguro.</p>
         </div>
      )}
      {messages.map((msg, index) => {
        const isSelf = msg.senderId === currentUserId; // True si el usuario actual lo mando
        
        // Estrategia visual compacta: si el msg actual es de la misma persona que el anterior
        // omite la separación y pinta una "burbuja continua" (-mt-3, esquinas juntas).
        const isSameSenderAsPrev = index > 0 && messages[index - 1].senderId === msg.senderId;
        
        return (
          <div key={msg.id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'} ${isSameSenderAsPrev ? '-mt-3' : ''}`}>
             <div className={`group relative max-w-[85%] md:max-w-[70%] px-3.5 py-2 z-10 transition-all ${
              isSelf 
                ? `bg-emerald-700/80 text-emerald-50 shadow-[0_2px_10px_-4px_rgba(16,185,129,0.3)] border border-emerald-600/40 ${isSameSenderAsPrev ? 'rounded-xl rounded-tr-sm' : 'rounded-2xl rounded-br-sm'}` 
                : `bg-[#1f2c33] text-slate-200 shadow-sm border border-slate-700/60 ${isSameSenderAsPrev ? 'rounded-xl rounded-tl-sm' : 'rounded-2xl rounded-bl-sm'}`
            }`}>
              {renderContent(msg)}
              
              <div className={`mt-1.5 flex items-center justify-end gap-1.5 text-[10px] font-medium tracking-wide ${isSelf ? 'text-emerald-100/70' : 'text-slate-400/80'}`}>
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
  );
}

export default MessageList;
