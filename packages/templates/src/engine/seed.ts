/* KONTROLLÜ BENZERSİZLİK ÇEKİRDEĞİ — Canonical 4.4 `designSeed`.
   ============================================================================
   Bu dosya SAF ve DETERMİNİSTİKTİR: Math.random yok, saat yok. Aynı tohum +
   aynı tuz = aynı sayı — tasarım YENİDEN ÜRETİLEBİLİR ve istemeden değişmez
   (4.4); motorun determinizm sözleşmesi (4.1) bozulmaz.

   "Benzersizlik rastgelelik değildir": tüketiciler serbest sayı değil,
   `seededVariant` ile KAPALI bir varyant kümesinden seçer — her varyant
   tasarımca onaylanmış, baskı güvenli, simetrik bir seçenektir.

   NOT: motorun kompozisyon isteklerine (ColumnCompositionRequest vb.) tohum
   alanı BİLEREK eklenmez — motor tohumu tüketmez; tohumlu kararlar şablonun
   build kapanışında (metrik/varyant seçimi) verilir. Tüketilmeyen alan,
   composition.ts'ten kaldırılan ölü `seed` sözleşmesini geri açmak olurdu. */

/** FNV-1a 32-bit — dize → kararlı tohum çekirdeği */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — tek çekiliş [0,1); kriptografik DEĞİL (tasarım varyasyonu) */
function mulberry32Once(a: number): number {
  let t = (a + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Tohum + tuzdan [0,1) aralığında deterministik birim sayı.
 * `salt`: aynı belgede BİRDEN ÇOK bağımsız karar gerektiğinde ayrıştırıcı
 * (ör. "liste-ritim" vs "dekor-sira") — tuzsuz tüm kararlar kilitlenirdi.
 */
export function seededUnit(seed: number, salt = ""): number {
  return mulberry32Once(fnv1a(`${seed}:${salt}`));
}

/**
 * KAPALI kümeden deterministik varyant seçimi — kontrollü benzersizliğin
 * temel biçimi (4.4). Boş küme derleme düzeyinde engellenemez; fail-loud.
 */
export function seededVariant<T>(seed: number, variants: readonly T[], salt = ""): T {
  if (variants.length === 0) {
    throw new Error("seededVariant: boş varyant kümesi (kontrollü benzersizlik kümesiz olmaz)");
  }
  return variants[Math.floor(seededUnit(seed, salt) * variants.length)];
}
