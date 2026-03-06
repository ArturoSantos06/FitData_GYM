import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Upload, ListChecks, FileText, Image as ImageIcon } from 'lucide-react';

function RutinaEntrenador() {
  const navigate = useNavigate();
  const location = useLocation();
  const { memberId } = useParams();

  const member = location.state?.member || null;
  const memberName = useMemo(() => {
    if (!member) return `Alumno #${memberId}`;
    return `${member.nombre || ''} ${member.apellido || ''}`.trim() || `Alumno #${memberId}`;
  }, [member, memberId]);

  const [routineName, setRoutineName] = useState('');
  const [steps, setSteps] = useState([
    { id: Date.now(), titulo: '', descripcion: '', series: '', repeticiones: '', descanso: '' }
  ]);
  const [files, setFiles] = useState([]);

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        titulo: '',
        descripcion: '',
        series: '',
        repeticiones: '',
        descanso: ''
      }
    ]);
  };

  const removeStep = (id) => {
    setSteps((prev) => prev.filter((step) => step.id !== id));
  };

  const updateStep = (id, field, value) => {
    setSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, [field]: value } : step))
    );
  };

  const handleFileChange = (event) => {
    const selected = Array.from(event.target.files || []);
    const allowed = selected.filter((file) => {
      const isPdf = file.type === 'application/pdf';
      const isImage = file.type.startsWith('image/');
      return isPdf || isImage;
    });
    setFiles((prev) => [...prev, ...allowed]);
    event.target.value = '';
  };

  const removeFile = (indexToRemove) => {
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      alumno_id: memberId,
      alumno_nombre: memberName,
      nombre_rutina: routineName,
      pasos: steps,
      archivos: files.map((file) => ({
        nombre: file.name,
        tipo: file.type,
        size: file.size
      }))
    };

    console.log('Rutina digital (demo):', payload);
    alert('Rutina registrada en modo demo (frontend).');
  };

  const inputClass =
    'w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all';

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate('/entrenador')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          >
            <ArrowLeft size={16} />
            Volver a alumnos
          </button>

          <div className="text-right">
            <h1 className="text-2xl md:text-3xl font-bold">Rutina del Alumno</h1>
            <p className="text-slate-400 text-sm">{memberName}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6">
            <label className="block text-sm text-slate-300 mb-2">Nombre de la rutina</label>
            <input
              type="text"
              value={routineName}
              onChange={(e) => setRoutineName(e.target.value)}
              placeholder="Ej. Fuerza Tren Superior - Semana 1"
              className={inputClass}
              required
            />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-200 font-semibold">
                <ListChecks size={18} />
                Diseño paso a paso
              </div>
              <button
                type="button"
                onClick={addStep}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
              >
                <Plus size={16} />
                Agregar paso
              </button>
            </div>

            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">Paso {index + 1}</h3>
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(step.id)}
                        className="text-red-400 hover:text-red-300"
                        title="Eliminar paso"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="Ejercicio / actividad"
                    value={step.titulo}
                    onChange={(e) => updateStep(step.id, 'titulo', e.target.value)}
                    className={inputClass}
                    required
                  />

                  <textarea
                    placeholder="Descripción técnica del paso"
                    value={step.descripcion}
                    onChange={(e) => updateStep(step.id, 'descripcion', e.target.value)}
                    className={`${inputClass} min-h-20`}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Series (ej. 4)"
                      value={step.series}
                      onChange={(e) => updateStep(step.id, 'series', e.target.value)}
                      className={inputClass}
                    />
                    <input
                      type="text"
                      placeholder="Repeticiones (ej. 12)"
                      value={step.repeticiones}
                      onChange={(e) => updateStep(step.id, 'repeticiones', e.target.value)}
                      className={inputClass}
                    />
                    <input
                      type="text"
                      placeholder="Descanso (ej. 60s)"
                      value={step.descanso}
                      onChange={(e) => updateStep(step.id, 'descanso', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6">
            <div className="flex items-center gap-2 text-slate-200 font-semibold mb-4">
              <Upload size={18} />
              Archivos externos (Imágenes / PDF)
            </div>

            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer text-sm">
              <Upload size={16} />
              Subir archivos
              <input
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <div className="mt-4 space-y-2">
              {files.length === 0 && (
                <p className="text-slate-500 text-sm">No hay archivos cargados.</p>
              )}

              {files.map((file, index) => {
                const isPdf = file.type === 'application/pdf';
                return (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 text-slate-300">
                      {isPdf ? <FileText size={16} /> : <ImageIcon size={16} />}
                      <span className="text-sm">{file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Quitar
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full md:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
          >
            Guardar rutina digital
          </button>
        </form>
      </div>
    </div>
  );
}

export default RutinaEntrenador;
