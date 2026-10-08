// نمایهٔ دانش سایت برای دستیار تجربه (بات v170.23.19، فاز ۷ ASSISTANT.md)
// از گردش کار assist-index.yml روزی دو بار. فقط GET عمومی به سایت (بی رمز، فقط منتشرشده) و بعد ارسال به درگاه بات با کلید دوم
// (اکشن kb_index، تکه‌تکه). خروجی در مخزن نوشته نمی‌شود. بی هیچ مدل هوش مصنوعی.
// بیرون می‌مانند: noindex یوست، رمزدار، پیش‌نویس (REST عمومی اصلاً نمی‌دهد)، نشانی ادمین و ورود، صفحه‌های داخلی و فرم‌محور،
// هر تکه با درصد سهم، تسویه، حقوق یا قرارداد افراد، و هر تکه‌ای که نگهبان اطلاعات شخصی مخزن (pii-scan) چیزی در آن ببیند.
// اجرای محلی بی ارسال: node site/tools/assist-index.mjs --dry  (فقط شمار و نمونهٔ عنوان‌ها)
import { piiLine } from '../../.github/scripts/pii-scan.mjs';

const SITE = (process.env.WORDPRESS_URL || 'https://tajrobeh.life').replace(/\/$/, '');
const DRY = process.argv.includes('--dry') || !process.env.BOT_API_KEY;
const CHUNK = 520, MIN = 60, PART = 400;

/* مسیرهایی که هرگز وارد نمی‌شوند: ادمین، ورود، حساب، پرداخت، مینی‌اپ، بازبینی و صفحه‌های تأیید راهبران */
export const SKIP_PATH = /\/(?:wp-admin|wp-login|login|my-account|account|cart|checkout|pay|payment|app|review|thank-you|thanks|tj-ebi-mod|preview|draft|test-page|staging)(?:\/|$)|[?&](?:tj_ebi_mod|preview|p)=/i;
/* هر متنی دربارهٔ سهم، تسویه، حقوق یا قرارداد افراد، حتی اگر منتشر باشد (تصمیم یاسر) */
export const MONEY = /درصد سهم|سهم(?: درمانگر| شما| همکار)|تسویه|کمیسیون|حقوق(?: ماه| ماهانه| ماهیانه| پایه| دریافتی| و مزایا)|فیش حقوقی|قرارداد/;

