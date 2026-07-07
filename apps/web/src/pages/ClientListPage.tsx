import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { t } from "../i18n";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ClientListPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");

  const clients = useQuery({ queryKey: ["clients"], queryFn: api.clients });

  const create = useMutation({
    mutationFn: api.createClient,
    onSuccess: (client) => {
      setName("");
      void qc.invalidateQueries({ queryKey: ["clients"] });
      navigate(`/clients/${client.id}`);
    },
  });

  return (
    <>
      <div className="pagehead">
        <h1>{t("nav.clients")}</h1>
        {clients.data && (
          <span className="muted">
            {clients.data.length} {t("clients.count")}
          </span>
        )}
      </div>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) create.mutate(name.trim());
        }}
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("clients.new_placeholder")}
          style={{ flex: 1, minWidth: 260 }}
        />
        <button type="submit" disabled={create.isPending || !name.trim()}>
          {t("clients.add")}
        </button>
      </form>
      {create.isError && <p className="error">{create.error.message}</p>}

      {clients.isLoading && <p className="muted">{t("common.loading")}</p>}
      {clients.isError && <p className="error">{t("common.error")}</p>}
      {clients.data?.length === 0 && <p className="muted">{t("clients.empty")}</p>}

      <div className="grid">
        {clients.data?.map((c) => (
          <Link key={c.id} to={`/clients/${c.id}`} className="card">
            <div className="avatar">
              {c.logo_thumb ? (
                <img src={c.logo_thumb} alt={c.name} />
              ) : (
                <span className="letter">{c.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="name">{c.name}</div>
            <div className="date">{fmtDate(c.updated_at)}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
