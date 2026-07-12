/* Sipariş Modu Adım 3 (CILA3): TEK ÇALIŞMA YÜZEYİ — "yukarıda seç, aşağıda
   ayarla" iki-bölge deseni KALKTI (kullanıcı UX kararı: aynı iş iki kez).
   Ürün satırı 3 durumlu akordeon:
   - SADE (üründe yok): "+ ad" + soluk varsayılan içerik önizlemesi (CILA1).
     Tık → ürün eklenir (deriveVariants + default çipler) ve satır YERİNDE açılır.
   - SEÇİLİ+AÇIK: ✓ + vurgu (paket kartı deseni); gövdede editör: varyant fiyat
     kutuları · çipler (× sil / yaz+Enter→öğren) · "içerik basılmasın" · Kaldır.
     Başlık tıkı → daraltır.
   - SEÇİLİ+KAPALI: ✓ işaretli, gövde gizli; soluk önizleme CANLI çip setini
     gösterir. Başlık tıkı → açar.
   Mükerrer ekleme YAPISAL imkânsız: ekleme yalnız SADE satır tıkında; ikinci
   bir ekleme yolu yok (CILA2-B2 flash/scroll bu yüzden öldü). Eşleme anahtarı
   name.tr + category_name.tr (CILA2 dedup anahtarının kendisi).
   Yetimler (paketi sonradan kapatılmış ürünler) sayfa altında aynı satır
   bileşeniyle listelenir — hiçbir ürün görünmez kalıp sessizce commit'e
   gidemez (M8; eski alt-bölge davranışıyla parite).

   HF2-B: operatör görünümü HER YERDE TR (pickDisplay) — name/category_name/
   category_note store'da HAM LocalizedName olarak saklanır, menu_language'e
   çözme İŞLEMİ YALNIZ commit anında (IntakeSummaryStep) yapılır. */

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { foldTr, type Question, type SectorPack } from "@tezgah/shared";
import { api } from "../api";
import { t, tf } from "../i18n";
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

type PackCategory = SectorPack["categories"][number];
type PackItem = PackCategory["items"][number];

/* CILA4: özel ürünün varyant desenini KATEGORİDEN devralır — kategorinin
   item'larının referansladığı variant sorularını sayar, EN SIK olanı seçer
   (Pizzalar → hepsi q_boy_pizza → Ø24/Ø32/Ø40). Eşitlikte ilk-görülen kazanır
   (Map insertion order + strict '>' — deterministik). Desen yoksa tek "seul". */
