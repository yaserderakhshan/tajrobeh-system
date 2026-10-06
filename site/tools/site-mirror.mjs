// site-mirror (۱۴ مهر ۱۴۰۵، تصمیم یاسر): سایت زنده مرجع اسنیپت‌ها، برگه‌ها و قالب‌هاست؛ مخزن خودش را به آن می‌رساند.
// بی هیچ مدل هوش مصنوعی. فقط GET به سایت؛ هرگز چیزی روی سایت نمی‌نویسد. فایل‌های /site را می‌نویسد و گردش کار
// site-mirror.yml اگر تفاوتی بود یک کامیت «آینه از سایت زنده [skip ci]» روی main می‌زند.
//
// ارزان: اول فقط هش‌ها (GET /state?lite=1 پل tj-ops، فهرست برگه‌ها بی متن). متن فقط برای موردهای مختلف خوانده می‌شود.
// نبود تفاوت = هیچ نوشتنی و هیچ کامیتی. هش زندهٔ خام هر اسنیپت (با رمز) در site/state.json می‌ماند تا اجرای بعد بی متن بسنجد.
//
// رمز: خط‌های define که site-deploy هنگام انتشار پر می‌کند (SITE_SECRET_<نام> در site-deploy.yml) خالی نوشته می‌شوند.
// هر چیز دیگری شبیه رمز (define با SECRET/KEY/TOKEN/PASS، رشتهٔ هگز یا base64 بلند، توکن تلگرام، کلید API، Application Password)
// یعنی آن فایل نوشته نمی‌شود و فقط شناسه و نوع در خلاصه می‌آید. اطلاعات شخصی (pii-scan با PII_NAMES) هم همین‌طور.
import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { SITE, ROOT, hash, lf, loadEnv, log, warn, fail, summary, output, maskSecrets, pageFiles, readJson, report, wpClient } from './site-lib.mjs';
import { scanLine } from './secrets.mjs';
import { piiLine } from '../../.github/scripts/pii-scan.mjs';

const J = (v) => JSON.stringify(v, null, 1) + '\n';
const EXT = { php: 'php', html: 'html', css: 'css', js: 'js', text: 'txt', universal: 'html', scss: 'scss' };
const DEF = /define\(\s*'([A-Z0-9_]*(?:SECRET|TOKEN|KEY|PASS)[A-Z0-9_]*)'\s*,\s*'([^']*)'\s*\)/g;

