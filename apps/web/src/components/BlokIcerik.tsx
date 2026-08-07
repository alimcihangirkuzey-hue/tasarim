/* BLOK İÇERİK ÇİZİMİ — paket 3 (journal 2026-08-07-icerik-bloklari-urun-ekle).

   KRİTİK BAĞ: bu dosya @tezgah/shared TYPO_MM sabitleriyle çizer ve kaç
   kalemin görüneceğini icerikKapasitesi'ne SORAR. Kendi satır yüksekliğini
   uydursaydı, çekirdeğin "bu blokta 10 ürün görünür" hesabı ile ekrandaki
   gerçek ayrışırdı ve "metin bloktan taşmaz" vaadi sessizce yalan olurdu.
   Yani kapasite matematiği ile çizim TEK KAYNAKTAN beslenir.

   Yatay eksende ikinci korkuluk: uzun ürün adı satırı genişletemez —
   nowrap + ellipsis. Dikey taşmayı kapasite, yatay taşmayı bu keser. */

import {
  GridIcerikSchema,
  GorselIcerikSchema,
  HeroIcerikSchema,
  IletisimIcerikSchema,
  KampanyaIcerikSchema,
  KategoriIcerikSchema,
  TYPO_MM,
  UrunListesiIcerikSchema,
  blokOlcegi,
  gridKartOlcusu,
  icerikKapasitesi,
  type Block,
  type MenuItem,
} from "@tezgah/shared";

/** Fotoğraf yoksa gösterilen nötr zemin — "burada fotoğraf olacak" der. */
function FotoYeri({ url, h, yuvarlak }: { url: string | null; h: number; yuvarlak?: boolean }) {
  return (
    <span
      style={{
        display: "block",
        height: h,
        width: "100%",
        borderRadius: yuvarlak ? 3 : 2,
        background: url ? `center/cover no-repeat url(${JSON.stringify(url)})` : "#DCD6C8",
      }}
    />
  );
}

/** BOŞ DURUM: içeriği olmayan blok bomboş bir dikdörtgen görünürdü ve acemi
    kullanıcı "şimdi ne yapacağım" diye kalırdı. Sağdaki denetçiye yönlendirir. */
function BosIpucu({ metin, px }: { metin: string; px: number }) {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        fontSize: px,
        color: "#A79F90",
        textAlign: "center",
        padding: px,
        boxSizing: "border-box",
      }}
    >
      {metin}
    </span>
  );
}

