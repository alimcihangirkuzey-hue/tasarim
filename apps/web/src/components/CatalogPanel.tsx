/* Katalog editörü — M1: içerik yalnız burada yaşar; belgeler binding ile giyer.
   Taslak + tek Kaydet (Ctrl+S): 14 ürünlük giriş ≤ 15 dk hedefi (kabul §7/1). */

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { newId, suggestPhotosForName, type Catalog, type Category, type ClientDTO, type Item } from "@tezgah/shared";
import { api } from "../api";
import { t } from "../i18n";
import { BulkPriceModal } from "./BulkPriceModal";

function moveIn<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

/** order alanlarını dizi sırasına eşitle (deterministik) */
function normalize(cat: Catalog): Catalog {
  return {
    ...cat,
    categories: cat.categories.map((c, ci) => ({
      ...c,
      order: ci + 1,
      items: c.items.map((it, ii) => ({ ...it, order: ii + 1 })),
    })),
  };
}

export function CatalogPanel({ client }: { client: ClientDTO }) {
  const qc = useQueryClient();
  const [cat, setCat] = useState<Catalog>(client.catalog);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    setCat(client.catalog);
    setDirty(false);
  }, [client.id]);

  const save = useMutation({
    mutationFn: () => api.updateClient(client.id, { catalog: normalize(cat) }),
    onSuccess: () => {
      setDirty(false);
      void qc.invalidateQueries({ queryKey: ["client", client.id] });
    },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty && !save.isPending) save.mutate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, save]);

  const edit = (fn: (c: Catalog) => Catalog) => {
    setCat((c) => fn(c));
    setDirty(true);
  };

  const editCat = (id: string, patch: Partial<Category>) =>
    edit((c) => ({
      ...c,
      categories: c.categories.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));

  const editItem = (catId: string, itemId: string, patch: Partial<Item>) =>
    editCat(catId, {
      items: cat.categories
        .find((x) => x.id === catId)!
        .items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
    });

  /* Foto yüklemesi anında asset olur (Faz 0 hattı), sonra taslağa bağlanır */
  const upload = useMutation({
    mutationFn: async (p: { catId: string; itemId: string; file: File }) => {
      const asset = await api.uploadAsset(client.id, p.file, "photo");
      return { ...p, asset };
    },
    onSuccess: ({ catId, itemId, asset }) => {
      editItem(catId, itemId, { photo: asset.id });
      void qc.invalidateQueries({ queryKey: ["client", client.id] });
    },
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingPhoto = useRef<{ catId: string; itemId: string } | null>(null);
  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && pendingPhoto.current) upload.mutate({ ...pendingPhoto.current, file: f });
    e.target.value = "";
  };

  const assetThumb = (id: string | null) =>
    id ? client.assets.find((a) => a.id === id)?.urls.thumb ?? null : null;

  const [showBulk, setShowBulk] = useState(false);

  return (
    <>
      <input ref={fileRef} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={onFile} />
      {showBulk && <BulkPriceModal client={client} onClose={() => setShowBulk(false)} />}

      <div className="row" style={{ marginTop: 14 }}>
        <button
          className="ghost"
          onClick={() =>
            edit((c) => ({
              ...c,
              categories: [
                ...c.categories,
                { id: newId("cat"), name_fr: "Nouvelle catégorie", order: c.categories.length + 1, items: [] },
              ],
            }))
          }
        >
          + {t("catalog.add_category")}
        </button>
        <button
          className="ghost"
          disabled={dirty}
          title={dirty ? t("bulk.save_first") : undefined}
          onClick={() => setShowBulk(true)}
        >
          {t("bulk.open")}
        </button>
        <span className="spacer" style={{ flex: 1 }} />
        {dirty && <span className="pill warn">{t("catalog.unsaved")}</span>}
        <button onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
          {t("catalog.save")}
        </button>
        {save.isSuccess && !dirty && <span className="muted">{t("catalog.saved")}</span>}
        {save.isError && <span className="error">{(save.error as Error).message}</span>}
      </div>

      {cat.categories.length === 0 && <p className="muted">{t("catalog.empty")}</p>}

      {cat.categories.map((c, ci) => (
        <div className="cat-block" key={c.id} style={{ marginTop: 12 }}>
          <div className="cat-head">
            <input
              type="text"
              value={c.name_fr}
              placeholder={t("catalog.category_name")}
              onChange={(e) => editCat(c.id, { name_fr: e.target.value })}
              style={{ fontWeight: 700 }}
            />
            <div className="rowbtns">
              <button className="icon" title={t("common.up")} onClick={() => edit((x) => ({ ...x, categories: moveIn(x.categories, ci, ci - 1) }))}>↑</button>
              <button className="icon" title={t("common.down")} onClick={() => edit((x) => ({ ...x, categories: moveIn(x.categories, ci, ci + 1) }))}>↓</button>
              <button
                className="icon"
                title={t("common.delete")}
                onClick={() => {
                  if (window.confirm(t("catalog.delete_category_confirm")))
                    edit((x) => ({ ...x, categories: x.categories.filter((y) => y.id !== c.id) }));
                }}
              >✕</button>
            </div>
          </div>
          <input
            type="text"
            value={c.note_fr ?? ""}
            placeholder={t("catalog.category_note")}
            onChange={(e) => editCat(c.id, { note_fr: e.target.value || undefined })}
            style={{ fontSize: 13 }}
          />

          {c.items.map((it, ii) => (
            <div className="item-row" key={it.id}>
              <button
                className="item-photo"
                title={t("editor.photo")}
                onClick={() => {
                  pendingPhoto.current = { catId: c.id, itemId: it.id };
                  fileRef.current?.click();
                }}
              >
                {assetThumb(it.photo) ? <img src={assetThumb(it.photo)!} alt="" /> : "📷"}
              </button>
              {/* FAZ4 §9: fotoğrafsız üründe etiket eşleşmesi → Öneri çipi (taslağa yazar) */}
              {!it.photo && (() => {
                const sugId = suggestPhotosForName(it.name_fr, client.assets)[0];
                const sug = sugId ? client.assets.find((a) => a.id === sugId) : undefined;
                return sug ? (
                  <button
                    className="ghost small"
                    type="button"
                    title={`${t("suggest.chip")}: ${sug.tags}`}
                    onClick={() => editItem(c.id, it.id, { photo: sug.id })}
                  >
                    <img src={sug.urls.thumb} alt="" style={{ width: 16, height: 16, objectFit: "cover", borderRadius: 3, verticalAlign: "-3px", marginRight: 3 }} />
                    {t("suggest.chip")}
                  </button>
                ) : null;
              })()}
              <input
                type="text"
                value={it.name_fr}
                placeholder={t("catalog.item_name")}
                onChange={(e) => editItem(c.id, it.id, { name_fr: e.target.value })}
              />
              <input
                type="text"
                value={it.desc_fr}
                placeholder={t("catalog.item_desc")}
                onChange={(e) => editItem(c.id, it.id, { desc_fr: e.target.value })}
              />
              <div className="price-rows">
                {it.prices.map((p, pi) => (
                  <div className="price-row" key={pi}>
                    <input
                      className="label"
                      type="text"
                      value={p.label}
                      placeholder={t("catalog.price_label")}
                      onChange={(e) =>
                        editItem(c.id, it.id, {
                          prices: it.prices.map((x, i) => (i === pi ? { ...x, label: e.target.value } : x)),
                        })
                      }
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={p.value}
                      onChange={(e) =>
                        editItem(c.id, it.id, {
                          prices: it.prices.map((x, i) =>
                            i === pi ? { ...x, value: Number(e.target.value) } : x
                          ),
                        })
                      }
                    />
                    <button
                      className="icon"
                      onClick={() =>
                        editItem(c.id, it.id, { prices: it.prices.filter((_, i) => i !== pi) })
                      }
                    >✕</button>
                  </div>
                ))}
                <button
                  className="icon"
                  onClick={() =>
                    editItem(c.id, it.id, {
                      prices: [...it.prices, { label: it.prices.length === 0 ? "seul" : "menu", value: 0 }],
                    })
                  }
                >
                  {t("catalog.add_price")}
                </button>
              </div>
              <label className="row" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                <input
                  type="checkbox"
                  checked={it.visible}
                  onChange={(e) => editItem(c.id, it.id, { visible: e.target.checked })}
                />
                {t("catalog.visible")}
              </label>
              <div className="rowbtns">
                <button className="icon" onClick={() => editCat(c.id, { items: moveIn(c.items, ii, ii - 1) })}>↑</button>
                <button className="icon" onClick={() => editCat(c.id, { items: moveIn(c.items, ii, ii + 1) })}>↓</button>
                <button
                  className="icon"
                  onClick={() => editCat(c.id, { items: c.items.filter((x) => x.id !== it.id) })}
                >✕</button>
              </div>
            </div>
          ))}

          <button
            className="ghost small"
            style={{ alignSelf: "flex-start" }}
            onClick={() =>
              editCat(c.id, {
                items: [
                  ...c.items,
                  {
                    id: newId("itm"),
                    name_fr: "Nouveau produit",
                    desc_fr: "",
                    photo: null,
                    prices: [{ label: "seul", value: 0 }],
                    tags: [],
                    visible: true,
                    order: c.items.length + 1,
                  },
                ],
              })
            }
          >
            + {t("catalog.add_item")}
          </button>
        </div>
      ))}
    </>
  );
}
