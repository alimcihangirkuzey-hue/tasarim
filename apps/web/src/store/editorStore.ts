/* Editör belge state'i — Zustand + undo/redo geçmişi (CONSTITUTION §6.2, ADR-6).
   Otomatik kayıt EditorPage'de 2 sn debounce ile yapılır. */

import { create } from "zustand";
import type { DocumentState } from "@tezgah/shared";

const HISTORY_LIMIT = 50;

interface EditorStore {
  docId: string | null;
  doc: DocumentState | null;
  past: DocumentState[];
  future: DocumentState[];
  selectedSlot: string | null;
  saveState: "idle" | "dirty" | "saving" | "saved" | "error";

  load: (docId: string, doc: DocumentState) => void;
  patch: (p: Partial<DocumentState>) => void;
  undo: () => void;
  redo: () => void;
  select: (slot: string | null) => void;
  setSaveState: (s: EditorStore["saveState"]) => void;
}

export const useEditor = create<EditorStore>((set, get) => ({
  docId: null,
  doc: null,
  past: [],
  future: [],
  selectedSlot: null,
  saveState: "idle",

  load: (docId, doc) => {
    if (get().docId === docId) return; // aynı belge yeniden yüklenmez (yerel state korunur)
    set({ docId, doc, past: [], future: [], selectedSlot: null, saveState: "idle" });
  },

  patch: (p) => {
    const { doc, past } = get();
    if (!doc) return;
    const next = { ...doc, ...p };
    set({
      doc: next,
      past: [...past.slice(-HISTORY_LIMIT + 1), doc],
      future: [],
      saveState: "dirty",
    });
  },

  undo: () => {
    const { doc, past, future } = get();
    if (!doc || past.length === 0) return;
    set({
      doc: past[past.length - 1],
      past: past.slice(0, -1),
      future: [doc, ...future].slice(0, HISTORY_LIMIT),
      saveState: "dirty",
    });
  },

  redo: () => {
    const { doc, past, future } = get();
    if (!doc || future.length === 0) return;
    set({
      doc: future[0],
      future: future.slice(1),
      past: [...past.slice(-HISTORY_LIMIT + 1), doc],
      saveState: "dirty",
    });
  },

  select: (slot) => set({ selectedSlot: slot }),
  setSaveState: (s) => set({ saveState: s }),
}));
