> **C-repo kopyası (pointer şerhi):** Master kokpit styva reposunda yaşar (direktif v1.2 §6); bu dosya PART-B adım-0 materyalizasyonu anındaki v14 anlık görüntüsüdür. Güncel sürüm için styva /docs esastır.

# STYVA PROGRAM COCKPIT v14 — 2026-07-14 (F8-D AUDIT PASS — MERGE KUTUSU + T3 PAKETİ VERİLDİ)
**Programın yaşayan hafızası. Her yönetişim (Fable) oturumu bununla açılır; her kayda
değer olayda yönetişim günceller, sürüm atlar. styva /docs ağacına commit edilir (D-13;
/docs materyalizasyonu öncesi Kurye'de dosya olarak yaşar). Kurye taşır, onay taşımaz.**
*(v14: F8-D kapanış raporu audit PASS + MERGE ONAYI (D-20); temizlik SAPMASI kayıtlı
(fert·seyrantepe duruyor, "s" belirsiz); launcher ÇÖZÜLDÜ (tam yol D-20); TÜM-FABLE rol
modeli (D-21); T3 PART-B paketi merge kutusuyla tek taşımada VERİLDİ (§8b + ayrı dosya).
Sonraki oturum: bu belge + varsa yeni raporlar, §0a ile aç, baştan analiz yok.)*

## 0. Otorite ve döngü fiziği
Fable 5 = tek teknik otorite (yönetişim hattı = bu belgeyle açılan oturum) VE tek
uygulayıcı (TEZGÂH ve styva oturumları AYRI — D-21; oturumlar birleştirilmez, ayrılık
bağlam+rolden). Kullanıcı = ürün sahibi + Kurye; yalnız 7 karar onundur: marka/ürün
isimleri · ticari strateji · paket fiyatlandırması · hukuki/lisans · ücretli harici
sözleşme · production'a gerçek geçiş · geri döndürülemez veri. Yönetişim turlar arasında
koşamaz; otonomi = ön-yetkilendirme + bu belge.

## 0a. Yönetişim katmanı (kalıcı)
Oturum-açılış sırası: COCKPIT doğrula → son raporlar → Goal Queue → Blocker'lar → D-log →
riskler → sıradaki Goal. Baştan analiz YOK. Goal nitelikleri: küçük · doğrulanabilir ·
test edilebilir · rollback'li · ticari değerli. Goal-seçim testi: "STYVA'yı ticari olarak
en hızlı ileri taşıyor mu?" Repository = tek gerçek; doküman ≠ kod; placeholder ≠
production. İki başarısız tur → kök neden + daraltılmış paket. Her kapanışta: audit →
dokümantasyon → queue → sıradaki paket. Hiçbir karar sessizce kaybolmaz. İnsan-adımı
beyanları komut-doğrulamalı (D-20 pratiği).

## 1. ÖN-YETKİLENDİRMELER (yürürlükte)
- **PA-1:** styva Doğrulama Raporu v2 §16 (a)-(f) sapmasız → "başla M1" verilmiştir.
  Sapma varsa dur, yönetişime.
- **PA-2:** TUR-FIX merge + sunucu restart + görsel tur 3 istasyon yeşil (insan gözü) +
  test müşterileri silindi → F8-D "başla" verilmiştir (Δ1/Δ2/Δ3). *(Tur koşulu D-15'te
  karşılandı — D-19 yorumu. TÜKETİLDİ: F8-D koşuldu D-20; temizlik kalıntısı merge
  kutusu (5) adımında komutla doğrulanır.)*
- **PA-3:** Milestone kapanışları Gate4 kanıtlı; yönetişim audit'siz sonraki milestone yok.

## 2. GOAL QUEUE
| # | Goal | Durum | Kapı/Bağımlılık |
|---|---|---|---|
| T1 | TEZGAH-TUR-FIX | **COMPLETED** — main=origin=`4f84980`, 366/366, dal silindi | — |
| T1b | TEZGAH-HOTFIX | **COMPLETED** — main=origin=`6f18cf1`, 374/374, dal silindi, teyit D-19 | — |
| T2 | TEZGAH-F8D | **KOŞULDU — AUDIT PASS (D-20), MERGE KUTUSUNDA** — dal `paket-f8d` HEAD `6d072b7`, 383/383 dalda (main hâlâ 374) | merge kapanış teyidi (§8b PART 1) |
| T3 | TEZGAH-PART-B (engine şimi **+ C /docs adım-0**) | **PAKET VERİLDİ (D-21; §8b PART 2, hafıza-öncelikli)** | T2 merge kapanışı; girdi: Render Contract v1 metni + kokpit v14 (Kurye) |
| T4 | TEZGAH-F8E (H4 presentation derleme + yüksek-çöz yolu) | Backlog — tohum repo TODO'sunda (`6d072b7`) | T2 merge; paket yönetişimden |
| 1 | GOAL-FLYER-SELF-SERVE-01 (M1-M7) | Approved (PA-1) — **v2 paketi HÂLÂ styva oturumuna taşınmadı** | M7 ← T3 |
| 2 | GOAL-MENU-DATA-BOUND-01 | Backlog | 1 |
| 3 | GOAL-QR-INTEGRATION-01 **(SWISS-repo + Menu/QR Contract)** | Backlog | 2 |
| 4 | GOAL-PRINT-ORDER-CENTER-01 | Backlog | 1 |
| 5 | GOAL-SIGNAGE-DAY-NIGHT-01 | Backlog | T2, 4 |
| 6 | GOAL-GLASS-SURFACE-01 | Backlog | 5 |
| 7 | GOAL-PACKAGING-01 | Backlog | 4 |
| 8 | GOAL-TEXTILE-01 | Backlog | 4 |
| 9 | GOAL-RESERVATION-01 **(SWISS-repo)** | Backlog | 3 |
| 10-12 | 2D → 3D → INTERIOR | Backlog | 9 |
| S1/S2 | BRAND-OMNI / EMBED | Backlog | 2'ye / 3'e yamanır |

## 3. ADR endeksi
001 styva çatı **(D-9 tadil: üç yaşayan ürün + contract entegrasyonu)** · 002 korkuluklu
Konva · 003 Store-tenant, atölye=Agency · 004 katalog **(D-9 tadil: restoran verisi
SWISS'te yaşar, bağ=contract)**, BrandKit styva · 005 üretim=creative-engine, mockup≠prova ·
006 kredi çerçevesi, manuel v1 — hepsi KABUL (PSP = kullanıcı kararı, park).

## 4. Karar günlüğü (D-log)
D-1 queue ticari öncelikle sıralandı · D-2 PA-1/PA-2 · D-3 swiss Vercel=fixture vitrin ·
D-4 tenant kredisi=StoreCredit (balance-wallet değil) · D-5 CustomizationTemplate
tekstil'e saklandı · D-6 yönetişim katmanı işlendi (7 karar, açılış sırası, ticari test) ·
**D-7 (v3):** TUR-FIX audit PASS (366/366 · typecheck 0 · FIX-1 a/b ölçülü · print/preview
diff BOŞ); AÇIK kapandı: "Escalope" = F7-B2 loan-word tohum tercihi, kod değil (TODO'da) ·
**D-8 (v3):** "127.0.0.1 değil localhost" ifadesi mimar kutusunda tersti; repo standardı
(curl=127.0.0.1, tarayıcı=localhost) esas — Opus'un repo gerçeğine uyması doğrulandı.
*(D-20 şerhi: vite localhost-bind — curl'de vite için localhost istisnası.)*
**D-9 (v4):** Üç-yaşayan-repo modeli kanonikleşti (MULTI_REPOSITORY_EVOLUTION_DIRECTIVE
v1): SWISS pasifleşmez/eritilmez; "absorbe" → Shared Contract (Render · Menu/QR ·
Tenant/Identity); ADR-001/004 tadil; GOAL-3 ve GOAL-9 SWISS-repo goal'leri oldu; styva
mükerrer Restaurant* modelleri arşivlenir (model arşivi ≠ repo pasifleştirme).
**D-10 (v4):** CODE EXECUTION BOOTSTRAP = Opus oturum-açılış protokolü; /docs ağacı
hedef-durum, materyalizasyon = repo-başına ilk goal commit'i (styva: M2-adım-0 = V2-EK-1).
Aktif goal impact kaydı: FLYER-01 → A NO CHANGE · B MINOR · C NO CHANGE/PART-B PATCH ·
Contracts: Render v1. v2 paketi modele uyumlu — rework yok.
**D-11 (v5):** T1 kapandı (`c563c91..4f84980`, --no-ff, 3 commit, dal silindi). Kontenjan:
tur bulgu çıkarırsa F8-D bekler, dar hotfix paketi Fable'dan. T3 (PART B) paketi F8-D
merge kutusuyla BİRLİKTE verilecek (zorunlu dönüş turu; ek maliyet sıfır, tazelik garantili).
**D-12 (v6):** 00_READ_FIRST.md = kanonik boot dosyası (CODE EXECUTION BOOTSTRAP'ı devraldı);
program-boot raporu verildi; seçili goal GOAL-FLYER-01 (impact: A NC · B MINOR · C NC/PB
PATCH · Contract Render v1).
**D-13 (v7):** Yerleşim ürün sahibi kararıyla SABİT: tüm governance /docs ağacında
(00_READ_FIRST dahil), ADR'ler /docs/adr; STEP 1 yolları /docs köküne göreli. D-12'nin
kök-seviye seçimi geçersiz. CHANGELOG/VERSION/RELEASE_NOTES repo kökünde; kök README'ye
tek satır boot işareti. Direktif v1.2 ile hizalı.
**D-14 (v8):** /docs materyalizasyonu = her repoda İLK PROGRAM-DOĞUMLU goal'ün adım-0'ı:
B=GOAL-FLYER M2-adım-0 · C=PART-B adım-0 · A=GOAL-3 adım-0. Legacy-hat paketleri (F8-D)
docs bootstrap TAŞIMAZ; onaylı kapsamları donuk.
**D-21 (v14):** TÜM-FABLE MODELİ — ürün sahibi bildirimi: uygulayıcı hatlar da Fable;
§0 rol etiketleri güncellendi (Yönetişim-Fable = bu hat · Uygulayıcı-Fable = TEZGÂH ve
styva, AYRI oturumlar). Ayrılık modelden değil bağlam+rolden — oturumlar BİRLEŞTİRİLMEZ.
Aynı-model audit şerhi: audit kanıt-temelli (hash·sayı·diff·aritmetik) sürer; çapraz
kontrol oturum ayrılığına yaslanır. PART-B SÜREKLİLİK BOŞLUĞU: "Architecture Ready"
mimarisi kokpite hiç serileştirilmemiş (devir boşluğu); T3 paketi HAFIZA-ÖNCELİKLİ
kuruldu — uygulayıcı hafızasında mimari VARSA beyan+uyum (çelişkide DUR), YOKSA paket
çerçevesi + Render Contract v1 metni = spec. T3 PAKETİ VERİLDİ (merge kutusuyla tek
taşımada, D-11; metin §8b + ayrı dosya).
**D-20 (v14):** F8-D KAPANIŞ AUDIT PASS + MERGE ONAYI — dal `paket-f8d` (taban `6f18cf1`),
3 commit (`53f0b70` F8D-1 shared · `f2d8870` F8D-2 MockupPage · `6d072b7` F8D-3
dayanıklılık+smoke+TODO), dal HEAD `6d072b7` · 383/383 = server 56 + shared 188 (+9) +
templates 139 ✓ · typecheck 0 · kısıt ✓ PrintPage+exports diff BOŞ, damga grep 6/0/0 ·
Δ2 dil-duyarlı damga (fr/tr/de, ß'siz) yalnız MockupPage, JPG piksel-gömülü · H2
MOCKUP_MAX_W=1600 shared dedupe (yüksek-çöz bilerek YOK → F8-E) · H3 SceneSettings
additive (migrationsız, testli), ScenesPanel wiring Δ1 gereği YOK · H4 → F8-E ERTELENDİ
(TODO repo commit'inde — kalıcı) · Δ3 gerçek-sahne smoke 8/8 (Aras Grill "Vitrin sag
cam"; 1400≤1600; damga lum 48/86=0.56; net-zero; 3 gerçek sahne el değmedi) · HMR dersi:
eski-server+yeni-web karışımı 45s timeout→500 → MockupPage savunmacı erişim; smoke eski
server'la geçti (dayanıklılık canlı kanıt); server değişikliği merge sonrası restart'la
iner. RESTART KAPISI YEŞİL: merge 01:33 → süreç 02:26; uygulayıcı `npm run dev`
(concurrently: server tsx watch'suz + vite); FIX-3 canlı (3001:200 · 5173:200).
LAUNCHER ÇÖZÜLDÜ: `C:\Users\MacBook\tasarim\start-tezgah.bat` VAR (8 Tem/HF1, tek
kopya; bu tur kullanılmadı) — Kurye taraması diskle çelişmişti; ORTAM NOTU: TEZGAH repo
kökü = `C:\Users\MacBook\tasarim`. TEMİZLİK SAPMASI (komut-kanıt ≠ Kurye beyanı 5/5):
kagıthane·z·x ✓ silinmiş; fert·seyrantepe ✗ DURUYOR; beklenmedik "s" kaydı (g/yesilce
artık yok — ad karışıklığı olası); kalan 9; yetim 0 (CASCADE sağlıklı). F8-D kanıtı
sapmadan bağımsız → SONUÇ GEÇERLİ. Sapmaya rağmen koşma, yönetişim paketindeki "tek açık
koşul restart" cümlesine dayanıyor — çerçeve hatası yönetişimde, kayda. Kalan silme
Kurye'de (geri döndürülemez veri = kullanıcı kararı); merge kutusu (5) komutla yeniden
doğrular + kalanları ADLARIYLA ister (16→9 mutabakatı, g/yesilce dahil). YENİ PRATİK
(§0a'ya işlendi): insan-adımı beyanları komut-doğrulamalı. Yeni test tabanı 383 —
merge kapanışında main'de teyit edilir.
**D-19 (v13):** MERGE-T1B kapanış teyidi ALINDI, audit PASS — tüm kalemler kokpitle bire
bir: HEAD `6f18cf1` = D-17 · 374 = server 56 + shared 179 + templates 139 ✓ · typecheck 0 ·
app.db 405504/23:11 korundu · `4f84980..6f18cf1` --no-ff, dal silindi. Yeni ayrıntı:
4 commit kırılımı (`6220f61` FIX-3 çekirdeği · `7a60596` server · `12ce2c2` web görünürlük ·
`c746d93` smoke/audit). ZİNCİR NETLEŞTİ (yönetişim adjudikasyonu): PA-2'nin tur koşulu
D-15 turunda karşılandı (3/3 yeşil, insan gözü); T1b kanıtı komut-düzeyinde (374 + izole
11/11) → YENİ görsel tur GEREKMEZ; v12 §7'deki tur adımı stale idi (§2 T2 kapısıyla
çelişiyordu), düşürüldü — PA-2 metni değişmedi, tadil değil yorum. Davranış notu kayda:
restart sonrası tekrar-intake'te aynı-etiket kategori mükerrer AÇILMAZ; özet adımı
"N ürün mevcut 'X' kategorisine eklenecek" gösterir; onay sorusu gerçek-yeni kategori
sayısını verir. Uygulayıcı-TEZGÂH "işim bitti" bildirdi AMA OTURUM KORUNUR: F8-D planının
tek kopyası orada (D-17); "tur tamam" işareti O oturuma verilir. Top tamamen Kurye'de.
**D-18 (v12):** OTURUM DEVRİ TAMAMLANDI — yeni yönetişim oturumu aktif; §0a boot-doğrulama
PASS (T1 ✓ · T1b ✓ · main=origin=`6f18cf1` · test tabanı 374 · gerçek müşteriler temiz ·
queue/PA/blocker/risk DEĞİŞMEDİ). v11 stale referansları düzeltildi (substance sıfır):
(a) §7 MULTI_REPO v1.1→**v1.2** (kanonik: D-13/D-17) · (b) §7 temizlik sırası "x·z"→
"z→x (x en son)" (D-16 uyumu) · (c) D-17 içinde EK-1 konumu "§9"→"§8a" · (d) başlık
"repo köküne"→"/docs ağacına" (D-13 uyumu). ESKİ-SOHBET-SİLME KOŞULU: v12 sohbet dışına
kaydedildi VE 00_READ_FIRST · MULTI_REPO v1.2 · Execution Package v2 metinleri sohbet
DIŞINDA (dosya/repo) mevcut → eski yönetişim sohbeti silinebilir; v1-v11 kokpitleri
superseded (tam-sürüm protokolü), ayrıca saklanmaz. EK-1 metni §8a'da — kokpitle taşınır,
styva'ya v2 ile birlikte yapıştırılır. Not: v11 boot-verify Opus 4.8 turunda koştu (model
yönlendirmesi), v12 mührü Fable'da; Gate4/PA-3 yetki zinciri etkilenmedi.
**D-17 (v11):** T1b KAPANDI (`4f84980..6f18cf1`, --no-ff, 4 commit, dal silindi; app.db
baseline 405504/23:11 korundu). Yeni test tabanı 374. FABLE OTURUM DEVRİ: sonraki oturum
bu belge (+varsa yeni Opus raporu) ile açılır, §0a izlenir, baştan analiz yapılmaz.
styva hattı dosyaları kullanıcıda: 00_READ_FIRST metni · MULTI_REPO v1.2 ·
Execution Package v2 · V2-EK-1 (§8a'da). TEZGÂH F8-D planı TEZGÂH-Opus hafızasında.
**D-16 (v10):** T1b AUDIT PASS (374/374 · typecheck 0 · izole 11/11 ölçülü). F2 KOD-FIX'SİZ
kapandı (kalıntı hipotezi doğrulandı: TR+pizza→"Pizzalar"). Resmî mükerrer taraması (16
müşteri): Aras/Arriva TEMİZ; mükerrer yalnız kagıthane+x (silme listesinde). "t" müşteri
DEĞİL — nihai temizlik: kagıthane·fert·seyrantepe·z→x(en son). Anlatı düzeltmesi: 3-ürünlü
Sandviçler=12 Tem, 7-ürünlü=bu gece. Yeni test tabanı: 374. Merge onayı verildi.
**D-15 (v9):** Görsel tur 3/3 YEŞİL (A4 "MENÜ" · yüzey silme sahada · CILA5) AMA 2 bulgu:
F1 = tekrar-intake'te aynı-etiket kategori mükerrer (kök: APPEND-only tasarımında
tekrar-intake boşluğu; intake.ts şerhi kanıt) → T1b FIX-3 (append-only KORUNARAK mevcut
kategoriye ürün-append). F2 = "Burgers/Pizzas" fr-sütun kalıntısı; tohum ÇOK-DİLLİ
(cat("Burgerler","Burgers","Burger")); HF3-öncesi ord'lardan → T1b'de doğrulama+tarama,
muhtemelen kod-fix'siz kapanır. PA-4 tanımlandı (T1b ön-yetkisi). "tur tamam" işareti
T1b merge + temizlik SONRASINA bağlandı; F8-D onu bekler. Temizlik listesine "t"
(müşteriyse) eklendi.

## 5. Engel/park kaydı
BLOCKER-1 (PARK): canlı PSP — v1 manuel kredi. Başka açık engel yok.

## 6. Risk kaydı (aktif)
StoreCredit eşzamanlı yazarlar (M1 doğrulama) · Konva editör buzdağı (M5 kilidi) · üç şema
konsolidasyonu (additive/kademeli) · styva genişlik cazibesi (freeze) · tek kişi + kota ·
insan-adımları devredilemez; geri-döndürülemez veri silme = kullanıcı kararı; beyanlar
komut-doğrulamalı (D-20) · PART-B mimarisi kokpite serileştirilmemiş — tek olası kopya
uygulayıcı-TEZGÂH hafızasında (paket hafıza-öncelikli, D-21; oturum KORUNUR) · aynı-model
audit: çapraz kontrol oturum ayrılığına bağlı (D-21).

## 7. NEXT_ACTION — hat başına
**Kurye:** (1) fert + seyrantepe'yi UI'dan sil; "s"i aç — boş test kabuğuysa sil,
belirsizse BIRAK (merge kutusu inceler). (2) PAKET dosyasını (MERGE-F8D + T3, §8b kopyası)
uygulayıcı-TEZGÂH oturumuna yapıştır: PART 1 hemen, PART 2 kapanış teyidi sonrası aynı
oturum. (3) PART 2 girdileri hazır tut: Render Contract v1 bölümü (MULTI_REPO v1.2'den) +
kokpit v14 metni. (4) **KRİTİK YOL — styva hâlâ boş: SIRAYLA yapıştır: 00_READ_FIRST →
MULTI_REPO v1.2 → Execution Package v2 + V2-EK-1 (§8a).** (5) Kapanış teyidi + T3 raporu →
yönetişime. (Opsiyonel göz: merge sonrası herhangi bir sahneden mockup üret, damgayı gör.)
**Yönetişim (Fable):** raporlar dönünce §0a → audit → v15 → sıradaki paket sormadan.
**Uygulayıcı-TEZGÂH (Fable):** PART 1 merge kutusu → kapanış teyidi → PART 2 (T3).
**Uygulayıcı-styva (Fable):** v2 §16 doğrulama raporu → PA-1 → M1→M6.

## 8a. Ek — V2-EK-1 (styva'ya v2 ile birlikte yapıştırılacak blok)
```
V2-EK-1 (M2'ye adım-0): /docs yönetişim ağacını oluştur — MULTI_REPOSITORY_
EVOLUTION_DIRECTIVE §6 eşleme tablosuna göre (PROGRAM_COCKPIT.md = kokpit güncel
sürümü · GOAL_QUEUE/ROADMAP = kokpit §2'den · adr/ = Faz 0 §14-19, 001/004 D-9
şerhli · EXECUTION_DIRECTIVE.md = direktif metinleri · + CHANGELOG/VERSION/
RELEASE_NOTES). Bootstrap STEP 1'in /docs yolları bu commit'ten önce YOKTUR —
STEP 2 kuralı gereği başlangıç raporunda belirt, ilk commit'le materyalize et.
```

## 8b. Ek — MERGE F8-D + T3 PART-B paketi (uygulayıcı-TEZGÂH'a tek taşıma; ayrı dosyayla aynı metin)
```
KURYE ÖN-ADIMI: fert + seyrantepe'yi UI'dan sil. "s": boş test kabuğuysa sil,
belirsizse BIRAK (aşağıda incelenecek). Sonra bu bloğun tamamını yapıştır.

PART 1 — MERGE KUTUSU F8-D (paket-f8d → main) — HEMEN
(1) Ön-kontrol: main=origin=6f18cf1 · dal HEAD 6d072b7 (3 commit: 53f0b70 ·
f2d8870 · 6d072b7) · working tree temiz.
(2) Merge: main'e paket-f8d --no-ff (mesaj: "F8-D: mockup damga + katman +
MAX_W dedupe (Δ1/Δ2/Δ3)") → push → dal sil (lokal+origin).
(3) Doğrulama: yeni main HEAD = origin HEAD raporla · 383/383 (server 56 ·
shared 188 · templates 139) · typecheck 0 · merge app.db'ye dokunmadı (git
kapsamında değil; güncel boyut/mtime kaydet = yeni baseline).
(4) RESTART: server'ı watch'suz yeniden başlat (F8-D server değişikliği canlıya
iner) · sağlık: 3001 + 5173 (vite=localhost şerhi).
(5) TEMİZLİK KOMUT-DOĞRULAMASI: 5 hedefin yokluğu (kagıthane·fert·seyrantepe·
z·x) · "s" duruyorsa created_at + içerik özeti · kalan müşterileri ADLARIYLA
listele + sayı — D-16'daki 16 ile mutabakat (g/yesilce dahil).
(6) KAPANIŞ TEYİDİ (tek blok) → Kurye'yle yönetişime. Sonra AYNI oturumda PART 2.

PART 2 — PAKET T3: TEZGAH-PART-B (teyit SONRASI, aynı oturum)
Taban: F8-D merge sonrası yeni main HEAD · dal paket-part-b. Kapsam DONUK:
adım-0 + adım-1; genişletme yok.
GİRDİ + HAFIZA-ÖNCELİĞİ (başlamadan beyan): (a) hafızanda PART-B mimari notu
VAR MI? Varsa özetle; çerçeveyle çelişiyorsa DUR → yönetişime; uyumluysa o spec
bu kısıtlar içinde esas. (b) Render Contract v1 metni (Kurye, MULTI_REPO
v1.2'den) elinde mi? Değilse adım-0'ı yap, adım-1 öncesi DUR-iste.
ADIM-0 (/docs materyalizasyonu — C ilk program-doğumlu commit, D-13/D-14):
/docs: PROGRAM_COCKPIT.md (v14 — Kurye verir) · GOAL_QUEUE.md + ROADMAP.md
(§2'den türet) · adr/ADR-001..006 (001/004 D-9 şerhli — §3'ten) ·
EXECUTION_DIRECTIVE.md (MULTI_REPO v1.2 — Kurye verir) · 00_READ_FIRST.md
(Kurye metninden TEZGAH uyarlaması; yoksa raporla, kalanını materyalize et).
Kök: CHANGELOG.md · VERSION · RELEASE_NOTES.md + README'ye boot satırı.
Başlangıç raporunda: /docs bu commit öncesi YOKTU. Tek commit: "PART-B adım-0:
/docs governance bootstrap".
ADIM-1 (engine şimi — Render Contract v1): Amaç: TEZGAH creative-engine'e
contract-uyumlu render kapısı (styva FLYER M7 buradan çağıracak). Kısıtlar:
additive-only · mevcut davranışa SIFIR dokunuş (PrintPage/exports/MockupPage
diff BOŞ) · contract dışı yüzey yok · Tenant/Identity contract ne diyorsa o.
İçerik: şim modülü (contract isteği → engine iç çağrı) · RENDER_CONTRACT_V=1 ·
contract-uyum testleri (şema + round-trip) · gerçek şablonla smoke (201+çıktı).
GATE4: test toplamı (383+) · typecheck 0 · diff özeti (yalnız yeni modül +
/docs + kök meta) · uyum-testi çıktısı · smoke kanıtı. Sapma: iki başarısız
tur → kök neden + daraltılmış paket; mimari çelişki → DUR. Kapanış: standart
rapor → Kurye'yle yönetişime; merge kutusu oradan.
```

## 8. Oturum-açılış protokolü
Yeni yönetişim oturumu = bu belgenin son sürümü + son raporlar; §0a sırası; baştan
analiz yok. Yeni uygulayıcı oturumu = ilgili hattın güncel paketi. Her güncellemede tam
yeni sürüm — hiçbir şey sessizce kaybolmaz.
