/* Sağ panel: seçili slotun tipine göre kontroller (CONSTITUTION §6.1).
   - Sabit slotlar: değer düzenleme = override (⛓ işaretli, tek tıkla geri bağlanır — M5)
   - item:* slotları: içerik KATALOGDA düzenlenir (M1) → tüm belgelere yansır;
     foto sığdırma/odak ise belge bazında override'dır. */

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { swapSelectionItem, type ClientDTO, type DocumentState, type Item } from "@tezgah/shared";
import {
  kabulEdilenTurler,
  resolveSelection,
  resolveSlotValue,
  type TemplateEntry,
} from "@tezgah/templates";
import { api } from "../api";
import { t, tf } from "../i18n";
import { AssetPicker } from "./AssetPicker";

interface Props {
  client: ClientDTO;
  doc: DocumentState;
  entry: TemplateEntry;
  patch: (p: Partial<DocumentState>) => void;
  select: (slot: string | null) => void;
  showToast?: (m: string) => void;
}

/* FAZ5 §5: aynı kategoride ürün takası seçicisi (arama + tıkla) */
function SwapPicker(props: {
  client: ClientDTO;
  doc: DocumentState;
  item: Item;
  catId: string;
  patch: (p: Partial<DocumentState>) => void;
  select: (slot: string | null) => void;
  showToast?: (m: string) => void;
}) {
  const { client, doc, item, catId, patch, select, showToast } = props;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const cat = client.catalog.categories.find((c) => c.id === catId);
  const candidates = useMemo(() => {
    const fold = (s: string) => s.toLocaleLowerCase("tr-TR");
    return (cat?.items ?? []).filter(
      (it) => it.id !== item.id && it.visible && (!q || fold(it.name_fr).includes(fold(q)))
    );
  }, [cat, item.id, q]);

  const doSwap = (newItem: Item) => {
    /* kategorinin şu anki gösterim sırası (resolveSelection) → sıra korunur */
    const resolved = resolveSelection(client.catalog, doc.selection).find((s) => s.category.id === catId);
    const orderedIds = (resolved?.items ?? []).map((i) => i.id);
    const nextSel = swapSelectionItem(doc.selection, catId, item.id, newItem.id, orderedIds);
    patch({ selection: nextSel });
    showToast?.(tf("swap.done", { from: item.name_fr, to: newItem.name_fr }));
    select(`item:${newItem.id}`);
  };

  if (!open) {
    return (
      <button className="ghost small" style={{ marginTop: 6 }} onClick={() => setOpen(true)}>
        ⇄ {t("swap.open")}
      </button>
    );
  }
  return (
    <div className="epanel" style={{ marginTop: 6 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <strong style={{ fontSize: 13 }}>{t("swap.title")}</strong>
        <button className="icon" onClick={() => setOpen(false)}>✕</button>
      </div>
      <input
        type="text"
        autoFocus
        placeholder={t("swap.search")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ width: "100%", marginTop: 4 }}
      />
      <div style={{ maxHeight: 220, overflow: "auto", marginTop: 4 }}>
        {candidates.length === 0 && <p className="muted" style={{ fontSize: 12 }}>{t("swap.empty")}</p>}
        {candidates.map((it) => (
          <button
            key={it.id}
            className="ghost small"
            style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 2 }}
            onClick={() => doSwap(it)}
          >
            {it.name_fr}
          </button>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>{t("swap.hint")}</p>
    </div>
  );
}

function setOverride(doc: DocumentState, key: string, value: unknown): Partial<DocumentState> {
  return { overrides: { ...doc.overrides, [key]: { value, detached: true } } };
}
function clearOverride(doc: DocumentState, key: string): Partial<DocumentState> {
  const next = { ...doc.overrides };
  delete next[key];
  return { overrides: next };
}

/* ---- katalog ürünü hızlı düzenleme (debounce'lu kayıt) ---- */
function ItemQuickEdit(props: Props & { item: Item; catId: string }) {
  const { client, doc, item, catId, patch, select } = props;
  const qc = useQueryClient();
  const [name, setName] = useState(item.name_fr);
  const [desc, setDesc] = useState(item.desc_fr);
  const [prices, setPrices] = useState(item.prices);
  useEffect(() => {
    setName(item.name_fr);
    setDesc(item.desc_fr);
    setPrices(item.prices);
  }, [item.id]);

  const save = useMutation({
    mutationFn: (patchItem: Partial<Item>) => {
      const catalog = {
        ...client.catalog,
        categories: client.catalog.categories.map((c) =>
          c.id !== catId
            ? c
            : { ...c, items: c.items.map((it) => (it.id === item.id ? { ...it, ...patchItem } : it)) }
        ),
      };
      return api.updateClient(client.id, { catalog });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["client", client.id] }),
  });

  const timer = useRef<number | null>(null);
  const debounced = (p: Partial<Item>) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => save.mutate(p), 700);
  };

  const upload = useMutation({
    mutationFn: (file: File) => api.uploadAsset(client.id, file, "photo"),
    onSuccess: (asset) => save.mutate({ photo: asset.id }),
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) upload.mutate(f);
    e.target.value = "";
  };

  /* foto sığdırma override'ı */
  const ovKey = `item:${item.id}:photo`;
  const ov = (doc.overrides[ovKey]?.value ?? {}) as { fit?: string; fx?: number; fy?: number };
  const isCover = ov.fit === "cover";

  const excluded = doc.selection.excluded_items.includes(item.id);

  return (
    <div className="epanel">
      <h3>{t("editor.item_edit")}</h3>
      {/* FAZ5 §5: ürünü değiştir (aynı kategori) — slot detayının üstünde */}
      <SwapPicker
        client={client}
        doc={doc}
        item={item}
        catId={catId}
        patch={patch}
        select={select}
        showToast={props.showToast}
      />
      <div className="field" style={{ marginTop: 8 }}>
        {t("catalog.item_name")}
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            debounced({ name_fr: e.target.value });
          }}
        />
      </div>
      <div className="field" style={{ marginTop: 6 }}>
        {t("catalog.item_desc")}
        <input
          type="text"
          value={desc}
          onChange={(e) => {
            setDesc(e.target.value);
            debounced({ desc_fr: e.target.value });
          }}
        />
      </div>

      <div className="field" style={{ marginTop: 6 }}>
        {t("catalog.price_value")}
        {/* VARYANT EKLE/SİL (journal 2026-07-28-coklu-fiyat-girisi): aynı işlem
            iki panelde FARKLI yetenekteydi — CatalogPanel Faz 1'den beri varyant
            ekleyip silebiliyor, buradaki hızlı düzenleme yalnız mevcutları
            değiştirebiliyordu; operatör editörden çıkıp katalog paneline gitmek
            zorundaydı. Davranış CatalogPanel:239-284 ile BİREBİR tutarlı:
            etiket önerisi ilk varyantta "seul" sonrakilerde "menu" (aynı
            sezgisel), silme satır başına ✕, kayıt mevcut 700ms debounce'tan. */}
        <div className="price-rows">
          {prices.map((p, i) => (
            <div className="price-row" key={i}>
              <input
                className="label"
                type="text"
                value={p.label}
                onChange={(e) => {
                  const next = prices.map((x, j) => (j === i ? { ...x, label: e.target.value } : x));
                  setPrices(next);
                  debounced({ prices: next });
                }}
              />
              <input
                type="number"
                step="0.1"
                value={p.value}
                onChange={(e) => {
                  const next = prices.map((x, j) => (j === i ? { ...x, value: Number(e.target.value) } : x));
                  setPrices(next);
                  debounced({ prices: next });
                }}
              />
              {/* BİRİM (journal 2026-07-28-birim-alani): CatalogPanel fiyat
                  satırıyla BİREBİR aynı alan — yapısal birim ("/kg" →
                  "24,00 €/kg"); kayıt mevcut 700ms debounce'tan. */}
              <input
                className="label"
                type="text"
                value={p.birim}
                placeholder={t("catalog.birim_placeholder")}
                style={{ width: 52 }}
                onChange={(e) => {
                  const next = prices.map((x, j) => (j === i ? { ...x, birim: e.target.value } : x));
                  setPrices(next);
                  debounced({ prices: next });
                }}
              />
              <button
                className="icon"
                title={t("catalog.remove_price")}
                onClick={() => {
                  const next = prices.filter((_, j) => j !== i);
                  setPrices(next);
                  debounced({ prices: next });
                }}
              >✕</button>
            </div>
          ))}
          <button
            className="icon"
            onClick={() => {
              /* birim: "" — yeni varyant birimsiz doğar (şema varsayılanıyla aynı) */
              const next = [...prices, { label: prices.length === 0 ? "seul" : "menu", value: 0, birim: "" }];
              setPrices(next);
              debounced({ prices: next });
            }}
          >
            {t("catalog.add_price")}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <h3>{t("editor.photo")}</h3>
        <div className="row">
          <button className="ghost small" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? t("common.uploading") : t("editor.photo_upload")}
          </button>
          <input ref={fileRef} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={onFile} />
        </div>
        <div style={{ marginTop: 6 }}>
          {/* Ürün fotoğrafı = repeater `item.photo` rolü. Eski `excludeLogos`
              çentiği ile DAVRANIŞ BİREBİR: logo hariç ≡ photo+other (AssetKind
              üçlüdür), ama artık dışlama değil KABUL ekseninde söyleniyor —
              yeni bir tür eklenirse sessizce sızmaz, açıkça karar ister. */}
          <AssetPicker
            client={client}
            value={item.photo}
            onPick={(id) => save.mutate({ photo: id })}
            kabul={["photo", "other"]}
          />
        </div>

        <div className="field" style={{ marginTop: 8 }}>
          {t("editor.fit")}
          <div className="row">
            <select
              value={isCover ? "cover" : "contain"}
              onChange={(e) =>
                patch(
                  e.target.value === "cover"
                    ? setOverride(doc, ovKey, { fit: "cover", fx: ov.fx ?? 0.5, fy: ov.fy ?? 0.5 })
                    : clearOverride(doc, ovKey)
                )
              }
            >
              <option value="contain">{t("editor.fit_contain")}</option>
              <option value="cover">{t("editor.fit_cover")}</option>
            </select>
            {isCover && <span className="pill warn">{t("editor.detached")}</span>}
          </div>
        </div>
        {isCover && (
          <div className="field" style={{ marginTop: 6 }}>
            {t("editor.focal")}
            <div className="row">
              X
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={ov.fx ?? 0.5}
                onChange={(e) => patch(setOverride(doc, ovKey, { ...ov, fit: "cover", fx: Number(e.target.value) }))}
              />
              Y
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={ov.fy ?? 0.5}
                onChange={(e) => patch(setOverride(doc, ovKey, { ...ov, fit: "cover", fy: Number(e.target.value) }))}
              />
            </div>
          </div>
        )}
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <label className="row" style={{ fontSize: 13 }}>
          <input
            type="checkbox"
            checked={excluded}
            onChange={(e) => {
              const set = new Set(doc.selection.excluded_items);
              if (e.target.checked) set.add(item.id);
              else set.delete(item.id);
              patch({ selection: { ...doc.selection, excluded_items: [...set] } });
              if (e.target.checked) select(null);
            }}
          />
          {t("editor.item_exclude")}
        </label>
      </div>
      {save.isError && <p className="error">{(save.error as Error).message}</p>}
    </div>
  );
}

