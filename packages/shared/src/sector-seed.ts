/* Sektör paketi TOHUM VERİSİ — F7-B2 (saf veri). COMMON_QUESTIONS tek kaynak;
   her paketin questions'ı item atıflarından MONTAJLANIR (tekrar yazılmaz).
   Item adı: fr = Fransa terminolojisi (liste); tr Türkçe karşılık (Türkçe/loan ad
   → aynı); de best-effort (boş kalan gap-mekanizmasına düşer). q_icerik SEED'de
   YOK (F7-C yerleşik çip düzenleme + içerik anahtarı). Kategori notu SectorPack
   şemasında alan olmadığından taşınmaz (F7-C/schema adayı). */

import { chipId } from "./seed-chips.js";
import type {
  Question,
  QuestionOption,
  SectorPack,
  SectorPackCategory,
  SectorPackItem,
} from "./sector.js";

const opt = (value: string, label_tr: string): QuestionOption => ({ value, label_tr });

const q = (
  id: string,
  label_tr: string,
  kind: Question["kind"],
  affects: Question["affects"],
  options?: QuestionOption[]
): Question => ({ id, label_tr, kind, affects, ...(options ? { options } : {}) });

/* Ortak sorular — tek kaynaktan paketlere yayılır. "çoklu-choice" → kind:"choice"
   (schema'da multi yok; çoklu seçim F7-C UI). q_siparis_uzerine → variant
   (fiyat-bekliyor = null-fiyat varyantı). q_icerik ÇIKARILDI. */
export const COMMON_QUESTIONS: Question[] = [
  q("q_porsiyon", "Porsiyon", "choice", "variant", [opt("tam", "Tam"), opt("yarim", "Yarım")]),
  q("q_birim", "Birim", "choice", "variant", [opt("porsiyon", "Porsiyon"), opt("kg", "Kg"), opt("adet", "Adet")]),
  q("q_boy_pizza", "Boy", "choice", "variant", [opt("o24", "Ø24"), opt("o32", "Ø32"), opt("o40", "Ø40")]),
  q("q_boy_tacos", "Boy", "choice", "variant", [opt("m", "M"), opt("l", "L"), opt("xl", "XL")]),
  q("q_boy_icecek", "Boy", "choice", "variant", [opt("kucuk", "Küçük"), opt("buyuk", "Büyük")]),
  q("q_sunum", "Sunum", "choice", "variant", [opt("sandvic", "Sandviç"), opt("durum", "Dürüm"), opt("tabak", "Tabak")]),
  q("q_menu", "Menü", "boolean", "variant"),
  q("q_et", "Et", "choice", "variant", [opt("tavuk", "Tavuk"), opt("dana", "Dana"), opt("karisik", "Karışık")]),
  q("q_adet", "Adet", "choice", "variant", [opt("6", "6"), opt("9", "9"), opt("12", "12")]),
  q("q_ek_ikram", "Ek ikram", "boolean", "note"),
  q("q_acili", "Acılı", "boolean", "note"),
  q("q_siparis_uzerine", "Sipariş üzerine", "boolean", "variant"),
];

/* Paket-özel sorular (#2) — COMMON kirlenmez. */
const PACK_QUESTIONS: Question[] = [
  q("q_boy_kahve", "Boy", "choice", "variant", [opt("tek", "Tek"), opt("duble", "Duble")]),
  q("q_boy_cay", "Boy", "choice", "variant", [opt("bardak", "Bardak"), opt("demlik", "Demlik")]),
  q("q_adet_top", "Top", "choice", "variant", [opt("1", "1 top"), opt("2", "2 top"), opt("3", "3 top")]),
  q("q_birim_kisi", "Birim", "choice", "variant", [opt("kisi", "Kişi başı")]),
];

const ALL_QUESTIONS = new Map<string, Question>(
  [...COMMON_QUESTIONS, ...PACK_QUESTIONS].map((qq) => [qq.id, qq])
);

