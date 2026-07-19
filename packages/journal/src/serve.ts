#!/usr/bin/env node
/* Cockpit modül fazı 1 — SALT-OKUNUR SUNUCU (Canonical 11.1/11.4/11.6).

   GELİŞTİRME ARACI, ÜRÜN DEĞİL (11.1). Ürün sunucusuna rota eklenmez, ürün web
   paketine bayt eklenmez, yeni bağımlılık gelmez: yalnız node: çekirdeği. Bu
   dosya index.ts barrel'ının DIŞINDADIR — cli.ts ile aynı sebeple: export
   edilseydi @tezgah/journal'ı import eden her yer bir sunucu gövdesi yüklerdi.

   SALT-OKUNUR (11.4 modül fazı 1). İki kısıt yapıya gömülüdür, üsluba değil:

   · YALNIZ GET. Başka her yöntem 405 döner. Faz 1'in "hiçbir işlem düğmesi
     yoktur" hükmü, gövdesi boş bir POST ucunun bile bulunmamasıyla sağlanır;
     ileride bir eylem eklenecekse 11.6'nın kapısı düğmenin İÇİNDE olmalıdır
     ve o karar bu fazın dışındadır.
   · YALNIZ YEREL. Dinleme adresi 127.0.0.1'e sabittir. 0.0.0.0, geliştirme
     kaydını ağdaki herkese açardı; bu yüzeyin kimlik doğrulaması YOKTUR.

   Journal'a YAZMAZ: bu dosyada tek bir yazma çağrısı yoktur, appendEvent
   import bile edilmez.

   ÖNBELLEK YOK: görünüm her istekte yeniden kurulur (cockpit.ts). Sayfa
   yenilendiğinde ekrandaki değer diskteki değerdir. */

import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { cockpitGorunumu, type CockpitCiktisi, type OkumaHatasi } from "./cockpit.js";
import { renderCockpitPage } from "./page.js";

/** Ağa açılmaz — 11.1'in "geliştirme aracı" sınırının teknik karşılığı */
export const COCKPIT_HOST = "127.0.0.1";
export const COCKPIT_VARSAYILAN_PORT = 3002;

const IZINLI_YONTEM = "GET";

/* ── HTML yardımcıları ────────────────────────────────────────────────── */

function kacir(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Düşen okumaların GÖRÜNÜR karşılığı.
 *
 * Sayfa gövdesini page.ts üretir; bu bant onun DIŞINDA, sunucu katmanında
 * kurulur. Sebep kapsam sınırıdır: okuma arızasının görünürlüğü render
 * ediciye devredilseydi, o dosyanın bir gün hatayı çizmemeye başlaması
 * sessiz yutmayı geri getirirdi. Bant yalnız hata VARKEN vardır.
 */
function hataBandi(hatalar: readonly OkumaHatasi[]): string {
  if (hatalar.length === 0) return "";
  const satirlar = hatalar
    .map((h) => `<li><code>${kacir(h.kaynak)}</code> — ${kacir(h.mesaj)}</li>`)
    .join("");
  return (
    `<div id="cockpit-okuma-hatalari" role="alert" ` +
    `style="border:2px solid #b00020;background:#fff3f3;color:#5c0011;` +
    `padding:12px 16px;margin:0 0 16px;font:14px/1.5 ui-monospace,monospace">` +
    `<strong>OKUNAMAYAN KAYNAK (${hatalar.length})</strong>` +
    `<ul style="margin:8px 0 0;padding-left:20px">${satirlar}</ul>` +
    `</div>`
  );
}

/** Bandı gövdenin başına yerleştirir; <body> yoksa belgenin önüne koyar. */
function bandiYerlestir(html: string, bant: string): string {
  if (bant.length === 0) return html;
  const m = /<body[^>]*>/i.exec(html);
  if (m === null) return bant + html;
  const kesim = m.index + m[0].length;
  return html.slice(0, kesim) + bant + html.slice(kesim);
}

function hataSayfasi(baslik: string, detay: string): string {
  return (
    `<!doctype html><html lang="tr"><head><meta charset="utf-8">` +
    `<title>Cockpit — ${kacir(baslik)}</title></head><body>` +
    `<h1>${kacir(baslik)}</h1><pre style="white-space:pre-wrap">${kacir(detay)}</pre>` +
    `</body></html>`
  );
}

const mesaj = (e: unknown): string => (e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e));

/* ── Yanıt ────────────────────────────────────────────────────────────── */

function yanitla(
  res: http.ServerResponse,
  kod: number,
  tur: string,
  govde: string,
  ekBaslik: Readonly<Record<string, string>> = {}
): void {
  res.writeHead(kod, {
    "content-type": `${tur}; charset=utf-8`,
    "content-length": Buffer.byteLength(govde, "utf8"),
    /* Tarayıcı önbelleği, "her istekte diskten oku" kuralını dışarıdan
       delerdi: sayfa yenilenir ama gösterilen değer eski kalırdı. */
    "cache-control": "no-store",
    ...ekBaslik,
  });
  res.end(govde);
}

const json = (res: http.ServerResponse, kod: number, deger: unknown): void =>
  yanitla(res, kod, "application/json", `${JSON.stringify(deger, null, 2)}\n`);

/* ── Yönlendirme ──────────────────────────────────────────────────────── */

