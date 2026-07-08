/* Dijital menü v1 (statik) — FAZ5-GOREV §9, mimar kararı #16.
   Katalog + marka kitinden TEK DOSYALIK mobil HTML üretir: satır içi CSS,
   HARİCİ İSTEK YOK (sistem font yığını; logo/foto gömülmez — file:// çevrimdışı
   açılır), kategori çapa navigasyonu, fiyatlar formatPrice ile, halal rozeti,
   saat/telefon, kit renkleri. Saf fonksiyon — Vitest'le doğrulanır. */

import type { ClientDTO } from "./schemas.js";
import { formatPrice } from "./utils.js";

/** HTML metin kaçışı — ürün adı/açıklaması gibi kullanıcı içeriği güvenli gömülür */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Fiyat varyantları → "7,50 €" (tek/seul) veya "menu 10,00 €" (etiketli), " · " ile */
function priceLine(prices: ClientDTO["catalog"]["categories"][number]["items"][number]["prices"], currency: ClientDTO["currency"]): string {
  return prices
    .map((p) => {
      const v = formatPrice(p.value, currency);
      return p.label && p.label !== "seul" ? `${esc(p.label)} ${v}` : v;
    })
    .join(" · ");
}

export function renderDigitalMenu(client: ClientDTO): string {
  const kit = client.brandkit;
  const c = kit.colors;
  const contact = kit.contact;
  const cats = [...client.catalog.categories]
    .sort((a, b) => a.order - b.order)
    .map((cat) => ({
      ...cat,
      items: [...cat.items].filter((i) => i.visible).sort((a, b) => a.order - b.order),
    }))
    .filter((cat) => cat.items.length > 0);

  const nav = cats
    .map((cat, i) => `<a href="#cat-${i}">${esc(cat.name_fr)}</a>`)
    .join("");

  const sections = cats
    .map((cat, i) => {
      const note = cat.note_fr ? `<p class="note">${esc(cat.note_fr)}</p>` : "";
      const items = cat.items
        .map((it) => {
          const desc = it.desc_fr ? `<div class="desc">${esc(it.desc_fr)}</div>` : "";
          const price = it.prices.length ? `<div class="price">${priceLine(it.prices, client.currency)}</div>` : "";
          return `<li><div class="it-main"><div class="name">${esc(it.name_fr)}</div>${desc}</div>${price}</li>`;
        })
        .join("");
      return `<section id="cat-${i}"><h2>${esc(cat.name_fr)}</h2>${note}<ul>${items}</ul></section>`;
    })
    .join("");

  const badge = kit.badges.halal ? `<span class="badge">HALAL</span>` : "";
  const slogan = kit.slogan_fr ? `<p class="slogan">${esc(kit.slogan_fr)}</p>` : "";
  const footBits = [
    contact.phone ? `☎ ${esc(contact.phone)}` : "",
    contact.hours ? esc(contact.hours) : "",
    contact.address ? esc(contact.address) : "",
  ].filter(Boolean);
  const foot = footBits.length ? `<p class="foot-contact">${footBits.join(" · ")}</p>` : "";
  const footnote = client.catalog.footnote_fr ? `<p class="footnote">${esc(client.catalog.footnote_fr)}</p>` : "";

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(client.name)} — Menu</title>
<style>
:root{--bg:${c.background};--panel:${c.secondary};--head:${c.primary};--text:${c.text};--accent:${c.accent}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.4}
header{background:var(--head);color:#fff;padding:20px 16px;text-align:center}
header h1{margin:0;font-size:26px;letter-spacing:.5px}
.slogan{margin:6px 0 0;opacity:.9;font-size:14px}
.badge{display:inline-block;margin-top:8px;padding:3px 10px;border:1px solid #fff;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:1px}
nav{position:sticky;top:0;background:var(--panel);color:#fff;display:flex;gap:6px;overflow-x:auto;padding:10px 12px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.15)}
nav a{color:#fff;text-decoration:none;font-size:14px;padding:4px 10px;border:1px solid rgba(255,255,255,.35);border-radius:999px;flex:0 0 auto}
main{max-width:680px;margin:0 auto;padding:12px 14px 40px}
section{margin:22px 0}
section h2{color:var(--head);border-bottom:2px solid var(--accent);padding-bottom:4px;margin:0 0 8px;font-size:20px}
.note{margin:0 0 8px;font-size:13px;opacity:.75;font-style:italic}
ul{list-style:none;margin:0;padding:0}
li{display:flex;justify-content:space-between;gap:12px;align-items:baseline;padding:9px 0;border-bottom:1px dotted rgba(128,128,128,.35)}
.name{font-weight:600}
.desc{font-size:13px;opacity:.75;margin-top:2px}
.price{white-space:nowrap;font-weight:700;color:var(--head)}
footer{max-width:680px;margin:0 auto;padding:0 14px 40px;text-align:center}
.foot-contact{font-size:14px;font-weight:600}
.footnote{font-size:12px;opacity:.65}
</style>
</head>
<body>
<header><h1>${esc(client.name)}</h1>${slogan}${badge}</header>
${nav ? `<nav>${nav}</nav>` : ""}
<main>${sections || `<p style="text-align:center;opacity:.6">Menu bientôt disponible.</p>`}</main>
<footer>${foot}${footnote}</footer>
</body>
</html>`;
}
