/* LY2d (D-49): lint kapısı — ESLint 9 flat config.
   Taban: @eslint/js recommended + typescript-eslint recommended (TİP-BİLGİSİZ
   katman; type-checked kurallar bilinçli dışarıda — hız + ilk-kapı kapsamı).
   Kapsam: workspace src'leri (.ts/.tsx). Bilinçli dışarıda: vite/config
   dosyaları · dist · data. Kural gevşetme/genişletme = ürün sahibi kararı
   (D-50 çizgisi) — sessiz değiştirilmez. */
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "data/**"],
  },
  {
    files: ["apps/*/src/**/*.{ts,tsx}", "packages/*/src/**/*.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
  }
);
