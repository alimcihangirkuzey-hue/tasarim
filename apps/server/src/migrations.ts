/* Migration dizisi — CONSTITUTION §4.2. db.ts uygular; migrations.test.ts
   :memory: üzerinde replay ederek eski akışların kırılmadığını kanıtlar. */

export const MIGRATIONS: string[] = [
  // v1
  `
  CREATE TABLE IF NOT EXISTS clients (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    slug          TEXT NOT NULL UNIQUE,
    notes         TEXT NOT NULL DEFAULT '',
    brandkit_json TEXT NOT NULL,
    catalog_json  TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS projects (
    id         TEXT PRIMARY KEY,
    client_id  TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS documents (
    id             TEXT PRIMARY KEY,
    project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    template_id    TEXT NOT NULL,
    params_json    TEXT NOT NULL DEFAULT '{}',
    theme_id       TEXT NOT NULL DEFAULT 'brand',
    selection_json TEXT NOT NULL DEFAULT '{}',
    overrides_json TEXT NOT NULL DEFAULT '{}',
    status         TEXT NOT NULL DEFAULT 'draft',
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS assets (
    id         TEXT PRIMARY KEY,
    client_id  TEXT REFERENCES clients(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL DEFAULT 'other',
    filename   TEXT NOT NULL,
    width_px   INTEGER NOT NULL DEFAULT 0,
    height_px  INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS export_records (
    id            TEXT PRIMARY KEY,
    document_id   TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    kind          TEXT NOT NULL,
    filepath      TEXT NOT NULL,
    snapshot_json TEXT NOT NULL,
    version       INTEGER NOT NULL,
    created_at    TEXT NOT NULL
  );
  `,
  // v2 — Faz 1: müşteri bazında para birimi (FAZ1-GOREV §2.1)
  `ALTER TABLE clients ADD COLUMN currency TEXT NOT NULL DEFAULT 'EUR';`,
  // v3 — Faz 2: Sipariş Defteri (FAZ2-GOREV §2.1) + export_records yeniden kurma (mimar kararı #3)
  `
  ALTER TABLE projects ADD COLUMN due_date TEXT;
  ALTER TABLE projects ADD COLUMN source_text TEXT;

  CREATE TABLE IF NOT EXISTS order_items (
    id           TEXT PRIMARY KEY,
    project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    product_type TEXT NOT NULL,
    qty          INTEGER NOT NULL DEFAULT 1,
    width_cm     REAL,
    height_cm    REAL,
    details_json TEXT NOT NULL DEFAULT '{}',
    notes        TEXT NOT NULL DEFAULT '',
    status       TEXT NOT NULL DEFAULT 'olcu_bekliyor',
    document_id  TEXT REFERENCES documents(id) ON DELETE SET NULL,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
  );

  /* export_records: document_id artık NULL olabilir; project_id eklendi (sunum PDF'leri
     proje bazlı kayıt açar). SQLite yeniden-kurma deseni — mevcut satırlar korunur. */
  CREATE TABLE export_records_v3 (
    id            TEXT PRIMARY KEY,
    document_id   TEXT REFERENCES documents(id) ON DELETE CASCADE,
    project_id    TEXT REFERENCES projects(id) ON DELETE CASCADE,
    kind          TEXT NOT NULL,
    filepath      TEXT NOT NULL,
    snapshot_json TEXT NOT NULL,
    version       INTEGER NOT NULL,
    created_at    TEXT NOT NULL,
    CHECK (document_id IS NOT NULL OR project_id IS NOT NULL)
  );
  INSERT INTO export_records_v3 (id, document_id, kind, filepath, snapshot_json, version, created_at)
    SELECT id, document_id, kind, filepath, snapshot_json, version, created_at FROM export_records;
  DROP TABLE export_records;
  ALTER TABLE export_records_v3 RENAME TO export_records;
  `,
  /* v4 — Faz 3: mockup sahneleri (FAZ3-GOREV §2). CONSTITUTION §4.2'de "Faz 3"
     olarak işaretlenen tablo burada İLK KEZ açılır; paketin istediği kind ve
     settings_json kolonları baştan dahildir. client_id NULL = ortak sahne. */
  `
  CREATE TABLE IF NOT EXISTS mockup_scenes (
    id             TEXT PRIMARY KEY,
    client_id      TEXT REFERENCES clients(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    photo_asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    quad_json      TEXT NOT NULL,
    kind           TEXT NOT NULL DEFAULT 'generic',
    settings_json  TEXT NOT NULL DEFAULT '{}',
    created_at     TEXT NOT NULL
  );
  `,
  /* v5 — Faz 4 (FAZ4-GOREV §4/§7/§9/§10 tek göçte):
     catalog_history: toplu fiyat öncesi otomatik yedek + elle geri yükleme;
     themes: özel tema kütüphanesi (yerleşikler kodda kalır);
     assets.tags: virgüllü etiketler (foto önerisi);
     parse_synonyms: parse sözlüğünün DB katmanı (çekirdek ∪ DB). */
  `
  CREATE TABLE IF NOT EXISTS catalog_history (
    id           TEXT PRIMARY KEY,
    client_id    TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    catalog_json TEXT NOT NULL,
    reason       TEXT NOT NULL DEFAULT '',
    created_at   TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS themes (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    tokens_json TEXT NOT NULL,
    created_at  TEXT NOT NULL
  );
  ALTER TABLE assets ADD COLUMN tags TEXT NOT NULL DEFAULT '';
  CREATE TABLE IF NOT EXISTS parse_synonyms (
    word         TEXT PRIMARY KEY,
    product_type TEXT NOT NULL
  );
  `,
  /* v6 — Faz 5 (FAZ5-GOREV §2): kullanıcı yüklenen fontlar. Dosyalar data/fonts/
     altında (git dışı); family UNIQUE (tema/kit seçicilerinde tekil ad). */
  `
  CREATE TABLE IF NOT EXISTS custom_fonts (
    id         TEXT PRIMARY KEY,
    family     TEXT NOT NULL UNIQUE,
    filename   TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  `,
  /* v7 — Faz 5 (FAZ5-GOREV §9, mimar #16): dijital menü (statik HTML) MÜŞTERİ
     düzeyli export'tur — belge/proje değil, doğrudan katalog+kitten üretilir.
     export_records'e client_id eklenir; CHECK üç kaynaktan (belge|proje|müşteri)
     birine izin verir. v3 yeniden-kurma deseni; mevcut satırlar korunur.
     (#16 "yalnız Zod" yalnızca kind DEĞERİ içindi; kapsama kolonu ayrı konudur.) */
  `
  CREATE TABLE export_records_v7 (
    id            TEXT PRIMARY KEY,
    document_id   TEXT REFERENCES documents(id) ON DELETE CASCADE,
    project_id    TEXT REFERENCES projects(id) ON DELETE CASCADE,
    client_id     TEXT REFERENCES clients(id) ON DELETE CASCADE,
    kind          TEXT NOT NULL,
    filepath      TEXT NOT NULL,
    snapshot_json TEXT NOT NULL,
    version       INTEGER NOT NULL,
    created_at    TEXT NOT NULL,
    CHECK (document_id IS NOT NULL OR project_id IS NOT NULL OR client_id IS NOT NULL)
  );
  INSERT INTO export_records_v7 (id, document_id, project_id, kind, filepath, snapshot_json, version, created_at)
    SELECT id, document_id, project_id, kind, filepath, snapshot_json, version, created_at FROM export_records;
  DROP TABLE export_records;
  ALTER TABLE export_records_v7 RENAME TO export_records;
  `,
  /* v8 — Faz 7 (PAKET-F7-A): Sipariş Modu temel veri modeli (K2).
     ingredient_library: öğrenen içerik çipi kütüphanesi — parse_synonyms (v5)
     "çekirdek ∪ DB" desenini izler (source seed|learned); usage_count sık
     kullanılanı öne almak için. fr/de boş başlayabilir ("TR tıkla / FR-DE
     basılır" — çok-dilli öğrenme). clients.menu_language: menü çıktı dili
     (currency v2 ALTER deseni birebir; NOT NULL DEFAULT ile mevcut satırlar
     'fr' alır — geriye uyumlu). */
  `
  CREATE TABLE IF NOT EXISTS ingredient_library (
    id          TEXT PRIMARY KEY,
    tr          TEXT NOT NULL,
    fr          TEXT NOT NULL DEFAULT '',
    de          TEXT NOT NULL DEFAULT '',
    usage_count INTEGER NOT NULL DEFAULT 0,
    source      TEXT NOT NULL CHECK(source IN ('seed','learned')),
    created_at  TEXT NOT NULL
  );
  ALTER TABLE clients ADD COLUMN menu_language TEXT NOT NULL DEFAULT 'fr';
  `,
  /* v9 — Faz 7 (PAKET-F7-C): Sipariş Modu intake kaydı (denetim izi, K1). Atomik
     POST /api/intake commit'inde yazılır. answers_json = IntakeAnswers (deterministik
     re-projeksiyon), checklist_json = doneler/şartlar. Baskı-işi projesi DEĞİL —
     ayrı tablo (semantik ayrım). client silinince CASCADE. */
  `
  CREATE TABLE IF NOT EXISTS intake_records (
    id             TEXT PRIMARY KEY,
    client_id      TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    answers_json   TEXT NOT NULL,
    checklist_json TEXT NOT NULL DEFAULT '{}',
    created_at     TEXT NOT NULL
  );
  `,
  /* v10 — Faz 8 (PAKET-F8-A): müşteri-düzeyi yapısal yüzey profili. Intake
     çeklistinde toplanan surfaces[] commit'te buraya UPSERT edilir ("ön cam sol:
     218×134" — bir kez gir, hep kullan); denetim izi = intake_records (ayrı
     history YOK, D2). client silinince CASCADE (temizlik otomatik, delete rotası
     dokunmaz). UPSERT anahtarı (client_id, foldTr(label)) uygulama katmanında
     çözülür — hesaplanmış foldTr için DB-unique gereksiz. w_cm/h_cm NULL olabilir
     (ölçü sonra alınabilir, M8). */
  `
  CREATE TABLE IF NOT EXISTS client_surfaces (
    id               TEXT PRIMARY KEY,
    client_id        TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    kind             TEXT NOT NULL,
    label            TEXT NOT NULL,
    w_cm             REAL,
    h_cm             REAL,
    note             TEXT NOT NULL DEFAULT '',
    source_intake_id TEXT,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_client_surfaces_client ON client_surfaces(client_id);
  `,
  /* v11 — P3 CAP-LAYER-01 (LY2b): programın İLK ONAYLI migration'ı (ürün sahibi,
     D-48). CD `canvas` alanının sunucu evi — additive TEK kolon; eski satırlarda
     NULL = alan yokluğu (eski davranış aynen), veri dönüşümü YOK. */
  `ALTER TABLE documents ADD COLUMN canvas_json TEXT;`,
  /* v12 — F1 pilot P1 (D-61 onaylı): Brief domain'i. TEK amaç, TAMAMEN ADDITIVE —
     mevcut tablolara DOKUNULMAZ (documents'a F1 durumu EKLENMEZ; Product Spec
     tablosu AÇILMAZ — P2 kararı). Üç tablo tek migration'da (14b: Brief ve Audit
     aynı pakette doğar).

     briefs: SWISS'ten gelen dar sözleşmenin 13 alanı + F1 durumu.
       · customer_ref → clients FK ON DELETE **SET NULL** (CASCADE DEĞİL, şerhli
         sapma): brief bir DIŞ kayıttır ve brief_audit değişmez-tarihçedir; müşteri
         silmek F1 denetim izini yok etmemeli, yalnız bağı koparmalı. (Repo'nun
         intake_records CASCADE emsalinden bilinçli ayrılma — yönetişim tasdikine.)
       · idempotency_key UNIQUE = F1.6'nın DB garantisi (çift gönderim → tek Brief).
       · status CHECK = 6 F1 durumu; geçiş KURALLARI shared/f1-state.ts'te (tek kapı).
     brief_audit: istisna-audit alanları (warning_code · acknowledged_by ·
       acknowledged_at · reason · source_file_version) + APPEND-ONLY (uygulama-
       katmanı sözleşmesi; update/delete yolu yazılmaz — repo taramalı testle korunur).
     brief_files: brief ↔ asset köprüsü + dosya versiyonu/geçerliliği (F1.7 zemini);
       assets tablosuna DOKUNULMAZ. */
  `
  CREATE TABLE IF NOT EXISTS briefs (
    id                          TEXT PRIMARY KEY,
    source_system               TEXT NOT NULL,
    source_tenant_ref           TEXT,
    source_request_ref          TEXT,
    customer_ref                TEXT REFERENCES clients(id) ON DELETE SET NULL,
    brand_ref                   TEXT,
    request_type                TEXT NOT NULL,
    requested_publications_json TEXT NOT NULL DEFAULT '[]',
    content_reference           TEXT,
    language_requirements_json  TEXT NOT NULL DEFAULT '[]',
    delivery_deadline           TEXT,
    requester_notes             TEXT NOT NULL DEFAULT '',
    callback_reference          TEXT,
    idempotency_key             TEXT NOT NULL UNIQUE,
    status                      TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN
      ('DRAFT','INCOMPLETE','READY_FOR_DESIGN','DESIGN_IN_PROGRESS',
       'READY_FOR_PRODUCTION_REVIEW','PRODUCTION_READY')),
    created_at                  TEXT NOT NULL,
    updated_at                  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_briefs_status ON briefs(status);
  CREATE INDEX IF NOT EXISTS idx_briefs_customer ON briefs(customer_ref);

  CREATE TABLE IF NOT EXISTS brief_audit (
    id                  TEXT PRIMARY KEY,
    brief_id            TEXT NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
    event_type          TEXT NOT NULL,
    warning_code        TEXT,
    acknowledged_by     TEXT,
    acknowledged_at     TEXT,
    reason              TEXT,
    source_file_version INTEGER,
    payload_json        TEXT NOT NULL DEFAULT '{}',
    created_at          TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_brief_audit_brief ON brief_audit(brief_id);

  CREATE TABLE IF NOT EXISTS brief_files (
    id         TEXT PRIMARY KEY,
    brief_id   TEXT NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
    asset_id   TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    role       TEXT NOT NULL,
    version    INTEGER NOT NULL DEFAULT 1,
    status     TEXT NOT NULL DEFAULT 'valid' CHECK(status IN ('valid','invalid')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_brief_files_brief ON brief_files(brief_id);
  `,
  /* v13 — F1 pilot P4 (ürün sahibi onayı: `spec-values: 1`; programın 3. onaylı
     migration'ı). BLOCKER-3'ün evi: Product Spec alan DEĞERLERİ (format ·
     orientation · qr_target_url · print_quantity · print_material ·
     color_font_choice …) 13 sözleşme kolonunun HİÇBİRİNE ait değil ve SWISS
     sözleşme alanlarına GÖMÜLEMEZ (D-48'de "params'a gömme" reddedilmişti).
     v11 canvas_json emsali birebir: ADDITIVE tek kolon, veri dönüşümü YOK,
     eski satırlar '{}' (yokluk) alır. İçerik şeması shared/f1-spec.ts'te. */
  `ALTER TABLE briefs ADD COLUMN spec_values_json TEXT NOT NULL DEFAULT '{}';`,
  /* v14 — MAKİNE KANALI DENETİM İZİ (integration_events). Karşılanan kanonik
     maddeler: 7.4/524 (her bağlayıcı "denetim kaydı" bildirir) · 9.2/673
     ("entegrasyon hataları" izlenmesi zorunlu alan) · 9.1/665 ("denetim izi
     değişmezdir") · 5.6/410 ("dış servise gönderilen her veri kayıt altına
     alınır; hangi verinin nereye gittiği izlenebilir olmalıdır").

     (a) NEDEN AYRI TABLO — export_records'a YAZILMAMA gerekçesi. /render'ın
     STATELESS kararı (routes/render.ts başlığı) BOZULMAZ; iz AYRI KAYIT
     SINIFIDIR — 9.2/675'in "denetim izi ≠ telemetri" ayrımının şema hâli.
     export_records bir ATÖLYE ÜRETİM defteridir; makine kanalının izi oraya
     yazılsaydı üç somut hasar doğardı:
       · RED olayları ÜRETİLMEMİŞ dosyalardır — export_records.filepath NOT NULL
         ve snapshot_json NOT NULL'dır; "dosyası olmayan export kaydı" o tablonun
         anlamını bozar.
       · SÜRÜM SAYACI KAYAR: exports.ts:120 `MAX(version)`i kind FİLTRESİZ okur →
         makine kanalının her satırı atölyenin belge sürüm sayacını ileri iterdi
         (operatörün "v3" dediği dosya v5 adıyla düşerdi).
       · UI SIZINTISI: `SELECT *` yapan iki rota (exports.ts:196
         /api/documents/:id/exports · present.ts:166 /api/projects/:id/exports)
         satırları olduğu gibi atölye listesine döker → dış istemcinin denetim
         izi atölye ekranında "export" gibi görünürdü.

     (b) ON DELETE **SET NULL** (CASCADE DEĞİL) — briefs.customer_ref emsali
     (bu dosyada v12, satır 232-235). Belge ya da müşteri silmek denetim izini
     YOK ETMEMELİ, yalnız bağı koparmalıdır (9.1/665: iz değişmezdir; silme
     yoluyla dolaylı imha da bir mutasyondur). Bu yüzden template_id · variant ·
     target SNAPSHOT değerlerdir, FK değil: bağ koptuktan sonra bile "ne
     istendi" sorusu cevaplanabilir kalır (5.6/410 izlenebilirlik). document_id
     NULL'a düşünce satır yetim kalmaz — payload_json ve snapshot alanları
     olayın kendisini taşır.

     (c) CHECK'LERİN ANLAMI.
       · channel kapalı kümesi bir KAPIDIR: bugün yalnız 'render'. Yeni bağlayıcı
         eklemek DB düzeyinde migration + ürün kararı gerektirir (7.4/524 "her
         bağlayıcı bildirir" — bildirimsiz kanal sessizce iz yazamaz).
       · outcome ↔ error_code/sha256/filepath tutarlılığı: "üretildi ama dosya
         izi yok" ya da "reddedildi ama sebep yok" satırı DB düzeyinde İMKÂNSIZ.
         Yarım kayıt, kaydın hiç olmamasından beterdir (M8: sessiz yokluk yasak).
       · http_status NOT NULL: dış istemciye ne DÖNDÜĞÜ izin parçasıdır; 201/400/
         401/404/503 ayrımı sonradan tahmin edilmez.

     (d) ÇAĞIRAN KİMLİĞİ ALANI YOK — BİLİNÇLİ EKSİKLİK. Bugün /render tek
     PAYLAŞILAN secret ile doğrulanır (RENDER_CONTRACT_SECRET); gerçek caller
     kimliği YOKTUR. journal.ts:135-141'in dersi ("aktör ASLA null" — brief_audit
     8 olay türünün 5'inde aktörü NULL bırakıp "kim yaptı"yı geriye dönük
     cevaplayamaz hâle geldi) gereği SAHTE ya da hep-NULL bir aktör kolonu
     EKLENMEDİ: var olup boş duran alan, olmayan alandan daha yanıltıcıdır.
     Per-client secret / key-id geldiğinde kolon ANLAMLI dolabileceği gün eklenir
     (additive ALTER; v11/v13 emsali).

     (e) APPEND-ONLY: bu tabloya UPDATE/DELETE yolu YAZILMAZ (yazma kapısı
     integration-audit.ts; brief_audit'te olduğu gibi repo taramalı testle
     korunur). Index'ler iki okuma ekseni içindir: belge bazlı liste ve zaman
     bazlı tarama (9.2 gözlemlenebilirlik). */
  `
  CREATE TABLE IF NOT EXISTS integration_events (
    id           TEXT PRIMARY KEY,
    channel      TEXT NOT NULL CHECK (channel IN ('render')),
    contract_v   INTEGER NOT NULL,
    outcome      TEXT NOT NULL CHECK (outcome IN ('uretildi', 'reddedildi')),
    http_status  INTEGER NOT NULL,
    error_code   TEXT,
    document_id  TEXT REFERENCES documents(id) ON DELETE SET NULL,
    client_id    TEXT REFERENCES clients(id) ON DELETE SET NULL,
    template_id  TEXT,
    variant      TEXT,
    target       TEXT,
    sha256       TEXT,
    filepath     TEXT,
    payload_json TEXT NOT NULL DEFAULT '{}',
    created_at   TEXT NOT NULL,
    CHECK ((outcome = 'uretildi'   AND error_code IS NULL     AND sha256 IS NOT NULL AND filepath IS NOT NULL)
        OR (outcome = 'reddedildi' AND error_code IS NOT NULL))
  );
  CREATE INDEX IF NOT EXISTS idx_integration_events_doc ON integration_events(document_id);
  CREATE INDEX IF NOT EXISTS idx_integration_events_created ON integration_events(created_at);
  `,
];