function yol(req: http.IncomingMessage): string {
  /* Taban yalnız göreli yolu çözmek için; istekteki Host başlığı KULLANILMAZ */
  const p = new URL(req.url ?? "/", `http://${COCKPIT_HOST}`).pathname;
  return p.length > 1 && p.endsWith("/") ? p.replace(/\/+$/, "") : p;
}

function istek(req: http.IncomingMessage, res: http.ServerResponse): void {
  if (req.method !== IZINLI_YONTEM) {
    /* 11.4: bu faz eylem üretmez. Yazan yöntem YOK — reddedilir, yoksayılmaz.
       `allow` başlığı writeHead ile BİRLİKTE gider: başlık yanıttan sonra
       eklenemez (ERR_HTTP_HEADERS_SENT) ve sessizce düşerdi. */
    yanitla(
      res,
      405,
      "application/json",
      `${JSON.stringify(
        {
          hata: `yöntem kapalı: ${req.method ?? "(yok)"} — Cockpit modül fazı 1 SALT-OKUNURDUR (Canonical 11.4)`,
          izinli: [IZINLI_YONTEM],
        },
        null,
        2
      )}\n`,
      { allow: IZINLI_YONTEM }
    );
    return;
  }

  const p = yol(req);

  if (p === "/saglik") {
    json(res, 200, { ok: true });
    return;
  }

  if (p === "/api/view") {
    /* Denetim ucu: sayfanın çizdiği ile ölçülen aynı nesnedir */
    json(res, 200, cockpitGorunumu());
    return;
  }

  if (p === "/") {
    const gorunum: CockpitCiktisi = cockpitGorunumu();
    let sayfa: string;
    try {
      sayfa = renderCockpitPage(gorunum);
    } catch (e) {
      /* Render düşerse ölçüm KAYBOLMAZ: ham görünüm sayfada kalır (11.3) */
      yanitla(
        res,
        500,
        "text/html",
        bandiYerlestir(
          hataSayfasi("sayfa çizilemedi", `${mesaj(e)}\n\n${JSON.stringify(gorunum, null, 2)}`),
          hataBandi(gorunum.hatalar.deger)
        )
      );
      return;
    }
    yanitla(res, 200, "text/html", bandiYerlestir(sayfa, hataBandi(gorunum.hatalar.deger)));
    return;
  }

  json(res, 404, { hata: `bilinmeyen yol: ${p}`, uclar: ["/", "/api/view", "/saglik"] });
}

/* ── Sunucu ───────────────────────────────────────────────────────────── */

/**
 * Dinlemeye başlayan bir sunucu döner. Port 0 verilirse işletim sistemi boş
 * bir port atar (testler bunu kullanır; sabit port paralel koşumda çakışırdı).
 *
 * Adres parametre DEĞİLDİR: 127.0.0.1 imzanın dışında tutuldu ki bir çağıran
 * onu genişletemesin.
 */
export function cockpitSunucusu(port: number): http.Server {
  const server = http.createServer((req, res) => {
    try {
      istek(req, res);
    } catch (e) {
      /* Beklenmeyen arıza bile SESSİZ DEĞİL: hem yanıtta hem stderr'de görünür */
      process.stderr.write(`cockpit: istek düştü (${req.method ?? "?"} ${req.url ?? "?"}): ${mesaj(e)}\n`);
      if (res.headersSent) {
        res.end();
        return;
      }
      yanitla(res, 500, "text/html", hataSayfasi("istek düştü", mesaj(e)));
    }
  });
  server.listen(port, COCKPIT_HOST);
  return server;
}

/** PORT env'i; geçersizse varsayılan. Sessizce 0'a düşmez, uyarır. */
function portSec(ham: string | undefined): number {
  if (ham === undefined || ham.trim().length === 0) return COCKPIT_VARSAYILAN_PORT;
  const n = Number.parseInt(ham, 10);
  if (!Number.isInteger(n) || n < 0 || n > 65535 || String(n) !== ham.trim()) {
    process.stderr.write(`cockpit: PORT çözülemedi (${JSON.stringify(ham)}) — ${COCKPIT_VARSAYILAN_PORT} kullanılıyor\n`);
    return COCKPIT_VARSAYILAN_PORT;
  }
  return n;
}

/* ── Giriş noktası ────────────────────────────────────────────────────── */

/** Bu dosya DOĞRUDAN mı çalıştırıldı? (import edildiğinde sunucu açılmamalı) */
function dogrudanCalisiyor(): boolean {
  const giris = process.argv[1];
  if (giris === undefined) return false;
  const norm = (s: string): string => {
    const r = path.resolve(s);
    return process.platform === "win32" ? r.toLowerCase() : r;
  };
  return norm(giris) === norm(fileURLToPath(import.meta.url));
}

if (dogrudanCalisiyor()) {
  const port = portSec(process.env.PORT);
  const server = cockpitSunucusu(port);
  server.on("listening", () => {
    const adres = server.address();
    const gercek = adres !== null && typeof adres === "object" ? adres.port : port;
    process.stdout.write(`cockpit (salt-okunur) → http://${COCKPIT_HOST}:${gercek}/\n`);
  });
  server.on("error", (e) => {
    process.stderr.write(`cockpit: dinlenemedi (${COCKPIT_HOST}:${port}): ${mesaj(e)}\n`);
    process.exitCode = 1;
  });
}
