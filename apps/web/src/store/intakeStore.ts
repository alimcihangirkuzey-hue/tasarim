/* Sipariş Modu intake akış state'i — Zustand + localStorage taslak (F7-C/D).
   Müşteri YALNIZ commit'te yaratılır (yarım görüşme listeyi kirletmez). Yenileme/
   kilitlenme → taslaktan geri yüklenir; akış başında eski taslak varsa devam/at
   seçimi (ŞERH 2). Referans veri (paketler/çipler) burada DEĞİL — react-query'de. */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Currency = "EUR" | "CHF";
export type MenuLang = "fr" | "de";

export interface IntakeChip {
  chip_id?: string; // kütüphane id'si (varsa usage bump'a girer)
  tr: string;
  fr: string;
  de: string;
}

export interface IntakeVariantAnswer {
  label: string;
  value: number | null; // null → fiyat-bekliyor
}

export interface IntakeProduct {
  uid: string;
  category_name: string; // menü dilinde (grup anahtarı)
  category_note?: string; // menü dilinde kategori notu (F7-C/E)
  name: string; // menü dilinde ürün adı
  question_ids: string[];
  variants: IntakeVariantAnswer[];
  chips: IntakeChip[];
  extras: string[];
  hide_content: boolean; // "içerik basılmasın" (default_chips'li her üründe)
}

export interface Checklist {
  logo: "" | "var" | "yok";
  photo_policy: "" | "musteri" | "atolye" | "eksik";
  contact_confirmed: boolean;
  size_note: string;
  surface_note: string;
  deposit_note: string;
  delivery_date: string;
}

const EMPTY_CHECKLIST: Checklist = {
  logo: "",
  photo_policy: "",
  contact_confirmed: false,
  size_note: "",
  surface_note: "",
  deposit_note: "",
  delivery_date: "",
};

interface IntakeData {
  step: number; // 1..6
  clientMode: "new" | "existing" | null;
  newClient: { name: string; currency: Currency; menu_language: MenuLang };
  existingClientId: string | null;
  existingClientName: string | null;
  selectedPackIds: string[];
  products: IntakeProduct[];
  checklist: Checklist;
  savedAt: number | null;
}

const INITIAL: IntakeData = {
  step: 1,
  clientMode: null,
  newClient: { name: "", currency: "EUR", menu_language: "fr" },
  existingClientId: null,
  existingClientName: null,
  selectedPackIds: [],
  products: [],
  checklist: EMPTY_CHECKLIST,
  savedAt: null,
};

interface IntakeStore extends IntakeData {
  setStep: (s: number) => void;
  next: () => void;
  back: () => void;
  setClientMode: (m: "new" | "existing") => void;
  setNewClient: (p: Partial<IntakeData["newClient"]>) => void;
  setExistingClient: (id: string, name: string) => void;
  togglePack: (id: string) => void;
  addProduct: (p: IntakeProduct) => void;
  updateProduct: (uid: string, patch: Partial<IntakeProduct>) => void;
  removeProduct: (uid: string) => void;
  setChecklist: (p: Partial<Checklist>) => void;
  reset: () => void; // taslağı at
  /** Menü dili — commit'te projeksiyona geçer; mevcut müşteride sunucu kendi diliyle re-projekte eder */
  menuLang: () => MenuLang;
  /** Taslak boş değil mi (devam/at kararı için) */
  hasDraft: () => boolean;
  draftLabel: () => string;
}

const touch = (): { savedAt: number } => ({ savedAt: Date.now() });

export const useIntake = create<IntakeStore>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      setStep: (s) => set({ step: s, ...touch() }),
      next: () => set({ step: Math.min(6, get().step + 1), ...touch() }),
      back: () => set({ step: Math.max(1, get().step - 1), ...touch() }),

      setClientMode: (m) => set({ clientMode: m, ...touch() }),
      setNewClient: (p) => set({ newClient: { ...get().newClient, ...p }, ...touch() }),
      setExistingClient: (id, name) =>
        set({ existingClientId: id, existingClientName: name, ...touch() }),

      togglePack: (id) => {
        const cur = get().selectedPackIds;
        set({
          selectedPackIds: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
          ...touch(),
        });
      },

      addProduct: (p) => set({ products: [...get().products, p], ...touch() }),
      updateProduct: (uid, patch) =>
        set({
          products: get().products.map((p) => (p.uid === uid ? { ...p, ...patch } : p)),
          ...touch(),
        }),
      removeProduct: (uid) => set({ products: get().products.filter((p) => p.uid !== uid), ...touch() }),

      setChecklist: (p) => set({ checklist: { ...get().checklist, ...p }, ...touch() }),

      reset: () => set({ ...INITIAL }),

      menuLang: () =>
        get().clientMode === "new" ? get().newClient.menu_language : "fr",

      hasDraft: () => {
        const s = get();
        return s.step > 1 || s.products.length > 0 || s.selectedPackIds.length > 0 ||
          s.clientMode !== null || s.newClient.name.trim() !== "";
      },
      draftLabel: () => {
        const s = get();
        const who = s.clientMode === "existing"
          ? (s.existingClientName ?? "müşteri")
          : (s.newClient.name.trim() || "yeni müşteri");
        return who;
      },
    }),
    {
      name: "tezgah-intake-draft",
      partialize: (s): IntakeData => ({
        step: s.step,
        clientMode: s.clientMode,
        newClient: s.newClient,
        existingClientId: s.existingClientId,
        existingClientName: s.existingClientName,
        selectedPackIds: s.selectedPackIds,
        products: s.products,
        checklist: s.checklist,
        savedAt: s.savedAt,
      }),
    }
  )
);
