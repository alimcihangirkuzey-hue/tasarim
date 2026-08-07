/* BLOK DENETÇİSİ — seçili bloğun içeriğini düzenleme yüzeyi (paket 3).

   ACEMİ MODU: burada mm, koordinat, katman ya da baskı terimi YOKTUR.
   Kullanıcı yalnız "ürün adı · fiyat · açıklama · fotoğraf" görür. Bloğun
   nereye oturacağını tuval, ne kadarının sığacağını çekirdek bilir.

   FOTOĞRAF: dosya seçici → object URL. Sunucuya yüklenmez, DB açılmaz
   (paket sınırı). Varlık deposuna bağlanma paket 5'in işi; o gün burada
   değişen tek şey URL'in nereden geldiği olur — MenuItem.photo_url alanı
   aynı kalır. */

import {
  GorselIcerikSchema,
  GridIcerikSchema,
  HeroIcerikSchema,
  IletisimIcerikSchema,
  KampanyaIcerikSchema,
  KategoriIcerikSchema,
  MenuItemSchema,
  UrunListesiIcerikSchema,
  icerikKapasitesi,
  type Block,
  type MenuItem,
} from "@tezgah/shared";

const kutuStil: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  border: "1px solid var(--c-line,#DDD6C8)",
  borderRadius: 6,
  font: "inherit",
  fontSize: 13,
  boxSizing: "border-box",
};

function Alan({
  etiket,
  deger,
  onChange,
  ipucu,
}: {
  etiket: string;
  deger: string;
  onChange: (v: string) => void;
  ipucu?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 3 }}>
      <span style={{ fontSize: 11, color: "var(--c-muted)" }}>{etiket}</span>
      <input type="text" style={kutuStil} value={deger} placeholder={ipucu} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

/** Dosya seçiciyi düğme gibi gösterir — acemi kullanıcı input[type=file]'ın
    çıplak halini "bozuk" diye okur. */
function FotoSec({
  etiket,
  onSec,
}: {
  etiket: string;
  /* Piksel ölçüsü URL ile BİRLİKTE döner: DPI hesabı fiziksel mm ile
     gerçek piksel sayısını karşılaştırır; birini alıp diğerini bırakmak
     kaliteyi ölçülemez kılardı. */
  onSec: (url: string, w: number | null, h: number | null) => void;
}) {
  return (
    <label
      style={{
        display: "inline-block",
        padding: "5px 10px",
        fontSize: 12,
        fontWeight: 600,
        border: "1px solid var(--c-line,#DDD6C8)",
        borderRadius: 6,
        cursor: "pointer",
        background: "var(--c-card,#fff)",
        color: "var(--c-ink,#1a1a1a)",
      }}
    >
      {etiket}
      <input
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const url = URL.createObjectURL(f);
          /* Ölçü okunamazsa null geçilir — uydurma bir değer, DPI uyarısını
             sessizce yanlış tarafa çevirirdi. */
          const img = new Image();
          img.onload = () => onSec(url, img.naturalWidth || null, img.naturalHeight || null);
          img.onerror = () => onSec(url, null, null);
          img.src = url;
        }}
      />
    </label>
  );
}

