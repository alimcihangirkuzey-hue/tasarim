/* Saf pointer-events dikey sürükle-sırala kancası — FAZ5 §6, mimar kararı #17.
   Ek bağımlılık yok. Kullanım: container'a containerRef + rowProps(id) ([data-drag-id]),
   tutamaç'a handleProps(id); bırakışta yeni sıra onCommit ile verilir.
   ↑↓ okları erişilebilirlik için AYRICA kalır (bu kanca onları değiştirmez).

   Hotfix (pilot 2026-07-09): uzun listede sürükleme hedefe ulaşamıyordu.
   - AUTOSCROLL: fare, kaydırılabilir atanın (overflow-y: auto sütun ya da sayfa)
     üst/alt kenarına yaklaşınca liste rAF ile kayar; kayarken hedef (overId)
     son fare konumuyla yeniden hesaplanır. Kök neden buydu: 75 ürünlük gerçek
     belgede hedef satır viewport dışında kalıyor, liste kaymayınca satır
     "taşınamıyordu".
   - Sağlamlaştırma: move/up dinleyicileri satır köpürmesi yerine WINDOW'a bağlanır
     (pointer capture/DOM değişimi/stopPropagation'a bağımlılık yok), sürükleme
     durumu ref'te tutulur (stale closure yok), 3px eşik (tıklamayla karışmaz),
     pointercancel sürüklemeyi commit'siz iptal eder.
   - İç içe kancalar (kategori dışta, ürün içte): hit-test yalnız KENDİ id
     listesindeki satırları hedefler. */

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export interface DragReorder {
  containerRef: (el: HTMLElement | null) => void;
  dragId: string | null;
  overId: string | null;
  handleProps: (id: string) => { onPointerDown: (e: ReactPointerEvent) => void };
  rowProps: (id: string) => { "data-drag-id": string };
}

const EDGE_PX = 48; // autoscroll kenar bandı
const MAX_STEP = 16; // autoscroll maks hız (px/frame)
const THRESHOLD = 3; // sürükleme başlama eşiği (px)

/** container'dan yukarı ilk kaydırılabilir ata; yoksa sayfa scroller'ı */
function scrollableAncestor(el: HTMLElement | null): HTMLElement | null {
  let cur = el;
  while (cur) {
    const s = getComputedStyle(cur);
    if (/(auto|scroll)/.test(s.overflowY) && cur.scrollHeight > cur.clientHeight + 1) return cur;
    cur = cur.parentElement;
  }
  const doc = document.scrollingElement as HTMLElement | null;
  return doc && doc.scrollHeight > doc.clientHeight + 1 ? doc : null;
}

export function useDragReorder(ids: string[], onCommit: (next: string[]) => void): DragReorder {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const containerEl = useRef<HTMLElement | null>(null);

  /* mantık ref'te yaşar: window dinleyicileri/rAF render döngüsünden bağımsız çalışır */
  const st = useRef({
    id: null as string | null,
    over: null as string | null,
    active: false,
    startX: 0,
    startY: 0,
    lastY: 0,
    raf: 0,
    scrollDir: 0 as -1 | 0 | 1,
    scroller: null as HTMLElement | null,
    ids: [] as string[],
    commit: null as ((next: string[]) => void) | null,
  });
  st.current.ids = ids; // her render'da güncel liste
  st.current.commit = onCommit;

  /** y konumundaki KENDİ satırımız (iç içe kancalarda yabancı id'ler atlanır) */
  const hitTest = (y: number): string | null => {
    if (!containerEl.current) return null;
    const rows = containerEl.current.querySelectorAll<HTMLElement>("[data-drag-id]");
    for (const r of rows) {
      const id = r.getAttribute("data-drag-id");
      if (!id || !st.current.ids.includes(id)) continue;
      const rect = r.getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) return id;
    }
    return null;
  };

  const setOver = (id: string | null) => {
    if (id && id !== st.current.over) {
      st.current.over = id;
      setOverId(id);
    }
  };

  const stopAutoScroll = () => {
    st.current.scrollDir = 0;
    if (st.current.raf) cancelAnimationFrame(st.current.raf);
    st.current.raf = 0;
  };

  /* rAF döngüsü: kenardayken kaydır, kaydıkça fare altındaki hedefi tazele */
  const tick = () => {
    const s = st.current;
    if (!s.id || s.scrollDir === 0 || !s.scroller) {
      s.raf = 0;
      return;
    }
    const el = s.scroller;
    const rect =
      el === document.scrollingElement
        ? { top: 0, bottom: window.innerHeight }
        : el.getBoundingClientRect();
    const dist =
      s.scrollDir < 0 ? Math.max(0, EDGE_PX - (s.lastY - rect.top)) : Math.max(0, EDGE_PX - (rect.bottom - s.lastY));
    const step = Math.ceil(Math.min(MAX_STEP, (dist / EDGE_PX) * MAX_STEP));
    if (step > 0) {
      el.scrollTop += s.scrollDir * step;
      setOver(hitTest(s.lastY)); // liste kaydı — fare sabit olsa da hedef değişir
    }
    s.raf = requestAnimationFrame(tick);
  };

  const onMove = (e: PointerEvent) => {
    const s = st.current;
    if (!s.id) return;
    if (!s.active) {
      if (Math.abs(e.clientX - s.startX) + Math.abs(e.clientY - s.startY) < THRESHOLD) return;
      s.active = true;
      setDragId(s.id); // görsel durum eşik aşılınca başlar
      s.scroller = scrollableAncestor(containerEl.current);
    }
    s.lastY = e.clientY;
    setOver(hitTest(e.clientY));

    /* kenar bandı → autoscroll yönü */
    if (s.scroller) {
      const el = s.scroller;
      const rect =
        el === document.scrollingElement
          ? { top: 0, bottom: window.innerHeight }
          : el.getBoundingClientRect();
      const dir: -1 | 0 | 1 =
        e.clientY < rect.top + EDGE_PX ? -1 : e.clientY > rect.bottom - EDGE_PX ? 1 : 0;
      s.scrollDir = dir;
      if (dir !== 0 && !s.raf) s.raf = requestAnimationFrame(tick);
      if (dir === 0) stopAutoScroll();
    }
  };

  const finish = (commit: boolean) => {
    const s = st.current;
    stopAutoScroll();
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    if (commit && s.active && s.id && s.over && s.id !== s.over) {
      const next = [...s.ids];
      const from = next.indexOf(s.id);
      const to = next.indexOf(s.over);
      if (from >= 0 && to >= 0) {
        next.splice(from, 1);
        next.splice(to, 0, s.id);
        s.commit?.(next);
      }
    }
    s.id = null;
    s.over = null;
    s.active = false;
    setDragId(null);
    setOverId(null);
  };
  const onUp = () => finish(true);
  const onCancel = () => finish(false);

  const start = (id: string) => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const s = st.current;
    s.id = id;
    s.over = id;
    s.active = false;
    s.startX = e.clientX;
    s.startY = e.clientY;
    s.lastY = e.clientY;
    setOverId(id);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  };

  /* unmount: dinleyici/rAF sızıntısı olmasın */
  useEffect(
    () => () => {
      stopAutoScroll();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    },
    []
  );

  return {
    containerRef: (el) => (containerEl.current = el),
    dragId,
    overId,
    handleProps: (id) => ({ onPointerDown: start(id) }),
    rowProps: (id) => ({ "data-drag-id": id }),
  };
}