/* Item: fr = liste adı; tr Türkçe; de best-effort. chips TR adıyla → id (chipId). */
const item = (
  tr: string,
  fr: string,
  de: string,
  questions: string[] = [],
  chips: string[] = []
): SectorPackItem => ({
  name: { tr, fr, de },
  default_chips: chips.map(chipId),
  questions,
});

const cat = (tr: string, fr: string, de: string, items: SectorPackItem[]): SectorPackCategory => ({
  name: { tr, fr, de },
  items,
});

/* Montaj: item atıflarından paket sorularını topla (tekrar yazılmaz). Bilinmeyen
   soru id → hata (erken yakalar → referans bütünlüğü kod düzeyinde de korunur). */
function pack(id: string, label_tr: string, categories: SectorPackCategory[]): SectorPack {
  const qids = new Set<string>();
  for (const c of categories) for (const it of c.items) for (const qid of it.questions) qids.add(qid);
  const questions = [...qids].map((qid) => {
    const found = ALL_QUESTIONS.get(qid);
    if (!found) throw new Error(`Bilinmeyen soru id "${qid}" (paket ${id})`);
    return found;
  });
  return { id, label_tr, categories, questions, chips: [] };
}

const kebap = pack("pack_kebap_doner", "Kebap / Döner", [
  cat("Sandviçler", "Sandwichs", "Sandwiches", [
    item("Kebap", "Kebab", "Kebab", ["q_sunum", "q_menu"], ["döner eti", "salata", "domates", "soğan"]),
    item("Yufka Döner", "Yufka Döner", "Yufka Döner", ["q_menu"], ["döner eti", "salata", "domates", "soğan"]),
    item("Köfte", "Köfte", "Köfte", ["q_sunum", "q_menu"]),
    item("Escalope", "Escalope", "Schnitzel", ["q_menu"]),
    item("Falafel", "Falafel", "Falafel", ["q_sunum", "q_menu"]),
    item("Hamburger", "Hamburger", "Hamburger", ["q_menu"], ["kıyma", "salata", "domates", "soğan", "burger sosu"]),
    item("Cheeseburger", "Cheeseburger", "Cheeseburger", ["q_menu"], ["kıyma", "cheddar", "salata", "domates", "soğan", "burger sosu"]),
  ]),
  cat("Tacos", "Tacos", "Tacos", [
    item("Tavuk Tacos", "Tacos Poulet", "Poulet Tacos", ["q_boy_tacos"], ["tavuk", "patates kızartması"]),
    item("Döner Tacos", "Tacos Döner", "Döner Tacos", ["q_boy_tacos"], ["döner eti", "patates kızartması"]),
    item("Hamburger Tacos", "Tacos Hamburger", "Hamburger Tacos", ["q_boy_tacos"], ["kıyma", "patates kızartması"]),
  ]),
  cat("Pide & Lahmacun", "Pidés & Lahmacun", "Pide & Lahmacun", [
    item("Lahmacun", "Lahmacun", "Lahmacun", ["q_sunum", "q_acili"]),
    item("Kaşarlı Pide", "Pidé Fromage", "Käse-Pide", [], ["kaşar"]),
    item("Dönerli Pide", "Pidé Döner", "Döner-Pide", [], ["döner eti"]),
    item("Kıymalı Pide", "Pidé Viande Hachée", "Hackfleisch-Pide", [], ["kıyma"]),
    item("Sucuklu Pide", "Pidé Sucuk", "Sucuk-Pide", [], ["sucuk"]),
    item("Ispanaklı Pide", "Pidé Épinards", "Spinat-Pide"),
    item("Ton Balıklı Pide", "Pidé Thon", "Thunfisch-Pide", [], ["ton", "soğan", "mısır"]),
    item("Tavuklu Pide", "Pidé Poulet", "Poulet-Pide", [], ["tavuk", "soğan", "biber"]),
    item("Kuşbaşılı Pide", "Pidé Kuşbaşı", "Lammwürfel-Pide", [], ["kuşbaşı kuzu", "soğan", "biber", "domates"]),
    item("Vejetaryen Pide", "Pidé Végétarien", "Vegetarische Pide", [], ["biber", "patlıcan", "kabak", "domates"]),
  ]),
  cat("Folded", "Folded", "Folded", [
    item("Feta Folded", "Folded Feta", "Feta Folded", [], ["domates", "salatalık", "soğan", "maydanoz", "patates kızartması", "döner eti", "roka", "beyaz peynir"]),
    item("Mozzarella Folded", "Folded Mozzarella", "Mozzarella Folded", [], ["domates", "salatalık", "avokado", "patates kızartması", "döner eti", "roka", "mozzarella"]),
    item("Berlin Folded", "Folded Berlin", "Berlin Folded"),
  ]),
  cat("Kebaplar", "Grillades", "Grillspezialitäten", [
    item("Adana", "Adana", "Adana", ["q_porsiyon", "q_acili"]),
    item("Urfa", "Urfa", "Urfa", ["q_porsiyon"]),
    item("Tavuk Şiş", "Tavuk Şiş", "Hähnchenspiess", ["q_porsiyon"]),
    item("Kuzu Şiş", "Kuzu Şiş", "Lammspiess", ["q_porsiyon"]),
    item("Karışık Izgara", "Karışık Izgara", "Gemischter Grill", ["q_porsiyon"]),
    item("İskender", "İskender", "İskender", ["q_porsiyon"], ["döner eti", "iskender sosu", "yoğurt", "tereyağı"]),
  ]),
  cat("Tabaklar", "Assiettes", "Teller", [
    item("Kebap Tabağı", "Assiette Kebab", "Kebab-Teller"),
    item("Köfte Tabağı", "Assiette Köfte", "Köfte-Teller"),
    item("Adana Tabağı", "Assiette Adana", "Adana-Teller"),
    item("Lahmacun Tabağı", "Assiette Lahmacun", "Lahmacun-Teller"),
    item("Karışık Tabak", "Assiette Mixte", "Gemischter Teller"),
    item("Tavuk Şiş Tabağı", "Assiette Brochette de Poulet", "Hähnchenspiess-Teller"),
    item("Escalope Tabağı", "Assiette Escalope", "Schnitzel-Teller"),
    item("Falafel Tabağı", "Assiette Falafels", "Falafel-Teller"),
    item("Nugget Tabağı", "Assiette Nuggets", "Nuggets-Teller"),
  ]),
  cat("Box", "Box", "Box", [
    item("Kebap Box", "Box Kebab", "Kebab-Box"),
    item("Nugget Box", "Box Nuggets", "Nuggets-Box"),
    item("Tavuk Box", "Box Poulet", "Poulet-Box"),
    item("Kuzu Box", "Box d'Agneau", "Lamm-Box"),
  ]),
  cat("Porsiyonlar", "Portions", "Portionen", [
    item("Patates Kızartması", "Frites", "Pommes frites", ["q_boy_icecek"]),
    item("Nugget", "Nuggets", "Nuggets", ["q_adet"]),
    item("Falafel", "Falafels", "Falafel"),
    item("Tenders", "Tenders", "Chicken Tenders", ["q_adet"]),
  ]),
  cat("Salatalar", "Salades", "Salate", [
    item("Karışık Salata", "Salade Mêlée", "Gemischter Salat"),
    item("Ton Balıklı Salata", "Salade Thon", "Thunfischsalat"),
    item("Tavuklu Salata", "Salade Poulet", "Poulet-Salat"),
    item("Çoban Salatası", "Salade Bergère", "Hirtensalat"),
  ]),
  cat("Mezeler", "Entrées", "Vorspeisen", [
    item("Humus", "Humus", "Hummus"),
    item("Haydari", "Haydari", "Haydari"),
    item("Sigara Böreği", "Sigara Böreği", "Sigara Börek"),
    item("Çiğ Köfte", "Çiğ Köfte", "Çiğ Köfte", ["q_sunum"]),
  ]),
  cat("İçecekler", "Boissons", "Getränke", [
    item("Ayran", "Ayran", "Ayran"),
    item("Kola", "Kola", "Cola"),
    item("Su", "Su", "Wasser"),
  ]),
  cat("Tatlılar", "Desserts", "Desserts", [
    item("Baklava", "Baklava", "Baklava", ["q_birim"]),
    item("Sütlaç", "Sütlaç", "Milchreis"),
  ]),
]);

