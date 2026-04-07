import React from 'react';

export default function AssistantQuickQuestions({ questions = [], onPick }) {
  if (!questions.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {questions.map((question) => (
        <button
          key={question}
          type="button"
          onClick={() => onPick(question)}
          className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:border-cyan-400 hover:text-cyan-300"
        >
          {question}
        </button>
      ))}
    </div>
  );
}
