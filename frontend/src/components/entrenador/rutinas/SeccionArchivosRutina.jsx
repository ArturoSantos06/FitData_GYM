import React from 'react';
import { FileText, Image as ImageIcon, Upload } from 'lucide-react';

function SeccionArchivosRutina({ files = [], onFileChange, onRemoveFile }) {
  const archivos = Array.isArray(files) ? files : [];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6">
      <div className="flex items-center gap-2 text-slate-200 font-semibold mb-4">
        <Upload size={18} />
        Archivos externos (Imágenes / PDF)
      </div>

      <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer text-sm transition-colors">
        <Upload size={16} />
        Subir archivos
        <input type="file" accept="image/*,.pdf" multiple onChange={onFileChange} className="hidden" />
      </label>

      <div className="mt-4 space-y-2">
        {archivos.length === 0 && <p className="text-slate-500 text-sm">No hay archivos cargados.</p>}
        {archivos.map((archivo, index) => (
          <div key={`${archivo.name}-${index}`} className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-300">
              {archivo.type === 'application/pdf' ? <FileText size={16} /> : <ImageIcon size={16} />}
              <span className="text-sm">{archivo.name}</span>
            </div>
            <button type="button" onClick={() => onRemoveFile(index)} className="text-red-400 hover:text-red-300 text-sm">Quitar</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SeccionArchivosRutina;