const pizza = pack("pack_pizza_fastfood", "Pizza / Fast Food", [
  cat("Pizzalar", "Pizzas", "Pizzas", [
    item("Margherita", "Margherita", "Margherita", ["q_boy_pizza"], ["domates sosu", "mozzarella"]),
    item("Mantarlı Pizza", "Champignon", "Pilz", ["q_boy_pizza"], ["domates sosu", "mozzarella", "mantar"]),
    item("Sucuklu Pizza", "Sucuk", "Sucuk", ["q_boy_pizza"], ["domates sosu", "mozzarella", "sucuk"]),
    item("Salamlı Pizza", "Salami", "Salami", ["q_boy_pizza"], ["domates sosu", "mozzarella", "salam"]),
    item("Hindi Jambonlu Pizza", "Jambon de Dinde", "Putenschinken", ["q_boy_pizza"], ["domates sosu", "mozzarella", "hindi jambonu"]),
    item("Dönerli Pizza", "Döner", "Döner", ["q_boy_pizza"], ["domates sosu", "döner eti", "kaşar", "soğan"]),
    item("Ton Balıklı Pizza", "Thon", "Thunfisch", ["q_boy_pizza"], ["domates sosu", "ton", "soğan"]),
    item("Tavuklu Pizza", "Poulet", "Poulet", ["q_boy_pizza"], ["domates sosu", "tavuk", "soğan", "biber"]),
    item("Dört Mevsim", "4 Saisons", "4 Jahreszeiten", ["q_boy_pizza"], ["domates sosu", "sucuk", "hindi jambonu", "mantar", "biber"]),
    item("Vejetaryen Pizza", "Végétarienne", "Vegetarisch", ["q_boy_pizza"], ["domates sosu", "brokoli", "soğan", "mantar", "zeytin"]),
    item("Dört Peynirli", "4 Fromages", "4 Käse", ["q_boy_pizza"], ["domates sosu", "mozzarella", "rokfor", "beyaz peynir", "cheddar"]),
  ]),
  cat("Burgerler", "Burgers", "Burger", [
    item("Hamburger", "Hamburger", "Hamburger", ["q_menu"]),
    item("Cheeseburger", "Cheeseburger", "Cheeseburger", ["q_menu"]),
    item("Duble Cheeseburger", "Double Cheeseburger", "Double Cheeseburger", ["q_menu"]),
    item("Tavuk Burger", "Chickenburger", "Chickenburger", ["q_menu"]),
  ]),
  cat("Atıştırmalık", "Snacks", "Snacks", [
    item("Nugget", "Nuggets", "Nuggets", ["q_adet"]),
    item("Tenders", "Tenders", "Chicken Tenders", ["q_adet"]),
    item("Patates Kızartması", "Frites", "Pommes frites", ["q_boy_icecek"]),
  ]),
  cat("Salatalar", "Salades", "Salate", [
    item("Karışık Salata", "Salade Mêlée", "Gemischter Salat"),
    item("Ton Balıklı Salata", "Salade Thon", "Thunfischsalat"),
    item("Tavuklu Salata", "Salade Poulet", "Poulet-Salat"),
  ]),
  cat("İçecekler", "Boissons", "Getränke", [
    item("Kola", "Kola", "Cola"),
    item("Ayran", "Ayran", "Ayran"),
    item("Su", "Su", "Wasser"),
  ]),
  cat("Tatlılar", "Desserts", "Desserts", [
    item("Tiramisu", "Tiramisu", "Tiramisu"),
    item("Sufle", "Sufle", "Soufflé"),
  ]),
]);

