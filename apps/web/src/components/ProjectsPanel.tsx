/* Sipariş Defteri arayüzü — FAZ2-GOREV §2.3-2.5.
   Kırmızı eksik-alan rozetleri missingFields'tan (tek kaynak); durum geçişi
   409 dönerse eksikler toast'lanır; yapıştır-parse önizlemeli çalışır. */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  dueLevel,
  matchClient,
  missingFields,
  needsMiroirWarning,
  parseOrderText,
  pricingInputsOf,
  type ClientDTO,
  type OrderItemDTO,
  type OrderStatus,
  type ParsedOrder,
  type PricingInputField,
  PROJE_ACIK,
  PROJE_KAPALI,
  type ProductType,
  type ProjectDTO,
} from "@tezgah/shared";
import { TEMPLATES, blockersOf, exportRouteOf } from "@tezgah/templates";
import {
  siparisSablonlari,
  siparisSubstratlari,
  siparisTeknikleri,
} from "@tezgah/templates/identity";
import { api } from "../api";
import { analyzeDoc } from "../lib/analyzeDoc";
import { aktarimSonucVerisi, topluAktar } from "../lib/topluAktarim";
import { uyariMetni } from "../lib/uyariMetni";
import { belgeDisaAktar } from "../lib/disaAktar";
import { baslatmaSonucVerisi, belgeAc, topluBaslat, topluPlan } from "../lib/topluTasarim";
import { gorunurSiparisTurleri } from "../lib/gorunurTurler";
import { SIPARIS_YONLERI } from "../lib/siparisSecenekleri";
import { useSablonSecici } from "./SablonSecici";
import { TurSonucu, type TurSonucuVerisi } from "./TurSonucu";
import { t, tf } from "../i18n";

/* TOPLU BAŞLATMA GEREKÇELERİ — TEK KOPYA, iki tüketici (Sipariş Defteri
   düğmesi ve Açılış Takımı) aynı metinleri kullanır. Kütüphane i18n bilmez;
   metin buradan enjekte edilir. */
export const BASLATMA_METINLERI = {
  tasarlanamaz: t("orders.no_template_warn"),
  vazgecildi: t("orders.result_cancelled_reason"),
  hata: (e: unknown) => (e as Error).message,
};

const STATUSES: OrderStatus[] = ["olcu_bekliyor", "tasarimda", "onayda", "uretimde", "teslim", "iptal"];
const TYPE_ICON: Record<ProductType, string> = {
  menu: "📋", flyer: "📄", trifold: "🗞", fidelite: "💳",
  vitrophanie: "🪟", tabela: "🪧", tisort: "👕", onluk: "🥽", diger: "📦",
};
/* Sipariş→belge köprüsü artık İLANDAN okunur (identity katmanı,
   siparis-belge-koprusu paketi): eski web-yerel DESIGNABLE tablosu ve
   paramsFromItem switch'i oraya taşındı — köprü, kayıt defteri ve materyal
   ilanıyla YÜK-ZAMANI tutarlılık denetiminden geçer (yanlış aile gösteren
   köprü uygulamayı ayağa kaldırmaz). */

/* İmza DTO'ya DEĞİL, özetin fiilen okuduğu yapısal alt kümeye bağlıdır:
   yapıştır önizlemesindeki `ParsedOrderItem` (henüz DTO değil — id/status/
   document_id taşımaz) da aynı tek kaynaktan geçsin diye. Daraltma, özetin
   okumadığı bir alana ileride sessizce uzanmasını da engeller. */
type KalemOzetiGirdisi = Pick<
  OrderItemDTO,
  "product_type" | "qty" | "width_cm" | "height_cm" | "details"
>;

function itemSummary(it: KalemOzetiGirdisi): string {
  const parts: string[] = [];
  if (it.width_cm && it.height_cm) parts.push(`${it.width_cm}×${it.height_cm} cm`);
  if (it.details.format) parts.push(String(it.details.format).toUpperCase());
  if (it.details.print_qty) parts.push(`${it.details.print_qty} ${t("orders.print_qty")}`);
  if (it.qty > 1) parts.push(`${it.qty} ${t("orders.qty")}`);
  if (it.details.mode) parts.push(it.details.mode);
  if (it.details.side) parts.push(it.details.side);
  if (it.details.technique) parts.push(it.details.technique);
  /* Substrat İLANDAN türetilir (3.1/202 ticari bilgi; siparis-substrat-bagi):
     girdi DEĞİL — küme her türde tek elemanlı ölçüldü (girdi bilgi taşımaz);
     çok-elemanlı gün homojenlik nöbetçisi kırılır, girdi kararı o gün verilir */
  const substratlar = siparisSubstratlari(it.product_type);
  if (substratlar.length === 1) parts.push(t(`orders.substrat_${substratlar[0]}`));
  return parts.join(" · ");
}

