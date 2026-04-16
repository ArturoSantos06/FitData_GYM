import React, { useState, useRef } from 'react';
import { Send, Paperclip, ImageIcon, FileText, Headphones, X, Loader2 } from 'lucide-react';

function EntradaMensaje({ onSendMessage, isUploading }) {
   const [text, setText] = useState('');
   const [showAttachMenu, setShowAttachMenu] = useState(false);
   const [selectedFile, setSelectedFile] = useState(null);
   const [fileTypePreview, setFileTypePreview] = useState(null);
   const fileInputRef = useRef(null);

   // Maneja la selección estricta al cambiar el "ref" del File Input invisible
   const handleFileSelect = (e) => {
      const file = e.target.files[0];
      if (!file) return; // Validación básica de early return

      setSelectedFile(file); // Guarda el objeto File completo (con metadata de bits y name)
      setShowAttachMenu(false); // Cierra el menú flotante en automático

      // Inferir la categoría gráfica a mostrar al usuario antes de mandarlo
      if (file.type.startsWith('image/')) setFileTypePreview('photo');
      else if (file.type.startsWith('audio/')) setFileTypePreview('audio');
      else setFileTypePreview('doc'); // Cae en Documento por default (PDF, Excel, Word)
      
      e.target.value = ''; // Limpia el valor actual para permitir resubir el mismo archivo si el usuario decide borrarlo y re-eegirlo
   };

   // Emula un click nativo html y pasa filtros desde el array
   const handleTriggerFile = (acceptTypes) => {
       if (fileInputRef.current) {
           fileInputRef.current.accept = acceptTypes; // Sobrescribe extensiones en tiempo natural para el OS Explorer
           fileInputRef.current.click(); // Abre la ventana nativa
       }
   };

   // Agrupa todo el payload capturado y lo envía hacia el componente padre `VentanaChat`
   const handleSubmit = (e) => {
      e.preventDefault();
      // Solo procede si no está cargando actualmente y si al menos tiene un poco de texto O un archivo adjunto.
      if ((!text.trim() && !selectedFile) || isUploading) return;
      
      // Llamada hacia arriba mediante Prop (enviando el estado local y limpiándolo justo después)
      onSendMessage(text, selectedFile, fileTypePreview);
      setText('');
      setSelectedFile(null);
      setFileTypePreview(null);
   };

   const clearFile = () => {
      setSelectedFile(null);
      setFileTypePreview(null);
   };

   return (
       <div className="border-t border-slate-700/80 bg-[#111b21]/90 backdrop-blur-md px-3 py-3 md:px-4 relative flex flex-col z-20">
           {selectedFile && (
               <div className="mb-3 bg-slate-800/80 backdrop-blur border border-slate-700/60 rounded-xl p-2.5 flex items-center gap-3 shadow-lg transform transition-all duration-200 translate-y-0 opacity-100">
                   <div className="bg-slate-900/50 p-2 rounded-lg">
                       {fileTypePreview === 'photo' && <ImageIcon size={20} className="text-emerald-400"/>}
                       {fileTypePreview === 'doc' && <FileText size={20} className="text-cyan-400" />}
                       {fileTypePreview === 'audio' && <Headphones size={20} className="text-amber-400" />}
                   </div>
                   
                   <div className="flex-1 min-w-0">
                       <span className="text-sm font-medium text-slate-200 block truncate">{selectedFile.name}</span>
                       <span className="text-xs text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                   </div>
                   
                   <button type="button" onClick={clearFile} className="p-1.5 hover:bg-slate-700/80 hover:text-red-400 text-slate-400 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-600">
                      <X size={18} />
                   </button>
               </div>
           )}

           <form onSubmit={handleSubmit} className="flex items-end gap-2 relative">
               <div className="relative mb-0.5">
                   <button 
                       type="button" 
                       onClick={() => setShowAttachMenu(!showAttachMenu)}
                       className={`flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 ${showAttachMenu ? 'bg-cyan-500/10 text-cyan-400 scale-105' : 'bg-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                       aria-label="Adjuntar archivo"
                   >
                       <Paperclip size={20} className={showAttachMenu ? 'rotate-45' : 'rotate-0'} />
                   </button>
                   
                   {showAttachMenu && (
                       <>
                           <div className="fixed inset-0 z-0 bg-transparent" onClick={() => setShowAttachMenu(false)} />
                           <div className="absolute bottom-14 left-0 bg-[#233138] border border-slate-700 shadow-2xl shadow-black/40 rounded-2xl p-1.5 flex flex-col gap-1 w-52 mb-2 z-10 animate-fade-up origin-bottom-left">
                               <button type="button" onClick={() => handleTriggerFile('image/*')} className="flex items-center gap-3 w-full text-left p-2.5 rounded-xl hover:bg-slate-700/60 text-sm font-medium text-slate-200 transition-colors">
                                   <div className="bg-emerald-500/10 p-1.5 rounded-lg text-emerald-400"><ImageIcon size={18} /></div> Foto o Imagen
                               </button>
                               <button type="button" onClick={() => handleTriggerFile('audio/*')} className="flex items-center gap-3 w-full text-left p-2.5 rounded-xl hover:bg-slate-700/60 text-sm font-medium text-slate-200 transition-colors">
                                   <div className="bg-amber-500/10 p-1.5 rounded-lg text-amber-400"><Headphones size={18} /></div> Audio
                               </button>
                               <button type="button" onClick={() => handleTriggerFile('.pdf,.doc,.docx,.xls,.xlsx')} className="flex items-center gap-3 w-full text-left p-2.5 rounded-xl hover:bg-slate-700/60 text-sm font-medium text-slate-200 transition-colors">
                                   <div className="bg-cyan-500/10 p-1.5 rounded-lg text-cyan-400"><FileText size={18} /></div> Documento PDF/Word
                               </button>
                           </div>
                       </>
                   )}
               </div>

               <input 
                   type="file" 
                   ref={fileInputRef} 
                   className="hidden" 
                   onChange={handleFileSelect} 
               />

               <div className="flex-1 relative">
                   <textarea
                       value={text}
                       onChange={(e) => {
                           setText(e.target.value);
                           e.target.style.height = 'auto';
                           e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                       }}
                       onKeyDown={(e) => {
                           if (e.key === 'Enter' && !e.shiftKey) {
                               e.preventDefault();
                               handleSubmit(e);
                           }
                       }}
                       rows={1}
                       placeholder="Mensaje..."
                       className="w-full min-h-[44px] max-h-[120px] rounded-2xl border border-slate-700/80 bg-slate-800/60 px-4 py-3 text-[15px] text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none transition-all scrollbar-hide"
                       style={{ overflowY: 'auto' }}
                   />
               </div>

               <button
                    type="submit"
                    disabled={isUploading || (!text.trim() && !selectedFile)}
                    className="inline-flex h-11 min-w-[44px] mb-0.5 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-cyan-400 px-3 text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/40 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none disabled:shadow-none"
                    aria-label="Enviar mensaje"
                >
                    {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className={`${text.trim() || selectedFile ? 'animate-pulse-once' : ''}`} />}
                </button>
           </form>
       </div>
   );
}

export default EntradaMensaje;