const lokanta = pack("pack_lokanta", "Semt Lokantası", [
  cat("Çorbalar", "Soupes", "Suppen", [
    item("Mercimek", "Mercimek", "Linsensuppe"),
    item("Ezogelin", "Ezogelin", "Ezogelin"),
    item("Tavuk Suyu", "Tavuk Suyu", "Hühnersuppe"),
  ]),
  cat("Günün Yemekleri", "Plats du Jour", "Tagesgerichte", [
    item("Kuru Fasulye", "Kuru Fasulye", "Weisse Bohnen", ["q_porsiyon"]),
    item("Nohut Yemeği", "Nohut Yemeği", "Kichererbsengericht", ["q_porsiyon"]),
    item("Türlü", "Türlü", "Gemüseeintopf", ["q_porsiyon"]),
    item("Karnıyarık", "Karnıyarık", "Karnıyarık", ["q_porsiyon"]),
    item("Musakka", "Musakka", "Moussaka", ["q_porsiyon"]),
    item("İçli Köfte", "İçli Köfte", "İçli Köfte", ["q_porsiyon"]),
    item("Mantı", "Mantı", "Mantı", ["q_porsiyon"]),
    item("Yaprak Sarma", "Yaprak Sarma", "Gefüllte Weinblätter", ["q_porsiyon"]),
  ]),
  cat("Izgaralar", "Grillades", "Grillspezialitäten", [
    item("Izgara Köfte", "Izgara Köfte", "Gegrillte Köfte", ["q_porsiyon"]),
    item("Tavuk Şiş", "Tavuk Şiş", "Hähnchenspiess", ["q_porsiyon"]),
  ]),
  cat("Pilav Üstü", "Sur Riz", "Auf Reis", [
    item("Pilav Üstü Tavuk", "Pilav Üstü Tavuk", "Poulet auf Reis", ["q_porsiyon"]),
    item("Pilav Üstü Döner", "Pilav Üstü Döner", "Döner auf Reis", ["q_porsiyon"]),
  ]),
  cat("Mezeler", "Entrées", "Vorspeisen", [
    item("Cacık", "Cacık", "Cacık"),
    item("Piyaz", "Piyaz", "Piyaz"),
    item("Haydari", "Haydari", "Haydari"),
  ]),
  cat("Salatalar", "Salades", "Salate", [
    item("Çoban Salata", "Çoban Salata", "Hirtensalat"),
  ]),
  cat("Tatlılar", "Desserts", "Desserts", [
    item("Sütlaç", "Sütlaç", "Milchreis"),
    item("Kazandibi", "Kazandibi", "Kazandibi"),
  ]),
  cat("İçecekler", "Boissons", "Getränke", [
    item("Ayran", "Ayran", "Ayran"),
    item("Şalgam", "Şalgam", "Şalgam"),
    item("Su", "Su", "Wasser"),
  ]),
]);

