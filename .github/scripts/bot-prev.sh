#!/usr/bin/env bash
# پشتوانهٔ برگشت در گردش کار bot-deploy.yml. قابل تست بی گوگل (.github/scripts/bot-prev-test.mjs):
#   fp <پوشه>                                 اثر انگشت فایل‌های پروژهٔ Apps Script (همان روش گام «بررسی کد زنده»)
#   rollback-src <ref> <خروجی> <clasp.json>   ساخت پوشهٔ کد برگشت، با .clasp.json پرشده از سکرت
#   prev-ref <tag> <کد زنده> [<پشتیبان> <فایل بازبینی>]  پشتوانهٔ برگشت: برچسب bot-live فقط اگر عین کد زنده است؛ وگرنه توقف.
#                                             بی برچسب (فقط اولین دیپلوی مخزن تازه): راه یک‌باره (firstrun)، وگرنه توقف
#   firstrun <کد زنده> <پشتیبان> <فایل بازبینی>  راه یک‌بارهٔ اولین دیپلوی مخزن تازه
#
# v170.14 (مخزن عمومی تازه): مخزن تازه برچسب bot-live ندارد و کد زندهٔ قبلی (با نام‌ها) در تاریخچه‌اش نیست. فقط وقتی
# برچسب اصلاً نیست و اثر انگشت کد زنده دقیقاً خط اول bot/.live-reviewed است، کد زندهٔ کشیده‌شده پشتیبان کامل برگشت
# می‌شود. برچسب ناهمخوان همچنان توقف است. بعد از اولین پایش سبز برچسب bot-live هست و این راه دیگر به کار نمی‌آید.
set -euo pipefail
export LC_ALL=C

