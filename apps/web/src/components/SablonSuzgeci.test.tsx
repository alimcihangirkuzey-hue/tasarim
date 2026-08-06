/* KURULUM İŞ KOLU SÜZGECİ testleri (K-1/C modül sınırı).

   `gorunurSablonlar` saf bir fonksiyondur; DOM'a gerek yok. Süzgecin ÜÇ
   sözleşmesi burada çivilenir:
   1. Yapılandırma yoksa hiçbir şey süzülmez (bugünkü davranış birebir).
   2. Kapalı iş kolunun şablonu gizlenir.
   3. SEÇİLİ şablon her hâlükârda kalır — görünürlük daraltması, operatöre
      belgesinin şablonunu YANLIŞ göstermeye dönüşemez.

   Fikstür kayıt defterinin GERÇEĞİNDEN kurulur (listTemplates + hedefSektorOf);
   elle uydurulmuş TemplateEntry, ilan değiştiğinde testi sessizce yanlış
   yapardı. */

import { describe, expect, it } from "vitest";
import { listTemplates } from "@tezgah/templates";
import { hedefSektorOf } from "@tezgah/templates/identity";
import { gorunurSablonlar } from "./DocumentsPanel";

const TUMU = listTemplates();
const idOf = (e: { manifest: { id: string } }): string => e.manifest.id;

/** Verilen iş koluna ait GERÇEK bir şablon id'si (ilan üzerinden bulunur) */
function sablonOf(sektor: string): string {
  const e = TUMU.find((x) => hedefSektorOf(x.manifest.id) === sektor);
  if (!e) throw new Error(`fikstür ön-koşulu: "${sektor}" iş kolunda şablon yok`);
  return e.manifest.id;
}

describe("gorunurSablonlar — kurulum iş kolu süzgeci", () => {
  it("AKTİF LİSTE YOKSA hiçbir şey süzülmez (yapılandırmasız kurulum)", () => {
    expect(gorunurSablonlar(TUMU, undefined).map(idOf)).toEqual(TUMU.map(idOf));
  });

  it("KAPALI İŞ KOLUNUN şablonu gizlenir, AÇIK olanınki kalır", () => {
    const tabela = sablonOf("tabelaci");
    const menu = sablonOf("menu-uretici");
    const gorunur = gorunurSablonlar(TUMU, ["tabelaci"]).map(idOf);
    expect(gorunur).toContain(tabela);
    expect(gorunur).not.toContain(menu);
  });

  it("SEÇİLİ ŞABLON KAPALI KOLDA OLSA BİLE KALIR (yanlış gösterme yasağı)", () => {
    const menu = sablonOf("menu-uretici");
    /* Kalmasaydı select'in value'su listede olmayan bir id'ye işaret eder,
       tarayıcı İLK seçeneği gösterir ve operatör belgesinin şablonunu yanlış
       görürdü — düzeltme yeni bir yara açardı. */
    const gorunur = gorunurSablonlar(TUMU, ["tabelaci"], menu).map(idOf);
    expect(gorunur).toContain(menu);
  });

  it("SEKTÖRSÜZ şablonlar HER ZAMAN kalır (fabrika/generated)", () => {
    const sektorsuz = TUMU.filter((e) => hedefSektorOf(e.manifest.id) === null).map(idOf);
    /* Fikstür ön-koşulu: kayıt defterinde gerçekten sektörsüz şablon var
       (identity kapsam sınırı — C-P2). Yoksa bu test hiçbir şey ölçmez. */
    expect(sektorsuz.length).toBeGreaterThan(0);
    const gorunur = gorunurSablonlar(TUMU, ["tabelaci"]).map(idOf);
    for (const id of sektorsuz) expect(gorunur, id).toContain(id);
  });

  it("SÜZGEÇ SIRA BOZMAZ — görünürler girdi sırasını korur", () => {
    const gorunur = gorunurSablonlar(TUMU, ["tabelaci", "menu-uretici"]).map(idOf);
    const beklenenSira = TUMU.map(idOf).filter((id) => gorunur.includes(id));
    expect(gorunur).toEqual(beklenenSira);
  });
});
