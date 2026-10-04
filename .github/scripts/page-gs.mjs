// v170.5: برگهٔ مینی‌اپ (site/pages/503886-app.html) به شکل متن دقیق داخل یک فایل کد Apps Script (bot/app_page.gs).
// پیش از این فایل HTML بود و HtmlService هنگام خواندن چیزی از آن را عوض می‌کرد؛ پس هش پروژه با گیت یکی نمی‌شد و انتشار برگه انجام نمی‌شد.
// رشتهٔ JSON همان بایت‌ها را بی هیچ پردازشی نگه می‌دارد.
//   node page-gs.mjs <ورودی html> <خروجی gs>   ← می‌نویسد و هش را چاپ می‌کند
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const PAGE = 'site/pages/503886-app.html';
export function pageNorm(s) { return String(s || '').replace(/\r\n?/g, '\n').replace(/\s+$/, ''); }
export function pageSha(s) { return createHash('sha256').update(pageNorm(s), 'utf8').digest('hex'); }
export function pageGs(html) {
  return '/* ساخته‌شده در گردش کار دیپلوی از ' + PAGE + '؛ در گیت نیست و دستی ویرایش نمی‌شود (v170.5) */\n' +
    'var WP_PAGE_SRC = ' + JSON.stringify(String(html)) + ';\n';
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const html = readFileSync(process.argv[2], 'utf8');
  writeFileSync(process.argv[3], pageGs(html));
  console.log(pageSha(html));
}