function ItemRow({ item, client, showToast }: {
  item: OrderItemDTO;
  client: ClientDTO;
  showToast: (m: string) => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const secici = useSablonSecici();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["projects", client.id] });

  const upd = useMutation({
    mutationFn: (patch: Record<string, unknown>) => api.updateOrderItem(item.id, patch),
    onSuccess: (res) => {
      if (res.missing) {
        showToast(`${t("orders.missing_prefix")}: ${res.missing.join(", ")}`);
      }
      invalidate();
    },
  });
  const del = useMutation({
    mutationFn: () => api.deleteOrderItem(item.id),
    onSuccess: invalidate,
  });

  const startDesign = useMutation({
    mutationFn: async () => {
      /* 0 seçenek → tasarlanamaz; 1 → doğrudan; ≥2 → operatör seçer.
         VAZGEÇME SESSİZDİR ve hata DEĞİLDİR: modal kapanır, hiçbir belge
         açılmaz, editöre gidilmez. Eski `window.confirm` yolunda "İptal"
         ikinci şablonu seçiyordu — operatörün çıkışı yoktu. */
      const secenekler = siparisSablonlari(item.product_type);
      if (secenekler.length === 0) {
        showToast(t("orders.no_template_warn"));
        return null;
      }
      const templateId =
        secenekler.length === 1
          ? secenekler[0]!
          : await secici.sor(t(`orders.type_${item.product_type}`), secenekler);
      if (templateId === null) return null;
      /* Zincirin gövdesi belgeAc'ta (TEK KOPYA — toplu düğme de onu çağırır);
         yetim telafisi ve updateOrderItem telafisizliği oradaki yorumlarda. */
      return belgeAc(client.id, item, templateId);
    },
    onSuccess: (docId) => {
      invalidate();
      if (docId) navigate(`/editor/${docId}`);
    },
    /* Sunucu artık PUT /api/documents/:id'de params'ı şemayla doğrulayıp 400
       dönebiliyor (journal 2026-07-27-sunucu-params-dogrulamasi). onError
       yokken bu 400 sessizce yutuluyordu: kullanıcı "Tasarıma başla"ya basıyor,
       HİÇBİR ŞEY olmuyordu. Panelin mevcut hata deseni izlenir (present
       mutation'ı da showToast kullanıyor); mesaj api.ts'in apiErrorMessage ile
       ürettiği Türkçe-okunur gerekçedir.
       Yetim belge telafisi mutationFn içinde (journal
       2026-07-27-klon-kapisi-yetim-telafi): updateDocument başarısızlığında
       belge geri sarılır, hata buraya yeniden fırlar ve toast gerekçeyi
       gösterir. Not: updateOrderItem başarısızlığı telafi EDİLMEZ — o noktada
       belge geçerli params'la yazılmıştır, silmek kullanıcının işini yok
       ederdi; kalem bağı bir sonraki denemede kurulabilir. */
    onError: (e) => showToast(`${t("orders.start_design_error")}: ${(e as Error).message}`),
  });

  const missing = missingFields(item);
  const num = (v: string) => (v === "" ? null : Number(v));

  return (
    <div className="item-card">
      {secici.eleman}
      <div className="row" style={{ gap: 6 }}>
        <span title={item.product_type}>{TYPE_ICON[item.product_type]}</span>
        <strong>{t(`orders.type_${item.product_type}`)}</strong>
        <span className="muted" style={{ fontSize: 12 }}>{itemSummary(item)}</span>
        <span style={{ flex: 1 }} />
        {missing.map((m) => (
          <span key={m} className="pill red">{t("orders.missing_prefix")}: {m}</span>
        ))}
        {needsMiroirWarning(item) && <span className="pill warn">{t("orders.miroir")}</span>}
        <select
          value={item.status}
          onChange={(e) => upd.mutate({ status: e.target.value })}
          style={{ padding: "4px 6px", fontSize: 13 }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{t(`orders.st_${s}`)}</option>
          ))}
        </select>
        {item.document_id ? (
          <button className="small" onClick={() => navigate(`/editor/${item.document_id}`)}>
            {t("documents.open")}
          </button>
        ) : (
          <button className="ghost small" onClick={() => startDesign.mutate()} disabled={startDesign.isPending}>
            {t("orders.start_design")}
          </button>
        )}
        <button className="icon" onClick={() => del.mutate()}>✕</button>
      </div>

      {/* Alan editörleri — görünürlük GİRDİ İLANINDAN (7.2/4.5: pricingInputsOf;
          eski 4 tür-koşulu bu ilana bağlandı, matrisle drift edemez); widget'lar
          alan başına elle. Eksik zorunlular kırmızı çerçeveli (missingFields,
          aynı ilanın jenerik okuyucusu). */}
      {(() => {
        const alanVar = (a: PricingInputField): boolean =>
          pricingInputsOf(item.product_type).some((g) => g.alan === a);
        return (
      <div className="row" style={{ gap: 6, fontSize: 12 }}>
        {alanVar("width_cm") && (
          <>
            <input type="number" placeholder="en (cm)" defaultValue={item.width_cm ?? ""}
              className={missing.includes("width_cm") ? "field-missing" : ""}
              onBlur={(e) => upd.mutate({ width_cm: num(e.target.value) })} style={{ width: 84 }} />
            ×
            <input type="number" placeholder="boy (cm)" defaultValue={item.height_cm ?? ""}
              className={missing.includes("height_cm") ? "field-missing" : ""}
              onBlur={(e) => upd.mutate({ height_cm: num(e.target.value) })} style={{ width: 84 }} />
          </>
        )}
        {alanVar("side") && (
          <>
            <select value={item.details.side ?? ""} className={missing.includes("side") ? "field-missing" : ""}
              onChange={(e) => upd.mutate({ details: { ...item.details, side: e.target.value || undefined } })}>
              {/* YÖN sert kodlu KALIR ve bu ölçülmüş bir sınırdır: uygulama
                  yönü (dıştan/içten) bir ÜRETİM KANALI değildir, bu yüzden
                  KANAL_GEREKTIRIR zincirinde karşılığı yoktur — türetecek ilan
                  yok. İlan doğduğu gün buraya da bağlanır. Etiketler yine de
                  i18n'e alındı (JSX'te ham Türkçe dize kalmasın).
                  KÜME ARTIK ADLI (lib/siparisSecenekleri): elle yazılı olması
                  denetimsiz olmasını gerektirmiyor — nöbetçi, kümeyi şemanın
                  KABUL ETTİĞİYLE her koşuda eşliyor. */}
              <option value="">{t("orders.side_q")}</option>
              {SIPARIS_YONLERI.map((y) => (
                <option key={y} value={y}>{t(`orders.side_${y}`)}</option>
              ))}
            </select>
            {/* Seçenekler İLANDAN (siparisTeknikleri): ürün türü → şablon →
                production_channels → KANAL_GEREKTIRIR. Ölçüldü: vitrophanie
                için türetilen küme [decoupe, impression] — eski sert listeyle
                BİREBİR aynı, davranış değişmedi. */}
            <select value={item.details.mode ?? ""} className={missing.includes("mode") ? "field-missing" : ""}
              onChange={(e) => upd.mutate({ details: { ...item.details, mode: e.target.value || undefined } })}>
              <option value="">{t("orders.mode_q")}</option>
              {siparisTeknikleri(item.product_type).map((tk) => (
                <option key={tk} value={tk}>{t(`orders.teknik_${tk}`)}</option>
              ))}
            </select>
          </>
        )}
        {alanVar("qty") && (
          <>
            <input type="number" min={1} defaultValue={item.qty}
              className={missing.includes("qty") ? "field-missing" : ""}
              onBlur={(e) => upd.mutate({ qty: Number(e.target.value) || 1 })} style={{ width: 70 }} />
            {/* Aynı ilan kaynağı: tişört/önlük için türetilen küme
                [broderie, impression] — eski sert listeyle birebir aynı. */}
            <select value={item.details.technique ?? ""} className={missing.includes("technique") ? "field-missing" : ""}
              onChange={(e) => upd.mutate({ details: { ...item.details, technique: e.target.value || undefined } })}>
              <option value="">{t("orders.teknik_q")}</option>
              {siparisTeknikleri(item.product_type).map((tk) => (
                <option key={tk} value={tk}>{t(`orders.teknik_${tk}`)}</option>
              ))}
            </select>
            <input type="text" placeholder="bedenler (M:2, L:3)" defaultValue={item.details.sizes ?? ""}
              onBlur={(e) => upd.mutate({ details: { ...item.details, sizes: e.target.value || undefined } })}
              style={{ width: 140 }} />
          </>
        )}
        {alanVar("format") && (
          <input type="text" placeholder="format (a4/a3/21x21...)" defaultValue={item.details.format ?? ""}
            className={missing.includes("format") ? "field-missing" : ""}
            onBlur={(e) => upd.mutate({ details: { ...item.details, format: e.target.value || undefined } })}
            style={{ width: 150 }} />
        )}
        {alanVar("print_qty") && (
          <input type="number" min={1} placeholder={t("orders.print_qty")}
            defaultValue={item.details.print_qty ?? ""}
            onBlur={(e) => upd.mutate({ details: { ...item.details, print_qty: Number(e.target.value) || undefined } })}
            style={{ width: 90 }} />
        )}
        {item.notes && (
          <span className="muted" title={item.notes} style={{ fontStyle: "italic" }}>
            📝 {item.notes.split("\n")[0].slice(0, 48)}{item.notes.length > 48 ? "…" : ""}
          </span>
        )}
      </div>
        );
      })()}
    </div>
  );
}

