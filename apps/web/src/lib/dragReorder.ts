/* Saf pointer-events dikey sürükle-sırala kancası — FAZ5 §6, mimar kararı #17.
   Ek bağımlılık yok (ScenesPanel pointer-capture deseniyle tutarlı).
   Kullanım: container'a containerRef + rowProps(id), tutamaç'a handleProps(id).
   Satırlar [data-drag-id] taşır; bırakışta yeni sıra onCommit ile verilir.
   ↑↓ okları erişilebilirlik için AYRICA kalır (bu kanca onları değiştirmez). */

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export interface DragReorder {
  containerRef: (el: HTMLElement | null) => void;
  dragId: string | null;
  overId: string | null;
  handleProps: (id: string) => { onPointerDown: (e: ReactPointerEvent) => void };
  rowProps: (id: string) => {
    "data-drag-id": string;
    onPointerMove: (e: ReactPointerEvent) => void;
    onPointerUp: () => void;
  };
}

export function useDragReorder(ids: string[], onCommit: (next: string[]) => void): DragReorder {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const containerEl = useRef<HTMLElement | null>(null);

  const start = (id: string) => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setDragId(id);
    setOverId(id);
  };

  const move = (e: ReactPointerEvent) => {
    if (!dragId || !containerEl.current) return;
    const rows = Array.from(containerEl.current.querySelectorAll("[data-drag-id]")) as HTMLElement[];
    const y = e.clientY;
    for (const r of rows) {
      const rect = r.getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) {
        const id = r.getAttribute("data-drag-id");
        if (id && id !== overId) setOverId(id);
        return;
      }
    }
  };

  const end = () => {
    if (dragId && overId && dragId !== overId) {
      const next = [...ids];
      const from = next.indexOf(dragId);
      const to = next.indexOf(overId);
      if (from >= 0 && to >= 0) {
        next.splice(from, 1);
        next.splice(to, 0, dragId);
        onCommit(next);
      }
    }
    setDragId(null);
    setOverId(null);
  };

  return {
    containerRef: (el) => (containerEl.current = el),
    dragId,
    overId,
    handleProps: (id) => ({ onPointerDown: start(id) }),
    rowProps: (id) => ({ "data-drag-id": id, onPointerMove: move, onPointerUp: end }),
  };
}
