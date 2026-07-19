/* F1 pilot P4+P5 — BRIEF akışı (menü + garment/tekstil).

   İki aile AYNI yaşam döngüsünü paylaşır (f1-state guard'ları · P3 dosya
   politikası · completeness motoru); fark YALNIZ alan matrisidir. Bu yüzden
   tek sayfa, aileye göre alan blokları.

   Mevcut /siparis akışı ve intakeStore'a DOKUNULMAZ (ayrı yaşam döngüsü;
   GT-işaretli IntakeProductsStep'e sıfır dokunuş — P4 şerhi).

   Durum kararları SUNUCUDA: istemci yalnız düğme gösterir, guard sunucunun. */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  F1_GARMENT_SIZES,
  GARMENT_AREAS,
  areasForKind,
  f1TotalQuantity,
  type ClientDTO,
  type ClientSummaryDTO,
  type GarmentAreaId,
  type GarmentKind,
} from "@tezgah/shared";
import { api, type BriefFileResult, type BriefView } from "../api";
import {
  capacityMessage,
  estimateCapacity,
  menuFormatOptions,
  parseFormatKey,
} from "../lib/specJoin";

const PUBLICATIONS = [
  { id: "a4_print", label: "A4 baskı" },
  { id: "trifold", label: "Trifold" },
  { id: "qr_image", label: "QR görseli" },
  { id: "digital_menu", label: "Dijital menü" },
];
const LANGS = [
  { id: "tr", label: "Türkçe" },
  { id: "fr", label: "Français" },
  { id: "de", label: "Deutsch" },
];
const GARMENT_KINDS: Array<{ id: GarmentKind; label: string }> = [
  { id: "tshirt", label: "Tişört" },
  { id: "apron_bavette", label: "Önlük (bavette)" },
  { id: "apron_taille", label: "Önlük (bel)" },
];
const TECHNIQUES = [
  { id: "broderie", label: "Nakış (broderie)" },
  { id: "genel_baski", label: "Genel baskı (300dpi alfa-PNG)" },
  { id: "dtf", label: "DTF" },
];
/* Beden seti TEK KAYNAKTAN (shared/f1-spec.ts) — sunucu doğrulaması da aynı
   kümeyi okur; UI'da ayrı liste tutulmaz (D-63). */
const SIZES = F1_GARMENT_SIZES;

const box: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: 12,
  marginBottom: 12,
  background: "#fff",
};
const label: React.CSSProperties = { display: "block", fontWeight: 600, marginBottom: 4, fontSize: 14 };
const input: React.CSSProperties = { width: "100%", minHeight: 44, padding: "8px 10px", fontSize: 15 };

