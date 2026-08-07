# 00_READ_FIRST.md — v2 (2026-07-14)
Bu dosya her uygulayıcı oturumunun İLK okumasıdır. (v1 kayboldu — D-25; v2 güncel
kanondan yeniden yazıldı — D-26. v1 bulunursa arşivdir; yürürlük bu metin.)
Bu kopya: TEZGAH

## KİMLİK
Bu repo, üç yaşayan üründen biridir: STYVA (ticari e-ticaret çekirdeği) · TEZGÂH
(tasarım platformu) · SWISS (restoran operasyon platformu). Hiçbiri diğerinin alt
projesi, branch'i veya çalışma dizini değildir; entegrasyon yalnızca versioned
Contract katmanları üzerinden yapılır (D-9 + D-24). Bu oturum = bu reponun
UYGULAYICI hattıdır; yönetişim ayrı oturumdadır; Kurye (kullanıcı) taşır — onay
taşımaz. Yalnız 7 karar kullanıcınındır: marka/ürün isimleri · ticari strateji ·
fiyatlandırma · hukuk/lisans · ücretli dış sözleşme · production'a gerçek geçiş ·
geri döndürülemez veri.

## AÇILIŞ SIRASI (her oturum, istisnasız)
1. Bu dosya.
2. EK-GIT git-blok: git fetch --all --prune · git status --short --branch ·
   git branch --show-current · git rev-parse HEAD · git log --oneline --decorate
   -20. Ana dal adını repo gerçeğinden doğrula. Working tree kirliyse: DUR, raporla.
3. /docs sırası: PROGRAM_COCKPIT.md → GOAL_QUEUE.md / ROADMAP.md → adr/ →
   EXECUTION_DIRECTIVE.md.
4. Güncel paketi bekle/uygula — paket Kurye'yle yönetişimden gelir; paketsiz
   inisiyatif yok.

## REPO-YEREL EK — TEZGÂH (bu blok üç-repo çekirdeğine AİT DEĞİL)
> **Bu blok yalnız TEZGÂH kopyasındadır** ve dosyanın "üç repoda birebir kopya"
> çekirdeğinin parçası değildir. Bilerek buraya kondu, çünkü 3. adımdaki keşif
> yolu bu repoda EKSİK ölçüldü: tasarım-builder hattı (Paket 1…6.6) commit ve
> journal'da gerçek, ama PROGRAM_COCKPIT (v14 kopyası) ve ondan türetilen
> GOAL_QUEUE/ROADMAP görünümlerinde **hiç görünmüyor**. Bu blok olmadan açılış
> sırası okuyucuyu bayat T-hattı görünümüne bırakıp builder hattını gizliyordu.
> Diğer iki repoya taşınıp taşınmayacağı **yönetişim kararıdır**; buradaki tek
> iddia, sapmanın sessiz değil işaretli olmasıdır.
>
> **3. adımın TEZGÂH eki:** `/docs/BUILDER_ROADMAP.md` — builder hattının kanonik
> kaydı (Paket 1…6.6 ledger'ı = ölçüm sınıfı, journal'a birebir bağlı · değişmez
> sözleşmeler · DEFERRED/DEBT · sonraki paket adayları = **plan sınıfı, işaretli**).
> Canonical 11.3 + 11.4. Kuruluş: journal `2026-08-07-builder-roadmap-otoritesi`.
>
> İki uyarı: **(1)** ROADMAP.md ve GOAL_QUEUE.md **tarihsel** görünümlerdir
> (başlarındaki uyarıya bakın) — güncel gerçek sanılmamalı. **(2)** Repoda geçen
> **"P7"** ibaresi F1 brief yaşam döngüsü fazıdır, builder hattının Paket 7'si
> **değildir**.

## STEP-2 KURALI (doküman ≠ kod)
3. adımdaki dosyalar henüz YOKSA (materyalizasyon öncesi): yokluğu açılış raporunda
AÇIKÇA belirt; içerik UYDURMA; materyalizasyon ilgili adım-0 commit'iyle yapılır.

## ÇALIŞMA YASASI (özet — tam metin: PROGRAM_COCKPIT + EK-GIT)
- Repository = tek gerçek; sohbet geçmişi / eski ZIP / eski kopya kaynak DEĞİLDİR.
- Kapsam paketle DONUK; genişletme yok; sapma → DUR → yönetişime rapor.
- İki başarısız tur → kök neden + daraltılmış paket iste.
- Merge YALNIZ yönetişim kutusuyla; main'e doğrudan push YASAK; force push YASAK;
  migration geçmişi yeniden yazılmaz; başka ajanın commiti ezilmez.
- Paket dalları merge ÖNCESİ origin'e push edilir; merge sonrası dal silinir.
- İnsan-beyanları komut-doğrulanır; envanterler isim-isim serileştirilir.
- Çaprazlama: kutu yoldayken hukuk değişirse iş TEKRARLANMAZ — koşulmuş işi yeni
  hukukla yeniden-doğrula, teyidi yeni formatla kes.

## KAPANIŞ RAPORU (her paket sonunda, tek blok, yönetişime)
Başlık: REPO_ACCESS · BASE_COMMIT · PUSH_STATUS. Gövde: kanıt seti — test toplamı
TAM KIRILIMLA · typecheck · diff özeti · smoke. Son satır: EXACT NEXT STEP.
