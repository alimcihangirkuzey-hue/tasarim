import type {
  AssetDTO,
  ClientDTO,
  ClientSummaryDTO,
  DocumentDTO,
  DocumentState,
  DocumentSummaryDTO,
  ExportRecordDTO,
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
  updateClient: (id: string, patch: { name?: string; notes?: string }) =>
    http<ClientDTO>(`/api/clients/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  deleteClient: (id: string) =>
    http<{ ok: true }>(`/api/clients/${id}`, { method: "DELETE" }),
  uploadAsset: (clientId: string, file: File, kind: "logo" | "photo") => {
    const fd = new FormData();
    fd.append("kind", kind); // ÖNEMLİ: alanlar dosyadan ÖNCE eklenmeli (multipart akış sırası)
    fd.append("file", file);
    return http<AssetDTO>(`/api/clients/${clientId}/assets`, { method: "POST", body: fd });
  },

  /* Belgeler — Faz 1 */
  documents: (clientId: string) =>
    http<DocumentSummaryDTO[]>(`/api/clients/${clientId}/documents`),
  createDocument: (clientId: string, template_id: string) =>
    http<DocumentDTO>(`/api/clients/${clientId}/documents`, {
      method: "POST",
      body: JSON.stringify({ template_id }),
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
};