/** Tek satırda kalmaya ZORLANMIŞ metin — blok genişliğini asla aşmaz. */
function Satir({
  children,
  px,
  kalin,
  renk,
  hiza,
}: {
  children: React.ReactNode;
  px: number;
  kalin?: boolean;
  renk?: string;
  hiza?: "right";
}) {
  return (
    <span
      style={{
        display: "block",
        fontSize: px,
        lineHeight: 1.15,
        fontWeight: kalin ? 700 : 400,
        color: renk ?? "#2B2822",
        textAlign: hiza,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {children}
    </span>
  );
}

export interface BlokIcerikProps {
  blok: Block;
  /** mm → px çevirici (tuvalin ölçeği) */
  mm: (v: number) => number;
}

export function BlokIcerik({ blok, mm }: BlokIcerikProps) {
  const p = blok.props;
  const pad = mm(TYPO_MM.pad);
  /* Otomatik yerleşimin yazdığı tipografi ölçeği — kapasite hesabı da aynı
     sayıyı okur (blokOlcegi). Çizim burada ayrışırsa "sıkıştırdım" iddiası
     ekranda karşılıksız kalır. */
  const olc = blokOlcegi(p);

  if (blok.kind === "kategori_basligi") {
    const c = KategoriIcerikSchema.parse(p);
    /* Alt başlık yalnız SIĞIYORSA çizilir — çekirdek karar verir, burası
       uygular (kapasite ile çizim tek kaynaktan). */
    const altBaslikSigar = icerikKapasitesi(blok.kind, blok.box, p).fits > 0;
    return (
      <div style={{ padding: pad }}>
        <Satir px={mm(TYPO_MM.cat_title) * 0.8} kalin>
          {c.title || "Kategori"}
        </Satir>
        <span style={{ display: "block", height: 1, background: "#2B2822", margin: `${mm(1)}px 0` }} />
        {c.subtitle !== "" && altBaslikSigar && (
          <Satir px={mm(TYPO_MM.cat_subtitle) * 0.8} renk="#6B6459">
            {c.subtitle}
          </Satir>
        )}
      </div>
    );
  }

  if (blok.kind === "fiyat_listesi") {
    const c = UrunListesiIcerikSchema.parse(p);
    const { fits } = icerikKapasitesi(blok.kind, blok.box, p);
    if (c.items.length === 0) return <BosIpucu metin="Fiyat listesi — sağdan ürün ekle" px={mm(3)} />;
    return (
      <div style={{ padding: pad }}>
        {c.items.slice(0, fits).map((it) => (
          /* data-testid: ÇİZİLMİŞ ürünün kimliği. Panel ve blok zaten aynı
             sözleşmeyi kullanıyor. Buna ihtiyaç var çünkü "veri kaybı 0"
             iddiası ancak BELGENİN TAMAMINDAKİ ürünler sayılarak ölçülebilir:
             denetçi tek bloğu gösterir ve reflow o bloğu sonraki parçadan
             yeniden doldurduğu için denetçideki sayı belgenin sayısı DEĞİLDİR
             (gerçek tarayıcı provasında ölçüldü: blok 36'da kalırken belge
             3 ürün eksilmişti). Kimlikler tek tek sayılabildiği için
             hem KAYIP hem TEKRAR aynı ölçümle yakalanır. */
          <div key={it.id} data-testid={`urun-${it.id}`} style={{ marginBottom: mm(0.6) }}>
            <span style={{ display: "flex", alignItems: "baseline", gap: mm(1) }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <Satir px={mm(TYPO_MM.list_font) * olc}>{it.name || "—"}</Satir>
              </span>
              <span
                style={{
                  flex: "1 1 auto",
                  borderBottom: "1px dotted #C9C2B4",
                  transform: `translateY(-${mm(0.5)}px)`,
                  minWidth: mm(3),
                }}
              />
              <span style={{ flex: "0 0 auto" }}>
                <Satir px={mm(TYPO_MM.list_font) * olc} kalin>
                  {it.price}
                </Satir>
              </span>
            </span>
            {it.desc.trim() !== "" && (
              <Satir px={mm(2.5)} renk="#8A8272">
                {it.desc}
              </Satir>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (blok.kind === "urun_gridi") {
    const c = GridIcerikSchema.parse(p);
    const { fits } = icerikKapasitesi(blok.kind, blok.box, p);
    const aciklamaVar = c.items.some((i) => i.desc.trim() !== "");
    const { photo_h_mm } = gridKartOlcusu(blok.box.w_mm, c.columns, aciklamaVar, olc);
    if (c.items.length === 0) return <BosIpucu metin="Ürün grid'i — sağdan ürün ekle" px={mm(3)} />;
    return (
      <div
        style={{
          padding: pad,
          display: "grid",
          gridTemplateColumns: `repeat(${c.columns}, 1fr)`,
          gap: mm(TYPO_MM.grid_gap),
          alignContent: "start",
        }}
      >
        {c.items.slice(0, fits).map((it) => (
          <span key={it.id} data-testid={`urun-${it.id}`} style={{ display: "block", minWidth: 0 }}>
            <FotoYeri url={it.photo_url} h={mm(photo_h_mm)} />
            <Satir px={mm(2.9) * olc} kalin>
              {it.name || "—"}
            </Satir>
            {aciklamaVar && (
              <Satir px={mm(2.4)} renk="#8A8272">
                {it.desc}
              </Satir>
            )}
            <Satir px={mm(2.9) * olc}>{it.price}</Satir>
          </span>
        ))}
      </div>
    );
  }

  if (blok.kind === "hero_urun") {
    const c = HeroIcerikSchema.parse(p);
    const it: MenuItem | null = c.item;
    return (
      <div style={{ padding: pad, display: "grid", gap: mm(1.5) }}>
        <FotoYeri url={it?.photo_url ?? null} h={mm(blok.box.h_mm * 0.55)} yuvarlak />
        <Satir px={mm(6)} kalin>
          {it?.name || "Öne çıkan ürün"}
        </Satir>
        {it?.desc?.trim() !== "" && it && (
          <Satir px={mm(2.8)} renk="#6B6459">
            {it.desc}
          </Satir>
        )}
        <Satir px={mm(5.5)} kalin renk="#B3261E">
          {it?.price ?? ""}
        </Satir>
      </div>
    );
  }

  if (blok.kind === "gorsel" || blok.kind === "logo") {
    const c = GorselIcerikSchema.parse(p);
    return (
      <div style={{ padding: pad, height: "100%", boxSizing: "border-box" }}>
        {c.photo_url ? (
          <FotoYeri url={c.photo_url} h={mm(blok.box.h_mm - TYPO_MM.pad * 2)} yuvarlak />
        ) : (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: mm(blok.box.h_mm - TYPO_MM.pad * 2),
              background: "#DCD6C8",
              borderRadius: 3,
              fontSize: mm(3),
              letterSpacing: 1,
              color: "#6B6459",
            }}
          >
            {blok.kind === "logo" ? "LOGO" : "GÖRSEL"}
          </span>
        )}
      </div>
    );
  }

  if (blok.kind === "kampanya") {
    const c = KampanyaIcerikSchema.parse(p);
    return (
      <div
        style={{
          padding: pad,
          height: "100%",
          boxSizing: "border-box",
          background: "#F3E2C7",
          border: "1px solid #D9B877",
          borderRadius: 3,
          display: "grid",
          alignContent: "center",
          gap: mm(0.8),
        }}
      >
        <Satir px={mm(3.4)} kalin renk="#8A6A22">
          {c.title || "KAMPANYA"}
        </Satir>
        {c.line !== "" && (
          <Satir px={mm(4.6)} kalin renk="#B3261E">
            {c.line}
          </Satir>
        )}
      </div>
    );
  }

  if (blok.kind === "iletisim") {
    const c = IletisimIcerikSchema.parse(p);
    const satirlar = [c.phone, c.address, c.hours].filter((s) => s.trim() !== "");
    return (
      <div style={{ padding: pad, display: "grid", gap: mm(0.8) }}>
        {satirlar.length === 0 ? (
          <Satir px={mm(2.8)} renk="#A79F90">
            Telefon · adres · saat
          </Satir>
        ) : (
          satirlar.map((s, i) => (
            <Satir key={i} px={mm(2.9)} kalin={i === 0}>
              {s}
            </Satir>
          ))
        )}
      </div>
    );
  }

  return null;
}
