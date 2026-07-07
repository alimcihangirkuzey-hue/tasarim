/* Sağ panel: seçili slotun tipine göre kontroller (CONSTITUTION §6.1).
   - Sabit slotlar: değer düzenleme = override (⛓ işaretli, tek tıkla geri bağlanır — M5)
   - item:* slotları: içerik KATALOGDA düzenlenir (M1) → tüm belgelere yansır;
     foto sığdırma/odak ise belge bazında override'dır. */

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ClientDTO, DocumentState, Item } from "@tezgah/shared";
import { resolveSlotValue, type TemplateEntry } from "@tezgah/templates";
import { api } from "../api";
import { t } from "../i18n";

interface Props {
  client: ClientDTO;
  doc: DocumentState;
  entry: TemplateEntry;
  patch: (p: Partial<DocumentState>) => void;
  select: (slot: string | null) => void;
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
      <div className="field">
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
            </div>
          ))}
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
        <div className="asset-pick" style={{ marginTop: 6 }}>
          {client.assets
            .filter((a) => a.kind !== "logo")
            .map((a) => (
              <img
                key={a.id}
                src={a.urls.thumb}
                className={item.photo === a.id ? "on" : ""}
                onClick={() => save.mutate({ photo: item.photo === a.id ? null : a.id })}
                alt=""
              />
            ))}
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
        <div className="asset-pick">
          {client.assets.map((a) => (
            <img
              key={a.id}
              src={a.urls.thumb}
              className={current === a.id ? "on" : ""}
              onClick={() =>
                patch(current === a.id ? clearOverride(doc, slot.id) : setOverride(doc, slot.id, a.id))
              }
              alt=""
            />
          ))}
        </div>
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