fp() {
  (cd "$1" && for f in $(ls -1 | sort); do printf '%s  ' "$f"; sed -e '$a\' "$f" | tr -d '\r' | sha256sum | cut -d' ' -f1; done) | sha256sum | cut -d' ' -f1
}

reviewed_fp() {
  [ -f "$1" ] || return 0
  awk 'NF && $1 !~ /^#/ {print $1; exit}' "$1"
}

firstrun() {
  local live="$1" bak="$2" rev="$3" want got n
  want=$(reviewed_fp "$rev")
  [ -n "$want" ] || { echo "::error::برچسب bot-live نیست و bot/.live-reviewed اثر انگشتی ندارد؛ انتشار انجام نمی‌شود."; return 1; }
  [ -d "$live" ] && [ -n "$(ls -A "$live" 2>/dev/null)" ] || { echo "::error::کد زنده کشیده نشده یا خالی است؛ انتشار انجام نمی‌شود."; return 1; }
  for f in Code.gs telegram.gs version.gs appsscript.json; do
    [ -s "$live/$f" ] || { echo "::error::کد زندهٔ کشیده‌شده ناقص است ($f نیست)؛ انتشار انجام نمی‌شود."; return 1; }
  done
  got=$(fp "$live")
  [ "$got" = "$want" ] || { echo "::error::برچسب bot-live نیست و اثر کد زنده ($got) با bot/.live-reviewed ($want) یکی نیست؛ انتشار انجام نمی‌شود."; return 1; }
  rm -rf "$bak"; mkdir -p "$bak"; cp -a "$live/." "$bak/"
  [ "$(fp "$bak")" = "$want" ] || { echo "::error::پشتیبان کد زنده با اصلش یکی نیست؛ انتشار انجام نمی‌شود."; return 1; }
  n=$(ls -1 "$bak" | wc -l)
  echo "::notice::اولین دیپلوی این مخزن (برچسب bot-live نیست). پشتیبان برگشت: کد زندهٔ بازبینی‌شده، $n فایل، اثر $want."
}

rollback_src() {
  local ref="$1" out="$2" clasp="$3" bak="${PREV_BACKUP:-/tmp/live_backup}"
  [ -s "$clasp" ] && [ "$(jq -r '.scriptId // ""' "$clasp")" != "" ] && [ "$(jq -r '.scriptId' "$clasp")" != "SET_BY_CI_FROM_SECRET_SCRIPT_ID" ] \
    || { echo "::error::شناسهٔ پروژه در $clasp پر نشده؛ برگشت ممکن نیست."; return 1; }
  rm -rf "$out"; mkdir -p "$out"
  if [ "$ref" = "live" ]; then
    [ -n "$(ls -A "$bak" 2>/dev/null)" ] || { echo "::error::پشتیبان کد زنده نیست؛ برگشت ممکن نیست."; return 1; }
    cp -a "$bak/." "$out/"; cp "$clasp" "$out/.clasp.json"; return 0
  fi
  git archive "$ref" bot | tar -x -C "$out" --strip-components=1
  # برگهٔ مینی‌اپ همان شکلی که آن کامیت می‌خواند (v170.5 به بعد app_page.gs، پیش از آن app_page.html)
  if [ -f "$out/wppage.gs" ] && git show "$ref:site/pages/503886-app.html" > /tmp/prev_page.html 2>/dev/null; then
    if grep -q WP_PAGE_SRC "$out/wppage.gs"; then node .github/scripts/page-gs.mjs /tmp/prev_page.html "$out/app_page.gs" > /dev/null; else cp /tmp/prev_page.html "$out/app_page.html"; fi
  fi
  # v170.9: .clasp.json در گیت شناسهٔ پروژه ندارد؛ بی این خط clasp push برگشت به پروژهٔ نامعلوم می‌رفت و شکست می‌خورد
  cp "$clasp" "$out/.clasp.json"
}

# v170.9.2: کد یک کامیت به همان شکلی که در پروژه می‌نشیند (فقط فایل‌های push‌شدنی، بی ci_key.gs)، برای مقایسه با کد زنده
ref_code() {
  local ref="$1" out="$2" all="$2.all"
  rm -rf "$out" "$all"; mkdir -p "$out" "$all"
  git archive "$ref" bot | tar -x -C "$all" --strip-components=1
  if [ -f "$all/wppage.gs" ] && git show "$ref:site/pages/503886-app.html" > /tmp/ref_page.html 2>/dev/null; then
    if grep -q WP_PAGE_SRC "$all/wppage.gs"; then node .github/scripts/page-gs.mjs /tmp/ref_page.html "$all/app_page.gs" > /dev/null; else cp /tmp/ref_page.html "$all/app_page.html"; fi
  fi
  (cd "$all" && for f in *.gs *.html appsscript.json; do [ -f "$f" ] && [ "$f" != ci_key.gs ] && cp "$f" "$out/"; done) || true
  rm -rf "$all"
}

# پشتوانهٔ برگشت باید دقیقاً همان کد زنده باشد؛ بی برچسب یا برچسب ناهمخوان یعنی توقف پیش از هر نوشتن.
prev_ref() {
  local tag="$1" live="$2" bak="${3:-}" rev="${4:-}" snap=/tmp/prev_ref_code
  if [ -z "$tag" ]; then
    [ -n "$bak" ] && [ -n "$rev" ] || { echo "::error::برچسب bot-live نیست؛ بدون آن برگشت خودکار ممکن نیست. انتشار انجام نمی‌شود." >&2; return 1; }
    firstrun "$live" "$bak" "$rev" >&2 || return 1
    echo live; return 0
  fi
  [ -d "$live" ] && [ -n "$(ls -A "$live" 2>/dev/null)" ] || { echo "::error::کد زنده کشیده نشده؛ انتشار انجام نمی‌شود." >&2; return 1; }
  ref_code "$tag" "$snap"
  [ "$(fp "$snap")" = "$(fp "$live")" ] || { echo "::error::برچسب bot-live ($tag) با کد زندهٔ Apps Script یکی نیست؛ پشتوانهٔ برگشت مطمئن نیست و انتشار انجام نمی‌شود." >&2; return 1; }
  echo "$tag"
}

cmd="${1:-}"; shift || true
case "$cmd" in
  fp) fp "$@" ;;
  rollback-src) rollback_src "$@" ;;
  prev-ref) prev_ref "$@" ;;
  firstrun) firstrun "$@" ;;
  *) echo "usage: bot-prev.sh fp|firstrun|rollback-src|prev-ref ..." >&2; exit 2 ;;
esac