export const DOMAINS = [
  ['پرداخت', /\/(?:pay|payment|wallet)/, /پرداخت|درگاه|تتر|یورو|کیف پول|فاکتور/],
  ['روان‌پزشکی', /\/psychiatr/, /روان ?پزشک|ویزیت|دارو/],
  ['خارج از ایران', /\/(?:persian-therapy|abroad|diaspora)/, /خارج از ایران|اختلاف ساعت|مهاجر/],
  ['حضوری', /\/(?:clinic|in-person|inperson|gandhi|vanak)/, /حضوری|مطب|نشانی/],
  ['سازمانی', /\/enterprise/, /سازمان|کارکنان|کارمند/],
  ['مدرسه و دوره‌ها', /\/(?:school|course|courses|academy)(?!\/events)/, /دوره|مدرسه|کلاس|سوپرویژن/],
  ['رویدادها', /\/(?:events|event|school\/events)/, /رویداد|کارگاه|وبینار/],
  ['همکاری درمانگران و پارتنرها', /\/(?:joinus|partners|partner|careers)/, /همکاری|پارتنر|اتاق/],
  ['تست‌ها و مهاجرت روان‌شناسان', /\/tests?\//, /تست|آزمون|پرسشنامه/],
  ['مجله', /\/(?:mag|blog)\//, /$^/],
];
const AUD = { 'پرداخت': 'مراجع', 'روان‌پزشکی': 'مراجع', 'خارج از ایران': 'مراجع خارج از ایران', 'حضوری': 'مراجع', 'سازمانی': 'سازمان',
  'مدرسه و دوره‌ها': 'دانشجو', 'رویدادها': 'کاربر عمومی', 'همکاری درمانگران و پارتنرها': 'متقاضی همکاری', 'تست‌ها و مهاجرت روان‌شناسان': 'کاربر عمومی',
  'مجله': 'خوانندهٔ مجله', 'تراپی و پذیرش': 'مراجع' };
export function guessDomain(url, text, kind) {
  if (kind === 'post') return 'مجله';
  if (kind === 'event') return 'رویدادها';
  for (const [d, rx] of DOMAINS) if (rx.test(url)) return d;
  for (const [d, , rx] of DOMAINS) if (rx.test(text)) return d;
  return 'تراپی و پذیرش';
}

const ENT = { '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#039;': "'", '&#8204;': '‌', '&zwnj;': '‌', '&laquo;': '«', '&raquo;': '»', '&lt;': '<', '&gt;': '>', '&#8211;': '،', '&#8212;': '،', '&ndash;': '،', '&mdash;': '،' };
export function clean(html) {
  return String(html || '')
    .replace(/<(script|style|noscript|svg|form|template|iframe)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|li|h[1-6]|section|article|tr|br|blockquote)>|<br\s*\/?>/gi, '\n')
    .replace(/<h([1-6])[^>]*>/gi, '\n§$1 ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, (e) => ENT[e.toLowerCase()] ?? ' ')
    .replace(/[\u2014\u2013]/g, '،')
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}
/** تکه‌ها با عنوان بخش (سرتیتر نزدیک) و طول حداکثر CHUNK؛ مرز تکه روی پایان جمله */
export function chunks(title, text) {
  const out = [];
  let head = title, buf = '';
  const flush = () => { const t = buf.replace(/\s+/g, ' ').trim(); if (t.length >= MIN) out.push({ title: head, text: t }); buf = ''; };
  for (const line of text.split('\n')) {
    const h = /^§[1-6] (.+)$/.exec(line.trim());
    if (h) { flush(); head = title + ' › ' + h[1].trim().slice(0, 80); continue; }
    const parts = line.split(/(?<=[.!؟?])\s+/);
    for (const p of parts) {
      if ((buf + ' ' + p).length > CHUNK) flush();
      buf += (buf ? ' ' : '') + p;
    }
  }
  flush();
  return out;
}
const idOf = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
/** یک صفحهٔ REST وردپرس ← تکه‌های نمایه (یا [] اگر نباید وارد شود) */
export function pageChunks(p, kind) {
  const url = String(p.link || '');
  if (!url.startsWith(SITE + '/') || SKIP_PATH.test(url.slice(SITE.length))) return [];
  if (p.content && p.content.protected) return [];
  const robots = (p.yoast_head_json && p.yoast_head_json.robots) || {};
  if (String(robots.index || '').toLowerCase() === 'noindex') return [];
  const raw = String((p.content && p.content.rendered) || '');
  const text = clean(raw), title = clean((p.title && p.title.rendered) || '').replace(/\n/g, ' ');
  if (!title || text.length < MIN) return [];
  if (/<form\b/i.test(raw) && text.length < 400) return [];   /* صفحهٔ فرم‌محور داخلی */
  const dom = guessDomain(url, text, kind);
  return chunks(title, text)
    .filter((c) => !MONEY.test(c.title + ' ' + c.text) && piiLine(c.title + ' ' + c.text, 'site/index').length === 0)
    .map((c, i) => ({ id: idOf(url + '#' + i + ':' + c.text.slice(0, 40)), url, title: c.title.slice(0, 160), text: c.text.slice(0, CHUNK), dom, aud: AUD[dom] || 'کاربر عمومی', src: kind === 'post' ? 'مجله' : 'سایت', mod: String(p.modified || '').slice(0, 10) }));
}

async function getAll(path) {
  const out = [];
  for (let page = 1; page < 60; page++) {
    const r = await fetch(`${SITE}${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`, { headers: { 'User-Agent': 'tajrobeh-site-ops/1', Accept: 'application/json' } });
    if (r.status === 400 && page > 1) break;
    if (!r.ok) throw new Error(`GET ${path} صفحهٔ ${page}: HTTP ${r.status}`);
    const j = await r.json();
    if (!Array.isArray(j) || !j.length) break;
    out.push(...j);
    if (j.length < 100) break;
  }
  return out;
}
async function gw(body) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(process.env.BOT_API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, redirect: 'follow', body: JSON.stringify({ api: 1, key: process.env.BOT_API_KEY, ...body }) });
      return JSON.parse(await r.text());
    } catch (e) { await new Promise((ok) => setTimeout(ok, 5000 * (i + 1))); }
  }
  return { ok: false, error: 'بات جواب نداد' };
}

async function main() {
  const F = '_fields=id,link,title,content,modified,yoast_head_json';
  const pages = await getAll(`/wp-json/wp/v2/pages?status=publish&${F}`);
  const posts = await getAll(`/wp-json/wp/v2/posts?status=publish&${F}`);
  const all = [...pages.flatMap((p) => pageChunks(p, 'page')), ...posts.flatMap((p) => pageChunks(p, 'post'))];
  const seen = new Set(), list = all.filter((c) => !seen.has(c.id) && seen.add(c.id));
  const byDom = {}; list.forEach((c) => { byDom[c.dom] = (byDom[c.dom] || 0) + 1; });
  console.log(`صفحه ${pages.length} · مقاله ${posts.length} · تکه ${list.length}`);
  console.log('حوزه‌ها: ' + Object.entries(byDom).map(([d, n]) => `${d} ${n}`).join('، '));
  const run = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  if (DRY) { console.log('بی ارسال (--dry یا بی BOT_API_KEY). نمونه: ' + list.slice(0, 5).map((c) => c.title).join(' | ')); return; }
  const n = Math.ceil(list.length / PART) || 1;
  let last = null;
  for (let i = 0; i < n; i++) {
    last = await gw({ action: 'kb_index', run, part: i + 1, of: n, chunks: list.slice(i * PART, (i + 1) * PART) });
    if (!last || !last.ok) { console.log(`::error::ارسال تکهٔ ${i + 1} از ${n} نشد: ${(last && last.error) || '?'}`); process.exit(1); }
  }
  const d = (last && last.data) || {};
  console.log(`بات: ${d.n ?? '?'} تکه · تازه ${d.added ?? '?'} · حذف‌شده ${d.removed ?? '?'}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = await import('node:fs');
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## نمایهٔ دانش دستیار\n\n- صفحه ${pages.length} · مقاله ${posts.length} · تکه ${list.length}\n- در بات: ${d.n ?? '?'} · تازه ${d.added ?? '?'} · حذف‌شده ${d.removed ?? '?'}\n`);
  }
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.log('::error::' + String(e).slice(0, 200)); process.exit(1); });
