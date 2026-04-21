import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { ASSISTANT_STORAGE_KEY, DEFAULT_KNOWLEDGE_BASE } from './conocimientoAsistente';
import { getBestAssistantAnswer } from './nlpAsistente';

const AssistantContext = createContext(null);
const ASSISTANT_KB_DOC = doc(db, 'app_config', 'assistant_kb');

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

const getKnowledgeFingerprint = (entries = []) =>
  JSON.stringify(
    entries.map((item) => ({
      id: String(item.id || ''),
      question: String(item.question || ''),
      answer: String(item.answer || ''),
      tags: Array.isArray(item.tags) ? item.tags : [],
      active: item.active !== false
    }))
  );

const DEFAULT_KNOWLEDGE_FINGERPRINT = getKnowledgeFingerprint(DEFAULT_KNOWLEDGE_BASE.map(normalizeEntry));

const persistKnowledgeToFirestore = async (entries = []) => {
  await setDoc(
    ASSISTANT_KB_DOC,
    {
      entries: entries.map(normalizeEntry),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
};

export function AssistantProvider({ children }) {
  const [knowledgeBase, setKnowledgeBase] = useState(readKnowledgeFromStorage);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      ASSISTANT_KB_DOC,
      async (snapshot) => {
        const data = snapshot.data();
        const remoteEntries = Array.isArray(data?.entries) ? data.entries.map(normalizeEntry) : null;

        if (remoteEntries && remoteEntries.length) {
          setKnowledgeBase(remoteEntries);
          return;
        }

        const localEntries = readKnowledgeFromStorage();
        setKnowledgeBase(localEntries);

        const localFingerprint = getKnowledgeFingerprint(localEntries);
        if (!snapshot.exists() && localFingerprint !== DEFAULT_KNOWLEDGE_FINGERPRINT) {
          try {
            await persistKnowledgeToFirestore(localEntries);
          } catch {
            // Si falla escritura remota, el modulo sigue operando con almacenamiento local.
          }
        }
      },
      () => {
        setKnowledgeBase(readKnowledgeFromStorage());
      }
    );

    return () => unsubscribe();
  }, []);

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
    setKnowledgeBase((prev) => {
      const nextKnowledge = [next, ...prev];
      persistKnowledgeToFirestore(nextKnowledge).catch(() => {});
      return nextKnowledge;
    });
    return true;
  };

  const updateEntry = (entryId, updates) => {
    setKnowledgeBase((prev) => {
      const nextKnowledge = prev.map((item) => {
        if (item.id !== entryId) return item;
        return {
          ...item,
          question: String(updates.question ?? item.question),
          answer: String(updates.answer ?? item.answer),
          tags: Array.isArray(updates.tags) ? updates.tags : item.tags,
          active: typeof updates.active === 'boolean' ? updates.active : item.active !== false
        };
      });
      persistKnowledgeToFirestore(nextKnowledge).catch(() => {});
      return nextKnowledge;
    });
  };

  const setEntryActive = (entryId, active) => {
    setKnowledgeBase((prev) => {
      const nextKnowledge = prev.map((item) => {
        if (item.id !== entryId) return item;
        return { ...item, active: Boolean(active) };
      });
      persistKnowledgeToFirestore(nextKnowledge).catch(() => {});
      return nextKnowledge;
    });
  };

  const removeEntry = (entryId) => {
    setKnowledgeBase((prev) => {
      const nextKnowledge = prev.filter((item) => item.id !== entryId);
      persistKnowledgeToFirestore(nextKnowledge).catch(() => {});
      return nextKnowledge;
    });
  };

  const resetDefaultKnowledge = () => {
    const defaults = DEFAULT_KNOWLEDGE_BASE.map(normalizeEntry);
    setKnowledgeBase(defaults);
    persistKnowledgeToFirestore(defaults).catch(() => {});
  };

  const ask = (question) => {
    const activeKnowledge = knowledgeBase.filter((item) => item.active !== false);
    return getBestAssistantAnswer(question, activeKnowledge);
  };

  const quickQuestions = useMemo(() => {
    const fromKnowledge = knowledgeBase
      .filter((item) => item.active !== false)
      .map((item) => String(item.question || '').trim())
      .filter(Boolean)
      .slice(0, 4);

    return fromKnowledge;
  }, [knowledgeBase]);

  const value = useMemo(
    () => ({
      knowledgeBase,
      quickQuestions,
      ask,
      addEntry,
      updateEntry,
      setEntryActive,
      removeEntry,
      resetDefaultKnowledge
    }),
    [knowledgeBase, quickQuestions]
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
