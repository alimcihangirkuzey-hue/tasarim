/* Arşiv içe alma rehberi — FAZ6-GOREV §6. Tek kaynak: docs/arsiv-ithalati.md
   (?raw ile gömülür → repo dokümanı ile UI aynı metin). Hafif markdown render. */

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import guideMd from "../../../../docs/arsiv-ithalati.md?raw";
import { SettingsTabs } from "./ParseDictPage";
import { t } from "../i18n";

/** Küçük markdown → JSX (başlık/liste/kalın/hr/blockquote). Kendi içeriğimiz — güvenli. */
function renderMarkdown(md: string) {
  const bold = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part
    );
  const out: ReactNode[] = [];
  let list: ReactNode[] = [];
  const flush = () => {
    if (list.length) { out.push(<ul key={`ul${out.length}`}>{list}</ul>); list = []; }
  };
  md.split("\n").forEach((line, i) => {
    if (/^###?\s/.test(line)) { flush(); const lv = line.startsWith("### ") ? 3 : 2; const txt = line.replace(/^#+\s/, ""); out.push(lv === 3 ? <h3 key={i}>{bold(txt)}</h3> : <h2 key={i}>{bold(txt)}</h2>); }
    else if (/^#\s/.test(line)) { flush(); out.push(<h1 key={i}>{bold(line.replace(/^#\s/, ""))}</h1>); }
    else if (/^---\s*$/.test(line)) { flush(); out.push(<hr key={i} />); }
    else if (/^>\s/.test(line)) { flush(); out.push(<blockquote key={i} style={{ borderLeft: "3px solid var(--c-accent,#c60)", margin: "8px 0", padding: "2px 12px", color: "var(--c-muted,#666)" }}>{bold(line.replace(/^>\s/, ""))}</blockquote>); }
    else if (/^[-*]\s/.test(line)) { list.push(<li key={i}>{bold(line.replace(/^[-*]\s/, ""))}</li>); }
    else if (line.trim() === "") { flush(); }
    else { flush(); out.push(<p key={i}>{bold(line)}</p>); }
  });
  flush();
  return out;
}

export function FactoryGuidePage() {
  return (
    <div>
      <SettingsTabs active="factory" />
      <p style={{ margin: "0 0 8px" }}>
        <Link to="/settings/factory">← {t("factory.title")}</Link>
      </p>
      <article style={{ maxWidth: 760, lineHeight: 1.55 }}>{renderMarkdown(guideMd)}</article>
    </div>
  );
}
