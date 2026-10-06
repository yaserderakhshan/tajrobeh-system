// انتشار تغییرات /site روی tajrobeh.life (از .github/workflows/site-deploy.yml، بعد از مرج روی main).
//   node site-deploy.mjs plan      ← فقط فهرست کارها و بررسی ناهمخوانی با سایت زنده (هیچ نوشتنی)
//   node site-deploy.mjs apply     ← انتشار، تست دود، پاک کردن کش، نظارت ۱۵ دقیقه، و برگشت خودکار اگر خطا بود
// ورودی: BEFORE و AFTER (دو کامیت گیت). فقط فایل‌هایی که بین این دو عوض شده‌اند منتشر می‌شوند.
// قاعدهٔ هر شیء: اگر نسخهٔ زنده = نسخهٔ تازه ← کاری نیست. اگر زنده = نسخهٔ قبلی مخزن ← انتشار.
// وگرنه کسی در وردپرس دستی عوضش کرده (ناهمخوانی) ← آن شیء منتشر نمی‌شود و گردش کار قرمز می‌شود.
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { faDigits, fail, hash, loadEnv, log, maskSecrets, output, readJson, report, sleep, summary, unmaskFrom, warn, wpClient } from './site-lib.mjs';

loadEnv();
const MODE = process.argv[2] || 'plan';
const BEFORE = process.env.BEFORE, AFTER = process.env.AFTER || 'HEAD';
const MONITOR_MIN = Number(process.env.MONITOR_MIN || 15);
const PAGE_EXCLUDE = new Set([503886]); // مینی‌اپ: انتشار با گردش کار بات (v169.4)
const wp = wpClient();
const B = wp.base;
const lines = [];
const say = (m) => { lines.push(m); log(m); };

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'pipe'] });
const at = (sha, path) => { try { return git('show', `${sha}:${path}`); } catch { return null; } };

// ---------- فهرست تغییرها ----------
function changes() {
  if (!BEFORE || /^0+$/.test(BEFORE)) throw new Error('BEFORE مشخص نیست');
  const files = git('diff', '--name-only', '-z', BEFORE, AFTER, '--', 'site').split('\0').filter(Boolean);
  const items = [];
  const idxNew = JSON.parse(at(AFTER, 'site/snippets/index.json') || '[]');
  const idxOld = JSON.parse(at(BEFORE, 'site/snippets/index.json') || '[]');
  for (const f of files) {
    let m;
    if ((m = f.match(/^site\/pages\/(\d+)-.*\.html$/))) {
      const id = Number(m[1]);
      if (PAGE_EXCLUDE.has(id)) { say(`- برگهٔ ${id}: انتشارش با بات است، رد شد`); continue; }
      const nw = at(AFTER, f);
      if (nw === null) { say(`- برگهٔ ${id}: فایل حذف شده؛ حذف برگه خودکار نیست`); continue; }
      items.push({ kind: 'page', id, file: f, old: at(BEFORE, f), new: nw });
    } else if ((m = f.match(/^site\/snippets\/([^/]+)$/)) && m[1] !== 'index.json') {
      const ent = idxNew.find((x) => x.file === m[1]);
      if (!ent) { say(`- ${f}: در snippets/index.json نیست، رد شد`); continue; }
      if (m[1] === 'ops-bridge.php') { say('- پل tj-ops از خودش منتشر نمی‌شود (نصب و تغییرش دستی در WPCode)'); continue; }
      const nw = at(AFTER, f);
      if (nw === null) { say(`- اسنیپت ${ent.id}: فایل حذف شده؛ برای خاموش کردن active=false بگذار`); continue; }
      items.push({ kind: Number.isInteger(ent.id) ? 'snippet' : 'snippet-new', id: ent.id, ent, file: f, old: at(BEFORE, f), new: nw });
    } else if (f === 'site/css/global-styles.css') {
      items.push({ kind: 'css', id: 'global', file: f, old: at(BEFORE, f), new: at(AFTER, f) });
    } else if ((m = f.match(/^site\/(templates|template-parts)\/([^/]+)\.html$/))) {
      items.push({ kind: m[1], id: m[2], file: f, old: at(BEFORE, f), new: at(AFTER, f) });
    } else if (f === 'site/yoast-meta.json') {
      const o = JSON.parse(at(BEFORE, f) || '{}'), n = JSON.parse(at(AFTER, f) || '{}');
      for (const id of Object.keys(n)) if (JSON.stringify(o[id] || {}) !== JSON.stringify(n[id])) items.push({ kind: 'yoast', id: Number(id), old: o[id] || null, new: n[id] });
    }
  }
  // روشن/خاموش کردن اسنیپت از index.json
  for (const e of idxNew) {
    const o = idxOld.find((x) => x.id === e.id);
    if (o && Number.isInteger(e.id) && o.active !== e.active) items.push({ kind: 'snippet-active', id: e.id, ent: e, old: o.active, new: e.active });
  }
  return items;
}

