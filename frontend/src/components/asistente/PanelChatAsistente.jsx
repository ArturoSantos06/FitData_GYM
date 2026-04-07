import React, { useMemo, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { useAssistant } from './ContextoAsistente';
import AssistantQuickQuestions from './PreguntasRapidasAsistente';

export default function AssistantChatPanel({ title = 'Asistente FitData', embedded = false, onClose }) {
  const { ask, quickQuestions } = useAssistant();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hola. Puedo responder preguntas frecuentes sobre horarios, ubicacion y reglamento.'
    }
  ]);
  const listRef = useRef(null);

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  const pushAssistantAnswer = (questionText) => {
    const answer = ask(questionText);
    setMessages((prev) => [
      ...prev,
      { id: `u_${Date.now()}`, role: 'user', text: questionText },
      { id: `a_${Date.now()}_${Math.random()}`, role: 'assistant', text: answer }
    ]);
    setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    }, 20);
  };

  const handleSend = (event) => {
    event.preventDefault();
    if (!canSend) return;
    const text = input.trim();
    setInput('');
    pushAssistantAnswer(text);
  };

  const wrapperClass = embedded
    ? 'rounded-2xl border border-slate-800 bg-slate-900/70 p-4'
    : 'fixed bottom-20 right-4 z-50 w-[min(360px,92vw)] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl';

  return (
    <section className={wrapperClass}>
      <header className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 text-slate-100">
          <MessageCircle size={16} className="text-cyan-300" />
          <h3 className="text-sm font-bold uppercase tracking-wide">{title}</h3>
        </div>
        {!embedded && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </header>

      <div ref={listRef} className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-xl px-3 py-2 text-sm ${
              message.role === 'assistant'
                ? 'bg-slate-800 text-slate-100'
                : 'bg-cyan-500/20 text-cyan-100'
            }`}
          >
            {message.text}
          </div>
        ))}
      </div>

      <AssistantQuickQuestions questions={quickQuestions} onPick={pushAssistantAnswer} />

      <form onSubmit={handleSend} className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Escribe tu duda..."
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="inline-flex items-center gap-1 rounded-xl bg-cyan-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          <Send size={14} />
          Enviar
        </button>
      </form>
    </section>
  );
}
