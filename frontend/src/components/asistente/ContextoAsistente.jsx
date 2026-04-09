import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ASSISTANT_STORAGE_KEY, DEFAULT_KNOWLEDGE_BASE, DEFAULT_QUICK_QUESTIONS } from './conocimientoAsistente';
import { getBestAssistantAnswer } from './nlpAsistente';

const AssistantContext = createContext(null);

const readKnowledgeFromStorage = () => {
  try {
    const raw = localStorage.getItem(ASSISTANT_STORAGE_KEY);
    if (!raw) return DEFAULT_KNOWLEDGE_BASE;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_KNOWLEDGE_BASE;
  } catch {
    return DEFAULT_KNOWLEDGE_BASE;
  }
};

export function AssistantProvider({ children }) {
  const [knowledgeBase, setKnowledgeBase] = useState(readKnowledgeFromStorage);

  useEffect(() => {
    localStorage.setItem(ASSISTANT_STORAGE_KEY, JSON.stringify(knowledgeBase));
  }, [knowledgeBase]);

  const addEntry = (entry) => {
    const next = {
      id: entry.id || `entry_${Date.now()}`,
      question: String(entry.question || '').trim(),
      answer: String(entry.answer || '').trim(),
      tags: Array.isArray(entry.tags) ? entry.tags : []
    };

    if (!next.question || !next.answer) return false;
    setKnowledgeBase((prev) => [next, ...prev]);
    return true;
  };

  const updateEntry = (entryId, updates) => {
    setKnowledgeBase((prev) =>
      prev.map((item) => {
        if (item.id !== entryId) return item;
        return {
          ...item,
          question: String(updates.question ?? item.question).trim(),
          answer: String(updates.answer ?? item.answer).trim(),
          tags: Array.isArray(updates.tags) ? updates.tags : item.tags
        };
      })
    );
  };

  const removeEntry = (entryId) => {
    setKnowledgeBase((prev) => prev.filter((item) => item.id !== entryId));
  };

  const resetDefaultKnowledge = () => {
    setKnowledgeBase(DEFAULT_KNOWLEDGE_BASE);
  };

  const ask = (question) => getBestAssistantAnswer(question, knowledgeBase);

  const value = useMemo(
    () => ({
      knowledgeBase,
      quickQuestions: DEFAULT_QUICK_QUESTIONS,
      ask,
      addEntry,
      updateEntry,
      removeEntry,
      resetDefaultKnowledge
    }),
    [knowledgeBase]
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant debe usarse dentro de AssistantProvider');
  }
  return context;
}
