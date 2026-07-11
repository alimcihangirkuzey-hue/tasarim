/* Sipariş Modu Adım 3-4 (F7-C): seçili paketlerden ürün tıkla-seç (kategoriler yan
   yana) → ürün kartı: sorular → varyant fiyat girişleri (boş = fiyat-bekliyor) +
   çipler (default ÖN-SEÇİLİ, tek-tık sil, kütüphaneden ekle, yoksa yaz→öğren) +
   "içerik basılmasın" anahtarı.

   HF2-B: operatör görünümü HER YERDE TR (pickDisplay) — name/category_name/
   category_note store'da HAM LocalizedName olarak saklanır, menu_language'e
   çözme İŞLEMİ YALNIZ commit anında (IntakeSummaryStep) yapılır. */

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LocalizedName, Question, SectorPack } from "@tezgah/shared";
import { api } from "../api";
import { t } from "../i18n";
import { FetchError, NavBar, pickDisplay } from "./IntakeNav";
import { useIntake, type IntakeChip, type IntakeProduct } from "../store/intakeStore";

/* Ürünün varyantlarını sorulardan türet: ilk seçenekli (choice/portion) varyant
   sorusunun opsiyonları → varyant satırları; yoksa tek "seul". */
function deriveVariants(questionIds: string[], packQ: Question[]): IntakeProduct["variants"] {
  const byId = new Map(packQ.map((q) => [q.id, q]));
  for (const qid of questionIds) {
    const q = byId.get(qid);
    if (q && q.affects === "variant" && q.options && q.options.length > 0) {
      return q.options.map((o) => ({ label: o.label_tr, value: null }));
    }
  }
  return [{ label: "seul", value: null }];
}

