#!/usr/bin/env node
/* Cockpit modül fazı 0 — CLI KABUĞU (Canonical 11.3 / 11.4 "Ekran yok").

   İNCE kabuk: karar mantığı YOKTUR. Ayrıştırma argv.ts'te, ölçüm gates.ts'te,
   yazma store.ts'te, bütünlük verify.ts'te yaşar. Buradaki tek iş, ayrıştırılmış
   komutu ilgili modüle bağlamak ve sonucu stdout'a yazmaktır.

   EKRAN YOK · HTTP YOK · ROTA YOK — modül fazı 0'ın kapsamı budur (11.4).

   Bu dosya index.ts barrel'ından BİLEREK dışarıdadır: export edilseydi
   @tezgah/journal'ı import eden her yerde CLI gövdesi çalışırdı. */

import process from "node:process";

import {
  foldPackageJournal,
  isValidStageTransition,
  type JournalEvent,
  type JournalGateRun,
} from "@tezgah/shared";

import { parseJournalArgv, type ParsedJournalCommand } from "./argv.js";
import { runGate } from "./gates.js";
import {
  calismaAgaciYollari,
  commitYollari,
  mtimeliDosyalar,
  olcumdenSonraDegisenler,
} from "./olcum-sirasi.js";
import { ROOT_DIR } from "./paths.js";
import { appendEvent, readJournal } from "./store.js";
import { verifyAllJournals } from "./verify.js";

const yaz = (s: string): void => void process.stdout.write(`${s}\n`);
const uyar = (s: string): void => void process.stderr.write(`${s}\n`);

/** Paketin EN SON kapı koşumunun anı — hiç kapı koşulmamışsa `null`. */
function sonOlcumAni(packageId: string): string | null {
  const rec = foldPackageJournal(readJournal(packageId));
  const anlar = Object.values(rec.gates)
    .map((g) => g?.measured_at)
    .filter((s): s is string => typeof s === "string")
    .sort();
  return anlar.length === 0 ? null : anlar[anlar.length - 1]!;
}

/**
 * Paketin EN SON kapı koşumundan SONRA değişmiş dosyalar.
 *
 * Karar `olcum-sirasi.ts`'te SAF olarak yaşar; buradaki iş yalnız iki ölçülmüş
 * değeri toplamaktır: kapının `measured_at`'i ve dosyaların disk mtime'ı. Git
 * yoksa/çalışmıyorsa kapı SESSİZCE AÇILMAZ ama DURDURMAZ da — ölçemediği bir
 * şey hakkında yargı üretmek, bu deponun "sayı uydurma" yasağının ta kendisi
 * olurdu.
 *
 * İKİ ÇAĞRI YERİ, TEK KURAL:
 *   · `stage --to hazir` → çalışma ağacındaki değişiklikler
 *   · `git --kind commit` → COMMIT'İN dokunduğu dosyalar. Commit mtime'ları
 *     DEĞİŞTİRMEZ, yani "hazır olduktan sonra düzenle ve commit et" yolu
 *     commit'ten sonra bile ölçülebilir kalır (bulgu `K-SIRA-3`).
 */
function olcumdenSonraDegisenDosyalar(packageId: string, yollar: readonly string[]): string[] {
  const sonOlcum = sonOlcumAni(packageId);
  if (sonOlcum === null) return []; /* hiç kapı koşulmamış — söyleyecek şey yok */
  return olcumdenSonraDegisenler(sonOlcum, mtimeliDosyalar(ROOT_DIR, yollar));
}

