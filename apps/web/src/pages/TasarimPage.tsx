/* BLOK TUVALİ — acemi tasarım builder'ın ilk görünen yüzeyi
   (journal 2026-08-07-blok-tuvali-ui, paket 2).

   NE YAPAR: A4 yatay / iki kırım / üç panelin GERÇEK mm geometrisini ekrana
   getirir; soldaki paletten blok tıklanarak ya da sürüklenerek panele bırakılır.
   Snap · çarpışmada aşağı itme · taşma uyarısı paket 1'in SAF çekirdeğinden
   (@tezgah/shared block-layout) gelir — bu dosyada yerleşim MATEMATİĞİ YOKTUR,
   yalnız çeviri (mm ↔ ekran) ve etkileşim vardır. Kural canvas.ts'in
   korkuluk felsefesiyle aynı: mutasyon tek kapıdan (placeBlock) geçer.

   TASARIM ÖLÇÜTÜ (ürün sahibi): grafik programı bilmeyen biri ekrana bakınca
   "soldan bunu tutup şu panele bırakacağım" mantığını HİÇBİR AÇIKLAMA
   OKUMADAN anlamalı. Bu yüzden: palet solda ve blok isimleri Türkçe/somut ·
   paneller adlarıyla etiketli (Ön kapak / Arka / İç 1) · kat çizgileri
   kesikli ve adlandırılmış · bırakılabilir alan sürükleme sırasında vurgulanır.

   BİLİNÇLİ DAR KAPSAM: bloklar İÇERİK taşımaz — ürün formu ve katalog bağı
   paket 3'tür. Buradaki blok bir YER TUTUCUDUR; ekranda tipini ve ölçüsünü
   gösterir. Kalıcılık da yok: durum sayfa yerelinde yaşar (sunucu evi ayrı
   karar — CD v1'e additive alan açmak ürün yönü netleşmeden yapılmaz). */

import { useCallback, useMemo, useRef, useState } from "react";
import {
  BLOCK_DEFAULT_SIZE_MM,
  LayoutDocSchema,
  collisionsIn,
  contentArea,
  foldLines,
  overflowingBlocks,
  panelsOf,
  placeBlock,
  type Block,
  type BlockKind,
  type LayoutDoc,
  type Panel,
} from "@tezgah/shared";
import { t } from "../i18n";

/* Ekran ölçeği: 1mm kaç piksel. A4 yatay 297mm → ~2.3 px/mm ≈ 683px, tipik
   dizüstü ekranında palet + tuval yan yana sığar. Zoom paket 4'ün işi. */
const PX_PER_MM = 2.3;
const mm = (v: number): number => v * PX_PER_MM;

/* Test ölçeği aynı sabitten okur — testte 2.3 yeniden yazılsaydı ölçek
   değiştiği gün testler sessizce başka bir şey ölçerdi. */
export const PX_PER_MM_TEST = PX_PER_MM;

/** Palet sırası — ürün sahibinin paket 2 listesi, o sırayla. */
const PALETTE: BlockKind[] = [
  "kategori_basligi",
  "urun_gridi",
  "fiyat_listesi",
  "hero_urun",
  "gorsel",
  "logo",
  "kampanya",
  "iletisim",
];

const BLOCK_LABEL: Record<BlockKind, string> = {
  kategori_basligi: "Kategori Başlığı",
  urun_karti: "Ürün Kartı",
  urun_gridi: "Ürün Grid'i",
  fiyat_listesi: "Fiyat Listesi",
  hero_urun: "Hero Ürün",
  gorsel: "Görsel",
  logo: "Logo",
  iletisim: "İletişim",
  kampanya: "Kampanya",
  qr: "QR",
  bilgi: "Bilgi",
  ayrac: "Ayraç",
};

/* Blok tipini bir bakışta ayırt eden şematik yüz. İÇERİK DEĞİL — ürün adı,
   fiyat, fotoğraf yok (paket 3). Amaç yalnız "bu bir grid, şu bir liste"
   ayrımının göz seviyesinde okunması. */
