/* Cockpit modül fazı 0 — PAKET KAYDI TÜRETİMİ (Canonical 11.3-a).

   11.3: "Paket kaydındaki aşama ve aktör durumu, o paketin olay akışının son
   hâlidir — bağımsız olarak yazılan bir alan değil, TÜRETİLEN bir görünümdür."

   Bu yüzden paket kaydının DOSYASI YOKTUR. Diske yazılan bir <pkg>.record.json
   ikinci doğruluk kaynağı olurdu, kayardı ve 11.3'ün yasakladığı "ölçüm gibi
   görünen bayat değer"i üretirdi. Kayıt her okumada olay akışından hesaplanır.

   SAF: girdiyi DEĞİŞTİRMEZ (testte JSON-snapshot ile sabitlenmiştir). */

import { JOURNAL_STAGES } from "./journal.js";
import type {
  JournalActor,
  JournalGateName,
  JournalGateRun,
  JournalLine,
  JournalPackageDeclared,
  JournalStage,
} from "./journal.js";

export interface JournalStageStep {
  from: JournalStage | null;
  to: JournalStage;
  ts: string;
  actor: JournalActor;
  /** Geriye dönüş 11.5'te GEÇERLİ geçiştir; sessizce ileri atlama değildir */
  direction: "ileri" | "geri";
}

export interface JournalAgentState {
  agent_label: string;
  task: string;
  started_at: string;
  actor: JournalActor;
}

export interface JournalGitRefs {
  base: string | null;
  branch: string | null;
  commits: string[];
  merge: string | null;
}

export interface JournalRiskState {
  risk_id: string;
  status: "acik" | "kapali";
  summary: string;
  ts: string;
}

export interface JournalVerifierState {
  decision: "onay" | "bulgu" | null;
  findings_open: number;
  findings_closed: number;
  summary: string | null;
  ts: string | null;
}

export interface JournalPackageRecord {
  package_id: string;
  /** package_declared yoksa null — varsayılan UYDURULMAZ */
  identity: JournalPackageDeclared | null;
  started_at: string | null;
  /** İlk merge geçişinin anı; yoksa null. TAHMİNİ BİTİŞ ÜRETİLMEZ. */
  finished_at: string | null;
  stage: JournalStage | null;
  stage_history: JournalStageStep[];
  /** Kapı adı → o kapının SON koşumu */
  gates: Partial<Record<JournalGateName, JournalGateRun>>;
  gate_history: JournalGateRun[];
  /** agent_started − agent_finished (11.3: aktörün anlık durumu olay kaydında yaşar) */
  active_agents: JournalAgentState[];
  verifier: JournalVerifierState;
  git: JournalGitRefs;
  open_risks: JournalRiskState[];
  closed_risks: JournalRiskState[];
  /** ANLATI — ölçüm sınıfına asla karışmaz (11.4) */
  notes: { text: string; ts: string; actor: JournalActor }[];
  event_count: number;
  last_event_ts: string | null;
  /** Son satırın hash'i — zincirin ucu */
  chain_head: string | null;
}

/* DERİN kopya. `{...payload}` sığdır: `rec.identity.modules.push(...)` veya
   `rec.gates.test.values.tests = 1` olay akışındaki satırı DEĞİŞTİRİYORDU
   (ölçüldü). Journal verisi JSON.parse'tan geldiği için round-trip tam kopya
   verir — saflık iddiası artık iç içe yapılara da ulaşıyor. */
const deep = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

export function foldPackageJournal(lines: JournalLine[]): JournalPackageRecord {
  const rec: JournalPackageRecord = {
    package_id: lines.length > 0 ? lines[0].package_id : "",
    identity: null,
    started_at: null,
    finished_at: null,
    stage: null,
    stage_history: [],
    gates: {},
    gate_history: [],
    active_agents: [],
    verifier: { decision: null, findings_open: 0, findings_closed: 0, summary: null, ts: null },
    git: { base: null, branch: null, commits: [], merge: null },
    open_risks: [],
    closed_risks: [],
    notes: [],
    event_count: lines.length,
    last_event_ts: lines.length > 0 ? lines[lines.length - 1].ts : null,
    chain_head: lines.length > 0 ? lines[lines.length - 1].hash : null,
  };

  const risks = new Map<string, JournalRiskState>();

  for (const l of lines) {
    switch (l.type) {
      case "package_declared": {
        /* Derin kopya: fold SAF kalmalı, çağıran girdiyi değiştiremesin */
        rec.identity = deep(l.payload);
        rec.started_at = l.ts;
        break;
      }
      case "stage_changed": {
        const from = l.payload.from ?? null;
        const to = l.payload.to;
        rec.stage_history.push({
          from,
          to,
          ts: l.ts,
          actor: deep(l.actor),
          direction: from === null ? "ileri" : stepDirection(from, to),
        });
        rec.stage = to;
        if (to === "merge" && rec.finished_at === null) rec.finished_at = l.ts;
        break;
      }
      case "gate_run": {
        const run = deep(l.payload);
        rec.gate_history.push(run);
        rec.gates[run.gate] = run;
        break;
      }
      case "agent_started": {
        rec.active_agents.push({
          agent_label: l.payload.agent_label,
          task: l.payload.task,
          started_at: l.ts,
          actor: deep(l.actor),
        });
        break;
      }
      case "agent_finished": {
        const i = rec.active_agents.findIndex((a) => a.agent_label === l.payload.agent_label);
        if (i >= 0) rec.active_agents.splice(i, 1);
        break;
      }
      case "verifier_finding": {
        /* Bulgu sayısı verdict'ten okunur; tek tek bulgular akışta yaşar */
        break;
      }
      case "verifier_verdict": {
        rec.verifier = {
          decision: l.payload.decision,
          findings_open: l.payload.findings_open,
          findings_closed: l.payload.findings_closed,
          summary: l.payload.summary,
          ts: l.ts,
        };
        break;
      }
      case "git_recorded": {
        if (l.payload.kind === "base") rec.git.base = l.payload.value;
        else if (l.payload.kind === "branch") rec.git.branch = l.payload.value;
        else if (l.payload.kind === "merge") rec.git.merge = l.payload.value;
        else rec.git.commits.push(l.payload.value);
        break;
      }
      case "risk_recorded": {
        risks.set(l.payload.risk_id, {
          risk_id: l.payload.risk_id,
          status: l.payload.status,
          summary: l.payload.summary,
          ts: l.ts,
        });
        break;
      }
      case "note": {
        rec.notes.push({ text: l.payload.text, ts: l.ts, actor: deep(l.actor) });
        break;
      }
    }
  }

  for (const r of risks.values()) {
    if (r.status === "acik") rec.open_risks.push(r);
    else rec.closed_risks.push(r);
  }

  return rec;
}

/* Sıra JOURNAL_STAGES'ten OKUNUR, burada yeniden yazılmaz. Yerel bir kopya
   ikinci doğruluk kaynağı olurdu: sözlüğe aşama eklendiğinde yön hesabı
   sessizce yanlışlanırdı (bilinmeyen aşama → indexOf -1 → yanlış etiket). */
function stepDirection(from: JournalStage, to: JournalStage): "ileri" | "geri" {
  return JOURNAL_STAGES.indexOf(to) > JOURNAL_STAGES.indexOf(from) ? "ileri" : "geri";
}
