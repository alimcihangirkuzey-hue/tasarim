/* İçerik çipi TOHUM VERİSİ — F7-B2 (saf veri). GLOBAL kütüphane seed'i
   (INGREDIENT_SEED bunu re-export eder). tr ZORUNLU; fr Fransa terminolojisi;
   de doldurulduğu kadar (boş kalan gap-mekanizmasına düşer). Tüm çipler tags:[]. */

import { foldTr } from "./parse.js";
import type { IngredientChip } from "./sector.js";

/** Çip id şeması: ing_ + TR katlaması (aksansız küçük harf), boşluk/özel → _.
    Ör. "domates sosu" → ing_domates_sosu, "közlenmiş biber" → ing_kozlenmis_biber. */
export function chipId(tr: string): string {
  const slug = foldTr(tr).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return `ing_${slug}`;
}

const chip = (tr: string, fr: string, de: string): IngredientChip => ({
  id: chipId(tr),
  tr,
  fr,
  de,
  tags: [],
});

export const SEED_CHIPS: IngredientChip[] = [
  chip("domates", "tomates", "Tomaten"),
  chip("domates sosu", "sauce tomate", "Tomatensauce"),
  chip("soğan", "oignons", "Zwiebeln"),
  chip("salata", "salade", "Salat"),
  chip("roka", "roquette", "Rucola"),
  chip("mozzarella", "mozzarella", "Mozzarella"),
  chip("kaşar", "fromage", "Käse"),
  chip("beyaz peynir", "feta", "Feta"),
  chip("cheddar", "cheddar", "Cheddar"),
  chip("rokfor", "roquefort", "Roquefort"),
  chip("zeytin", "olives", "Oliven"),
  chip("mantar", "champignons", "Champignons"),
  chip("biber", "poivrons", "Paprika"),
  chip("acı biber", "piments", "Peperoni"),
  chip("közlenmiş biber", "poivrons grillés", "gegrillte Paprika"),
  chip("mısır", "maïs", "Mais"),
  chip("brokoli", "brocolis", "Broccoli"),
  chip("patlıcan", "aubergine", "Aubergine"),
  chip("kabak", "courgette", "Zucchetti"),
  chip("havuç", "carotte", "Karotten"),
  chip("salatalık", "concombre", "Gurke"),
  chip("avokado", "avocat", "Avocado"),
  chip("sucuk", "sucuk", "Sucuk"),
  chip("salam", "salami", "Salami"),
  chip("döner eti", "viande kebab", "Kebabfleisch"),
  chip("dana", "bœuf", "Rind"),
  chip("kıyma", "viande hachée", "Hackfleisch"),
  chip("kuşbaşı kuzu", "morceaux d'agneau", "Lammwürfel"),
  chip("tavuk", "poulet", "Poulet"),
  chip("kuzu", "agneau", "Lamm"),
  chip("hindi jambonu", "jambon de dinde", "Putenschinken"),
  chip("ton", "thon", "Thunfisch"),
  chip("yumurta", "œuf", "Ei"),
  chip("patates kızartması", "frites", "Pommes frites"),
  chip("pilav", "riz", "Reis"),
  chip("bulgur", "boulgour", "Bulgur"),
  chip("nohut", "pois chiches", "Kichererbsen"),
  chip("mercimek", "lentilles", "Linsen"),
  chip("yoğurt", "yaourt", "Joghurt"),
  chip("sarımsak", "ail", "Knoblauch"),
  chip("maydanoz", "persil", "Petersilie"),
  chip("nane", "menthe", "Minze"),
  chip("limon", "citron", "Zitrone"),
  chip("tahin", "tahini", "Tahini"),
  chip("tereyağı", "beurre", "Butter"),
  chip("iskender sosu", "sauce iskender", "Iskender-Sauce"),
  chip("kaymak", "kaymak", "Kaymak"),
  chip("fıstık", "pistaches", "Pistazien"),
  chip("ceviz", "noix", "Baumnüsse"),
  chip("bal", "miel", "Honig"),
  chip("çikolata", "chocolat", "Schokolade"),
  chip("şerbet", "sirop", "Sirup"),
  chip("süt", "lait", "Milch"),
  chip("krema", "crème", "Rahm"),
  chip("tarçın", "cannelle", "Zimt"),
  chip("muz", "banane", "Banane"),
  chip("çilek", "fraises", "Erdbeeren"),
  chip("orman meyveleri", "fruits rouges", "Waldbeeren"),
  chip("turşu", "cornichons", "Essiggurken"),
  chip("burger sosu", "sauce burger", "Burgersauce"),
];