function BlockFace({ kind }: { kind: BlockKind }) {
  const cizgi = (w: string, koyu = false) => (
    <span style={{ display: "block", height: 3, width: w, borderRadius: 2, background: koyu ? "#8A8272" : "#C9C2B4" }} />
  );
  if (kind === "urun_gridi") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3, width: "100%" }}>
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} style={{ aspectRatio: "1", background: "#DCD6C8", borderRadius: 2 }} />
        ))}
      </div>
    );
  }
  if (kind === "fiyat_listesi") {
    return (
      <div style={{ display: "grid", gap: 4, width: "100%" }}>
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {cizgi("55%")}
            <span style={{ flex: 1, borderBottom: "1px dotted #C9C2B4" }} />
            {cizgi("14%", true)}
          </span>
        ))}
      </div>
    );
  }
  if (kind === "hero_urun") {
    return (
      <div style={{ display: "grid", gap: 4, width: "100%" }}>
        <span style={{ height: 34, background: "#DCD6C8", borderRadius: 3 }} />
        {cizgi("65%", true)}
        {cizgi("30%")}
      </div>
    );
  }
  if (kind === "gorsel") {
    return <span style={{ display: "block", height: 40, width: "100%", background: "#DCD6C8", borderRadius: 3 }} />;
  }
  if (kind === "logo") {
    return (
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 34, width: "100%", background: "#DCD6C8", borderRadius: 3, fontSize: 11, color: "#6B6459", letterSpacing: 1 }}>
        LOGO
      </span>
    );
  }
  if (kind === "kategori_basligi") {
    return (
      <div style={{ display: "grid", gap: 3, width: "100%" }}>
        {cizgi("58%", true)}
        <span style={{ display: "block", height: 1, width: "100%", background: "#C9C2B4" }} />
      </div>
    );
  }
  if (kind === "kampanya") {
    return (
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 30, width: "100%", background: "#F3E2C7", border: "1px solid #D9B877", borderRadius: 3, fontSize: 10, color: "#8A6A22" }}>
        %
      </span>
    );
  }
  /* iletisim + kalanlar: üç kısa satır */
  return (
    <div style={{ display: "grid", gap: 4, width: "100%" }}>
      {cizgi("70%")}
      {cizgi("50%")}
      {cizgi("60%")}
    </div>
  );
}

let sayac = 0;
const yeniId = (): string => `blk_${++sayac}`;