function PasteBox({ client, showToast }: { client: ClientDTO; showToast: (m: string) => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedOrder | null>(null);
  const clients = useQuery({ queryKey: ["clients"], queryFn: api.clients });

  const match = useMemo(() => {
    if (!parsed?.isletme || !clients.data) return null;
    return matchClient(parsed.isletme, clients.data);
  }, [parsed, clients.data]);

  const create = useMutation({
    mutationFn: async () => {
      if (!parsed) return null;
      let targetId = client.id;
      if (parsed.isletme) {
        if (match) targetId = match.id;
        else {
          const created = await api.createClient(parsed.isletme);
          targetId = created.id;
        }
      }
      const project = await api.createProject(targetId, {
        name: parsed.isletme ? `Sipariş — ${parsed.isletme}` : "Sipariş",
        due_date: parsed.due_date,
        source_text: text,
        items: parsed.items.map((it) => ({
          product_type: it.product_type,
          qty: it.qty,
          width_cm: it.width_cm,
          height_cm: it.height_cm,
          details: it.details,
          notes: [it.notes, parsed.header_notes].filter(Boolean).join("\n"),
        })),
      });
      return { targetId, project };
    },
    onSuccess: (res) => {
      if (!res) return;
      showToast(t("orders.created"));
      setText("");
      setParsed(null);
      void qc.invalidateQueries({ queryKey: ["projects", res.targetId] });
      if (res.targetId !== client.id) navigate(`/clients/${res.targetId}`);
    },
  });

  const copyTemplate = () => {
    void navigator.clipboard.writeText(t("orders.marketer_template")).then(() => showToast(t("orders.copied")));
  };

  return (
    <div className="panel">
      <h2>{t("orders.paste_title")}</h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("orders.paste_placeholder")}
        style={{ minHeight: 120, fontFamily: "ui-monospace, monospace", fontSize: 13 }}
      />
      <div className="row">
        <button
          className="ghost"
          onClick={() => {
            /* FAZ4 §10: çekirdek ∪ DB sözlüğü — çözümlemeden hemen önce çekilir (aynı oturumda etki) */
            void api
              .parseSynonyms()
              .catch(() => [] as Array<{ word: string; product_type: ProductType }>)
              .then((syn) => {
                const extraDict = Object.fromEntries(syn.map((s) => [s.word, s.product_type]));
                setParsed(parseOrderText(text, { extraDict }));
              });
          }}
          disabled={!text.trim()}
        >
          {t("orders.parse_btn")}
        </button>
        <button className="ghost" onClick={copyTemplate}>{t("orders.copy_template")}</button>
      </div>
      {parsed && (
        <div className="parse-preview">
          <div className="row">
            {parsed.isletme ? (
              match ? (
                <span className="pill ok">{tf("orders.match_found", { name: match.name })}</span>
              ) : (
                <span className="pill warn">{tf("orders.match_new", { name: parsed.isletme })}</span>
              )
            ) : (
              <span className="pill">{t("orders.match_current")}</span>
            )}
            {parsed.due_date && <span className="pill">{t("orders.due")}: {parsed.due_date}</span>}
            <span className="pill">{tf("orders.items_found", { n: parsed.items.length })}</span>
          </div>
          {parsed.items.map((it, i) => {
            /* Özet TEK KAYNAKTAN. Önizleme eskiden aynı özeti elle İKİNCİ KEZ
               yazıyordu ve iki alanı düşürüyordu:
               · technique — CANLI yara: "Detay: nakis" ayrıştırıcıda
                 details.technique="broderie" üretir (parse.ts:104) ama
                 önizlemede görünmezdi; operatör onayladığı siparişin işleme
                 tekniğini göremiyor, işlenmiş kalem satırında ilk kez
                 karşılaşıyordu (onay yüzeyi ≠ yaratılan kayıt).
               · substrat — ilandan türetilen ticari bilgi (3.1/202), yalnız
                 işlenmiş satırdaydı.
               print_qty bu yoldan BUGÜN ERİŞİLEMEZ (ayrıştırıcı üretmiyor);
               tek kaynağa bağlanmakla ürettiği gün kendiliğinden görünür —
               latent, canlı yara olarak sayılmaz (analyzeDoc dersi). */
            const ozet = itemSummary(it);
            return (
              <div key={i} className="row" style={{ fontSize: 13, gap: 6 }}>
                <span>{TYPE_ICON[it.product_type]}</span>
                <strong>{t(`orders.type_${it.product_type}`)}</strong>
                {ozet && <span className="muted">{ozet}</span>}
                {it.notes && <span className="muted" style={{ fontStyle: "italic" }}>📝 {it.notes.split("\n")[0]}</span>}
              </div>
            );
          })}
          <button onClick={() => create.mutate()} disabled={create.isPending || parsed.items.length === 0}>
            {t("orders.create_project")}
          </button>
          {create.isError && <p className="error">{(create.error as Error).message}</p>}
        </div>
      )}
    </div>
  );
}