export function SlotPanel(props: Props & { selectedSlot: string | null }) {
  const { client, doc, entry, patch, selectedSlot } = props;

  if (!selectedSlot) return <p className="muted">{t("editor.no_slot")}</p>;

  /* garment alan slotları: area:{id}:logo|line1|line2 */
  if (selectedSlot.startsWith("area:")) {
    const [, areaId, part] = selectedSlot.split(":");
    if (part === "logo") {
      const key = `area:${areaId}:logo`;
      const cur = (doc.overrides[key]?.value as string) ?? "";
      return (
        <div className="epanel">
          <h3>{t("editor.slot")}: {selectedSlot}</h3>
          <label className="field">
            {t("editor.garment_logo_variant")}
            <select
              value={cur || "auto"}
              onChange={(e) =>
                patch(
                  e.target.value === "auto"
                    ? clearOverride(doc, key)
                    : setOverride(doc, key, e.target.value)
                )
              }
            >
              <option value="auto">{t("editor.garment_auto")}</option>
              <option value="primary">logo (renkli)</option>
              <option value="mono">logo mono</option>
            </select>
          </label>
        </div>
      );
    }
    const key = `area:${areaId}:${part}`;
    const cur = (doc.overrides[key]?.value ?? {}) as { source?: string; text?: string };
    const source = cur.source ?? (part === "line1" ? "phone" : "none");
    return (
      <div className="epanel">
        <h3>{t("editor.slot")}: {selectedSlot}</h3>
        <label className="field">
          {t("editor.garment_line_source")}
          <select
            value={source}
            onChange={(e) => patch(setOverride(doc, key, { ...cur, source: e.target.value }))}
          >
            {["none", "phone", "address", "instagram", "custom"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        {source === "custom" && (
          <input
            type="text"
            value={cur.text ?? ""}
            onChange={(e) => patch(setOverride(doc, key, { source: "custom", text: e.target.value }))}
            placeholder={t("editor.value")}
          />
        )}
      </div>
    );
  }

  /* item slotu */
  if (selectedSlot.startsWith("item:")) {
    const itemId = selectedSlot.split(":")[1];
    for (const c of client.catalog.categories) {
      const item = c.items.find((i) => i.id === itemId);
      if (item) return <ItemQuickEdit {...props} item={item} catId={c.id} />;
    }
    return <p className="muted">{t("editor.no_slot")}</p>;
  }

  /* sabit slot */
  const slot = entry.manifest.slots.find((s) => s.id === selectedSlot);
  if (!slot) return <p className="muted">{t("editor.no_slot")}</p>;

  const scope = { brand: client.brandkit, catalog: client.catalog };
  const { value, detached } = resolveSlotValue(slot, doc.overrides, scope);

  const reattach = (
    <button className="ghost small" onClick={() => patch(clearOverride(doc, slot.id))}>
      {t("editor.reattach")}
    </button>
  );

  if (slot.kind === "text") {
    return (
      <div className="epanel">
        <h3>
          {t("editor.slot")}: {slot.id}
        </h3>
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => patch(setOverride(doc, slot.id, e.target.value))}
          style={{ minHeight: 70 }}
        />
        {detached && (
          <div className="row" style={{ marginTop: 6 }}>
            <span className="pill warn">{t("editor.detached")}</span>
            {reattach}
          </div>
        )}
      </div>
    );
  }

  if (slot.kind === "badge") {
    const on = value === true;
    return (
      <div className="epanel">
        <h3>
          {t("editor.slot")}: {slot.id}
        </h3>
        <label className="row" style={{ fontSize: 14 }}>
          <input type="checkbox" checked={on} onChange={(e) => patch(setOverride(doc, slot.id, e.target.checked))} />
          {on ? t("editor.on") : t("editor.off")}
        </label>
        {detached && (
          <div className="row" style={{ marginTop: 6 }}>
            <span className="pill warn">{t("editor.detached")}</span>
            {reattach}
          </div>
        )}
      </div>
    );
  }

  if (slot.kind === "image") {
    const current = typeof value === "string" ? value : null;
    return (
      <div className="epanel">
        <h3>
          {t("editor.slot")}: {slot.id}
        </h3>
        {/* Rol filtresi İLANDAN okunur (7.2/502) — burada elle küme YAZILMAZ:
            slot.bind brand.logo_* ise ["logo"], item.photo ise ["photo","other"],
            bind'siz slot kendi `kabul` ilanına düşer, tanınmayan bağ kısıtsız
            kalır. Bu dal düne kadar FİLTRESİZDİ (17 sabit image slotu): logo
            slotuna yemek fotoğrafı bağlanabiliyordu ve sonuç TAMAMEN SESSİZDİ. */}
        <AssetPicker
          client={client}
          value={current}
          kabul={kabulEdilenTurler(slot)}
          onPick={(id) =>
            patch(id === null ? clearOverride(doc, slot.id) : setOverride(doc, slot.id, id))
          }
        />
        {detached && (
          <div className="row" style={{ marginTop: 6 }}>
            <span className="pill warn">{t("editor.detached")}</span>
            {reattach}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="epanel">
      <h3>
        {t("editor.slot")}: {slot.id}
      </h3>
      <p className="muted">{slot.kind}</p>
    </div>
  );
}