/** Tek ürün satırı — düzenleme + silme. */
function UrunSatiri({
  urun,
  gizli,
  onDegis,
  onSil,
  onTasi,
}: {
  urun: MenuItem;
  gizli: boolean;
  onDegis: (u: MenuItem) => void;
  onSil: () => void;
  /* SIRA KULLANICININ (paket 6): otomatik yerleşim semantik sırayı
     korur, keyfî sıralamaz. Sürükleme yerine ok düğmesi — acemi
     kullanıcı için daha az kaza, aynı sonuç. */
  onTasi: (yon: -1 | 1) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: 4,
        padding: 6,
        borderRadius: 6,
        border: "1px solid var(--c-line,#DDD6C8)",
        /* GİZLİ ürün soluk gösterilir — "girdim ama görünmüyor" hissi
           listede de karşılığını bulsun, yalnız üstteki sayıda değil. */
        opacity: gizli ? 0.55 : 1,
        background: gizli ? "#FEF3C7" : "transparent",
      }}
    >
      <div style={{ display: "flex", gap: 4 }}>
        <input
          type="text"
          aria-label="Ürün adı"
          style={{ ...kutuStil, flex: 2 }}
          value={urun.name}
          placeholder="Ürün adı"
          onChange={(e) => onDegis({ ...urun, name: e.target.value })}
        />
        <input
          type="text"
          aria-label="Fiyat"
          style={{ ...kutuStil, flex: 1 }}
          value={urun.price}
          placeholder="Fiyat"
          onChange={(e) => onDegis({ ...urun, price: e.target.value })}
        />
      </div>
      <input
        type="text"
        aria-label="Açıklama"
        style={kutuStil}
        value={urun.desc}
        placeholder="Açıklama (isteğe bağlı)"
        onChange={(e) => onDegis({ ...urun, desc: e.target.value })}
      />
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <FotoSec
          etiket={urun.photo_url ? "Fotoğrafı değiştir" : "Fotoğraf seç"}
          onSec={(url, w, h) => onDegis({ ...urun, photo_url: url, photo_w: w, photo_h: h })}
        />
        {gizli && <span className="pill warn">sığmadı</span>}
        <span style={{ flex: 1 }} />
        <button type="button" className="icon" aria-label={`${urun.name || "Ürün"} yukarı`} onClick={() => onTasi(-1)}>
          ↑
        </button>
        <button type="button" className="icon" aria-label={`${urun.name || "Ürün"} aşağı`} onClick={() => onTasi(1)}>
          ↓
        </button>
        <button type="button" className="icon" aria-label={`${urun.name || "Ürün"} sil`} onClick={onSil}>
          ×
        </button>
      </div>
    </div>
  );
}

/** Ürün taşıyan bloklar (grid + fiyat listesi) için ortak liste editörü. */
function UrunListesiEditoru({
  items,
  gizliAdet,
  onDegis,
  yeniId,
}: {
  items: MenuItem[];
  gizliAdet: number;
  onDegis: (yeni: MenuItem[]) => void;
  yeniId: () => string;
}) {
  const ilkGizliIndex = items.length - gizliAdet;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {gizliAdet > 0 && (
        <div className="pill warn" role="alert">
          {gizliAdet} ürün bu bloğa sığmadı — bloğu büyüt ya da yeni blok ekle
        </div>
      )}
      {items.map((u, i) => (
        <UrunSatiri
          key={u.id}
          urun={u}
          gizli={i >= ilkGizliIndex}
          onDegis={(yeni) => onDegis(items.map((x) => (x.id === u.id ? yeni : x)))}
          onSil={() => onDegis(items.filter((x) => x.id !== u.id))}
          onTasi={(yon) => {
            const j = i + yon;
            if (j < 0 || j >= items.length) return;
            const yeni = [...items];
            [yeni[i], yeni[j]] = [yeni[j], yeni[i]];
            onDegis(yeni);
          }}
        />
      ))}
      <button
        type="button"
        onClick={() => onDegis([...items, MenuItemSchema.parse({ id: yeniId() })])}
      >
        + Ürün Ekle
      </button>
    </div>
  );
}

export interface BlokDenetciProps {
  blok: Block | null;
  onProps: (props: Record<string, unknown>) => void;
  yeniId: () => string;
}