export function TasarimPage() {
  const [doc, setDoc] = useState<LayoutDoc>(() =>
    LayoutDocSchema.parse({ format: "a4", orientation: "yatay", fold: 2, fold_style: "roll" })
  );
  const [side, setSide] = useState<"dis" | "ic">("dis");
  const [secili, setSecili] = useState<string | null>(null);
  const [hedefPanel, setHedefPanel] = useState<string | null>(null);
  /** Son işlemin kullanıcıya dönük sonucu (snap/itme/taşma) — sessiz kalmaz */
  const [durum, setDurum] = useState<{ tur: "ok" | "uyari"; metin: string } | null>(null);

  const panels = useMemo(() => panelsOf(doc), [doc]);
  const yuzPanelleri = panels.filter((p) => p.side === side);
  const katlar = useMemo(
    () => foldLines({ format: doc.format, orientation: doc.orientation, fold: doc.fold, fold_style: doc.fold_style, side }),
    [doc.format, doc.orientation, doc.fold, doc.fold_style, side]
  );

  const tasanlar = useMemo(
    () => new Set(yuzPanelleri.flatMap((p) => overflowingBlocks(doc, p.id))),
    [doc, yuzPanelleri]
  );

  /* TEK MUTASYON KAPISI: her ekleme/taşıma buradan geçer. placeBlock saf
     çekirdektedir — bu bileşen sonucu yalnız uygular ve KULLANICIYA ANLATIR. */
  const yerlestir = useCallback(
    (kind: BlockKind, panel: Panel, istekX: number, istekY: number, tasinanId?: string) => {
      setDoc((d) => {
        const boyut = BLOCK_DEFAULT_SIZE_MM[kind];
        const mevcut = tasinanId ? d.blocks.find((b) => b.id === tasinanId) : undefined;
        const kutu = {
          x_mm: istekX,
          y_mm: istekY,
          w_mm: mevcut?.box.w_mm ?? boyut.w_mm,
          h_mm: mevcut?.box.h_mm ?? boyut.h_mm,
        };
        const r = placeBlock(d, panel, kutu, { ignoreBlockId: tasinanId });

        if (r.overflow) {
          setDurum({ tur: "uyari", metin: `${panel.label_tr}: ${t("tasarim.panel_doldu")}` });
        } else if (r.pushed) {
          setDurum({ tur: "ok", metin: t("tasarim.itildi") });
        } else if (r.snapped) {
          setDurum({ tur: "ok", metin: t("tasarim.hizalandi") });
        } else {
          setDurum(null);
        }

        if (tasinanId) {
          return {
            ...d,
            blocks: d.blocks.map((b) => (b.id === tasinanId ? { ...b, panel_id: panel.id, box: r.box } : b)),
          };
        }
        const yeni: Block = { id: yeniId(), kind, panel_id: panel.id, box: r.box, props: {} };
        setSecili(yeni.id);
        return { ...d, blocks: [...d.blocks, yeni] };
      });
    },
    []
  );

  /** Tıkla-ekle: paletten seçilen blok, AKTİF yüzün ilk panelinin üstüne düşer.
      Sürüklemeyi keşfetmemiş kullanıcı da ilerleyebilsin diye vardır. */
  const tiklaEkle = (kind: BlockKind) => {
    const panel = yuzPanelleri[0];
    if (panel) yerlestir(kind, panel, doc.safe_mm, doc.safe_mm);
  };

  const sil = (id: string) => {
    setDoc((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== id) }));
    setSecili((s) => (s === id ? null : s));
  };

  /* ── Sürükle-bırak ────────────────────────────────────────────────────
     HTML5 dataTransfer: palet öğesi "yeni:<kind>", tuvaldeki blok
     "tasi:<id>" taşır. Bırakma noktası panel-YEREL mm'ye çevrilir. */
  const surukleVeri = useRef<string>("");

  const birak = (e: React.DragEvent, panel: Panel) => {
    e.preventDefault();
    setHedefPanel(null);
    const veri = e.dataTransfer.getData("text/plain") || surukleVeri.current;
    if (!veri) return;
    const kutu = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - kutu.left) / PX_PER_MM;
    const y = (e.clientY - kutu.top) / PX_PER_MM;

    if (veri.startsWith("yeni:")) {
      yerlestir(veri.slice(5) as BlockKind, panel, x, y);
    } else if (veri.startsWith("tasi:")) {
      const id = veri.slice(5);
      const b = doc.blocks.find((x2) => x2.id === id);
      if (b) yerlestir(b.kind, panel, x, y, id);
    }
  };

  return (
    <div className="row" style={{ alignItems: "flex-start", gap: 16 }}>
      {/* ── PALET ─────────────────────────────────────────────────────── */}
      <aside className="epanel" style={{ width: 190, flex: "0 0 auto" }} aria-label={t("tasarim.palet")}>
        <h3>{t("tasarim.palet")}</h3>
        <p style={{ fontSize: 11, color: "var(--c-muted)", margin: "0 0 8px" }}>{t("tasarim.palet_ipucu")}</p>
        <div style={{ display: "grid", gap: 8 }}>
          {PALETTE.map((kind) => (
            <button
              key={kind}
              type="button"
              draggable
              onDragStart={(e) => {
                surukleVeri.current = `yeni:${kind}`;
                e.dataTransfer.setData("text/plain", `yeni:${kind}`);
                e.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => tiklaEkle(kind)}
              title={t("tasarim.blok_ipucu")}
              style={{
                display: "grid",
                gap: 6,
                padding: 8,
                cursor: "grab",
                background: "var(--c-surface,#fff)",
                border: "1px solid var(--c-line,#DDD6C8)",
                borderRadius: 8,
                textAlign: "left",
              }}
            >
              <BlockFace kind={kind} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>{BLOCK_LABEL[kind]}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* ── TUVAL ─────────────────────────────────────────────────────── */}
      <section style={{ flex: 1, minWidth: 0 }}>
        <div className="row" style={{ marginBottom: 8 }}>
          <b>{t("tasarim.baslik")}</b>
          <span className="pill">A4 yatay · {t("tasarim.iki_kirim")}</span>
          <span style={{ flex: 1 }} />
          {(["dis", "ic"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              aria-pressed={side === s}
              style={{
                padding: "4px 12px",
                borderRadius: 8,
                border: "1px solid var(--c-line,#DDD6C8)",
                background: side === s ? "var(--c-ink,#2B2822)" : "transparent",
                color: side === s ? "#fff" : "inherit",
                cursor: "pointer",
              }}
            >
              {s === "dis" ? t("tasarim.dis_yuz") : t("tasarim.ic_yuz")}
            </button>
          ))}
        </div>

        {durum && (
          <div
            className={durum.tur === "uyari" ? "pill warn" : "pill"}
            role="status"
            style={{ display: "inline-block", marginBottom: 8 }}
          >
            {durum.metin}
          </div>
        )}

        {/* Yaprak: bleed payı DIŞARIDA gösterilir — kesim sonrası gidecek alan
            görünür olmalı, kullanıcı "buraya koyduğum kesilir" diyebilmeli. */}
        <div
          data-testid="yaprak"
          style={{
            position: "relative",
            width: mm(297 + doc.bleed_mm * 2),
            height: mm(210 + doc.bleed_mm * 2),
            padding: mm(doc.bleed_mm),
            boxSizing: "border-box",
            background: "repeating-linear-gradient(45deg,#F2EDE3,#F2EDE3 4px,#E8E1D3 4px,#E8E1D3 8px)",
            borderRadius: 4,
          }}
          title={t("tasarim.bleed_ipucu")}
        >
          <div style={{ position: "relative", display: "flex", width: "100%", height: "100%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }}>
            {yuzPanelleri.map((panel) => {
              const alan = contentArea(panel, doc);
              const bloklar = doc.blocks.filter((b) => b.panel_id === panel.id);
              const hedef = hedefPanel === panel.id;
              return (
                <div
                  key={panel.id}
                  data-testid={`panel-${panel.id}`}
                  aria-label={panel.label_tr}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                    setHedefPanel(panel.id);
                  }}
                  onDragLeave={() => setHedefPanel((h) => (h === panel.id ? null : h))}
                  onDrop={(e) => birak(e, panel)}
                  style={{
                    position: "relative",
                    width: mm(panel.w_mm),
                    height: mm(panel.h_mm),
                    flex: "0 0 auto",
                    background: hedef ? "rgba(120,160,110,0.10)" : "transparent",
                    transition: "background 120ms",
                  }}
                >
                  {/* SAFE ALAN — içine metin girmemesi gereken sınır */}
                  <div
                    style={{
                      position: "absolute",
                      left: mm(alan.x_mm),
                      top: mm(alan.y_mm),
                      width: mm(alan.w_mm),
                      height: mm(alan.h_mm),
                      border: "1px dashed #9FC08F",
                      pointerEvents: "none",
                    }}
                  />
                  {/* Panel adı — kullanıcı panel sırası düşünmesin */}
                  <span
                    style={{
                      position: "absolute",
                      left: 4,
                      top: 3,
                      fontSize: 10,
                      letterSpacing: 0.4,
                      textTransform: "uppercase",
                      color: "#A79F90",
                      pointerEvents: "none",
                    }}
                  >
                    {panel.label_tr}
                  </span>

                  {bloklar.map((b) => {
                    const tasti = tasanlar.has(b.id);
                    return (
                      <div
                        key={b.id}
                        data-testid={`blok-${b.id}`}
                        draggable
                        onDragStart={(e) => {
                          surukleVeri.current = `tasi:${b.id}`;
                          e.dataTransfer.setData("text/plain", `tasi:${b.id}`);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onClick={() => setSecili(b.id)}
                        style={{
                          position: "absolute",
                          left: mm(b.box.x_mm),
                          top: mm(b.box.y_mm),
                          width: mm(b.box.w_mm),
                          height: mm(b.box.h_mm),
                          boxSizing: "border-box",
                          padding: 4,
                          cursor: "grab",
                          overflow: "hidden",
                          background: tasti ? "rgba(220,80,60,0.10)" : "rgba(255,255,255,0.92)",
                          border: tasti
                            ? "1.5px solid #DC5038"
                            : secili === b.id
                              ? "1.5px solid #2B2822"
                              : "1px solid #CFC7B7",
                          borderRadius: 3,
                        }}
                        title={BLOCK_LABEL[b.kind]}
                      >
                        <span style={{ fontSize: 9, color: "#6B6459", display: "block", marginBottom: 3 }}>
                          {BLOCK_LABEL[b.kind]}
                        </span>
                        <BlockFace kind={b.kind} />
                        {secili === b.id && (
                          <button
                            type="button"
                            aria-label={`${BLOCK_LABEL[b.kind]} ${t("tasarim.sil")}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              sil(b.id);
                            }}
                            style={{
                              position: "absolute",
                              right: 2,
                              top: 2,
                              width: 16,
                              height: 16,
                              lineHeight: "14px",
                              padding: 0,
                              borderRadius: 4,
                              border: "1px solid #CFC7B7",
                              background: "#fff",
                              cursor: "pointer",
                              fontSize: 11,
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* KAT ÇİZGİLERİ — panellerin ÜSTÜNDE, tıklamayı engellemeden */}
            {katlar.map((x) => (
              <div
                key={x}
                data-testid={`kat-${x}`}
                style={{
                  position: "absolute",
                  left: mm(x),
                  top: 0,
                  height: "100%",
                  borderLeft: "1px dashed #B9A96B",
                  pointerEvents: "none",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: -1,
                    left: 3,
                    fontSize: 9,
                    color: "#9C8C4E",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t("tasarim.kat")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Lejant — çizgilerin ne anlama geldiği yazılı, kullanıcı tahmin etmesin */}
        <div className="row" style={{ marginTop: 8, fontSize: 11, color: "var(--c-muted)" }}>
          <span>
            <b style={{ color: "#9C8C4E" }}>––</b> {t("tasarim.lejant_kat")}
          </span>
          <span>
            <b style={{ color: "#9FC08F" }}>––</b> {t("tasarim.lejant_safe")}
          </span>
          <span>
            <b style={{ color: "#B7AE9C" }}>▨</b> {t("tasarim.lejant_bleed")}
          </span>
          <span style={{ flex: 1 }} />
          <span>{doc.blocks.length} {t("tasarim.blok_sayisi")}</span>
        </div>

        {tasanlar.size > 0 && (
          <div className="pill warn" role="alert" style={{ display: "inline-block", marginTop: 8 }}>
            {tasanlar.size} {t("tasarim.tasan_blok")}
          </div>
        )}
        {yuzPanelleri.some((p) => collisionsIn(doc, p.id).length > 0) && (
          <div className="pill red" role="alert" style={{ display: "inline-block", marginTop: 8 }}>
            {t("tasarim.cakisma")}
          </div>
        )}
      </section>
    </div>
  );
}
