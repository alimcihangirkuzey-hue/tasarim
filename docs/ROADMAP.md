# ROADMAP — TEZGÂH (Repo C) hattı
*(PROGRAM_COCKPIT v14 §2'den türetilmiş sıra görünümü; master styva'da.)*

> ## ⚠ TARİHSEL GÖRÜNÜM — GÜNCEL GERÇEK DEĞİL
> Bu dosya **T-hattını** (T1…T4 + GOAL-* program kuyruğu) anlatır ve cockpit
> **v14 (2026-07-14)** kopyasından türetilmiştir. "T3 PART-B ◀ şimdi" ibaresi o
> ANIN durumudur; repo HEAD'i çok ötededir. İçeriği **değiştirilmedi** — MULTI_REPO
> v1.2 §6 bu dosyayı cockpit §2'ye bağlar, türetilmiş bir görünümü elle doldurmak
> türetme sözleşmesini bozar. Güncellenmesi için kaynak cockpit'in yeni sürümü
> gelmelidir (yönetişim işi).
>
> **TASARIM-BUILDER HATTI BU DOSYADA YOKTUR.** Paket 1…6.6 (blok yerleşim → blok
> tuvali → içerik blokları → otomatik yerleşim → preflight → adaptif tema → çok
> sayfa → performans/adaptif yoğunluk) için kanonik kayıt:
> **[BUILDER_ROADMAP.md](./BUILDER_ROADMAP.md)**
>
> Çelişki kuralı (§6 son satırı): repo gerçeği ≠ doküman ise **repo gerçeği esastır**.

## C-hattı sırası (T-lane)
1. **T1 TUR-FIX** ✅ (main `4f84980`) — görsel tur kırıkları (DELETE başlık + dil-duyarlı A4 başlığı)
2. **T1b HOTFIX** ✅ (main `6f18cf1`) — tekrar-intake mükerrer kategori (FIX-3 birleşme)
3. **T2 F8-D** ✅ koşuldu (bu commit'in tabanı) — mockup damga + katman altyapısı + MAX_W dedupe
4. **T3 PART-B** ◀ şimdi — adım-0: /docs governance bootstrap · adım-1: Render Contract v1 engine şimi (styva FLYER M7'nin çağıracağı kapı)
5. **T4 F8-E** (backlog) — H4 çok-yüzey presentation derleme + yüksek-çöz kapısı (paket yönetişimden)

## C'ye dokunan program bağımlılıkları
- **GOAL-FLYER-01 (styva M1-M7):** M7, T3'ün render kapısına bağlı — impact C: PART-B PATCH (M1-M6: C NO CHANGE).
- **GOAL-5/6/8 (tabela gece-gündüz · cam · tekstil):** C'nin motor yüzeyleri; paketleri yönetişimden gelir.
- **Contracts:** Render v1 (B↔C, T3'te doğar) · Menu/QR + Tenant/Identity (B↔A, C'ye dokunmaz).

## Kalıcı kurallar (bu repo için)
- C pasifleştirilemez / eritilemez; entegrasyon yalnız sürümlü Shared Contract (direktif v1.2).
- Legacy-hat paketleri docs bootstrap taşımaz (D-14); governance /docs'ta, master styva.
- print/preview render hattı contract işlerinde DOKUNULMAZ (mockup ≠ prova, ADR-005).