export function BlokDenetci({ blok, onProps, yeniId }: BlokDenetciProps) {
  if (!blok) {
    return (
      <aside className="epanel" style={{ width: 260, flex: "0 0 auto" }} aria-label="Blok ayarları">
        <h3>Blok ayarları</h3>
        <p style={{ fontSize: 12, color: "var(--c-muted)", margin: 0 }}>
          Tuvalde bir bloğa tıkla — içeriğini buradan yazarsın.
        </p>
      </aside>
    );
  }

  const p = blok.props;
  const { hidden } = icerikKapasitesi(blok.kind, blok.box, p);

  return (
    <aside className="epanel" style={{ width: 260, flex: "0 0 auto" }} aria-label="Blok ayarları">
      <h3>{BASLIK[blok.kind] ?? "Blok"}</h3>
      <div style={{ display: "grid", gap: 10 }}>
        {blok.kind === "kategori_basligi" &&
          (() => {
            const c = KategoriIcerikSchema.parse(p);
            return (
              <>
                <Alan etiket="Kategori adı" deger={c.title} ipucu="Pizzalar" onChange={(v) => onProps({ ...c, title: v })} />
                <Alan
                  etiket="Alt başlık (isteğe bağlı)"
                  deger={c.subtitle}
                  ipucu="Taş fırından"
                  onChange={(v) => onProps({ ...c, subtitle: v })}
                />
              </>
            );
          })()}

        {blok.kind === "urun_gridi" &&
          (() => {
            const c = GridIcerikSchema.parse(p);
            return (
              <>
                <div style={{ display: "grid", gap: 3 }}>
                  <span style={{ fontSize: 11, color: "var(--c-muted)" }}>Kolon</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {([1, 2, 3] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={c.columns === n ? "" : "ghost"}
                        aria-pressed={c.columns === n}
                        aria-label={`${n} kolon`}
                        style={{ flex: 1, padding: "5px 0" }}
                        onClick={() => onProps({ ...c, columns: n })}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <UrunListesiEditoru
                  items={c.items}
                  gizliAdet={hidden}
                  yeniId={yeniId}
                  onDegis={(items) => onProps({ ...c, items })}
                />
              </>
            );
          })()}

        {blok.kind === "fiyat_listesi" &&
          (() => {
            const c = UrunListesiIcerikSchema.parse(p);
            return (
              <UrunListesiEditoru
                items={c.items}
                gizliAdet={hidden}
                yeniId={yeniId}
                onDegis={(items) => onProps({ ...c, items })}
              />
            );
          })()}

        {blok.kind === "hero_urun" &&
          (() => {
            const c = HeroIcerikSchema.parse(p);
            const it = c.item ?? MenuItemSchema.parse({ id: yeniId() });
            const yaz = (yeni: MenuItem) => onProps({ item: yeni });
            return (
              <>
                <Alan etiket="Ürün adı" deger={it.name} ipucu="Karışık Pizza" onChange={(v) => yaz({ ...it, name: v })} />
                <Alan etiket="Fiyat" deger={it.price} ipucu="185 ₺" onChange={(v) => yaz({ ...it, price: v })} />
                <Alan
                  etiket="Açıklama"
                  deger={it.desc}
                  ipucu="Sucuk, mantar, biber"
                  onChange={(v) => yaz({ ...it, desc: v })}
                />
                <FotoSec etiket={it.photo_url ? "Fotoğrafı değiştir" : "Fotoğraf seç"} onSec={(u, w, h) => yaz({ ...it, photo_url: u, photo_w: w, photo_h: h })} />
              </>
            );
          })()}

        {(blok.kind === "gorsel" || blok.kind === "logo") &&
          (() => {
            const c = GorselIcerikSchema.parse(p);
            return (
              <FotoSec
                etiket={c.photo_url ? "Görseli değiştir" : "Görsel seç"}
                onSec={(u, w, h) => onProps({ photo_url: u, photo_w: w, photo_h: h })}
              />
            );
          })()}

        {blok.kind === "kampanya" &&
          (() => {
            const c = KampanyaIcerikSchema.parse(p);
            return (
              <>
                <Alan etiket="Üst yazı" deger={c.title} ipucu="AÇILIŞA ÖZEL" onChange={(v) => onProps({ ...c, title: v })} />
                <Alan etiket="Kampanya" deger={c.line} ipucu="Döner 6 CHF" onChange={(v) => onProps({ ...c, line: v })} />
              </>
            );
          })()}

        {blok.kind === "iletisim" &&
          (() => {
            const c = IletisimIcerikSchema.parse(p);
            return (
              <>
                <Alan etiket="Telefon" deger={c.phone} ipucu="0212 000 00 00" onChange={(v) => onProps({ ...c, phone: v })} />
                <Alan etiket="Adres" deger={c.address} ipucu="Bağdat Cad. No 12" onChange={(v) => onProps({ ...c, address: v })} />
                <Alan etiket="Saatler" deger={c.hours} ipucu="Her gün 11:00–23:00" onChange={(v) => onProps({ ...c, hours: v })} />
              </>
            );
          })()}
      </div>
    </aside>
  );
}

const BASLIK: Record<string, string> = {
  kategori_basligi: "Kategori Başlığı",
  urun_gridi: "Ürün Grid'i",
  fiyat_listesi: "Fiyat Listesi",
  hero_urun: "Hero Ürün",
  gorsel: "Görsel",
  logo: "Logo",
  kampanya: "Kampanya",
  iletisim: "İletişim",
};