// ---------- خواندن نسخهٔ زنده ----------
let bridgeState = null;
async function bridge() {
  if (bridgeState) return bridgeState;
  const r = await wp.get('/wp-json/tj-ops/v1/state', { timeout: 90000 });
  if (!r.ok) throw new Error(`پل tj-ops در دسترس نیست (HTTP ${r.status}). کلید خاموش در «تنظیمات › عمومی» یا نصب پل را ببین.`);
  return (bridgeState = r.json);
}
let gsId = null;
async function liveOf(it) {
  if (it.kind === 'page') {
    const r = await wp.get(`/wp-json/wp/v2/pages/${it.id}?context=edit&_fields=id,content,status,template,link`);
    if (!r.ok) throw new Error(`برگهٔ ${it.id}: HTTP ${r.status}`);
    it.meta = { template: r.json.template, link: r.json.link, status: r.json.status };
    return r.json.content.raw;
  }
  if (it.kind === 'snippet' || it.kind === 'snippet-active') {
    const s = (await bridge()).snippets.find((x) => x.id === it.id);
    if (!s) throw new Error(`اسنیپت ${it.id} در سایت نیست`);
    it.liveActive = s.active;
    if (it.kind === 'snippet') { it.liveRaw = s.code; return maskSecrets(s.code); } // رمز داخل کد هرگز با نسخهٔ مخزن مقایسه یا بازنویسی نمی‌شود
    return s.active;
  }
  if (it.kind === 'css') {
    const th = await wp.get('/wp-json/wp/v2/themes?status=active&_fields=stylesheet,_links');
    const href = th.json?.[0]?._links?.['wp:user-global-styles']?.[0]?.href;
    const r = await wp.get(href + '?context=edit');
    gsId = r.json.id; it.styles = r.json.styles || {};
    return it.styles.css || '';
  }
  if (it.kind === 'templates' || it.kind === 'template-parts') {
    const th = await wp.get('/wp-json/wp/v2/themes?status=active&_fields=stylesheet');
    it.tid = `${th.json[0].stylesheet}//${it.id}`;
    const r = await wp.get(`/wp-json/wp/v2/${it.kind}/${it.tid}?context=edit`);
    if (!r.ok) throw new Error(`${it.kind} ${it.id}: HTTP ${r.status}`);
    return r.json.content?.raw ?? '';
  }
  if (it.kind === 'yoast') return (await bridge()).yoast[it.id] || null;
  if (it.kind === 'snippet-new') { await bridge(); return null; } // پل باید در دسترس باشد
}
/* ۱۴ مهر ۱۴۰۵: «پذیرش» اسنیپتی که در مخزن نبود (آینه به‌خاطر نام یا شبه‌رمز ردش کرده بود) با ردیف index «adopt: comments»:
   اگر نسخهٔ زنده و نسخهٔ تازهٔ مخزن جز در کامنت‌ها یکی باشند، ناهمخوانی نیست و منتشر می‌شود (نام از کامنت بیرون می‌رود). */
