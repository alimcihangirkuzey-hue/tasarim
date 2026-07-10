import type {
  AssetDTO,
  ClientDTO,
  ClientSummaryDTO,
  DocumentDTO,
  DocumentState,
  DocumentSummaryDTO,
  ExportRecordDTO,
  OrderItemDTO,
  ProjectDTO,
} from "@tezgah/shared";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: init?.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      const body = (await res.json()) as { message?: string; error?: string; issues?: Array<{ message: string }> };
      msg = body.issues?.[0]?.message ?? body.message ?? body.error ?? msg;
    } catch {
      /* gövde json değilse durum kodu yeter */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export const api = {
  clients: () => http<ClientSummaryDTO[]>("/api/clients"),
  client: (id: string) => http<ClientDTO>(`/api/clients/${id}`),
  createClient: (name: string) =>
    http<ClientDTO>("/api/clients", { method: "POST", body: JSON.stringify({ name }) }),
  updateClient: (
    id: string,
    patch: {
      name?: string;
      notes?: string;
      currency?: ClientDTO["currency"];
      brandkit?: ClientDTO["brandkit"];
      catalog?: ClientDTO["catalog"];
    }
  ) => http<ClientDTO>(`/api/clients/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  deleteClient: (id: string) =>
    http<{ ok: true }>(`/api/clients/${id}`, { method: "DELETE" }),
  uploadAsset: (
    clientId: string,
    file: File,
    kind: "logo" | "photo",
    scope: "client" | "common" = "client"
  ) => {
    const fd = new FormData();
    fd.append("kind", kind); // ÖNEMLİ: alanlar dosyadan ÖNCE eklenmeli (multipart akış sırası)
    fd.append("scope", scope);
    fd.append("file", file);
    return http<AssetDTO>(`/api/clients/${clientId}/assets`, { method: "POST", body: fd });
  },

  /* Belgeler — Faz 1 */
  documents: (clientId: string) =>
    http<DocumentSummaryDTO[]>(`/api/clients/${clientId}/documents`),
  createDocument: (clientId: string, template_id: string, project_id?: string) =>
    http<DocumentDTO>(`/api/clients/${clientId}/documents`, {
      method: "POST",
      body: JSON.stringify({ template_id, project_id }),
    }),
  document: (id: string) => http<DocumentDTO>(`/api/documents/${id}`),
  updateDocument: (id: string, patch: Partial<DocumentState>) =>
    http<DocumentDTO>(`/api/documents/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  deleteDocument: (id: string) =>
    http<{ ok: true }>(`/api/documents/${id}`, { method: "DELETE" }),
  exportDocument: (id: string, warnings: unknown[] = []) =>
    http<ExportRecordDTO[]>(`/api/documents/${id}/export`, {
      method: "POST",
      body: JSON.stringify({ warnings }),
    }),
  documentExports: (id: string) =>
    http<ExportRecordDTO[]>(`/api/documents/${id}/exports`),

  /* Sipariş Defteri — Faz 2 */
  clientProjects: (clientId: string) => http<ProjectDTO[]>(`/api/clients/${clientId}/projects`),
  project: (id: string) => http<ProjectDTO>(`/api/projects/${id}`),
  createProject: (
    clientId: string,
    body: { name: string; due_date?: string | null; source_text?: string | null; items?: unknown[] }
  ) =>
    http<ProjectDTO>(`/api/clients/${clientId}/projects`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateProject: (id: string, patch: { name?: string; status?: string; due_date?: string | null }) =>
    http<ProjectDTO>(`/api/projects/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  deleteProject: (id: string) => http<{ ok: true }>(`/api/projects/${id}`, { method: "DELETE" }),
  addOrderItem: (projectId: string, item: unknown) =>
    http<OrderItemDTO>(`/api/projects/${projectId}/items`, {
      method: "POST",
      body: JSON.stringify(item),
    }),
  /** Durum kapısı 409 dönebilir: {status, missing} ile çözülür, throw etmez */
  updateOrderItem: async (
    id: string,
    patch: Record<string, unknown>
  ): Promise<{ item?: OrderItemDTO; missing?: string[] }> => {
    const res = await fetch(`/api/order-items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.status === 409) {
      const body = (await res.json()) as { missing?: string[] };
      return { missing: body.missing ?? [] };
    }
    if (!res.ok) throw new Error(String(res.status));
    return { item: (await res.json()) as OrderItemDTO };
  },
  deleteOrderItem: (id: string) =>
    http<{ ok: true }>(`/api/order-items/${id}`, { method: "DELETE" }),
  upcoming: () =>
    http<Array<{ id: string; client_id: string; client_name: string; name: string; due_date: string; open_items: number }>>(
      "/api/projects/upcoming"
    ),
  presentProject: (id: string, body: { document_ids?: string[]; note?: string }) =>
    http<ExportRecordDTO>(`/api/projects/${id}/present`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  projectExports: (id: string) => http<ExportRecordDTO[]>(`/api/projects/${id}/exports`),
  reveal: (filepath: string) =>
    http<{ ok: true }>("/api/reveal", { method: "POST", body: JSON.stringify({ filepath }) }),

  /* Mockup sahneleri — Faz 3 */
  clientScenes: (clientId: string) =>
    http<import("@tezgah/shared").MockupSceneDTO[]>(`/api/clients/${clientId}/scenes`),
  createScene: (clientId: string, body: unknown) =>
    http<import("@tezgah/shared").MockupSceneDTO>(`/api/clients/${clientId}/scenes`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateScene: (id: string, body: unknown) =>
    http<import("@tezgah/shared").MockupSceneDTO>(`/api/scenes/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteScene: (id: string) => http<{ ok: true }>(`/api/scenes/${id}`, { method: "DELETE" }),
  mockupDocument: (id: string, scene_id: string) =>
    http<ExportRecordDTO>(`/api/documents/${id}/mockup`, {
      method: "POST",
      body: JSON.stringify({ scene_id }),
    }),
  exportSvg: (id: string) =>
    http<ExportRecordDTO>(`/api/documents/${id}/export-svg`, { method: "POST", body: "{}" }),
  exportGarment: (id: string) =>
    http<{ record: ExportRecordDTO; files: string[] }>(`/api/documents/${id}/export-garment`, {
      method: "POST",
      body: "{}",
    }),

  /* CMYK — Faz 4 §13 (ADR-4) */
  cmykStatus: () => http<{ available: boolean; version: string | null }>(`/api/cmyk/status`),
  exportCmyk: (id: string) =>
    http<ExportRecordDTO>(`/api/documents/${id}/export-cmyk`, { method: "POST", body: "{}" }),

  /* Asset silme + preset — Faz 4 §11 */
  deleteAsset: (id: string) =>
    http<{ ok: true }>(`/api/assets/${id}`, { method: "DELETE" }),
  createOpeningKit: (clientId: string) =>
    http<{ project_id: string; items: number }>(`/api/clients/${clientId}/presets/opening`, {
      method: "POST", body: "{}",
    }),

  /* Parse sözlüğü — Faz 4 §10 */
  parseSynonyms: () =>
    http<Array<{ word: string; product_type: import("@tezgah/shared").ProductType }>>(`/api/parse-synonyms`),
  addParseSynonym: (word: string, product_type: string) =>
    http<{ word: string; product_type: string }>(`/api/parse-synonyms`, {
      method: "POST", body: JSON.stringify({ word, product_type }),
    }),
  deleteParseSynonym: (word: string) =>
    http<{ ok: true }>(`/api/parse-synonyms/${encodeURIComponent(word)}`, { method: "DELETE" }),

  /* Varlık etiketleri — Faz 4 §9 */
  updateAssetTags: (id: string, tags: string) =>
    http<AssetDTO>(`/api/assets/${id}`, { method: "PATCH", body: JSON.stringify({ tags }) }),

  /* Tema kütüphanesi — Faz 4 §7 */
  themes: () => http<import("@tezgah/shared").ThemeDTO[]>(`/api/themes`),
  createTheme: (body: { name: string; tokens: import("@tezgah/shared").ThemeTokens }) =>
    http<import("@tezgah/shared").ThemeDTO>(`/api/themes`, { method: "POST", body: JSON.stringify(body) }),
  updateTheme: (id: string, body: { name: string; tokens: import("@tezgah/shared").ThemeTokens }) =>
    http<import("@tezgah/shared").ThemeDTO>(`/api/themes/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteTheme: (id: string) => http<{ ok: true }>(`/api/themes/${id}`, { method: "DELETE" }),

  /* Kullanıcı fontları — Faz 5 §7 */
  fonts: () =>
    http<Array<{ id: string; family: string; filename: string; created_at: string }>>(`/api/fonts`),
  uploadFont: async (file: File, family: string) => {
    const fd = new FormData();
    fd.append("family", family);
    fd.append("file", file);
    return http<{ id: string; family: string; filename: string; created_at: string }>(`/api/fonts`, {
      method: "POST",
      body: fd,
    });
  },
  deleteFont: (id: string) => http<{ ok: true }>(`/api/fonts/${id}`, { method: "DELETE" }),

  /* Dijital menü (statik HTML) — Faz 5 §9 */
  digitalMenu: (clientId: string) =>
    http<ExportRecordDTO>(`/api/clients/${clientId}/menu-digital`, { method: "POST", body: "{}" }),
  digitalMenuHistory: (clientId: string) =>
    http<ExportRecordDTO[]>(`/api/clients/${clientId}/menu-digital/history`),

  /* Snapshot geri yükleme — Faz 4 §5 */
  restoreDocument: (id: string, exportId: string) =>
    http<{ document: DocumentDTO; safety_record_id: string }>(
      `/api/documents/${id}/restore/${exportId}`,
      { method: "POST", body: "{}" }
    ),

  /* Toplu fiyat + katalog geçmişi — Faz 4 §4 */
  bulkPrice: (clientId: string, op: import("@tezgah/shared").BulkPriceOp) =>
    http<{ applied: number; changes: import("@tezgah/shared").PriceChange[] }>(
      `/api/clients/${clientId}/catalog/bulk-price`,
      { method: "POST", body: JSON.stringify(op) }
    ),
  catalogHistory: (clientId: string) =>
    http<Array<{ id: string; reason: string; created_at: string; size: number }>>(
      `/api/clients/${clientId}/catalog/history`
    ),
  catalogRestore: (clientId: string, historyId: string) =>
    http<{ ok: true; restored_from: string }>(
      `/api/clients/${clientId}/catalog/restore/${historyId}`,
      { method: "POST", body: "{}" }
    ),
  /* Yapıştır-içe aktarma — Faz 5 §4 */
  catalogImport: (clientId: string, text: string, mode: "append" | "replace") =>
    http<{
      mode: string;
      applied_categories: number;
      applied_items: number;
      skipped: import("@tezgah/shared").ImportSkip[];
    }>(`/api/clients/${clientId}/catalog/import`, {
      method: "POST",
      body: JSON.stringify({ text, mode }),
    }),

  /* Klonlama — M6 */
  cloneClient: (id: string, body: { name: string; document_ids?: string[] }) =>
    http<{ id: string; cloned_documents: number }>(`/api/clients/${id}/clone`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  cloneDocument: (id: string, body: { target_client_id?: string; project_id?: string } = {}) =>
    http<{ document: DocumentDTO; dropped_overrides: string[] }>(`/api/documents/${id}/clone`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /* Sipariş Modu — Faz 7 (F7-B servis + F7-C intake) */
  sectors: () => http<import("@tezgah/shared").SectorPack[]>("/api/sectors"),
  ingredients: () => http<import("@tezgah/shared").ResolvedChip[]>("/api/ingredients"),
  createIngredient: (body: { tr: string; fr?: string; de?: string }) =>
    http<{ created: boolean; chip: import("@tezgah/shared").ResolvedChip }>("/api/ingredients", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchIngredient: (id: string, body: { fr?: string; de?: string }) =>
    http<{ chip: import("@tezgah/shared").ResolvedChip }>(`/api/ingredients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  /** Atomik intake commit (F7-C): müşteri yarat (yeni ise) + katalog + usage bump + kayıt */
  intakeCommit: (body: {
    client_id?: string;
    new_client?: { name: string; currency?: ClientDTO["currency"]; menu_language?: "fr" | "de" };
    answers: import("@tezgah/shared").IntakeAnswers;
    checklist?: Record<string, unknown>;
  }) =>
    http<{
      client_id: string;
      created_client: boolean;
      intake_id: string;
      applied_categories: number;
      catalog_had_categories: boolean;
      pending: Array<{ name: string; category: string }>;
      translationGaps: import("@tezgah/shared").ProjectionResult["translationGaps"];
      skipped_bumps: string[];
    }>("/api/intake", { method: "POST", body: JSON.stringify(body) }),
};
