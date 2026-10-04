// چک رمز روی هر PR (گردش کار secret-scan.yml): خط‌های تازهٔ همهٔ فایل‌ها، نه فقط /site.
// کلیدهای شناخته‌شده (توکن تلگرام، کلید درگاه بات، کلید خصوصی، کلیدهای ابری) همه‌جا؛
// تست‌های site/tools/test/ نادیده (نمونهٔ ساختگی). رمز در define یا کلید و مقدار، و رشتهٔ تصادفی بلند، همه‌جا جز bot/ (شناسهٔ شیت‌ها فعلاً عمداً در کد بات است، CLAUDE.md بند ۹).
// مقدار پیداشده چاپ نمی‌شود؛ فقط فایل، خط و نوع.
import { execFileSync } from 'node:child_process';
import { scanLine } from './secrets.mjs';

const BASE = process.env.BASE, HEAD = process.env.HEAD || 'HEAD';
const diff = execFileSync('git', ['diff', '-U0', '--no-color', BASE, HEAD], { encoding: 'utf8', maxBuffer: 256 << 20 });
const hits = [];
let file = '', line = 0;
for (const l of diff.split('\n')) {
  if (l.startsWith('+++ ')) { file = l.slice(6); continue; }
  const h = l.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
  if (h) { line = Number(h[1]); continue; }
  if (!l.startsWith('+') || l.startsWith('+++')) { continue; }
  if (/^site\/tools\/test\//.test(file)) { line++; continue; } // تست‌ها عمداً نمونهٔ ساختگی رمز دارند
  const generic = !/^bot\/|\.lock$|package-lock\.json$/.test(file);
  const found = scanLine(l.slice(1), { generic });
  if (found.length) hits.push(`${file}:${line} ${found.join('، ')}`);
  line++;
}
if (hits.length) {
  for (const x of hits) console.log(`::error::رمز در کامیت: ${x}`);
  console.log(`\n${hits.length} مورد. رمز را از کد بردار (در مخزن فقط جای‌نگهدار) و اگر واقعی بوده، همان رمز را عوض کن.`);
  process.exit(1);
}
console.log('رمزی در خط‌های تازه پیدا نشد.');
