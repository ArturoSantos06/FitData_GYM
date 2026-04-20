import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ASSISTANT_STORAGE_KEY, DEFAULT_KNOWLEDGE_BASE, DEFAULT_QUICK_QUESTIONS } from './conocimientoAsistente';
import { getBestAssistantAnswer } from './nlpAsistente';

const AssistantContext = createContext(null);

const normalizeEntry = (entry = {}) => ({
  ...entry,
  id: String(entry.id || '').trim(),
  question: String(entry.question || ''),
  answer: String(entry.answer || ''),
  tags: Array.isArray(entry.tags) ? entry.tags : [],
  active: entry.active !== false
});

const readKnowledgeFromStorage = () => {
  try {
    const raw = localStorage.getItem(ASSISTANT_STORAGE_KEY);
    if (!raw) return DEFAULT_KNOWLEDGE_BASE.map(normalizeEntry);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_KNOWLEDGE_BASE.map(normalizeEntry);
    return parsed.map(normalizeEntry);
  } catch {
    return DEFAULT_KNOWLEDGE_BASE.map(normalizeEntry);
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
      tags: Array.isArray(entry.tags) ? entry.tags : [],
      active: entry.active !== false
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
          question: String(updates.question ?? item.question),
          answer: String(updates.answer ?? item.answer),
          tags: Array.isArray(updates.tags) ? updates.tags : item.tags,
          active: typeof updates.active === 'boolean' ? updates.active : item.active !== false
        };
      })
    );
  };

  const setEntryActive = (entryId, active) => {
    setKnowledgeBase((prev) =>
      prev.map((item) => {
        if (item.id !== entryId) return item;
        return { ...item, active: Boolean(active) };
      })
    );
  };

  const removeEntry = (entryId) => {
    setKnowledgeBase((prev) => prev.filter((item) => item.id !== entryId));
  };

  const resetDefaultKnowledge = () => {
    setKnowledgeBase(DEFAULT_KNOWLEDGE_BASE.map(normalizeEntry));
  };

  const ask = (question) => {
    const activeKnowledge = knowledgeBase.filter((item) => item.active !== false);
    return getBestAssistantAnswer(question, activeKnowledge);
  };

  const value = useMemo(
    () => ({
      knowledgeBase,
      quickQuestions: DEFAULT_QUICK_QUESTIONS,
      ask,
      addEntry,
      updateEntry,
      setEntryActive,
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
