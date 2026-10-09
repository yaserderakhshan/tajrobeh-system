#!/usr/bin/env bash
# نصب clasp برای گردش کار دیپلوی بات (۱۸ مهر ۱۴۰۵): در پوشهٔ جدا و با override وابستگی‌هایی که آخرین نسخه‌شان در npm
# هنوز tarball ندارد (express@5.3.0 در فهرست نسخه‌ها بود ولی فایلش ۴۰۴ می‌داد و دیپلوی v170.23.38 در «نصب clasp» شکست).
# سه تلاش با فاصله. خروجی: مسیر bin در GITHUB_PATH (برای قدم‌های بعد) و در PATH همین قدم.
set -euo pipefail
V="${CLASP_VERSION:?CLASP_VERSION لازم است}"
D="${RUNNER_TEMP:-/tmp}/clasp-$V"
mkdir -p "$D"
printf '{"private":true,"overrides":{"express":"5.2.1"}}\n' > "$D/package.json"
for i in 1 2 3; do
  if (cd "$D" && npm install --no-audit --no-fund --loglevel=error "@google/clasp@$V" > /dev/null); then break; fi
  [ "$i" = 3 ] && { echo "::error::نصب clasp سه بار شکست"; exit 1; }
  echo "نصب clasp ناموفق؛ تلاش دوباره ($i)"; sleep $((i * 20))
done
[ -n "${GITHUB_PATH:-}" ] && echo "$D/node_modules/.bin" >> "$GITHUB_PATH"
"$D/node_modules/.bin/clasp" --version