export function IntakeProductsStep() {
  const s = useIntake();
  const sectorsQ = useQuery({ queryKey: ["sectors"], queryFn: api.sectors });
  const ingredientsQ = useQuery({ queryKey: ["ingredients"], queryFn: api.ingredients });

  const selectedPacks: SectorPack[] = useMemo(
    () => (sectorsQ.data ?? []).filter((p) => s.selectedPackIds.includes(p.id)),
    [sectorsQ.data, s.selectedPackIds]
  );

  const chipById = useMemo(() => {
    const m = new Map<string, IntakeChip>();
    for (const rc of ingredientsQ.data ?? []) m.set(rc.id, { chip_id: rc.id, tr: rc.tr, fr: rc.fr, de: rc.de });
    return m;
  }, [ingredientsQ.data]);

  /* CILA2/B2: mükerrer "+" — özette "Kebap ×3" kazası. Aynı ürün (ad+kategori,
     TR anahtarıyla) zaten ekliyse yeni satır AÇILMAZ; mevcut karta kaydırılır
     ve kart kısa süre vurgulanır (kart bu görünümün altında, aynı sayfada). */
  const [flashUid, setFlashUid] = useState<string | null>(null);
  const flashTimer = useRef<number | undefined>(undefined);
  const flashCard = (uid: string) => {
    window.clearTimeout(flashTimer.current);
    setFlashUid(uid);
    flashTimer.current = window.setTimeout(() => setFlashUid(null), 1500);
    document.getElementById(`intake-prod-${uid}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const addProduct = (
    pack: SectorPack,
    categoryName: LocalizedName,
    categoryNote: LocalizedName | undefined,
    item: SectorPack["categories"][number]["items"][number]
  ) => {
    const dup = s.products.find(
      (p) => p.name.tr === item.name.tr && p.category_name.tr === categoryName.tr
    );
    if (dup) {
      flashCard(dup.uid);
      return;
    }
    s.addProduct({
      uid: crypto.randomUUID(),
      category_name: categoryName, // ham — display tr (pickDisplay), commit menu_language (pickML)
      category_note: categoryNote,
      name: item.name, // ham — aynı desen
      question_ids: item.questions,
      variants: deriveVariants(item.questions, pack.questions),
      chips: item.default_chips.map((id) => chipById.get(id)).filter((c): c is IntakeChip => !!c),
      extras: [],
      hide_content: false,
    });
  };

  if (sectorsQ.isError || ingredientsQ.isError) {
    return (
      <section className="intake-step">
        <h2>{t("intake.step_products")}</h2>
        <FetchError
          onRetry={() => {
            if (sectorsQ.isError) void sectorsQ.refetch();
            if (ingredientsQ.isError) void ingredientsQ.refetch();
          }}
        />
      </section>
    );
  }

  return (
    <section className="intake-step">
      <h2>{t("intake.step_products")}</h2>

      {/* Ürün seçici — seçili paketlerin kategorileri yan yana */}
      <div className="intake-list">
        {selectedPacks.map((pack) =>
          pack.categories.map((cat) => {
            const catName = pickDisplay(cat.name); // operatör HER ZAMAN TR (HF2-B)
            return (
              <details key={pack.id + catName} className="intake-catgroup">
                <summary>
                  <strong>{catName}</strong>
                  <span className="sub"> · {pack.label_tr}</span>
                </summary>
                <div className="intake-list" style={{ marginTop: 8 }}>
                  {cat.items.map((item) => {
                    /* CILA1/1: varsayılan içerik önizlemesi — TR, soluk küçük yazı.
                       chipById ZATEN /api/ingredients'ten çözülmüş; boşsa satır sade kalır. */
                    const previewChips = item.default_chips
                      .map((id) => chipById.get(id))
                      .filter((c): c is IntakeChip => !!c)
                      .map((c) => pickDisplay(c));
                    return (
                      <button
                        key={item.name.tr}
                        className="intake-choice"
                        onClick={() => addProduct(pack, cat.name, cat.note, item)}
                      >
                        <span className="choice-main">
                          <span>+ {pickDisplay(item.name)}</span>
                          {previewChips.length > 0 && (
                            <span className="preview">{previewChips.join(", ")}</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </details>
            );
          })
        )}
      </div>

      <p className="intake-hint">
        {s.products.length} {t("intake.products_selected")}
      </p>

      {/* Eklenen ürünler */}
      {s.products.map((p) => (
        <ProductCard key={p.uid} product={p} flash={p.uid === flashUid} library={ingredientsQ.data ?? []} />
      ))}

      <NavBar canNext={s.products.length > 0} />
    </section>
  );
}

function ProductCard({
  product,
  flash,
  library,
}: {
  product: IntakeProduct;
  /** CILA2/B2: mükerrer "+" bu karta yönlendirdi — kısa vurgu animasyonu */
  flash: boolean;
  library: Array<{ id: string; tr: string; fr: string; de: string }>;
}) {
  const s = useIntake();
  const hasChips = product.chips.length > 0;

  const setVariantPrice = (i: number, raw: string) => {
    const value = raw.trim() === "" ? null : Number(raw.replace(",", "."));
    s.updateProduct(product.uid, {
      variants: product.variants.map((v, j) => (j === i ? { ...v, value: Number.isFinite(value as number) ? value : null } : v)),
    });
  };

  const removeChip = (idx: number) =>
    s.updateProduct(product.uid, { chips: product.chips.filter((_, j) => j !== idx) });

  const addChip = (chip: IntakeChip) => {
    if (product.chips.some((c) => c.chip_id === chip.chip_id && c.tr === chip.tr)) return;
    s.updateProduct(product.uid, { chips: [...product.chips, chip] });
  };

  return (
    <div id={`intake-prod-${product.uid}`} className={`intake-product${flash ? " flash" : ""}`}>
      <div className="head">
        <span>
          <strong>{pickDisplay(product.name)}</strong>
          <span className="cat"> · {pickDisplay(product.category_name)}</span>
        </span>
        <button className="intake-btn ghost" style={{ minHeight: 32, padding: "4px 10px" }} onClick={() => s.removeProduct(product.uid)}>
          {t("intake.remove")}
        </button>
      </div>

      {/* Varyant fiyatları (boş = fiyat-bekliyor) */}
      <div className="intake-variants">
        {product.variants.map((v, i) => (
          <label key={i} className="intake-variant">
            {v.label}
            <input
              inputMode="decimal"
              value={v.value ?? ""}
              placeholder={t("intake.price_ph")}
              onChange={(e) => setVariantPrice(i, e.target.value)}
            />
          </label>
        ))}
      </div>

      {/* Çipler — HER ZAMAN TR (HF2-B) */}
      <div className="intake-chips">
        {product.chips.map((c, i) => (
          <span key={i} className={`intake-chip ${c.chip_id ? "" : "learning"}`}>
            {pickDisplay(c)}
            <button title={t("intake.remove")} onClick={() => removeChip(i)}>
              ×
            </button>
          </span>
        ))}
      </div>
      <ChipAdder onAdd={addChip} library={library} existing={product.chips} />

      {/* İçerik anahtarı — çipli her üründe yerleşik */}
      {hasChips && (
        <label className="intake-toggle">
          <input
            type="checkbox"
            checked={product.hide_content}
            onChange={(e) => s.updateProduct(product.uid, { hide_content: e.target.checked })}
          />
          {t("intake.hide_content")}
        </label>
      )}
    </div>
  );
}

/* Çip ekleyici: kütüphaneden ara/ekle; eşleşme yoksa yaz → öğren (POST). */
function ChipAdder({
  onAdd,
  library,
  existing,
}: {
  onAdd: (c: IntakeChip) => void;
  library: Array<{ id: string; tr: string; fr: string; de: string }>;
  existing: IntakeChip[];
}) {
  const [q, setQ] = useState("");
  const qc = useQueryClient();
  const learn = useMutation({
    mutationFn: (tr: string) => api.createIngredient({ tr }),
    onSuccess: (res) => {
      onAdd({ chip_id: res.chip.id, tr: res.chip.tr, fr: res.chip.fr, de: res.chip.de });
      setQ("");
      void qc.invalidateQueries({ queryKey: ["ingredients"] });
    },
  });

  const norm = (x: string) => x.trim().toLocaleLowerCase("tr-TR");
  const matches = q.trim()
    ? library.filter((c) => norm(c.tr).includes(norm(q)) || norm(c.fr).includes(norm(q))).slice(0, 6)
    : [];
  const exact = library.find((c) => norm(c.tr) === norm(q));
  const inProduct = (id: string) => existing.some((e) => e.chip_id === id);

  return (
    <div className="intake-chips" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
      <input
        value={q}
        placeholder={t("intake.chip_add_ph")}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && q.trim() && !learn.isPending) learn.mutate(q.trim());
        }}
      />
      {matches.length > 0 && (
        <div className="intake-chips">
          {matches.map((c) => (
            <button
              key={c.id}
              className="intake-chip"
              disabled={inProduct(c.id)}
              onClick={() => {
                onAdd({ chip_id: c.id, tr: c.tr, fr: c.fr, de: c.de });
                setQ("");
              }}
            >
              + {pickDisplay(c)}
            </button>
          ))}
        </div>
      )}
      {q.trim() && !exact && (
        <button className="intake-chip learning" disabled={learn.isPending} onClick={() => learn.mutate(q.trim())}>
          {learn.isPending ? "…" : `+ "${q.trim()}" ${t("intake.chip_learning")}`}
        </button>
      )}
    </div>
  );
}
