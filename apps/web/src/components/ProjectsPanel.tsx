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
  type ClientDTO,
  type OrderItemDTO,
  type OrderStatus,
  type ParsedOrder,
  type ProductType,
  type ProjectDTO,
} from "@tezgah/shared";
import { api } from "../api";
import { t, tf } from "../i18n";

const TYPES: ProductType[] = [
  "menu", "flyer", "trifold", "fidelite", "vitrophanie", "tabela", "tisort", "onluk", "diger",
];
const STATUSES: OrderStatus[] = ["olcu_bekliyor", "tasarimda", "onayda", "uretimde", "teslim", "iptal"];
const TYPE_ICON: Record<ProductType, string> = {
  menu: "📋", flyer: "📄", trifold: "🗞", fidelite: "💳",
  vitrophanie: "🪟", tabela: "🪧", tisort: "👕", onluk: "🥽", diger: "📦",
};
/* Faz 3: tüm tipler gerçek akış (FAZ3-GOREV §7). "" → grid|liste seçimi sorulur */
const DESIGNABLE: Partial<Record<ProductType, string>> = {
  menu: "",
  trifold: "menu-trifold",
  flyer: "flyer",
  fidelite: "carte-fidelite",
  vitrophanie: "vitro-centre",
  tabela: "enseigne-panneau",
  tisort: "garment",
  onluk: "garment",
};

/** Kalem verileri belge paramlarına akar (ölçü, mode, miroir önerisi, teknik) */
function paramsFromItem(item: OrderItemDTO): Record<string, unknown> | null {
  switch (item.product_type) {
    case "vitrophanie":
      return {
        w_cm: item.width_cm ?? 100,
        h_cm: item.height_cm ?? 100,
        mode: item.details.mode ?? "impression",
        miroir: item.details.side === "interieur", // içten uygulama → otomatik öneri
      };
    case "tabela":
      return { w_cm: item.width_cm ?? 300, h_cm: item.height_cm ?? 60 };
    case "tisort":
      return {
        garment_kind: "tshirt",
        technique: item.details.technique ?? "impression",
        areas: ["chest_left", "back_full"],
      };
    case "onluk":
      return {
        garment_kind: "apron_bavette",
        technique: item.details.technique ?? "impression",
        areas: ["chest"],
      };
    default:
      return null;
  }
}

function itemSummary(it: OrderItemDTO): string {
  const parts: string[] = [];
  if (it.width_cm && it.height_cm) parts.push(`${it.width_cm}×${it.height_cm} cm`);
  if (it.details.format) parts.push(String(it.details.format).toUpperCase());
  if (it.qty > 1) parts.push(`${it.qty} ${t("orders.qty")}`);
  if (it.details.mode) parts.push(it.details.mode);
  if (it.details.side) parts.push(it.details.side);
  if (it.details.technique) parts.push(it.details.technique);
  return parts.join(" · ");
}

