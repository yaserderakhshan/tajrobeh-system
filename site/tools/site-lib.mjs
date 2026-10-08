// کتابخانهٔ مشترک ابزارهای سایت (site-pull، site-deploy، site-check، site-weekly).
// رمزها فقط از متغیر محیطی می‌آیند: در گیت‌هاب از Secrets، روی دستگاه از فایل بیرون مخزن
// (پیش‌فرض ~/.config/tajrobeh/site.env، یا SITE_ENV_FILE، یا .env ریشهٔ مخزن که در .gitignore است).
// هیچ تابعی اینجا رمز را چاپ نمی‌کند؛ log() هر مقدار حساس را می‌پوشاند.
import { appendFileSync, existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash, createHmac } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const SITE = join(ROOT, 'site');

const SECRET_KEYS = ['WP_APP_PASSWORD', 'WORDPRESS_APP_PASSWORD', 'BOT_API_KEY', 'PSI_API_KEY'];

export function loadEnv() {
  const files = [process.env.SITE_ENV_FILE, join(homedir(), '.config/tajrobeh/site.env'), join(ROOT, '.env')].filter(Boolean);
  for (const f of files) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && process.env[m[1]] === undefined && m[2] !== '') process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

export function redact(s) {
  let out = String(s);
  for (const k of SECRET_KEYS) {
    const v = process.env[k];
    if (v && v.length > 3) out = out.split(v).join('***');
  }
  return out.replace(/Basic [A-Za-z0-9+/=]{8,}/g, 'Basic ***').replace(/tjk_[A-Za-z0-9]{8,}/g, 'tjk_***');
}
export const log = (...a) => console.log(redact(a.join(' ')));
export const warn = (m) => console.log(redact(`::warning::${m}`));
export const fail = (m) => console.log(redact(`::error::${m}`));
export const summary = (md) => { if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, redact(md) + '\n'); };
export const output = (k, v) => { if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// هش یکدست: پایان خط LF، بی فاصلهٔ ته خط و ته فایل. همین تابع در پل وردپرس (ops-bridge.php) هم پیاده شده.
export function norm(s) { return String(s ?? '').replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').replace(/\s+$/, ''); }
export function hash(s) { return createHash('sha256').update(norm(s), 'utf8').digest('hex').slice(0, 16); }
/* پل هش Yoast را روی wp_json_encode می‌سازد: نویسهٔ غیرASCII به \uXXXX و «/» به «\/». JSON.stringify متن فارسی را خام می‌گذارد،
   پس هش هیچ متای فارسی جور نمی‌شد (۱۵ مهر ۱۴۰۵: انتشار PR ۹۳ با 409 tj_ops_drift برگشت). */
export const phpJson = (v) => JSON.stringify(v).replace(/[\u0080-\uffff]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).replace(/\//g, '\\/');

// پوشاندن و برگرداندن رمزها: site/tools/secrets.mjs
export { maskSecrets, unmaskFrom } from './secrets.mjs';
export const lf = (s) => String(s ?? '').replace(/\r\n?/g, '\n');

export const faDigits = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

// ---------- کلاینت REST وردپرس ----------
export function wpClient(base = process.env.WORDPRESS_URL || 'https://tajrobeh.life') {
  base = base.replace(/\/$/, '');
  const user = process.env.WP_USER || process.env.WORDPRESS_USER, pass = process.env.WP_APP_PASSWORD || process.env.WORDPRESS_APP_PASSWORD;
  const auth = user && pass ? 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64') : null;
  async function req(method, path, body, { retries = 3, timeout = 30000, authed = true } = {}) {
    const url = path.startsWith('http') ? path : base + path;
    let last;
    for (let i = 0; i < retries; i++) {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), timeout);
      try {
        const headers = { 'User-Agent': 'tajrobeh-site-ops/1', Accept: 'application/json' };
        if (auth && authed) headers.Authorization = auth;
        if (body !== undefined) headers['Content-Type'] = 'application/json';
        const t0 = Date.now();
        const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: ctl.signal, redirect: 'manual' });
        const text = await res.text();
        clearTimeout(t);
        let json = null; try { json = JSON.parse(text); } catch {}
        const r = { status: res.status, ok: res.ok, json, text, headers: res.headers, ms: Date.now() - t0 };
        if (res.status >= 500 && i < retries - 1) { last = r; await sleep(3000 * (i + 1)); continue; }
        return r;
      } catch (e) {
        clearTimeout(t);
        last = { status: 0, ok: false, json: null, text: String(e), headers: new Headers(), ms: timeout };
        if (i < retries - 1) await sleep(3000 * (i + 1));
      }
    }
    return last;
  }
  return {
    base, hasAuth: !!auth,
    get: (p, o) => req('GET', p, undefined, o),
    post: (p, b, o) => req('POST', p, b, o),
    del: (p, o) => req('DELETE', p, undefined, o),
    // همهٔ صفحه‌های یک مسیر فهرستی (pages، posts) با صفحه‌بندی
    async all(path, o) {
      const out = [];
      for (let page = 1; page < 50; page++) {
        const r = await req('GET', `${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`, undefined, o);
        if (r.status === 400 && page > 1) break;
        if (!r.ok || !Array.isArray(r.json)) throw new Error(`GET ${path} صفحهٔ ${page}: HTTP ${r.status}`);
        out.push(...r.json);
        if (r.json.length < 100) break;
      }
      return out;
    },
  };
}

