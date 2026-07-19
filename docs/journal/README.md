# Package Journal

Geliştirme sürecinin **append-only ölçüm kaydı**. Canonical Bölüm 11.3'e göre burası,
geliştirme sürecine dair gösterilen her **ölçümün** tek doğruluk kaynağıdır.
Saklama kararı: [TDR-001](../tdr/TDR-001.md).

```
docs/journal/
  events/<package_id>.jsonl   ← TEK GERÇEK. Paket başına bir dosya, satır başına bir olay.
  evidence/<package_id>/      ← yalnız KALAN kapıların ham çıktısı (.txt — *.log gitignore'da)
  schema/                     ← şema notları
```

## Elle NE YAPILMAZ

- **Bir satır elle düzenlenmez veya silinmez.** Her satır kendinden önceki satırın hash'ini
  taşır; birini değiştirmek ondan sonraki tüm hash'leri geçersizler ve `npm run journal:verify`
  bunu yakalar. Düzeltme de append'tir: yeni bir olay eklenir.
- **`seq` yeniden numaralandırılmaz.** Boşluksuz `seq` bir süs değil, taşıyıcı kolondur:
  bir satırın sessizce çıkarılmasını yakalayan tek şey odur (git diff'e temiz bir çıkarma
  `1 0` görünür — bunu `seq` ve zincir yakalar, git değil).
- **Paket kaydı diske yazılmaz.** `<pkg>.record.json` gibi bir dosya YOKTUR ve yaratılmamalıdır;
  paket kaydı her okumada `foldPackageJournal()` ile olay akışından türetilir (11.3).
- **Bir paketin journal'ı yalnız kendi dalında yazılır.** İki dalda aynı dosyaya yazmak
  `.gitattributes`'taki `merge=binary` sayesinde sessizce birleşmez, açık çakışma üretir.

## Yazma

Tek kapı: `packages/journal/src/store.ts::appendEvent()`. Başka hiçbir yerden yazılmaz.

```bash
npm run journal -- declare  --package <id> ...
npm run journal -- stage    --package <id> --to gelistirme ...
npm run journal -- gate     --package <id> --gate test ...     # KOMUTU KOŞAR
npm run journal -- show     --package <id>                     # türetilmiş paket kaydı (JSON)
npm run journal:verify                                         # dört doğrulama katmanı
```

**Makine kapılarında (`typecheck` `lint` `test` `build` `bundle`) `--outcome` bayrağı yoktur.**
Sonuç yalnız gerçek exit code'dan doğar; elle "geçti" yazmanın yolu bilerek bırakılmamıştır.
**İnsan kapılarında (`gt` `smoke`) `--command` yoktur** ve `--evidence` zorunludur; ayrıca
bir **ajan** insan kapısını imzalayamaz (Canonical 11.6/3).

## Ölçüm dürüstlüğü

Kapı sonucu dört değerlidir: `gecti` · `kaldi` · `atlandi` · `olculemedi`.
Koşulmayan kapı "geçti" yazılamaz; atlanan **atlandı**, ölçülemeyen **ölçülemedi** olarak
gerekçesiyle kayda geçer. Sayı komutun kendi çıktısından gelmiyorsa `method` alanı nasıl
çıkarıldığını söyler (ör. bundle boyutu `npm run build`'in stdout'undan değil,
`gzip(dist/assets/*.js)`'ten gelir).

Her kapı tanımı bir `scope` şerhi taşır: kapının **ölçmediği** şey.
Faz 1 Cockpit bu şerhi **her sayının yanında** göstermek zorundadır — aksi hâlde
"lint 0" ifadesi, kapsamı kadar dürüst olmayan bir sayı olur.

## Geçmiş burada yok

Journal **2026-07-19'da** başlar. Ondan önceki teslimler `TODO.md` ve `CHANGELOG.md`'de
düzyazı olarak yaşar ve **göç ettirilmemiştir**: o kayıtların çoğunda ölçüm anı yok (yalnız
gün), üreten komut yok, birkaçında kapı dürüstçe "ERTELENDİ" yazıyor. Onları "geçti" diye
Journal'a yazmak, modülün var oluş sebebini çürütürdü. Bu bir eksik değil, bir karardır
([TDR-001](../tdr/TDR-001.md)).
