#!/bin/bash
# TEZGÂH oturum-açılış bootstrap'ı (Claude Code on the web).
# Amaç: her oturum, protokolün AÇILIŞ SIRASI'nı koşabilecek durumda başlasın.
set -euo pipefail

# Yalnız uzak (web) ortamda koş; yerel geliştirmeye karışma.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

# 1) Kesik geçmiş onarımı.
# Web klonu shallow gelir. packages/journal'daki plan bayatlık ölçümü git geçmişine
# dayanır; shallow depoda ölçüm YAPILAMAZ ve kod "plan güncel" yalanı üretmek yerine
# durur (ADR gereği doğru davranış) — bu da 5 testi SAHTE kırık gösterir.
if [ "$(git rev-parse --is-shallow-repository 2>/dev/null || echo false)" = "true" ]; then
  echo "bootstrap: shallow depo — geçmiş tamamlanıyor (git fetch --unshallow)"
  git fetch --unshallow --quiet || echo "bootstrap: UYARI — unshallow başarısız; journal plan testleri sahte kırık verebilir"
fi

# 2) Bağımlılıklar (idempotent; konteyner önbelleğinden yararlanmak için install).
echo "bootstrap: npm workspace bağımlılıkları kuruluyor"
npm install --no-audit --no-fund

echo "bootstrap: hazır — kapılar: npm run typecheck | lint | test | run build -w apps/web | run journal:verify"