function ItemRow({ item, client, showToast }: {
  item: OrderItemDTO;
  client: ClientDTO;
  showToast: (m: string) => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
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
      let templateId = DESIGNABLE[item.product_type];
      if (templateId === undefined) {
        showToast(t("orders.phase3_warn"));
        return null;
      }
      if (templateId === "") {
        templateId = window.confirm(t("orders.menu_template_q")) ? "menu-grid-cells" : "menu-liste-premium";
      }
      const doc = await api.createDocument(client.id, templateId, item.project_id);
      const params = paramsFromItem(item);
      if (params) await api.updateDocument(doc.id, { params });
      await api.updateOrderItem(item.id, { document_id: doc.id, status: "tasarimda" });
      return doc.id;
    },
    onSuccess: (docId) => {
      invalidate();
      if (docId) navigate(`/editor/${docId}`);
    },
  });

  const missing = missingFields(item);
  const num = (v: string) => (v === "" ? null : Number(v));

  return (
    <div className="item-card">
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

      {/* tip bazlı alan editörleri — eksikler kırmızı çerçeveli */}
      <div className="row" style={{ gap: 6, fontSize: 12 }}>
        {(item.product_type === "vitrophanie" || item.product_type === "tabela") && (
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
        {item.product_type === "vitrophanie" && (
          <>
            <select value={item.details.side ?? ""} className={missing.includes("side") ? "field-missing" : ""}
              onChange={(e) => upd.mutate({ details: { ...item.details, side: e.target.value || undefined } })}>
              <option value="">yön?</option>
              <option value="exterieur">dıştan</option>
              <option value="interieur">içten</option>
            </select>
            <select value={item.details.mode ?? ""} className={missing.includes("mode") ? "field-missing" : ""}
              onChange={(e) => upd.mutate({ details: { ...item.details, mode: e.target.value || undefined } })}>
              <option value="">mod?</option>
              <option value="impression">baskı</option>
              <option value="decoupe">kesim</option>
            </select>
          </>
        )}
        {(item.product_type === "tisort" || item.product_type === "onluk") && (
          <>
            <input type="number" min={1} defaultValue={item.qty}
              className={missing.includes("qty") ? "field-missing" : ""}
              onBlur={(e) => upd.mutate({ qty: Number(e.target.value) || 1 })} style={{ width: 70 }} />
            <select value={item.details.technique ?? ""} className={missing.includes("technique") ? "field-missing" : ""}
              onChange={(e) => upd.mutate({ details: { ...item.details, technique: e.target.value || undefined } })}>
              <option value="">teknik?</option>
              <option value="impression">baskı</option>
              <option value="broderie">nakış</option>
            </select>
            <input type="text" placeholder="bedenler (M:2, L:3)" defaultValue={item.details.sizes ?? ""}
              onBlur={(e) => upd.mutate({ details: { ...item.details, sizes: e.target.value || undefined } })}
              style={{ width: 140 }} />
          </>
        )}
        {["menu", "trifold", "flyer", "fidelite"].includes(item.product_type) && (
          <input type="text" placeholder="format (a4/a3/21x21...)" defaultValue={item.details.format ?? ""}
            className={missing.includes("format") ? "field-missing" : ""}
            onBlur={(e) => upd.mutate({ details: { ...item.details, format: e.target.value || undefined } })}
            style={{ width: 150 }} />
        )}
        {item.notes && (
          <span className="muted" title={item.notes} style={{ fontStyle: "italic" }}>
            📝 {item.notes.split("\n")[0].slice(0, 48)}{item.notes.length > 48 ? "…" : ""}
          </span>
        )}
      </div>
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
        <button className="ghost" onClick={() => setParsed(parseOrderText(text))} disabled={!text.trim()}>
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
          {parsed.items.map((it, i) => (
            <div key={i} className="row" style={{ fontSize: 13, gap: 6 }}>
              <span>{TYPE_ICON[it.product_type]}</span>
              <strong>{t(`orders.type_${it.product_type}`)}</strong>
              {it.width_cm && it.height_cm && <span>{it.width_cm}×{it.height_cm} cm</span>}
              {it.details.format && <span>{String(it.details.format).toUpperCase()}</span>}
              {it.qty > 1 && <span>{it.qty} {t("orders.qty")}</span>}
              {it.details.side && <span className="pill">{it.details.side}</span>}
              {it.details.mode && <span className="pill">{it.details.mode}</span>}
              {it.notes && <span className="muted" style={{ fontStyle: "italic" }}>📝 {it.notes.split("\n")[0]}</span>}
            </div>
          ))}
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
  const [newType, setNewType] = useState<ProductType>("menu");
  const today = new Date().toISOString().slice(0, 10);
  const level = dueLevel(project.due_date, today);

  const updProject = useMutation({
    mutationFn: (patch: { due_date?: string | null; name?: string }) => api.updateProject(project.id, patch),
    onSuccess: invalidate,
  });
  const delProject = useMutation({
    mutationFn: () => api.deleteProject(project.id),
    onSuccess: invalidate,
  });
  const addItem = useMutation({
    mutationFn: () => api.addOrderItem(project.id, { product_type: newType }),
    onSuccess: invalidate,
  });
  const present = useMutation({
    mutationFn: () => {
      const note = window.prompt(
        t("orders.present_note_prompt"),
        "Toute modification après signature fera l'objet d'une nouvelle facturation."
      );
      return api.presentProject(project.id, { note: note ?? "" });
    },
    onSuccess: (rec) => {
      showToast(tf("orders.present_done", { n: rec.version }));
      window.open("/" + rec.filepath.replace(/^data\//, ""), "_blank");
    },
    onError: (e) => showToast((e as Error).message === "400" ? t("orders.no_docs") : (e as Error).message),
  });

  return (
    <div className="cat-block" style={{ borderLeft: level === "red" ? "4px solid #DC2626" : level === "yellow" ? "4px solid #F59E0B" : undefined }}>
      <div className="row">
        <strong style={{ fontSize: 15 }}>{project.name}</strong>
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
        <select value={newType} onChange={(e) => setNewType(e.target.value as ProductType)}>
          {TYPES.map((tp) => (
            <option key={tp} value={tp}>{t(`orders.type_${tp}`)}</option>
          ))}
        </select>
        <button className="ghost small" onClick={() => addItem.mutate()}>{t("orders.add_item")}</button>
      </div>
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