const cafe = pack("pack_cafe", "Café", [
  cat("Sıcak İçecekler", "Boissons Chaudes", "Heisse Getränke", [
    item("Türk Kahvesi", "Türk Kahvesi", "Türkischer Kaffee", ["q_boy_kahve"]),
    item("Espresso", "Espresso", "Espresso"),
    item("Cappuccino", "Cappuccino", "Cappuccino"),
    item("Latte", "Latte", "Latte"),
    item("Çay", "Çay", "Tee", ["q_boy_cay"]),
  ]),
  cat("Soğuk İçecekler", "Boissons Froides", "Kalte Getränke", [
    item("Limonata", "Limonata", "Limonade"),
    item("Portakal Suyu", "Portakal Suyu", "Orangensaft"),
    item("Milkshake", "Milkshake", "Milkshake", ["q_boy_icecek"], ["muz", "çilek", "çikolata"]),
  ]),
  cat("Kahvaltı", "Petit-Déjeuner", "Frühstück", [
    item("Serpme Kahvaltı", "Serpme Kahvaltı", "Frühstücksplatte", ["q_birim_kisi", "q_siparis_uzerine"]),
    item("Menemen", "Menemen", "Menemen", [], ["yumurta", "domates", "biber"]),
    item("Omlet", "Omlet", "Omelette", [], ["yumurta", "kaşar"]),
  ]),
  cat("Tost & Sandviç", "Toasts", "Toasts", [
    item("Kaşarlı Tost", "Kaşarlı Tost", "Käse-Toast", [], ["kaşar"]),
    item("Karışık Tost", "Karışık Tost", "Gemischter Toast", [], ["kaşar", "sucuk"]),
  ]),
  cat("Tatlılar", "Desserts", "Desserts", [
    item("Cheesecake", "Cheesecake", "Cheesecake", [], ["çilek", "orman meyveleri"]),
    item("Waffle", "Waffle", "Waffel", [], ["çikolata", "muz", "çilek", "krema"]),
  ]),
  cat("Dondurma", "Glaces", "Eis", [
    item("Dondurma", "Dondurma", "Eis", ["q_adet_top"]),
  ]),
]);

