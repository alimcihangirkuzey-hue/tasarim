/* Asset seçici — Müşteri | Ortak havuz sekmeleri (FAZ2-GOREV §4).
   client.assets sunucudan ortakları da içerir; sekme client_id ile ayrıştırır.

   ROL FİLTRESİ (Canonical 7.2/502 "dosya gereksinimleri" — rol yarısı):
   `kabul` slotun KABUL ETTİĞİ asset türlerinin kümesidir (INCLUDE filtresi;
   undefined/null = kısıtsız). Değeri ÇAĞIRAN UYDURMAZ, şablon ilanından
   türetilir (`kabulEdilenTurler`, @tezgah/templates) — ilan ile davranış
   ayrışmasın.

   NEDEN TEK YÖNLÜ ÇENTİK YETMEDİ (eski `excludeLogos?: boolean`): dışlama
   ekseni yalnız "logo HARİÇ"i ifade edebiliyordu; "YALNIZ logo göster"in
   karşılığı YOKTU. Bu asimetri kazara değil, yaranın ta kendisiydi — marka
   kiti seçicileri (logo_primary/logo_mono) hiçbir filtre GEÇİREMEDİĞİ için
   korumasız kaldı ve logo alanına yemek fotoğrafı bağlanabildi; brandkit tek
   doğruluk kaynağı olduğundan (M1/M5) bu zehirlenme `bind` üzerinden 15 slota
   birden yayılıyordu. INCLUDE ekseni her iki yönü de ifade eder: logo slotu
   ["logo"], ürün fotoğrafı slotu ["photo","other"] der.

   SINIR (önleyicidir, denetçi değildir): filtre yalnız KAYNAKTA engeller —
   zaten bağlanmış ya da override'la zorla bağlanmış yanlış varlığı TESPİT
   ETMEZ. "Yanlış rol uyarısı" ayrı bir uyarı türü + blocker disiplini işidir
   (TODO şerhi). */

import { useState } from "react";
import type { AssetKind, ClientDTO } from "@tezgah/shared";
import { t, tf } from "../i18n";

export function AssetPicker(props: {
  client: ClientDTO;
  value: string | null;
  onPick: (id: string | null) => void;
  /** Kabul edilen asset türleri (INCLUDE). undefined/null = kısıtsız. */
  kabul?: readonly AssetKind[] | null;
}) {
  const { client, value, onPick, kabul } = props;
  const [tab, setTab] = useState<"client" | "common">("client");

  const inTab = client.assets.filter((a) =>
    tab === "client" ? a.client_id !== null : a.client_id === null
  );
  const list = kabul ? inTab.filter((a) => kabul.includes(a.kind)) : inTab;

  /* Sessiz boş liste YASAK: filtre eledi ise sebebini söyle — kullanıcı
     "görselim vardı, nereye gitti?" sorusunu ekranda cevaplı bulsun.
     Sekmede hiç varlık yoksa eski mesaj (henüz görsel yok) aynen kalır. */
  const elendi = list.length === 0 && inTab.length > 0 && !!kabul;

  return (
    <div>
      <div className="row" style={{ gap: 4, marginBottom: 6 }}>
        <button className={tab === "client" ? "small" : "ghost small"} onClick={() => setTab("client")}>
          {t("assets.tab_client")}
        </button>
        <button className={tab === "common" ? "small" : "ghost small"} onClick={() => setTab("common")}>
          {t("assets.tab_common")}
        </button>
      </div>
      {list.length === 0 ? (
        <p className="muted">
          {elendi ? tf("assets.none_accepted", { kinds: kabul!.join(", ") }) : t("client.no_assets")}
        </p>
      ) : (
        <div className="asset-pick">
          {list.map((a) => (
            <img
              key={a.id}
              src={a.urls.thumb}
              className={value === a.id ? "on" : ""}
              onClick={() => onPick(value === a.id ? null : a.id)}
              alt={a.kind}
              title={`${a.width_px}×${a.height_px}px${a.client_id === null ? " · ortak" : ""}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
