/* Ayarlar / Malzemeler — çip kütüphanesi ÇEVİRİ TAMAMLAMA yüzeyi
   (journal 2026-07-28-m8-sessizlik-cip-ceviri).

   NEDEN: öğrenilen çip tek dilli doğar (intake yalnız tr yollar, sunucu fr/de'yi
   "" açar) ve PATCH /api/ingredients ucu F7-B1'den beri TÜKETİCİSİZDİ — yani
   translationGaps kalıcı birikiyor, kapatma yüzeyi yoktu. Bu sayfa o ucun İLK
   tüketicisidir: fr/de'si eksik çipleri listeler, satır başına tamamlar.

   BİLİNÇLİ DAR KAPSAM: yalnız çeviri tamamlama. Silme/birleştirme/etiket ve
   bayat seed-override temizliği (TODO:166) ayrı paket — bu yüzey kütüphane
   YÖNETİMİ değildir. Çeviri intake AKIŞINDA da sorulmaz (görüşme bölünmez —
   ilan edilmiş akış kararı, paket scope-out'u). */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ResolvedChip } from "@tezgah/shared";
import { api } from "../api";
import { t } from "../i18n";
import { SettingsTabs } from "./ParseDictPage";

/** fr/de'den en az biri boş → çeviri bekliyor (ŞERH 3 simetrisi: PATCH ≥1 ister) */
function eksikMi(c: ResolvedChip): boolean {
  return c.fr.trim() === "" || c.de.trim() === "";
}

function CeviriSatiri({ chip }: { chip: ResolvedChip }) {
  const qc = useQueryClient();
  const [fr, setFr] = useState(chip.fr);
  const [de, setDe] = useState(chip.de);

  const kaydet = useMutation({
    mutationFn: () => {
      /* Yalnız DOLU alanlar gönderilir — sunucu ŞERH 3 gereği boş patch'i
         400'ler; boş string yollamak mevcut değeri silmek anlamına gelmesin */
      const govde: { fr?: string; de?: string } = {};
      if (fr.trim() !== "") govde.fr = fr.trim();
      if (de.trim() !== "") govde.de = de.trim();
      return api.patchIngredient(chip.id, govde);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["ingredients"] }),
  });

  const bosPatch = fr.trim() === "" && de.trim() === "";

  return (
    <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <b style={{ minWidth: 140 }}>{chip.tr}</b>
      <span className="pill" title={t("malzeme.source_hint")}>
        {chip.source === "learned" ? t("malzeme.source_learned") : t("malzeme.source_seed")}
      </span>
      <input
        type="text"
        placeholder={t("malzeme.fr_ph")}
        value={fr}
        onChange={(e) => setFr(e.target.value)}
        style={{ width: 180 }}
      />
      <input
        type="text"
        placeholder={t("malzeme.de_ph")}
        value={de}
        onChange={(e) => setDe(e.target.value)}
        style={{ width: 180 }}
      />
      <button onClick={() => kaydet.mutate()} disabled={bosPatch || kaydet.isPending}>
        {t("malzeme.save")}
      </button>
      {kaydet.isError && <span className="error">{(kaydet.error as Error).message}</span>}
    </div>
  );
}

export function IngredientsPage() {
  const chipsQ = useQuery({ queryKey: ["ingredients"], queryFn: api.ingredients });
  const chips = chipsQ.data ?? [];
  const eksikler = chips.filter(eksikMi);
  const tamSayisi = chips.length - eksikler.length;

  return (
    <div>
      <SettingsTabs active="ingredients" />
      <h2>{t("malzeme.title")}</h2>
      <p className="muted" style={{ maxWidth: 560 }}>{t("malzeme.hint")}</p>

      {chipsQ.isError && <p className="error">{(chipsQ.error as Error).message}</p>}

      {!chipsQ.isLoading && (
        <p className="muted">
          {eksikler.length > 0
            ? `${eksikler.length} ${t("malzeme.pending_count")} · ${tamSayisi} ${t("malzeme.done_count")}`
            : `${t("malzeme.all_done")} (${tamSayisi})`}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 640 }}>
        {eksikler.map((c) => (
          <CeviriSatiri key={c.id} chip={c} />
        ))}
      </div>
    </div>
  );
}