// ---------- فایل‌های /site ----------
export function readJson(p, dflt) { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return dflt; } }
export function writeJson(p, v) { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(v, null, 1) + '\n'); }

// نقشهٔ id ← نام فایل صفحه (site/pages/<id>-<slug>.html)
export function pageFiles() {
  const m = new Map();
  for (const f of readdirSync(join(SITE, 'pages'))) { const x = f.match(/^(\d+)-.*\.html$/); if (x) m.set(Number(x[1]), f); }
  return m;
}

// وضعیت آخرین همگام‌سازی: هش زندهٔ هر شیء در لحظهٔ pull یا deploy.
// انتشار فقط وقتی جلو می‌رود که هش زندهٔ فعلی با همین یکی باشد (کسی در وردپرس دستی عوضش نکرده باشد).
export const STATE_FILE = join(SITE, 'state.json');
export const loadState = () => readJson(STATE_FILE, { synced_at: null, items: {} });
export const saveState = (s) => writeJson(STATE_FILE, s);

// ---------- گزارش به یاسر از درگاه بات (اکشن send، v170.1) ----------
// اگر BOT_API_URL، BOT_API_KEY یا REPORT_CHAT_ID نباشد، یا اکشن هنوز منتشر نشده باشد، فقط در خلاصهٔ گردش کار می‌ماند.
export async function report(text, { type = 'گزارش', ref = 'SITE' } = {}) {
  summary('\n### گزارش\n\n' + text.replace(/<[^>]+>/g, '') + '\n');
  const url = process.env.BOT_API_URL, key = process.env.BOT_API_KEY, chat = process.env.REPORT_CHAT_ID;
  if (!url || !key || !chat) { log('گزارش فقط در خلاصهٔ گردش کار (درگاه بات تنظیم نشده)'); return { ok: false, error: 'not_configured' }; }
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, redirect: 'follow',
      body: JSON.stringify({ api: 1, key, action: 'send', chat, type, ref, text: text.slice(0, 3500) }) });
    const j = JSON.parse(await res.text());
    if (!j.ok) warn(`گزارش بات نرفت: ${j.error}`);
    return j;
  } catch (e) { warn(`گزارش بات نرفت: ${e}`); return { ok: false, error: String(e) }; }
}

// نشانگرهای دایرکتوری و بقیهٔ وابستگی‌های ساختاری برگه‌ها: site/contracts.json و site/tools/contracts.mjs (قرارداد صفحه‌ها).

/* دستیار سایت روی ورکر لبهٔ tj-assist (از ۱۶ مهر ۱۴۰۵). نشانی همان است که ویجت سایت (اسنیپت 501145) صدا می‌زند تا یک جا عوض شود؛
   ASSIST_EDGE_URL جایش را می‌گیرد. پرسش با مبدأ سایت، مثل مرورگر. خروجی: {status, j, ms, gem} */
export function assistEdge() {
  const e = String(process.env.ASSIST_EDGE_URL || '').trim();
  if (e) return e.replace(/\/+$/, '');
  /* از tj-fab v5.3 ویجت فهرست EDGES دارد (هم‌دامنه‌ها، بعد خود ورکر)؛ اینجا نشانی مستقیم ورکر (workers.dev) سنجیده می‌شود */
  try {
    const h = readFileSync(join(SITE, 'snippets', '501145.html'), 'utf8');
    const L = [...((h.match(/EDGES? = (\[[^\]]*\]|'[^']+')/) || [])[1] || '').matchAll(/'(https:\/\/[^']+)'/g)].map((m) => m[1]);
    return (L.find((u) => /workers\.dev/.test(u)) || L[L.length - 1] || '').replace(/\/+$/, '');
  } catch { return ''; }
}
export async function assistAsk(text, sid, channel = 'smoke', base = '') {
  const t0 = Date.now(); let status = 0, j = null, gem = false, why = '';
  const body = JSON.stringify({ action: 'assist.ask', channel, session_id: sid, text });
  const H = { 'Content-Type': 'text/plain', Origin: 'https://tajrobeh.life', 'User-Agent': 'tajrobeh-site-ops/1' };
  /* با رمز لید سایت امضا می‌شود (همان روش سرور)، تا آزمون ۶۰ پرسشی به سقف نرخ هر IP نخورد */
  const sec = process.env.SITE_LEAD_SECRET || process.env.LEAD_SECRET || '';
  if (sec) { const ts = String(Math.floor(Date.now() / 1000)); H['X-Tj-Ts'] = ts; H['X-Tj-Sig'] = createHmac('sha256', sec).update(ts + '.' + body).digest('hex'); }
  try {
    const r = await fetch((base || assistEdge()) + '/assist', { method: 'POST', headers: H, body });
    const stH = r.headers.get('server-timing') || '';
    status = r.status; gem = /gemini/.test(stH); why = (/gem;desc="([^"]*)"/.exec(stH) || [])[1] || ''; try { j = JSON.parse(await r.text()); } catch {}
  } catch {}
  return { status, j, ms: Date.now() - t0, gem, why };
}
