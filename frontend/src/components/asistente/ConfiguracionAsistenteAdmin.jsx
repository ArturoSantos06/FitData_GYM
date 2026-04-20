import React, { useMemo, useState } from 'react';
import { Pencil, Save, Trash2 } from 'lucide-react';
import { useAssistant } from './ContextoAsistente';

const parseTags = (value) =>
  String(value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

export default function AssistantAdminConfig() {
  const { knowledgeBase, addEntry, updateEntry, setEntryActive, removeEntry } = useAssistant();
  const [draft, setDraft] = useState({ question: '', answer: '', tags: '' });
  const [message, setMessage] = useState('');
  const [editingItemId, setEditingItemId] = useState(null);

  const orderedKnowledge = useMemo(() => [...knowledgeBase], [knowledgeBase]);

  const handleCreate = (event) => {
    event.preventDefault();
    const ok = addEntry({
      question: draft.question,
      answer: draft.answer,
      tags: parseTags(draft.tags)
    });

    if (!ok) {
      setMessage('Completa pregunta y respuesta para guardar.');
      return;
    }

    setDraft({ question: '', answer: '', tags: '' });
    setMessage('Entrada agregada al chatbot.');
  };

  return (
    <div className="space-y-5 text-slate-100">
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
        <h2 className="mb-3 text-xl font-black">Configuracion de Chatbot</h2>
        <p className="text-sm text-slate-400">
          Administra la base de conocimiento usada por el asistente para FAQ de horarios, ubicacion y reglamento.
        </p>
      </div>

      <form onSubmit={handleCreate} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <input
          value={draft.question}
          onChange={(event) => setDraft((prev) => ({ ...prev, question: event.target.value }))}
          placeholder="Pregunta frecuente"
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        />
        <textarea
          value={draft.answer}
          onChange={(event) => setDraft((prev) => ({ ...prev, answer: event.target.value }))}
          placeholder="Respuesta"
          rows={3}
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        />
        <input
          value={draft.tags}
          onChange={(event) => setDraft((prev) => ({ ...prev, tags: event.target.value }))}
          placeholder="Etiquetas separadas por coma"
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        />

        <div className="flex flex-wrap gap-2">
          <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold">
            <Save size={14} /> Guardar FAQ
          </button>
        </div>

        {message && <p className="text-xs text-cyan-300">{message}</p>}
      </form>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-300">Preguntas Actuales</h3>
        <div className="space-y-3">
          {orderedKnowledge.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <p className={`mb-2 text-[11px] font-semibold uppercase tracking-wide ${item.active !== false ? 'text-emerald-300' : 'text-amber-300'}`}>
                {item.active !== false ? 'Estado: Activa' : 'Estado: Inactiva'}
              </p>
              <input
                value={item.question}
                onChange={(event) => updateEntry(item.id, { question: event.target.value })}
                readOnly={editingItemId !== item.id}
                className={`mb-2 w-full rounded-lg border px-2 py-1.5 text-sm outline-none ${editingItemId === item.id ? 'border-cyan-500 bg-slate-900 text-white' : 'border-slate-700 bg-slate-950 text-slate-300 cursor-not-allowed'}`}
              />
              <textarea
                value={item.answer}
                onChange={(event) => updateEntry(item.id, { answer: event.target.value })}
                rows={2}
                readOnly={editingItemId !== item.id}
                className={`mb-2 w-full rounded-lg border px-2 py-1.5 text-sm outline-none ${editingItemId === item.id ? 'border-cyan-500 bg-slate-900 text-white' : 'border-slate-700 bg-slate-950 text-slate-300 cursor-not-allowed'}`}
              />
              <input
                value={(item.tags || []).join(', ')}
                onChange={(event) => updateEntry(item.id, { tags: parseTags(event.target.value) })}
                readOnly={editingItemId !== item.id}
                className={`mb-2 w-full rounded-lg border px-2 py-1.5 text-xs outline-none ${editingItemId === item.id ? 'border-cyan-500 bg-slate-900 text-white' : 'border-slate-700 bg-slate-950 text-slate-300 cursor-not-allowed'}`}
              />
              <button
                type="button"
                onClick={() => {
                  setEditingItemId((current) => (current === item.id ? null : item.id));
                  setMessage(editingItemId === item.id ? 'Edición bloqueada.' : 'Edición habilitada para esta pregunta.');
                }}
                className="mr-2 inline-flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-300"
              >
                <Pencil size={12} /> {editingItemId === item.id ? 'Bloquear' : 'Editar'}
              </button>
              <button
                type="button"
                disabled={item.active === false}
                onClick={() => {
                  setEntryActive(item.id, false);
                  setMessage('Pregunta inactivada. Ya no aparecera en el asistente.');
                }}
                className="mr-2 inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Inactivar
              </button>
              <button
                type="button"
                disabled={item.active !== false}
                onClick={() => {
                  setEntryActive(item.id, true);
                  setMessage('Pregunta activada. Ya vuelve a responderse en el asistente.');
                }}
                className="mr-2 inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Activar
              </button>
              <button
                type="button"
                onClick={() => removeEntry(item.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-300"
              >
                <Trash2 size={12} /> Eliminar
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
