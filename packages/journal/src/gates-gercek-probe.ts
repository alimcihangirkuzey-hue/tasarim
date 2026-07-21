/* TEST-ALTYAPISI PROBU — gerçek-koşum testinin çocuk-süreç yürütücüsü (C-M-1).

   NEDEN VAR: gates.test.ts'in "typecheck GERÇEKTEN koşar" testi runGate'i
   doğrudan çağırınca spawnSync worker'ın OLAY DÖNGÜSÜNÜ 36-60s bloke ediyordu;
   9 dosyalı paralel koşumda CPU bölüşümü bloğu uzatıyor ve vitest'in birpc
   "onTaskUpdate" çağrısı 60s aşımına takılıyordu — 1320/1320 test geçerken
   exit 1 (ölçüldü: tek başına gates=0, gates'siz 8 dosya=0, birleşim=1).

   Test artık bu probu ASYNC çocuk-süreçte koşturur: aynı üretim yolu
   (gates.ts → runGate), aynı çıktı sözleşmesi; ama testin worker'ı beklerken
   olay döngüsü SERBESTTİR ve RPC ack'leri akar. Üretim koduna sıfır dokunuş;
   iddialar gates.test.ts'te birebir aynı kaldı.

   Çıktı sözleşmesi: stdout'a tek satır `__RUNGATE_JSON__<JournalGateRun>` —
   npm/tsx gürültüsünden işaretçiyle ayrılır. Yalnız typecheck desteklenir:
   diğer kapıların testte koşulmama gerekçesi gates.test.ts başlığındadır. */

import { runGate } from "./gates.js";

const gate = process.argv[2];
if (gate !== "typecheck") {
  process.stderr.write(
    `gates-gercek-probe: yalnız "typecheck" desteklenir (istenen: ${String(gate)})\n`
  );
  process.exit(2);
}

const run = runGate("typecheck");
process.stdout.write(`\n__RUNGATE_JSON__${JSON.stringify(run)}\n`);
