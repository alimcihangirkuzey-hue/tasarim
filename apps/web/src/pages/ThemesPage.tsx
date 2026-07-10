/* Ayarlar / Temalar — FAZ4-GOREV §7.
   Yerleşik 3 tema + brand kodda yaşar (silinemez); özel temalar DB'de,
   tüm müşterilerce kullanılır. Canlı önizleme GERÇEK grid şablonuyla
   yapılır (M3: tek render kaynağı) — kaydedilmemiş tokenler geçici
   "__preview__" kimliğiyle tanıtılır. */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DocumentStateSchema,
  ThemeTokensSchema,
  defaultBrandKit,
  defaultCatalog,
  type ClientDTO,
  type ThemeDTO,
  type ThemeTokens,
} from "@tezgah/shared";
import {
  FONT_META,
  PRESET_THEMES,
  TEMPLATES,
  registerCustomThemes,
  setPreviewTheme,
  themeFromTokens,
  type Theme,
} from "@tezgah/templates";
import { api } from "../api";
import { t } from "../i18n";
import { SettingsTabs } from "./ParseDictPage";

/* ---- önizleme için sabit demo verisi (müşteri verisine dokunulmaz) ---- */
function demoClient(): ClientDTO {
  const kit = defaultBrandKit();
  const catalog = defaultCatalog();
  catalog.categories = [
    {
      id: "c1", name_fr: "Sandwichs", order: 1,
      items: [
        { id: "i1", name_fr: "Döner Kebab", desc_fr: "Veau ou dinde, crudités", photo: null, prices: [{ label: "seul", value: 7.5 }, { label: "menu", value: 10 }], ingredients: [], tags: [], visible: true, order: 1 },
        { id: "i2", name_fr: "Assiette Grillades", desc_fr: "Brochettes, riz, salade", photo: null, prices: [{ label: "seul", value: 13.5 }], ingredients: [], tags: [], visible: true, order: 2 },
        { id: "i3", name_fr: "Tacos Mixte", desc_fr: "Sauce fromagère", photo: null, prices: [{ label: "seul", value: 8 }, { label: "menu", value: 10.5 }], ingredients: [], tags: [], visible: true, order: 3 },
      ],
    },
  ];
  return {
    id: "cli_demo", name: "Chez Demo", slug: "chez-demo", notes: "", currency: "EUR", menu_language: "fr",
    brandkit: kit, catalog, assets: [], created_at: "t", updated_at: "t",
  };
}

const DEMO_DOC = DocumentStateSchema.parse({
  template_id: "menu-grid-cells",
  theme_id: "__preview__",
  params: { cols: 3, format: "a4-portrait" },
});

/** Yerleşik temayı düzenlenebilir token setine çevir (kopyala-türet) */
function tokensFromTheme(th: Theme): ThemeTokens {
  const v = th.vars;
  const keyOf = (stack: string) =>
    (Object.entries(FONT_META).find(([, m]) => m.stack === stack)?.[0] ?? "inter") as ThemeTokens["fonts"]["heading"];
  return ThemeTokensSchema.parse({
    base: (th.id in PRESET_THEMES ? th.id : "or-noir") as ThemeTokens["base"],
    colors: {
      bg: v["--c-bg"], panel: v["--c-panel"], heading: v["--c-heading"], item: v["--c-item"],
      desc: v["--c-desc"], price: v["--c-price"], accent: v["--c-accent"], line: v["--c-line"],
    },
    fonts: {
      heading: keyOf(v["--f-heading"]), item: keyOf(v["--f-item"]),
      body: keyOf(v["--f-body"]), script: keyOf(v["--f-script"]),
    },
  });
}