/* نام رمزهایی که site-deploy پر می‌کند: از خود site-deploy.yml (یک منبع) */
export function fillNames(yml) {
  return [...String(yml).matchAll(/SITE_SECRET_([A-Z0-9_]+)\s*:/g)].map((m) => m[1]);
}
/* خط‌های رمز شناخته‌شده خالی؛ بقیه دست نمی‌خورد */
export function blankKnown(code, names) {
  return String(code).replace(DEF, (m, name, v) => (names.includes(name) ? m.replace(`'${v}'`, "''") : m));
}
/* نوع‌های «شبیه رمز» در متنی که خط‌های شناخته‌شده‌اش خالی شده؛ آرایهٔ خالی = سالم. مقدار هرگز برنمی‌گردد. */
export function secretKinds(code) {
  const out = new Set();
  for (const m of String(code).matchAll(DEF)) if (m[2] !== '') out.add(`define ${m[1]}`);
  const noData = String(code).replace(/data:[a-z]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi, '');   /* تصویر درون‌خطی رمز نیست */
  if (maskSecrets(noData) !== noData) out.add('مقدار شبیه رمز (کلید secret/token/password یا رشتهٔ تصادفی بلند)');
  for (const l of noData.split('\n')) for (const k of scanLine(l)) out.add(k);
  if (/(?<![\w./=?&#-])[0-9a-f]{40,}(?![\w-])/i.test(noData)) out.add('رشتهٔ هگز بلند');
  for (const m of noData.matchAll(/(?<![\w+/=.-])[A-Za-z0-9+/]{48,}={0,2}(?![\w+/=])/g)) {
    if (/\d/.test(m[0]) && /[a-z]/.test(m[0]) && /[A-Z]/.test(m[0])) { out.add('رشتهٔ base64 بلند'); break; }
  }
  return [...out];
}
/* اطلاعات شخصی: همان قاعده‌های pii-scan، با نام همکاران از PII_NAMES روی هر فایل */
const FA_LETTER = '\\u0620-\\u064A\\u066E-\\u06D3\\u06FA-\\u06FF\\u200c';
const nameRx = (n) => new RegExp(`(?<![${FA_LETTER}\\w])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![${FA_LETTER}\\w])`);
export function piiKinds(code, names) {
  const out = new Set();
  for (const l of String(code).split('\n')) {
    for (const k of piiLine(l)) out.add(k);
    if (!/pii:ok/.test(l) && names.some((n) => nameRx(n).test(l))) out.add('نام همکار (PII_NAMES)');
  }
  return [...out];
}

export function mirrorSelfTest() {
  const bad = [], t = (n, c) => { if (!c) bad.push(n); };
  const yml = "SITE_SECRET_TJ_CAMP_SECRET_V2: ${{ secrets.CP_WP_SECRET }}\n          SITE_SECRET_TJ_LEAD_SECRET: ${{ secrets.X }}";
  const names = fillNames(yml);
  t('نام رمزهای انتشار از site-deploy.yml', JSON.stringify(names) === '["TJ_CAMP_SECRET_V2","TJ_LEAD_SECRET"]');
  const live = "if (!defined('TJ_CAMP_SECRET_V2')) define('TJ_CAMP_SECRET_V2', '" + 'Zx9k'.repeat(8) + "');\n$x = 1;";
  const b = blankKnown(live, names);
  t('رمز شناخته‌شده خالی می‌شود', b.includes("define('TJ_CAMP_SECRET_V2', '')") && secretKinds(b).length === 0);
  t('define ناشناخته با مقدار ← شبیه رمز', secretKinds("define('TJ_NEW_" + "KEY', 'abc')").includes('define TJ_NEW_KEY'));
  t('توکن تلگرام ← شبیه رمز', secretKinds('$t = "123456789:AA' + 'x'.repeat(33) + '";').length > 0);
  t('کلید API گوگل ← شبیه رمز', secretKinds('k = "AIza' + 'b'.repeat(35) + '"').length > 0);
  t('هگز بلند ← شبیه رمز', secretKinds('$h = "' + 'a1'.repeat(24) + '";').includes('رشتهٔ هگز بلند'));
  t('تصویر base64 درون‌خطی رمز نیست', secretKinds('<img src="data:image/png;base64,' + ['iVBO', 'Rw0K', 'GgoA'].join('').repeat(8) + '">').length === 0);
  t('کد عادی سالم است', secretKinds("add_action('init', function () { return 'tj-offer'; });\n.tj2 a.tj-offer{color:#c83f49}").length === 0);
  t('نام همکار از فهرست ← رد', piiKinds('<p>با نمونه‌الف تماس بگیرید</p>', ['نمونه‌الف']).length === 1 && piiKinds('<p>سلام</p>', ['نمونه‌الف']).length === 0);
  t('شماره ← رد', piiKinds('تلفن: 09121234567', []).includes('شمارهٔ تلفن')); // pii:ok نمونهٔ ساختگی
  t('پوشاندن نام', maskNames('سلام نمونه‌الف و نمونه‌الفی', ['نمونه‌الف']) === 'سلام [نام] و نمونه‌الفی');
  t('نوع خط', JSON.stringify(lineContexts("<?php\n// x\necho 'a';\n$a = 1;\n?>\n<p>b</p>")) === JSON.stringify(['کد یا رشتهٔ داخلی PHP', 'کامنت PHP', 'رشتهٔ خروجی PHP', 'کد یا رشتهٔ داخلی PHP', 'کد یا رشتهٔ داخلی PHP', 'HTML خروجی (روی صفحه)']));
  return bad;
}

/* ---------------- توضیح یک مورد ردشده (بی خود نام) ----------------
   node site-mirror.mjs explain <id>: برای اسنیپتی که آینه به‌خاطر نام یا اطلاعات شخصی رد کرده، جای هر برخورد را می‌گوید
   (شمارهٔ خط، کامنت یا متن خروجی یا رشتهٔ PHP) و متن را با نام پوشانده چاپ می‌کند تا اصلاح از PR نوشته شود.
   نام همکار هرگز چاپ نمی‌شود (جایش «[نام]»). خطی که بعد از پوشاندن نام هنوز اطلاعات شخصی یا شبه‌رمز دارد کامل پنهان می‌شود.
   برای دیده شدن روی سایت: کدهای کوتاه اسنیپت در برگه‌های مخزن جست‌وجو و صفحهٔ عمومی همان برگه‌ها (و خانه) بی ورود خوانده می‌شود؛ فقط «بله/خیر». */
export function maskNames(text, names) {
  let t = String(text);
  for (const n of [...names].sort((a, b) => b.length - a.length)) t = t.replace(new RegExp(nameRx(n).source, 'g'), '[نام]');
  return t;
}
export function lineContexts(code) {
  const out = []; let php = !/^\s*</.test(code) || /^\s*<\?php/.test(code), block = false;
  for (const l of String(code).split('\n')) {
    const tr = l.trim(); let kind;
    if (block) kind = 'کامنت PHP';
    else if (!php) kind = 'HTML خروجی (روی صفحه)';
    else if (/^(\/\/|#|\/\*|\*)/.test(tr)) kind = 'کامنت PHP';
    else if (/echo|print|printf|return\s+['"<]|\.=\s*['"]/.test(l)) kind = 'رشتهٔ خروجی PHP';
    else kind = 'کد یا رشتهٔ داخلی PHP';
    if (/\/\*/.test(l) && !/\*\//.test(l.slice(l.indexOf('/*')))) block = true;
    if (block && /\*\//.test(l)) block = false;
    if (/\?>/.test(l) && !/<\?php/.test(l.slice(l.lastIndexOf('?>')))) php = false;
    if (/<\?php/.test(l)) php = true;
    out.push(kind);
  }
  return out;
}
async function explain(id) {
  if (!/^\d+$/.test(String(id || ""))) { fail("شناسهٔ اسنیپت باید عدد باشد"); process.exit(1); }
  const wp = wpClient();
  if (!wp.hasAuth) { fail('WP_USER یا WP_APP_PASSWORD نیست'); process.exit(1); }
  const NAMES = (process.env.PII_NAMES || '').split(/[,،\n]+/).map((x) => x.trim()).filter((x) => x.length >= 2);
  if (!NAMES.length) { fail('PII_NAMES خالی است'); process.exit(1); }
  const FILL = fillNames(readFileSync(join(ROOT, '.github/workflows/site-deploy.yml'), 'utf8'));
  let r = await wp.get(`/wp-json/tj-ops/v1/state?code=${id}`, { timeout: 90000 });
  let sn = Array.isArray(r.json?.snippets) ? r.json.snippets.find((s) => String(s.id) === String(id)) : null;
  if (!sn || typeof sn.code !== 'string') { r = await wp.get('/wp-json/tj-ops/v1/state', { timeout: 90000 }); sn = (r.json?.snippets || []).find((s) => String(s.id) === String(id)); }
  if (!sn || typeof sn.code !== 'string') { fail(`اسنیپت ${id} در state پل پیدا نشد (HTTP ${r.status})`); process.exit(1); }
  const code = lf(blankKnown(sn.code, FILL)), lines = code.split('\n'), ctx = lineContexts(code);
  const L = [`## توضیح اسنیپت ${id}`, '', `- عنوان: ${maskNames(sn.title || '', NAMES)}`, `- نوع: ${sn.type} · محل اجرا: ${sn.location} · روشن: ${sn.active ? 'بله' : 'خیر'}`, '', '### برخوردها'];
  const hits = [];
  lines.forEach((l, i) => {
    const nm = !/pii:ok/.test(l) && NAMES.some((n) => nameRx(n).test(l));
    const pk = piiLine(l);
    if (nm || pk.length) hits.push(i), L.push(`- خط ${i + 1}: ${[nm && 'نام همکار', ...pk].filter(Boolean).join('، ')} · ${ctx[i]}`);
  });
  if (!hits.length) L.push('- هیچ (احتمالاً در عنوان)');
  /* دیده شدن روی سایت عمومی: کدهای کوتاه این اسنیپت در برگه‌های مخزن + خانه */
  const sc = [...code.matchAll(/add_shortcode\(\s*['"]([\w-]+)['"]/g)].map((m) => m[1]);
  const pidx = readJson(join(SITE, 'pages-index.json'), []), files = pageFiles();
  const urls = new Set([wp.base + '/']);
  for (const [pid, f] of files) { const t = readFileSync(join(SITE, 'pages', f), 'utf8'); if (sc.some((s) => t.includes(`[${s}`))) { const p = pidx.find((x) => x.id === pid); if (p?.link) urls.add(p.link); } }
  L.push('', `### روی سایت عمومی`, `- کدهای کوتاه: ${sc.length ? sc.join('، ') : 'هیچ'}`);
  for (const u of urls) {
    const pr = await wp.get(u, { authed: false, timeout: 30000, retries: 2 });
    const seen = NAMES.filter((n) => nameRx(n).test(pr.text || '')).length;
    L.push(`- ${u.replace(wp.base, '') || '/'}: HTTP ${pr.status} · نام همکار در HTML عمومی: ${seen ? 'بله' : 'خیر'}`);
  }
  L.push('', '### متن با نام پوشانده', '```');
  lines.forEach((l, i) => {
    const m = maskNames(l, NAMES);
    const bad = piiLine(m).length || secretKinds(m).length || maskSecrets(m) !== m;
    L.push(`${String(i + 1).padStart(4)}| ${bad ? '[این خط پنهان شد: اطلاعات شخصی یا شبه‌رمز]' : m}`);
  });
  L.push('```');
  summary(L.join('\n')); log(L.join('\n'));
}

/* ---------------- اجرا ---------------- */
async function main() {
  loadEnv();
  const t0 = Date.now();
  const wp = wpClient();
  if (!wp.hasAuth) { fail('WP_USER یا WP_APP_PASSWORD نیست'); process.exit(1); }
  const NAMES = (process.env.PII_NAMES || '').split(/[,،\n]+/).map((x) => x.trim()).filter((x) => x.length >= 2);
  const FILL = fillNames(readFileSync(join(ROOT, '.github/workflows/site-deploy.yml'), 'utf8'));
  const statePath = join(SITE, 'state.json');
  const st0 = readJson(statePath, { items: {} });
  const S = JSON.parse(JSON.stringify(st0)); S.items = S.items || {};
  const changed = [], added = [], skipped = [], notes = [];
  const put = (path, text) => { writeFileSync(path, text); };
  const okToWrite = (label, text) => {
    const sk = secretKinds(text); if (sk.length) { skipped.push(`${label}: شبیه رمز (${sk.join('، ')})`); return false; }
    const pk = piiKinds(text, NAMES); if (pk.length) { skipped.push(`${label}: اطلاعات شخصی (${pk.join('، ')})`); return false; }
    return true;
  };

  /* ---------- ۱. اسنیپت‌ها و متای Yoast از پل tj-ops ---------- */
  const idxPath = join(SITE, 'snippets/index.json');
  const idx = readJson(idxPath, []);
  let idxDirty = false, bridgeDown = '';
  const r0 = await wp.get('/wp-json/tj-ops/v1/state?lite=1', { timeout: 60000, retries: 2 });
  if (r0.status === 401) { fail('رمز claude-ops پذیرفته نشد (۴۰۱)'); process.exit(1); }
  if (r0.status === 403 || r0.status === 0 || r0.status >= 500 || !Array.isArray(r0.json?.snippets)) bridgeDown = r0.status === 403 ? 'خاموش (۴۰۳)' : `در دسترس نبود (HTTP ${r0.status || 'تایم‌اوت'})`;
  if (!bridgeDown) {
    let B = r0.json;
    const lite = B.snippets.every((s) => !('code' in s));
    const prevLive = (id) => S.items[`snippet:${id}`]?.live;
    let need = B.snippets.filter((s) => !s.self && !String(s.title || '').includes('پل انتشار مخزن') && (!lite || prevLive(s.id) !== s.hash || !idx.some((x) => x.id === s.id)));
    if (lite && need.length) {
      const r1 = await wp.get(`/wp-json/tj-ops/v1/state?code=${need.map((s) => s.id).join(',')}`, { timeout: 90000 });
      if (!r1.ok || !Array.isArray(r1.json?.snippets)) { fail(`متن اسنیپت‌ها خوانده نشد: HTTP ${r1.status}`); process.exit(1); }
      const byId = new Map(r1.json.snippets.map((s) => [s.id, s]));
      need = need.map((s) => ({ ...s, code: byId.get(s.id)?.code }));
    }
    if (!lite) notes.push('پل tj-ops هنوز حالت سبک (lite) ندارد؛ متن همهٔ اسنیپت‌ها یک بار خوانده شد. با نصب نسخهٔ تازهٔ پل، فقط هش‌ها خوانده می‌شوند.');
    for (const sn of need) {
      if (typeof sn.code !== 'string') continue;
      if (sn.code.includes("register_rest_route('tj-ops/v1'")) continue;   /* پل به خودش دست نمی‌زند؛ نصبش دستی است */
      const old = idx.find((x) => x.id === sn.id);
      const file = old?.file || `${sn.id}.${EXT[sn.type] || 'txt'}`;
      const p = join(SITE, 'snippets', file);
      const repo = existsSync(p) ? readFileSync(p, 'utf8') : null;
      const blanked = lf(blankKnown(sn.code, FILL));
      const same = repo !== null && hash(maskSecrets(repo)) === hash(maskSecrets(sn.code));
      const meta = { id: sn.id, file, title: sn.title, type: sn.type || old?.type, location: old?.location || sn.location, loc: sn.location, active: sn.active };
      if (!same) {
        if (!okToWrite(`اسنیپت ${sn.id}`, blanked)) continue;
        put(p, blanked); (old ? changed : added).push(`اسنیپت ${sn.id}${old ? '' : ` (${file})`}`);
      }
      if (!old) { idx.push(meta); idxDirty = true; }
      else if (old.title !== sn.title || old.active !== sn.active || (old.loc && old.loc !== sn.location)) { Object.assign(old, { title: sn.title, active: sn.active, loc: sn.location }); idxDirty = true; if (same) changed.push(`index اسنیپت ${sn.id}`); }
      S.items[`snippet:${sn.id}`] = { ...(S.items[`snippet:${sn.id}`] || {}), live: sn.hash || hash(sn.code), modified: sn.modified, active: sn.active };
    }
    /* عنوان و روشن/خاموش اسنیپت‌هایی که متنشان عوض نشده (در حالت سبک بی متن) */
    for (const sn of B.snippets) {
      const old = idx.find((x) => x.id === sn.id);
      if (!old || need.some((x) => x.id === sn.id)) continue;
      if (old.title !== sn.title || old.active !== sn.active) { Object.assign(old, { title: sn.title, active: sn.active }); idxDirty = true; changed.push(`index اسنیپت ${sn.id}`); }
    }
    if (idxDirty) put(idxPath, J(idx.sort((a, c) => (Number.isInteger(a.id) ? a.id : 9e9) - (Number.isInteger(c.id) ? c.id : 9e9))));
    /* Yoast خام فقط برای برگه‌های منتشرشده (برگهٔ پیش‌نویس و خصوصی وارد مخزن نمی‌شود) */
    S._yoast = B.yoast || null;
  } else notes.push(`پل خاموش بود (${bridgeDown})؛ اسنیپت‌ها و Yoast خام این بار سنجیده نشدند.`);

  /* ---------- ۲. برگه‌های منتشرشده ---------- */
  const pidxPath = join(SITE, 'pages-index.json');
  const pidx = readJson(pidxPath, []);
  const files = pageFiles();
  const list = await wp.all('/wp-json/wp/v2/pages?context=edit&status=publish&_fields=id,slug,status,title,parent,template,link,modified_gmt');
  let pidxDirty = false;
  const dec = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
  const published = new Set();
  for (const p of list) {
    published.add(p.id);
    const meta = { id: p.id, slug: dec(p.slug), status: p.status, title: p.title?.raw ?? p.title?.rendered, parent: p.parent, template: p.template, link: p.link };
    const old = pidx.find((x) => x.id === p.id);
    const fname = `${p.id}-${meta.slug}.html`;
    const cur = files.get(p.id);
    const key = `page:${p.id}`;
    if (cur && S.items[key]?.modified === p.modified_gmt && cur === fname) { /* بی‌تغییر از آخرین آینه */ }
    else {
      const r = await wp.get(`/wp-json/wp/v2/pages/${p.id}?context=edit&_fields=content,modified_gmt`);
      if (!r.ok) { warn(`برگهٔ ${p.id}: HTTP ${r.status}`); continue; }
      const raw = lf(r.json.content?.raw ?? '');
      const repo = cur ? readFileSync(join(SITE, 'pages', cur), 'utf8') : null;
      if (repo === null || hash(repo) !== hash(raw) || cur !== fname) {
        if (okToWrite(`برگهٔ ${p.id}`, raw)) {
          if (cur && cur !== fname) renameSync(join(SITE, 'pages', cur), join(SITE, 'pages', fname));
          if (repo === null || hash(repo) !== hash(raw)) put(join(SITE, 'pages', fname), raw);
          (cur ? changed : added).push(`برگهٔ ${p.id}${cur ? '' : ` (${fname})`}`);
        } else continue;
      }
      S.items[key] = { hash: hash(raw), modified: p.modified_gmt };
    }
    if (!old) { pidx.push(meta); pidxDirty = true; }
    else for (const k of ['slug', 'status', 'title', 'parent', 'template', 'link']) if (String(old[k] ?? '') !== String(meta[k] ?? '')) { old[k] = meta[k]; pidxDirty = true; }
  }
  for (const p of pidx) if (p.status === 'publish' && !published.has(p.id)) notes.push(`برگهٔ ${p.id} در مخزن منتشرشده است ولی در سایت نه (پیش‌نویس، خصوصی یا حذف)؛ فایلش دست نخورد.`);
  if (pidxDirty) { put(pidxPath, J(pidx.sort((a, b) => b.id - a.id))); if (!changed.includes('pages-index.json')) changed.push('pages-index.json'); }

  /* Yoast خام (از پل) فقط برای برگه‌های منتشرشده */
  if (S._yoast) {
    const yPath = join(SITE, 'yoast-meta.json'), yRepo = readJson(yPath, {}), yNew = {};
    for (const [id, y] of Object.entries(S._yoast)) if (published.has(Number(id))) yNew[id] = y;
    if (J(yRepo) !== J(yNew)) { put(yPath, J(yNew)); changed.push('yoast-meta.json'); }
  }
  delete S._yoast;

  /* ---------- ۳. CSS سراسری، قالب‌ها و قطعه‌قالب‌ها ---------- */
  const th = await wp.get('/wp-json/wp/v2/themes?status=active&_fields=stylesheet,_links');
  const gsHref = th.json?.[0]?._links?.['wp:user-global-styles']?.[0]?.href;
  if (gsHref) {
    const gs = await wp.get(gsHref + (gsHref.includes('?') ? '&' : '?') + 'context=edit');
    if (gs.ok) {
      const css = gs.json.styles?.css ?? '';
      const p = join(SITE, 'css/global-styles.css');
      const repo = existsSync(p) ? readFileSync(p, 'utf8') : '';
      if (hash(repo) !== hash(css) && okToWrite('CSS سراسری', css)) { put(p, css); changed.push('css/global-styles.css'); }
    } else warn(`Global Styles: HTTP ${gs.status}`);
  }
  for (const route of ['templates', 'template-parts']) {
    const r = await wp.get(`/wp-json/wp/v2/${route}?context=edit&per_page=100&_fields=slug,source,content`);
    if (!r.ok) { warn(`${route}: HTTP ${r.status}`); continue; }
    for (const t of r.json) {
      const p = join(SITE, route, `${t.slug}.html`);
      if (t.source !== 'custom' && !existsSync(p)) continue;
      const raw = lf(t.content?.raw ?? '');
      const repo = existsSync(p) ? readFileSync(p, 'utf8') : null;
      if (repo !== null && hash(repo) === hash(raw)) continue;
      if (!okToWrite(`${route} ${t.slug}`, raw)) continue;
      put(p, raw); (repo === null ? added : changed).push(`${route}/${t.slug}`);
    }
  }

  /* ---------- ۴. وضعیت پل و خبر ۲۴ ساعته ---------- */
  const now = Date.now(), today = new Date().toISOString().slice(0, 10);
  if (bridgeDown) {
    if (!S.bridge_down_since) S.bridge_down_since = new Date(now).toISOString();
    const hrs = (now - Date.parse(S.bridge_down_since)) / 3600000;
    if (hrs >= 24 && S.bridge_alert_day !== today) {
      const r = await report(`پل انتشار سایت (tj-ops) ${Math.floor(hrs)} ساعت است ${bridgeDown}. آینهٔ مخزن اسنیپت‌ها را نمی‌سنجد تا پل در «تنظیمات › عمومی» روشن شود.`, { type: 'گزارش', ref: 'SITE-MIRROR' });
      if (r && r.ok) S.bridge_alert_day = today;
    }
  } else { delete S.bridge_down_since; delete S.bridge_alert_day; }

  /* state.json فقط وقتی چیزی عوض شده نوشته می‌شود (کامیت بی‌دلیل ساعتی نه) */
  const stateChanged = J(st0) !== J(S);
  if (stateChanged) { S.mirrored_at = new Date(now).toISOString(); put(statePath, J(S)); }

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const L = ['## آینه از سایت زنده', '', `- مدت: ${secs} ثانیه`];
  if (bridgeDown) L.push('- پل خاموش بود');
  L.push(`- عوض‌شده: ${changed.length ? changed.join('، ') : 'هیچ'}`);
  L.push(`- تازه: ${added.length ? added.join('، ') : 'هیچ'}`);
  L.push(`- ردشده: ${skipped.length ? '' : 'هیچ'}`); skipped.forEach((x) => L.push(`  - ${x}`));
  notes.forEach((x) => L.push(`- ${x}`));
  if (!NAMES.length) L.push('- PII_NAMES خالی است؛ سنجش نام همکاران روی فایل‌ها انجام نشد.');
  summary(L.join('\n'));
  log(L.join('\n'));
  output('changed', changed.length + added.length > 0 || stateChanged ? '1' : '0');
}

if (process.argv[1] && process.argv[1].endsWith('site-mirror.mjs')) {
  if (process.argv[2] === 'selftest') { const b = mirrorSelfTest(); console.log(b.length ? '❌ ' + b.join('، ') : '✅ site-mirror'); process.exit(b.length ? 1 : 0); }
  if (process.argv[2] === 'explain') await explain(process.argv[3]); else await main();
}