const pastane = pack("pack_pastane", "Pastane / Tatlıcı", [
  cat("Baklavalar", "Baklavas", "Baklava", [
    item("Fıstıklı Baklava", "Fıstıklı Baklava", "Baklava mit Pistazien", ["q_birim"], ["fıstık", "şerbet"]),
    item("Cevizli Baklava", "Cevizli Baklava", "Baklava mit Walnüssen", ["q_birim"], ["ceviz", "şerbet"]),
  ]),
  cat("Şerbetli Tatlılar", "Desserts au Sirop", "Sirup-Desserts", [
    item("Künefe", "Künefe", "Künefe", ["q_birim", "q_ek_ikram"], ["kaymak"]),
    item("Şöbiyet", "Şöbiyet", "Şöbiyet", ["q_birim", "q_ek_ikram"]),
    item("Kadayıf", "Kadayıf", "Kadayıf", ["q_birim", "q_ek_ikram"]),
    item("Katmer", "Katmer", "Katmer", ["q_birim", "q_ek_ikram"], ["fıstık", "kaymak"]),
  ]),
  cat("Sütlü Tatlılar", "Desserts Lactés", "Milchdesserts", [
    item("Sütlaç", "Sütlaç", "Milchreis"),
    item("Kazandibi", "Kazandibi", "Kazandibi"),
    item("Trileçe", "Trileçe", "Tres Leches"),
    item("Profiterol", "Profiterol", "Profiteroles"),
  ]),
  cat("Pastalar", "Gâteaux", "Torten", [
    item("Doğum Günü Pastası", "Doğum Günü Pastası", "Geburtstagstorte", ["q_birim_kisi", "q_siparis_uzerine"]),
  ]),
  cat("Kurabiyeler", "Biscuits", "Kekse", [
    item("Kurabiye Çeşitleri", "Kurabiye Çeşitleri", "Gebäcksortiment", ["q_birim"]),
  ]),
  cat("Dondurma", "Glaces", "Eis", [
    item("Dondurma", "Dondurma", "Eis", ["q_adet_top"]),
  ]),
  cat("İçecekler", "Boissons", "Getränke", [
    item("Çay", "Çay", "Tee"),
    item("Türk Kahvesi", "Türk Kahvesi", "Türkischer Kaffee"),
  ]),
]);

export const SECTOR_PACKS_DATA: SectorPack[] = [kebap, pizza, lokanta, cafe, pastane];