function ProjectBlock({ project, client, showToast }: {
  project: ProjectDTO;
  client: ClientDTO;
  showToast: (m: string) => void;
}) {
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["projects", client.id] });
  const secici = useSablonSecici();
  /* TUR SONUCU — proje bloğunda KALICI durur; yeni bir tur öncekini değiştirir
     (iki turun sonucu üst üste birikirse hangisinin güncel olduğu belirsizleşir). */
  const [sonuc, setSonuc] = useState<TurSonucuVerisi | null>(null);
  const [newType, setNewType] = useState<ProductType>("menu");
  /* KURULUMUN İŞ KOLLARI (K-1/C): tür seçicisi de 7.1/481'in "kullanıcı yalnızca
     yaptığı işi görür" hükmüne bağlanır — bugüne dek yalnız ŞABLON seçicisi
     bağlıydı, tabelacıya daraltılmış kurulumda operatör hâlâ tişört/menü
     ekleyebiliyordu. Aynı anahtar (["isKollari"]) DocumentsPanel/EditorPage ile
     paylaşılır: tek istek, tek önbellek. */
  const isKollari = useQuery({ queryKey: ["isKollari"], queryFn: api.isKollari });
  const aktifSektorler =
    isKollari.data?.kaynak === "yapilandirma" ? isKollari.data.aktif : undefined;
  const gorunurTurler = gorunurSiparisTurleri(aktifSektorler);
  /* SEÇİLİ TÜR GÖRÜNMEZ OLABİLİR: varsayılan "menu"dür ve uç yanıt verdiğinde
     liste daralır. Durumu effect ile düzeltmek yerine ETKİN değeri türetiyoruz —
     effect yarışı, seçici boş görünürken "Kalem ekle"nin menü kalemi eklemesine
     yol açardı: sessiz ve yanlış. Liste asla boşalmaz (kaçış kapısı `diger`). */
  const etkinTur = gorunurTurler.includes(newType) ? newType : gorunurTurler[0]!;
  /* F8-E: sunum mockup modu — "last" = eski davranış (varsayılan) */
  const [presentMode, setPresentMode] = useState<"last" | "per_scene_kind">("last");
  const today = new Date().toISOString().slice(0, 10);
  const level = dueLevel(project.due_date, today);

  const updProject = useMutation({
    mutationFn: (patch: { due_date?: string | null; name?: string; status?: string }) =>
      api.updateProject(project.id, patch),
    onSuccess: () => {
      invalidate();
      /* YAKLAŞAN İŞLER ŞERİDİ de tazelenmeli: sunucu sorgusu projenin
         durumuna bakar (status != PROJE_KAPALI). Tazelenmezse operatör
         projeyi kapatır ama şeritte durmaya devam eder — kapatma OLMAMIŞ
         gibi görünür. */
      void qc.invalidateQueries({ queryKey: ["upcoming"] });
    },
  });

  /* PROJE KAPATMA (K-1/B). ÖLÇÜLEN YARA: sunucu `status`'ü KABUL ediyordu
     (ProjectUpdateSchema) ve yaklaşan-işler sorgusu ona BAĞLIYDI
     (`status != 'done'`), ama 'done' hiçbir yerde YAZILMIYORDU — yetenek
     arayüzden ERİŞİLEMEZDİ. Sonuç: vadeli her proje, işi bitmiş olsa bile
     operatörün yaklaşan işler şeridinde SONSUZA DEK kalıyordu. Çoklu proje
     yürüten bir atölyede o şerit tam da işe yaramaz hâle gelen yerdi. */
  const kapali = project.status === PROJE_KAPALI;
  const delProject = useMutation({
    mutationFn: () => api.deleteProject(project.id),
    onSuccess: invalidate,
  });
  const addItem = useMutation({
    mutationFn: () => api.addOrderItem(project.id, { product_type: etkinTur }),
    onSuccess: invalidate,
  });
  /* TOPLU TASARIMA BAŞLATMA (K-1/A — ürün sahibi kararı 2026-08-06: "tıklayarak
     bitir"). Açılış Takımı preseti projeyi 4 kalemle kuruyordu ama operatör
     dördüne TEK TEK "Tasarıma başla" diyordu; bu düğme o dört tıkı bire indirir.

     ŞABLON SEÇİMİ TÜR BAŞINA BİR KEZ sorulur, kalem başına değil: bugün yalnız
     menu ≥2 seçeneklidir (grid/liste) ve Açılış Takımı'nda bir menü vardır —
     kalem başına sormak aynı soruyu N kez tekrarlardı. Seçici tekil düğmeyle
     AYNIDIR (davranış çatallanmasın) ve VAZGEÇME turu durdurmaz: o tür atlanır,
     kalanlar açılır, vazgeçilen sayısı özette AYRI görünür.

     SIRAYLA koşar, paralel değil: her kalem createDocument + updateDocument +
     updateOrderItem üçlüsüdür; paralel gönderim sunucuda aynı projeye eşzamanlı
     yazma yaratırdı ve bir kalemin 400'ü diğerinin telafisiyle karışırdı.
     Hata YUTULMAZ ama turu DURDURMAZ: düşen kalem sayılır, kalanlar denenir;
     özet toast'ta hem başarı hem düşen sayısı görünür (sessiz kısmi başarı yok).

     YÖNLENDİRME YOK: N belgeden birine atlamak keyfî olurdu (belgeAc yorumu). */
  const topluBaslatM = useMutation({
    mutationFn: () =>
      /* Gövde lib/topluTasarim.ts'te TEK KOPYA — Açılış Takımı da onu çağırır.
         Seçici buradan enjekte edilir: tekil düğmeyle AYNI bileşen. */
      topluBaslat(
        client.id,
        project.items,
        (tur, secenekler) => secici.sor(t(`orders.type_${tur}`), secenekler),
        BASLATMA_METINLERI,
      ),
    onSuccess: (r) => {
      invalidate();
      /* SONUÇ TOAST'A DEĞİL PANELE — toplu aktarımla AYNI yer ve AYNI
         gerekçe (tur-sonucu-paneli paketi): 4,5 saniyede silinen ve satır
         sonlarını göstermeyen bir kutu, kalem başına gerekçeyi taşıyamaz. */
      setSonuc(
        baslatmaSonucVerisi(
          r,
          (o) => tf("orders.bulk_done", o),
          (o) => tf("orders.bulk_cancelled", o),
          (it) => `${t(`orders.type_${it.product_type}`)} · ${itemSummary(it)}`,
        ),
      );
    },
    onError: (e) => showToast(`${t("orders.start_design_error")}: ${(e as Error).message}`),
  });

  /* TOPLU DIŞA AKTARIM (K-1/B — çoklu proje hızı). Projedeki BELGELİ kalemleri
     sırayla üretime verir.

     BLOCKER KAPISI ATLATILMAZ — bu paketin en kritik kararı: sunucunun blocker
     backstop'u İSTEMCİNİN bildirdiği uyarılara bakar ("sunucu tam analiz
     KOŞAMAZ: tam registry react taşır", exports.ts) — yani boş uyarı dizisiyle
     çağırmak bekçiyi sessizce devre dışı bırakır ve eksik zorunlu slotlu belge
     baskıya giderdi. Bu yüzden her belge için editörün koştuğu ANALİZİN AYNISI
     (analyzeDoc) burada da koşar; blocker taşıyan belge dışa AKTARILMAZ, sayılır
     ve operatöre bildirilir. Toplu yol, tekil yoldan daha gevşek olamaz.

     Sıra/hata semantiği toplu tasarıma başlatmayla aynı: sırayla koşar, düşen
     belge turu durdurmaz ama sayılır (sessiz kısmi başarı yok). */
  const topluAktarM = useMutation({
    mutationFn: async () => {
      /* Gövde `lib/topluAktarim.ts`'e taşındı: kardeşi topluBaslat bir
         kütüphaneyken bu ~40 satır bileşenin içindeydi ve TEK BİR TESTİ YOKTU.
         Adımlar enjekte edilir; blocker kapısı burada, GERÇEK analizle koşar. */
      /* `hazirla` bir sonraki `aktar` için gereken bağlamı bırakır: aynı
         belgenin manifest'i ve ANALİZİ iki kez hesaplanmasın (ve ikinci
         hesap birincisinden ayrışmasın). Tur SIRAYLA koştuğu için bu
         devir güvenlidir — kütüphane paralel çalışmaz. */
      let baglam: { entry: (typeof TEMPLATES)[string]; analiz: ReturnType<typeof analyzeDoc>; mode: unknown } | null =
        null;
      return topluAktar(
        project.items,
        {
          hazirla: async (documentId) => {
            const doc = await api.document(documentId);
            const entry = TEMPLATES[doc.template_id];
            /* Şablon kayıtlı değilse üretime verilmez: kanal ilanı okunamayan
               belge için doğru uç bilinemez (kayıtsız profil sunucuda da
               reddedilir — profile_not_registered). */
            if (!entry) return { kayitli: false, blockerlar: [] };
            const analiz = analyzeDoc(client, doc);
            baglam = { entry, analiz, mode: doc.params["mode"] };
            return {
              kayitli: true,
              /* Gerekçe EDİTÖRÜN metniyle aynı — ikinci bir etiketleme yok. */
              blockerlar: blockersOf(analiz.warnings, entry.manifest.severity_overrides).map(uyariMetni),
            };
          },
          aktar: (documentId) => {
            const b = baglam!;
            return belgeDisaAktar(documentId, b.entry.manifest.production_channels, b.mode, b.analiz.warnings);
          },
        },
        {
          kayitsizSablon: t("orders.bulk_export_unregistered"),
          bloklu: (gerekceler) => gerekceler.join(" · "),
          hata: (e) => (e as Error).message,
        },
      );
    },
    onSuccess: (r) => {
      invalidate();
      /* Üretilen dosyalar listesi de tazelenmeli — yoksa operatör az önce
         ürettiği dosyaları göremez ve üretim olmamış gibi görünür. */
      void qc.invalidateQueries({ queryKey: ["projectExports", project.id] });
      /* SONUÇ TOAST'A DEĞİL PANELE (K-1/B, tur sonucu paketi): toast 4,5
         saniyede siliniyordu, satır sonlarını göstermiyordu ve uzun listede
         duvara dönüyordu. Panel operatör kapatana kadar durur. */
      setSonuc(
        aktarimSonucVerisi(
          r,
          (o) => tf("orders.bulk_export_done", o),
          (it) => `${t(`orders.type_${it.product_type}`)} · ${itemSummary(it)}`,
        ),
      );
    },
    onError: (e) => showToast(`${t("editor.export_error")}: ${(e as Error).message}`),
  });

  /* ÜRETİLMİŞ DOSYALAR — `api.projectExports` bu pakete kadar TÜKETİCİSİZDİ
     (uç sunucuda vardı, istemci fonksiyonu vardı, hiçbir ekran çağırmıyordu).
     Toplu üretim eklendikten sonra boşluk somutlaştı: operatör tek tıkla N
     dosya üretiyor ama onları görecek proje düzeyinde bir yer yoktu.
     Liste toplu aktarımdan sonra tazelenir (aşağıda invalidate). */
  const ciktilar = useQuery({
    queryKey: ["projectExports", project.id],
    queryFn: () => api.projectExports(project.id),
  });

  /* TOPLU CMYK (K-1/B — çoklu proje hızı). Matbaanın ASIL üretim formatı
     CMYK'dir; bugüne dek yalnız EDİTÖRDE, BELGE BAŞINA alınabiliyordu.
     Ölçülen akış: 4 kalemlik bir işte operatör toplu üretimden sonra dört
     belgeyi tek tek açıp CMYK düğmesine basmak zorundaydı.

     İKİ ÖLÇÜLMÜŞ KISIT — ikisi de sunucudan okundu, varsayılmadı:
     (1) Ghostscript şart (cmyk.ts:44 → yoksa 503). Bu yüzden düğme YALNIZ
         cmykStatus.available iken çizilir; yoksa her tık kesin hataya giderdi.
     (2) Kaynak, belgenin SON `print` çıktısıdır (cmyk.ts:53-59 → yoksa 400
         no_print_export). Tekstil/kesim yoluna giden belgelerin print çıktısı
         HİÇ olmaz; onlar HATA değil ATLANAN sayılır — kanal ilanı zaten
         print taşımıyor (exportRouteOf). Hata saymak operatöre olmayan bir
         sorun bildirirdi. */
  const cmykQ = useQuery({ queryKey: ["cmyk-status"], queryFn: api.cmykStatus, staleTime: Infinity });
  const topluCmyk = useMutation({
    mutationFn: async () => {
      const belgeliler = project.items.filter((i) => i.document_id);
      let uretilen = 0;
      let atlanan = 0;
      let dusen = 0;
      for (const it of belgeliler) {
        try {
          const doc = await api.document(it.document_id!);
          const entry = TEMPLATES[doc.template_id];
          /* Kanal ilanı print taşımıyorsa CMYK'nin kaynağı doğmaz. */
          if (!entry || exportRouteOf(entry.manifest.production_channels, doc.params["mode"]) !== "pdf") {
            atlanan += 1;
            continue;
          }
          await api.exportCmyk(doc.id);
          uretilen += 1;
        } catch {
          dusen += 1;
        }
      }
      return { uretilen, atlanan, dusen };
    },
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ["projectExports", project.id] });
      showToast(tf("orders.bulk_cmyk_done", { uretilen: r.uretilen, atlanan: r.atlanan, dusen: r.dusen }));
    },
    onError: (e) => showToast(`${t("editor.export_error")}: ${(e as Error).message}`),
  });

  const present = useMutation({
    mutationFn: () => {
      const note = window.prompt(
        t("orders.present_note_prompt"),
        "Toute modification après signature fera l'objet d'une nouvelle facturation."
      );
      /* F8-E: mod yalnız default-dışıysa gönderilir (last isteği birebir eski) */
      return api.presentProject(project.id, {
        note: note ?? "",
        ...(presentMode !== "last" ? { mockup_mode: presentMode } : {}),
      });
    },
    onSuccess: (rec) => {
      showToast(tf("orders.present_done", { n: rec.version }));
      window.open("/" + rec.filepath.replace(/^data\//, ""), "_blank");
    },
    onError: (e) => showToast((e as Error).message === "400" ? t("orders.no_docs") : (e as Error).message),
  });

  return (
    <div className="cat-block" style={{ borderLeft: level === "red" ? "4px solid #DC2626" : level === "yellow" ? "4px solid #F59E0B" : undefined }}>
      {secici.eleman}
      <div className="row">
        <strong style={{ fontSize: 15 }}>{project.name}</strong>
        {kapali && <span className="pill p-ok">{t("orders.project_closed")}</span>}
        <button
          className="ghost small"
          onClick={() => updProject.mutate({ status: kapali ? PROJE_ACIK : PROJE_KAPALI })}
          disabled={updProject.isPending}
        >
          {kapali ? t("orders.project_reopen") : t("orders.project_close")}
        </button>
        <label className="kbd-hint">{t("orders.due")}</label>
        <input
          type="date"
          value={project.due_date ?? ""}
          onChange={(e) => updProject.mutate({ due_date: e.target.value || null })}
          style={{ padding: "4px 6px" }}
        />
        {level !== "none" && (
          <span className={`pill ${level === "red" ? "red" : "warn"}`}>
            {project.due_date}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <select
          value={presentMode}
          onChange={(e) => setPresentMode(e.target.value as "last" | "per_scene_kind")}
          style={{ padding: "4px 6px" }}
        >
          <option value="last">{t("orders.present_mode_last")}</option>
          <option value="per_scene_kind">{t("orders.present_mode_multi")}</option>
        </select>
        {/* Toplu başlatma — açılacak kalem YOKSA düğme HİÇ ÇIZILMEZ (devre dışı
            düğme değil): "0 kalem" yazan bir düğme operatöre yapılacak iş varmış
            gibi görünürdü. Sayı düğmenin üstünde durur ki kaç tık kazanıldığı
            basılmadan önce bilinsin. */}
        {(() => {
          const p = topluPlan(project.items);
          const n = p.hazir.length + p.secimli.length;
          if (n === 0) return null;
          return (
            <button
              className="ghost small"
              onClick={() => topluBaslatM.mutate()}
              disabled={topluBaslatM.isPending}
            >
              {topluBaslatM.isPending ? t("orders.bulk_running") : tf("orders.bulk_btn", { n })}
            </button>
          );
        })()}
        {/* Belgeli kalem yoksa çizilmez — toplu başlatma düğmesiyle aynı kural. */}
        {project.items.some((i) => i.document_id) && (
          <button
            className="ghost small"
            onClick={() => topluAktarM.mutate()}
            disabled={topluAktarM.isPending}
          >
            {topluAktarM.isPending
              ? t("editor.exporting")
              : tf("orders.bulk_export_btn", { n: project.items.filter((i) => i.document_id).length })}
          </button>
        )}
        {/* Ghostscript YOKSA düğme hiç çizilmez — her tık 503'e giderdi.
            Belgesiz projede de çizilmez (toplu aktarım düğmesiyle aynı kural). */}
        {cmykQ.data?.available && project.items.some((i) => i.document_id) && (
          <button
            className="ghost small"
            onClick={() => topluCmyk.mutate()}
            disabled={topluCmyk.isPending}
          >
            {topluCmyk.isPending ? t("editor.exporting") : t("orders.bulk_cmyk_btn")}
          </button>
        )}
        <button className="ghost small" onClick={() => present.mutate()} disabled={present.isPending}>
          {present.isPending ? t("editor.exporting") : t("orders.present_btn")}
        </button>
        <button
          className="icon"
          onClick={() => {
            if (window.confirm(t("orders.delete_project_confirm"))) delProject.mutate();
          }}
        >✕</button>
      </div>

      {project.items.map((it) => (
        <ItemRow key={it.id} item={it} client={client} showToast={showToast} />
      ))}

      <div className="row">
        <select value={etkinTur} onChange={(e) => setNewType(e.target.value as ProductType)}>
          {gorunurTurler.map((tp) => (
            <option key={tp} value={tp}>{t(`orders.type_${tp}`)}</option>
          ))}
        </select>
        <button className="ghost small" onClick={() => addItem.mutate()}>{t("orders.add_item")}</button>
      </div>

      {/* Üretilmiş dosyalar — çıktı YOKSA bölüm hiç çizilmez (boş başlık,
          üretim olmuş da dosya kaybolmuş izlenimi verirdi). Sunum kayıtları
          da bu listede görünür: ikisi de "bu projeden çıkan dosya"dır. */}
      {sonuc !== null && <TurSonucu veri={sonuc} onKapat={() => setSonuc(null)} />}

      {(ciktilar.data?.length ?? 0) > 0 && (
        <div className="row" style={{ flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          <span className="muted" style={{ fontSize: 12 }}>
            {tf("orders.outputs", { n: ciktilar.data!.length })}
          </span>
          {ciktilar.data!.map((r) => (
            <a
              key={r.id}
              className="pill"
              href={`/${r.filepath.replace(/^data\//, "")}`}
              target="_blank"
              rel="noreferrer"
              title={r.filepath}
            >
              {t(`orders.out_${r.kind}`)} v{r.version}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProjectsPanel({ client }: { client: ClientDTO }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 4500);
  };

  const projects = useQuery({
    queryKey: ["projects", client.id],
    queryFn: () => api.clientProjects(client.id),
  });
  const create = useMutation({
    mutationFn: () => api.createProject(client.id, { name: name.trim() }),
    onSuccess: () => {
      setName("");
      void qc.invalidateQueries({ queryKey: ["projects", client.id] });
    },
  });

  return (
    <>
      <PasteBox client={client} showToast={showToast} />

      <div className="row" style={{ marginTop: 12 }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("orders.project_name")}
          style={{ flex: 1, minWidth: 220 }}
        />
        <button className="ghost" onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>
          + {t("orders.add_project")}
        </button>
      </div>

      {projects.data?.map((p) => (
        <div key={p.id} style={{ marginTop: 12 }}>
          <ProjectBlock project={p} client={client} showToast={showToast} />
        </div>
      ))}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
