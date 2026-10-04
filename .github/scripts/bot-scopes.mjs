// مجوزهای گوگل (OAuth scope) که کد بات لازم دارد، از روی سرویس‌هایی که صدا می‌زند؛ همان کاری که Apps Script خودکار می‌کند.
// چرا: v169.2 با Session.getEffectiveUser مجوز تازهٔ userinfo.email خواست. اجرای خشک و تست روی دیپلوی آزمایشی این را نمی‌گیرد،
// و یک‌بارهٔ نسخه روی بات زنده شکست خورد. حالا هر مجوزی که در bot/scopes.approved.json نیست، انتشار را متوقف می‌کند.
// افزودن مجوز تازه فقط با تأیید یاسر: اول در ویرایشگر Apps Script یک تابع اجرا و مجوز را تأیید کند، بعد همان را به این فایل اضافه کن.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BOT = join(ROOT, 'bot');
const G = 'https://www.googleapis.com/auth/';

// [الگو در کد، مجوز]. فقط سرویس‌هایی که مجوز می‌خواهند؛ Utilities، CacheService، PropertiesService، LockService،
// ContentService و HtmlService.createHtmlOutput* مجوز ندارند.
export const RULES = [
  [/\bSpreadsheetApp\./, G + 'spreadsheets'],
  [/\bDriveApp\./, G + 'drive'],
  [/\bDocumentApp\./, G + 'documents'],
  [/\bDocs\.Documents\./, G + 'documents'],
  [/\bDrive\.(Files|Permissions|Comments|Replies)\./, G + 'drive'],
  [/\bUrlFetchApp\./, G + 'script.external_request'],
  [/\bScriptApp\.(newTrigger|getProjectTriggers|deleteTrigger|getUserTriggers)\b/, G + 'script.scriptapp'],
  [/\bSession\.(getEffectiveUser|getActiveUser)\b/, G + 'userinfo.email'],
  [/\bMailApp\./, G + 'script.send_mail'],
  [/\bGmailApp\./, 'https://mail.google.com/'],
  [/\bCalendarApp\./, G + 'calendar'],
  [/\bFormApp\./, G + 'forms'],
  [/\bSlidesApp\./, G + 'presentations'],
  [/\b(ContactsApp|People)\./, G + 'contacts'],
  [/\bSpreadsheetApp\.getUi\b|\bDocumentApp\.getUi\b|\.showSidebar\(|\.showModalDialog\(/, G + 'script.container.ui'],
  [/\bYouTube\./, G + 'youtube'],
  [/\bAnalytics\./, G + 'analytics'],
];

/* Apps Script مجوزها را از متن خام هر فایل پیدا می‌کند، با یادداشت‌ها و رشته‌ها (v169.2.2 یک بار در استیجینگ برای همین یادداشت متوقف شد).
   پس این بررسی هم متن خام را می‌خواند و چیزی را کنار نمی‌گذارد. */
function code(src) { return src; }

export function neededScopes(dir = BOT) {
  const need = new Map();
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.gs'))) {
    const src = code(readFileSync(join(dir, f), 'utf8'));
    for (const [rx, sc] of RULES) if (rx.test(src)) { if (!need.has(sc)) need.set(sc, []); need.get(sc).push(f); }
  }
  /* v170.5: متن برگهٔ مینی‌اپ در دیپلوی داخل app_page.gs می‌رود و Apps Script مجوز را از همان متن هم پیدا می‌کند */
  const page = join(dir, '..', 'site', 'pages', '503886-app.html');
  if (existsSync(page) && !readdirSync(dir).includes('app_page.gs')) {
    const src = readFileSync(page, 'utf8');
    for (const [rx, sc] of RULES) if (rx.test(src)) { if (!need.has(sc)) need.set(sc, []); need.get(sc).push('app_page.gs'); }
  }
  return need;
}
export function approvedScopes(dir = BOT) {
  return JSON.parse(readFileSync(join(dir, 'scopes.approved.json'), 'utf8')).approved;
}
/* مجوزهای تازه: [{scope, files}] */
export function newScopes(dir = BOT) {
  const ok = new Set(approvedScopes(dir));
  return [...neededScopes(dir)].filter(([s]) => !ok.has(s)).map(([s, files]) => ({ scope: s, files }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const need = neededScopes();
  for (const [s, f] of need) console.log(s + '  ← ' + f.join('، '));
  const n = newScopes();
  if (n.length) { console.log('::error::مجوز تازه: ' + n.map((x) => x.scope + ' (' + x.files.join('، ') + ')').join(' · ')); process.exit(1); }
  console.log('مجوزها همه تأییدشده‌اند.');
}

/* خودآزمایی: همان الگوی v169.2 باید گرفته شود و یادداشت یا رشته نه */
export function scopeSelfTest() {
  const bad = [];
  const need = (src) => { const s = code(src); return RULES.filter(([rx]) => rx.test(s)).map(([, sc]) => sc); };
  if (!need("var me = Session.getEffectiveUser().getEmail();").includes(G + 'userinfo.email')) bad.push('Session.getEffectiveUser گرفته نشد');
  if (!need("/* Session.getEffectiveUser مجوز می‌خواست */ var x = 1;").includes(G + 'userinfo.email')) bad.push('یادداشت حساب نشد (Apps Script یادداشت را هم می‌خواند)');
  if (!need("var t = 'MailApp.sendEmail';").includes(G + 'script.send_mail')) bad.push('رشته حساب نشد');
  if (need("Session.getScriptTimeZone()").length) bad.push('getScriptTimeZone مجوز حساب شد');
  if (!need("MailApp.sendEmail(a, b, c);").includes(G + 'script.send_mail')) bad.push('MailApp گرفته نشد');
  return bad;
}