const codeOnly = (s) => String(s ?? '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/[ \t]+$/gm, '').replace(/\n{2,}/g, '\n').trim();
const same = (a, b) => (typeof a === 'string' || typeof b === 'string') ? hash(a ?? '') === hash(b ?? '') : JSON.stringify(a) === JSON.stringify(b);

// ---------- نوشتن ----------
async function write(it, value) {
  let r;
  if (it.kind === 'page') r = await wp.post(`/wp-json/wp/v2/pages/${it.id}`, { content: value });
  else if (it.kind === 'snippet') r = await wp.post(`/wp-json/tj-ops/v1/snippet/${it.id}`, { code: unmaskFrom(value, it.liveRaw), expect: hash(it.liveRaw) });
  else if (it.kind === 'snippet-active') r = await wp.post(`/wp-json/tj-ops/v1/snippet-active/${it.id}`, { active: value });
  else if (it.kind === 'css') r = await wp.post(`/wp-json/wp/v2/global-styles/${gsId}`, { styles: { ...it.styles, css: value } });
  else if (it.kind === 'templates' || it.kind === 'template-parts') r = await wp.post(`/wp-json/wp/v2/${it.kind}/${it.tid}`, { content: value });
  else if (it.kind === 'yoast') r = await wp.post(`/wp-json/tj-ops/v1/yoast/${it.id}`, { ...value, expect: hash(JSON.stringify(it.live)) });
  if (!r?.ok) throw new Error(`${it.kind} ${it.id}: نوشتن رد شد HTTP ${r?.status} ${(r?.json?.code || '')}`);
  return r.json;
}
// برگهٔ آزمایشی خصوصی (کپی): متن تازه اول آنجا رندر و سنجیده می‌شود
async function stagePage(it) {
  const slug = `tj-staging-${it.id}`;
  const ex = await wp.get(`/wp-json/wp/v2/pages?slug=${slug}&status=private&_fields=id`);
  const body = { title: `[آزمایشی] ${it.id}`, slug, status: 'private', content: it.new, template: it.meta.template || '' };
  const r = ex.json?.[0] ? await wp.post(`/wp-json/wp/v2/pages/${ex.json[0].id}`, body) : await wp.post('/wp-json/wp/v2/pages', body);
  if (!r.ok) throw new Error(`برگهٔ آزمایشی ${it.id}: HTTP ${r.status}`);
  const sid = r.json.id;
  const v = await wp.get(`/wp-json/wp/v2/pages/${sid}?context=view&_fields=content`);
  const html = v.json?.content?.rendered || '';
  await wp.del(`/wp-json/wp/v2/pages/${sid}?force=true`);
  if (!html || BAD.test(html)) throw new Error(`برگهٔ آزمایشی ${it.id}: رندر خالی یا خطای PHP`);
  return html.length;
}

// ---------- تست دود ----------
const BAD = /There has been a critical error|Fatal error|Parse error|Warning<\/b>:|wp-die-message|&#038;&#038;/i; // آخری: && جاوااسکریپت که wptexturize خرابش کرده
const KEY = ['/', '/get-therapy/', '/persian-therapy/', '/school/', '/mag/', '/contact-us/'];
const LEAD = { '/get-therapy/': 7, '/persian-therapy/': 5, '/contact-us/': 10, '/school/': 6 };
async function probe(u) {
  const r = await wp.get(`${u}${u.includes('?') ? '&' : '?'}tj_smoke=${Date.now()}`, { authed: false, retries: 2, timeout: 30000 });
  return { u, status: r.status, ms: r.ms, size: (r.text || '').length, bad: BAD.test(r.text || ''), html: /<\/html>/i.test(r.text || ''), text: r.text || '' };
}
async function baseline(urls) { const b = {}; for (const u of urls) b[u] = await probe(u); return b; }
async function smoke(urls, base, { full = true } = {}) {
  const errs = [];
  for (const u of urls) {
    const p = await probe(u);
    const b = base?.[u];
    if (p.status !== 200) errs.push(`${u} HTTP ${p.status}`);
    else if (p.bad) errs.push(`${u} خطای PHP در صفحه`);
    else if (!p.html) errs.push(`${u} صفحه ناقص (بی </html>)`);
    else if (b && b.size && p.size < b.size * 0.5) errs.push(`${u} حجم ${Math.round(p.size / 1024)}KB، قبل ${Math.round(b.size / 1024)}KB`);
    if (LEAD[u] && p.status === 200 && !p.text.includes(`data-form_id="${LEAD[u]}"`)) errs.push(`${u} فرم ${LEAD[u]} پیدا نشد`);
  }
  if (full) {
    const rest = await wp.get('/wp-json/tj/v1/thers', { authed: false, retries: 2 });
    if (rest.status !== 200) errs.push(`REST tj/v1/thers HTTP ${rest.status}`);
    for (const e of readJson(process.env.REDIRECTS_FILE || join(process.cwd(), 'site/redirects.json'), [])) {
      const r = await wp.get(e.from, { authed: false, retries: 2, timeout: 20000 });
      const loc = r.headers.get('location') || '';
      if (!((r.status === e.code || (e.code === 301 && r.status === 308)) && (e.prefix ? loc.startsWith(e.to) : loc === e.to))) errs.push(`ریدایرکت ${e.from.replace(B, '')}: ${r.status} ← ${loc.replace(B, '') || '-'}`);
    }
    // سرعت: میانهٔ سه بار TTFB خانه
    const t = []; for (let i = 0; i < 3; i++) t.push((await probe('/')).ms);
    const med = t.sort((a, c) => a - c)[1];
    const bm = base?.__ttfb;
    if (bm && med > bm * 2 && med - bm > 800) errs.push(`کندی: پاسخ خانه ${med}ms، قبل ${bm}ms`);
    if (base && !base.__ttfb) base.__ttfb = med;
  }
  return errs;
}
async function purge() {
  const r = await wp.post('/wp-json/tj-ops/v1/purge', {});
  if (!r.ok) warn(`پاک کردن کش انجام نشد (HTTP ${r.status})؛ ذخیرهٔ برگه کش همان برگه را خودش پاک می‌کند`);
  return r.ok;
}

// ---------- اجرا ----------
const items = changes();
const urls = [...KEY];
let blocked = 0;
for (const it of items) {
  try {
    it.live = await liveOf(it);
    if (it.kind === 'snippet-new') { it.action = 'create'; continue; }
    if (same(it.live, it.new)) it.action = 'skip';
    else if (same(it.live, it.old)) it.action = 'apply';
    else if (it.kind === 'snippet' && it.old === null && it.ent?.adopt === 'comments' && codeOnly(it.live) === codeOnly(it.new)) { it.action = 'apply'; it.adopt = true; }
    else { it.action = 'drift'; blocked++; }
  } catch (e) { it.action = 'error'; it.err = e.message; blocked++; }
  if (it.kind === 'page' && it.meta?.link && it.meta.status === 'publish') urls.push(it.meta.link.replace(B, '') || '/');
}
const label = (it) => `${{ page: 'برگه', snippet: 'اسنیپت', 'snippet-new': 'اسنیپت تازه', 'snippet-active': 'روشن/خاموش اسنیپت', css: 'CSS سراسری', templates: 'قالب', 'template-parts': 'قطعه‌قالب', yoast: 'Yoast' }[it.kind]} ${it.id}`;
const ACT = { skip: 'همین الان روی سایت است', apply: 'منتشر می‌شود', create: 'ساخته می‌شود (اول غیرفعال)', drift: '⛔ این فایل روی سایت عوض شده؛ site-mirror اجرا شد، PR را با main به‌روز کن', error: '⛔ خطا' };
say(`## برنامهٔ انتشار (${BEFORE.slice(0, 7)}..${String(AFTER).slice(0, 7)})\n`);
for (const it of items) say(`- ${label(it)}: ${ACT[it.action]}${it.err ? ` (${it.err})` : ''}`);
if (!items.length) say('- تغییری در /site نیست');
summary(lines.join('\n'));
/* ۱۴ مهر ۱۴۰۵: سایت زنده مرجع است. اگر سایت جلوتر بود (ویرایش در Cowork)، انتشار می‌ایستد و site-mirror را خودش صدا می‌زند تا
   main به سایت برسد؛ بعد PR با main به‌روز می‌شود. هیچ ادغام خودکاری نیست. */
const drifted = items.filter((it) => it.action === 'drift');
if (drifted.length && MODE !== 'plan' && process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY) {
  try {
    const r = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/actions/workflows/site-mirror.yml/dispatches`, {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' }, body: JSON.stringify({ ref: 'main' }) });
    say(r.status === 204 ? '\nsite-mirror اجرا شد؛ بعد از کامیت آینه، PR را با main به‌روز کن.' : `\n⛔ اجرای site-mirror نشد (HTTP ${r.status})؛ دستی اجرایش کن.`);
  } catch (e) { say(`\n⛔ اجرای site-mirror نشد (${e.message})؛ دستی اجرایش کن.`); }
  summary(lines.join('\n'));
}
if (blocked) { fail(drifted.length ? `${drifted.length} فایل روی سایت عوض شده (سایت جلوتر است)؛ انتشار متوقف شد. site-mirror اجرا شد؛ PR را با main به‌روز کن.` : `${blocked} مورد خطادار؛ انتشار متوقف شد.`); }
if (MODE === 'plan' || blocked) { output('blocked', blocked); process.exit(blocked ? 1 : 0); }

const todo = items.filter((it) => it.action === 'apply' || it.action === 'create');
if (!todo.length) { say('\nچیزی برای انتشار نیست.'); process.exit(0); }

const t0 = Date.now();
const base = await baseline([...new Set(urls)]);
const pre = await smoke([...new Set(urls)], base);
if (pre.length) { fail(`پیش از انتشار سایت سالم نیست: ${pre.join(' · ')}`); await report(`⛔ انتشار سایت انجام نشد: سایت پیش از انتشار سالم نبود.\n${pre.join('\n')}`); process.exit(1); }

const done = [];
async function rollback(why) {
  say(`\n### برگشت خودکار: ${why}`);
  for (const it of done.reverse()) {
    try {
      if (it.kind === 'snippet-new') await wp.post(`/wp-json/tj-ops/v1/snippet-active/${it.createdId}`, { active: false });
      else if (it.kind === 'snippet') { const r = await wp.post('/wp-json/tj-ops/v1/restore', { key: `snippet:${it.id}` }); if (!r.ok) throw new Error(`HTTP ${r.status}`); }
      else if (it.kind === 'yoast') { const r = await wp.post('/wp-json/tj-ops/v1/restore', { key: `yoast:${it.id}` }); if (!r.ok) throw new Error(`HTTP ${r.status}`); }
      else await write(it, it.kind === 'snippet-active' ? it.old : it.prev);
      say(`- ${label(it)}: برگشت`);
    } catch (e) { say(`- ⛔ ${label(it)}: برگشت نشد (${e.message})`); }
  }
  await purge();
  const after = await smoke([...new Set(urls)], base);
  say(after.length ? `- ⛔ بعد از برگشت هنوز خطا: ${after.join(' · ')}` : '- بعد از برگشت سایت سالم است');
  summary(lines.join('\n'));
  await report(`⛔ انتشار سایت برگشت خورد\n${why}\n${done.map(label).join('، ')}\n${after.length ? 'هنوز خطا: ' + after.join(' · ') : 'سایت سالم است'}`);
  process.exit(2);
}

for (const it of todo) {
  try {
    if (it.kind === 'page') { const n = await stagePage(it); say(`- ${label(it)}: برگهٔ آزمایشی سالم (${faDigits(Math.round(n / 1024))}KB)`); }
    if (it.kind === 'snippet-new') {
      const r = await wp.post('/wp-json/tj-ops/v1/snippet-new', { title: it.ent.title, type: it.ent.type, location: it.ent.loc, code: it.new });
      if (!r.ok) throw new Error(`ساخت اسنیپت HTTP ${r.status} ${r.json?.code || ''}`);
      it.createdId = r.json.id; done.push(it);
      say(`- ${label(it)}: ساخته شد با شناسهٔ ${it.createdId} (غیرفعال)`);
      if (it.ent.active) {
        const t1 = Date.now();
        await wp.post(`/wp-json/tj-ops/v1/snippet-active/${it.createdId}`, { active: true });
        const e = await smoke(KEY, base, { full: false });
        if (e.length) { await wp.post(`/wp-json/tj-ops/v1/snippet-active/${it.createdId}`, { active: false }); throw new Error(`بعد از روشن شدن: ${e.join(' · ')} (در ${Math.round((Date.now() - t1) / 1000)} ثانیه خاموش شد)`); }
        say(`- ${label(it)}: روشن شد و تست دود فوری سبز`);
      }
      continue;
    }
    it.prev = it.live;
    await write(it, it.new);
    done.push(it);
    if (it.kind === 'snippet' || it.kind === 'snippet-active') {
      const e = await smoke(KEY, base, { full: false });
      if (e.length) await rollback(`${label(it)}: تست دود فوری مردود: ${e.join(' · ')}`);
    }
    say(`- ${label(it)}: منتشر شد`);
  } catch (e) { await rollback(`${label(it)}: ${e.message}`); }
}
await purge();
let e = await smoke([...new Set(urls)], base);
if (e.length) await rollback(`تست دود بعد از انتشار: ${e.join(' · ')}`);
say(`\nتست دود سبز. نظارت ${faDigits(MONITOR_MIN)} دقیقه…`);
let bad = 0;
const end = Date.now() + MONITOR_MIN * 60000;
while (Date.now() < end) {
  await sleep(60000);
  e = await smoke(KEY, base, { full: false });
  bad = e.length ? bad + 1 : 0;
  if (e.length) warn(`نظارت: ${e.join(' · ')}`);
  if (bad >= 2) await rollback(`نظارت: دو بار پشت هم خطا: ${e.join(' · ')}`);
}
e = await smoke([...new Set(urls)], base);
if (e.length) await rollback(`تست پایانی: ${e.join(' · ')}`);
const created = todo.filter((x) => x.createdId).map((x) => ({ file: x.ent.file, id: x.createdId }));
if (created.length) output('created', JSON.stringify(created));
const ttfb = base.__ttfb;
say(`\n✅ انتشار سبز: ${todo.length} مورد در ${faDigits(Math.round((Date.now() - t0) / 60000))} دقیقه، نظارت بی خطا. پاسخ خانه پیش از انتشار ${ttfb}ms.`);
summary(lines.join('\n'));
await report(`✅ انتشار سایت سبز\n${todo.map(label).join('، ')}\nتست دود، پاک کردن کش و ${faDigits(MONITOR_MIN)} دقیقه نظارت بی خطا.`);