const COLOR_FIELDS: Array<{ key: keyof ThemeTokens["colors"]; label: string }> = [
  { key: "bg", label: "Zemin" }, { key: "panel", label: "Panel" },
  { key: "heading", label: "Başlık" }, { key: "item", label: "Ürün adı" },
  { key: "desc", label: "Açıklama" }, { key: "price", label: "Fiyat" },
  { key: "accent", label: "Aksan" }, { key: "line", label: "Çizgi" },
];
const FONT_FIELDS: Array<{ key: keyof ThemeTokens["fonts"]; label: string }> = [
  { key: "heading", label: "Başlık fontu" }, { key: "item", label: "Ürün fontu" },
  { key: "body", label: "Gövde fontu" }, { key: "script", label: "El yazısı" },
];

export function ThemesPage() {
  const qc = useQueryClient();
  const themesQ = useQuery({ queryKey: ["themes"], queryFn: api.themes });
  const fontsQ = useQuery({ queryKey: ["fonts"], queryFn: api.fonts });
  /* seçici: yerleşik repo fontları + yüklenen özel aileler (mimar #18, §7) */
  const fontChoices = useMemo(() => {
    const repo = Object.entries(FONT_META).map(([value, m]) => ({ value, label: m.label }));
    const custom = (fontsQ.data ?? []).map((f) => ({ value: f.family, label: `${f.family} (yüklenen)` }));
    return [...repo, ...custom];
  }, [fontsQ.data]);
  /** seçili değer listede yoksa (silinmiş özel font) blank <select> olmasın diye ekle */
  const optionsFor = (current: string) =>
    fontChoices.some((c) => c.value === current)
      ? fontChoices
      : [...fontChoices, { value: current, label: `${current} (eksik)` }];

  /* editör durumu */
  const [editingId, setEditingId] = useState<string | null>(null); // null = yeni
  const [name, setName] = useState("");
  const [tokens, setTokens] = useState<ThemeTokens | null>(null);

  const openNew = (source?: Theme | ThemeDTO) => {
    if (source && "tokens" in source) {
      setName(`${source.name} (kopya)`);
      setTokens(source.tokens);
    } else if (source) {
      setName(`${source.name_tr} (kopya)`);
      setTokens(tokensFromTheme(source));
    } else {
      setName("Yeni tema");
      setTokens(tokensFromTheme(PRESET_THEMES["or-noir"]));
    }
    setEditingId(null);
  };
  const openEdit = (th: ThemeDTO) => {
    setEditingId(th.id);
    setName(th.name);
    setTokens(th.tokens);
  };

  /* canlı önizleme: kaydedilmemiş tokenler geçici temaya derlenir */
  const client = useMemo(demoClient, []);
  useEffect(() => {
    setPreviewTheme(tokens ? themeFromTokens("__preview__", name || "Önizleme", tokens) : null);
    return () => setPreviewTheme(null);
  }, [tokens, name]);

  const save = useMutation({
    mutationFn: () =>
      editingId
        ? api.updateTheme(editingId, { name, tokens: tokens! })
        : api.createTheme({ name, tokens: tokens! }),
    onSuccess: async () => {
      const list = await qc.fetchQuery({ queryKey: ["themes"], queryFn: api.themes });
      registerCustomThemes(list);
      setTokens(null);
      setEditingId(null);
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.deleteTheme(id),
    onSuccess: async () => {
      const list = await qc.fetchQuery({ queryKey: ["themes"], queryFn: api.themes });
      registerCustomThemes(list);
    },
  });

  const entry = TEMPLATES["menu-grid-cells"];
  const patchTokens = (fn: (t: ThemeTokens) => ThemeTokens) =>
    setTokens((prev) => (prev ? fn(prev) : prev));

  return (
    <div>
      <SettingsTabs active="themes" />
      <h2>{t("themes.title")}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 18, alignItems: "start" }}>
        {/* SOL: liste */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.values(PRESET_THEMES).map((th) => (
            <div key={th.id} className="row" style={{ border: "1px solid #e5e0d6", borderRadius: 10, padding: "8px 10px", gap: 8 }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: th.vars["--c-heading"], border: "1px solid #0002" }} />
              <span style={{ flex: 1, fontWeight: 600 }}>{th.name_tr}</span>
              <span className="pill">{t("themes.builtin")}</span>
              <button className="ghost small" onClick={() => openNew(th)}>{t("themes.derive")}</button>
            </div>
          ))}
          {(themesQ.data ?? []).map((th) => (
            <div key={th.id} className="row" style={{ border: "1px solid #e5e0d6", borderRadius: 10, padding: "8px 10px", gap: 8 }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: th.tokens.colors.heading, border: "1px solid #0002" }} />
              <span style={{ flex: 1, fontWeight: 600 }}>{th.name}</span>
              <button className="ghost small" onClick={() => openEdit(th)}>{t("themes.edit")}</button>
              <button className="ghost small" onClick={() => openNew(th)}>{t("themes.derive")}</button>
              <button
                className="ghost small"
                onClick={() => {
                  if (window.confirm(t("themes.delete_confirm"))) del.mutate(th.id);
                }}
              >✕</button>
            </div>
          ))}
          <button className="ghost" onClick={() => openNew()}>+ {t("themes.new")}</button>
        </div>

        {/* SAĞ: editör + canlı önizleme */}
        {tokens ? (
          <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ fontWeight: 700 }} />
              <label className="muted" style={{ fontSize: 12 }}>
                {t("themes.base")}{" "}
                <select
                  value={tokens.base}
                  onChange={(e) => patchTokens((tk) => ({ ...tk, base: e.target.value as ThemeTokens["base"] }))}
                >
                  {Object.values(PRESET_THEMES).map((p) => (
                    <option key={p.id} value={p.id}>{p.name_tr}</option>
                  ))}
                </select>
              </label>
              {COLOR_FIELDS.map((f) => (
                <label key={f.key} className="row" style={{ gap: 8, fontSize: 13 }}>
                  <input
                    type="color"
                    value={tokens.colors[f.key].slice(0, 7)}
                    onChange={(e) =>
                      patchTokens((tk) => ({ ...tk, colors: { ...tk.colors, [f.key]: e.target.value } }))
                    }
                  />
                  <span style={{ flex: 1 }}>{f.label}</span>
                  <code style={{ fontSize: 11 }}>{tokens.colors[f.key]}</code>
                </label>
              ))}
              {FONT_FIELDS.map((f) => (
                <label key={f.key} className="row" style={{ gap: 8, fontSize: 13 }}>
                  <span style={{ flex: 1 }}>{f.label}</span>
                  <select
                    value={tokens.fonts[f.key]}
                    onChange={(e) =>
                      patchTokens((tk) => ({ ...tk, fonts: { ...tk.fonts, [f.key]: e.target.value as ThemeTokens["fonts"]["heading"] } }))
                    }
                  >
                    {optionsFor(tokens.fonts[f.key]).map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </label>
              ))}
              <div className="row" style={{ gap: 8 }}>
                <button disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>
                  {editingId ? t("themes.save") : t("themes.create")}
                </button>
                <button className="ghost" onClick={() => { setTokens(null); setEditingId(null); }}>
                  {t("editor.cancel")}
                </button>
              </div>
              {save.isError && <span className="error">{(save.error as Error).message}</span>}
            </div>

            {/* canlı önizleme — gerçek şablon, 0.42 ölçek */}
            <div style={{ overflow: "hidden", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.25)", width: 216 * 0.42 * 3.7795, height: 303 * 0.42 * 3.7795 }}>
              <div style={{ transform: "scale(0.42)", transformOrigin: "top left", lineHeight: 0 }}>
                {entry && <entry.Component client={client} doc={DEMO_DOC} mode="print" pageIndex={0} cropMarks={false} />}
              </div>
            </div>
          </div>
        ) : (
          <p className="muted">{t("themes.pick_hint")}</p>
        )}
      </div>
    </div>
  );
}
