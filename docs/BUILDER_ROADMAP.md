# BUILDER_ROADMAP — TEZGÂH acemi tasarım builder hattı

**Bu dosya bu hattın KANONİK kaydıdır.** "Neredeyiz, ne bitti, sırada ne var?"
sorusu buradan cevaplanır — sohbet geçmişinden değil (`00_READ_FIRST.md`:
"Repository = tek gerçek; sohbet geçmişi / eski ZIP / eski kopya kaynak
DEĞİLDİR").

Kuruluş paketi: journal `2026-08-07-builder-roadmap-otoritesi`.
Canonical dayanak: **11.3** (ölçüm yalnız Journal'dan) + **11.4 Modül Fazı 1**
(ölçüm sınıfı ile plan sınıfının ayrışması).

## Bu dosya NEDEN ayrı bir dosya

`ROADMAP.md` ve `GOAL_QUEUE.md` builder otoritesi YAPILAMAZ: MULTI_REPO v1.2 §6
eşleme tablosu ikisini de **"Cockpit §2'den türetilir"** diye bağlar ve cockpit
master'ı styva'dadır. Onların içine builder hattını yazmak, türetilmiş bir
görünümü elle doldurmak (yani türetme sözleşmesini bozmak) olurdu. Aynı tablonun
**`/docs/**` = "Diğer teknik/yönetişim belgeleri"** satırı bu dosyanın lawful
yeridir.

## İKİ VERİ SINIFI — karıştırılmaz (Canonical 11.4)

| Sınıf | Nerede | Kuralı |
|---|---|---|
| **ÖLÇÜM** | §1 Ledger · §3 Borç kaydının ölçülmüş kısmı | Her alan `docs/journal/events/<paket>.jsonl` içindeki bir alana **birebir** karşılık gelir. Karşılığı olmayan alan eklenmez. |
| **PLAN** | §4 Sonraki paket adayları | Henüz ölçülmemiş **niyet** bilgisi. Açıkça `PLAN` işaretlidir. Ölçüm gibi sunulması yasaktır — varlığı değil, ölçüm kılığına girmesi. |

Ledger'daki hiçbir sayı bu dosyada hesaplanmaz; hepsi journal'dan okunur.
Doğrulama: `npm run journal:verify` (kaynak · git · yapı · zincir).

---

## 1. LEDGER — Paket 1…6.6 · ÖLÇÜM SINIFI

Numaralandırma **repo tanıklığıdır, bu dosyanın icadı değildir**: Paket 1'in
`scope_out` alanı "…— paket 2", "…— paket 3", "…— paket 4", "…— paket 5" diye
sıradaki paketleri adıyla sayar; `6.5` ve `6.6` numaraları `cok-sayfa` ve
`performans-adaptif-yogunluk` paketlerinin declare/note/verifier kayıtlarında
geçer. Bu dosya o tanıklığı tek yerde toplar.

Tüm sekiz paket: `aşama = hazir` · `ikinci doğrulayıcı = onay` ·
`canonical v4.2.0`. Test toplamı, o paketin **kendi** journal'ındaki son `test`
kapısının değeridir (kümülatif repo toplamı — paketin kendi test sayısı değil).

| # | Paket (journal id) | Durum | Commit | Test (repo toplamı) | Risk |
|---|---|---|---|---|---|
| 1 | `2026-08-07-blok-yerlesim-modeli` | **COMPLETED** | `27fe400` | 1897/1897 · 111 dosya | düşük |
| 2 | `2026-08-07-blok-tuvali-ui` | **COMPLETED** | `9e573ee` | 1919/1919 · 112 dosya | düşük |
| 3 | `2026-08-07-icerik-bloklari-urun-ekle` | **COMPLETED** | `a522a85` | 1958/1958 · 114 dosya | düşük |
| 4 | `2026-08-07-otomatik-yerlesim` | **COMPLETED** | `fad643c` | 1995/1995 · 116 dosya | orta |
| 5 | `2026-08-07-preflight` | **COMPLETED** | `e4ff7dd` | 2032/2032 · 118 dosya | düşük |
| 6 | `2026-08-07-adaptif-tema` | **COMPLETED** | `45ffd40` | 2063/2063 · 120 dosya | orta |
| 6.5 | `2026-08-07-cok-sayfa` | **COMPLETED** | `a44d595` | 2089/2089 · 122 dosya | orta |
| 6.6 | `2026-08-07-performans-adaptif-yogunluk` | **COMPLETED** | `766d70e` | 2113/2113 · 123 dosya | orta |

### Paket 1 — Blok yerleşim modeli (saf çekirdek)
- **Çıktı:** blok tipi kapalı sözlüğü + `BlockSchema`/`LayoutDocSchema` (mm tabanlı, Zod) · format × katlama → panel geometrisi (A3/A4/A5 × dikey/yatay × 0/1/2 kırım; trifold'un sabit haritası **genelleştirildi**, kopyalanmadı) · panel-içi ızgara snap + çarpışma önleme + taşma tespiti.
- **Korunan sözleşme:** yerleşim matematiği SAF ve deterministik; mutasyon tek kapıdan (`placeBlock`). Mevcut şablon dünyasına dokunuş **sıfır** (additive-only).
- **Kayıtlı scope_out:** UI/sürükle-bırak → paket 2 · içerik render + ürün formu → paket 3 · `engine/layout.ts` bağlanması → paket 4 · etkin DPI/preflight → paket 5.

### Paket 2 — Blok tuvali UI
- **Çıktı:** `/tasarim` rotası · palet (8 blok) + üç panelli tuval · kat/safe/bleed görünürlüğü · sürükle-bırak + tıkla-ekle + taşı/sil · `BLOCK_DEFAULT_SIZE_MM` · `placeBlock` NaN korkuluğu.
- **Korunan sözleşme:** bu dosyada yerleşim matematiği YOK — yalnız mm↔ekran çevirisi ve etkileşim. Paketin kendisi görsel provadır.
- **Kayıtlı scope_out:** ürün formu + katalog bağı → paket 3 · otomatik küçültme → paket 4 · DPI/preflight → paket 5 · kalıcılık (sunucu evi) ürün yönü netleşmeden açılmaz · zoom/resize tutamağı sonraki tur.

### Paket 3 — İçerik blokları + Ürün Ekle
- **Çıktı:** `shared/block-content.ts` (`MenuItem` + blok içerik şemaları + liste/grid kapasite matematiği) · `BlokIcerik` (tuvalde gerçek içerik, `TYPO_MM` tek kaynak, nowrap+ellipsis yatay korkuluğu) · `BlokDenetci` (+ Ürün Ekle, ad/fiyat/açıklama/fotoğraf, kolon seçimi) · içerik-taşma rozeti.
- **Korunan sözleşme:** kapasite matematiği ile çizim **tek kaynaktan** beslenir; sığmayan ürün SİLİNMEZ, sayılır ve bildirilir. İçerik taşması ile panel taşması ayrı kavramdır.
- **Kayıtlı scope_out:** gerçek katalog entegrasyonu (`catalog_item_id` alanı açıldı ama kimse doldurmuyor/okumuyor) · DB kalıcılığı/varlık deposu · zoom/resize/tam auto-layout → paket 4 · preflight → paket 5.

### Paket 4 — Akıllı otomatik yerleşim
- **Çıktı:** `templates/engine/blok-yerlesim.ts` (panel eğilimi · doğal yükseklik · `parcala` devam blokları · `autoYerlestir` + `AutoRapor`) · web'de Otomatik Yerleştir / Geri Al · açık taşma raporu.
- **Korunan sözleşme:** **ikinci akış motoru YOK** — `composeColumns`'a bağlanır. Otomatik yerleşim YALNIZ açık kullanıcı eylemiyle çalışır; arka planda sessiz yeniden dizme yoktur. Sığmayan içerik silinmez/gizlenmez: bölünür, akıtılır, raporlanır.
- **Kayıtlı scope_out:** AI tasarım (kurallar deterministik) · katalog/DB · zoom/pan · resize · Bezier · preflight → paket 5.

### Paket 5 — Baskı güvenliği / preflight
- **Çıktı:** `templates/engine/preflight.ts` (`PRINT_ESIK` · `effectiveDpi` iki eksen, düşük olan karar verir · kullanım başına görsel denetimi · safe/fold/bleed/overflow) · preflight paneli (tek cümle özet + sade Türkçe bulgular) · `MenuItem`/`GorselIcerik` `photo_w`/`photo_h`.
- **Korunan sözleşme:** **kritik içerik** (fiyat/ad/telefon/logo/kategori) safe+fold kuralına tabidir; **dekoratif görsel** kat üzerinden geçebilir ve bleed'e kadar gider — aynı kuralı ikisine uygulamak yanlış pozitif ya da kaçırılmış hata üretirdi. **Ölçülemeyen "geçti" değildir:** piksel ölçüsü yoksa DPI hesaplanamaz ve bu ayrı bulgu olur. Eşikler tek merkezde.
- **Kayıtlı scope_out:** **PDF/X export · CMYK dönüşüm · ICC profil — "sonraki paketler"** · otomatik düzeltme YASAK (bu paket okur ve söyler) · katalog/DB · AI tasarım · zoom/pan · checkout.

### Paket 6 — Adaptif tema + reflow
- **Çıktı:** `templates/engine/adaptif-tema.ts` (yoğunluk seviyeleri · `TEMA_AILESI` ferah/normal/yoğun · `gridAdaylari` + skorlama · `enIyiKolon` · `MIN_OLCEK`) · kapasite fonksiyonlarına ölçek parametresi + `blokOlcegi` · ölçeği bloğa yazma · reflow (yalnız oto modda) + ürün sırası + ürün değiştir.
- **Korunan sözleşme:** sonuç **hard-code değil** — aday üretilir, gerçek panel ölçüsüyle skorlanır. **Okunabilirlik tabanı (`MIN_OLCEK`) pazarlık konusu değil**; "sadece font küçülterek problemi gizleme" mekanik olarak imkânsız. **Fotoğraf oranı sabit** — ölçek yalnız metni sıkıştırır. Ölçek ile kapasite aynı sayıyı okur.
- **Kayıtlı scope_out:** AI generative design · Corel/Bezier · katalog backend · PDF/X-CMYK · checkout · **çok sayfalı belge → ayrı paket** (6.5 oldu).

### Paket 6.5 — Çok sayfalı belge + global reflow
- **Çıktı:** `templates/engine/cok-sayfa.ts` (`CokSayfaliBelge` · `globalReflow` · `MAX_YAPRAK` korkuluğu · `belgeyeCevir` geriye uyum) · `AutoRapor.yerlesmeyenBloklar` · web'de belge = yaprak dizisi + sayfa gezinimi.
- **Korunan sözleşme:** paket 6'nın motoru **yeniden yazılmadı, genelleştirildi** — ikinci yerleşim motoru doğmadı. **Ortada boşluk kalmaz** (ürün silinince tüm içerik baştan akar). **Gereksiz yaprak kalkar, gereken doğar** — sayfa sayısı bir sonuç, kullanıcı ayarı değil. Tek yapraklı eski belgeler geçerli.
- **Kayıtlı scope_out:** AI tasarım · Pro/Bezier · katalog backend · PDF/X-CMYK · checkout · **denetçi sanal listesi / memoization — ölçülmüş performans bulgusu, "ayrı iş"**.

### Paket 6.6 — Performans + adaptif yoğunluk UX
- **Çıktı:** yazma ile belge akıtmanın ayrılması (metin her tuşta yazılır, `globalReflow` commit sınırına kayar: blur/Enter/sayfa değişimi + 900 ms emniyet ağı) · ölçeğin **dolulukdan** doğması (`OLCEK_ADAYLARI` skorlama · `hedefDoluluk` · `ekSayfaOner`/`ferahSayfaOner`) · `apps/web/src/perf.ts` ölçüm sayaçları.
- **Ölçülen sonuç:** 19 karakterde reflow **19 → 0** (100 ve 320 ürün) · 320 üründe karakter başına 16.4 → 12.4 ms · tarayıcıda ölçek A30/B70/**C100 → 1.25**, D320 → 0.80.
- **Korunan sözleşme:** **ertelenen şey veri değil akıştır** — bekleyen "kaydedilmemiş metin" yoktur, bu yüzden son-karakter kaybı yapısal olarak imkânsız. Otomatik yerleşim hâlâ yalnız açık kullanıcı eylemiyle. **Ölçeği okunabilirlik seçer, doluluk hedefi SAYFA ÖNERİR** — ferahlık fontu küçültmekle kazanılmaz. Sessizce sayfa eklenmez (baskı sayfası paradır; öneri söylenir, karar kullanıcının).
- **Kayıtlı scope_out:** journal'da **boş** — bu paket kapanışında ilan edilmiş bir "sonraki" YOK. §4'ün neden plan sınıfı olmak zorunda olduğunun sebebi budur.

---

## 2. BU HATTIN DEĞİŞMEZ SÖZLEŞMELERİ

Sonraki hiçbir paket bunları sessizce bozamaz; bozacaksa açık ürün kararı ister.

1. **Yerleşim matematiği saf ve tek kapıdan.** Mutasyon `placeBlock`; akış `composeColumns`. İkinci motor doğmaz.
2. **Ürün DÜŞMEZ.** Sığmayan içerik silinmez, CSS ile kaybettirilmez; bölünür/akıtılır, olmazsa **sayılarak** bildirilir. "+N gizli" nihai otomatik yerleşim sonucu olmaz.
3. **Okunabilirlik tabanı (`MIN_OLCEK`) altına inilmez.** Font küçültmek son çarelerden biridir.
4. **Fotoğraf oranı bozulmaz.**
5. **Ölçülemeyen "geçti" değildir.**
6. **Habersiz düzeltme yok.** Otomatik küçültme/taşıma/silme/sayfa ekleme yapılmaz; okunur ve söylenir.
7. **Otomatik yerleşim yalnız açık kullanıcı eylemiyle.** Elle kurulmuş düzen arka planda yeniden dizilmez.
8. **Kapasite ile çizim aynı sayıyı okur.**
9. **Sayfa sayısı bir sonuçtur**, kullanıcının yöneteceği ayar değil; arada boş sayfa kalmaz.
10. **Geriye uyum:** tek yapraklı belge geçerli bir belgedir.

---

## 3. DEFERRED / DEBT — sonraki paketin içine OTOMATİK GİRMEZ

Bunlar **ürün paketi değildir**; kayıttır. Bir paketin kapsamına girmeleri ayrı
ürün kararı ister.

| # | Kalem | Sınıf | Kaynak |
|---|---|---|---|
| D-B1 | **320 ürünü GİRMEK ~10 sn** (tıklama başına ~31 ms). Otomatik yerleşim ÖNCESİ tek blok tüm ürünleri taşır, denetçi her tıklamada n satır çizer (n² maliyet). Bölünmeden SONRA sabitlenir (36–44 satır). | ÖLÇÜM (gerçek Chromium, üretim build'i) | journal `cok-sayfa` scope_out ("ayrı iş") + `performans-adaptif-yogunluk` doğrulayıcı kararı |
| D-B2 | **`/assets` proxy çakışması.** `apps/web/vite.config.ts` `/assets`'i API'ye proxy'ler; üretim build'inin kendi JS/CSS'i de `/assets/` altına çıkar → üretim build'i bu proxy ile boş sayfa. Dağıtımda ters vekilin iki anlamı ayırması gerekir. | ÖLÇÜM (404, ölçüldü) | journal `performans-adaptif-yogunluk` note + doğrulayıcı |
| D-B3 | **favicon 404.** | ÖLÇÜM | aynı |
| D-B4 | **Ürün adı boşken "sil" düğmelerinin erişilebilir adı ayrışmıyor** (321 düğme, 2 tekil ad). Erişilebilirlik borcu. | ÖLÇÜM | journal `cok-sayfa` note |
| D-B5 | **PDF/X export · CMYK dönüşüm · ICC profil.** | KAYITLI ERTELEME | journal `preflight` scope_out: "sonraki paketler" |
| D-B6 | **Denetçi sanal listesi / memoization.** D-B1'in muhtemel çözüm yolu; kendisi bir hedef değil bir teknik. | KAYITLI ERTELEME | journal `cok-sayfa` scope_out |
| D-B7 | **Katalog entegrasyonu.** `MenuItem.catalog_item_id` alanı AÇIK ama hiçbir yer doldurmuyor/okumuyor. | KAYITLI SINIR | journal `icerik-bloklari-urun-ekle` scope_out |
| D-B8 | **Belge kalıcılığı (DB/sunucu evi).** Tasarım durumu sayfa yerelinde yaşıyor. | KAYITLI SINIR | journal `blok-tuvali-ui` scope_out ("ürün yönü netleşmeden açılmaz") |
| D-B9 | **Zoom / pan / yeniden boyutlandırma tutamağı.** | KAYITLI SINIR | journal paket 2/3/4 scope_out |

**Kapsam dışı ilan edilenler** (hattın hiçbir paketinde istenmedi): AI generative
design · Corel/Bezier/Pro editör · checkout.

---

## 4. SONRAKİ PAKET ADAYLARI — **PLAN SINIFI** (ölçüm DEĞİL)

> **PLAN İŞARETİ (Canonical 11.4):** Bu bölüm **niyet** bilgisidir. Hiçbir
> satırı ölçüm değildir ve ölçüm gibi sunulamaz. Adaylar repo kanıtından
> (journal scope_out'ları · TODO.md · ADR) çıkarılmıştır; **hiçbiri seçilmiş
> değildir.** "Paket 7 budur" kararı ürün sahibinindir.

Paket 6.6 kapanışında journal'a yazılmış bir "sonraki" YOK (scope_out boş).
Dolayısıyla sıradaki paket türetilemez, **seçilmelidir**.

### Aday A — Belge kalıcılığı (tasarımı kaydet/aç)
- **Neden sırada olabilir:** hattın sekiz paketi çalışan bir builder üretti ama **hiçbir tasarım kaydedilemiyor** — durum sayfa yerelinde. Bu, builder'ı bugün gerçek işte kullanılamaz kılan tek yapısal eksik. Paket 2'den beri kayıtlı sınır (D-B8) ve erteleme gerekçesi "ürün yönü netleşmeden açılmaz"dı; yön artık net.
- **Bağımlılık:** yok (hat içi). Şema/migration kararı ister — `docs/adr/` ve migration ritüeli (`TODO.md` "migration geçmişi yeniden yazılmaz").
- **Kullanıcı değeri:** yüksek — "yaptığım menüyü yarın açıp düzeltebilir miyim?"
- **Risk sınıfı:** **orta-yüksek** (DB + migration + geri döndürülemez veri sınırına yakın; `00_READ_FIRST` 7 kullanıcı kararından biri "geri döndürülemez veri").

### Aday B — Katalog bağı (`catalog_item_id`'yi canlıya bağlamak)
- **Neden sırada olabilir:** alan paket 3'te AÇILDI ama ölü duruyor (D-B7) — ölü sözleşme repo yasasında kusurdur (`TODO.md` boyunca "ölü sözleşme yasak" emsali tekrar ediyor: preview_types, substrat, hedef kullanıcı). Ayrıca müşterinin kataloğu (`SECTOR_PACKS`) ve fiyat kaynağı zaten repoda mevcut.
- **Bağımlılık:** Aday A'ya **kısmen** bağlı (bağlanan kalemin bir yere kaydedilmesi gerekir); `brief-view.ts` "fiyat eksiksizliği katalogdan OKUNUR" emsali var.
- **Kullanıcı değeri:** yüksek — ürünleri elle yazmak yerine kataloğundan seçmek; 320 ürünü tek tek girme acısını (D-B1) kökten azaltır.
- **Risk sınıfı:** **orta** (mevcut sözleşmelere dokunur, ama alan zaten şemada).

### Aday C — Baskı çıktısı hattı (PDF/X · CMYK · ICC)
- **Neden sırada olabilir:** preflight paketi (5) bunu **adıyla** "sonraki paketler"e bıraktı (D-B5) — hattın kendi kaydındaki tek açık ileri atıf. Preflight "baskıya hazır" diyor ama basılabilir dosya üretilmiyor; zincir burada kopuyor.
- **Bağımlılık:** preflight ✓ (var) · `ADR-005` (üretim = creative-engine; mockup ≠ prova) · mevcut `render`/`exports` hattı ve kanal bekçileri (`productionChannelsOf`, `RENDER_CONTRACT_V=1`).
- **Kullanıcı değeri:** yüksek ama **koşullu** — kaydedilemeyen (Aday A) ya da katalogsuz (Aday B) bir tasarımın çıktısını almak, akışın ortasından başlamak olur.
- **Risk sınıfı:** **yüksek** (renk yönetimi + dış hat sözleşmesi + `RENDER_CONTRACT` sürüm disiplini; ayrıca ürün sahibi kararı gerektiren ticari yüzeye yakın).

**Bu üçü dışında bir aday görmedim.** TODO.md'deki açık kalemlerin tamamı F1
brief / sipariş / üretim-profili hattına ait; builder hattına değmiyorlar.
Repodaki tek "P7" de o hattın fazıdır (`briefs.ts` → `501 not_yet_available`,
"P7 kutusunda açılır") ve **bu hattın Paket 7'si değildir** — karıştırılmamalı.

---

## 5. BAYAT DOKÜMAN UYARISI

| Dosya | Durum | Neden |
|---|---|---|
| `docs/ROADMAP.md` | **TARİHSEL** (T-hattı görünümü) | Cockpit v14'ten (2026-07-14) türetilmiş; "T3 PART-B ◀ şimdi" diyor ama HEAD çok ötede. Builder hattını **hiç** kapsamaz. |
| `docs/GOAL_QUEUE.md` | **TARİHSEL** (T-hattı görünümü) | Aynı kaynak, aynı tarih. |
| `docs/PROGRAM_COCKPIT.md` | **POINTER kopya, v14** | Master styva'da. §7 NEXT_ACTION F8-D merge + T3 gösteriyor. |
| `docs/EXECUTION_DIRECTIVE.md` | Yürürlükte | Oturum-açılış sırası burada; builder yolu eklendi. |

Bu dosyalar SİLİNMEDİ ve içerikleri DEĞİŞTİRİLMEDİ (türetilmiş görünümü elle
doldurmak yasak); yalnız başlarına tarihsellik uyarısı düşüldü. Güncellenmeleri
gerekiyorsa kaynak cockpit'in yeni sürümü gelmelidir — yönetişim işi.
