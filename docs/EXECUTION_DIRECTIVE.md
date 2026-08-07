# EXECUTION_DIRECTIVE — TEZGÂH (Repo C)

Bu repoda yürürlükteki yönetişim direktifi: **[MULTI_REPOSITORY_EVOLUTION_DIRECTIVE.md](./MULTI_REPOSITORY_EVOLUTION_DIRECTIVE.md) (v1.2)** — üç-repo modeli, Shared Contracts, kanonik sahiplik, Goal Impact Review, /docs yerleşimi.

**Mutabakat şerhi (PART-B adım-0):** T3 paketi bu dosyanın içeriği olarak "MULTI_REPO v1.2 metni"ni işaret etti; direktif v1.2 §6 tablosu ise MULTI_REPOSITORY_EVOLUTION_DIRECTIVE.md'yi ayrıca kanonik kopya sayar. Metin TEK kopya olarak kanonik dosyada tutuldu; bu dosya işaretçidir. styva'ya özgü EXECUTION DIRECTIVE metni (B-hattı boot zinciri) C'ye taşınmadı — gelirse buraya additive işlenir.

Oturum-açılış (C uygulayıcı hattı): güncel paket + `/docs/PROGRAM_COCKPIT.md` (pointer şerhli kopya; master styva) + repo gerçekliği (CONSTITUTION.md · TODO.md). Çelişki kuralı: repo gerçeği ≠ doküman → repo gerçeği esas + raporlanır.

**Ek — TASARIM-BUILDER HATTI (2026-08-07, journal `2026-08-07-builder-roadmap-otoritesi`):** Bu repodaki acemi tasarım builder hattı (Paket 1…6.6) cockpit v14 kopyasında ve ondan türetilen ROADMAP/GOAL_QUEUE görünümlerinde **izlenmiyor**. O hat üzerinde çalışan oturum, açılışta şunu da okur:

- **`/docs/BUILDER_ROADMAP.md`** — hattın kanonik kaydı: Paket 1…6.6 ledger'ı (ölçüm sınıfı, journal'a birebir bağlı) · değişmez sözleşmeler · DEFERRED/DEBT kaydı · sonraki paket adayları (**plan sınıfı, işaretli**). Canonical 11.3 + 11.4.
- `docs/journal/events/2026-08-07-*.jsonl` — o paketlerin ölçüm kaydı; `npm run journal:verify` ile doğrulanır.

İki uyarı: (1) ROADMAP.md ve GOAL_QUEUE.md **tarihsel** görünümlerdir (başlarındaki uyarıya bakın) — güncel gerçek sanılmamalı. (2) Repoda geçen **"P7"** ibaresi F1 brief yaşam döngüsü fazıdır (`apps/server/src/routes/briefs.ts`), builder hattının Paket 7'si **değildir**.

**Şerh (ölçüldü):** bu dosyanın yukarıdaki satırı `CONSTITUTION.md`'yi repo gerçekliği kaynağı olarak gösteriyor, ancak bu repoda **böyle bir dosya yok** (MULTI_REPO v1.2 §6 tablosu `/docs/PROJECT_CONSTITUTION.md` öngörür; o da yok). Metin bilinçli olarak DÜZELTİLMEDİ: eksik dosyayı uydurmak ya da atfı sessizce silmek yerine yokluğu işaretlemek 00_READ_FIRST'ün STEP-2 kuralının gereğidir ("yokluğu açıkça belirt; içerik UYDURMA; materyalizasyon ilgili adım-0 commit'iyle yapılır").