export function BriefPage() {
  const [clients, setClients] = useState<ClientSummaryDTO[]>([]);
  const [clientId, setClientId] = useState("");
  const [family, setFamily] = useState<"menu" | "garment">("menu");
  const [client, setClient] = useState<ClientDTO | null>(null);
  const [view, setView] = useState<BriefView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpload, setLastUpload] = useState<BriefFileResult | null>(null);
  const [files, setFiles] = useState<BriefFileResult["file"][]>([]);
  const [ackBy, setAckBy] = useState("");
  const [ackReason, setAckReason] = useState("");
  /* Beden matrisi: ham metin + alan-başına hata (sessiz düşürme YOK) */
  const [sizeText, setSizeText] = useState<Record<string, string>>({});
  const [sizeError, setSizeError] = useState<Record<string, string>>({});

  const formats = useMemo(() => menuFormatOptions(), []);

  useEffect(() => {
    void api.clients().then(setClients, () => setError("Müşteri listesi alınamadı"));
  }, []);
  useEffect(() => {
    if (!clientId) return setClient(null);
    void api.client(clientId).then(setClient, () => setClient(null));
  }, [clientId]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const reload = async (id: string) => setView(await api.brief(id));
  const patch = (body: Record<string, unknown>) =>
    run(async () => {
      if (!view) return;
      setView(await api.patchBrief(view.brief.id, body));
    });

  const isGarment = view?.brief.request_type === "garment";
  const fileRole = isGarment ? "tasarim" : "logo";
  const spec = (view?.brief.spec_values ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof spec[k] === "string" ? (spec[k] as string) : "");
  const publications = view?.brief.requested_publications ?? [];
  const printed = publications.includes("a4_print") || publications.includes("trifold");

  const selectedKey = spec.format ? `${String(spec.format_template ?? "")}:${String(spec.format)}` : "";
  const selectedOption = formats.find((f) => f.key === selectedKey) ?? null;
  const capacity = estimateCapacity(client, selectedOption);
  const capMsg = capacityMessage(capacity);

  const placements = Array.isArray(spec.placements) ? (spec.placements as GarmentAreaId[]) : [];
  const sizeDist = (spec.size_distribution ?? {}) as Record<string, number>;
  const totalQty = f1TotalQuantity(sizeDist);

  /**
   * Beden hücresi kaydı: metni İSTEMCİDE de doğrular (virgüllü ondalık, harf,
   * negatif) — geçersizse SUNUCUYA GİTMEZ ve değer sessizce DÜŞMEZ, hücrenin
   * altında gerekçe belirir (AJAN-5/B-4). Geçerliyse sunucuya yazılır ve
   * ham-metin taslağı temizlenir (ekran = kayıt, AJAN-5/B-5).
   */
  const commitSize = async (size: string) => {
    if (!view) return;
    const text = (sizeText[size] ?? String(sizeDist[size] ?? "")).trim();
    const next = { ...sizeDist };
    if (text === "") {
      delete next[size];
    } else {
      const n = Number(text.replace(",", "."));
      if (!Number.isFinite(n)) {
        setSizeError((p) => ({ ...p, [size]: "sayı olmalı" }));
        return;
      }
      if (!Number.isInteger(n)) {
        setSizeError((p) => ({ ...p, [size]: "tam sayı olmalı (ör. 12)" }));
        return;
      }
      if (n < 0) {
        setSizeError((p) => ({ ...p, [size]: "negatif olamaz" }));
        return;
      }
      next[size] = n;
    }
    setSizeError((p) => ({ ...p, [size]: "" }));
    await run(async () => {
      setView(await api.patchBrief(view.brief.id, { spec_values: { size_distribution: next } }));
      /* BULGU-4 kökü: taslağı BOŞ DİZE ile temizlemek kutuyu kalıcı boş
         bırakıyordu — `sizeText[size] ?? ...` (nullish) "" için fallback'e
         DÜŞMEZ. Ayrıca sonraki blur'da text="" okunup bedeni SİLİYORDU.
         Doğrusu: taslak anahtarını KALDIR → kayıt değeri görünür. */
      setSizeText((p) => {
        const next = { ...p };
        delete next[size];
        return next;
      });
    });
  };
  const garmentKind = (str("garment_type") || "tshirt") as GarmentKind;
  const validAreas = areasForKind(garmentKind);

  return (
    <div className="intake-page" style={{ maxWidth: 720 }}>
      <h1 style={{ marginBottom: 4 }}>{isGarment ? "Tekstil Briefi" : "Menü Briefi"}</h1>
      <p style={{ opacity: 0.7, marginTop: 0, fontSize: 14 }}>
        Üretim bilgisi eksikse tasarım başlayabilir; <strong>üretim kapısı</strong> eksiksiz olmadan
        açılmaz. <Link to="/siparis">← Sipariş görüşmesi</Link>
      </p>

      {error && (
        <div className="intake-warn full" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      {!view && (
        <div style={box}>
          <label style={label}>İş ailesi</label>
          <div style={{ display: "flex", gap: 14, marginBottom: 10 }}>
            {(["menu", "garment"] as const).map((f) => (
              <label key={f} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="radio" checked={family === f} onChange={() => setFamily(f)} />
                {f === "menu" ? "Menü" : "Tekstil / garment"}
              </label>
            ))}
          </div>
          <label style={label}>Müşteri</label>
          <select style={input} value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">— seçin —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            style={{ ...input, marginTop: 10, cursor: "pointer" }}
            disabled={!clientId || busy}
            onClick={() =>
              void run(async () => {
                setView(
                  await api.createBrief({
                    request_type: family,
                    customer_ref: clientId,
                    content_reference: family === "menu" ? `catalog:${clientId}` : undefined,
                  })
                );
              })
            }
          >
            {family === "menu" ? "Menü briefi aç" : "Tekstil briefi aç"}
          </button>
        </div>
      )}

      {view && (
        <>
          {/* F1.2 — EKSİK BİLGİ ROZETİ (kalıcı, isimli, gizlenemez) */}
          <div
            style={{
              ...box,
              borderColor: view.missing.length ? "#C8102E" : "#2e7d32",
              background: view.missing.length ? "#fff5f6" : "#f3fbf4",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <strong>Durum: {view.brief.status}</strong>
              <span style={{ opacity: 0.75 }}>
                üretim tamlığı %{view.completeness.productionCompleteness} ·{" "}
                {view.completeness.designReady ? "tasarım hazır ✓" : "tasarım önkoşulu EKSİK"}
              </span>
            </div>
            {view.missing.length > 0 ? (
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {view.missing.map((m) => (
                  <li key={m.id}>
                    {m.label_tr}{" "}
                    <span style={{ opacity: 0.6, fontSize: 12 }}>
                      ({m.layer === "design_pre" ? "tasarım önkoşulu" : "üretim"}
                      {m.reject_class ? " · istisna verilemez" : ""})
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: "8px 0 0" }}>Eksik bilgi yok.</p>
            )}
            {view.completeness.notices.map((n) => (
              <p key={n.code} style={{ margin: "8px 0 0", fontSize: 13 }}>
                ℹ {n.message_tr}
              </p>
            ))}
            {view.price_coverage && view.price_coverage.missing > 0 && (
              <p style={{ margin: "8px 0 0", fontSize: 13 }}>
                Katalogda <strong>{view.price_coverage.missing}</strong> ürünün fiyatı yok (
                {view.price_coverage.items} üründen) — fiyatlar katalogdan okunur.
              </p>
            )}
          </div>

          {/* TASARIM ÖNKOŞULLARI */}
          <div style={box}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Tasarım önkoşulları</h2>

            {!isGarment && (
              <>
                <label style={label}>Format</label>
                <select
                  style={input}
                  value={selectedKey}
                  onChange={(e) => {
                    const parsed = parseFormatKey(e.target.value);
                    if (!parsed) return;
                    void patch({
                      spec_values: { format: parsed.format, format_template: parsed.template_id },
                    });
                  }}
                >
                  <option value="">— seçin —</option>
                  {formats.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label_tr} ({f.w_mm}×{f.h_mm} mm)
                    </option>
                  ))}
                </select>
                {capMsg && (
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: 13,
                      fontWeight: capacity?.fits ? 400 : 700,
                      color: capacity?.fits ? "#2e7d32" : "#C8102E",
                    }}
                  >
                    {capMsg}
                  </p>
                )}

                <label style={{ ...label, marginTop: 12 }}>Diller</label>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {LANGS.map((l) => {
                    const on = view.brief.language_requirements.includes(l.id);
                    return (
                      <label key={l.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            void patch({
                              language_requirements: on
                                ? view.brief.language_requirements.filter((x) => x !== l.id)
                                : [...view.brief.language_requirements, l.id],
                            })
                          }
                        />
                        {l.label}
                      </label>
                    );
                  })}
                </div>

                <label style={{ ...label, marginTop: 12 }}>Talep edilen çıktılar</label>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {PUBLICATIONS.map((p) => {
                    const on = publications.includes(p.id);
                    return (
                      <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            void patch({
                              requested_publications: on
                                ? publications.filter((x) => x !== p.id)
                                : [...publications, p.id],
                            })
                          }
                        />
                        {p.label}
                      </label>
                    );
                  })}
                </div>

                <p style={{ margin: "12px 0 0", fontSize: 13, opacity: 0.75 }}>
                  İçerik iskeleti:{" "}
                  {client ? `${client.name} kataloğu bağlı` : view.brief.content_reference}
                </p>
              </>
            )}

            {isGarment && (
              <>
                <label style={label}>Ürün tipi</label>
                <select
                  style={input}
                  value={str("garment_type")}
                  onChange={(e) => {
                    /* Ürün tipi değişince baskı yerlerini KÖRÜ KÖRÜNE silme:
                       yeni tipte geçerli olanlar korunur (BULGU-5 dersi). */
                    const gecerli = areasForKind(e.target.value as GarmentKind);
                    void patch({
                      spec_values: {
                        garment_type: e.target.value,
                        placements: placements.filter((p) => gecerli.includes(p)),
                      },
                    });
                  }}
                >
                  <option value="">— seçin —</option>
                  {GARMENT_KINDS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>

                <label style={{ ...label, marginTop: 12 }}>Baskı yeri (en az 1)</label>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {validAreas.map((areaId) => {
                    const on = placements.includes(areaId);
                    const area = GARMENT_AREAS[areaId];
                    return (
                      <label key={areaId} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={!str("garment_type")}
                          onChange={() =>
                            void patch({
                              spec_values: {
                                placements: on
                                  ? placements.filter((x) => x !== areaId)
                                  : [...placements, areaId],
                              },
                            })
                          }
                        />
                        {area.label_tr}{" "}
                        <span style={{ opacity: 0.6, fontSize: 12 }}>
                          ({area.w_cm}×{area.h_cm} cm)
                        </span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* ÜRETİM ÖNKOŞULLARI */}
          <div style={box}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Üretim bilgileri</h2>

            <label style={label}>Teslim tarihi</label>
            <input
              style={input}
              type="date"
              value={view.brief.delivery_deadline ?? ""}
              onChange={(e) => void patch({ delivery_deadline: e.target.value || null })}
            />

            {isGarment && (
              <>
                <label style={{ ...label, marginTop: 12 }}>Ürün rengi</label>
                <input
                  style={input}
                  defaultValue={str("fabric_color")}
                  onBlur={(e) => void patch({ spec_values: { fabric_color: e.target.value } })}
                  placeholder="siyah · beyaz · #1A1A1A…"
                />

                <label style={{ ...label, marginTop: 12 }}>Baskı tekniği</label>
                <select
                  style={input}
                  value={str("technique")}
                  onChange={(e) => void patch({ spec_values: { technique: e.target.value } })}
                >
                  <option value="">— seçin —</option>
                  {TECHNIQUES.map((tq) => (
                    <option key={tq.id} value={tq.id}>
                      {tq.label}
                    </option>
                  ))}
                </select>

                {/* BEDEN × ADET MATRİSİ — toplam HESAPLANIR */}
                <label style={{ ...label, marginTop: 12 }} id="size-matrix-label">
                  Beden × adet
                </label>
                <div
                  style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                  role="group"
                  aria-labelledby="size-matrix-label"
                >
                  {SIZES.map((size) => (
                    <div key={size} style={{ width: 78 }}>
                      <label
                        htmlFor={`size-${size}`}
                        style={{ display: "block", fontSize: 12, textAlign: "center", opacity: 0.75 }}
                      >
                        {size}
                      </label>
                      <input
                        id={`size-${size}`}
                        aria-label={`${size} beden adedi`}
                        aria-invalid={Boolean(sizeError[size])}
                        style={{
                          ...input,
                          textAlign: "center",
                          padding: 6,
                          borderColor: sizeError[size] ? "#C8102E" : undefined,
                        }}
                        type="text"
                        inputMode="numeric"
                        /* KONTROLLÜ: sunucu bir yazımı reddederse ekran ile kayıt
                           AYRIŞMAZ (AJAN-5/B-5); ham metin tutulur ki kullanıcının
                           yazdığı sessizce kaybolmasın (AJAN-5/B-4). */
                        value={sizeText[size] ?? String(sizeDist[size] ?? "")}
                        onChange={(e) => setSizeText((prev) => ({ ...prev, [size]: e.target.value }))}
                        onBlur={() => void commitSize(size)}
                      />
                    </div>
                  ))}
                </div>
                {Object.entries(sizeError).some(([, v]) => v) && (
                  <p style={{ margin: "6px 0 0", color: "#C8102E", fontSize: 13 }}>
                    {Object.entries(sizeError)
                      .filter(([, v]) => v)
                      .map(([s, v]) => `${s}: ${v}`)
                      .join(" · ")}
                  </p>
                )}
                <p style={{ margin: "6px 0 0", fontWeight: 700 }} aria-live="polite">
                  Toplam adet: {totalQty} <span style={{ fontWeight: 400, opacity: 0.6 }}>(hesaplanır)</span>
                  {totalQty === 0 && (
                    <span style={{ fontWeight: 400, color: "#C8102E" }}> — beden dağılımı boş</span>
                  )}
                </p>

                {placements.length > 0 && (
                  <>
                    <label style={{ ...label, marginTop: 12 }}>Baskı boyutu/konumu (yer başına)</label>
                    <input
                      style={input}
                      defaultValue={
                        typeof spec.print_size_position === "string"
                          ? (spec.print_size_position as string)
                          : JSON.stringify(spec.print_size_position ?? "")
                      }
                      onBlur={(e) =>
                        void patch({ spec_values: { print_size_position: e.target.value } })
                      }
                      placeholder={placements
                        .map((p) => `${GARMENT_AREAS[p].label_tr}: ${GARMENT_AREAS[p].w_cm}×${GARMENT_AREAS[p].h_cm} cm`)
                        .join(" · ")}
                    />
                    <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.65 }}>
                      Boş bırakılırsa Spec varsayılanı geçerlidir; yine de açık yazılması istenir.
                    </p>
                  </>
                )}
              </>
            )}

            {!isGarment && publications.includes("qr_image") && (
              <>
                <label style={{ ...label, marginTop: 12 }}>QR hedef adresi</label>
                <input
                  style={input}
                  defaultValue={str("qr_target_url")}
                  onBlur={(e) => void patch({ spec_values: { qr_target_url: e.target.value } })}
                  placeholder="https://…"
                />
              </>
            )}

            {!isGarment && printed && (
              <>
                <label style={{ ...label, marginTop: 12 }}>Baskı adedi</label>
                <input
                  style={input}
                  type="number"
                  defaultValue={String(spec.print_quantity ?? "")}
                  onBlur={(e) =>
                    void patch({
                      spec_values: {
                        print_quantity: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                />
                <label style={{ ...label, marginTop: 12 }}>Baskı malzemesi</label>
                <input
                  style={input}
                  defaultValue={str("print_material")}
                  onBlur={(e) => void patch({ spec_values: { print_material: e.target.value } })}
                  placeholder="kuşe 170gr…"
                />
              </>
            )}

            {!isGarment && !view.brief.brand_ref && (
              <>
                <label style={{ ...label, marginTop: 12 }}>Renk/font seçimi (marka referansı yok)</label>
                <input
                  style={input}
                  defaultValue={str("color_font_choice")}
                  onBlur={(e) => void patch({ spec_values: { color_font_choice: e.target.value } })}
                  placeholder="ör. müşteri kiti renkleri + Anton/Inter"
                />
              </>
            )}

            {/* OPSİYONEL (eksiksizlik hesabına GİRMEZ — spec optional_fields) */}
            {isGarment && (
              <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
                <input
                  type="checkbox"
                  checked={publications.includes("mockup")}
                  onChange={() =>
                    void patch({
                      requested_publications: publications.includes("mockup")
                        ? publications.filter((x) => x !== "mockup")
                        : [...publications, "mockup"],
                    })
                  }
                />
                Mockup istensin (opsiyonel)
              </label>
            )}

            <label style={{ ...label, marginTop: 12 }} htmlFor="brief-notes">
              Notlar (opsiyonel)
            </label>
            <textarea
              id="brief-notes"
              style={{ ...input, minHeight: 60, fontFamily: "inherit" }}
              defaultValue={view.brief.requester_notes ?? ""}
              onBlur={(e) => void patch({ requester_notes: e.target.value })}
              placeholder="operatör notu…"
            />

            <label style={{ ...label, marginTop: 12 }} htmlFor="brief-file">
              {isGarment ? "Tasarım dosyası" : "Logo dosyası"} (PNG · JPG · SVG · PDF)
            </label>
            <input
              id="brief-file"
              style={{ ...input, padding: 8 }}
              type="file"
              accept=".png,.jpg,.jpeg,.svg,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void run(async () => {
                  const res = await api.uploadBriefFile(view.brief.id, fileRole, file);
                  setLastUpload(res);
                  setFiles((prev) => [...prev, res.file]);
                  await reload(view.brief.id);
                });
                e.target.value = "";
              }}
            />
            {lastUpload && (
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <div>
                  Yüklendi: {lastUpload.file.role} v{lastUpload.file.version}
                </div>
                {lastUpload.warnings.map((w) => (
                  <div key={w.code} style={{ color: "#a06a00" }}>
                    ⚠ {w.detail_tr}
                    <button
                      style={{ marginLeft: 8, minHeight: 32, cursor: "pointer" }}
                      disabled={busy || !ackBy.trim() || !ackReason.trim()}
                      onClick={() =>
                        void run(async () => {
                          await api.ackBriefWarning(view.brief.id, w.code, {
                            acknowledged_by: ackBy,
                            reason: ackReason,
                            source_file_version: lastUpload.file.version,
                          });
                          await reload(view.brief.id);
                        })
                      }
                    >
                      kayıtlı onay ver
                    </button>
                  </div>
                ))}
                {lastUpload.infos.map((i) => (
                  <div key={i.code} style={{ opacity: 0.7 }}>
                    ℹ {i.detail_tr}
                  </div>
                ))}
                {lastUpload.warnings.length > 0 && (
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <input
                      style={{ ...input, minHeight: 36 }}
                      placeholder="onaylayan (ör. operator:ayşe)"
                      value={ackBy}
                      onChange={(e) => setAckBy(e.target.value)}
                    />
                    <input
                      style={{ ...input, minHeight: 36 }}
                      placeholder="gerekçe"
                      value={ackReason}
                      onChange={(e) => setAckReason(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            {view.acknowledged.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 13 }}>
                <strong>Kayıtlı onaylar</strong>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  {view.acknowledged.map((a, i) => (
                    <li key={`${a.warning_code}-${i}`}>
                      {a.warning_code} — {a.acknowledged_by}: {a.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {files.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 13 }}>
                <strong>Yüklenen dosyalar</strong>
                {files.map((f) => (
                  <div key={f.id} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                    <span>
                      {f.role} v{f.version}
                    </span>
                    <button
                      style={{ minHeight: 32, cursor: "pointer" }}
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const res = await api.invalidateBriefFile(view.brief.id, f.id, {
                            reason: "dosya geçersiz (operatör bildirimi)",
                            recordedBy: ackBy.trim() || "operator",
                          });
                          setFiles((prev) => prev.filter((x) => x.id !== f.id));
                          setLastUpload(null);
                          await reload(view.brief.id);
                          if (res.regressed_to) setError(`İş geri düştü: ${res.regressed_to}`);
                        })
                      }
                    >
                      geçersiz işaretle
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DURUM GEÇİŞLERİ — karar sunucuda */}
          <div style={box}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Sonraki adım</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {view.next_states.length === 0 && (
                <span style={{ opacity: 0.7 }}>Şu an ilerlenebilecek adım yok (eksikleri kapatın).</span>
              )}
              {view.next_states.map((to) => (
                <button
                  key={to}
                  style={{ minHeight: 44, padding: "0 14px", cursor: "pointer" }}
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      setView(await api.transitionBrief(view.brief.id, { to }));
                    })
                  }
                >
                  → {to}
                </button>
              ))}
            </div>
            <p style={{ margin: "10px 0 0", fontSize: 12, opacity: 0.65 }}>
              Üretim incelemesi ve üretime-hazır adımları bu sürümde kapalıdır (P7).
            </p>
          </div>
        </>
      )}
    </div>
  );
}