function deriveCategoryVariantPattern(cat: PackCategory, packQ: Question[]): IntakeProduct["variants"] {
  const byId = new Map(packQ.map((q) => [q.id, q]));
  const freq = new Map<string, number>();
  for (const item of cat.items)
    for (const qid of item.questions) {
      const q = byId.get(qid);
      if (q && q.affects === "variant" && q.options && q.options.length > 0)
        freq.set(qid, (freq.get(qid) ?? 0) + 1);
    }
  let bestId: string | null = null;
  let best = 0;
  for (const [qid, n] of freq) if (n > best) { best = n; bestId = qid; }
  const q = bestId ? byId.get(bestId) : undefined;
  if (q && q.options && q.options.length > 0) {
    return q.options.map((o) => ({ label: o.label_tr, value: null }));
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

  const library = ingredientsQ.data ?? [];

  /* Akordeon durumu — TEK satır açık (mobil); YEREL UI state, taslağa yazılmaz
     (taslaktan dönüşte hepsi kapalı gelir). */
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const toggle = (uid: string) => setExpandedUid(expandedUid === uid ? null : uid);

  const findProduct = (catTr: string, itemTr: string): IntakeProduct | undefined =>
    s.products.find((p) => p.category_name.tr === catTr && p.name.tr === itemTr);

  /* TEK ekleme yolu: sade satır tıkı. Satır zaten seçiliyse bu dal hiç render
     edilmez (ProductRow render edilir) → mükerrer yapısal imkânsız. */
  const addAndOpen = (pack: SectorPack, cat: PackCategory, item: PackItem) => {
    const uid = crypto.randomUUID();
    s.addProduct({
      uid,
      category_name: cat.name, // ham — display tr (pickDisplay), commit menu_language (pickML)
      category_note: cat.note,
      name: item.name, // ham — aynı desen
      variants: deriveVariants(item.questions, pack.questions),
      chips: item.default_chips.map((id) => chipById.get(id)).filter((c): c is IntakeChip => !!c),
      extras: [],
      hide_content: false,
    });
    setExpandedUid(uid);
  };

  /* CILA4: pakette OLMAYAN ürün — kategorinin içine özel ürün. Tek input (tr
     slotu; çıktı fallback'le her dilde basar). Mükerrer koruması: aynı kategoride
     foldTr eşleşmesi → yeni açılmaz, mevcut satır genişletilir. Boş/salt-boşluk
     reddedilir; 1..80 (LocalizedName tr:min(1) ile uyumlu, üst sınır UI). */
  const addCustom = (pack: SectorPack, cat: PackCategory, rawText: string) => {
    const text = rawText.trim();
    if (text === "" || text.length > 80) return;
    const fold = foldTr(text);
    /* Seed-çakışma yapısal güvencesi: yazılan ad kategorinin bir seed item'ıyla
       (foldTr — büyük/küçük harf duyarsız) çakışırsa özel ürün YARATMA; o seed'i
       seç/genişlet (mükerrer imkânsız, projeksiyon birebir aynı). */
    const seedItem = cat.items.find((i) => foldTr(i.name.tr) === fold);
    if (seedItem) {
      const existing = s.products.find(
        (p) => p.category_name.tr === cat.name.tr && p.name.tr === seedItem.name.tr
      );
      if (existing) setExpandedUid(existing.uid);
      else addAndOpen(pack, cat, seedItem);
      return;
    }
    /* Mevcut özel ürünle mükerrer → yeni açma, mevcut satırı genişlet. */
    const dup = s.products.find(
      (p) => p.category_name.tr === cat.name.tr && foldTr(p.name.tr) === fold
    );
    if (dup) {
      setExpandedUid(dup.uid);
      return;
    }
    const uid = crypto.randomUUID();
    s.addProduct({
      uid,
      category_name: cat.name,
      category_note: cat.note,
      name: { tr: text, fr: "", de: "" }, // tek input → tr; pickML fallback her dilde basar
      variants: deriveCategoryVariantPattern(cat, pack.questions),
      chips: [], // boş başlar (öğrenme yok, v1)
      extras: [],
      hide_content: false,
    });
    setExpandedUid(uid);
  };

  /* CILA4: orphan mantığı KATEGORİ-tabanı — bir ürün category_name.tr'si görünür
     bir kategoriye eşitse "in-category" (seed veya özel fark etmez). Böylece özel
     ürünler kategorisinde kalır; yalnız paketi kapatılmış kategoriler orphan olur.
     SEED-PARİTE: seed ürünü zaten görünür kategoriden eklendi → kategorisi görünür
     → matched (eski matchedUids seed-item eşleşmesiyle aynı sonuç); değişen tek
     davranış özel ürünün (seed adına uymayan) artık orphan'a düşmemesi. */
  const visibleCatTrs = useMemo(() => {
    const set = new Set<string>();
    for (const pack of selectedPacks) for (const cat of pack.categories) set.add(cat.name.tr);
    return set;
  }, [selectedPacks]);
  const orphans = s.products.filter((p) => !visibleCatTrs.has(p.category_name.tr));

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

      {/* Tek yüzey — seçili paketlerin kategorileri; satırlar yerinde genişler */}
      <div className="intake-list">
        {selectedPacks.map((pack) =>
          pack.categories.map((cat) => {
            const catName = pickDisplay(cat.name); // operatör HER ZAMAN TR (HF2-B)
            /* CILA4: bu kategorinin ÖZEL ürünleri (seed adına uymayan, aynı kategori) */
            const seedTrs = new Set(cat.items.map((i) => i.name.tr));
            const customInCat = s.products.filter(
              (p) => p.category_name.tr === cat.name.tr && !seedTrs.has(p.name.tr)
            );
            return (
              <details key={pack.id + catName} className="intake-catgroup">
                <summary>
                  <strong>{catName}</strong>
                  <span className="sub"> · {pack.label_tr}</span>
                </summary>
                <div className="intake-list" style={{ marginTop: 8 }}>
                  {cat.items.map((item) => {
                    const product = findProduct(cat.name.tr, item.name.tr);
                    if (product) {
                      /* Onay eşiği için varsayılan çip seti — ekleme anındaki
                         filtreyle birebir (yalnız kütüphanede çözülenler) */
                      const defaultChipIds = item.default_chips.filter((id) => chipById.has(id));
                      return (
                        <ProductRow
                          key={item.name.tr}
                          product={product}
                          defaultChipIds={defaultChipIds}
                          expanded={expandedUid === product.uid}
                          onToggle={() => toggle(product.uid)}
                          onRemoved={() => setExpandedUid(null)}
                          library={library}
                        />
                      );
                    }
                    /* CILA1/1: varsayılan içerik önizlemesi — TR, soluk küçük yazı */
                    const previewChips = item.default_chips
                      .map((id) => chipById.get(id))
                      .filter((c): c is IntakeChip => !!c)
                      .map((c) => pickDisplay(c));
                    return (
                      <button
                        key={item.name.tr}
                        className="intake-choice"
                        onClick={() => addAndOpen(pack, cat, item)}
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

                  {/* CILA4: kategorinin özel ürünleri (aynı ProductRow bileşeni) */}
                  {customInCat.map((p) => (
                    <ProductRow
                      key={`custom-${p.uid}`}
                      product={p}
                      defaultChipIds={[]} // özel ürün boş çiple başlar → çip eklenmişse Kaldır onaylı
                      expanded={expandedUid === p.uid}
                      onToggle={() => toggle(p.uid)}
                      onRemoved={() => setExpandedUid(null)}
                      library={library}
                    />
                  ))}

                  {/* CILA4: "+ özel ürün" — pakette olmayan, kategoriye özgü ürün */}
                  <CustomProductAdder onAdd={(text) => addCustom(pack, cat, text)} />
                </div>
              </details>
            );
          })
        )}
      </div>

      <p className="intake-hint">
        {s.products.length} {t("intake.products_selected")}
      </p>

      {/* Yetim ürünler — paketi kapatılmış ama üründe duran kalemler (M8) */}
      {orphans.length > 0 && (
        <>
          <p className="intake-hint">{t("intake.orphan_group")}</p>
          <div className="intake-list">
            {orphans.map((p) => (
              <ProductRow
                key={p.uid}
                product={p}
                defaultChipIds={[]}
                expanded={expandedUid === p.uid}
                onToggle={() => toggle(p.uid)}
                onRemoved={() => setExpandedUid(null)}
                library={library}
                showCategory
              />
            ))}
          </div>
        </>
      )}

      <NavBar canNext={s.products.length > 0} />
    </section>
  );
}

/* Seçili ürün satırı: ✓ başlık (tık → aç/kapa) + açıkken yerinde editör.
   Kapalıyken soluk önizleme CANLI çip setidir (sade satırın varsayılan
   önizlemesiyle görsel süreklilik). */
function ProductRow({
  product,
  defaultChipIds,
  expanded,
  onToggle,
  onRemoved,
  library,
  showCategory = false,
}: {
  product: IntakeProduct;
  /** Ekleme anındaki varsayılan çip id seti — Kaldır onay eşiği bununla kıyaslar */
  defaultChipIds: string[];
  expanded: boolean;
  onToggle: () => void;
  onRemoved: () => void;
  library: Array<{ id: string; tr: string; fr: string; de: string }>;
  /** Yetim grubunda kategori adı satırda gösterilir (grup başlığı yok) */
  showCategory?: boolean;
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

  /* ŞERH (mimar, BAŞLA): KULLANICI VERİSİ varsa Kaldır onay ister — en az bir
     fiyat girilmiş YA DA çip seti varsayılandan farklı (sahada yanlış dokunuş
     5 saniyelik emeği silmesin). Veri yoksa onaysız kaldırır. Yetimde
     defaultChipIds=[] → çipli yetim her zaman sorar (temkinli taraf). */
  const chipKey = (c: IntakeChip) => c.chip_id ?? `tr:${c.tr}`;
  const chipsDiffer =
    product.chips.length !== defaultChipIds.length ||
    product.chips.map(chipKey).sort().join("|") !== [...defaultChipIds].sort().join("|");
  const hasUserData = product.variants.some((v) => v.value !== null) || chipsDiffer;
  const handleRemove = () => {
    if (hasUserData && !window.confirm(tf("intake.remove_confirm", { name: pickDisplay(product.name) }))) {
      return;
    }
    s.removeProduct(product.uid);
    onRemoved();
  };

  return (
    <div className={`intake-prodrow${expanded ? " open" : ""}`}>
      <button className="intake-choice selected" onClick={onToggle}>
        <span className="check">✓</span>
        <span className="choice-main">
          <span>
            {pickDisplay(product.name)}
            {showCategory && <span className="sub">{pickDisplay(product.category_name)}</span>}
          </span>
          {!expanded && hasChips && (
            <span className="preview">{product.chips.map((c) => pickDisplay(c)).join(", ")}</span>
          )}
        </span>
      </button>

      {expanded && (
        <div className="intake-prodbody">
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

          <div className="rowend">
            <button className="intake-btn ghost" onClick={handleRemove}>
              {t("intake.remove")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* CILA4: "+ özel ürün" ekleyici — kategorinin sonunda. Ad yaz + Enter (ya da
   tablet için "+ Ekle" düğmesi, ≥44px). Boş/salt-boşluk gönderilmez; maxLength 80. */
function CustomProductAdder({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  const submit = () => {
    const v = text.trim();
    if (v === "") return;
    onAdd(v);
    setText(""); // dup ise addCustom mevcut satırı genişletti; her hâlde input temizlenir
  };
  return (
    <div className="intake-custom-add">
      <input
        value={text}
        placeholder={t("intake.custom_add_ph")}
        maxLength={80}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
      />
      <button className="intake-btn ghost" disabled={text.trim() === ""} onClick={submit}>
        + {t("intake.custom_add")}
      </button>
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