function main(): void {
  const komut = parseJournalArgv(process.argv.slice(2));

  switch (komut.cmd) {
    case "error":
      uyar(`journal: ${komut.message}`);
      process.exitCode = 2;
      return;

    case "verify": {
      const ihlaller = verifyAllJournals();
      if (ihlaller.length === 0) {
        yaz("journal: dört katman temiz (kaynak · git · yapi · zincir).");
        return;
      }
      /* SINIF GÖRÜNÜR: "ölçülemedi" bir yönetişim kırılması DEĞİLDİR ama
         YEŞİL de değildir — bilinmezlik bir kapıda geçer not olamaz. Değişen
         tek şey, kırmızının kendini açıklaması (R-FLAKY-TEST-01). */
      for (const i of ihlaller) yaz(`${i.sinif}\t${i.layer}\t${i.package_id}\t${i.message}`);
      const kirilan = ihlaller.filter((i) => i.sinif === "ihlal").length;
      const olculemeyen = ihlaller.length - kirilan;
      yaz(
        olculemeyen === 0
          ? `journal: ${kirilan} ihlal.`
          : `journal: ${kirilan} ihlal · ${olculemeyen} ölçülemedi (denetim koşturulamadı — ihlal kanıtı DEĞİL).`,
      );
      process.exitCode = 1;
      return;
    }

    case "show": {
      /* Paket kaydının DOSYASI YOKTUR: her okumada olay akışından türetilir (11.3) */
      yaz(JSON.stringify(foldPackageJournal(readJournal(komut.packageId)), null, 2));
      return;
    }

    case "declare":
      olayYaz(komut.packageId, { type: "package_declared", payload: komut.payload }, komut);
      return;

    case "stage": {
      /* `from` KULLANICIDAN ALINMAZ — olay akışından türetilir (11.3). Elle
         verilebilseydi, geçiş geçmişi uydurulabilir ve aşama sessizce ileri
         atlatılabilirdi. */
      const from = foldPackageJournal(readJournal(komut.packageId)).stage;
      if (!isValidStageTransition(from, komut.to)) {
        uyar(
          `journal: geçersiz aşama geçişi ${String(from)} → ${komut.to}. ` +
            `İleri geçiş TAM BİR ADIM olmalıdır; geriye dönüş serbesttir (Canonical 11.5).`
        );
        process.exitCode = 2;
        return;
      }
      /* ÖLÇÜM SIRASI KAPISI (bulgu `K-SIRA-1`): "hazir" paketin ölçülmüş
         sayıldığı aşamadır. Kapı koştuktan SONRA değiştirilmiş bir dosya
         varsa, kayıtlı kapı sonucu commit edilecek ağacı TARİF ETMEZ — bu
         depo o hatayı bir kez ödedi (bir tur boyunca defter yanlış söyledi).
         Kural yalnız ileri geçişte işler; geriye dönüş serbesttir. */
      if (komut.to === "hazir") {
        const gec = olcumdenSonraDegisenDosyalar(komut.packageId, calismaAgaciYollari(ROOT_DIR));
        if (gec.length > 0) {
          uyar(
            `journal: ÖLÇÜM SIRASI — şu dosya(lar) son kapı koşumundan SONRA değişti:\n` +
              gec.map((y) => `  · ${y}`).join("\n") +
              `\nKapıları YENİDEN koşun; kayıtlı sonuç commit edilecek ağacı tarif etmiyor.`
          );
          process.exitCode = 2;
          return;
        }
      }
      olayYaz(komut.packageId, { type: "stage_changed", payload: { from, to: komut.to } }, komut);
      return;
    }

    case "gate": {
      if (komut.human === null) {
        /* MAKİNE KAPISI — sonuç yalnız burada, gerçek koşumdan doğar */
        const run = runGate(komut.gate);
        const satir = olayYaz(komut.packageId, { type: "gate_run", payload: run }, komut);
        if (satir !== null) {
          yaz(
            `kapı ${run.gate}: ${run.outcome}` +
              (run.exit_code === null ? "" : ` (exit ${run.exit_code})`) +
              (run.values === null ? "" : ` ${JSON.stringify(run.values)}`)
          );
        }
        /* Kalan kapı süreci sessizce başarılı bitiremez */
        if (run.outcome === "kaldi") process.exitCode = 1;
        return;
      }
      const olculdu = komut.human.outcome === "gecti" || komut.human.outcome === "kaldi";
      const run: JournalGateRun = {
        gate: komut.gate,
        outcome: komut.human.outcome,
        /* İnsan turu bir GÖZLEMDİR; values null olduğu için origin burada
           sayısal bir iddia taşımaz — kaydın taşıyıcısı evidence'tır. */
        origin: "olculdu",
        command: null, // 11.6/3: insan kapısı komuta bağlanamaz
        cwd: null,
        tool: null,
        /* İnsan turunun KOŞTUĞU makine ve AN CLI'ya bilinmiyor. Kayıt anını
           ölçüm anı diye yazmak, 11.3'ün yasakladığı "ölçüm gibi görünen
           değer"in tam örneği olurdu — bu yüzden null. */
        runner_platform: null,
        exit_code: null,
        measured_at: null,
        duration_ms: null,
        values: null,
        method: null,
        evidence: komut.human.evidence,
        reason: komut.human.reason,
        raw_evidence: null,
        raw_sha256: null,
      };
      const satir = olayYaz(komut.packageId, { type: "gate_run", payload: run }, komut);
      if (satir !== null) yaz(`kapı ${run.gate}: ${run.outcome} (kanıt: ${run.evidence})`);
      if (olculdu && run.outcome === "kaldi") process.exitCode = 1;
      return;
    }

    case "git": {
      /* ÖLÇÜM SIRASININ İKİNCİ YARISI (bulgu `K-SIRA-3`): `hazir` kapısı
         yalnız o GEÇİŞTE bakar; paket hazır olduktan SONRA dosya değiştirip
         commit etmek hâlâ mümkündü ve onu tutan tek şey disiplindi. Commit
         dosya mtime'larını DEĞİŞTİRMEZ, dolayısıyla aynı kural commit'ten
         sonra da uygulanabilir: commit'in dokunduğu bir dosya son kapı
         koşumundan yeniyse, kaydedilecek commit ölçülmemiş bir ağaçtır. */
      if (komut.kind === "commit") {
        const gec = olcumdenSonraDegisenDosyalar(komut.packageId, commitYollari(ROOT_DIR, komut.value));
        if (gec.length > 0) {
          uyar(
            `journal: ÖLÇÜM SIRASI — commit ${komut.value} şu dosya(lar)ı taşıyor ` +
              `ama onlar son kapı koşumundan SONRA değişti:\n` +
              gec.map((y) => `  · ${y}`).join("\n") +
              `\nKapıları yeniden koşun ve commit'i ölçülmüş ağaçla yenileyin.`
          );
          process.exitCode = 2;
          return;
        }
      }
      olayYaz(
        komut.packageId,
        { type: "git_recorded", payload: { kind: komut.kind, value: komut.value, subject: komut.subject } },
        komut
      );
      return;
    }

    case "agent":
      olayYaz(
        komut.packageId,
        komut.phase === "started"
          ? { type: "agent_started", payload: { agent_label: komut.agentLabel, task: komut.task } }
          : {
              type: "agent_finished",
              payload: { agent_label: komut.agentLabel, outcome: komut.result, summary: komut.summary },
            },
        komut
      );
      return;

    case "verifier":
      olayYaz(
        komut.packageId,
        komut.kind === "finding"
          ? {
              type: "verifier_finding",
              payload: {
                finding_id: komut.findingId,
                severity: komut.severity,
                summary: komut.summary,
                file: komut.file,
              },
            }
          : {
              type: "verifier_verdict",
              payload: {
                decision: komut.decision,
                findings_open: komut.findingsOpen,
                findings_closed: komut.findingsClosed,
                summary: komut.summary,
              },
            },
        komut
      );
      return;

    case "risk":
      olayYaz(
        komut.packageId,
        {
          type: "risk_recorded",
          payload: { risk_id: komut.riskId, status: komut.status, summary: komut.summary },
        },
        komut
      );
      return;

    case "note":
      /* ANLATI sınıfı — ayrı olay türü olduğu için ölçüm alanına sızamaz (11.4) */
      olayYaz(komut.packageId, { type: "note", payload: { text: komut.text } }, komut);
      return;
  }
}

/** Tek yazma noktası: her yazan komut buradan geçer (store.ts tek kapıdır) */
function olayYaz(
  packageId: string,
  event: JournalEvent,
  komut: Extract<ParsedJournalCommand, { actor: unknown }>
): { seq: number; hash: string } | null {
  const satir = appendEvent(packageId, event, komut.actor);
  yaz(`${satir.package_id} seq=${satir.seq} ${satir.type} hash=${satir.hash.slice(0, 12)}`);
  return { seq: satir.seq, hash: satir.hash };
}

try {
  main();
} catch (e) {
  uyar(`journal: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
}
