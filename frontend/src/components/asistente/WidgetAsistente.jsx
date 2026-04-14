import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import AssistantChatPanel from './PanelChatAsistente';

export default function AssistantWidget({ context = 'public' }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isReady, setIsReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dragRef = useRef({
    dragging: false,
    moved: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0
  });

  const BUTTON_SIZE = 56;
  const EDGE_GAP = 0;
  const PANEL_GAP = 12;
  const PANEL_WIDTH_MAX = 360;
  const storageKey = `assistant_widget_position_${context}`;

  const clampPosition = (x, y) => {
    const maxX = Math.max(EDGE_GAP, window.innerWidth - BUTTON_SIZE - EDGE_GAP);
    const maxY = Math.max(EDGE_GAP, window.innerHeight - BUTTON_SIZE - EDGE_GAP);

    return {
      x: Math.min(Math.max(x, EDGE_GAP), maxX),
      y: Math.min(Math.max(y, EDGE_GAP), maxY)
    };
  };

  useEffect(() => {
    const defaultPos = clampPosition(
      window.innerWidth - BUTTON_SIZE - EDGE_GAP,
      window.innerHeight - BUTTON_SIZE - EDGE_GAP
    );

    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          setPosition(clampPosition(parsed.x, parsed.y));
        } else {
          setPosition(defaultPos);
        }
      } else {
        setPosition(defaultPos);
      }
    } catch {
      setPosition(defaultPos);
    }

    setIsReady(true);

    const handleResize = () => {
      setPosition((current) => clampPosition(current.x, current.y));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [storageKey]);

  useEffect(() => {
    if (!isReady) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(position));
    } catch {
      // Ignora errores de almacenamiento para no afectar la UI.
    }
  }, [isReady, position, storageKey]);

  useEffect(() => {
    const handleGlobalPointerMove = (event) => {
      if (!dragRef.current.dragging) return;

      const deltaX = event.clientX - dragRef.current.startX;
      const deltaY = event.clientY - dragRef.current.startY;
      if (!dragRef.current.moved && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
        dragRef.current.moved = true;
      }

      const next = clampPosition(
        dragRef.current.originX + deltaX,
        dragRef.current.originY + deltaY
      );
      setPosition(next);
    };

    const handleGlobalPointerEnd = () => {
      if (!dragRef.current.dragging) return;

      dragRef.current.dragging = false;
      dragRef.current.pointerId = null;
      dragRef.current.moved = false;
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerEnd);
    window.addEventListener('pointercancel', handleGlobalPointerEnd);

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerEnd);
      window.removeEventListener('pointercancel', handleGlobalPointerEnd);
    };
  }, []);

  const title =
    context === 'cliente'
      ? 'Soporte FitData (Cliente)'
      : 'Asistente FitData GYM';

  const handlePointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();

    dragRef.current.dragging = true;
    dragRef.current.moved = false;
    dragRef.current.pointerId = event.pointerId;
    dragRef.current.startX = event.clientX;
    dragRef.current.startY = event.clientY;
    dragRef.current.originX = position.x;
    dragRef.current.originY = position.y;

    setIsDragging(true);
    if (typeof event.currentTarget.setPointerCapture === 'function') {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handlePointerUp = (event) => {
    if (!dragRef.current.dragging) return;

    if (typeof event.currentTarget.releasePointerCapture === 'function' && dragRef.current.pointerId !== null) {
      event.currentTarget.releasePointerCapture(dragRef.current.pointerId);
    }
    const moved = dragRef.current.moved;
    dragRef.current.dragging = false;
    dragRef.current.moved = false;
    dragRef.current.pointerId = null;
    setIsDragging(false);

    if (!moved) {
      setOpen((value) => !value);
    }
  };

  const getPanelStyle = () => {
    if (typeof window === 'undefined') {
      return { right: '1rem', bottom: '5rem' };
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const panelWidth = Math.min(PANEL_WIDTH_MAX, viewportWidth * 0.92);

    const bubbleCenterX = position.x + BUTTON_SIZE / 2;
    const preferRight = bubbleCenterX <= viewportWidth / 2;

    const rawLeft = preferRight
      ? position.x + BUTTON_SIZE + PANEL_GAP
      : position.x - panelWidth - PANEL_GAP;

    const maxLeft = Math.max(EDGE_GAP, viewportWidth - panelWidth - EDGE_GAP);
    const left = Math.min(Math.max(rawLeft, EDGE_GAP), maxLeft);

    const bottom = Math.max(EDGE_GAP, viewportHeight - (position.y + BUTTON_SIZE));

    return {
      left: `${left}px`,
      bottom: `${bottom}px`
    };
  };

  return (
    <>
      {open && <AssistantChatPanel title={title} onClose={() => setOpen(false)} panelStyle={getPanelStyle()} />}

      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen((value) => !value);
          }
        }}
        className={`fixed z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500 text-slate-950 shadow-[0_10px_30px_rgba(6,182,212,0.45)] ${isDragging ? 'cursor-grabbing' : 'cursor-grab hover:scale-105'}`}
        style={{ left: `${position.x}px`, top: `${position.y}px`, touchAction: 'none' }}
        aria-label="Abrir asistente"
        aria-grabbed={isDragging}
      >
        <MessageCircle size={24} />
      </button>
    </>
  );
}
