/* İçerik Seçimi paneli — FAZ5 §6: kategori + kategori-içi ürün sürükle-bırak
   sıralama (saf pointer-events, mimar #17) + mevcut ↑↓ okları (erişilebilirlik).
   Sıra document.selection'a yazılır (category_order / item_order); PDF birebir. */

import {
  setCategoryItemOrder,
  setCategoryOrder,
  type ClientDTO,
  type DocumentState,
  type Item,
} from "@tezgah/shared";
import { useDragReorder } from "../lib/dragReorder";
import { t } from "../i18n";

/* Kategorinin panelde gösterim sırası: item_order varsa onu izle (dışlananlar
   dahil, işaretsiz gösterilir), yoksa katalog order (M1). */
function displayItems(cat: { items: Item[] }, order: string[] | undefined): Item[] {
  const visible = cat.items.filter((i) => i.visible);
  if (!order || order.length === 0) return [...visible].sort((a, b) => a.order - b.order);
  return [...visible].sort((a, b) => {
    const pa = order.indexOf(a.id);
    const pb = order.indexOf(b.id);
    const ka = pa === -1 ? Number.POSITIVE_INFINITY : pa;
    const kb = pb === -1 ? Number.POSITIVE_INFINITY : pb;
    return ka !== kb ? ka - kb : a.order - b.order;
  });
}

function ItemList(props: {
  client: ClientDTO;
  doc: DocumentState;
  catId: string;
  patch: (p: Partial<DocumentState>) => void;
}) {
  const { client, doc, catId, patch } = props;
  const cat = client.catalog.categories.find((c) => c.id === catId)!;
  const items = displayItems(cat, doc.selection.item_order?.[catId]);
  const ids = items.map((i) => i.id);

  const commit = (next: string[]) => patch({ selection: setCategoryItemOrder(doc.selection, catId, next) });
  const drag = useDragReorder(ids, commit);

  const toggleItem = (itemId: string, on: boolean) => {
    const set = new Set(doc.selection.excluded_items);
    if (on) set.delete(itemId);
    else set.add(itemId);
    patch({ selection: { ...doc.selection, excluded_items: [...set] } });
  };
  const moveItem = (itemId: string, dir: -1 | 1) => {
    const i = ids.indexOf(itemId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };

  return (
    <div ref={drag.containerRef}>
      {items.map((i) => (
        <div
          key={i.id}
          className="sel-item"
          {...drag.rowProps(i.id)}
          style={{ display: "flex", alignItems: "center", gap: 4, opacity: drag.dragId === i.id ? 0.5 : 1, background: drag.overId === i.id && drag.dragId ? "var(--c-bg,#f0ece3)" : undefined }}
        >
          <span
            {...drag.handleProps(i.id)}
            title={t("reorder.drag")}
            style={{ cursor: "grab", touchAction: "none", userSelect: "none", color: "#9a938a" }}
          >⠿</span>
          <input
            type="checkbox"
            checked={!doc.selection.excluded_items.includes(i.id)}
            onChange={(e) => toggleItem(i.id, e.target.checked)}
          />
          <span style={{ flex: 1 }}>{i.name_fr}</span>
          {!i.photo && <span title={t("missing.photo_waiting")}>📷</span>}
          <span className="rowbtns">
            <button className="icon" title={t("common.up")} onClick={() => moveItem(i.id, -1)}>↑</button>
            <button className="icon" title={t("common.down")} onClick={() => moveItem(i.id, 1)}>↓</button>
          </span>
        </div>
      ))}
    </div>
  );
}

export function SelectionPanel(props: {
  client: ClientDTO;
  doc: DocumentState;
  patch: (p: Partial<DocumentState>) => void;
}) {
  const { client, doc, patch } = props;
  const allCatIds = client.catalog.categories.map((c) => c.id);
  const included =
    doc.selection.category_order.length === 0
      ? allCatIds
      : doc.selection.category_order.filter((id) => allCatIds.includes(id));
  const uncheckedCats = allCatIds.filter((id) => !included.includes(id));
  const nameOf = (id: string) => client.catalog.categories.find((c) => c.id === id)?.name_fr ?? id;

  const setOrder = (order: string[]) => patch({ selection: setCategoryOrder(doc.selection, order) });
  const drag = useDragReorder(included, setOrder);

  const toggleCat = (cid: string, on: boolean) =>
    setOrder(on ? [...included, cid] : included.filter((x) => x !== cid));
  const moveCat = (cid: string, dir: -1 | 1) => {
    const i = included.indexOf(cid);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= included.length) return;
    const next = [...included];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  };

  return (
    <div className="epanel">
      <h3>{t("editor.selection")}</h3>
      <div ref={drag.containerRef}>
        {included.map((cid) => (
          <div className="sel-cat" key={cid} {...drag.rowProps(cid)} style={{ opacity: drag.dragId === cid ? 0.5 : 1 }}>
            <div className="row" style={{ alignItems: "center", gap: 4 }}>
              <span
                {...drag.handleProps(cid)}
                title={t("reorder.drag")}
                style={{ cursor: "grab", touchAction: "none", userSelect: "none", color: "#9a938a" }}
              >⠿</span>
              <input type="checkbox" checked onChange={() => toggleCat(cid, false)} />
              <span style={{ flex: 1, fontWeight: 600 }}>{nameOf(cid)}</span>
              <span className="rowbtns">
                <button className="icon" title={t("common.up")} onClick={() => moveCat(cid, -1)}>↑</button>
                <button className="icon" title={t("common.down")} onClick={() => moveCat(cid, 1)}>↓</button>
              </span>
            </div>
            <ItemList client={client} doc={doc} catId={cid} patch={patch} />
          </div>
        ))}
      </div>
      {/* Dahil edilmemiş kategoriler — eklemek için */}
      {uncheckedCats.map((cid) => (
        <label className="sel-cat" key={cid} style={{ opacity: 0.6 }}>
          <input type="checkbox" checked={false} onChange={() => toggleCat(cid, true)} />
          <span style={{ flex: 1 }}>{nameOf(cid)}</span>
        </label>
      ))}
    </div>
  );
}
