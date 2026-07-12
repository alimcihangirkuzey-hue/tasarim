/* Sipariş Modu intake akış state'i — Zustand + localStorage taslak (F7-C/D).
   Müşteri YALNIZ commit'te yaratılır (yarım görüşme listeyi kirletmez). Yenileme/
   kilitlenme → taslaktan geri yüklenir; akış başında eski taslak varsa devam/at
   seçimi (ŞERH 2). Referans veri (paketler/çipler) burada DEĞİL — react-query'de.

   HF2-B (mimar SEÇENEK 1): görüntüleme HER YERDE TR; menu_language YALNIZ çıktı
   dilidir. name/category_name/category_note ham LocalizedName {tr,fr,de} taşır
   (SectorPack item/kategori adının KENDİSİ) — component'ler pickDisplay() ile
   HER ZAMAN TR gösterir (IntakeNav.tsx), commit anında TEK noktada (IntakeSummaryStep)
   pickML() ile menu_language'e çözülür. Sunucu/projeksiyon/IntakeAnswers şekli
   DEĞİŞMEDİ — yalnız istemci. */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { migrateIntakeDraftV2toV3, type LocalizedName, type SurfaceKind } from "@tezgah/shared";

export type Currency = "EUR" | "CHF";
export type MenuLang = "fr" | "de" | "tr"; // CILA4/EK-1: tr eklendi

/* F8-A: intake çeklistinde toplanan yapısal yüzey TASLAĞI (web-yerel — w/h input
   STRING'i; boş=henüz ölçülmedi). Commit'te temizlenip IntakeSurface'e çevrilir
   (label trim + boş satır düşer + w/h sayıya). SurfaceKind shared'dan. */
export interface SurfaceDraft {
  kind: SurfaceKind;
  label: string;
  w_cm: string;
  h_cm: string;
  note: string;
}
export const EMPTY_SURFACE: SurfaceDraft = { kind: "vitrine", label: "", w_cm: "", h_cm: "", note: "" };

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
  category_name: LocalizedName; // ham (SectorPackCategory.name) — display tr, commit menu_language
  category_note?: LocalizedName; // ham kategori notu (F7-C/E)
  name: LocalizedName; // ham (SectorPackItem.name) — display tr, commit menu_language
  /* CILA3: question_ids kalktı — varyantlar EKLEME ANINDA türetilir (deriveVariants),
     answers'a hiç girmiyordu; ayrı "Sorular" adımı da kalktı. */
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
  /* F8-A: yapısal yüzeyler (serbest-metin size_note/surface_note KALIR — M8) */
  surfaces: SurfaceDraft[];
}

const EMPTY_CHECKLIST: Checklist = {
  logo: "",
  photo_policy: "",
  contact_confirmed: false,
  size_note: "",
  surface_note: "",
  deposit_note: "",
  delivery_date: "",
  surfaces: [],
};

interface IntakeData {
  step: number; // 1..5 (CILA3: Müşteri · Paketler · Ürünler · Çeklist · Özet)
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
  clientMode: "new", // CILA1/3: varsayılan YENİ (kazanın kök önleyicisi)
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
  addSurface: () => void;
  updateSurface: (i: number, patch: Partial<SurfaceDraft>) => void;
  removeSurface: (i: number) => void;
  reset: () => void; // taslağı at
  /** Menü dili — commit'te projeksiyona geçer; mevcut müşteride sunucu kendi diliyle re-projekte eder */
  menuLang: () => MenuLang;
  /** Taslak boş değil mi (devam/at kararı için) */
  hasDraft: () => boolean;
  draftLabel: () => string;
}

const touch = (): { savedAt: number } => ({ savedAt: Date.now() });

/* HF2-B taslak sürüm bekçisi: persisted version eşleşmezse (eski taslak)
   MİGRASYON DENENMEZ — taslak temiz atılır; kullanıcıya açık mesaj (SiparisPage
   consumeDraftDiscardedNotice() ile mount'ta bir kez okur+sıfırlar — sessiz
   kayıp yok, M8). migrate() create() sırasında (modül yüklenirken) senkron
   çalışır, component render'ından önce tamamlanmış olur. Modül-seviyesi `let`
   import eden taraftan YAZILAMAZ (ES module read-only binding) — bu yüzden
   setter/consumer fonksiyon üzerinden.
   Sürüm geçmişi: v1 = HF2-B (LocalizedName refactor) · v2 = CILA3 (akış 5 adım,
   step aralığı daraldı + IntakeProduct.question_ids kalktı) · v3 = F8-A (çeklist
   surfaces[] — İLK GERÇEK additive migrasyon: v2 taslak ATILMAZ, surfaces:[]
   eklenip taşınır; v1 vb. hâlâ atılır). */
let draftDiscardedNotice = false;
export function consumeDraftDiscardedNotice(): boolean {
  const v = draftDiscardedNotice;
  draftDiscardedNotice = false;
  return v;
}
const SCHEMA_VERSION = 3;

export const useIntake = create<IntakeStore>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      setStep: (s) => set({ step: s, ...touch() }),
      next: () => set({ step: Math.min(5, get().step + 1), ...touch() }),
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

      /* F8-A yüzey taslağı aksiyonları (array — dedicated, component'te yeniden
         kurmak yerine) */
      addSurface: () =>
        set({ checklist: { ...get().checklist, surfaces: [...get().checklist.surfaces, { ...EMPTY_SURFACE }] }, ...touch() }),
      updateSurface: (i, patch) =>
        set({
          checklist: {
            ...get().checklist,
            surfaces: get().checklist.surfaces.map((s, j) => (j === i ? { ...s, ...patch } : s)),
          },
          ...touch(),
        }),
      removeSurface: (i) =>
        set({ checklist: { ...get().checklist, surfaces: get().checklist.surfaces.filter((_, j) => j !== i) }, ...touch() }),

      reset: () => set({ ...INITIAL }),

      menuLang: () =>
        get().clientMode === "new" ? get().newClient.menu_language : "fr",

      hasDraft: () => {
        const s = get();
        /* CILA1/3: clientMode artık HER ZAMAN "new" (INITIAL) — "!== null" kontrolü
           anlamsızlaştı (her zaman true döner, false-pozitif taslak-uyarısı riski).
           Yerine existingClientId (kullanıcı GERÇEKTEN bir müşteri seçtiyse) bakılır. */
        return s.step > 1 || s.products.length > 0 || s.selectedPackIds.length > 0 ||
          s.existingClientId !== null || s.newClient.name.trim() !== "";
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
      version: SCHEMA_VERSION,
      migrate: (persisted, version) => {
        /* F8-A/D4: v2→v3 GERÇEK additive migrasyon (checklist.surfaces:[] eklenir,
           kalan aynen — shared migrateIntakeDraftV2toV3, orada test edilir). Daha
           eski (v1 vb.) hâlâ bekçiyle atılır + operatöre mesaj (sessiz kayıp yok). */
        if (version === 2) {
          return migrateIntakeDraftV2toV3(persisted as { checklist?: Record<string, unknown> }) as unknown as IntakeStore;
        }
        if (version !== SCHEMA_VERSION) {
          draftDiscardedNotice = true;
          return { ...INITIAL } as IntakeStore; // migrasyon denemesi YOK — temiz atılır
        }
        return persisted as IntakeStore;
      },
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
