/* F1 pilot P4/C — MENÜ BRIEF akışı (ilk uçtan-uca tüketici).

   Neden ayrı sayfa: mevcut /siparis akışı (5 adım, localStorage taslağı,
   /api/intake commit'i) KATALOG odaklıdır; F1 brief'i AYRI bir yaşam
   döngüsüdür (durum makinesi + audit + dosya politikası). Aynı bileşene
   sıkıştırmak, GT-işaretli yüksek riskli dosyaya (IntakeProductsStep) dokunmayı
   ve taslak şemasını bozmayı gerektirirdi → SIFIR dokunuşla ayrı yüzey; giriş
   /siparis'ten görünür. intakeStore'a DOKUNULMADI → SCHEMA_VERSION bump YOK,
   kullanıcı taslakları ATILMAZ (P4 kutusundaki bump kalemi bu yüzden gereksiz
   kaldı — rapora yazıldı).

   EKSİK-BİLGİ ROZETİ (F1.2): sunucunun completeness çıktısı; kalıcı, gizlenemez,
   isimli. Durum geçişleri YALNIZ sunucu guard'ından geçer (istemci karar vermez). */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ClientDTO, ClientSummaryDTO } from "@tezgah/shared";
import { api, type BriefFileResult, type BriefView } from "../api";
import {
  capacityMessage,
  estimateCapacity,
  menuFormatOptions,
  parseFormatKey,
} from "../lib/specJoin";

const PUBLICATIONS: Array<{ id: string; label: string }> = [
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

const box: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: 12,
  marginBottom: 12,
  background: "#fff",
};
const label: React.CSSProperties = { display: "block", fontWeight: 600, marginBottom: 4, fontSize: 14 };
const input: React.CSSProperties = { width: "100%", minHeight: 44, padding: "8px 10px", fontSize: 15 };

export function MenuBriefPage() {
  const [clients, setClients] = useState<ClientSummaryDTO[]>([]);
  const [clientId, setClientId] = useState("");
  const [client, setClient] = useState<ClientDTO | null>(null);
  const [view, setView] = useState<BriefView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpload, setLastUpload] = useState<BriefFileResult | null>(null);
  const [files, setFiles] = useState<BriefFileResult["file"][]>([]);
  const [ackBy, setAckBy] = useState("");
  const [ackReason, setAckReason] = useState("");

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

  const spec = (view?.brief.spec_values ?? {}) as Record<string, string | number | undefined>;
  const selectedKey = spec.format ? `${spec.format_template ?? ""}:${spec.format}` : "";
  const selectedOption = formats.find((f) => f.key === selectedKey) ?? null;
  const capacity = estimateCapacity(client, selectedOption);
  const capMsg = capacityMessage(capacity);

  const patch = (body: Record<string, unknown>) =>
    run(async () => {
      if (!view) return;
      setView(await api.patchBrief(view.brief.id, body));
    });

  const publications = view?.brief.requested_publications ?? [];
  const printed = publications.includes("a4_print") || publications.includes("trifold");

  return (
    <div className="intake-page" style={{ maxWidth: 720 }}>
      <h1 style={{ marginBottom: 4 }}>Menü Briefi</h1>
      <p style={{ opacity: 0.7, marginTop: 0, fontSize: 14 }}>
        Üretim bilgisi eksikse tasarım başlayabilir; <strong>üretim kapısı</strong> eksiksiz
        olmadan açılmaz. <Link to="/siparis">← Sipariş görüşmesi</Link>
      </p>

      {error && (
        <div className="intake-warn full" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      {!view && (
        <div style={box}>
          <label style={label}>Müşteri (içerik iskeleti kataloğundan gelir)</label>
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
                const created = await api.createBrief({
                  request_type: "menu",
                  customer_ref: clientId,
                  content_reference: `catalog:${clientId}`,
                });
                setView(created);
              })
            }
          >
            Menü briefi aç
          </button>
        </div>
      )}

      {view && (
        <>
          {/* F1.2 — EKSİK BİLGİ ROZETİ: kalıcı, isimli, gizlenemez */}
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
                  <li key={m.id} style={{ marginBottom: 2 }}>
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
              İçerik iskeleti: {client ? `${client.name} kataloğu bağlı` : view.brief.content_reference}
            </p>
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

            {publications.includes("qr_image") && (
              <>
                <label style={{ ...label, marginTop: 12 }}>QR hedef adresi</label>
                <input
                  style={input}
                  defaultValue={String(spec.qr_target_url ?? "")}
                  onBlur={(e) => void patch({ spec_values: { qr_target_url: e.target.value } })}
                  placeholder="https://…"
                />
              </>
            )}

            {printed && (
              <>
                <label style={{ ...label, marginTop: 12 }}>Baskı adedi</label>
                <input
                  style={input}
                  type="number"
                  defaultValue={String(spec.print_quantity ?? "")}
                  onBlur={(e) =>
                    void patch({
                      spec_values: { print_quantity: e.target.value ? Number(e.target.value) : undefined },
                    })
                  }
                />
                <label style={{ ...label, marginTop: 12 }}>Baskı malzemesi</label>
                <input
                  style={input}
                  defaultValue={String(spec.print_material ?? "")}
                  onBlur={(e) => void patch({ spec_values: { print_material: e.target.value } })}
                  placeholder="kuşe 170gr…"
                />
              </>
            )}

            {!view.brief.brand_ref && (
              <>
                <label style={{ ...label, marginTop: 12 }}>Renk/font seçimi (marka referansı yok)</label>
                <input
                  style={input}
                  defaultValue={String(spec.color_font_choice ?? "")}
                  onBlur={(e) => void patch({ spec_values: { color_font_choice: e.target.value } })}
                  placeholder="ör. müşteri kiti renkleri + Anton/Inter"
                />
              </>
            )}

            <label style={{ ...label, marginTop: 12 }}>Logo dosyası (PNG · JPG · SVG · PDF)</label>
            <input
              style={{ ...input, padding: 8 }}
              type="file"
              accept=".png,.jpg,.jpeg,.svg,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void run(async () => {
                  const res = await api.uploadBriefFile(view.brief.id, "logo", file);
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
